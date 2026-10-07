# data/disease_overviews/

疾患概要プロジェクトの作業場。仕様は `docs/disease_overview_phase1_spec_2026-09-24.md`。

| パス | 中身 | 作るもの |
|---|---|---|
| `_match_table.json` | 951 疾患 × 3 出典の照合表。判定・候補・取得記録（URL・日時・SHA-256） | `scripts/portal/build_match_table.py` → `scripts/portal/fetch_disease_pages.py` |
| `_orphanet_definitions.json` | Orphanet の英語 Definition（ローカル原本から抜き出し。Web 取得ゼロ） | `scripts/portal/build_orphanet_definitions.py` |
| `_shards/shard_1..4.json` | フェーズ1a の担当リスト（idx の配列だけ） | `scripts/portal/build_shards.py` |
| `_shards/README.md` | 4 分割の内訳 | 同上 |
| `_logs/shard_N.md` | 各タスクの処理ログ | フェーズ1a のタスク |
| `<idx>.json` | 抽出結果（フェーズ1 のスキーマ） | フェーズ1a のタスク |

取得した生 HTML は `.cache/disease_sources/`（`.gitignore` 済み。リポジトリに入れない）。

## 判定の状態

`_match_table.json` の `judgement` は機械生成。ファウンダーの ○× は
`docs/disease_overview_review_2026-09-22.md` に記入し、`scripts/portal/apply_review.py` で反映する。
反映後は `machine_judgement` に機械の答えが、`review` に人の答えが残る。
