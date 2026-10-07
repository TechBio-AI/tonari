#!/usr/bin/env python3
"""課題 46（orpha_code の取り違え 44 件）の正しいコード候補を、Orphanet ローカル原本から機械で探す。

    python3 scripts/portal/find_orpha_candidates.py

- 対象は docs/kb_issues_2026-08-29.md「46.」の表に載っている idx。
- 検索に使うのは、知識ファイルの病名と別名のうち英字を含むもの。日本語だけの名前では Orphanet（英語）を引けない。
- 照合先は data/orphanet/en_product1.xml の Name と Synonym。Web 取得はしない。
- 候補は最大 3 件。完全一致（build_match_table.norm で正規化後に同一）を先に、次に語の重なりが多い順。
  OBSOLETE / NON RARE IN EUROPE の項目は後ろに回し、印を付ける。
- 読むだけ。知識ファイルは変更しない。出力は docs/orpha_code_fix_candidates_2026-09-25.md だけ。
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_match_table import norm, tokens  # noqa: E402  同じ正規化を使う

KB = Path("data/knowledge/comprehensive_rare_diseases_knowledge.json")
READINGS = Path("data/disease_readings/readings.json")
ISSUES = Path("docs/kb_issues_2026-08-29.md")
XML = Path("data/orphanet/en_product1.xml")
PROPOSAL_V2 = Path("docs/orpha_correction_proposal_v2_2026-08-30.md")
OUT = Path("docs/orpha_code_fix_candidates_2026-09-25.md")
MAX_CANDIDATES = 3
MIN_COVERAGE = 0.5  # 我々の名前の語のうち、この割合以上が重なったものだけ候補にする


def load_issue_rows() -> list[dict]:
    text = ISSUES.read_text(encoding="utf-8")
    section = text.split("## 46.", 1)[1].split("\n## ", 1)[0]
    rows = []
    for m in re.finditer(r"^\| (\d+) \| (.+?) \| (ORPHA:\d+) \| (.+?) \|$", section, re.M):
        rows.append({"idx": int(m.group(1)), "name": m.group(2), "code": m.group(3), "their_name": m.group(4)})
    return rows


def load_orphanet() -> dict[str, dict]:
    text = XML.read_text(encoding="utf-8", errors="replace")
    records = {}
    for block in re.finditer(r'<Disorder id="\d+">(.*?)</Disorder>', text, re.S):
        body = block.group(1)
        code = re.search(r"<OrphaCode>(\d+)</OrphaCode>", body)
        name = re.search(r'<Name lang="en">(.*?)</Name>', body, re.S)
        if not code or not name:
            continue
        dtype = re.search(r'<DisorderType id="\d+">\s*<Name lang="en">(.*?)</Name>', body, re.S)
        labels = [html.unescape(name.group(1))]
        labels += [html.unescape(s) for s in re.findall(r'<Synonym lang="en">(.*?)</Synonym>', body, re.S)]
        records[code.group(1)] = {
            "name": labels[0],
            "labels": labels,
            "type": dtype.group(1) if dtype else "",
            "inactive": bool(re.match(r"(OBSOLETE|NON RARE IN EUROPE):", labels[0])),
        }
    return records


def proposal_v2_b_codes() -> dict[str, str]:
    """提案 v2 の B（現番号が誤っている疑い）に載っている 病名 → 提案番号。idx は旧採番なので名前で引く。"""
    if not PROPOSAL_V2.exists():
        return {}
    text = PROPOSAL_V2.read_text(encoding="utf-8")
    section = text.split("## 3. B 追加", 1)[-1].split("\n## 4.", 1)[0]
    found = {}
    for line in section.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        codes = re.findall(r"ORPHA:\d+", line)
        if len(cells) > 3 and codes and re.search(r"[ぁ-んァ-ヶ一-龥]", cells[2]):
            found[cells[2]] = " → ".join(dict.fromkeys(codes))
    return found


_ROMAN = {"I": "1", "II": "2", "III": "3", "IV": "4", "V": "5", "VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10"}


def norm_typed(text: str) -> str:
    """型番号を揃えた正規化。大文字ローマ数字を算用数字に、語としての type を落とす（OI Type IV = OI type 4 = OI4）。"""
    text = re.sub(r"\b(VIII|VII|VI|IV|IX|III|II|I|V|X)\b", lambda m: _ROMAN[m.group(1)], text)
    return norm(re.sub(r"\btype\b", "", text, flags=re.I))


def latin_parts(text: str) -> list[str]:
    """日本語まじりの名前から英字の部分を抜く（先天性無痛症（HSAN V型）→ HSAN V）。"""
    return re.findall(r"[A-Za-z][A-Za-z0-9 \-]*[A-Za-z0-9]|[A-Za-z]", text)


def search_terms(names: list[str]) -> list[str]:
    terms: list[str] = []
    for n in names:
        if not re.search(r"[A-Za-z]", n):
            continue
        parts = latin_parts(n) if re.search(r"[ぁ-んァ-ヶ一-龥]", n) else [n]
        terms += [t.strip() for t in parts if t.strip()]
    return list(dict.fromkeys(terms))


def search(queries: list[str], orpha: dict[str, dict]) -> list[dict]:
    """queries（英字の検索語）で Orphanet を引き、候補を返す。"""
    hits: dict[str, dict] = {}
    for q in queries:
        q_norm, q_typed, q_tokens = norm(q), norm_typed(q), tokens(q)
        for code, rec in orpha.items():
            for label in rec["labels"]:
                if q_norm and norm(label) == q_norm:
                    score = (2, 1.0, 0)
                    why = f"完全一致 `{q}` = `{label}`"
                elif q_typed and norm_typed(label) == q_typed:
                    score = (2, 1.0, 0)
                    why = f"型番号を揃えて一致 `{q}` = `{label}`"
                else:
                    if not q_tokens:
                        continue
                    shared = q_tokens & tokens(label)
                    coverage = len(shared) / len(q_tokens)
                    if not shared or coverage < MIN_COVERAGE:
                        continue
                    extra = len(tokens(label) - q_tokens)
                    score = (1, coverage, -extra)
                    why = f"語の重なり {len(shared)}/{len(q_tokens)}（{'・'.join(sorted(shared))}）`{q}` ≈ `{label}`"
                best = hits.get(code)
                if best is None or score > best["score"]:
                    hits[code] = {"code": code, "score": score, "why": why}
    ranked = sorted(hits.values(), key=lambda h: (not orpha[h["code"]]["inactive"], h["score"]), reverse=True)
    return ranked[:MAX_CANDIDATES]


def cell(s: str) -> str:
    return s.replace("|", "\\|")


def main() -> int:
    kb = json.loads(KB.read_text(encoding="utf-8"))
    readings = json.loads(READINGS.read_text(encoding="utf-8"))["readings"]
    orpha = load_orphanet()
    v2 = proposal_v2_b_codes()
    rows = load_issue_rows()

    out_rows = []
    counts = {"exact": 0, "overlap": 0, "none": 0, "same_code": 0, "shifted": 0}
    for row in rows:
        idx = row["idx"]
        record = kb[idx] if idx < len(kb) else None
        notes = []
        if record is None or record["disease"] != row["name"]:
            # 課題 47：idx は並び順。ずれていたら名前で引き直す
            record = next((r for r in kb if r["disease"] == row["name"]), None)
            counts["shifted"] += 1
            notes.append("課題 46 の idx と知識ファイルの並びがずれている（名前で引き直した）" if record
                         else "知識ファイルに同名のレコードが無い")
        name = row["name"]
        reading = (readings.get(name) or {}).get("reading", "")
        current_code = (record or {}).get("orpha_code") or row["code"]
        if record and current_code != row["code"]:
            notes.append(f"知識ファイルの現在値は {current_code}（課題 46 の記録は {row['code']}）")

        names = [name] + ((record or {}).get("alternate_names") or [])
        queries = search_terms(names)
        candidates = search(queries, orpha) if queries else []

        if not queries:
            cand_text, why_text = "候補なし", "英字の名前・別名が無く、Orphanet（英語）を引けない"
            counts["none"] += 1
        elif not candidates:
            cand_text, why_text = "候補なし", "検索語: " + "、".join(f"`{q}`" for q in queries)
            counts["none"] += 1
        else:
            parts, whys = [], []
            for c in candidates:
                rec = orpha[c["code"]]
                marks = [rec["type"]] if rec["type"] else []
                if rec["inactive"]:
                    marks.append("非現役")
                if f"ORPHA:{c['code']}" == current_code:
                    marks.append("★現在のコードと同じ")
                    counts["same_code"] += 1
                parts.append(f"ORPHA:{c['code']} {rec['name']}（{'・'.join(marks)}）")
                whys.append(c["why"])
            cand_text, why_text = "<br>".join(parts), "<br>".join(whys)
            counts["exact" if candidates[0]["score"][0] == 2 else "overlap"] += 1

        if name in v2:
            notes.append(f"提案 v2 の B にも載っている（{v2[name]}）")
        current = f"{current_code} {row['their_name']}"
        out_rows.append(f"| {idx} | {cell(name)}（{reading}） | {cell(current)} | {cell(cand_text)} | "
                        f"{cell(why_text)}{'<br>※ ' + cell(' ／ '.join(notes)) if notes else ''} |  |")

    lines = [
        "# ORPHA コード修正候補（課題 46、2026-09-25）",
        "",
        "> **判定列以外はすべて機械生成。** 人が 1 件ずつ確認したものではない。判定列はファウンダーが記入する。",
        "> 知識ファイルは変更していない。反映は判定後に別途行う。",
        "",
        f"- 対象: `docs/kb_issues_2026-08-29.md`「46. orpha_code の取り違え」の {len(rows)} 件",
        "- 照合先: `data/orphanet/en_product1.xml`（2026-06-23 版、CC BY 4.0、ローカル原本・読み取りのみ。Web 取得なし）",
        "- 検索語: 知識ファイルの病名・別名のうち英字を含むもの。日本語まじりの名前は英字の部分だけを抜いて使った"
        "（例: 先天性無痛症（HSAN V型）→ `HSAN V`）。Orphanet の Name と Synonym に当てた",
        "- 型番号を揃えて一致: 大文字ローマ数字を算用数字にし、語としての type を落として同一になったもの（`OI Type IV` = `OI type 4`）",
        "- 並び: 完全一致（記号・空白・大小文字を落として同一）→ 語の重なりが多い順（我々の語の半分以上が重なるものだけ）。"
        "非現役（OBSOLETE / NON RARE IN EUROPE）は後ろ。最大 3 件",
        "- 「★現在のコードと同じ」: 検索で現在のコードが当たったもの。課題 46 の判定（語が重ならない）自体が誤っている可能性がある",
        "- 生成: `scripts/portal/find_orpha_candidates.py`",
        "",
        "## 集計",
        "",
        "| 完全一致あり | 語の重なりのみ | 候補なし | 現在のコードが候補に出た | idx ずれ |",
        "|---:|---:|---:|---:|---:|",
        f"| {counts['exact']} | {counts['overlap']} | {counts['none']} | {counts['same_code']} | {counts['shifted']} |",
        "",
        "## 一覧",
        "",
        "| idx | 病名（ふりがな） | 現在の誤コードと Orphanet 側の名前 | 候補コード（最大3） | 根拠 | 判定 |",
        "|---:|---|---|---|---|---|",
        *out_rows,
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"対象 {len(rows)} 件／完全一致あり {counts['exact']}／語の重なりのみ {counts['overlap']}／"
          f"候補なし {counts['none']}／現在のコードが候補 {counts['same_code']}／idx ずれ {counts['shifted']}")
    print(f"出力: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
