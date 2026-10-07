-- =============================================================================
-- 運営が通報を会をまたいで見る list_all_reports()（2026-10-04 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261014（content_reports）と 20261022（operators・is_operator）の後に当てる。
--
-- 何を作るか:
--   list_all_reports() → (id, group_slug, target_kind, post_id, comment_id, reason, created_at, handled_at)
--     運営だけ。それ以外は forbidden（is_operator() で確かめる）。すべての会の通報を、未対応 → 対応済みの順、
--     それぞれ新しい順に返す（20261014 の list_group_reports と同じ並び）。
--     target_kind は 'post'（投稿）か 'comment'（コメント）。対象の id は post_id・comment_id のどちらか一方だけが入る。
--     handled_at が NULL なら未対応、入っていれば対応済み（対応した時刻）。
--   返さないもの: 通報者（reporter_id）・対応者（handled_by）・会の id・投稿やコメントの本文。
--     本文は会員エリアの中身なので、運営の一覧には出さない（Claude Code の判断。要れば別に決める）。
--   対応済みにするのは今までどおりその会の世話人（mark_report_handled）。この関数は読むだけ。
--
-- 権限:
--   SECURITY DEFINER・search_path ''・PUBLIC と anon に EXECUTE なし・authenticated にあり（既存と同じ）。
--   content_reports の表そのものの権限は変えない（API ロールはどれも読めないまま）。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.list_all_reports()
RETURNS TABLE (
    id          UUID,
    group_slug  TEXT,
    target_kind TEXT,
    post_id     UUID,
    comment_id  UUID,
    reason      TEXT,
    created_at  TIMESTAMP WITH TIME ZONE,
    handled_at  TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT r.id,
               g.slug,
               CASE WHEN r.post_id IS NOT NULL THEN 'post' ELSE 'comment' END,
               r.post_id,
               r.comment_id,
               r.reason,
               r.created_at,
               r.handled_at
          FROM public.content_reports r
          JOIN public.patient_groups g ON g.id = r.group_id
         ORDER BY (r.handled_at IS NOT NULL), r.created_at DESC, r.id;
END;
$$;

COMMENT ON FUNCTION public.list_all_reports() IS
'運営向け。すべての会の通報（会の slug・対象の種類と id・理由・日時・対応した時刻）。通報者・対応者・本文は返さない。運営以外は forbidden';

REVOKE ALL ON FUNCTION public.list_all_reports()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_all_reports() TO authenticated;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_ops.sql を流す（項目 9 がこのファイルの分）
-- =============================================================================
