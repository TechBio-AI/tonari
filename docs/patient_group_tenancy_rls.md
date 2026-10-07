# 患者会テナントの RLS 一覧（2026-09-26）

- DB: `supabase/migrations/20260927_patient_group_tenancy.sql`（適用済み。書き換えない）と
  `supabase/migrations/20260930_patient_group_tenancy_v2.sql`（v2。紹介者の氏名・申請者の氏名・user_id の出し分け。適用済み）と
  `supabase/migrations/20261001_request_join_referrer_null.sql`（request_join の差し替え。全角空白だけの紹介者も NULL で保存）と
  `supabase/migrations/20261003_members_moderator_only.sql`（会員一覧を世話人だけにする）と
  `supabase/migrations/20261004_join_requests_rpc_only.sql`（入会申請は `request_join` 経由だけ。表への直接 insert を閉じる）と
  `supabase/migrations/20261013_community_features.sql`（行事・出欠・リンク・会の設定・投稿の分類とピン留め・公開用の表。下の「会員エリアの機能」）と
  `supabase/migrations/20261019_group_wishes.sql`（患者会への参加希望と公開用の集計。下の「患者会への参加希望」）と
  `supabase/migrations/20261020_delete_account_v4.sql`（delete_my_account の版 4。参加希望も消す）と
  `supabase/migrations/20261022_operators.sql`・`20261023_disease_catalog.sql`・`20261024_trial_notices.sql`・`20261025_public_disease_participation.sql`・`20261026_group_requests.sql`（共通契約 2026-10-03 の A〜E。下の「疾患の固定 ID」と「運営・案件・公開の参加状況・会の新設」）
- サーバー関数: `lib/portal/tenancy.ts`
- 文面の検査: `lib/portal/__tests__/tenancy.test.ts`（DB 接続なし）
- 動作の確認: `scripts/portal/verify_tenancy.sql`（ローカル専用の台本。Studio の SQL エディタで 1 回実行し、最後に OK・NG の一覧が出る。本番では実行しない）
  会員エリアの機能は `scripts/portal/verify_events.sql`（同じ形の台本）。文面の検査は `lib/portal/__tests__/community-features.test.ts`
  患者会への参加希望は `scripts/portal/verify_wishes.sql`。文面の検査は `lib/portal/__tests__/group-wishes.test.ts`
  運営・案件・公開の参加状況・会の新設は `scripts/portal/verify_ops.sql`。文面の検査は `lib/portal/__tests__/ops-features.test.ts`
- 決定: `docs/DECISIONS.md` 2026-09-26「患者会は会ごとに閉じる」

## 言葉

| 言葉 | 意味 |
| --- | --- |
| 会員 | その会の `memberships` に `left_at IS NULL` の行がある人 |
| モデレーター | 会員のうち `role = 'moderator'` の人 |
| 本人 | ログイン中の人（`auth.uid()`） |
| 関数経由 | 下の SECURITY DEFINER 関数だけが書ける。表への直接の書き込みは不可 |

未ログイン（anon）は、どの表・関数にも権限が無い。物理削除（DELETE）は誰にも与えていない。

## 表 × 操作

| 表 | 操作 | 誰が可 | 補足 |
| --- | --- | --- | --- |
| patient_groups | select | 認証済みの全員 | 列は `id` / `slug` / `name` だけ（入会前に会を選ぶため。公開情報） |
| patient_groups | insert / update / delete | なし | seed は migration で入れる |
| memberships | select | 本人の行（退会後も）＋自分が会員である会の有効な行 | |
| memberships | insert / update / delete | なし（関数経由のみ） | 入会は `accept_invitation` / `approve_join_request`、退会は `leave_group`、役割の変更は `appoint_moderator` / `dismiss_moderator` |
| invitations | select | その会のモデレーター | 招待された人は表を読まず `accept_invitation(token)` を呼ぶ |
| invitations | insert | その会のモデレーター | `created_by` は本人、期限は今から 90 日以内、未使用の状態でのみ |
| invitations | update / delete | なし | 使用済みにするのは `accept_invitation` |
| join_requests | select | 本人の申請 ＋ その会のモデレーター | 本人の閲覧は「申請中」表示のため（Claude Code の判断で追加）。紹介者の氏名（`referrer_name`、v2）もこの範囲だけに見える |
| join_requests | insert | なし（`request_join` 経由のみ。20261004 で直接 insert のポリシーと権限を外した） | 関数がプロフィールの有無・重複・会員かどうか・紹介者の氏名の空白（全角含む）を確かめる。以前は本人の直接 insert を許していた |
| join_requests | update | その会のモデレーター（却下のみ） | 承認は membership を作るため `approve_join_request` のみ（Claude Code の判断） |
| group_posts | select | 会員（未削除の行だけ） | |
| group_posts | insert | announcement: モデレーター / thread: 会員 | `author_id` は本人 |
| group_posts | update | 書いた本人（未削除、会員のまま） | 列は `title` / `body` だけ |
| group_posts | 削除 | 書いた本人かモデレーター | `delete_group_post` で `deleted_at` を立てる |
| group_comments | select | 投稿の会の会員（投稿・コメントとも未削除） | |
| group_comments | insert | 投稿の会の会員 | `author_id` は本人。お知らせにもスレッドにも付けられる（2026-09-26 ファウンダー確認） |
| group_comments | update | なし | 編集は今回の範囲外 |
| group_comments | 削除 | 書いた本人かモデレーター | `delete_group_comment` で `deleted_at` を立てる |

## 関数（SECURITY DEFINER・`search_path = ''`・authenticated のみ実行可）

| 関数 | 誰が可 | すること |
| --- | --- | --- |
| `is_group_member(group_id)` / `is_group_moderator(group_id)` | 認証済み | 本人についてだけ答える（RLS の中から呼ぶ。再帰を切るため） |
| `accept_invitation(token)` | 認証済み・プロフィール作成済み | 未使用・期限内の招待で会員になる。既に会員なら token を使わずに止まる |
| `request_join(group_id, message, referrer_name)` | 認証済み・プロフィール作成済み・非会員 | 申請中の行を作る（同じ会に申請中は 1 つまで）。紹介者の氏名は任意（空・空白だけは全角空白も含めて NULL、100 文字まで。20261001 で差し替え）。審査後も消さない（v2。旧い 2 引数版は消した） |
| `approve_join_request(id)` | その会のモデレーター | 会員にして、申請を承認済みにする |
| `reject_join_request(id)` | その会のモデレーター | 申請を却下にする |
| `list_group_members(group_id)` | その会のモデレーター | 有効な会員の user_id・表示名・役割・入会日。一般会員は `forbidden`（20261003。v2 では一般会員にも user_id 抜きで返していた）。本名は返さない |
| `list_group_author_names(group_id)` | 会員 | 投稿・コメントの書き手の author_id と表示名（v2）。未削除の投稿・コメントを書いた、いまも有効な会員の分だけ。書いていない会員は入らない |
| `delete_group_post(id)` / `delete_group_comment(id)` | 書いた本人かモデレーター | 論理削除 |
| `leave_group(group_id)` | 会員（本人のみ） | 本人の membership に `left_at` を立てる。行・投稿・コメントは残す。最後のモデレーターは退会できない（Claude Code の判断） |
| `list_join_requests(group_id)` | その会のモデレーター | 申請中の申請 id・表示名・**申請者の氏名**・**紹介者の氏名**・ひとこと・申請日（v2。審査用）。user_id・メールは返さない |
| `appoint_moderator(group_id, user_id)` | その会のモデレーター | その会の有効な会員をモデレーターにする（会員でなければ `not_member`） |
| `dismiss_moderator(group_id, user_id)` | その会のモデレーター | モデレーターを会員に戻す。最後の 1 人は解除できない（`last_moderator`）。ほかにいれば自分自身も解除できる |
| `export_group(group_id)` | その会のモデレーター | 会の投稿・コメント・会員（表示名のみ）を JSON で返す。user_id・本名は含めない |

公開面の `fact_has_source`・`theme_is_public`（20260722）は、`themes`・`theme_facts`・`fact_sources` の公開読み取りの RLS ポリシー（`TO` 指定なし＝anon を含む全ロール）から呼ばれ、anon として評価されるため EXECUTE を残す（SECURITY DEFINER・search_path は `public` に固定済み。空ではない）。

## 表示名

プロフィール（`member_profiles`）は会をまたいで 1 人 1 つ。`member_profiles` の RLS は本人の行だけなので、
他の会員の表示名は `list_group_members` / `list_group_author_names` / `list_join_requests` / `export_group` だけが渡す。

## 氏名と user_id の見える範囲（v2）

| 項目 | 本人 | 同じ会の一般会員 | その会の世話人 | 他の会の人・未所属 | anon |
| --- | --- | --- | --- | --- | --- |
| 表示名 | 見える | 見える | 見える | 見えない | 見えない |
| 申請者の氏名（`member_profiles.full_name`） | 見える（プロフィール画面） | 見えない | **申請中の間だけ、申請一覧で見える** | 見えない | 見えない |
| 紹介者の氏名（`join_requests.referrer_name`） | 自分の申請で見える | 見えない | **申請一覧と表で見える（審査後も残る）** | 見えない | 見えない |
| 会員一覧（表示名・役割・入会日・user_id） | — | 見えない（`forbidden`。20261003） | 見える | 見えない | 見えない |
| 書き手の author_id | 見える | 見える（投稿・コメントの表と書き手の対応表） | 見える | 見えない | 見えない |

- 会員一覧・書き出し・書き手の対応表には、氏名も紹介者の氏名も出さない。
- 氏名は運営と入会審査をする世話人が見ることを、会員向けの説明（`app/demo/privacy/content.ts`）に書いてある。
- どちらの氏名も外部 LLM API（Anthropic 等）へ送らない。ログにも出さない。
- 書き手の author_id は、会員が `group_posts` / `group_comments` から v1 の時点で読めている値。会員一覧の user_id を隠しても、書いた人の id は見える（画面の「自分の投稿か」の判定に使っている）。

## 会員エリアの機能（20261013）

すべての表で RLS を有効にし、anon / authenticated の既定の権限をはがしてから要る分だけ付けた。物理削除（DELETE）はどの API ロールにも与えていない。

### 表 × 操作

| 表 | 操作 | 誰が可 | 補足 |
| --- | --- | --- | --- |
| group_events | select | 会員（自分の会・`deleted_at` 無しの行） | |
| group_events | insert | その会のモデレーター | `created_by` は本人。表を直接書く |
| group_events | update | その会のモデレーター（未削除の行） | 列は title・body・starts_at・ends_at・place・online_url・is_public だけ（group_id・created_by・deleted_at は変えられない） |
| group_events | 削除 | その会のモデレーター | `delete_group_event` で `deleted_at` を立てる |
| event_attendance | select / insert / update | 本人の行だけ。かつ、その会の会員で、行事が消されていないとき | update できる列は status だけ。世話人でも表から他人の行は読めない |
| event_attendance | 削除 | なし | 「行かない」は status = 'no' で表す |
| group_links | select | 会員（`deleted_at` 無しの行） | |
| group_links | insert / update | その会のモデレーター | update できる列は title・url・note。`created_by` は本人 |
| group_links | 削除 | その会のモデレーター | `delete_group_link` で `deleted_at` を立てる |
| group_settings | select | 会員 | 会ごとに 1 行 |
| group_settings | insert / update | その会のモデレーター | 列は welcome_text・rules_text。`updated_by`・`updated_at` はトリガー `stamp_group_settings` が付ける（アプリから送らせない） |
| group_posts | update（追加分） | 書いた本人 | `category` を変えられる。`is_public` を true にできるのは、いまも世話人である書いた本人だけ |
| group_posts.pinned | 変更 | その会のモデレーター | `pin_group_post` だけ。列の権限を与えていないので、表を直接は変えられない（insert でも付けられない） |
| public_group_items | select | anon と authenticated（全行） | この表には公開のものしか無い |
| public_group_items | insert / update / delete | なし | トリガー `sync_public_group_item` だけが書く |

### 制約

| 列 | 制約 |
| --- | --- |
| group_events.title / body / place | 100 / 4000 / 200 文字まで。題と本文は必須（空白だけは不可）。場所は任意 |
| group_events.online_url・group_links.url | 500 文字まで。`http://` か `https://` で始まり、空白を含まないものだけ（`javascript:`・`data:`・`ftp:` は入らない） |
| group_events.ends_at | 任意。入れるなら starts_at 以降（Claude Code の判断で足した制約） |
| group_links.title / note | 100 / 500 文字まで |
| group_settings.welcome_text / rules_text | 2000 / 4000 文字まで。任意 |
| event_attendance.status | yes / maybe / no |
| group_posts.category | daily / system / treatment / family / other（既定 other） |
| group_posts.is_public | お知らせ（announcement）のときだけ true にできる（CHECK `group_posts_public_announcement_only`。トリガーでも止める） |
| created_by・updated_by | auth.users の削除で NULL（行事・リンク・設定は会のものとして残る） |
| event_attendance.user_id | auth.users の削除で行ごと消える |

### 関数

| 関数 | 誰が可 | すること |
| --- | --- | --- |
| `delete_group_event(event_id)` | その会のモデレーター | 行事の論理削除。それ以外・無い・消し済みは `forbidden` |
| `list_event_attendance(event_id)` | その会のモデレーター | 参加表明の表示名と状態（yes → maybe → no の順）。user_id は返さない。いまも在籍している会員の分だけ（Claude Code の判断）。消した行事は `forbidden`。人数を返す関数は作らない |
| `delete_group_link(link_id)` | その会のモデレーター | リンクの論理削除 |
| `pin_group_post(post_id, pinned)` | その会のモデレーター | ピン留めの付け外し（投稿の種類は問わない）。pinned が NULL なら `invalid_input` |
| `export_group(group_id)`（差し替え） | その会のモデレーター | 20260927 の中身に、行事（未削除）・リンク（未削除）・設定を加えた。参加表明・created_by・updated_by は入れない |

いずれも SECURITY DEFINER・`search_path = ''`・PUBLIC と anon に EXECUTE なし・authenticated にあり。
トリガー関数 `sync_public_group_item`・`stamp_group_settings` も SECURITY DEFINER・`search_path = ''` だが、API から呼ぶものではないので
PUBLIC・anon・authenticated のどれにも EXECUTE を与えていない（20261010・20261011 のトリガー関数と同じ扱い）。

### 公開用の表 public_group_items とトリガー

公開ページ用の、公開にしたお知らせと行事の写し。列は id・group_slug・kind（notice / event）・source_id・title・body・starts_at・ends_at・place・online_url・published_at・updated_at の 12 個だけで、
書き手・作成者・利用者の id（user_id・created_by・author_id・updated_by）は持たない。お知らせの行は行事の列（starts_at 以下 4 列）を持たない。

anon が読める表は、会員エリアではこの表だけ（ほかの会員エリアの表・関数はすべて anon 不可）。
公開ページがこの表を読むことは CLAUDE.md「公開面の最上位規範」の例外で、例外の記述はファウンダーが CLAUDE.md に書く。

トリガー `sync_public_group_item`（group_posts・group_events の AFTER INSERT / UPDATE / DELETE。1 行ごと）:

| 元の行が | 写しは |
| --- | --- |
| 公開になった（投稿はお知らせ・`is_public`・未削除。行事は `is_public`・未削除） | 作る。`published_at` はこのときの時刻、`group_slug` はこのときの会の slug |
| 公開のまま、題・本文（行事は日時・場所・URL も）が変わった | 写し直し、`updated_at` を変える。`published_at`・`group_slug` は変えない（slug は追いかけない） |
| 公開のまま、ほかの列（分類・ピン留めなど）だけが変わった | 何もしない |
| 非公開になった・論理削除された・行が消えた（会の削除による CASCADE を含む） | 消す。もう一度公開にすると、新しい `published_at` で作り直す |
| スレッドで `is_public` が立った | CHECK が先に止める。トリガーでも `invalid_input` で止める |

終わった行事の写しも残す（画面側で終わった分を出さない。2026-10-13 ファウンダー回答）。

### 気づいたこと（未対応）

- `delete_my_account()` は `auth.users` を消さないので、アカウントを消しても、`auth.users` を消すまでは参加表明（`event_attendance`）が残る。
  プロフィールが消えるので世話人の一覧では表示名が空になり、在籍もしていないので一覧には出ない。消すなら `delete_my_account` の差し替えが要る。

## 患者会への参加希望（20261019・20261020）

「この病気の患者会があれば参加したい」という希望を病気ごとに数える。会員プロフィールは要らない（ログインしていればよい）。
公開面は集計の表 `public_wish_counts` だけを読み、`group_wishes` は読まない。

### 表 × 操作

| 表 | 操作 | 誰が可 | 補足 |
| --- | --- | --- | --- |
| group_wishes | select | 本人の行だけ | 他人の行は世話人・運営の API からも見えない（運営は Studio の `wish_summary`） |
| group_wishes | insert | 本人（`withdrawn_at` なしで） | 列は disease_idx・user_id・prefecture・relation・is_group_member。同じ病気に 2 行は作れない（一意制約 `(disease_idx, user_id)`） |
| group_wishes | update | 本人の行だけ | 列は `withdrawn_at` だけ。立てると取り消し（時刻はトリガーが now() にする）。NULL に戻すと再開（Claude Code の判断。一意制約で登録し直せないため） |
| group_wishes | delete | なし | アカウント削除（`delete_my_account` 版 4）と auth.users の削除（CASCADE）でだけ消える |
| public_wish_counts | select | anon と authenticated（全行） | 列は disease_idx・n・updated_at だけ |
| public_wish_counts | insert / update / delete | なし | トリガー `sync_public_wish_count` だけが書く |

### 制約

| 列 | 制約 |
| --- | --- |
| group_wishes.disease_idx | 0 以上の整数（Claude Code の判断）。知識ファイルの並び順で固定 ID ではない（kb_issues 47）。並びが変わるときは付け替えが要る |
| group_wishes.prefecture | member_profiles と同じ 47 都道府県（`lib/portal/member-profile.ts` の PREFECTURES と一致することを単体テストで確かめる） |
| group_wishes.relation | self（ご本人）/ family（ご家族） |
| group_wishes.is_group_member | 任意（いま何かの患者会の会員か。本人の申告） |
| public_wish_counts.n | 「10未満」か数字 |

### トリガーと公開の数

| トリガー | いつ | すること |
| --- | --- | --- |
| `stamp_group_wish_withdrawal` | group_wishes の BEFORE UPDATE | 取り消しの時刻を now() にそろえる（アプリから送られた時刻は使わない） |
| `sync_public_wish_count` | group_wishes の AFTER INSERT / UPDATE / DELETE | 変わった病気について、取り消していない行を数え直して `public_wish_counts` に写す |

- n はしきい値（`public.stats_threshold()` = 10）未満なら「10未満」（0 を含む）、それ以外は実数。病気ごとに 1 つの数なので補完秘匿は無い。
- 数が 0 になっても行は消さずに「10未満」のまま残す（0 と 1〜9 を見分けさせない）。一度も希望の無い病気には行が無いので、**画面は行が無い病気も「10未満」と出す**こと。
- `updated_at` は n の文字が変わったときだけ変える（「10未満」のまま誰かが登録・取り消ししたことを、時刻から読めないようにする）。
- 10 以上になった後は、数が 1 変わるたびに公開の数も変わる。前後を見比べれば「その間に 1 人増えた（減った）」ことは分かる（数を公開する以上避けられない。誰かまでは分からない）。

### 関数

| 関数 | 誰が可 | すること |
| --- | --- | --- |
| `wish_summary(disease_idx)` | 運営（Studio の所有者ロール）だけ。API ロールのどれにも EXECUTE なし | 取り消していない希望を、都道府県・続柄・会員かどうかごとの実数で返す。user_id は返さない |
| `delete_my_account()`（版 4） | 本人（authenticated） | 版 3 に、本人の参加希望（取り消し済みも含む）を消す 1 文を足した。公開の数はトリガーが数え直す |

`stamp_group_wish_withdrawal`・`sync_public_wish_count`・`wish_summary` は SECURITY DEFINER・`search_path = ''`。どれも PUBLIC・anon・authenticated に EXECUTE を与えていない。

## 疾患の固定 ID（共通契約 2026-10-03 の A。20261023）

- `disease_catalog(disease_id, idx, name)`: `data/disease_ids.json`（疾患概要担当）から `scripts/portal/gen_disease_catalog.py` で生成した 951 件を seed。
  `--check` で migration と差分が無いことを確かめる（単体テストも同じ照合をする）。disease_id は `rd` + 5 桁で不変・再利用なし。idx・name は作成時の値。
- 読めるのは認証済みの人だけ（病気の名前の参照用）。anon は読めない。誰も書けない（API ロールに insert / update / delete なし）。
- 既存の表への disease_id 系の列（idx の列はすべて残す）:

| 表 | 足した列 | いまある行の埋め方 | 以後の書き込み |
| --- | --- | --- | --- |
| group_wishes | `disease_id`（disease_catalog 参照。一意制約 `(disease_id, user_id)`） | idx で引く | トリガー `fill_group_wish_disease_id` が idx から埋める（catalog に無い idx なら NULL）。本人は列を直接は入れられない（列の権限が無い） |
| public_wish_counts | `disease_id`（一意） | idx で引く | トリガー `sync_public_wish_count`（差し替え）が group_wishes の disease_id を写す。公開の表なので anon も読める |
| member_diseases | `disease_id`（disease_catalog 参照） | idx と名前の両方が合えばそれ。名前だけでちょうど 1 件ならそれ。決まらなければ NULL | 同意担当が 20261029 で書き込みに足す（この担当は同意の画面・関数に触れない） |
| patient_groups | `disease_ids text[]`（既定は空） | disease_idxs・disease_names を同じ位置で突き合わせ、member_diseases と同じ規則で引く。決まらない病気がある会は空のまま | 空のまま会を作るとトリガー `fill_patient_group_disease_ids` が同じ規則で埋める。会の新設の承認（E）は catalog から入れる |

- 当てたときに、disease_id が決まらなかった行の数を NOTICE で出す（止めはしない）。2026-10-03 に作業ツリーで照合した限りでは、
  知識ファイルと `data/disease_ids.json` の名前の食い違いは 0 件、seed 済みの 7 団体も全件一致。
- `wish_summary_ops(disease_id)`（運営・API から呼べる）: 取り消していない参加希望を、都道府県・続柄・会員かどうかごとの実数で返す。
  運営以外は `forbidden`。user_id は返さない。Studio 専用の `wish_summary(disease_idx)`（20261019）はそのまま残す（API ロールからは呼べない）。
- 内部用の `resolve_disease_id`・`fill_group_wish_disease_id`・`fill_patient_group_disease_ids`・`sync_public_wish_count` は、どの API ロールにも EXECUTE を与えていない。

## 運営・案件・公開の参加状況・会の新設（共通契約 2026-10-03 の B〜E）

C・D・E は 20261023（A。`disease_catalog`・`patient_groups.disease_ids`・`member_diseases.disease_id`・`group_wishes.disease_id`）の表と列を使うので、
当てるのは 20261023 の後。

### 表 × 操作

| 表 | 操作 | 誰が可 | 補足 |
| --- | --- | --- | --- |
| operators | すべて | なし（API ロールに権限なし・ポリシーなし） | 足す・外すのは SQL エディタから。ローカルの test@example.com は `supabase/seed_operators_local.sql`（本番前に消す） |
| trial_notices | select | 運営だけ（表を直接） | 会員は `list_my_trial_notices()` だけ。存在も見せない |
| trial_notices | insert / update | 運営だけ（`upsert_trial_notice`・`set_notice_status` 経由） | 表への直接の書き込み権限は誰にも無い。delete は無い（closed にする） |
| notice_interest | select | 本人の行だけ | 運営も表は読めない（`notice_interest_counts()` で実数だけ） |
| notice_interest | insert / update | 本人（`set_notice_interest` 経由だけ） | 見えている案件（published・同意と病気が合う）にだけ付けられる |
| public_disease_participation | select | anon と authenticated（全行） | 書くのはトリガーだけ |
| group_requests | select | 申請した本人の行と、運営（全行） | 書き込みは関数だけ |
| public_groups | select | anon と authenticated（全行） | 書くのはトリガーだけ |

### 制約

| 列 | 制約 |
| --- | --- |
| operators.note | 任意。200 文字まで |
| trial_notices.registry / registry_url | jrct は `https://jrct.niph.go.jp/` で、ctgov は `https://clinicaltrials.gov/` か `https://www.clinicaltrials.gov/` で始まるものだけ（https のみ。場所と registry をそろえるのは Claude Code の判断） |
| trial_notices.summary / phase / registry_id | 2000 / 50 / 50 文字まで。同じ病気に同じ登録番号は 1 件（一意制約。Claude Code の判断） |
| trial_notices.status | draft / published / closed。published なら published_at がある |
| notice_interest.status | interested / dismissed |
| public_disease_participation の 3 列 | 「10未満」か数字 |
| group_requests.proposed_name / message | 100 / 1000 文字まで。同じ病気への申請中は 1 人 1 件（部分一意索引） |

### 関数

| 関数 | 誰が可 | すること |
| --- | --- | --- |
| `is_operator()` | 認証済み | 呼んだ本人が運営か |
| `list_operators()` | 運営 | 運営の表示名だけの一覧。それ以外は `forbidden` |
| `is_trial_audience(disease_id)` | 認証済み | 呼んだ本人が、その病気の案件を見てよい人か（research_contact の同意が有効で、member_diseases にその disease_id がある） |
| `list_my_trial_notices()` | 認証済み | 本人に見せてよい published の案件だけ。返すのは id・disease_id・registry・registry_id・registry_url・summary・published_at・自分の反応。phase・作成者は返さない |
| `set_notice_interest(notice_id, status)` | 案件が見えている本人 | 関心あり / 見送り。見えていない案件（無い・draft・closed・同意や病気が合わない）は `forbidden` |
| `notice_interest_counts(notice_id)` | 運営 | 関心あり・見送りの実数。user_id は返さない |
| `upsert_trial_notice(id, disease_id, registry, registry_id, registry_url, summary, phase)` | 運営 | id が NULL なら draft で作る。あれば中身を直す（status はそのまま）。制約に触れる入力は `invalid_input` |
| `set_notice_status(id, status)` | 運営 | 初めて published にしたときに published_at を立てる（以後は変えない）。どの値からどの値へも変えられる |
| `request_new_group(disease_id, name, message)` | その病気の会の在籍会員か、その病気の参加希望者 | 申請中は 1 人 1 件（`already_requested`）。それ以外の人は `forbidden` |
| `approve_group_request(request_id, slug)` | 運営 | 会を作り（病気は disease_catalog から）、申請者を世話人にする。使えない・使われている slug は `invalid_input` |
| `reject_group_request(request_id)` | 運営 | 却下。処理済みは `request_not_pending` |
| `wish_summary_ops(disease_id)`（20261023） | 運営 | 参加希望の内訳（実数）。上の「疾患の固定 ID」 |

すべて SECURITY DEFINER・`search_path = ''`・PUBLIC と anon に EXECUTE なし・authenticated にあり。
内部用の `recalc_disease_participation`・`sync_disease_participation`・`sync_public_groups` は、どの API ロールにも EXECUTE を与えていない。

### 公開の参加状況（public_disease_participation）

- 病気ごとに members（その病気を対象にする会の在籍会員。複数の会にいても 1 人）・research_contact（研究の案内に同意し、その病気を選んでいる人）・wishes（参加希望）の 3 つ。
- どれも `stats_threshold()` 未満は「10未満」（0 を含む）。補完秘匿はかけない（足し合わせて別の公開の数になる組が無いため。Claude Code の判断）。
- disease_catalog のすべての病気に行を持ち、0 になっても消さない。`updated_at` は値の文字が変わったときだけ変える。
- 数え直すきっかけ: memberships・patient_groups・member_diseases・consents（research_contact の行だけ）・group_wishes の変化と、disease_catalog への病気の追加。変わった病気だけを数え直す。
- consents・member_diseases（同意担当の表）にはトリガーを付けただけで、同意の画面・関数には触れていない。

### 案件の文言（2026-10-03 ファウンダー決定）

案内は「公開の登録情報（jRCT・ClinicalTrials.gov）があることを会員に知らせる」ものに限る。薬剤名・製品名・企業名・効果の記述・参加を勧める表現は書かない。
**summary は DB では検査できない**（`scripts/lint-wording.sh` はリポジトリのファイルだけを見る）。運営画面の保存処理で `docs/wording-blocklist-demo.txt` と同じ検査をかけること（画面担当）。
画面には「参加するかどうかは主治医と相談してください」を固定文で出す。法的な確認は公開前にファウンダーが専門家に行う。

## 未実装・不明

- 最初のモデレーターを作る画面・関数は無い。migration 末尾の手順どおり SQL エディタから 1 行入れる（2026-09-26 ファウンダー確認）。
- 最後のモデレーターが退会したいときは、先に `appoint_moderator` で別の会員をモデレーターにする。
- 最後のモデレーターを守る確認（退会・解除）は、その会のモデレーターの行を先に固めてから行う。2 人が同時に退会・解除しても 0 人にならない。
- 関数の所有者が BYPASSRLS を持つかは不明（Claude Code は DB に接続していない）。
  持っていないと `member_profiles`（FORCE 付き）の表示名が関数から読めない。`scripts/portal/verify_tenancy.sql` の項目 0 で確かめる。
