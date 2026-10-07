# アカウント削除の手順

最終更新: 2026-10-27（版 5。運営・案件への反応・会の新設の申請を足し、最後の運営の削除を止める。共通契約 2026-10-03 の G）

会員が自分のアカウントを消す仕組みをまとめる。
決定は `docs/DECISIONS.md`「2026-10-01 アカウント削除」と、`docs/auth_users_retention_options.md` の (a)（関数の中で auth.users も消す。ファウンダー決定）。

- DB: `delete_my_account()`
  - 版 1: `supabase/migrations/20261002_delete_account.sql`（外部キーの付け替え、投稿・コメント削除関数の差し替えもここ）
  - 版 2: `20261010_journey_survey.sql`（道のり調査の回答）
  - 版 3: `20261015_delete_account_v3.sql`（参加表明・通報・auth.users）
  - 版 4: `20261020_delete_account_v4.sql`（患者会への参加希望 `group_wishes`）
  - 版 5: `20261027_delete_account_v5.sql`（案件への反応 `notice_interest`・会の新設の申請 `group_requests`・運営 `operators`、`last_operator`）
- アプリ: `lib/portal/tenancy.ts` の `deleteMyAccount()`。画面は `app/demo/community/account/delete/`
- 確かめ方（「5. 確認」）:
  - 本番でも実行してよい 1 行の確認 SQL（読むだけ）
  - 確認台本 `scripts/portal/verify_delete_account.sql`（テストデータを作るのでローカル専用）

退会（`leave_group`）とは別。退会はその会を抜けるだけで、行は消さない。

---

## 1. 1 段階で消す

会員本人が画面（マイページ → アカウントの削除）から `delete_my_account()` を呼ぶと、会員情報と auth.users の行が 1 回で消える。
ファウンダーが Studio で後から消す作業は要らなくなった（版 2 までの「段階 2」は廃止）。

画面の流れ（`app/demo/community/account/delete/actions.ts`。版 3 でも変えていない）:

1. 確認のチェックを確かめて `deleteMyAccount()`（= `delete_my_account()`）を呼ぶ
2. 成功したら、この端末だけサインアウトし（`signOut({ scope: 'local' })`。失敗は無視する）、`/demo?account_deleted=1` へ送る
   - サインアウトは関数の**後**に行う
   - auth.users が消えた後のサインアウトでも、auth-js（`node_modules/@supabase/auth-js` 2.98.0 の `_signOut`）は、サーバーが 401・403・404 を返したときは手元のセッションを消す
   - 実際にどの状態コードが返るかは試していない（不明）
3. `last_moderator`・`last_operator` なら確認画面へ戻す（何も消えていない）
   - `last_operator` は版 5 の新しい語。`lib/portal/tenancy.ts` の FAILURE_REASONS にまだ無く、無いままだと画面では「うまくいきませんでした」になる（画面の担当が足す）

## 2. 消えるもの・残るもの

| 表 | 扱い |
|---|---|
| `member_profiles` | 本人の行を消す（氏名・表示名・年代・性別・都道府県） |
| `consents` | 本人の行を消す（本人は普段 delete できない表。この関数の中でだけ消す） |
| `member_diseases` | 本人の行を消す |
| `journey_responses`・`journey_links` | 本人の「病気がわかるまでの道のりの回答」と対応を消す（版 2） |
| `event_attendance` | 本人の参加表明を消す（版 3） |
| `group_wishes` | 本人の患者会への参加希望を消す（取り消し済みも。公開用の数はトリガーが数え直す）（版 4） |
| `notice_interest` | 本人の治験・研究の案内への反応（関心あり・見送り）を消す（版 5） |
| `group_requests` | 本人が申請者の会の新設の申請を消す（申請中・承認済み・却下済みすべて）。運営として決めた他人の申請は行を残し、`decided_by` を NULL にする（`decided_at` は残る）（版 5）。承認済みの申請から作られた会は消えない |
| `operators` | 本人の運営の資格を消す（版 5） |
| `content_reports` | 本人の通報（`reporter_id`）を消す。世話人として対応した通報は行を残し、`handled_by` を NULL にする（`handled_at` は残る）（版 3） |
| `memberships` | 本人の行を消す（退会済みの行も含む） |
| `join_requests` | 本人の申請を消す（ひとこと・紹介者の氏名も一緒に消える）。世話人として審査した他人の申請は残し、`decided_by` を NULL にする |
| `invitations` | 本人が発行した招待を消す（未使用のものも無効になる）。他人の招待を本人が使った行は残し、`used_by` を NULL にする（`used_at` は残る） |
| 旧 `profiles` | 本人の行を消す（表がある DB でだけ） |
| `auth.users` | **本人の行を消す（版 3。最後に消す）** |
| `group_posts`・`group_comments` | **残す**。auth.users を消すと `author_id` が NULL になり、本文は会に残って名前だけが消える（画面は「名前未設定」、書き出しでは author が null） |
| `group_events.created_by`・`group_links.created_by`・`group_settings.updated_by` | 行は残り、auth.users を消すと NULL になる（20261013 の外部キーが SET NULL） |
| `trial_notices.created_by` | 運営として登録した案件は残り、auth.users を消すと登録者だけ NULL になる（20261024 の外部キーが SET NULL）（版 5 で確かめる） |

- どこかの会の**最後の世話人**は `last_moderator` で止まり、何も消えない。先に別の会員を世話人に任命してもらう（任命の画面はまだ無い。今は SQL でだけ。`appointModerator` は `tenancy.ts` にある）。
- 本人が運営で、**ほかに運営がいなければ** `last_operator` で止まり、何も消えない（版 5）。先にほかの人を運営に足す（運営を足すのは SQL エディタから。`20261022_operators.sql` の手順）。
  2 人の運営が同時に消しても 0 人にならないよう、運営の行を先に固めてから確かめる。
- 関数全体が 1 つのトランザクション。最後の auth.users の削除（と、それに続く CASCADE・SET NULL）を含め、どこかで失敗すると全部元に戻る。会員情報だけが消えて auth.users が残る、という中間の状態にはならない（台本の項目 12 で確かめる）。
- 関数の所有者（migration を当てたロール）が auth.users に DELETE の権限を持っていないと、最後の削除で失敗し、何も消えない。ローカルの postgres には権限がある（`docker-entrypoint-initdb.d` の `GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres`）。**本番で同じかは不明**。本番に当てたら、最初に下の 1 行で確かめる（「5. 確認」の 5-1）。

  ```sql
  select has_table_privilege(p.proowner, 'auth.users', 'DELETE')
    from pg_proc p where p.oid = 'public.delete_my_account()'::regprocedure;
  ```

### auth スキーマで消えるもの・残るもの

原本は、ローカルの GoTrue v2.192.0 イメージの `usr/local/etc/auth/migrations`。詳しくは `docs/auth_users_retention_options.md` の 1。

| 表 | auth.users を消すと |
|---|---|
| `auth.identities`・`auth.sessions`・`auth.mfa_factors`・`auth.one_time_tokens`・`auth.webauthn_*`・`auth.oauth_authorizations`・`auth.oauth_consents` | CASCADE で消える |
| `auth.refresh_tokens` | sessions 経由（`session_id` の CASCADE）で消える。`session_id` が NULL の古い行は**残る**（`user_id` は外部キーの無い文字列） |
| `auth.flow_state` | **残る**（`user_id` に外部キーが無い。PKCE ログインの途中の状態）。自動で片付くかは不明 |
| `auth.audit_log_entries` | **残る**（外部キーが無い。ログイン等の記録。`payload` に何が入るかは不明） |

- 消した後も、本人の手元のアクセストークン（JWT）は期限までは形式上有効（公式文書。ローカルは `jwt_expiry = 3600` 秒）。ただし関数の後は、どの表にも本人の行が無い。
- 消した後に同じメールでログインしようとしても、ログイン画面は `shouldCreateUser: false` なので新しい人は作られず、「このメールアドレスには送信できませんでした…」が出る（コードで追った結果。実際には試していない）。

## 3. 書き手が NULL になった投稿・コメント

- 表示: 画面は「名前未設定」と出す（`NO_DISPLAY_NAME`）。書き出し（`export_group`）では author が null。
- 削除: 世話人だけが消せる。世話人でない会員は、書き手が NULL の投稿・コメントを消せない（20261002 で `delete_group_post`・`delete_group_comment` の判定を `IS NOT DISTINCT FROM` に直した）。
- 書き換え: 誰もできない（update のポリシーは `author_id = auth.uid()`）。
- auth.users を消すときの SET NULL で、投稿の `updated_at` はトリガーで更新される。

## 4. Studio で消す場合（例外の手順）

本人が画面から消せない事情があるとき（例: 最後の世話人で、ほかに任命できる人がいない）だけ、ファウンダーが Studio の Authentication → Users から Delete user する。
外部キーの CASCADE・SET NULL で、結果は関数とほぼ同じになる。ただし次の点が違う。

- 世話人の確かめ（`last_moderator`）と運営の確かめ（`last_operator`）が効かない（会に世話人が、運営がいなくなりうる）
- `content_reports.handled_by`・`join_requests.decided_by`・`invitations.used_by`・`group_requests.decided_by` は、外部キーの SET NULL で同じく NULL になる。そのほかの public 側の本人の行（`operators`・`notice_interest`・`group_requests` の申請者の行を含む）は CASCADE で消える

## 5. 確認

確かめ方は 2 つあり、**実行してよい場所が違う**。

| | 5-1. 権限の 1 行 | 5-2. 確認台本 |
|---|---|---|
| 中身 | `delete_my_account()` の所有者が auth.users を DELETE できるか | 関数の動きを一通り |
| どこで | **本番で実行してよい**（ローカルでも可） | **ローカル専用**。本番では実行しない |
| 書き込み | しない（カタログを読むだけ） | する（テストユーザー・会・投稿などを作り、終わりに消す） |

### 5-1. 本番で最初に打つ 1 行（本番で実行してよい）

20261015 以降（いまは版 5 の 20261027）を本番に当てたら、Studio の SQL エディタで最初にこれを実行する。

```sql
select has_table_privilege(p.proowner, 'auth.users', 'DELETE')
  from pg_proc p where p.oid = 'public.delete_my_account()'::regprocedure;
```

- 読むのはカタログ（`pg_proc` と権限）だけ。表の行は読まず、何も書かない。会員のデータにも触れない。
- `true` なら、関数が auth.users を消せる。
- `false` なら、アカウント削除はいつも最後の auth.users の削除で失敗する（全体が戻るので、何も消えない。画面では「うまくいきませんでした」になる）。
  - 権限を足すか、関数の所有者を変えるかは本番 DB の権限の変更にあたる。ファウンダーが決める（CLAUDE.md「9. 権限境界」）。
- 1 行も返らないなら、`delete_my_account` の migration（20261002 以降）が当たっていない。

### 5-2. 確認台本（ローカル専用。本番では実行しない）

`scripts/portal/verify_delete_account.sql` は、auth.users にテストユーザーを作り、会・投稿・通報・auth の関連表（identities・sessions・refresh_tokens）の行も作る。
版 5 の分では、テスト用の病気（`disease_catalog` の rd99911）・案件・案件への反応・会の新設の申請・運営の行も作る。
項目 12 では、確かめる間だけ public に関数とトリガーを作って消す。本番で流すと本物の会員データに混ざるので、**ローカルの Supabase でだけ**実行する。
台本の先頭の安全装置は、テスト以外のユーザーが 20 人を超える DB では止まる。ただし、これは本番を見分ける仕組みではなく、念のための止め具にすぎない。

Studio の SQL エディタに全文を貼って 1 回実行する。項目 0 には 5-1 と同じ問い合わせが入っている。版 3 以降の分は項目 10〜15 と、項目 0・1・4・5 に足した行
（版 4 の参加希望は `scripts/portal/verify_wishes.sql` の項目 6 で確かめる）:

- 0: 関数の所有者が auth.users に DELETE の権限を持つ
- 1: 他人は auth.users を直接消せない（本人も直接は消せない）
- 4: 最後の世話人は拒否され、auth.users も残る
- 5: 本人の auth.users と auth の関連表（identities・sessions・refresh_tokens）が消え、他人の auth.users は残る
- 10: 参加表明
- 11: 通報
- 12: 途中で失敗したら全体が戻る（台本のトリガーで、最後の auth.users の削除をわざと失敗させる）
- 13: 運営が本人 1 人なら `last_operator` で止まり、運営の行も含めて何も消えない（版 5）
- 14: 案件への反応と会の新設の申請（申請者の行）が消える。運営として決めた申請は `decided_by` だけ NULL、登録した案件は `created_by` だけ NULL（版 5）
- 15: 運営の行が消え、ほかの運営は残る（版 5）
