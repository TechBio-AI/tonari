-- =============================================================================
-- 病気がわかるまでの道のり調査（ファブリー病）2026-10-02 ファウンダー指示
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 倫理審査の承認までは本番に当てない（実データは集めない）。アプリ側も環境変数 JOURNEY_SURVEY=on のときだけ開く。
-- ※ 20261004 までは適用済みなので書き換えない。delete_my_account の変更もこのファイルで CREATE OR REPLACE する。
--
-- 設問と選択肢: docs/journey_survey_items.md（決定 2026-10-02）。研究計画書の下書き: docs/journey_protocol_draft.md
--
-- 表の分け方:
--   journey_responses … 回答。user_id を持たない。会員から直接は読めない・書けない（RLS を有効にし、ポリシーを置かない）
--   journey_links     … 本人と回答の対応表。本人の行だけが読める。集計では一切使わない
--   回答・取り消し・自分の回答の確認・集計は、すべて SECURITY DEFINER の関数を通す
--
-- 取り消し:
--   本人はいつでも取り消せる（withdraw_my_journey_response）。回答も対応も消える。
--   対応の行が消えたら、トリガーで回答も消す（Studio で auth.users を消したときも、対応が CASCADE で消え、回答も消える）。
--   アカウント削除（delete_my_account）でも消える（このファイルの 6）。
--   会を退会しても回答は消えない（取り消しは /demo/community/journey から会をまたいで行える）。
--
-- 集計（journey_summary）:
--   設問ごとの単純集計と、性別との 2 軸まで。10 未満のセルは「10未満」。総数が 10 未満なら何も返さない。
--   ほかに Claude Code の判断で 2 つ足した（docs/journey_survey_items.md「集計の決まり」）:
--     補完秘匿（伏せたセルを引き算で戻せないようにする）と、前月までの回答だけを数えること。
--
-- 個人情報の扱い（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   回答は医療情報に当たる。外部 LLM API（Anthropic 等）へ送らない。公開面はこの 2 表を読まない。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. 同意の種類に journey を足す（consents.kind の CHECK を付け直す）
--
--   20260928 では列に直接 CHECK を書いたので、名前は自動で付いている（consents_kind_check のはず）。
--   名前を決め打ちせず、kind の値の一覧を持つ CHECK をすべて外してから、名前付きで付け直す。何度流しても同じ結果になる。
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
          FROM pg_constraint con
         WHERE con.conrelid = 'public.consents'::regclass
           AND con.contype = 'c'
           AND pg_get_constraintdef(con.oid) LIKE '%kind%'
           AND pg_get_constraintdef(con.oid) LIKE '%research_contact%'
    LOOP
        EXECUTE format('ALTER TABLE public.consents DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.consents
    ADD CONSTRAINT consents_kind_check
    CHECK (kind IN ('base', 'research_contact', 'stats', 'journey'));


-- -----------------------------------------------------------------------------
-- 2. 選択肢の一覧 journey_options(設問)
--
--   表の CHECK と集計の両方がこの関数を使う（選択肢の正は DB 側ではここ 1 か所）。
--   アプリ側の正は lib/portal/journey-survey.ts。lib/portal/__tests__/journey-survey.test.ts が両者の一致を確かめる。
--   ★ 選択肢を減らす・値を変えるときは、既存の行が CHECK に合わなくなる。新しい migration で行の扱いを決めてから差し替える。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_options(p_question TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE p_question
        WHEN 'respondent' THEN ARRAY['self', 'proxy']
        WHEN 'birth_year_band' THEN ARRAY[
            'le1944', '1945_1949', '1950_1954', '1955_1959', '1960_1964', '1965_1969', '1970_1974',
            '1975_1979', '1980_1984', '1985_1989', '1990_1994', '1995_1999', '2000_2004', '2005_2009',
            '2010_2014', '2015_2019', '2020_2024', 'ge2025', 'no_answer']
        WHEN 'gender' THEN ARRAY['male', 'female', 'no_answer']
        WHEN 'region' THEN ARRAY[
            'hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu_okinawa', 'no_answer']
        WHEN 'first_symptoms' THEN ARRAY[
            'limb_pain', 'hypohidrosis', 'fatigue', 'digestive', 'neuro', 'cardiac_finding', 'urine_finding',
            'skin_rash', 'heat_intolerance', 'ear', 'cornea_finding', 'stroke_finding', 'other', 'not_remember',
            'found_before_symptoms']
        WHEN 'onset_age_band' THEN ARRAY[
            '0_4', '5_9', '10_14', '15_19', '20_24', '25_29', '30_34', '35_39', '40_44', '45_49', '50_54',
            '55_59', '60_64', 'ge65', 'not_remember', 'before_symptoms']
        WHEN 'first_department' THEN ARRAY[
            'pediatrics', 'internal_general', 'cardiology', 'nephrology', 'neurology', 'dermatology',
            'ophthalmology', 'otolaryngology', 'orthopedics', 'gastroenterology', 'rheumatology', 'genetics',
            'psychiatry', 'other', 'not_remember']
        WHEN 'diagnosis_department' THEN ARRAY[
            'pediatrics', 'internal_general', 'cardiology', 'nephrology', 'neurology', 'dermatology',
            'ophthalmology', 'otolaryngology', 'orthopedics', 'gastroenterology', 'rheumatology', 'genetics',
            'psychiatry', 'other', 'not_remember']
        WHEN 'facilities_count' THEN ARRAY['1', '2_3', '4_5', 'ge6', 'not_remember']
        WHEN 'departments_count' THEN ARRAY['1', '2_3', '4_5', 'ge6', 'not_remember']
        WHEN 'diagnosis_age_band' THEN ARRAY[
            '0_4', '5_9', '10_14', '15_19', '20_24', '25_29', '30_34', '35_39', '40_44', '45_49', '50_54',
            '55_59', '60_64', 'ge65', 'not_remember', 'before_symptoms']
        WHEN 'other_diagnosis' THEN ARRAY['yes', 'no', 'unknown']
        WHEN 'family_history_clue' THEN ARRAY['yes', 'no', 'unknown']
        WHEN 'diagnosis_delay' THEN ARRAY[
            'lt1', '1_4', '5_9', '10_19', 'ge20', 'not_remember', 'before_symptoms']
    END::TEXT[];
$$;

COMMENT ON FUNCTION public.journey_options(TEXT) IS
'道のり調査の設問ごとの選択肢（値）。表の CHECK と集計が使う。アプリ側の正は lib/portal/journey-survey.ts';


-- -----------------------------------------------------------------------------
-- 3. 回答 journey_responses（user_id を持たない）
--
--   時刻は持たない。回答した月（answered_month。月の 1 日）だけを持つ（保存期間の起点と、集計を前月までに限るため）。
--   disease_idx は知識ファイルの並び順の位置で、固定 ID ではない。対象の病気は disease_name（回答した時点の表示名）で決まる。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journey_responses (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id             UUID NOT NULL REFERENCES public.patient_groups ON DELETE CASCADE,
    disease_idx          INTEGER NOT NULL CHECK (disease_idx >= 0),
    disease_name         TEXT NOT NULL CHECK (btrim(disease_name) <> '' AND char_length(disease_name) <= 300),
    consent_version      INTEGER NOT NULL CHECK (consent_version >= 1),
    respondent           TEXT NOT NULL CHECK (respondent           = ANY (public.journey_options('respondent'))),
    birth_year_band      TEXT NOT NULL CHECK (birth_year_band      = ANY (public.journey_options('birth_year_band'))),
    gender               TEXT NOT NULL CHECK (gender               = ANY (public.journey_options('gender'))),
    region               TEXT NOT NULL CHECK (region               = ANY (public.journey_options('region'))),
    first_symptoms       TEXT[] NOT NULL CHECK (
                             cardinality(first_symptoms) >= 1
                             AND array_position(first_symptoms, NULL) IS NULL
                             AND first_symptoms <@ public.journey_options('first_symptoms')
                             -- 「症状に気づく前に分かった」は排他（選んだら他は選べない）
                             AND (NOT ('found_before_symptoms' = ANY (first_symptoms)) OR cardinality(first_symptoms) = 1)),
    onset_age_band       TEXT NOT NULL CHECK (onset_age_band       = ANY (public.journey_options('onset_age_band'))),
    first_department     TEXT NOT NULL CHECK (first_department     = ANY (public.journey_options('first_department'))),
    diagnosis_department TEXT NOT NULL CHECK (diagnosis_department = ANY (public.journey_options('diagnosis_department'))),
    facilities_count     TEXT NOT NULL CHECK (facilities_count     = ANY (public.journey_options('facilities_count'))),
    departments_count    TEXT NOT NULL CHECK (departments_count    = ANY (public.journey_options('departments_count'))),
    diagnosis_age_band   TEXT NOT NULL CHECK (diagnosis_age_band   = ANY (public.journey_options('diagnosis_age_band'))),
    other_diagnosis      TEXT NOT NULL CHECK (other_diagnosis      = ANY (public.journey_options('other_diagnosis'))),
    family_history_clue  TEXT NOT NULL CHECK (family_history_clue  = ANY (public.journey_options('family_history_clue'))),
    diagnosis_delay      TEXT NOT NULL CHECK (diagnosis_delay      = ANY (public.journey_options('diagnosis_delay'))),
    answered_month       DATE NOT NULL DEFAULT (date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'))::DATE
                             CHECK (extract(day FROM answered_month) = 1),
    -- 設問 5 で「症状に気づく前に分かった」を選んだときだけ、設問 6・11・14 が「症状に気づく前に分かった」になる（逆も同じ）
    CONSTRAINT journey_responses_before_symptoms_consistent CHECK (
        (('found_before_symptoms' = ANY (first_symptoms)) = (onset_age_band     = 'before_symptoms'))
        AND (('found_before_symptoms' = ANY (first_symptoms)) = (diagnosis_age_band = 'before_symptoms'))
        AND (('found_before_symptoms' = ANY (first_symptoms)) = (diagnosis_delay    = 'before_symptoms')))
);

CREATE INDEX IF NOT EXISTS journey_responses_group_disease_idx
    ON public.journey_responses (group_id, disease_idx);

COMMENT ON TABLE public.journey_responses IS
'病気がわかるまでの道のり調査の回答。user_id を持たない。会員は直接読めない（関数を通す）。医療情報なので外部 LLM API へ送らない。';
COMMENT ON COLUMN public.journey_responses.disease_idx IS
'回答した時点の知識ファイル上の位置。固定 ID ではない。名前の引き直しに使わない';
COMMENT ON COLUMN public.journey_responses.disease_name IS
'回答した時点の表示名。対象の病気はこの名前で決まる';
COMMENT ON COLUMN public.journey_responses.consent_version IS
'回答のときに同意した文の版（lib/portal/consent-texts.ts の journey）';
COMMENT ON COLUMN public.journey_responses.answered_month IS
'回答した月の 1 日（日本時間）。日・時刻は持たない';

ALTER TABLE public.journey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_responses FORCE ROW LEVEL SECURITY;
-- ポリシーは置かない（会員からは 0 行。読み書きは SECURITY DEFINER の関数だけ）

REVOKE ALL ON public.journey_responses FROM PUBLIC;
REVOKE ALL ON public.journey_responses FROM anon;
REVOKE ALL ON public.journey_responses FROM authenticated;


-- -----------------------------------------------------------------------------
-- 4. 対応表 journey_links（本人と回答を結ぶ）
--
--   本人の行だけが読める。書き込み・削除は関数だけ（本人が対応だけを消して、回答が取り消せなくなるのを防ぐ）。
--   同じ人が同じ会・同じ病気に 2 つ回答しない（直すときは取り消してから答え直す）。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journey_links (
    response_id UUID PRIMARY KEY REFERENCES public.journey_responses ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES public.patient_groups ON DELETE CASCADE,
    disease_idx INTEGER NOT NULL CHECK (disease_idx >= 0),
    CONSTRAINT journey_links_one_per_user UNIQUE (user_id, group_id, disease_idx)
);

COMMENT ON TABLE public.journey_links IS
'道のり調査の、本人と回答の対応表。本人の行だけが読める。集計では一切使わない。行が消えると回答も消える（トリガー）';

ALTER TABLE public.journey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journey_links_select_own ON public.journey_links;
CREATE POLICY journey_links_select_own ON public.journey_links
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

REVOKE ALL ON public.journey_links FROM PUBLIC;
REVOKE ALL ON public.journey_links FROM anon;
REVOKE ALL ON public.journey_links FROM authenticated;
GRANT SELECT ON public.journey_links TO authenticated;

-- 対応の行が消えたら、回答も消す（auth.users の削除で対応が CASCADE で消えたときも、回答を残さない）
CREATE OR REPLACE FUNCTION public.journey_links_delete_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.journey_responses WHERE id = OLD.response_id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS journey_links_delete_response ON public.journey_links;
CREATE TRIGGER journey_links_delete_response
    AFTER DELETE ON public.journey_links
    FOR EACH ROW
    EXECUTE FUNCTION public.journey_links_delete_response();


-- -----------------------------------------------------------------------------
-- 5. 関数
-- -----------------------------------------------------------------------------

-- 5-1. 回答する（本人として。会員で、journey のその版に同意していること）
--   対象疾患はいまはファブリー病（disease_idx = 0）だけ。増やすときは新しい migration でこの関数を差し替える。
--   会の disease_idxs / disease_names に、渡された idx と名前の組があることも確かめる（画面を出した後に会の病気が変わったとき）。
CREATE OR REPLACE FUNCTION public.submit_journey_response(
    p_group_id             UUID,
    p_disease_idx          INTEGER,
    p_disease_name         TEXT,
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
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_member(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;

    -- 対象疾患（いまはファブリー病のみ）
    IF p_disease_idx IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    IF NOT EXISTS (
        SELECT 1
          FROM public.patient_groups g
         CROSS JOIN LATERAL generate_subscripts(g.disease_idxs, 1) AS sub(i)
         WHERE g.id = p_group_id
           AND g.disease_idxs[i] = p_disease_idx
           AND g.disease_names[i] = p_disease_name
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    -- 同意（取り消していない、渡された版の行があること。アプリは journey のいまの版を渡す）
    IF NOT EXISTS (
        SELECT 1 FROM public.consents c
         WHERE c.user_id = v_uid AND c.kind = 'journey'
           AND c.version = p_consent_version AND c.withdrawn_at IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'consent_required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.journey_links l
         WHERE l.user_id = v_uid AND l.group_id = p_group_id AND l.disease_idx = p_disease_idx
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'already_answered';
    END IF;

    -- 複数選択は重複を落として並べる（NULL の要素は CHECK が止める）
    v_symptoms := ARRAY(SELECT DISTINCT s FROM unnest(p_first_symptoms) AS s ORDER BY s);

    -- 回答と対応は一緒に入れる（片方だけ残らないよう、例外のときはこのブロックごと巻き戻る）
    BEGIN
        INSERT INTO public.journey_responses (
            group_id, disease_idx, disease_name, consent_version,
            respondent, birth_year_band, gender, region, first_symptoms, onset_age_band,
            first_department, diagnosis_department, facilities_count, departments_count,
            diagnosis_age_band, other_diagnosis, family_history_clue, diagnosis_delay)
        VALUES (
            p_group_id, p_disease_idx, p_disease_name, p_consent_version,
            p_respondent, p_birth_year_band, p_gender, p_region, v_symptoms, p_onset_age_band,
            p_first_department, p_diagnosis_department, p_facilities_count, p_departments_count,
            p_diagnosis_age_band, p_other_diagnosis, p_family_history_clue, p_diagnosis_delay)
        RETURNING id INTO v_id;

        INSERT INTO public.journey_links (response_id, user_id, group_id, disease_idx)
        VALUES (v_id, v_uid, p_group_id, p_disease_idx);
    EXCEPTION
        WHEN check_violation OR not_null_violation THEN
            RAISE EXCEPTION USING MESSAGE = 'invalid_input';
        WHEN unique_violation THEN
            RAISE EXCEPTION USING MESSAGE = 'already_answered';
    END;
END;
$$;

COMMENT ON FUNCTION public.submit_journey_response(UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
'道のり調査に回答する（本人として）。回答（user_id なし）と対応表の行を一緒に作る';


-- 5-2. 自分の回答の一覧（会をまたいで。退会した会の回答も出す＝取り消せるように）
CREATE OR REPLACE FUNCTION public.my_journey_responses()
RETURNS TABLE (
    response_id          UUID,
    group_slug           TEXT,
    group_name           TEXT,
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
    SELECT r.id, g.slug, g.name, r.disease_idx, r.disease_name, r.consent_version, r.answered_month,
           r.respondent, r.birth_year_band, r.gender, r.region, r.first_symptoms, r.onset_age_band,
           r.first_department, r.diagnosis_department, r.facilities_count, r.departments_count,
           r.diagnosis_age_band, r.other_diagnosis, r.family_history_clue, r.diagnosis_delay
      FROM public.journey_links l
      JOIN public.journey_responses r ON r.id = l.response_id
      JOIN public.patient_groups g ON g.id = r.group_id
     WHERE l.user_id = auth.uid()
     ORDER BY g.slug, r.disease_idx;
$$;

COMMENT ON FUNCTION public.my_journey_responses() IS
'本人の道のり調査の回答（対応表で結んだ分だけ）。未ログインは 0 行';


-- 5-3. 回答を取り消す（本人の分だけ。回答も対応も消える。残る回答が無くなれば journey の同意も取り消す）
CREATE OR REPLACE FUNCTION public.withdraw_my_journey_response(p_response_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    DELETE FROM public.journey_links WHERE response_id = p_response_id AND user_id = v_uid;
    IF NOT FOUND THEN
        -- 他人の回答か、もう無い回答（どちらかは明かさない）
        RAISE EXCEPTION USING MESSAGE = 'not_found';
    END IF;
    -- 対応のトリガーで消えているはずだが、念のため
    DELETE FROM public.journey_responses WHERE id = p_response_id;

    IF NOT EXISTS (SELECT 1 FROM public.journey_links WHERE user_id = v_uid) THEN
        -- 時刻は consents_guard_withdrawal が now() にする
        UPDATE public.consents SET withdrawn_at = now()
         WHERE user_id = v_uid AND kind = 'journey' AND withdrawn_at IS NULL;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.withdraw_my_journey_response(UUID) IS
'本人の道のり調査の回答を取り消す（回答も対応も消える）。他人の回答・無い回答は not_found';


-- 5-4. 会ごとの集計（その会の有効な会員だけ。journey_links は読まない。user_id は返さない）
--
--   返す行: question（設問）・choice（選択肢の値）・sex（all / male / female / no_answer）・n（人数か「10未満」）
--   先頭に question = 'total' の行（総数）。総数が 10 未満なら 1 行も返さない。
--   数えるのは前月までの回答（answered_month < 今月の 1 日。日本時間）。
--
--   伏せ方（docs/journey_survey_items.md「集計の決まり」）:
--     h2 … 10 未満を伏せる。性別ごとの行は 1 つでも 10 未満なら 3 つとも伏せる
--          （「答えない」が 1 人もいなければ、その列は判定に入れない）
--     h3 … 単一選択の設問の全体の列で、伏せたセルがちょうど 1 つなら、次に小さいセルも伏せる
--     h4 … 全体のセルを伏せた行は、性別ごとのセルも伏せる
--     h5 … 単一選択の設問で、性別ごとに伏せた行がちょうど 1 つなら、全体の数が次に小さい行の性別ごとのセルも伏せる
--   性別の設問そのものは、性別との 2 軸にしない。
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

    IF v_total < 10 THEN
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
               CASE WHEN cells.s = 'all' THEN cells.cnt < 10
                    ELSE coalesce(bool_or(cells.cnt < 10 AND (cells.s <> 'no_answer' OR v_na_total > 0))
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
'道のり調査の会ごとの集計（会員だけ）。設問ごとと性別との 2 軸。10 未満は「10未満」、総数 10 未満は 0 行。対応表は読まない';


-- -----------------------------------------------------------------------------
-- 6. delete_my_account() の差し替え（道のり調査の回答と対応も消す）
--
--   20261002 の本文に、回答・対応を消す 2 文を足しただけ（引数・戻り値・検証の順・ほかの消す順は同じ）。
--   回答を先に消すと、対応は外部キー（ON DELETE CASCADE）で一緒に消える。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    -- 本人が世話人をしている会の、世話人の行を先に固める（leave_group・dismiss_moderator と同じ考え。
    -- 2 人の世話人が同時にアカウントを消して 0 人になるのを防ぐ）
    PERFORM 1 FROM public.memberships m
      WHERE m.role = 'moderator' AND m.left_at IS NULL
        AND m.group_id IN (SELECT mine.group_id FROM public.memberships mine
                            WHERE mine.user_id = v_uid AND mine.role = 'moderator' AND mine.left_at IS NULL)
      ORDER BY m.group_id, m.user_id
        FOR UPDATE;

    -- どこかの会の最後の世話人なら、何も消さずに止める
    IF EXISTS (
        SELECT 1 FROM public.memberships mine
         WHERE mine.user_id = v_uid AND mine.role = 'moderator' AND mine.left_at IS NULL
           AND NOT EXISTS (
               SELECT 1 FROM public.memberships o
                WHERE o.group_id = mine.group_id
                  AND o.user_id <> v_uid
                  AND o.role = 'moderator'
                  AND o.left_at IS NULL)
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'last_moderator';
    END IF;

    -- 病気がわかるまでの道のり調査の回答（医療情報）と、本人との対応（20261010）
    DELETE FROM public.journey_responses
     WHERE id IN (SELECT l.response_id FROM public.journey_links l WHERE l.user_id = v_uid);
    DELETE FROM public.journey_links WHERE user_id = v_uid;

    -- 研究・治験の案内を受け取る病気（医療情報）
    DELETE FROM public.member_diseases WHERE user_id = v_uid;

    -- 同意の記録（本人の delete は許していない表。ここだけで消す）
    DELETE FROM public.consents WHERE user_id = v_uid;

    -- 入会申請（本人の申請はすべて。ひとこと・紹介者の氏名も一緒に消える）
    DELETE FROM public.join_requests WHERE user_id = v_uid;
    -- 世話人として審査した他人の申請には、行を残して本人の痕跡だけ消す
    UPDATE public.join_requests SET decided_by = NULL WHERE decided_by = v_uid;

    -- 招待（本人が発行したものはすべて。まだ使われていない招待も無効になる）
    DELETE FROM public.invitations WHERE created_by = v_uid;
    -- 他人が発行して本人が使った招待には、行を残して本人の痕跡だけ消す（used_at は残る）
    UPDATE public.invitations SET used_by = NULL WHERE used_by = v_uid;

    -- 会員資格（退会済みの行も含めて）
    DELETE FROM public.memberships WHERE user_id = v_uid;

    -- プロフィール（氏名・表示名・年代・性別・都道府県）
    DELETE FROM public.member_profiles WHERE user_id = v_uid;

    -- 旧 profiles（00001。表がある DB でだけ消す）
    -- ★ 00001 では articles.author_id が profiles を ON DELETE CASCADE で参照している。
    --   本人が書いた articles があれば一緒に消える（となりの会員は書かない想定。実在は不明）
    IF to_regclass('public.profiles') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.profiles WHERE id = $1' USING v_uid;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
'本人の会員情報を全部消す（auth.users は残す）。道のり調査の回答と対応も消す。投稿・コメントは会に残り、名前だけが消える。最後の世話人は last_moderator で止まる';


-- -----------------------------------------------------------------------------
-- 7. 関数の実行権限（PUBLIC・anon からはがし、使う関数だけ authenticated に付ける）
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.journey_options(TEXT)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_links_delete_response()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_journey_response(UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
                                                                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_journey_responses()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_my_journey_response(UUID)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.journey_summary(UUID, INTEGER)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account()                  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_journey_response(UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
                                                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_journey_responses()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_my_journey_response(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_summary(UUID, INTEGER)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account()               TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20261004 までを当ててから、このファイルを当てる
-- 2. scripts/portal/verify_journey.sql を Studio の SQL エディタに全文貼って 1 回実行する
-- 3. scripts/portal/verify_delete_account.sql をもう一度流す（delete_my_account を差し替えたため。項目 9 が道のり調査）
-- 4. scripts/portal/verify_consents.sql があれば流す（consents.kind の CHECK を付け直したため）
-- 5. このファイルをもう一度流す → エラーにならない
-- =============================================================================
