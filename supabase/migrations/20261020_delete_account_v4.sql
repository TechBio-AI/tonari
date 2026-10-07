-- =============================================================================
-- delete_my_account() の版 4：患者会への参加希望（group_wishes）も消す（2026-10-20 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261019_group_wishes.sql の後に当てる。
--   delete_my_account をこのファイルで CREATE OR REPLACE する（版 1 は 20261002、版 2 は 20261010、版 3 は 20261015）。
--
-- 版 3 からの変更:
--   group_wishes の本人の行（取り消し済みも含む）を消す 1 文を、行事への参加表明の次に足しただけ。
--   ほかの消す順・止め方（last_moderator）・最後に auth.users を消すこと・権限は版 3 と同じ。
--   group_wishes.user_id は auth.users を ON DELETE CASCADE で参照しているので、最後の auth.users の削除でも消えるが、
--   ほかの表と同じく、この関数の中で明示して消す。
--   消すと公開用の数（public_wish_counts）はトリガー sync_public_wish_count が数え直す。
-- =============================================================================

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

    -- 病気がわかるまでの道のり調査の回答（医療情報）と、本人との対応（20261010）
    DELETE FROM public.journey_responses
     WHERE id IN (SELECT l.response_id FROM public.journey_links l WHERE l.user_id = v_uid);
    DELETE FROM public.journey_links WHERE user_id = v_uid;

    -- 行事への参加表明（20261013）
    DELETE FROM public.event_attendance WHERE user_id = v_uid;

    -- 患者会への参加希望（20261019）。取り消し済みの行も消す。公開用の数はトリガーが数え直す
    DELETE FROM public.group_wishes WHERE user_id = v_uid;

    -- 通報（20261014）。本人の通報は消す。世話人として対応した通報は行を残し、本人の痕跡だけ消す（handled_at は残る）
    DELETE FROM public.content_reports WHERE reporter_id = v_uid;
    UPDATE public.content_reports SET handled_by = NULL WHERE handled_by = v_uid;

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

    -- ログインの行（メール）。最後に消す。ここで失敗すると、上で消したものもすべて元に戻る。
    -- 投稿・コメントなどの書き手の列は SET NULL になり、本文は会に残る
    DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
'本人の会員情報と auth.users の行を全部消す（版 4。患者会への参加希望も消す）。投稿・コメントは会に残り、名前だけが消える。最後の世話人は last_moderator で止まる。途中で失敗したら何も消えない';

REVOKE ALL ON FUNCTION public.delete_my_account()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_wishes.sql の項目 6（アカウント削除で希望が消え、公開の数が減る）と、
--   scripts/portal/verify_delete_account.sql（版 3 までの分が変わらないこと）を流す
-- =============================================================================
