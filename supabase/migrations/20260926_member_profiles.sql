-- =============================================================================
-- 会員プロフィール member_profiles（2026-09-26 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
--
-- 何のための表か:
--   『となり』の会員層（/demo/community）で、場の運営と医療機関探しの助けに使う 4 項目を持つ。
--   利用目的は docs/DECISIONS.md の 2026-09-26 の項に書いた範囲に限る。
--   製薬会社向けの利用は、将来あらためて別の同意を取るまで行わない。
--
-- 行の境界:
--   本人の行だけ。select / insert / update / delete のすべてで auth.uid() = user_id。
--   他人の行は 1 行も見えない（＝「見えるが書けない」ではなく「そもそも返らない」）。
--   既存の public.profiles（「Public profiles are viewable by everyone」）とは別物。
--   あちらの公開ポリシーを、こちらに持ち込まないこと。
--
-- tenant_id を置かない理由:
--   CLAUDE.md「2. データ分離」の tenant_id は製薬会社テナントの業務データに掛ける規則。
--   この表は会員本人の行で、製薬テナントに属さない。境界は user_id が担う。
--   将来この表を製薬向けに使うことになったら、その時点で設計からやり直す（転用しない）。
--
-- 個人情報の扱い（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   full_name は個人識別子。外部 LLM API（Anthropic 等）へ送らない。
--   疾患名・症状・通院先などの医療情報はこの表に持たない。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 表
--
-- 選択肢は CHECK で表側にも書く。lib/portal/member-profile.ts の定数と同じ値にする。
-- 片方だけ増やすと、画面で選べるのに保存できない（または逆）が起きるので、必ず両方直す。
-- 選択肢を「増やす」のは安全。「消す」と、その値で保存済みの行が CHECK に触れるので消さない。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_profiles (
    user_id      UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,

    -- 本名。会員本人と運営だけが見る。場には出さない
    full_name    TEXT NOT NULL CHECK (btrim(full_name) <> '' AND char_length(full_name) <= 100),
    -- 場に出る名前。本名と同じでも構わない
    display_name TEXT NOT NULL CHECK (btrim(display_name) <> '' AND char_length(display_name) <= 50),

    age_band     TEXT NOT NULL CHECK (age_band IN (
        '10歳未満', '10代', '20代', '30代', '40代', '50代', '60代', '70代', '80歳以上'
    )),
    gender       TEXT NOT NULL CHECK (gender IN ('女性', '男性', 'その他', '答えない')),
    prefecture   TEXT NOT NULL CHECK (prefecture IN (
        '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
        '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
        '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
        '岐阜県', '静岡県', '愛知県', '三重県',
        '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
        '鳥取県', '島根県', '岡山県', '広島県', '山口県',
        '徳島県', '香川県', '愛媛県', '高知県',
        '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
    )),

    -- 利用目的への同意の時刻。最初の保存で立ち、以後は変えない（アプリ側も更新時に送らない）
    consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.member_profiles IS
'『となり』会員のプロフィール。本人の行だけが見える。利用目的は場の運営と医療機関探しの助けに限る（docs/DECISIONS.md 2026-09-26）。製薬向け利用は将来の別同意が要る。';
COMMENT ON COLUMN public.member_profiles.full_name IS
'本名。個人識別子。外部 LLM API へ送らない。場には出さない';
COMMENT ON COLUMN public.member_profiles.display_name IS
'場に出る名前';
COMMENT ON COLUMN public.member_profiles.consented_at IS
'利用目的への同意の時刻。最初の保存で立て、以後は変えない';

-- -----------------------------------------------------------------------------
-- RLS
--
-- ENABLE だけでは、表の所有者（postgres）や BYPASSRLS を持つロールは素通りする。
-- FORCE を付けて所有者にも効かせる（service_role は別枠で、サーバー側の鍵を使う経路には効かない）。
--
-- ポリシーは TO authenticated に限る。anon にはポリシーが 1 つも無い状態にして、
-- 未ログインからは行が 1 行も返らないようにする。
-- -----------------------------------------------------------------------------
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_profiles_select_own ON public.member_profiles;
CREATE POLICY member_profiles_select_own ON public.member_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- with check だけ。insert に using は無い（他人の user_id では作れない）
DROP POLICY IF EXISTS member_profiles_insert_own ON public.member_profiles;
CREATE POLICY member_profiles_insert_own ON public.member_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- using（どの行を更新できるか）と with check（更新後の行）の両方を書く。
-- with check が無いと、自分の行の user_id を他人に書き換えて行を渡せてしまう。
DROP POLICY IF EXISTS member_profiles_update_own ON public.member_profiles;
CREATE POLICY member_profiles_update_own ON public.member_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS member_profiles_delete_own ON public.member_profiles;
CREATE POLICY member_profiles_delete_own ON public.member_profiles
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 未ログイン（anon）には何も与えない。ポリシーが無くても RLS で塞がるが、
-- 「ポリシーを 1 つ足したら急に読めた」を防ぐため、権限の側でも閉じておく
REVOKE ALL ON public.member_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- updated_at
--
-- 00001_create_tables.sql が定義した public.handle_updated_at() を使い回す。
-- consented_at と created_at はここでは触らない（最初の値のまま）。
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.member_profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.member_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること
--
--   1. 会員 A でログインして 1 行作る
--   2. 会員 B でログインして  select * from member_profiles;  → 0 行（A の行は見えない）
--   3. 会員 B で  update member_profiles set full_name='x';  → 0 行更新
--   4. ログアウトして（anon で） select * from member_profiles;  → 0 行かエラー
--   5. 会員 A で user_id を B のものに書き換える update → 失敗する
-- -----------------------------------------------------------------------------
