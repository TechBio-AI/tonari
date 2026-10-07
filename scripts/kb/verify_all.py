#!/usr/bin/env python3
"""読みの全件機械検証（2026-09-14）。検出されたものだけを出す。"""
from __future__ import annotations
import json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KB = ROOT / "data" / "knowledge" / "comprehensive_rare_diseases_knowledge.json"
READ = ROOT / "data" / "disease_readings" / "readings.json"

def strip_paren(s: str) -> str:
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"[（(][^（）()]*[)）]", "", s)
    return s

def k2h(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)

def fold(x: str) -> str:
    x = unicodedata.normalize("NFD", x)
    return "".join(c for c in x if c not in "゙゚").replace("ー", "")

# 読みが一意に決まる形態素。促音便を許す
MORPH = {
 "遺伝性":"いでんせい","先天性":"せんてんせい","後天性":"こうてんせい","特発性":"とくはつせい",
 "原発性":"げんぱつせい","続発性":"ぞくはつせい","常染色体":"じょうせんしょくたい",
 "症候群":"しょうこうぐん","欠損症":"けっそんしょう","欠乏症":"けつぼうしょう",
 "異形成症":"いけいせいしょう","筋ジストロフィー":"きんじすとろふぃー","ミオパチー":"みおぱちー",
 "ニューロパチー":"にゅーろぱちー","アミロイドーシス":"あみろいどーしす","因子":"いんし",
 "腎":"じん","肺":"はい","膵":"すい","髄":"ずい","脳":"のう","眼":"がん","皮膚":"ひふ",
 "白血病":"はっけつびょう","腫瘍":"しゅよう","硬化症":"こうかしょう","貧血":"ひんけつ",
}
SOK = {"こつ":"こっ","はつ":"はっ","けつ":"けっ","しつ":"しっ"}

def main() -> int:
    R = json.loads(READ.read_text(encoding="utf-8"))["readings"]
    names = {r["disease"] for r in json.loads(KB.read_text(encoding="utf-8"))}
    out: dict[str, list[str]] = defaultdict(list)

    for n, v in R.items():
        r, base = v["reading"], strip_paren(n)

        # 1 カタカナと読みの 1 文字ずつ照合
        for kata in re.findall(r"[ァ-ヶー]{2,}", base):
            want = k2h(kata)
            if want in r:
                continue
            out["1 カタカナと読みが食い違う" if fold(want) not in fold(r)
                else "1 長音・濁点の差で食い違う"].append(f"{n}「{kata}」→ {r}")

        # 2 形態素の読みの一貫性
        for mo, y in MORPH.items():
            if mo not in base:
                continue
            alt = SOK.get(y[-2:], "")
            if not any(c in r for c in [y] + ([y[:-2] + alt] if alt else [])):
                out["2 形態素の読みが見当たらない"].append(f"{n}（{mo}＝{y}）→ {r}")

        # 4 促音・拗音・長音の脱落
        for sp in re.findall(r"[ッャュョ]", base):
            if r.count(k2h(sp)) < base.count(sp):
                out["4 促音・拗音の脱落"].append(f"{n}「{sp}」→ {r}")
                break
        if base.count("ー") > r.count("ー"):
            out["4 長音符の脱落"].append(f"{n}（病名に ー が {base.count('ー')}、読みに {r.count('ー')}）→ {r}")

        # 5 ひらがなと長音符以外
        if not re.fullmatch(r"[ぁ-ゟー]+", r):
            out["5 ひらがな・長音符以外を含む"].append(f"{n} → {r}")

        # 6 長さ
        kanji = len(re.findall(r"[一-鿿]", base))
        kana = len(re.findall(r"[ぁ-ゖァ-ヶー]", base))
        if kanji and not (kanji + kana * 0.5 <= len(r) <= kanji * 5 + kana * 1.5 + 6):
            out["6 長さが目安から外れる"].append(f"{n}（漢字{kanji}）→ {r}（{len(r)}字）")

    # 3 同じ語幹で読みが食い違う
    by: dict[str, set[str]] = defaultdict(set)
    for n, v in R.items():
        st = re.sub(r"[0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[AB]?型", "", strip_paren(n))
        if len(st) >= 4:
            by[st].add(re.sub(r"(いち|に|さん|よん|ご|ろく|なな|はち|きゅう|じゅう[^が]*)?がた$", "", v["reading"]))
    for st, s in by.items():
        if len(s) > 1:
            out["3 同じ語幹で読みが食い違う"].append(f"{st} … {sorted(s)}")

    # 7 鍵の整合
    for k in R:
        if k not in names:
            out["7 読みの鍵が知識ファイルに無い"].append(k)
    for n in names:
        if n not in R:
            out["7 読みを持たない疾患"].append(n)

    print(f"検証した読み: {len(R)} 件 / 疾患: {len(names)} 件\n")
    print("| 検査 | 検出件数 |")
    print("|---|---|")
    keys = ["1 カタカナと読みが食い違う", "1 長音・濁点の差で食い違う", "2 形態素の読みが見当たらない",
            "3 同じ語幹で読みが食い違う", "4 促音・拗音の脱落", "4 長音符の脱落",
            "5 ひらがな・長音符以外を含む", "6 長さが目安から外れる",
            "7 読みの鍵が知識ファイルに無い", "7 読みを持たない疾患"]
    for k in keys:
        print(f"| {k} | {len(out.get(k, []))} |")
    print()
    for k in keys:
        if out.get(k):
            print(f"■ {k}")
            for line in out[k]:
                print("   ", line)
            print()
    return 0

if __name__ == "__main__":
    sys.exit(main())
