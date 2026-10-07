-- =============================================================================
-- プロダクトデモ用の見本データ（fabry-fukurou の会員エリア）— 本番（Supabase クラウド）で流せる版
--
-- 中身（入れるデータ）は supabase/seed_demo_fabry.sql（ローカル専用）と同じ。違うのは安全装置だけ:
--   1. 流す前に、下の DO ブロックの先頭の「★ 書き換える 3 か所」を確かめる。v_confirm を決めた文字に書き換えないと、何も入れずに止まる
--      （うっかり別のプロジェクトで流さないため）
--   2. 書き込む前に、実行ロールが RLS を越えて書けるか（superuser か BYPASSRLS）と、要る表・列・関数がそろっているかを確かめ、
--      足りなければ何も入れずに止まる（どこが足りないかをエラーの文で出す）
--   3. 公開する行事: ローカル版は交流会 1 件を公開（is_public = true）にしていた。本番では会の紹介ページ（誰でも見られる）に、
--      実在の団体の名前の下で架空の行事が出てしまうので、既定は「公開しない」（v_publish_event = false）。公開にするなら書き換える
--   4. となりの「難病相談支援センター一覧」のリンク: ローカル版は http://localhost:3000 だった。本番では v_site_origin に
--      本番の URL（https:// で始まる。末尾の / は無し）を入れる。空のままなら、このリンク 1 件だけ入れない
--   5. 一時表の名前を seed_demo_cloud_result にした（ローカル版と混ざらないように）
--
-- 流し方: 本番の Supabase の SQL Editor に丸ごと貼り、★ の 3 か所を書き換えてから 1 回実行する（Run）。
--   何度流しても重複しない（ローカル版と同じ確かめ方）。途中で止まったら、DO ブロックの中の書き込みはすべて元に戻る。
--   最後の SELECT に「今回入れた件数」「いまの件数」と、公開の行事・相談支援センターのリンクをどうしたかが出る。
--
-- 前提（ローカル版と同じ。そろっていなければ止まる）:
--   - test@example.com が auth.users にいて、fabry-fukurou の世話人（memberships.role = 'moderator'、退会していない）。
--     この seed は test@example.com を作らない（パスワードも付けない）。本番で作る方法・ログインの方法は別に決める
--   - migration を 20261013（行事・リンク・会の設定）まで当ててある（member_profiles の登録する方の列・consents・会の表）
--
-- auth.users への書き込み（ローカル版と同じ）:
--   架空の会員 3 人（@tonari-demo.invalid）を auth.users に直接 insert する。id は gen_random_uuid()（固定ではない）、
--   パスワード（encrypted_password）は NULL、email_confirmed_at は立てない。ログインはできない。
--   本番の postgres ロールが auth.users に insert できるかは、Claude Code は確かめていない（不明）。できなければ、
--   その insert で止まり、何も入らない。
--
-- 消すとき（本番公開の前。docs/REMOVE_BEFORE_PRODUCTION.md）:
--   架空の会員 3 人（メールが @tonari-demo.invalid）を auth.users から消すと、プロフィール・同意・所属は一緒に消え、
--   投稿・コメントは書き手が空になって残る（20261002 の付け替え）。はるのの投稿・行事・リンク・会の設定、
--   題名・本文・ひとことに「（見本）」「デモ用の架空」とあるものは、別に消す。消す前に一覧を出して確かめること。
--
-- 注意: fabry-fukurou は実在の団体（一般社団法人 全国ファブリー病患者と家族の会）の slug。投稿・行事・設定の中身は架空。
-- =============================================================================

DROP TABLE IF EXISTS pg_temp.seed_demo_cloud_result;
CREATE TEMP TABLE seed_demo_cloud_result (ord INTEGER, item TEXT, inserted INTEGER);

DO $seed$
DECLARE
    -- ===================== ★ 流す前に書き換える 3 か所 =====================
    -- (1) 本番に入れてよいと確かめたら、'' を 'デモ用の見本を入れる' に書き換える（それ以外では止まる）
        v_confirm       TEXT    := 'デモ用の見本を入れる';
    -- (2) となりの本番の URL（例の形: https://〜。末尾の / は付けない）。空なら相談支援センターのリンクを入れない
    v_site_origin   TEXT    := '';
    -- (3) 交流会を会の紹介ページ（公開）にも出すなら true。既定は false（実在の団体の公開ページに架空の行事を出さない）
    v_publish_event BOOLEAN := false;
    -- =======================================================================
    v_missing  TEXT;
    v_group    UUID;
    v_haruno   UUID;
    v_minato   UUID;
    v_sora     UUID;
    v_kanade   UUID;
    v_post     UUID;
    n          INTEGER;
    n_members  INTEGER := 0;
    n_profiles INTEGER := 0;
    n_consents INTEGER := 0;
    n_ann      INTEGER := 0;
    n_threads  INTEGER := 0;
    n_comments INTEGER := 0;
    n_settings INTEGER := 0;
    n_events   INTEGER := 0;
    n_links    INTEGER := 0;
    v_today    TIMESTAMP;  -- 日本時間の今日の 0 時（行事の日時の起点）
    -- record 変数は、表の別名（u・v・t・ex_c）とぶつからない名前にする。
    -- PL/pgSQL は SQL の中の「名前.列」を、同じ名前の変数があればその変数の項目として読むため
    -- （2026-10-01 に別名 c と record 変数 c がぶつかり、55000 record "c" is not assigned yet で落ちた）
    r_member   RECORD;
    r_post     RECORD;
    r_comment  RECORD;
    r_event    RECORD;
    r_link     RECORD;
BEGIN
    -- -------------------------------------------------------------------------
    -- 安全装置（書き込む前に止める）
    -- -------------------------------------------------------------------------
    IF v_confirm IS DISTINCT FROM 'デモ用の見本を入れる' THEN
        RAISE EXCEPTION '止めました: v_confirm を書き換えていません（ファイルの「★ 流す前に書き換える 3 か所」を見てください）';
    END IF;
    IF v_site_origin <> '' AND v_site_origin !~ '^https://[^[:space:]/]+$' THEN
        RAISE EXCEPTION '止めました: v_site_origin は https:// で始まり、末尾に / の無い形にしてください（いまの値: %）', v_site_origin;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
        RAISE EXCEPTION '止めました: 実行ロール % が RLS を越えて書けません（superuser でも BYPASSRLS でもない）', current_user;
    END IF;
    SELECT string_agg(x, '、') INTO v_missing FROM (
        SELECT 'member_profiles.registrant_type' AS x WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = 'registrant_type')
        UNION ALL SELECT 'consents' WHERE to_regclass('public.consents') IS NULL
        UNION ALL SELECT 'memberships' WHERE to_regclass('public.memberships') IS NULL
        UNION ALL SELECT 'group_posts' WHERE to_regclass('public.group_posts') IS NULL
        UNION ALL SELECT 'group_comments' WHERE to_regclass('public.group_comments') IS NULL
        UNION ALL SELECT 'group_settings' WHERE to_regclass('public.group_settings') IS NULL
        UNION ALL SELECT 'group_events' WHERE to_regclass('public.group_events') IS NULL
        UNION ALL SELECT 'group_links' WHERE to_regclass('public.group_links') IS NULL
    ) miss;
    IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION '止めました: 本番の DB に次がありません（migration が足りない）: %', v_missing;
    END IF;

    -- -------------------------------------------------------------------------
    -- 前提
    -- -------------------------------------------------------------------------
    SELECT id INTO v_group FROM public.patient_groups WHERE slug = 'fabry-fukurou';
    IF v_group IS NULL THEN
        RAISE EXCEPTION '前提: patient_groups に fabry-fukurou がありません（20260927 の migration を確認してください）';
    END IF;

    SELECT id INTO v_haruno FROM auth.users WHERE email = 'test@example.com';
    IF v_haruno IS NULL THEN
        RAISE EXCEPTION '前提: auth.users に test@example.com がいません';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = v_haruno AND group_id = v_group AND role = 'moderator' AND left_at IS NULL
    ) THEN
        RAISE EXCEPTION '前提: test@example.com が fabry-fukurou の世話人になっていません（memberships を確認してください）';
    END IF;

    -- -------------------------------------------------------------------------
    -- はるの（test@example.com）のプロフィールと同意
    -- -------------------------------------------------------------------------
    INSERT INTO public.member_profiles
        (user_id, full_name, display_name, registrant_type, proxy_relation, patient_is_minor,
         age_band, gender, prefecture, consented_at)
    VALUES
        (v_haruno, '架空 はるの', 'はるの', 'proxy', '親', true,
         '10代', '男性', '大阪府', now() - INTERVAL '30 days')
    ON CONFLICT (user_id) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    n_profiles := n_profiles + n;

    -- 初回同意（base 版 1）と、版が上がるたびの再同意（base 版 2・版 3。版 3 がいまの版）
    INSERT INTO public.consents (user_id, kind, version, consented_at)
    SELECT v_haruno, 'base', v.version, v.ts
    FROM (VALUES (1, now() - INTERVAL '30 days'),
                 (2, now() - INTERVAL '15 days'),
                 (3, now() - INTERVAL '1 day')) AS v(version, ts)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.consents ex_c
        WHERE ex_c.user_id = v_haruno AND ex_c.kind = 'base' AND ex_c.version = v.version
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    n_consents := n_consents + n;

    -- -------------------------------------------------------------------------
    -- 会員仲間 3 人（架空。パスワードは付けない = ログインしない）
    -- -------------------------------------------------------------------------
    FOR r_member IN
        SELECT * FROM (VALUES
            ('minato@tonari-demo.invalid', '架空 みなと', 'みなと', '20代', '女性',     '東京都', 20),
            ('sora@tonari-demo.invalid',   '架空 そら',   'そら',   '40代', '男性',     '北海道', 15),
            ('kanade@tonari-demo.invalid', '架空 かなで', 'かなで', '30代', '答えない', '福岡県', 10)
        ) AS t(email, full_name, display_name, age_band, gender, prefecture, days_ago)
    LOOP
        -- auth.users（メールで存在を確かめる）。トークン類は空文字にしておく（NULL だと Studio の Auth 画面が読めないことがある）
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = r_member.email) THEN
            INSERT INTO auth.users
                (instance_id, id, aud, role, email, encrypted_password,
                 raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                 confirmation_token, recovery_token, email_change_token_new, email_change)
            VALUES
                ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', r_member.email, NULL,
                 '{"provider":"email","providers":["email"]}', '{}',
                 now() - make_interval(days => r_member.days_ago), now() - make_interval(days => r_member.days_ago),
                 '', '', '', '');
        END IF;

        -- プロフィール（本人の登録）
        INSERT INTO public.member_profiles
            (user_id, full_name, display_name, registrant_type, proxy_relation, patient_is_minor,
             age_band, gender, prefecture, consented_at)
        SELECT u.id, r_member.full_name, r_member.display_name, 'self', NULL, NULL,
               r_member.age_band, r_member.gender, r_member.prefecture, now() - make_interval(days => r_member.days_ago)
        FROM auth.users u WHERE u.email = r_member.email
        ON CONFLICT (user_id) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT;
        n_profiles := n_profiles + n;

        -- 同意（base 版 3。いまの版）
        INSERT INTO public.consents (user_id, kind, version, consented_at)
        SELECT u.id, 'base', 3, now() - make_interval(days => r_member.days_ago)
        FROM auth.users u
        WHERE u.email = r_member.email
          AND NOT EXISTS (
              SELECT 1 FROM public.consents ex_c WHERE ex_c.user_id = u.id AND ex_c.kind = 'base' AND ex_c.version = 3
          );
        GET DIAGNOSTICS n = ROW_COUNT;
        n_consents := n_consents + n;

        -- 所属（fabry-fukurou の member）
        INSERT INTO public.memberships (user_id, group_id, role, joined_at)
        SELECT u.id, v_group, 'member', now() - make_interval(days => r_member.days_ago)
        FROM auth.users u WHERE u.email = r_member.email
        ON CONFLICT (user_id, group_id) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT;
        n_members := n_members + n;
    END LOOP;

    SELECT id INTO v_minato FROM auth.users WHERE email = 'minato@tonari-demo.invalid';
    SELECT id INTO v_sora   FROM auth.users WHERE email = 'sora@tonari-demo.invalid';
    SELECT id INTO v_kanade FROM auth.users WHERE email = 'kanade@tonari-demo.invalid';

    -- -------------------------------------------------------------------------
    -- お知らせ 2 件・スレッド 2 本（会・種類・題名で存在を確かめる）
    -- -------------------------------------------------------------------------
    FOR r_post IN
        SELECT * FROM (VALUES
            ('announcement', v_haruno, '秋の交流会のお知らせ',
             '11月にオンラインで交流会を開きます。ご家族だけの参加も歓迎です。日時と参加のしかたは、決まりしだいこちらでお知らせします。（デモ用の架空のお知らせです）',
             12),
            ('announcement', v_haruno, '新しい治療の勉強会について',
             '治療について会員どうしで情報を整理する勉強会を計画しています。講師をお招きできるか、いま調整しています。ご自身の治療のことは、主治医の先生にご相談ください。（デモ用の架空のお知らせです）',
             5),
            ('thread', v_minato, 'はじめまして。よろしくお願いします',
             '東京に住んでいるみなとです。同じ病気の方とお話しできる場所を探していて、入会しました。どうぞよろしくお願いします。',
             9),
            ('thread', v_sora, '通院先のことで相談です',
             '北海道に住んでいます。専門の病院まで遠く、通院の日は一日がかりです。皆さんは通院の負担をどのように工夫されていますか。',
             4)
        ) AS t(kind, author, title, body, days_ago)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.group_posts
            WHERE group_id = v_group AND kind = r_post.kind AND title = r_post.title
        ) THEN
            INSERT INTO public.group_posts (group_id, author_id, kind, title, body, created_at, updated_at)
            VALUES (v_group, r_post.author, r_post.kind, r_post.title, r_post.body,
                    now() - make_interval(days => r_post.days_ago), now() - make_interval(days => r_post.days_ago));
            IF r_post.kind = 'announcement' THEN n_ann := n_ann + 1; ELSE n_threads := n_threads + 1; END IF;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- コメント（投稿・書いた人・本文で存在を確かめる）
    -- -------------------------------------------------------------------------
    FOR r_comment IN
        SELECT * FROM (VALUES
            ('はじめまして。よろしくお願いします', v_haruno,
             'みなとさん、はじめまして。世話人のはるのです。どうぞよろしくお願いします。', 8),
            ('はじめまして。よろしくお願いします', v_kanade,
             'はじめまして、かなでです。私も入会したばかりです。よろしくお願いします。', 7),
            ('通院先のことで相談です', v_haruno,
             'うちも片道2時間かかります。通院の日は、待ち時間に読む本を持っていくようにしています。',
             3),
            ('通院先のことで相談です', v_kanade,
             '私も遠方から通っています。通院の日の過ごし方など、ここで情報交換できたらうれしいです。',
             2)
        ) AS t(post_title, author, body, days_ago)
    LOOP
        SELECT id INTO v_post FROM public.group_posts
        WHERE group_id = v_group AND kind = 'thread' AND title = r_comment.post_title;
        IF v_post IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.group_comments
            WHERE post_id = v_post AND author_id = r_comment.author AND body = r_comment.body
        ) THEN
            INSERT INTO public.group_comments (post_id, author_id, body, created_at)
            VALUES (v_post, r_comment.author, r_comment.body, now() - make_interval(days => r_comment.days_ago));
            n_comments := n_comments + 1;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 会の設定（歓迎文と、会ごとの約束）。すでに行があれば書き換えない
    -- -------------------------------------------------------------------------
    INSERT INTO public.group_settings (group_id, welcome_text, rules_text, updated_by)
    VALUES (
        v_group,
        '（見本）ふくろうの会の会員エリアへようこそ。ここは、ファブリー病の患者さんとご家族が、日々のことを話したり、会からのお知らせを受け取ったりする場所です。わからないことがあれば、世話人に気軽にお声がけください。',
        '（見本）' || E'\n' ||
        '1. 交流会の録音・録画はしないでください。' || E'\n' ||
        '2. 会報やお知らせを会の外に転載するときは、世話人に相談してください。' || E'\n' ||
        '3. 掲示板では、お互いを表示名で呼び合いましょう。',
        v_haruno
    )
    ON CONFLICT (group_id) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    n_settings := n_settings + n;

    -- -------------------------------------------------------------------------
    -- 行事 3 件（会・題名で存在を確かめる）。日時は日本時間で、今日を起点にする
    -- -------------------------------------------------------------------------
    v_today := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo');
    FOR r_event IN
        SELECT * FROM (VALUES
            ('（見本）オンライン交流会',
             '（見本）会員どうしで近況を話す、オンラインの交流会です。ご家族だけの参加も歓迎します。参加のしかたは、近くなったらお知らせします。',
             v_today + INTERVAL '14 days 19 hours', v_today + INTERVAL '14 days 21 hours', 'オンライン', v_publish_event),
            ('（見本）2026年度 総会',
             '（見本）年に一度の総会です。活動の報告と、来年度の予定について話し合いました。',
             v_today - INTERVAL '40 days' + INTERVAL '13 hours', v_today - INTERVAL '40 days' + INTERVAL '15 hours', NULL, false),
            ('（見本）病気と暮らしの勉強会',
             '（見本）病気とのつきあい方や暮らしの工夫を、会員どうしで整理する勉強会です。講師をお招きできるか、いま調整しています。ご自身の治療のことは、主治医の先生にご相談ください。',
             v_today + INTERVAL '35 days 14 hours', v_today + INTERVAL '35 days 16 hours', 'オンライン', false)
        ) AS t(title, body, starts_local, ends_local, place, is_public)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.group_events
            WHERE group_id = v_group AND title = r_event.title
        ) THEN
            INSERT INTO public.group_events
                (group_id, title, body, starts_at, ends_at, place, online_url, is_public, created_by)
            VALUES
                (v_group, r_event.title, r_event.body,
                 r_event.starts_local AT TIME ZONE 'Asia/Tokyo', r_event.ends_local AT TIME ZONE 'Asia/Tokyo',
                 r_event.place, NULL, r_event.is_public, v_haruno);
            n_events := n_events + 1;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- リンク集 5 件（会・URL で存在を確かめる）。公式の一次情報だけ
    --   S1・S2・S6 は docs/fabry_extras_review.md の出典一覧（data/disease_extras/fabry.json）、会の公式サイトは patient_groups.json の url
    -- -------------------------------------------------------------------------
    FOR r_link IN
        SELECT * FROM (VALUES
            ('難病情報センター「ライソゾーム病（指定難病19）」',
             'https://www.nanbyou.or.jp/entry/4063',
             '（見本）ファブリー病を含むライソゾーム病について、難病情報センターがまとめたページです。'),
            ('小児慢性特定疾病情報センター「ファブリー（Fabry）病 概要」',
             'https://www.shouman.jp/disease/details/08_06_091/',
             '（見本）小児慢性特定疾病情報センターが、ファブリー病の概要をまとめたページです。'),
            ('ふくろうの会 公式サイト',
             'https://fabrynet.jp',
             '（見本）会の活動やお問い合わせ先は、公式サイトをご覧ください。'),
            ('全国遺伝子医療部門連絡会議「登録機関遺伝子医療体制検索・提供システム」',
             'http://www.idenshiiryoubumon.org/search/index.html',
             '（見本）病気の分類や都道府県から、遺伝子医療を行っている施設を探せるページです。'),
            ('となり「難病相談支援センター一覧」',
             CASE WHEN v_site_origin = '' THEN NULL ELSE v_site_origin || '/demo/support-centers' END,
             '（見本）お住まいの都道府県の難病相談支援センターを探せるページです。')
        ) AS t(title, url, note)
    LOOP
        -- v_site_origin が空のときの、相談支援センターのリンクは入れない
        IF r_link.url IS NULL THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.group_links
            WHERE group_id = v_group AND url = r_link.url
        ) THEN
            INSERT INTO public.group_links (group_id, title, url, note, created_by)
            VALUES (v_group, r_link.title, r_link.url, r_link.note, v_haruno);
            n_links := n_links + 1;
        END IF;
    END LOOP;

    INSERT INTO seed_demo_cloud_result (ord, item, inserted) VALUES
        (1, '会員（fabry-fukurou の member。はるのを除く）', n_members),
        (2, 'プロフィール', n_profiles),
        (3, '同意（base）', n_consents),
        (4, 'お知らせ', n_ann),
        (5, 'スレッド', n_threads),
        (6, 'コメント', n_comments),
        (7, '会の設定（歓迎文・会ごとの約束）', n_settings),
        (8, '行事', n_events),
        (9, 'リンク集', n_links);
    INSERT INTO seed_demo_cloud_result (ord, item, inserted) VALUES
        (11, CASE WHEN v_publish_event THEN '行事の公開: 交流会を公開にした（新しく入れたとき）' ELSE '行事の公開: どれも公開にしていない' END, NULL),
        (12, CASE WHEN v_site_origin = '' THEN '相談支援センターのリンク: 入れていない（v_site_origin が空）'
                  ELSE '相談支援センターのリンク: ' || v_site_origin || '/demo/support-centers' END, NULL);
END;
$seed$;

-- 結果: 今回入れた件数と、いまの件数（fabry-fukurou）
WITH g AS (SELECT id FROM public.patient_groups WHERE slug = 'fabry-fukurou'),
now_counts AS (
    SELECT 1 AS ord, (SELECT count(*) FROM public.memberships m, g
                       WHERE m.group_id = g.id AND m.left_at IS NULL AND m.role = 'member')::INTEGER AS total
    UNION ALL
    SELECT 2, (SELECT count(*) FROM public.member_profiles mp JOIN public.memberships m ON m.user_id = mp.user_id, g
                WHERE m.group_id = g.id AND m.left_at IS NULL)::INTEGER
    UNION ALL
    SELECT 3, (SELECT count(*) FROM public.consents c JOIN public.memberships m ON m.user_id = c.user_id, g
                WHERE m.group_id = g.id AND m.left_at IS NULL AND c.kind = 'base' AND c.withdrawn_at IS NULL)::INTEGER
    UNION ALL
    SELECT 4, (SELECT count(*) FROM public.group_posts p, g
                WHERE p.group_id = g.id AND p.kind = 'announcement' AND p.deleted_at IS NULL)::INTEGER
    UNION ALL
    SELECT 5, (SELECT count(*) FROM public.group_posts p, g
                WHERE p.group_id = g.id AND p.kind = 'thread' AND p.deleted_at IS NULL)::INTEGER
    UNION ALL
    SELECT 6, (SELECT count(*) FROM public.group_comments cm JOIN public.group_posts p ON p.id = cm.post_id, g
                WHERE p.group_id = g.id AND cm.deleted_at IS NULL)::INTEGER
    UNION ALL
    SELECT 7, (SELECT count(*) FROM public.group_settings st, g WHERE st.group_id = g.id)::INTEGER
    UNION ALL
    SELECT 8, (SELECT count(*) FROM public.group_events ev, g WHERE ev.group_id = g.id AND ev.deleted_at IS NULL)::INTEGER
    UNION ALL
    SELECT 9, (SELECT count(*) FROM public.group_links lk, g WHERE lk.group_id = g.id AND lk.deleted_at IS NULL)::INTEGER
)
SELECT 項目, 今回入れた件数, いまの件数
FROM (
    SELECT r.ord, r.item AS 項目, COALESCE(r.inserted::TEXT, '—') AS 今回入れた件数, COALESCE(n.total::TEXT, '—') AS いまの件数
    FROM seed_demo_cloud_result r LEFT JOIN now_counts n USING (ord)
    UNION ALL
    -- すでにプロフィールがあったときは書き換えないので、はるの になっているかをここで確かめる
    SELECT 10, 'test@example.com の表示名（はるの のはず）', '—',
           COALESCE((SELECT mp.display_name || '（' || mp.registrant_type || '）'
                       FROM public.member_profiles mp JOIN auth.users u ON u.id = mp.user_id
                      WHERE u.email = 'test@example.com'), 'プロフィールなし')
) t
ORDER BY ord;
