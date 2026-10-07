#!/usr/bin/env python3
"""抽出した中身を data/disease_overviews/<idx>.json に組み立てる。

    python3 scripts/portal/write_overviews.py --shard 1 --input draft_1.json

入力（draft_N.json）は idx をキーにした短い形。出典（src）はパケットから決まるので書かない。

  { "0": { "s": ["summary の text", "evidence"],
           "y": [["症状の text", "evidence"], …],
           "o": ["onset の text", "evidence"],        // 無ければ省略か null
           "t": ["治療法あり", "evidence"],             // 「記載なし」のときは ["記載なし", null]
           "n": ["notes の行", …] },                   // 省略可
    "4": { … } }

sources / links / extracted_at / shard は照合表から機械的に埋める。
evidence が出典本文にそのままの形で無ければ、その場で止めて知らせる（書き換えない）。
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"
JST = timezone(timedelta(hours=9))


def squeeze(text: str) -> str:
    return re.sub(r"\s+", "", text)


def page_text(path: str) -> str:
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style).*?</\1>", " ", raw, flags=re.S)
    return squeeze(html.unescape(re.sub(r"<[^>]+>", " ", raw)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--packets", type=Path, required=True)
    args = parser.parse_args()

    entries = {e["idx"]: e for e in json.loads(TABLE.read_text(encoding="utf-8"))["entries"]}
    packets = json.loads(args.packets.read_text(encoding="utf-8"))
    draft = json.loads(args.input.read_text(encoding="utf-8"))
    now = datetime.now(JST).isoformat(timespec="seconds")

    bodies: dict[str, str] = {}
    problems: list[str] = []
    written = 0

    for key, content in draft.items():
        idx = int(key)
        entry = entries[idx]
        packet = packets[key]
        fields = packet["fields"]

        used: dict[str, str] = {}

        def fact(field: str, text: str, evidence: str, where: str) -> dict | None:
            # その項目の節が無ければ summary と同じ出典から引く。
            # evidence はページ全体に対して照合するので、別の節からの抜き書きでも無改変性は守られる。
            src = (fields.get(field, {}).get("src")
                   or fields.get("summary", {}).get("src")
                   or next((v["src"] for v in fields.values()), None))
            if src is None:
                problems.append(f"idx {idx} {where}: この疾患にはどの節も無い")
                return None
            fetch = entry[src].get("page_fetch")
            if not fetch:
                problems.append(f"idx {idx} {where}: {src} の取得記録が無い")
                return None
            path = fetch["cache_file"]
            if path not in bodies:
                bodies[path] = page_text(path)
            if squeeze(evidence) not in bodies[path]:
                problems.append(f"idx {idx} {where}: evidence が出典本文に無い → {evidence!r}")
                return None
            used[src] = path
            return {"text": text, "source_id": src, "evidence": evidence}

        summary = content.get("s")
        summary_fact = fact("summary", summary[0], summary[1], "summary") if summary else None
        if summary_fact is None:
            continue
        summary_fact["lang"] = "ja"

        symptoms = []
        for i, item in enumerate(content.get("y") or []):
            built = fact("symptoms", item[0], item[1], f"symptoms[{i}]")
            if built:
                symptoms.append(built)

        onset = None
        if content.get("o"):
            onset = fact("onset", content["o"][0], content["o"][1], "onset")

        treatment_input = content.get("t") or ["記載なし", None]
        if treatment_input[0] == "記載なし" or not treatment_input[1]:
            treatment = {"type": "記載なし", "source_id": summary_fact["source_id"], "evidence": None}
        else:
            built = fact("treatment", treatment_input[0], treatment_input[1], "treatment")
            treatment = ({"type": treatment_input[0], "source_id": built["source_id"],
                          "evidence": built["evidence"]} if built
                         else {"type": "記載なし", "source_id": summary_fact["source_id"], "evidence": None})

        sources = []
        for src in ("nanbyou", "shouman"):
            if src not in used:
                continue
            fetch = entry[src]["page_fetch"]
            sources.append({"id": src, "url": fetch["url"], "fetched_at": fetch["fetched_at"],
                            "sha256": fetch["sha256"], "title": fetch["title"]})
        links = [{"id": s["id"], "url": s["url"], "label": "公式ページ"} for s in sources]
        links += [{"id": g["id"], "url": g["url"], "label": "関連する群のページ"}
                  for g in packet.get("group_links", [])]

        (OVERVIEWS / f"{idx}.json").write_text(json.dumps({
            "idx": idx,
            "name": entry["disease"],
            "sources": sources,
            "summary": summary_fact,
            "symptoms": symptoms,
            "onset": onset,
            "treatment": treatment,
            "links": links,
            "notes": content.get("n") or [],
            "extracted_at": now,
            "shard": args.shard,
        }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        written += 1

    print(f"書き出し {written} 件 / 下書き {len(draft)} 件")
    if problems:
        print(f"\n止めた・落としたもの {len(problems)} 件:", file=sys.stderr)
        for message in problems:
            print("  " + message, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
