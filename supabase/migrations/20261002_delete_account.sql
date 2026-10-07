-- =============================================================================
-- アカウント削除 delete_my_account()（2026-10-01 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20260926〜20261001 は適用済みなので書き換えない。変更はすべてこのファイルで行う。
--
-- 退会（leave_group。会を抜ける）とは別物。本人の会員情報を全部消す。
-- auth.users 本体は消さない（service_role が要る。ファウンダーが Studio で消す。手順は docs/account-deletion.md）。
-- 関数のあとは「情報は全部消え、ログインのメール（auth.users）だけが残る」状態になる。
--
-- 決定（docs/DECISIONS.md「アカウント削除」）:
--   1. invitations・join_requests は本人の行をすべて消す（案 B）。
--      本人が発行した招待（created_by）と、本人の申請（user_id）は行ごと消す。
--      他人の行に残る本人の痕跡（invitations.used_by・join_requests.decided_by）は NULL にする。
--   2. 投稿・コメントは会に残す（案 X）。本文は残り、名前だけが消える（画面は「名前未設定」）。
--      Studio で auth.users を消したときに投稿が CASCADE で消えないよう、
--      group_posts.author_id・group_comments.author_id の外部キーを CASCADE → SET NULL に付け替え、NOT NULL を外す。
--   3. どこかの会の最後の世話人なら last_moderator で止め、何も消さない（leave_group と同じ）。
--   4. 旧 public.profiles（00001。ログイン時に utils/supabase/middleware.ts が role を読む）の本人の行も消す。
--      表が無い DB もありうるので、あるときだけ消す。
--
-- 消す順（1 つのトランザクション。途中で止まれば全部巻き戻る）:
--   member_diseases → consents → join_requests（本人の申請）→ join_requests.decided_by を NULL
--   → invitations（本人が発行）→ invitations.used_by を NULL → memberships（退会済みの行も）
--   → member_profiles → profiles（あれば）
--
-- ★ consents は「本人も delete できない（同意の証拠を残す）」作り（20260928）だが、
--   アカウント削除のときだけはこの関数の中で消す（ファウンダー決定）。表の権限・ポリシーは変えない。
-- ★ 関数の所有者が BYPASSRLS を持たないと、FORCE RLS の表（consents・member_diseases・member_profiles）で
--   0 行消して成功扱いになる。scripts/portal/verify_delete_account.sql の項目 0 で確かめる。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. 投稿・コメントの書き手の外部キーを SET NULL に付け替える
--
--   20260927 では列に直接 REFERENCES を書いたので、制約名は自動で付いている（group_posts_author_id_fkey 等）。
--   名前を決め打ちせず、author_id 列だけに掛かっている auth.users への外部キーをすべて外してから、名前付きで付け直す。
--   何度流しても同じ結果になる。
--
--   付け替え前: author_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE
--   付け替え後: author_id UUID          REFERENCES auth.users ON DELETE SET NULL（既定値 auth.uid() はそのまま）
--
--   invitations.created_by は付け替えない（決定 1 で、本人が発行した招待は消す。
--   Studio で auth.users を直接消したときも CASCADE で消えるのが決定 1 と同じ結果になる）。
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    c RECORD;
BEGIN
    FOREACH t IN ARRAY ARRAY['group_posts', 'group_comments'] LOOP
        FOR c IN
            SELECT con.conname
              FROM pg_constraint con
              JOIN pg_attribute att
                ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
             WHERE con.conrelid = format('public.%I', t)::regclass
               AND con.contype = 'f'
               AND con.confrelid = 'auth.users'::regclass
               AND att.attname = 'author_id'
               AND array_length(con.conkey, 1) = 1
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
        END LOOP;
    END LOOP;
END;
$$;

ALTER TABLE public.group_posts    ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.group_comments ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.group_comments
    ADD CONSTRAINT group_comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.group_posts.author_id IS
'書いた人。アカウントが消されると NULL（本文は会に残り、名前だけが消える。画面は「名前未設定」）';
COMMENT ON COLUMN public.group_comments.author_id IS
'書いた人。アカウントが消されると NULL（本文は会に残り、名前だけが消える。画面は「名前未設定」）';


-- -----------------------------------------------------------------------------
-- 2. delete_group_post / delete_group_comment の差し替え（書き手が NULL の行への対応）
--
--   20260927 の判定 NOT (author_id = v_uid OR is_group_moderator(...)) は、author_id が NULL だと
--   NULL = v_uid が NULL になり、式全体が NULL → IF が偽 → forbidden にならず、
--   世話人でない会員が「書き手の消えた投稿」を消せてしまう。
--   IS NOT DISTINCT FROM で比べて、NULL は「本人ではない」として扱う。
--   それ以外（引数・戻り値・検証の順）は 20260927 と同じ。引数が同じなので CREATE OR REPLACE で差し替わる。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_group_post(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid  UUID := auth.uid();
    v_post public.group_posts%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT * INTO v_post FROM public.group_posts WHERE id = p_post_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND
       OR NOT public.is_group_member(v_post.group_id)
       OR NOT (v_post.author_id IS NOT DISTINCT FROM v_uid OR public.is_group_moderator(v_post.group_id)) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_posts SET deleted_at = now() WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_group_comment(p_comment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_author   UUID;
    v_group_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT c.author_id, p.group_id INTO v_author, v_group_id
      FROM public.group_comments c
      JOIN public.group_posts p ON p.id = c.post_id
     WHERE c.id = p_comment_id AND c.deleted_at IS NULL
       FOR UPDATE OF c;
    IF NOT FOUND
       OR NOT public.is_group_member(v_group_id)
       OR NOT (v_author IS NOT DISTINCT FROM v_uid OR public.is_group_moderator(v_group_id)) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_comments SET deleted_at = now() WHERE id = p_comment_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. delete_my_account()
--
--   引数を取らない（他人を指せない形にする）。対象は auth.uid() 本人だけ。
--   何も持っていない人が呼んでも成功する（何度呼んでも同じ結果）。
--   投稿・コメントには触らない（会に残す。名前は member_profiles と一緒に消える）。
--   auth.users には触らない。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    -- 本人が世話人をしている会の、世話人の行を先に固める（leave_group・dismiss_moderator と同じ考え。
    -- 2 人の世話人が同時にアカウントを消して 0 人になるのを防ぐ）
    PERFORM 1 FROM public.memberships m
      WHERE m.role = 'moderator' AND m.left_at IS NULL
        AND m.group_id IN (SELECT mine.group_id FROM public.memberships mine
                            WHERE mine.user_id = v_uid AND mine.role = 'moderator' AND mine.left_at IS NULL)
      ORDER BY m.group_id, m.user_id
        FOR UPDATE;

    -- どこかの会の最後の世話人なら、何も消さずに止める
    IF EXISTS (
        SELECT 1 FROM public.memberships mine
         WHERE mine.user_id = v_uid AND mine.role = 'moderator' AND mine.left_at IS NULL
           AND NOT EXISTS (
               SELECT 1 FROM public.memberships o
                WHERE o.group_id = mine.group_id
                  AND o.user_id <> v_uid
                  AND o.role = 'moderator'
                  AND o.left_at IS NULL)
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'last_moderator';
    END IF;

    -- 研究・治験の案内を受け取る病気（医療情報）
    DELETE FROM public.member_diseases WHERE user_id = v_uid;

    -- 同意の記録（本人の delete は許していない表。ここだけで消す）
    DELETE FROM public.consents WHERE user_id = v_uid;

    -- 入会申請（本人の申請はすべて。ひとこと・紹介者の氏名も一緒に消える）
    DELETE FROM public.join_requests WHERE user_id = v_uid;
    -- 世話人として審査した他人の申請には、行を残して本人の痕跡だけ消す
    UPDATE public.join_requests SET decided_by = NULL WHERE decided_by = v_uid;

    -- 招待（本人が発行したものはすべて。まだ使われていない招待も無効になる）
    DELETE FROM public.invitations WHERE created_by = v_uid;
    -- 他人が発行して本人が使った招待には、行を残して本人の痕跡だけ消す（used_at は残る）
    UPDATE public.invitations SET used_by = NULL WHERE used_by = v_uid;

    -- 会員資格（退会済みの行も含めて）
    DELETE FROM public.memberships WHERE user_id = v_uid;

    -- プロフィール（氏名・表示名・年代・性別・都道府県）
    DELETE FROM public.member_profiles WHERE user_id = v_uid;

    -- 旧 profiles（00001。表がある DB でだけ消す）
    -- ★ 00001 では articles.author_id が profiles を ON DELETE CASCADE で参照している。
    --   本人が書いた articles があれば一緒に消える（となりの会員は書かない想定。実在は不明）
    IF to_regclass('public.profiles') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.profiles WHERE id = $1' USING v_uid;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
'本人の会員情報を全部消す（auth.users は残す）。投稿・コメントは会に残り、名前だけが消える。最後の世話人は last_moderator で止まる';


-- -----------------------------------------------------------------------------
-- 関数の実行権限（PUBLIC・anon からはがし、authenticated にだけ付ける）
-- 差し替えた 2 つは権限が残るが、念のため付け直す
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.delete_my_account()           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group_post(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group_comment(UUID)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.delete_my_account()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_post(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_comment(UUID) TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20261001 までを当ててから、このファイルを当てる
-- 2. scripts/portal/verify_delete_account.sql を Studio の SQL エディタに全文貼って 1 回実行する
-- 3. scripts/portal/verify_tenancy.sql ももう一度流す（delete_group_post / delete_group_comment を差し替えたため）
-- 4. このファイルをもう一度流す → エラーにならず、外部キー・関数が変わらない
-- =============================================================================
