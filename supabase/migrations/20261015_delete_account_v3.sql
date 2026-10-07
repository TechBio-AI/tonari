-- =============================================================================
-- delete_my_account() の版 3：auth.users まで消す（2026-10-15 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。20261013（event_attendance）と 20261014（content_reports）の後に当てる。
--   delete_my_account をこのファイルで CREATE OR REPLACE する（版 1 は 20261002、版 2 は 20261010）。
--
-- 版 2 からの変更:
--   1. event_attendance（行事への参加表明）の本人の行を消す
--   2. content_reports の本人の通報（reporter_id）を消す。本人が対応した通報は行を残し、handled_by だけ NULL にする
--   3. 最後に auth.users の本人の行を消す（docs/auth_users_retention_options.md の (a)。ファウンダー決定）
--      関数全体が 1 つのトランザクションなので、auth.users の削除（と、それに続く CASCADE・SET NULL）が失敗したら、
--      それまでに消した会員情報もすべて元に戻る。
--
-- auth.users を消すと、表の側で次のことが起きる（原本: ローカルの GoTrue v2.192.0 の migration と、public の外部キー）:
--   - auth.identities・sessions・mfa_factors・one_time_tokens など: ON DELETE CASCADE で消える。
--     refresh_tokens は sessions 経由で消える（session_id が NULL の古い行は残る）
--   - auth.flow_state・auth.audit_log_entries: 外部キーが無いので残る（docs/account-deletion.md）
--   - group_posts・group_comments の author_id、group_events・group_links の created_by、group_settings の updated_by、
--     content_reports の handled_by、invitations の used_by、join_requests の decided_by: SET NULL
--   - それ以外の本人の行（この関数で既に消している）: CASCADE
--
-- 権限:
--   auth.users の所有者は supabase_auth_admin。関数の所有者（このファイルを当てたロール。ローカルでは postgres）が
--   auth.users に DELETE の権限を持っていないと、最後の DELETE で「permission denied」になり、関数全体が戻る（何も消えない）。
--   ローカルの postgres イメージでは postgres に auth の全表の権限がある。本番で同じかは不明
--   （scripts/portal/verify_delete_account.sql の項目 0 で確かめる）。
--
-- 呼び出し側（app/demo/community/account/delete/actions.ts）は変えない。関数を呼んだ後にサインアウトする。
-- auth.users が消えた後も、手元のアクセストークン（JWT）は期限（ローカルは jwt_expiry = 3600 秒）まで形式上は有効。
-- ただしこの関数の後は、本人の行はどの表にも残っていない。
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
'本人の会員情報と auth.users の行を全部消す（版 3）。投稿・コメントは会に残り、名前だけが消える。最後の世話人は last_moderator で止まる。途中で失敗したら何も消えない';

REVOKE ALL ON FUNCTION public.delete_my_account()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20261013・20261014 を当ててから、このファイルを当てる
-- 2. scripts/portal/verify_delete_account.sql を Studio の SQL エディタに全文貼って 1 回実行する
--    （版 3 の分は項目 10〜12: 参加表明・通報・auth.users と、途中で失敗したときに全部戻ること）
-- =============================================================================
