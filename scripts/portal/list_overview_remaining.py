#!/usr/bin/env python3
"""概要（data/disease_overviews/<idx>.json）がまだ無い疾患の一覧を作る。

    python3 scripts/portal/list_overview_remaining.py

理由は 1 疾患に 1 つ（上から先に当たったもの）:
  1. 案内ページのみ            … 難病情報センターの解説が下位の病型へのリンクだけ（_logs で出力見送り）
  2. 症状の節なし              … 出典に症状の節が無く、3 件以上の症状を取れない（_logs で出力見送り）
  3. §1〜§4 で判定待ち         … 難病・小慢のどちらかが「要確認」（確認シートの ○× 待ち）
  4. §5 で判定待ち             … 日本語出典なし、Orphanet のコードが「要確認」
  5. Orphanet に Definition なし … 日本語出典なし、Orphanet は完全一致だが英語 Definition が無い
  6. 3 出典とも手がかりなし
読むだけ。出力は docs/overview_remaining_2026-09-26.md だけ。
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"
ORPHA = OVERVIEWS / "_orphanet_definitions.json"
LOGS = OVERVIEWS / "_logs"
SHEET = Path("docs/disease_overview_review_2026-09-22.md")
OUT = Path("docs/overview_remaining_2026-09-26.md")

REASONS = ["案内ページのみ", "症状の節なし（抽出見送り）", "§1〜§4 で判定待ち", "§5 で判定待ち（Orphanet だけが手がかり）",
           "Orphanet に Definition なし", "3 出典とも手がかりなし"]


def skipped_in_logs() -> dict[int, str]:
    found = {}
    for log in sorted(LOGS.glob("shard_*.md")):
        section = log.read_text(encoding="utf-8").split("## 出力しなかった疾患", 1)[-1].split("\n## ", 1)[0]
        for m in re.finditer(r"^\| (\d+) \| [^|]+ \| (.+?) \|$", section, re.M):
            found[int(m.group(1))] = f"{m.group(2)}（{log.name}）"
    return found


def sheet_sections() -> dict[int, list[str]]:
    """idx → 確認シートで出てくる節（§1〜§5）。"""
    where: dict[int, list[str]] = {}
    current = None
    for line in SHEET.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^## (§\d)", line)
        if m:
            current = m.group(1)
        m = re.match(r"^\| (\d+) \|", line)
        if m and current:
            where.setdefault(int(m.group(1)), [])
            if current not in where[int(m.group(1))]:
                where[int(m.group(1))].append(current)
    return where


def main() -> int:
    entries = json.loads(TABLE.read_text(encoding="utf-8"))["entries"]
    definitions = json.loads(ORPHA.read_text(encoding="utf-8"))["definitions"]
    have = {int(p.stem) for p in OVERVIEWS.glob("*.json") if p.stem.isdigit()}
    skipped = skipped_in_logs()
    sections = sheet_sections()

    rows, counts = [], Counter()
    for e in entries:
        idx = e["idx"]
        if idx in have:
            continue
        nb, sh, op = (e[s]["judgement"] for s in ("nanbyou", "shouman", "orphanet"))
        detail = ""
        if idx in skipped and "案内" in skipped[idx]:
            reason, detail = REASONS[0], skipped[idx]
        elif idx in skipped:
            reason, detail = REASONS[1], skipped[idx]
        elif "partial" in (nb, sh):
            reason = REASONS[2]
            detail = "確認シート " + "・".join(s for s in sections.get(idx, []) if s != "§5")
            detail += "（" + "・".join(n for n, j in (("難病", nb), ("小慢", sh)) if j == "partial") + " が要確認）"
        elif op == "partial":
            reason, detail = REASONS[3], f"{e['orphanet']['orpha_code']} {e['orphanet'].get('matched_name') or ''}"
        elif op == "exact" and not (definitions.get(str(idx)) or {}).get("has_definition"):
            reason, detail = REASONS[4], f"{e['orphanet']['orpha_code']} {e['orphanet'].get('matched_name') or ''}"
        elif op == "none" and nb == "none" and sh == "none":
            reason = REASONS[5]
            detail = e["orphanet"].get("reason") or ""
        else:
            reason, detail = "その他（要確認）", f"難病 {nb} ／ 小慢 {sh} ／ Orphanet {op}"
        counts[reason] += 1
        rows.append((REASONS.index(reason) if reason in REASONS else 99, idx,
                     f"| {idx} | {e['disease']}（{e.get('reading') or '—'}） | {reason} | {detail.replace('|', '／')} |"))

    rows.sort()
    order = REASONS + [r for r in counts if r not in REASONS]
    lines = [
        "# 概要がまだ無い疾患（2026-09-26）",
        "",
        "> **すべて機械生成。** 人が 1 件ずつ確認したものではない。",
        "",
        f"- 知識ファイル {len(entries)} 疾患のうち、概要あり {len(have)} 件、**概要なし {len(rows)} 件**",
        "- 理由は 1 疾患に 1 つ。複数当てはまる場合は、下の表で上にある理由を採った",
        "- 元データ: `data/disease_overviews/_match_table.json`、`_orphanet_definitions.json`、`_logs/shard_*.md`、"
        "`docs/disease_overview_review_2026-09-22.md`",
        "- 生成: `scripts/portal/list_overview_remaining.py`",
        "",
        "## 理由別の件数",
        "",
        "| 理由 | 件数 | 意味 |",
        "|---|---:|---|",
    ]
    meaning = {
        REASONS[0]: "難病情報センターの解説が下位の病型へのリンクだけ。本文を取れない",
        REASONS[1]: "出典に症状の節が無く、症状を 3 件以上取れない",
        REASONS[2]: "難病・小慢の候補が「要確認」。○× が付けば抽出できる",
        REASONS[3]: "日本語出典なし。Orphanet のコードが「要確認」",
        REASONS[4]: "日本語出典なし。Orphanet は完全一致だが英語 Definition が無い",
        REASONS[5]: "難病・小慢・Orphanet のどれにも紐付かない",
    }
    for r in order:
        if counts[r]:
            lines.append(f"| {r} | {counts[r]} | {meaning.get(r, '')} |")
    lines += ["| 計 | " + str(sum(counts.values())) + " | |", "", "## 一覧", "",
              "| idx | 病名（ふりがな） | 理由 | 補足（機械） |", "|---:|---|---|---|", *[r[2] for r in rows], ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(" ／ ".join(f"{r} {counts[r]}" for r in order if counts[r]) + f" ／ 計 {sum(counts.values())}")
    print(f"出力: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
