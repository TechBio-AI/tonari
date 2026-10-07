-- =============================================================================
-- 会員一覧を世話人だけにする（2026-10-03 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261002 までは適用済みなので書き換えない。list_group_members をこのファイルで差し替える。
--
-- 何を変えるか:
--   list_group_members(group_id) は、呼んだ人がその会の世話人（moderator）のときだけ会員の行を返す。
--   一般会員が呼んだら forbidden で止める（leave_group などと同じ RAISE EXCEPTION … P0001）。
--   画面（/demo/community/[slug]/members）は既に世話人だけにしてあるが、API を直接叩いても
--   一般会員は会員一覧を取れないように、DB 側でも閉じる。
--   世話人にしか返らなくなるので、v2 の「user_id は世話人にだけ（一般会員には NULL）」の出し分けは要らなくなり、
--   user_id はそのまま返す（任命・解除の相手を指すのに使う）。full_name は今までどおり返さない。
--
-- 変えないもの:
--   掲示板・コメントの書き手の表示名は list_group_author_names（v2）が渡す。あちらは会員なら呼べ、
--   この関数を呼ばない（依存していない）ので、投稿すれば表示名が出る挙動はそのまま。
--
-- 戻りの列は変えない（CREATE OR REPLACE で差し替えられる。権限もそのまま残るが、念のため付け直す）。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.list_group_members(p_group_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, role TEXT, joined_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    -- 世話人だけ。一般会員・会員でない人・退会した人は同じく forbidden（会員かどうかも区別させない）
    IF NOT public.is_group_moderator(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT m.user_id, mp.display_name, m.role, m.joined_at
          FROM public.memberships m
          LEFT JOIN public.member_profiles mp ON mp.user_id = m.user_id
         WHERE m.group_id = p_group_id AND m.left_at IS NULL
         ORDER BY m.joined_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_group_members(UUID)    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_group_members(UUID) TO authenticated;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_tenancy.sql を流す。項目 17 で、一般会員 C の会員一覧が forbidden、
--   世話人 E は取れる、書き手の対応表は C も引ける、がそれぞれ OK になること
-- =============================================================================
