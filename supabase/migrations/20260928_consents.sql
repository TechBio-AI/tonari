-- =============================================================================
-- 同意の記録 consents と、研究・治験の案内の対象疾患 member_diseases（2026-09-26 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20260926_member_profiles.sql の後に当てる（base の移し替えで member_profiles を読む）。
--    ファイル名を 20260928_consents.sql にしたのは、版番号が 20260926 と重ならず、かつ後ろに並ぶようにするため。
-- ※ このファイルを当てる前に、同意の版管理を入れたアプリ（lib/portal/consents.ts）を出さないこと。
--    アプリは consents を読めないとき「同意がいまの版でない」側に倒すので、全会員が再同意の画面で止まる。
--
-- 同意の 3 層（docs/DECISIONS.md 2026-09-26「同意の 3 層と版管理」）:
--   base / research_contact / stats。文は lib/portal/consent-texts.ts に版番号付きで置き、この表は版番号だけを持つ。
--
-- 行の境界:
--   本人の行だけ（auth.uid() = user_id）。anon には何も与えない（member_profiles と同じ閉じ方）。
--   consents は同意の証拠なので、本人も delete できない（退会＝auth.users の削除で CASCADE で消える）。
--   本人ができる変更は withdrawn_at を立てることだけ（列単位の GRANT とトリガーで閉じる）。
--
-- 個人情報の扱い（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   member_diseases は「会員 × 病名」で医療情報に当たる。外部 LLM API（Anthropic 等）へ送らない。
--   公開面はこの 2 表を読まない。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- consents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('base', 'research_contact', 'stats')),
    -- lib/portal/consent-texts.ts の版番号。文はアプリ側から引く
    version      INTEGER NOT NULL CHECK (version >= 1),
    consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- 取り消した時刻。取り消していなければ NULL。立てた後は変えられない（下のトリガー）
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    CHECK (withdrawn_at IS NULL OR withdrawn_at >= consented_at)
);

CREATE INDEX IF NOT EXISTS consents_user_kind_idx ON public.consents (user_id, kind);

COMMENT ON TABLE public.consents IS
'会員の同意の記録（3 層: base / research_contact / stats）。文は lib/portal/consent-texts.ts の版番号で引く。本人の行だけが見える。本人は delete できない。';
COMMENT ON COLUMN public.consents.version IS
'同意した文の版番号（lib/portal/consent-texts.ts）。いまの版と違えば、同意を取り直す';
COMMENT ON COLUMN public.consents.withdrawn_at IS
'取り消した時刻。NULL なら有効。立てた後は変えられない';

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consents_select_own ON public.consents;
CREATE POLICY consents_select_own ON public.consents
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS consents_insert_own ON public.consents;
CREATE POLICY consents_insert_own ON public.consents
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND withdrawn_at IS NULL);

-- 取り消し（withdrawn_at を立てる）のためだけの update。user_id の付け替えは with check で塞ぐ
DROP POLICY IF EXISTS consents_update_own ON public.consents;
CREATE POLICY consents_update_own ON public.consents
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- delete のポリシーは置かない（本人も消せない。同意の証拠を残す）

REVOKE ALL ON public.consents FROM anon;
REVOKE ALL ON public.consents FROM authenticated;
GRANT SELECT ON public.consents TO authenticated;
-- consented_at は既定値（now()）に任せる。本人が過去の日付で同意を作れないよう、列を絞る
GRANT INSERT (user_id, kind, version) ON public.consents TO authenticated;
-- 本人が変えられるのは withdrawn_at だけ
GRANT UPDATE (withdrawn_at) ON public.consents TO authenticated;

-- withdrawn_at は「NULL → 立てる」の一方向だけ。値はアプリから送られたものでなく now() にする
CREATE OR REPLACE FUNCTION public.consents_guard_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.withdrawn_at IS NOT NULL THEN
        RAISE EXCEPTION 'consents: withdrawn_at is already set (id=%)', OLD.id;
    END IF;
    IF NEW.user_id <> OLD.user_id OR NEW.kind <> OLD.kind OR NEW.version <> OLD.version
       OR NEW.consented_at <> OLD.consented_at THEN
        RAISE EXCEPTION 'consents: only withdrawn_at can be changed (id=%)', OLD.id;
    END IF;
    IF NEW.withdrawn_at IS NOT NULL THEN
        NEW.withdrawn_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consents_guard_withdrawal ON public.consents;
CREATE TRIGGER consents_guard_withdrawal
    BEFORE UPDATE ON public.consents
    FOR EACH ROW
    EXECUTE FUNCTION public.consents_guard_withdrawal();

-- -----------------------------------------------------------------------------
-- member_diseases（研究・治験の案内を受け取る病気）
--
-- disease_idx は知識ファイル（data/knowledge/comprehensive_rare_diseases_knowledge.json）の並び順の位置で、
-- 固定 ID ではない（統合・追加でずれる）。同意の対象は disease_name（同意した時点の表示名）で決まる。
-- 案内を送る側は disease_name を正として読むこと。idx から名前を引き直さない。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_diseases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    -- 同意した時点の知識ファイル上の位置（参考。固定 ID ではない）
    disease_idx  INTEGER NOT NULL CHECK (disease_idx >= 0),
    -- 同意した時点の表示名。同意の対象はこちら
    disease_name TEXT NOT NULL CHECK (btrim(disease_name) <> '' AND char_length(disease_name) <= 300),
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, disease_name)
);

COMMENT ON TABLE public.member_diseases IS
'研究・治験の案内（consents.kind = research_contact）の対象の病気。本人の行だけが見える。取り消しで削除する。医療情報なので外部 LLM API へ送らない。';
COMMENT ON COLUMN public.member_diseases.disease_idx IS
'同意した時点の知識ファイル上の位置。固定 ID ではない。名前の引き直しに使わない';
COMMENT ON COLUMN public.member_diseases.disease_name IS
'同意した時点の表示名。同意の対象はこの名前';

ALTER TABLE public.member_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_diseases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_diseases_select_own ON public.member_diseases;
CREATE POLICY member_diseases_select_own ON public.member_diseases
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS member_diseases_insert_own ON public.member_diseases;
CREATE POLICY member_diseases_insert_own ON public.member_diseases
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS member_diseases_delete_own ON public.member_diseases;
CREATE POLICY member_diseases_delete_own ON public.member_diseases
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- update は置かない（選び直しは delete → insert。同意した時点の名前を後から書き換えさせない）

REVOKE ALL ON public.member_diseases FROM anon;
REVOKE ALL ON public.member_diseases FROM authenticated;
GRANT SELECT, DELETE ON public.member_diseases TO authenticated;
GRANT INSERT (user_id, disease_idx, disease_name) ON public.member_diseases TO authenticated;

-- -----------------------------------------------------------------------------
-- 既存の初回同意（member_profiles.consented_at）を consents の base 版 1 に移す
--
-- member_profiles.consented_at は消さない・変えない（後方互換）。
-- 何度当てても同じ結果になるよう、base の行がまだ無い会員だけを足す。
-- 版 1 の文は、2026-09-26 に onboarding で出していた USAGE_PURPOSE_TEXT と同じ（lib/portal/consent-texts.ts）。
-- -----------------------------------------------------------------------------
INSERT INTO public.consents (user_id, kind, version, consented_at)
SELECT mp.user_id, 'base', 1, mp.consented_at
FROM public.member_profiles mp
WHERE NOT EXISTS (
    SELECT 1 FROM public.consents c
    WHERE c.user_id = mp.user_id AND c.kind = 'base'
);

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること
--
--   1. select count(*) from member_profiles;  と
--      select count(*) from consents where kind='base' and version=1;  が同じ数
--   2. 会員 B で  select * from consents;  → B の行だけ（A の行は見えない）
--   3. 会員 A で  delete from consents;  → 権限エラー（本人も消せない）
--   4. 会員 A で  update consents set version=2;  → 権限エラー（withdrawn_at 以外は変えられない）
--   5. 会員 A で  update consents set withdrawn_at='2000-01-01' where ...;  → withdrawn_at は now() になる
--      もう一度 update すると例外（一度立てたら変えられない）
--   6. 会員 A で  insert into consents(user_id,kind,version,consented_at) values(...,'2000-01-01')  → 権限エラー
--   7. 会員 B で  select * from member_diseases;  → B の行だけ
--   8. ログアウト（anon）で 2 表とも 0 行かエラー
-- -----------------------------------------------------------------------------
