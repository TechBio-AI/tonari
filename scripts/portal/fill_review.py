#!/usr/bin/env python3
"""ファウンダーの指示（「§3 は推奨どおり、ただし idx … は群、idx … は ×」）を確認シートの判定列に書き込む。

    python3 scripts/portal/fill_review.py --section 3 --default 推奨どおり --set 9=群 --set 197=× --dry-run
    python3 scripts/portal/fill_review.py --section 3 --default 推奨どおり --set 9=群 --set 197=×

ファウンダーの指示文をそのまま渡す形（2026-09-26）:

    python3 scripts/portal/fill_review.py --order "§3・§4 推奨どおり。例外：idx 498 は群" --dry-run

  文は「。」か改行で区切る。書ける文は 2 種類:
    節の文   … 「§3・§4 推奨どおり」「§1 は ×」「§5 は 空欄」（節は ・ 、 , と で並べる）
    例外の文 … 「例外：idx 498 は群、idx 350@entry/31 は ○」（idx は省略可、「498=群」「498 群」も可）
  例外は、指示文に出てくる節のうちその idx がある節すべてに当てる（無ければ止まる）。
  1 つの節だけに当てたいときは「§4 idx 9 は ×」のように節を前に付ける。
  読めない文が 1 つでもあれば、何も書かずに止まる。全部の節を確かめてから一度に書く。

引数:
  --section   節の番号（1〜5）。書き込むのはその節の行だけ
  --default   例外以外の行に書く記号。「推奨どおり」（機械の推奨列の記号をそのまま写す。§3・§4 のみ）／○／×／群／?／空欄
  --set       例外。idx=記号（その idx の節内の全行）、または idx@URL の末尾=記号（1 行だけ。同じ idx に候補が複数あるとき）
              何度でも指定できる。記号に「空欄」を指定すると判定を消す
  --overwrite 既に記入済みの判定と違う記号を書くときに必要。無ければ食い違いを一覧にして止まる
  --dry-run   書かずに、反映内容の一覧だけ出す

安全装置（どれかに当たると何も書かずに止まる）:
  - --set の idx がその節に無い／idx@URL がどの行にも当たらない／1 つの idx@URL が複数行に当たる
  - 記入の結果、同じ idx・同じ出典に ○ が 2 つ以上（apply_review.py が止まる形）
  - 既存の記入と食い違う（--overwrite なし）
書き換えるのは判定列（各行の最後のセル）だけ。行の順・他の列・他の節は触らない。
反映は別途 scripts/portal/apply_review.py で行う（このスクリプトは照合表を触らない）。
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

SHEET = Path("docs/disease_overview_review_2026-09-22.md")
MARKS = {"○", "×", "群", "?"}
BLANK = "空欄"
FOLLOW = "推奨どおり"


class FillError(SystemExit):
    pass


def normalize_mark(mark: str) -> str:
    mark = mark.strip().replace("？", "?").replace("〇", "○").replace("x", "×").replace("X", "×")
    if mark == BLANK:
        return ""
    if mark not in MARKS:
        raise FillError(f"記号が読めません: {mark!r}（○ × 群 ? 空欄 のどれか）")
    return mark


def parse_sets(items: list[str]) -> list[tuple[int, str | None, str]]:
    sets = []
    for item in items:
        m = re.fullmatch(r"\s*(\d+)(?:@(\S+?))?\s*=\s*(\S+)\s*", item)
        if not m:
            raise FillError(f"--set の形が違います: {item!r}（例: 9=群、350@08_01_003=○）")
        sets.append((int(m.group(1)), m.group(2), normalize_mark(m.group(3))))
    return sets


def section_bounds(lines: list[str], section: int) -> tuple[int, int]:
    start = next((i for i, l in enumerate(lines) if l.startswith(f"## §{section}")), None)
    if start is None:
        raise FillError(f"確認シートに §{section} がありません")
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return start, end


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def fill(sheet_text: str, section: int, default: str, set_items: list[str],
         overwrite: bool = False) -> tuple[str, list[dict]]:
    """(書き換え後のシート, 変更の一覧) を返す。問題があれば FillError。"""
    default_mark = default if default == FOLLOW else normalize_mark(default)
    sets = parse_sets(set_items)
    lines = sheet_text.split("\n")
    start, end = section_bounds(lines, section)

    rows = []
    has_rec = False
    for i in range(start, end):
        line = lines[i]
        if line.startswith("| idx |") and "機械の推奨" in line:
            has_rec = True
        if re.match(r"^\| \d+ \|", line):
            cells = split_row(line)
            rows.append({"i": i, "cells": cells, "idx": int(cells[0]), "url": cells[4],
                         "source": cells[3], "rec": cells[6][:1] if len(cells) == 8 else "",
                         "current": cells[-1].replace("？", "?")})
    if default_mark == FOLLOW and not has_rec:
        raise FillError(f"§{section} には「機械の推奨」列が無いので「{FOLLOW}」は使えません")

    # 例外の当て先を決める
    target: dict[int, str] = {}
    idx_in_section = {r["idx"] for r in rows}
    for idx, url_tail, mark in sets:
        if idx not in idx_in_section:
            raise FillError(f"--set {idx}: idx {idx} は §{section} にありません")
        hits = [r for r in rows if r["idx"] == idx and (url_tail is None or r["url"].rstrip("/").endswith(url_tail.rstrip("/")))]
        if not hits:
            raise FillError(f"--set {idx}@{url_tail}: 当たる行がありません")
        if url_tail is not None and len(hits) > 1:
            raise FillError(f"--set {idx}@{url_tail}: {len(hits)} 行に当たります。URL の末尾をもっと長く指定してください")
        for r in hits:
            target[r["i"]] = mark

    changes, conflicts = [], []
    for r in rows:
        if r["i"] in target:
            new, why = target[r["i"]], "例外"
        elif default_mark == FOLLOW:
            new, why = r["rec"], "推奨どおり"
            if new not in MARKS:
                raise FillError(f"idx {r['idx']}: 推奨列の記号が読めません: {r['cells'][6][:10]!r}")
        else:
            new, why = default_mark, "既定"
        if r["current"] and r["current"] != new and not overwrite:
            conflicts.append(f"  idx {r['idx']} {r['cells'][2][:30]}: 記入済み {r['current']} → {new or '空欄'}")
            continue
        r["new"] = new
        if new != r["current"]:
            changes.append({"idx": r["idx"], "ours": r["cells"][1].split("<br>")[0], "candidate": r["cells"][2].split("<br>")[0],
                            "rec": r["rec"], "old": r["current"], "new": new, "why": why})
    if conflicts:
        raise FillError("既に記入済みの判定と食い違います（--overwrite で上書き）。何も書いていません:\n" + "\n".join(conflicts))

    # 1 疾患・1 出典に ○ は 1 つまで
    circles = defaultdict(list)
    for r in rows:
        if r.get("new", r["current"]) == "○":
            circles[(r["idx"], r["source"])].append(r["cells"][2].split("<br>")[0])
    dup = {k: v for k, v in circles.items() if len(v) > 1}
    if dup:
        detail = "\n".join(f"  idx {k[0]}（{k[1]}）: " + " ／ ".join(v) for k, v in sorted(dup.items()))
        raise FillError("同じ疾患・同じ出典に ○ が 2 つ以上になります。idx@URL の末尾で 1 行ずつ指定してください。"
                        "何も書いていません:\n" + detail)

    for r in rows:
        if "new" in r and r["new"] != r["current"]:
            line = lines[r["i"]].rstrip()
            lines[r["i"]] = line[: line.rstrip("|").rstrip().rfind("|") + 1] + (f" {r['new']} |" if r["new"] else "  |")
    return "\n".join(lines), changes


SECTION_LIST = r"§\s*[1-5](?:\s*[・、,，と]\s*§?\s*[1-5])*"
MARK_WORD = r"推奨どおり|空欄|[○〇×xX群?？]"


def _section_numbers(text: str) -> list[int]:
    return [int(n) for n in re.findall(r"[1-5]", text)]


def parse_order(order: str) -> tuple[list[tuple[int, str]], list[tuple[list[int] | None, str]]]:
    """指示文を ([(節, 既定の記号)], [(当てる節 or None, "idx@URL=記号")]) に分ける。読めなければ FillError。"""
    defaults: list[tuple[int, str]] = []
    exceptions: list[tuple[list[int] | None, str]] = []
    for sentence in re.split(r"[。\n]|[、，,]\s*(?=例外)", order):
        sentence = sentence.strip().rstrip("．.")
        if not sentence:
            continue
        m = re.fullmatch(rf"({SECTION_LIST})\s*(?:は)?\s*({MARK_WORD})", sentence)
        if m:
            for s in _section_numbers(m.group(1)):
                if any(s == d[0] for d in defaults):
                    raise FillError(f"§{s} が指示文に 2 回出てきます: {order!r}")
                defaults.append((s, m.group(2) if m.group(2) == FOLLOW else normalize_mark(m.group(2))))
            continue
        m = re.fullmatch(r"例外\s*[:：]?\s*(.+)", sentence)
        if not m:
            raise FillError(f"指示文のこの部分が読めません: {sentence!r}（例:「§3・§4 推奨どおり」「例外：idx 498 は群」）")
        for item in re.split(r"\s*[、，,]\s*", m.group(1)):
            im = re.fullmatch(rf"(?:({SECTION_LIST})\s*(?:の)?\s*)?(?:idx\s*)?(\d+)(?:\s*@\s*(\S+?))?(?:\s*(?:は|=|＝)\s*|\s+)({MARK_WORD})",
                              item.strip())
            if not im:
                raise FillError(f"例外のこの部分が読めません: {item!r}（例:「idx 498 は群」「idx 350@entry/31 は ○」）")
            only = _section_numbers(im.group(1)) if im.group(1) else None
            if im.group(4) == FOLLOW:
                raise FillError(f"例外に「{FOLLOW}」は書けません: {item!r}")
            tail = f"@{im.group(3)}" if im.group(3) else ""
            exceptions.append((only, f"{im.group(2)}{tail}={im.group(4)}"))
    if not defaults:
        raise FillError(f"指示文に節の文（例:「§3・§4 推奨どおり」）がありません: {order!r}")
    return defaults, exceptions


def section_rows(sheet_text: str, section: int) -> list[tuple[int, str]]:
    """節の (idx, URL) の一覧。"""
    lines = sheet_text.split("\n")
    start, end = section_bounds(lines, section)
    return [(int(c[0]), c[4]) for l in lines[start:end] if re.match(r"^\| \d+ \|", l) for c in [split_row(l)]]


def _hits(rows: list[tuple[int, str]], idx: int, url_tail: str | None) -> bool:
    return any(i == idx and (url_tail is None or u.rstrip("/").endswith(url_tail.rstrip("/"))) for i, u in rows)


def fill_order(sheet_text: str, order: str, overwrite: bool = False) -> tuple[str, list[tuple[int, list[dict]]]]:
    """指示文どおりに複数の節へ書く。全部の節で問題が無いときだけ書き換え後のシートを返す。"""
    defaults, exceptions = parse_order(order)
    named = [s for s, _ in defaults]
    per_section: dict[int, list[str]] = {s: [] for s in named}
    for only, item in exceptions:
        m = re.match(r"(\d+)(?:@(\S+?))?=", item)
        idx, url_tail = int(m.group(1)), m.group(2)
        scope = only if only is not None else named
        for s in scope:
            if s not in per_section:
                raise FillError(f"例外 {item} の §{s} は指示文の節の文にありません")
        # idx@URL は、その URL の行がある節にだけ当てる
        hits = [s for s in scope if _hits(section_rows(sheet_text, s), idx, url_tail)]
        if not hits:
            where = f"idx {idx}" + (f"@{url_tail} の行" if url_tail else "")
            raise FillError(f"例外 {item}: {where} は " + "・".join(f"§{s}" for s in scope) + " のどれにもありません")
        for s in hits:
            per_section[s].append(item)

    text, results = sheet_text, []
    for s, default in defaults:
        text, changes = fill(text, s, default, per_section[s], overwrite)
        results.append((s, changes))
    return text, results


def print_changes(section: int, changes: list[dict]) -> None:
    counts = defaultdict(int)
    for c in changes:
        counts[c["new"] or BLANK] += 1
    print(f"§{section}: 書き込む行 {len(changes)}（" + "／".join(f"{k} {v}" for k, v in sorted(counts.items())) + "）")
    for c in changes:
        print(f"  idx {c['idx']:>3} {c['ours'][:22]} ⇒ {c['candidate'][:26]}  推奨 {c['rec'] or '—'}  "
              f"{c['old'] or '空欄'} → {c['new'] or '空欄'}（{c['why']}）")


def main() -> int:
    parser = argparse.ArgumentParser(description="確認シートの判定列に、ファウンダーの指示を書き込む")
    parser.add_argument("--order", help="ファウンダーの指示文（例:「§3・§4 推奨どおり。例外：idx 498 は群」）")
    parser.add_argument("--section", type=int, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--default", help=f"{FOLLOW} ／ ○ ／ × ／ 群 ／ ? ／ {BLANK}")
    parser.add_argument("--set", dest="sets", action="append", default=[], help="idx=記号 または idx@URL末尾=記号")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sheet", type=Path, default=SHEET, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.order is not None and (args.section or args.default or args.sets):
        parser.error("--order と --section / --default / --set は一緒に使えません")
    if args.order is None and (args.section is None or args.default is None):
        parser.error("--order か、--section と --default の両方が必要です")

    sheet_text = args.sheet.read_text(encoding="utf-8")
    try:
        if args.order is not None:
            new_text, results = fill_order(sheet_text, args.order, args.overwrite)
        else:
            new_text, changes = fill(sheet_text, args.section, args.default, args.sets, args.overwrite)
            results = [(args.section, changes)]
    except FillError as e:
        print(str(e), file=sys.stderr)
        return 1

    for section, changes in results:
        print_changes(section, changes)
    if args.dry_run:
        print("--dry-run なので書いていません。")
        return 0
    args.sheet.write_text(new_text, encoding="utf-8")
    print(f"書き込み: {args.sheet}（反映は scripts/portal/apply_review.py）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
