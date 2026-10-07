-- =============================================================================
-- 同意の種類 wish（患者会への参加希望）を足す（2026-10-02 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261010（kind の CHECK に journey を足した）と
--    20261017（consent_current_version・has_current_consent）の後に当てる。
--
-- 何を変えるか:
--   1. consents.kind の CHECK に 'wish' を足す（base / research_contact / stats / journey / wish）
--   2. public.consent_current_version を差し替えて、wish のいまの版 1 を返す（ほかの種類は 20261017 と同じ）
--   文は lib/portal/consent-texts.ts の wish 版 1。参加希望の表（group_wishes）はこのファイルでは作らない（別の担当）。
--   lib/portal/__tests__/consent-texts.test.ts が、consent_current_version を定義している最新の migration と
--   consent-texts.ts の「いまの版」の食い違いを止める。
--
-- 行は変えない。何度流しても同じ結果になる（制約は外してから付け直す。関数は CREATE OR REPLACE）。
-- =============================================================================

-- 1. kind の CHECK（20261010 で consents_kind_check の名前で付け直してある）
ALTER TABLE public.consents DROP CONSTRAINT IF EXISTS consents_kind_check;
ALTER TABLE public.consents
    ADD CONSTRAINT consents_kind_check
    CHECK (kind IN ('base', 'research_contact', 'stats', 'journey', 'wish'));

-- 2. いまの版（20261017 の定義に wish を足した。権限は 20261017 と同じに付け直す）
CREATE OR REPLACE FUNCTION public.consent_current_version(p_kind TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT CASE p_kind
        WHEN 'base' THEN 3
        WHEN 'research_contact' THEN 1
        WHEN 'wish' THEN 1
        ELSE NULL
    END
$$;

COMMENT ON FUNCTION public.consent_current_version(TEXT) IS
'同意の種類ごとのいまの版番号（lib/portal/consent-texts.ts の末尾の版と同じ）。案（draft）の種類は NULL';

REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.consent_current_version(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること（scripts/portal/verify_consents.sql の「10. wish」でもまとめて確かめる）
--
--   1. select pg_get_constraintdef(oid) from pg_constraint where conname = 'consents_kind_check';  → wish を含む
--   2. select public.consent_current_version('wish');  → 1
--   3. 会員 A で  insert into consents(user_id, kind, version) values (auth.uid(), 'wish', 1);  → 1 行
--   4. 会員 A で  insert into consents(user_id, kind, version) values (auth.uid(), 'other', 1);  → CHECK 違反
-- -----------------------------------------------------------------------------
