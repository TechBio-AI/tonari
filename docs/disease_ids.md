# 疾患の固定 ID（stable_id）— 共通契約 A

2026-10-03 作成。対応表は `data/disease_ids.json`、付番は `scripts/portal/assign_stable_ids.py`。

## 決まり

**この対応は不変。知識ファイルの並び替え・統合・分割をしても stable_id は変えない。新しい疾患は末尾に付番する。**

- 形式は `rd` ＋ 5 桁の連番（`rd00001`〜）。2026-10-03 時点の 951 件に、そのときの idx 順で `rd00001`〜`rd00951` を付けた
- stable_id は知識ファイル `data/knowledge/comprehensive_rare_diseases_knowledge.json` の各レコードの先頭のキーにある
- 新しい疾患には、それまでの最大の番号の次を付ける（いまなら `rd00952`）。欠番は埋めない
- 統合・分割・削除のときも、既存の stable_id を付け替えたり別の疾患に使い回したりしない。どう扱ったかは、この文書に記録を足す

## idx との違い

- **idx** は知識ファイル上の位置（0 始まり）。疾患概要（`data/disease_overviews/<idx>.json`）・照合表・DB の `group_wishes.disease_idx`・`data/disease_index.json` が使っている。並び替え・統合・分割でずれる（kb_issues 47）
- **stable_id** は疾患そのものに付いた名前で、ずれない
- `data/disease_ids.json` の `idx`・`name`・`orpha_code` は作成時の値。知識ファイルを並び替えたら、この表の idx も合わせて更新する（stable_id は変えない）

## 付けたときの確認（2026-10-03）

| 項目 | 値 |
|---|---|
| 付ける前の知識ファイルの sha256 | `3138ebc67c90f5332ac21c0517ad2069a24b96930a6a44dc4add579f0be4844f` |
| 付けた後に stable_id を外して同じ書式で書き出した sha256 | 同上（一致。差分は stable_id の追加だけ） |
| 付けた後の知識ファイルの sha256 | `ac3dae6f9a671f9097668f788e74f096b22c6606a7d3394afead5459bd6b5808` |
| git diff | 追加 951 行・削除 0 行 |

## テスト

`lib/portal/__tests__/disease-ids.test.ts`：stable_id が一意・951 件・形式どおり・`data/disease_ids.json` と一致・`data/disease_index.json` の各行から stable_id が引ける。
