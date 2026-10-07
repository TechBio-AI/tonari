-- =============================================================================
-- 公開の参加状況 public_disease_participation（共通契約 2026-10-03 の D）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261023（disease_catalog・patient_groups.disease_ids・member_diseases.disease_id・group_wishes.disease_id）と
--   20261012（stats_threshold）の後に当てる。
-- ※ 公開面が読める表に加えること（CLAUDE.md の規範）は、ファウンダーが書く（共通契約 H）。
--
-- 何のための表か:
--   病気ごとに、会員エリアの参加の様子を、伏せた人数で公開する。公開面はこの表だけを読む（元の表は読まない）。
--     members          … その病気を対象にする会（patient_groups.disease_ids に含む）の在籍会員数。
--                        同じ人が複数の会に属していても 1 人と数える
--     research_contact … 研究・治験の案内の「いまの版」（consent_current_version('research_contact')）に同意して取り消しておらず、
--                        その病気を選んでいる（member_diseases.disease_id）人数。案件の可視範囲（20261029 の is_trial_audience）と同じ規則。
--                        版が上がると、新しい版に同意し直すまでその人は数えないので、一時的に数が減る（docs/stats_disclosure_rules.md）
--     wishes           … 患者会への参加希望（group_wishes.disease_id、取り消していないもの）の人数
--   どれも public.stats_threshold()（10）未満は「10未満」（0 を含む）。それ以外は実数。
--   病気ごとに 3 つの数で、足し合わせて別の公開の数になる組は無いので、補完秘匿はかけない（Claude Code の判断）。
--
-- 行の持ち方:
--   disease_catalog のすべての病気に 1 行ずつ持つ（この migration の最後で全病気を作り、
--   disease_catalog に病気が足されたらトリガーで作る）。数が 0 になっても行は消さない（0 と 1〜9 を見分けさせない）。
--   updated_at は 3 つの値のどれかの文字が変わったときだけ変える（「10未満」のまま増減したことを時刻から読ませない）。
--
-- 数え直し（トリガー sync_disease_participation。1 行ごと。変わった病気だけ）:
--   memberships     … その会の対象の病気（patient_groups.disease_ids）
--   patient_groups  … 変更の前後の disease_ids をあわせた病気
--   member_diseases … 前後の disease_id
--   consents        … kind = 'research_contact' の行が変わったとき、その人の member_diseases の病気すべて
--   group_wishes    … 前後の disease_id
--   disease_catalog … 足された病気（行を作る）
--
-- 権限:
--   表は anon と authenticated が全行 SELECT できる。書き込みはトリガーだけ（API ロールに insert / update / delete なし）。
--   数え直しの関数とトリガー関数は SECURITY DEFINER・search_path ''。API から呼ぶものではないので、
--   20261013 のトリガー関数と同じく PUBLIC・anon・authenticated に EXECUTE を与えない。
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.public_disease_participation (
    disease_id       TEXT PRIMARY KEY REFERENCES public.disease_catalog (disease_id) ON DELETE CASCADE,
    members          TEXT NOT NULL CHECK (members = '10未満' OR members ~ '^[0-9]+$'),
    research_contact TEXT NOT NULL CHECK (research_contact = '10未満' OR research_contact ~ '^[0-9]+$'),
    wishes           TEXT NOT NULL CHECK (wishes = '10未満' OR wishes ~ '^[0-9]+$'),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.public_disease_participation IS
'病気ごとの公開の参加状況（在籍会員・研究の案内に同意した人・参加希望）。10 未満は「10未満」。トリガーだけが書く。anon と authenticated が全行読める';

ALTER TABLE public.public_disease_participation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_disease_participation FROM anon, authenticated;

DROP POLICY IF EXISTS public_disease_participation_select_all ON public.public_disease_participation;
CREATE POLICY public_disease_participation_select_all ON public.public_disease_participation
    FOR SELECT TO anon, authenticated
    USING (true);
GRANT SELECT ON public.public_disease_participation TO anon, authenticated;


-- =============================================================================
-- 2. 数え直し（1 つの病気）
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recalc_disease_participation(p_disease_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_t       INTEGER := public.stats_threshold();
    v_members BIGINT;
    v_rc      BIGINT;
    v_wishes  BIGINT;
BEGIN
    IF p_disease_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.disease_catalog c WHERE c.disease_id = p_disease_id) THEN
        RETURN;
    END IF;

    SELECT count(DISTINCT m.user_id) INTO v_members
      FROM public.memberships m
      JOIN public.patient_groups g ON g.id = m.group_id
     WHERE m.left_at IS NULL AND p_disease_id = ANY (g.disease_ids);

    SELECT count(DISTINCT d.user_id) INTO v_rc
      FROM public.member_diseases d
     WHERE d.disease_id = p_disease_id
       AND EXISTS (SELECT 1 FROM public.consents k
                    WHERE k.user_id = d.user_id AND k.kind = 'research_contact' AND k.withdrawn_at IS NULL
                      AND k.version = public.consent_current_version('research_contact'));

    SELECT count(*) INTO v_wishes
      FROM public.group_wishes w
     WHERE w.disease_id = p_disease_id AND w.withdrawn_at IS NULL;

    INSERT INTO public.public_disease_participation AS p (disease_id, members, research_contact, wishes, updated_at)
    VALUES (p_disease_id,
            CASE WHEN v_members < v_t THEN '10未満' ELSE v_members::TEXT END,
            CASE WHEN v_rc      < v_t THEN '10未満' ELSE v_rc::TEXT END,
            CASE WHEN v_wishes  < v_t THEN '10未満' ELSE v_wishes::TEXT END,
            now())
    ON CONFLICT (disease_id) DO UPDATE
        SET members = EXCLUDED.members, research_contact = EXCLUDED.research_contact,
            wishes = EXCLUDED.wishes, updated_at = now()
        WHERE (p.members, p.research_contact, p.wishes)
              IS DISTINCT FROM (EXCLUDED.members, EXCLUDED.research_contact, EXCLUDED.wishes);
END;
$$;

COMMENT ON FUNCTION public.recalc_disease_participation(TEXT) IS
'1 つの病気の公開の参加状況を数え直す（内部用。トリガーとこの migration だけが呼ぶ）';


-- =============================================================================
-- 3. トリガー（変わった病気だけ数え直す）
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_disease_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_ids TEXT[] := ARRAY[]::TEXT[];
    v_id  TEXT;
BEGIN
    IF TG_TABLE_NAME = 'memberships' THEN
        SELECT coalesce(array_agg(DISTINCT x.id), ARRAY[]::TEXT[]) INTO v_ids
          FROM public.patient_groups g
          CROSS JOIN LATERAL unnest(g.disease_ids) AS x(id)
         WHERE g.id IN (CASE WHEN TG_OP <> 'INSERT' THEN OLD.group_id END,
                        CASE WHEN TG_OP <> 'DELETE' THEN NEW.group_id END);

    ELSIF TG_TABLE_NAME = 'patient_groups' THEN
        v_ids := coalesce(CASE WHEN TG_OP <> 'INSERT' THEN OLD.disease_ids END, ARRAY[]::TEXT[])
              || coalesce(CASE WHEN TG_OP <> 'DELETE' THEN NEW.disease_ids END, ARRAY[]::TEXT[]);

    ELSIF TG_TABLE_NAME IN ('member_diseases', 'group_wishes') THEN
        v_ids := ARRAY[CASE WHEN TG_OP <> 'INSERT' THEN OLD.disease_id END,
                       CASE WHEN TG_OP <> 'DELETE' THEN NEW.disease_id END];

    ELSIF TG_TABLE_NAME = 'consents' THEN
        IF (TG_OP <> 'INSERT' AND OLD.kind = 'research_contact')
           OR (TG_OP <> 'DELETE' AND NEW.kind = 'research_contact') THEN
            SELECT coalesce(array_agg(DISTINCT d.disease_id), ARRAY[]::TEXT[]) INTO v_ids
              FROM public.member_diseases d
             WHERE d.user_id IN (CASE WHEN TG_OP <> 'INSERT' THEN OLD.user_id END,
                                 CASE WHEN TG_OP <> 'DELETE' THEN NEW.user_id END)
               AND d.disease_id IS NOT NULL;
        END IF;

    ELSIF TG_TABLE_NAME = 'disease_catalog' THEN
        v_ids := ARRAY[NEW.disease_id];
    END IF;

    FOR v_id IN SELECT DISTINCT u.id FROM unnest(v_ids) AS u(id) WHERE u.id IS NOT NULL LOOP
        PERFORM public.recalc_disease_participation(v_id);
    END LOOP;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_disease_participation ON public.memberships;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT OR UPDATE OR DELETE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();

DROP TRIGGER IF EXISTS sync_disease_participation ON public.patient_groups;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT OR UPDATE OR DELETE ON public.patient_groups
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();

DROP TRIGGER IF EXISTS sync_disease_participation ON public.member_diseases;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT OR UPDATE OR DELETE ON public.member_diseases
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();

DROP TRIGGER IF EXISTS sync_disease_participation ON public.consents;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT OR UPDATE OR DELETE ON public.consents
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();

DROP TRIGGER IF EXISTS sync_disease_participation ON public.group_wishes;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT OR UPDATE OR DELETE ON public.group_wishes
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();

DROP TRIGGER IF EXISTS sync_disease_participation ON public.disease_catalog;
CREATE TRIGGER sync_disease_participation
    AFTER INSERT ON public.disease_catalog
    FOR EACH ROW EXECUTE FUNCTION public.sync_disease_participation();


-- =============================================================================
-- 4. 権限と、全病気の行を作る
-- =============================================================================
REVOKE ALL ON FUNCTION public.recalc_disease_participation(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_disease_participation()       FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
    v_id TEXT;
BEGIN
    FOR v_id IN SELECT c.disease_id FROM public.disease_catalog c ORDER BY c.disease_id LOOP
        PERFORM public.recalc_disease_participation(v_id);
    END LOOP;
END;
$$;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   select count(*) from public_disease_participation;  と  select count(*) from disease_catalog;  が同じ数
--
-- ★ 版を上げたとき（consent_current_version を差し替えたとき）は、数え直しのきっかけ（表の変化）が無いので、
--   research_contact は古い版の数のまま残る。版を上げる migration の最後か SQL エディタで、全病気を数え直すこと:
--     do $$ declare v text; begin
--       for v in select disease_id from public.disease_catalog loop perform public.recalc_disease_participation(v); end loop;
--     end $$;
--   scripts/portal/verify_ops.sql を流す（20261022〜20261026 をすべて当ててから）
-- =============================================================================
