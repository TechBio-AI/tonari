-- =============================================================================
-- [Phase0-T6] themes への公開用カラム追加（承認済み・本番 未適用）
--
-- ※ db_schema_archive/draft/0002_themes_public_columns.sql の SQL案が人間の
--    承認を得たため supabase/migrations/ へ昇格したもの。本番 DB への適用は
--    TechBio が手作業で行う（Claude Code は適用しない）。
--
-- 目的: 公開ポータルの疾患ページ URL (/diseases/[slug]) と公開状態の管理に
--       必要な最小カラムを themes に追加する。
--
-- 前提（2026-07-05 時点）:
--   - themes は本番適用済みだが 0 行（空の器）。既存行が無いため
--     NOT NULL カラムを DEFAULT 無しで追加できる（指示書 T6 の前提通り）。
--   - category は既存カラム（0001_theme_facts_scaffold.sql L75）のため追加しない。
--
-- 過剰設計をしないために「入れないもの」:
--   - published_at 用のインデックス（行数が小さいうちは不要。必要になってから）
--   - slug の自動生成関数・トリガ（slug は人間/パイプラインが明示的に与える）
--   - 公開専用ビュー・追加 RLS ポリシー（既存の approved 限定 SELECT で足りる）
-- =============================================================================

-- slug: 疾患ページの安定識別子（例: 'fabry'）。一度決めたら不変（設計書 5-2）。
--   小文字英数字とハイフンのみを CHECK で強制し、日本語 URL・大文字・空文字の
--   混入をデータ層で防ぐ。
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- 一意制約（既存の uq_themes_intl_code と同じ命名・付与スタイル）
CREATE UNIQUE INDEX IF NOT EXISTS uq_themes_slug ON themes(slug);

-- published_at: 公開日時。NULL = 未公開。
--   意味論: 「公開ページに載せてよい」の最終条件はアプリ層（ビルド時クエリ）で
--   approval_status = 'approved' AND published_at IS NOT NULL の両方を課す。
--   承認（品質判定）と公開（編集判断）を別の軸として持つための最小カラム。
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

-- =============================================================================
-- 適用時の注意:
--   - themes に行が存在する状態で流すと slug の NOT NULL で失敗する（意図的な
--     安全装置。その場合は適用前に既存行への slug 付与方針を人間が決める）。
--   - RLS ポリシー・承認ガード（トリガ）には一切触れない。
--   - 適用後にローカルの型定義（lib/ 側で器を参照する型）を更新する。
-- =============================================================================
