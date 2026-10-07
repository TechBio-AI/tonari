#!/usr/bin/env python3
"""Orphanet の英語 Definition を、ローカル原本から取り出す（Web 取得ゼロ）。

入力: data/orphanet/en_product1.xml（版 2026-06-23、CC BY 4.0、無改変の原本。読み取りのみ）
対象: 照合表で orphanet.judgement == "exact" の疾患
出力: data/disease_overviews/_orphanet_definitions.json

ライセンス（CC BY 4.0）の条件2「改変したらその旨を示す」に従い、
原文（definition_raw）と、表示用に <i> 等のタグを外したもの（definition_text）を別々に持つ。
翻訳・要約はしない。
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

XML = Path("data/orphanet/en_product1.xml")
TABLE = Path("data/disease_overviews/_match_table.json")
OUT = Path("data/disease_overviews/_orphanet_definitions.json")

ORPHANET_VERSION = "2026-06-23"
ATTRIBUTION_EN = ("Orphadata: Free access data from Orphanet. © INSERM 1999. "
                  "Available on https://www.orphadata.com. Data version: "
                  "Rare diseases and alignments with terminologies and databases, "
                  "en_product1.xml, 2026-06-23. Licensed under CC BY 4.0.")
ATTRIBUTION_JA = ("本サービスは Orphanet / Orphadata の疾患命名法（en_product1.xml、2026-06-23 版）を"
                  "利用しています。© INSERM 1999. https://www.orphadata.com. "
                  "CC BY 4.0 ライセンスに基づき利用。")


def main() -> None:
    data = json.loads(TABLE.read_text(encoding="utf-8"))
    wanted: dict[str, list[dict]] = {}
    for entry in data["entries"]:
        orpha = entry["orphanet"]
        if orpha["judgement"] != "exact" or not orpha.get("orpha_code"):
            continue
        wanted.setdefault(orpha["orpha_code"].split(":")[1], []).append(entry)
    print(f"対象コード {len(wanted)} 件 / 疾患 {sum(len(v) for v in wanted.values())} 件")

    text = XML.read_text(encoding="utf-8", errors="replace")
    found: dict[str, dict] = {}
    for block in re.finditer(r'<Disorder id="\d+">(.*?)</Disorder>', text, re.S):
        body = block.group(1)
        code_match = re.search(r"<OrphaCode>(\d+)</OrphaCode>", body)
        if not code_match or code_match.group(1) not in wanted:
            continue
        code = code_match.group(1)
        name_match = re.search(r'<Name lang="en">(.*?)</Name>', body, re.S)
        definition = None
        for section in re.finditer(r"<TextSection id=\"\d+\" lang=\"en\">(.*?)</TextSection>", body, re.S):
            section_body = section.group(1)
            kind = re.search(r'<TextSectionType id="\d+">\s*<Name lang="en">(.*?)</Name>', section_body, re.S)
            contents = re.search(r"<Contents>(.*?)</Contents>", section_body, re.S)
            if kind and contents and html.unescape(kind.group(1)).strip() == "Definition":
                definition = html.unescape(contents.group(1)).strip()
                break
        found[code] = {
            "name_en": html.unescape(name_match.group(1)).strip() if name_match else None,
            "definition_raw": definition,
        }

    definitions: dict[str, dict] = {}
    with_definition = 0
    for code, entries in wanted.items():
        record = found.get(code)
        raw = record["definition_raw"] if record else None
        # 原本は実体参照が二重に符号化されている（&amp;#945; 等）。Contents の読み取りで 1 回復号したあと、
        # 表示用の definition_text だけもう 1 回復号する（&#945; → α、&nbsp; → 空白）。definition_raw は変えない。
        # 実体参照の復号は語句の改変に当たらない（2026-09-26 ファウンダー判断。data/orphanet/SOURCE.md に記録）
        plain = (re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", raw)).replace("\u00a0", " ")).strip()
                 if raw else None)
        if plain:
            with_definition += 1
        for entry in entries:
            definitions[str(entry["idx"])] = {
                "idx": entry["idx"],
                "disease": entry["disease"],
                "orpha_code": f"ORPHA:{code}",
                "name_en": record["name_en"] if record else None,
                "has_definition": bool(plain),
                "definition_raw": raw,
                "definition_text": plain,
            }

    OUT.write_text(json.dumps({
        "_readme": [
            "Orphanet の英語 Definition。data/orphanet/en_product1.xml（無改変の原本）から抜き出したもの。",
            "Web 取得はしていない。翻訳・要約もしていない。",
            "definition_raw は原文そのまま（<i> 等のタグを含むことがある）。",
            "definition_text は表示用にタグを外し、実体参照を復号したもの（CC BY 4.0 条件2 の「改変の明示」）。",
            "対象は照合表で orphanet.judgement == 'exact' の疾患のみ。",
            "生成: scripts/portal/build_orphanet_definitions.py",
        ],
        "source": {
            "file": "data/orphanet/en_product1.xml",
            "version": ORPHANET_VERSION,
            "licence": "CC BY 4.0",
            "attribution_en": ATTRIBUTION_EN,
            "attribution_ja": ATTRIBUTION_JA,
        },
        "counts": {
            "diseases": len(definitions),
            "codes": len(wanted),
            "with_definition": sum(1 for v in definitions.values() if v["has_definition"]),
            "without_definition": sum(1 for v in definitions.values() if not v["has_definition"]),
        },
        "definitions": definitions,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"Definition が取れたコード {with_definition} / {len(wanted)}")
    print(f"疾患単位: あり {sum(1 for v in definitions.values() if v['has_definition'])} / "
          f"なし {sum(1 for v in definitions.values() if not v['has_definition'])}")
    print(f"書き出し: {OUT}")


if __name__ == "__main__":
    main()
