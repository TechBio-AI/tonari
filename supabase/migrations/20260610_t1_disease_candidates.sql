-- T1: disease_candidates approval queue (pending review)
-- 半自動データ構築パイプラインの「承認待ち部屋」。
-- 既存テーブル(diseases等)には一切触れない純粋な新規追加。
-- 承認済みデータだけが既存の確定済み世界へ引っ越す。

CREATE TABLE IF NOT EXISTS disease_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja TEXT NOT NULL,
  name_en TEXT,
  orpha_code TEXT,
  structured_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  approval_status TEXT DEFAULT 'pending' NOT NULL
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  collected_from TEXT,
  confidence_flag TEXT
    CHECK (confidence_flag IN ('high', 'medium', 'low')),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES disease_candidates(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL
    CHECK (ref_type IN ('guideline', 'pharmaceutical', 'literature', 'pubmed')),
  title TEXT NOT NULL,
  url TEXT,
  pubmed_id TEXT,
  doi TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disease_candidates_status
  ON disease_candidates(approval_status);
CREATE INDEX IF NOT EXISTS idx_candidate_sources_candidate
  ON candidate_sources(candidate_id);
