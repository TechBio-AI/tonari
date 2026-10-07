-- =============================================================================
-- 患者会テナント（2026-09-26 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
--
-- 何のための表か:
--   患者会ごとに閉じた会員エリアの土台。会のお知らせ・スレッド・コメントと、
--   入会（招待・申請）と、退去用の書き出しを持つ。
--   患者会の公開ページはこの DB を読まない（data/patient_groups/ の JSON を当サイトが代行更新する）。
--   決定は docs/DECISIONS.md 2026-09-26「患者会は会ごとに閉じる」。
--   RLS の一覧（表・操作・誰が可）は docs/patient_group_tenancy_rls.md。
--
-- 行の境界:
--   原則「自分が有効な membership（left_at IS NULL）を持つ会の行」だけが見える。
--   例外は patient_groups の id / slug / name（入会前の人が会を選ぶために読む。公開情報のみ）。
--
-- memberships への書き込み:
--   直接の insert / update / delete のポリシーは作らない。
--   入会は accept_invitation / approve_join_request の関数（SECURITY DEFINER）経由だけ。
--   関数の中で auth.uid() と role を必ず検証する。
--
-- tenant_id を置かない理由:
--   CLAUDE.md の tenant_id は製薬テナントの業務データに掛ける規則（製薬フォローアップは切り出し済み）。
--   ここでの境界は「会（group_id）× 会員（user_id）」で、memberships が担う。
--
-- 個人情報の扱い（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   投稿・コメントの本文には、会員が病状や本名を書きうる。外部 LLM API（Anthropic 等）へ送らない。
--   会員一覧・書き出しに出すのは member_profiles の display_name だけ。full_name は出さない。
--
-- FORCE ROW LEVEL SECURITY を付けない理由:
--   下の SECURITY DEFINER 関数は、表の所有者（この migration を流すロール）の権限で memberships に書く。
--   FORCE を付けると所有者にも RLS が掛かり、insert ポリシーの無い memberships に書けなくなる。
--   anon / authenticated には RLS がそのまま効く（ENABLE で足りる）。
--   なお関数は member_profiles（FORCE 付き）から表示名を読む。これは関数の所有者が BYPASSRLS を
--   持つことが前提。持っているかは末尾の確認手順 0 で確かめる（Claude Code は未確認＝不明）。
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================

-- -----------------------------------------------------------------------------
-- patient_groups（会）
--
-- slug は data/patient_groups/patient_groups.json の id と同じ値。
-- disease_idxs は知識ファイル（data/knowledge/comprehensive_rare_diseases_knowledge.json）の
-- 配列上の位置で、固定 ID ではない（docs/kb_issues_2026-08-29.md の 47）。
-- 統合・並べ替えでずれるので、作った時点の疾患名を disease_names に同じ順で併記する。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name          TEXT NOT NULL CHECK (btrim(name) <> ''),
    disease_idxs  INT[]  NOT NULL DEFAULT '{}',
    disease_names TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- idx と名前は 1 対 1 で並べる（片方だけ増えると、どの idx がどの名前か分からなくなる）
    CONSTRAINT patient_groups_disease_arrays_same_length
        CHECK (cardinality(disease_idxs) = cardinality(disease_names))
);

COMMENT ON TABLE public.patient_groups IS
'患者会。slug は data/patient_groups の id と一致。公開ページはこの表を読まない（JSON を読む）';
COMMENT ON COLUMN public.patient_groups.disease_idxs IS
'知識ファイルの配列上の位置。固定 ID ではない（kb_issues 47）。disease_names と同じ順';
COMMENT ON COLUMN public.patient_groups.disease_names IS
'seed を作った時点の疾患名（知識ファイルの表記）。idx がずれたときの照合用';

-- -----------------------------------------------------------------------------
-- memberships（会員資格）
--
-- 退会は行を消さずに left_at を立てる。再入会は同じ行の left_at を NULL に戻す（複合 PK のため）。
-- 会の削除は、書き出し（export_group）を先に行う運用にするため RESTRICT にする。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    user_id   UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    group_id  UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE RESTRICT,
    role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    left_at   TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS memberships_group_active_idx
    ON public.memberships (group_id) WHERE left_at IS NULL;

-- -----------------------------------------------------------------------------
-- invitations（招待。1 つの token で 1 人）
--
-- token は推測できない長さにする（gen_random_uuid 2 つ分、ハイフン抜き 64 文字）。
-- used_at と used_by は同時に立つ。
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
    token      TEXT PRIMARY KEY
               DEFAULT replace(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', ''),
    group_id   UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '14 days'),
    used_at    TIMESTAMP WITH TIME ZONE,
    used_by    UUID REFERENCES auth.users ON DELETE SET NULL,
    CONSTRAINT invitations_token_length CHECK (char_length(token) >= 32),
    -- used_by は退会者のアカウント削除で NULL になりうるので、used_at 側だけを縛る
    CONSTRAINT invitations_used_pair CHECK (used_by IS NULL OR used_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS invitations_group_idx ON public.invitations (group_id);

-- -----------------------------------------------------------------------------
-- join_requests（入会申請）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.join_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    message     TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 1000),
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    decided_by  UUID REFERENCES auth.users ON DELETE SET NULL,
    decided_at  TIMESTAMP WITH TIME ZONE,
    -- 決まったものだけ decided_at を持つ
    CONSTRAINT join_requests_decided_pair
        CHECK ((status = 'pending') = (decided_at IS NULL))
);

-- 同じ人が同じ会に「申請中」を 2 つ持たない
CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_idx
    ON public.join_requests (group_id, user_id) WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- group_posts（お知らせ・スレッド）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_posts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    author_id  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('announcement', 'thread')),
    title      TEXT NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 200),
    body       TEXT NOT NULL CHECK (btrim(body) <> '' AND char_length(body) <= 10000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS group_posts_list_idx
    ON public.group_posts (group_id, kind, created_at DESC) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- group_comments（コメント）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES public.group_posts (id) ON DELETE CASCADE,
    author_id  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    body       TEXT NOT NULL CHECK (btrim(body) <> '' AND char_length(body) <= 5000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS group_comments_post_idx
    ON public.group_comments (post_id, created_at) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON public.group_posts;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.group_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- 2. 判定用の関数（RLS の中から呼ぶ）
--
-- memberships のポリシーの中で memberships を読むと再帰するので、SECURITY DEFINER で切る。
-- どちらも「呼んだ本人（auth.uid()）」についてだけ答える。他人を指定する引数は持たない。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.group_id = p_group_id
          AND m.user_id = auth.uid()
          AND m.left_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_moderator(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.group_id = p_group_id
          AND m.user_id = auth.uid()
          AND m.left_at IS NULL
          AND m.role = 'moderator'
    );
$$;


-- =============================================================================
-- 3. RLS と権限
--
-- Supabase は public の新しい表に anon / authenticated へ全権限を既定で付ける。
-- まず全部はがしてから、要る分だけ付け直す（ポリシーと権限の二重で閉じる）。
-- ポリシーはすべて TO authenticated。anon にはポリシーも権限も無い。
-- 物理削除（DELETE）は誰にも与えない。削除は deleted_at（関数経由）。
-- =============================================================================
ALTER TABLE public.patient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.patient_groups FROM anon, authenticated;
REVOKE ALL ON public.memberships    FROM anon, authenticated;
REVOKE ALL ON public.invitations    FROM anon, authenticated;
REVOKE ALL ON public.join_requests  FROM anon, authenticated;
REVOKE ALL ON public.group_posts    FROM anon, authenticated;
REVOKE ALL ON public.group_comments FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- patient_groups: 認証済みなら全行の id / slug / name だけ読める（入会前の人が会を選ぶため）
-- disease_idxs / disease_names は列の権限を与えない（画面は JSON から疾患を引く）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS patient_groups_select_authenticated ON public.patient_groups;
CREATE POLICY patient_groups_select_authenticated ON public.patient_groups
    FOR SELECT TO authenticated
    USING (true);
GRANT SELECT (id, slug, name) ON public.patient_groups TO authenticated;

-- -----------------------------------------------------------------------------
-- memberships: 自分の行（退会後も含む）と、自分が有効な会員である会の有効な行
-- insert / update / delete のポリシーは作らない（関数経由のみ）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS memberships_select ON public.memberships;
CREATE POLICY memberships_select ON public.memberships
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (left_at IS NULL AND public.is_group_member(group_id))
    );
GRANT SELECT ON public.memberships TO authenticated;

-- -----------------------------------------------------------------------------
-- invitations: 作るのも見るのもその会のモデレーターだけ
-- 招待された人は表を読まずに accept_invitation(token) を呼ぶ
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS invitations_select_moderator ON public.invitations;
CREATE POLICY invitations_select_moderator ON public.invitations
    FOR SELECT TO authenticated
    USING (public.is_group_moderator(group_id));

DROP POLICY IF EXISTS invitations_insert_moderator ON public.invitations;
CREATE POLICY invitations_insert_moderator ON public.invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_group_moderator(group_id)
        AND created_by = auth.uid()
        AND used_at IS NULL
        AND used_by IS NULL
        AND expires_at > now()
        AND expires_at <= now() + INTERVAL '90 days'
    );
GRANT SELECT ON public.invitations TO authenticated;
-- token・created_at は既定値に任せる（手で決めた token を入れさせない）
GRANT INSERT (group_id, created_by, expires_at) ON public.invitations TO authenticated;

-- -----------------------------------------------------------------------------
-- join_requests
--   insert: 本人（申請中として）
--   select: その会のモデレーター、と本人（自分の申請の状態を見るため。Claude Code の判断で追加）
--   update: その会のモデレーター。ただし「却下」だけ。
--           承認は membership を作る必要があるので approve_join_request() 経由に限る
--           （直接 approved にすると会員でないのに「承認済み」の行ができるため）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS join_requests_insert_own ON public.join_requests;
CREATE POLICY join_requests_insert_own ON public.join_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'pending'
        AND decided_by IS NULL
        AND decided_at IS NULL
        AND NOT public.is_group_member(group_id)
        -- request_join() と同じく、プロフィール（表示名）の無い人は申請できない。
        -- member_profiles は本人の行が本人に見えるので、ここで確かめられる
        AND EXISTS (SELECT 1 FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS join_requests_select ON public.join_requests;
CREATE POLICY join_requests_select ON public.join_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_group_moderator(group_id));

DROP POLICY IF EXISTS join_requests_update_moderator ON public.join_requests;
CREATE POLICY join_requests_update_moderator ON public.join_requests
    FOR UPDATE TO authenticated
    USING (public.is_group_moderator(group_id) AND status = 'pending')
    WITH CHECK (
        public.is_group_moderator(group_id)
        AND status = 'rejected'
        AND decided_by = auth.uid()
        AND decided_at IS NOT NULL
    );
GRANT SELECT ON public.join_requests TO authenticated;
GRANT INSERT (group_id, user_id, message) ON public.join_requests TO authenticated;
GRANT UPDATE (status, decided_by, decided_at) ON public.join_requests TO authenticated;

-- -----------------------------------------------------------------------------
-- group_posts
--   select: 有効な会員。論理削除済みは返さない
--   insert: announcement はモデレーター、thread は会員以上。author_id は本人
--   update: 本人が自分の未削除の投稿の title / body だけ（削除は delete_group_post()）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS group_posts_select_member ON public.group_posts;
CREATE POLICY group_posts_select_member ON public.group_posts
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND public.is_group_member(group_id));

DROP POLICY IF EXISTS group_posts_insert ON public.group_posts;
CREATE POLICY group_posts_insert ON public.group_posts
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND deleted_at IS NULL
        AND (
            (kind = 'announcement' AND public.is_group_moderator(group_id))
            OR (kind = 'thread' AND public.is_group_member(group_id))
        )
    );

DROP POLICY IF EXISTS group_posts_update_own ON public.group_posts;
CREATE POLICY group_posts_update_own ON public.group_posts
    FOR UPDATE TO authenticated
    USING (author_id = auth.uid() AND deleted_at IS NULL AND public.is_group_member(group_id))
    WITH CHECK (author_id = auth.uid() AND deleted_at IS NULL AND public.is_group_member(group_id));
GRANT SELECT ON public.group_posts TO authenticated;
GRANT INSERT (group_id, author_id, kind, title, body) ON public.group_posts TO authenticated;
GRANT UPDATE (title, body) ON public.group_posts TO authenticated;

-- -----------------------------------------------------------------------------
-- group_comments
--   select: 投稿が見える会員（＝投稿の会の有効な会員、投稿が未削除）。論理削除済みは返さない
--   insert: 同じ条件で、author_id は本人
--   update: 与えない（編集は今回の範囲外。削除は delete_group_comment()）
--   thread・announcement のどちらにも付けられる（2026-09-26 ファウンダー確認）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS group_comments_select_member ON public.group_comments;
CREATE POLICY group_comments_select_member ON public.group_comments
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.group_posts p
            WHERE p.id = post_id
              AND p.deleted_at IS NULL
              AND public.is_group_member(p.group_id)
        )
    );

DROP POLICY IF EXISTS group_comments_insert_member ON public.group_comments;
CREATE POLICY group_comments_insert_member ON public.group_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.group_posts p
            WHERE p.id = post_id
              AND p.deleted_at IS NULL
              AND public.is_group_member(p.group_id)
        )
    );
GRANT SELECT ON public.group_comments TO authenticated;
GRANT INSERT (post_id, author_id, body) ON public.group_comments TO authenticated;


-- =============================================================================
-- 4. 操作の関数（SECURITY DEFINER。tenancy.ts から rpc で呼ぶ）
--
-- 共通の約束:
--   - SET search_path = ''（名前はすべて schema 付きで書く）
--   - 最初に auth.uid() が NULL なら止める
--   - 失敗は RAISE EXCEPTION の MESSAGE に短い英字のコードを入れる（tenancy.ts が読み替える）
--   - 他人の full_name は返さない。表示名は member_profiles.display_name だけ
-- =============================================================================

-- -----------------------------------------------------------------------------
-- accept_invitation(token) → 入った会の id
--   既に有効な会員なら token を使わずに止める（token を無駄にしない）
--   プロフィール（表示名）が無い人は入れない（会員一覧に名前が出せないため。Claude Code の判断）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_inv public.invitations%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT * INTO v_inv FROM public.invitations WHERE token = p_token FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invitation_not_found';
    END IF;
    IF v_inv.used_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'invitation_used';
    END IF;
    IF v_inv.expires_at <= now() THEN
        RAISE EXCEPTION USING MESSAGE = 'invitation_expired';
    END IF;
    IF EXISTS (SELECT 1 FROM public.memberships
               WHERE user_id = v_uid AND group_id = v_inv.group_id AND left_at IS NULL) THEN
        RAISE EXCEPTION USING MESSAGE = 'already_member';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.member_profiles WHERE user_id = v_uid) THEN
        RAISE EXCEPTION USING MESSAGE = 'profile_required';
    END IF;

    -- 再入会は同じ行を生き返らせる。役割は member に戻す
    INSERT INTO public.memberships (user_id, group_id, role, joined_at, left_at)
    VALUES (v_uid, v_inv.group_id, 'member', now(), NULL)
    ON CONFLICT (user_id, group_id) DO UPDATE
        SET role = 'member', joined_at = now(), left_at = NULL;

    UPDATE public.invitations SET used_at = now(), used_by = v_uid WHERE token = p_token;

    -- 同じ会への申請中のものがあれば、承認済みとして閉じる（決めたのは招待を作った人）
    UPDATE public.join_requests
       SET status = 'approved', decided_by = v_inv.created_by, decided_at = now()
     WHERE group_id = v_inv.group_id AND user_id = v_uid AND status = 'pending';

    RETURN v_inv.group_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- request_join(group_id, message) → 申請の id
--   表への直接 insert（本人のポリシー）と同じ条件に、会の存在・プロフィールの有無・重複を足す
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_join(p_group_id UUID, p_message TEXT DEFAULT '')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_id  UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
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

    INSERT INTO public.join_requests (group_id, user_id, message)
    VALUES (p_group_id, v_uid, coalesce(p_message, ''))
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- approve_join_request(request_id) / reject_join_request(request_id)
--   呼んだ人が「その申請の会」のモデレーターであることを関数内で確かめる
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_req public.join_requests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT * INTO v_req FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
    -- 会のモデレーターでない人には、申請が有るか無いかも区別させない
    IF NOT FOUND OR NOT public.is_group_moderator(v_req.group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;
    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION USING MESSAGE = 'request_not_pending';
    END IF;

    INSERT INTO public.memberships AS m (user_id, group_id, role, joined_at, left_at)
    VALUES (v_req.user_id, v_req.group_id, 'member', now(), NULL)
    ON CONFLICT (user_id, group_id) DO UPDATE
        SET role = 'member', joined_at = now(), left_at = NULL
        WHERE m.left_at IS NOT NULL;  -- 既に有効な会員なら役割を変えない

    UPDATE public.join_requests
       SET status = 'approved', decided_by = v_uid, decided_at = now()
     WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_req public.join_requests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT * INTO v_req FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR NOT public.is_group_moderator(v_req.group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;
    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION USING MESSAGE = 'request_not_pending';
    END IF;

    UPDATE public.join_requests
       SET status = 'rejected', decided_by = v_uid, decided_at = now()
     WHERE id = p_request_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- list_group_members(group_id) → 有効な会員の user_id・表示名・役割・入会日
--   member_profiles は本人の行しか見えないので、表示名だけをこの関数で渡す。full_name は返さない
--   user_id は投稿の author_id と表示名を突き合わせるために返す
-- -----------------------------------------------------------------------------
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
    IF NOT public.is_group_member(p_group_id) THEN
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

-- -----------------------------------------------------------------------------
-- delete_group_post(post_id) / delete_group_comment(comment_id)
--   論理削除。書いた本人か、その会のモデレーター
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
       OR NOT (v_post.author_id = v_uid OR public.is_group_moderator(v_post.group_id)) THEN
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
       OR NOT (v_author = v_uid OR public.is_group_moderator(v_group_id)) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_comments SET deleted_at = now() WHERE id = p_comment_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- leave_group(group_id)（退会。本人が自分の membership に left_at を立てる）
--   行は消さない（再入会は accept_invitation / approve_join_request が同じ行を生き返らせる）。
--   投稿・コメントは残す（書き出しでは退会者の表示名は出る。会員一覧からは消える）。
--   最後のモデレーターは退会できない（会を管理する人がいなくなるため。Claude Code の判断）。
--   先に appoint_moderator() で別の会員をモデレーターにする。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid  UUID := auth.uid();
    v_role TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    -- 2 人のモデレーターが同時に退会して 0 人になるのを防ぐため、その会のモデレーターの行を先に固める
    -- （dismiss_moderator と同じ順で固めるので、退会と解除が重なっても順番に処理される）
    PERFORM 1 FROM public.memberships m
      WHERE m.group_id = p_group_id AND m.role = 'moderator' AND m.left_at IS NULL
        FOR UPDATE;

    SELECT m.role INTO v_role
      FROM public.memberships m
     WHERE m.user_id = v_uid AND m.group_id = p_group_id AND m.left_at IS NULL
       FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;

    IF v_role = 'moderator' AND NOT EXISTS (
        SELECT 1 FROM public.memberships m
         WHERE m.group_id = p_group_id
           AND m.user_id <> v_uid
           AND m.role = 'moderator'
           AND m.left_at IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'last_moderator';
    END IF;

    UPDATE public.memberships
       SET left_at = now()
     WHERE user_id = v_uid AND group_id = p_group_id AND left_at IS NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- list_join_requests(group_id) → 申請中の申請 id・表示名・ひとこと・申請日（その会のモデレーターのみ）
--   member_profiles は本人の行しか見えないので、申請者の表示名はこの関数で渡す。
--   user_id・full_name・メールは返さない。承認・却下は申請 id で行う。
--   返すのは申請中（pending）だけ（承認・却下の判断に使う一覧のため）。
--   プロフィール未作成の申請者の表示名は null。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_join_requests(p_group_id UUID)
RETURNS TABLE (id UUID, display_name TEXT, message TEXT, created_at TIMESTAMP WITH TIME ZONE)
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
        SELECT r.id, mp.display_name, r.message, r.created_at
          FROM public.join_requests r
          LEFT JOIN public.member_profiles mp ON mp.user_id = r.user_id
         WHERE r.group_id = p_group_id AND r.status = 'pending'
         ORDER BY r.created_at;
END;
$$;

-- -----------------------------------------------------------------------------
-- appoint_moderator(group_id, user_id) / dismiss_moderator(group_id, user_id)
--   任命・解除は、その会の有効なモデレーターだけができる。
--   相手はその会の有効な会員でなければならない（not_member）。
--   最後の 1 人は解除できない（last_moderator）。自分自身の解除も、ほかにモデレーターがいれば可。
--   相手の user_id は list_group_members() で得る。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.appoint_moderator(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
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

    UPDATE public.memberships m
       SET role = 'moderator'
     WHERE m.group_id = p_group_id AND m.user_id = p_user_id AND m.left_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_moderator(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_moderator(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    -- 同時に 2 人が互いを解除して 0 人になるのを防ぐため、その会のモデレーターの行を先に固める
    PERFORM 1 FROM public.memberships m
      WHERE m.group_id = p_group_id AND m.role = 'moderator' AND m.left_at IS NULL
        FOR UPDATE;

    SELECT m.role INTO v_role
      FROM public.memberships m
     WHERE m.group_id = p_group_id AND m.user_id = p_user_id AND m.left_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'not_member';
    END IF;
    IF v_role <> 'moderator' THEN
        RAISE EXCEPTION USING MESSAGE = 'not_moderator';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.memberships m
         WHERE m.group_id = p_group_id
           AND m.user_id <> p_user_id
           AND m.role = 'moderator'
           AND m.left_at IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'last_moderator';
    END IF;

    UPDATE public.memberships m
       SET role = 'member'
     WHERE m.group_id = p_group_id AND m.user_id = p_user_id AND m.left_at IS NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- export_group(group_id) → JSON（退去用。モデレーターのみ）
--   会の投稿（未削除）とコメント（未削除）、有効な会員の表示名だけを出す
--   user_id・full_name・プロフィールの他の項目は出さない。書いた人は表示名で出す
--   （退会済み・プロフィール未作成の人は null）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_group_moderator(p_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    SELECT jsonb_build_object(
        'format', 'tonari-patient-group-export/1',
        'exported_at', now(),
        'group', jsonb_build_object('slug', g.slug, 'name', g.name),
        'members', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                       'display_name', mp.display_name,
                       'role', m.role,
                       'joined_at', m.joined_at) ORDER BY m.joined_at)
              FROM public.memberships m
              LEFT JOIN public.member_profiles mp ON mp.user_id = m.user_id
             WHERE m.group_id = g.id AND m.left_at IS NULL
        ), '[]'::JSONB),
        'posts', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                       'kind', p.kind,
                       'title', p.title,
                       'body', p.body,
                       'author', pa.display_name,
                       'created_at', p.created_at,
                       'updated_at', p.updated_at,
                       'comments', coalesce((
                           SELECT jsonb_agg(jsonb_build_object(
                                      'body', c.body,
                                      'author', ca.display_name,
                                      'created_at', c.created_at) ORDER BY c.created_at)
                             FROM public.group_comments c
                             LEFT JOIN public.member_profiles ca ON ca.user_id = c.author_id
                            WHERE c.post_id = p.id AND c.deleted_at IS NULL
                       ), '[]'::JSONB)) ORDER BY p.created_at)
              FROM public.group_posts p
              LEFT JOIN public.member_profiles pa ON pa.user_id = p.author_id
             WHERE p.group_id = g.id AND p.deleted_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.patient_groups g
    WHERE g.id = p_group_id;

    RETURN v_result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 関数の実行権限
-- PostgreSQL は新しい関数を PUBLIC に実行可で作り、Supabase は anon にも付ける。
-- 全部はがして authenticated にだけ付ける
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_group_member(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_group_moderator(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invitation(TEXT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_join(UUID, TEXT)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_join_request(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_join_request(UUID)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_group_members(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group_post(UUID)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group_comment(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_group(UUID)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_join_requests(UUID)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.appoint_moderator(UUID, UUID)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_moderator(UUID, UUID)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.export_group(UUID)               FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_moderator(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_join(UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join_request(UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_group_members(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_post(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_comment(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_join_requests(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.appoint_moderator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_moderator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_group(UUID)            TO authenticated;


-- =============================================================================
-- 5. seed（data/patient_groups/ から機械で作ったもの）
--
-- 作り直し: python3 scripts/portal/build_patient_group_seed.py の出力で BEGIN〜END を置き換える。
-- ただし適用済みの migration は書き換えず、新しい migration に同じ文を入れて流す
-- （ON CONFLICT (slug) で上書きされる。JSON から消えた会は DB から消さない）。
-- 一致の検査: lib/portal/__tests__/tenancy.test.ts
-- =============================================================================
-- BEGIN SEED（scripts/portal/build_patient_group_seed.py の出力。手で書き換えない）
INSERT INTO public.patient_groups (slug, name, disease_idxs, disease_names) VALUES
    ('fabry-fukurou', '一般社団法人 全国ファブリー病患者と家族の会（ふくろうの会）', ARRAY[0]::INT[], ARRAY['ファブリー病']::TEXT[]),
    ('gaucher-japan', '日本ゴーシェ病の会', ARRAY[3]::INT[], ARRAY['ゴーシェ病']::TEXT[]),
    ('mps-japan', '日本ムコ多糖症患者家族の会', ARRAY[1]::INT[], ARRAY['ムコ多糖症I型']::TEXT[]),
    ('japan-pku', 'フェニルケトン尿症親の会連絡協議会', ARRAY[12]::INT[], ARRAY['フェニルケトン尿症']::TEXT[]),
    ('sma-kazoku', '一般社団法人 SMA家族の会', ARRAY[14]::INT[], ARRAY['脊髄性筋萎縮症']::TEXT[]),
    ('tsukushinokai', 'つくしの会（全国軟骨無形成症患者・家族の会）', ARRAY[8]::INT[], ARRAY['軟骨無形成症']::TEXT[]),
    ('hpp-hope', 'HPP HOPE（低ホスファターゼ症コミュニティ）', ARRAY[22]::INT[], ARRAY['低ホスファターゼ症']::TEXT[])
ON CONFLICT (slug) DO UPDATE SET
    name          = EXCLUDED.name,
    disease_idxs  = EXCLUDED.disease_idxs,
    disease_names = EXCLUDED.disease_names;
-- END SEED


-- =============================================================================
-- 適用後に、ファウンダーが確かめること（ローカル Supabase 専用。Claude Code は接続しない）
--
-- 確認は台本 scripts/portal/verify_tenancy.sql に移した。
--   Studio の SQL エディタに全文を貼って 1 回実行する。最後の SELECT に
--   「項目／期待／実際／OK・NG」の一覧が出る。テストデータは台本の中で作り、終わりに消す。
--   本番では実行しない（テストユーザーを auth.users に作るため）。
--
-- 台本が最初に確かめること（旧手順 0）:
--   関数の所有者が BYPASSRLS を持つか。持っていないと、関数から member_profiles（FORCE 付き）の
--   表示名が読めず、会員一覧・申請一覧・書き出しの名前が null になる。
--
-- 本番で最初のモデレーターを作るとき（画面からは作れない。2026-09-26 ファウンダー確認）:
--   SQL エディタで 1 行だけ手で入れる。2 人目以降は appoint_moderator() で任命する。
--     insert into memberships (user_id, group_id, role)
--     select '<世話人の user_id>', id, 'moderator' from patient_groups where slug = '<会の slug>';
-- =============================================================================
