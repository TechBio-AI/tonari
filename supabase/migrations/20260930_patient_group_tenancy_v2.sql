-- =============================================================================
-- 患者会テナント v2（2026-09-30 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20260927_patient_group_tenancy.sql（適用済み）は書き換えない。変更はすべてこのファイルで行う。
--
-- 変えること:
--   1. 入会申請に「紹介者の氏名」（任意）を足す。join_requests.referrer_name。
--      request_join(group_id, message, referrer_name)。審査（承認・却下）の後も消さない。
--   2. list_join_requests は、その会の世話人にだけ、申請者の氏名（member_profiles.full_name）と
--      紹介者の氏名も返す（審査用）。会員一覧・書き出しには出さない。
--   3. list_group_members が返す user_id は世話人にだけ。一般会員には NULL（表示名・役割・入会日だけ）。
--   4. 3 で投稿の書き手の表示名が引けなくなるので、list_group_author_names(group_id) を足す。
--      返すのは「その会の見える投稿・コメントの書き手」の author_id と表示名だけ。
--      author_id は会員が group_posts / group_comments から既に読めている値で、新しく見える範囲は増えない。
--
-- ★ 適用の前にファウンダーの確認が要ること（Claude Code の判断では決められない）:
--   - app/demo/privacy/content.ts は会員に「ほかの会員と患者会には、表示名だけが表示されます。
--     氏名…は表示されません」と説明している。2 で申請者の氏名が会の世話人（患者会）に見えるので、
--     この説明と食い違う。説明文の改訂と、既存会員への再同意の要否を決めてから適用すること。
--   - 紹介者の氏名は、申請者でない第三者の個人情報。集める項目の一覧（同ファイルの COLLECTED_ITEMS）にも無い。
--   - 氏名は個人識別子。外部 LLM API（Anthropic 等）へ送らない（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. join_requests.referrer_name（紹介者の氏名。任意）
--   空・空白だけは NULL にそろえる（関数側で）。長さは member_profiles.full_name と同じ 100 文字まで
-- -----------------------------------------------------------------------------
ALTER TABLE public.join_requests
    ADD COLUMN IF NOT EXISTS referrer_name TEXT;

ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_referrer_name_check;
ALTER TABLE public.join_requests
    ADD CONSTRAINT join_requests_referrer_name_check
    CHECK (referrer_name IS NULL OR (btrim(referrer_name) <> '' AND char_length(referrer_name) <= 100));

COMMENT ON COLUMN public.join_requests.referrer_name IS
'紹介者の氏名（任意）。第三者の個人識別子。見えるのは申請した本人とその会の世話人だけ。審査後も消さない。外部 LLM API へ送らない';

-- 表への直接 insert（本人のポリシー）でも同じ列を書けるようにする。見える範囲は既存の select ポリシーのまま
-- （本人の申請と、その会の世話人）
GRANT INSERT (referrer_name) ON public.join_requests TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. request_join(group_id, message, referrer_name)
--   引数を足すと (uuid, text) と (uuid, text, text DEFAULT NULL) の 2 つが並び、2 引数の呼び出しが
--   曖昧になるので、旧い方を消してから作り直す（表ではなく関数の差し替え）
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.request_join(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.request_join(
    p_group_id UUID, p_message TEXT DEFAULT '', p_referrer_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_id  UUID;
    v_ref TEXT := nullif(btrim(coalesce(p_referrer_name, '')), '');
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF v_ref IS NOT NULL AND char_length(v_ref) > 100 THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.patient_groups WHERE id = p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'group_not_found';
    END IF;
    IF EXISTS (SELECT 1 FROM public.memberships
               WHERE user_id = v_uid AND group_id = p_group_id AND left_at IS NULL) THEN
        RAISE EXCEPTION USING MESSAGE = 'already_member';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.member_profiles WHERE user_id = v_uid) THEN
        RAISE EXCEPTION USING MESSAGE = 'profile_required';
    END IF;
    IF EXISTS (SELECT 1 FROM public.join_requests
               WHERE user_id = v_uid AND group_id = p_group_id AND status = 'pending') THEN
        RAISE EXCEPTION USING MESSAGE = 'already_requested';
    END IF;

    INSERT INTO public.join_requests (group_id, user_id, message, referrer_name)
    VALUES (p_group_id, v_uid, coalesce(p_message, ''), v_ref)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. list_join_requests(group_id)
--   その会の世話人にだけ、申請中の申請 id・表示名・申請者の氏名・紹介者の氏名・ひとこと・申請日を返す（審査用）。
--   user_id・メールは返さない。戻りの列が変わるので、消してから作り直す
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.list_join_requests(UUID);

CREATE OR REPLACE FUNCTION public.list_join_requests(p_group_id UUID)
RETURNS TABLE (
    id            UUID,
    display_name  TEXT,
    full_name     TEXT,
    referrer_name TEXT,
    message       TEXT,
    created_at    TIMESTAMP WITH TIME ZONE)
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
        SELECT r.id, mp.display_name, mp.full_name, r.referrer_name, r.message, r.created_at
          FROM public.join_requests r
          LEFT JOIN public.member_profiles mp ON mp.user_id = r.user_id
         WHERE r.group_id = p_group_id AND r.status = 'pending'
         ORDER BY r.created_at;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. list_group_members(group_id)
--   user_id はその会の世話人にだけ返す（任命・解除の相手を指すのに要る）。一般会員には NULL。
--   戻りの列は変えない（CREATE OR REPLACE で差し替えられる）。full_name は誰にも返さない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_group_members(p_group_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, role TEXT, joined_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_moderator BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_member(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;
    v_moderator := public.is_group_moderator(p_group_id);

    RETURN QUERY
        SELECT CASE WHEN v_moderator THEN m.user_id END,
               mp.display_name, m.role, m.joined_at
          FROM public.memberships m
          LEFT JOIN public.member_profiles mp ON mp.user_id = m.user_id
         WHERE m.group_id = p_group_id AND m.left_at IS NULL
         ORDER BY m.joined_at;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5. list_group_author_names(group_id)（新規）
--   投稿・コメントの書き手の表示名を出すための対応表。会員のみ。
--   返すのは「その会の未削除の投稿・コメント（未削除の投稿に付いたもの）の書き手」で、
--   いまも有効な会員の分だけ（退会した人は返さない。画面は「退会した会員」と出す。v1 と同じ見せ方）。
--   author_id は会員が表から既に読めている値。会員一覧（書いていない人を含む）の user_id は出さない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_group_author_names(p_group_id UUID)
RETURNS TABLE (author_id UUID, display_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_member(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT a.author_id, mp.display_name
          FROM (
                SELECT p.author_id FROM public.group_posts p
                 WHERE p.group_id = p_group_id AND p.deleted_at IS NULL
                UNION
                SELECT c.author_id FROM public.group_comments c
                  JOIN public.group_posts p ON p.id = c.post_id
                 WHERE p.group_id = p_group_id AND p.deleted_at IS NULL AND c.deleted_at IS NULL
               ) a
          JOIN public.memberships m
            ON m.user_id = a.author_id AND m.group_id = p_group_id AND m.left_at IS NULL
          LEFT JOIN public.member_profiles mp ON mp.user_id = a.author_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 関数の実行権限（作り直した関数は権限も付け直す。PUBLIC・anon からはがし、authenticated にだけ付ける）
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.request_join(UUID, TEXT, TEXT)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_join_requests(UUID)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_group_members(UUID)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_group_author_names(UUID)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_join(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_join_requests(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_group_members(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_group_author_names(UUID)  TO authenticated;


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 1. 20260927 → 20260928 → 20260929 → このファイルの順に当てる
-- 2. scripts/portal/verify_tenancy.sql を Studio の SQL エディタに全文貼って 1 回実行する
--    v2 の分は項目 15〜17:
--      15 紹介者の保存と可視範囲（空は NULL、100 文字超はエラー、審査後も残る、
--         本人と会の世話人だけが読める、会員一覧・書き出しに出ない）
--      16 申請者の氏名の可視範囲（その会の世話人の申請一覧にだけ出る。会員一覧・書き出しには出ない）
--      17 user_id の出し分け（会員一覧の user_id は世話人にだけ。書き手の対応表は書いた人だけ）
-- 3. 旧い request_join(uuid, text) が残っていないこと（台本の項目 13 で確かめる）
-- =============================================================================
