-- =============================================================================
-- 同意の記録（consents・member_diseases）と会員プロフィール（登録する方・性別）の確認台本
--
-- ★★ ローカル専用。本番・共有の DB では絶対に流さない ★★
--   テスト用の会員 2 人を auth.users に作り、ロールを切り替えて書き込みを試し、最後に消す。
--
-- 使い方:
--   1. ローカルの Supabase Studio の SQL Editor に、このファイルを丸ごと貼る
--   2. 1 回実行する（Run）
--   3. 最後の SELECT に「番号／項目／期待／実際／判定」の一覧が出る。番号 0 が合計。すべて OK なら問題なし
--
-- 前提:
--   - 20260926_member_profiles.sql・20260928_consents.sql・20260929_member_profiles_registrant.sql・20261017_consent_base_v3.sql を適用済み
--     （20261017 が無いときは「9」の行が NG になり、9 の残りは行わない）
--   - 20261021_consent_wish.sql を適用済み（無いときは「10」の行が NG になり、10 の残りは行わない）
--   - 20261023（disease_catalog）・20261024（is_trial_audience）・20261029 を適用済み（無いときは「11」の行が NG）
--   - Studio の実行ロール（ふつうは postgres）が RLS を越えられ、authenticated・anon に切り替えられる
--     （そろわないときは「前提」の行が NG になり、以降は行わない）
--
-- 何度でも流せる:
--   - テスト会員は固定の id（…0c0a01 / …0c0a02）とメール（verify-consents-*@example.invalid）。
--     始めに前回の残りを消し、終わりに消す（auth.users を消すと、member_profiles・consents・member_diseases・profiles は
--     外部キーの ON DELETE CASCADE で一緒に消える）
--   - 途中で止まったときは、止まった区間の書き込みは巻き戻る（「途中で止まった」の行が NG で出る）
--   - 実データには触れない。移行の確認も、テスト会員 2 人だけに絞って流す
--
-- 確かめること:
--   1. 本人以外の consents・member_diseases が読めない・変えられない・消せない・その名義で作れない
--   2. consents は withdrawn_at 以外 update できない・本人も delete できない・withdrawn_at は戻せない（立て直せない）
--   3. anon は 2 表とも何もできない（select / insert / update / delete）
--   4. member_profiles.consented_at → consents(base 版 1) の移行を 2 回流しても同じ結果
--   5. SECURITY DEFINER 関数があれば search_path を固定し、anon・PUBLIC に EXECUTE が無い
--      （対象は public スキーマの関数のうち、本文が consents・member_diseases・member_profiles に触れるもの。
--       2026-09-26 時点の 20260928_consents.sql には無い。トリガー関数 consents_guard_withdrawal は INVOKER であることを確かめる）
--   6. 性別の制約: CHECK は 1 つだけで「男性・女性・答えない」。「その他」の行が無い。本人も「その他」にできない
--   7. 登録する方の列: registrant_type・proxy_relation・patient_is_minor がある。列を指定せずに作った行は本人（self）。
--      本人なら続柄と「18 歳未満か」を持たず、代理なら両方が要る（表の CHECK）
--   8. 20260929_member_profiles_registrant.sql をもう一度流しても、エラーにならず、制約・列・行が変わらない
--      （台本に migration の本文をそのまま埋め込んで流し、確かめた後で巻き戻す。本文は
--       lib/portal/__tests__/member-profile.test.ts が migration ファイルと一字一句同じかを確かめる）
--   9. base 版 3（20261017_consent_base_v3.sql）: consent_current_version は base 3・research_contact 1・案の種類は NULL。
--      版 1 にしか同意していない会員は has_current_consent('base') が false、版 3 に同意すると true。
--      2 つの関数は SECURITY INVOKER・search_path 固定で、anon は実行できない
--  10. 同意の種類 wish（20261021_consent_wish.sql）: kind の CHECK に wish がある。consent_current_version('wish') は 1。
--      会員は自分の wish 版 1 の同意を作れる。他人の名義では作れない。知らない種類は CHECK で止まる。
--      wish の同意を足しても、base のいまの版の判定（has_current_consent('base')）は変わらない
--  11. research_contact 版 2（20261029_consent_research_contact_v2.sql）: いまの版は 2。
--      member_diseases に病気を入れると、トリガーが disease_id（固定 ID）を idx と名前から埋める。
--      版 1 だけの会員にはその病気の案件が見えない（is_trial_audience が false）。版 2 に同意すると見える
--
-- なりすましのやり方:
--   SET LOCAL ROLE authenticated（または anon）と、request.jwt.claims / request.jwt.claim.sub の設定で、
--   auth.uid() がテスト会員を返すようにする。効いているかは「準備: なりすましが効く」の行で確かめる。
-- =============================================================================

DROP TABLE IF EXISTS pg_temp.verify_consents_results;
CREATE TEMP TABLE verify_consents_results (
    ord      INTEGER,
    item     TEXT,
    expected TEXT,
    actual   TEXT,
    ok       BOOLEAN
);

-- 指定したロール・会員として SQL を 1 本流す。エラーは捕まえて返す（ロールと claims は必ず元に戻す）
CREATE OR REPLACE FUNCTION pg_temp.run_as(
    p_role TEXT, p_sub UUID, p_sql TEXT,
    OUT ok BOOLEAN, OUT n BIGINT, OUT state TEXT, OUT msg TEXT
)
LANGUAGE plpgsql
AS $f$
BEGIN
    BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('role', p_role, 'sub', p_sub)::text, true);
        PERFORM set_config('request.jwt.claim.sub', COALESCE(p_sub::text, ''), true);
        PERFORM set_config('request.jwt.claim.role', p_role, true);
        EXECUTE format('SET LOCAL ROLE %I', p_role);
        EXECUTE p_sql;
        GET DIAGNOSTICS n = ROW_COUNT;
        ok := true;
        state := '00000';
        msg := '';
        RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
        ok := false;
        n := NULL;
        state := SQLSTATE;
        msg := SQLERRM;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', '', true);
END;
$f$;

-- 結果の 1 行を足す（変数に溜める。途中で止まって巻き戻っても、結果は残る）
CREATE OR REPLACE FUNCTION pg_temp.add(p_log JSONB, p_item TEXT, p_expected TEXT, p_actual TEXT, p_ok BOOLEAN)
RETURNS JSONB
LANGUAGE sql
AS $f$
    SELECT p_log || jsonb_build_array(jsonb_build_object(
        'item', p_item, 'expected', p_expected, 'actual', COALESCE(p_actual, 'NULL'), 'ok', COALESCE(p_ok, false)
    ))
$f$;

-- 通って、ちょうど p_n 行に効くはず
CREATE OR REPLACE FUNCTION pg_temp.expect_rows(p_log JSONB, p_item TEXT, p_role TEXT, p_sub UUID, p_sql TEXT, p_n BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
AS $f$
DECLARE
    r RECORD;
BEGIN
    SELECT * INTO r FROM pg_temp.run_as(p_role, p_sub, p_sql);
    RETURN pg_temp.add(
        p_log, p_item, p_n || ' 行',
        CASE WHEN r.ok THEN r.n || ' 行' ELSE 'エラー ' || r.state || '（' || r.msg || '）' END,
        r.ok AND r.n = p_n
    );
END;
$f$;

-- エラーで止まるはず（p_state が NULL なら種類は問わない）
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_log JSONB, p_item TEXT, p_role TEXT, p_sub UUID, p_sql TEXT, p_state TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $f$
DECLARE
    r RECORD;
BEGIN
    SELECT * INTO r FROM pg_temp.run_as(p_role, p_sub, p_sql);
    RETURN pg_temp.add(
        p_log, p_item, 'エラー ' || COALESCE(p_state, '（種類は問わない）'),
        CASE WHEN r.ok THEN '通った（' || r.n || ' 行）' ELSE 'エラー ' || r.state || '（' || r.msg || '）' END,
        NOT r.ok AND (p_state IS NULL OR r.state = p_state)
    );
END;
$f$;

-- member_profiles の形（制約・列・テスト会員の行）を 1 つの文字列にする（移行の冪等性の比較用）
CREATE OR REPLACE FUNCTION pg_temp.profile_shape(p_a UUID, p_b UUID)
RETURNS TEXT
LANGUAGE sql
AS $f$
    SELECT concat_ws(' | ',
        (SELECT string_agg(con.conname || '=' || pg_get_constraintdef(con.oid), '; ' ORDER BY con.conname)
           FROM pg_constraint con WHERE con.conrelid = 'public.member_profiles'::regclass),
        (SELECT string_agg(att.attname || ':' || format_type(att.atttypid, att.atttypmod) || ':' || att.attnotnull
                           || ':' || COALESCE(pg_get_expr(d.adbin, d.adrelid), ''), '; ' ORDER BY att.attnum)
           FROM pg_attribute att
           LEFT JOIN pg_attrdef d ON d.adrelid = att.attrelid AND d.adnum = att.attnum
          WHERE att.attrelid = 'public.member_profiles'::regclass AND att.attnum > 0 AND NOT att.attisdropped),
        (SELECT string_agg(mp.user_id || ':' || mp.registrant_type || ':' || COALESCE(mp.proxy_relation, '-') || ':'
                           || COALESCE(mp.patient_is_minor::text, '-') || ':' || mp.gender, '; ' ORDER BY mp.user_id)
           FROM public.member_profiles mp WHERE mp.user_id IN (p_a, p_b))
    )
$f$;

DO $verify$
DECLARE
    a          UUID := '00000000-0000-4000-8000-0000000c0a01';  -- テスト会員 A
    b          UUID := '00000000-0000-4000-8000-0000000c0a02';  -- テスト会員 B
    log        JSONB := '[]';
    can_bypass BOOLEAN;
    can_switch BOOLEAN;
    ready      BOOLEAN;
    n1         BIGINT;
    n2         BIGINT;
    cnt        BIGINT;
    pa         TIMESTAMPTZ;
    pb         TIMESTAMPTZ;
    pa2        TIMESTAMPTZ;
    pb2        TIMESTAMPTZ;
    a_rc       UUID;
    w          TIMESTAMPTZ;
    w2         TIMESTAMPTZ;
    s1         TEXT;
    s2         TEXT;
    s3         TEXT;
    defs       TEXT;
    -- 11 で使う、疾患の固定 ID の表の 1 行（表の別名とぶつからない名前）
    cat_id     TEXT;
    cat_idx    INTEGER;
    cat_name   TEXT;
    -- 20260929_member_profiles_registrant.sql の本文（一字一句同じ。8. でもう一度流す）
    mig        TEXT := $mig$-- =============================================================================
-- member_profiles を「登録する方」と「患者さん」に分ける（代理登録）と、性別の選択肢の変更
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20260926・20260927・20260928 は適用済みなので書き換えない。変更はこのファイルだけで行う。
-- ※ 同じ日付の 20260929_member_profiles_sex_options.sql（未コミット・未適用）の中身は、このファイルに取り込んだ。
--    あちらは削除候補（版番号 20260929 が重なるので、両方を置いたまま適用しない）。
--
-- 決定（docs/DECISIONS.md「プロフィールを『登録する方』と『患者さん』に分ける」）:
--   - 原則、患者本人が登録する。代理で登録できるのは、患者が 18 歳未満、
--     または 18 歳以上で本人が自分では操作できない場合（自己申告のチェック 1 つ。審査は世話人）
--   - full_name・display_name は「登録する方」の氏名・表示名。age_band・gender・prefecture は「患者さん」について
--   - 患者さんの氏名・生年月日、親（代理の方）の年代・性別は持たない
--   - 性別は「男性・女性・答えない」。「その他」は置かない
--     （X 連鎖の病気では性別が医学的な意味を持ち、「その他」があると体の性別か自認かが曖昧になるため）
--
-- 追加する列:
--   registrant_type   'self'（ご本人）| 'proxy'（ご家族・代理の方）
--   proxy_relation    代理のときの続柄 '親' | '配偶者' | '子' | 'その他'。本人のときは NULL
--   patient_is_minor  代理のとき、患者が 18 歳未満か。本人のときは NULL
--   「本人が自分では操作できない」の自己申告は列に持たない（画面のチェックで確かめ、同意文 base 版 2 に書いた）
--
-- 既存の行:
--   すべて本人（self）扱いにする（registrant_type の既定値 'self' で埋まる）。
--   gender = 'その他' の行が 1 行でもあれば、何も変えずに止まる（例外で中断し、ファイル全体が巻き戻る）。
--   その行をどうするかはファウンダーが決める。黙って別の値に置き換えない。
--
-- registrant_type の既定値 'self' は残す。
--   アプリ（lib/portal/member-profile.ts）は必ず値を送る。既定値は、既存の行と、確認台本
--   （scripts/portal/verify_tenancy.sql 等）が列を指定せずに作る行のため。
--
-- 何度流しても同じ結果になる（列は IF NOT EXISTS、制約は外してから付け直す）。
-- 値は lib/portal/member-profile.ts の GENDERS・REGISTRANT_TYPES・PROXY_RELATIONS と同じにする
-- （lib/portal/__tests__/member-profile.test.ts が突き合わせる）。
-- =============================================================================

-- 1. 「その他」の行があれば止まる（何も変える前に）
DO $$
DECLARE
    n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM public.member_profiles WHERE gender = 'その他';
    IF n > 0 THEN
        RAISE EXCEPTION 'member_profiles に gender = ''その他'' の行が % 行あります。何も変えずに止めました（ファウンダーの判断待ち）', n;
    END IF;
END;
$$;

-- 2. 性別の CHECK を差し替える
--    20260926 では列に直接 CHECK を書いたので、制約名は自動で付いている。
--    名前を決め打ちせず、gender 列だけに掛かっている CHECK をすべて外してから、名前付きで付け直す。
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
        WHERE con.conrelid = 'public.member_profiles'::regclass
          AND con.contype = 'c'
          AND att.attname = 'gender'
          AND array_length(con.conkey, 1) = 1
    LOOP
        EXECUTE format('ALTER TABLE public.member_profiles DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.member_profiles
    ADD CONSTRAINT member_profiles_gender_check
    CHECK (gender IN ('男性', '女性', '答えない'));

-- 3. 登録する方の列（既存の行は既定値 'self' で本人扱いになる）
ALTER TABLE public.member_profiles
    ADD COLUMN IF NOT EXISTS registrant_type  TEXT NOT NULL DEFAULT 'self',
    ADD COLUMN IF NOT EXISTS proxy_relation   TEXT,
    ADD COLUMN IF NOT EXISTS patient_is_minor BOOLEAN;

ALTER TABLE public.member_profiles DROP CONSTRAINT IF EXISTS member_profiles_registrant_type_check;
ALTER TABLE public.member_profiles
    ADD CONSTRAINT member_profiles_registrant_type_check
    CHECK (registrant_type IN ('self', 'proxy'));

ALTER TABLE public.member_profiles DROP CONSTRAINT IF EXISTS member_profiles_proxy_relation_check;
ALTER TABLE public.member_profiles
    ADD CONSTRAINT member_profiles_proxy_relation_check
    CHECK (proxy_relation IS NULL OR proxy_relation IN ('親', '配偶者', '子', 'その他'));

-- 本人なら続柄と 18 歳未満かは持たない。代理なら両方が要る
ALTER TABLE public.member_profiles DROP CONSTRAINT IF EXISTS member_profiles_registrant_consistency_check;
ALTER TABLE public.member_profiles
    ADD CONSTRAINT member_profiles_registrant_consistency_check
    CHECK (
        (registrant_type = 'self'  AND proxy_relation IS NULL     AND patient_is_minor IS NULL)
     OR (registrant_type = 'proxy' AND proxy_relation IS NOT NULL AND patient_is_minor IS NOT NULL)
    );

COMMENT ON COLUMN public.member_profiles.full_name IS
'登録する方の氏名。個人識別子。外部 LLM API へ送らない。運営と、入会審査をする世話人だけが見る。患者さんの氏名は持たない';
COMMENT ON COLUMN public.member_profiles.display_name IS
'場に出る名前（登録する方）。「〇〇の母」のような書き方でもよい';
COMMENT ON COLUMN public.member_profiles.age_band IS
'患者さんの年代（代理の方の年代ではない）';
COMMENT ON COLUMN public.member_profiles.gender IS
'患者さんの性別。男性・女性・答えない のいずれか（「その他」は置かない。X 連鎖の病気などで医学的な意味を持つため）';
COMMENT ON COLUMN public.member_profiles.prefecture IS
'患者さんのお住まいの都道府県';
COMMENT ON COLUMN public.member_profiles.registrant_type IS
'登録する方。self = ご本人、proxy = ご家族・代理の方';
COMMENT ON COLUMN public.member_profiles.proxy_relation IS
'代理のときの続柄（親・配偶者・子・その他）。本人のときは NULL';
COMMENT ON COLUMN public.member_profiles.patient_is_minor IS
'代理のとき、患者さんが 18 歳未満か。本人のときは NULL';

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること（scripts/portal/verify_consents.sql でもまとめて確かめる）
--
--   1. select registrant_type, count(*) from member_profiles group by 1;  → 既存の行はすべて self
--   2. select count(*) from member_profiles where registrant_type = 'self'
--        and (proxy_relation is not null or patient_is_minor is not null);  → 0
--   3. 会員 A で  update member_profiles set gender = 'その他' where user_id = auth.uid();  → CHECK 違反
--   4. 会員 A で  update member_profiles set registrant_type = 'proxy' where user_id = auth.uid();  → CHECK 違反（続柄が無い）
--   5. このファイルをもう一度流す → エラーにならず、制約・列・行が変わらない
-- -----------------------------------------------------------------------------
$mig$;
    c_at       TIMESTAMPTZ;
    f          RECORD;
    nfunc      INTEGER := 0;
    secdef     BOOLEAN;
BEGIN
    -- -------------------------------------------------------------------------
    -- 0. 前提
    -- -------------------------------------------------------------------------
    SELECT rolsuper OR rolbypassrls INTO can_bypass FROM pg_roles WHERE rolname = current_user;
    log := pg_temp.add(log, '前提: 実行ロールが RLS を越えて中身を確かめられる（superuser か BYPASSRLS）',
        'はい', CASE WHEN can_bypass THEN 'はい（' || current_user || '）' ELSE 'いいえ（' || current_user || '）' END, can_bypass);

    can_switch := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
              AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
              AND pg_has_role(current_user, 'authenticated', 'MEMBER')
              AND pg_has_role(current_user, 'anon', 'MEMBER');
    log := pg_temp.add(log, '前提: authenticated・anon に切り替えられる',
        'はい', CASE WHEN can_switch THEN 'はい' ELSE 'いいえ' END, can_switch);

    ready := to_regclass('public.consents') IS NOT NULL
         AND to_regclass('public.member_diseases') IS NOT NULL
         AND to_regclass('public.member_profiles') IS NOT NULL
         AND (SELECT count(*) FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'member_profiles'
                 AND column_name IN ('registrant_type', 'proxy_relation', 'patient_is_minor')) = 3;
    log := pg_temp.add(log, '前提: consents・member_diseases・member_profiles と登録する方の 3 列がある（migration 適用済み）',
        'ある', CASE WHEN ready THEN 'ある' ELSE '無い' END, ready);

    IF NOT (can_bypass AND can_switch AND ready) THEN
        log := pg_temp.add(log, '中止: 前提がそろわないので 1〜4・6〜11 は行わない', '前提がそろう', 'そろわない', false);
    ELSE
        BEGIN
            -- -----------------------------------------------------------------
            -- 準備: 前回の残りを消し、テスト会員 A・B を作る
            -- -----------------------------------------------------------------
            DELETE FROM auth.users WHERE id IN (a, b);
            INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES
                ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated',
                 'verify-consents-a@example.invalid', '{}', '{}', now(), now()),
                ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated',
                 'verify-consents-b@example.invalid', '{}', '{}', now(), now());

            log := pg_temp.expect_rows(log, '準備: なりすましが効く（A として auth.uid() が A を返す）',
                'authenticated', a, format('SELECT 1 WHERE auth.uid() = %L::uuid', a), 1);

            -- プロフィールは本人として作る（アプリと同じ経路）
            log := pg_temp.expect_rows(log, '準備: A が自分のプロフィールを作れる', 'authenticated', a,
                format($s$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
                          VALUES (%L, '検証 A', '検証A', '30代', '答えない', '東京都')$s$, a), 1);
            log := pg_temp.expect_rows(log, '準備: B が自分のプロフィールを作れる', 'authenticated', b,
                format($s$INSERT INTO public.member_profiles (user_id, full_name, display_name, age_band, gender, prefecture)
                          VALUES (%L, '検証 B', '検証B', '40代', '答えない', '大阪府')$s$, b), 1);
            SELECT consented_at INTO pa FROM public.member_profiles WHERE user_id = a;
            SELECT consented_at INTO pb FROM public.member_profiles WHERE user_id = b;

            -- -----------------------------------------------------------------
            -- 4. 移行（member_profiles.consented_at → consents の base 版 1）を 2 回流す
            --    20260928_consents.sql の INSERT と同じ文に、テスト会員だけに絞る条件を 1 つ足したもの
            -- -----------------------------------------------------------------
            SELECT count(*) INTO cnt FROM public.consents WHERE user_id IN (a, b);
            log := pg_temp.add(log, '移行: 流す前、テスト会員の consents は無い', '0 行', cnt || ' 行', cnt = 0);

            INSERT INTO public.consents (user_id, kind, version, consented_at)
            SELECT mp.user_id, 'base', 1, mp.consented_at
            FROM public.member_profiles mp
            WHERE NOT EXISTS (
                SELECT 1 FROM public.consents c
                WHERE c.user_id = mp.user_id AND c.kind = 'base'
            )
              AND mp.user_id IN (a, b);
            GET DIAGNOSTICS n1 = ROW_COUNT;

            INSERT INTO public.consents (user_id, kind, version, consented_at)
            SELECT mp.user_id, 'base', 1, mp.consented_at
            FROM public.member_profiles mp
            WHERE NOT EXISTS (
                SELECT 1 FROM public.consents c
                WHERE c.user_id = mp.user_id AND c.kind = 'base'
            )
              AND mp.user_id IN (a, b);
            GET DIAGNOSTICS n2 = ROW_COUNT;

            log := pg_temp.add(log, '移行: 1 回目で足される行（テスト会員 2 人）', '2 行', n1 || ' 行', n1 = 2);
            log := pg_temp.add(log, '移行: 2 回目で足される行（同じ結果）', '0 行', n2 || ' 行', n2 = 0);

            SELECT count(*) INTO cnt FROM public.consents WHERE user_id IN (a, b) AND kind = 'base' AND version = 1;
            log := pg_temp.add(log, '移行: 2 回流した後の base 版 1 の行（1 人 1 行）', '2 行', cnt || ' 行', cnt = 2);

            SELECT count(*) INTO cnt
            FROM public.consents c JOIN public.member_profiles mp ON mp.user_id = c.user_id
            WHERE c.user_id IN (a, b) AND c.kind = 'base' AND c.consented_at = mp.consented_at;
            log := pg_temp.add(log, '移行: consents.consented_at が member_profiles.consented_at と同じ', '2 行', cnt || ' 行', cnt = 2);

            SELECT consented_at INTO pa2 FROM public.member_profiles WHERE user_id = a;
            SELECT consented_at INTO pb2 FROM public.member_profiles WHERE user_id = b;
            log := pg_temp.add(log, '移行: member_profiles.consented_at は変わらない（後方互換）', '変わらない',
                CASE WHEN pa2 = pa AND pb2 = pb THEN '変わらない' ELSE '変わった' END, pa2 = pa AND pb2 = pb);

            -- -----------------------------------------------------------------
            -- 準備: A・B が本人として研究・治験の案内に同意し、病気を 1 つ選ぶ
            -- -----------------------------------------------------------------
            log := pg_temp.expect_rows(log, '準備: A が自分の同意（research_contact）を作れる', 'authenticated', a,
                format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'research_contact', 1)$s$, a), 1);
            log := pg_temp.expect_rows(log, '準備: B が自分の同意（research_contact）を作れる', 'authenticated', b,
                format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'research_contact', 1)$s$, b), 1);
            log := pg_temp.expect_rows(log, '準備: A が自分の病気を選べる', 'authenticated', a,
                format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name) VALUES (%L, 0, '検証用の病名 A')$s$, a), 1);
            log := pg_temp.expect_rows(log, '準備: B が自分の病気を選べる', 'authenticated', b,
                format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name) VALUES (%L, 0, '検証用の病名 B')$s$, b), 1);
            SELECT id INTO a_rc FROM public.consents WHERE user_id = a AND kind = 'research_contact';

            -- -----------------------------------------------------------------
            -- 1. 本人以外の行
            -- -----------------------------------------------------------------
            log := pg_temp.expect_rows(log, '本人: A は自分の consents が見える（base と research_contact）', 'authenticated', a,
                format('SELECT 1 FROM public.consents WHERE user_id = %L', a), 2);
            log := pg_temp.expect_rows(log, '本人: A は自分の member_diseases が見える', 'authenticated', a,
                format('SELECT 1 FROM public.member_diseases WHERE user_id = %L', a), 1);
            log := pg_temp.expect_rows(log, '本人以外: A から B の consents が見えない', 'authenticated', a,
                format('SELECT 1 FROM public.consents WHERE user_id = %L', b), 0);
            log := pg_temp.expect_rows(log, '本人以外: A から B の member_diseases が見えない', 'authenticated', a,
                format('SELECT 1 FROM public.member_diseases WHERE user_id = %L', b), 0);
            log := pg_temp.expect_rows(log, '本人以外: A から全件を読んでも自分の consents だけ', 'authenticated', a,
                'SELECT 1 FROM public.consents', 2);
            log := pg_temp.expect_rows(log, '本人以外: A が B の consents を取り消せない（0 行に効く）', 'authenticated', a,
                format('UPDATE public.consents SET withdrawn_at = now() WHERE user_id = %L', b), 0);
            log := pg_temp.expect_rows(log, '本人以外: A が B の member_diseases を消せない（0 行に効く）', 'authenticated', a,
                format('DELETE FROM public.member_diseases WHERE user_id = %L', b), 0);

            SELECT count(*) INTO cnt FROM public.consents WHERE user_id = b AND withdrawn_at IS NULL;
            log := pg_temp.add(log, '本人以外: その後も B の同意は取り消されていない', '2 行', cnt || ' 行', cnt = 2);
            SELECT count(*) INTO cnt FROM public.member_diseases WHERE user_id = b;
            log := pg_temp.add(log, '本人以外: その後も B の病気は残っている', '1 行', cnt || ' 行', cnt = 1);

            log := pg_temp.expect_error(log, '本人以外: A が B の名義で consents を作れない', 'authenticated', a,
                format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'research_contact', 1)$s$, b), '42501');
            log := pg_temp.expect_error(log, '本人以外: A が B の名義で member_diseases を作れない', 'authenticated', a,
                format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name) VALUES (%L, 1, 'x')$s$, b), '42501');

            -- -----------------------------------------------------------------
            -- 2. consents の変更（A が自分の research_contact の行で試す）
            -- -----------------------------------------------------------------
            log := pg_temp.expect_error(log, 'consents: version は変えられない', 'authenticated', a,
                format('UPDATE public.consents SET version = 2 WHERE id = %L', a_rc), '42501');
            log := pg_temp.expect_error(log, 'consents: kind は変えられない', 'authenticated', a,
                format($s$UPDATE public.consents SET kind = 'stats' WHERE id = %L$s$, a_rc), '42501');
            log := pg_temp.expect_error(log, 'consents: consented_at は変えられない', 'authenticated', a,
                format($s$UPDATE public.consents SET consented_at = '2000-01-01' WHERE id = %L$s$, a_rc), '42501');
            log := pg_temp.expect_error(log, 'consents: user_id は変えられない', 'authenticated', a,
                format('UPDATE public.consents SET user_id = %L WHERE id = %L', b, a_rc), '42501');
            log := pg_temp.expect_error(log, 'consents: 本人も delete できない', 'authenticated', a,
                format('DELETE FROM public.consents WHERE id = %L', a_rc), '42501');
            log := pg_temp.expect_error(log, 'consents: consented_at を指定して作れない（過去の日付の同意を作れない）', 'authenticated', a,
                format($s$INSERT INTO public.consents (user_id, kind, version, consented_at) VALUES (%L, 'stats', 1, '2000-01-01')$s$, a), '42501');
            log := pg_temp.expect_error(log, 'member_diseases: update できない（選び直しは消してから入れる）', 'authenticated', a,
                format($s$UPDATE public.member_diseases SET disease_name = 'x' WHERE user_id = %L$s$, a), '42501');

            log := pg_temp.expect_rows(log, 'consents: withdrawn_at は立てられる', 'authenticated', a,
                format($s$UPDATE public.consents SET withdrawn_at = '2000-01-01' WHERE id = %L$s$, a_rc), 1);
            SELECT withdrawn_at, consented_at INTO w, c_at FROM public.consents WHERE id = a_rc;
            log := pg_temp.add(log, 'consents: withdrawn_at は送った値（2000-01-01）でなく実行時刻になる', '実行時刻',
                w::text, w IS NOT NULL AND w >= c_at AND w > '2000-01-02'::timestamptz);

            log := pg_temp.expect_error(log, 'consents: withdrawn_at は NULL に戻せない', 'authenticated', a,
                format('UPDATE public.consents SET withdrawn_at = NULL WHERE id = %L', a_rc), 'P0001');
            log := pg_temp.expect_error(log, 'consents: withdrawn_at は立て直せない', 'authenticated', a,
                format('UPDATE public.consents SET withdrawn_at = now() WHERE id = %L', a_rc), 'P0001');
            SELECT withdrawn_at INTO w2 FROM public.consents WHERE id = a_rc;
            log := pg_temp.add(log, 'consents: 戻そうとした後も withdrawn_at は最初の値のまま', w::text, w2::text, w2 = w);

            -- -----------------------------------------------------------------
            -- 3. anon（未ログイン）
            -- -----------------------------------------------------------------
            log := pg_temp.expect_error(log, 'anon: consents を読めない', 'anon', NULL,
                'SELECT 1 FROM public.consents', '42501');
            log := pg_temp.expect_error(log, 'anon: consents を作れない', 'anon', NULL,
                format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'base', 1)$s$, a), '42501');
            log := pg_temp.expect_error(log, 'anon: consents を変えられない', 'anon', NULL,
                'UPDATE public.consents SET withdrawn_at = now()', '42501');
            log := pg_temp.expect_error(log, 'anon: consents を消せない', 'anon', NULL,
                'DELETE FROM public.consents', '42501');
            log := pg_temp.expect_error(log, 'anon: member_diseases を読めない', 'anon', NULL,
                'SELECT 1 FROM public.member_diseases', '42501');
            log := pg_temp.expect_error(log, 'anon: member_diseases を作れない', 'anon', NULL,
                format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name) VALUES (%L, 1, 'x')$s$, a), '42501');
            log := pg_temp.expect_error(log, 'anon: member_diseases を変えられない', 'anon', NULL,
                $s$UPDATE public.member_diseases SET disease_name = 'x'$s$, '42501');
            log := pg_temp.expect_error(log, 'anon: member_diseases を消せない', 'anon', NULL,
                'DELETE FROM public.member_diseases', '42501');

            -- -----------------------------------------------------------------
            -- 6. 性別の制約
            -- -----------------------------------------------------------------
            SELECT count(*), string_agg(pg_get_constraintdef(con.oid), ' / ')
              INTO cnt, defs
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
            WHERE con.conrelid = 'public.member_profiles'::regclass AND con.contype = 'c' AND att.attname = 'gender';
            log := pg_temp.add(log, '性別: gender に掛かる CHECK は 1 つだけ', '1 個', cnt || ' 個（' || COALESCE(defs, 'なし') || '）', cnt = 1);
            log := pg_temp.add(log, '性別: CHECK の値は「男性・女性・答えない」で「その他」を含まない', '男性・女性・答えない',
                COALESCE(defs, 'なし'),
                defs LIKE '%男性%' AND defs LIKE '%女性%' AND defs LIKE '%答えない%' AND defs NOT LIKE '%その他%');

            SELECT count(*) INTO cnt FROM public.member_profiles WHERE gender = 'その他';
            log := pg_temp.add(log, '性別: 「その他」の行が無い（実データも含む。数えるだけ）', '0 行', cnt || ' 行', cnt = 0);

            log := pg_temp.expect_error(log, '性別: 本人も「その他」にはできない', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET gender = 'その他' WHERE user_id = %L$s$, a), '23514');
            log := pg_temp.expect_rows(log, '性別: 本人は「男性」にできる', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET gender = '男性' WHERE user_id = %L$s$, a), 1);

            -- -----------------------------------------------------------------
            -- 7. 登録する方の列
            -- -----------------------------------------------------------------
            SELECT count(*) INTO cnt FROM public.member_profiles
            WHERE user_id IN (a, b) AND registrant_type = 'self' AND proxy_relation IS NULL AND patient_is_minor IS NULL;
            log := pg_temp.add(log, '登録する方: 列を指定せずに作った行は本人（self）で、続柄と「18歳未満か」は空', '2 行', cnt || ' 行', cnt = 2);

            SELECT count(*) INTO cnt FROM public.member_profiles
            WHERE registrant_type IS NULL
               OR (registrant_type = 'self' AND (proxy_relation IS NOT NULL OR patient_is_minor IS NOT NULL));
            log := pg_temp.add(log, '登録する方: 本人の行に代理の項目が入っていない（実データも含む。数えるだけ）', '0 行', cnt || ' 行', cnt = 0);

            log := pg_temp.expect_error(log, '登録する方: self・proxy 以外にはできない', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET registrant_type = 'other' WHERE user_id = %L$s$, a), '23514');
            log := pg_temp.expect_error(log, '登録する方: 代理にするなら続柄と「18歳未満か」が要る', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET registrant_type = 'proxy' WHERE user_id = %L$s$, a), '23514');
            log := pg_temp.expect_error(log, '登録する方: 本人のまま続柄だけ入れられない', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET proxy_relation = '親' WHERE user_id = %L$s$, a), '23514');
            log := pg_temp.expect_error(log, '登録する方: 続柄は「親・配偶者・子・その他」だけ', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET registrant_type = 'proxy', proxy_relation = '友人', patient_is_minor = true WHERE user_id = %L$s$, a), '23514');
            log := pg_temp.expect_rows(log, '登録する方: 代理（親・18歳未満）にできる', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET registrant_type = 'proxy', proxy_relation = '親', patient_is_minor = true WHERE user_id = %L$s$, a), 1);
            log := pg_temp.expect_rows(log, '本人以外: A が B のプロフィールを変えられない（0 行に効く）', 'authenticated', a,
                format($s$UPDATE public.member_profiles SET gender = '女性' WHERE user_id = %L$s$, b), 0);

            -- -----------------------------------------------------------------
            -- 8. 移行（20260929_member_profiles_registrant.sql）の冪等性
            --    もう一度流して形を比べ、確かめた後で巻き戻す（この区間の変更は残らない）
            -- -----------------------------------------------------------------
            s1 := pg_temp.profile_shape(a, b);
            BEGIN
                EXECUTE mig;
                log := pg_temp.add(log, '移行（登録する方）: もう一度流してもエラーにならない', '通る', '通った', true);
                s2 := pg_temp.profile_shape(a, b);
                log := pg_temp.add(log, '移行（登録する方）: もう一度流しても制約・列・行が変わらない', '変わらない',
                    CASE WHEN s2 IS NOT DISTINCT FROM s1 THEN '変わらない' ELSE '変わった（前: ' || COALESCE(s1, 'NULL') || ' ／ 後: ' || COALESCE(s2, 'NULL') || '）' END,
                    s2 IS NOT DISTINCT FROM s1);
                RAISE EXCEPTION 'verify_consents_rollback';
            EXCEPTION WHEN OTHERS THEN
                IF SQLERRM <> 'verify_consents_rollback' THEN
                    log := pg_temp.add(log, '移行（登録する方）: もう一度流してもエラーにならない', '通る',
                        'エラー ' || SQLSTATE || '（' || SQLERRM || '）', false);
                END IF;
            END;
            s3 := pg_temp.profile_shape(a, b);
            log := pg_temp.add(log, '移行（登録する方）: 確かめるために流した分は巻き戻した', '元のまま',
                CASE WHEN s3 IS NOT DISTINCT FROM s1 THEN '元のまま' ELSE '違う' END, s3 IS NOT DISTINCT FROM s1);

            -- -----------------------------------------------------------------
            -- 9. base 版 3（20261017_consent_base_v3.sql）
            --    この時点で A・B の base は、移行で入れた版 1 だけ
            -- -----------------------------------------------------------------
            IF to_regprocedure('public.consent_current_version(text)') IS NULL
               OR to_regprocedure('public.has_current_consent(text)') IS NULL THEN
                log := pg_temp.add(log, 'base 版 3: consent_current_version・has_current_consent がある', 'ある', '無い（20261017 が未適用）', false);
            ELSE
                log := pg_temp.add(log, 'base 版 3: いまの版は base 3・research_contact 1・stats と journey は NULL（案）',
                    '3 / 1 / NULL / NULL',
                    concat_ws(' / ', COALESCE(public.consent_current_version('base')::text, 'NULL'),
                                     COALESCE(public.consent_current_version('research_contact')::text, 'NULL'),
                                     COALESCE(public.consent_current_version('stats')::text, 'NULL'),
                                     COALESCE(public.consent_current_version('journey')::text, 'NULL')),
                    public.consent_current_version('base') = 3
                    AND public.consent_current_version('research_contact') = 1
                    AND public.consent_current_version('stats') IS NULL
                    AND public.consent_current_version('journey') IS NULL);

                log := pg_temp.expect_rows(log, 'base 版 3: 版 1 にしか同意していない A は、いまの版に同意していない（再同意が要る）', 'authenticated', a,
                    $s$SELECT 1 WHERE NOT public.has_current_consent('base')$s$, 1);
                log := pg_temp.expect_rows(log, 'base 版 3: A が版 3 に同意できる', 'authenticated', a,
                    format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'base', 3)$s$, a), 1);
                log := pg_temp.expect_rows(log, 'base 版 3: 版 3 に同意した A は、いまの版に同意している', 'authenticated', a,
                    $s$SELECT 1 WHERE public.has_current_consent('base')$s$, 1);
                log := pg_temp.expect_rows(log, 'base 版 3: A が版 3 に同意しても、B（版 1 だけ）はいまの版に同意していない', 'authenticated', b,
                    $s$SELECT 1 WHERE NOT public.has_current_consent('base')$s$, 1);
                log := pg_temp.expect_rows(log, 'base 版 3: 旧い版（版 1）の行は消えずに残る（同意の履歴）', 'authenticated', a,
                    $s$SELECT 1 FROM public.consents WHERE kind = 'base' AND version = 1$s$, 1);
                log := pg_temp.expect_error(log, 'base 版 3: anon は has_current_consent を呼べない', 'anon', NULL,
                    $s$SELECT public.has_current_consent('base')$s$, '42501');
                log := pg_temp.expect_error(log, 'base 版 3: anon は consent_current_version を呼べない', 'anon', NULL,
                    $s$SELECT public.consent_current_version('base')$s$, '42501');

                SELECT count(*) INTO cnt
                FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
                WHERE ns.nspname = 'public'
                  AND p.proname IN ('consent_current_version', 'has_current_consent')
                  AND NOT p.prosecdef
                  AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%');
                log := pg_temp.add(log, 'base 版 3: 2 つの関数は SECURITY INVOKER で search_path を固定している', '2 個', cnt || ' 個', cnt = 2);
            END IF;

            -- -----------------------------------------------------------------
            -- 10. 同意の種類 wish（20261021_consent_wish.sql）
            -- -----------------------------------------------------------------
            SELECT pg_get_constraintdef(con.oid) INTO defs
            FROM pg_constraint con
            WHERE con.conrelid = 'public.consents'::regclass AND con.conname = 'consents_kind_check';
            IF defs IS NULL OR defs NOT LIKE '%wish%' THEN
                log := pg_temp.add(log, 'wish: consents の kind の CHECK に wish がある', 'ある',
                    COALESCE(defs, '制約なし') || '（20261021 が未適用）', false);
            ELSE
                log := pg_temp.add(log, 'wish: consents の kind の CHECK に wish がある', 'ある', defs, true);
                log := pg_temp.add(log, 'wish: いまの版は 1', '1',
                    COALESCE(public.consent_current_version('wish')::text, 'NULL'), public.consent_current_version('wish') = 1);
                log := pg_temp.expect_rows(log, 'wish: A は自分の wish 版 1 の同意を作れる', 'authenticated', a,
                    format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'wish', 1)$s$, a), 1);
                log := pg_temp.expect_rows(log, 'wish: A は wish のいまの版に同意している', 'authenticated', a,
                    $s$SELECT 1 WHERE public.has_current_consent('wish')$s$, 1);
                log := pg_temp.expect_error(log, 'wish: A が B の名義で wish の同意を作れない', 'authenticated', a,
                    format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'wish', 1)$s$, b), '42501');
                log := pg_temp.expect_error(log, 'wish: 知らない種類は作れない（CHECK）', 'authenticated', a,
                    format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'other', 1)$s$, a), '23514');
                log := pg_temp.expect_rows(log, 'wish: wish を足しても、B（wish なし）は wish に同意していない', 'authenticated', b,
                    $s$SELECT 1 WHERE NOT public.has_current_consent('wish')$s$, 1);
                log := pg_temp.expect_rows(log, 'wish: wish を足しても、base のいまの版の判定は変わらない（A は 9 で版 3 に同意済み）', 'authenticated', a,
                    $s$SELECT 1 WHERE public.has_current_consent('base')$s$, 1);
            END IF;

            -- -----------------------------------------------------------------
            -- 11. research_contact 版 2（20261029_consent_research_contact_v2.sql）
            --    この時点で B は research_contact 版 1 に同意している（準備で入れた。取り消していない）
            -- -----------------------------------------------------------------
            IF to_regprocedure('public.is_trial_audience(text)') IS NULL
               OR to_regclass('public.disease_catalog') IS NULL
               OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fill_member_disease_id' AND NOT tgisinternal) THEN
                log := pg_temp.add(log, 'research_contact 版 2: is_trial_audience・disease_catalog・fill_member_disease_id がある', 'ある',
                    '無い（20261023・20261024・20261029 のどれかが未適用）', false);
            ELSE
                log := pg_temp.add(log, 'research_contact 版 2: いまの版は 2', '2',
                    COALESCE(public.consent_current_version('research_contact')::text, 'NULL'),
                    public.consent_current_version('research_contact') = 2);

                SELECT dc.disease_id, dc.idx, dc.name INTO cat_id, cat_idx, cat_name
                FROM public.disease_catalog dc ORDER BY dc.disease_id LIMIT 1;

                log := pg_temp.expect_rows(log, 'research_contact 版 2: B が病気を選べる（idx と名前だけを送る）', 'authenticated', b,
                    format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name) VALUES (%L, %s, %L)$s$, b, cat_idx, cat_name), 1);
                SELECT md.disease_id INTO defs FROM public.member_diseases md WHERE md.user_id = b AND md.disease_name = cat_name;
                log := pg_temp.add(log, 'research_contact 版 2: 入れた行の disease_id をトリガーが埋める', cat_id, COALESCE(defs, 'NULL'), defs = cat_id);
                log := pg_temp.expect_error(log, 'research_contact 版 2: 会員は disease_id を自分で指定して入れられない（列の権限）', 'authenticated', b,
                    format($s$INSERT INTO public.member_diseases (user_id, disease_idx, disease_name, disease_id) VALUES (%L, 0, 'x', %L)$s$, b, cat_id), '42501');

                log := pg_temp.expect_rows(log, 'research_contact 版 2: 版 1 だけの B には、その病気の案件が見えない', 'authenticated', b,
                    format($s$SELECT 1 WHERE NOT public.is_trial_audience(%L)$s$, cat_id), 1);
                log := pg_temp.expect_rows(log, 'research_contact 版 2: B が版 2 に同意できる', 'authenticated', b,
                    format($s$INSERT INTO public.consents (user_id, kind, version) VALUES (%L, 'research_contact', 2)$s$, b), 1);
                log := pg_temp.expect_rows(log, 'research_contact 版 2: 版 2 に同意した B には見える', 'authenticated', b,
                    format($s$SELECT 1 WHERE public.is_trial_audience(%L)$s$, cat_id), 1);
                log := pg_temp.expect_rows(log, 'research_contact 版 2: その病気を選んでいない A には見えない', 'authenticated', a,
                    format($s$SELECT 1 WHERE NOT public.is_trial_audience(%L)$s$, cat_id), 1);
                log := pg_temp.expect_error(log, 'research_contact 版 2: 会員は fill_member_disease_id を直接呼べない', 'authenticated', b,
                    $s$SELECT public.fill_member_disease_id()$s$, NULL);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- この区間の書き込み（テスト会員を含む）は巻き戻る
            log := pg_temp.add(log, '途中で止まった（この後の 1〜4・6〜11 の項目は未確認）', '止まらない',
                SQLSTATE || ': ' || SQLERRM, false);
        END;
    END IF;

    -- -------------------------------------------------------------------------
    -- 5. SECURITY DEFINER 関数
    -- -------------------------------------------------------------------------
    SELECT p.prosecdef INTO secdef
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.proname = 'consents_guard_withdrawal';
    log := pg_temp.add(log, '関数: トリガー関数 consents_guard_withdrawal は SECURITY INVOKER', 'INVOKER',
        CASE WHEN secdef IS NULL THEN '無い' WHEN secdef THEN 'DEFINER' ELSE 'INVOKER' END, secdef IS FALSE);

    FOR f IN
        SELECT p.oid, p.oid::regprocedure::text AS sig, p.proconfig, p.proacl, p.proowner
        FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
        WHERE ns.nspname = 'public'
          AND p.prosecdef
          AND p.prosrc ~* '(consents|member_diseases|member_profiles)'
        ORDER BY 2
    LOOP
        nfunc := nfunc + 1;
        log := pg_temp.add(log, '関数 ' || f.sig || ': search_path を固定している', '固定',
            COALESCE(array_to_string(f.proconfig, ', '), '設定なし'),
            EXISTS (SELECT 1 FROM unnest(f.proconfig) c WHERE c LIKE 'search_path=%'));
        log := pg_temp.add(log, '関数 ' || f.sig || ': anon に EXECUTE が無い', '無い',
            CASE WHEN has_function_privilege('anon', f.oid, 'EXECUTE') THEN 'ある' ELSE '無い' END,
            NOT has_function_privilege('anon', f.oid, 'EXECUTE'));
        log := pg_temp.add(log, '関数 ' || f.sig || ': PUBLIC に EXECUTE が無い', '無い',
            CASE WHEN EXISTS (
                SELECT 1 FROM aclexplode(COALESCE(f.proacl, acldefault('f', f.proowner))) x
                WHERE x.grantee = 0 AND x.privilege_type = 'EXECUTE'
            ) THEN 'ある' ELSE '無い' END,
            NOT EXISTS (
                SELECT 1 FROM aclexplode(COALESCE(f.proacl, acldefault('f', f.proowner))) x
                WHERE x.grantee = 0 AND x.privilege_type = 'EXECUTE'
            ));
    END LOOP;
    IF nfunc = 0 THEN
        log := pg_temp.add(log, '関数: consents・member_diseases・member_profiles に触れる SECURITY DEFINER 関数', '無いか、あれば条件を満たす',
            '無い', true);
    END IF;

    -- -------------------------------------------------------------------------
    -- 後片付け（テスト会員を消す。関連の行は ON DELETE CASCADE で消える）
    -- -------------------------------------------------------------------------
    BEGIN
        DELETE FROM auth.users WHERE id IN (a, b);
        cnt := (SELECT count(*) FROM auth.users WHERE id IN (a, b));
        IF ready THEN
            cnt := cnt
                + (SELECT count(*) FROM public.consents WHERE user_id IN (a, b))
                + (SELECT count(*) FROM public.member_diseases WHERE user_id IN (a, b))
                + (SELECT count(*) FROM public.member_profiles WHERE user_id IN (a, b));
        END IF;
        log := pg_temp.add(log, '後片付け: テストデータが残っていない', '0 行', cnt || ' 行', cnt = 0);
    EXCEPTION WHEN OTHERS THEN
        log := pg_temp.add(log, '後片付け: テストデータが残っていない', '0 行',
            '消せなかった ' || SQLSTATE || ': ' || SQLERRM, false);
    END;

    INSERT INTO verify_consents_results (ord, item, expected, actual, ok)
    SELECT t.ord::int, t.e->>'item', t.e->>'expected', t.e->>'actual', (t.e->>'ok')::boolean
    FROM jsonb_array_elements(log) WITH ORDINALITY AS t(e, ord);
END;
$verify$;

-- 結果（番号 0 が合計）
SELECT 番号, 項目, 期待, 実際, 判定
FROM (
    SELECT 0 AS 番号,
           '合計' AS 項目,
           count(*) || ' 項目がすべて OK' AS 期待,
           count(*) FILTER (WHERE ok) || ' 項目 OK、' || count(*) FILTER (WHERE NOT ok) || ' 項目 NG' AS 実際,
           CASE WHEN bool_and(ok) THEN 'OK' ELSE 'NG' END AS 判定
    FROM verify_consents_results
    UNION ALL
    SELECT ord, item, expected, actual, CASE WHEN ok THEN 'OK' ELSE 'NG' END
    FROM verify_consents_results
) t
ORDER BY 番号;
