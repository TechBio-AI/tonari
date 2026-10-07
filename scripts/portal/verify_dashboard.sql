-- =============================================================================
-- 世話人向けダッシュボードの確認台本
--   （supabase/migrations/20261012_group_dashboard.sql と、差し替えの 20261016_dashboard_drop_consent.sql）
--
-- ★ ローカル Supabase 専用。本番では絶対に実行しない。
--   auth.users にテストユーザーを作り、終わりに消す。本番で流すと本物の会員データに混ざる。
--   本番らしい DB（テスト以外のユーザーが 20 人を超える）では、最初の安全装置で止まる。
--
-- 使い方:
--   1. ローカルで migration を 20261016_dashboard_drop_consent.sql まで当てる
--   2. Studio の SQL エディタにこのファイルの全文を貼って 1 回実行する
--   3. 最後の SELECT に「項目番号／項目／期待／実際／OK・NG」の一覧が出る。先頭の行が NG の件数
--   何度でも再実行できる（最初に前回の残りを消し、終わりにも消す）。
--
-- しくみ:
--   scripts/portal/verify_journey.sql と同じ。ユーザーの切り替えは set_config('request.jwt.claims', …, true) と
--   SET LOCAL ROLE で行う（pg_temp の関数 vd_as の中。失敗はその中で捕まえ、役割と claims は自動で元に戻る）。
--   関数名・表名は vd_ で始め、ほかの台本と同じ接続で流しても重ならないようにする。
--
-- 登場人物（user_id は固定。メールは @verify-dashboard.invalid）:
--   M      会1 の世話人
--   B01    会1 の世話人（2 人目）
--   P      会1 の会員（世話人でない）
--   B02〜B17  会1 の会員
--   U      会1 の会員。プロフィールが無い（region の unknown に入る）
--   B18    会1 を退会した人（数えない）
--   N      どの会の会員でもない。会1 に入会を申請中
--   X      会2 の世話人
--   anon   未ログイン
--
-- 会1 の中身（在籍 20 人。プロフィールのある 19 人は全員 男性・東京都）:
--   年代     40代 10 人（M・P・B01〜B08）、50代 9 人（B09〜B17）、ほかは 0 人
--   登録する方 本人 10 人（M・P・B01〜B08）、代理 9 人（B09〜B17）
--   研究協力の同意 10 人（M・P・B01〜B08）。B09 は同意して取り消した。ダッシュボードには同意の行が出ないこと（20261016）を見る
--
-- 項目:
--   0 前提            1 会をまたいで見えない      2 会員でも世話人でなければ不可
--   3 anon は不可      4 実数の 3 行              5 9 人 → '10未満'
--   6 10 人 → '10'     7 0 人の choice も行がある  8 補完秘匿
--   9 退会は数えない・研究協力の同意の行は無い     10 全行の並びと値
--   11 関数の属性      12 都道府県 → 地方ブロック
--
-- 期待の書き方: 「実際」が「期待」に LIKE で一致すれば OK。
--   ERROR 42501% … 権限エラー
--   ERROR P0001 xx … DB 関数が理由 xx で止めた
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 一時的な表と関数（接続が切れると消える）
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS verify_dashboard_results (
    seq      SERIAL,
    no       TEXT,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       TEXT
);
TRUNCATE pg_temp.verify_dashboard_results RESTART IDENTITY;

-- 登場人物 → user_id。B01〜B18 は ...000000dd01NN
CREATE OR REPLACE FUNCTION pg_temp.vd_uid(p_who TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_who = 'M' THEN '00000000-0000-4000-8000-000000dd0001'::UUID
        WHEN p_who = 'P' THEN '00000000-0000-4000-8000-000000dd0002'::UUID
        WHEN p_who = 'N' THEN '00000000-0000-4000-8000-000000dd0003'::UUID
        WHEN p_who = 'X' THEN '00000000-0000-4000-8000-000000dd0004'::UUID
        WHEN p_who = 'U' THEN '00000000-0000-4000-8000-000000dd0005'::UUID
        WHEN p_who ~ '^B[0-9]{2}$' THEN ('00000000-0000-4000-8000-000000dd01' || substr(p_who, 2, 2))::UUID
    END;
$$;

-- 登場人物の一覧（安全装置・準備・後片付けで使う）
CREATE OR REPLACE FUNCTION pg_temp.vd_people()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY['M', 'P', 'N', 'X', 'U'] || ARRAY(SELECT 'B' || lpad(i::TEXT, 2, '0') FROM generate_series(1, 18) AS i);
$$;

CREATE OR REPLACE FUNCTION pg_temp.vd_ids()
RETURNS UUID[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ARRAY(SELECT pg_temp.vd_uid(w) FROM unnest(pg_temp.vd_people()) AS w);
$$;

-- p_who として SQL を 1 本実行し、最初の値を文字で返す。失敗は「ERROR <SQLSTATE> <文>」で返す。
--   p_who: 登場人物（authenticated）/ anon / admin（切り替えない。台本を流している役割のまま）
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

CREATE OR REPLACE FUNCTION pg_temp.vd_rec(p_no TEXT, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
    INSERT INTO pg_temp.verify_dashboard_results (no, item, expected, actual, ok)
    VALUES (p_no, p_item, p_expected, left(coalesce(p_actual, '(null)'), 1200),
            CASE WHEN coalesce(p_ok, false) THEN 'OK' ELSE 'NG' END);
$$;

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

-- group_dashboard の 1 行の n。行が無ければ '(行なし)'
CREATE OR REPLACE FUNCTION pg_temp.vd_cell(p_group UUID, p_section TEXT, p_choice TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT format(
        $q$SELECT coalesce((SELECT n FROM public.group_dashboard(%L::uuid) WHERE section = %L AND choice = %L), '(行なし)')$q$,
        p_group, p_section, p_choice);
$$;


-- -----------------------------------------------------------------------------
-- 0. 安全装置（本番らしければ止める）
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_ids    UUID[] := pg_temp.vd_ids();
    v_others INT;
BEGIN
    SELECT count(*) INTO v_others FROM auth.users WHERE id <> ALL (v_ids);
    IF v_others > 20 THEN
        RAISE EXCEPTION 'テスト以外のユーザーが % 人います。本番の可能性があるので止めます（この台本はローカル専用）', v_others;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users
               WHERE id = ANY (v_ids) AND coalesce(email, '') NOT LIKE '%@verify-dashboard.invalid') THEN
        RAISE EXCEPTION 'テスト用の user_id がテスト以外のユーザーに使われています。消さずに止めます';
    END IF;
    IF to_regprocedure('public.group_dashboard(uuid)') IS NULL THEN
        RAISE EXCEPTION 'group_dashboard がありません。先に 20261012_group_dashboard.sql を当ててください';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 本体
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_people TEXT[] := pg_temp.vd_people();
    v_users  UUID[] := pg_temp.vd_ids();
    g1 UUID := '00000000-0000-4000-8000-000000ddf001';
    g2 UUID := '00000000-0000-4000-8000-000000ddf002';
    w  TEXT;
    i  INT;
    v  TEXT;
    ERR_PERM CONSTANT TEXT := 'ERROR 42501%';
    -- 会1 の全行（並びと値）。項目 10 で比べる
    EXPECTED_ALL CONSTANT TEXT :=
        'members_total/all=20 moderators/all=2 join_requests_pending/all=1 '
     || 'registrant_type/self=10未満 registrant_type/proxy=10未満 '
     || 'age_band/10歳未満=10未満 age_band/10代=10未満 age_band/20代=10未満 age_band/30代=10未満 age_band/40代=10 '
     || 'age_band/50代=10未満 age_band/60代=10未満 age_band/70代=10未満 age_band/80歳以上=10未満 '
     || 'gender/男性=19 gender/女性=10未満 gender/答えない=10未満 '
     || 'region/hokkaido=10未満 region/tohoku=10未満 region/kanto=19 region/chubu=10未満 region/kinki=10未満 '
     || 'region/chugoku=10未満 region/shikoku=10未満 region/kyushu_okinawa=10未満 region/unknown=10未満';
BEGIN
    -- =========================================================================
    -- 準備: 前回の残りを消し、ユーザー 23 人・会 2 つ・プロフィール・所属・同意・申請を作る
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);          -- プロフィール・所属・同意・申請は CASCADE で消える
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);

    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT pg_temp.vd_uid(x.w), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'vd-' || lower(x.w) || '@verify-dashboard.invalid', '{}'::JSONB, '{}'::JSONB, now(), now()
      FROM unnest(v_people) AS x(w);

    INSERT INTO public.patient_groups (id, slug, name) VALUES
        (g1, 'verify-dashboard-1', 'VD 確認用の会1'),
        (g2, 'verify-dashboard-2', 'VD 確認用の会2');

    -- プロフィールは本人として作る（member_profiles の RLS を通す）。U だけ作らない
    FOREACH w IN ARRAY v_people LOOP
        CONTINUE WHEN w = 'U';
        PERFORM pg_temp.vd_chk('準備', 'プロフィールを本人として作る', w, format(
            $q$INSERT INTO public.member_profiles
                   (user_id, full_name, display_name, age_band, gender, prefecture, registrant_type, proxy_relation, patient_is_minor)
               VALUES (auth.uid(), %L, %L, %L, '男性', '東京都', %L, %L, %L) RETURNING user_id::text$q$,
            'VD本名' || w, 'VD表示' || w,
            CASE WHEN w ~ '^B(09|1[0-7])$' THEN '50代' ELSE '40代' END,
            CASE WHEN w ~ '^B(09|1[0-7])$' THEN 'proxy' ELSE 'self' END,
            CASE WHEN w ~ '^B(09|1[0-7])$' THEN '親' END,
            CASE WHEN w ~ '^B(09|1[0-7])$' THEN true END), pg_temp.vd_uid(w)::TEXT);
    END LOOP;

    -- 所属（最初の世話人と同じく、台本の役割で入れる）
    INSERT INTO public.memberships (user_id, group_id, role)
    SELECT pg_temp.vd_uid(x.w),
           g1,
           CASE WHEN x.w IN ('M', 'B01') THEN 'moderator' ELSE 'member' END
      FROM unnest(v_people) AS x(w)
     WHERE x.w NOT IN ('N', 'X');
    UPDATE public.memberships SET left_at = now() WHERE user_id = pg_temp.vd_uid('B18') AND group_id = g1;
    INSERT INTO public.memberships (user_id, group_id, role) VALUES (pg_temp.vd_uid('X'), g2, 'moderator');

    -- 研究協力の同意（本人として）。M・P・B01〜B08 の 10 人。B09 は同意して取り消す
    FOREACH w IN ARRAY ARRAY['M', 'P', 'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09'] LOOP
        PERFORM pg_temp.vd_chk('準備', '研究協力の連絡に同意する', w,
            $q$INSERT INTO public.consents (user_id, kind, version) VALUES (auth.uid(), 'research_contact', 2) RETURNING 'ok'$q$, 'ok');
    END LOOP;
    PERFORM pg_temp.vd_chk('準備', '研究協力の同意を取り消す', 'B09',
        $q$WITH u AS (UPDATE public.consents SET withdrawn_at = now()
                       WHERE user_id = auth.uid() AND kind = 'research_contact' RETURNING 1)
           SELECT count(*)::text FROM u$q$, '1');

    -- 入会申請: N → 会1（未審査）。P → 会2（会1 の数には入らない）
    PERFORM pg_temp.vd_chk('準備', '会1 への入会申請（未審査のまま）', 'N', format(
        $q$SELECT public.request_join(%L, '')::text$q$, g1), '________-%', '申請 id');
    PERFORM pg_temp.vd_chk('準備', '会2 への入会申請（会1 の数に入らない）', 'P', format(
        $q$SELECT public.request_join(%L, '')::text$q$, g2), '________-%', '申請 id');

    -- =========================================================================
    -- 0. 前提
    -- =========================================================================
    PERFORM pg_temp.vd_chk('0', 'auth.uid() が切り替えた人になる', 'M', 'SELECT auth.uid()::text', pg_temp.vd_uid('M')::TEXT);
    PERFORM pg_temp.vd_chk('0', 'stats_threshold() は 10', 'admin', 'SELECT public.stats_threshold()::text', '10');
    PERFORM pg_temp.vd_chk('0', '会1 の在籍は 20 人・世話人 2 人（台本の役割で数える）', 'admin', format(
        $q$SELECT count(*)::text || ':' || count(*) FILTER (WHERE role = 'moderator')::text
             FROM public.memberships WHERE group_id = %L AND left_at IS NULL$q$, g1), '20:2');

    -- =========================================================================
    -- 1. 会をまたいで見えない
    -- =========================================================================
    PERFORM pg_temp.vd_chk('1', '会2 の世話人 X が会1 のダッシュボード', 'X', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('1', '会1 の世話人 M が会2 のダッシュボード', 'M', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g2), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('1', '会2 の世話人 X は自分の会なら取れる（空振りでない）', 'X', format(
        $q$SELECT n FROM public.group_dashboard(%L) WHERE section = 'members_total'$q$, g2), '1');

    -- =========================================================================
    -- 2. 会員でも世話人でなければ不可
    -- =========================================================================
    PERFORM pg_temp.vd_chk('2', '会1 の会員 P（世話人でない）', 'P', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('2', '会1 の会員 U（プロフィールなし）', 'U', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('2', '会1 を退会した B18', 'B18', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), 'ERROR P0001 forbidden');
    PERFORM pg_temp.vd_chk('2', 'どの会の会員でもない N', 'N', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), 'ERROR P0001 forbidden');

    -- =========================================================================
    -- 3. anon は不可
    -- =========================================================================
    PERFORM pg_temp.vd_chk('3', 'group_dashboard を呼ぶ', 'anon', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), ERR_PERM);
    PERFORM pg_temp.vd_chk('3', 'stats_threshold を呼ぶ', 'anon', 'SELECT public.stats_threshold()::text', ERR_PERM);
    PERFORM pg_temp.vd_chk('3', 'prefecture_region を呼ぶ', 'anon', $q$SELECT public.prefecture_region('東京都')$q$, ERR_PERM);

    -- =========================================================================
    -- 4. 実数の 3 行（伏せない。先頭の 3 行）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('4', '在籍会員の実数（退会者・申請中の人を数えない）', 'M', pg_temp.vd_cell(g1, 'members_total', 'all'), '20');
    PERFORM pg_temp.vd_chk('4', '世話人の実数（10 未満でも伏せない）', 'M', pg_temp.vd_cell(g1, 'moderators', 'all'), '2');
    PERFORM pg_temp.vd_chk('4', '未審査の申請の実数（他の会への申請を数えない）', 'M', pg_temp.vd_cell(g1, 'join_requests_pending', 'all'), '1');
    PERFORM pg_temp.vd_chk('4', '先頭の 3 行の並び', 'M', format(
        $q$SELECT string_agg(r.section || '/' || r.choice, ' ' ORDER BY r.ord)
             FROM public.group_dashboard(%L) WITH ORDINALITY AS r(section, choice, n, ord) WHERE r.ord <= 3$q$, g1),
        'members_total/all moderators/all join_requests_pending/all');

    -- =========================================================================
    -- 5. 9 人 → '10未満'
    -- =========================================================================
    PERFORM pg_temp.vd_chk('5', '年代 50代（9 人）', 'M', pg_temp.vd_cell(g1, 'age_band', '50代'), '10未満');

    -- =========================================================================
    -- 6. 10 人 → '10'
    -- =========================================================================
    PERFORM pg_temp.vd_chk('6', '年代 40代（10 人）', 'M', pg_temp.vd_cell(g1, 'age_band', '40代'), '10');

    -- =========================================================================
    -- 7. 0 人の choice も行がある
    -- =========================================================================
    PERFORM pg_temp.vd_chk('7', '行の数は 26（3 + 2 + 9 + 3 + 9）', 'M', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)$q$, g1), '26');
    PERFORM pg_temp.vd_chk('7', '年代 10代（0 人）の行がある', 'M', pg_temp.vd_cell(g1, 'age_band', '10代'), '10未満');
    PERFORM pg_temp.vd_chk('7', '性別 答えない（0 人）の行がある', 'M', pg_temp.vd_cell(g1, 'gender', '答えない'), '10未満');
    PERFORM pg_temp.vd_chk('7', '地方 hokkaido（0 人）の行がある', 'M', pg_temp.vd_cell(g1, 'region', 'hokkaido'), '10未満');
    PERFORM pg_temp.vd_chk('7', '地方 unknown（プロフィールの無い U の 1 人）の行がある', 'M', pg_temp.vd_cell(g1, 'region', 'unknown'), '10未満');
    PERFORM pg_temp.vd_chk('7', '伏せた行の n は「10未満」だけ（0 や 9 を出さない）', 'M', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L)
            WHERE section NOT IN ('members_total', 'moderators', 'join_requests_pending')
              AND CASE WHEN n ~ '^[0-9]+$' THEN n::int < 10 ELSE n <> '10未満' END$q$, g1), '0');

    -- =========================================================================
    -- 8. 補完秘匿（伏せた行が 1 つだけの section は、残りで最小の行も伏せる）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('8', '登録する方 代理（9 人）は伏せる', 'M', pg_temp.vd_cell(g1, 'registrant_type', 'proxy'), '10未満');
    PERFORM pg_temp.vd_chk('8', '登録する方 本人（10 人）も補完で伏せる（在籍 20 から引き算させない）', 'M',
        pg_temp.vd_cell(g1, 'registrant_type', 'self'), '10未満');
    PERFORM pg_temp.vd_chk('8', '伏せた行が 2 つある section（性別）は補完しない：男性 19 は出る', 'M',
        pg_temp.vd_cell(g1, 'gender', '男性'), '19');
    PERFORM pg_temp.vd_chk('8', '伏せた行が 2 つ以上の section（年代）は補完しない：40代 10 は出る', 'M',
        pg_temp.vd_cell(g1, 'age_band', '40代'), '10');

    -- =========================================================================
    -- 9. 退会・取り消しは数えない
    -- =========================================================================
    PERFORM pg_temp.vd_chk('9', '関東は 19（退会した B18 を数えない）', 'M', pg_temp.vd_cell(g1, 'region', 'kanto'), '19');
    PERFORM pg_temp.vd_chk('9', '研究協力の同意の行は無い（同意している人が 10 人いても。20261016）', 'M', format(
        $q$SELECT count(*)::text FROM public.group_dashboard(%L) WHERE section = 'consent_research_contact'$q$, g1), '0');

    -- =========================================================================
    -- 10. 全行の並びと値
    -- =========================================================================
    v := pg_temp.vd_as('M', format(
        $q$SELECT string_agg(r.section || '/' || r.choice || '=' || r.n, ' ' ORDER BY r.ord)
             FROM public.group_dashboard(%L) WITH ORDINALITY AS r(section, choice, n, ord)$q$, g1));
    PERFORM pg_temp.vd_rec('10', '[M] 会1 の全 26 行（section/choice=n、返る順）', EXPECTED_ALL, v, v = EXPECTED_ALL);
    PERFORM pg_temp.vd_chk('10', '列は section・choice・n だけ（user_id・氏名を返さない）', 'M', format(
        $q$SELECT string_agg(DISTINCT k, ',' ORDER BY k) FROM public.group_dashboard(%L) r, jsonb_object_keys(to_jsonb(r)) k$q$, g1),
        'choice,n,section');

    -- =========================================================================
    -- 11. 関数の属性
    -- =========================================================================
    PERFORM pg_temp.vd_chk('11', 'group_dashboard: SECURITY DEFINER・search_path 空固定', 'admin',
        $q$SELECT coalesce((p.prosecdef AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                 WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
             FROM (SELECT to_regprocedure('public.group_dashboard(uuid)') AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, 'true');
    PERFORM pg_temp.vd_chk('11', 'group_dashboard: anon と PUBLIC に EXECUTE が無い・authenticated にはある', 'admin',
        $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                   AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                   WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
                   AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text
             FROM pg_proc p WHERE p.oid = to_regprocedure('public.group_dashboard(uuid)')$q$, 'true');
    FOREACH w IN ARRAY ARRAY['public.stats_threshold()', 'public.prefecture_region(text)'] LOOP
        PERFORM pg_temp.vd_chk('11', w || ': IMMUTABLE・search_path 空固定', 'admin', format(
            $q$SELECT coalesce((p.provolatile = 'i' AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                                                              WHERE c IN ('search_path=""', 'search_path=')))::text, '関数が無い')
                 FROM (SELECT to_regprocedure(%L) AS oid) r LEFT JOIN pg_proc p ON p.oid = r.oid$q$, w), 'true');
        PERFORM pg_temp.vd_chk('11', w || ': anon・authenticated・PUBLIC に EXECUTE が無い', 'admin', format(
            $q$SELECT (NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text
                 FROM pg_proc p WHERE p.oid = to_regprocedure(%L)$q$, w), 'true');
    END LOOP;
    PERFORM pg_temp.vd_chk('11', 'authenticated は stats_threshold を直接呼べない（世話人でも）', 'M',
        'SELECT public.stats_threshold()::text', ERR_PERM);

    -- =========================================================================
    -- 12. 都道府県 → 地方ブロック（47 都道府県。三重県は近畿）
    -- =========================================================================
    PERFORM pg_temp.vd_chk('12', '地方ブロックごとの都道府県の数', 'admin',
        $q$SELECT string_agg(r || '=' || c, ' ' ORDER BY o)
             FROM (SELECT public.prefecture_region(p) AS r, count(*) AS c
                     FROM unnest(ARRAY[
                         '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
                         '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
                         '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
                         '岐阜県', '静岡県', '愛知県', '三重県',
                         '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
                         '鳥取県', '島根県', '岡山県', '広島県', '山口県',
                         '徳島県', '香川県', '愛媛県', '高知県',
                         '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']) AS p
                    GROUP BY 1) x
             JOIN (SELECT * FROM unnest(ARRAY['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku',
                                              'kyushu_okinawa']) WITH ORDINALITY AS o(r, o)) y USING (r)$q$,
        'hokkaido=1 tohoku=6 kanto=7 chubu=9 kinki=7 chugoku=5 shikoku=4 kyushu_okinawa=8');
    PERFORM pg_temp.vd_chk('12', '三重県は近畿・知らない値は NULL', 'admin',
        $q$SELECT public.prefecture_region('三重県') || ':' || coalesce(public.prefecture_region('どこか'), '(null)')$q$,
        'kinki:(null)');

    -- =========================================================================
    -- 後片付け（テストユーザーを消せば、プロフィール・所属・同意・申請は CASCADE で消える）
    -- =========================================================================
    DELETE FROM auth.users WHERE id = ANY (v_users);
    DELETE FROM public.patient_groups WHERE id IN (g1, g2);
    PERFORM pg_temp.vd_chk('後片付け', 'テストの行が残っていない', 'admin', format(
        $q$SELECT ((SELECT count(*) FROM auth.users WHERE id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.patient_groups WHERE id IN (%L, %L))
                 + (SELECT count(*) FROM public.memberships WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.member_profiles WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.consents WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.join_requests WHERE user_id = ANY (%L::uuid[]))
                 + (SELECT count(*) FROM public.profiles WHERE id = ANY (%L::uuid[])))::text$q$,
        v_users, g1, g2, v_users, v_users, v_users, v_users, v_users), '0');
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
      FROM pg_temp.verify_dashboard_results
    UNION ALL
    SELECT seq, no, item, expected, actual, ok FROM pg_temp.verify_dashboard_results
  ) r
 ORDER BY seq;
