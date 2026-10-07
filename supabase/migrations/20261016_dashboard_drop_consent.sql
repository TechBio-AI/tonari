-- =============================================================================
-- 世話人向けダッシュボードから「研究協力の連絡への同意」を外す（2026-10-16 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261012_group_dashboard.sql は書き換えない。group_dashboard をこのファイルで差し替える。
--
-- 何を変えるか:
--   section consent_research_contact（choice yes）の 1 行を返さない。27 行 → 26 行。
--   ほかの section・choice・並び・伏せ方（しきい値 public.stats_threshold()、補完秘匿）・止め方・権限は 20261012 と同じ。
--   consents 表はこの関数から読まなくなる。
--
-- 戻りの列（section, choice, n）は変えないので CREATE OR REPLACE で差し替えられる。権限もそのまま残るが、念のため付け直す。
--
-- アプリ側の契約は lib/portal/group-dashboard.ts（DASHBOARD_CHOICES から consent_research_contact を外した）。
-- lib/portal/__tests__/group-dashboard.test.ts が、最新の定義（このファイル）との一致を確かめる。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.group_dashboard(p_group_id UUID)
RETURNS TABLE (section TEXT, choice TEXT, n TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
    v_t INTEGER := public.stats_threshold();
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_moderator(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
    WITH m AS (  -- 在籍会員（プロフィールが無ければ各列は NULL）
        SELECT mb.user_id, mb.role, mp.registrant_type, mp.age_band, mp.gender, mp.prefecture
          FROM public.memberships mb
          LEFT JOIN public.member_profiles mp ON mp.user_id = mb.user_id
         WHERE mb.group_id = p_group_id AND mb.left_at IS NULL
    ),
    exact AS (  -- 実数の 3 行（伏せない）
        SELECT v.s, v.s_ord, 'all'::TEXT AS c, 1::BIGINT AS c_ord, v.cnt
          FROM (VALUES
              ('members_total', 1, (SELECT count(*) FROM m)),
              ('moderators', 2, (SELECT count(*) FROM m WHERE m.role = 'moderator')),
              ('join_requests_pending', 3, (SELECT count(*) FROM public.join_requests r
                                             WHERE r.group_id = p_group_id AND r.status = 'pending'))
          ) AS v(s, s_ord, cnt)
    ),
    opts AS (  -- 伏せる section の choice（並び順つき）
        SELECT 'registrant_type'::TEXT AS s, 4 AS s_ord, o.c, o.c_ord
          FROM unnest(ARRAY['self', 'proxy']) WITH ORDINALITY AS o(c, c_ord)
        UNION ALL
        SELECT 'age_band', 5, o.c, o.c_ord
          FROM unnest(ARRAY['10歳未満', '10代', '20代', '30代', '40代', '50代', '60代', '70代', '80歳以上'])
               WITH ORDINALITY AS o(c, c_ord)
        UNION ALL
        SELECT 'gender', 6, o.c, o.c_ord
          FROM unnest(ARRAY['男性', '女性', '答えない']) WITH ORDINALITY AS o(c, c_ord)
        UNION ALL
        SELECT 'region', 7, o.c, o.c_ord
          FROM unnest(ARRAY['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku',
                            'kyushu_okinawa', 'unknown']) WITH ORDINALITY AS o(c, c_ord)
    ),
    cells AS (
        SELECT opts.s, opts.s_ord, opts.c, opts.c_ord,
               (SELECT count(*) FROM m
                 WHERE CASE opts.s
                         WHEN 'registrant_type' THEN m.registrant_type = opts.c
                         WHEN 'age_band' THEN m.age_band = opts.c
                         WHEN 'gender' THEN m.gender = opts.c
                         WHEN 'region' THEN coalesce(public.prefecture_region(m.prefecture), 'unknown') = opts.c
                       END) AS cnt
          FROM opts
    ),
    h1 AS (  -- しきい値未満（0 を含む）を伏せる
        SELECT cells.*, cells.cnt < v_t AS h FROM cells
    ),
    h2 AS (  -- 同じ section で伏せた行がちょうど 1 つなら、伏せていない行のうち最小（同数なら並びが先）も伏せる
        SELECT h1.*,
               h1.h OR (count(*) FILTER (WHERE h1.h) OVER (PARTITION BY h1.s) = 1
                        AND row_number() OVER (PARTITION BY h1.s, h1.h ORDER BY h1.cnt, h1.c_ord) = 1) AS hh
          FROM h1
    )
    SELECT x.s, x.c, x.n
      FROM (
        SELECT exact.s, exact.s_ord, exact.c, exact.c_ord, exact.cnt::TEXT AS n FROM exact
        UNION ALL
        SELECT h2.s, h2.s_ord, h2.c, h2.c_ord, CASE WHEN h2.hh THEN '10未満' ELSE h2.cnt::TEXT END FROM h2
      ) AS x
     ORDER BY x.s_ord, x.c_ord;
END;
$$;

COMMENT ON FUNCTION public.group_dashboard(UUID) IS
'世話人向けダッシュボード（その会の世話人だけ）。在籍会員・世話人・未審査の申請は実数、ほかは 10 未満を「10未満」にし補完秘匿する。研究協力の同意は返さない（20261016）。契約は lib/portal/group-dashboard.ts';

REVOKE ALL ON FUNCTION public.group_dashboard(UUID)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_dashboard(UUID)   TO authenticated;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_dashboard.sql を流す。行の数が 26、consent_research_contact の行が無いこと
-- =============================================================================
