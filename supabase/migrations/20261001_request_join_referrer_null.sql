-- =============================================================================
-- request_join の差し替え：空白だけの紹介者の氏名を NULL で保存する（2026-10-01 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20260930_patient_group_tenancy_v2.sql（適用済み）は書き換えない。
--
-- 何が起きていたか:
--   v2 は btrim() で前後の空白を落としていたが、btrim() が落とすのは半角空白だけ。
--   全角空白（U+3000）だけの紹介者の氏名が '　' のまま保存され、NULL にならなかった
--   （scripts/portal/verify_tenancy.sql 項目 15「空白だけの紹介者は NULL で保存される」が NG）。
--
-- 直し方:
--   前後の空白を、全角空白を含めて落とす（lib/portal/tenancy.ts の trimText と同じ扱い）。
--   それ以外（引数・戻り値・検証の順・権限）は v2 と同じ。引数が同じなので CREATE OR REPLACE で差し替わり、
--   実行権限（authenticated のみ）もそのまま残る。念のため付け直す。
-- =============================================================================

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
    -- 前後の空白（半角・全角・改行・タブ）を落とし、空なら NULL
    v_ref TEXT := nullif(
        regexp_replace(coalesce(p_referrer_name, ''), '^[[:space:]　]+|[[:space:]　]+$', '', 'g'), '');
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

REVOKE ALL ON FUNCTION public.request_join(UUID, TEXT, TEXT)    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_join(UUID, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_tenancy.sql を流し、項目 15「空白だけの紹介者は NULL で保存される」が OK になること
-- =============================================================================
