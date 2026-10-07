#!/usr/bin/env python3
"""フェーズ1a の担当リスト（_shards/shard_1..4.json）を作る。

対象は「URL が確定していて、すぐ本文を読みに行ける疾患」。
4 等分は idx 順の総当たり（round-robin）。連続した範囲で切ると、知識ファイルの
批次の偏り（前半 75 件と後半 926 件）がそのまま担当の偏りになるため。

各ファイルの中身は **idx の配列だけ**（仕様どおり）。
"""

from __future__ import annotations

import json
from pathlib import Path

TABLE = Path("data/disease_overviews/_match_table.json")
SHARDS = Path("data/disease_overviews/_shards")
SHARD_COUNT = 4


def main() -> None:
    data = json.loads(TABLE.read_text(encoding="utf-8"))
    targets = [e for e in data["entries"] if e["nanbyou"].get("url") or e["shouman"].get("url")]
    targets.sort(key=lambda e: e["idx"])

    shards: list[list[int]] = [[] for _ in range(SHARD_COUNT)]
    for position, entry in enumerate(targets):
        shards[position % SHARD_COUNT].append(entry["idx"])

    SHARDS.mkdir(parents=True, exist_ok=True)
    by_idx = {e["idx"]: e for e in targets}
    summary = []
    for number, idx_list in enumerate(shards, start=1):
        (SHARDS / f"shard_{number}.json").write_text(
            json.dumps(idx_list, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        both = sum(1 for i in idx_list if by_idx[i]["nanbyou"].get("url") and by_idx[i]["shouman"].get("url"))
        nb = sum(1 for i in idx_list if by_idx[i]["nanbyou"].get("url"))
        sh = sum(1 for i in idx_list if by_idx[i]["shouman"].get("url"))
        orpha = sum(1 for i in idx_list if by_idx[i]["orphanet"]["judgement"] == "exact")
        summary.append((number, len(idx_list), nb, sh, both, orpha))

    readme = ["# フェーズ1a の担当リスト", "",
              "各 `shard_N.json` は **idx の配列だけ**を持つ（`docs/disease_overview_phase1_spec_2026-09-24.md`）。",
              "対象は「難病情報センターか小児慢性の URL が確定している疾患」。",
              "4 等分は idx 順の総当たり（1 件ずつ順に配る）。連続した範囲で切ると、",
              "知識ファイルの批次の偏りがそのまま担当の偏りになるため。", "",
              "| 分割 | 件数 | 難病 URL あり | 小慢 URL あり | 両方 | Orphanet 完全一致 |",
              "|---:|---:|---:|---:|---:|---:|"]
    for number, total, nb, sh, both, orpha in summary:
        readme.append(f"| {number} | {total} | {nb} | {sh} | {both} | {orpha} |")
    readme += ["", f"合計 {sum(s[1] for s in summary)} 件", "",
               "生成: `scripts/portal/build_shards.py`（`_match_table.json` から作り直せる）"]
    (SHARDS / "README.md").write_text("\n".join(readme) + "\n", encoding="utf-8")

    for number, total, nb, sh, both, orpha in summary:
        print(f"  shard_{number}: {total} 件（難病 {nb} / 小慢 {sh} / 両方 {both} / Orphanet {orpha}）")
    print(f"合計 {sum(s[1] for s in summary)} 件 → {SHARDS}")


if __name__ == "__main__":
    main()
