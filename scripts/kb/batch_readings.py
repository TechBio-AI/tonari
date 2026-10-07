#!/usr/bin/env python3
"""
読みの確認用バッチを出す（2026-09-13）。

読みの五十音順に並べ、50 件ずつ、行（あ・か・さ…）で区切って出力する。
難読漢字にはふりがなを添える。出力前にバッチ内で自己検証する。

使い方:
  python3 scripts/kb/batch_readings.py あ 1     # あ行の 1 つ目の 50 件
  python3 scripts/kb/batch_readings.py --rows   # 行ごとの件数とバッチ数
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

# 難読漢字 → ふりがな（1 字単位）。迷うものは入れる（過剰なほうが安全）
RUBY = {
 "囊":"のう","嚢":"のう","絨":"じゅう","盪":"とう","瘻":"ろう","瘡":"そう","癇":"かん","疸":"だん",
 "攣":"れん","痙":"けい","膠":"こう","稀":"き","簇":"ぞく","靱":"じん","靭":"じん","頸":"けい","頚":"けい",
 "蹠":"せき","鰓":"さい","疱":"ほう","眩":"げん","翳":"えい","瘤":"りゅう","癒":"ゆ","疥":"かい",
 "膿":"のう","疽":"そ","癬":"せん","窩":"か","瞼":"けん","痺":"ひ","弯":"わん","彎":"わん","骼":"かく",
 "蝸":"か","顆":"か","篩":"し","錐":"すい","臍":"さい","蹊":"けい","踝":"か","癱":"たん","痂":"か",
 "疣":"ゆう","癜":"でん","瘙":"そう","蕁":"じん","鞘":"しょう","齲":"う","齦":"ぎん","顳":"しょう",
 "顴":"けん","靫":"さい","腟":"ちつ","膣":"ちつ","睾":"こう","嗜":"し","癲":"てん","譫":"せん",
 "嗽":"そう","喀":"かく","癰":"よう","癤":"せつ","鼡":"そ","搐":"ちく","瘂":"あ","瘠":"せき",
 "羸":"るい","痲":"ま","癆":"ろう","撓":"とう","齶":"がく","楔":"けつ","鞍":"あん","穹":"きゅう",
 "鞏":"きょう","蜘":"ち","蛛":"ちゅ","壊":"え","膵":"すい","蒼":"そう","狭":"きょう","窄":"さく",
 "萎":"い","縮":"しゅく","褥":"じょく","瀰":"び","躄":"へき","痒":"よう","疳":"かん","蝕":"しょく",
}


def row_of(reading: str) -> str | None:
    c = unicodedata.normalize("NFD", reading[0])[0]
    c = SMALL.get(c, c)
    for row, chars in KANA_ROWS:
        if c in chars:
            return row
    return None


def kata_to_hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def ruby(name: str) -> str:
    """難読漢字にふりがなを添える。病名の括弧の中には付けない。

    2026-09-14: 「環軸椎脱臼（先天性）」の括弧内の「先天性」にふりがなを付けてしまった。
    病名の一部である括弧と、ふりがなの括弧が見分けられなくなるため、括弧の外だけに付ける。
    """
    out: list[str] = []
    depth = 0
    for c in name:
        if c in "（(":
            depth += 1
        elif c in "）)":
            depth = max(0, depth - 1)
        out.append(f"{c}（{RUBY[c]}）" if (c in RUBY and depth == 0) else c)
    return "".join(out)


def strip_paren(s: str) -> str:
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"[（(][^（）()]*[)）]", "", s)
    return s


def kind_of(name: str) -> str:
    """病名の文字種。2026-09-13: 「てんかん」を「カタカナのみ」と誤分類したため区分を足した"""
    if re.fullmatch(r"[\u3041-\u3096ー]+", name):
        return "ひらがなのみ"
    if re.fullmatch(r"[\u30a1-\u30f6ー・]+", name):
        return "カタカナのみ"
    if re.fullmatch(r"[\u3041-\u3096\u30a1-\u30f6ー・]+", name):
        return "かなのみ"
    return ""


def load() -> list[tuple[str, str, int, str]]:
    """(病名, 読み, 根拠レベル, note) を読みの五十音順に"""
    readings = json.loads(READ.read_text(encoding="utf-8"))["readings"]
    names = {r["disease"] for r in json.loads(KB.read_text(encoding="utf-8"))}
    out = []
    for n in names:
        v = readings.get(n)
        if v:
            out.append((n, v["reading"], v["level"], v.get("note", "")))
        else:
            # カナで始まる病名は、病名そのものを読みの代わりに使う
            out.append((n, kata_to_hira(n), -1, "カナ始まりの病名。読みを持たず病名で並ぶ"))
    out.sort(key=lambda x: x[1])
    return out


def self_check(batch: list[tuple[str, str, int, str]]) -> list[str]:
    """バッチ内の自己検証。語幹の一貫性・カタカナ照合・促音拗音長音"""
    msgs: list[str] = []
    # カタカナ照合
    for n, r, lv, _ in batch:
        base = strip_paren(n)
        for kata in re.findall(r"[ァ-ヶー]{2,}", base):
            if kata_to_hira(kata) not in r:
                msgs.append(f"カタカナ不一致: {n}「{kata}」→ {r}")
        for sp in re.findall(r"[ッャュョ]", base):
            if r.count(kata_to_hira(sp)) < base.count(sp):
                msgs.append(f"促音・拗音の不足: {n}「{sp}」→ {r}")
                break
    # 語幹の一貫性
    by: dict[str, set[str]] = defaultdict(set)
    for n, r, lv, _ in batch:
        st = re.sub(r"[0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[AB]?型", "", strip_paren(n))
        if len(st) >= 4:
            by[st].add(re.sub(r"(いち|に|さん|よん|ご|ろく|なな|はち|きゅう|じゅう[^が]*)?がた$", "", r))
    for st, v in by.items():
        if len(v) > 1:
            msgs.append(f"同じ語幹で読みが食い違う: {st} … {sorted(v)}")
    return msgs


def verify_table(rows: list[tuple[str, str, int, str]]) -> list[str]:
    """出力する表そのものを検算する（2026-09-14 ファウンダー指示）。

    私が一覧を書くときに打ち間違えると、ファウンダーは誤った病名を見て判定してしまう。
    キリル文字「м」をカタカナ「マ」の代わりに書いた事故を受けて足した。

    1. 病名が知識ファイルの文字列と 1 文字も違わない
    2. 読みが readings.json の値と 1 文字も違わない
    3. ふりがなの括弧を外すと、元の病名に完全に戻る
    """
    names = {r["disease"] for r in json.loads(KB.read_text(encoding="utf-8"))}
    readings = json.loads(READ.read_text(encoding="utf-8"))["readings"]
    msgs: list[str] = []
    for name, r, _lv, _note in rows:
        if name not in names:
            msgs.append(f"病名が知識ファイルに無い: {name}")
            continue
        if readings.get(name, {}).get("reading") != r:
            msgs.append(f"読みが readings.json と違う: {name} → 表 {r} / 実体 {readings.get(name, {}).get('reading')}")
        shown = ruby(name)
        # ふりがなは「漢字 1 字の直後」にのみ付く。その形だけを外す。
        # 2026-09-14: 「環軸椎脱臼（先天性）」の括弧内にふりがなを付けてしまい、
        # 「ひらがなの括弧を外す」方式では通過していた。漢字の直後に限定して塞いだ。
        restored = re.sub(r"(?<=[\u4e00-\u9fff])（[ぁ-ゟー]+）", "", shown)
        if restored != name:
            msgs.append(f"ふりがなが病名を壊している: {name} → 表示 {shown} → 復元 {restored}")
    return msgs


def main() -> int:
    rows = load()
    if len(sys.argv) > 1 and sys.argv[1] == "--rows":
        cnt: dict[str, int] = defaultdict(int)
        for _, r, _, _ in rows:
            cnt[row_of(r) or "?"] += 1
        total_b = 0
        print("| 行 | 件数 | バッチ数 |")
        print("|---|---|---|")
        for row, _ in KANA_ROWS:
            n = cnt.get(row, 0)
            b = (n + 49) // 50
            total_b += b
            print(f"| {row} | {n} | {b} |")
        print(f"| 合計 | {sum(cnt.values())} | {total_b} |")
        return 0

    want_row = sys.argv[1]
    idx = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sel = [x for x in rows if row_of(x[1]) == want_row]
    chunk = sel[(idx - 1) * 50 : idx * 50]
    msgs = self_check(chunk) + verify_table(chunk)
    print(f"# {want_row}行 バッチ{idx}（{len(sel)} 件中 {(idx-1)*50+1}〜{(idx-1)*50+len(chunk)} 件）\n")
    if msgs:
        print("## 自己検証の指摘\n")
        for m in msgs:
            print("-", m)
        print()
    else:
        print("自己検証：指摘なし\n")
    print("| # | 病名 | 読み | 根拠 | 自信度 |")
    print("|---|---|---|---|---|")
    # 自信度の出し方（2026-09-14 ファウンダー確定）
    #   根拠レベル 1〜4 … 出典があるので自己申告は不要。「—」
    #   根拠レベル 0    … note に記録した自信度だけを出す
    #   記録が無いもの  … 空欄のまま。手で補わない（「分からない」を正直に見せる）
    for i, (n, r, lv, note) in enumerate(chunk, (idx - 1) * 50 + 1):
        if lv > 0:
            conf = "—"
        else:
            m = re.search(r"自信度\s*([高中低])", note)
            conf = m.group(1) if m else ""
        lvs = {-1: "カナ始まり", 0: "0", 1: "1", 2: "2", 3: "3", 4: "4"}[lv]
        print(f"| {i} | {ruby(n)} | {r} | {lvs} | {conf} |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
