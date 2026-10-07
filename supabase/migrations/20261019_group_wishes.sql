-- =============================================================================
-- 患者会への参加希望 group_wishes と、公開用の集計 public_wish_counts（2026-10-19 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261012（stats_threshold）の後に当てる。
--
-- 何のための表か:
--   「この病気の患者会があれば参加したい」という希望を、病気ごとに数える。会員プロフィールは要らない（ログインしていればよい）。
--   公開面は集計の表 public_wish_counts だけを読む（group_wishes は読まない）。
--   運営は Studio から wish_summary(disease_idx) で都道府県・続柄・会員かどうかの内訳（実数）を見る。
--
-- 作るもの:
--   1. group_wishes          … 本人の行だけ insert / select / update（withdrawn_at だけ）。delete は無い
--   2. public_wish_counts    … 病気ごとの希望者数（n は文字。しきい値未満は「10未満」）。anon と authenticated が全行読める。
--                              書くのはトリガー sync_public_wish_count だけ（API ロールは insert / update / delete 不可）
--   3. sync_public_wish_count … group_wishes の AFTER INSERT / UPDATE / DELETE で、変わった病気の数を数え直して写す
--   4. wish_summary          … 運営向けの内訳（実数）。どの API ロールにも EXECUTE を与えない（Studio の所有者ロールで呼ぶ）
--
-- 数え方:
--   withdrawn_at が無い行だけを数える。n はしきい値（public.stats_threshold() = 10）未満なら「10未満」（0 を含む）、
--   それ以外は実数。補完秘匿は無い（病気ごとに 1 つの数で、同じ表に足し合わせて総数になる組が無いため）。
--
-- Claude Code の判断（契約に無いもの。変えるなら指示を）:
--   - 取り消した後にもう一度希望したいときは、本人が withdrawn_at を NULL に戻す（一意制約 (disease_idx, user_id) があり、
--     新しい行は作れないため）。取り消しの時刻はトリガーが now() にする（アプリから送られた時刻は使わない）
--   - 数が 0 になっても public_wish_counts の行は消さずに「10未満」のまま残す（0 と 1〜9 を見分けられないようにする）。
--     一度も希望の無い病気には行が無い。画面は、行が無い病気も「10未満」と出すこと
--   - public_wish_counts の updated_at は n の文字が変わったときだけ変える
--     （「10未満」のまま誰かが登録・取り消ししたことを、時刻から読めないようにする）
--   - disease_idx は 0 以上の整数（知識ファイルの件数との照合は DB ではしない）
--
-- ★ disease_idx は知識ファイルの並び順で、固定 ID ではない（docs/kb_issues_2026-08-29.md の 47）。
--   知識ファイルの統合・追加・並べ替えで、登録済みの希望が別の病気を指すようになる。idx を付け替えるときは、
--   group_wishes と public_wish_counts の disease_idx も同じ計画で付け替えること。
--
-- 個人情報（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   「どの病気の会に参加したいか」は、本人か家族がその病気である見込みを示す医療情報に近い。
--   本人と運営（Studio）だけが行を見る。外部 LLM API（Anthropic 等）へ送らない。
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.group_wishes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_idx     INTEGER NOT NULL CHECK (disease_idx >= 0),
    user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    -- 値域は member_profiles.prefecture と同じ（20260926 の CHECK と lib/portal/member-profile.ts の PREFECTURES）
    prefecture      TEXT NOT NULL CHECK (prefecture IN (
        '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
        '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
        '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
        '岐阜県', '静岡県', '愛知県', '三重県',
        '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
        '鳥取県', '島根県', '岡山県', '広島県', '山口県',
        '徳島県', '香川県', '愛媛県', '高知県',
        '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
    )),
    relation        TEXT NOT NULL CHECK (relation IN ('self', 'family')),
    is_group_member BOOLEAN,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    withdrawn_at    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT group_wishes_one_per_disease UNIQUE (disease_idx, user_id)
);

COMMENT ON TABLE public.group_wishes IS
'患者会への参加希望（病気ごと）。本人の行だけが見える・書ける。公開面は読まない（public_wish_counts を読む）。運営は wish_summary を Studio で使う';
COMMENT ON COLUMN public.group_wishes.disease_idx IS
'知識ファイルの並び順（固定 ID ではない。kb_issues 47）。並びが変わるときは付け替えが要る';
COMMENT ON COLUMN public.group_wishes.relation IS
'self = ご本人、family = ご家族';
COMMENT ON COLUMN public.group_wishes.is_group_member IS
'いま何かの患者会の会員か（本人の申告。任意）';
COMMENT ON COLUMN public.group_wishes.withdrawn_at IS
'取り消した時刻（トリガーが now() にする）。NULL に戻すと希望を再開する';

CREATE TABLE IF NOT EXISTS public.public_wish_counts (
    disease_idx INTEGER PRIMARY KEY,
    n           TEXT NOT NULL CHECK (n = '10未満' OR n ~ '^[0-9]+$'),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.public_wish_counts IS
'病気ごとの患者会参加希望の数（公開用）。しきい値未満は「10未満」。トリガー sync_public_wish_count だけが書く。行が無い病気は画面で「10未満」と出す';


-- =============================================================================
-- 2. RLS と権限（物理削除はどの API ロールにも与えない）
-- =============================================================================
ALTER TABLE public.group_wishes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_wish_counts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.group_wishes       FROM anon, authenticated;
REVOKE ALL ON public.public_wish_counts FROM anon, authenticated;

DROP POLICY IF EXISTS group_wishes_select_own ON public.group_wishes;
CREATE POLICY group_wishes_select_own ON public.group_wishes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS group_wishes_insert_own ON public.group_wishes;
CREATE POLICY group_wishes_insert_own ON public.group_wishes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND withdrawn_at IS NULL);

DROP POLICY IF EXISTS group_wishes_update_own ON public.group_wishes;
CREATE POLICY group_wishes_update_own ON public.group_wishes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT ON public.group_wishes TO authenticated;
GRANT INSERT (disease_idx, user_id, prefecture, relation, is_group_member) ON public.group_wishes TO authenticated;
GRANT UPDATE (withdrawn_at) ON public.group_wishes TO authenticated;

DROP POLICY IF EXISTS public_wish_counts_select_all ON public.public_wish_counts;
CREATE POLICY public_wish_counts_select_all ON public.public_wish_counts
    FOR SELECT TO anon, authenticated
    USING (true);

GRANT SELECT ON public.public_wish_counts TO anon, authenticated;


-- =============================================================================
-- 3. トリガー
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 取り消しの時刻を now() にそろえる（BEFORE UPDATE）
--   NULL → 値: now()。値 → 値: 前の時刻のまま。値 → NULL: 再開（NULL のまま）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_group_wish_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.withdrawn_at IS NOT NULL THEN
        NEW.withdrawn_at := coalesce(OLD.withdrawn_at, now());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_group_wish_withdrawal ON public.group_wishes;
CREATE TRIGGER stamp_group_wish_withdrawal
    BEFORE UPDATE ON public.group_wishes
    FOR EACH ROW EXECUTE FUNCTION public.stamp_group_wish_withdrawal();

-- -----------------------------------------------------------------------------
-- 公開用の数を数え直す（AFTER INSERT / UPDATE / DELETE。変わった病気だけ）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_public_wish_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_idx INTEGER;
    v_cnt INTEGER;
    v_n   TEXT;
BEGIN
    FOR v_idx IN
        SELECT DISTINCT x.idx
          FROM (VALUES (CASE WHEN TG_OP <> 'INSERT' THEN OLD.disease_idx END),
                       (CASE WHEN TG_OP <> 'DELETE' THEN NEW.disease_idx END)) AS x(idx)
         WHERE x.idx IS NOT NULL
    LOOP
        SELECT count(*) INTO v_cnt
          FROM public.group_wishes w
         WHERE w.disease_idx = v_idx AND w.withdrawn_at IS NULL;

        v_n := CASE WHEN v_cnt < public.stats_threshold() THEN '10未満' ELSE v_cnt::TEXT END;

        INSERT INTO public.public_wish_counts AS c (disease_idx, n, updated_at)
        VALUES (v_idx, v_n, now())
        ON CONFLICT (disease_idx) DO UPDATE
            SET n = EXCLUDED.n, updated_at = now()
            WHERE c.n IS DISTINCT FROM EXCLUDED.n;
    END LOOP;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_wish_count ON public.group_wishes;
CREATE TRIGGER sync_public_wish_count
    AFTER INSERT OR UPDATE OR DELETE ON public.group_wishes
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_wish_count();


-- =============================================================================
-- 4. 運営向けの内訳（Studio で使う。API ロールからは呼べない）
--   取り消していない希望を、都道府県・続柄・会員かどうか（未回答は NULL）ごとの実数で返す。user_id は返さない
-- =============================================================================
CREATE OR REPLACE FUNCTION public.wish_summary(p_disease_idx INTEGER)
RETURNS TABLE (prefecture TEXT, relation TEXT, is_group_member BOOLEAN, n BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT w.prefecture, w.relation, w.is_group_member, count(*)
      FROM public.group_wishes w
     WHERE w.disease_idx = p_disease_idx AND w.withdrawn_at IS NULL
     GROUP BY w.prefecture, w.relation, w.is_group_member
     ORDER BY w.prefecture, w.relation, w.is_group_member NULLS LAST;
$$;

COMMENT ON FUNCTION public.wish_summary(INTEGER) IS
'運営向け。病気ごとの参加希望の内訳（都道府県・続柄・会員かどうか）を実数で返す。API ロールには EXECUTE を与えない（Studio で使う）';


-- =============================================================================
-- 5. 関数の実行権限（どれも API から呼ばない）
-- =============================================================================
REVOKE ALL ON FUNCTION public.stamp_group_wish_withdrawal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_public_wish_count()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wish_summary(INTEGER)         FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   20261020_delete_account_v4.sql も当ててから、scripts/portal/verify_wishes.sql を Studio の SQL エディタに全文貼って 1 回実行する。
--   最後の SELECT の先頭の行（まとめ）が「NG 0 件」であること。
-- =============================================================================
