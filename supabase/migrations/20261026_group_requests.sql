-- =============================================================================
-- 会の新設の申請 group_requests と、公開用の会の一覧 public_groups（共通契約 2026-10-03 の E）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 20261022（operators）と 20261023（disease_catalog・patient_groups.disease_ids・group_wishes.disease_id）の後に当てる。
-- ※ 公開面が読める表に public_groups を加えること（CLAUDE.md の規範）は、ファウンダーが書く（共通契約 H）。
--
-- 流れ:
--   1. 申請 request_new_group(disease_id, name, message)
--        申請できるのは「その病気を対象にする会（patient_groups.disease_ids に含む）の在籍会員」か
--        「その病気の参加希望者（group_wishes.disease_id、取り消していないもの）」。それ以外は forbidden。
--        同じ病気への申請中は 1 人 1 件（already_requested）。
--   2. 運営が承認 approve_group_request(request_id, slug) か却下 reject_group_request(request_id)
--        承認すると patient_groups に会を作り（slug は運営が指定。name は申請の proposed_name、
--        disease_ids・disease_idxs・disease_names は disease_catalog から引く）、申請者をその会の世話人にする。
--   3. 公開面は public_groups(slug, name, disease_id, created_at) を読む。patient_groups の変化をトリガーで写す
--        （data/patient_groups/patient_groups.json に無い会は、公開面がここから出す。JSON にある会も写るので、
--        公開面は slug で重ねる）。
--
-- 見える人:
--   group_requests … 申請した本人の行と、運営（全行）。書き込みは関数だけ
--   public_groups  … anon と authenticated が全行読める。書くのはトリガーだけ
--
-- Claude Code の判断（契約に無いもの）:
--   - public_groups.disease_id は、会の disease_ids の先頭（会が複数の病気を対象にするとき、残りは写らない。
--     いまの会はすべて 1 病気）。disease_ids が空の会は NULL
--   - 承認の slug は patient_groups と同じ形（英小文字・数字・ハイフン）。既に使われている slug は invalid_input
--     （JSON にだけあって DB に無い会の slug とは比べられない。運営が JSON を見て選ぶこと）
--   - 申請者に会員プロフィールは求めない（承認後、プロフィールが無いと会員一覧の表示名は空になる）
--   - 運営の承認・却下は、運営自身の申請にもできる
--
-- 権限:
--   関数は SECURITY DEFINER・search_path ''・PUBLIC と anon に EXECUTE なし・authenticated にあり（既存と同じ）。
--   トリガー関数は API ロールのどれにも EXECUTE を与えない。エラーの語は既存どおり
--   （forbidden / invalid_input / already_requested / request_not_pending）。
--   アカウント削除で申請者の行を消すことは、アカウント削除担当が 20261027 で行う（共通契約 G）。
--   それまでは auth.users の削除で CASCADE により消える。
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.group_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_id    TEXT NOT NULL REFERENCES public.disease_catalog (disease_id),
    requester_id  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    proposed_name TEXT NOT NULL CHECK (btrim(proposed_name) <> '' AND char_length(proposed_name) <= 100),
    message       TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 1000),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by    UUID REFERENCES auth.users ON DELETE SET NULL,
    decided_at    TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT group_requests_decided_pair CHECK ((status = 'pending') = (decided_at IS NULL))
);

-- 同じ人が同じ病気に「申請中」を 2 つ持たない
CREATE UNIQUE INDEX IF NOT EXISTS group_requests_one_pending_idx
    ON public.group_requests (disease_id, requester_id) WHERE status = 'pending';

COMMENT ON TABLE public.group_requests IS
'会の新設の申請。申請は request_new_group()、承認・却下は運営だけ（approve_group_request / reject_group_request）。本人と運営だけが読める';

CREATE TABLE IF NOT EXISTS public.public_groups (
    slug       TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    disease_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

COMMENT ON TABLE public.public_groups IS
'公開用の会の一覧（patient_groups の写し。slug・name・disease_id・created_at だけ）。トリガー sync_public_groups だけが書く。anon と authenticated が全行読める';


-- =============================================================================
-- 2. RLS と権限
-- =============================================================================
ALTER TABLE public.group_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_groups  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.group_requests FROM anon, authenticated;
REVOKE ALL ON public.public_groups  FROM anon, authenticated;

DROP POLICY IF EXISTS group_requests_select ON public.group_requests;
CREATE POLICY group_requests_select ON public.group_requests
    FOR SELECT TO authenticated
    USING (requester_id = auth.uid() OR public.is_operator());
GRANT SELECT ON public.group_requests TO authenticated;

DROP POLICY IF EXISTS public_groups_select_all ON public.public_groups;
CREATE POLICY public_groups_select_all ON public.public_groups
    FOR SELECT TO anon, authenticated
    USING (true);
GRANT SELECT ON public.public_groups TO anon, authenticated;


-- =============================================================================
-- 3. 公開用の会の一覧へ写す（patient_groups の AFTER INSERT / UPDATE / DELETE）
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_public_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        DELETE FROM public.public_groups WHERE slug = OLD.slug;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        INSERT INTO public.public_groups (slug, name, disease_id, created_at)
        VALUES (NEW.slug, NEW.name, NEW.disease_ids[1], NEW.created_at)
        ON CONFLICT (slug) DO UPDATE
            SET name = EXCLUDED.name, disease_id = EXCLUDED.disease_id, created_at = EXCLUDED.created_at;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_groups ON public.patient_groups;
CREATE TRIGGER sync_public_groups
    AFTER INSERT OR UPDATE OR DELETE ON public.patient_groups
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_groups();


-- =============================================================================
-- 4. 関数
-- =============================================================================

-- -----------------------------------------------------------------------------
-- request_new_group(disease_id, name, message) → 申請の id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_new_group(p_disease_id TEXT, p_name TEXT, p_message TEXT DEFAULT '')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_name    TEXT := btrim(coalesce(p_name, ''));
    v_message TEXT := btrim(coalesce(p_message, ''));
    v_id      UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF v_name = '' OR char_length(v_name) > 100 OR char_length(v_message) > 1000 THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.disease_catalog c WHERE c.disease_id = p_disease_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    -- その病気を対象にする会の在籍会員か、その病気の参加希望者
    IF NOT (
        EXISTS (SELECT 1 FROM public.memberships m
                  JOIN public.patient_groups g ON g.id = m.group_id
                 WHERE m.user_id = v_uid AND m.left_at IS NULL AND p_disease_id = ANY (g.disease_ids))
        OR EXISTS (SELECT 1 FROM public.group_wishes w
                    WHERE w.user_id = v_uid AND w.disease_id = p_disease_id AND w.withdrawn_at IS NULL)
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    IF EXISTS (SELECT 1 FROM public.group_requests r
                WHERE r.requester_id = v_uid AND r.disease_id = p_disease_id AND r.status = 'pending') THEN
        RAISE EXCEPTION USING MESSAGE = 'already_requested';
    END IF;

    BEGIN
        INSERT INTO public.group_requests (disease_id, requester_id, proposed_name, message)
        VALUES (p_disease_id, v_uid, v_name, v_message)
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        -- 同時に 2 回押したとき（一意索引 group_requests_one_pending_idx が止める）
        RAISE EXCEPTION USING MESSAGE = 'already_requested';
    END;

    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- approve_group_request(request_id, slug) → 作った会の id：運営だけ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_group_request(p_request_id UUID, p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req   public.group_requests%ROWTYPE;
    v_cat   public.disease_catalog%ROWTYPE;
    v_group UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    SELECT * INTO v_req FROM public.group_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION USING MESSAGE = 'request_not_pending';
    END IF;
    IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(p_slug) > 100
       OR EXISTS (SELECT 1 FROM public.patient_groups g WHERE g.slug = p_slug) THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    SELECT * INTO v_cat FROM public.disease_catalog c WHERE c.disease_id = v_req.disease_id;

    INSERT INTO public.patient_groups (slug, name, disease_ids, disease_idxs, disease_names)
    VALUES (p_slug, v_req.proposed_name, ARRAY[v_cat.disease_id], ARRAY[v_cat.idx], ARRAY[v_cat.name])
    RETURNING id INTO v_group;

    INSERT INTO public.memberships (user_id, group_id, role)
    VALUES (v_req.requester_id, v_group, 'moderator');

    UPDATE public.group_requests
       SET status = 'approved', decided_by = auth.uid(), decided_at = now()
     WHERE id = p_request_id;

    RETURN v_group;
END;
$$;

-- -----------------------------------------------------------------------------
-- reject_group_request(request_id)：運営だけ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_group_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    SELECT r.status INTO v_status FROM public.group_requests r WHERE r.id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;
    IF v_status <> 'pending' THEN
        RAISE EXCEPTION USING MESSAGE = 'request_not_pending';
    END IF;

    UPDATE public.group_requests
       SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
     WHERE id = p_request_id;
END;
$$;


-- =============================================================================
-- 5. 権限と、いまある会を写す
-- =============================================================================
REVOKE ALL ON FUNCTION public.request_new_group(TEXT, TEXT, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_group_request(UUID, TEXT)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_group_request(UUID)            FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_new_group(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_group_request(UUID, TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_group_request(UUID)          TO authenticated;

REVOKE ALL ON FUNCTION public.sync_public_groups()                  FROM PUBLIC, anon, authenticated;

INSERT INTO public.public_groups (slug, name, disease_id, created_at)
SELECT g.slug, g.name, g.disease_ids[1], g.created_at FROM public.patient_groups g
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, disease_id = EXCLUDED.disease_id, created_at = EXCLUDED.created_at;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   select count(*) from public_groups;  と  select count(*) from patient_groups;  が同じ数
--   scripts/portal/verify_ops.sql を流す（20261022〜20261026 をすべて当ててから）
-- =============================================================================
