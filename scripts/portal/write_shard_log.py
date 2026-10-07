#!/usr/bin/env python3
"""_logs/shard_N.md を書き出す。

    python3 scripts/portal/write_shard_log.py --shard 1 --skipped skips_1.json

skips_N.json は {"177": "理由", ...} の形。出力しなかった疾患とその理由を残す。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--skipped", type=Path)
    args = parser.parse_args()

    assigned = json.loads((OVERVIEWS / "_shards" / f"shard_{args.shard}.json").read_text(encoding="utf-8"))
    entries = {e["idx"]: e for e in json.loads((OVERVIEWS / "_match_table.json").read_text(encoding="utf-8"))["entries"]}
    skipped = json.loads(args.skipped.read_text(encoding="utf-8")) if args.skipped and args.skipped.exists() else {}

    rows = []
    notes_total = 0
    onset_null = 0
    for idx in assigned:
        path = OVERVIEWS / f"{idx}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        notes_total += len(data["notes"])
        if data["onset"] is None:
            onset_null += 1
        used = "・".join(s["id"] for s in data["sources"])
        rows.append(f"| {idx} | {data['name']} | {used} | ○ | {len(data['symptoms'])} | "
                    f"{'○' if data['onset'] else '—'} | {data['treatment']['type']} | "
                    f"{len(data['notes'])} | {' ／ '.join(data['notes'])} |")

    lines = [f"# フェーズ1a shard {args.shard} の処理ログ", "",
             f"担当 {len(assigned)} 件 / 出力 {len(rows)} 件 / 出典なしでスキップ {len(skipped)} 件", "",
             f"- onset を null にした件数: {onset_null}",
             f"- notes の総数: {notes_total}",
             f"- 検証: `python3 scripts/portal/validate_overview.py --shard {args.shard}`", ""]

    if skipped:
        lines += ["## 出力しなかった疾患", "", "| idx | 病名 | 理由 |", "|---:|---|---|"]
        for idx, reason in sorted(skipped.items(), key=lambda x: int(x[0])):
            lines.append(f"| {idx} | {entries[int(idx)]['disease']} | {reason} |")
        lines.append("")

    lines += ["## 出力した疾患", "",
              "| idx | 病名 | 使った出典 | summary | symptoms | onset | treatment | notes 数 | notes |",
              "|---:|---|---|---|---:|---|---|---:|---|"]
    lines += rows
    lines.append("")

    out = OVERVIEWS / "_logs" / f"shard_{args.shard}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"書き出し: {out}（出力 {len(rows)} / スキップ {len(skipped)} / notes {notes_total}）")


if __name__ == "__main__":
    main()
