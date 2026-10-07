-- =============================================================================
-- 会員エリアの機能：行事・出欠・リンク・会の設定・投稿の分類とピン留め・公開用の表（2026-10-13 ファウンダー指示）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。
-- ※ CLAUDE.md「公開面の最上位規範」の例外（public_group_items を公開面が読む）は、ファウンダーが CLAUDE.md に書く。
--
-- 作るもの・変えるもの:
--   1. group_events（行事）             … 会員が読む。世話人が表を直接書く。削除は delete_group_event()（論理削除）
--   2. event_attendance（参加表明）      … 本人の行だけ読み書き（その会の会員のみ）。世話人は list_event_attendance() で
--                                         表示名と状態だけを見る（user_id は返さない）。人数を返す関数は作らない
--   3. group_links（会のリンク集）       … 会員が読む。世話人が表を直接書く。削除は delete_group_link()（論理削除）
--   4. group_settings（会の設定）        … 会員が読む。世話人が表を直接書く。updated_by・updated_at はトリガーが付ける
--   5. group_posts に category・pinned・is_public
--        category  … 既定 'other'。投稿者が自分の投稿で変えられる
--        pinned    … 既定 false。変えるのは pin_group_post()（世話人のみ）だけ。列の権限を与えず、表を直接は変えられない
--        is_public … 既定 false。お知らせ（announcement）のときだけ true にできる（CHECK とトリガーの両方で止める）
--   6. group_events.is_public           … 既定 false
--   7. public_group_items（公開用の表）  … 公開にしたお知らせと行事の写し。anon と authenticated が全行読める。
--                                         書くのはトリガーだけ（API ロールは insert / update / delete 不可）。
--                                         user_id・created_by・author_id の列を持たない
--   8. export_group の差し替え           … 行事・リンク・設定を加える（参加表明と created_by・updated_by は含めない）
--
-- 写し方（トリガー sync_public_group_item。group_posts と group_events の AFTER INSERT / UPDATE / DELETE）:
--   - 公開（is_public = true・deleted_at なし。投稿はお知らせのときだけ）なら写す。
--     初めて写すときの時刻が published_at。写した後に本文などを直したら写し直し、updated_at を変える（published_at は変えない）
--   - 非公開にした・論理削除した・行が消えたら、写しを消す（もう一度公開にすると、新しい published_at で写し直す）
--   - group_slug は写したときの会の slug。後で slug が変わっても追いかけない（今の patient_groups には slug を変える経路が無い）
--   - 終わった行事も写しを残す（画面側で終わった分を出さない。2026-10-13 ファウンダー回答）
--
-- 関数の権限:
--   API から呼ぶ関数（delete_group_event・list_event_attendance・delete_group_link・pin_group_post・export_group）は
--   SECURITY DEFINER・search_path ''・PUBLIC と anon に EXECUTE なし・authenticated にあり。
--   トリガー関数（sync_public_group_item・stamp_group_settings）も SECURITY DEFINER・search_path '' だが、API から呼ぶものではないので
--   20261010 の journey_links_delete_response・20261011 の handle_new_user と同じく PUBLIC・anon・authenticated からはがす
--   （Claude Code の判断。トリガーの発火には呼び出し側の EXECUTE は要らない見込み）。
--   エラーの語は既存どおり（forbidden / not_member / invalid_input）。
--
-- Claude Code の判断で足した制約（契約に無いもの）:
--   - group_events.ends_at は starts_at 以降
--   - 任意の文字列（place・note・welcome_text・rules_text）は、入れるなら空白だけにしない（空は NULL）
--   - list_event_attendance は、いまも在籍している会員の参加表明だけを返す（退会した人の分は出さない）
--
-- 個人情報（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）:
--   参加表明は「誰がどの行事に出るか」で、会員どうしにも見せない（本人と、世話人の一覧の表示名だけ）。
--   行事・リンク・設定・投稿の本文は外部 LLM API へ送らない。
-- =============================================================================


-- =============================================================================
-- 1. 表
-- =============================================================================

-- -----------------------------------------------------------------------------
-- group_events（行事）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    title      TEXT NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 100),
    body       TEXT NOT NULL CHECK (btrim(body) <> '' AND char_length(body) <= 4000),
    starts_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at    TIMESTAMP WITH TIME ZONE,
    place      TEXT CHECK (place IS NULL OR (btrim(place) <> '' AND char_length(place) <= 200)),
    online_url TEXT CHECK (online_url IS NULL OR (char_length(online_url) <= 500 AND online_url ~* '^https?://[^[:space:]]+$')),
    is_public  BOOLEAN NOT NULL DEFAULT false,
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT group_events_ends_after_starts CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS group_events_list_idx
    ON public.group_events (group_id, starts_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.group_events IS
'会の行事。会員が読み、世話人が書く。削除は delete_group_event()（論理削除）。is_public の行は public_group_items に写る';

-- -----------------------------------------------------------------------------
-- event_attendance（参加表明）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_attendance (
    event_id   UUID NOT NULL REFERENCES public.group_events (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
    status     TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

COMMENT ON TABLE public.event_attendance IS
'行事への参加表明。本人の行だけが見える・書ける（その会の会員のみ）。世話人は list_event_attendance() で表示名と状態だけを見る';

-- -----------------------------------------------------------------------------
-- group_links（会のリンク集）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_links (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    title      TEXT NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 100),
    url        TEXT NOT NULL CHECK (char_length(url) <= 500 AND url ~* '^https?://[^[:space:]]+$'),
    note       TEXT CHECK (note IS NULL OR (btrim(note) <> '' AND char_length(note) <= 500)),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS group_links_list_idx
    ON public.group_links (group_id, created_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- group_settings（会の設定。会ごとに 1 行）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_settings (
    group_id     UUID PRIMARY KEY REFERENCES public.patient_groups (id) ON DELETE CASCADE,
    welcome_text TEXT CHECK (welcome_text IS NULL OR (btrim(welcome_text) <> '' AND char_length(welcome_text) <= 2000)),
    rules_text   TEXT CHECK (rules_text IS NULL OR (btrim(rules_text) <> '' AND char_length(rules_text) <= 4000)),
    updated_by   UUID REFERENCES auth.users ON DELETE SET NULL,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- group_posts に category・pinned・is_public
-- -----------------------------------------------------------------------------
ALTER TABLE public.group_posts
    ADD COLUMN IF NOT EXISTS category  TEXT    NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS pinned    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.group_posts DROP CONSTRAINT IF EXISTS group_posts_category_check;
ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_category_check
    CHECK (category IN ('daily', 'system', 'treatment', 'family', 'other'));

-- 公開にできるのはお知らせだけ（スレッドは公開にできない。トリガーでも止める）
ALTER TABLE public.group_posts DROP CONSTRAINT IF EXISTS group_posts_public_announcement_only;
ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_public_announcement_only
    CHECK (NOT is_public OR kind = 'announcement');

COMMENT ON COLUMN public.group_posts.category IS
'分類（daily / system / treatment / family / other）。投稿者が自分の投稿で変えられる';
COMMENT ON COLUMN public.group_posts.pinned IS
'ピン留め。変えるのは pin_group_post()（世話人のみ）だけ。表を直接は変えられない（列の権限が無い）';
COMMENT ON COLUMN public.group_posts.is_public IS
'公開ページに出すか。お知らせのときだけ true にできる。true の行は public_group_items に写る';

-- -----------------------------------------------------------------------------
-- public_group_items（公開用の表。公開にしたお知らせと行事の写し）
--   書き手・作成者・利用者の id は持たない。kind = 'notice' の行は行事の列（starts_at 以下）を持たない
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_group_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_slug   TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('notice', 'event')),
    source_id    UUID NOT NULL,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    starts_at    TIMESTAMP WITH TIME ZONE,
    ends_at      TIMESTAMP WITH TIME ZONE,
    place        TEXT,
    online_url   TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT public_group_items_one_copy UNIQUE (kind, source_id),
    CONSTRAINT public_group_items_notice_has_no_event_columns
        CHECK (kind = 'event' OR (starts_at IS NULL AND ends_at IS NULL AND place IS NULL AND online_url IS NULL)),
    CONSTRAINT public_group_items_event_has_starts_at CHECK (kind = 'notice' OR starts_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS public_group_items_slug_idx
    ON public.public_group_items (group_slug, kind, published_at DESC);

COMMENT ON TABLE public.public_group_items IS
'公開ページ用の写し（お知らせ・行事）。トリガー sync_public_group_item だけが書く。anon と authenticated が全行読める。書き手の id は持たない';


-- =============================================================================
-- 2. RLS と権限
--   Supabase は新しい表に anon / authenticated へ全権限を既定で付けるので、はがしてから要る分だけ付ける。
--   物理削除（DELETE）はどの API ロールにも与えない。
-- =============================================================================
ALTER TABLE public.group_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_group_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.group_events       FROM anon, authenticated;
REVOKE ALL ON public.event_attendance   FROM anon, authenticated;
REVOKE ALL ON public.group_links        FROM anon, authenticated;
REVOKE ALL ON public.group_settings     FROM anon, authenticated;
REVOKE ALL ON public.public_group_items FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- group_events
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS group_events_select_member ON public.group_events;
CREATE POLICY group_events_select_member ON public.group_events
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND public.is_group_member(group_id));

DROP POLICY IF EXISTS group_events_insert_moderator ON public.group_events;
CREATE POLICY group_events_insert_moderator ON public.group_events
    FOR INSERT TO authenticated
    WITH CHECK (public.is_group_moderator(group_id) AND created_by = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS group_events_update_moderator ON public.group_events;
CREATE POLICY group_events_update_moderator ON public.group_events
    FOR UPDATE TO authenticated
    USING (public.is_group_moderator(group_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_group_moderator(group_id) AND deleted_at IS NULL);

GRANT SELECT ON public.group_events TO authenticated;
GRANT INSERT (group_id, title, body, starts_at, ends_at, place, online_url, is_public, created_by)
    ON public.group_events TO authenticated;
-- group_id（別の会へ移す）・created_by・deleted_at（論理削除は関数で）は変えさせない
GRANT UPDATE (title, body, starts_at, ends_at, place, online_url, is_public) ON public.group_events TO authenticated;

-- -----------------------------------------------------------------------------
-- event_attendance（本人の行だけ・その会の会員のみ。行事が見えること＝会員で、行事が消されていないこと）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS event_attendance_select_own ON public.event_attendance;
CREATE POLICY event_attendance_select_own ON public.event_attendance
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.group_events e
                     WHERE e.id = event_id AND e.deleted_at IS NULL AND public.is_group_member(e.group_id))
    );

DROP POLICY IF EXISTS event_attendance_insert_own ON public.event_attendance;
CREATE POLICY event_attendance_insert_own ON public.event_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.group_events e
                     WHERE e.id = event_id AND e.deleted_at IS NULL AND public.is_group_member(e.group_id))
    );

DROP POLICY IF EXISTS event_attendance_update_own ON public.event_attendance;
CREATE POLICY event_attendance_update_own ON public.event_attendance
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.group_events e
                     WHERE e.id = event_id AND e.deleted_at IS NULL AND public.is_group_member(e.group_id))
    )
    WITH CHECK (user_id = auth.uid());

GRANT SELECT ON public.event_attendance TO authenticated;
GRANT INSERT (event_id, user_id, status) ON public.event_attendance TO authenticated;
GRANT UPDATE (status) ON public.event_attendance TO authenticated;

-- -----------------------------------------------------------------------------
-- group_links
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS group_links_select_member ON public.group_links;
CREATE POLICY group_links_select_member ON public.group_links
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND public.is_group_member(group_id));

DROP POLICY IF EXISTS group_links_insert_moderator ON public.group_links;
CREATE POLICY group_links_insert_moderator ON public.group_links
    FOR INSERT TO authenticated
    WITH CHECK (public.is_group_moderator(group_id) AND created_by = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS group_links_update_moderator ON public.group_links;
CREATE POLICY group_links_update_moderator ON public.group_links
    FOR UPDATE TO authenticated
    USING (public.is_group_moderator(group_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_group_moderator(group_id) AND deleted_at IS NULL);

GRANT SELECT ON public.group_links TO authenticated;
GRANT INSERT (group_id, title, url, note, created_by) ON public.group_links TO authenticated;
GRANT UPDATE (title, url, note) ON public.group_links TO authenticated;

-- -----------------------------------------------------------------------------
-- group_settings（updated_by・updated_at はトリガーが付けるので、列の権限は与えない）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS group_settings_select_member ON public.group_settings;
CREATE POLICY group_settings_select_member ON public.group_settings
    FOR SELECT TO authenticated
    USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS group_settings_insert_moderator ON public.group_settings;
CREATE POLICY group_settings_insert_moderator ON public.group_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_group_moderator(group_id));

DROP POLICY IF EXISTS group_settings_update_moderator ON public.group_settings;
CREATE POLICY group_settings_update_moderator ON public.group_settings
    FOR UPDATE TO authenticated
    USING (public.is_group_moderator(group_id))
    WITH CHECK (public.is_group_moderator(group_id));

GRANT SELECT ON public.group_settings TO authenticated;
GRANT INSERT (group_id, welcome_text, rules_text) ON public.group_settings TO authenticated;
GRANT UPDATE (welcome_text, rules_text) ON public.group_settings TO authenticated;

-- -----------------------------------------------------------------------------
-- group_posts（新しい列の権限と、本人の update ポリシーの付け直し）
--   insert: category・is_public を書ける（is_public はお知らせ＝世話人の投稿だけ。CHECK と既存の insert ポリシーで決まる）。
--           pinned は書けない（列の権限が無い）
--   update: 投稿者が category・is_public を変えられる。is_public を true にできるのは、いまも世話人である投稿者だけ
-- -----------------------------------------------------------------------------
GRANT INSERT (category, is_public) ON public.group_posts TO authenticated;
GRANT UPDATE (category, is_public) ON public.group_posts TO authenticated;

DROP POLICY IF EXISTS group_posts_update_own ON public.group_posts;
CREATE POLICY group_posts_update_own ON public.group_posts
    FOR UPDATE TO authenticated
    USING (author_id = auth.uid() AND deleted_at IS NULL AND public.is_group_member(group_id))
    WITH CHECK (
        author_id = auth.uid() AND deleted_at IS NULL AND public.is_group_member(group_id)
        AND (NOT is_public OR public.is_group_moderator(group_id))
    );

-- -----------------------------------------------------------------------------
-- public_group_items（anon と authenticated が全行読める。書くのはトリガーだけ）
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS public_group_items_select_all ON public.public_group_items;
CREATE POLICY public_group_items_select_all ON public.public_group_items
    FOR SELECT TO anon, authenticated
    USING (true);

GRANT SELECT ON public.public_group_items TO anon, authenticated;


-- =============================================================================
-- 3. トリガー
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at（00001 の handle_updated_at を使い回す）
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.group_events;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.group_events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.event_attendance;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.event_attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- group_settings の updated_by・updated_at（書いた世話人と時刻。アプリから送らせない）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_group_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_group_settings ON public.group_settings;
CREATE TRIGGER stamp_group_settings
    BEFORE INSERT OR UPDATE ON public.group_settings
    FOR EACH ROW EXECUTE FUNCTION public.stamp_group_settings();

-- -----------------------------------------------------------------------------
-- 公開用の表へ写す（group_posts・group_events の AFTER INSERT / UPDATE / DELETE）
--   写すかどうか:
--     group_posts  … is_public かつ kind = 'announcement' かつ deleted_at IS NULL
--     group_events … is_public かつ deleted_at IS NULL
--   スレッドに is_public が立っていたら止める（CHECK が先に止めるので、ここに来ることは無いはず。二重の止め）
--   写し直すのは、写す列のどれかが変わったときだけ（ピン留めや分類の変更では updated_at を変えない）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_public_group_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_kind   TEXT := CASE TG_TABLE_NAME WHEN 'group_posts' THEN 'notice' ELSE 'event' END;
    v_public BOOLEAN := false;
    v_slug   TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.public_group_items WHERE kind = v_kind AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    IF TG_TABLE_NAME = 'group_posts' THEN
        IF NEW.is_public AND NEW.kind <> 'announcement' THEN
            RAISE EXCEPTION USING MESSAGE = 'invalid_input';
        END IF;
        v_public := NEW.is_public AND NEW.kind = 'announcement' AND NEW.deleted_at IS NULL;
    ELSE
        v_public := NEW.is_public AND NEW.deleted_at IS NULL;
    END IF;

    IF NOT v_public THEN
        DELETE FROM public.public_group_items WHERE kind = v_kind AND source_id = NEW.id;
        RETURN NEW;
    END IF;

    SELECT g.slug INTO v_slug FROM public.patient_groups g WHERE g.id = NEW.group_id;

    IF TG_TABLE_NAME = 'group_posts' THEN
        INSERT INTO public.public_group_items AS i (group_slug, kind, source_id, title, body)
        VALUES (v_slug, 'notice', NEW.id, NEW.title, NEW.body)
        ON CONFLICT (kind, source_id) DO UPDATE
            SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = now()
            WHERE (i.title, i.body) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.body);
    ELSE
        INSERT INTO public.public_group_items AS i
            (group_slug, kind, source_id, title, body, starts_at, ends_at, place, online_url)
        VALUES (v_slug, 'event', NEW.id, NEW.title, NEW.body, NEW.starts_at, NEW.ends_at, NEW.place, NEW.online_url)
        ON CONFLICT (kind, source_id) DO UPDATE
            SET title = EXCLUDED.title, body = EXCLUDED.body, starts_at = EXCLUDED.starts_at,
                ends_at = EXCLUDED.ends_at, place = EXCLUDED.place, online_url = EXCLUDED.online_url,
                updated_at = now()
            WHERE (i.title, i.body, i.starts_at, i.ends_at, i.place, i.online_url)
                  IS DISTINCT FROM
                  (EXCLUDED.title, EXCLUDED.body, EXCLUDED.starts_at, EXCLUDED.ends_at, EXCLUDED.place, EXCLUDED.online_url);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_group_item ON public.group_posts;
CREATE TRIGGER sync_public_group_item
    AFTER INSERT OR UPDATE OR DELETE ON public.group_posts
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_group_item();

DROP TRIGGER IF EXISTS sync_public_group_item ON public.group_events;
CREATE TRIGGER sync_public_group_item
    AFTER INSERT OR UPDATE OR DELETE ON public.group_events
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_group_item();


-- =============================================================================
-- 4. 関数（API から呼ぶもの）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- delete_group_event(event_id)：論理削除。その会の世話人だけ。それ以外・無い・消し済みは forbidden
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_group_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_group_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT e.group_id INTO v_group_id
      FROM public.group_events e
     WHERE e.id = p_event_id AND e.deleted_at IS NULL
       FOR UPDATE;
    IF NOT FOUND OR NOT public.is_group_moderator(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_events SET deleted_at = now() WHERE id = p_event_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- list_event_attendance(event_id) → (display_name, status)：その会の世話人だけ。user_id は返さない。
--   いまも在籍している会員の分だけ（Claude Code の判断）。人数の集計はしない
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_event_attendance(p_event_id UUID)
RETURNS TABLE (display_name TEXT, status TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
    v_group_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT e.group_id INTO v_group_id
      FROM public.group_events e
     WHERE e.id = p_event_id AND e.deleted_at IS NULL;
    IF NOT FOUND OR NOT public.is_group_moderator(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT mp.display_name, a.status
          FROM public.event_attendance a
          JOIN public.memberships m
            ON m.user_id = a.user_id AND m.group_id = v_group_id AND m.left_at IS NULL
          LEFT JOIN public.member_profiles mp ON mp.user_id = a.user_id
         WHERE a.event_id = p_event_id
         ORDER BY CASE a.status WHEN 'yes' THEN 1 WHEN 'maybe' THEN 2 ELSE 3 END, a.updated_at;
END;
$$;

-- -----------------------------------------------------------------------------
-- delete_group_link(link_id)：論理削除。その会の世話人だけ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_group_link(p_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_group_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;

    SELECT l.group_id INTO v_group_id
      FROM public.group_links l
     WHERE l.id = p_link_id AND l.deleted_at IS NULL
       FOR UPDATE;
    IF NOT FOUND OR NOT public.is_group_moderator(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_links SET deleted_at = now() WHERE id = p_link_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- pin_group_post(post_id, pinned)：ピン留めの付け外し。その会の世話人だけ（投稿の種類は問わない）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pin_group_post(p_post_id UUID, p_pinned BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_group_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF p_pinned IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'invalid_input';
    END IF;

    SELECT p.group_id INTO v_group_id
      FROM public.group_posts p
     WHERE p.id = p_post_id AND p.deleted_at IS NULL
       FOR UPDATE;
    IF NOT FOUND OR NOT public.is_group_moderator(v_group_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    UPDATE public.group_posts SET pinned = p_pinned WHERE id = p_post_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- export_group(group_id) の差し替え：行事・リンク・設定を加える
--   20260927 の本文に 'events'・'links'・'settings' を足しただけ（ほかの中身・止め方は同じ）。
--   参加表明・created_by・updated_by は含めない。行事・リンクは論理削除していないものだけ
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
        ), '[]'::JSONB),
        'events', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                       'title', e.title,
                       'body', e.body,
                       'starts_at', e.starts_at,
                       'ends_at', e.ends_at,
                       'place', e.place,
                       'online_url', e.online_url,
                       'is_public', e.is_public,
                       'created_at', e.created_at,
                       'updated_at', e.updated_at) ORDER BY e.starts_at)
              FROM public.group_events e
             WHERE e.group_id = g.id AND e.deleted_at IS NULL
        ), '[]'::JSONB),
        'links', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                       'title', l.title,
                       'url', l.url,
                       'note', l.note,
                       'created_at', l.created_at) ORDER BY l.created_at)
              FROM public.group_links l
             WHERE l.group_id = g.id AND l.deleted_at IS NULL
        ), '[]'::JSONB),
        'settings', (
            SELECT jsonb_build_object(
                       'welcome_text', s.welcome_text,
                       'rules_text', s.rules_text,
                       'updated_at', s.updated_at)
              FROM public.group_settings s
             WHERE s.group_id = g.id
        )
    )
    INTO v_result
    FROM public.patient_groups g
    WHERE g.id = p_group_id;

    RETURN v_result;
END;
$$;


-- =============================================================================
-- 5. 関数の実行権限
-- =============================================================================
REVOKE ALL ON FUNCTION public.delete_group_event(UUID)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_event_attendance(UUID)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group_link(UUID)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pin_group_post(UUID, BOOLEAN)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.export_group(UUID)                    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.delete_group_event(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_attendance(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group_link(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_group_post(UUID, BOOLEAN)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_group(UUID)                 TO authenticated;

-- トリガー関数は API から呼ばない
REVOKE ALL ON FUNCTION public.sync_public_group_item()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_group_settings()                FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_events.sql を Studio の SQL エディタに全文貼って 1 回実行する。
--   最後の SELECT の先頭の行（まとめ）が「NG 0 件」であること。
--   あわせて scripts/portal/verify_tenancy.sql も流す（group_posts のポリシーと export_group を差し替えたため）。
-- =============================================================================
