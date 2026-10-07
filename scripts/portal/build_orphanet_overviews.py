#!/usr/bin/env python3
"""Orphanet の英語 Definition だけから <idx>.json を組み立てる（フェーズ1b-α）。

    python3 scripts/portal/build_orphanet_overviews.py --shard 1
    python3 scripts/portal/build_orphanet_overviews.py --shard 1 --rewrite-url   # URL だけ差し替え

決まりは docs/disease_overview_phase1_task.md §2-4。
出典は data/disease_overviews/_orphanet_definitions.json の definition_text だけ。Web 取得はしない。
翻訳・要約はしない。英語は原文のまま出す。notes だけ日本語で書く。
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
LINK_TS = Path("lib/portal/orphanet-link.ts")
ORPHANET_VERSION = "2026-06-23"
JST = timezone(timedelta(hours=9))

DIGIT = re.compile(r"[0-9０-９]")
# 症状の列挙を導く言い回し（Orphanet の Definition でよく使われる形）
LEAD = re.compile(
    r"(?:characteri[sz]ed by|manifesting (?:as|with)|presenting with|associated with)\s+", re.I)
# 発症時期の言い回し
ONSET_PATTERNS = [
    re.compile(r"\b(?:neonatal|congenital|infantile|childhood|juvenile|adolescent|adult|late|early)"
               r"[- ]onset\b", re.I),
    re.compile(r"\bonset (?:in|during|at|occurs?|is)\s+[^,.;]{3,40}", re.I),
    re.compile(r"\bpresenting (?:in|during|at)\s+[^,.;]{3,40}", re.I),
]
TREATMENT_PATTERN = re.compile(r"[^,.;]*\b(?:treatment|therapy|treated|therapeutic)\b[^,.;]*", re.I)
# 薬剤名・ビタミン名らしき語（英語）。task.md「薬剤名・製品名・企業名は書かない」のため避ける。
# 一般名（INN）に多い語尾で機械的に見る。取りこぼしはありうるので、残った英語は目で見ること。
DRUG_HINT = re.compile(
    r"\b(?:vitamin|[A-Za-z]{3,}(?:nib|mab|inone|azole|statin|cycline|mycin|pril|sartan|"
    r"olol|profen|azine|parin|cillin|dipine|codone|caine|prazole|tidine))\b", re.I)


def url_template() -> str:
    """URL の形式は lib/portal/orphanet-link.ts の 1 か所だけで持つ"""
    text = LINK_TS.read_text(encoding="utf-8")
    m = re.search(r"ORPHANET_DISEASE_URL_TEMPLATE\s*=\s*'([^']+)'", text)
    if not m:
        raise SystemExit(f"{LINK_TS} から ORPHANET_DISEASE_URL_TEMPLATE を読めませんでした")
    return m.group(1)


def disease_url(template: str, orpha_code: str) -> str:
    return template.replace("{code}", orpha_code.replace("ORPHA:", ""))


def split_top_level(text: str) -> list[str]:
    """括弧の外のカンマと and で切る。中身は一切書き換えない"""
    parts, depth, start = [], 0, 0
    i = 0
    while i < len(text):
        c = text[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
        elif depth == 0:
            if c == ",":
                parts.append(text[start:i]); start = i + 1
            elif text[i:i + 5].lower() == " and ":
                parts.append(text[start:i]); start = i + 5; i += 4
        i += 1
    parts.append(text[start:])
    return parts


# 先頭から落とす語（落としても残りは原文の一部のまま）
HEADS = ("and ", "as well as ", "usually associated with ", "often associated with ",
         "frequently associated with ", "may be associated with ", "associated with ",
         "such as ", "including ", "the ", "a ", "an ", "with ", "usually ", "often ",
         "sometimes ", "frequently ", "typically ", "variable ", "progressive ", "severe ")
# 症状ではない語（列挙の中に混じる言い回し・総称）
NOT_SYMPTOM = {"clinical signs", "signs", "symptoms", "clinical symptoms", "features",
               "clinical features", "manifestations", "clinical manifestations",
               "severity", "phenotype", "clinical presentation", "presentation",
               "onset", "age of onset", "course", "clinical course"}
DROP_HEADS = ("depending on", "which", "ranging from", "due to", "resulting from",
              "in addition", "as a result", "leading to a", "that is", "that are")
ADJECTIVE_TAIL = ("ive", "ic", "al", "ous", "able", "ible", "ing")


def trim(item: str) -> str:
    """前後の空白と、先頭の冠詞・修飾語だけを落とす。残りは原文のまま"""
    s = item.strip().strip(".;")
    changed = True
    while changed:
        changed = False
        for head in HEADS:
            if s.lower().startswith(head):
                s = s[len(head):].strip()
                changed = True
                break
    return s.strip()


def is_symptom(item: str) -> bool:
    low = item.lower()
    if low in NOT_SYMPTOM:
        return False
    if any(low.startswith(h) for h in DROP_HEADS):
        return False
    # 1 語だけで形容詞の形をしているもの（progressive など）は症状名ではない
    if " " not in item and low.endswith(ADJECTIVE_TAIL):
        return False
    return True


def extract_symptoms(definition: str) -> list[str]:
    m = LEAD.search(definition)
    if not m:
        return []
    tail = definition[m.end():]
    tail = re.split(r"(?<=\.)\s", tail)[0]
    items = []
    for raw in split_top_level(tail):
        item = trim(raw)
        if 3 <= len(item) <= 80 and item in definition and is_symptom(item) \
           and not DRUG_HINT.search(item):
            items.append(item)
        if len(items) == 8:
            break
    return items


def extract_onset(definition: str) -> str | None:
    for pattern in ONSET_PATTERNS:
        m = pattern.search(definition)
        if m:
            phrase = m.group(0).strip().strip(".,;")
            if phrase and not DIGIT.search(phrase) and phrase in definition:
                return phrase
    return None


def extract_treatment(definition: str) -> tuple[str, str] | None:
    """(表示に使う語句, 40 字以内の evidence) を返す。

    evidence は治療を指す語を必ず含む窓にする（冒頭 40 字を切ると語が落ちるため）。
    """
    m = TREATMENT_PATTERN.search(definition)
    if not m:
        return None
    phrase = m.group(0).strip().strip(".,;")
    if not phrase or phrase not in definition:
        return None
    key = re.search(r"\b(?:treatment|therapy|treated|therapeutic)\b", phrase, re.I)
    if len(phrase) <= 40:
        return (phrase, phrase) if not DRUG_HINT.search(phrase) else None
    center = key.start() if key else 0
    # 治療を指す語を含み、薬剤名を含まない 40 字の窓を探す
    for shift in range(0, 40):
        begin = max(0, min(center - 12 + shift, len(phrase) - 40))
        # 語の途中から始めない（"itamin B12" のような切り方で薬剤名の判定をすり抜けないように）
        while 0 < begin < len(phrase) and phrase[begin - 1].isalnum() and phrase[begin].isalnum():
            begin += 1
        window = phrase[begin:begin + 40].strip()
        if len(window) < 10:
            continue
        # 窓の前後も含めて薬剤名を見る（窓の端で語が切れていても拾う）
        around = phrase[max(0, begin - 12):begin + 52]
        if re.search(r"treatment|therapy|treated|therapeutic", window, re.I) \
           and not DRUG_HINT.search(around):
            return phrase, window
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--rewrite-url", action="store_true",
                        help="出力済みファイルの sources / links の url だけを差し替える")
    args = parser.parse_args()

    template = url_template()
    assigned = json.loads((OVERVIEWS / "_shards" / f"orphanet_shard_{args.shard}.json").read_text(encoding="utf-8"))
    table = {e["idx"]: e for e in json.loads((OVERVIEWS / "_match_table.json").read_text(encoding="utf-8"))["entries"]}
    definitions = json.loads((OVERVIEWS / "_orphanet_definitions.json").read_text(encoding="utf-8"))["definitions"]
    now = datetime.now(JST).isoformat(timespec="seconds")

    if args.rewrite_url:
        changed = skipped_files = 0
        for idx in assigned:
            path = OVERVIEWS / f"{idx}.json"
            if not path.exists():
                skipped_files += 1
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            url = disease_url(template, table[idx]["orphanet"]["orpha_code"])
            # sources / links のうち Orphanet のものだけを差し替える（並び順に頼らない）
            touched = False
            for source in data["sources"]:
                if source.get("id") == "orphanet" and source.get("url") != url:
                    source["url"] = url
                    touched = True
            for link in data["links"]:
                if link.get("id") == "orphanet" and link.get("url") != url:
                    link["url"] = url
                    touched = True
            if touched:
                path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
                changed += 1
        print(f"URL を差し替えたファイル: {changed} 件 / 変更不要 "
              f"{len(assigned) - skipped_files - changed} 件 / 出力が無い {skipped_files} 件")
        print(f"形式: {template}")
        return

    written = 0
    skipped: dict[int, str] = {}
    rows = []
    for idx in assigned:
        entry = table[idx]
        record = definitions.get(str(idx))
        if not record or not record.get("has_definition"):
            skipped[idx] = "Orphanet の Definition が原本に無い"
            continue
        definition = record["definition_text"]
        code = record["orpha_code"]
        url = disease_url(template, code)
        source = {"id": "orphanet", "url": url, "fetched_at": ORPHANET_VERSION,
                  "sha256": None, "title": record["name_en"]}

        symptoms = [{"text": s, "source_id": "orphanet",
                     "evidence": s if len(s) <= 40 else s[:40]}
                    for s in extract_symptoms(definition)]
        onset_phrase = extract_onset(definition)
        onset = ({"text": onset_phrase, "source_id": "orphanet",
                  "evidence": onset_phrase if len(onset_phrase) <= 40 else onset_phrase[:40]}
                 if onset_phrase else None)
        # Orphanet の Definition は治療の出典として弱いので、一律「記載なし」にする
        # （2026-09-25 ファウンダー判断）。抽出そのものは残してあるが採用しない。
        treatment = {"type": "記載なし", "source_id": "orphanet", "evidence": None}

        notes = ["日本語の出典が無いため、Orphanet の英語 Definition をそのまま出している（翻訳・要約はしていない）。"]
        if not symptoms:
            notes.append("Definition に症状の列挙が無いため symptoms は空。")
        if onset is None:
            notes.append("Definition に発症時期の明示が無い（または数字を含む）ため onset は null。")
        notes.append("Orphanet の Definition は治療の出典として弱いため、treatment は一律「記載なし」とした（2026-09-25 ファウンダー判断）。")
        notes.append("Orphanet の URL 形式は未確定（lib/portal/orphanet-link.ts の定数。/ja/ は存在しない見込みのため暫定で /en/。ファウンダー確認待ち）。")

        (OVERVIEWS / f"{idx}.json").write_text(json.dumps({
            "idx": idx,
            "name": entry["disease"],
            "sources": [source],
            "summary": {"text": definition, "source_id": "orphanet",
                        "evidence": definition[:40], "lang": "en"},
            "symptoms": symptoms,
            "onset": onset,
            "treatment": treatment,
            "links": [{"id": "orphanet", "url": url, "label": "公式ページ"}],
            "notes": notes,
            "extracted_at": now,
            "shard": args.shard,
        }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        written += 1
        rows.append((idx, entry["disease"], record["name_en"], len(definition),
                     len(symptoms), bool(onset), treatment["type"]))

    print(f"担当 {len(assigned)} 件 / 出力 {written} 件 / スキップ {len(skipped)} 件")
    log = OVERVIEWS / "_logs" / f"orphanet_shard_{args.shard}.md"
    lines = [f"# フェーズ1b-α orphanet_shard_{args.shard} の処理ログ", "",
             f"担当 {len(assigned)} 件 / 出力 {written} 件 / Definition が無くスキップ {len(skipped)} 件", "",
             "出典は `data/disease_overviews/_orphanet_definitions.json` の `definition_text` のみ。Web 取得なし。",
             "英語は原文のまま。翻訳・要約はしていない。",
             f"Orphanet の URL 形式は `{template}`（**未確定**。`lib/portal/orphanet-link.ts` の定数）。", ""]
    if skipped:
        lines += ["## 出力しなかった疾患", "", "| idx | 病名 | 理由 |", "|---:|---|---|"]
        lines += [f"| {i} | {table[i]['disease']} | {r} |" for i, r in sorted(skipped.items())]
        lines.append("")
    lines += ["## 出力した疾患", "",
              "| idx | 病名 | Orphanet の疾患名 | Definition 字数 | symptoms | onset | treatment |",
              "|---:|---|---|---:|---:|---|---|"]
    for idx, name, en, length, nsym, has_onset, ttype in rows:
        lines.append(f"| {idx} | {name} | {en} | {length} | {nsym} | {'○' if has_onset else '—'} | {ttype} |")
    lines.append("")
    log.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"書き出し: {log}")


if __name__ == "__main__":
    main()
