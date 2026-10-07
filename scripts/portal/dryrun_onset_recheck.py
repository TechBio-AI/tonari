#!/usr/bin/env python3
"""onset が null の疾患について、許容一覧を入れたあとなら書けるかを数える（書き換えない）。

    python3 scripts/portal/dryrun_onset_recheck.py

読むのは保存 HTML と出力済みの <idx>.json だけ。ファイルは一切変更しない。
「規則を通る文があるか」までしか機械では分からないので、
発症時期の語を含むかどうかで見込みを分けて出す。
"""

from __future__ import annotations

import collections
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_packets import HEADINGS, pick, sections  # noqa: E402
from validate_overview import onset_digits  # noqa: E402

OVERVIEWS = Path("data/disease_overviews")
# 発症の時期を語っている文かどうかの目安（数字を含まない言い方だけ）
ONSET_WORDS = ("発症", "発病", "好発", "新生児期", "乳児期", "乳幼児期", "幼児期", "小児期",
               "学童期", "思春期", "成人期", "中年", "高齢", "若年", "年齢", "年代",
               "生後", "出生時", "こども時代", "子供", "小児", "成人")


def main() -> None:
    table = {e["idx"]: e for e in json.loads((OVERVIEWS / "_match_table.json").read_text(encoding="utf-8"))["entries"]}
    shards = {n: set(json.loads((OVERVIEWS / "_shards" / f"shard_{n}.json").read_text(encoding="utf-8")))
              for n in (1, 2, 3, 4)}

    result = collections.defaultdict(collections.Counter)
    recovered: list[tuple[int, int, str, str]] = []

    for path in sorted(OVERVIEWS.glob("[0-9]*.json"), key=lambda p: int(p.stem)):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["onset"] is not None:
            continue
        idx = data["idx"]
        shard = data["shard"]
        result[shard]["onset が null"] += 1

        entry = table[idx]
        body = None
        for source in ("nanbyou", "shouman"):
            fetch = entry[source].get("page_fetch")
            if not fetch:
                continue
            hit = pick(sections(fetch["cache_file"]), HEADINGS[source]["onset"])
            if hit:
                body = hit[1]
                break
        if body is None:
            result[shard]["発症の節がそもそも無い"] += 1
            continue

        usable = [s.strip() for s in re.split(r"(?<=。)", body)
                  if s.strip() and len(s.strip()) <= 120 and not onset_digits(s)]
        if not usable:
            result[shard]["節はあるが規則を通る文が無い"] += 1
            continue
        with_word = [s for s in usable if any(w in s for w in ONSET_WORDS)]
        if with_word:
            result[shard]["書ける見込みあり（発症時期の語を含む文がある）"] += 1
            recovered.append((shard, idx, entry["disease"], with_word[0][:58]))
        else:
            result[shard]["規則は通るが発症時期の記述ではない"] += 1

    print("onset が null の疾患を、許容一覧を入れた規則で数え直した結果（書き換えていません）\n")
    keys = ["onset が null", "書ける見込みあり（発症時期の語を含む文がある）",
            "規則は通るが発症時期の記述ではない", "節はあるが規則を通る文が無い", "発症の節がそもそも無い"]
    header = "| 項目 | " + " | ".join(f"shard {n}" for n in (1, 2, 3, 4)) + " | 計 |"
    print(header)
    print("|---|" + "---:|" * 5)
    for k in keys:
        row = [result[n][k] for n in (1, 2, 3, 4)]
        print(f"| {k} | " + " | ".join(str(v) for v in row) + f" | {sum(row)} |")

    print(f"\n書ける見込みのあるもの（計 {len(recovered)} 件）:")
    for shard, idx, name, sentence in recovered:
        print(f"  shard{shard} idx {idx:>3} {name[:22]:<22} {sentence}")


if __name__ == "__main__":
    main()
