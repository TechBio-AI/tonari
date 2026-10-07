-- =============================================================================
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
