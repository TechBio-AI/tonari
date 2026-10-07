#!/usr/bin/env python3
"""確認シートの §5（Orphanet だけが要確認の行）だけを、今の Orphanet 判定で作り直す。

    python3 scripts/portal/refresh_review_s5.py --dry-run   # 件数だけ出す
    python3 scripts/portal/refresh_review_s5.py             # §5 を差し替える

- Orphanet の判定は build_match_table.judge_orphanet（2026-09-25 に型番号の統一を追加）で、
  _match_table.json に記録された病名・別名・ORPHA コードから計算し直す。
- _match_table.json は読むだけで書き換えない（page_fetch・review を失わないため）。
- §1〜§4 は 1 バイトも変えない。変えるのは §5 の本文と、冒頭の件数表の §5 行・計の行だけ。
- §5 に記入済みの判定（最後のセル）は (idx, ORPHA コード) で引き継ぐ。行が消える記入があれば止まる。
- 並び（2026-09-25 ファウンダー指示）: 日本語出典（難病・小慢）がどちらも「なし」で Orphanet しか手がかりが無い行を
  §5-A として先頭に、日本語出典が確定している行を §5-B として後ろに置く。
  §5 は「日本語出典に要確認が無い行」なので、日本語出典が要確認の行はここには来ない。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_match_table import judge_orphanet, load_orphanet  # noqa: E402
from write_review_sheet import HEADER, OUT, SRC, escape  # noqa: E402

S5_HEADING = "## §5 Orphanet だけが要確認の行"


def s5_row(e: dict, orpha: dict, mark: str) -> str:
    ours_reading = e.get("reading") or "—"
    return (f"| {e['idx']} | {escape(e['disease'])}<br>（{escape(ours_reading)}） | "
            f"{escape(orpha.get('matched_name'))}<br>（{orpha['orpha_code']}） | Orphanet | "
            f"—（URL 形式の確認待ち） | {escape(orpha['reason'])} | {mark} |")


def existing_marks(s5_text: str) -> dict[tuple[int, str], str]:
    marks = {}
    for line in s5_text.splitlines():
        m = re.match(r"^\| (\d+) \|.*?（(ORPHA:\d+)）", line)
        if m:
            mark = line.rstrip().rstrip("|").rsplit("|", 1)[-1].strip()
            if mark:
                marks[(int(m.group(1)), m.group(2))] = mark
    return marks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    entries = json.loads(SRC.read_text(encoding="utf-8"))["entries"]
    names, synonyms = load_orphanet()
    sheet = OUT.read_text(encoding="utf-8")
    head, s5_old = sheet.split(S5_HEADING, 1)
    marks = existing_marks(s5_old)

    rows_a, rows_b, kept = [], [], set()
    upgraded_from_partial, upgraded_from_none = [], []
    old_rows = sum(1 for line in s5_old.splitlines() if re.match(r"^\| \d+ \|", line))
    for e in entries:
        recorded = e["orphanet"]
        orpha = judge_orphanet(e["disease"], e.get("alternate_names") or [], recorded["orpha_code"], names, synonyms)
        if orpha["judgement"] == "exact" and recorded["judgement"] != "exact":
            (upgraded_from_partial if recorded["judgement"] == "partial" else upgraded_from_none).append(e)
        has_jp_partial = any(e[s]["judgement"] == "partial" for s in ("nanbyou", "shouman"))
        if orpha["judgement"] == "partial" and not has_jp_partial:
            key = (e["idx"], orpha["orpha_code"])
            no_jp = all(e[s]["judgement"] == "none" for s in ("nanbyou", "shouman"))
            (rows_a if no_jp else rows_b).append(s5_row(e, orpha, marks.get(key, "")))
            kept.add(key)

    rows = rows_a + rows_b
    lost = {k: v for k, v in marks.items() if k not in kept}
    if lost:
        print(f"記入済みの判定が {len(lost)} 行ぶん消えるので止めた: {lost}")
        return 1

    def label(es: list[dict]) -> str:
        return "、".join(f"{e['idx']} {e['disease']}" for e in es) or "なし"

    print(f"§5: {old_rows} 行 → {len(rows)} 行（完全一致へ格上げ {old_rows - len(rows)} 行）")
    print(f"  partial → exact: {len(upgraded_from_partial)} 件（{label(upgraded_from_partial)}）")
    print(f"  none → exact（§5 外。課題 46 の行）: {len(upgraded_from_none)} 件（{label(upgraded_from_none)}）")
    print(f"  §5-A 日本語出典なし（Orphanet だけ）: {len(rows_a)} 行 ／ §5-B 日本語出典が確定済み: {len(rows_b)} 行")
    print(f"  引き継いだ記入済み判定: {len(marks)} 行")
    if args.dry_run:
        return 0

    s5 = [
        S5_HEADING,
        "",
        "日本語の 2 出典では要確認が出ていない行です。ORPHA コードは記録済みのものをそのまま載せています。",
        "URL は形式の確認待ちのため組み立てていません。",
        "",
        "> 2026-09-25 再生成（`scripts/portal/refresh_review_s5.py`）。型番号を揃える正規化"
        "（大文字ローマ数字→算用数字、語としての type を落とす）を加えて照合し直し、"
        "完全一致になった行（527 Gordon症候群）を外した。§1〜§4 は再生成していない。",
        "> 並びは、Orphanet しか手がかりが無い行（§5-A）を先に、日本語出典が確定している行（§5-B）を後に置いた。",
        "",
        f"### §5-A 日本語出典（難病・小慢）なし：Orphanet だけが手がかり（{len(rows_a)} 行）",
        "",
        *HEADER,
        *rows_a,
        "",
        f"### §5-B 日本語出典が確定済み（{len(rows_b)} 行）",
        "",
        *HEADER,
        *rows_b,
        "",
    ]
    old_count = re.search(r"^\| §5 \| .*? \| (\d+) \|$", head, re.M)
    total = re.search(r"^\| 計 \| \| (\d+) \|$", head, re.M)
    head = head.replace(old_count.group(0), old_count.group(0).rsplit(old_count.group(1), 1)[0] + f"{len(rows)} |")
    head = head.replace(total.group(0), f"| 計 | | {int(total.group(1)) - old_rows + len(rows)} |")
    OUT.write_text(head + "\n".join(s5) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
