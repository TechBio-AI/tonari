-- =============================================================================
-- 道のり調査の集計 journey_summary のしきい値を public.stats_threshold() に差し替える（2026-10-02 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261010（journey_summary）と 20261012（stats_threshold）を当ててから当てる。適用済みの migration は書き換えない。
--
-- 変えるのは、20261010 の journey_summary の本文で 10 を直書きしていた 3 か所だけ:
--   IF v_total < 10       → IF v_total < v_t                （総数がしきい値未満なら 0 行）
--   cells.cnt < 10（2 か所）→ cells.cnt < v_t               （セルを伏せる判定。全体の列と、性別ごとの行）
--   v_t は public.stats_threshold()（いまは 10）。
-- 引数・戻り値・検証の順・補完秘匿・前月までの回答・性別との 2 軸・表示の文字「10未満」・権限は 20261010 と同じ。
-- stats_threshold() が 10 を返す限り、集計の結果は 20261010 と変わらない。
-- 表示の文字「10未満」は直書きのまま（しきい値を変えるときは、この文字と画面・印刷の注記も一緒に直す。
-- docs/stats_disclosure_rules.md「5. しきい値の置き場」）。
--
-- 引数の型が同じなので CREATE OR REPLACE で差し替わり、EXECUTE の権限はそのまま残るが、念のため付け直す。
-- stats_threshold() は PUBLIC・anon・authenticated に EXECUTE が無い（20261012）。journey_summary は SECURITY DEFINER で、
-- 所有者の権限で呼ぶので、会員が直接呼べなくても集計は動く（group_dashboard と同じ）。
-- =============================================================================

DO $$
BEGIN
    IF to_regprocedure('public.stats_threshold()') IS NULL THEN
        RAISE EXCEPTION 'public.stats_threshold() がありません。先に 20261012_group_dashboard.sql を当ててください';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.journey_summary(p_group_id UUID, p_disease_idx INTEGER)
RETURNS TABLE (question TEXT, choice TEXT, sex TEXT, n TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
    v_month    DATE := (date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'))::DATE;
    v_total    INTEGER;
    v_na_total INTEGER;
    -- しきい値は public.stats_threshold()（20261012。値は 10）。表示の文字「10未満」は直書きのまま
    v_t        INTEGER := public.stats_threshold();
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_member(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;

    SELECT count(*), count(*) FILTER (WHERE x.gender = 'no_answer')
      INTO v_total, v_na_total
      FROM public.journey_responses x
     WHERE x.group_id = p_group_id AND x.disease_idx = p_disease_idx AND x.answered_month < v_month;

    IF v_total < v_t THEN
        RETURN;
    END IF;

    question := 'total'; choice := 'total'; sex := 'all'; n := v_total::TEXT;
    RETURN NEXT;

    RETURN QUERY
    WITH r AS (
        SELECT x.* FROM public.journey_responses x
         WHERE x.group_id = p_group_id AND x.disease_idx = p_disease_idx AND x.answered_month < v_month
    ),
    answers AS (  -- 回答 1 つ × 設問 1 つ × 選んだ値 1 つ（性別を添える）
        SELECT r.gender AS g, a.q, a.c
          FROM r
         CROSS JOIN LATERAL (VALUES
             ('respondent', r.respondent), ('birth_year_band', r.birth_year_band), ('gender', r.gender),
             ('region', r.region), ('onset_age_band', r.onset_age_band), ('first_department', r.first_department),
             ('diagnosis_department', r.diagnosis_department), ('facilities_count', r.facilities_count),
             ('departments_count', r.departments_count), ('diagnosis_age_band', r.diagnosis_age_band),
             ('other_diagnosis', r.other_diagnosis), ('family_history_clue', r.family_history_clue),
             ('diagnosis_delay', r.diagnosis_delay)) AS a(q, c)
        UNION ALL
        SELECT r.gender, 'first_symptoms', s FROM r CROSS JOIN LATERAL unnest(r.first_symptoms) AS s
    ),
    qs AS (
        SELECT v.q, v.q_ord, (v.q = 'first_symptoms') AS multi
          FROM (VALUES ('respondent', 1), ('birth_year_band', 2), ('gender', 3), ('region', 4),
                       ('first_symptoms', 5), ('onset_age_band', 6), ('first_department', 7),
                       ('diagnosis_department', 8), ('facilities_count', 9), ('departments_count', 10),
                       ('diagnosis_age_band', 11), ('other_diagnosis', 12), ('family_history_clue', 13),
                       ('diagnosis_delay', 14)) AS v(q, q_ord)
    ),
    sx AS (
        SELECT v.s, v.s_ord FROM (VALUES ('all', 0), ('male', 1), ('female', 2), ('no_answer', 3)) AS v(s, s_ord)
    ),
    cells AS (
        SELECT qs.q, qs.q_ord, qs.multi, o.c, o.c_ord, sx.s, sx.s_ord,
               (SELECT count(*) FROM answers a
                 WHERE a.q = qs.q AND a.c = o.c AND (sx.s = 'all' OR a.g = sx.s))::INTEGER AS cnt
          FROM qs
         CROSS JOIN LATERAL unnest(public.journey_options(qs.q)) WITH ORDINALITY AS o(c, c_ord)
         CROSS JOIN sx
         WHERE sx.s = 'all' OR qs.q <> 'gender'
    ),
    s2 AS (
        SELECT cells.*,
               CASE WHEN cells.s = 'all' THEN cells.cnt < v_t
                    ELSE coalesce(bool_or(cells.cnt < v_t AND (cells.s <> 'no_answer' OR v_na_total > 0))
                                  FILTER (WHERE cells.s <> 'all') OVER (PARTITION BY cells.q, cells.c), false)
               END AS h2
          FROM cells
    ),
    s3 AS (
        SELECT s2.*,
               s2.h2 OR (s2.s = 'all' AND NOT s2.multi AND NOT s2.h2
                         AND count(*) FILTER (WHERE s2.h2) OVER (PARTITION BY s2.q, s2.s) = 1
                         AND row_number() OVER (PARTITION BY s2.q, s2.s, s2.h2 ORDER BY s2.cnt, s2.c_ord) = 1) AS h3
          FROM s2
    ),
    s4 AS (
        SELECT s3.*,
               s3.h3 OR (s3.s <> 'all'
                         AND coalesce(bool_or(s3.h3) FILTER (WHERE s3.s = 'all') OVER (PARTITION BY s3.q, s3.c), false)) AS h4,
               max(s3.cnt) FILTER (WHERE s3.s = 'all') OVER (PARTITION BY s3.q, s3.c) AS all_cnt
          FROM s3
    ),
    s5 AS (
        SELECT s4.*,
               -- 性別ごとの行は 3 つそろって伏せてあるので、男性の列で数える
               (s4.s = 'male' AND NOT s4.multi AND NOT s4.h4
                AND count(*) FILTER (WHERE s4.s = 'male' AND s4.h4) OVER (PARTITION BY s4.q) = 1
                AND row_number() OVER (PARTITION BY s4.q, s4.s, s4.h4 ORDER BY s4.all_cnt, s4.c_ord) = 1) AS pick
          FROM s4
    ),
    fin AS (
        SELECT s5.*,
               s5.h4 OR (s5.s <> 'all' AND bool_or(s5.pick) OVER (PARTITION BY s5.q, s5.c)) AS h
          FROM s5
    )
    SELECT fin.q, fin.c, fin.s, CASE WHEN fin.h THEN '10未満' ELSE fin.cnt::TEXT END
      FROM fin
     ORDER BY fin.q_ord, fin.c_ord, fin.s_ord;
END;
$$;

COMMENT ON FUNCTION public.journey_summary(UUID, INTEGER) IS
'道のり調査の会ごとの集計（会員だけ）。設問ごとと性別との 2 軸。しきい値 stats_threshold() 未満は「10未満」、総数がしきい値未満は 0 行。対応表は読まない';

REVOKE ALL ON FUNCTION public.journey_summary(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.journey_summary(UUID, INTEGER) TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. scripts/portal/verify_journey.sql を、台本を変えずにもう一度流す → 20261010 のときと同じく NG 0 件
--    （stats_threshold() が 10 を返す限り、項目 4 の数・「10未満」の出方は変わらない）
-- 2. このファイルをもう一度流す → エラーにならない
-- =============================================================================
