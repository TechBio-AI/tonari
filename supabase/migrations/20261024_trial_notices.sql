-- =============================================================================
-- 治験・研究の案内 trial_notices と、会員の反応 notice_interest（共通契約 2026-10-03 の C）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261022（operators・is_operator）と 20261023（disease_catalog・member_diseases.disease_id）の後に当てる。
--
-- 案内の線（2026-10-03 ファウンダー決定）:
--   案内は「公開の登録情報（jRCT・ClinicalTrials.gov）があることを会員に知らせる」ものに限る。
--   本文に出すのは registry_id・summary・登録情報へのリンクだけ。summary は運営が書く中立の要約（疾患・相・対象・実施地域。
--   連絡はリンク先へ）で、薬剤名・製品名・企業名・効果の記述・参加を勧める表現は書かない。
--   画面には「参加するかどうかは主治医と相談してください」を固定文で出す（画面担当）。
--   法的な確認は公開前にファウンダーが専門家に行う（残件。docs/DECISIONS.md）。
--   ★ summary の文言は DB では検査できない（scripts/lint-wording.sh はリポジトリのファイルだけを見る）。
--     運営画面の保存処理で docs/wording-blocklist-demo.txt と同じ検査をかけること（画面担当）。
--
-- 見える人:
--   案件（status = 'published'）は、research_contact の同意が有効（consents に kind = 'research_contact' で
--   withdrawn_at の無い行がある）で、member_diseases にその disease_id を持つ人にだけ、list_my_trial_notices() で見える。
--   anon・ほかの会員には存在も見せない（表を読ませない。関数は対象外の案件を返さない。反応の関数は forbidden で止める）。
--   closed の案件は出さない（notice_interest の行は残す）。draft は運営にしか見えない。
--   運営は表を直接読める（運営画面の一覧のため）。作る・直す・status を変えるのは運営だけで、関数経由だけ。
--
-- 連絡先はどこにも流さない（本人がリンク先に自分で連絡する）。notice_interest は本人の行だけで、
-- 運営は notice_interest_counts() で「関心あり」「見送り」の実数だけを見る（user_id は返さない）。
--
-- Claude Code の判断（契約に無いもの）:
--   - registry_url は https だけ。registry と URL の場所をそろえる（jrct → https://jrct.niph.go.jp/、
--     ctgov → https://clinicaltrials.gov/ か https://www.clinicaltrials.gov/）
--   - 同じ病気に同じ登録番号の案件は 1 件（一意制約 (disease_id, registry, registry_id)）。1 つの試験が複数の病気を
--     対象にするときは、病気ごとに 1 件ずつ作る
--   - created_at を足した（運営画面の並びのため）
--   - published_at は、初めて published にしたときの時刻。closed や draft に戻しても消さない
--   - status はどの値からどの値へも変えられる（closed から published に戻すことも運営ならできる）
--   - 同意の版（consents.version）は問わない（取り消していない research_contact の行があればよい）
--   - 運営の関数の入力の誤り（CHECK・外部キー・一意制約に触れる）は invalid_input で返す
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.trial_notices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_id   TEXT NOT NULL REFERENCES public.disease_catalog (disease_id),
    registry     TEXT NOT NULL CHECK (registry IN ('jrct', 'ctgov')),
    registry_id  TEXT NOT NULL CHECK (btrim(registry_id) <> '' AND char_length(registry_id) <= 50),
    registry_url TEXT NOT NULL CHECK (char_length(registry_url) <= 500 AND registry_url !~ '[[:space:]]'),
    summary      TEXT NOT NULL CHECK (btrim(summary) <> '' AND char_length(summary) <= 2000),
    phase        TEXT CHECK (phase IS NULL OR (btrim(phase) <> '' AND char_length(phase) <= 50)),
    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_by   UUID DEFAULT auth.uid() REFERENCES auth.users ON DELETE SET NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- 登録情報の URL は jRCT か ClinicalTrials.gov だけ。registry と場所をそろえる
    CONSTRAINT trial_notices_registry_url_host CHECK (
        (registry = 'jrct'  AND registry_url ~ '^https://jrct\.niph\.go\.jp/')
     OR (registry = 'ctgov' AND registry_url ~ '^https://(www\.)?clinicaltrials\.gov/')
    ),
    -- published なら published_at がある（一度も公開せずに closed にすることもできる）
    CONSTRAINT trial_notices_published_at CHECK (status <> 'published' OR published_at IS NOT NULL),
    CONSTRAINT trial_notices_one_per_disease UNIQUE (disease_id, registry, registry_id)
);

CREATE INDEX IF NOT EXISTS trial_notices_disease_idx ON public.trial_notices (disease_id, status);

COMMENT ON TABLE public.trial_notices IS
'治験・研究の案内（公開の登録情報があることを知らせるだけ）。運営だけが作る・直す・status を変える（関数経由）。会員は list_my_trial_notices() で、同意と病気が合う published の案件だけを見る';
COMMENT ON COLUMN public.trial_notices.summary IS
'運営が書く中立の要約（疾患・相・対象・実施地域。連絡はリンク先へ）。薬剤名・製品名・企業名・効果の記述・参加を勧める表現は書かない（DB では検査しない。運営画面で検査する）';

CREATE TABLE IF NOT EXISTS public.notice_interest (
    notice_id  UUID NOT NULL REFERENCES public.trial_notices (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    status     TEXT NOT NULL CHECK (status IN ('interested', 'dismissed')),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (notice_id, user_id)
);

COMMENT ON TABLE public.notice_interest IS
'案件への本人の反応（関心あり・見送り）。本人の行だけが見える。書くのは set_notice_interest() だけ。運営は notice_interest_counts() で実数だけを見る';

DROP TRIGGER IF EXISTS set_updated_at ON public.trial_notices;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.trial_notices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.notice_interest;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.notice_interest
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- 2. RLS と権限
--   trial_notices … 運営だけが表を読める。書き込みは関数だけ（insert / update / delete の権限を与えない）
--   notice_interest … 本人の行だけ読める。書き込みは set_notice_interest() だけ
-- =============================================================================
ALTER TABLE public.trial_notices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_interest ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trial_notices   FROM anon, authenticated;
REVOKE ALL ON public.notice_interest FROM anon, authenticated;

DROP POLICY IF EXISTS trial_notices_select_operator ON public.trial_notices;
CREATE POLICY trial_notices_select_operator ON public.trial_notices
    FOR SELECT TO authenticated
    USING (public.is_operator());
GRANT SELECT ON public.trial_notices TO authenticated;

DROP POLICY IF EXISTS notice_interest_select_own ON public.notice_interest;
CREATE POLICY notice_interest_select_own ON public.notice_interest
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
GRANT SELECT ON public.notice_interest TO authenticated;


-- =============================================================================
-- 3. 関数
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_trial_audience(disease_id)（内部用）：呼んだ本人が、その病気の案件を見てよい人か
--   research_contact の同意が有効で、member_diseases にその disease_id を持つ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trial_audience(p_disease_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.consents c
                    WHERE c.user_id = auth.uid() AND c.kind = 'research_contact' AND c.withdrawn_at IS NULL)
       AND EXISTS (SELECT 1 FROM public.member_diseases d
                    WHERE d.user_id = auth.uid() AND d.disease_id = p_disease_id);
$$;

-- -----------------------------------------------------------------------------
-- list_my_trial_notices()：本人に見せてよい published の案件だけ（新しい順）。
--   返すのは registry_id・summary・リンク（と並び・反応のための列）。phase・created_by・内部の列は返さない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_trial_notices()
RETURNS TABLE (
    id           UUID,
    disease_id   TEXT,
    registry     TEXT,
    registry_id  TEXT,
    registry_url TEXT,
    summary      TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    my_status    TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    RETURN QUERY
        SELECT t.id, t.disease_id, t.registry, t.registry_id, t.registry_url, t.summary, t.published_at, i.status
          FROM public.trial_notices t
          LEFT JOIN public.notice_interest i ON i.notice_id = t.id AND i.user_id = auth.uid()
         WHERE t.status = 'published'
           AND public.is_trial_audience(t.disease_id)
         ORDER BY t.published_at DESC, t.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- set_notice_interest(notice_id, status)：本人の反応を付ける・変える（interested / dismissed）。
--   本人に見えていない案件（無い・draft・closed・同意や病気が合わない）は forbidden（存在を区別させない）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_notice_interest(p_notice_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_disease TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('interested', 'dismissed') THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    SELECT t.disease_id INTO v_disease
      FROM public.trial_notices t
     WHERE t.id = p_notice_id AND t.status = 'published';
    IF NOT FOUND OR NOT public.is_trial_audience(v_disease) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    INSERT INTO public.notice_interest AS i (notice_id, user_id, status)
    VALUES (p_notice_id, v_uid, p_status)
    ON CONFLICT (notice_id, user_id) DO UPDATE SET status = EXCLUDED.status
        WHERE i.status IS DISTINCT FROM EXCLUDED.status;
END;
$$;

-- -----------------------------------------------------------------------------
-- notice_interest_counts(notice_id) → (interested, dismissed)：運営だけ。実数。user_id は返さない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notice_interest_counts(p_notice_id UUID)
RETURNS TABLE (interested BIGINT, dismissed BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT count(*) FILTER (WHERE i.status = 'interested'),
               count(*) FILTER (WHERE i.status = 'dismissed')
          FROM public.notice_interest i
         WHERE i.notice_id = p_notice_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- upsert_trial_notice(id, disease_id, registry, registry_id, registry_url, summary, phase) → id：運営だけ。
--   id が NULL なら draft で作る。id があれば中身を直す（status はそのまま。変えるのは set_notice_status）。
--   入力の誤り（制約に触れる・無い病気・同じ登録番号の重複・無い id）は invalid_input
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_trial_notice(
    p_id UUID, p_disease_id TEXT, p_registry TEXT, p_registry_id TEXT, p_registry_url TEXT,
    p_summary TEXT, p_phase TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    BEGIN
        IF p_id IS NULL THEN
            INSERT INTO public.trial_notices (disease_id, registry, registry_id, registry_url, summary, phase, created_by)
            VALUES (p_disease_id, p_registry, btrim(p_registry_id), btrim(p_registry_url), btrim(p_summary),
                    nullif(btrim(coalesce(p_phase, '')), ''), auth.uid())
            RETURNING id INTO v_id;
        ELSE
            UPDATE public.trial_notices
               SET disease_id = p_disease_id, registry = p_registry, registry_id = btrim(p_registry_id),
                   registry_url = btrim(p_registry_url), summary = btrim(p_summary),
                   phase = nullif(btrim(coalesce(p_phase, '')), '')
             WHERE id = p_id
            RETURNING id INTO v_id;
            IF v_id IS NULL THEN
                RAISE EXCEPTION USING MESSAGE = 'invalid_input';
            END IF;
        END IF;
    EXCEPTION
        WHEN check_violation OR not_null_violation OR foreign_key_violation OR unique_violation THEN
            RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END;

    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- set_notice_status(id, status)：運営だけ。draft / published / closed。
--   初めて published にしたときに published_at を立てる（以後は変えない）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_notice_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('draft', 'published', 'closed') THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    UPDATE public.trial_notices
       SET status = p_status,
           published_at = CASE WHEN p_status = 'published' THEN coalesce(published_at, now()) ELSE published_at END
     WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
END;
$$;


-- =============================================================================
-- 4. 関数の実行権限
-- =============================================================================
REVOKE ALL ON FUNCTION public.is_trial_audience(TEXT)                                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_trial_notices()                                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_notice_interest(UUID, TEXT)                               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notice_interest_counts(UUID)                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_trial_notice(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_notice_status(UUID, TEXT)                                 FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_trial_audience(TEXT)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_trial_notices()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notice_interest(UUID, TEXT)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.notice_interest_counts(UUID)                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_trial_notice(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notice_status(UUID, TEXT)                              TO authenticated;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_ops.sql を流す（20261022〜20261026 をすべて当ててから）
-- =============================================================================
