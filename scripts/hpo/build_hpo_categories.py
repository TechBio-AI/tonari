#!/usr/bin/env python3
"""
HPO の階層から「分類の祖先」を引き、11 疾患の症状ごとに派生ファイルへ書き出す。

入力（読み取りのみ。1 バイトも変更しない）:
  data/hpo/hp.obo                          … is_a 階層
  data/hpo_symptoms/hpo_symptoms_11.json   … 11 疾患の症状（どの HPO ID が要るか）
出力:
  data/hpo_categories/hpo_categories_11.json
    hpo_id → その症状の祖先（自分自身を含む）のうち WATCHED（見出し判定に使う HPO カテゴリ）にあるもの

見出しの順序・日本語・上書きは lib/portal/hpo-categories.ts にある。
このスクリプトは「祖先にどのカテゴリがあるか」という事実だけを書き、判断は書かない。
アプリは hp.obo を読まず、この派生ファイルだけを読む（lib/portal/hpo-overlay.ts と同じ方針）。

使い方: python3 scripts/hpo/build_hpo_categories.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OBO = ROOT / "data" / "hpo" / "hp.obo"
SYMPTOMS = ROOT / "data" / "hpo_symptoms" / "hpo_symptoms_11.json"
OUT = ROOT / "data" / "hpo_categories" / "hpo_categories_11.json"

# 見出し判定に使う HPO カテゴリ（lib/portal/hpo-categories.ts の対応表と同じ集合）
# Phenotypic abnormality (HP:0000118) 直下 23 件 + 臓器が特定できる下位カテゴリ
WATCHED: dict[str, str] = {
    # 下位カテゴリ（臓器が特定できるもの）
    "HP:0001392": "Abnormality of the liver",
    "HP:0025155": "Abnormal hepatobiliary system physiology",
    "HP:0001743": "Abnormality of the spleen",
    "HP:0003011": "Abnormality of the musculature",
    "HP:0000924": "Abnormality of the skeletal system",
    # HP:0000118 直下
    "HP:0025354": "Abnormal cellular phenotype",
    "HP:0001871": "Abnormality of blood and blood-forming tissues",
    "HP:0000152": "Abnormality of head or neck",
    "HP:0040064": "Abnormality of limbs",
    "HP:0001939": "Abnormality of metabolism/homeostasis",
    "HP:0001197": "Abnormality of prenatal development or birth",
    "HP:0000769": "Abnormality of the breast",
    "HP:0001626": "Abnormality of the cardiovascular system",
    "HP:0025031": "Abnormality of the digestive system",
    "HP:0000598": "Abnormality of the ear",
    "HP:0000818": "Abnormality of the endocrine system",
    "HP:0000478": "Abnormality of the eye",
    "HP:0000119": "Abnormality of the genitourinary system",
    "HP:0002715": "Abnormality of the immune system",
    "HP:0001574": "Abnormality of the integument",
    "HP:0033127": "Abnormality of the musculoskeletal system",
    "HP:0000707": "Abnormality of the nervous system",
    "HP:0002086": "Abnormality of the respiratory system",
    "HP:0045027": "Abnormality of the thoracic cavity",
    "HP:0001608": "Abnormality of the voice",
    "HP:0025142": "Constitutional symptom",
    "HP:0001507": "Growth abnormality",
    "HP:0002664": "Neoplasm",
}


def parse_obo(path: Path) -> tuple[dict[str, list[str]], dict[str, str], str]:
    """id → is_a 親、id → 英語名、data-version を返す"""
    parents: dict[str, list[str]] = {}
    names: dict[str, str] = {}
    version = ""
    cur: str | None = None
    with path.open(encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if line.startswith("data-version:"):
                version = line.split(":", 1)[1].strip()
            elif line == "[Term]":
                cur = None
            elif line.startswith("[") and line.endswith("]"):
                cur = None
            elif line.startswith("id: HP:"):
                cur = line[4:]
                parents.setdefault(cur, [])
            elif cur and line.startswith("name: "):
                names[cur] = line[6:]
            elif cur and line.startswith("is_a: "):
                parents[cur].append(line[6:].split(" ")[0])
    return parents, names, version


def ancestors(hpo_id: str, parents: dict[str, list[str]]) -> set[str]:
    out: set[str] = set()
    stack = [hpo_id]
    while stack:
        x = stack.pop()
        for p in parents.get(x, []):
            if p not in out:
                out.add(p)
                stack.append(p)
    return out


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    before = sha256(OBO)
    parents, names, version = parse_obo(OBO)
    for wid, wname in WATCHED.items():
        if names.get(wid) != wname:
            print(f"WATCHED の名前が hp.obo と一致しない: {wid} 期待={wname!r} 実際={names.get(wid)!r}", file=sys.stderr)
            return 1

    src = json.loads(SYMPTOMS.read_text(encoding="utf-8"))
    ids: set[str] = set()
    for k, v in src.items():
        if k.startswith("_"):
            continue
        for s in v["symptoms"]:
            ids.add(s["hpo_id"])

    entries: dict[str, dict] = {}
    for hid in sorted(ids):
        # 自分自身も含める（例: HP:0001608「声の異常」はカテゴリそのもの）
        anc = ancestors(hid, parents) | {hid}
        entries[hid] = {
            "label_en": names.get(hid, ""),
            "categories": sorted(a for a in anc if a in WATCHED),
        }

    out = {
        "_meta": {
            "_readme": [
                "HPO の階層（is_a）から引いた『分類の祖先』。11 疾患の症状ごとに、WATCHED にあるカテゴリのうち祖先にあるものを持つ。",
                "用途: 疾患ページの折りたたみ『くわしい症状の一覧』での見出し分け、将来の JSON-LD。",
                "患者向けの『よくある症状』はこのファイルを使わない（data/disease_summaries/ にある）。",
                "見出しの順序・日本語・上書きは lib/portal/hpo-categories.ts。ここには判断を書かない。",
                "生成: python3 scripts/hpo/build_hpo_categories.py。data/hpo/ の原本は読み取りのみ（生成前後の SHA-256 を照合）。",
            ],
            "generated": date.today().isoformat(),
            "hpo_version": version,
            "source_files": {
                "hp.obo": {"sha256": before},
                "hpo_symptoms_11.json": {"sha256": sha256(SYMPTOMS)},
            },
            "watched_categories": WATCHED,
        },
        "entries": entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    after = sha256(OBO)
    if before != after:
        print("hp.obo が変更された（あってはならない）", file=sys.stderr)
        return 1
    print(f"wrote {OUT.relative_to(ROOT)}: {len(entries)} ids, hpo {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
