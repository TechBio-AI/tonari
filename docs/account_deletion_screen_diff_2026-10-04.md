# アカウント削除: 確認画面と delete_my_account の突き合わせ（機械生成。scripts/portal/diff_delete_items.py）

- 関数: `supabase/migrations/20261027_delete_account_v5.sql`（最新の定義）。止める語: unauthenticated, last_moderator, last_operator
- 画面: `app/demo/community/account/delete/page.tsx`（「消えるもの」8 項目）

## A. 関数が消す・変えるもの → 画面の記載

| # | 操作 | 表 | 条件 | 画面の記載 |
|---|---|---|---|---|
| 1 | DELETE | `public.journey_responses` | `WHERE id IN (SELECT l.response_id FROM public.journey_links l WHERE l.user_id = v_uid)` | 「消えるもの」4: 病気がわかるまでの道のりの回答 |
| 2 | DELETE | `public.journey_links` | `WHERE user_id = v_uid` | 「消えるもの」4: 病気がわかるまでの道のりの回答 |
| 3 | DELETE | `public.event_attendance` | `WHERE user_id = v_uid` | 「消えるもの」5: 行事への参加の予定 |
| 4 | DELETE | `public.group_wishes` | `WHERE user_id = v_uid` | 「消えるもの」7: 患者会への参加の希望 |
| 5 | DELETE | `public.notice_interest` | `WHERE user_id = v_uid` | **記載なし** |
| 6 | DELETE | `public.group_requests` | `WHERE requester_id = v_uid` | **記載なし** |
| 7 | UPDATE | `public.group_requests` | `SET decided_by = NULL WHERE decided_by = v_uid` | （対象外: 他人の行に残る本人の痕跡を NULL にするだけ。行は残る） |
| 8 | DELETE | `public.content_reports` | `WHERE reporter_id = v_uid` | 「消えるもの」6: あなたがした通報 |
| 9 | UPDATE | `public.content_reports` | `SET handled_by = NULL WHERE handled_by = v_uid` | （対象外: 他人の行に残る本人の痕跡を NULL にするだけ。行は残る） |
| 10 | DELETE | `public.member_diseases` | `WHERE user_id = v_uid` | 「消えるもの」3: 研究・治験の案内を受け取る病気 |
| 11 | DELETE | `public.consents` | `WHERE user_id = v_uid` | 「消えるもの」2: 利用目的などへの同意の記録 |
| 12 | DELETE | `public.join_requests` | `WHERE user_id = v_uid` | 「消えるもの」8: すべての会の会員資格（入会の申請と、発行した招待も消えます） |
| 13 | UPDATE | `public.join_requests` | `SET decided_by = NULL WHERE decided_by = v_uid` | （対象外: 他人の行に残る本人の痕跡を NULL にするだけ。行は残る） |
| 14 | DELETE | `public.invitations` | `WHERE created_by = v_uid` | 「消えるもの」8: すべての会の会員資格（入会の申請と、発行した招待も消えます） |
| 15 | UPDATE | `public.invitations` | `SET used_by = NULL WHERE used_by = v_uid` | （対象外: 他人の行に残る本人の痕跡を NULL にするだけ。行は残る） |
| 16 | DELETE | `public.memberships` | `WHERE user_id = v_uid` | 「消えるもの」8: すべての会の会員資格（入会の申請と、発行した招待も消えます） |
| 17 | DELETE | `public.operators` | `WHERE user_id = v_uid` | **記載なし** |
| 18 | DELETE | `public.member_profiles` | `WHERE user_id = v_uid` | 「消えるもの」1: プロフィール（氏名・表示名・年代・性別・お住まいの都道府県など） |
| 19 | DELETE | `auth.users` | `WHERE id = v_uid` | 「残るもの」の節の注記: …メールアドレス… |
| 20 | DELETE | `public.profiles` | `(表がある DB でだけ。EXECUTE)` | 「消えるもの」1: プロフィール（氏名・表示名・年代・性別・お住まいの都道府県など） |

## B. 画面の「消えるもの」→ 関数の文

| # | 画面の項目 | 当たる表（関数の文） |
|---|---|---|
| 1 | プロフィール（氏名・表示名・年代・性別・お住まいの都道府県など） | `public.member_profiles`, `public.profiles` |
| 2 | 利用目的などへの同意の記録 | `public.consents` |
| 3 | 研究・治験の案内を受け取る病気 | `public.member_diseases` |
| 4 | 病気がわかるまでの道のりの回答 | `public.journey_links`, `public.journey_responses` |
| 5 | 行事への参加の予定 | `public.event_attendance` |
| 6 | あなたがした通報 | `public.content_reports` |
| 7 | 患者会への参加の希望 | `public.group_wishes` |
| 8 | すべての会の会員資格（入会の申請と、発行した招待も消えます） | `public.invitations`, `public.join_requests`, `public.memberships` |

## C. auth.users を参照する public の外部キー（全 migration）→ 関数で明示して扱っているか

| 表.列 | ON DELETE | 定義 | 関数で明示 |
|---|---|---|---|
| `consents.user_id` | CASCADE | 20260928_consents.sql | 明示 |
| `content_reports.handled_by` | SET NULL | 20261014_content_reports.sql | 明示 |
| `content_reports.reporter_id` | CASCADE | 20261014_content_reports.sql | 明示 |
| `event_attendance.user_id` | CASCADE | 20261013_community_features.sql | 明示 |
| `group_comments.author_id` | SET NULL | 20261002_delete_account.sql | 外部キーに任せる（auth.users の削除で SET NULL） |
| `group_events.created_by` | SET NULL | 20261013_community_features.sql | 外部キーに任せる（auth.users の削除で SET NULL） |
| `group_links.created_by` | SET NULL | 20261013_community_features.sql | 外部キーに任せる（auth.users の削除で SET NULL） |
| `group_posts.author_id` | SET NULL | 20261002_delete_account.sql | 外部キーに任せる（auth.users の削除で SET NULL） |
| `group_requests.decided_by` | SET NULL | 20261026_group_requests.sql | 明示 |
| `group_requests.requester_id` | CASCADE | 20261026_group_requests.sql | 明示 |
| `group_settings.updated_by` | SET NULL | 20261013_community_features.sql | 外部キーに任せる（auth.users の削除で SET NULL） |
| `group_wishes.user_id` | CASCADE | 20261019_group_wishes.sql | 明示 |
| `invitations.created_by` | CASCADE | 20260927_patient_group_tenancy.sql | 明示 |
| `invitations.used_by` | SET NULL | 20260927_patient_group_tenancy.sql | 明示 |
| `join_requests.decided_by` | SET NULL | 20260927_patient_group_tenancy.sql | 明示 |
| `join_requests.user_id` | CASCADE | 20260927_patient_group_tenancy.sql | 明示 |
| `journey_links.user_id` | CASCADE | 20261010_journey_survey.sql | 明示 |
| `member_diseases.user_id` | CASCADE | 20260928_consents.sql | 明示 |
| `member_profiles.user_id` | CASCADE | 20260926_member_profiles.sql | 明示 |
| `memberships.user_id` | CASCADE | 20260927_patient_group_tenancy.sql | 明示 |
| `notice_interest.user_id` | CASCADE | 20261024_trial_notices.sql | 明示 |
| `operators.user_id` | CASCADE | 20261022_operators.sql | 明示 |
| `profiles.id` | CASCADE | 00001_create_tables.sql | 外部キーに任せる（auth.users の削除で CASCADE） |
| `trial_notices.created_by` | SET NULL | 20261024_trial_notices.sql | 外部キーに任せる（auth.users の削除で SET NULL） |

## D. 画面の「残るもの」の文

> これまでに書いた投稿とコメントは、会に残ります。名前は表示されなくなります。 削除すると、元に戻せません。 ログインに使うメールアドレスも消えます。もう一度ご利用になるには、改めて患者会からの招待が必要です。


---

## E. 差分のまとめと、画面の文言を直す案（ここから下は人が書いた。直していない）

画面の担当（患者会ページと会員エリア）への申し送り。`app/demo/community/account/delete/page.tsx` は変えていない。

### 差分

| # | 差分 | 種類 |
|---|---|---|
| 1 | `notice_interest`（治験・研究の案内への「興味がある」「表示しない」）を消すが、画面に無い | 消えるものの書き漏れ |
| 2 | `group_requests`（会の新設の申請。申請者の行）を消すが、画面に無い | 消えるものの書き漏れ |
| 3 | `operators`（運営の資格）を消すが、画面に無い（運営の人にだけ関係する） | 消えるものの書き漏れ |
| 4 | `last_operator` で止まったとき、`last_moderator` の案内（`LAST_MODERATOR_GUIDE`）に当たる次の手順の案内が無い（`FAILURE_MESSAGES.last_operator` の「ほかに運営がいないため、削除できません」だけが出る） | 止まったときの案内 |
| 5 | 「残るもの」は投稿とコメントだけ。実際には、世話人・運営として作ったもの・決めた記録も、名前の結びつき（作った人・対応した人の列）だけを外して残る：行事・リンク・会の設定（作成者・更新者）、登録した治験・研究の案内（登録者）、対応した通報・審査した入会申請・決めた会の新設の申請（対応者・決めた人）、使った招待（使った人）、会の新設の申請が承認されてできた会 | 残るものの書き漏れ |
| 6 | ファイル冒頭のコメントが「土台の delete_my_account 版 3」のまま（今は版 5） | コメントの古さ（画面には出ない） |

B 表の向き（画面にあるが関数に当たる文が無い）の差分は 0 件。画面の 8 項目はすべて関数の削除に当たる。

### 直す案（文言は案。決めるのは画面の担当とファウンダー）

1. 「消えるもの」に 2 行足す（3 番目「研究・治験の案内を受け取る病気」の次と、7 番目「患者会への参加の希望」の次がつながりとして自然）:
   - `治験・研究の案内への「興味がある」「表示しない」の記録`
   - `会を作りたいという申請（申請中のものも、結果が出たものも）`
2. 運営の人にだけ 1 行足す（`is_operator()` で出し分け。運営でない会員には関係が無いので出さない）:
   - `運営としての役割`
   - 出し分けをしない場合の案: `運営としての役割（運営をしている方のみ）`
3. `last_operator` のときの案内を足す（`LAST_MODERATOR_GUIDE` と同じ置き方）:
   - `運営を務めているときは、ほかの方に運営を代わってもらってから、もう一度お試しください。`
   - 運営を足すのは今は SQL エディタからだけ（`20261022_operators.sql`）。運営どうしの連絡先・依頼の窓口が画面にあるかは不明。窓口があるなら、その案内を添える。
4. 「残るもの」に 1 文足す（投稿・コメントの文の次）:
   - `世話人や運営として作った行事・リンク・案内や、対応・審査の記録も残ります。あなたの名前とは結びつかなくなります。`
   - 会の新設の申請が承認されてできた会について、必要なら: `あなたの申請でできた会は、そのまま残ります。`
5. 冒頭コメントの「版 3」を「版 5（20261027）」に直し、`docs/account-deletion.md` を参照先にする。

### 直すときに一緒に変えるもの

- `app/demo/__tests__/account-delete.test.tsx` は「消えるもの」をちょうど 8 項目として並びまで確かめている（`expect(items).toHaveLength(8)` ほか）。項目を足すとこのテストが落ちるので、同時に直す。
- 直した後は、このファイルを `python3 scripts/portal/diff_delete_items.py` で作り直し、A 表の「記載なし」が 0 になることを確かめる（`KEYWORDS` には案の言葉を入れてある。案の文言のまま足せば、`notice_interest` は「興味がある」、`group_requests` は「会を作りたい」、`operators` は「運営」で当たる。言い回しを変えたら `KEYWORDS` も直す）。

### 画面の言葉の出典（案の言い回しをそろえるため）

- 「興味がある」「表示しない」: `app/demo/community/notices/page.tsx`（案内への反応のボタンと表示）
- 「会を作りたい」「申請する」: `app/demo/wish/[idx]/new-group/page.tsx`（会の新設の申請）
