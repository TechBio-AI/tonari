-- 希少疾患診断システム用テーブル

-- 疾患マスタテーブル
CREATE TABLE IF NOT EXISTS public.diseases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    orpha_code VARCHAR(10) UNIQUE,
    name_ja TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ja TEXT,
    description_en TEXT,
    prevalence VARCHAR(20) CHECK (prevalence IN ('very-rare', 'rare', 'occasional')),
    inheritance JSONB DEFAULT '[]'::jsonb,
    age_of_onset JSONB DEFAULT '[]'::jsonb,
    diagnostic_methods JSONB DEFAULT '[]'::jsonb,
    specialty VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

-- 症状マスタテーブル
CREATE TABLE IF NOT EXISTS public.symptoms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name_ja TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category VARCHAR(50),
    hpo_code VARCHAR(15),
    description_ja TEXT,
    description_en TEXT,
    body_system VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- 疾患-症状関連テーブル
CREATE TABLE IF NOT EXISTS public.disease_symptoms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disease_id UUID REFERENCES public.diseases(id) ON DELETE CASCADE NOT NULL,
    symptom_id UUID REFERENCES public.symptoms(id) ON DELETE CASCADE NOT NULL,
    frequency DECIMAL(3,2) CHECK (frequency >= 0 AND frequency <= 1) DEFAULT 0.5,
    is_major BOOLEAN DEFAULT false,
    weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(disease_id, symptom_id)
);

-- 診断履歴テーブル
CREATE TABLE IF NOT EXISTS public.diagnosis_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    input_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    patient_info JSONB DEFAULT '{}'::jsonb,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    ip_address INET,
    user_agent TEXT
);

-- 診断統計テーブル
CREATE TABLE IF NOT EXISTS public.diagnosis_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    total_searches INTEGER DEFAULT 0,
    successful_diagnoses INTEGER DEFAULT 0,
    avg_confidence_score DECIMAL(5,2),
    top_symptoms JSONB DEFAULT '[]'::jsonb,
    top_diseases JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_diseases_orpha_code ON public.diseases(orpha_code);
CREATE INDEX IF NOT EXISTS idx_diseases_name_ja ON public.diseases USING gin(to_tsvector('simple', name_ja));
CREATE INDEX IF NOT EXISTS idx_diseases_name_en ON public.diseases USING gin(to_tsvector('english', name_en));
CREATE INDEX IF NOT EXISTS idx_diseases_prevalence ON public.diseases(prevalence);

CREATE INDEX IF NOT EXISTS idx_symptoms_name_ja ON public.symptoms USING gin(to_tsvector('simple', name_ja));
CREATE INDEX IF NOT EXISTS idx_symptoms_name_en ON public.symptoms USING gin(to_tsvector('english', name_en));
CREATE INDEX IF NOT EXISTS idx_symptoms_category ON public.symptoms(category);
CREATE INDEX IF NOT EXISTS idx_symptoms_hpo_code ON public.symptoms(hpo_code);

CREATE INDEX IF NOT EXISTS idx_disease_symptoms_disease_id ON public.disease_symptoms(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_symptoms_symptom_id ON public.disease_symptoms(symptom_id);
CREATE INDEX IF NOT EXISTS idx_disease_symptoms_frequency ON public.disease_symptoms(frequency);
CREATE INDEX IF NOT EXISTS idx_disease_symptoms_is_major ON public.disease_symptoms(is_major);

CREATE INDEX IF NOT EXISTS idx_diagnosis_history_session_id ON public.diagnosis_history(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_history_created_at ON public.diagnosis_history(created_at);

-- トリガー関数（updated_atの自動更新用）
CREATE TRIGGER set_updated_at_diseases
    BEFORE UPDATE ON public.diseases
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_symptoms
    BEFORE UPDATE ON public.symptoms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security有効化（将来の認証実装用）
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_stats ENABLE ROW LEVEL SECURITY;

-- 一般公開ポリシー（認証不要でアクセス可能）
CREATE POLICY "Public access to diseases" ON public.diseases
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public access to symptoms" ON public.symptoms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public access to disease_symptoms" ON public.disease_symptoms
    FOR SELECT USING (true);

-- 診断履歴は匿名でも記録可能
CREATE POLICY "Anonymous can insert diagnosis history" ON public.diagnosis_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous can view diagnosis stats" ON public.diagnosis_stats
    FOR SELECT USING (true);

-- 統計更新関数
CREATE OR REPLACE FUNCTION public.update_diagnosis_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.diagnosis_stats (date, total_searches)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date)
    DO UPDATE SET 
        total_searches = diagnosis_stats.total_searches + 1,
        created_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 診断履歴挿入時の統計更新トリガー
CREATE TRIGGER update_stats_on_diagnosis
    AFTER INSERT ON public.diagnosis_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_diagnosis_stats();