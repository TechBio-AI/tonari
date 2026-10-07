-- ═══════════════════════════════════════════════════════════════
-- A-5: Disease型 再設計 — Supabase マイグレーション
-- RareDx 世界一の希少疾患データベース基盤
-- 
-- 実行順序:
--   1. ALTER TABLE diseases (既存テーブル拡張)
--   2. CREATE TABLE (新テーブル6種)
--   3. CREATE INDEX (検索高速化)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────
-- 1. diseases テーブル拡張（後方互換: 全て NULL 許容）
-- ─────────────────────────────────────────────

-- 国際標準コード
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS omim_id TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS icd10_code TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS icd11_code TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS mondo_id TEXT;

-- 有病率詳細
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS prevalence_class TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS prevalence_birth TEXT;

-- 分類・メタデータ
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS disorder_type TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS disorder_group TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS expert_link TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS designated_intractable_id TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS data_version TEXT;
ALTER TABLE diseases ADD COLUMN IF NOT EXISTS last_medical_review DATE;

-- ─────────────────────────────────────────────
-- 2. disease_genes（疾患⇔遺伝子リレーション）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_genes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  gene_symbol TEXT NOT NULL,
  gene_name TEXT,
  association_type TEXT,
  omim_gene_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_genes_disease ON disease_genes(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_genes_symbol ON disease_genes(gene_symbol);

-- ─────────────────────────────────────────────
-- 3. drugs（薬剤マスター）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name TEXT NOT NULL,
  brand_name_ja TEXT,
  brand_name_intl TEXT,
  manufacturer TEXT,
  drug_class TEXT,
  mechanism_ja TEXT,
  mechanism_en TEXT,
  dosage TEXT,
  administration_route TEXT,
  administration_detail TEXT,
  side_effects JSONB DEFAULT '[]'::jsonb,
  contraindications JSONB DEFAULT '[]'::jsonb,
  monitoring JSONB DEFAULT '[]'::jsonb,
  orphan_drug_designation BOOLEAN DEFAULT FALSE,
  pmda_approval_date DATE,
  fda_approval_date DATE,
  ema_approval_date DATE,
  nhi_price TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drugs_generic_name ON drugs(generic_name);
CREATE INDEX IF NOT EXISTS idx_drugs_brand_ja ON drugs(brand_name_ja);

-- ─────────────────────────────────────────────
-- 4. disease_drugs（疾患⇔薬剤リレーション）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  indication_type TEXT NOT NULL CHECK (indication_type IN ('approved', 'off_label', 'clinical_trial', 'investigational')),
  approval_status_ja TEXT,
  approval_status_intl TEXT,
  evidence_level TEXT CHECK (evidence_level IS NULL OR evidence_level IN ('A', 'B', 'C', 'D')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_drugs_disease ON disease_drugs(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_drugs_drug ON disease_drugs(drug_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_disease_drugs_unique ON disease_drugs(disease_id, drug_id, indication_type);

-- ─────────────────────────────────────────────
-- 5. disease_pathophysiology（疾患⇔病態生理）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_pathophysiology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE UNIQUE,
  enzyme_deficiency TEXT,
  affected_enzyme TEXT,
  substrate_accumulation TEXT,
  affected_organs JSONB DEFAULT '[]'::jsonb,
  pathways JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 6. disease_diagnosis（疾患⇔診断情報）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_diagnosis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE UNIQUE,
  screening_tests JSONB DEFAULT '[]'::jsonb,
  confirmatory_tests JSONB DEFAULT '[]'::jsonb,
  diagnostic_criteria JSONB DEFAULT '[]'::jsonb,
  differential_diagnosis JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. disease_prognosis（疾患⇔予後）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_prognosis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE UNIQUE,
  natural_history TEXT,
  with_treatment TEXT,
  complications JSONB DEFAULT '[]'::jsonb,
  life_expectancy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. disease_references（疾患⇔文献）
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disease_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('guideline', 'pharmaceutical', 'literature', 'pubmed')),
  title TEXT NOT NULL,
  url TEXT,
  pubmed_id TEXT,
  doi TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_references_disease ON disease_references(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_references_type ON disease_references(ref_type);

-- ─────────────────────────────────────────────
-- 9. diseases テーブルの追加インデックス
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_diseases_omim ON diseases(omim_id) WHERE omim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_icd10 ON diseases(icd10_code) WHERE icd10_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_icd11 ON diseases(icd11_code) WHERE icd11_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_mondo ON diseases(mondo_id) WHERE mondo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_orpha ON diseases(orpha_code) WHERE orpha_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_intractable ON diseases(designated_intractable_id) WHERE designated_intractable_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diseases_source ON diseases(data_source);
CREATE INDEX IF NOT EXISTS idx_diseases_specialty ON diseases(specialty);

-- disease_symptoms テーブル拡張（既存テーブル）
ALTER TABLE disease_symptoms ADD COLUMN IF NOT EXISTS hpo_frequency_class TEXT;
ALTER TABLE disease_symptoms ADD COLUMN IF NOT EXISTS onset_stage TEXT;
ALTER TABLE disease_symptoms ADD COLUMN IF NOT EXISTS source TEXT;

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- マイグレーション完了
-- 新テーブル: disease_genes, drugs, disease_drugs,
--            disease_pathophysiology, disease_diagnosis,
--            disease_prognosis, disease_references
-- 拡張テーブル: diseases (+14カラム), disease_symptoms (+3カラム)
-- ═══════════════════════════════════════════════════════════════
