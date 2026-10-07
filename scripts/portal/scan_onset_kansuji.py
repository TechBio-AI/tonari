#!/usr/bin/env python3
"""難病情報センターの保存本文から、漢数字を含む語の候補を機械で洗い出す。

onset の規則「text / evidence に数字（半角・全角・漢数字）を含めない」で、
数を表さない固定語（四肢・一般・一部 など）まで落ちてしまう。その許容一覧の
候補を出すための調査。**判定はしない。数と件数を出すだけ。**

    python3 scripts/portal/scan_onset_kansuji.py

読むのは .cache/disease_sources/pages/nanbyou_entry_*.html のみ（Web 取得なし）。
"""

from __future__ import annotations

import collections
import html
import json
import re
from pathlib import Path

PAGES = Path(".cache/disease_sources/pages")
KANJI_DIGITS = "〇零一二三四五六七八九十百千万億兆"
DIGIT_ANY = re.compile(r"[0-9０-９" + KANJI_DIGITS + r"]")
KANJI_DIGIT = re.compile(r"[" + KANJI_DIGITS + r"]")
# 漢字の連なり（漢数字を含みうる語のかたまり）。ひらがな・カタカナ・記号で切れる
KANJI_RUN = re.compile(r"[一-鿿々]+")
# 直後に来ると「数詞」だと分かる助数詞
COUNTERS = "人歳例年割名件倍回日月週個台点種類度番目位分秒時代歳児人前後余"

# onset に使う節の見出し（docs/disease_overview_phase1_task.md §2-1）
ONSET_HEADING = "どのような人に多い"


def sections(path: Path) -> list[tuple[str, str]]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style)\b.*?</\1>", " ", raw, flags=re.S)
    parts = re.split(r"<h[1-5][^>]*>(.*?)</h[1-5]>", raw, flags=re.S)
    out = []
    for i in range(1, len(parts), 2):
        head = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", parts[i]))).strip()
        body = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", parts[i + 1]))).strip()
        if head:
            out.append((head, body))
    return out


KANJI = re.compile(r"[\u4e00-\u9fff々]")
ARABIC = re.compile(r"[0-9０-９]")


def candidates(text: str):
    """漢数字 1 文字ごとに、その文字を含む短い漢字語の候補を切り出す。

    形態素解析は使わない（2026-09-13 ファウンダー判定）。代わりに
      - 漢数字から始まる 2 文字・3 文字の漢字列（一部 / 一般的 / 十二指腸 …）
      - 漢数字で終わる 2 文字の漢字列（不十分 の「不十」ではなく 同一 / 唯一 / 第一）
    を機械的に取り出す。語の切れ目は判定しない。重なりはそのまま出す。
    """
    for m in KANJI_DIGIT.finditer(text):
        i = m.start()
        for size in (2, 3):
            word = text[i:i + size]
            if len(word) == size and all(KANJI.match(c) for c in word):
                yield i, word, "先頭"
        if i > 0 and KANJI.match(text[i - 1]) and not KANJI_DIGIT.match(text[i - 1]):
            yield i - 1, text[i - 1:i + 1], "末尾"


def numeric_context(text: str, pos: int) -> bool:
    """直前 3 文字に算用数字があるか（「10万人」「約5割」のような数の文脈）"""
    return bool(ARABIC.search(text[max(0, pos - 3):pos]))


def main() -> None:
    files = sorted(PAGES.glob("nanbyou_entry_*.html"))
    total = collections.Counter()
    in_onset = collections.Counter()
    numeric = collections.Counter()
    examples: dict[str, list[str]] = collections.defaultdict(list)
    onset_sections = 0

    for path in files:
        for head, body in sections(path):
            is_onset = ONSET_HEADING in head
            if is_onset:
                onset_sections += 1
            for pos, word, _kind in candidates(body):
                total[word] += 1
                if is_onset:
                    in_onset[word] += 1
                if numeric_context(body, pos):
                    numeric[word] += 1
                if is_onset and len(examples[word]) < 2:
                    left = max(0, pos - 20)
                    examples[word].append(body[left:pos + len(word) + 20].strip())

    words = [
        {
            "word": w,
            "total": total[w],
            "in_onset": in_onset[w],
            "numeric_context": numeric[w],
            "examples": examples.get(w, []),
        }
        for w in sorted(total, key=lambda x: (-in_onset[x], -total[x], x))
        if total[w] >= 2
    ]
    print(f"難病情報センター 保存ページ {len(files)} 枚 / 「{ONSET_HEADING}」節 {onset_sections} 個")
    print(f"候補（2 回以上出現）{len(words)} 種 / うち onset 節に出る {sum(1 for x in words if x['in_onset'])} 種")

    out = {
        "_readme": [
            "難病情報センターの保存本文から機械で切り出した、漢数字を含む短い漢字語の候補。",
            "形態素解析は使っていないので、語の切れ目は正しくないものが混じる。",
            "numeric_context は「直前 3 文字に算用数字がある」出現の回数。数の文脈で使われる語の目印。",
            "判定はしていない。許容してよいかはファウンダーが決める。",
            "生成: scripts/portal/scan_onset_kansuji.py（Web 取得なし）",
        ],
        "source": {"pages": len(files), "onset_sections": onset_sections},
        "words": words,
    }
    Path("data/disease_overviews/_onset_kansuji_scan.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("書き出し: data/disease_overviews/_onset_kansuji_scan.json")


if __name__ == "__main__":
    main()
