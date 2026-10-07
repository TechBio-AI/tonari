-- =============================================================================
-- 投稿・コメントの通報 content_reports（2026-10-14 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261013（行事・出欠など）の後に当てる。
--
-- 契約（画面の担当と共通）:
--   content_reports(id, group_id, post_id null, comment_id null〔どちらか一方〕, reporter_id, reason ≤200,
--                   created_at, handled_at null, handled_by null)
--   表は API ロール（anon・authenticated）から直接触れない（RLS を有効にし、ポリシーを置かず、権限もはがす）。
--   report_group_content(p_post_id uuid, p_comment_id uuid, p_reason text) → 通報の id
--       会員のみ。自分が在籍している会の、消されていない投稿・コメントだけ。同じ人が同じ対象を二度通報すると already_reported
--   list_group_reports(p_group_id uuid) → (id, post_id, comment_id, reason, created_at, handled_at)
--       その会の世話人のみ。通報者（reporter_id）と対応者（handled_by）は返さない
--   mark_report_handled(p_report_id uuid)
--       その通報の会の世話人のみ。handled_at・handled_by を立てる
--
-- エラーの語（既存どおり RAISE EXCEPTION … P0001。lib/portal/tenancy.ts の FAILURE_REASONS で読み替える）:
--   unauthenticated / invalid_input / forbidden / already_reported
--   ★ already_reported は FAILURE_REASONS にまだ無い（画面の担当が足す）。無いままだと 'failed' に読み替わる。
--
-- Claude Code の判断で決めたこと（契約に書かれていないもの）:
--   - group_id は呼び出し側から受け取らず、対象の投稿（コメントならその投稿）の会から関数が決める
--   - 対象が無い・論理削除済み・コメントの親の投稿が論理削除済み・在籍していない会の対象は、すべて forbidden
--     （delete_group_post と同じ。対象があるかどうかを区別して返さない）
--   - 理由は前後の空白（全角を含む）を落として保存する。空でもよい（''）。落とした後で 200 文字を超えたら invalid_input
--   - 二重通報の判定は、対応済み（handled_at あり）でも数える（同じ人は同じ対象を 1 回だけ通報できる）
--   - 自分の投稿・コメントの通報も止めない
--   - mark_report_handled は、対応済みの通報に呼んでもエラーにせず何も変えない（最初の handled_at・handled_by を残す）
--   - list_group_reports の並びは、未対応を先に、その中で新しい順
--   - 対象の投稿・コメントが論理削除されても通報は残る（物理削除・会の削除では CASCADE で消える）
--   - 通報した人がアカウントを消すと、その人の通報は消える（20261015 の delete_my_account と、reporter_id の CASCADE）。
--     対応した世話人がアカウントを消すと handled_by だけ NULL になる（handled_at は残る）
--
-- 個人情報（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   理由には病状や人名が書かれうる。外部 LLM API（Anthropic 等）へ送らない。誰が通報したかは世話人にも見せない。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. 表
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    post_id     UUID REFERENCES public.group_posts (id) ON DELETE CASCADE,
    comment_id  UUID REFERENCES public.group_comments (id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    reason      TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 200),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    handled_at  TIMESTAMP WITH TIME ZONE,
    handled_by  UUID REFERENCES auth.users ON DELETE SET NULL,
    -- 対象は投稿かコメントのどちらか一方
    CONSTRAINT content_reports_one_target CHECK (num_nonnulls(post_id, comment_id) = 1),
    -- 対応者は対応済みの行にだけ入る（対応者のアカウント削除で NULL になりうるので、handled_at 側だけを縛る）
    CONSTRAINT content_reports_handled_pair CHECK (handled_by IS NULL OR handled_at IS NOT NULL)
);

-- 同じ人が同じ対象を二度通報しない（関数の確かめと、同時に 2 回呼ばれたときの最後の砦）
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_one_per_post_idx
    ON public.content_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_one_per_comment_idx
    ON public.content_reports (reporter_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_reports_group_idx
    ON public.content_reports (group_id, created_at DESC);

COMMENT ON TABLE public.content_reports IS
'投稿・コメントの通報。API ロールから表は直接触れない（report_group_content・list_group_reports・mark_report_handled だけ）。通報者は世話人にも返さない';
COMMENT ON COLUMN public.content_reports.reason IS
'通報の理由（200 文字まで。空でもよい）。病状や人名が書かれうる。外部 LLM API へ送らない';
COMMENT ON COLUMN public.content_reports.reporter_id IS
'通報した人。どの関数も返さない。アカウント削除で行ごと消える';
COMMENT ON COLUMN public.content_reports.handled_by IS
'対応済みにした世話人。どの関数も返さない。アカウント削除で NULL（handled_at は残る）';

-- 表は API ロールから直接触れない: RLS を有効にしてポリシーを置かない（＋所有者にも RLS を掛ける）。
-- Supabase は新しい表に anon / authenticated へ全権限を既定で付けるので、はがす
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_reports FROM PUBLIC, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. report_group_content(p_post_id, p_comment_id, p_reason) → 通報の id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_group_content(p_post_id UUID, p_comment_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_group_id UUID;
    v_id       UUID;
    -- 前後の空白（半角・全角・改行・タブ）を落とす（request_join と同じ扱い）。NULL は空にする
    v_reason   TEXT := regexp_replace(coalesce(p_reason, ''), '^[[:space:]　]+|[[:space:]　]+$', '', 'g');
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF num_nonnulls(p_post_id, p_comment_id) <> 1 OR char_length(v_reason) > 200 THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    IF p_post_id IS NOT NULL THEN
        SELECT p.group_id INTO v_group_id
          FROM public.group_posts p
         WHERE p.id = p_post_id AND p.deleted_at IS NULL;
    ELSE
        SELECT p.group_id INTO v_group_id
          FROM public.group_comments c
          JOIN public.group_posts p ON p.id = c.post_id
         WHERE c.id = p_comment_id AND c.deleted_at IS NULL AND p.deleted_at IS NULL;
    END IF;
    -- 対象が無い・消されている・在籍していない会の対象は、区別せずに forbidden
    IF v_group_id IS NULL OR NOT public.is_group_member(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    IF EXISTS (SELECT 1 FROM public.content_reports r
                WHERE r.reporter_id = v_uid
                  AND (r.post_id = p_post_id OR r.comment_id = p_comment_id)) THEN
        RAISE EXCEPTION USING MESSAGE = 'already_reported';
    END IF;

    BEGIN
        INSERT INTO public.content_reports (group_id, post_id, comment_id, reporter_id, reason)
        VALUES (v_group_id, p_post_id, p_comment_id, v_uid, v_reason)
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        -- 同時に 2 回呼ばれて、上の確かめをどちらも通った場合
        RAISE EXCEPTION USING MESSAGE = 'already_reported';
    END;

    RETURN v_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. list_group_reports(p_group_id) → (id, post_id, comment_id, reason, created_at, handled_at)
--   その会の世話人のみ。通報者・対応者は返さない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_group_reports(p_group_id UUID)
RETURNS TABLE (
    id         UUID,
    post_id    UUID,
    comment_id UUID,
    reason     TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    handled_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_moderator(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT r.id, r.post_id, r.comment_id, r.reason, r.created_at, r.handled_at
          FROM public.content_reports r
         WHERE r.group_id = p_group_id
         ORDER BY (r.handled_at IS NOT NULL), r.created_at DESC;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. mark_report_handled(p_report_id)
--   その通報の会の世話人のみ。対応済みの通報には何もしない（最初の対応の記録を残す）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_report_handled(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_group_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT r.group_id INTO v_group_id
      FROM public.content_reports r
     WHERE r.id = p_report_id
       FOR UPDATE;
    IF v_group_id IS NULL OR NOT public.is_group_moderator(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.content_reports
       SET handled_at = now(), handled_by = v_uid
     WHERE id = p_report_id AND handled_at IS NULL;
END;
$$;


-- -----------------------------------------------------------------------------
-- 関数の実行権限（PUBLIC・anon からはがし、authenticated にだけ付ける）
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.report_group_content(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_group_reports(UUID)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_report_handled(UUID)              FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.report_group_content(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_group_reports(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_report_handled(UUID)              TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20261013 までを当ててから、このファイルを当てる
-- 2. scripts/portal/verify_reports.sql を Studio の SQL エディタに全文貼って 1 回実行する
-- 3. このファイルをもう一度流す → エラーにならず、表・関数・権限が変わらない
-- =============================================================================
