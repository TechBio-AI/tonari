-- =============================================================================
-- 会員エリアの機能（行事・出欠・リンク・会の設定・投稿の分類とピン留め・公開用の表）の確認台本
--   （supabase/migrations/20261013_community_features.sql）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261013_community_features.sql まで当てる
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_dashboard.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 ve_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は ve_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--   台本は 1 つのトランザクションで流れるので now() は最初から最後まで同じ。時刻の前後は比べない。
--
-- 登場人物（user_id は固定。メールは @verify-events.invalid）:
--   M  会1 の世話人
--   P  会1 の会員（世話人でない）
--   Q  会1 の会員（途中で退会する）
--   N  どの会の会員でもない（プロフィールはある）
--   X  会2 の世話人
--   anon  未ログイン
--
-- 項目:
--   0 前提                         1 世話人が書ける（準備を兼ねる）
--   2 会をまたいで見えない          3 会員でない人
--   4 世話人でない人の INSERT 不可   5 本人以外の参加表明の読み書き不可
--   6 世話人の出欠一覧に user_id が無い
--   7 論理削除                     8 pinned の直接 update 不可・分類
--   9 url は http(s) だけ           10 文字数の上限
--   11 関数の属性                  12 anon の不可
--   13 公開まわり（public_group_items）
--   14 書き出し（行事・リンク・設定が入り、参加表明・created_by が入らない）
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー（表・列・関数の権限が無い、または RLS の with check に触れた）
--   ERROR 23514% … CHECK 制約に触れた
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_events_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_events_results RESTART IDENTITY;

CREATE OR REPLACE FUNCTION pg_temp.ve_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_who
        WHEN 'M' THEN '00000000-0000-4000-8000-000000ef0001'::UUID
        WHEN 'P' THEN '00000000-0000-4000-8000-000000ef0002'::UUID
        WHEN 'Q' THEN '00000000-0000-4000-8000-000000ef0003'::UUID
        WHEN 'N' THEN '00000000-0000-4000-8000-000000ef0004'::UUID
        WHEN 'X' THEN '00000000-0000-4000-8000-000000ef0005'::UUID
    END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.ve_ids()
RETURNS UUID[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY(SELECT pg_temp.ve_uid(w) FROM unnest(ARRAY['M', 'P', 'Q', 'N', 'X']) AS w);
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: 登場人物（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
CREATE OR REPLACE FUNCTION pg_temp.ve_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.ve_uid(p_who), 'role', 'authenticated')::TEXT, true);
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

CREATE OR REPLACE FUNCTION pg_temp.ve_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_events_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 600),
            CASE WHEN coalesce(p_ok, false) THEN 'OK' ELSE 'NG' END);
$$;

CREATE OR REPLACE FUNCTION pg_temp.ve_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.ve_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.ve_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;

-- 行事を 1 件入れる SQL（RETURNING id）。値は %L で埋める。NULL は NULL のまま入る
CREATE OR REPLACE FUNCTION pg_temp.ve_event(
    p_group UUID, p_title TEXT, p_public BOOLEAN DEFAULT false, p_starts TEXT DEFAULT '2099-01-10 10:00+09',
    p_ends TEXT DEFAULT NULL, p_place TEXT DEFAULT 'VE会場', p_url TEXT DEFAULT NULL, p_body TEXT DEFAULT 'VE行事の本文')
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format(
        $q$INSERT INTO public.group_events (group_id, title, body, starts_at, ends_at, place, online_url, is_public)
           VALUES (%L, %L, %L, %L, %L, %L, %L, %L) RETURNING id::text$q$,
        p_group, p_title, p_body, p_starts, p_ends, p_place, p_url, p_public);
$$;


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids    UUID[] := pg_temp.ve_ids();
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-events.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regclass('public.group_events') IS NULL OR to_regclass('public.public_group_items') IS NULL THEN
        RAISE EXCEPTION 'group_events / public_group_items がありません。先に 20261013_community_features.sql を当ててください';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_users UUID[] := pg_temp.ve_ids();
    uM UUID := pg_temp.ve_uid('M');
    uP UUID := pg_temp.ve_uid('P');
    uQ UUID := pg_temp.ve_uid('Q');
    g1 UUID := '00000000-0000-4000-8000-000000eff001';
    g2 UUID := '00000000-0000-4000-8000-000000eff002';
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    ERR_CHECK CONSTANT TEXT := 'ERROR 23514%';
    DONE      CONSTANT TEXT := 'done';
    w   TEXT;
    v   TEXT;
    e1 TEXT; e_pub TEXT; e_past TEXT; e3 TEXT; e2 TEXT;
    l1 TEXT; l2 TEXT;
    a1 TEXT; t1 TEXT; t2 TEXT;
    v_pub_at TEXT;
    FUNCS CONSTANT TEXT[] := ARRAY[
        'public.delete_group_event(uuid)', 'public.list_event_attendance(uuid)', 'public.delete_group_link(uuid)',
        'public.pin_group_post(uuid,boolean)', 'public.export_group(uuid)'];
    TRIGGER_FUNCS CONSTANT TEXT[] := ARRAY['public.sync_public_group_item()', 'public.stamp_group_settings()'];
    MEMBER_TABLES CONSTANT TEXT[] := ARRAY['group_events', 'event_attendance', 'group_links', 'group_settings', 'group_posts'];
BEGIN
    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 5 人・会 2 つ・プロフィール・所属を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);          -- プロフィール・所属・参加表明は CASCADE で消える
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);   -- 行事・リンク・設定・投稿も CASCADE。写しはトリガーで消える
    DELETE FROM public.public_group_items WHERE group_slug IN ('verify-events-1', 'verify-events-2');

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT pg_temp.ve_uid(x.w), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           've-' || lower(x.w) || '@verify-events.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(ARRAY['M', 'P', 'Q', 'N', 'X']) AS x(w);

    INSERT INTO public.patient_groups (id, slug, name) VALUES
        (g1, 'verify-events-1', 'VE 確認用の会1'),
        (g2, 'verify-events-2', 'VE 確認用の会2');

    FOREACH w IN ARRAY ARRAY['M', 'P', 'Q', 'N', 'X'] LOOP
        PERFORM pg_temp.ve_chk('準備', 'プロフィールを本人として作る', w, format(
            $q$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
               VALUES (auth.uid(), %L, %L, '40代', '答えない', '東京都') RETURNING user_id::text$q$,
            'VE本名' || w, 'VE表示' || w), pg_temp.ve_uid(w)::TEXT);
    END LOOP;

    INSERT INTO public.memberships (user_id, group_id, role) VALUES
        (uM, g1, 'moderator'), (uP, g1, 'member'), (uQ, g1, 'member'),
        (pg_temp.ve_uid('X'), g2, 'moderator');

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.ve_chk('0', 'auth.uid() が切り替えた人になる', 'M', 'SELECT auth.uid()::text', uM::TEXT);
    PERFORM pg_temp.ve_chk('0', '5 表すべてで RLS が有効', 'admin',
        $q$SELECT bool_and(relrowsecurity)::text FROM pg_class
            WHERE oid = ANY (ARRAY['public.group_events', 'public.event_attendance', 'public.group_links',
                                   'public.group_settings', 'public.public_group_items']::regclass[])$q$, 'true');

    -- =========================================================================
    -- 1. 世話人が書ける（準備を兼ねる）
    -- =========================================================================
    e1 := pg_temp.ve_chk('1', '世話人が非公開の行事を作る', 'M', pg_temp.ve_event(g1, 'VE行事1'), UUID_LIKE, 'id');
    e_pub := pg_temp.ve_chk('1', '世話人が公開の行事を作る', 'M',
        pg_temp.ve_event(g1, 'VE公開行事', true, '2099-02-01 13:00+09', '2099-02-01 15:00+09', 'VE公開会場', 'https://example.com/ve'),
        UUID_LIKE, 'id');
    e_past := pg_temp.ve_chk('1', '世話人が終わった公開の行事を作る', 'M',
        pg_temp.ve_event(g1, 'VE終わった行事', true, '2000-01-01 10:00+09'), UUID_LIKE, 'id');
    e3 := pg_temp.ve_chk('1', '世話人が公開の行事をもう 1 つ作る（あとで非公開にする）', 'M',
        pg_temp.ve_event(g1, 'VE行事3', true), UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('1', '作った人は本人（created_by = M）', 'admin', format(
        $q$SELECT (created_by = %L)::text FROM public.group_events WHERE id = %L$q$, uM, e1), 'true');
    PERFORM pg_temp.ve_chk('1', '他人名義（created_by = P）の行事は作れない', 'M', format(
        $q$INSERT INTO public.group_events (group_id, title, body, starts_at, created_by) VALUES (%L, 't', 'b', now(), %L) RETURNING id::text$q$,
        g1, uP), ERR_PERM);
    PERFORM pg_temp.ve_chk('1', '世話人が行事を直す', 'M', format(
        $q$WITH u AS (UPDATE public.group_events SET place = 'VE会場改' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, e1), '1');
    l1 := pg_temp.ve_chk('1', '世話人がリンクを作る', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url, note) VALUES (%L, 'VEリンク', 'https://example.com/link', 'VEメモ') RETURNING id::text$q$,
        g1), UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('1', '世話人がリンクを直す', 'M', format(
        $q$WITH u AS (UPDATE public.group_links SET note = 'VEメモ改' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, l1), '1');
    PERFORM pg_temp.ve_chk('1', '世話人が会の設定を作る', 'M', format(
        $q$INSERT INTO public.group_settings (group_id, welcome_text, rules_text) VALUES (%L, 'VEようこそ', 'VE決まり') RETURNING 'ok'$q$, g1), 'ok');
    PERFORM pg_temp.ve_chk('1', '世話人が会の設定を直す（upsert）', 'M', format(
        $q$INSERT INTO public.group_settings (group_id, welcome_text) VALUES (%L, 'VEようこそ改')
           ON CONFLICT (group_id) DO UPDATE SET welcome_text = EXCLUDED.welcome_text RETURNING welcome_text$q$, g1), 'VEようこそ改');
    PERFORM pg_temp.ve_chk('1', '設定の updated_by はトリガーが M にする', 'admin', format(
        $q$SELECT (updated_by = %L)::text FROM public.group_settings WHERE group_id = %L$q$, uM, g1), 'true');
    PERFORM pg_temp.ve_chk('1', 'updated_by を自分で入れることはできない（列の権限）', 'M', format(
        $q$UPDATE public.group_settings SET updated_by = %L WHERE group_id = %L$q$, uP, g1), ERR_PERM);
    e2 := pg_temp.ve_chk('1', '会2 の世話人 X が会2 の行事を作る', 'X', pg_temp.ve_event(g2, 'VE会2の行事'), UUID_LIKE, 'id');
    l2 := pg_temp.ve_chk('1', '会2 の世話人 X が会2 のリンクを作る', 'X', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 'VE会2リンク', 'https://example.com/2') RETURNING id::text$q$, g2),
        UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('1', '会2 の世話人 X が会2 の設定を作る', 'X', format(
        $q$INSERT INTO public.group_settings (group_id, welcome_text) VALUES (%L, 'VE会2ようこそ') RETURNING 'ok'$q$, g2), 'ok');
    PERFORM pg_temp.ve_chk('1', '会員 P は会1 の行事 4 件・リンク 1 件・設定 1 件を読める', 'P', format(
        $q$SELECT (SELECT count(*) FROM public.group_events WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_links WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_settings WHERE group_id = %L)::text$q$, g1, g1, g1), '4:1:1');

    -- =========================================================================
    -- 2. 会をまたいで見えない（会1 の世話人 M から会2 を見る）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('2', '会2 の行事・リンク・設定は 0 行', 'M', format(
        $q$SELECT (SELECT count(*) FROM public.group_events WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_links WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_settings WHERE group_id = %L)::text$q$, g2, g2, g2), '0:0:0');
    PERFORM pg_temp.ve_chk('2', '会2 の行事を作る', 'M', pg_temp.ve_event(g2, 't'), ERR_PERM);
    PERFORM pg_temp.ve_chk('2', '会2 のリンクを作る', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 't', 'https://example.com') RETURNING id::text$q$, g2), ERR_PERM);
    PERFORM pg_temp.ve_chk('2', '会2 の設定を直す', 'M', format(
        $q$WITH u AS (UPDATE public.group_settings SET welcome_text = 'x' WHERE group_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, g2), '0');
    PERFORM pg_temp.ve_chk('2', '会2 の行事に参加表明', 'M', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'yes') RETURNING 'ok'$q$, e2), ERR_PERM);
    PERFORM pg_temp.ve_chk('2', '会2 の行事の出欠一覧', 'M', format(
        $q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, e2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('2', '会2 の行事を消す', 'M', format(
        $q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('2', '会2 のリンクを消す', 'M', format(
        $q$SELECT 'done' FROM public.delete_group_link(%L)$q$, l2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('2', '会2 の世話人 X から会1 の行事・リンク・設定は 0 行', 'X', format(
        $q$SELECT (SELECT count(*) FROM public.group_events WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_links WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_settings WHERE group_id = %L)::text$q$, g1, g1, g1), '0:0:0');

    -- =========================================================================
    -- 3. 会員でない人（N）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('3', '会1 の行事・リンク・設定は 0 行', 'N', format(
        $q$SELECT (SELECT count(*) FROM public.group_events WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_links WHERE group_id = %L)::text || ':' ||
                  (SELECT count(*) FROM public.group_settings WHERE group_id = %L)::text$q$, g1, g1, g1), '0:0:0');
    PERFORM pg_temp.ve_chk('3', '会1 の行事に参加表明', 'N', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'yes') RETURNING 'ok'$q$, e1), ERR_PERM);
    PERFORM pg_temp.ve_chk('3', '会1 の行事の出欠一覧', 'N', format(
        $q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, e1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('3', '会1 の行事を作る', 'N', pg_temp.ve_event(g1, 't'), ERR_PERM);

    -- =========================================================================
    -- 4. 世話人でない人（会1 の会員 P）は書けない
    -- =========================================================================
    PERFORM pg_temp.ve_chk('4', '行事を作る', 'P', pg_temp.ve_event(g1, 't'), ERR_PERM);
    PERFORM pg_temp.ve_chk('4', 'リンクを作る', 'P', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 't', 'https://example.com') RETURNING id::text$q$, g1), ERR_PERM);
    PERFORM pg_temp.ve_chk('4', '会の設定を作る・直す（upsert）', 'P', format(
        $q$INSERT INTO public.group_settings (group_id, welcome_text) VALUES (%L, 'x')
           ON CONFLICT (group_id) DO UPDATE SET welcome_text = EXCLUDED.welcome_text RETURNING 'ok'$q$, g1), ERR_PERM);
    PERFORM pg_temp.ve_chk('4', '行事を直す（0 行）', 'P', format(
        $q$WITH u AS (UPDATE public.group_events SET title = 'x' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, e1), '0');
    PERFORM pg_temp.ve_chk('4', 'リンクを直す（0 行）', 'P', format(
        $q$WITH u AS (UPDATE public.group_links SET title = 'x' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, l1), '0');
    PERFORM pg_temp.ve_chk('4', '会の設定を直す（0 行）', 'P', format(
        $q$WITH u AS (UPDATE public.group_settings SET welcome_text = 'x' WHERE group_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, g1), '0');
    PERFORM pg_temp.ve_chk('4', '行事を消す（関数）', 'P', format($q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('4', 'リンクを消す（関数）', 'P', format($q$SELECT 'done' FROM public.delete_group_link(%L)$q$, l1), 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 5. 参加表明（本人の行だけ）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('5', 'P が自分の参加表明（yes）', 'P', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'yes') RETURNING 'ok'$q$, e1), 'ok');
    PERFORM pg_temp.ve_chk('5', 'P が自分の参加表明を変える（upsert で maybe）', 'P', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'maybe')
           ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status RETURNING status$q$, e1), 'maybe');
    PERFORM pg_temp.ve_chk('5', 'Q が自分の参加表明（no）', 'Q', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'no') RETURNING 'ok'$q$, e1), 'ok');
    PERFORM pg_temp.ve_chk('5', 'P が Q の名義で参加表明', 'P', format(
        $q$INSERT INTO public.event_attendance (event_id, user_id, status) VALUES (%L, %L, 'yes') RETURNING 'ok'$q$, e_pub, uQ), ERR_PERM);
    PERFORM pg_temp.ve_chk('5', 'P は Q の参加表明を読めない', 'P', format(
        $q$SELECT count(*)::text FROM public.event_attendance WHERE event_id = %L AND user_id <> auth.uid()$q$, e1), '0');
    PERFORM pg_temp.ve_chk('5', 'P は Q の参加表明を書き換えられない（0 行）', 'P', format(
        $q$WITH u AS (UPDATE public.event_attendance SET status = 'yes' WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, uQ), '0');
    PERFORM pg_temp.ve_chk('5', '世話人 M でも表から他人の参加表明は読めない', 'M', format(
        $q$SELECT count(*)::text FROM public.event_attendance WHERE event_id = %L$q$, e1), '0');
    PERFORM pg_temp.ve_chk('5', '状態は yes / maybe / no だけ', 'P', format(
        $q$INSERT INTO public.event_attendance (event_id, status) VALUES (%L, 'attend') RETURNING 'ok'$q$, e_pub), ERR_CHECK);
    PERFORM pg_temp.ve_chk('5', '参加表明の物理 DELETE', 'P', format(
        $q$DELETE FROM public.event_attendance WHERE event_id = %L$q$, e1), ERR_PERM);
    PERFORM pg_temp.ve_chk('5', 'Q の参加表明は M が見ても書き換わっていない', 'admin', format(
        $q$SELECT status FROM public.event_attendance WHERE event_id = %L AND user_id = %L$q$, e1, uQ), 'no');

    -- =========================================================================
    -- 6. 世話人の出欠一覧（表示名と状態だけ。user_id は無い）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('6', '出欠一覧（yes → maybe → no の順）', 'M', format(
        $q$SELECT string_agg(coalesce(r.display_name, '(名前なし)') || ':' || r.status, ' ' ORDER BY r.ord)
             FROM public.list_event_attendance(%L) WITH ORDINALITY AS r(display_name, status, ord)$q$, e1),
        'VE表示P:maybe VE表示Q:no');
    PERFORM pg_temp.ve_chk('6', '列は display_name・status だけ', 'M', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.list_event_attendance(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, e1),
        'display_name,status');
    PERFORM pg_temp.ve_chk('6', '一覧に user_id・本名が含まれない', 'M', format(
        $q$SELECT (t LIKE %L OR t LIKE %L OR t LIKE '%%VE本名%%')::text
             FROM (SELECT jsonb_agg(to_jsonb(r))::text AS t FROM public.list_event_attendance(%L) r) x$q$,
        '%' || uP || '%', '%' || uQ || '%', e1), 'false');
    PERFORM pg_temp.ve_chk('6', '世話人でない P は出欠一覧を取れない', 'P', format(
        $q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, e1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('6', 'Q が会1 を退会', 'Q', format($q$SELECT 'done' FROM public.leave_group(%L)$q$, g1), DONE);
    PERFORM pg_temp.ve_chk('6', '退会した Q の分は出欠一覧に出ない', 'M', format(
        $q$SELECT string_agg(r.display_name || ':' || r.status, ' ') FROM public.list_event_attendance(%L) r$q$, e1), 'VE表示P:maybe');
    PERFORM pg_temp.ve_chk('6', '退会した Q は自分の参加表明も読めない', 'Q', format(
        $q$SELECT count(*)::text FROM public.event_attendance WHERE event_id = %L$q$, e1), '0');

    -- =========================================================================
    -- 7. 論理削除
    -- =========================================================================
    PERFORM pg_temp.ve_chk('7', '行事の物理 DELETE（世話人でも）', 'M', format($q$DELETE FROM public.group_events WHERE id = %L$q$, e1), ERR_PERM);
    PERFORM pg_temp.ve_chk('7', 'deleted_at を直接 update（世話人でも）', 'M', format(
        $q$UPDATE public.group_events SET deleted_at = now() WHERE id = %L$q$, e1), ERR_PERM);
    PERFORM pg_temp.ve_chk('7', '世話人が行事を消す（関数）', 'M', format($q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e1), DONE);
    PERFORM pg_temp.ve_chk('7', '行は残り deleted_at が立つ', 'admin', format(
        $q$SELECT (deleted_at IS NOT NULL)::text FROM public.group_events WHERE id = %L$q$, e1), 'true');
    PERFORM pg_temp.ve_chk('7', '消した行事は会員から見えない', 'P', format(
        $q$SELECT count(*)::text FROM public.group_events WHERE id = %L$q$, e1), '0');
    PERFORM pg_temp.ve_chk('7', '消した行事の自分の参加表明も見えない・変えられない', 'P', format(
        $q$WITH u AS (UPDATE public.event_attendance SET status = 'yes' WHERE event_id = %L RETURNING 1)
           SELECT (SELECT count(*) FROM u)::text || ':' || (SELECT count(*) FROM public.event_attendance WHERE event_id = %L)::text$q$, e1, e1), '0:0');
    PERFORM pg_temp.ve_chk('7', '消した行事の出欠一覧は取れない', 'M', format(
        $q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, e1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('7', '消した行事をもう一度消す', 'M', format($q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('7', 'リンクの物理 DELETE（世話人でも）', 'M', format($q$DELETE FROM public.group_links WHERE id = %L$q$, l1), ERR_PERM);
    PERFORM pg_temp.ve_chk('7', '世話人がリンクを消す（関数）', 'M', format($q$SELECT 'done' FROM public.delete_group_link(%L)$q$, l1), DONE);
    PERFORM pg_temp.ve_chk('7', '消したリンクは会員から見えない・行は残る', 'P', format(
        $q$SELECT count(*)::text FROM public.group_links WHERE id = %L$q$, l1), '0');
    PERFORM pg_temp.ve_chk('7', '消したリンクの行は残っている', 'admin', format(
        $q$SELECT (deleted_at IS NOT NULL)::text FROM public.group_links WHERE id = %L$q$, l1), 'true');
    PERFORM pg_temp.ve_chk('7', '会の設定の物理 DELETE（世話人でも）', 'M', format($q$DELETE FROM public.group_settings WHERE group_id = %L$q$, g1), ERR_PERM);

    -- =========================================================================
    -- 8. pinned は関数でだけ変わる・分類は投稿者が変えられる
    -- =========================================================================
    a1 := pg_temp.ve_chk('8', '世話人が非公開のお知らせを書く', 'M', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'announcement', 'VEお知らせ', 'VEお知らせ本文') RETURNING id::text$q$, g1),
        UUID_LIKE, 'id');
    t1 := pg_temp.ve_chk('8', '会員がスレッドを書く（分類 family）', 'P', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body, category) VALUES (%L, 'thread', 'VEスレッド', 'VE本文', 'family') RETURNING id::text$q$, g1),
        UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('8', '分類の既定は other', 'admin', format(
        $q$SELECT category FROM public.group_posts WHERE id = %L$q$, a1), 'other');
    PERFORM pg_temp.ve_chk('8', '世話人でも pinned を直接 update できない', 'M', format(
        $q$UPDATE public.group_posts SET pinned = true WHERE id = %L$q$, a1), ERR_PERM);
    PERFORM pg_temp.ve_chk('8', '投稿者でも pinned を直接 update できない', 'P', format(
        $q$UPDATE public.group_posts SET pinned = true WHERE id = %L$q$, t1), ERR_PERM);
    PERFORM pg_temp.ve_chk('8', 'pinned を付けて投稿できない', 'M', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body, pinned) VALUES (%L, 'announcement', 't', 'b', true) RETURNING id::text$q$, g1), ERR_PERM);
    PERFORM pg_temp.ve_chk('8', '世話人がピン留め（関数）', 'M', format($q$SELECT 'done' FROM public.pin_group_post(%L, true)$q$, t1), DONE);
    PERFORM pg_temp.ve_chk('8', 'ピン留めが立つ', 'admin', format($q$SELECT pinned::text FROM public.group_posts WHERE id = %L$q$, t1), 'true');
    PERFORM pg_temp.ve_chk('8', '世話人でない P はピン留めできない', 'P', format($q$SELECT 'done' FROM public.pin_group_post(%L, false)$q$, t1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('8', '他の会の世話人 X はピン留めできない', 'X', format($q$SELECT 'done' FROM public.pin_group_post(%L, false)$q$, t1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.ve_chk('8', 'ピン留めに NULL', 'M', format($q$SELECT 'done' FROM public.pin_group_post(%L, NULL)$q$, t1), 'ERROR P0001 invalid_input');
    PERFORM pg_temp.ve_chk('8', '世話人がピン留めを外す（関数）', 'M', format($q$SELECT 'done' FROM public.pin_group_post(%L, false)$q$, t1), DONE);
    PERFORM pg_temp.ve_chk('8', '投稿者が自分の投稿の分類を変える', 'P', format(
        $q$WITH u AS (UPDATE public.group_posts SET category = 'treatment' WHERE id = %L RETURNING category) SELECT category FROM u$q$, t1), 'treatment');
    PERFORM pg_temp.ve_chk('8', '他人の投稿の分類は変えられない（0 行）', 'P', format(
        $q$WITH u AS (UPDATE public.group_posts SET category = 'daily' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, a1), '0');
    PERFORM pg_temp.ve_chk('8', '分類は 5 つのうちだけ', 'P', format(
        $q$UPDATE public.group_posts SET category = 'news' WHERE id = %L$q$, t1), ERR_CHECK);

    -- =========================================================================
    -- 9. url は http(s) だけ
    -- =========================================================================
    PERFORM pg_temp.ve_chk('9', '行事の online_url に javascript:', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, NULL, 'javascript:alert(1)'), ERR_CHECK);
    PERFORM pg_temp.ve_chk('9', '行事の online_url に ftp://', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, NULL, 'ftp://example.com/x'), ERR_CHECK);
    PERFORM pg_temp.ve_chk('9', '行事の online_url に空白を含む', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, NULL, 'https://example.com/a b'), ERR_CHECK);
    PERFORM pg_temp.ve_chk('9', '行事の online_url に http://（可）', 'M',
        pg_temp.ve_event(g1, 'VE http の行事', false, '2099-01-10 10:00+09', NULL, NULL, 'http://example.com/ok'), UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('9', 'リンクの url に javascript:', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 't', 'javascript:alert(1)') RETURNING id::text$q$, g1), ERR_CHECK);
    PERFORM pg_temp.ve_chk('9', 'リンクの url に data:', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 't', 'data:text/html,x') RETURNING id::text$q$, g1), ERR_CHECK);
    PERFORM pg_temp.ve_chk('9', 'リンクの url に HTTPS://（大文字でも可）', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 'VE大文字', 'HTTPS://example.com/') RETURNING id::text$q$, g1), UUID_LIKE, 'id');

    -- =========================================================================
    -- 10. 文字数の上限（と、終わりは始まり以降）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('10', '行事の題 100 文字（可）', 'M', pg_temp.ve_event(g1, repeat('あ', 100)), UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('10', '行事の題 101 文字', 'M', pg_temp.ve_event(g1, repeat('あ', 101)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '行事の本文 4001 文字', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, 'VE会場', NULL, repeat('あ', 4001)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '行事の場所 201 文字', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, repeat('あ', 201)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '行事の online_url 501 文字', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', NULL, NULL, 'https://example.com/' || repeat('a', 481)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '行事の終わりが始まりより前（Claude Code の判断で足した制約）', 'M',
        pg_temp.ve_event(g1, 't', false, '2099-01-10 10:00+09', '2099-01-10 09:00+09'), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', 'リンクの題 101 文字', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, %L, 'https://example.com') RETURNING id::text$q$, g1, repeat('あ', 101)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', 'リンクの url 501 文字', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url) VALUES (%L, 't', %L) RETURNING id::text$q$, g1, 'https://example.com/' || repeat('a', 481)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', 'リンクのメモ 501 文字', 'M', format(
        $q$INSERT INTO public.group_links (group_id, title, url, note) VALUES (%L, 't', 'https://example.com', %L) RETURNING id::text$q$, g1, repeat('あ', 501)), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '設定のあいさつ 2001 文字', 'M', format(
        $q$UPDATE public.group_settings SET welcome_text = %L WHERE group_id = %L$q$, repeat('あ', 2001), g1), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '設定の決まり 4001 文字', 'M', format(
        $q$UPDATE public.group_settings SET rules_text = %L WHERE group_id = %L$q$, repeat('あ', 4001), g1), ERR_CHECK);
    PERFORM pg_temp.ve_chk('10', '設定のあいさつ 2000 文字（可）', 'M', format(
        $q$WITH u AS (UPDATE public.group_settings SET welcome_text = %L WHERE group_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, repeat('あ', 2000), g1), '1');

    -- =========================================================================
    -- 11. 関数の属性
    -- =========================================================================
    FOREACH w IN ARRAY FUNCS || TRIGGER_FUNCS LOOP
        PERFORM pg_temp.ve_chk('11', w || ': SECURITY DEFINER・search_path 空固定', 'admin', format(
            $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                     WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
                 FROM (SELECT to_regprocedure(%L) AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, w), 'true');
    END LOOP;
    FOREACH w IN ARRAY FUNCS LOOP
        PERFORM pg_temp.ve_chk('11', w || ': anon と PUBLIC に EXECUTE が無い・authenticated にはある', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
                       AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    FOREACH w IN ARRAY TRIGGER_FUNCS LOOP
        PERFORM pg_temp.ve_chk('11', w || '（トリガー関数）: anon・authenticated・PUBLIC に EXECUTE が無い', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    PERFORM pg_temp.ve_chk('11', 'どの API ロールも会員エリアの 4 表を DELETE できない', 'admin',
        $q$SELECT (NOT has_table_privilege('authenticated', 'public.group_events', 'DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.event_attendance', 'DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.group_links', 'DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.group_settings', 'DELETE'))::text$q$, 'true');

    -- =========================================================================
    -- 12. anon は何もできない（公開用の表を読むこと以外）
    -- =========================================================================
    FOREACH w IN ARRAY MEMBER_TABLES LOOP
        PERFORM pg_temp.ve_chk('12', w || ' を読む', 'anon', format('SELECT count(*)::text FROM public.%I', w), ERR_PERM);
    END LOOP;
    PERFORM pg_temp.ve_chk('12', 'delete_group_event を呼ぶ', 'anon', format($q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e_pub), ERR_PERM);
    PERFORM pg_temp.ve_chk('12', 'list_event_attendance を呼ぶ', 'anon', format($q$SELECT count(*)::text FROM public.list_event_attendance(%L)$q$, e_pub), ERR_PERM);
    PERFORM pg_temp.ve_chk('12', 'delete_group_link を呼ぶ', 'anon', format($q$SELECT 'done' FROM public.delete_group_link(%L)$q$, l2), ERR_PERM);
    PERFORM pg_temp.ve_chk('12', 'pin_group_post を呼ぶ', 'anon', format($q$SELECT 'done' FROM public.pin_group_post(%L, true)$q$, t1), ERR_PERM);
    PERFORM pg_temp.ve_chk('12', 'export_group を呼ぶ', 'anon', format($q$SELECT public.export_group(%L)::text$q$, g1), ERR_PERM);

    -- =========================================================================
    -- 13. 公開まわり（public_group_items）
    -- =========================================================================
    PERFORM pg_temp.ve_chk('13', 'anon が公開用の表を読める（会1 の公開の行事 3 件）', 'anon',
        $q$SELECT count(*)::text FROM public.public_group_items WHERE group_slug = 'verify-events-1'$q$, '3');
    PERFORM pg_temp.ve_chk('13', '会員 P も公開用の表を読める', 'P',
        $q$SELECT count(*)::text FROM public.public_group_items WHERE group_slug = 'verify-events-1'$q$, '3');
    PERFORM pg_temp.ve_chk('13', '写した行事の中身（slug・題・日時・場所・URL）', 'anon', format(
        $q$SELECT group_slug || '|' || title || '|' || (starts_at = '2099-02-01 13:00+09')::text || '|' || (ends_at = '2099-02-01 15:00+09')::text
                  || '|' || place || '|' || online_url
             FROM public.public_group_items WHERE kind = 'event' AND source_id = %L$q$, e_pub),
        'verify-events-1|VE公開行事|true|true|VE公開会場|https://example.com/ve');
    PERFORM pg_temp.ve_chk('13', '終わった公開の行事も写しは残る（画面側で出さない）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE kind = 'event' AND source_id = %L$q$, e_past), '1');
    PERFORM pg_temp.ve_chk('13', '非公開の行事は写らない', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id IN (%L, %L)$q$, e1, e2), '0');
    PERFORM pg_temp.ve_chk('13', '非公開のお知らせ・スレッドは写らない', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id IN (%L, %L)$q$, a1, t1), '0');
    PERFORM pg_temp.ve_chk('13', '世話人がお知らせを公開にする', 'M', format(
        $q$WITH u AS (UPDATE public.group_posts SET is_public = true WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, a1), '1');
    v_pub_at := pg_temp.ve_chk('13', '公開にしたお知らせが写る（published_at が立つ）', 'anon', format(
        $q$SELECT published_at::text FROM public.public_group_items WHERE kind = 'notice' AND source_id = %L$q$, a1), '2%', '時刻');
    PERFORM pg_temp.ve_chk('13', 'お知らせの写しは行事の列を持たない', 'anon', format(
        $q$SELECT (starts_at IS NULL AND ends_at IS NULL AND place IS NULL AND online_url IS NULL)::text
             FROM public.public_group_items WHERE kind = 'notice' AND source_id = %L$q$, a1), 'true');
    PERFORM pg_temp.ve_chk('13', '世話人がお知らせの本文を直す', 'M', format(
        $q$WITH u AS (UPDATE public.group_posts SET body = 'VEお知らせ本文改' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, a1), '1');
    PERFORM pg_temp.ve_chk('13', '本文の修正が写しに反映される・published_at は変わらない', 'anon', format(
        $q$SELECT body || '|' || (published_at::text = %L)::text FROM public.public_group_items WHERE kind = 'notice' AND source_id = %L$q$, v_pub_at, a1),
        'VEお知らせ本文改|true');
    PERFORM pg_temp.ve_chk('13', '世話人が行事の場所を直す', 'M', format(
        $q$WITH u AS (UPDATE public.group_events SET place = 'VE公開会場改' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, e_pub), '1');
    PERFORM pg_temp.ve_chk('13', '行事の修正が写しに反映される', 'anon', format(
        $q$SELECT place FROM public.public_group_items WHERE kind = 'event' AND source_id = %L$q$, e_pub), 'VE公開会場改');
    PERFORM pg_temp.ve_chk('13', 'お知らせを非公開に戻す', 'M', format(
        $q$WITH u AS (UPDATE public.group_posts SET is_public = false WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, a1), '1');
    PERFORM pg_temp.ve_chk('13', '公開 → 非公開で写しが消える（お知らせ）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id = %L$q$, a1), '0');
    PERFORM pg_temp.ve_chk('13', '行事を非公開に戻す', 'M', format(
        $q$WITH u AS (UPDATE public.group_events SET is_public = false WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, e3), '1');
    PERFORM pg_temp.ve_chk('13', '公開 → 非公開で写しが消える（行事）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id = %L$q$, e3), '0');
    PERFORM pg_temp.ve_chk('13', 'お知らせをもう一度公開にする', 'M', format(
        $q$WITH u AS (UPDATE public.group_posts SET is_public = true WHERE id = %L RETURNING 1)
           SELECT (SELECT count(*) FROM u)::text$q$, a1), '1');
    PERFORM pg_temp.ve_chk('13', '（もう一度写っている）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id = %L$q$, a1), '1');
    PERFORM pg_temp.ve_chk('13', '世話人がお知らせを消す（関数）', 'M', format($q$SELECT 'done' FROM public.delete_group_post(%L)$q$, a1), DONE);
    PERFORM pg_temp.ve_chk('13', '削除で写しが消える（お知らせ）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id = %L$q$, a1), '0');
    PERFORM pg_temp.ve_chk('13', '世話人が公開の行事を消す（関数）', 'M', format($q$SELECT 'done' FROM public.delete_group_event(%L)$q$, e_pub), DONE);
    PERFORM pg_temp.ve_chk('13', '削除で写しが消える（行事）', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id = %L$q$, e_pub), '0');
    t2 := pg_temp.ve_chk('13', '世話人がスレッドを書く', 'M', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body) VALUES (%L, 'thread', 'VE世話人のスレッド', 'b') RETURNING id::text$q$, g1),
        UUID_LIKE, 'id');
    PERFORM pg_temp.ve_chk('13', 'スレッドは公開にできない（世話人が update。CHECK）', 'M', format(
        $q$UPDATE public.group_posts SET is_public = true WHERE id = %L$q$, t2), ERR_CHECK);
    PERFORM pg_temp.ve_chk('13', 'スレッドは公開にできない（公開で insert。CHECK）', 'M', format(
        $q$INSERT INTO public.group_posts (group_id, kind, title, body, is_public) VALUES (%L, 'thread', 't', 'b', true) RETURNING id::text$q$, g1), ERR_CHECK);
    PERFORM pg_temp.ve_chk('13', 'スレッドは公開にできない（台本の役割で直接 update しても CHECK）', 'admin', format(
        $q$UPDATE public.group_posts SET is_public = true WHERE id = %L$q$, t2), ERR_CHECK);
    PERFORM pg_temp.ve_chk('13', '会員 P は自分のスレッドを公開にできない', 'P', format(
        $q$UPDATE public.group_posts SET is_public = true WHERE id = %L$q$, t1), 'ERROR %');
    PERFORM pg_temp.ve_chk('13', 'スレッドは写っていない', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_group_items WHERE source_id IN (%L, %L)$q$, t1, t2), '0');
    PERFORM pg_temp.ve_chk('13', '写した表に user_id 系の列が無い', 'admin',
        $q$SELECT count(*)::text FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'public_group_items'
              AND column_name IN ('user_id', 'created_by', 'author_id', 'updated_by', 'decided_by', 'used_by')$q$, '0');
    PERFORM pg_temp.ve_chk('13', '写した表の列はこの 12 個だけ', 'admin',
        $q$SELECT string_agg(column_name::text, ',' ORDER BY ordinal_position) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'public_group_items'$q$,
        'id,group_slug,kind,source_id,title,body,starts_at,ends_at,place,online_url,published_at,updated_at');
    PERFORM pg_temp.ve_chk('13', 'anon は公開用の表に書けない（insert）', 'anon',
        $q$INSERT INTO public.public_group_items (group_slug, kind, source_id, title, body) VALUES ('x', 'notice', gen_random_uuid(), 't', 'b')$q$, ERR_PERM);
    PERFORM pg_temp.ve_chk('13', '世話人も公開用の表に書けない（update）', 'M',
        $q$UPDATE public.public_group_items SET title = 'x' WHERE group_slug = 'verify-events-1'$q$, ERR_PERM);
    PERFORM pg_temp.ve_chk('13', '世話人も公開用の表の行を消せない（delete）', 'M',
        $q$DELETE FROM public.public_group_items WHERE group_slug = 'verify-events-1'$q$, ERR_PERM);
    PERFORM pg_temp.ve_chk('13', '公開用の表: anon・authenticated は SELECT だけ', 'admin',
        $q$SELECT (has_table_privilege('anon', 'public.public_group_items', 'SELECT')
                   AND has_table_privilege('authenticated', 'public.public_group_items', 'SELECT')
                   AND NOT has_table_privilege('anon', 'public.public_group_items', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.public_group_items', 'INSERT,UPDATE,DELETE'))::text$q$, 'true');

    -- =========================================================================
    -- 14. 書き出し（行事・リンク・設定が入る。参加表明・created_by・updated_by は入らない）
    -- =========================================================================
    v := pg_temp.ve_as('M', format($q$SELECT public.export_group(%L)::text$q$, g1));
    PERFORM pg_temp.ve_rec('14', '[M] 書き出しに events・links・settings が入る', '"events"・"links"・"settings" を含む', left(v, 200),
        v LIKE '%"events"%' AND v LIKE '%"links"%' AND v LIKE '%"settings"%' AND v LIKE '%VE http の行事%' AND v LIKE '%VE大文字%');
    PERFORM pg_temp.ve_rec('14', '[M] 消した行事・リンクは入らない', 'VE行事1・VEリンク・VE公開行事 を含まない',
        CASE WHEN v LIKE '%"VE行事1"%' OR v LIKE '%"VEリンク"%' OR v LIKE '%"VE公開行事"%' THEN '含まれている' ELSE '含まれていない' END,
        v NOT LIKE '%"VE行事1"%' AND v NOT LIKE '%"VEリンク"%' AND v NOT LIKE '%"VE公開行事"%');
    PERFORM pg_temp.ve_rec('14', '[M] created_by・updated_by・参加表明・user_id が入らない', '入らない',
        CASE WHEN v LIKE '%"created_by"%' OR v LIKE '%"updated_by"%' OR v LIKE '%"status"%' OR v LIKE '%maybe%'
                  OR v LIKE '%' || uM || '%' OR v LIKE '%' || uP || '%' THEN '入っている' ELSE '入っていない' END,
        v NOT LIKE '%"created_by"%' AND v NOT LIKE '%"updated_by"%' AND v NOT LIKE '%"status"%' AND v NOT LIKE '%maybe%'
        AND v NOT LIKE '%' || uM || '%' AND v NOT LIKE '%' || uP || '%');
    PERFORM pg_temp.ve_chk('14', '世話人でない P の書き出し', 'P', format($q$SELECT public.export_group(%L)::text$q$, g1), 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 後片付け（テストユーザーと会を消せば、所属・プロフィール・参加表明・行事・リンク・設定・投稿は CASCADE で消え、
    --           写しはトリガーで消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    PERFORM pg_temp.ve_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.group_events WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.event_attendance WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_links WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.group_settings WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.group_posts WHERE group_id IN (%L, %L))
                 + (SELECT count(*) FROM public.member_profiles WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.public_group_items WHERE group_slug IN ('verify-events-1', 'verify-events-2')))::text$q$,
        v_users, g1, g2, g1, g2, v_users, g1, g2, g1, g2, g1, g2, v_users), '0');
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
      FROM pg_temp.verify_events_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_events_results
  ) r
 ORDER BY seq;
