-- =============================================================================
-- アカウント削除の確認台本（delete_my_account の版 5: supabase/migrations/20261027_delete_account_v5.sql。
--   版 1 は 20261002_delete_account.sql、版 2 は 20261010_journey_survey.sql、版 3 は 20261015_delete_account_v3.sql、
--   版 4 は 20261020_delete_account_v4.sql。版 4 の参加希望は scripts/portal/verify_wishes.sql の項目 6 で確かめる）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261027_delete_account_v5.sql まで当てる（20261013・20261014・20261022〜20261026 を含む）
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_tenancy.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vd_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vd_ で始め、verify_tenancy.sql と同じ接続で流しても重ならないようにする。
--
-- 登場人物（user_id は固定。メールは @verify-delete-account.invalid）:
--   A  アカウントを消す人。会1 の会員（B の招待で入る）・会2 の世話人（E と 2 人）・運営（版 5。C・E と 3 人）
--   B  会1 のただ 1 人の世話人（最後の世話人は消せないことの確認に使う）
--   C  会1 の会員。会2 へ申請し、A が承認する。最初はただ 1 人の運営（最後の運営は消せないことの確認に使う）
--   E  会2 の世話人。運営（版 5）
--   anon  未ログイン
--
-- 項目:
--   0 前提（関数の所有者が BYPASSRLS を持つ、など）
--   1 他人のアカウント・行は消せない
--   2 anon は呼べない
--   3 関数の SECURITY DEFINER・search_path 固定・EXECUTE 権限
--   4 最後の世話人は last_moderator で止まり、何も消えない
--   5 本人の consents・member_diseases・member_profiles・memberships・申請・招待・profiles・auth.users が消え、
--     他人の行（auth.users を含む）は変わらない
--   6 投稿・コメントは会に残り、名前だけが消える
--   7 関数が auth.users を消した後も投稿は残る（author_id が NULL）。書き手が NULL の投稿を一般会員は消せない
--   8 外部キーの一覧（付け替えた 2 本が SET NULL、ほかは元のまま）
--   9 道のり調査の回答と対応が消え、他人の回答は残る（20261010_journey_survey.sql を当てた DB でだけ。無ければ参考の行）
--  10 行事への参加表明（event_attendance）の本人の行が消え、他人の参加表明は残る（版 3）
--  11 本人の通報（content_reports.reporter_id）が消え、本人が対応した通報は handled_by だけ NULL になる（版 3）
--  12 途中で失敗したら全体が戻る（auth.users の削除で起きる SET NULL を台本のトリガーでわざと失敗させ、
--     会員情報も auth.users も 1 行も消えていないことを見る。トリガーは確かめた後すぐ外す）（版 3）
--  13 運営が本人 1 人なら last_operator で止まり、何も消えない（版 5）
--  14 案件への反応（notice_interest）と会の新設の申請（group_requests の申請者の行）が消え、
--     運営として決めた申請は decided_by だけ NULL、登録した案件は created_by だけ NULL になる（版 5）
--  15 運営の行（operators）が消え、ほかの運営は残る（版 5）
--
-- テスト用の病気（disease_catalog に台本の役割で足し、終わりに消す。案件と会の新設の申請に使う）:
--   rd99911（VD病気）
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー
--   ERROR 42883% … その引数の関数が無い
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
--
-- ★ 項目 12 は、確かめる間だけ public に関数 vd_force_failure() と group_posts のトリガー vd_force_failure を作り、
--   すぐ消す。本体の DO ブロックが途中で止まった場合も、ブロックごと巻き戻るので残らない。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids UUID[] := ARRAY[
        '00000000-0000-4000-8000-0000000da001', '00000000-0000-4000-8000-0000000db001',
        '00000000-0000-4000-8000-0000000dc001', '00000000-0000-4000-8000-0000000de001']::UUID[];
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    -- 固定の user_id が、テスト用でない人に使われていたら消さずに止める
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-delete-account.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regprocedure('public.delete_my_account()') IS NULL
       OR to_regclass('public.event_attendance') IS NULL
       OR to_regclass('public.content_reports') IS NULL
       OR to_regclass('public.operators') IS NULL
       OR to_regclass('public.notice_interest') IS NULL
       OR to_regclass('public.group_requests') IS NULL
       OR to_regclass('public.disease_catalog') IS NULL THEN
        RAISE EXCEPTION '表か関数が足りません。先に 20261013〜20261027（20261023 を含む）を当ててください';
    END IF;
    IF EXISTS (SELECT 1 FROM public.disease_catalog WHERE disease_id = 'rd99911' AND name <> 'VD病気') THEN
        RAISE EXCEPTION 'テスト用の病気の id（rd99911）が本物の病気に使われています。消さずに止めます';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_delete_account_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_delete_account_results RESTART IDENTITY;

-- 登場人物 → user_id
CREATE OR REPLACE FUNCTION pg_temp.vd_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_who
        WHEN 'A' THEN '00000000-0000-4000-8000-0000000da001'::UUID
        WHEN 'B' THEN '00000000-0000-4000-8000-0000000db001'::UUID
        WHEN 'C' THEN '00000000-0000-4000-8000-0000000dc001'::UUID
        WHEN 'E' THEN '00000000-0000-4000-8000-0000000de001'::UUID
    END;
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: A・B・C・E（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
--   例外ブロックは副トランザクションなので、失敗したときは SET LOCAL ROLE と claims も巻き戻る
CREATE OR REPLACE FUNCTION pg_temp.vd_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.vd_uid(p_who), 'role', 'authenticated')::TEXT, true);
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

-- 1 行記録する
CREATE OR REPLACE FUNCTION pg_temp.vd_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_delete_account_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 300),
            CASE WHEN p_ok THEN 'OK' ELSE 'NG' END);
$$;

-- p_who として実行し、「実際」が p_like に LIKE で一致するかを記録する。実際の値を返す（id の受け取りに使う）
CREATE OR REPLACE FUNCTION pg_temp.vd_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vd_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vd_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;

-- 参考の行（OK・NG を付けない）
CREATE OR REPLACE FUNCTION pg_temp.vd_note(p_no TEXT, p_item TEXT, p_actual TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_delete_account_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, '（参考）', left(coalesce(p_actual, '(null)'), 300), '参考');
$$;

-- その人の行の数（プロフィール:同意:病気:所属:申請:発行した招待:投稿:コメント:参加表明:通報:案件への反応:会の新設の申請:運営）。
-- 台本の役割で数える
CREATE OR REPLACE FUNCTION pg_temp.vd_fp(p UUID)
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT concat_ws(':',
        (SELECT count(*) FROM public.member_profiles WHERE user_id = p),
        (SELECT count(*) FROM public.consents        WHERE user_id = p),
        (SELECT count(*) FROM public.member_diseases WHERE user_id = p),
        (SELECT count(*) FROM public.memberships     WHERE user_id = p),
        (SELECT count(*) FROM public.join_requests   WHERE user_id = p),
        (SELECT count(*) FROM public.invitations     WHERE created_by = p),
        (SELECT count(*) FROM public.group_posts     WHERE author_id = p),
        (SELECT count(*) FROM public.group_comments  WHERE author_id = p),
        (SELECT count(*) FROM public.event_attendance WHERE user_id = p),
        (SELECT count(*) FROM public.content_reports WHERE reporter_id = p),
        (SELECT count(*) FROM public.notice_interest WHERE user_id = p),
        (SELECT count(*) FROM public.group_requests  WHERE requester_id = p),
        (SELECT count(*) FROM public.operators       WHERE user_id = p));
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    uA UUID := pg_temp.vd_uid('A');
    uB UUID := pg_temp.vd_uid('B');
    uC UUID := pg_temp.vd_uid('C');
    uE UUID := pg_temp.vd_uid('E');
    g1 UUID := '00000000-0000-4000-8000-0000000df001';
    g2 UUID := '00000000-0000-4000-8000-0000000df002';
    v_users UUID[];
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    DONE      CONSTANT TEXT := 'done';

    t_ba TEXT; t_a TEXT; req_c TEXT; req_a TEXT;
    p_a TEXT; p_b TEXT; c_a TEXT; c_b TEXT; c_c TEXT;
    fp_b TEXT; fp_c TEXT; fp_e TEXT;
    v TEXT;
    v_has_profiles BOOLEAN := to_regclass('public.profiles') IS NOT NULL;
    v_profiles_before TEXT;
    t TEXT;
    v_has_journey BOOLEAN := to_regclass('public.journey_links') IS NOT NULL;
    j_a UUID; j_b UUID;
    ev TEXT; p_e TEXT; r_a TEXT; r_c TEXT; r_ce TEXT;
    s_a UUID := '00000000-0000-4000-8000-0000000d5a01';  -- A のセッション（auth.sessions）
    D   CONSTANT TEXT := 'rd99911';                       -- テスト用の病気（版 5）
    n_1 UUID; n_a UUID; gr_a UUID; gr_c UUID;
BEGIN
    v_users := ARRAY[uA, uB, uC, uE];

    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 4 人・会 2 つ・所属・同意・病気・申請・招待・投稿を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);          -- 投稿・コメントは author_id が NULL になって残る
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);   -- 会を消すと、その会の投稿・コメントも消える
    DELETE FROM public.group_requests WHERE disease_id = D;
    DELETE FROM public.trial_notices WHERE disease_id = D;     -- 案件を消すと、反応も消える
    DELETE FROM public.disease_catalog WHERE disease_id = D;   -- 公開の参加状況の行は CASCADE で消える

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vd-' || w || '@verify-delete-account.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_users, ARRAY['a', 'b', 'c', 'e']) AS x(u, w);

    INSERT INTO public.patient_groups (id, slug, name) VALUES
        (g1, 'verify-delete-account-1', 'VD 確認用の会1'),
        (g2, 'verify-delete-account-2', 'VD 確認用の会2');

    FOREACH t IN ARRAY ARRAY['A', 'B', 'C', 'E'] LOOP
        PERFORM pg_temp.vd_chk('準備', 'プロフィールを本人として作る', t, format(
            $q$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
               VALUES (auth.uid(), %L, %L, '40代', '答えない', '東京都') RETURNING user_id::text$q$,
            'VD本名' || t, 'VD表示' || t), pg_temp.vd_uid(t)::TEXT);
    END LOOP;

    -- 最初の世話人と会員は手で入れる（本番の最初の世話人と同じ入れ方）
    INSERT INTO public.memberships (user_id, group_id, role) VALUES
        (uB, g1, 'moderator'),
        (uC, g1, 'member'),
        (uA, g2, 'moderator'),
        (uE, g2, 'moderator');

    -- A は B の招待で会1 に入る（招待の used_by = A）
    t_ba := pg_temp.vd_as('B', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vd_chk('準備', 'A が B の招待で会1 に入る', 'A', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_ba), g1::TEXT);
    -- A が会2 の招待を発行する（まだ使われていない）
    t_a := pg_temp.vd_chk('準備', 'A が会2 の招待を発行', 'A', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g2), '%', 'token');
    -- A 自身の古い申請（審査済み。ひとこと・紹介者の氏名つき）
    INSERT INTO public.join_requests (group_id, user_id, message, referrer_name, status, decided_by, decided_at)
    VALUES (g1, uA, 'VDひとことA', 'VD紹介者A', 'approved', uB, now())
    RETURNING id::TEXT INTO req_a;
    -- C が会2 へ申請し、世話人 A が承認する（申請の decided_by = A）
    req_c := pg_temp.vd_chk('準備', 'C が会2 へ申請', 'C', format(
        $q$SELECT public.request_join(%L, 'VDひとことC', 'VD紹介者C')::text$q$, g2), UUID_LIKE, '申請 id');
    PERFORM pg_temp.vd_chk('準備', '世話人 A が C の申請を承認', 'A', format(
        $q$SELECT 'done' FROM public.approve_join_request(%L)$q$, req_c), DONE);

    -- 同意・病気（A と B）
    FOREACH t IN ARRAY ARRAY['A', 'B'] LOOP
        PERFORM pg_temp.vd_chk('準備', '同意（base・research_contact）を本人として作る', t,
            $q$WITH i AS (INSERT INTO public.consents (user_id, kind, version)
                          VALUES (auth.uid(), 'base', 2), (auth.uid(), 'research_contact', 2) RETURNING 1)
               SELECT count(*)::text FROM i$q$, '2');
        PERFORM pg_temp.vd_chk('準備', '案内を受け取る病気を本人として作る', t,
            $q$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name)
               VALUES (auth.uid(), 0, 'VD病名') RETURNING 'ok'$q$, 'ok');
    END LOOP;

    -- 道のり調査の回答と対応（A と B。20261010 を当てた DB でだけ）。台本の役割で直接入れる
    -- （会1・会2 はファブリー病の会ではないので、回答の関数は通らない。行の消え方だけを見る）
    IF v_has_journey THEN
        INSERT INTO public.journey_responses (
            group_id, disease_idx, disease_name, consent_version, respondent, birth_year_band, gender, region,
            first_symptoms, onset_age_band, first_department, diagnosis_department, facilities_count, departments_count,
            diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay)
        VALUES (g2, 0, 'ファブリー病', 1, 'self', '1980_1984', 'no_answer', 'no_answer',
                ARRAY['limb_pain'], '5_9', 'pediatrics', 'pediatrics', '1', '1', '10_14', 'no', 'no', '5_9')
        RETURNING id INTO j_a;
        INSERT INTO public.journey_responses (
            group_id, disease_idx, disease_name, consent_version, respondent, birth_year_band, gender, region,
            first_symptoms, onset_age_band, first_department, diagnosis_department, facilities_count, departments_count,
            diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay)
        VALUES (g1, 0, 'ファブリー病', 1, 'proxy', '2010_2014', 'no_answer', 'no_answer',
                ARRAY['fatigue'], '5_9', 'pediatrics', 'pediatrics', '1', '1', '10_14', 'no', 'no', '5_9')
        RETURNING id INTO j_b;
        INSERT INTO public.journey_links (response_id, user_id, group_id, disease_idx) VALUES
            (j_a, uA, g2, 0),
            (j_b, uB, g1, 0);
    END IF;

    -- 投稿・コメント（会1）
    p_a := pg_temp.vd_chk('準備', '会1 のスレッド（A）', 'A', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VD題A', 'VD本文-A') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    p_b := pg_temp.vd_chk('準備', '会1 のスレッド（B）', 'B', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VD題B', 'VD本文-B') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    c_a := pg_temp.vd_chk('準備', 'A が B のスレッドにコメント', 'A', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VDコメント-A') RETURNING id::text$q$, p_b), UUID_LIKE, 'id');
    c_b := pg_temp.vd_chk('準備', 'B が A のスレッドにコメント', 'B', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VDコメント-B') RETURNING id::text$q$, p_a), UUID_LIKE, 'id');
    c_c := pg_temp.vd_chk('準備', 'C が A のスレッドにコメント', 'C', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VDコメント-C') RETURNING id::text$q$, p_a), UUID_LIKE, 'id');

    -- 行事と参加表明（会2。版 3）。E が行事を作り、A と E が参加を表明する
    ev := pg_temp.vd_chk('準備', '会2 の行事（E）', 'E', format(
        $q$INSERT INTO public.group_events (group_id, title, body, starts_at) VALUES (%L, 'VD行事', 'VD行事の本文', now() + interval '7 days') RETURNING id::text$q$, g2), UUID_LIKE, 'id');
    FOREACH t IN ARRAY ARRAY['A', 'E'] LOOP
        PERFORM pg_temp.vd_chk('準備', '会2 の行事に参加を表明', t, format(
            $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'yes') RETURNING 'ok'$q$, ev), 'ok');
    END LOOP;

    -- 通報（版 3）。A は B の投稿を通報する。C は A の投稿と、会2 の E の投稿を通報する。
    -- 会2 の世話人 A が、C の会2 の通報を対応済みにする（handled_by = A）
    p_e := pg_temp.vd_chk('準備', '会2 のスレッド（E）', 'E', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VD題E', 'VD本文-E') RETURNING id::text$q$, g2), UUID_LIKE, 'id');
    r_a := pg_temp.vd_chk('準備', 'A が B の投稿を通報', 'A', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VD理由A')::text$q$, p_b), UUID_LIKE, 'id');
    r_c := pg_temp.vd_chk('準備', 'C が A の投稿を通報', 'C', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VD理由C')::text$q$, p_a), UUID_LIKE, 'id');
    r_ce := pg_temp.vd_chk('準備', 'C が会2 の E の投稿を通報', 'C', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VD理由C-E')::text$q$, p_e), UUID_LIKE, 'id');
    PERFORM pg_temp.vd_chk('準備', '会2 の世話人 A が C の通報を対応済みにする', 'A', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_ce), DONE);

    -- auth の関連表（版 3）。ログインしたときに Auth サーバーが作る行を、台本の役割で A の分だけ作る
    -- （identities・sessions・sessions に付いた refresh_tokens。auth.users を消すと CASCADE で消えるはずの行）
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (uA::TEXT, uA, jsonb_build_object('sub', uA::TEXT, 'email', 'vd-a@verify-delete-account.invalid'), 'email', now(), now());
    INSERT INTO auth.sessions (id, user_id, created_at, updated_at) VALUES (s_a, uA, now(), now());
    INSERT INTO auth.refresh_tokens (token, user_id, revoked, session_id, created_at, updated_at)
    VALUES ('vd-refresh-token-a', uA::TEXT, false, s_a, now(), now());

    -- 旧 profiles（ある DB でだけ）。A の行が無ければ台本の役割で足す（handle_new_user があれば既にある）
    IF v_has_profiles THEN
        PERFORM pg_temp.vd_as('admin', format(
            $q$INSERT INTO public.profiles (id) VALUES (%L) ON CONFLICT (id) DO NOTHING RETURNING 'ok'$q$, uA));
        v_profiles_before := pg_temp.vd_as('admin', format(
            $q$SELECT count(*)::text FROM public.profiles WHERE id = %L$q$, uA));
    END IF;

    -- 運営・案件・会の新設の申請（版 5）
    INSERT INTO public.disease_catalog (disease_id, idx, name) VALUES (D, 990111, 'VD病気');
    -- 案件 2 件（台本の役割で入れる）。n_a は A が運営として登録した案件（created_by = A）
    INSERT INTO public.trial_notices (disease_id, registry, registry_id, registry_url, summary, status, published_at, created_by)
    VALUES (D, 'jrct', 'VD-0001', 'https://jrct.niph.go.jp/vd-0001', 'VD案件1の要約', 'published', now(), uE)
    RETURNING id INTO n_1;
    INSERT INTO public.trial_notices (disease_id, registry, registry_id, registry_url, summary, status, published_at, created_by)
    VALUES (D, 'jrct', 'VD-0002', 'https://jrct.niph.go.jp/vd-0002', 'VD案件2の要約', 'published', now(), uA)
    RETURNING id INTO n_a;
    -- 案件への反応（A と E。台本の役割で入れる。見える条件は verify_ops.sql で確かめている）
    INSERT INTO public.notice_interest (notice_id, user_id, status) VALUES
        (n_1, uA, 'interested'), (n_1, uE, 'dismissed');
    -- 会の新設の申請。A の申請（申請中）と、C の申請（A が運営として却下した）
    INSERT INTO public.group_requests (disease_id, requester_id, proposed_name, message)
    VALUES (D, uA, 'VD新しい会A', 'VDひとことA') RETURNING id INTO gr_a;
    INSERT INTO public.group_requests (disease_id, requester_id, proposed_name, message, status, decided_by, decided_at)
    VALUES (D, uC, 'VD新しい会C', 'VDひとことC', 'rejected', uA, now()) RETURNING id INTO gr_c;

    -- =========================================================================
    -- 13. 最後の運営は消せない（版 5）。C がただ 1 人の運営のときに確かめ、その後で A・E を運営に足す
    -- =========================================================================
    INSERT INTO public.operators (user_id, note) VALUES (uC, 'VD 確認用');
    v := pg_temp.vd_fp(uC);
    PERFORM pg_temp.vd_chk('13', 'ただ 1 人の運営 C が自分のアカウントを消す', 'C',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, 'ERROR P0001 last_operator');
    PERFORM pg_temp.vd_rec('13', '[admin] C の行は何も消えていない（運営の行も）', v, pg_temp.vd_fp(uC), pg_temp.vd_fp(uC) = v);
    PERFORM pg_temp.vd_chk('13', 'C の auth.users・運営の資格は残る', 'admin', format(
        $q$SELECT (SELECT count(*) FROM auth.users WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.operators WHERE user_id = %L)::text$q$, uC, uC), '1:1');
    PERFORM pg_temp.vd_chk('13', 'C が運営として却下した申請・A の申請もそのまま', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.group_requests WHERE id IN (%L, %L))::text$q$, gr_a, gr_c), '2');
    INSERT INTO public.operators (user_id, note) VALUES (uA, 'VD 確認用'), (uE, 'VD 確認用');

    -- 消す前の他人の行の数
    fp_b := pg_temp.vd_fp(uB);
    fp_c := pg_temp.vd_fp(uC);
    fp_e := pg_temp.vd_fp(uE);

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vd_chk('0', 'auth.uid() が切り替えた人になる', 'A', 'SELECT auth.uid()::text', uA::TEXT);
    PERFORM pg_temp.vd_chk('0', 'anon では auth.uid() が空', 'anon', 'SELECT auth.uid()::text', '(null)');
    PERFORM pg_temp.vd_chk('0', '関数の所有者が BYPASSRLS を持つ（無いと FORCE RLS の表で 0 行消して成功扱いになる）', 'admin',
        $q$SELECT bool_and(r.rolbypassrls)::text FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.oid = ANY (ARRAY['public.delete_my_account()', 'public.delete_group_post(uuid)',
                                    'public.delete_group_comment(uuid)']::regprocedure[])$q$, 'true');
    PERFORM pg_temp.vd_chk('0', '関数の所有者が auth.users に DELETE の権限を持つ（無いと最後の削除で全体が戻る）', 'admin',
        $q$SELECT has_table_privilege(p.proowner, 'auth.users', 'DELETE')::text
             FROM pg_proc p WHERE p.oid = 'public.delete_my_account()'::regprocedure$q$, 'true');
    PERFORM pg_temp.vd_rec('0', '[admin] 準備: A の行（プロフィール:同意:病気:所属:申請:招待:投稿:コメント:参加表明:通報:反応:新設の申請:運営）', '1:2:1:2:1:1:1:1:1:1:1:1:1',
        pg_temp.vd_fp(uA), pg_temp.vd_fp(uA) = '1:2:1:2:1:1:1:1:1:1:1:1:1');

    -- =========================================================================
    -- 1. 他人のアカウント・行は消せない（A を消す前に、C が A の行を狙う）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('1', '他人（A）を指定して delete_my_account を呼ぶ（引数を取る形が無い）', 'C', format(
        $q$SELECT 'done' FROM public.delete_my_account(%L::uuid)$q$, uA), 'ERROR 42883%');
    PERFORM pg_temp.vd_chk('1', 'A の member_profiles を直接 delete', 'C', format(
        $q$WITH d AS (DELETE FROM public.member_profiles WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM d$q$, uA), '0');
    PERFORM pg_temp.vd_chk('1', 'A の member_diseases を直接 delete', 'C', format(
        $q$WITH d AS (DELETE FROM public.member_diseases WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM d$q$, uA), '0');
    PERFORM pg_temp.vd_chk('1', 'A の consents を直接 delete', 'C', format(
        $q$DELETE FROM public.consents WHERE user_id = %L$q$, uA), ERR_PERM);
    PERFORM pg_temp.vd_chk('1', 'A の memberships を直接 delete', 'C', format(
        $q$DELETE FROM public.memberships WHERE user_id = %L$q$, uA), ERR_PERM);
    PERFORM pg_temp.vd_chk('1', 'A の auth.users を直接 delete', 'C', format(
        $q$DELETE FROM auth.users WHERE id = %L$q$, uA), ERR_PERM);
    PERFORM pg_temp.vd_chk('1', '本人（A）も auth.users を直接は消せない（関数の中だけで消す）', 'A',
        $q$DELETE FROM auth.users WHERE id = auth.uid()$q$, ERR_PERM);
    PERFORM pg_temp.vd_chk('1', '本人（A）も consents を直接は消せない（関数の中だけで消す）', 'A',
        $q$DELETE FROM public.consents WHERE user_id = auth.uid()$q$, ERR_PERM);
    PERFORM pg_temp.vd_rec('1', '[admin] 上の操作の後も A の行はそのまま', '1:2:1:2:1:1:1:1:1:1:1:1:1',
        pg_temp.vd_fp(uA), pg_temp.vd_fp(uA) = '1:2:1:2:1:1:1:1:1:1:1:1:1');

    -- =========================================================================
    -- 2. anon は呼べない
    -- =========================================================================
    PERFORM pg_temp.vd_chk('2', 'anon が delete_my_account を呼ぶ', 'anon',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, ERR_PERM);
    PERFORM pg_temp.vd_rec('2', '[admin] anon の呼び出しの後も A の行はそのまま', '1:2:1:2:1:1:1:1:1:1:1:1:1',
        pg_temp.vd_fp(uA), pg_temp.vd_fp(uA) = '1:2:1:2:1:1:1:1:1:1:1:1:1');

    -- =========================================================================
    -- 3. 関数の設定（SECURITY DEFINER・search_path 固定・EXECUTE 権限）
    -- =========================================================================
    FOREACH t IN ARRAY ARRAY['public.delete_my_account()', 'public.delete_group_post(uuid)', 'public.delete_group_comment(uuid)'] LOOP
        PERFORM pg_temp.vd_chk('3', t || ': SECURITY DEFINER', 'admin', format(
            $q$SELECT prosecdef::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vd_chk('3', t || ': search_path が空に固定されている', 'admin', format(
            $q$SELECT ('search_path=""' = ANY (coalesce(proconfig, '{}')))::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vd_chk('3', t || ': anon は実行できない・authenticated は実行できる', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', %L, 'EXECUTE')
                       AND has_function_privilege('authenticated', %L, 'EXECUTE'))::text$q$, t, t), 'true');
        PERFORM pg_temp.vd_chk('3', t || ': PUBLIC に EXECUTE が付いていない', 'admin', format(
            $q$SELECT (p.proacl IS NOT NULL
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))::text
                 FROM pg_proc p WHERE p.oid = %L::regprocedure$q$, t), 'true');
    END LOOP;
    PERFORM pg_temp.vd_chk('3', '引数を取る delete_my_account が無い（他人を指せない）', 'admin',
        $q$SELECT count(*)::text FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'delete_my_account' AND pronargs > 0$q$, '0');

    -- =========================================================================
    -- 4. 最後の世話人は消せない（B は会1 のただ 1 人の世話人）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('4', '最後の世話人 B が自分のアカウントを消す', 'B',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, 'ERROR P0001 last_moderator');
    PERFORM pg_temp.vd_rec('4', '[admin] B の行は何も消えていない', fp_b, pg_temp.vd_fp(uB), pg_temp.vd_fp(uB) = fp_b);
    PERFORM pg_temp.vd_chk('4', 'B の auth.users は残る', 'admin', format(
        $q$SELECT count(*)::text FROM auth.users WHERE id = %L$q$, uB), '1');
    PERFORM pg_temp.vd_chk('4', 'B は会1 の世話人のまま', 'admin', format(
        $q$SELECT role || ':' || (left_at IS NULL)::text FROM public.memberships WHERE user_id = %L AND group_id = %L$q$, uB, g1), 'moderator:true');

    -- =========================================================================
    -- 12. 途中で失敗したら全体が戻る（A を本当に消す前に、最後の auth.users の削除をわざと失敗させる）
    --     auth.users を消すと group_posts.author_id が SET NULL になる。その UPDATE を台本のトリガーで止める
    -- =========================================================================
    EXECUTE $f$
        CREATE OR REPLACE FUNCTION public.vd_force_failure()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SET search_path = ''
        AS $b$
        BEGIN
            RAISE EXCEPTION USING MESSAGE = 'vd_forced_failure';
        END;
        $b$
    $f$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.vd_force_failure() FROM PUBLIC, anon, authenticated';
    EXECUTE format(
        $f$CREATE TRIGGER vd_force_failure BEFORE UPDATE OF author_id ON public.group_posts
           FOR EACH ROW WHEN (OLD.author_id = %L::uuid AND NEW.author_id IS NULL)
           EXECUTE FUNCTION public.vd_force_failure()$f$, uA);
    PERFORM pg_temp.vd_chk('12', '最後の auth.users の削除で失敗させる', 'A',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, 'ERROR P0001 vd_forced_failure');
    EXECUTE 'DROP TRIGGER vd_force_failure ON public.group_posts';
    EXECUTE 'DROP FUNCTION public.vd_force_failure()';
    PERFORM pg_temp.vd_rec('12', '[admin] 失敗の後、A の会員情報は 1 行も消えていない', '1:2:1:2:1:1:1:1:1:1:1:1:1',
        pg_temp.vd_fp(uA), pg_temp.vd_fp(uA) = '1:2:1:2:1:1:1:1:1:1:1:1:1');
    PERFORM pg_temp.vd_chk('12', '失敗の後、A の auth.users・旧 profiles・申請の decided_by・通報の handled_by も元のまま', 'admin', format(
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM auth.users WHERE id = %L),
                  (SELECT count(*) FROM public.join_requests WHERE decided_by = %L),
                  (SELECT count(*) FROM public.content_reports WHERE handled_by = %L))$q$, uA, uA, uA), '1:1:1');
    PERFORM pg_temp.vd_chk('12', '失敗の後、A の identities・sessions・refresh_tokens も元のまま', 'admin', format(
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM auth.identities WHERE user_id = %L),
                  (SELECT count(*) FROM auth.sessions WHERE user_id = %L),
                  (SELECT count(*) FROM auth.refresh_tokens WHERE session_id = %L))$q$, uA, uA, s_a), '1:1:1');
    PERFORM pg_temp.vd_chk('12', '台本のトリガーと関数が残っていない', 'admin',
        $q$SELECT ((SELECT count(*) FROM pg_trigger WHERE tgname = 'vd_force_failure')
                 + (SELECT count(*) FROM pg_proc WHERE proname = 'vd_force_failure'))::text$q$, '0');

    -- =========================================================================
    -- 5. A がアカウントを消す（A は会2 の世話人だが、E がいるので止まらない）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('5', 'A が自分のアカウントを消す', 'A',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, DONE);
    PERFORM pg_temp.vd_chk('5', 'A の member_profiles・consents・member_diseases・memberships が 0 行', 'admin', format(
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM public.member_profiles WHERE user_id = %L),
                  (SELECT count(*) FROM public.consents        WHERE user_id = %L),
                  (SELECT count(*) FROM public.member_diseases WHERE user_id = %L),
                  (SELECT count(*) FROM public.memberships     WHERE user_id = %L))$q$, uA, uA, uA, uA), '0:0:0:0');
    PERFORM pg_temp.vd_chk('5', 'A 本人から見ても自分のプロフィール・同意・所属は 0 行', 'A',
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM public.member_profiles),
                  (SELECT count(*) FROM public.consents),
                  (SELECT count(*) FROM public.memberships))$q$, '0:0:0');
    PERFORM pg_temp.vd_chk('5', 'A の入会申請が 0 行（ひとこと・紹介者の氏名ごと）', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.join_requests WHERE user_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.join_requests WHERE referrer_name = 'VD紹介者A')::text$q$, uA), '0:0');
    PERFORM pg_temp.vd_chk('5', 'A が審査した C の申請は残り、decided_by だけ NULL', 'admin', format(
        $q$SELECT status || ':' || (decided_by IS NULL)::text || ':' || (decided_at IS NOT NULL)::text
             FROM public.join_requests WHERE id = %L$q$, req_c), 'approved:true:true');
    PERFORM pg_temp.vd_chk('5', 'A が発行した招待が 0 行（未使用のものも）', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.invitations WHERE created_by = %L)::text || ':' ||
                  (SELECT count(*) FROM public.invitations WHERE token = %L)::text$q$, uA, t_a), '0:0');
    PERFORM pg_temp.vd_chk('5', 'A が使った B の招待は残り、used_by だけ NULL（used_at は残る）', 'admin', format(
        $q$SELECT (used_by IS NULL)::text || ':' || (used_at IS NOT NULL)::text FROM public.invitations WHERE token = %L$q$, t_ba), 'true:true');
    PERFORM pg_temp.vd_chk('5', 'どの表にも A の user_id が残っていない（投稿・コメントの author_id を除く）', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM public.join_requests WHERE user_id = %L OR decided_by = %L)
                 + (SELECT count(*) FROM public.invitations  WHERE created_by = %L OR used_by = %L))::text$q$, uA, uA, uA, uA), '0');
    IF v_has_profiles THEN
        PERFORM pg_temp.vd_rec('5', '[admin] 旧 profiles の A の行が消えた（消す前 → 消した後）', '1 → 0',
            v_profiles_before || ' → ' || pg_temp.vd_as('admin', format($q$SELECT count(*)::text FROM public.profiles WHERE id = %L$q$, uA)),
            v_profiles_before = '1' AND pg_temp.vd_as('admin', format($q$SELECT count(*)::text FROM public.profiles WHERE id = %L$q$, uA)) = '0');
    ELSE
        PERFORM pg_temp.vd_note('5', '[admin] 旧 profiles の表がこの DB に無い（関数は何もしない）', 'public.profiles なし');
    END IF;
    PERFORM pg_temp.vd_chk('5', 'auth.users の A が消えた（版 3）', 'admin', format(
        $q$SELECT count(*)::text FROM auth.users WHERE id = %L$q$, uA), '0');
    PERFORM pg_temp.vd_chk('5', 'B・C・E の auth.users は残る（他人は消えない）', 'admin', format(
        $q$SELECT count(*)::text FROM auth.users WHERE id IN (%L, %L, %L)$q$, uB, uC, uE), '3');
    PERFORM pg_temp.vd_chk('5', 'auth の関連表の A の行が CASCADE で消えた（identities:sessions:refresh_tokens）', 'admin', format(
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM auth.identities WHERE user_id = %L),
                  (SELECT count(*) FROM auth.sessions WHERE user_id = %L),
                  (SELECT count(*) FROM auth.refresh_tokens WHERE session_id = %L))$q$, uA, uA, s_a), '0:0:0');
    PERFORM pg_temp.vd_rec('5', '[admin] B の行は変わらない', fp_b, pg_temp.vd_fp(uB), pg_temp.vd_fp(uB) = fp_b);
    PERFORM pg_temp.vd_rec('5', '[admin] C の行は変わらない', fp_c, pg_temp.vd_fp(uC), pg_temp.vd_fp(uC) = fp_c);
    PERFORM pg_temp.vd_rec('5', '[admin] E の行は変わらない', fp_e, pg_temp.vd_fp(uE), pg_temp.vd_fp(uE) = fp_e);
    PERFORM pg_temp.vd_chk('5', '会2 の世話人は E の 1 人', 'admin', format(
        $q$SELECT string_agg(user_id::text, ',') FROM public.memberships WHERE group_id = %L AND role = 'moderator' AND left_at IS NULL$q$, g2), uE::TEXT);
    PERFORM pg_temp.vd_chk('5', 'auth.users が消えた後に手元の JWT のまま呼んでもエラーにならない（消す物が無い）', 'A',
        $q$SELECT 'done' FROM public.delete_my_account()$q$, DONE);

    -- =========================================================================
    -- 9. 道のり調査の回答（20261010）。A を消した直後に見る（項目 7 で auth.users を消す前）
    -- =========================================================================
    IF v_has_journey THEN
        PERFORM pg_temp.vd_chk('9', 'A の道のり調査の回答と対応が 0 行', 'admin', format(
            $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                      (SELECT count(*) FROM public.journey_links WHERE user_id = %L)::text$q$, j_a, uA), '0:0');
        PERFORM pg_temp.vd_chk('9', 'B の道のり調査の回答と対応は残る', 'admin', format(
            $q$SELECT (SELECT count(*) FROM public.journey_responses WHERE id = %L)::text || ':' ||
                      (SELECT count(*) FROM public.journey_links WHERE user_id = %L)::text$q$, j_b, uB), '1:1');
    ELSE
        PERFORM pg_temp.vd_note('9', '[admin] journey_links の表がこの DB に無い（20261010 未適用。項目 9 は飛ばした）', 'public.journey_links なし');
    END IF;

    -- =========================================================================
    -- 10. 行事への参加表明（版 3）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('10', 'A の参加表明が 0 行、E の参加表明と行事は残る', 'admin', format(
        $q$SELECT concat_ws(':',
                  (SELECT count(*) FROM public.event_attendance WHERE user_id = %L),
                  (SELECT count(*) FROM public.event_attendance WHERE user_id = %L AND event_id = %L),
                  (SELECT count(*) FROM public.group_events WHERE id = %L AND deleted_at IS NULL))$q$, uA, uE, ev, ev), '0:1:1');
    PERFORM pg_temp.vd_chk('10', '世話人 E の参加表明の一覧は E の 1 件だけ', 'E', format(
        $q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, ev), '1');
    PERFORM pg_temp.vd_chk('10', '行事の作成者（E）はそのまま', 'admin', format(
        $q$SELECT (created_by = %L)::text FROM public.group_events WHERE id = %L$q$, uE, ev), 'true');

    -- =========================================================================
    -- 11. 通報（版 3）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('11', 'A の通報が 0 行', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.content_reports WHERE reporter_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.content_reports WHERE id = %L)::text$q$, uA, r_a), '0:0');
    PERFORM pg_temp.vd_chk('11', 'C が A の投稿を通報した行は残る（対象の投稿も残る）', 'admin', format(
        $q$SELECT count(*)::text FROM public.content_reports WHERE id = %L AND reporter_id = %L AND post_id = %L$q$, r_c, uC, p_a), '1');
    PERFORM pg_temp.vd_chk('11', 'A が対応した C の通報は残り、handled_by だけ NULL（handled_at は残る）', 'admin', format(
        $q$SELECT (handled_by IS NULL)::text || ':' || (handled_at IS NOT NULL)::text FROM public.content_reports WHERE id = %L$q$, r_ce), 'true:true');
    PERFORM pg_temp.vd_chk('11', '会1 の世話人 B の通報一覧は C の 1 件だけ', 'B', format(
        $q$SELECT string_agg(id::text, ',') FROM public.list_group_reports(%L)$q$, g1), r_c);

    -- =========================================================================
    -- 14. 案件への反応と会の新設の申請（版 5）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('14', 'A の案件への反応が 0 行、E の反応は残る', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.notice_interest WHERE user_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.notice_interest WHERE user_id = %L AND notice_id = %L)::text$q$, uA, uE, n_1), '0:1');
    PERFORM pg_temp.vd_chk('14', 'A の会の新設の申請が 0 行', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.group_requests WHERE requester_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_requests WHERE id = %L)::text$q$, uA, gr_a), '0:0');
    PERFORM pg_temp.vd_chk('14', 'A が運営として却下した C の申請は残り、decided_by だけ NULL（decided_at は残る）', 'admin', format(
        $q$SELECT status || ':' || (decided_by IS NULL)::text || ':' || (decided_at IS NOT NULL)::text || ':' || (requester_id = %L)::text
             FROM public.group_requests WHERE id = %L$q$, uC, gr_c), 'rejected:true:true:true');
    PERFORM pg_temp.vd_chk('14', 'A が登録した案件は残り、created_by だけ NULL（auth.users の削除で SET NULL）', 'admin', format(
        $q$SELECT status || ':' || (created_by IS NULL)::text FROM public.trial_notices WHERE id = %L$q$, n_a), 'published:true');
    PERFORM pg_temp.vd_chk('14', 'E が登録した案件の created_by はそのまま', 'admin', format(
        $q$SELECT (created_by = %L)::text FROM public.trial_notices WHERE id = %L$q$, uE, n_1), 'true');

    -- =========================================================================
    -- 15. 運営の行（版 5）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('15', 'A の運営の行が消え、C・E の運営の行は残る', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.operators WHERE user_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.operators WHERE user_id IN (%L, %L))::text$q$, uA, uC, uE), '0:2');
    PERFORM pg_temp.vd_chk('15', '残った運営 E から見て、自分は運営のまま', 'E', 'SELECT public.is_operator()::text', 'true');

    -- =========================================================================
    -- 6. 投稿・コメントは会に残り、名前だけが消える
    -- =========================================================================
    PERFORM pg_temp.vd_chk('6', 'A の投稿・コメントの行が残り、本文も消えていない', 'admin', format(
        $q$SELECT (SELECT body FROM public.group_posts WHERE id = %L AND deleted_at IS NULL) || ':' ||
                  (SELECT body FROM public.group_comments WHERE id = %L AND deleted_at IS NULL)$q$, p_a, c_a), 'VD本文-A:VDコメント-A');
    PERFORM pg_temp.vd_chk('6', '会1 の世話人 B から A の投稿が見える', 'B', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE id = %L$q$, p_a), '1');
    PERFORM pg_temp.vd_chk('6', 'A の投稿に付いた他人のコメント（B）は残る', 'B', format(
        $q$SELECT count(*)::text FROM public.group_comments WHERE post_id = %L$q$, p_a), '2');
    PERFORM pg_temp.vd_chk('6', 'A が B の投稿に付けたコメントは残る', 'B', format(
        $q$SELECT count(*)::text FROM public.group_comments WHERE id = %L$q$, c_a), '1');
    PERFORM pg_temp.vd_chk('6', '書き手の対応表に A が入らない（画面は「名前未設定」）', 'B', format(
        $q$SELECT (count(*) FILTER (WHERE author_id = %L))::text || ':' || (count(*) FILTER (WHERE display_name = 'VD表示A'))::text
             FROM public.list_group_author_names(%L)$q$, uA, g1), '0:0');
    v := pg_temp.vd_chk('6', '世話人 B の書き出し', 'B', format(
        $q$SELECT public.export_group(%L)::text$q$, g1), '{%', 'JSON');
    PERFORM pg_temp.vd_rec('6', '[B] 書き出しに A の本文は入り、A の表示名・氏名は入らない', 'VD本文-A を含み、VD表示A・VD本名A を含まない',
        CASE WHEN v LIKE '%VD本文-A%' THEN '本文あり' ELSE '本文なし' END || '・' ||
        CASE WHEN v LIKE '%VD表示A%' OR v LIKE '%VD本名A%' THEN '名前あり' ELSE '名前なし' END,
        v LIKE '%VD本文-A%' AND v NOT LIKE '%VD表示A%' AND v NOT LIKE '%VD本名A%');
    PERFORM pg_temp.vd_chk('6', 'A からはもう会1 の投稿は読めない', 'A', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L$q$, g1), '0');

    -- =========================================================================
    -- 7. 関数が auth.users を消した後（版 3。版 2 までは Studio で消していた）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('7', 'auth.users が消えても A の投稿・コメントは残り、author_id が NULL', 'admin', format(
        $q$SELECT (SELECT (author_id IS NULL)::text || '/' || body FROM public.group_posts WHERE id = %L) || ':' ||
                  (SELECT (author_id IS NULL)::text || '/' || body FROM public.group_comments WHERE id = %L)$q$, p_a, c_a),
        'true/VD本文-A:true/VDコメント-A');
    PERFORM pg_temp.vd_chk('7', 'A の投稿に付いた B のコメントも残る', 'admin', format(
        $q$SELECT count(*)::text FROM public.group_comments WHERE id = %L AND deleted_at IS NULL$q$, c_b), '1');
    PERFORM pg_temp.vd_chk('7', '会1 の会員 C（世話人でない）は書き手が NULL の投稿を消せない', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_a), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('7', '会1 の会員 C（世話人でない）は書き手が NULL のコメントを消せない', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_a), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('7', '会1 の会員 C は書き手が NULL の投稿を書き換えられない', 'C', format(
        $q$WITH u AS (UPDATE public.group_posts SET body = 'x' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, p_a), '0');
    PERFORM pg_temp.vd_chk('7', '会1 の世話人 B は書き手が NULL のコメントを消せる', 'B', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_a), DONE);
    PERFORM pg_temp.vd_chk('7', '書き手を NULL にして投稿することはできない', 'C', format(
        $q$INSERT INTO public.group_posts (group_id, author_id, kind, title, body) VALUES (%L, NULL, 'thread', 't', 'b') RETURNING id::text$q$, g1), ERR_PERM);

    -- =========================================================================
    -- 8. 外部キーの一覧（auth.users を参照するもの。台本を流した DB の実際の値）
    --    c = CASCADE、n = SET NULL
    -- =========================================================================
    PERFORM pg_temp.vd_chk('8', '投稿・コメントの author_id は SET NULL・NULL 可', 'admin',
        $q$SELECT string_agg(format('%s.%s=%s/%s', cl.relname, a.attname, c.confdeltype,
                                    CASE WHEN a.attnotnull THEN 'notnull' ELSE 'null' END), ',' ORDER BY cl.relname COLLATE "C")
             FROM pg_constraint c
             JOIN pg_class cl ON cl.oid = c.conrelid
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
              AND c.conrelid IN ('public.group_posts'::regclass, 'public.group_comments'::regclass)$q$,
        'group_comments.author_id=n/null,group_posts.author_id=n/null');
    PERFORM pg_temp.vd_chk('8', 'author_id への外部キーは 1 本ずつ（付け替えで 2 本にならない）', 'admin',
        $q$SELECT count(*)::text FROM pg_constraint c
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND a.attname = 'author_id'
              AND c.conrelid IN ('public.group_posts'::regclass, 'public.group_comments'::regclass)$q$, '2');
    PERFORM pg_temp.vd_chk('8', 'ほかの表の外部キーは元のまま', 'admin',
        $q$SELECT string_agg(format('%s.%s=%s', cl.relname, a.attname, c.confdeltype), ','
                               ORDER BY cl.relname COLLATE "C", a.attname COLLATE "C")
             FROM pg_constraint c
             JOIN pg_class cl ON cl.oid = c.conrelid
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
              AND c.conrelid IN ('public.consents'::regclass, 'public.member_diseases'::regclass,
                                 'public.member_profiles'::regclass, 'public.memberships'::regclass,
                                 'public.invitations'::regclass, 'public.join_requests'::regclass)$q$,
        'consents.user_id=c,invitations.created_by=c,invitations.used_by=n,join_requests.decided_by=n,join_requests.user_id=c,member_diseases.user_id=c,member_profiles.user_id=c,memberships.user_id=c');
    -- 参考: auth.users を参照する public の外部キーすべて（上に無い表があれば、Studio で消したときの動きを確かめる）
    PERFORM pg_temp.vd_note('8', '[admin] 参考: auth.users を参照する public の外部キーすべて', pg_temp.vd_as('admin',
        $q$SELECT coalesce(string_agg(format('%s.%s=%s', cl.relname, a.attname, c.confdeltype), ', '
                                    ORDER BY cl.relname COLLATE "C", a.attname COLLATE "C"), 'なし')
             FROM pg_constraint c
             JOIN pg_class cl ON cl.oid = c.conrelid
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
              AND c.connamespace = 'public'::regnamespace$q$));
    -- 参考: 旧 profiles を参照する外部キー（profiles の行を消すと、ここが CASCADE なら一緒に消える）
    IF v_has_profiles THEN
        PERFORM pg_temp.vd_note('8', '[admin] 参考: public.profiles を参照する外部キー', pg_temp.vd_as('admin',
            $q$SELECT coalesce(string_agg(format('%s.%s=%s', c.conrelid::regclass, a.attname, c.confdeltype), ', '
                                        ORDER BY c.conrelid::regclass::text COLLATE "C"), 'なし')
                 FROM pg_constraint c
                 JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
                WHERE c.contype = 'f' AND c.confrelid = 'public.profiles'::regclass$q$));
    END IF;

    -- =========================================================================
    -- 後片付け（テストユーザーと会を消す。会を消すと、その会の投稿・コメントも消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);            -- 運営・反応・申請の本人の行も CASCADE で消える
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    DELETE FROM public.group_requests WHERE disease_id = D;
    DELETE FROM public.trial_notices WHERE disease_id = D;
    DELETE FROM public.disease_catalog WHERE disease_id = D;
    PERFORM pg_temp.vd_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.group_posts WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.memberships WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.member_profiles WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.consents WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.member_diseases WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.event_attendance WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.content_reports WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.operators WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_requests WHERE disease_id = %L)
                 + (SELECT count(*) FROM public.trial_notices WHERE disease_id = %L)
                 + (SELECT count(*) FROM public.disease_catalog WHERE disease_id = %L))::text$q$,
        v_users, g1, g2, g1, g2, v_users, v_users, v_users, v_users, v_users, g1, g2, v_users, D, D, D), '0');
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
      FROM pg_temp.verify_delete_account_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_delete_account_results
  ) r
 ORDER BY seq;
