-- =============================================================================
-- 通報の確認台本（supabase/migrations/20261014_content_reports.sql）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261014_content_reports.sql まで当てる
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_tenancy.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vr_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vr_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--
-- 登場人物（user_id は固定。メールは @verify-reports.invalid）:
--   M  会1 の世話人
--   U  会1 の会員（通報する人）
--   W  会1 の会員（投稿・コメントを書く人。U とは別に通報もする）
--   X  会2 の会員（会1 には入っていない）
--   N  会2 の世話人
--   anon  未ログイン
--
-- 項目:
--   0 前提（関数の所有者が BYPASSRLS を持つ、表の RLS が有効でポリシーが無い）
--   1 表は API ロールから直接触れない（select・insert・update・delete すべて権限エラー）
--   2 通報できる（投稿・コメント。会は対象から決まる。理由は前後の空白を落とす）
--   3 同じ対象への二重通報は already_reported（対応済みでも。別の人なら通報できる）
--   4 入力の確かめ（どちらか一方だけ・理由は 200 文字まで・理由は空でもよい）
--   5 自分の会の、消されていない投稿・コメントだけ（ほかの会・消された対象・無い対象・退会後は forbidden。anon は呼べない）
--   6 通報の一覧は世話人だけ。通報者は返さない
--   7 対応済みにするのは世話人だけ。2 回目は何も変えない
--   8 関数の SECURITY DEFINER・search_path 固定・EXECUTE 権限
--   9 外部キー（通報者のアカウントを消すと通報も消える。対応者なら handled_by だけ NULL）
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids UUID[] := ARRAY[
        '00000000-0000-4000-8000-0000000cc001', '00000000-0000-4000-8000-0000000cc002',
        '00000000-0000-4000-8000-0000000cc003', '00000000-0000-4000-8000-0000000cc004',
        '00000000-0000-4000-8000-0000000cc005']::UUID[];
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-reports.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regclass('public.content_reports') IS NULL THEN
        RAISE EXCEPTION 'public.content_reports がありません。先に 20261014_content_reports.sql を当ててください';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_reports_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_reports_results RESTART IDENTITY;

-- 登場人物 → user_id
CREATE OR REPLACE FUNCTION pg_temp.vr_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_who
        WHEN 'M' THEN '00000000-0000-4000-8000-0000000cc001'::UUID
        WHEN 'U' THEN '00000000-0000-4000-8000-0000000cc002'::UUID
        WHEN 'W' THEN '00000000-0000-4000-8000-0000000cc003'::UUID
        WHEN 'X' THEN '00000000-0000-4000-8000-0000000cc004'::UUID
        WHEN 'N' THEN '00000000-0000-4000-8000-0000000cc005'::UUID
    END;
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: M・U・W・X・N（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
CREATE OR REPLACE FUNCTION pg_temp.vr_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.vr_uid(p_who), 'role', 'authenticated')::TEXT, true);
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
CREATE OR REPLACE FUNCTION pg_temp.vr_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_reports_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 300),
            CASE WHEN p_ok THEN 'OK' ELSE 'NG' END);
$$;

-- p_who として実行し、「実際」が p_like に LIKE で一致するかを記録する。実際の値を返す（id の受け取りに使う）
CREATE OR REPLACE FUNCTION pg_temp.vr_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vr_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vr_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    uM UUID := pg_temp.vr_uid('M');
    uU UUID := pg_temp.vr_uid('U');
    uW UUID := pg_temp.vr_uid('W');
    uX UUID := pg_temp.vr_uid('X');
    uN UUID := pg_temp.vr_uid('N');
    g1 UUID := '00000000-0000-4000-8000-0000000cf001';
    g2 UUID := '00000000-0000-4000-8000-0000000cf002';
    v_users UUID[];
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    DONE      CONSTANT TEXT := 'done';
    FUNCS     CONSTANT TEXT[] := ARRAY[
        'public.report_group_content(uuid,uuid,text)', 'public.list_group_reports(uuid)',
        'public.mark_report_handled(uuid)'];

    p_w TEXT; p_w2 TEXT; p_w3 TEXT; p_del TEXT; p_n TEXT; c_w TEXT; c_on_del TEXT;
    r_post TEXT; r_comment TEXT; r_w TEXT; r_null TEXT; r_200 TEXT;
    v TEXT; v_first TEXT;
    t TEXT;
BEGIN
    v_users := ARRAY[uM, uU, uW, uX, uN];

    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 5 人・会 2 つ・所属・投稿・コメントを作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);   -- 会を消すと、投稿・コメント・通報も消える

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vr-' || w || '@verify-reports.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_users, ARRAY['m', 'u', 'w', 'x', 'n']) AS x(u, w);

    INSERT INTO public.patient_groups (id, slug, name) VALUES
        (g1, 'verify-reports-1', 'VR 確認用の会1'),
        (g2, 'verify-reports-2', 'VR 確認用の会2');

    FOREACH t IN ARRAY ARRAY['M', 'U', 'W', 'X', 'N'] LOOP
        PERFORM pg_temp.vr_chk('準備', 'プロフィールを本人として作る', t, format(
            $q$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
               VALUES (auth.uid(), %L, %L, '40代', '答えない', '東京都') RETURNING user_id::text$q$,
            'VR本名' || t, 'VR表示' || t), pg_temp.vr_uid(t)::TEXT);
    END LOOP;

    INSERT INTO public.memberships (user_id, group_id, role) VALUES
        (uM, g1, 'moderator'),
        (uU, g1, 'member'),
        (uW, g1, 'member'),
        (uN, g2, 'moderator'),
        (uX, g2, 'member');

    p_w := pg_temp.vr_chk('準備', '会1 のスレッド（W）', 'W', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VR題', 'VR本文-1') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    p_w2 := pg_temp.vr_chk('準備', '会1 のスレッド 2（W）', 'W', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VR題', 'VR本文-2') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    p_w3 := pg_temp.vr_chk('準備', '会1 のスレッド 3（W）', 'W', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VR題', 'VR本文-3') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    c_w := pg_temp.vr_chk('準備', '会1 のコメント（W）', 'W', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VRコメント') RETURNING id::text$q$, p_w), UUID_LIKE, 'id');
    p_del := pg_temp.vr_chk('準備', '会1 の消す予定のスレッド（W）', 'W', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VR題', 'VR本文-消す') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    c_on_del := pg_temp.vr_chk('準備', '消す予定のスレッドへのコメント（U）', 'U', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VRコメント-消える親') RETURNING id::text$q$, p_del), UUID_LIKE, 'id');
    PERFORM pg_temp.vr_chk('準備', 'W が自分のスレッドを消す（論理削除）', 'W', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_del), DONE);
    p_n := pg_temp.vr_chk('準備', '会2 のお知らせ（N）', 'N', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 'VR題', 'VR本文-会2') RETURNING id::text$q$, g2), UUID_LIKE, 'id');

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vr_chk('0', 'auth.uid() が切り替えた人になる', 'U', 'SELECT auth.uid()::text', uU::TEXT);
    PERFORM pg_temp.vr_chk('0', '関数の所有者が BYPASSRLS を持つ（無いと FORCE RLS の表を読み書きできない）', 'admin', format(
        $q$SELECT bool_and(r.rolbypassrls)::text FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.oid = ANY (ARRAY[%s]::regprocedure[])$q$,
        (SELECT string_agg(quote_literal(x), ',') FROM unnest(FUNCS) x)), 'true');
    PERFORM pg_temp.vr_chk('0', 'content_reports の RLS が有効・FORCE・ポリシーが 0 本', 'admin',
        $q$SELECT c.relrowsecurity::text || ':' || c.relforcerowsecurity::text || ':' ||
                  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)::text
             FROM pg_class c WHERE c.oid = 'public.content_reports'::regclass$q$, 'true:true:0');
    PERFORM pg_temp.vr_chk('0', 'anon・authenticated に表の権限が 1 つも無い', 'admin',
        $q$SELECT (NOT has_table_privilege('anon', 'public.content_reports', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
               AND NOT has_table_privilege('authenticated', 'public.content_reports', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))::text$q$,
        'true');

    -- =========================================================================
    -- 2. 通報できる
    -- =========================================================================
    r_post := pg_temp.vr_chk('2', 'U が W の投稿を通報（理由の前後に半角・全角の空白）', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, ' 　VR理由-投稿　 ')::text$q$, p_w), UUID_LIKE, '通報 id');
    r_comment := pg_temp.vr_chk('2', 'U が W のコメントを通報', 'U', format(
        $q$SELECT public.report_group_content(NULL, %L, 'VR理由-コメント')::text$q$, c_w), UUID_LIKE, '通報 id');
    PERFORM pg_temp.vr_chk('2', '保存された行（会・対象・通報者・理由・未対応）', 'admin', format(
        $q$SELECT concat_ws('|', (group_id = %L)::text, (post_id = %L)::text, (comment_id IS NULL)::text,
                            (reporter_id = %L)::text, reason, (handled_at IS NULL)::text, (handled_by IS NULL)::text)
             FROM public.content_reports WHERE id = %L$q$, g1, p_w, uU, r_post),
        'true|true|true|true|VR理由-投稿|true|true');
    PERFORM pg_temp.vr_chk('2', 'コメントの通報は、コメントの親の投稿の会になる', 'admin', format(
        $q$SELECT concat_ws('|', (group_id = %L)::text, (post_id IS NULL)::text, (comment_id = %L)::text)
             FROM public.content_reports WHERE id = %L$q$, g1, c_w, r_comment), 'true|true|true');
    PERFORM pg_temp.vr_chk('2', '世話人も通報できる（M が W の投稿 2 を通報）', 'M', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VR理由-世話人')::text$q$, p_w2), UUID_LIKE, '通報 id');
    PERFORM pg_temp.vr_chk('2', '自分の投稿も通報できる（W が投稿 3 を通報）', 'W', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VR理由-自分')::text$q$, p_w3), UUID_LIKE, '通報 id');

    -- =========================================================================
    -- 3. 二重通報
    -- =========================================================================
    PERFORM pg_temp.vr_chk('3', 'U が同じ投稿をもう一度通報', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, 'もう一度')::text$q$, p_w), 'ERROR P0001 already_reported');
    PERFORM pg_temp.vr_chk('3', 'U が同じコメントをもう一度通報', 'U', format(
        $q$SELECT public.report_group_content(NULL, %L, '')::text$q$, c_w), 'ERROR P0001 already_reported');
    r_w := pg_temp.vr_chk('3', '別の人（W）なら同じ投稿を通報できる', 'W', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VR理由-W')::text$q$, p_w), UUID_LIKE, '通報 id');
    PERFORM pg_temp.vr_chk('3', 'U の投稿への通報は 1 行のまま', 'admin', format(
        $q$SELECT count(*)::text FROM public.content_reports WHERE reporter_id = %L AND post_id = %L$q$, uU, p_w), '1');

    -- =========================================================================
    -- 4. 入力の確かめ
    -- =========================================================================
    PERFORM pg_temp.vr_chk('4', '投稿もコメントも指定しない', 'U',
        $q$SELECT public.report_group_content(NULL, NULL, 'x')::text$q$, 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vr_chk('4', '投稿とコメントを両方指定する', 'U', format(
        $q$SELECT public.report_group_content(%L, %L, 'x')::text$q$, p_w2, c_w), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vr_chk('4', '理由が 201 文字', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, %L)::text$q$, p_w2, repeat('あ', 201)), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vr_chk('4', '理由が 201 文字のときは何も保存されない', 'admin', format(
        $q$SELECT count(*)::text FROM public.content_reports WHERE reporter_id = %L AND post_id = %L$q$, uU, p_w2), '0');
    r_200 := pg_temp.vr_chk('4', '理由がちょうど 200 文字', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, %L)::text$q$, p_w2, repeat('あ', 200)), UUID_LIKE, '通報 id');
    r_null := pg_temp.vr_chk('4', '理由が NULL（空の理由で保存される）', 'W', format(
        $q$SELECT public.report_group_content(NULL, %L, NULL)::text$q$, c_w), UUID_LIKE, '通報 id');
    PERFORM pg_temp.vr_chk('4', '空の理由は空文字で保存される', 'admin', format(
        $q$SELECT (reason = '')::text FROM public.content_reports WHERE id = %L$q$, r_null), 'true');

    -- =========================================================================
    -- 5. 自分の会の、消されていない投稿・コメントだけ
    -- =========================================================================
    PERFORM pg_temp.vr_chk('5', '会1 に入っていない X が会1 の投稿を通報', 'X', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, p_w2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', '会1 に入っていない N（会2 の世話人）が会1 のコメントを通報', 'N', format(
        $q$SELECT public.report_group_content(NULL, %L, 'x')::text$q$, c_w), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', '会1 の U が会2 の投稿を通報', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, p_n), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', '論理削除された投稿を通報', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, p_del), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', '論理削除された投稿に付いたコメントを通報', 'W', format(
        $q$SELECT public.report_group_content(NULL, %L, 'x')::text$q$, c_on_del), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', '無い投稿を通報', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, gen_random_uuid()), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('5', 'anon が通報', 'anon', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, p_w2), ERR_PERM);
    PERFORM pg_temp.vr_chk('5', '会2 の X が自分の会の投稿を通報（できる）', 'X', format(
        $q$SELECT public.report_group_content(%L, NULL, 'VR理由-会2')::text$q$, p_n), UUID_LIKE, '通報 id');

    -- =========================================================================
    -- 1. 表は API ロールから直接触れない（通報の行がある状態で確かめる）
    -- =========================================================================
    PERFORM pg_temp.vr_chk('1', '会員が表を select', 'U', 'SELECT count(*)::text FROM public.content_reports', ERR_PERM);
    PERFORM pg_temp.vr_chk('1', '世話人が表を select', 'M', 'SELECT count(*)::text FROM public.content_reports', ERR_PERM);
    PERFORM pg_temp.vr_chk('1', 'anon が表を select', 'anon', 'SELECT count(*)::text FROM public.content_reports', ERR_PERM);
    PERFORM pg_temp.vr_chk('1', '会員が表へ直接 insert', 'U', format(
        $q$INSERT INTO public.content_reports (group_id, post_id, reporter_id, reason) VALUES (%L, %L, auth.uid(), 'x') RETURNING id::text$q$, g1, p_w3), ERR_PERM);
    PERFORM pg_temp.vr_chk('1', '世話人が表を直接 update（対応済みにする）', 'M', format(
        $q$UPDATE public.content_reports SET handled_at = now() WHERE group_id = %L$q$, g1), ERR_PERM);
    PERFORM pg_temp.vr_chk('1', '通報した本人が表から直接 delete', 'U', format(
        $q$DELETE FROM public.content_reports WHERE reporter_id = %L$q$, uU), ERR_PERM);

    -- =========================================================================
    -- 6. 通報の一覧（世話人だけ。通報者は返さない）
    -- =========================================================================
    PERFORM pg_temp.vr_chk('6', '会1 の世話人 M の一覧は会1 の通報だけ（7 件）', 'M', format(
        $q$SELECT count(*)::text FROM public.list_group_reports(%L)$q$, g1), '7');
    PERFORM pg_temp.vr_chk('6', '一覧の列は id・post_id・comment_id・reason・created_at・handled_at だけ', 'M', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_group_reports(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, g1),
        'comment_id,created_at,handled_at,id,post_id,reason');
    PERFORM pg_temp.vr_chk('6', '一覧に通報者の user_id・メールが含まれない', 'M', format(
        $q$SELECT (t LIKE %L OR t LIKE %L OR t LIKE %L OR t LIKE '%%verify-reports.invalid%%')::text
             FROM (SELECT coalesce(jsonb_agg(to_jsonb(r))::text, '') AS t FROM public.list_group_reports(%L) r) x$q$,
        '%' || uU || '%', '%' || uW || '%', '%' || uM || '%', g1), 'false');
    PERFORM pg_temp.vr_chk('6', '会員 U は一覧を読めない', 'U', format(
        $q$SELECT count(*)::text FROM public.list_group_reports(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('6', 'ほかの会の世話人 N は会1 の一覧を読めない', 'N', format(
        $q$SELECT count(*)::text FROM public.list_group_reports(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('6', '会2 の世話人 N の一覧は会2 の 1 件だけ', 'N', format(
        $q$SELECT count(*)::text FROM public.list_group_reports(%L)$q$, g2), '1');
    PERFORM pg_temp.vr_chk('6', 'anon は一覧を読めない', 'anon', format(
        $q$SELECT count(*)::text FROM public.list_group_reports(%L)$q$, g1), ERR_PERM);

    -- =========================================================================
    -- 7. 対応済みにする（世話人だけ）
    -- =========================================================================
    PERFORM pg_temp.vr_chk('7', '会員 U が対応済みにする', 'U', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_post), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('7', 'ほかの会の世話人 N が対応済みにする', 'N', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_post), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('7', '無い通報を対応済みにする', 'M', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, gen_random_uuid()), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vr_chk('7', 'anon が対応済みにする', 'anon', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_post), ERR_PERM);
    PERFORM pg_temp.vr_chk('7', 'ここまで通報は未対応のまま', 'admin', format(
        $q$SELECT (handled_at IS NULL AND handled_by IS NULL)::text FROM public.content_reports WHERE id = %L$q$, r_post), 'true');
    PERFORM pg_temp.vr_chk('7', '会1 の世話人 M が対応済みにする', 'M', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_post), DONE);
    v_first := pg_temp.vr_chk('7', 'handled_at が立ち、handled_by は M', 'admin', format(
        $q$SELECT (handled_by = %L)::text || '|' || handled_at::text FROM public.content_reports WHERE id = %L$q$, uM, r_post),
        'true|%', 'true|（時刻）');
    PERFORM pg_temp.vr_chk('7', 'もう一度対応済みにしてもエラーにならない', 'M', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_post), DONE);
    PERFORM pg_temp.vr_chk('7', '2 回目は最初の handled_at・handled_by を変えない', 'admin', format(
        $q$SELECT (handled_by = %L)::text || '|' || handled_at::text FROM public.content_reports WHERE id = %L$q$, uM, r_post),
        v_first, '1 回目と同じ');
    PERFORM pg_temp.vr_chk('7', '一覧で対応済みの handled_at が見える', 'M', format(
        $q$SELECT (handled_at IS NOT NULL)::text FROM public.list_group_reports(%L) WHERE id = %L$q$, g1, r_post), 'true');
    PERFORM pg_temp.vr_chk('7', '一覧の並びは未対応が先（最後の行が対応済み）', 'M', format(
        $q$SELECT string_agg((handled_at IS NOT NULL)::text, ',') FROM public.list_group_reports(%L)$q$, g1),
        'false,false,false,false,false,false,true');
    PERFORM pg_temp.vr_chk('3', '対応済みになった後でも、U は同じ投稿を通報できない', 'U', format(
        $q$SELECT public.report_group_content(%L, NULL, 'x')::text$q$, p_w), 'ERROR P0001 already_reported');

    -- =========================================================================
    -- 8. 関数の設定（SECURITY DEFINER・search_path 固定・EXECUTE 権限）
    -- =========================================================================
    FOREACH t IN ARRAY FUNCS LOOP
        PERFORM pg_temp.vr_chk('8', t || ': SECURITY DEFINER', 'admin', format(
            $q$SELECT prosecdef::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vr_chk('8', t || ': search_path が空に固定されている', 'admin', format(
            $q$SELECT ('search_path=""' = ANY (coalesce(proconfig, '{}')))::text FROM pg_proc WHERE oid = %L::regprocedure$q$, t), 'true');
        PERFORM pg_temp.vr_chk('8', t || ': anon は実行できない・authenticated は実行できる', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', %L, 'EXECUTE')
                       AND has_function_privilege('authenticated', %L, 'EXECUTE'))::text$q$, t, t), 'true');
        PERFORM pg_temp.vr_chk('8', t || ': PUBLIC に EXECUTE が付いていない', 'admin', format(
            $q$SELECT (p.proacl IS NOT NULL
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))::text
                 FROM pg_proc p WHERE p.oid = %L::regprocedure$q$, t), 'true');
    END LOOP;

    -- =========================================================================
    -- 9. 外部キー（Studio で auth.users を消したときと同じことを台本の役割で行う）
    -- =========================================================================
    PERFORM pg_temp.vr_chk('9', '外部キーの ON DELETE（c = CASCADE、n = SET NULL）', 'admin',
        $q$SELECT string_agg(format('%s=%s', a.attname, c.confdeltype), ',' ORDER BY a.attname COLLATE "C")
             FROM pg_constraint c
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f' AND c.conrelid = 'public.content_reports'::regclass$q$,
        'comment_id=c,group_id=c,handled_by=n,post_id=c,reporter_id=c');
    DELETE FROM auth.users WHERE id = uU;
    PERFORM pg_temp.vr_chk('9', '通報した U のアカウントを消すと、U の通報は消える', 'admin', format(
        $q$SELECT count(*)::text FROM public.content_reports WHERE id IN (%L, %L, %L)$q$, r_post, r_comment, r_200), '0');
    PERFORM pg_temp.vr_chk('9', 'ほかの人の通報は残る', 'admin', format(
        $q$SELECT count(*)::text FROM public.content_reports WHERE id IN (%L, %L)$q$, r_w, r_null), '2');
    PERFORM pg_temp.vr_chk('9', 'M が W の通報を対応済みにする', 'M', format(
        $q$SELECT 'done' FROM public.mark_report_handled(%L)$q$, r_w), DONE);
    DELETE FROM auth.users WHERE id = uM;
    PERFORM pg_temp.vr_chk('9', '対応した M のアカウントを消すと、handled_by だけ NULL（handled_at は残る）', 'admin', format(
        $q$SELECT (handled_by IS NULL)::text || ':' || (handled_at IS NOT NULL)::text FROM public.content_reports WHERE id = %L$q$, r_w), 'true:true');

    -- =========================================================================
    -- 後片付け（テストユーザーと会を消す。会を消すと、その会の投稿・コメント・通報も消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    PERFORM pg_temp.vr_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.group_posts WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.content_reports WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.memberships WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.member_profiles WHERE user_id = ANY (%L::uuid[])))::text$q$,
        v_users, g1, g2, g1, g2, g1, g2, v_users, v_users), '0');
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
      FROM pg_temp.verify_reports_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_reports_results
  ) r
 ORDER BY seq;
