-- =============================================================================
-- 運営・疾患の固定 ID・案件・公開の参加状況・会の新設の確認台本（共通契約 2026-10-03 の A〜E）
--   supabase/migrations/20261022_operators.sql・20261023_disease_catalog.sql・20261024_trial_notices.sql・
--   20261025_public_disease_participation.sql・20261026_group_requests.sql・20261030_list_all_reports.sql
--   （20261022〜20261030 をすべて当ててから流す。20261029 は同意担当）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261026_group_requests.sql まで当てる（20261023 を含む）
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_events.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vo_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vo_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--
-- テスト用の病気（disease_catalog に台本の役割で足し、終わりに消す）:
--   rd99901（VO病気1）・rd99902（VO病気2）・rd99903（VO病気3。誰も関わらない＝0 の行）
--
-- 登場人物（user_id は固定。メールは @verify-ops.invalid）:
--   OP1・OP2  運営（台本の役割で operators に入れる）
--   UA   研究の案内に同意し、病気 1 を選んでいる（B 層）
--   UB   研究の案内に同意し、病気 2 だけを選んでいる
--   UC   病気 1 を選んでいるが、研究の案内に同意していない
--   UM   病気 1 の会 1 の世話人
--   UP   病気 1 の会 1 と会 2 の両方の会員（members の重複排除を見る）
--   UW   病気 2 の参加希望者
--   UN   何もしていない
--   K01〜K10  会 1 の会員（members の人数を 10 前後にする）
--   anon 未ログイン
--
-- 項目:
--   0 前提                         1 運営以外は運営の関数を使えない・運営の一覧は表示名だけ
--   2 案件は B 層にだけ見える（draft・closed・ほかの病気・同意なし・会員でない人・anon には見えない）
--   3 notice_interest は本人だけ・運営は実数だけ    4 公開の参加状況（秘匿・0 の行・members の重複排除）
--   5 会の新設（1 人 1 件・申請できる人・承認で世話人になり public_groups に写る）
--   6 anon の不可                  7 関数の属性
--   8 疾患の固定 ID（disease_catalog・disease_id を埋めるトリガー・運営向けの参加希望の内訳 wish_summary_ops）
--   9 運営が通報を会をまたいで見る（list_all_reports。通報者・対応者を返さない）
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_ops_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_ops_results RESTART IDENTITY;

-- 登場人物 → user_id（...0000000c00NN。K01〜K10 は ...0000000c01NN）
CREATE OR REPLACE FUNCTION pg_temp.vo_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_who = 'OP1' THEN '00000000-0000-4000-8000-0000000c0001'::UUID
        WHEN p_who = 'OP2' THEN '00000000-0000-4000-8000-0000000c0002'::UUID
        WHEN p_who = 'UA'  THEN '00000000-0000-4000-8000-0000000c0003'::UUID
        WHEN p_who = 'UB'  THEN '00000000-0000-4000-8000-0000000c0004'::UUID
        WHEN p_who = 'UC'  THEN '00000000-0000-4000-8000-0000000c0005'::UUID
        WHEN p_who = 'UM'  THEN '00000000-0000-4000-8000-0000000c0006'::UUID
        WHEN p_who = 'UP'  THEN '00000000-0000-4000-8000-0000000c0007'::UUID
        WHEN p_who = 'UW'  THEN '00000000-0000-4000-8000-0000000c0008'::UUID
        WHEN p_who = 'UN'  THEN '00000000-0000-4000-8000-0000000c0009'::UUID
        WHEN p_who ~ '^K[0-9]{2}$' THEN ('00000000-0000-4000-8000-0000000c01' || substr(p_who, 2, 2))::UUID
    END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.vo_people()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY['OP1', 'OP2', 'UA', 'UB', 'UC', 'UM', 'UP', 'UW', 'UN']
        || ARRAY(SELECT 'K' || lpad(i::TEXT, 2, '0') FROM generate_series(1, 10) AS i);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vo_ids()
RETURNS UUID[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY(SELECT pg_temp.vo_uid(w) FROM unnest(pg_temp.vo_people()) AS w);
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: 登場人物（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
CREATE OR REPLACE FUNCTION pg_temp.vo_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.vo_uid(p_who), 'role', 'authenticated')::TEXT, true);
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

CREATE OR REPLACE FUNCTION pg_temp.vo_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_ops_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 600),
            CASE WHEN coalesce(p_ok, false) THEN 'OK' ELSE 'NG' END);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vo_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vo_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vo_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;

-- 公開の参加状況の 1 行（members|research_contact|wishes）。行が無ければ '(行なし)'
CREATE OR REPLACE FUNCTION pg_temp.vo_part(p_disease TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format(
        $q$SELECT coalesce((SELECT members || '|' || research_contact || '|' || wishes
                              FROM public.public_disease_participation WHERE disease_id = %L), '(行なし)')$q$, p_disease);
$$;

-- 本人に見える案件の数
CREATE OR REPLACE FUNCTION pg_temp.vo_visible()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT $q$SELECT count(*)::text FROM public.list_my_trial_notices() WHERE disease_id IN ('rd99901', 'rd99902', 'rd99903')$q$;
$$;


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids    UUID[] := pg_temp.vo_ids();
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-ops.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regclass('public.disease_catalog') IS NULL OR to_regclass('public.operators') IS NULL
       OR to_regclass('public.trial_notices') IS NULL OR to_regclass('public.public_disease_participation') IS NULL
       OR to_regclass('public.group_requests') IS NULL THEN
        RAISE EXCEPTION '表が足りません。20261022〜20261026（20261023 を含む）をすべて当ててください';
    END IF;
    IF EXISTS (SELECT 1 FROM public.disease_catalog
                WHERE disease_id IN ('rd99901', 'rd99902', 'rd99903') AND name NOT LIKE 'VO病気%') THEN
        RAISE EXCEPTION 'テスト用の病気の id（rd99901〜rd99903）が本物の病気に使われています。消さずに止めます';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_people TEXT[] := pg_temp.vo_people();
    v_users  UUID[] := pg_temp.vo_ids();
    D1 CONSTANT TEXT := 'rd99901';
    D2 CONSTANT TEXT := 'rd99902';
    D3 CONSTANT TEXT := 'rd99903';
    g1 UUID := '00000000-0000-4000-8000-0000000cf001';
    g2 UUID := '00000000-0000-4000-8000-0000000cf002';
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    DONE      CONSTANT TEXT := 'done';
    w TEXT;
    v TEXT;
    n1 TEXT; n2 TEXT;
    rp1 TEXT; rc1 TEXT; rp2 TEXT; rep1 TEXT;
    req_w TEXT; req_p TEXT;
    FUNCS CONSTANT TEXT[] := ARRAY[
        'public.is_operator()', 'public.list_operators()',
        'public.is_trial_audience(text)', 'public.list_my_trial_notices()', 'public.set_notice_interest(uuid,text)',
        'public.notice_interest_counts(uuid)', 'public.upsert_trial_notice(uuid,text,text,text,text,text,text)',
        'public.set_notice_status(uuid,text)',
        'public.request_new_group(text,text,text)', 'public.approve_group_request(uuid,text)',
        'public.reject_group_request(uuid)', 'public.wish_summary_ops(text)', 'public.list_all_reports()'];
    INTERNAL_FUNCS CONSTANT TEXT[] := ARRAY[
        'public.recalc_disease_participation(text)', 'public.sync_disease_participation()', 'public.sync_public_groups()',
        'public.resolve_disease_id(integer,text)', 'public.fill_group_wish_disease_id()',
        'public.fill_patient_group_disease_ids()', 'public.sync_public_wish_count()'];
    -- anon から呼んで権限エラーになることを見る SQL（FUNCS と同じ並び）
    ANON_CALLS CONSTANT TEXT[] := ARRAY[
        'SELECT public.is_operator()::text',
        'SELECT count(*)::text FROM public.list_operators()',
        $q$SELECT public.is_trial_audience('rd99901')::text$q$,
        'SELECT count(*)::text FROM public.list_my_trial_notices()',
        $q$SELECT 'done' FROM public.set_notice_interest(gen_random_uuid(), 'interested')$q$,
        'SELECT count(*)::text FROM public.notice_interest_counts(gen_random_uuid())',
        $q$SELECT public.upsert_trial_notice(NULL, 'rd99901', 'jrct', 'x', 'https://jrct.niph.go.jp/x', 's')::text$q$,
        $q$SELECT 'done' FROM public.set_notice_status(gen_random_uuid(), 'closed')$q$,
        $q$SELECT public.request_new_group('rd99901', 'x', '')::text$q$,
        $q$SELECT public.approve_group_request(gen_random_uuid(), 'x')::text$q$,
        $q$SELECT 'done' FROM public.reject_group_request(gen_random_uuid())$q$,
        $q$SELECT count(*)::text FROM public.wish_summary_ops('rd99902')$q$,
        'SELECT count(*)::text FROM public.list_all_reports()'];
    i INT;
BEGIN
    -- =========================================================================
    -- 準備: 前回の残りを消し、病気 3 つ・ユーザー 19 人・会 2 つ・同意・選んだ病気・参加希望を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);   -- 所属・同意・選んだ病気・希望・反応・申請・運営は CASCADE で消える
    DELETE FROM public.trial_notices WHERE disease_id IN (D1, D2, D3);
    DELETE FROM public.patient_groups WHERE slug LIKE 'verify-ops-%';
    DELETE FROM public.group_requests WHERE disease_id IN (D1, D2, D3);
    DELETE FROM public.disease_catalog WHERE disease_id IN (D1, D2, D3);   -- 公開の参加状況は CASCADE で消える
    DELETE FROM public.public_wish_counts WHERE disease_idx IN (990101, 990102, 990103, 990199);

    INSERT INTO public.disease_catalog (disease_id, idx, name) VALUES
        (D1, 990101, 'VO病気1'), (D2, 990102, 'VO病気2'), (D3, 990103, 'VO病気3');

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT pg_temp.vo_uid(x.w), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vo-' || lower(x.w) || '@verify-ops.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_people) AS x(w);

    -- 運営 2 人（最初の運営と同じく台本の役割で入れる）と、その表示名
    INSERT INTO public.operators (user_id, note) VALUES
        (pg_temp.vo_uid('OP1'), 'VO 確認用'), (pg_temp.vo_uid('OP2'), 'VO 確認用');
    FOREACH w IN ARRAY ARRAY['OP1', 'OP2'] LOOP
        PERFORM pg_temp.vo_chk('準備', '運営のプロフィールを本人として作る', w, format(
            $q$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
               VALUES (auth.uid(), %L, %L, '40代', '答えない', '東京都') RETURNING user_id::text$q$,
            'VO本名' || w, 'VO表示' || w), pg_temp.vo_uid(w)::TEXT);
    END LOOP;

    -- 研究の案内への同意（本人として）。UA・UB は版 2（いまの版。20261029）。UC は版 1 だけ（古い版の同意では案件が見えない）
    FOREACH w IN ARRAY ARRAY['UA', 'UB'] LOOP
        PERFORM pg_temp.vo_chk('準備', '研究の案内（版 2）に同意する', w,
            $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'research_contact', 2) RETURNING 'ok'$q$, 'ok');
    END LOOP;
    PERFORM pg_temp.vo_chk('準備', '研究の案内の古い版（版 1）だけに同意する', 'UC',
        $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'research_contact', 1) RETURNING 'ok'$q$, 'ok');

    -- 選んだ病気（disease_id の書き込みは同意担当の 20261029 から。ここでは台本の役割で入れる）
    INSERT INTO public.member_diseases (user_id, disease_idx, disease_name, disease_id) VALUES
        (pg_temp.vo_uid('UA'), 990101, 'VO病気1', D1),
        (pg_temp.vo_uid('UB'), 990102, 'VO病気2', D2),
        (pg_temp.vo_uid('UC'), 990101, 'VO病気1', D1);

    -- 会 1・会 2（どちらも病気 1）と所属
    INSERT INTO public.patient_groups (id, slug, name, disease_idxs, disease_names, disease_ids) VALUES
        (g1, 'verify-ops-1', 'VO 確認用の会1', ARRAY[990101], ARRAY['VO病気1'], ARRAY[D1]),
        (g2, 'verify-ops-2', 'VO 確認用の会2', ARRAY[990101], ARRAY['VO病気1'], ARRAY[D1]);
    INSERT INTO public.memberships (user_id, group_id, role)
    SELECT pg_temp.vo_uid(x.w), g1, CASE WHEN x.w = 'UM' THEN 'moderator' ELSE 'member' END
      FROM unnest(ARRAY['UM', 'UP', 'K01', 'K02', 'K03', 'K04', 'K05', 'K06', 'K07', 'K08', 'K09', 'K10']) AS x(w);
    INSERT INTO public.memberships (user_id, group_id, role) VALUES (pg_temp.vo_uid('UP'), g2, 'member');

    -- 参加希望（病気 2）。disease_id の書き込みは 20261023 の列。ここでは台本の役割で入れる
    INSERT INTO public.group_wishes (disease_idx, user_id, prefecture, relation, disease_id)
    VALUES (990102, pg_temp.vo_uid('UW'), '東京都', 'self', D2);

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vo_chk('0', 'auth.uid() が切り替えた人になる', 'UA', 'SELECT auth.uid()::text', pg_temp.vo_uid('UA')::TEXT);
    PERFORM pg_temp.vo_chk('0', '研究の案内のいまの版は 2（20261029 を当ててある）', 'UA',
        $q$SELECT public.consent_current_version('research_contact')::text$q$, '2');
    PERFORM pg_temp.vo_chk('0', '運営は is_operator() が true', 'OP1', 'SELECT public.is_operator()::text', 'true');
    PERFORM pg_temp.vo_chk('0', '運営でない人は false', 'UA', 'SELECT public.is_operator()::text', 'false');
    PERFORM pg_temp.vo_chk('0', '6 表すべてで RLS が有効', 'admin',
        $q$SELECT bool_and(relrowsecurity)::text FROM pg_class
            WHERE oid = ANY (ARRAY['public.operators', 'public.trial_notices', 'public.notice_interest',
                                   'public.public_disease_participation', 'public.group_requests',
                                   'public.public_groups']::regclass[])$q$, 'true');

    -- =========================================================================
    -- 1. 運営以外は運営の関数を使えない・運営の一覧は表示名だけ
    -- =========================================================================
    PERFORM pg_temp.vo_chk('1', '運営どうしの一覧（表示名だけ）', 'OP1',
        $q$SELECT string_agg(coalesce(display_name, '(null)'), ',' ORDER BY display_name) FROM public.list_operators()
            WHERE display_name LIKE 'VO表示%'$q$, 'VO表示OP1,VO表示OP2');
    PERFORM pg_temp.vo_chk('1', '一覧の列は display_name だけ', 'OP1',
        $q$SELECT string_agg(DISTINCT k, ',') FROM public.list_operators() r, jsonb_object_keys(to_jsonb(r)) k$q$, 'display_name');
    PERFORM pg_temp.vo_chk('1', '運営でない人は一覧を取れない', 'UA', 'SELECT count(*)::text FROM public.list_operators()', 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('1', '運営でも operators の表は直接読めない', 'OP1', 'SELECT count(*)::text FROM public.operators', ERR_PERM);
    PERFORM pg_temp.vo_chk('1', '運営でない人は自分を運営にできない', 'UA',
        'INSERT INTO public.operators (user_id) VALUES (auth.uid())', ERR_PERM);
    PERFORM pg_temp.vo_chk('1', '運営でない人は案件を作れない', 'UA', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'jrct', 'jRCT0000000000', 'https://jrct.niph.go.jp/x', 's')::text$q$, D1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('1', '運営でない人は会の新設を承認できない', 'UM',
        $q$SELECT public.approve_group_request(gen_random_uuid(), 'verify-ops-x')::text$q$, 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('1', '運営でない人は会の新設を却下できない', 'UM',
        $q$SELECT 'done' FROM public.reject_group_request(gen_random_uuid())$q$, 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 2. 案件は B 層にだけ見える
    -- =========================================================================
    n1 := pg_temp.vo_chk('2', '運営が案件を作る（draft）', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'jrct', 'jRCT2031230001',
                  'https://jrct.niph.go.jp/latest-detail/jRCT2031230001', 'VO要約（対象: 成人。実施地域: 関東。連絡は登録情報へ）', 'II')::text$q$, D1),
        UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('2', 'draft は B 層の UA にも見えない', 'UA', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', '運営が公開する', 'OP1', format($q$SELECT 'done' FROM public.set_notice_status(%L, 'published')$q$, n1), DONE);
    PERFORM pg_temp.vo_chk('2', '公開すると published_at が立つ', 'admin', format(
        $q$SELECT (published_at IS NOT NULL)::text FROM public.trial_notices WHERE id = %L$q$, n1), 'true');
    PERFORM pg_temp.vo_chk('2', 'B 層（同意あり・病気 1 を選んでいる）の UA に見える', 'UA', pg_temp.vo_visible(), '1');
    PERFORM pg_temp.vo_chk('2', '見せる列は id・病気・登録の種類・登録番号・リンク・要約・公開日・自分の反応だけ', 'UA',
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_my_trial_notices() r, jsonb_object_keys(to_jsonb(r)) k$q$,
        'disease_id,id,my_status,published_at,registry,registry_id,registry_url,summary');
    PERFORM pg_temp.vo_chk('2', '同意しているが別の病気（2）だけを選んでいる UB には見えない', 'UB', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', '病気 1 を選んでいるが古い版（版 1）にしか同意していない UC には見えない', 'UC', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', '病気 1 の会の世話人でも、同意と選択が無ければ見えない', 'UM', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', '何もしていない UN には見えない', 'UN', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', '会員は案件の表を直接読めない（存在も見えない）', 'UA', format(
        $q$SELECT count(*)::text FROM public.trial_notices WHERE id = %L$q$, n1), '0');
    PERFORM pg_temp.vo_chk('2', '運営は案件の表を読める', 'OP2', format(
        $q$SELECT count(*)::text FROM public.trial_notices WHERE id = %L$q$, n1), '1');
    PERFORM pg_temp.vo_chk('2', '登録情報の URL は jRCT か ClinicalTrials.gov だけ', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'jrct', 'jRCT2031230002', 'https://example.com/jRCT2031230002', 's')::text$q$, D1),
        'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('2', 'registry と URL の場所がそろわないもの（ctgov に jRCT の URL）', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'ctgov', 'NCT00000001', 'https://jrct.niph.go.jp/x', 's')::text$q$, D1),
        'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('2', 'http の URL', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'ctgov', 'NCT00000001', 'http://clinicaltrials.gov/study/NCT00000001', 's')::text$q$, D1),
        'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('2', '要約が 2001 文字', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'ctgov', 'NCT00000001', 'https://clinicaltrials.gov/study/NCT00000001', %L)::text$q$,
        D1, repeat('あ', 2001)), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('2', '同じ病気に同じ登録番号の案件をもう 1 件', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'jrct', 'jRCT2031230001', 'https://jrct.niph.go.jp/x', 's')::text$q$, D1),
        'ERROR P0001 invalid_input');
    n2 := pg_temp.vo_chk('2', 'ClinicalTrials.gov の案件（病気 2・www 付き）', 'OP1', format(
        $q$SELECT public.upsert_trial_notice(NULL, %L, 'ctgov', 'NCT00000002', 'https://www.clinicaltrials.gov/study/NCT00000002', 'VO要約2')::text$q$, D2),
        UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('2', '運営が中身を直す（status はそのまま）', 'OP1', format(
        $q$SELECT (public.upsert_trial_notice(%L, %L, 'ctgov', 'NCT00000002', 'https://www.clinicaltrials.gov/study/NCT00000002', 'VO要約2改') = %L::uuid)::text$q$,
        n2, D2, n2), 'true');
    PERFORM pg_temp.vo_chk('2', '直しても draft のまま（UB にはまだ見えない）', 'UB', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('2', 'status に無い値', 'OP1', format($q$SELECT 'done' FROM public.set_notice_status(%L, 'open')$q$, n2), 'ERROR P0001 invalid_input');

    -- =========================================================================
    -- 3. notice_interest は本人だけ・運営は実数だけ
    -- =========================================================================
    PERFORM pg_temp.vo_chk('3', 'UA が「関心あり」', 'UA', format($q$SELECT 'done' FROM public.set_notice_interest(%L, 'interested')$q$, n1), DONE);
    PERFORM pg_temp.vo_chk('3', '一覧に自分の反応が出る', 'UA', format(
        $q$SELECT my_status FROM public.list_my_trial_notices() WHERE id = %L$q$, n1), 'interested');
    PERFORM pg_temp.vo_chk('3', '運営の数（関心あり 1・見送り 0）', 'OP1', format(
        $q$SELECT interested || ':' || dismissed FROM public.notice_interest_counts(%L)$q$, n1), '1:0');
    PERFORM pg_temp.vo_chk('3', 'UA が「見送り」に変える', 'UA', format($q$SELECT 'done' FROM public.set_notice_interest(%L, 'dismissed')$q$, n1), DONE);
    PERFORM pg_temp.vo_chk('3', '運営の数（関心あり 0・見送り 1）', 'OP1', format(
        $q$SELECT interested || ':' || dismissed FROM public.notice_interest_counts(%L)$q$, n1), '0:1');
    PERFORM pg_temp.vo_chk('3', '運営の数の列は interested・dismissed だけ（user_id を返さない）', 'OP1', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.notice_interest_counts(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, n1),
        'dismissed,interested');
    PERFORM pg_temp.vo_chk('3', '運営でない人は数を取れない', 'UA', format(
        $q$SELECT count(*)::text FROM public.notice_interest_counts(%L)$q$, n1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('3', '反応の値は interested / dismissed だけ', 'UA', format(
        $q$SELECT 'done' FROM public.set_notice_interest(%L, 'maybe')$q$, n1), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('3', '見えていない人（UB）は反応を付けられない', 'UB', format(
        $q$SELECT 'done' FROM public.set_notice_interest(%L, 'interested')$q$, n1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('3', 'draft の案件には反応を付けられない', 'UB', format(
        $q$SELECT 'done' FROM public.set_notice_interest(%L, 'interested')$q$, n2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('3', '他人（UB）は UA の反応を読めない', 'UB', format(
        $q$SELECT count(*)::text FROM public.notice_interest WHERE user_id = %L$q$, pg_temp.vo_uid('UA')), '0');
    PERFORM pg_temp.vo_chk('3', '運営も反応の表は直接読めない（本人の行だけ）', 'OP1', format(
        $q$SELECT count(*)::text FROM public.notice_interest WHERE notice_id = %L$q$, n1), '0');
    PERFORM pg_temp.vo_chk('3', '本人は自分の反応を読める', 'UA', format(
        $q$SELECT status FROM public.notice_interest WHERE notice_id = %L$q$, n1), 'dismissed');
    PERFORM pg_temp.vo_chk('3', '反応の表へ直接 insert できない', 'UA', format(
        $q$INSERT INTO public.notice_interest (notice_id, status) VALUES (%L, 'interested')$q$, n2), ERR_PERM);
    PERFORM pg_temp.vo_chk('3', '反応の表を直接 update できない', 'UA', format(
        $q$UPDATE public.notice_interest SET status = 'interested' WHERE notice_id = %L$q$, n1), ERR_PERM);
    PERFORM pg_temp.vo_chk('3', '運営が案件を closed にする', 'OP1', format($q$SELECT 'done' FROM public.set_notice_status(%L, 'closed')$q$, n1), DONE);
    PERFORM pg_temp.vo_chk('3', 'closed の案件は B 層にも見えない', 'UA', pg_temp.vo_visible(), '0');
    PERFORM pg_temp.vo_chk('3', 'closed の案件には反応を付けられない', 'UA', format(
        $q$SELECT 'done' FROM public.set_notice_interest(%L, 'interested')$q$, n1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('3', 'closed にしても反応の行は残る', 'admin', format(
        $q$SELECT count(*)::text FROM public.notice_interest WHERE notice_id = %L$q$, n1), '1');
    PERFORM pg_temp.vo_chk('3', 'closed にしても published_at は残る', 'admin', format(
        $q$SELECT (published_at IS NOT NULL)::text FROM public.trial_notices WHERE id = %L$q$, n1), 'true');
    PERFORM pg_temp.vo_chk('3', '一度も公開せずに closed にできる', 'OP1', format($q$SELECT 'done' FROM public.set_notice_status(%L, 'closed')$q$, n2), DONE);
    PERFORM pg_temp.vo_chk('3', '運営が公開し直す（published に戻す）', 'OP1', format($q$SELECT 'done' FROM public.set_notice_status(%L, 'published')$q$, n1), DONE);
    PERFORM pg_temp.vo_chk('3', 'UA が研究の案内の同意を取り消す', 'UA',
        $q$WITH u AS (UPDATE public.consents SET withdrawn_at = now() WHERE user_id = auth.uid() AND kind = 'research_contact' RETURNING 1)
           SELECT count(*)::text FROM u$q$, '1');
    PERFORM pg_temp.vo_chk('3', '同意を取り消すと公開中の案件も見えない', 'UA', pg_temp.vo_visible(), '0');

    -- =========================================================================
    -- 4. 公開の参加状況（members|research_contact|wishes）
    -- =========================================================================
    PERFORM pg_temp.vo_chk('4', '病気 1: 在籍 12 人（会 1 と会 2 の両方にいる UP は 1 人）・案内 0・希望 0', 'anon', pg_temp.vo_part(D1), '12|10未満|10未満');
    PERFORM pg_temp.vo_chk('4', '病気 2: 在籍 0・案内 1（UB）・希望 1（UW）', 'anon', pg_temp.vo_part(D2), '10未満|10未満|10未満');
    PERFORM pg_temp.vo_chk('4', '病気 3（誰も関わらない）も行があり、すべて「10未満」', 'anon', pg_temp.vo_part(D3), '10未満|10未満|10未満');
    PERFORM pg_temp.vo_chk('4', 'disease_catalog のすべての病気に行がある', 'admin',
        $q$SELECT ((SELECT count(*) FROM public.disease_catalog) = (SELECT count(*) FROM public.public_disease_participation))::text$q$,
        'true');
    UPDATE public.memberships SET left_at = now() WHERE user_id = pg_temp.vo_uid('UP') AND group_id = g2;
    PERFORM pg_temp.vo_chk('4', 'UP が会 2 を退会しても会 1 にいるので 12 のまま', 'anon', pg_temp.vo_part(D1), '12|10未満|10未満');
    UPDATE public.memberships SET left_at = now() WHERE user_id = pg_temp.vo_uid('UP') AND group_id = g1;
    PERFORM pg_temp.vo_chk('4', 'UP が会 1 も退会すると 11', 'anon', pg_temp.vo_part(D1), '11|10未満|10未満');
    UPDATE public.memberships SET left_at = now() WHERE user_id = pg_temp.vo_uid('K01') AND group_id = g1;
    PERFORM pg_temp.vo_chk('4', '10 人 → 「10」', 'anon', pg_temp.vo_part(D1), '10|10未満|10未満');
    UPDATE public.memberships SET left_at = now() WHERE user_id = pg_temp.vo_uid('K02') AND group_id = g1;
    PERFORM pg_temp.vo_chk('4', '9 人 → 「10未満」', 'anon', pg_temp.vo_part(D1), '10未満|10未満|10未満');
    PERFORM pg_temp.vo_chk('4', '列は disease_id・members・research_contact・wishes・updated_at だけ', 'admin',
        $q$SELECT string_agg(column_name::text, ',' ORDER BY ordinal_position) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'public_disease_participation'$q$,
        'disease_id,members,research_contact,wishes,updated_at');
    PERFORM pg_temp.vo_chk('4', 'ログインしている人も読める', 'UN', pg_temp.vo_part(D3), '10未満|10未満|10未満');
    PERFORM pg_temp.vo_chk('4', 'anon は書けない（update）', 'anon',
        $q$UPDATE public.public_disease_participation SET members = '999' WHERE disease_id = 'rd99901'$q$, ERR_PERM);
    PERFORM pg_temp.vo_chk('4', '運営も書けない（insert）', 'OP1',
        $q$INSERT INTO public.public_disease_participation (disease_id, members, research_contact, wishes) VALUES ('rd99903', '1', '1', '1')$q$, ERR_PERM);

    -- =========================================================================
    -- 5. 会の新設
    -- =========================================================================
    req_w := pg_temp.vo_chk('5', '病気 2 の参加希望者 UW が申請する', 'UW', format(
        $q$SELECT public.request_new_group(%L, 'VO新しい会', 'よろしくお願いします')::text$q$, D2), UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('5', '同じ病気への申請中は 1 人 1 件', 'UW', format(
        $q$SELECT public.request_new_group(%L, 'VO新しい会2', '')::text$q$, D2), 'ERROR P0001 already_requested');
    req_p := pg_temp.vo_chk('5', '病気 1 の会の在籍会員 UM が申請する', 'UM', format(
        $q$SELECT public.request_new_group(%L, 'VO病気1の新しい会', '')::text$q$, D1), UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('5', '病気を選んでいるだけの UA（会員でも希望者でもない）は申請できない', 'UA', format(
        $q$SELECT public.request_new_group(%L, 'x', '')::text$q$, D1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('5', '会を退会した UP は申請できない', 'UP', format(
        $q$SELECT public.request_new_group(%L, 'x', '')::text$q$, D1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('5', '何もしていない UN は申請できない', 'UN', format(
        $q$SELECT public.request_new_group(%L, 'x', '')::text$q$, D2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('5', '会の名前が空白だけ', 'UW', format(
        $q$SELECT public.request_new_group(%L, '　 ', '')::text$q$, D1), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('5', '会の名前が 101 文字', 'UM', format(
        $q$SELECT public.request_new_group(%L, %L, '')::text$q$, D1, repeat('あ', 101)), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('5', 'disease_catalog に無い病気', 'UW',
        $q$SELECT public.request_new_group('rd99999', 'x', '')::text$q$, 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('5', '本人は自分の申請を読める', 'UW', format(
        $q$SELECT status FROM public.group_requests WHERE id = %L$q$, req_w), 'pending');
    PERFORM pg_temp.vo_chk('5', '他人は申請を読めない', 'UN', format(
        $q$SELECT count(*)::text FROM public.group_requests WHERE id IN (%L, %L)$q$, req_w, req_p), '0');
    PERFORM pg_temp.vo_chk('5', '運営は申請を読める', 'OP2', format(
        $q$SELECT count(*)::text FROM public.group_requests WHERE id IN (%L, %L)$q$, req_w, req_p), '2');
    PERFORM pg_temp.vo_chk('5', '申請の表へ直接 insert できない', 'UW', format(
        $q$INSERT INTO public.group_requests (disease_id, proposed_name) VALUES (%L, 'x')$q$, D2), ERR_PERM);
    PERFORM pg_temp.vo_chk('5', '使えない slug で承認', 'OP1', format(
        $q$SELECT public.approve_group_request(%L, 'Bad Slug')::text$q$, req_w), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vo_chk('5', '使われている slug で承認', 'OP1', format(
        $q$SELECT public.approve_group_request(%L, 'verify-ops-1')::text$q$, req_w), 'ERROR P0001 invalid_input');
    v := pg_temp.vo_chk('5', '運営が承認する（slug は運営が指定）', 'OP1', format(
        $q$SELECT public.approve_group_request(%L, 'verify-ops-new')::text$q$, req_w), UUID_LIKE, '会の id');
    PERFORM pg_temp.vo_chk('5', '申請者 UW が新しい会の世話人になる', 'admin', format(
        $q$SELECT role FROM public.memberships WHERE user_id = %L AND group_id = %L AND left_at IS NULL$q$, pg_temp.vo_uid('UW'), v), 'moderator');
    PERFORM pg_temp.vo_chk('5', '会の病気は disease_catalog から（disease_ids・disease_idxs・disease_names）', 'admin', format(
        $q$SELECT disease_ids[1] || '|' || disease_idxs[1] || '|' || disease_names[1] || '|' || name
             FROM public.patient_groups WHERE id = %L$q$, v), 'rd99902|990102|VO病気2|VO新しい会');
    PERFORM pg_temp.vo_chk('5', '公開用の会の一覧（public_groups）に写る', 'anon',
        $q$SELECT name || '|' || coalesce(disease_id, '(null)') FROM public.public_groups WHERE slug = 'verify-ops-new'$q$,
        'VO新しい会|rd99902');
    PERFORM pg_temp.vo_chk('5', '公開用の会の一覧の列は slug・name・disease_id・created_at だけ', 'admin',
        $q$SELECT string_agg(column_name::text, ',' ORDER BY ordinal_position) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'public_groups'$q$, 'slug,name,disease_id,created_at');
    PERFORM pg_temp.vo_chk('5', 'いまある会もすべて public_groups にある', 'admin',
        $q$SELECT (NOT EXISTS (SELECT 1 FROM public.patient_groups g
                                WHERE NOT EXISTS (SELECT 1 FROM public.public_groups p WHERE p.slug = g.slug)))::text$q$, 'true');
    PERFORM pg_temp.vo_chk('5', '申請は approved・決めたのは OP1', 'admin', format(
        $q$SELECT status || ':' || (decided_by = %L)::text FROM public.group_requests WHERE id = %L$q$, pg_temp.vo_uid('OP1'), req_w),
        'approved:true');
    PERFORM pg_temp.vo_chk('5', '承認済みの申請をもう一度承認', 'OP1', format(
        $q$SELECT public.approve_group_request(%L, 'verify-ops-new2')::text$q$, req_w), 'ERROR P0001 request_not_pending');
    PERFORM pg_temp.vo_chk('5', '新しい会の世話人は病気 2 の在籍会員に入る（元の表で数える。公開の数は 10 未満で伏せられるため）', 'admin', format(
        $q$SELECT (SELECT count(DISTINCT m.user_id) FROM public.memberships m JOIN public.patient_groups g ON g.id = m.group_id
                    WHERE m.left_at IS NULL AND %L = ANY (g.disease_ids))::text$q$, D2), '1');
    PERFORM pg_temp.vo_chk('5', '運営が UM の申請を却下する', 'OP2', format($q$SELECT 'done' FROM public.reject_group_request(%L)$q$, req_p), DONE);
    PERFORM pg_temp.vo_chk('5', '却下済みの申請をもう一度却下', 'OP2', format($q$SELECT 'done' FROM public.reject_group_request(%L)$q$, req_p), 'ERROR P0001 request_not_pending');
    PERFORM pg_temp.vo_chk('5', '却下された UM は同じ病気にもう一度申請できる（申請中ではない）', 'UM', format(
        $q$SELECT public.request_new_group(%L, 'VO病気1の新しい会', '')::text$q$, D1), UUID_LIKE, 'id');

    -- =========================================================================
    -- 6. anon の不可
    -- =========================================================================
    FOREACH w IN ARRAY ARRAY['operators', 'trial_notices', 'notice_interest', 'group_requests'] LOOP
        PERFORM pg_temp.vo_chk('6', w || ' を読む', 'anon', format('SELECT count(*)::text FROM public.%I', w), ERR_PERM);
    END LOOP;
    PERFORM pg_temp.vo_chk('6', 'public_groups は読める', 'anon',
        $q$SELECT count(*)::text FROM public.public_groups WHERE slug LIKE 'verify-ops-%'$q$, '3');
    PERFORM pg_temp.vo_chk('6', 'public_groups に書けない', 'anon',
        $q$INSERT INTO public.public_groups (slug, name, created_at) VALUES ('verify-ops-anon', 'x', now())$q$, ERR_PERM);
    FOR i IN 1 .. array_length(FUNCS, 1) LOOP
        PERFORM pg_temp.vo_chk('6', FUNCS[i] || ' を呼ぶ', 'anon', ANON_CALLS[i], ERR_PERM);
    END LOOP;

    -- =========================================================================
    -- 7. 関数の属性
    -- =========================================================================
    FOREACH w IN ARRAY FUNCS || INTERNAL_FUNCS LOOP
        PERFORM pg_temp.vo_chk('7', w || ': SECURITY DEFINER・search_path 空固定', 'admin', format(
            $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                     WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
                 FROM (SELECT to_regprocedure(%L) AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, w), 'true');
    END LOOP;
    FOREACH w IN ARRAY FUNCS LOOP
        PERFORM pg_temp.vo_chk('7', w || ': anon と PUBLIC に EXECUTE が無い・authenticated にはある', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
                       AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    FOREACH w IN ARRAY INTERNAL_FUNCS LOOP
        PERFORM pg_temp.vo_chk('7', w || '（内部用）: anon・authenticated・PUBLIC に EXECUTE が無い', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    PERFORM pg_temp.vo_chk('7', '公開の 2 表は anon・authenticated とも SELECT だけ', 'admin',
        $q$SELECT (has_table_privilege('anon', 'public.public_disease_participation', 'SELECT')
                   AND has_table_privilege('anon', 'public.public_groups', 'SELECT')
                   AND NOT has_table_privilege('anon', 'public.public_disease_participation', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.public_disease_participation', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('anon', 'public.public_groups', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.public_groups', 'INSERT,UPDATE,DELETE'))::text$q$, 'true');
    PERFORM pg_temp.vo_chk('7', '会員まわりの 4 表は API ロールに INSERT・UPDATE・DELETE が無い', 'admin',
        $q$SELECT (NOT has_table_privilege('authenticated', 'public.operators', 'SELECT,INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.trial_notices', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.notice_interest', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.group_requests', 'INSERT,UPDATE,DELETE'))::text$q$, 'true');

    -- =========================================================================
    -- 8. 疾患の固定 ID（A）
    -- =========================================================================
    PERFORM pg_temp.vo_chk('8', 'disease_catalog に data/disease_ids.json の 951 件がある（rd00001〜rd00951）', 'admin',
        $q$SELECT count(*)::text FROM public.disease_catalog WHERE disease_id BETWEEN 'rd00001' AND 'rd00951'$q$, '951');
    PERFORM pg_temp.vo_chk('8', 'rd00001 はファブリー病（idx 0）', 'admin',
        $q$SELECT idx || '|' || name FROM public.disease_catalog WHERE disease_id = 'rd00001'$q$, '0|ファブリー病');
    PERFORM pg_temp.vo_chk('8', 'ログインしている人は disease_catalog を読める', 'UN',
        $q$SELECT name FROM public.disease_catalog WHERE disease_id = 'rd00001'$q$, 'ファブリー病');
    PERFORM pg_temp.vo_chk('8', 'anon は disease_catalog を読めない（公開面は公開用の表だけ）', 'anon',
        'SELECT count(*)::text FROM public.disease_catalog', ERR_PERM);
    PERFORM pg_temp.vo_chk('8', '運営も disease_catalog に書けない', 'OP1',
        $q$INSERT INTO public.disease_catalog (disease_id, idx, name) VALUES ('rd99998', 990198, 'x')$q$, ERR_PERM);
    PERFORM pg_temp.vo_chk('8', 'seed 済みの会（ファブリー病の会）の disease_ids が埋まっている', 'admin',
        $q$SELECT coalesce((SELECT array_to_string(disease_ids, ',') FROM public.patient_groups WHERE slug = 'fabry-fukurou'), '(会なし)')$q$,
        'rd00001');
    PERFORM pg_temp.vo_chk('8', 'disease_ids が idx と同じ数だけ埋まっていない会は無い', 'admin',
        $q$SELECT count(*)::text FROM public.patient_groups WHERE cardinality(disease_ids) <> cardinality(disease_idxs)$q$, '0');
    PERFORM pg_temp.vo_chk('8', '参加希望を idx だけで入れると disease_id はトリガーが埋める', 'UN', format(
        $q$INSERT INTO public.group_wishes (disease_idx, prefecture, relation) VALUES (990103, '大阪府', 'family') RETURNING disease_id$q$), D3);
    PERFORM pg_temp.vo_chk('8', '公開の数（idx ごと）にも disease_id が写る', 'anon',
        $q$SELECT coalesce(disease_id, '(null)') || '|' || n FROM public.public_wish_counts WHERE disease_idx = 990103$q$, 'rd99903|10未満');
    PERFORM pg_temp.vo_chk('8', 'disease_catalog に無い idx の参加希望は disease_id が NULL のまま入る', 'UN',
        $q$INSERT INTO public.group_wishes (disease_idx, prefecture, relation) VALUES (990199, '大阪府', 'family') RETURNING coalesce(disease_id, '(null)')$q$,
        '(null)');
    PERFORM pg_temp.vo_chk('8', '同じ人・同じ病気（disease_id）に 2 件目は入らない（idx が違っても。一意制約）', 'admin', format(
        $q$INSERT INTO public.group_wishes (disease_idx, user_id, prefecture, relation, disease_id) VALUES (990199, %L, '東京都', 'self', %L) RETURNING id::text$q$,
        pg_temp.vo_uid('UW'), D2), 'ERROR 23505%');
    PERFORM pg_temp.vo_chk('8', 'ログインしている人は disease_id を自分で入れられない（列の権限。埋めるのはトリガー）', 'UN',
        $q$INSERT INTO public.group_wishes (disease_idx, prefecture, relation, disease_id) VALUES (990101, '大阪府', 'family', 'rd99901') RETURNING id::text$q$,
        ERR_PERM);
    PERFORM pg_temp.vo_chk('8', 'disease_ids を空のまま会を作ると、idx と名前から埋まる', 'admin',
        $q$WITH i AS (INSERT INTO public.patient_groups (slug, name, disease_idxs, disease_names)
                      VALUES ('verify-ops-fill', 'VO 埋まる会', ARRAY[990101], ARRAY['VO病気1']) RETURNING disease_ids)
           SELECT array_to_string(disease_ids, ',') FROM i$q$, 'rd99901');
    PERFORM pg_temp.vo_chk('8', 'idx と名前が合わず、名前でも決まらない会は埋めない（推測で埋めない）', 'admin',
        $q$WITH i AS (INSERT INTO public.patient_groups (slug, name, disease_idxs, disease_names)
                      VALUES ('verify-ops-fill2', 'VO 埋まらない会', ARRAY[990101], ARRAY['VO病気X']) RETURNING disease_ids)
           SELECT cardinality(disease_ids)::text FROM i$q$, '0');
    PERFORM pg_temp.vo_chk('8', '病気の決め方: idx と名前の両方が合う／名前だけでちょうど 1 件／決まらない', 'admin',
        $q$SELECT coalesce(public.resolve_disease_id(990101, 'VO病気1'), '(null)') || '|' ||
                  coalesce(public.resolve_disease_id(999999, 'VO病気2'), '(null)') || '|' ||
                  coalesce(public.resolve_disease_id(990101, 'VO病気X'), '(null)')$q$, 'rd99901|rd99902|(null)');
    PERFORM pg_temp.vo_chk('8', '運営向けの参加希望の内訳（disease_id で引く。実数）', 'OP1', format(
        $q$SELECT string_agg(prefecture || '/' || relation || '/' || coalesce(is_group_member::text, 'null') || '=' || n, ' ' ORDER BY prefecture)
             FROM public.wish_summary_ops(%L)$q$, D2), '東京都/self/null=1');
    PERFORM pg_temp.vo_chk('8', '内訳の列は prefecture・relation・is_group_member・n だけ（user_id を返さない）', 'OP1', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.wish_summary_ops(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, D2),
        'is_group_member,n,prefecture,relation');
    PERFORM pg_temp.vo_chk('8', '運営でない人は内訳を取れない', 'UW', format(
        $q$SELECT count(*)::text FROM public.wish_summary_ops(%L)$q$, D2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('8', 'Studio 専用の wish_summary は残り、API ロールからは呼べない', 'OP1',
        'SELECT count(*)::text FROM public.wish_summary(990102)', ERR_PERM);

    -- =========================================================================
    -- 9. 運営が通報を会をまたいで見る（list_all_reports）
    -- =========================================================================
    rp1 := pg_temp.vo_chk('準備', '会 1 の世話人 UM がスレッドを書く', 'UM', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VO題', 'VO本文') RETURNING id::text$q$, g1),
        UUID_LIKE, 'id');
    rc1 := pg_temp.vo_chk('準備', 'UM がそのスレッドにコメントを書く', 'UM', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VOコメント') RETURNING id::text$q$, rp1), UUID_LIKE, 'id');
    rep1 := pg_temp.vo_chk('準備', '会 1 の会員 K03 が投稿を通報', 'K03', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VO理由1')::text$q$, rp1), UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('準備', '会 1 の会員 K04 がコメントを通報', 'K04', format(
        $q$SELECT public.report_group_content(NULL, %L, 'VO理由2')::text$q$, rc1), UUID_LIKE, 'id');
    rp2 := pg_temp.vo_chk('準備', '新しい会（verify-ops-new）の世話人 UW が投稿を書く', 'UW',
        $q$INSERT INTO public.group_posts (group_id, kind, title, body)
           SELECT g.id, 'thread', 'VO題2', 'VO本文2' FROM public.patient_groups g WHERE g.slug = 'verify-ops-new' RETURNING id::text$q$,
        UUID_LIKE, 'id');
    PERFORM pg_temp.vo_chk('準備', 'UW がその投稿を通報', 'UW', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VO理由3')::text$q$, rp2), UUID_LIKE, 'id');

    PERFORM pg_temp.vo_chk('9', '運営は 2 つの会の通報を会をまたいで見られる', 'OP1',
        $q$SELECT string_agg(group_slug || '/' || target_kind || '/' || reason || '/' || (handled_at IS NULL)::text, ' ' ORDER BY reason)
             FROM public.list_all_reports() WHERE group_slug LIKE 'verify-ops-%'$q$,
        'verify-ops-1/post/VO理由1/true verify-ops-1/comment/VO理由2/true verify-ops-new/post/VO理由3/true');
    PERFORM pg_temp.vo_chk('9', '対象の id は投稿かコメントのどちらか一方だけ', 'OP1', format(
        $q$SELECT string_agg(coalesce(post_id::text, '-') || '|' || coalesce(comment_id::text, '-'), ' ' ORDER BY reason)
             FROM public.list_all_reports() WHERE group_slug = 'verify-ops-1'$q$),
        rp1 || '|- -|' || rc1);
    PERFORM pg_temp.vo_chk('9', '列は id・会の slug・対象の種類・対象の id・理由・日時・対応した時刻だけ', 'OP1',
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_all_reports() r, jsonb_object_keys(to_jsonb(r)) k$q$,
        'comment_id,created_at,group_slug,handled_at,id,post_id,reason,target_kind');
    PERFORM pg_temp.vo_chk('9', '通報者の user_id が含まれない', 'OP1', format(
        $q$SELECT (t LIKE %L OR t LIKE %L OR t LIKE %L)::text
             FROM (SELECT coalesce(jsonb_agg(to_jsonb(r))::text, '') AS t FROM public.list_all_reports() r WHERE group_slug LIKE 'verify-ops-%%') x$q$,
        '%' || pg_temp.vo_uid('K03') || '%', '%' || pg_temp.vo_uid('K04') || '%', '%' || pg_temp.vo_uid('UW') || '%'), 'false');
    PERFORM pg_temp.vo_chk('9', '世話人 UM が投稿の通報を対応済みにする', 'UM', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, rep1), DONE);
    PERFORM pg_temp.vo_chk('9', '対応済みは handled_at が入り、未対応の後に並ぶ', 'OP1',
        $q$SELECT string_agg(r.reason || '/' || (r.handled_at IS NOT NULL)::text, ' ' ORDER BY r.ord)
             FROM public.list_all_reports() WITH ORDINALITY AS r(id, group_slug, target_kind, post_id, comment_id, reason, created_at, handled_at, ord)
            WHERE r.group_slug = 'verify-ops-1'$q$,
        'VO理由2/false VO理由1/true');
    PERFORM pg_temp.vo_chk('9', '世話人でも運営でなければ見られない', 'UM', 'SELECT count(*)::text FROM public.list_all_reports()', 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('9', '会員は見られない', 'K03', 'SELECT count(*)::text FROM public.list_all_reports()', 'ERROR P0001 forbidden');
    PERFORM pg_temp.vo_chk('9', '運営でも通報の表は直接読めない', 'OP1', 'SELECT count(*)::text FROM public.content_reports', ERR_PERM);

    -- =========================================================================
    -- 後片付け
    --   テストユーザーを消せば、所属・同意・選んだ病気・希望・反応・申請・運営は CASCADE で消える。
    --   案件・会・病気は台本の役割で消す（公開の参加状況と公開用の会の一覧はトリガーと CASCADE で消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.trial_notices WHERE disease_id IN (D1, D2, D3);
    DELETE FROM public.group_requests WHERE disease_id IN (D1, D2, D3);
    DELETE FROM public.patient_groups WHERE slug LIKE 'verify-ops-%';
    DELETE FROM public.disease_catalog WHERE disease_id IN (D1, D2, D3);
    DELETE FROM public.public_wish_counts WHERE disease_idx IN (990101, 990102, 990103, 990199);   -- 参加希望の idx ごとの公開の数（20261019）
    PERFORM pg_temp.vo_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.operators WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.trial_notices WHERE disease_id IN ('rd99901', 'rd99902', 'rd99903'))
                 + (SELECT count(*) FROM public.notice_interest WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_requests WHERE requester_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE slug LIKE 'verify-ops-%%')
                 + (SELECT count(*) FROM public.public_groups WHERE slug LIKE 'verify-ops-%%')
                 + (SELECT count(*) FROM public.public_disease_participation WHERE disease_id IN ('rd99901', 'rd99902', 'rd99903'))
                 + (SELECT count(*) FROM public.disease_catalog WHERE disease_id IN ('rd99901', 'rd99902', 'rd99903'))
                 + (SELECT count(*) FROM public.member_diseases WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_wishes WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.public_wish_counts WHERE disease_idx IN (990101, 990102, 990103, 990199)))::text$q$,
        v_users, v_users, v_users, v_users, v_users, v_users), '0');
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
      FROM pg_temp.verify_ops_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_ops_results
  ) r
 ORDER BY seq;
