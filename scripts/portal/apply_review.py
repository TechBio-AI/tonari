#!/usr/bin/env python3
"""確認シート（docs/disease_overview_review_2026-09-22.md）の ○ × ? を照合表に反映する。

    python3 scripts/portal/apply_review.py            # 反映して書き戻す
    python3 scripts/portal/apply_review.py --dry-run  # 何が変わるかだけ出す

読み取るのは「判定」列（各行の最後のセル）だけ。行の同定は (idx, 出典, URL / ORPHA コード)。

    ○ … その候補で確定する（judgement = exact、URL と病名を入れる）
    群 … その候補は疾患のページではなく「群」のページ。group_link に URL と病名を入れる。
         同じ出典に ○ が無ければ judgement = group。フェーズ1 では links にだけ使い、本文抽出には使わない
    × … その候補を外す。その出典の候補が全部 × になったら judgement = none
    ? … 保留。judgement は partial のまま、review.mark に残す
    空欄 … 触らない

    優先順は ○ > 群 > ? > ×。○ と 群 は同じ疾患・同じ出典に同時に付けてよい
    （疾患のページを ○、群のページを 群、という付け方）。

機械の判定は machine_judgement に残すので、何度実行しても結果は同じになる。
1 つの疾患・1 つの出典に ○ が 2 つ以上あるときは、何も書かずに止まる。
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

TABLE = Path("data/disease_overviews/_match_table.json")
SHEET = Path("docs/disease_overview_review_2026-09-22.md")

SOURCE_KEY = {"難病情報センター": "nanbyou", "小児慢性": "shouman", "Orphanet": "orphanet"}
MARKS = {"○", "×", "?", "？", "群"}


def clean(cell: str) -> str:
    """セルから <br>（ふりがな）と装飾を落として、病名だけ取り出す。"""
    text = re.sub(r"<br>.*$", "", cell).strip()
    text = re.sub(r"^告示\s*\d+\s*", "", text)
    return text.replace("\\|", "|").strip()


def parse_sheet() -> list[dict]:
    rows: list[dict] = []
    for line in SHEET.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| idx |"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        # 7 列（§1・§2・§5）と、「機械の推奨」列を足した 8 列（§3・§4、2026-09-25）。判定は常に最後の列
        if len(cells) not in (7, 8) or not re.fullmatch(r"\d+", cells[0]):
            continue
        mark = cells[-1].strip().replace("？", "?")
        if mark not in MARKS and mark != "":
            raise SystemExit(f"判定列に ○ × ? 以外が入っています: {cells[-1]!r}\n  行: {line}")
        source = SOURCE_KEY.get(cells[3])
        if source is None:
            raise SystemExit(f"出典の名前が読めません: {cells[3]!r}")
        rows.append({
            "idx": int(cells[0]),
            "candidate": clean(cells[2]),
            "source": source,
            "url": cells[4].strip(),
            "mark": mark,
        })
    return rows


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    data = json.loads(TABLE.read_text(encoding="utf-8"))
    entries = {e["idx"]: e for e in data["entries"]}
    rows = parse_sheet()

    marked = [r for r in rows if r["mark"]]
    if not marked:
        print(f"判定列がすべて空欄です（シート {len(rows)} 行）。何もしません。")
        return

    # 1 疾患 1 出典に ○ は 1 つまで
    circles = defaultdict(list)
    for r in marked:
        if r["mark"] == "○":
            circles[(r["idx"], r["source"])].append(r)
    bad = {k: v for k, v in circles.items() if len(v) > 1}
    if bad:
        for (idx, source), v in bad.items():
            print(f"○ が {len(v)} 個: idx {idx} / {source}", file=sys.stderr)
            for r in v:
                print(f"    {r['candidate']}  {r['url']}", file=sys.stderr)
        raise SystemExit("○ が重複しています。1 つに絞ってから再実行してください（群のページなら「群」を使ってください）。何も書いていません。")

    by_pair: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for r in marked:
        by_pair[(r["idx"], r["source"])].append(r)

    changes: list[str] = []
    for (idx, source), group in sorted(by_pair.items()):
        entry = entries.get(idx)
        if entry is None:
            raise SystemExit(f"照合表に idx {idx} がありません")
        cell = entry[source]
        cell.setdefault("machine_judgement", cell["judgement"])
        before = cell["judgement"]

        chosen = next((r for r in group if r["mark"] == "○"), None)
        groups = [r for r in group if r["mark"] == "群"]
        holds = [r for r in group if r["mark"] == "?"]

        if groups:
            cell["group_link"] = [{"name": r["candidate"], "url": r["url"]} for r in groups]

        if chosen:
            cell["judgement"] = "exact"
            if source != "orphanet":
                cell["url"] = chosen["url"] if chosen["url"] != "—" else None
                cell["matched_name"] = chosen["candidate"]
                if source == "shouman" and cell["url"]:
                    cell["disease_id"] = cell["url"].strip("/").split("/")[-1]
            cell["review"] = {"mark": "○", "name": chosen["candidate"], "url": chosen["url"],
                              "reviewed_on": date.today().isoformat(), "by": "founder"}
        elif groups:
            cell["judgement"] = "group"
            if source != "orphanet":
                # 群のページは疾患のページではないので、url には入れない（links 用）
                cell["url"] = None
                cell["matched_name"] = None
            cell["review"] = {"mark": "群", "reviewed_on": date.today().isoformat(), "by": "founder"}
        elif holds:
            cell["judgement"] = "partial"
            cell["review"] = {"mark": "?", "reviewed_on": date.today().isoformat(), "by": "founder"}
        else:
            # この出典について、記入されたものが全部 ×
            cell["judgement"] = "none"
            if source != "orphanet":
                cell["url"] = None
                cell["matched_name"] = None
            cell["review"] = {"mark": "×", "reviewed_on": date.today().isoformat(), "by": "founder"}
            cell["reason"] = (cell.get("reason", "") + " ／ 人の確認で除外").strip(" ／")

        if cell["judgement"] != before:
            changes.append(f"  idx {idx:>3} {entry['disease'][:24]:<24} {source:<9} "
                           f"{before} → {cell['judgement']}"
                           + (f"  {cell.get('url') or ''}" if source != 'orphanet' else ""))

    print(f"シート {len(rows)} 行中、記入あり {len(marked)} 行")
    print(f"判定が変わる行: {len(changes)}")
    for line in changes[:40]:
        print(line)
    if len(changes) > 40:
        print(f"  … 他 {len(changes) - 40} 行")

    if dry_run:
        print("\n--dry-run なので書き戻していません。")
        return

    data["reviewed"] = {"applied_on": date.today().isoformat(), "sheet": str(SHEET),
                        "marked_rows": len(marked)}
    TABLE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\n書き戻し: {TABLE}")
    print("表を作り直すには: python3 scripts/portal/write_match_report.py")


if __name__ == "__main__":
    main()
