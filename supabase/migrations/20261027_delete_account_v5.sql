-- =============================================================================
-- delete_my_account() の版 5：運営・案件への反応・会の新設の申請も消す（共通契約 2026-10-03 の G）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261022（operators）・20261024（notice_interest）・
--   20261026（group_requests）の後に当てる。
--   delete_my_account をこのファイルで CREATE OR REPLACE する
--   （版 1 は 20261002、版 2 は 20261010、版 3 は 20261015、版 4 は 20261020）。
--
-- 版 4 からの変更:
--   1. notice_interest（治験・研究の案内への反応）の本人の行を消す
--   2. group_requests（会の新設の申請）の申請者が本人の行を消す。運営として決めた申請は行を残し、decided_by だけ NULL にする
--   3. operators（運営）の本人の行を消す
--   4. 本人が運営で、ほかに運営がいなければ last_operator で止める（何も消さない）。
--      last_moderator と同じく、消す前に確かめる。運営の行を先に固めるので、2 人の運営が同時に消しても 0 人にならない
--   ほかの消す順・止め方・最後に auth.users を消すこと・権限は版 4 と同じ。
--
-- 外部キーに任せるもの（auth.users を消したときの SET NULL。版 3 と同じく、この関数の最後の削除で起きる）:
--   trial_notices.created_by（運営として登録した案件は残り、登録者だけ NULL になる）
--
-- エラーの語:
--   last_operator は新しい語。lib/portal/tenancy.ts の FAILURE_REASONS にまだ無い（画面の担当が足す）。
--   無いままだと画面では 'failed'（「うまくいきませんでした」）になる。
--   運営を外す・足すのは SQL エディタから（20261022）。最後の運営が消したいときは、先にほかの人を運営に足す。
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

    -- 運営（20261022）。本人が運営なら、運営の行を全部先に固める（2 人の運営が同時にアカウントを消して 0 人になるのを防ぐ。
    -- 運営の行は少ないので表ごと固める。並びを決めて固め、行き違いの待ち合いを避ける）
    IF EXISTS (SELECT 1 FROM public.operators o WHERE o.user_id = v_uid) THEN
        PERFORM 1 FROM public.operators o ORDER BY o.user_id FOR UPDATE;
        -- 本人のほかに運営がいなければ、何も消さずに止める
        IF NOT EXISTS (SELECT 1 FROM public.operators o WHERE o.user_id <> v_uid) THEN
            RAISE EXCEPTION USING MESSAGE = 'last_operator';
        END IF;
    END IF;

    -- 病気がわかるまでの道のり調査の回答（医療情報）と、本人との対応（20261010）
    DELETE FROM public.journey_responses
     WHERE id IN (SELECT l.response_id FROM public.journey_links l WHERE l.user_id = v_uid);
    DELETE FROM public.journey_links WHERE user_id = v_uid;

    -- 行事への参加表明（20261013）
    DELETE FROM public.event_attendance WHERE user_id = v_uid;

    -- 患者会への参加希望（20261019）。取り消し済みの行も消す。公開用の数はトリガーが数え直す
    DELETE FROM public.group_wishes WHERE user_id = v_uid;

    -- 治験・研究の案内への反応（20261024）。関心あり・見送りの両方
    DELETE FROM public.notice_interest WHERE user_id = v_uid;

    -- 会の新設の申請（20261026）。本人の申請はすべて（申請中・承認済み・却下済み）。
    -- 運営として決めた他人の申請には、行を残して本人の痕跡だけ消す（decided_at は残る）。
    -- 承認済みの申請から作られた会と、その会の世話人の資格は消えない（会は patient_groups、資格は下の memberships で扱う）
    DELETE FROM public.group_requests WHERE requester_id = v_uid;
    UPDATE public.group_requests SET decided_by = NULL WHERE decided_by = v_uid;

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

    -- 運営の資格（20261022）。上で、ほかに運営がいることを確かめてある
    DELETE FROM public.operators WHERE user_id = v_uid;

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
'本人の会員情報と auth.users の行を全部消す（版 5。運営・案件への反応・会の新設の申請も消す）。投稿・コメントは会に残り、名前だけが消える。最後の世話人は last_moderator、最後の運営は last_operator で止まる。途中で失敗したら何も消えない';

REVOKE ALL ON FUNCTION public.delete_my_account()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20261022〜20261026 を当ててから、このファイルを当てる
-- 2. scripts/portal/verify_delete_account.sql を Studio の SQL エディタに全文貼って 1 回実行する
--    （版 5 の分は項目 13〜15: 最後の運営・案件への反応と会の新設の申請・運営の行）
-- =============================================================================
