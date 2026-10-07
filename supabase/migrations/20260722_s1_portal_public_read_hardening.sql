-- =============================================================================
-- [Phase1-S1-A] 公開面の読み取り境界を締める（レビュー用・本番 未適用）
--
-- ※ Claude Code は適用しない。TechBio が SQL レビュー後に手動適用する（D9ゲート）。
--
-- 前提（docs/SCHEMA_CANON.md 2026-07-05 宣言）:
--   - 器3テーブル（themes / theme_facts / fact_sources）は本番適用済み・0行。
--   - T6（themes.slug / themes.published_at）も適用済み（Success 確認済み）。
--   - 既存の承認ガード trg_guard_fact_approval と既存 RLS ポリシーには「触れない」。
--     本ファイルは既存定義を書き換えず、RESTRICTIVE ポリシーで AND 条件を足すだけ。
--
-- 解決する問題:
--   既存の RLS `theme_facts_select` は
--       USING (approval_status = 'approved' OR is_builder())
--   であり、次の2つが素通りする:
--     (1) 承認済みだが出典ゼロのファクト
--         → 0001_theme_facts_scaffold.sql 末尾「残存する既知の限界」に記載された穴。
--            承認"時"のガードのため、承認後に fact_sources を全削除すると
--            「approved かつ出典ゼロ」が成立し、公開面から読めてしまう。
--     (2) 親テーマが未公開（published_at IS NULL）でもファクトが読める
--         → 承認（品質判定）と公開（編集判断）を分けた T6 の意図が読み取り側で
--            強制されていない。
--
-- 設計方針:
--   RESTRICTIVE ポリシーを使う。PostgreSQL の RLS は
--     - PERMISSIVE 同士 … OR で合成（＝足すと権限が「広がる」）
--     - RESTRICTIVE   … AND で合成（＝足すと権限が「狭まる」）
--   既存ポリシーは全て PERMISSIVE。ここで PERMISSIVE を足すと逆に穴が広がるため、
--   必ず RESTRICTIVE で足す。既存ポリシーは DROP も CREATE OR REPLACE もしない。
--
-- 二重防御の対応関係:
--   - 書き込み側（承認の瞬間）… 既存トリガ guard_fact_approval（出典ゼロは承認不可）
--   - 読み取り側（公開の瞬間）… 本ファイルの RESTRICTIVE ポリシー（出典ゼロは見えない）
--   前者だけでは上記(1)の穴が残り、後者だけでは未出典データが承認され得る。両方要る。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ヘルパー（SECURITY DEFINER が必須な理由）
--
-- RLS ポリシーの USING 句に書いたサブクエリは、参照先テーブルの RLS も評価される。
-- theme_facts のポリシーから fact_sources を直接 EXISTS で引くと、
-- fact_sources_select が theme_facts を引いているため
--     theme_facts → fact_sources → theme_facts → …
-- の相互再帰になり `infinite recursion detected in policy` で失敗する。
-- SECURITY DEFINER 関数は所有者（postgres）権限で走り RLS をバイパスするため、
-- この再帰を断ち切れる。search_path を固定して関数乗っ取りを防ぐ。
-- -----------------------------------------------------------------------------

-- 出典が1件以上あるか（RLS をバイパスして素の存在だけを見る）
CREATE OR REPLACE FUNCTION fact_has_source(p_fact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM fact_sources s WHERE s.fact_id = p_fact_id);
$$;

COMMENT ON FUNCTION fact_has_source(UUID) IS
  '[Phase1-S1-A] 指定ファクトに出典が1件以上あるか。RLS 相互再帰回避のため SECURITY DEFINER。';

-- 親テーマが「承認済み かつ 公開済み」か
CREATE OR REPLACE FUNCTION theme_is_public(p_theme_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM themes t
    WHERE t.id = p_theme_id
      AND t.approval_status = 'approved'
      AND t.published_at IS NOT NULL
  );
$$;

COMMENT ON FUNCTION theme_is_public(UUID) IS
  '[Phase1-S1-A] 親テーマが承認済みかつ公開済みか。RLS 相互再帰回避のため SECURITY DEFINER。';

-- -----------------------------------------------------------------------------
-- themes — 一般閲覧は「承認済み かつ 公開済み」に限る
--   is_builder()（builder / reviewer）は従来どおり全件見える（下書き運用のため）。
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS themes_public_read_guard ON themes;
CREATE POLICY themes_public_read_guard ON themes
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_builder()
    OR (approval_status = 'approved' AND published_at IS NOT NULL)
  );

-- -----------------------------------------------------------------------------
-- theme_facts — 一般閲覧は「承認済み かつ 出典1件以上 かつ 親テーマ公開済み」に限る
--   ★ これが「出典なき情報は公開面に存在しない」の読み取り側の担保。
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS theme_facts_public_read_guard ON theme_facts;
CREATE POLICY theme_facts_public_read_guard ON theme_facts
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_builder()
    OR (
      approval_status = 'approved'
      AND fact_has_source(id)
      AND theme_is_public(theme_id)
    )
  );

-- -----------------------------------------------------------------------------
-- fact_sources — 一般閲覧は「親ファクトが公開条件を満たす」場合に限る
--   既存 fact_sources_select は親の approval_status しか見ていないため、
--   親テーマ未公開でも出典だけ読めてしまう。ここで揃える。
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS fact_sources_public_read_guard ON fact_sources;
CREATE POLICY fact_sources_public_read_guard ON fact_sources
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_builder()
    OR EXISTS (
      SELECT 1 FROM theme_facts f
      WHERE f.id = fact_sources.fact_id
        AND f.approval_status = 'approved'
        AND theme_is_public(f.theme_id)
    )
  );
-- 注: ここで theme_facts を直接引いても再帰にならない。fact_sources → theme_facts の
--     片方向で、theme_facts 側は fact_has_source()（SECURITY DEFINER）経由でしか
--     fact_sources を見ないため、ポリシー評価の輪が閉じない。

-- -----------------------------------------------------------------------------
-- 索引（公開面クエリの形に合わせる）
--   公開面は「published かつ approved の themes を slug で1件」「その theme_id の
--   approved な facts を display_order 順」で引く。既存 idx_theme_facts_order
--   (theme_id, display_order) はあるので、themes 側の公開判定だけ足す。
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_themes_published
  ON themes(published_at)
  WHERE approval_status = 'approved' AND published_at IS NOT NULL;

-- =============================================================================
-- 適用時の注意（TechBio レビュー用）
--
-- 1) 本ファイルは既存ポリシー・既存トリガを一切変更しない。追加のみ。
--    ロールバックは本ファイルが作った3ポリシー・2関数・1索引を DROP するだけで済む。
--
-- 2) RESTRICTIVE は「全ロール」に効く（TO 句を省略＝PUBLIC）。service_role は
--    そもそも RLS をバイパスするため供給ライン（scripts/ingest）には影響しない。
--    影響を受けるのは anon / authenticated の SELECT のみ。
--
-- 3) 器は現在 0 行のため、適用しても表示上の変化は無い（空のまま空）。
--    変化が出るのは中身を入れる S2 以降。今のうちに締めておくのが狙い。
--
-- 4) ★ 本ファイルで「閉じていない」穴（意図的・要判断）:
--    承認済みファクトから出典を後から全削除する操作自体は、依然 DB で阻止していない。
--    読み取り側は本ファイルで塞がった（見えなくなる）ので公開事故にはならないが、
--    「approved なのに出典ゼロ」という不整合データは作れてしまう。
--    完全封鎖には fact_sources への BEFORE DELETE トリガが要るが、
--    theme_facts 削除時の ON DELETE CASCADE と相互作用して正常な削除まで
--    誤爆させる危険があり、0001 の作者も同じ理由で見送っている
--    （0001_theme_facts_scaffold.sql 末尾「残存する既知の限界」）。
--    ここでも踏襲して入れていない。運用（出典削除時に validation_flags に
--    'no_source' を立てる）で補うか、CASCADE 誤爆を検証したうえで別途入れるかは
--    TechBio の判断待ち。
--
-- 5) 検証クエリ（適用後、中身が入ってから流す想定。今は 0 行なので全て 0 件）:
--      -- anon 文脈で「出典ゼロの approved fact」が見えないこと
--      SELECT count(*) FROM theme_facts f
--       WHERE f.approval_status = 'approved'
--         AND NOT EXISTS (SELECT 1 FROM fact_sources s WHERE s.fact_id = f.id);
--      -- ↑ builder 文脈では件数が出てよい。anon 文脈で 0 になることが本ファイルの効果。
-- =============================================================================
