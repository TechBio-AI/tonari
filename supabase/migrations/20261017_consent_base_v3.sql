-- =============================================================================
-- 同意 base の版 3（2026-10-02 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20260928（consents）・20261010（kind に journey を足した CHECK）の後に当てる。
--
-- 何を変えるか:
--   同意文は lib/portal/consent-texts.ts に版番号付きで置き、consents は版番号だけを持つ（20260928 のまま）。
--   base の文を版 3 にした（利用目的を実態に合わせた。会の場の運営、世話人が見る会ごとの人数の集計〔10人未満は伏せる〕、
--   都道府県は相談窓口の案内と集計に使う、行事の参加表明は本人と世話人だけ）。
--
--   DB には「いまの版」を知る手段がこれまで無かった（いまの版かどうかはアプリの lib/portal/consents.ts だけが判断していた）。
--   このファイルで、SQL の側からも引ける関数を 2 つ置く:
--     public.consent_current_version(kind)  … いまの版番号。同意を記録できない種類（案 draft の stats・journey）は NULL
--     public.has_current_consent(kind)      … ログイン中の本人が、その種類のいまの版に同意していて取り消していないか
--   値は lib/portal/consent-texts.ts の「末尾の版（draft でないもの）」と同じにする。
--   lib/portal/__tests__/consent-texts.test.ts が、このファイルの CASE と consent-texts.ts の食い違いを止める。
--   版を上げるときは、consent-texts.ts に版を足し、新しい migration で consent_current_version を差し替える（このファイルは書き換えない）。
--
-- 行は変えない:
--   既存の会員の base の行（版 1・版 2）はそのまま残る。版 3 の行は作らない（同意したことにしない）。
--   既存の会員は、次に会員ページに入ったとき再同意の画面を通る（app/demo/_lib/session.ts の needsConsent。既存どおり）。
--
-- 権限:
--   どちらも SECURITY INVOKER（呼んだ人の権限で consents を読む。RLS で本人の行しか見えない）。search_path は ''。
--   PUBLIC・anon からは EXECUTE をはがし、authenticated にだけ与える。
-- =============================================================================

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
        ELSE NULL
    END
$$;

COMMENT ON FUNCTION public.consent_current_version(TEXT) IS
'同意の種類ごとのいまの版番号（lib/portal/consent-texts.ts の末尾の版と同じ）。案（draft）の種類は NULL';

CREATE OR REPLACE FUNCTION public.has_current_consent(p_kind TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.consents c
        WHERE c.user_id = auth.uid()
          AND c.kind = p_kind
          AND c.withdrawn_at IS NULL
          AND c.version = public.consent_current_version(p_kind)
    )
$$;

COMMENT ON FUNCTION public.has_current_consent(TEXT) IS
'ログイン中の本人が、その種類のいまの版に同意していて取り消していないか。RLS で本人の行しか読まない（SECURITY INVOKER）';

REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.consent_current_version(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.has_current_consent(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_current_consent(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_current_consent(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること（scripts/portal/verify_consents.sql の「9. base 版 3」でもまとめて確かめる）
--
--   1. select public.consent_current_version('base');  → 3
--   2. 版 2 にしか同意していない会員 A で  select public.has_current_consent('base');  → false
--   3. 会員 A が版 3 に同意した後 → true
--   4. ログアウト（anon）で  select public.has_current_consent('base');  → 権限エラー
-- -----------------------------------------------------------------------------
