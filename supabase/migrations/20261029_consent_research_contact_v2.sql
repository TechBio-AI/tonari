-- =============================================================================
-- 同意 research_contact（研究・治験の案内）の版 2（2026-10-03 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261021（consent_current_version の最新の定義）と
--    20261024（trial_notices・is_trial_audience）の後に当てる。
--
-- 何を変えるか:
--   1. consent_current_version を差し替えて、research_contact のいまの版を 2 にする（ほかの種類は 20261021 と同じ）
--      文は lib/portal/consent-texts.ts の research_contact 版 2（案件の案内〔共通契約 2026-10-03 の C〕に合わせた:
--      会員エリアに表示する／本人が自分で連絡する／関心の有無の人数だけを運営が数える／企業に個人情報は渡らない）。
--   2. is_trial_audience を差し替えて、research_contact の「いまの版」に同意している人にだけ案件を見せる。
--      20261024 は版を問わなかった（取り消していない行があればよい。同ファイルの「Claude Code の判断」）。
--      版 1 の文には「会員エリアに表示」「関心の人数を数える」が無いので、版 1 の同意だけでは案件を見せない
--      （docs/DECISIONS.md 2026-09-26「いまの版に同意していない会員は、同意していないものとして扱う」）。
--      list_my_trial_notices・set_notice_interest はこの関数を呼ぶので、差し替えだけで両方に効く。
--      ほかの条件（ログイン・member_diseases にその病気がある）は 20261024 のまま。
--   3. member_diseases の insert で disease_id（疾患の固定 ID）を埋めるトリガーを置く。
--      20261023 は列を足していまある行を埋めただけで、「以後の書き込みで disease_id を入れるのは同意担当の 20261029」としていた。
--      アプリ（lib/portal/research-contact.ts）は disease_idx と disease_name だけを送る。会員には disease_id 列の insert 権限が無い
--      （20260928 の列単位の GRANT のまま）ので、DB が idx と名前から決める（20261023 の resolve_disease_id。決まらなければ NULL）。
--      これが無いと、これから同意する人の行は disease_id が NULL のままで、is_trial_audience が合わず案件が見えない。
--      member_diseases に update は無い（選び直しは消して入れ直す）ので、insert だけでよい。
--
-- 行は変えない:
--   既存の版 1 の行はそのまま残す（版 2 の同意を勝手に作らない）。版 1 の会員は、マイページで版 2 に同意し直すまで
--   案件が見えない（アプリ側も lib/portal/consents.ts の consentState で 'outdated' として扱い、同意し直しを求める）。
--   版 1 の会員が付けた notice_interest の行は残る（案件が見えない間は付け替えもできない）。
--
-- 何度流しても同じ結果になる（関数は CREATE OR REPLACE、トリガーは消してから作る。権限は付け直す）。
-- lib/portal/__tests__/consent-texts.test.ts が、consent_current_version を定義している最新の migration（このファイル）と
-- consent-texts.ts の「いまの版」の食い違いを止める。
-- =============================================================================

-- 1. いまの版（20261021 の定義の research_contact を 2 にした）
CREATE OR REPLACE FUNCTION public.consent_current_version(p_kind TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT CASE p_kind
        WHEN 'base' THEN 3
        WHEN 'research_contact' THEN 2
        WHEN 'wish' THEN 1
        ELSE NULL
    END
$$;

COMMENT ON FUNCTION public.consent_current_version(TEXT) IS
'同意の種類ごとのいまの版番号（lib/portal/consent-texts.ts の末尾の版と同じ）。案（draft）の種類は NULL';

REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consent_current_version(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.consent_current_version(TEXT) TO authenticated;

-- 2. 案件を見てよい人（いまの版の research_contact に同意していて、その病気を選んでいる本人）
CREATE OR REPLACE FUNCTION public.is_trial_audience(p_disease_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.consents c
                    WHERE c.user_id = auth.uid()
                      AND c.kind = 'research_contact'
                      AND c.withdrawn_at IS NULL
                      AND c.version = public.consent_current_version('research_contact'))
       AND EXISTS (SELECT 1 FROM public.member_diseases d
                    WHERE d.user_id = auth.uid() AND d.disease_id = p_disease_id);
$$;

REVOKE ALL ON FUNCTION public.is_trial_audience(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trial_audience(TEXT) TO authenticated;

-- 3. member_diseases の insert で disease_id を埋める（20261023 の fill_group_wish_disease_id と同じ形）
--    resolve_disease_id は内部用（authenticated に EXECUTE が無い）なので、トリガー関数は SECURITY DEFINER にする。
--    API からは呼ばせない（PUBLIC・anon・authenticated からはがす。トリガーの発火に呼び出し側の EXECUTE は要らない）
CREATE OR REPLACE FUNCTION public.fill_member_disease_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.disease_id IS NULL THEN
        NEW.disease_id := public.resolve_disease_id(NEW.disease_idx, NEW.disease_name);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_member_disease_id ON public.member_diseases;
CREATE TRIGGER fill_member_disease_id
    BEFORE INSERT ON public.member_diseases
    FOR EACH ROW EXECUTE FUNCTION public.fill_member_disease_id();

REVOKE ALL ON FUNCTION public.fill_member_disease_id() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.member_diseases.disease_id IS
'疾患の固定 ID。insert のときにトリガー fill_member_disease_id が idx と名前から埋める（20261029）。決まらなければ NULL';

-- -----------------------------------------------------------------------------
-- 適用後に、ファウンダーが手で確かめること（scripts/portal/verify_consents.sql の「11. research_contact 版 2」でもまとめて確かめる）
--
--   1. select public.consent_current_version('research_contact');  → 2
--   2. research_contact 版 1 だけの会員 A（その病気を選んでいる）で  select public.is_trial_audience('<disease_id>');  → false
--   3. A が版 2 に同意した後 → true
--   4. 会員 A がマイページで病気を選び直す（member_diseases に insert）→ その行の disease_id が埋まっている
--   5. scripts/portal/verify_ops.sql をもう一度流す（is_trial_audience を差し替えたため。テスト会員の同意の版に注意）
-- -----------------------------------------------------------------------------
