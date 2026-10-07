# idx 系の列を外す手順（計画。実施しない）

作成: 2026-10-04 Claude Code（患者会テナント担当。ファウンダー指示）
状態: **計画だけ**。migration は書いていない。実施は、画面側の参照が 0 になったのを確かめてから、ファウンダーの指示で行う。

共通契約 2026-10-03 の A は「既存の表に disease_id を足して idx から埋め、idx 列は残す（画面の切り替え後に外す）」とした。
この文書は、その「外す」ときの手順。疾患の固定 ID は `disease_catalog.disease_id`（`supabase/migrations/20261023_disease_catalog.sql`）。

---

## 1. 対象の列と、いまそれに頼っているもの

| 表 | 外す列 | 列に付いている制約・索引 | その列を使う DB の関数・トリガー（最新の定義） |
| --- | --- | --- | --- |
| `group_wishes` | `disease_idx` | NOT NULL・CHECK（0 以上）・一意制約 `group_wishes_one_per_disease (disease_idx, user_id)`・列単位の INSERT 権限 | `fill_group_wish_disease_id`（20261023。idx から disease_id を埋める）・`sync_public_wish_count`（20261023。idx ごとに数える）・`wish_summary(disease_idx)`（20261019。Studio 専用） |
| `public_wish_counts` | `disease_idx` | **主キー** | `sync_public_wish_count`（上と同じ） |
| `member_diseases` | `disease_idx` | NOT NULL・CHECK（0 以上）・列単位の INSERT 権限（20260928） | `fill_member_disease_id`（20261029。**同意担当**。idx と名前から disease_id を埋める） |
| `patient_groups` | `disease_idxs` | NOT NULL（既定 `{}`） | `fill_patient_group_disease_ids`（20261023。idx と名前から disease_ids を埋める）・`approve_group_request`（20261026。会を作るときに idx も入れる） |

- `patient_groups.disease_names`・`member_diseases.disease_name` は idx 系ではないので、この手順では外さない（外すかは別に決める。`member_diseases.disease_name` は同意の対象の記録）。
- `resolve_disease_id(idx, name)`（20261023）は、上の 2 つのトリガーが外れると使う所が無くなる。外すかは手順 3 で決める。
- 範囲外: `journey_responses.disease_idx`（道のり調査。道のり担当の共通契約 F）、`disease_catalog.idx`（作成時の位置の記録として残す）。

---

## 2. 外してよいかの確かめ方（すべて満たしてから）

### 2-1. 画面・アプリの参照が 0（機械で確かめる）

リポジトリの根で流す。**どれも 1 行も出なければよい**（出た行が残っている参照）。

```bash
# アプリ（app/・lib/・components/。テストを除く）で idx 系の列名・変数名を使っている所
grep -rnE 'disease_idxs?\b|diseaseIdx' app lib components --include='*.ts' --include='*.tsx' \
  | grep -v '__tests__' \
  | grep -v '^lib/portal/journey-survey'          # 道のり調査（journey_responses.disease_idx）は範囲外

# idx を URL に載せている経路（参加希望の画面）
ls -d app/demo/wish/\[idx\] 2>/dev/null

# 4 表を読み書きしているアプリのコード（ここに出た行で、idx の列を select・insert・eq していないかを目で見る）
grep -rnE "from\('(group_wishes|public_wish_counts|member_diseases|patient_groups)'\)" app lib --include='*.ts' --include='*.tsx' \
  | grep -v '__tests__'
```

2026-10-04 時点（作業ツリー）で 1 つ目の grep に出たファイル（機械生成。行数ではなくファイル）:

| ファイル | 中身 |
| --- | --- |
| `app/demo/wish/[idx]/page.tsx`・`app/demo/wish/_lib/wishes.ts`・`app/demo/wish/_lib/targets.ts`・`app/demo/wish/_components/WishParts.tsx`・`app/demo/wish/actions.ts` | 参加希望の画面（URL の `[idx]` と `group_wishes.disease_idx` の読み書き） |
| `lib/portal/research-contact.ts`・`app/demo/community/profile/ResearchContactSection.tsx` | 研究の案内で選ぶ病気（`member_diseases.disease_idx` の書き込み・会の `disease_idxs` から選択肢を作る） |
| `lib/portal/journey-survey-db.ts` | 道のり調査（範囲外。上の grep では除いている） |

テストで idx 系を使っているもの（画面の切り替えと一緒に直す）: `app/demo/__tests__/contract-screens.test.tsx`・`disease-index.test.ts`・`wish-lib.test.ts`・`wish.test.tsx`、
`lib/portal/__tests__/consents.test.ts`・`group-wishes.test.ts`・`journey-survey.test.ts`（範囲外）・`ops-features.test.ts`。

```bash
grep -rlE 'disease_idxs?\b|diseaseIdx' app lib --include='*.ts' --include='*.tsx' | grep '__tests__'
```

### 2-2. DB の行がすべて disease_id を持っている（SQL エディタで）

```sql
select
  (select count(*) from public.group_wishes       where disease_id is null)                            as wishes_null,
  (select count(*) from public.public_wish_counts where disease_id is null)                            as counts_null,
  (select count(*) from public.member_diseases    where disease_id is null)                            as member_diseases_null,
  (select count(*) from public.patient_groups     where cardinality(disease_ids) <> cardinality(disease_idxs)) as groups_mismatch;
-- すべて 0 であること。0 でない行は、外す前に手で disease_id を決める（推測で埋めない）か、行の扱いをファウンダーが決める
```

### 2-3. 当て終わっていること

20261023（disease_catalog・列の追加）と 20261029（member_diseases の insert で disease_id を埋める。同意担当）が当たっていること。

---

## 3. 手順（新しい migration 1 本。番号はそのときの割り当てで）

外した列は元に戻せない（データが消える）。**当てる前に 4 表をバックアップする**（Studio の SQL エディタで `create table backup_xxx as select * from ...`、または pg_dump）。

1. **関数・トリガーを disease_id だけで動く形に差し替える（列を外す前に）**
   - `sync_public_wish_count` … 数える単位を `disease_id` にする（`w.disease_id = v_did`）。`disease_id` が NULL の希望は数えない
   - `fill_group_wish_disease_id` … トリガーごと外す（アプリが disease_id を送るようになっているので要らない）。
     あわせて `group_wishes` の列単位の INSERT 権限に `disease_id` を足し、`disease_idx` を外す
   - `fill_patient_group_disease_ids` … トリガーごと外す
   - `approve_group_request` … `disease_idxs` を入れない形に差し替える
   - `wish_summary(disease_idx)`（Studio 専用）… 外すか、`disease_id` を受ける形に作り直す（運営は `wish_summary_ops(disease_id)` を使える）
   - `fill_member_disease_id`（**同意担当**）… 同意担当が外す（`member_diseases` の INSERT 権限に `disease_id` を足し、`disease_idx` を外すのも同意担当）
   - `resolve_disease_id` … 上のトリガーがすべて外れていれば外す
2. **`group_wishes`**
   - `alter column disease_id set not null`
   - 一意制約 `group_wishes_one_per_disease`（disease_idx, user_id）を外す（`group_wishes_one_per_disease_id`（disease_id, user_id）は 20261023 で足してある）
   - `drop column disease_idx`
3. **`public_wish_counts`**（公開の表。公開面が `disease_idx` で読んでいないことを 2-1 で確かめてから）
   - disease_id が NULL の行（`disease_catalog` に無い idx の写し）を消す
   - `alter column disease_id set not null`
   - 主キーを `disease_idx` から `disease_id` に付け替える（`drop constraint public_wish_counts_pkey` → `add primary key (disease_id)`。
     一意制約 `public_wish_counts_disease_id_key` は主キーと重なるので外す）
   - 外部キーの `ON DELETE SET NULL` は主キーと合わないので、`ON DELETE CASCADE` に付け替える
   - `drop column disease_idx`
4. **`member_diseases`**（**同意担当と一緒に**。同意の画面・関数はこの担当では触らない）
   - `alter column disease_id set not null`
   - `drop column disease_idx`（一意制約は `(user_id, disease_name)` のままでよいか、`(user_id, disease_id)` にするかは同意担当が決める）
5. **`patient_groups`**
   - `disease_ids` に「空でない」CHECK を足すかを決める（いまの会はすべて 1 病気以上）
   - `drop column disease_idxs`
   - `scripts/portal/build_patient_group_seed.py` を `disease_ids` を出す形に直す（JSON の会を DB に入れ直すとき用）
6. **数え直し**: 公開の参加状況は disease_id で数えているので変わらない。`public_wish_counts` は手順 3 の後に全病気を数え直す
   （差し替えた `sync_public_wish_count` は表の変化でしか動かないので、SQL エディタで 1 回まわす）。

---

## 4. 一緒に直す確認台本と単体テスト

| ファイル | 直す所 |
| --- | --- |
| `scripts/portal/verify_wishes.sql` | 架空の idx（990001・990002）で希望を入れている。disease_catalog に架空の病気を足し、disease_id で入れる形にする。公開の数の列の期待（`disease_idx,n,updated_at,disease_id`）も直す |
| `scripts/portal/verify_ops.sql` | 項目 8（idx から埋めるトリガー・会の disease_ids を埋めるトリガー）を外す。準備で `member_diseases`・`group_wishes`・`patient_groups` に idx を入れている所を直す |
| `scripts/portal/verify_tenancy.sql` | 会の seed を idx で確かめている所 |
| `scripts/portal/verify_consents.sql`・`verify_delete_account.sql` | `member_diseases` に idx を入れている所（同意担当・アカウント削除担当） |
| `lib/portal/__tests__/tenancy.test.ts` | seed の idx を知識ファイルと突き合わせている検査（20260927 の seed は適用済みなので、検査は残してよい） |
| `lib/portal/__tests__/group-wishes.test.ts`・`ops-features.test.ts` | idx の列・トリガーを見ている検査 |

---

## 5. 戻し方

列を外した後は、バックアップの表から `disease_idx` を戻す以外に方法が無い（disease_catalog.idx は作成時の位置なので、その後に知識ファイルの並びが変わっていれば合わない）。
外す前に 2-1・2-2 を満たしていることを、ファウンダーが確かめてから当てる。
