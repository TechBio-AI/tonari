-- =============================================================================
-- 入会申請は request_join 経由だけにする（2026-10-02 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261003 が適用済みかを Claude Code は確かめられない（DB に接続しない）ため、
--   どちらでも正しく当たるよう別ファイルにした（20261003 → このファイルの順）。
--
-- 何を変えるか:
--   join_requests の表への直接 insert を閉じる。
--     - 本人の insert ポリシー（join_requests_insert_own。20260927 で作成）を外す
--     - authenticated の INSERT の権限（列単位: group_id, user_id, message, referrer_name）をはがす
--   入会申請は request_join()（SECURITY DEFINER）だけが行う。関数は表の所有者の権限で書くので、
--   ポリシーと権限を外しても動く（accept_invitation / approve / reject の update も同じ）。
--
-- これで消える経路:
--   - 全角空白だけの紹介者の氏名が残る経路（表の CHECK は btrim で半角空白しか落とさない。
--     request_join は 20261001 で全角も落とすようにした）
--   - プロフィール・重複・会員かどうかの確かめを、関数を通さずにすり抜ける経路
--
-- 変えないもの:
--   select（本人の申請と、その会の世話人）と、世話人の「却下」だけの update は今のまま。
--   アプリ（lib/portal/tenancy.ts）は requestJoin → rpc('request_join') だけを使っていて、表へ直接 insert していない。
-- =============================================================================

DROP POLICY IF EXISTS join_requests_insert_own ON public.join_requests;

-- 表単位の INSERT をはがすと列単位の INSERT も一緒にはがれるが、どの列を付けていたかを残すため列も書く
REVOKE INSERT ON public.join_requests FROM authenticated;
REVOKE INSERT (group_id, user_id, message, referrer_name) ON public.join_requests FROM authenticated;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_tenancy.sql を流す。次がそれぞれ OK になること
--     3  C が join_requests へ直接 insert → 権限エラー
--     6  D が申請（表へ直接 insert）→ 権限エラー
--     13 join_requests: authenticated に INSERT の権限（表・列とも）が無い・insert のポリシーが無い
--     15 全角空白だけ・101 文字の紹介者（表へ直接 insert）→ 権限エラー
--   request_join を通す申請（項目 5・15）は今までどおり通ること
-- =============================================================================
