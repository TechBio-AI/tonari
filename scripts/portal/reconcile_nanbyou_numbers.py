#!/usr/bin/env python3
"""知識ファイルの description にある「指定難病NNN」と、難病情報センターの公式の告示番号を突き合わせる。

    python3 scripts/portal/reconcile_nanbyou_numbers.py

- 公式の告示番号: _match_table.json の難病情報センター側で
    judgement == exact（機械の完全一致、またはファウンダーの ○）… kokuji_no
    judgement == group（ファウンダーの「群」）… group_link の URL を保存済みの索引で引いた告示番号。「群番号」と明示する
- description の番号: 「指定難病NNN」（末尾以外や「関連」「の若年型」などの修飾つきも拾い、修飾は根拠列に残す）。信用しない前提
- 区分: 一致 / 不一致 / 公式なし（description に番号があるが公式の番号が無い）/ description に番号なし（公式だけある）
- 読むだけ。知識ファイル・照合表は変更しない。出力は docs/nanbyou_number_reconcile_2026-09-25.md だけ。
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_match_table import load_manifest, parse_nanbyou  # noqa: E402

KB = Path("data/knowledge/comprehensive_rare_diseases_knowledge.json")
TABLE = Path("data/disease_overviews/_match_table.json")
OUT = Path("docs/nanbyou_number_reconcile_2026-09-25.md")

DESC_NUMBER = re.compile(r"指定難病\s*([0-9０-９]+)([^。]*)")
ORDER = {"不一致": 0, "公式なし": 1, "description に番号なし": 2, "一致": 3}


def desc_numbers(description: str) -> list[tuple[int, str, str]]:
    """(番号, 修飾, 原文) の一覧。"""
    found = []
    for m in DESC_NUMBER.finditer(description or ""):
        number = int(unicodedata.normalize("NFKC", m.group(1)))
        found.append((number, m.group(2).strip(), m.group(0)))
    return found


def official_number(cell: dict, by_url: dict[str, dict]) -> tuple[int | None, bool, str]:
    """(告示番号, 群番号か, 根拠)。"""
    judgement = cell.get("judgement")
    review = (cell.get("review") or {}).get("mark")
    if judgement == "exact" and cell.get("kokuji_no"):
        who = "ファウンダーの ○" if review == "○" else "機械の完全一致"
        return int(cell["kokuji_no"]), False, f"{who}（告示 {cell['kokuji_no']} {cell.get('matched_name') or ''}）"
    if judgement == "exact" and cell.get("url"):
        row = by_url.get(cell["url"].rstrip("/"))
        if row and row.get("kokuji_no"):
            who = "ファウンダーの ○" if review == "○" else "機械の完全一致"
            return int(row["kokuji_no"]), False, f"{who}（索引で引いた告示 {row['kokuji_no']} {row['name']}）"
    if judgement == "group":
        for link in cell.get("group_link") or []:
            row = by_url.get((link.get("url") or "").rstrip("/"))
            if row and row.get("kokuji_no"):
                return int(row["kokuji_no"]), True, f"ファウンダーの「群」（告示 {row['kokuji_no']} {row['name']}）"
    return None, False, ""


def main() -> int:
    kb = json.loads(KB.read_text(encoding="utf-8"))
    entries = json.loads(TABLE.read_text(encoding="utf-8"))["entries"]
    by_url = {r["url"].rstrip("/"): r for r in parse_nanbyou(load_manifest())}

    rows, counts, sources = [], Counter(), Counter()
    shifted = 0
    for e in entries:
        idx = e["idx"]
        record = kb[idx] if idx < len(kb) else {}
        if record.get("disease") != e["disease"]:
            shifted += 1  # 課題 47：並び順 idx のずれ。ずれていたら照合しない
            continue
        found = desc_numbers(record.get("description", ""))
        official, is_group, why_official = official_number(e["nanbyou"], by_url)
        if not found and official is None:
            continue
        if official is not None:
            sources["群" if is_group else ("○" if (e["nanbyou"].get("review") or {}).get("mark") == "○" else "機械")] += 1

        notes = []
        if found:
            desc_no = found[-1][0]
            desc_text = "、".join(f"{n}" + (f"（{q}）" if q else "") for n, q, _ in found)
            if len(found) > 1:
                notes.append(f"description に番号が {len(found)} つ（最後の {desc_no} で照合）")
            if any(q for _, q, _ in found):
                notes.append("修飾つき: " + " ／ ".join(f"「{raw}」" for _, q, raw in found if q))
        else:
            desc_no, desc_text = None, "—"

        if official is None:
            status = "公式なし"
        elif desc_no is None:
            status = "description に番号なし"
        elif desc_no == official:
            status = "一致"
        else:
            status = "不一致"
        counts[status] += 1

        official_text = "—" if official is None else (f"群番号 {official}（疾患固有ではない）" if is_group else str(official))
        basis = why_official or "難病情報センター側が完全一致・○・群のいずれでもない"
        if notes:
            basis += "<br>※ " + " ／ ".join(notes)
        rows.append((ORDER[status], idx,
                     f"| {idx} | {e['disease']}（{e.get('reading') or '—'}） | {desc_text} | {official_text} | "
                     f"{status} | {basis.replace('|', '／')} |  |"))

    rows.sort()
    lines = [
        "# 指定難病番号の照合（2026-09-25）",
        "",
        "> **判定列以外はすべて機械生成。** 人が 1 件ずつ確認したものではない。判定列はファウンダーが記入する。",
        "> 知識ファイルは変更していない。反映は判定後に別途計画する。",
        "",
        "- description の番号: 知識ファイル `description` 中の「指定難病NNN」。**信用できない前提**で突き合わせる",
        "- 公式の告示番号: `data/disease_overviews/_match_table.json` の難病情報センター側。"
        "完全一致（機械）と、ファウンダーが ○ / 群 を付けた行だけを使う",
        "- 「群番号」: 群のページで紐付いた疾患。申請上はその番号だが、疾患固有の番号ではない",
        f"- 入力の内訳: 機械の完全一致 {sources['機械']} 件 ／ ファウンダーの ○ {sources['○']} 件 ／ 群 {sources['群']} 件"
        + ("（確認シートの判定列が未記入のため、○・群はまだ 0）" if not (sources["○"] or sources["群"]) else ""),
        "- 並び: 不一致 → 公式なし → description に番号なし → 一致",
        "- 生成: `scripts/portal/reconcile_nanbyou_numbers.py`",
        "",
        "## 集計",
        "",
        "| 一致 | 不一致 | 公式なし | description に番号なし |",
        "|---:|---:|---:|---:|",
        f"| {counts['一致']} | {counts['不一致']} | {counts['公式なし']} | {counts['description に番号なし']} |",
        "",
        "## 一覧",
        "",
        "| idx | 病名（ふりがな） | description の番号 | 公式の告示番号 | 区分 | 照合根拠（機械） | 判定 |",
        "|---:|---|---|---|---|---|---|",
        *[r[2] for r in rows],
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"一致 {counts['一致']}／不一致 {counts['不一致']}／公式なし {counts['公式なし']}／"
          f"description に番号なし {counts['description に番号なし']}／idx ずれで除外 {shifted}")
    print(f"入力: 機械 {sources['機械']}／○ {sources['○']}／群 {sources['群']}")
    print(f"出力: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
