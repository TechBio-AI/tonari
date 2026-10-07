-- =============================================================================
-- [Phase1-T0] 情報の器の土台: themes / theme_facts / fact_sources
--
-- 出所: db_schema_archive/draft/0001_theme_facts_scaffold.sql（正式版）を
--       supabase/migrations/ へ「昇格」したもの。docs/sql-review-s1-portal-hardening.md
--       §3 で指摘したスキーマドリフト（器の土台が migrations に無い）を解消する。
--
-- ※ Claude Code は適用しない。TechBio がレビュー後に手動適用する。
--
-- 適用順の要件（新規プロジェクトをゼロから通すため）:
--   本ファイルは、器を参照する後続マイグレーションより「前」に置く。すなわち
--     - 20260705_t6_themes_public_columns.sql（themes を ALTER）
--     - 20260722_s1_portal_public_read_hardening.sql（3テーブルへ RESTRICTIVE ポリシー）
--   より前に流れる日付（20260601）を採用している。
--
-- 冪等性（既存の本番DBに再度流しても壊れないこと）:
--   - CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION
--   - DROP TRIGGER|POLICY IF EXISTS → CREATE
--   - CREATE INDEX IF NOT EXISTS
--   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY（有効化済みでも no-op、エラーにならない）
--   - GRANT（重複付与は no-op）
--   本ファイルは既存テーブル（diseases 等）や既存関数（handle_updated_at）に触れない。
--   set_updated_at() は本器専用の別名関数で、00001 の handle_updated_at() とは非衝突
--   （確認: docs/sql-review… 追補。00001:55 handle_updated_at ≠ 本ファイル set_updated_at）。
-- =============================================================================

-- 拡張（UUID 生成に使用。既存環境では既に有効な場合あり）------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 共通ヘルパー: updated_at 自動更新トリガ関数（器専用の名前）
--   ※ 既存の public.handle_updated_at()（00001_create_tables.sql）とは別名。上書きしない。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 共通ヘルパー: アプリ内ロール判定（RLS / 承認ガード 用）
--   JWT の app_metadata.role を参照（'reviewer' / 'builder' / 'viewer'）。
--   - viewer : 閲覧のみ（承認済みだけ見える）
--   - builder: データ構築者（未承認の追加・自分の下書き編集）
--   - reviewer: 承認者（承認状態の変更が可能）
--   ※ 承認ガード(トリガ)は role を問わず発火する。service_role は RLS はバイパス
--     するが「トリガ」はバイパスしないため、承認するには JWT に reviewer ロールを
--     載せた文脈で実行する必要がある（＝自動投入が勝手に承認できない）。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION is_reviewer() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT app_role() = 'reviewer';
$$;

CREATE OR REPLACE FUNCTION is_builder() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT app_role() IN ('builder', 'reviewer');
$$;

-- =============================================================================
-- 1) themes — テーマ（疾患など）の基本情報
--    ※ tenant_id は付けない（全テナント共有の参照情報のため）
-- =============================================================================
CREATE TABLE IF NOT EXISTS themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報（中身）
  name_ja         TEXT NOT NULL,
  name_en         TEXT,
  intl_code       TEXT,                       -- 国際コード（例: ORPHA:xxxxx / ICD-10）
  category        TEXT,                        -- 分類（自由ラベル）
  rarity          TEXT,                        -- 希少度（自由。例: ultra_rare / rare / ...）

  -- 骨格: 承認状態
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID,                        -- 承認者（auth.users.id を想定。FK は環境依存のため付けない）
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,

  -- 骨格: 検証記録（根拠なし/古い/矛盾 を複数持てる）
  validation_flags TEXT[] NOT NULL DEFAULT '{}'
    CHECK (validation_flags <@ ARRAY['no_source','stale','contradictory']::text[]),
  last_validated_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一テーマの二重登録を緩く防ぐ（国際コードがある場合のみユニーク）
CREATE UNIQUE INDEX IF NOT EXISTS uq_themes_intl_code
  ON themes(intl_code) WHERE intl_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_themes_approval ON themes(approval_status);

DROP TRIGGER IF EXISTS trg_themes_updated_at ON themes;
CREATE TRIGGER trg_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 2) theme_facts — 情報の一片（汎用）。種類ラベルで何種類でも足せる
--   fact_type の推奨ラベル（固定ではない・自由に増やせる）:
--     特徴 / 比較対象 / 確認方法 / 相談先 / 気づかれにくさ /
--     たどり着く道筋 / 成り立ち / 頻度 / 対応の概要 / 経過の見通し 等
-- =============================================================================
CREATE TABLE IF NOT EXISTS theme_facts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id        UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,

  -- 柔軟な中身
  fact_type       TEXT NOT NULL,               -- 種類ラベル（自由。推奨リストは上記コメント）
  content         TEXT NOT NULL,               -- 中身（本文）
  content_data    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 構造化した付随情報（任意）
  display_order   INTEGER NOT NULL DEFAULT 0,  -- 順序

  -- 骨格: 承認状態
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,

  -- 骨格: 検証記録
  validation_flags TEXT[] NOT NULL DEFAULT '{}'
    CHECK (validation_flags <@ ARRAY['no_source','stale','contradictory']::text[]),
  last_validated_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theme_facts_theme    ON theme_facts(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_facts_type     ON theme_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_theme_facts_approval ON theme_facts(approval_status);
CREATE INDEX IF NOT EXISTS idx_theme_facts_order    ON theme_facts(theme_id, display_order);

DROP TRIGGER IF EXISTS trg_theme_facts_updated_at ON theme_facts;
CREATE TRIGGER trg_theme_facts_updated_at
  BEFORE UPDATE ON theme_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3) fact_sources — 出典（★ 情報の一片 = theme_facts 単位に紐付く・複数可）
--    1つの fact に複数の出典をぶら下げられる（1件必須は承認ガードで担保）。
-- =============================================================================
CREATE TABLE IF NOT EXISTS fact_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id         UUID NOT NULL REFERENCES theme_facts(id) ON DELETE CASCADE,

  ref_type        TEXT NOT NULL
    CHECK (ref_type IN ('guideline','pharmaceutical','literature','pubmed','registry','other')),
  title           TEXT NOT NULL,
  url             TEXT,
  external_id     TEXT,                        -- 汎用の外部識別子
  pubmed_id       TEXT,
  doi             TEXT,
  year            INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_sources_fact ON fact_sources(fact_id);

-- =============================================================================
-- 承認ガード（正式採用）— 「出典ゼロは承認不可」「承認は reviewer のみ」を DB で強制
--   発火条件: theme_facts が approved に「なる」瞬間（INSERT で直接 approved / UPDATE で
--             他状態→approved）。既に approved の行の他カラム更新では発火しない。
-- =============================================================================
CREATE OR REPLACE FUNCTION guard_fact_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'approved') THEN

    -- (1) 承認できるのは reviewer のみ
    IF NOT is_reviewer() THEN
      RAISE EXCEPTION '承認できるのは reviewer 権限のみです (theme_fact id=%)', NEW.id
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- (2) 出典が1件も無い情報は承認できない（出典必須）
    IF NOT EXISTS (SELECT 1 FROM fact_sources s WHERE s.fact_id = NEW.id) THEN
      RAISE EXCEPTION '出典が無い情報は承認できません（出典を1件以上付けてください） (theme_fact id=%)', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;

    -- 承認日時を自動補完（未指定なら現在時刻）
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_fact_approval ON theme_facts;
CREATE TRIGGER trg_guard_fact_approval
  BEFORE INSERT OR UPDATE ON theme_facts
  FOR EACH ROW EXECUTE FUNCTION guard_fact_approval();

-- =============================================================================
-- RLS（Row Level Security）— 閲覧 / 書き込み / 承認 で権限を分ける
--   注意: RLS は "行" 単位。「approved にできるのは reviewer」「出典必須」は
--   承認ガード(トリガ)で担保している（RLS 単独では列単位制御ができないため）。
-- =============================================================================
ALTER TABLE themes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_facts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_sources ENABLE ROW LEVEL SECURITY;

-- ---- themes ----------------------------------------------------------------
-- 閲覧: 一般ユーザは承認済みのみ / builder・reviewer は全件
DROP POLICY IF EXISTS themes_select ON themes;
CREATE POLICY themes_select ON themes FOR SELECT
  USING (approval_status = 'approved' OR is_builder());

DROP POLICY IF EXISTS themes_insert ON themes;
CREATE POLICY themes_insert ON themes FOR INSERT
  WITH CHECK (is_builder());

DROP POLICY IF EXISTS themes_update ON themes;
CREATE POLICY themes_update ON themes FOR UPDATE
  USING (is_reviewer() OR (is_builder() AND approval_status = 'pending'))
  WITH CHECK (is_reviewer() OR (is_builder() AND approval_status = 'pending'));

DROP POLICY IF EXISTS themes_delete ON themes;
CREATE POLICY themes_delete ON themes FOR DELETE
  USING (is_reviewer());

-- ---- theme_facts （themes と同方針）-----------------------------------------
DROP POLICY IF EXISTS theme_facts_select ON theme_facts;
CREATE POLICY theme_facts_select ON theme_facts FOR SELECT
  USING (approval_status = 'approved' OR is_builder());

DROP POLICY IF EXISTS theme_facts_insert ON theme_facts;
CREATE POLICY theme_facts_insert ON theme_facts FOR INSERT
  WITH CHECK (is_builder());

DROP POLICY IF EXISTS theme_facts_update ON theme_facts;
CREATE POLICY theme_facts_update ON theme_facts FOR UPDATE
  USING (is_reviewer() OR (is_builder() AND approval_status = 'pending'))
  WITH CHECK (is_reviewer() OR (is_builder() AND approval_status = 'pending'));

DROP POLICY IF EXISTS theme_facts_delete ON theme_facts;
CREATE POLICY theme_facts_delete ON theme_facts FOR DELETE
  USING (is_reviewer());

-- ---- fact_sources （親 fact の閲覧可否に追従）-------------------------------
DROP POLICY IF EXISTS fact_sources_select ON fact_sources;
CREATE POLICY fact_sources_select ON fact_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM theme_facts f
      WHERE f.id = fact_sources.fact_id
        AND (f.approval_status = 'approved' OR is_builder())
    )
  );

DROP POLICY IF EXISTS fact_sources_write ON fact_sources;
CREATE POLICY fact_sources_write ON fact_sources FOR ALL
  USING (is_builder())
  WITH CHECK (is_builder());

-- =============================================================================
-- テーブル/関数への GRANT（Supabase 標準ロール）
--   本プロジェクトの確立済み方針（db_schema_archive/skeleton_old_migrations/
--   20260506000003_grant_table_permissions.sql）を、器3テーブルに限って踏襲する。
--   実際のアクセス可否は上の RLS ポリシーが決める（GRANT はテーブルへの到達可否のみ）。
--
--   注: Supabase プラットフォームは既定で public スキーマの新規テーブルに
--       anon/authenticated への権限を自動付与する（ALTER DEFAULT PRIVILEGES）。
--       よって本番 Supabase では下記は概ね no-op（重複付与）。素の PostgreSQL や
--       既定権限を絞った環境でも連鎖が自足するよう、明示的に付けておく。
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON themes, theme_facts, fact_sources
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION app_role(), is_reviewer(), is_builder(), set_updated_at()
  TO anon, authenticated, service_role;

-- =============================================================================
-- 適用メモ
--   - service_role（Supabase 管理キー）は RLS をバイパスするが「トリガ」はバイパス
--     しない。承認ガードは service key 実行でも有効。承認するには JWT に
--     app_metadata.role='reviewer' を載せた文脈で UPDATE すること。
--   - 残存する既知の限界: 一度 approved にした fact から後で出典を全削除すると
--     「approved かつ出典ゼロ」になり得た。→ これは後続の
--     20260723_s1_source_delete_guard.sql で DB 層でも塞ぐ。
-- =============================================================================
