-- =============================================================================
-- 患者会への参加希望（group_wishes・public_wish_counts）の確認台本
--   （supabase/migrations/20261019_group_wishes.sql と 20261020_delete_account_v4.sql）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261020_delete_account_v4.sql まで当てる
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_events.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vw_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vw_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--   台本は 1 つのトランザクションで流れるので now() は最初から最後まで同じ。
--
-- 登場人物（user_id は固定。メールは @verify-wishes.invalid。誰も会員プロフィールを作らない）:
--   W01〜W11  ログインしている人。W01 を「本人」、W02 を「他人」として使う
--   anon      未ログイン
-- 病気は実在しない idx（990001・990002）を使う。
--
-- 項目:
--   0 前提                  1 本人以外は読めない・消せない（本人も消せない）・書ける列
--   2 二重登録は一意制約で止まる
--   3 公開の数（9 人→「10未満」・10 人→「10」・取り消しで減る・0 人も「10未満」・再開）
--   4 anon は group_wishes を読めず、public_wish_counts は読める・公開の表は誰も書けない
--   5 関数の属性と運営向けの内訳     6 アカウント削除・auth.users の削除で消える
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー   ERROR 23514% … CHECK 制約   ERROR 23505% … 一意制約
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_wishes_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_wishes_results RESTART IDENTITY;

-- W01〜W11 → ...000000fa00NN
CREATE OR REPLACE FUNCTION pg_temp.vw_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE WHEN p_who ~ '^W[0-9]{2}$'
                THEN ('00000000-0000-4000-8000-000000fa00' || substr(p_who, 2, 2))::UUID END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.vw_people()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY(SELECT 'W' || lpad(i::TEXT, 2, '0') FROM generate_series(1, 11) AS i);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vw_ids()
RETURNS UUID[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY(SELECT pg_temp.vw_uid(w) FROM unnest(pg_temp.vw_people()) AS w);
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: W01〜W11（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
CREATE OR REPLACE FUNCTION pg_temp.vw_as(p_who TEXT, p_sql TEXT)
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
                json_build_object('sub', pg_temp.vw_uid(p_who), 'role', 'authenticated')::TEXT, true);
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

CREATE OR REPLACE FUNCTION pg_temp.vw_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_wishes_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 600),
            CASE WHEN coalesce(p_ok, false) THEN 'OK' ELSE 'NG' END);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vw_chk(
    p_no TEXT, p_item TEXT, p_who TEXT, p_sql TEXT, p_like TEXT, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_act TEXT := pg_temp.vw_as(p_who, p_sql);
BEGIN
    PERFORM pg_temp.vw_rec(p_no, '[' || p_who || '] ' || p_item, coalesce(p_label, p_like), v_act, v_act LIKE p_like);
    RETURN v_act;
END;
$$;

-- 希望を 1 件入れる SQL（RETURNING id）
CREATE OR REPLACE FUNCTION pg_temp.vw_wish(p_idx INTEGER, p_pref TEXT, p_rel TEXT, p_member BOOLEAN)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format(
        $q$INSERT INTO public.group_wishes (disease_idx, prefecture, relation, is_group_member)
           VALUES (%s, %L, %L, %L) RETURNING id::text$q$,
        p_idx, p_pref, p_rel, p_member);
$$;

-- 取り消し（withdrawn_at を立てる）・再開（NULL に戻す）の SQL（更新した行数）
CREATE OR REPLACE FUNCTION pg_temp.vw_withdraw(p_idx INTEGER, p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format(
        $q$WITH u AS (UPDATE public.group_wishes SET withdrawn_at = %s WHERE disease_idx = %s AND user_id = auth.uid() RETURNING 1)
           SELECT count(*)::text FROM u$q$,
        p_value, p_idx);
$$;

-- 公開の数（anon で読む）。行が無ければ '(行なし)'
CREATE OR REPLACE FUNCTION pg_temp.vw_count(p_idx INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format($q$SELECT coalesce((SELECT n FROM public.public_wish_counts WHERE disease_idx = %s), '(行なし)')$q$, p_idx);
$$;


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids    UUID[] := pg_temp.vw_ids();
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-wishes.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regclass('public.group_wishes') IS NULL OR to_regclass('public.public_wish_counts') IS NULL THEN
        RAISE EXCEPTION 'group_wishes / public_wish_counts がありません。先に 20261019_group_wishes.sql を当ててください';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_people TEXT[] := pg_temp.vw_people();
    v_users  UUID[] := pg_temp.vw_ids();
    d1 CONSTANT INTEGER := 990001;
    d2 CONSTANT INTEGER := 990002;
    UUID_LIKE CONSTANT TEXT := '________-____-____-____-____________';
    ERR_PERM  CONSTANT TEXT := 'ERROR 42501%';
    ERR_CHECK CONSTANT TEXT := 'ERROR 23514%';
    ERR_UNIQ  CONSTANT TEXT := 'ERROR 23505%';
    FUNCS CONSTANT TEXT[] := ARRAY[
        'public.stamp_group_wish_withdrawal()', 'public.sync_public_wish_count()', 'public.wish_summary(integer)'];
    w TEXT;
    v TEXT;
BEGIN
    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 11 人を作る（会員プロフィールは作らない）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);          -- 参加希望は CASCADE で消える
    DELETE FROM public.public_wish_counts WHERE disease_idx IN (d1, d2);

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT pg_temp.vw_uid(x.w), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vw-' || lower(x.w) || '@verify-wishes.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_people) AS x(w);

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vw_chk('0', 'auth.uid() が切り替えた人になる', 'W01', 'SELECT auth.uid()::text', pg_temp.vw_uid('W01')::TEXT);
    PERFORM pg_temp.vw_chk('0', '2 表とも RLS が有効', 'admin',
        $q$SELECT bool_and(relrowsecurity)::text FROM pg_class
            WHERE oid = ANY (ARRAY['public.group_wishes', 'public.public_wish_counts']::regclass[])$q$, 'true');
    PERFORM pg_temp.vw_chk('0', 'テストの人は会員プロフィールを持たない', 'admin', format(
        $q$SELECT count(*)::text FROM public.member_profiles WHERE user_id = ANY (%L::uuid[])$q$, v_users), '0');

    -- =========================================================================
    -- 1. 本人の行だけ
    -- =========================================================================
    PERFORM pg_temp.vw_chk('1', '会員プロフィールが無くても希望を登録できる', 'W01', pg_temp.vw_wish(d1, '東京都', 'self', true), UUID_LIKE, 'id');
    PERFORM pg_temp.vw_chk('1', '本人は自分の希望を読める', 'W01',
        $q$SELECT count(*)::text FROM public.group_wishes WHERE user_id = auth.uid()$q$, '1');
    PERFORM pg_temp.vw_chk('1', '他人（W02）は W01 の希望を読めない', 'W02', format(
        $q$SELECT count(*)::text FROM public.group_wishes WHERE user_id = %L$q$, pg_temp.vw_uid('W01')), '0');
    PERFORM pg_temp.vw_chk('1', '他人は W01 の希望を取り消せない（0 行）', 'W02', format(
        $q$WITH u AS (UPDATE public.group_wishes SET withdrawn_at = now() WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$,
        pg_temp.vw_uid('W01')), '0');
    PERFORM pg_temp.vw_chk('1', '他人は W01 の希望を消せない', 'W02', format(
        $q$DELETE FROM public.group_wishes WHERE user_id = %L$q$, pg_temp.vw_uid('W01')), ERR_PERM);
    PERFORM pg_temp.vw_chk('1', '本人も物理削除はできない（取り消しは withdrawn_at）', 'W01',
        $q$DELETE FROM public.group_wishes WHERE user_id = auth.uid()$q$, ERR_PERM);
    PERFORM pg_temp.vw_chk('1', '他人（W02）の名義で登録できない', 'W01', format(
        $q$INSERT INTO public.group_wishes (disease_idx, user_id, prefecture, relation) VALUES (%s, %L, '東京都', 'self') RETURNING id::text$q$,
        d2, pg_temp.vw_uid('W02')), ERR_PERM);
    PERFORM pg_temp.vw_chk('1', '取り消し済みで登録できない（withdrawn_at は insert できない）', 'W01', format(
        $q$INSERT INTO public.group_wishes (disease_idx, prefecture, relation, withdrawn_at) VALUES (%s, '東京都', 'self', now()) RETURNING id::text$q$, d2),
        ERR_PERM);
    PERFORM pg_temp.vw_chk('1', '本人でも都道府県は書き換えられない（update は withdrawn_at だけ）', 'W01',
        $q$UPDATE public.group_wishes SET prefecture = '大阪府' WHERE user_id = auth.uid()$q$, ERR_PERM);
    PERFORM pg_temp.vw_chk('1', '都道府県は member_profiles と同じ値域', 'W01', pg_temp.vw_wish(d2, '東京', 'self', NULL), ERR_CHECK);
    PERFORM pg_temp.vw_chk('1', '続柄は self / family だけ', 'W01', pg_temp.vw_wish(d2, '東京都', 'friend', NULL), ERR_CHECK);
    PERFORM pg_temp.vw_chk('1', 'disease_idx は 0 以上', 'W01', pg_temp.vw_wish(-1, '東京都', 'self', NULL), ERR_CHECK);

    -- =========================================================================
    -- 2. 二重登録は一意制約で止まる
    -- =========================================================================
    PERFORM pg_temp.vw_chk('2', '同じ病気にもう一度登録', 'W01', pg_temp.vw_wish(d1, '大阪府', 'family', false), ERR_UNIQ);

    -- =========================================================================
    -- 3. 公開の数
    -- =========================================================================
    PERFORM pg_temp.vw_chk('3', '1 人 → 「10未満」', 'anon', pg_temp.vw_count(d1), '10未満');
    FOREACH w IN ARRAY ARRAY['W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09'] LOOP
        PERFORM pg_temp.vw_chk('準備', '希望を登録（大阪府・家族・会員かは未回答）', w, pg_temp.vw_wish(d1, '大阪府', 'family', NULL), UUID_LIKE, 'id');
    END LOOP;
    PERFORM pg_temp.vw_chk('3', '9 人 → 「10未満」', 'anon', pg_temp.vw_count(d1), '10未満');
    PERFORM pg_temp.vw_chk('3', '10 人目が登録', 'W10', pg_temp.vw_wish(d1, '東京都', 'self', false), UUID_LIKE, 'id');
    PERFORM pg_temp.vw_chk('3', '10 人 → 「10」', 'anon', pg_temp.vw_count(d1), '10');
    PERFORM pg_temp.vw_chk('3', '11 人目が登録', 'W11', pg_temp.vw_wish(d1, '北海道', 'self', true), UUID_LIKE, 'id');
    PERFORM pg_temp.vw_chk('3', '11 人 → 「11」', 'anon', pg_temp.vw_count(d1), '11');
    PERFORM pg_temp.vw_chk('3', 'W11 が取り消す', 'W11', pg_temp.vw_withdraw(d1, 'now()'), '1');
    PERFORM pg_temp.vw_chk('3', '取り消しで減る → 「10」', 'anon', pg_temp.vw_count(d1), '10');
    PERFORM pg_temp.vw_chk('3', 'W10 が取り消す（時刻を 2000-01-01 と送る）', 'W10', pg_temp.vw_withdraw(d1, $q$'2000-01-01'$q$), '1');
    PERFORM pg_temp.vw_chk('3', '取り消しで 9 人 → 「10未満」', 'anon', pg_temp.vw_count(d1), '10未満');
    PERFORM pg_temp.vw_chk('3', '取り消しの時刻は送った値でなく now()', 'admin', format(
        $q$SELECT (withdrawn_at = now())::text FROM public.group_wishes WHERE disease_idx = %s AND user_id = %L$q$, d1, pg_temp.vw_uid('W10')), 'true');
    PERFORM pg_temp.vw_chk('3', '取り消した人が新しく登録し直す', 'W10', pg_temp.vw_wish(d1, '東京都', 'self', false), ERR_UNIQ);
    PERFORM pg_temp.vw_chk('3', '取り消した人が再開する（withdrawn_at を NULL に戻す）', 'W10', pg_temp.vw_withdraw(d1, 'NULL'), '1');
    PERFORM pg_temp.vw_chk('3', '再開で 10 人 → 「10」', 'anon', pg_temp.vw_count(d1), '10');
    PERFORM pg_temp.vw_chk('3', 'W10 がもう一度取り消す', 'W10', pg_temp.vw_withdraw(d1, 'now()'), '1');
    PERFORM pg_temp.vw_chk('3', '9 人 → 「10未満」', 'anon', pg_temp.vw_count(d1), '10未満');
    PERFORM pg_temp.vw_chk('3', '病気 2 に 1 人登録して取り消す', 'W01', pg_temp.vw_wish(d2, '東京都', 'self', NULL), UUID_LIKE, 'id');
    PERFORM pg_temp.vw_chk('3', '（取り消し）', 'W01', pg_temp.vw_withdraw(d2, 'now()'), '1');
    PERFORM pg_temp.vw_chk('3', '0 人になっても行は残り「10未満」（0 と 1〜9 を見分けさせない）', 'anon', pg_temp.vw_count(d2), '10未満');
    PERFORM pg_temp.vw_chk('3', '一度も希望の無い病気は行が無い（画面は「10未満」と出す）', 'anon', pg_temp.vw_count(990003), '(行なし)');

    -- =========================================================================
    -- 4. anon と公開の表
    -- =========================================================================
    PERFORM pg_temp.vw_chk('4', 'group_wishes を読む', 'anon', 'SELECT count(*)::text FROM public.group_wishes', ERR_PERM);
    PERFORM pg_temp.vw_chk('4', 'public_wish_counts を読める', 'anon', format(
        $q$SELECT count(*)::text FROM public.public_wish_counts WHERE disease_idx IN (%s, %s)$q$, d1, d2), '2');
    PERFORM pg_temp.vw_chk('4', 'ログインしている人も public_wish_counts を読める', 'W02', pg_temp.vw_count(d1), '10未満');
    PERFORM pg_temp.vw_chk('4', 'public_wish_counts の列は disease_idx・n・updated_at・disease_id だけ（disease_id は 20261023）', 'admin',
        $q$SELECT string_agg(column_name::text, ',' ORDER BY ordinal_position) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'public_wish_counts'$q$, 'disease_idx,n,updated_at,disease_id');
    PERFORM pg_temp.vw_chk('4', 'anon は public_wish_counts に書けない（insert）', 'anon',
        $q$INSERT INTO public.public_wish_counts (disease_idx, n) VALUES (990009, '999')$q$, ERR_PERM);
    PERFORM pg_temp.vw_chk('4', 'ログインしている人も書けない（update）', 'W01', format(
        $q$UPDATE public.public_wish_counts SET n = '999' WHERE disease_idx = %s$q$, d1), ERR_PERM);
    PERFORM pg_temp.vw_chk('4', 'ログインしている人も消せない（delete）', 'W01', format(
        $q$DELETE FROM public.public_wish_counts WHERE disease_idx = %s$q$, d1), ERR_PERM);
    PERFORM pg_temp.vw_chk('4', 'API ロールの権限: group_wishes は anon に無く、public_wish_counts は SELECT だけ', 'admin',
        $q$SELECT (NOT has_table_privilege('anon', 'public.group_wishes', 'SELECT,INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.group_wishes', 'DELETE')
                   AND has_table_privilege('anon', 'public.public_wish_counts', 'SELECT')
                   AND NOT has_table_privilege('anon', 'public.public_wish_counts', 'INSERT,UPDATE,DELETE')
                   AND NOT has_table_privilege('authenticated', 'public.public_wish_counts', 'INSERT,UPDATE,DELETE'))::text$q$, 'true');

    -- =========================================================================
    -- 5. 関数の属性と運営向けの内訳
    -- =========================================================================
    FOREACH w IN ARRAY FUNCS LOOP
        PERFORM pg_temp.vw_chk('5', w || ': SECURITY DEFINER・search_path 空固定', 'admin', format(
            $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                     WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
                 FROM (SELECT to_regprocedure(%L) AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, w), 'true');
        PERFORM pg_temp.vw_chk('5', w || ': anon・authenticated・PUBLIC に EXECUTE が無い', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    PERFORM pg_temp.vw_chk('5', 'ログインしている人は wish_summary を呼べない', 'W01', format(
        $q$SELECT count(*)::text FROM public.wish_summary(%s)$q$, d1), ERR_PERM);
    PERFORM pg_temp.vw_chk('5', 'anon は wish_summary を呼べない', 'anon', format(
        $q$SELECT count(*)::text FROM public.wish_summary(%s)$q$, d1), ERR_PERM);
    PERFORM pg_temp.vw_chk('5', '運営（台本の役割）の内訳は実数（取り消した人を数えない）', 'admin', format(
        $q$SELECT string_agg(prefecture || '/' || relation || '/' || coalesce(is_group_member::text, 'null') || '=' || n, ' ' ORDER BY n, prefecture)
             FROM public.wish_summary(%s)$q$, d1), '東京都/self/true=1 大阪府/family/null=8');
    PERFORM pg_temp.vw_chk('5', '内訳の列は prefecture・relation・is_group_member・n だけ（user_id を返さない）', 'admin', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.wish_summary(%s) r, jsonb_object_keys(to_jsonb(r)) k$q$, d1),
        'is_group_member,n,prefecture,relation');

    -- =========================================================================
    -- 6. アカウント削除・auth.users の削除で消える
    -- =========================================================================
    PERFORM pg_temp.vw_chk('6', 'W10 が再開して 10 人 → 「10」', 'W10', pg_temp.vw_withdraw(d1, 'NULL'), '1');
    PERFORM pg_temp.vw_chk('6', '（10 人）', 'anon', pg_temp.vw_count(d1), '10');
    PERFORM pg_temp.vw_chk('6', 'W02 がアカウントを消す（delete_my_account）', 'W02', $q$SELECT 'done' FROM public.delete_my_account()$q$, 'done');
    PERFORM pg_temp.vw_chk('6', 'W02 の希望が消えている', 'admin', format(
        $q$SELECT count(*)::text FROM public.group_wishes WHERE user_id = %L$q$, pg_temp.vw_uid('W02')), '0');
    PERFORM pg_temp.vw_chk('6', 'アカウント削除で公開の数が減る → 「10未満」', 'anon', pg_temp.vw_count(d1), '10未満');
    PERFORM pg_temp.vw_chk('6', 'delete_my_account は group_wishes を明示して消す（版 4）', 'admin',
        $q$SELECT (pg_get_functiondef('public.delete_my_account()'::regprocedure) LIKE '%DELETE FROM public.group_wishes WHERE user_id = v_uid%')::text$q$, 'true');
    DELETE FROM auth.users WHERE id = pg_temp.vw_uid('W03');
    PERFORM pg_temp.vw_chk('6', 'Studio で auth.users を消しても W03 の希望は消える（CASCADE）', 'admin', format(
        $q$SELECT count(*)::text FROM public.group_wishes WHERE user_id = %L$q$, pg_temp.vw_uid('W03')), '0');
    PERFORM pg_temp.vw_chk('6', '残りの内訳（W02・W03 の 2 人分減る）', 'admin', format(
        $q$SELECT string_agg(prefecture || '/' || relation || '=' || n, ' ' ORDER BY n, prefecture) FROM public.wish_summary(%s)$q$, d1),
        '東京都/self=1 東京都/self=1 大阪府/family=6');

    -- =========================================================================
    -- 後片付け（テストユーザーを消せば参加希望は CASCADE で消える。公開の数の行は台本の役割で消す）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.public_wish_counts WHERE disease_idx IN (d1, d2);
    PERFORM pg_temp.vw_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_wishes WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.group_wishes WHERE disease_idx IN (%s, %s))
                 + (SELECT count(*) FROM public.public_wish_counts WHERE disease_idx IN (%s, %s, 990003, 990009)))::text$q$,
        v_users, v_users, d1, d2, d1, d2), '0');
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
      FROM pg_temp.verify_wishes_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_wishes_results
  ) r
 ORDER BY seq;
