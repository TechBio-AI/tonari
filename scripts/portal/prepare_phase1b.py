#!/usr/bin/env python3
"""フェーズ1b の担当リストを作る（確認シートの ○× を apply_review.py で反映した後に流す）。

    python3 scripts/portal/prepare_phase1b.py --dry-run   # 何をするかだけ出す
    python3 scripts/portal/prepare_phase1b.py

対象（2026-09-26 ファウンダー承認）:
  難病情報センターか小児慢性の判定が、人の確認で新しく exact か group になり（machine_judgement と違う）、
  まだ data/disease_overviews/<idx>.json が無い疾患。
  - 確認シート §3・§4 に判定が空欄の行が残っている idx（ファウンダー判断待ち）は除く
  - 本文を読めるのは exact の出典だけ（群のページは links 用）。exact が無い疾患は担当リストに入れず、
    一覧に「群のみ」として残す

やること:
  1. ファウンダーの ○ で exact になった出典に、選んだ候補の取得記録（candidates[].page_fetch）を写す。
     保存 HTML の sha256 が記録と一致したときだけ写す。照合表の他の値は変えない
  2. _shards/phase1b_shard_1.json（1a と同じ idx の配列）を書く
  3. 一覧を docs/phase1b_targets_<日付>.md に書く（対象・群のみ・除外・概要あり で新しく exact）
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"
SHEET = Path("docs/disease_overview_review_2026-09-22.md")
SHARD = OVERVIEWS / "_shards" / "phase1b_shard_1.json"
JA = ("nanbyou", "shouman")
LABEL = {"nanbyou": "難病", "shouman": "小慢"}
JST = timezone(timedelta(hours=9))


def unresolved_idx(sheet_text: str) -> set[int]:
    """§3・§4 で判定が空欄の行がある idx。"""
    out: set[int] = set()
    section = None
    for line in sheet_text.splitlines():
        if line.startswith("## "):
            section = line[3:5]
        if section in ("§3", "§4") and re.match(r"^\| \d+ \|", line):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if not cells[-1]:
                out.add(int(cells[0]))
    return out


def copy_page_fetch(entries: list[dict]) -> tuple[list[str], list[str]]:
    """ファウンダーの ○ の出典に候補の取得記録を写す。(写したもの, 写せなかったもの)。"""
    copied, failed = [], []
    for e in entries:
        for s in JA:
            cell = e[s]
            if (cell.get("review") or {}).get("mark") != "○" or cell.get("page_fetch") or not cell.get("url"):
                continue
            cand = next((c for c in cell.get("candidates") or [] if c.get("url") == cell["url"]), None)
            fetch = (cand or {}).get("page_fetch")
            where = f"idx {e['idx']} {LABEL[s]} {cell['url']}"
            if not fetch:
                failed.append(f"{where}: 候補に取得記録が無い")
                continue
            path = Path(fetch["cache_file"])
            if not path.exists():
                failed.append(f"{where}: 保存 HTML が無い（{path}）")
                continue
            if hashlib.sha256(path.read_bytes()).hexdigest() != fetch["sha256"]:
                failed.append(f"{where}: 保存 HTML の sha256 が記録と違う")
                continue
            cell["page_fetch"] = dict(fetch)
            copied.append(where)
    return copied, failed


def newly_resolved(e: dict) -> list[str]:
    return [s for s in JA if "machine_judgement" in e[s] and e[s]["judgement"] != e[s]["machine_judgement"]
            and e[s]["judgement"] in ("exact", "group")]


def row(e: dict, note: str) -> str:
    j = "／".join(f"{LABEL[s]} {e[s]['judgement']}" for s in JA) + f"／Orphanet {e['orphanet']['judgement']}"
    return f"| {e['idx']} | {e['disease']}（{e.get('reading') or '—'}） | {j} | {note} |"


def main() -> int:
    parser = argparse.ArgumentParser(description="フェーズ1b の担当リストを作る")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = json.loads(TABLE.read_text(encoding="utf-8"))
    entries = data["entries"]
    have = {int(p.stem) for p in OVERVIEWS.glob("*.json") if p.stem.isdigit()}
    pending = unresolved_idx(SHEET.read_text(encoding="utf-8"))
    copied, failed = copy_page_fetch(entries)

    targets, group_only, excluded, upgrades = [], [], [], []
    for e in entries:
        if e["idx"] in pending:
            excluded.append(e)  # 判断待ちの idx は、照合表で変わったかどうかに関わらず除外として載せる
            continue
        new = newly_resolved(e)
        if not new:
            continue
        readable = [s for s in JA if e[s]["judgement"] == "exact" and e[s].get("page_fetch")]
        if e["idx"] in have:
            used = [s["id"] for s in json.loads((OVERVIEWS / f"{e['idx']}.json").read_text(encoding="utf-8"))["sources"]]
            better = [s for s in new if e[s]["judgement"] == "exact" and s not in used
                      and (used == ["orphanet"] or (s == "nanbyou" and used == ["shouman"]))]
            if better:
                upgrades.append((e, used, better))
            continue
        (targets if readable else group_only).append(e)

    targets_idx = [e["idx"] for e in targets]
    print(f"取得記録を写す: {len(copied)} 件／写せない: {len(failed)} 件")
    for line in failed:
        print("  " + line)
    print(f"1b の担当: {len(targets_idx)} 件 {targets_idx}")
    print(f"群のみ（本文なし）: {len(group_only)} 件／判断待ちで除外: {len(excluded)} 件／"
          f"概要ありで、優先順の高い日本語出典が新しく exact: {len(upgrades)} 件")
    if args.dry_run:
        print("--dry-run なので書いていません。")
        return 0

    TABLE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    SHARD.write_text(json.dumps(targets_idx, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    today = datetime.now(JST).date().isoformat()
    out = Path("docs") / f"phase1b_targets_{today}.md"
    head = "| idx | 病名（ふりがな） | 判定（照合表） | 備考 |\n|---:|---|---|---|"
    lines = [
        f"# フェーズ1b の担当リスト（{today}）", "",
        "> **すべて機械生成**（`scripts/portal/prepare_phase1b.py`）。判定列はファウンダーの ○× を反映した照合表の値。", "",
        "対象は「難病・小慢の判定が人の確認で新しく exact か群になり、まだ概要が無い疾患」。"
        "本文を読めるのは exact の出典だけ（群のページは links 用）。", "",
        f"## 1b の担当（{len(targets)} 件）→ `{SHARD}`", "", head,
        *[row(e, "読む出典: " + "・".join(LABEL[s] for s in JA if e[s]["judgement"] == "exact")) for e in targets], "",
        f"## 群のみで本文なし（{len(group_only)} 件）", "",
        "群のページは疾患のページではないので本文を取らない。概要は作らない。", "", head,
        *[row(e, "Orphanet の Definition あり" if e["orphanet"]["judgement"] == "exact" else "") for e in group_only], "",
        f"## ファウンダー判断待ちで除外（{len(excluded)} 件）", "",
        "確認シート §3・§4 に判定が空欄の行が残っている idx。", "", head,
        *[row(e, "") for e in excluded], "",
        f"## 概要ありで、優先順の高い日本語出典が新しく exact（{len(upgrades)} 件）", "",
        "今の概要より優先順（難病 > 小慢 > Orphanet）の高い出典が確定した。今回は概要を作り直していない。", "", head,
        *[row(e, f"今の概要の出典: {'・'.join(used)}／新しく exact: {'・'.join(LABEL[s] for s in better)}")
          for e, used, better in upgrades], "",
        f"## 取得記録を写せなかった出典（{len(failed)} 件）", "",
        *([f"- {line}" for line in failed] or ["（なし）"]), "",
    ]
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"書き込み: {TABLE}（取得記録のみ）、{SHARD}、{out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
