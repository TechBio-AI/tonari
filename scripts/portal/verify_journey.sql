-- =============================================================================
-- 病気がわかるまでの道のり調査の確認台本（supabase/migrations/20261010_journey_survey.sql・20261028_journey_generalize.sql）
--
-- ★ 疾患を選んで流す（共通契約 F。2026-10-04）: 下の「疾患の指定」の set_config の値（disease_catalog の固定 ID）を書き換える。
--   既定は rd00001（ファブリー病）。疾患別の選択肢が決まっている病気（journey_disease_ready が true）だけを指定できる。
--   疾患別の選択肢の値は、台本の中で journey_options(疾患, 設問) から取る（台本にファブリー病の値を書かない）。
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261031_journey_departments.sql まで当てる
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_delete_account.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vj_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vj_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--
-- 登場人物（user_id は固定。メールは @verify-journey.invalid）:
--   A  会1（指定した病気の会）の会員。会2（選択肢が決まっていない別の病気の会）の会員でもある。回答し、あとで取り消す
--   B  会1 の会員。回答し、あとでアカウントを消す
--   C  会1 の会員。同意せずに回答しようとする／あとで回答し、Studio で auth.users ごと消される
--   D  会1 の会員ではない
--   anon  未ログイン
--
-- 項目:
--   0 前提（関数の所有者が BYPASSRLS を持つ、など）
--   1 回答の決まり（同意・会員・対象疾患・選択肢・排他と連動・1 人 1 回）
--   2 他人の回答・対応が読めない／表を直接触れない
--   3 集計関数が user_id を返さず、対応表を使わない
--   4 10 未満が伏せられる（総数 10 未満は 0 行・セルの「10未満」・補完秘匿・性別の行・今月の回答は数えない）
--   5 取り消しで回答も対応も消え、同意も取り消される
--   6 アカウント削除（delete_my_account）と、Studio での auth.users の削除で回答が消える
--   7 anon は何もできない
--   8 関数の SECURITY DEFINER・search_path 固定・EXECUTE 権限、表の RLS
--   9 consents.kind に journey が入る（ほかの値は入らない）
--  10 疾患ごとに動く（disease_id の列・会の病気にない病気の集計は止まる・選択肢が決まっていない病気は回答できない）
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 疾患の指定（ここだけ書き換える。disease_catalog の固定 ID）
-- -----------------------------------------------------------------------------
SELECT set_config('vj.disease_id', 'rd00001', false);


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids UUID[] := ARRAY[
        '00000000-0000-4000-8000-0000000ea001', '00000000-0000-4000-8000-0000000eb001',
        '00000000-0000-4000-8000-0000000ec001', '00000000-0000-4000-8000-0000000ed001']::UUID[];
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-journey.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regclass('public.journey_responses') IS NULL OR to_regclass('public.journey_links') IS NULL THEN
        RAISE EXCEPTION 'journey_responses / journey_links がありません。先に 20261010_journey_survey.sql を当ててください';
    END IF;
    IF to_regprocedure('public.journey_disease_ready(text)') IS NULL THEN
        RAISE EXCEPTION 'journey_disease_ready がありません。先に 20261028_journey_generalize.sql を当ててください';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.disease_catalog WHERE disease_id = current_setting('vj.disease_id')) THEN
        RAISE EXCEPTION '疾患 % は disease_catalog にありません', current_setting('vj.disease_id');
    END IF;
    IF NOT public.journey_disease_ready(current_setting('vj.disease_id')) THEN
        RAISE EXCEPTION '疾患 % は疾患別の選択肢が決まっていません（journey_disease_ready が false）', current_setting('vj.disease_id');
    END IF;
    IF NOT ('found_before_symptoms' = ANY (public.journey_options(current_setting('vj.disease_id'), 'first_symptoms')))
       OR cardinality(public.journey_options(current_setting('vj.disease_id'), 'first_symptoms')) < 3 THEN
        RAISE EXCEPTION '疾患 % の最初の症状の選択肢に found_before_symptoms が無いか、選択肢が 3 つ未満です（台本の前提）', current_setting('vj.disease_id');
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_journey_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_journey_results RESTART IDENTITY;

CREATE OR REPLACE FUNCTION pg_temp.vj_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_who
        WHEN 'A' THEN '00000000-0000-4000-8000-0000000ea001'::UUID
        WHEN 'B' THEN '00000000-0000-4000-8000-0000000eb001'::UUID
        WHEN 'C' THEN '00000000-0000-4000-8000-0000000ec001'::UUID
        WHEN 'D' THEN '00000000-0000-4000-8000-0000000ed001'::UUID
    END;
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: A・B・C・D（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
CREATE OR REPLACE FUNCTION pg_temp.vj_as(p_who TEXT, p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_res TEXT;
BEGIN
    BEGIN
        IF p_who = 'anon' THEN
            PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::TEXT, true);
            EXECUTE 'SET LOCAL ROLE anon';
        ELSIF p_who <> 'admin' THEN
            PERFORM set_config('request.jwt.claims',
                json_build_object('sub', pg_temp.vj_uid(p_who), 'role', 'authenticated')::TEXT, true);
            EXECUTE 'SET LOCAL ROLE authenticated';
        END IF;

        EXECUTE p_sql INTO v_res;

        EXECUTE 'RESET ROLE';
        PERFORM set_config('request.jwt.claims', '', true);
        RETURN coalesce(v_res, '(null)');
    EXCEPTION WHEN OTHERS THEN
        RETURN 'ERROR ' || SQLSTATE || ' ' || SQLERRM;
    END;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.vj_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_journey_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 300),
            CASE WHEN coalesce(p_ok, false) THEN 'OK' ELSE 'NG' END);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vj_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vj_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vj_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;

-- submit_journey_response を呼ぶ SQL（引数の並びは 20261028 と同じ）。p_symptoms は SQL の配列の書き方で渡す。
-- 病気は既定で指定した病気。家族の病歴は既定でその病気の選択肢の 1 つ目（台本の役割で引く）
CREATE OR REPLACE FUNCTION pg_temp.vj_submit(
    p_group UUID, p_symptoms TEXT,
    p_onset TEXT DEFAULT '5_9', p_diag_age TEXT DEFAULT '20_24', p_delay TEXT DEFAULT '10_19',
    p_disease TEXT DEFAULT NULL, p_version INT DEFAULT 1,
    p_respondent TEXT DEFAULT 'self', p_family TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT format(
        $q$SELECT 'done' FROM public.submit_journey_response(%L::uuid, %L, %s, %L, '1980_1984', 'male', 'kanto', %s::text[], %L, 'pediatrics', 'nephrology', '2_3', '2_3', %L, 'yes', %L, %L)$q$,
        p_group, coalesce(p_disease, current_setting('vj.disease_id')), p_version, p_respondent, p_symptoms,
        p_onset, p_diag_age,
        coalesce(p_family, (public.journey_options(current_setting('vj.disease_id'), 'family_history_clue'))[1]),
        p_delay);
$$;

-- journey_summary の 1 セル（question / choice / sex）の n。無ければ '(なし)'
CREATE OR REPLACE FUNCTION pg_temp.vj_cell(p_group UUID, p_q TEXT, p_c TEXT, p_s TEXT)
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT format(
        $q$SELECT coalesce((SELECT n FROM public.journey_summary(%L::uuid, %L) WHERE question = %L AND choice = %L AND sex = %L), '(なし)')$q$,
        p_group, current_setting('vj.disease_id'), p_q, p_c, p_s);
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    uA UUID := pg_temp.vj_uid('A');
    uB UUID := pg_temp.vj_uid('B');
    uC UUID := pg_temp.vj_uid('C');
    uD UUID := pg_temp.vj_uid('D');
    g1 UUID := '00000000-0000-4000-8000-0000000ef001';  -- 指定した病気の会（確認用）
    g2 UUID := '00000000-0000-4000-8000-0000000ef002';  -- 選択肢が決まっていない別の病気の会（確認用）
    v_dis   TEXT := current_setting('vj.disease_id');
    v_name  TEXT;
    v_idx   INT;
    v_dis2  TEXT;
    v_name2 TEXT;
    v_idx2  INT;
    s1 TEXT; s2 TEXT; f1 TEXT;
    v_users UUID[];
    ERR_PERM CONSTANT TEXT := 'ERROR 42501%';
    DONE     CONSTANT TEXT := 'done';
    OK_SYM   TEXT;
    v_prev   DATE := ((date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'))::DATE - INTERVAL '1 month')::DATE;
    r_a UUID; r_b UUID; r_c UUID;
    v TEXT;
    t TEXT;
BEGIN
    v_users := ARRAY[uA, uB, uC, uD];

    -- 指定した病気と、選択肢が決まっていない別の病気（会2 に使う）。症状の値は選択肢から取る
    SELECT c.name, c.idx INTO v_name, v_idx FROM public.disease_catalog c WHERE c.disease_id = v_dis;
    SELECT c.disease_id, c.name, c.idx INTO v_dis2, v_name2, v_idx2
      FROM public.disease_catalog c
     WHERE c.disease_id <> v_dis AND NOT public.journey_disease_ready(c.disease_id)
     ORDER BY c.idx LIMIT 1;
    s1 := (public.journey_options(v_dis, 'first_symptoms'))[1];
    s2 := (public.journey_options(v_dis, 'first_symptoms'))[2];
    f1 := (public.journey_options(v_dis, 'family_history_clue'))[1];
    OK_SYM := format('ARRAY[%L]', s1);

    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 4 人・会 2 つ・所属を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);   -- 会を消すと回答・対応も消える

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vj-' || w || '@verify-journey.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_users, ARRAY['a', 'b', 'c', 'd']) AS x(u, w);

    INSERT INTO public.patient_groups (id, slug, name, disease_idxs, disease_names, disease_ids) VALUES
        (g1, 'verify-journey-1', 'VJ 確認用の会1', ARRAY[v_idx]::INT[], ARRAY[v_name]::TEXT[], ARRAY[v_dis]::TEXT[]),
        (g2, 'verify-journey-2', 'VJ 確認用の会2', ARRAY[v_idx2]::INT[], ARRAY[v_name2]::TEXT[], ARRAY[v_dis2]::TEXT[]);

    INSERT INTO public.memberships (user_id, group_id, role) VALUES
        (uA, g1, 'moderator'),
        (uB, g1, 'member'),
        (uC, g1, 'member'),
        (uA, g2, 'moderator');

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vj_chk('0', 'auth.uid() が切り替えた人になる', 'A', 'SELECT auth.uid()::text', uA::TEXT);
    PERFORM pg_temp.vj_chk('0', 'anon では auth.uid() が空', 'anon', 'SELECT auth.uid()::text', '(null)');
    PERFORM pg_temp.vj_chk('0', '関数の所有者が BYPASSRLS を持つ（無いと FORCE RLS の表で 0 行になる）', 'admin',
        $q$SELECT bool_and(r.rolbypassrls)::text FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.oid = ANY (ARRAY['public.my_journey_responses()', 'public.withdraw_my_journey_response(uuid)',
                                    'public.journey_summary(uuid,text)', 'public.journey_links_delete_response()',
                                    'public.delete_my_account()']::regprocedure[])
              OR p.proname = 'submit_journey_response'$q$, 'true');

    -- =========================================================================
    -- 1. 回答の決まり
    -- =========================================================================
    PERFORM pg_temp.vj_chk('1', '同意せずに回答する', 'C', pg_temp.vj_submit(g1, OK_SYM), 'ERROR P0001 consent_required');
    PERFORM pg_temp.vj_chk('1', 'journey の同意（版 1）を本人として記録する', 'A',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'journey', 1) RETURNING kind$q$, 'journey');
    PERFORM pg_temp.vj_chk('1', 'journey の同意（版 1）を本人として記録する', 'B',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'journey', 1) RETURNING kind$q$, 'journey');
    PERFORM pg_temp.vj_chk('1', 'journey の同意（版 1）を本人として記録する', 'D',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'journey', 1) RETURNING kind$q$, 'journey');
    PERFORM pg_temp.vj_chk('1', '同意した版と違う版で回答する', 'A', pg_temp.vj_submit(g1, OK_SYM, p_version => 2), 'ERROR P0001 consent_required');
    PERFORM pg_temp.vj_chk('1', '会員でない会に回答する', 'D', pg_temp.vj_submit(g1, OK_SYM), 'ERROR P0001 not_member');
    PERFORM pg_temp.vj_chk('1', '選択肢が決まっていない病気の会（会2）にその病気で回答する', 'A',
        pg_temp.vj_submit(g2, OK_SYM, p_disease => v_dis2), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '会2 に、会2 の病気でない病気（指定した病気）で回答する', 'A', pg_temp.vj_submit(g2, OK_SYM), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '会1 に、会1 の病気でない病気で回答する', 'A', pg_temp.vj_submit(g1, OK_SYM, p_disease => v_dis2), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '家族の病歴に、その病気の選択肢にない値', 'A', pg_temp.vj_submit(g1, OK_SYM, p_family => 'maybe'), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '選択肢にない値', 'A', pg_temp.vj_submit(g1, OK_SYM, p_respondent => 'someone'), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '最初の症状が 0 個', 'A', pg_temp.vj_submit(g1, 'ARRAY[]'), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '最初の症状に NULL', 'A', pg_temp.vj_submit(g1, format('ARRAY[%L, NULL]', s1)), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '排他の選択肢をほかの症状と一緒に選ぶ', 'A',
        pg_temp.vj_submit(g1, format('ARRAY[%L, %L]', 'found_before_symptoms', s1), 'before_symptoms', 'before_symptoms', 'before_symptoms'),
        'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '排他の選択肢を選んだのに、設問 6 が年齢', 'A',
        pg_temp.vj_submit(g1, $s$ARRAY['found_before_symptoms']$s$, '5_9', 'before_symptoms', 'before_symptoms'), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', '排他の選択肢を選んでいないのに、設問 14 が「気づく前」', 'A',
        pg_temp.vj_submit(g1, OK_SYM, '5_9', '20_24', 'before_symptoms'), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('1', 'A が回答する（排他の選択肢と連動 3 問）', 'A',
        pg_temp.vj_submit(g1, $s$ARRAY['found_before_symptoms']$s$, 'before_symptoms', 'before_symptoms', 'before_symptoms'), DONE);
    PERFORM pg_temp.vj_chk('1', 'A がもう一度回答する', 'A', pg_temp.vj_submit(g1, OK_SYM), 'ERROR P0001 already_answered');
    PERFORM pg_temp.vj_chk('1', 'B が回答する（症状の重複は 1 つにまとまる）', 'B',
        pg_temp.vj_submit(g1, format('ARRAY[%L, %L, %L]', s1, s2, s1), p_respondent => 'proxy'), DONE);
    PERFORM pg_temp.vj_chk('1', 'B の回答の症状（重複を落として並べ直す）', 'B',
        $q$SELECT array_to_string(first_symptoms, ',') FROM public.my_journey_responses()$q$,
        array_to_string(ARRAY(SELECT x FROM unnest(ARRAY[s1, s2]) AS x ORDER BY x), ','));
    PERFORM pg_temp.vj_chk('1', 'B の回答の病気（disease_id と、会の表示名）', 'B',
        $q$SELECT disease_id || ':' || disease_name FROM public.my_journey_responses()$q$, v_dis || ':' || v_name);
    PERFORM pg_temp.vj_chk('1', '回答に時刻は無く、月の 1 日だけ', 'admin', format(
        $q$SELECT (extract(day FROM answered_month) = 1)::text FROM public.journey_responses r
             JOIN public.journey_links l ON l.response_id = r.id WHERE l.user_id = %L$q$, uB), 'true');
    PERFORM pg_temp.vj_chk('1', 'journey_responses に user_id の列が無い', 'admin',
        $q$SELECT count(*)::text FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'journey_responses' AND column_name = 'user_id'$q$, '0');

    SELECT l.response_id INTO r_a FROM public.journey_links l WHERE l.user_id = uA;
    SELECT l.response_id INTO r_b FROM public.journey_links l WHERE l.user_id = uB;

    -- =========================================================================
    -- 2. 他人の回答・対応が読めない／表を直接触れない
    -- =========================================================================
    PERFORM pg_temp.vj_chk('2', '対応表は自分の行だけ見える', 'B',
        $q$SELECT count(*)::text || ':' || count(*) FILTER (WHERE user_id = auth.uid())::text FROM public.journey_links$q$, '1:1');
    PERFORM pg_temp.vj_chk('2', 'A の対応の行は見えない', 'B', format(
        $q$SELECT count(*)::text FROM public.journey_links WHERE response_id = %L$q$, r_a), '0');
    PERFORM pg_temp.vj_chk('2', '自分の回答の一覧は自分の 1 件だけ', 'B',
        $q$SELECT count(*)::text || ':' || string_agg(respondent, ',') FROM public.my_journey_responses()$q$, '1:proxy');
    PERFORM pg_temp.vj_chk('2', '回答の表を直接読む', 'B', 'SELECT count(*)::text FROM public.journey_responses', ERR_PERM);
    PERFORM pg_temp.vj_chk('2', '回答の表に直接書く', 'B', format(
        $q$UPDATE public.journey_responses SET respondent = 'self' WHERE id = %L$q$, r_a), ERR_PERM);
    PERFORM pg_temp.vj_chk('2', '回答の表から直接消す', 'B', format(
        $q$DELETE FROM public.journey_responses WHERE id = %L$q$, r_a), ERR_PERM);
    PERFORM pg_temp.vj_chk('2', '対応表に直接書く（他人の回答を自分に結ぶ）', 'B', format(
        $q$INSERT INTO public.journey_links (response_id, user_id, group_id, disease_id) VALUES (%L, auth.uid(), %L, %L)$q$, r_a, g1, v_dis), ERR_PERM);
    PERFORM pg_temp.vj_chk('2', '対応表から直接消す（本人の行でも。取り消しは関数だけ）', 'B',
        $q$DELETE FROM public.journey_links WHERE user_id = auth.uid()$q$, ERR_PERM);
    PERFORM pg_temp.vj_chk('2', '他人（A）の回答を取り消す', 'B', format(
        $q$SELECT 'done' FROM public.withdraw_my_journey_response(%L)$q$, r_a), 'ERROR P0001 not_found');
    PERFORM pg_temp.vj_chk('2', '上の操作の後も A の回答と対応はそのまま', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.journey_links WHERE response_id = %L AND user_id = %L)::text$q$, r_a, r_a, uA), '1:1');

    -- =========================================================================
    -- 3. 集計関数が user_id を返さず、対応表を使わない
    -- =========================================================================
    PERFORM pg_temp.vj_chk('3', 'journey_summary の戻り値の列', 'admin',
        $q$SELECT pg_get_function_result('public.journey_summary(uuid,text)'::regprocedure)$q$,
        'TABLE(question text, choice text, sex text, n text)');
    PERFORM pg_temp.vj_chk('3', 'journey_summary の本文に journey_links・user_id が出てこない', 'admin',
        $q$SELECT (prosrc NOT LIKE '%journey_links%' AND prosrc NOT LIKE '%user_id%')::text
             FROM pg_proc WHERE oid = 'public.journey_summary(uuid,text)'::regprocedure$q$, 'true');
    PERFORM pg_temp.vj_chk('3', 'my_journey_responses の戻り値に user_id が無い', 'admin',
        $q$SELECT (pg_get_function_result('public.my_journey_responses()'::regprocedure) NOT LIKE '%user_id%')::text$q$, 'true');

    -- =========================================================================
    -- 4. 10 未満が伏せられる
    -- =========================================================================
    PERFORM pg_temp.vj_chk('4', '今月の回答 2 件だけ → 集計は 0 行', 'A',
        format($q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis), '0');
    PERFORM pg_temp.vj_chk('4', '会員でない人は集計を見られない', 'D',
        format($q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis), 'ERROR P0001 not_member');

    -- 前月の回答を 9 件（対応表なし。台本の役割で直接入れる）。全員 男性・本人・最初の症状は選択肢の 1 つ目。
    -- disease_idx はトリガーが disease_id から埋める
    INSERT INTO public.journey_responses (
        group_id, disease_id, disease_name, consent_version, respondent, birth_year_band, gender, region,
        first_symptoms, onset_age_band, first_department, diagnosis_department, facilities_count, departments_count,
        diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay, answered_month)
    SELECT g1, v_dis, v_name, 1, 'self', '1980_1984', 'male', 'kanto',
           ARRAY[s1], '5_9', 'pediatrics', 'nephrology', '2_3', '2_3',
           '20_24', CASE WHEN i = 1 THEN 'no' ELSE 'yes' END, f1, '10_19', v_prev
      FROM generate_series(1, 9) AS i;
    PERFORM pg_temp.vj_chk('4', '前月 9 件＋今月 2 件 → 集計は 0 行（総数 10 未満）', 'A',
        format($q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis), '0');

    -- さらに 3 件（other_diagnosis: unknown 1 件、yes 2 件）→ 前月は 12 件（yes 10・no 1・unknown 1）
    INSERT INTO public.journey_responses (
        group_id, disease_id, disease_name, consent_version, respondent, birth_year_band, gender, region,
        first_symptoms, onset_age_band, first_department, diagnosis_department, facilities_count, departments_count,
        diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay, answered_month)
    SELECT g1, v_dis, v_name, 1, 'self', '1980_1984', 'male', 'kanto',
           ARRAY[s1], '5_9', 'pediatrics', 'nephrology', '2_3', '2_3',
           '20_24', CASE WHEN i = 1 THEN 'unknown' ELSE 'yes' END, f1, '10_19', v_prev
      FROM generate_series(1, 3) AS i;

    PERFORM pg_temp.vj_chk('4', '総数は前月までの 12（今月の A・B は数えない）', 'A', pg_temp.vj_cell(g1, 'total', 'total', 'all'), '12');
    PERFORM pg_temp.vj_chk('4', '10 未満のセル（別の病名: なし＝1 人）は「10未満」', 'A', pg_temp.vj_cell(g1, 'other_diagnosis', 'no', 'all'), '10未満');
    PERFORM pg_temp.vj_chk('4', '0 人のセル（回答者: 代理＝0 人）も「10未満」', 'A',
        pg_temp.vj_cell(g1, 'respondent', 'proxy', 'all'), '10未満');
    PERFORM pg_temp.vj_chk('4', '伏せたセルが 2 つあれば、10 以上のセルは出る（別の病名: あり＝10）', 'A',
        pg_temp.vj_cell(g1, 'other_diagnosis', 'yes', 'all'), '10');
    PERFORM pg_temp.vj_chk('4', '補完秘匿: 伏せたセルが 1 つだけ（代理 0）なら、本人 12 も伏せる', 'A',
        pg_temp.vj_cell(g1, 'respondent', 'self', 'all'), '10未満');
    PERFORM pg_temp.vj_chk('4', '複数選択（最初の症状: 選択肢の 1 つ目 12）は補完秘匿しない', 'A',
        pg_temp.vj_cell(g1, 'first_symptoms', s1, 'all'), '12');
    PERFORM pg_temp.vj_chk('4', '性別の行: 女性が 0 人なので、男性 10 の行も伏せる', 'A',
        pg_temp.vj_cell(g1, 'other_diagnosis', 'yes', 'male'), '10未満');
    PERFORM pg_temp.vj_chk('4', '性別の設問そのものは性別と掛け合わせない', 'A', format(
        $q$SELECT count(*)::text FROM public.journey_summary(%L, %L) WHERE question = 'gender' AND sex <> 'all'$q$, g1, v_dis), '0');
    PERFORM pg_temp.vj_chk('4', '返る数はすべて 10 以上か「10未満」', 'A', format(
        $q$SELECT count(*) FILTER (WHERE CASE WHEN n = '10未満' THEN false WHEN n ~ '^\d+$' THEN n::int < 10 ELSE true END)::text
             FROM public.journey_summary(%L, %L)$q$, g1, v_dis), '0');
    -- 期待の行数（総数の行 1 ＋ 選択肢の数 × 性別の列）は台本の役割（admin）で数える。
    -- journey_options は会員には実行権限が無い（項目 8 で確かめる設計）ので、会員 A としては呼ばない
    v := pg_temp.vj_as('admin', format(
        $q$SELECT (1 + sum(cardinality(public.journey_options(%L, q)) * CASE WHEN q = 'gender' THEN 1 ELSE 4 END))::text
             FROM unnest(ARRAY['respondent','birth_year_band','gender','region','first_symptoms',
                               'onset_age_band','first_department','diagnosis_department','facilities_count',
                               'departments_count','diagnosis_age_band','other_diagnosis',
                               'family_history_clue','diagnosis_delay']) AS q$q$, v_dis));
    PERFORM pg_temp.vj_chk('4', 'どのセルも返る（総数の行 1 ＋ 選択肢の数 × 性別。0 人の選択肢も行がある）', 'A', format(
        $q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis), v, v || '（admin で数えた期待の行数）');

    -- =========================================================================
    -- 5. 取り消し
    -- =========================================================================
    PERFORM pg_temp.vj_chk('5', 'A が自分の回答を取り消す', 'A', format(
        $q$SELECT 'done' FROM public.withdraw_my_journey_response(%L)$q$, r_a), DONE);
    PERFORM pg_temp.vj_chk('5', 'A の回答と対応が 0 行', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.journey_links WHERE user_id = %L)::text$q$, r_a, uA), '0:0');
    PERFORM pg_temp.vj_chk('5', 'A の journey の同意が取り消されている（行は残る）', 'admin', format(
        $q$SELECT count(*)::text || ':' || bool_and(withdrawn_at IS NOT NULL)::text
             FROM public.consents WHERE user_id = %L AND kind = 'journey'$q$, uA), '1:true');
    PERFORM pg_temp.vj_chk('5', 'もう一度取り消す', 'A', format(
        $q$SELECT 'done' FROM public.withdraw_my_journey_response(%L)$q$, r_a), 'ERROR P0001 not_found');
    PERFORM pg_temp.vj_chk('5', '同意を取り消したので、そのままでは答え直せない', 'A', pg_temp.vj_submit(g1, OK_SYM), 'ERROR P0001 consent_required');
    PERFORM pg_temp.vj_chk('5', 'B の回答は残る', 'admin', format(
        $q$SELECT count(*)::text FROM public.journey_responses WHERE id = %L$q$, r_b), '1');

    -- =========================================================================
    -- 6. アカウント削除と、Studio での auth.users の削除
    -- =========================================================================
    PERFORM pg_temp.vj_chk('6', 'B がアカウントを消す', 'B', $q$SELECT 'done' FROM public.delete_my_account()$q$, DONE);
    PERFORM pg_temp.vj_chk('6', 'B の回答と対応が 0 行', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.journey_links WHERE user_id = %L)::text$q$, r_b, uB), '0:0');

    PERFORM pg_temp.vj_chk('6', 'C が同意する', 'C',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'journey', 1) RETURNING kind$q$, 'journey');
    PERFORM pg_temp.vj_chk('6', 'C が回答する', 'C', pg_temp.vj_submit(g1, OK_SYM), DONE);
    SELECT l.response_id INTO r_c FROM public.journey_links l WHERE l.user_id = uC;
    DELETE FROM auth.users WHERE id = uC;
    PERFORM pg_temp.vj_chk('6', 'Studio で auth.users の C を消すと、対応も回答も消える', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.journey_links WHERE user_id = %L)::text$q$, r_c, uC), '0:0');
    PERFORM pg_temp.vj_chk('6', '対応表なしで入れた前月の 12 件は残る（誰の削除でも消えない）', 'admin', format(
        $q$SELECT count(*)::text FROM public.journey_responses WHERE group_id = %L$q$, g1), '12');

    -- =========================================================================
    -- 7. anon は何もできない
    -- =========================================================================
    PERFORM pg_temp.vj_chk('7', '回答の表を読む', 'anon', 'SELECT count(*)::text FROM public.journey_responses', ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '対応表を読む', 'anon', 'SELECT count(*)::text FROM public.journey_links', ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '回答する', 'anon', pg_temp.vj_submit(g1, OK_SYM), ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '自分の回答の一覧', 'anon', 'SELECT count(*)::text FROM public.my_journey_responses()', ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '取り消す', 'anon', format(
        $q$SELECT 'done' FROM public.withdraw_my_journey_response(%L)$q$, r_b), ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '集計', 'anon', format(
        $q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis), ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '選択肢の関数', 'anon', $q$SELECT array_length(public.journey_options('gender'), 1)::text$q$, ERR_PERM);
    PERFORM pg_temp.vj_chk('7', '疾患ごとの選択肢の関数', 'anon', format(
        $q$SELECT array_length(public.journey_options(%L, 'first_symptoms'), 1)::text$q$, v_dis), ERR_PERM);

    -- =========================================================================
    -- 8. 関数の設定と表の RLS
    -- =========================================================================
    FOREACH t IN ARRAY ARRAY[
        'public.submit_journey_response(uuid,text,integer,text,text,text,text,text[],text,text,text,text,text,text,text,text,text)',
        'public.my_journey_responses()', 'public.withdraw_my_journey_response(uuid)',
        'public.journey_summary(uuid,text)', 'public.delete_my_account()'] LOOP
        PERFORM pg_temp.vj_chk('8', t || ': SECURITY DEFINER', 'admin', format(
            $q$SELECT prosecdef::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vj_chk('8', t || ': search_path が空に固定されている', 'admin', format(
            $q$SELECT ('search_path=""' = ANY (coalesce(proconfig, '{}')))::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vj_chk('8', t || ': anon は実行できない・authenticated は実行できる', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', %L, 'EXECUTE')
                       AND has_function_privilege('authenticated', %L, 'EXECUTE'))::text$q$, t, t), 'true');
        PERFORM pg_temp.vj_chk('8', t || ': PUBLIC に EXECUTE が付いていない', 'admin', format(
            $q$SELECT (p.proacl IS NOT NULL
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))::text
                 FROM pg_proc p WHERE p.oid = %L::regprocedure$q$, t), 'true');
    END LOOP;
    FOREACH t IN ARRAY ARRAY['public.journey_options(text)', 'public.journey_options(text,text)', 'public.journey_disease_ready(text)',
                             'public.journey_links_delete_response()', 'public.journey_fill_disease()'] LOOP
        PERFORM pg_temp.vj_chk('8', t || ': search_path が空に固定されている', 'admin', format(
            $q$SELECT ('search_path=""' = ANY (coalesce(proconfig, '{}')))::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vj_chk('8', t || ': anon・authenticated・PUBLIC は実行できない', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', %L, 'EXECUTE')
                       AND NOT has_function_privilege('authenticated', %L, 'EXECUTE')
                       AND p.proacl IS NOT NULL
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))::text
                 FROM pg_proc p WHERE p.oid = %L::regprocedure$q$, t, t, t), 'true');
    END LOOP;
    PERFORM pg_temp.vj_chk('8', 'journey_links_delete_response は SECURITY DEFINER', 'admin',
        $q$SELECT prosecdef::text FROM pg_proc WHERE oid = 'public.journey_links_delete_response()'::regprocedure$q$, 'true');
    PERFORM pg_temp.vj_chk('8', '2 表とも RLS が有効で FORCE', 'admin',
        $q$SELECT string_agg(relname || '=' || relrowsecurity::text || '/' || relforcerowsecurity::text, ',' ORDER BY relname)
             FROM pg_class WHERE oid IN ('public.journey_links'::regclass, 'public.journey_responses'::regclass)$q$,
        'journey_links=true/true,journey_responses=true/true');
    PERFORM pg_temp.vj_chk('8', 'ポリシーは journey_links の本人の SELECT だけ', 'admin',
        $q$SELECT string_agg(tablename || ':' || policyname || ':' || cmd, ',' ORDER BY tablename, policyname)
             FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('journey_links', 'journey_responses')$q$,
        'journey_links:journey_links_select_own:SELECT');
    PERFORM pg_temp.vj_chk('8', 'authenticated の表の権限は journey_links の SELECT だけ', 'admin',
        $q$SELECT string_agg(table_name || ':' || privilege_type, ',' ORDER BY table_name, privilege_type)
             FROM information_schema.role_table_grants
            WHERE grantee = 'authenticated' AND table_schema = 'public'
              AND table_name IN ('journey_links', 'journey_responses')$q$,
        'journey_links:SELECT');

    -- =========================================================================
    -- 9. consents.kind
    -- =========================================================================
    PERFORM pg_temp.vj_chk('9', 'consents に journey 以外の知らない種類は入らない', 'D',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'foo', 1) RETURNING kind$q$, 'ERROR 23514%');
    PERFORM pg_temp.vj_chk('9', 'consents.kind の CHECK は 1 本で、4 種類', 'admin',
        $q$SELECT count(*)::text || ':' || string_agg(pg_get_constraintdef(oid), ' ')
             FROM pg_constraint WHERE conrelid = 'public.consents'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%research_contact%'$q$,
        '1:%base%research_contact%stats%journey%');

    -- =========================================================================
    -- 10. 疾患ごとに動く（20261028）
    -- =========================================================================
    PERFORM pg_temp.vj_chk('10', '会1 の回答はすべて指定した病気で、disease_idx もトリガーで埋まっている', 'admin', format(
        $q$SELECT count(*) FILTER (WHERE disease_id = %L AND disease_idx = %s)::text || '/' || count(*)::text
             FROM public.journey_responses WHERE group_id = %L$q$, v_dis, v_idx, g1), '12/12');
    PERFORM pg_temp.vj_chk('10', 'disease_id の列は NULL 不可（2 表とも）', 'admin',
        $q$SELECT string_agg(table_name || '=' || is_nullable, ',' ORDER BY table_name)
             FROM information_schema.columns
            WHERE table_schema = 'public' AND column_name = 'disease_id'
              AND table_name IN ('journey_links', 'journey_responses')$q$, 'journey_links=NO,journey_responses=NO');
    PERFORM pg_temp.vj_chk('10', '会の病気にない病気を集計しようとする', 'A', format(
        $q$SELECT count(*)::text FROM public.journey_summary(%L, %L)$q$, g1, v_dis2), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vj_chk('10', '選択肢が決まっていない病気の疾患別の選択肢は NULL・共通の選択肢はある', 'admin', format(
        $q$SELECT (public.journey_options(%L, 'first_symptoms') IS NULL
                   AND public.journey_options(%L, 'family_history_clue') IS NULL
                   AND public.journey_options(%L, 'gender') = public.journey_options('gender'))::text$q$, v_dis2, v_dis2, v_dis2), 'true');
    PERFORM pg_temp.vj_chk('10', '共通の 12 問の選択肢は、指定した病気でも共通の一覧（journey_options(設問)）と同じ', 'admin', format(
        $q$SELECT bool_and(public.journey_options(%L, q) = public.journey_options(q))::text
             FROM unnest(ARRAY['respondent','birth_year_band','gender','region','onset_age_band','first_department',
                               'diagnosis_department','facilities_count','departments_count','diagnosis_age_band',
                               'other_diagnosis','diagnosis_delay']) AS q$q$, v_dis), 'true');
    PERFORM pg_temp.vj_chk('10', '共通の診療科に救急科・新生児科・肝臓内科がある（20261031。設問 7・8 とも、その他の前）', 'admin', format(
        $q$SELECT array_to_string(public.journey_options(%L, 'first_department')[13:18], ',') || '|' ||
                  array_to_string(public.journey_options(%L, 'diagnosis_department')[13:18], ',')$q$, v_dis, v_dis),
        'psychiatry,emergency,neonatology,hepatology,other,not_remember|psychiatry,emergency,neonatology,hepatology,other,not_remember');
    PERFORM pg_temp.vj_chk('10', '旧い引数の形の関数が残っていない', 'admin',
        $q$SELECT (to_regprocedure('public.journey_summary(uuid,integer)') IS NULL
                   AND to_regprocedure('public.submit_journey_response(uuid,integer,text,integer,text,text,text,text,text[],text,text,text,text,text,text,text,text,text)') IS NULL)::text$q$,
        'true');
    PERFORM pg_temp.vj_chk('10', '対応表に (user_id, group_id, disease_id) の一意制約がある', 'admin',
        $q$SELECT count(*)::text FROM pg_constraint
            WHERE conrelid = 'public.journey_links'::regclass AND conname = 'journey_links_one_per_user_disease' AND contype = 'u'$q$, '1');

    -- =========================================================================
    -- 後片付け（テストユーザーと会を消す。会を消すと、その会の回答・対応も消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    PERFORM pg_temp.vj_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.journey_responses WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.journey_links WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.memberships WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.consents WHERE user_id = ANY (%L::uuid[])))::text$q$,
        v_users, g1, g2, g1, g2, v_users, v_users, v_users), '0');
END;
$$;


-- -----------------------------------------------------------------------------
-- 結果（先頭の行が NG の件数）
-- -----------------------------------------------------------------------------
SELECT no AS "項目番号", item AS "項目", expected AS "期待", actual AS "実際", ok AS "OK・NG"
  FROM (
    SELECT 0 AS seq, 'まとめ' AS no,
           '全 ' || count(*) FILTER (WHERE ok IN ('OK', 'NG')) || ' 件' AS item,
           'NG 0 件' AS expected,
           'NG ' || count(*) FILTER (WHERE ok = 'NG') || ' 件' AS actual,
           CASE WHEN count(*) FILTER (WHERE ok = 'NG') = 0 THEN 'OK' ELSE 'NG' END AS ok
      FROM pg_temp.verify_journey_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_journey_results
  ) r
 ORDER BY seq;
