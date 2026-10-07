# フェーズ1b 処理ログ（phase1b_shard_1、2026-10-02）

担当: `_shards/phase1b_shard_1.json`（`scripts/portal/prepare_phase1b.py` が作成）。抽出は Claude Code。

| idx | 病名 | 使った出典 | summary | symptoms | onset | treatment | 落とした事実 | notes |
|---:|---|---|---|---|---|---|---|---|
| 113 | バセドウ病 | 小児慢性 | あり | 8 | あり | 治療法あり | 0 | 2 |
| 207 | 後縦靭帯骨化症 | 難病情報センター | あり | 7 | あり | 治療法あり | 0 | 2 |
| 208 | 黄色靭帯骨化症 | 難病情報センター | あり | 5 | null（数字を含む） | 治療法あり | 0 | 1 |

検証: `validate_overview.py --shard-name phase1b_shard_1` 不合格 0／`verify_overviews.py --dry-run` 不一致 0・未検証 0。
