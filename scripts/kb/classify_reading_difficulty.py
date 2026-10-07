#!/usr/bin/env python3
"""
疾患名を「読みが機械的に一意か」「判定が要るか」に振り分ける。

2026-09-13 の反省: 難読漢字の一覧に「嚢」だけを入れていたため、異体字の「囊」を使う
「腸管囊胞様気腫症」が素通りした。同じ字の別字体で漏れるのを防ぐため、
  1) 判定の前に NFKC 正規化をかける
  2) 異体字を代表字に畳んでから照合する
の 2 段構えにする。

使い方: python3 scripts/kb/classify_reading_difficulty.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KB = ROOT / "data" / "knowledge" / "comprehensive_rare_diseases_knowledge.json"
READINGS = ROOT / "data" / "disease_readings" / "readings.json"

# 異体字 → 代表字。NFKC では畳まれないものをここで畳む
VARIANTS = {
    "囊": "嚢", "瘡": "瘻", "靱": "靭", "頸": "頚", "淚": "涙", "塡": "填",
    "絾": "絨", "曻": "昇", "剝": "剥", "﨑": "崎", "德": "徳", "步": "歩",
}

# 読みが割れやすい・難読の漢字（代表字で持つ）
#
# 2026-09-13 ファウンダー指定の基準:
#   囊/嚢、絨、盪、瘻/瘡、癇、疸、攣、痙、膠、稀、簇、靱/靭、頸/頚
# ここに、同程度に読みが割れる字を足している。
# 髄・胆・膵・麻・痺 のような、医学で頻出し読みが一意な字は入れない
# （入れると判定対象が膨らみ、本当に迷う字が埋もれる）。
HARD = set(
    "嚢絨盪瘻癇疸攣痙膠稀簇靭頚"
    "蝸顆骼楔篩鞍穹瞼睫鞏痂疣癜瘙癬疥蕁蜘蛛鞘"
    "癱齲齦顳顴鰓靫腟膣睾嗜癲譫妄嗽喀癰癤鼡蹊踝彎搐瘂瘠羸痲癆撓齶"
)

LATIN = re.compile(r"[A-Za-z]")
DIGIT = re.compile(r"[0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅰⅱⅲ]")
GREEK = re.compile(r"[Ͱ-Ͽ]")


def fold(name: str) -> str:
    """NFKC 正規化のうえ、異体字を代表字に畳む"""
    s = unicodedata.normalize("NFKC", name)
    return "".join(VARIANTS.get(c, c) for c in s)


def reasons(name: str) -> list[str]:
    s = fold(name)
    out: list[str] = []
    if LATIN.search(s):
        out.append("英字")
    if DIGIT.search(s):
        out.append("数字・型番号")
    if GREEK.search(s):
        out.append("ギリシャ文字")
    hard = sorted({c for c in s if c in HARD})
    if hard:
        out.append("難読漢字 " + "".join(hard))
    return out


def main() -> int:
    recs = json.loads(KB.read_text(encoding="utf-8"))
    have = set(json.loads(READINGS.read_text(encoding="utf-8"))["readings"])
    kana_head = re.compile(r"^[ぁ-ゖァ-ヶ]")
    ja = re.compile(r"[ぁ-ゖァ-ヶ一-鿿]")

    pend, done = [], []
    seen: set[str] = set()
    for r in recs:
        n = r["disease"]
        if n in seen:
            continue
        seen.add(n)
        if not ja.search(n):
            continue
        (done if n in have else pend).append(n)

    print(f"読みあり {len(done)} 件 / 読みなし {len(pend)} 件")

    auto = [n for n in pend if not reasons(n) and not kana_head.match(n)]
    judge = [n for n in pend if reasons(n)]
    print(f"\n読みなしのうち 機械的に一意 {len(auto)} 件 / 判定が要る {len(judge)} 件")
    c: Counter[str] = Counter()
    for n in judge:
        for w in reasons(n):
            c[w.split(" ")[0]] += 1
    for k, v in c.most_common():
        print(f"   {k}: {v}")

    # すでに読みを付けたものを洗い直す（見落としの検出）
    missed = [(n, reasons(n)) for n in done if reasons(n)]
    print(f"\n読みを付け済みだが、いまの基準では判定が要るもの: {len(missed)} 件")
    for n, w in missed:
        print(f"   {n}  ({', '.join(w)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
