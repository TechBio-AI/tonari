-- =============================================================================
-- 道のり調査を疾患ごとに動かす（共通契約 F。2026-10-04 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261010（道のり調査）・20261018（しきい値）・20261023（disease_catalog・patient_groups.disease_ids）の後に当てる。
--   適用済みの migration は書き換えない。
--
-- 設問の組み替え（docs/journey_survey_items.md 改版 2026-10-04）:
--   共通 12 問 … 回答者・生まれた年・性別・地方・症状に気づいた年齢・最初に受診した科・確定診断を受けた科・
--                医療機関の数・診療科の数・確定診断を受けた年齢・別の病名・確定診断までの期間。選択肢は全疾患で同じ
--                （20261010 の journey_options(設問) をそのまま使う）
--   疾患別 2 問 … 最初に気づいた症状（first_symptoms）と、家族の病歴が手がかりか（family_history_clue）。
--                選択肢は疾患ごとに journey_options(disease_id, 設問) で引く。列の名前は変えない
--   選択肢が決まっていない疾患は、疾患別の設問の選択肢が NULL になり、回答を受け付けない（journey_disease_ready）。
--   いま決まっているのはファブリー病（rd00001）だけ。ウィルソン病（rd00028）・OTC 欠損症（rd00157）の選択肢は
--   docs の案のまま（ファウンダーが決めたら、journey_options(TEXT, TEXT) を CREATE OR REPLACE で差し替える）。
--
-- 作るもの・変えるもの:
--   1. journey_responses.disease_id・journey_links.disease_id（disease_catalog を参照）。いまある行は disease_idx から埋める。
--      以後は、どちらか片方だけ渡された行をトリガーが埋める（disease_idx の列は残す。共通契約 A）。
--      journey_links に (user_id, group_id, disease_id) の一意制約を足す。
--   2. journey_options(p_disease_id, p_question) … 共通の設問は 20261010 の journey_options(p_question) と同じ値。
--      疾患別の設問は疾患ごと（未定の疾患は NULL）。journey_disease_ready(p_disease_id) … 疾患別の選択肢がそろっているか。
--   3. 表の CHECK … 最初の症状・家族の病歴の CHECK を、疾患ごとの選択肢で確かめる形に付け直す（ほかの CHECK は 20261010 のまま）。
--   4. submit_journey_response … 疾患を p_disease_id で受ける（p_disease_idx・p_disease_name は受けない。
--      表示名は会の disease_names の同じ位置から取る＝回答した時点の会の表示名）。旧い引数の形は消す。
--   5. my_journey_responses … 戻り値に disease_id を足す（戻り値の形が変わるので、消してから作り直す）。
--   6. journey_summary(p_group_id, p_disease_id) … 会の disease_ids にある病気だけ。数えるのはその病気の回答。
--      選択肢は journey_options(p_disease_id, 設問)。秘匿ルール（しきい値 stats_threshold()・0 を含む 10 未満・補完秘匿・
--      性別の行・前月までの回答・性別との 2 軸）は 20261018 と同じ。旧い引数の形（UUID, INTEGER）は消す。
--
-- 権限: 関数はすべて SECURITY DEFINER・search_path ''（journey_options・journey_disease_ready は SECURITY INVOKER の
--   IMMUTABLE / STABLE。中から使うだけで、API ロールに EXECUTE を与えない）。API から呼ぶ関数は PUBLIC・anon に EXECUTE なし、
--   authenticated にあり（20261010 と同じ）。
--
-- 消すもの: 関数の旧い引数の形 2 つ（submit_journey_response の 18 引数版・journey_summary(UUID, INTEGER)）と
--   my_journey_responses()（作り直す）。表・列は消さない。
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.disease_catalog') IS NULL THEN
        RAISE EXCEPTION 'public.disease_catalog がありません。先に 20261023_disease_catalog.sql を当ててください';
    END IF;
    IF to_regprocedure('public.stats_threshold()') IS NULL THEN
        RAISE EXCEPTION 'public.stats_threshold() がありません。先に 20261012_group_dashboard.sql を当ててください';
    END IF;
END;
$$;


-- =============================================================================
-- 1. disease_id の列
-- =============================================================================
ALTER TABLE public.journey_responses
    ADD COLUMN IF NOT EXISTS disease_id TEXT REFERENCES public.disease_catalog (disease_id);
ALTER TABLE public.journey_links
    ADD COLUMN IF NOT EXISTS disease_id TEXT REFERENCES public.disease_catalog (disease_id);

-- いまある行を disease_idx から埋める（disease_catalog.idx は作成時の位置。道のり調査の idx はファブリー病の 0 だけ）
UPDATE public.journey_responses r SET disease_id = c.disease_id
  FROM public.disease_catalog c
 WHERE r.disease_id IS NULL AND c.idx = r.disease_idx;
UPDATE public.journey_links l SET disease_id = c.disease_id
  FROM public.disease_catalog c
 WHERE l.disease_id IS NULL AND c.idx = l.disease_idx;

-- 埋まらない行があれば止める（推測で埋めない。全体が巻き戻る）
DO $$
DECLARE
    v_r INTEGER;
    v_l INTEGER;
BEGIN
    SELECT count(*) INTO v_r FROM public.journey_responses WHERE disease_id IS NULL;
    SELECT count(*) INTO v_l FROM public.journey_links WHERE disease_id IS NULL;
    IF v_r > 0 OR v_l > 0 THEN
        RAISE EXCEPTION 'disease_id を埋められない行があります（回答 % 行・対応 % 行）。disease_catalog に無い idx です', v_r, v_l;
    END IF;
END;
$$;

ALTER TABLE public.journey_responses ALTER COLUMN disease_id SET NOT NULL;
ALTER TABLE public.journey_links     ALTER COLUMN disease_id SET NOT NULL;

ALTER TABLE public.journey_links DROP CONSTRAINT IF EXISTS journey_links_one_per_user_disease;
ALTER TABLE public.journey_links
    ADD CONSTRAINT journey_links_one_per_user_disease UNIQUE (user_id, group_id, disease_id);

DROP INDEX IF EXISTS public.journey_responses_group_disease_id_idx;
CREATE INDEX journey_responses_group_disease_id_idx ON public.journey_responses (group_id, disease_id);

COMMENT ON COLUMN public.journey_responses.disease_id IS
'回答の対象の病気（disease_catalog の固定 ID）。集計と選択肢はこの列で引く。disease_idx は残す（共通契約 A）';
COMMENT ON COLUMN public.journey_links.disease_id IS
'回答の対象の病気（disease_catalog の固定 ID）。1 人・1 会・1 病気に 1 回答';

-- どちらか片方だけ渡された行を埋める（台本・旧い呼び方が disease_idx だけで入れても動くように）
CREATE OR REPLACE FUNCTION public.journey_fill_disease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.disease_id IS NULL AND NEW.disease_idx IS NOT NULL THEN
        SELECT c.disease_id INTO NEW.disease_id FROM public.disease_catalog c WHERE c.idx = NEW.disease_idx;
    ELSIF NEW.disease_idx IS NULL AND NEW.disease_id IS NOT NULL THEN
        SELECT c.idx INTO NEW.disease_idx FROM public.disease_catalog c WHERE c.disease_id = NEW.disease_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journey_responses_fill_disease ON public.journey_responses;
CREATE TRIGGER journey_responses_fill_disease
    BEFORE INSERT OR UPDATE ON public.journey_responses
    FOR EACH ROW EXECUTE FUNCTION public.journey_fill_disease();
DROP TRIGGER IF EXISTS journey_links_fill_disease ON public.journey_links;
CREATE TRIGGER journey_links_fill_disease
    BEFORE INSERT OR UPDATE ON public.journey_links
    FOR EACH ROW EXECUTE FUNCTION public.journey_fill_disease();


-- =============================================================================
-- 2. 疾患ごとの選択肢
-- =============================================================================
CREATE OR REPLACE FUNCTION public.journey_options(p_disease_id TEXT, p_question TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        -- 疾患別の 2 問（疾患ごと。決まっていない疾患は NULL）
        WHEN p_question IN ('first_symptoms', 'family_history_clue') THEN
            CASE p_disease_id
                -- ファブリー病（決定 2026-10-02。20261010 と同じ値）
                WHEN 'rd00001' THEN
                    CASE p_question
                        WHEN 'first_symptoms' THEN ARRAY[
                            'limb_pain', 'hypohidrosis', 'fatigue', 'digestive', 'neuro', 'cardiac_finding', 'urine_finding',
                            'skin_rash', 'heat_intolerance', 'ear', 'cornea_finding', 'stroke_finding', 'other', 'not_remember',
                            'found_before_symptoms']
                        WHEN 'family_history_clue' THEN ARRAY['yes', 'no', 'unknown']
                    END
            END
        -- 共通の 12 問（全疾患で同じ。20261010 の値）
        ELSE public.journey_options(p_question)
    END::TEXT[];
$$;

COMMENT ON FUNCTION public.journey_options(TEXT, TEXT) IS
'道のり調査の疾患ごとの選択肢。共通の設問は journey_options(設問) と同じ。疾患別の設問は疾患ごと（未定の疾患は NULL）。アプリ側の正は lib/portal/journey-survey.ts';

-- 疾患別の選択肢がそろっているか（そろっていない疾患には回答させない）
CREATE OR REPLACE FUNCTION public.journey_disease_ready(p_disease_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT public.journey_options(p_disease_id, 'first_symptoms') IS NOT NULL
       AND public.journey_options(p_disease_id, 'family_history_clue') IS NOT NULL;
$$;


-- =============================================================================
-- 3. 表の CHECK（最初の症状・家族の病歴を、疾患ごとの選択肢で確かめる）
--
--   20261010 では列に直接 CHECK を書いたので、名前は自動で付いている（journey_responses_first_symptoms_check など）。
--   名前を決め打ちせず、その設問の journey_options(設問) を使う CHECK を外してから、名前付きで付け直す。
--   「症状に気づく前に分かった」との連動（journey_responses_before_symptoms_consistent）は 20261010 のまま。
-- =============================================================================
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
          FROM pg_constraint con
         WHERE con.conrelid = 'public.journey_responses'::regclass
           AND con.contype = 'c'
           AND con.conname <> 'journey_responses_before_symptoms_consistent'
           AND (pg_get_constraintdef(con.oid) LIKE '%journey_options(''first_symptoms''%'
             OR pg_get_constraintdef(con.oid) LIKE '%journey_options(''family_history_clue''%')
    LOOP
        EXECUTE format('ALTER TABLE public.journey_responses DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.journey_responses DROP CONSTRAINT IF EXISTS journey_responses_first_symptoms_by_disease;
ALTER TABLE public.journey_responses
    ADD CONSTRAINT journey_responses_first_symptoms_by_disease CHECK (
        public.journey_options(disease_id, 'first_symptoms') IS NOT NULL
        AND cardinality(first_symptoms) >= 1
        AND array_position(first_symptoms, NULL) IS NULL
        AND first_symptoms <@ public.journey_options(disease_id, 'first_symptoms')
        -- 「症状に気づく前に分かった」は排他（選んだら他は選べない）
        AND (NOT ('found_before_symptoms' = ANY (first_symptoms)) OR cardinality(first_symptoms) = 1));

ALTER TABLE public.journey_responses DROP CONSTRAINT IF EXISTS journey_responses_family_history_clue_by_disease;
ALTER TABLE public.journey_responses
    ADD CONSTRAINT journey_responses_family_history_clue_by_disease CHECK (
        family_history_clue = ANY (coalesce(public.journey_options(disease_id, 'family_history_clue'), '{}'::TEXT[])));


-- =============================================================================
-- 4. 回答する（疾患を disease_id で受ける）
-- =============================================================================
DROP FUNCTION IF EXISTS public.submit_journey_response(
    UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_journey_response(
    p_group_id             UUID,
    p_disease_id           TEXT,
    p_consent_version      INTEGER,
    p_respondent           TEXT,
    p_birth_year_band      TEXT,
    p_gender               TEXT,
    p_region               TEXT,
    p_first_symptoms       TEXT[],
    p_onset_age_band       TEXT,
    p_first_department     TEXT,
    p_diagnosis_department TEXT,
    p_facilities_count     TEXT,
    p_departments_count    TEXT,
    p_diagnosis_age_band   TEXT,
    p_other_diagnosis      TEXT,
    p_family_history_clue  TEXT,
    p_diagnosis_delay      TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_id       UUID;
    v_symptoms TEXT[];
    v_name     TEXT;
    v_idx      INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_member(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;

    -- 対象疾患: 会の病気（disease_ids）にあり、疾患別の選択肢が決まっていること
    SELECT g.disease_names[array_position(g.disease_ids, p_disease_id)]
      INTO v_name
      FROM public.patient_groups g
     WHERE g.id = p_group_id AND p_disease_id = ANY (g.disease_ids);
    IF v_name IS NULL OR NOT public.journey_disease_ready(p_disease_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    SELECT c.idx INTO v_idx FROM public.disease_catalog c WHERE c.disease_id = p_disease_id;

    -- 同意（取り消していない、渡された版の行があること）
    IF NOT EXISTS (
        SELECT 1 FROM public.consents c
         WHERE c.user_id = v_uid AND c.kind = 'journey'
           AND c.version = p_consent_version AND c.withdrawn_at IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'consent_required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.journey_links l
         WHERE l.user_id = v_uid AND l.group_id = p_group_id AND l.disease_id = p_disease_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'already_answered';
    END IF;

    v_symptoms := ARRAY(SELECT DISTINCT s FROM unnest(p_first_symptoms) AS s ORDER BY s);

    BEGIN
        INSERT INTO public.journey_responses (
            group_id, disease_id, disease_idx, disease_name, consent_version,
            respondent, birth_year_band, gender, region, first_symptoms, onset_age_band,
            first_department, diagnosis_department, facilities_count, departments_count,
            diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay)
        VALUES (
            p_group_id, p_disease_id, v_idx, v_name, p_consent_version,
            p_respondent, p_birth_year_band, p_gender, p_region, v_symptoms, p_onset_age_band,
            p_first_department, p_diagnosis_department, p_facilities_count, p_departments_count,
            p_diagnosis_age_band, p_other_diagnosis, p_family_history_clue, p_diagnosis_delay)
        RETURNING id INTO v_id;

        INSERT INTO public.journey_links (response_id, user_id, group_id, disease_id, disease_idx)
        VALUES (v_id, v_uid, p_group_id, p_disease_id, v_idx);
    EXCEPTION
        WHEN check_violation OR not_null_violation THEN
            RAISE EXCEPTION USING MESSAGE = 'invalid_input';
        WHEN unique_violation THEN
            RAISE EXCEPTION USING MESSAGE = 'already_answered';
    END;
END;
$$;

COMMENT ON FUNCTION public.submit_journey_response(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
'道のり調査に回答する（本人として）。疾患は disease_id で受け、会の病気にあり疾患別の選択肢が決まっているものだけ';


-- =============================================================================
-- 5. 自分の回答の一覧（disease_id を足す）
-- =============================================================================
DROP FUNCTION IF EXISTS public.my_journey_responses();

CREATE OR REPLACE FUNCTION public.my_journey_responses()
RETURNS TABLE (
    response_id          UUID,
    group_slug           TEXT,
    group_name           TEXT,
    disease_id           TEXT,
    disease_idx          INTEGER,
    disease_name         TEXT,
    consent_version      INTEGER,
    answered_month       DATE,
    respondent           TEXT,
    birth_year_band      TEXT,
    gender               TEXT,
    region               TEXT,
    first_symptoms       TEXT[],
    onset_age_band       TEXT,
    first_department     TEXT,
    diagnosis_department TEXT,
    facilities_count     TEXT,
    departments_count    TEXT,
    diagnosis_age_band   TEXT,
    other_diagnosis      TEXT,
    family_history_clue  TEXT,
    diagnosis_delay      TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT r.id, g.slug, g.name, r.disease_id, r.disease_idx, r.disease_name, r.consent_version, r.answered_month,
           r.respondent, r.birth_year_band, r.gender, r.region, r.first_symptoms, r.onset_age_band,
           r.first_department, r.diagnosis_department, r.facilities_count, r.departments_count,
           r.diagnosis_age_band, r.other_diagnosis, r.family_history_clue, r.diagnosis_delay
      FROM public.journey_links l
      JOIN public.journey_responses r ON r.id = l.response_id
      JOIN public.patient_groups g ON g.id = r.group_id
     WHERE l.user_id = auth.uid()
     ORDER BY g.slug, r.disease_id;
$$;

COMMENT ON FUNCTION public.my_journey_responses() IS
'本人の道のり調査の回答（対応表で結んだ分だけ）。未ログインは 0 行';


-- =============================================================================
-- 6. 会ごとの集計（会の disease_id で動かす。秘匿ルールは 20261018 と同じ）
-- =============================================================================
DROP FUNCTION IF EXISTS public.journey_summary(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.journey_summary(p_group_id UUID, p_disease_id TEXT)
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
    -- 会の病気（patient_groups.disease_ids）に無い病気は集計しない
    IF NOT EXISTS (SELECT 1 FROM public.patient_groups g
                    WHERE g.id = p_group_id AND p_disease_id = ANY (g.disease_ids)) THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    SELECT count(*), count(*) FILTER (WHERE x.gender = 'no_answer')
      INTO v_total, v_na_total
      FROM public.journey_responses x
     WHERE x.group_id = p_group_id AND x.disease_id = p_disease_id AND x.answered_month < v_month;

    IF v_total < v_t THEN
        RETURN;
    END IF;

    question := 'total'; choice := 'total'; sex := 'all'; n := v_total::TEXT;
    RETURN NEXT;

    RETURN QUERY
    WITH r AS (
        SELECT x.* FROM public.journey_responses x
         WHERE x.group_id = p_group_id AND x.disease_id = p_disease_id AND x.answered_month < v_month
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
         CROSS JOIN LATERAL unnest(public.journey_options(p_disease_id, qs.q)) WITH ORDINALITY AS o(c, c_ord)
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

COMMENT ON FUNCTION public.journey_summary(UUID, TEXT) IS
'道のり調査の会ごと・病気ごとの集計（会員だけ）。設問ごとと性別との 2 軸。しきい値 stats_threshold() 未満は「10未満」、総数がしきい値未満は 0 行。対応表は読まない';


-- =============================================================================
-- 7. 関数の実行権限
-- =============================================================================
REVOKE ALL ON FUNCTION public.journey_options(TEXT, TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_disease_ready(TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_fill_disease()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_journey_response(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
                                                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_journey_responses()             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.journey_summary(UUID, TEXT)        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_journey_response(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
                                                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_journey_responses()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_summary(UUID, TEXT)     TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. scripts/portal/verify_journey.sql を流す（先頭の vj.disease_id が対象の病気。既定は rd00001 ファブリー病）→ NG 0 件
-- 2. scripts/portal/verify_delete_account.sql の道のり調査の項目（disease_idx だけで入れる行は、トリガーが disease_id を埋める）
-- 3. このファイルをもう一度流す → エラーにならない
-- =============================================================================
