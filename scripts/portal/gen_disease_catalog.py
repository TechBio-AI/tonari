#!/usr/bin/env python3
"""
disease_catalog の seed（INSERT 文）を data/disease_ids.json から機械で作る（共通契約 2026-10-03 の A）。

読むもの（読み取りのみ）:
  data/disease_ids.json … 疾患概要担当が置く対応表（stable_id・idx・主名・orpha_code）

書くもの:
  supabase/migrations/20261023_disease_catalog.sql の
  「-- BEGIN DISEASE CATALOG」〜「-- END DISEASE CATALOG」の間（--write のときだけ）

使い方:
  python3 scripts/portal/gen_disease_catalog.py           # 生成した SQL を標準出力に出す
  python3 scripts/portal/gen_disease_catalog.py --write   # migration の印の間を書き換える
  python3 scripts/portal/gen_disease_catalog.py --check   # migration と差分が無ければ 0、あれば 1 で終わる

止まる条件（推測で埋めない）:
  stable_id が rd + 5 桁でない・重複・idx の重複や負の値・主名が空 のどれかがあれば、何も書かずに 1 で終わる。

★ 適用済みの migration は書き換えない。20261023 を当てた後に対応表が変わったら、--write はせず、
  新しい migration で差分（足された病気の INSERT など）を当てること。
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IDS_PATH = ROOT / "data" / "disease_ids.json"
MIGRATION_PATH = ROOT / "supabase" / "migrations" / "20261023_disease_catalog.sql"
BEGIN = "-- BEGIN DISEASE CATALOG（scripts/portal/gen_disease_catalog.py の出力。手で書き換えない）"
END = "-- END DISEASE CATALOG"


def sql_text(value: str) -> str:
    """SQL の文字列リテラル。単引用符を重ねる"""
    return "'" + value.replace("'", "''") + "'"


def load_rows() -> list[dict]:
    diseases = json.loads(IDS_PATH.read_text(encoding="utf-8"))["diseases"]
    problems = []
    seen_ids: set[str] = set()
    seen_idx: set[int] = set()
    for d in diseases:
        sid, idx, name = d.get("stable_id"), d.get("idx"), d.get("name")
        if not isinstance(sid, str) or not re.fullmatch(r"rd\d{5}", sid):
            problems.append(f"stable_id の形が違う: {sid!r}")
        elif sid in seen_ids:
            problems.append(f"stable_id が重複: {sid}")
        if not isinstance(idx, int) or idx < 0:
            problems.append(f"{sid}: idx が 0 以上の整数でない: {idx!r}")
        elif idx in seen_idx:
            problems.append(f"{sid}: idx が重複: {idx}")
        if not isinstance(name, str) or not name.strip():
            problems.append(f"{sid}: 主名が空")
        seen_ids.add(sid)
        seen_idx.add(idx)
    if problems:
        for p in problems:
            print(p, file=sys.stderr)
        print("data/disease_ids.json に問題があるので止めました。推測で埋めません。", file=sys.stderr)
        sys.exit(1)
    return sorted(diseases, key=lambda d: d["stable_id"])


def build_block(rows: list[dict]) -> str:
    lines = [BEGIN, "INSERT INTO public.disease_catalog (disease_id, idx, name) VALUES"]
    values = [f"    ({sql_text(d['stable_id'])}, {d['idx']}, {sql_text(d['name'])})" for d in rows]
    lines.append(",\n".join(values))
    lines.append("ON CONFLICT (disease_id) DO UPDATE SET")
    lines.append("    idx  = EXCLUDED.idx,")
    lines.append("    name = EXCLUDED.name;")
    lines.append(END)
    return "\n".join(lines)


def replace_block(text: str, block: str) -> str:
    start = text.index(BEGIN)
    end = text.index(END, start) + len(END)
    return text[:start] + block + text[end:]


def main() -> int:
    rows = load_rows()
    block = build_block(rows)
    mode = sys.argv[1] if len(sys.argv) > 1 else ""

    if mode == "":
        print(block)
        return 0

    current = MIGRATION_PATH.read_text(encoding="utf-8")
    if BEGIN not in current or END not in current:
        print(f"{MIGRATION_PATH} に印（BEGIN / END DISEASE CATALOG）がありません。", file=sys.stderr)
        return 1
    updated = replace_block(current, block)

    if mode == "--check":
        if updated == current:
            print("差分なし")
            return 0
        print("migration と data/disease_ids.json から作った seed に差分があります。", file=sys.stderr)
        return 1
    if mode == "--write":
        MIGRATION_PATH.write_text(updated, encoding="utf-8")
        print(f"書きました: {MIGRATION_PATH.relative_to(ROOT)}（{len(rows)} 件）")
        return 0

    print("使い方: gen_disease_catalog.py [--write | --check]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
