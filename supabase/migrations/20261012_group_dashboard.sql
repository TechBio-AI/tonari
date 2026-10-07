-- =============================================================================
-- 世話人向けダッシュボード（2026-10-12 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。
--
-- 作るもの:
--   1. public.stats_threshold()          … 集計で伏せるしきい値（10）。しきい値はここ 1 か所
--                                           （journey_summary はまだ 10 を直書きのまま。差し替えは今回しない）
--   2. public.prefecture_region(都道府県) … 都道府県 → 地方ブロック。値は道のり調査の地方ブロック
--                                           （20261010 の journey_options('region') の値。'no_answer' は使わない）
--   3. public.group_dashboard(group_id)  … 世話人だけが見る会の集計
--
-- 契約（画面担当と共通。アプリ側の正は lib/portal/group-dashboard.ts。
--        lib/portal/__tests__/group-dashboard.test.ts が両者の一致を確かめる）:
--   返す行（section / choice / n）。この順で、0 人でも行を返す。
--     members_total / all             在籍会員（left_at IS NULL）の実数
--     moderators / all                在籍の世話人の実数
--     join_requests_pending / all     未審査（pending）の申請の実数
--     registrant_type / self, proxy
--     age_band / member_profiles の全区分（10歳未満 … 80歳以上）
--     gender / 男性, 女性, 答えない
--     region / hokkaido … kyushu_okinawa, unknown（unknown＝都道府県が無い人＝プロフィール未作成の人）
--     consent_research_contact / yes  研究協力の連絡への同意を取り消していない人
--   n は文字。実数の 3 行以外は、しきい値未満（0 を含む）を '10未満' にする。
--   同じ section で伏せた行がちょうど 1 つなら、残りで最小の行も伏せる（道のり調査 journey_summary の h3 と同じ補完秘匿）。
--
-- 数える人:
--   その会の在籍会員だけ（退会した人は数えない）。プロフィールが無い会員は、registrant_type・age_band・gender には
--   入らず、region の unknown にだけ入る。研究協力の同意は consents（kind = 'research_contact'、withdrawn_at IS NULL）が
--   1 行でもあれば yes。
--
-- 都道府県 → 地方ブロック（Claude Code の判断。道のり調査は地方を本人に選ばせていて、対応表は今まで無かった）:
--   8 地方区分に合わせた。三重県は近畿に入れた（中部とする分け方もある）。変えるときはこの関数と
--   lib/portal/group-dashboard.ts の両方を直す（テストが食い違いを止める）。
--
-- 権限:
--   group_dashboard … SECURITY DEFINER・search_path ''。PUBLIC・anon は実行不可、authenticated は実行可。
--                     世話人でなければ forbidden（export_group などと同じ P0001）。
--   stats_threshold・prefecture_region … 中から使うだけ。PUBLIC・anon・authenticated は実行不可
--                     （journey_options と同じ扱い。group_dashboard は所有者の権限で呼ぶ）。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. しきい値
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stats_threshold()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT 10;
$$;

COMMENT ON FUNCTION public.stats_threshold() IS
'集計で伏せるしきい値（この数未満は「10未満」）。しきい値の正はここ。アプリ側は lib/portal/group-dashboard.ts';


-- -----------------------------------------------------------------------------
-- 2. 都道府県 → 地方ブロック（値は journey_options('region') と同じ。知らない値・NULL は NULL）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prefecture_region(p_prefecture TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_prefecture = '北海道' THEN 'hokkaido'
        WHEN p_prefecture IN ('青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県') THEN 'tohoku'
        WHEN p_prefecture IN ('茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県') THEN 'kanto'
        WHEN p_prefecture IN ('新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県') THEN 'chubu'
        WHEN p_prefecture IN ('三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県') THEN 'kinki'
        WHEN p_prefecture IN ('鳥取県', '島根県', '岡山県', '広島県', '山口県') THEN 'chugoku'
        WHEN p_prefecture IN ('徳島県', '香川県', '愛媛県', '高知県') THEN 'shikoku'
        WHEN p_prefecture IN ('福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県') THEN 'kyushu_okinawa'
    END;
$$;

COMMENT ON FUNCTION public.prefecture_region(TEXT) IS
'都道府県 → 地方ブロック（道のり調査の地方ブロックの値）。三重県は近畿。アプリ側は lib/portal/group-dashboard.ts';


-- -----------------------------------------------------------------------------
-- 3. 世話人向けダッシュボード
-- -----------------------------------------------------------------------------
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
        UNION ALL
        SELECT 'consent_research_contact', 8, 'yes', 1
    ),
    cells AS (
        SELECT opts.s, opts.s_ord, opts.c, opts.c_ord,
               (SELECT count(*) FROM m
                 WHERE CASE opts.s
                         WHEN 'registrant_type' THEN m.registrant_type = opts.c
                         WHEN 'age_band' THEN m.age_band = opts.c
                         WHEN 'gender' THEN m.gender = opts.c
                         WHEN 'region' THEN coalesce(public.prefecture_region(m.prefecture), 'unknown') = opts.c
                         WHEN 'consent_research_contact' THEN EXISTS (
                             SELECT 1 FROM public.consents k
                              WHERE k.user_id = m.user_id AND k.kind = 'research_contact' AND k.withdrawn_at IS NULL)
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
'世話人向けダッシュボード（その会の世話人だけ）。在籍会員・世話人・未審査の申請は実数、ほかは 10 未満を「10未満」にし補完秘匿する。契約は lib/portal/group-dashboard.ts';


-- -----------------------------------------------------------------------------
-- 権限
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.stats_threshold()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prefecture_region(TEXT)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.group_dashboard(UUID)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_dashboard(UUID)   TO authenticated;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_dashboard.sql を Studio の SQL エディタに全文貼って 1 回実行する。
--   最後の SELECT の先頭の行（まとめ）が「NG 0 件」であること。
-- =============================================================================
