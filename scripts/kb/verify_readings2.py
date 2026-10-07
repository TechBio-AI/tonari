#!/usr/bin/env python3
"""
readings.json の追加検証（2026-09-13、検証6〜9）。

検証6: 病名のカタカナと読みを 1 文字ずつ照合（脱字の検出）
検証7: 形態素の読みが一貫しているか（腎=じん、症=しょう 等）
検証8: 長音の脱落（えい / おう / うう が長音符であるべきか）
検証9: 促音・拗音の脱落（ッ ャュョ が読みに無い）

使い方: python3 scripts/kb/verify_readings2.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
READ = ROOT / "data" / "disease_readings" / "readings.json"


def strip_paren(s: str) -> str:
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"[（(][^（）()]*[)）]", "", s)
    return s


def kata_to_hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


# 読みが一意に決まる形態素。促音便（こつ→こっ）は照合時に許す
MORPHEMES = {
    "遺伝性": "いでんせい", "先天性": "せんてんせい", "後天性": "こうてんせい",
    "特発性": "とくはつせい", "原発性": "げんぱつせい", "続発性": "ぞくはつせい",
    "常染色体": "じょうせんしょくたい", "症候群": "しょうこうぐん",
    "欠損症": "けっそんしょう", "欠乏症": "けつぼうしょう", "異形成症": "いけいせいしょう",
    "筋ジストロフィー": "きんじすとろふぃー", "ミオパチー": "みおぱちー",
    "ニューロパチー": "にゅーろぱちー", "アミロイドーシス": "あみろいどーしす",
    "腎": "じん", "肺": "はい", "肝": "かん", "膵": "すい", "脾": "ひ",
    "髄": "ずい", "脳": "のう", "眼": "がん", "耳": "じ", "皮膚": "ひふ",
    "血症": "けっしょう", "尿症": "にょうしょう", "貧血": "ひんけつ",
    "白血病": "はっけつびょう", "腫瘍": "しゅよう", "硬化症": "こうかしょう",
}
SOKUON = {"こつ": "こっ", "はつ": "はっ", "けつ": "けっ", "しつ": "しっ", "がく": "がっ"}


def main() -> int:
    readings = json.loads(READ.read_text(encoding="utf-8"))["readings"]
    out: dict[str, list[str]] = defaultdict(list)

    for name, v in readings.items():
        r = v["reading"]
        base = strip_paren(name)

        # --- 検証6: カタカナを 1 文字ずつ照合 -------------------------------
        for kata in re.findall(r"[ァ-ヶー]{2,}", base):
            want = kata_to_hira(kata)
            if want in r:
                continue
            # 長音符・濁点を畳めば一致するか
            def fold(x: str) -> str:
                x = unicodedata.normalize("NFD", x)
                x = "".join(c for c in x if c not in "゙゚")
                return x.replace("ー", "")
            if fold(want) in fold(r):
                out["6 カタカナと読みが長音・濁点の差で食い違う"].append(f"{name}「{kata}」→ {r}")
            else:
                out["6 カタカナが読みに無い（脱字の疑い）"].append(f"{name}「{kata}」→ {r}")

        # --- 検証9: 促音・拗音 ---------------------------------------------
        for sp in re.findall(r"[ッャュョ]", base):
            want = kata_to_hira(sp)
            if r.count(want) < base.count(sp):
                out["9 促音・拗音が読みに足りない"].append(f"{name}「{sp}」→ {r}")
                break

        # --- 検証7: 形態素の読みが一貫しているか ----------------------------
        for m, y in MORPHEMES.items():
            if m not in base:
                continue
            alt = SOKUON.get(y[-2:], "")
            cands = [y] + ([y[:-2] + alt] if alt else [])
            if not any(c in r for c in cands):
                out["7 形態素の読みが見当たらない"].append(f"{name}（{m}＝{y}）→ {r}")

        # --- 検証8: 長音の脱落 ---------------------------------------------
        if re.search(r"えい|おう|うう", r):
            # ラテン文字の綴りが元にあるものは長音符であるべき可能性が高い
            if re.search(r"[A-Za-z]", base):
                out["8 長音か迷うもの（病名に英字あり）"].append(f"{name} → {r}")

    total = 0
    for k in sorted(out):
        print(f"■ {k}: {len(out[k])} 件")
        for line in out[k][:60]:
            print("   ", line)
        if len(out[k]) > 60:
            print(f"    …ほか {len(out[k]) - 60} 件")
        print()
        total += len(out[k])
    print(f"検証した読み: {len(readings)} 件 / 指摘: {total} 件")
    return 0


if __name__ == "__main__":
    sys.exit(main())
