#!/usr/bin/env python3
"""確認シート §3（難病）・§4（小慢）の ○× の下ごしらえ（2026-09-25）。

    python3 scripts/portal/prepare_review_recommendations.py --fetch      # 未取得の候補ページを取得（直列・1 秒 1 回）
    python3 scripts/portal/prepare_review_recommendations.py --annotate   # 「機械の推奨」列を付けて並べ替え
    （両方指定で続けて実行）

取得:
  - §3・§4 の候補 URL のうち .cache/disease_sources/pages/ に無いものだけを取る。
    取得処理は fetch_disease_pages.fetch（許可ホスト・1 秒 1 回・再試行・pages_manifest.json への記録）をそのまま使う。
  - sha256 は pages_manifest.json と、照合表の候補側（<出典>.candidates[].page_fetch）に記録する。
    既に取得済みのページも、保存 HTML の sha256 を計算し直して manifest と一致したものだけ記録する。

推奨（すべて機械生成。人の判定ではない）:
  a. 候補ページの本文に当サイトの病名（別名含む）がそのまま出現するか
  b. 候補の公式名が「A／B」の併記で、当サイトの病名が A か B と一致するか
  c. 当サイトの病名が候補の公式名を含む（下位型の形）か
  d. 表記差だけ（字の類似 0.9 以上・異体字・中黒・長音・括弧書き）か
  ○ = b または d ／ 群 = c、または a で「含まれる」型の記述 ／ × = a〜d がすべて偽 ／ ? = それ以外（材料不足）

確認シートは §3・§4 の行だけを書き換える（列を 1 つ足し、推奨順に並べ替える）。§1・§2・§5 と判定列は触らない。
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_match_table import norm  # noqa: E402
from fetch_disease_pages import MANIFEST, PAGES, TABLE, fetch, key_for  # noqa: E402

SHEET = Path("docs/disease_overview_review_2026-09-22.md")
SECTIONS = {"nanbyou": ("## §3 難病情報センターの要確認", "## §4"),
            "shouman": ("## §4 小児慢性の要確認", "## §5")}
ORDER = {"○": 0, "群": 1, "?": 2, "×": 3}
REC_HEADER = "機械の推奨（機械生成）"
SIMILARITY = 0.9

# 異体字（旧字・俗字）。表記差として同一視するものだけ
VARIANTS = str.maketrans({"囊": "嚢", "頸": "頚", "蠟": "蝋", "痹": "痺", "鬪": "闘", "聯": "連",
                          "惡": "悪", "髓": "髄", "體": "体", "腦": "脳", "變": "変", "黃": "黄", "靑": "青", "靱": "靭"})
# 「含む」単独は「日本を含む」等に当たるので使わない
GROUP_WORDS = ("含まれ", "病型", "亜型", "分類され", "に分けられ", "のひとつ", "の一つ", "総称")
KANA = re.compile(r"^[ぁ-んァ-ヶー]*$")


# --------------------------------------------------------------------- 行の読み書き


def parse_row(line: str) -> dict:
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    ours, _, ours_reading = cells[1].partition("<br>")
    cand, _, cand_reading = cells[2].partition("<br>")
    return {"line": line, "cells": cells, "idx": int(cells[0]), "ours": ours.strip(),
            "cand_label": cand.strip(), "url": cells[4], "mark": cells[-1]}


def candidate_name(label: str) -> str:
    # 索引の取り込みで先頭に「）」が残っている行がある（例: 告示 18 ） 脊髄小脳変性症…）
    # ふりがなの残骸が付いた行もある（例: 告示 319 けっそんしょう） セピアプテリン…）
    return re.sub(r"^告示\s*\d+\s*[ぁ-ん]*[)）]?\s*", "", html.unescape(label)).strip()


# --------------------------------------------------------------------- 本文と正規化


def page_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style)\b.*?</\1\s*>", " ", raw, flags=re.S | re.I)
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


def fold(name: str) -> str:
    """表記差を落とした形。中黒・長音・異体字・全半角・大小文字と、英字だけの括弧書き（（Fabry）等）。

    日本語の括弧書き（（小児型）（間欠型）等）は病型を表すので落とさない。
    """
    s = unicodedata.normalize("NFKC", name).translate(VARIANTS)
    # 英字（アクセント付きを含む）だけの括弧書きは落とす。数字を含むもの（DYT1 等）は病型なので残す
    s = re.sub(r"\([A-Za-z\u00C0-\u024F .,'\-]+\)", "", s)
    s = norm(s)
    return s.replace("ー", "").replace("-", "")


def ours_names(name: str, aliases: list[str]) -> list[str]:
    """材料 a・b に使う名前。短い略号（本文に偶然出やすい）は除く。"""
    names = [name] + [a for a in aliases if len(norm(a)) >= 4 or re.search(r"[ぁ-んァ-ヶ一-龥]", a)]
    return list(dict.fromkeys(n for n in names if n))


# --------------------------------------------------------------------- 推奨


def recommend(ours: str, aliases: list[str], cand: str, body: str | None) -> tuple[str, str]:
    # b〜d は当サイトの主名だけで判定する（別名は知識ファイル由来で未検証のため、a にだけ使う）
    names = ours_names(ours, aliases)
    mine, parts = fold(ours), [p for p in re.split(r"[／/]", cand) if p.strip()]
    targets = [fold(p) for p in parts] if len(parts) > 1 else [fold(cand)]

    # b. 併記の片方と一致
    if len(parts) > 1:
        hit = next((p for p in parts if fold(p) == mine), None)
        if hit:
            return "○", f"b: 併記の片方「{hit.strip()}」が「{ours}」と一致"

    # d. 表記差だけ（完全に同じ形になる／字の類似 0.9 以上で、長さの差 1 字以内・包含関係でない）
    for t in targets:
        if t == mine:
            return "○", f"d: 表記差だけ（中黒・長音・異体字・英字の括弧書き等）「{ours}」≈「{cand}」"
    for t in targets:
        matcher = difflib.SequenceMatcher(None, mine, t)
        # 違う部分が仮名だけ（カタカナ表記の揺れ）のときだけ表記差とみなす。漢字が違えば別の語
        kana_only = all(KANA.match(mine[i1:i2]) and KANA.match(t[j1:j2])
                        for op, i1, i2, j1, j2 in matcher.get_opcodes() if op != "equal")
        if matcher.ratio() >= SIMILARITY and kana_only and t not in mine and mine not in t:
            return "○", f"d: 字の類似 {matcher.ratio():.2f}（違いは仮名だけ）「{ours}」≈「{cand}」"

    # c. 下位型の形（当サイトの病名が候補の公式名を含む）
    for t in targets:
        if t and t in mine and t != mine:
            return "群", f"c: 「{ours}」が候補名「{cand}」を含む（下位型の形）"

    alias_note = ""
    alias_hit = next((a for a in aliases if a != ours and fold(a) in targets), None)
    if alias_hit:
        alias_note = f"（※別名「{alias_hit}」が候補名と一致。別名は未検証）"

    if body is None:
        return "?", f"候補ページを取得できていない{alias_note}"

    # 候補名から括弧書きを除いた本体と、当サイトの病名との関係
    cand_core = re.sub(r"[（(].*?[）)]", "", cand).strip()
    core_parts = [fold(p) for p in re.split(r"[／/]", cand_core) if p.strip()]
    qualified = any(c == mine for c in core_parts) and cand_core != cand   # 例: 〜（〜を含む。）〜（〜に限る。）
    contains = any(mine in c and mine != c for c in core_parts)              # 例: 原発性免疫不全症 ⊂ 原発性免疫不全症候群

    # a. 本文に出現するか。出現位置の前後 60 字に、候補名（または「本症」）と「含まれる」型の語があれば群
    body_n = norm(body)
    appeared = []
    for n in names:
        key = norm(n)
        if not key or key not in body_n:
            continue
        appeared.append(n)
        if qualified or contains:
            continue
        if fold(n) in core_parts:
            continue  # 別名が候補名そのもの。候補名が本文に出るのは当然なので材料にならない
        cand_keys = [norm(x) for x in re.split(r"[／/]", cand_core) if norm(x)] + ["本症"]
        for m in re.finditer(re.escape(key), body_n):
            lo = max(0, m.start() - 60)
            window = body_n[lo: m.end() + 60]
            here = m.start() - lo
            cand_pos = [c.start() for k in cand_keys for c in re.finditer(re.escape(k), window)
                        if not (c.start() <= here < c.end())]
            word_pos = [(w, x.start()) for w in GROUP_WORDS for x in re.finditer(re.escape(w), window)]
            # 向きを見る:「候補 …には… 当サイトの病名 … 含まれる」／「当サイトの病名 は 候補 のひとつ」
            contains_us = any(cp < here and wp > here for cp in cand_pos
                              for w, wp in word_pos if w not in ("のひとつ", "の一つ"))
            one_of = any(here < cp < wp for cp in cand_pos for w, wp in word_pos if w in ("のひとつ", "の一つ"))
            if contains_us or one_of:
                return "群", f"a: 本文に「{n}」、前後に含まれる型の記述「{window}」{alias_note}"
    if appeared:
        if qualified:
            why = f"候補名は当サイトの病名に括弧書き「{cand[len(cand_core):].strip() or cand}」を付けたもの（範囲の限定・注記）"
        elif contains:
            why = "候補名が当サイトの病名を文字として含む（同一か、候補の方が狭いか、機械では区別できない）"
        else:
            why = "関係（同一・包含）は読み取れない"
        return "?", f"a: 本文に「{appeared[0]}」が出るが、{why}{alias_note}"
    note = ""
    if any(fold(n) in fold(cand) for n in names):
        note = "（※候補名が当サイトの病名を含む）"
    return "×", f"a〜d すべて偽：本文に病名も別名も出ない{note}{alias_note}"


# --------------------------------------------------------------------- 本体


def load_rows(sheet: str) -> dict[str, list[dict]]:
    rows = {}
    for source, (start, end) in SECTIONS.items():
        body = sheet.split(start, 1)[1].split(end, 1)[0]
        rows[source] = [parse_row(l) for l in body.splitlines() if re.match(r"^\| \d+ \|", l)]
    return rows


def load_manifest() -> dict:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest.setdefault("failed", {})
    return manifest


def do_fetch(rows: dict[str, list[dict]]) -> None:
    manifest = load_manifest()
    targets = {}
    for source, rs in rows.items():
        for r in rs:
            if r["url"].startswith("http"):
                targets[key_for(source, r["url"])] = r["url"]
    missing = {k: u for k, u in targets.items() if not ((PAGES / f"{k}.html").exists() and k in manifest["files"])}
    print(f"候補 URL {len(targets)} 件 / 未取得 {len(missing)} 件を取得する（直列・1 秒 1 回）")
    for i, (key, url) in enumerate(sorted(missing.items()), start=1):
        fetch(key, url, manifest)
        if i % 20 == 0:
            MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print(f"  {i}/{len(missing)}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    got = sum(1 for k in missing if k in manifest["files"])
    print(f"取得 {got} / 失敗 {len(missing) - got}")


def do_annotate(sheet: str, rows: dict[str, list[dict]]) -> str:
    manifest = load_manifest()
    data = json.loads(TABLE.read_text(encoding="utf-8"))
    entries = {e["idx"]: e for e in data["entries"]}
    counts = {s: {k: 0 for k in ORDER} for s in rows}
    recorded = sha_bad = 0
    new_sheet = sheet

    for source, rs in rows.items():
        for r in rs:
            entry = entries[r["idx"]]
            body, key = None, key_for(source, r["url"]) if r["url"].startswith("http") else None
            meta = manifest["files"].get(key) if key else None
            path = PAGES / f"{key}.html" if key else None
            if meta and path.exists():
                if hashlib.sha256(path.read_bytes()).hexdigest() == meta["sha256"]:
                    body = page_text(path)
                    for cand in entry[source].get("candidates", []):
                        if (cand.get("url") or "").rstrip("/") == r["url"].rstrip("/"):
                            cand["page_fetch"] = {"url": meta["url"], "fetched_at": meta["fetched_at"],
                                                  "sha256": meta["sha256"], "title": meta.get("title", ""),
                                                  "cache_file": f".cache/disease_sources/pages/{key}.html"}
                            recorded += 1
                else:
                    sha_bad += 1
            rec, why = recommend(r["ours"], entry.get("alternate_names") or [], candidate_name(r["cand_label"]), body)
            r["rec"], r["why"] = rec, why
            counts[source][rec] += 1

        # 並べ替えて書き戻す（判定列はそのまま最後に置く）
        start, end = SECTIONS[source]
        head, rest = new_sheet.split(start, 1)
        section, tail = rest.split(end, 1)
        lines = section.splitlines()
        first = next(i for i, l in enumerate(lines) if l.startswith("| idx |"))
        ordered = sorted(rs, key=lambda r: ORDER[r["rec"]])  # 安定ソート：同じ推奨の中は元の順
        header = lines[first].rstrip()
        if REC_HEADER not in header:
            header = header[: header.rstrip("|").rstrip().rfind("|")].rstrip() + f" | {REC_HEADER} | 判定 |"
        sep = "|" + "---:|" + "---|" * (header.count("|") - 2)
        body_rows = []
        for r in ordered:
            cells = r["cells"]
            if len(cells) == 8:  # 既に推奨列がある（再実行）
                cells = cells[:6] + [cells[7]]
            body_rows.append("| " + " | ".join(cells[:6]) + f" | {r['rec']}：{r['why'].replace('|', '／')} | {cells[6]} |")
        intro = [l for l in lines[:first] if not l.startswith("> 「機械の推奨」")]
        while intro and not intro[-1].strip():
            intro.pop()
        c = counts[source]
        intro += ["", f"> 「機械の推奨」列は機械生成（2026-09-25、`scripts/portal/prepare_review_recommendations.py`）。"
                      f"人の判定ではない。並びは推奨 ○ → 群 → ? → ×（○ {c['○']}／群 {c['群']}／? {c['?']}／× {c['×']}）。"
                      "判定列はファウンダーが記入する。", ""]
        rebuilt = "\n".join(intro + [header, sep] + body_rows) + "\n\n"
        new_sheet = head + start + rebuilt + end + tail

    TABLE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for source, label in (("nanbyou", "§3 難病"), ("shouman", "§4 小慢")):
        c = counts[source]
        print(f"{label}: ○ {c['○']}／群 {c['群']}／? {c['?']}／× {c['×']}（計 {sum(c.values())}）")
    print(f"照合表の候補側に記録した取得記録: {recorded} 件 ／ sha 不一致で本文を使わなかった: {sha_bad} 件")
    return new_sheet


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--annotate", action="store_true")
    args = parser.parse_args()
    sheet = SHEET.read_text(encoding="utf-8")
    rows = load_rows(sheet)
    if args.fetch:
        do_fetch(rows)
    if args.annotate:
        SHEET.write_text(do_annotate(sheet, rows), encoding="utf-8")
        print(f"書き出し: {SHEET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
