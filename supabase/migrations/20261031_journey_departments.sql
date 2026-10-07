-- =============================================================================
-- 道のり調査の共通の診療科（設問 7・8）に「救急科」「新生児科」「肝臓内科」を足す（2026-10-04 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261010・20261028 の後に当てる。適用済みの migration は書き換えない。
--
-- 変えるのは journey_options(p_question) の first_department・diagnosis_department の 2 つの一覧だけ。
--   足す値: emergency（救急科）・neonatology（新生児科）・hepatology（肝臓内科）。並びは「精神科・心療内科」の後、「その他」の前。
--   ほかの設問の値は 20261010 と同じ（この関数の本文は 20261010 から写し、上の 2 か所だけを変えた）。
-- 共通の設問なので、全疾患（journey_options(疾患, 設問) の共通の分）に効く。ファブリー病の決定済みの選択肢も増える。
-- 値を足すだけなので、いまある行は表の CHECK に合ったまま（CHECK は付け直さない）。
-- 集計（journey_summary）は選択肢の一覧から行を作るので、診療科の表が 3 行ずつ増える。
--
-- 権限: 20261010 と同じく、PUBLIC・anon・authenticated に EXECUTE を与えない（中から使うだけ）。
-- =============================================================================

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
            'psychiatry', 'emergency', 'neonatology', 'hepatology', 'other', 'not_remember']
        WHEN 'diagnosis_department' THEN ARRAY[
            'pediatrics', 'internal_general', 'cardiology', 'nephrology', 'neurology', 'dermatology',
            'ophthalmology', 'otolaryngology', 'orthopedics', 'gastroenterology', 'rheumatology', 'genetics',
            'psychiatry', 'emergency', 'neonatology', 'hepatology', 'other', 'not_remember']
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
'道のり調査の設問ごとの選択肢（値）。表の CHECK と集計が使う。アプリ側の正は lib/portal/journey-survey.ts（2026-10-04 診療科に救急科・新生児科・肝臓内科を追加）';

REVOKE ALL ON FUNCTION public.journey_options(TEXT) FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. scripts/portal/verify_journey.sql を流す → NG 0 件（項目 10 に、診療科の 3 つが共通の選択肢にあることの確認がある）
-- 2. このファイルをもう一度流す → エラーにならない
-- =============================================================================
