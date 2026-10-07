#!/usr/bin/env python3
"""保存 HTML から、抽出に必要な節だけを切り出したパケットを作る（読み取りのみ）。

Web 取得はしない。.cache/disease_sources/pages/ の保存 HTML だけを読む。

    python3 scripts/portal/build_packets.py --shard 1 > packets_1.json

出典の優先は仕様どおり「難病情報センター > 小児慢性」。
項目ごとに、難病情報センターに節があればそれを、無ければ小児慢性を出す。
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"

# 項目ごとの「見出しに含まれる言葉」。出典ごとに違う（docs/disease_overview_phase1_task.md §2）
HEADINGS = {
    "nanbyou": {
        "summary": ["とは", "どのような病気", "どのような疾患"],
        "symptoms": ["どのような症状", "症状"],
        "treatment": ["治療法", "治療は", "治療"],
        "onset": ["どのような人に多い"],
    },
    "shouman": {
        "summary": ["概念・定義", "概要・定義", "疾患概念", "概要", "定義"],
        "symptoms": ["臨床症状", "主な症状", "症状"],
        "treatment": ["治療"],
        "onset": ["疫学"],
    },
}
# 拾ってはいけない見出し（項目の言葉を含んでしまうもの）
EXCLUDE = ["成人期以降", "合併症", "検査所見", "診断", "予後", "参考文献", "関連資料", "対象疾病", "文献"]
LIMIT = 700
LIMIT_SYMPTOMS = 900


def sections(path: str) -> list[tuple[str, str]]:
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style).*?</\1>", " ", raw, flags=re.S)
    parts = re.split(r"<h[1-5][^>]*>(.*?)</h[1-5]>", raw, flags=re.S)
    out = []
    for i in range(1, len(parts), 2):
        head = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", parts[i]))).strip()
        body = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", parts[i + 1]))).strip()
        if head:
            out.append((head, body))
    return out


def pick(secs: list[tuple[str, str]], keys: list[str], limit: int = LIMIT) -> tuple[str, str] | None:
    for key in keys:
        for head, body in secs:
            if key in head and not any(x in head for x in EXCLUDE) and len(body) > 20:
                return head, body[:limit]
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--shard-name", help="_shards/<名前>.json を担当リストとして使う（例: phase1b_shard_1）")
    args = parser.parse_args()

    entries = {e["idx"]: e for e in json.loads(TABLE.read_text(encoding="utf-8"))["entries"]}
    name = args.shard_name or f"shard_{args.shard}"
    assigned = json.loads((OVERVIEWS / "_shards" / f"{name}.json").read_text(encoding="utf-8"))

    packets = {}
    for idx in assigned:
        entry = entries[idx]
        available = {}
        for source in ("nanbyou", "shouman"):
            if entry[source]["judgement"] == "exact" and entry[source].get("page_fetch"):
                available[source] = sections(entry[source]["page_fetch"]["cache_file"])

        fields: dict[str, dict] = {}
        for field in ("summary", "symptoms", "treatment", "onset"):
            for source in ("nanbyou", "shouman"):  # 優先順
                if source not in available:
                    continue
                limit = LIMIT_SYMPTOMS if field == "symptoms" else LIMIT
                hit = pick(available[source], HEADINGS[source][field], limit)
                if hit:
                    fields[field] = {"src": source, "head": hit[0], "body": hit[1]}
                    break

        packets[str(idx)] = {
            "idx": idx,
            "name": entry["disease"],
            "reading": entry.get("reading"),
            "sources_available": sorted(available),
            "group_links": [
                {"id": s, "url": g["url"]}
                for s in ("nanbyou", "shouman")
                for g in (entry[s].get("group_link") or [])
            ],
            "fields": fields,
        }

    print(json.dumps(packets, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
