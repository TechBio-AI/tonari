-- ==============================================================================
-- Migration: Create Audit Logs Table
-- Description: 監査ログ基盤構築用テーブル `audit_logs` を作成します。
-- ==============================================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,           -- CREATE, UPDATE, DELETE, VIEW, APPROVE, ERROR
    entity_type VARCHAR(255) NOT NULL,      -- DOCTOR, PHARMA, FOLLOWUP, SETTINGS, SYSTEM
    entity_id VARCHAR(255),                 -- 操作対象のID (Optional)
    actor_id UUID,                          -- 操作したユーザーのID (Optional)
    actor_email VARCHAR(255),               -- 操作したユーザーのEmail (Optional)
    actor_role VARCHAR(255),                -- 操作したユーザーのロール (Optional)
    details JSONB DEFAULT '{}'::jsonb,      -- 詳細情報（変更前後の差分、検索クエリなど）
    ip_address VARCHAR(45),                 -- IPアドレス (IPv4/IPv6)
    user_agent TEXT,                        -- ユーザーエージェント
    status VARCHAR(50) DEFAULT 'success',   -- SUCCESS, FAILURE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add Comments to the table and columns for better maintainability
COMMENT ON TABLE public.audit_logs IS 'System audit logs for tracking user actions and system events';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed: CREATE, UPDATE, DELETE, VIEW, APPROVE, ERROR';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Category of the entity affected: DOCTOR, PHARMA, FOLLOWUP, SETTINGS, SYSTEM';
COMMENT ON COLUMN public.audit_logs.details IS 'Structured JSON payload containing action specifics like diffs or search queries';

-- 3. Create Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- 4. Enable Row Level Security (RLS)
-- 監査ログは原則追記のみで、管理者以外は閲覧不可にするのが基本設計
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- レコードの追加は許可 (システム機能のサービスロールや認証ユーザー経由など、用途によって必要権限を調整)
CREATE POLICY "Allow insert for all users" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- 管理者のみ閲覧・操作可能とするなど、必要に応じてポリシーを追加
-- RLS は別途 admin role を設定している場合に限定
CREATE POLICY "Allow select for authenticated users" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (true);
