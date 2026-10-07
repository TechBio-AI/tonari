# アカウント削除後に auth.users に残る行の扱い（選択肢の比較）

作成: 2026-10-02（検討のみ。決定はしていない。実装もしていない）

関連: `docs/account-deletion.md`（いまの 2 段階の手順）、`supabase/migrations/20261002_delete_account.sql`

調べた原本（DB には接続していない）:

- auth スキーマ: ローカルの GoTrue イメージ `supabase/gotrue:v2.192.0` に入っている `usr/local/etc/auth/migrations/*.up.sql`（70 本）
- postgres ロールの権限: ローカルの `supabase/postgres:17.6.1.140` に入っている `docker-entrypoint-initdb.d/`
- 公式文書: supabase.com（URL は各項に記載）

**本番（ホスト型 Supabase）の auth スキーマと権限は、ローカルのイメージと同じかどうか確かめていない（不明）。**

---

## 1. delete_my_account() の後に残るもの

`delete_my_account()` は auth スキーマに触らない。そのため、関数の後も auth スキーマは**すべて元のまま**残る。

| 表 | 本人とのつながり | 中身（個人に関わるもの） | auth.users を消すと |
|---|---|---|---|
| `auth.users` | 本人の行 | メール・電話・`raw_user_meta_data`・`raw_app_meta_data`・`last_sign_in_at`・`created_at` など | — |
| `auth.identities` | `user_id` → users（`ON DELETE CASCADE`） | `identity_data`（メールを含む）・`email`（生成列）・`last_sign_in_at` | 消える |
| `auth.sessions` | `user_id` → users（CASCADE） | `ip`・`user_agent`・`refreshed_at`・`not_after` | 消える |
| `auth.refresh_tokens` | `session_id` → sessions（CASCADE）。`user_id` は varchar で**外部キーなし** | トークン・`user_id` | `session_id` が入った行は sessions と一緒に消える。`session_id` が NULL の古い行は**残る**（ただし公式文書は「refresh token を無効にする」と書いている。下の 2(b) を参照） |
| `auth.mfa_factors` | `user_id` → users（CASCADE） | 電話番号など | 消える（MFA は使っていない。`supabase/config.toml` の `[auth.mfa]`） |
| `auth.mfa_challenges`・`auth.mfa_amr_claims` | factors・sessions 経由（CASCADE） | ip など | 消える |
| `auth.one_time_tokens` | `user_id` → users（CASCADE） | `token_hash`・`relates_to`（メール） | 消える |
| `auth.webauthn_credentials`・`auth.webauthn_challenges` | `user_id` → users（CASCADE） | パスキー | 消える（使っていない） |
| `auth.oauth_authorizations`・`auth.oauth_consents` | `user_id` → users（CASCADE） | — | 消える（使っていない） |
| `auth.flow_state` | `user_id` は uuid で**外部キーなし** | PKCE ログインの途中の状態 | **残る**（自動で片付くかは不明） |
| `auth.audit_log_entries` | **外部キーなし**（`payload` は json） | ログイン等の記録。payload にメールや user_id が入るかは原本の SQL からは分からない（不明） | **残る** |

あわせて、public 側で auth.users を参照している外部キーも整理しておく（20261002 を当てた後）。

- `group_posts.author_id`・`group_comments.author_id`: SET NULL（本文は残る）
- それ以外（consents・member_diseases・member_profiles・memberships・invitations.created_by・join_requests.user_id・旧 profiles）: CASCADE。ただし delete_my_account() で既に消えている
- `storage.objects.owner` への外部キーは、ローカルの storage-api v1.61.7 で外されている（`0017-drop-owner-foreign-key.sql`）。となりは Storage を使っていない

---

## 2. 選択肢の比較

### (a) delete_my_account() の中で auth.users の行も消す

- **所有者 postgres で消せるか**: ローカルでは消せる。根拠は次のとおり。
  - auth.users の所有者は `supabase_auth_admin`
  - postgres には `GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres`（`10000000000000_demote-postgres.sql`・`20211115181400_update-auth-permissions.sql`）と、`supabase_auth_admin` が今後作る表についての既定権限がある
  - postgres は BYPASSRLS
  - 確認台本（`verify_*.sql`）も、Studio の役割（postgres）で `DELETE FROM auth.users` を実行して全 OK だった
  - **本番も同じかは不明**
- **関連表は CASCADE か**: 1 の表のとおり。identities・sessions・mfa・one_time_tokens などは CASCADE。外部キーのない flow_state・audit_log_entries と、session_id が NULL の refresh_tokens は残る。
- **公式文書が推奨しているか**: 推奨は見つからなかった。削除の方法として挙がっているのは、管理画面（Authentication > Users）と Admin API の `deleteUser()` だけ。SQL での削除については、勧めても禁じてもいない（https://supabase.com/docs/guides/auth/managing-user-data ）。同じページに「Supabase が管理するオブジェクトは（主キー以外）いつでも変わりうる」という注意がある。

### (b) Next.js のサーバー側で、service_role の Admin API（`auth.admin.deleteUser`）を呼ぶ

- **公式文書の扱い**:
  - `deleteUser()` は service_role のキーが要り、「サーバーでだけ呼ぶこと。ブラウザに出さないこと」とある（https://supabase.com/docs/reference/javascript/auth-admin-deleteuser ）
  - 既定（`shouldSoftDelete: false`）では auth.users の行を消し、sessions に CASCADE し、refresh token を無効にする（https://supabase.com/docs/guides/auth/managing-user-data ）
  - `shouldSoftDelete: true` は取り消せない
- **キーの置き場**:
  - Vercel のサーバー側の環境変数に置き、`NEXT_PUBLIC_` を付けない
  - 公式文書は「ブラウザ・配布するアプリ・ソース管理に置かない」としている（https://supabase.com/docs/guides/api/api-keys ）
  - いまのアプリ本体（app・lib・utils・middleware）は service_role を使っていない。使っているのは `scripts/seed-database.js` と `scripts/test_audit_log.ts` だけ
- **漏えいしたときの影響**:
  - service_role は**すべての RLS を素通りする**（同上）
  - 全会員の氏名・同意・病名・投稿を読めて、書き換えも消去もできる
  - 対処は、新しいキーを作り、差し替えてから古いキーを消すこと（同上）。新しい形式の secret key は 1 本ずつ消せる（同上）
- **ほかの影響**:
  - アプリが初めて「全権のキー」を持つことになる。CLAUDE.md の権限境界・多重防御の検討が要る
  - 本番シークレットの追加は、CLAUDE.md の「9. 権限境界」でファウンダーの専管事項にあたる

### (c) 定期バッチ

- **仕組みの候補**: Supabase Cron（pg_cron）で、SQL・DB 関数・HTTP（Edge Function）を定期的に動かせる。実行の記録は `cron.job_run_details` に残る（https://supabase.com/docs/guides/cron ）。どのプランで使えるかは、取得した範囲では不明。
- **やり方の候補**（どちらも未検討）:
  - pg_cron から SQL で消す。権限の論点は (a) と同じ
  - Edge Function から Admin API を呼ぶ。キーの論点は (b) と同じで、置き場は Edge Function になる
- **前提**: 「消す対象」の印が要る。例えば「member_profiles も consents もない auth.users」で見分けると、**登録の途中でまだプロフィールがない人も消してしまう**。削除済みの印を別に持つ必要がある。これは設計していない。

### 同じ列での比較

| | (a) 関数の中で SQL 削除 | (b) サーバーから Admin API | (c) 定期バッチ |
|---|---|---|---|
| **消えるもの** | 会員情報（今と同じ）＋ auth.users・identities・sessions・mfa・one_time_tokens 等（CASCADE） | 会員情報（関数）＋ auth.users と CASCADE 先。refresh token は公式文書で「無効化」とある | (a) か (b) と同じものが、次の実行のときに消える |
| **残るもの** | flow_state・audit_log_entries（外部キーなし）。session_id が NULL の refresh_tokens。投稿・コメント（author_id は NULL）。**手元の JWT は exp まで有効**（公式文書。ローカルは `jwt_expiry = 3600` 秒） | flow_state・audit_log_entries（Admin API が片付けるかは不明）。投稿・コメント。手元の JWT は exp まで有効（同上） | 次の実行まで：auth.users と関連表がすべて残る（今と同じ）。実行後：(a) か (b) と同じ |
| **途中で失敗したときの状態** | 1 つのトランザクションなので、全部消えるか、何も消えないかのどちらか（会員情報だけ消えて auth.users が残る、という中間はない） | 2 回に分かれる（関数 → API）。API が失敗すると「会員情報は消えたが auth.users は残る」＝今と同じ状態になる。やり直しの仕組みが要る。逆の順だと、auth.users を消した時点で public 側も CASCADE で消える（決定 1 の招待・申請も含めて同じ結果）が、`last_moderator` の確認が API の前に効かない | バッチが失敗すると、次の回まで今と同じ状態が続く。失敗に気づく仕組み（`cron.job_run_details` を誰が見るか）が要る |
| **本番運用の手間** | 手作業はなくなる。auth スキーマの所有者が Supabase 側にあり、**auth スキーマの変更に追随する責任がこちらに来る**（公式文書の「いつでも変わりうる」の注意）。本番で postgres に DELETE 権限があるかは不明なので、本番で 1 回確かめる必要がある | 手作業はなくなる。service_role キーの保管とローテーション、漏えい時の対応手順が新たに要る。本番シークレットの追加はファウンダー専管 | 手作業はなくなる。ジョブの監視、「削除済み」の印の設計、Cron が使えるプランかの確認が要る |
| **公式文書の裏付け** | 推奨の記述は見つからない（不明） | あり（deleteUser・api-keys） | Cron の機能はあり。auth.users を消す用途についての記述は見つからない（不明） |

いまの運用（ファウンダーが Studio の Authentication > Users で消す）は、公式文書の「管理画面から消す」にあたる。

---

## 3. 削除した後に、同じメールでマジックリンクを踏んだとき（auth.users を消す前）

コードを追った結果。

1. `/demo/login`（`app/demo/login/LoginForm.tsx`）で `signInWithOtp({ shouldCreateUser: false })` を呼ぶ。auth.users の行が残っているので、メールは**届く**（`shouldCreateUser: false` は新しい人を作らないだけで、既にいる人は通る）。
2. リンクを踏むと `/demo/auth/callback`（`app/demo/auth/callback/route.ts`）で `exchangeCodeForSession` が成功し、`/demo/community` へ送られる。
3. `middleware.ts` の流れ:
   - `updateSession`（`utils/supabase/middleware.ts`）が `profiles.role` を読む。行がないので role は undefined
   - 役割で止めているのは /pharma・/deliveries・/admin・/doctor・/diagnosis だけなので、/demo は素通りする
   - 会員エリアのセッション確認も通る
4. `/demo/community`（`app/demo/community/page.tsx`）で `getViewer()`（`app/demo/_lib/session.ts`）が `hasProfile: false` を返し、`/demo/community/onboarding` へ送られる。
5. `/demo/community/onboarding`（`app/demo/community/onboarding/page.tsx`）では、プロフィールがないので**初回の画面**（利用目的の提示＋同意＋プロフィール入力）が出る。上部バー（`app/demo/community/layout.tsx`）は、プロフィールがないので会のリンクを出さない。
6. ここで入力すると、新しいプロフィールと同意で**会員として作り直される**。会の所属・申請・招待は消えているので、どの会にも入っていない状態から始まる。
7. 旧 `profiles` の行は作り直されない。`handle_new_user` トリガー（00001）は auth.users への INSERT のときにだけ動き、ログインでは動かないため。/demo は profiles を使わないので、表示への影響はない。

auth.users を消した後は、1 の `signInWithOtp` が `shouldCreateUser: false` のためエラーになる。画面には「このメールアドレスには送信できませんでした。招待を受けたアドレスかご確認ください。」が出る。

確かめていないこと:

- Supabase が実際にどのエラーを返すかは不明（コード上は `otpError` があれば一律にこの文言）
- 削除の直後に同じブラウザで開いた場合、Server Action が `signOut()` を呼んでいるのでセッションは残らないはず。ただし `signOut()` が失敗した場合は、手元の JWT が exp まで有効になりうる（公式文書）。そのときの挙動は 2〜6 と同じになるはずだが、実際には試していない（不明）

テスト用のパスワードログイン（`app/demo/auth/password/`、本番前に削除予定）でも、auth.users が残っていてパスワードが設定されていればログインできるはず。ただし、このファイルは追っていない（不明）。
