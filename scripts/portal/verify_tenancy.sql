-- =============================================================================
-- 患者会テナントの確認台本
--   （supabase/migrations/20260927_patient_group_tenancy.sql と 20260930_patient_group_tenancy_v2.sql）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration（member_profiles → patient_group_tenancy → consents → 20260929 → tenancy_v2）を当てる
--      項目 15〜17 は v2 の分（紹介者の氏名、申請者の氏名、会員一覧の見える範囲）
--      項目 17 は 20261003_members_moderator_only.sql を当てた後の形（会員一覧は世話人だけ）
--      join_requests への直接 insert が権限エラーになる項目（3・6・13・15）は 20261004_join_requests_rpc_only.sql を当てた後の形
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   ユーザーの切り替えは set_config('request.jwt.claims', …, true) と SET LOCAL ROLE で行う
--   （pg_temp の関数 vt_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   作る物は一時的なもの（pg_temp の関数と表）と、テスト用のユーザー 5 人・会 2 つだけ。
--
-- 登場人物（user_id は固定。メールは @verify-tenancy.invalid）:
--   A  会1 の世話人（moderator）
--   B  会2 の会員
--   C  プロフィールあり・最初は未所属
--   D  プロフィール無し
--   E  会2 の世話人（「会2 の世話人が承認」のために足した人）
--   anon  未ログイン
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー（表・列・関数の権限が無い、または RLS の with check に触れた）
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids UUID[] := ARRAY[
        '00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000b001',
        '00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000d001',
        '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000f001']::UUID[];
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    -- 固定の user_id が、テスト用でない人に使われていたら消さずに止める
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-tenancy.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_tenancy_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_tenancy_results RESTART IDENTITY;

-- 登場人物 → user_id
CREATE OR REPLACE FUNCTION pg_temp.vt_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_who
        WHEN 'A' THEN '00000000-0000-4000-8000-00000000a001'::UUID
        WHEN 'B' THEN '00000000-0000-4000-8000-00000000b001'::UUID
        WHEN 'C' THEN '00000000-0000-4000-8000-00000000c001'::UUID
        WHEN 'D' THEN '00000000-0000-4000-8000-00000000d001'::UUID
        WHEN 'E' THEN '00000000-0000-4000-8000-00000000e001'::UUID
    END;
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: A〜E（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
--   例外ブロックは副トランザクションなので、失敗したときは SET LOCAL ROLE と claims も巻き戻る
CREATE OR REPLACE FUNCTION pg_temp.vt_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.vt_uid(p_who), 'role', 'authenticated')::TEXT, true);
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
CREATE OR REPLACE FUNCTION pg_temp.vt_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_tenancy_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 300),
            CASE WHEN p_ok THEN 'OK' ELSE 'NG' END);
$$;

-- p_who として実行し、「実際」が p_like に LIKE で一致するかを記録する。実際の値を返す（id の受け取りに使う）
CREATE OR REPLACE FUNCTION pg_temp.vt_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vt_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vt_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    uA UUID := pg_temp.vt_uid('A');
    uB UUID := pg_temp.vt_uid('B');
    uC UUID := pg_temp.vt_uid('C');
    uD UUID := pg_temp.vt_uid('D');
    uE UUID := pg_temp.vt_uid('E');
    -- 項目 18 で auth.users に入れて消すだけの人（役割の切り替えはしない）
    uF UUID := '00000000-0000-4000-8000-00000000f001';
    g1 UUID := '00000000-0000-4000-8000-0000000f0001';
    g2 UUID := '00000000-0000-4000-8000-0000000f0002';
    v_users UUID[];
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    DONE      CONSTANT TEXT := 'done';

    p_ann_g1 TEXT; p_ann_g2 TEXT; p_thr_b TEXT; c_b TEXT; p_thr_a TEXT;
    p_thr_c1 TEXT; p_thr_c2 TEXT; c_c TEXT; c_c2 TEXT;
    t1 TEXT; t2 TEXT; t_exp TEXT; t_extra TEXT; t_d TEXT; t_b TEXT; t_c TEXT;
    req_c TEXT; req_d TEXT;
    v TEXT; v_export TEXT;
    f TEXT;
    t TEXT;
    FUNCS CONSTANT TEXT[] := ARRAY[
        'public.is_group_member(uuid)', 'public.is_group_moderator(uuid)',
        'public.accept_invitation(text)', 'public.request_join(uuid,text,text)',
        'public.approve_join_request(uuid)', 'public.reject_join_request(uuid)',
        'public.list_group_members(uuid)', 'public.delete_group_post(uuid)',
        'public.delete_group_comment(uuid)', 'public.leave_group(uuid)',
        'public.list_join_requests(uuid)', 'public.appoint_moderator(uuid,uuid)',
        'public.dismiss_moderator(uuid,uuid)', 'public.export_group(uuid)',
        'public.list_group_author_names(uuid)'];
    TABLES CONSTANT TEXT[] := ARRAY[
        'patient_groups', 'memberships', 'invitations', 'join_requests', 'group_posts', 'group_comments'];
BEGIN
    v_users := ARRAY[uA, uB, uC, uD, uE];

    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 5 人・会 2 つ・所属・投稿を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users) OR id = uF;  -- 所属・投稿・申請・招待・プロフィールは CASCADE で消える
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vt-' || w || '@verify-tenancy.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_users, ARRAY['a', 'b', 'c', 'd', 'e']) AS x(u, w);

    INSERT INTO public.patient_groups (id, slug, name) VALUES
        (g1, 'verify-tenancy-1', 'VT 確認用の会1'),
        (g2, 'verify-tenancy-2', 'VT 確認用の会2');

    -- プロフィールは本人として作る（member_profiles の RLS を通す）。D だけ作らない
    FOREACH t IN ARRAY ARRAY['A', 'B', 'C', 'E'] LOOP
        PERFORM pg_temp.vt_chk('準備', 'プロフィールを本人として作る', t, format(
            $q$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
               VALUES (auth.uid(), %L, %L, '40代', '答えない', '東京都') RETURNING user_id::text$q$,
            'VT本名' || t, 'VT表示' || t), pg_temp.vt_uid(t)::TEXT);
    END LOOP;

    -- 最初の世話人と会員は手で入れる（本番の最初の世話人と同じ入れ方）
    INSERT INTO public.memberships (user_id, group_id, role) VALUES
        (uA, g1, 'moderator'),
        (uE, g2, 'moderator'),
        (uB, g2, 'member');

    p_ann_g1 := pg_temp.vt_chk('準備', '会1 のお知らせ（A）', 'A', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 'VT題', 'VT本文-ann-g1') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    p_ann_g2 := pg_temp.vt_chk('準備', '会2 のお知らせ（E）', 'E', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 'VT題', 'VT本文-ann-g2') RETURNING id::text$q$, g2), UUID_LIKE, 'id');
    p_thr_b := pg_temp.vt_chk('準備', '会2 のスレッド（B）', 'B', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VT題', 'VT本文-thr-b') RETURNING id::text$q$, g2), UUID_LIKE, 'id');
    c_b := pg_temp.vt_chk('準備', '会2 のコメント（B）', 'B', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VT削除済みコメント') RETURNING id::text$q$, p_thr_b), UUID_LIKE, 'id');
    PERFORM pg_temp.vt_chk('準備', '会2 の招待（E）', 'E', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING 'ok'$q$, g2), 'ok');
    -- プロフィールの無い D の申請は、ポリシーでは作れないので台本の役割で入れる（古い行の想定）
    INSERT INTO public.join_requests (group_id, user_id, message) VALUES (g2, uD, 'VT古い申請D')
        RETURNING id::TEXT INTO req_d;

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vt_chk('0', 'auth.uid() が切り替えた人になる', 'A', 'SELECT auth.uid()::text', uA::TEXT);
    PERFORM pg_temp.vt_chk('0', 'auth.uid() が切り替えた人になる', 'C', 'SELECT auth.uid()::text', uC::TEXT);
    PERFORM pg_temp.vt_chk('0', 'anon では auth.uid() が空', 'anon', 'SELECT auth.uid()::text', '(null)');
    PERFORM pg_temp.vt_chk('0', '役割が authenticated に切り替わる', 'A', 'SELECT current_user::text', 'authenticated');
    PERFORM pg_temp.vt_chk('0', '関数の所有者が BYPASSRLS を持つ（無いと表示名が null になる）', 'admin', format(
        $q$SELECT bool_and(r.rolbypassrls)::text FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.oid = ANY (ARRAY[%s]::regprocedure[])$q$,
        (SELECT string_agg(quote_literal(x), ',') FROM unnest(FUNCS) x)), 'true');
    PERFORM pg_temp.vt_chk('0', '6 表すべてで RLS が有効', 'admin', format(
        $q$SELECT bool_and(relrowsecurity)::text FROM pg_class WHERE oid = ANY (ARRAY[%s]::regclass[])$q$,
        (SELECT string_agg(quote_literal('public.' || x), ',') FROM unnest(TABLES) x)), 'true');
    PERFORM pg_temp.vt_chk('0', '準備: 会2 の世話人 E には会2 の投稿 2 件が見える（0 行の確認が空振りでない）', 'E', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L$q$, g2), '2');

    -- =========================================================================
    -- 1. 会をまたぐ読み取り（A は会1 の世話人。会2 の行は 1 行も見えない）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('1', '会2 の投稿', 'A', format($q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('1', '会2 のコメント', 'A', format($q$SELECT count(*)::text FROM public.group_comments WHERE post_id = %L$q$, p_thr_b), '0');
    PERFORM pg_temp.vt_chk('1', '会2 の会員', 'A', format($q$SELECT count(*)::text FROM public.memberships WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('1', '会2 の申請', 'A', format($q$SELECT count(*)::text FROM public.join_requests WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('1', '会2 の招待', 'A', format($q$SELECT count(*)::text FROM public.invitations WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('1', '会2 の会員一覧（関数）', 'A', format($q$SELECT count(*)::text FROM public.list_group_members(%L)$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('1', '会2 の申請一覧（関数）', 'A', format($q$SELECT count(*)::text FROM public.list_join_requests(%L)$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('1', '会2 の会員 B も会2 の招待・申請は読めない', 'B', format(
        $q$SELECT (SELECT count(*) FROM public.invitations WHERE group_id = %L) + (SELECT count(*) FROM public.join_requests WHERE group_id = %L)$q$, g2, g2), '0');

    -- =========================================================================
    -- 2. 入会前の読み取り（C は未所属）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('2', 'patient_groups の id/slug/name は読める', 'C', format(
        $q$SELECT count(*)::text FROM (SELECT id, slug, name FROM public.patient_groups WHERE id IN (%L, %L)) x$q$, g1, g2), '2');
    PERFORM pg_temp.vt_chk('2', 'disease_idxs は読めない', 'C', 'SELECT count(disease_idxs)::text FROM public.patient_groups', ERR_PERM);
    PERFORM pg_temp.vt_chk('2', 'disease_names は読めない', 'C', 'SELECT count(disease_names)::text FROM public.patient_groups', ERR_PERM);
    PERFORM pg_temp.vt_chk('2', 'select * も読めない（列の権限）', 'C', 'SELECT count(*)::text FROM (SELECT * FROM public.patient_groups) x', ERR_PERM);
    PERFORM pg_temp.vt_chk('2', '会の投稿は読めない', 'C', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id IN (%L, %L)$q$, g1, g2), '0');

    -- =========================================================================
    -- 3. 直接書き込みの禁止
    -- =========================================================================
    PERFORM pg_temp.vt_chk('3', 'memberships へ自分を insert', 'C', format(
        $q$INSERT INTO public.memberships (user_id, group_id) VALUES (auth.uid(), %L)$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', 'memberships へ他人を insert（世話人でも）', 'A', format(
        $q$INSERT INTO public.memberships (user_id, group_id) VALUES (%L, %L)$q$, uC, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', 'memberships を update（世話人でも）', 'A', format(
        $q$UPDATE public.memberships SET role = 'moderator' WHERE group_id = %L$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', 'memberships を delete（世話人でも）', 'A', format(
        $q$DELETE FROM public.memberships WHERE group_id = %L$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '自分の memberships を update（自分の役割を上げる）', 'B', format(
        $q$UPDATE public.memberships SET role = 'moderator' WHERE user_id = auth.uid() AND group_id = %L$q$, g2), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '投稿の物理 DELETE（自分のお知らせ）', 'A', format(
        $q$DELETE FROM public.group_posts WHERE id = %L$q$, p_ann_g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '投稿の物理 DELETE（世話人が会内の投稿）', 'E', format(
        $q$DELETE FROM public.group_posts WHERE id = %L$q$, p_thr_b), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', 'コメントの物理 DELETE（自分のコメント）', 'B', format(
        $q$DELETE FROM public.group_comments WHERE id = %L$q$, c_b), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', 'deleted_at を直接 update（関数を通さない削除）', 'A', format(
        $q$UPDATE public.group_posts SET deleted_at = now() WHERE id = %L$q$, p_ann_g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '招待を update（使用済みにする）', 'A', format(
        $q$UPDATE public.invitations SET used_at = now() WHERE group_id = %L$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '入会申請を表へ直接 insert（プロフィールあり・未所属の C。request_join 経由だけ）', 'C', format(
        $q$INSERT INTO public.join_requests (group_id) VALUES (%L) RETURNING id::text$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('3', '会1 の所属は A の 1 行のまま', 'admin', format(
        $q$SELECT count(*)::text FROM public.memberships WHERE group_id = %L$q$, g1), '1');

    -- =========================================================================
    -- 4. 招待
    -- =========================================================================
    t1 := pg_temp.vt_chk('4', '世話人 A が会1 の招待を発行', 'A', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1), '%', 'token');
    PERFORM pg_temp.vt_chk('4', 'C が受諾すると会1 の id が返る', 'C', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t1), g1::TEXT);
    PERFORM pg_temp.vt_chk('4', 'C は会1 の member になった', 'admin', format(
        $q$SELECT role FROM public.memberships WHERE user_id = %L AND group_id = %L AND left_at IS NULL$q$, uC, g1), 'member');
    PERFORM pg_temp.vt_chk('4', '招待は使用済み（used_by = C）', 'admin', format(
        $q$SELECT (used_at IS NOT NULL AND used_by = %L)::text FROM public.invitations WHERE token = %L$q$, uC, t1), 'true');
    PERFORM pg_temp.vt_chk('4', '同じ token の再受諾', 'C', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t1), 'ERROR P0001 invitation_used');
    PERFORM pg_temp.vt_chk('4', '別の人が使用済み token を受諾', 'B', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t1), 'ERROR P0001 invitation_used');
    INSERT INTO public.invitations (group_id, created_by, expires_at) VALUES (g1, uA, now() - INTERVAL '1 day')
        RETURNING token INTO t_exp;
    PERFORM pg_temp.vt_chk('4', '期限切れ token の受諾', 'B', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_exp), 'ERROR P0001 invitation_expired');
    PERFORM pg_temp.vt_chk('4', '存在しない token の受諾', 'B', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, repeat('f', 64)), 'ERROR P0001 invitation_not_found');
    PERFORM pg_temp.vt_chk('4', '会員でない者（B）が会1 の招待を発行', 'B', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('4', '会員だが世話人でない者（C）が会1 の招待を発行', 'C', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('4', '他の会の世話人（E）が会1 の招待を発行', 'E', format(
        $q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('4', '期限 365 日の招待（上限 90 日を超える）', 'A', format(
        $q$INSERT INTO public.invitations (group_id, expires_at) VALUES (%L, now() + interval '365 days') RETURNING token$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('4', '他人名義（created_by = B）の招待', 'A', format(
        $q$INSERT INTO public.invitations (group_id, created_by) VALUES (%L, %L) RETURNING token$q$, g1, uB), ERR_PERM);
    t_extra := pg_temp.vt_as('A', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vt_chk('4', '既に会員の C が新しい招待を受諾', 'C', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_extra), 'ERROR P0001 already_member');
    PERFORM pg_temp.vt_chk('4', 'そのとき招待は使われずに残る', 'admin', format(
        $q$SELECT (used_at IS NULL)::text FROM public.invitations WHERE token = %L$q$, t_extra), 'true');
    PERFORM pg_temp.vt_chk('4', '世話人でない C は会1 の招待を読めない', 'C', format(
        $q$SELECT count(*)::text FROM public.invitations WHERE group_id = %L$q$, g1), '0');

    -- =========================================================================
    -- 5. 入会申請（C → 会2）
    -- =========================================================================
    req_c := pg_temp.vt_chk('5', 'C が会2 へ申請', 'C', format(
        $q$SELECT public.request_join(%L, 'VTひとことC', ' VT紹介者C ')::text$q$, g2), UUID_LIKE, '申請 id');
    PERFORM pg_temp.vt_chk('5', '同じ会へ 2 回目の申請', 'C', format(
        $q$SELECT public.request_join(%L, 'again')::text$q$, g2), 'ERROR P0001 already_requested');
    PERFORM pg_temp.vt_chk('5', 'C は自分の申請を読める', 'C', format(
        $q$SELECT status FROM public.join_requests WHERE user_id = auth.uid() AND group_id = %L$q$, g2), 'pending');
    PERFORM pg_temp.vt_chk('5', 'C は他人（D）の申請を読めない', 'C', format(
        $q$SELECT count(*)::text FROM public.join_requests WHERE group_id = %L AND user_id <> auth.uid()$q$, g2), '0');
    PERFORM pg_temp.vt_chk('5', '会2 の会員 B は申請を読めない', 'B', format(
        $q$SELECT count(*)::text FROM public.join_requests WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('5', '世話人 E の申請一覧に C の表示名が出る', 'E', format(
        $q$SELECT string_agg(coalesce(display_name, '(名前未設定)'), ',' ORDER BY created_at) FROM public.list_join_requests(%L)$q$, g2),
        '%VT表示C%', 'VT表示C を含む');
    PERFORM pg_temp.vt_chk('5', '申請一覧の列は id・表示名・申請者の氏名・紹介者の氏名・ひとこと・申請日だけ', 'E', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_join_requests(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, g2),
        'created_at,display_name,full_name,id,message,referrer_name');
    PERFORM pg_temp.vt_chk('5', '申請一覧に user_id・メールが含まれない', 'E', format(
        $q$SELECT (t LIKE '%%verify-tenancy.invalid%%' OR t LIKE %L OR t LIKE %L)::text
             FROM (SELECT coalesce(jsonb_agg(to_jsonb(r))::text, '') AS t FROM public.list_join_requests(%L) r) x$q$,
        '%' || uC || '%', '%' || uD || '%', g2), 'false');
    -- ---- 15. 紹介者の氏名（保存と可視範囲） ------------------------------------
    PERFORM pg_temp.vt_chk('15', '紹介者の氏名は前後の空白を落として保存される', 'admin', format(
        $q$SELECT referrer_name FROM public.join_requests WHERE id = %L$q$, req_c), 'VT紹介者C');
    PERFORM pg_temp.vt_chk('15', '申請した本人は自分の申請の紹介者を読める', 'C', format(
        $q$SELECT referrer_name FROM public.join_requests WHERE id = %L$q$, req_c), 'VT紹介者C');
    PERFORM pg_temp.vt_chk('15', '会2 の会員 B は紹介者を読めない', 'B', format(
        $q$SELECT count(referrer_name)::text FROM public.join_requests WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('15', '他会の世話人 A は紹介者を読めない', 'A', format(
        $q$SELECT count(referrer_name)::text FROM public.join_requests WHERE group_id = %L$q$, g2), '0');
    PERFORM pg_temp.vt_chk('15', '会2 の世話人 E の申請一覧に紹介者が出る', 'E', format(
        $q$SELECT string_agg(coalesce(referrer_name, '(なし)'), ',' ORDER BY created_at) FROM public.list_join_requests(%L)$q$, g2),
        '%VT紹介者C%', 'VT紹介者C を含む');
    v := pg_temp.vt_chk('15', '紹介者が空白だけの申請（B → 会1）', 'B', format(
        $q$SELECT public.request_join(%L, '', '　 ')::text$q$, g1), UUID_LIKE, '申請 id');
    PERFORM pg_temp.vt_chk('15', '空白だけの紹介者は NULL で保存される', 'admin', format(
        $q$SELECT (referrer_name IS NULL)::text FROM public.join_requests WHERE id = %L$q$, v), 'true');
    PERFORM pg_temp.vt_chk('15', '紹介者の氏名が 101 文字', 'C', format(
        $q$SELECT public.request_join(%L, '', %L)::text$q$, g1, repeat('あ', 101)), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.vt_chk('15', '紹介者の氏名が 101 文字（表へ直接 insert → 権限エラー）', 'C', format(
        $q$INSERT INTO public.join_requests (group_id, referrer_name) VALUES (%L, %L) RETURNING id::text$q$, g1, repeat('あ', 101)), ERR_PERM);
    PERFORM pg_temp.vt_chk('15', '全角空白だけの紹介者（表へ直接 insert → 権限エラー。残る経路が無い）', 'C', format(
        $q$INSERT INTO public.join_requests (group_id, referrer_name) VALUES (%L, '　') RETURNING id::text$q$, g1), ERR_PERM);

    -- ---- 16. 申請者の氏名（可視範囲） -------------------------------------------
    PERFORM pg_temp.vt_chk('16', '会2 の世話人 E の申請一覧に申請者 C の氏名が出る', 'E', format(
        $q$SELECT string_agg(coalesce(full_name, '(未作成)'), ',' ORDER BY created_at) FROM public.list_join_requests(%L)$q$, g2),
        '%VT本名C%', 'VT本名C を含む');
    PERFORM pg_temp.vt_chk('16', '会2 の会員 B は申請一覧（氏名）を読めない', 'B', format(
        $q$SELECT count(*)::text FROM public.list_join_requests(%L)$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('16', '世話人 E でも member_profiles の他人の行は読めない', 'E', format(
        $q$SELECT count(*)::text FROM public.member_profiles WHERE user_id <> auth.uid()$q$), '0');
    PERFORM pg_temp.vt_chk('16', '世話人 E の会員一覧にも氏名は出ない', 'E', format(
        $q$SELECT (jsonb_agg(to_jsonb(r))::text LIKE '%%VT本名%%')::text FROM public.list_group_members(%L) r$q$, g2), 'false');

    PERFORM pg_temp.vt_chk('5', '会1 の世話人 A の承認', 'A', format(
        $q$SELECT 'done' FROM public.approve_join_request(%L)$q$, req_c), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('5', '会2 の会員 B の承認', 'B', format(
        $q$SELECT 'done' FROM public.approve_join_request(%L)$q$, req_c), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('5', '世話人 E が表を直接 approved にする（関数を通さない承認）', 'E', format(
        $q$UPDATE public.join_requests SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE id = %L$q$, req_c), ERR_PERM);
    PERFORM pg_temp.vt_chk('5', '会2 の世話人 E の承認', 'E', format(
        $q$SELECT 'done' FROM public.approve_join_request(%L)$q$, req_c), DONE);
    PERFORM pg_temp.vt_chk('5', 'C は会2 の member になった', 'admin', format(
        $q$SELECT role FROM public.memberships WHERE user_id = %L AND group_id = %L AND left_at IS NULL$q$, uC, g2), 'member');
    PERFORM pg_temp.vt_chk('5', '申請は approved・決めたのは E', 'admin', format(
        $q$SELECT status || ':' || (decided_by = %L)::text FROM public.join_requests WHERE id = %L$q$, uE, req_c), 'approved:true');
    PERFORM pg_temp.vt_chk('15', '承認の後も紹介者の氏名は消えない', 'admin', format(
        $q$SELECT status || ':' || coalesce(referrer_name, '(null)') FROM public.join_requests WHERE id = %L$q$, req_c), 'approved:VT紹介者C');
    PERFORM pg_temp.vt_chk('5', '承認済みの申請をもう一度承認', 'E', format(
        $q$SELECT 'done' FROM public.approve_join_request(%L)$q$, req_c), 'ERROR P0001 request_not_pending');
    PERFORM pg_temp.vt_chk('5', 'C は会2 の投稿を読める', 'C', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L$q$, g2), '2');
    PERFORM pg_temp.vt_chk('5', '会1 の世話人 A の却下', 'A', format(
        $q$SELECT 'done' FROM public.reject_join_request(%L)$q$, req_d), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('5', '会2 の世話人 E の却下', 'E', format(
        $q$SELECT 'done' FROM public.reject_join_request(%L)$q$, req_d), DONE);
    PERFORM pg_temp.vt_chk('5', '却下された D は会2 の会員でない', 'admin', format(
        $q$SELECT count(*)::text FROM public.memberships WHERE user_id = %L$q$, uD), '0');
    PERFORM pg_temp.vt_chk('5', '処理後の申請一覧は 0 件', 'E', format(
        $q$SELECT count(*)::text FROM public.list_join_requests(%L)$q$, g2), '0');

    -- =========================================================================
    -- 6. プロフィール無し（D）
    -- =========================================================================
    t_d := pg_temp.vt_as('A', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vt_chk('6', 'D が招待を受諾', 'D', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_d), 'ERROR P0001 profile_required');
    PERFORM pg_temp.vt_chk('6', 'D が申請（関数）', 'D', format(
        $q$SELECT public.request_join(%L, '')::text$q$, g1), 'ERROR P0001 profile_required');
    PERFORM pg_temp.vt_chk('6', 'D が申請（表へ直接 insert）', 'D', format(
        $q$INSERT INTO public.join_requests (group_id) VALUES (%L) RETURNING id::text$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('6', 'D はどの会にも所属していない・招待は未使用のまま', 'admin', format(
        $q$SELECT (SELECT count(*) FROM public.memberships WHERE user_id = %L)::text || ':' ||
                  (SELECT (used_at IS NULL)::text FROM public.invitations WHERE token = %L)$q$, uD, t_d), '0:true');

    -- =========================================================================
    -- 7. 投稿の権限（会1: 世話人 A、会員 C）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('7', 'member の announcement 投稿', 'C', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 't', 'b') RETURNING id::text$q$, g1), ERR_PERM);
    p_thr_c1 := pg_temp.vt_chk('7', 'member の thread 投稿', 'C', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VT題', 'VT本文-thr-c1') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    PERFORM pg_temp.vt_chk('7', '他人（A）名義の投稿', 'C', format(
        $q$INSERT INTO public.group_posts (group_id, author_id, kind, title, body) VALUES (%L, %L, 'thread', 't', 'b') RETURNING id::text$q$, g1, uA), ERR_PERM);
    PERFORM pg_temp.vt_chk('7', '世話人の announcement 投稿', 'A', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 'VT題', 'VT本文') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    p_thr_a := pg_temp.vt_chk('7', '世話人の thread 投稿', 'A', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VT題', 'VT本文-thr-a') RETURNING id::text$q$, g1), UUID_LIKE, 'id');
    PERFORM pg_temp.vt_chk('7', '会員でない会（会1）への thread 投稿', 'B', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 't', 'b') RETURNING id::text$q$, g1), ERR_PERM);
    PERFORM pg_temp.vt_chk('7', '他会（会1）の投稿へのコメント', 'B', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'x') RETURNING id::text$q$, p_thr_c1), ERR_PERM);
    PERFORM pg_temp.vt_chk('7', '他会の世話人が会1 のお知らせへコメント', 'E', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'x') RETURNING id::text$q$, p_ann_g1), ERR_PERM);
    c_c := pg_temp.vt_chk('7', 'member がお知らせへコメント（可）', 'C', format(
        $q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VTコメントC') RETURNING id::text$q$, p_ann_g1), UUID_LIKE, 'id');
    PERFORM pg_temp.vt_chk('7', '他人（A）の投稿の本文を書き換え', 'C', format(
        $q$WITH u AS (UPDATE public.group_posts SET body = 'x' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, p_thr_a), '0');
    PERFORM pg_temp.vt_chk('7', '自分の投稿の本文を書き換え', 'C', format(
        $q$WITH u AS (UPDATE public.group_posts SET body = 'VT本文-thr-c1-改' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, p_thr_c1), '1');

    -- =========================================================================
    -- 8. 論理削除
    -- =========================================================================
    p_thr_c2 := pg_temp.vt_as('C', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VT題', 'VT本文-thr-c2') RETURNING id::text$q$, g1));
    PERFORM pg_temp.vt_chk('8', '本人が自分の投稿を消す', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_thr_c1), DONE);
    PERFORM pg_temp.vt_chk('8', '消した投稿の行は残り deleted_at が立つ', 'admin', format(
        $q$SELECT (deleted_at IS NOT NULL)::text FROM public.group_posts WHERE id = %L$q$, p_thr_c1), 'true');
    PERFORM pg_temp.vt_chk('8', '消した投稿は本人の一覧に出ない', 'C', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE id = %L$q$, p_thr_c1), '0');
    PERFORM pg_temp.vt_chk('8', '消した投稿は世話人の一覧にも出ない', 'A', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE id = %L$q$, p_thr_c1), '0');
    PERFORM pg_temp.vt_chk('8', 'member が他人（A）の投稿を消す', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_thr_a), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('8', '会員でない B が会1 の投稿を消す', 'B', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_thr_a), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('8', '他会の世話人 E が会1 の投稿を消す', 'E', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_ann_g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('8', '世話人が会内の他人の投稿を消す', 'A', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_thr_c2), DONE);
    PERFORM pg_temp.vt_chk('8', '世話人が会内の他人のコメントを消す', 'A', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_c), DONE);
    c_c2 := pg_temp.vt_as('C', format($q$INSERT INTO public.group_comments (post_id, body) VALUES (%L, 'VTコメントC2') RETURNING id::text$q$, p_ann_g1));
    PERFORM pg_temp.vt_chk('8', '会員でない B が会1 の C のコメントを消す', 'B', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_c2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('8', '本人が自分のコメントを消す', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_c2), DONE);
    PERFORM pg_temp.vt_chk('8', '消したコメントは一覧に出ない（行は残る）', 'C', format(
        $q$SELECT count(*)::text || ':' || (SELECT count(*) FROM public.group_comments WHERE post_id = %L)::text
             FROM public.group_comments WHERE id IN (%L, %L)$q$, p_ann_g1, c_c, c_c2), '0:0');
    PERFORM pg_temp.vt_chk('8', '消したコメントの行は残っている', 'admin', format(
        $q$SELECT count(*)::text FROM public.group_comments WHERE id IN (%L, %L) AND deleted_at IS NOT NULL$q$, c_c, c_c2), '2');
    PERFORM pg_temp.vt_chk('8', '会1 のスレッド一覧は A の 1 件だけ', 'C', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L AND kind = 'thread'$q$, g1), '1');
    PERFORM pg_temp.vt_chk('8', '消した投稿をもう一度消す', 'C', format(
        $q$SELECT 'done' FROM public.delete_group_post(%L)$q$, p_thr_c1), 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 9. 退会
    -- =========================================================================
    PERFORM pg_temp.vt_chk('9', 'C が会1 を退会', 'C', format(
        $q$SELECT 'done' FROM public.leave_group(%L)$q$, g1), DONE);
    PERFORM pg_temp.vt_chk('9', 'left_at が立つ（行は残る）', 'admin', format(
        $q$SELECT (left_at IS NOT NULL)::text FROM public.memberships WHERE user_id = %L AND group_id = %L$q$, uC, g1), 'true');
    PERFORM pg_temp.vt_chk('9', '以後、会1 の投稿を読むと 0 行', 'C', format(
        $q$SELECT count(*)::text FROM public.group_posts WHERE group_id = %L$q$, g1), '0');
    PERFORM pg_temp.vt_chk('9', '以後、会1 の会員一覧は読めない', 'C', format(
        $q$SELECT count(*)::text FROM public.list_group_members(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('9', '自分の退会済みの行は見える', 'C', format(
        $q$SELECT count(*)::text FROM public.memberships WHERE user_id = auth.uid() AND group_id = %L AND left_at IS NOT NULL$q$, g1), '1');
    PERFORM pg_temp.vt_chk('9', 'もう一度退会', 'C', format(
        $q$SELECT 'done' FROM public.leave_group(%L)$q$, g1), 'ERROR P0001 not_member');
    PERFORM pg_temp.vt_chk('9', '唯一の世話人 A の退会', 'A', format(
        $q$SELECT 'done' FROM public.leave_group(%L)$q$, g1), 'ERROR P0001 last_moderator');
    t_b := pg_temp.vt_as('A', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vt_chk('9', 'B が会1 の招待を受諾', 'B', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_b), g1::TEXT);
    PERFORM pg_temp.vt_chk('9', 'A が B を会1 の世話人に任命', 'A', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g1, uB), DONE);
    PERFORM pg_temp.vt_chk('9', '任命後は A が退会できる', 'A', format(
        $q$SELECT 'done' FROM public.leave_group(%L)$q$, g1), DONE);
    PERFORM pg_temp.vt_chk('9', '会1 の世話人は B の 1 人', 'admin', format(
        $q$SELECT string_agg(user_id::text, ',') FROM public.memberships WHERE group_id = %L AND role = 'moderator' AND left_at IS NULL$q$, g1), uB::TEXT);
    t_c := pg_temp.vt_as('B', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vt_chk('9', '退会した C が招待で再入会', 'C', format(
        $q$SELECT public.accept_invitation(%L)::text$q$, t_c), g1::TEXT);
    PERFORM pg_temp.vt_chk('9', '再入会後は同じ行が member・left_at 無しに戻る', 'admin', format(
        $q$SELECT role || ':' || (left_at IS NULL)::text FROM public.memberships WHERE user_id = %L AND group_id = %L$q$, uC, g1), 'member:true');

    -- =========================================================================
    -- 10. 任命・解除（会2: 世話人 E、会員 B・C）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('10', 'member が自分を任命', 'C', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uC), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('10', 'member が世話人を解除', 'B', format(
        $q$SELECT 'done' FROM public.dismiss_moderator(%L, %L)$q$, g2, uE), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('10', '会1 の世話人 B（会2 では member）が会2 で自分を任命', 'B', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uB), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('10', '最後の 1 人（E）が自分を解除', 'E', format(
        $q$SELECT 'done' FROM public.dismiss_moderator(%L, %L)$q$, g2, uE), 'ERROR P0001 last_moderator');
    PERFORM pg_temp.vt_chk('10', '会員でない人（D）を任命', 'E', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uD), 'ERROR P0001 not_member');
    PERFORM pg_temp.vt_chk('10', '世話人 E が B を任命', 'E', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uB), DONE);
    PERFORM pg_temp.vt_chk('10', 'B の会2 での役割は moderator', 'admin', format(
        $q$SELECT role FROM public.memberships WHERE user_id = %L AND group_id = %L$q$, uB, g2), 'moderator');
    PERFORM pg_temp.vt_chk('10', '世話人 B が E を解除（B が残る）', 'B', format(
        $q$SELECT 'done' FROM public.dismiss_moderator(%L, %L)$q$, g2, uE), DONE);
    PERFORM pg_temp.vt_chk('10', '最後の 1 人（B）が自分を解除', 'B', format(
        $q$SELECT 'done' FROM public.dismiss_moderator(%L, %L)$q$, g2, uB), 'ERROR P0001 last_moderator');
    PERFORM pg_temp.vt_chk('10', '解除された E はもう任命できない', 'E', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uE), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('10', '世話人でない C を解除', 'B', format(
        $q$SELECT 'done' FROM public.dismiss_moderator(%L, %L)$q$, g2, uC), 'ERROR P0001 not_moderator');
    PERFORM pg_temp.vt_chk('10', 'B が E を世話人に戻す', 'B', format(
        $q$SELECT 'done' FROM public.appoint_moderator(%L, %L)$q$, g2, uE), DONE);
    PERFORM pg_temp.vt_chk('10', '会2 の世話人は B と E の 2 人', 'admin', format(
        $q$SELECT count(*)::text FROM public.memberships WHERE group_id = %L AND role = 'moderator' AND left_at IS NULL$q$, g2), '2');

    -- =========================================================================
    -- 11. 書き出し（会2）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('11', '書き出し前に B が自分のコメントを消す', 'B', format(
        $q$SELECT 'done' FROM public.delete_group_comment(%L)$q$, c_b), DONE);
    v_export := pg_temp.vt_chk('11', '世話人 E の書き出し', 'E', format(
        $q$SELECT public.export_group(%L)::text$q$, g2), '{%', 'JSON');
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しに会員の表示名が入る', 'VT表示B・VT表示C・VT表示E を含む', left(v_export, 120),
        v_export LIKE '%VT表示B%' AND v_export LIKE '%VT表示C%' AND v_export LIKE '%VT表示E%');
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しに full_name が含まれない', 'VT本名 を含まない',
        CASE WHEN v_export LIKE '%VT本名%' THEN '含まれている' ELSE '含まれていない' END, v_export NOT LIKE '%VT本名%');
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しに user_id が含まれない', 'テストユーザーの user_id を含まない',
        (SELECT coalesce(string_agg(u::TEXT, ','), '含まれていない') FROM unnest(v_users) u WHERE v_export LIKE '%' || u || '%'),
        NOT EXISTS (SELECT 1 FROM unnest(v_users) u WHERE v_export LIKE '%' || u || '%'));
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しにメールが含まれない', '@verify-tenancy.invalid を含まない',
        CASE WHEN v_export LIKE '%verify-tenancy.invalid%' THEN '含まれている' ELSE '含まれていない' END,
        v_export NOT LIKE '%verify-tenancy.invalid%');
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しに消したコメントが含まれない', 'VT削除済みコメント を含まない',
        CASE WHEN v_export LIKE '%VT削除済みコメント%' THEN '含まれている' ELSE '含まれていない' END,
        v_export NOT LIKE '%VT削除済みコメント%');
    PERFORM pg_temp.vt_rec('11', '[E] 書き出しのキーに user_id / author_id / full_name / email が無い', '無い',
        v_export, v_export NOT LIKE '%"user_id"%' AND v_export NOT LIKE '%"author_id"%'
                  AND v_export NOT LIKE '%"full_name"%' AND v_export NOT LIKE '%"email"%');
    PERFORM pg_temp.vt_chk('11', 'member の書き出し', 'C', format(
        $q$SELECT public.export_group(%L)::text$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('11', '会員でない A の書き出し', 'A', format(
        $q$SELECT public.export_group(%L)::text$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('11', '会員一覧の列は user_id・表示名・役割・入会日だけ（本名なし。世話人が呼ぶ）', 'E', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_group_members(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, g2),
        'display_name,joined_at,role,user_id');
    PERFORM pg_temp.vt_chk('11', '会員一覧に本名・メールが含まれない（世話人が呼ぶ）', 'E', format(
        $q$SELECT (t LIKE '%%VT本名%%' OR t LIKE '%%verify-tenancy.invalid%%')::text
             FROM (SELECT jsonb_agg(to_jsonb(r))::text AS t FROM public.list_group_members(%L) r) x$q$, g2), 'false');

    PERFORM pg_temp.vt_rec('15', '[E] 書き出しに紹介者の氏名が含まれない', 'VT紹介者 を含まない',
        CASE WHEN v_export LIKE '%VT紹介者%' THEN '含まれている' ELSE '含まれていない' END, v_export NOT LIKE '%VT紹介者%');
    PERFORM pg_temp.vt_chk('15', '会員一覧に紹介者の氏名が含まれない', 'E', format(
        $q$SELECT (jsonb_agg(to_jsonb(r))::text LIKE '%%VT紹介者%%')::text FROM public.list_group_members(%L) r$q$, g2), 'false');

    -- =========================================================================
    -- 17. 会員一覧は世話人だけ（20261003）。書き手の表示名は一般会員にも出る（会2: 世話人 B・E、会員 C）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('17', '一般会員 C が会員一覧を呼ぶ（API を直接叩いても取れない）', 'C', format(
        $q$SELECT count(*)::text FROM public.list_group_members(%L)$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vt_chk('17', '世話人 E の会員一覧: 3 人・user_id は 3 件', 'E', format(
        $q$SELECT count(*)::text || ':' || count(user_id)::text FROM public.list_group_members(%L)$q$, g2), '3:3');
    PERFORM pg_temp.vt_chk('17', '書き手の対応表は一般会員 C も引ける。書いた人だけ（E と B。書いていない C は入らない）', 'C', format(
        $q$SELECT string_agg(coalesce(display_name, '(null)'), ',' ORDER BY display_name) || ':' ||
                  count(*) FILTER (WHERE author_id = auth.uid())::text
             FROM public.list_group_author_names(%L)$q$, g2), 'VT表示B,VT表示E:0');
    PERFORM pg_temp.vt_chk('17', '一般会員 C が会2 に投稿する', 'C', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VT題', 'VT本文-thr-c-g2') RETURNING id::text$q$, g2), UUID_LIKE, 'id');
    PERFORM pg_temp.vt_chk('17', '投稿すれば C の表示名も対応表に出る（会員一覧が世話人だけでも変わらない）', 'C', format(
        $q$SELECT string_agg(coalesce(display_name, '(null)'), ',' ORDER BY display_name) || ':' ||
                  count(*) FILTER (WHERE author_id = auth.uid())::text
             FROM public.list_group_author_names(%L)$q$, g2), 'VT表示B,VT表示C,VT表示E:1');
    PERFORM pg_temp.vt_chk('17', '会員でない A は書き手の対応表を読めない', 'A', format(
        $q$SELECT count(*)::text FROM public.list_group_author_names(%L)$q$, g2), 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 12. anon（未ログイン）
    -- =========================================================================
    FOREACH t IN ARRAY TABLES || ARRAY['member_profiles'] LOOP
        PERFORM pg_temp.vt_chk('12', t || ' を読む', 'anon', format('SELECT count(*)::text FROM public.%I', t), ERR_PERM);
    END LOOP;
    FOREACH f IN ARRAY FUNCS LOOP
        PERFORM pg_temp.vt_chk('12', f || ' を呼ぶ', 'anon', format(
            'SELECT %s::text',
            regexp_replace(regexp_replace(regexp_replace(regexp_replace(f,
                '\(uuid,text,text\)$', format('(%L::uuid, %L, %L)', g1, 'x', 'x')),
                '\(uuid,uuid\)$', format('(%L::uuid, %L::uuid)', g1, uA)),
                '\(uuid,text\)$', format('(%L::uuid, %L)', g1, 'x')),
                '\((uuid|text)\)$', format('(%L)', g1))), ERR_PERM);
    END LOOP;

    -- =========================================================================
    -- 13. 関数の定義
    -- =========================================================================
    FOREACH f IN ARRAY FUNCS LOOP
        PERFORM pg_temp.vt_chk('13', f || ': SECURITY DEFINER・search_path 固定', 'admin', format(
            $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                     WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
                 FROM (SELECT to_regprocedure(%L) AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, f), 'true');
        PERFORM pg_temp.vt_chk('13', f || ': anon と PUBLIC に EXECUTE が無い・authenticated にはある', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
                       AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, f), 'true');
    END LOOP;
    FOREACH t IN ARRAY TABLES LOOP
        PERFORM pg_temp.vt_chk('13', t || ': anon に権限が無い・authenticated に DELETE が無い', 'admin', format(
            $q$SELECT (NOT has_table_privilege('anon', %L, 'SELECT,INSERT,UPDATE,DELETE')
                       AND NOT has_table_privilege('authenticated', %L, 'DELETE'))::text$q$,
            'public.' || t, 'public.' || t), 'true');
    END LOOP;
    PERFORM pg_temp.vt_chk('13', 'join_requests: authenticated に INSERT の権限（表・列とも）が無い・insert のポリシーが無い', 'admin',
        $q$SELECT (NOT has_table_privilege('authenticated', 'public.join_requests', 'INSERT')
                   AND NOT has_any_column_privilege('authenticated', 'public.join_requests', 'INSERT')
                   AND NOT EXISTS (SELECT 1 FROM pg_policies
                                    WHERE schemaname = 'public' AND tablename = 'join_requests'
                                      AND cmd IN ('INSERT', 'ALL')))::text$q$, 'true');
    PERFORM pg_temp.vt_chk('13', '旧い request_join(uuid, text) が残っていない（v2 で差し替え）', 'admin',
        $q$SELECT (to_regprocedure('public.request_join(uuid,text)') IS NULL)::text$q$, 'true');
    -- handle_new_user（00001。20261011 で search_path を固定）。トリガー関数なので、どの API ロールからも実行できない
    PERFORM pg_temp.vt_chk('13', 'public.handle_new_user(): SECURITY DEFINER・search_path 空固定', 'admin',
        $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                 WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
             FROM (SELECT to_regprocedure('public.handle_new_user()') AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, 'true');
    PERFORM pg_temp.vt_chk('13', 'public.handle_new_user(): anon・authenticated・PUBLIC に EXECUTE が無い', 'admin',
        $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                   AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                   WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text
             FROM pg_proc p WHERE p.oid = to_regprocedure('public.handle_new_user()')$q$, 'true');
    -- この migration 以外の SECURITY DEFINER 関数（参考。OK・NG は付けない）
    v := pg_temp.vt_as('admin', format(
        $q$SELECT coalesce(string_agg(p.proname, ', ' ORDER BY p.proname), 'なし') FROM pg_proc p
            WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
              AND NOT (p.oid = ANY (ARRAY[%s]::regprocedure[]))
              AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%%')$q$,
        (SELECT string_agg(quote_literal(x), ',') FROM unnest(FUNCS) x)));
    INSERT INTO pg_temp.verify_tenancy_results (no, item, expected, actual, ok)
    VALUES ('13', '[admin] 参考: この migration 以外で search_path 未固定の SECURITY DEFINER 関数（public）', '（参考）', v, '参考');

    -- =========================================================================
    -- 14. 招待 token
    -- =========================================================================
    t2 := pg_temp.vt_as('B', format($q$INSERT INTO public.invitations (group_id) VALUES (%L) RETURNING token$q$, g1));
    PERFORM pg_temp.vt_rec('14', '[admin] token は 64 文字の 16 進（' || coalesce(length(t1), 0) || ' 文字）', '^[0-9a-f]{64}$',
        t1, t1 ~ '^[0-9a-f]{64}$' AND t2 ~ '^[0-9a-f]{64}$');
    PERFORM pg_temp.vt_rec('14', '[admin] 続けて作った token が違う', '違う', t1 || ' / ' || t2, t1 <> t2);
    PERFORM pg_temp.vt_rec('14', '[admin] token に会の id・user_id が含まれない', '含まれない', t1,
        NOT EXISTS (SELECT 1 FROM unnest(ARRAY[g1, uA, uB, uC]) x WHERE t1 LIKE '%' || replace(x::TEXT, '-', '') || '%'));
    PERFORM pg_temp.vt_chk('14', 'token の既定値は gen_random_uuid() 2 つ分', 'admin',
        $q$SELECT pg_get_expr(d.adbin, d.adrelid) FROM pg_attrdef d
             JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
            WHERE d.adrelid = 'public.invitations'::regclass AND a.attname = 'token'$q$,
        '%gen_random_uuid()%gen_random_uuid()%', 'gen_random_uuid() を 2 回');
    PERFORM pg_temp.vt_chk('14', '同じ式で 10,000 個作って重なりが無い', 'admin',
        $q$SELECT count(DISTINCT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))::text FROM generate_series(1, 10000)$q$,
        '10000');
    PERFORM pg_temp.vt_chk('14', 'token を自分で決めて insert できない（列の権限）', 'A', format(
        $q$INSERT INTO public.invitations (token, group_id) VALUES (%L, %L) RETURNING token$q$, repeat('0', 64), g2), ERR_PERM);

    -- =========================================================================
    -- 18. auth.users に入れると profiles の行ができる（handle_new_user のトリガー。search_path 空でも動く）
    -- =========================================================================
    PERFORM pg_temp.vt_chk('18', 'トリガー on_auth_user_created が auth.users の AFTER INSERT で handle_new_user を呼ぶ', 'admin',
        $q$SELECT (count(*) = 1)::text FROM pg_trigger t
            WHERE t.tgrelid = 'auth.users'::regclass AND t.tgname = 'on_auth_user_created'
              AND t.tgfoid = to_regprocedure('public.handle_new_user()') AND NOT t.tgisinternal$q$, 'true');
    PERFORM pg_temp.vt_chk('18', 'auth.users にテスト行を 1 件入れる', 'admin', format(
        $q$INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           VALUES (%L, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                   'vt-f@verify-tenancy.invalid', '{}'::jsonb, '{}'::jsonb, now(), now())
           RETURNING id::text$q$, uF), uF::TEXT);
    PERFORM pg_temp.vt_chk('18', 'profiles に同じ id の行ができる', 'admin', format(
        $q$SELECT count(*)::text FROM public.profiles WHERE id = %L$q$, uF), '1');

    -- =========================================================================
    -- 後片付け（テストユーザーを消せば、所属・投稿・申請・招待・プロフィールは CASCADE で消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users) OR id = uF;
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    PERFORM pg_temp.vt_chk('18', '後片付けで auth.users と profiles の両方から消える', 'admin', format(
        $q$SELECT (SELECT count(*) FROM auth.users WHERE id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.profiles WHERE id = %L)::text$q$, uF, uF), '0:0');
    PERFORM pg_temp.vt_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.memberships WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.member_profiles WHERE user_id = ANY (%L::uuid[])))::text$q$,
        v_users, g1, g2, v_users, v_users), '0');
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
      FROM pg_temp.verify_tenancy_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_tenancy_results
  ) r
 ORDER BY seq;
