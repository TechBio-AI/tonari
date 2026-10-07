#!/usr/bin/env python3
"""
readings.json の読みを機械的に検証する（2026-09-13）。

検証1: 読みと病名の整合（長さ・カタカナ・語尾）
検証2: 重複と矛盾（同じ読み・同じ語幹で読みが食い違う）
検証3: 規約との整合（型は「がた」・分泌は「ぶんぴ」・記号なし・かなのみ）
検証5: 五十音の行の割り当て

使い方: python3 scripts/kb/verify_readings.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KB = ROOT / "data" / "knowledge" / "comprehensive_rare_diseases_knowledge.json"
READ = ROOT / "data" / "disease_readings" / "readings.json"

KANA_ROWS = [("あ","あいうえお"),("か","かきくけこ"),("さ","さしすせそ"),("た","たちつてと"),
             ("な","なにぬねの"),("は","はひふへほ"),("ま","まみむめも"),("や","やゆよ"),
             ("ら","らりるれろ"),("わ","わをん")]
SMALL = {"ぁ":"あ","ぃ":"い","ぅ":"う","ぇ":"え","ぉ":"お","ゃ":"や","ゅ":"ゆ","ょ":"よ",
         "っ":"つ","ゎ":"わ","ゔ":"う"}


def row_of(reading: str) -> str | None:
    c = unicodedata.normalize("NFD", reading[0])[0]
    c = SMALL.get(c, c)
    for row, chars in KANA_ROWS:
        if c in chars:
            return row
    return None


def strip_paren(s: str) -> str:
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"[（(][^（）()]*[)）]", "", s)
    return s


def kata_to_hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def main() -> int:
    readings = json.loads(READ.read_text(encoding="utf-8"))["readings"]
    names = {r["disease"] for r in json.loads(KB.read_text(encoding="utf-8"))}
    issues: dict[str, list[str]] = defaultdict(list)

    for name, v in readings.items():
        r = v["reading"]
        base = strip_paren(name)

        # --- 検証3: かなと長音符だけ / 記号が入っていない
        if not re.fullmatch(r"[ぁ-ゟー]+", r):
            issues["3 かな以外を含む"].append(f"{name} → {r}")
        for sym in "・/／-－—()（）;；、。 　":
            if sym in r:
                issues["3 記号を含む"].append(f"{name} → {r}")
                break

        # --- 検証1: 長さ。漢字1字あたり1〜5文字を目安に、上下に外れるもの
        kanji = len(re.findall(r"[一-鿿]", base))
        kana_in_name = len(re.findall(r"[ぁ-ゖァ-ヶー]", base))
        lo = kanji * 1 + kana_in_name * 0.5
        hi = kanji * 5 + kana_in_name * 1.5 + 6
        if kanji and not (lo <= len(r) <= hi):
            issues["1 長さが目安から外れる"].append(f"{name}（漢字{kanji}字）→ {r}（{len(r)}字）")

        # --- 検証1: 病名のカタカナが読みに現れるか
        for kata in re.findall(r"[ァ-ヶー]{3,}", base):
            if kata_to_hira(kata) not in r:
                issues["1 カタカナが読みに無い"].append(f"{name} のカタカナ「{kata}」→ {r}")

        # --- 検証1: 語尾
        for suf, yomi in (("症", "しょう"), ("病", "びょう"), ("型", "がた"), ("症候群", "しょうこうぐん")):
            if base.endswith(suf) and not r.endswith(yomi):
                issues[f"1 語尾「{suf}」なのに読みが「{yomi}」で終わらない"].append(f"{name} → {r}")
                break

        # --- 検証3: 規約
        if re.search(r"[0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]型", base) and "がた" not in r:
            issues["3 型番号なのに「がた」が無い"].append(f"{name} → {r}")
        if "分泌" in base and "ぶんぴつ" in r:
            issues["3 分泌が「ぶんぴつ」"].append(f"{name} → {r}")

        # --- 検証5: 行
        if row_of(r) is None:
            issues["5 行を決められない"].append(f"{name} → {r}")

    # --- 検証2: 同じ読み
    same: dict[str, list[str]] = defaultdict(list)
    for name, v in readings.items():
        same[v["reading"]].append(name)
    dup = {k: v for k, v in same.items() if len(v) > 1}

    # --- 検証2: 同じ語幹で読みが食い違う
    def stem(s: str) -> str:
        s = strip_paren(s)
        return re.sub(r"[0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[AB]?型", "", s)

    by_stem: dict[str, set[str]] = defaultdict(set)
    for name, v in readings.items():
        st = stem(name)
        if len(st) >= 4:
            head = re.sub(r"(いち|に|さん|よん|ご|ろく|なな|はち|きゅう|じゅう[いちにさんよんごろくななはち]*)?がた$", "", v["reading"])
            by_stem[st].add(head)
    conflict = {k: v for k, v in by_stem.items() if len(v) > 1}

    total = sum(len(v) for v in issues.values())
    print(f"読み {len(readings)} 件を検証\n")
    for k in sorted(issues):
        print(f"■ {k}: {len(issues[k])} 件")
        for line in issues[k][:40]:
            print("   ", line)
        if len(issues[k]) > 40:
            print(f"    …ほか {len(issues[k]) - 40} 件")
        print()
    print(f"■ 2 同じ読みを持つ疾患: {len(dup)} 組")
    for r, v in sorted(dup.items(), key=lambda x: -len(x[1]))[:25]:
        print(f"    {r} … {v}")
    print(f"\n■ 2 同じ語幹で読みが食い違う: {len(conflict)} 組")
    for st, v in list(conflict.items())[:25]:
        print(f"    {st} … {sorted(v)}")
    print(f"\n指摘の合計（検証1・3・5）: {total} 件")
    print("鍵が実在しない:", [k for k in readings if k not in names] or "なし")
    return 0


if __name__ == "__main__":
    sys.exit(main())
