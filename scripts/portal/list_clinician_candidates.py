#!/usr/bin/env python3
"""医療者向け気づき資材の次の候補疾患を、3 条件で機械抽出する（読むだけ）。

    python3 scripts/portal/list_clinician_candidates.py --json out.json      # 機械の結果だけ
    python3 scripts/portal/list_clinician_candidates.py --judgements j.json  # 判断列を足して文書を書く

条件（2026-10-03 ファウンダー指示）:
  (c) 日本語の出典つき概要がある … data/disease_overviews/<idx>.json の summary.lang == "ja"
  (a) 難病情報センターか小慢の概要に治療法の記載がある … その概要の treatment.type が「記載なし」以外。
      根拠は treatment.evidence（照合済みの原文）と出典 URL
  (b) 概要に診断の遅れ・見逃し・多科にまたがる等の記述がある … 概要が使った出典ページ（保存 HTML）の本文に
      下の語が出るか。根拠は語を含む原文 40 字以内と URL
Web 取得はしない。順位は付けない。
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"
OUT = Path("docs/clinician_materials_candidates_2026-10-03.md")
LABEL = {"nanbyou": "難病情報センター", "shouman": "小児慢性"}

# (b) の手がかり語。分類は機械の目安（遅れ・見逃し／多科・多臓器）
KEYWORDS = {
    "遅れ・見逃し": ["診断が遅れ", "診断の遅れ", "診断までに", "診断が難し", "診断が困難", "診断がつか", "診断されないまま",
                 "見逃", "見過ご", "見落と", "気づかれ", "気付かれ", "誤診", "間違われ", "発見が遅れ", "未診断"],
    "多科・多臓器": ["多科", "診療科", "多臓器", "全身の様々な", "全身のさまざまな", "多彩な症状", "多様な症状", "集学的"],
}
WINDOW = 40


def page_text(cache_file: str) -> str:
    raw = Path(cache_file).read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style)\b.*?</\1\s*>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<!--.*?-->", " ", raw, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw))).strip()


def snippet(text: str, start: int, end: int) -> str:
    """語を含む文を 40 字以内で切り出す（原文のまま。文が長ければ語の前後を切る）。"""
    s = text.rfind("。", 0, start) + 1
    e = text.find("。", end)
    e = len(text) if e == -1 else e + 1
    if e - s <= WINDOW:
        return text[s:e].strip()
    left = min(max(s, start - (WINDOW - (end - start)) // 2), e - WINDOW)
    return text[left:left + WINDOW].strip()


def collect() -> list[dict]:
    entries = {e["idx"]: e for e in json.loads(TABLE.read_text(encoding="utf-8"))["entries"]}
    rows = []
    for path in sorted(OVERVIEWS.glob("*.json"), key=lambda p: int(p.stem) if p.stem.isdigit() else -1):
        if not path.stem.isdigit():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["summary"].get("lang") != "ja":
            continue  # (c)
        t = data["treatment"]
        if t.get("type") == "記載なし" or t.get("source_id") not in LABEL:
            continue  # (a)
        urls = {s["id"]: s["url"] for s in data["sources"]}
        hits = []
        for sid in urls:
            fetch = entries[data["idx"]][sid]["page_fetch"]
            text = page_text(fetch["cache_file"])
            seen = set()
            for kind, words in KEYWORDS.items():
                for w in words:
                    for m in re.finditer(re.escape(w), text):
                        snip = snippet(text, m.start(), m.end())
                        if snip in seen:
                            continue
                        seen.add(snip)
                        hits.append({"kind": kind, "word": w, "text": snip, "source": sid, "url": urls[sid]})
        if not hits:
            continue  # (b)
        entry = entries[data["idx"]]
        rows.append({"idx": data["idx"], "name": data["name"], "reading": entry.get("reading") or "",
                     "treatment": {"type": t["type"], "evidence": t["evidence"], "source": t["source_id"],
                                   "url": urls[t["source_id"]]},
                     "hits": hits})
    return rows


def cell(s: str) -> str:
    return (s or "").replace("|", "／")


def render(rows: list[dict], judgements: dict) -> str:
    lines = [
        "# 医療者向け気づき資材：次の候補疾患の材料（2026-10-03）", "",
        "> **順位は付けていない**（ファウンダーが決める）。並びは idx 順。",
        "> 「機械生成」の列は `scripts/portal/list_clinician_candidates.py` の出力で、人も Claude Code も手を入れていない。",
        "> 「Claude Code の判断」の列だけが判断で、(b) の手がかりが本当に診断の遅れ・見逃し・多科の話かを原文で読んだ結果。", "",
        "## 抽出条件（機械）", "",
        "- (c) 日本語の出典つき概要がある（`data/disease_overviews/<idx>.json` の `summary.lang` が `ja`）",
        "- (a) 難病情報センターか小児慢性の概要に治療法の記載がある（概要の `treatment.type` が「記載なし」以外。根拠は照合済みの evidence）",
        "- (b) 概要が使った出典ページの本文に次の語が出る（根拠は語を含む原文 40 字以内）",
        *[f"  - {k}: " + "・".join(v) for k, v in KEYWORDS.items()],
        "- Web 取得はしていない。保存 HTML（`.cache/disease_sources/`）だけを読んだ", "",
    ]
    counts = {k: sum(1 for r in rows if judgements.get(str(r["idx"]), {}).get("verdict") == k)
              for k in ("該当", "弱い", "非該当")}
    lines += [f"機械抽出 {len(rows)} 件。Claude Code の判断：該当 {counts['該当']}／弱い {counts['弱い']}／非該当 {counts['非該当']}", "",
              "## 一覧", "",
              "| idx | 病名（ふりがな） | (a) 治療の型（機械生成） | (a) 根拠 原文・URL（機械生成） | (b) 根拠 原文・URL（機械生成） | 判断（Claude Code） | 判断の理由（Claude Code） |",
              "|---:|---|---|---|---|---|---|"]
    for r in rows:
        t = r["treatment"]
        b = "<br>".join(f"［{h['kind']}］「{cell(h['text'])}」 {h['url']}" for h in r["hits"])
        j = judgements.get(str(r["idx"]), {})
        lines.append(f"| {r['idx']} | {cell(r['name'])}（{cell(r['reading'])}） | {t['type']} | "
                     f"「{cell(t['evidence'])}」 {t['url']} | {b} | {j.get('verdict', '未判断')} | {cell(j.get('reason', ''))} |")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", type=Path, help="機械の結果を JSON で書き出す")
    parser.add_argument("--judgements", type=Path, help="{idx: {verdict, reason}}（Claude Code の判断）")
    args = parser.parse_args()
    rows = collect()
    if args.json:
        args.json.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    judgements = json.loads(args.judgements.read_text(encoding="utf-8")) if args.judgements else {}
    OUT.write_text(render(rows, judgements), encoding="utf-8")
    print(f"機械抽出 {len(rows)} 件 → {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
