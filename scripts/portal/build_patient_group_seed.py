#!/usr/bin/env python3
"""
患者会テナントの seed（patient_groups の INSERT 文）を機械で作る。

読むもの（どちらも読み取りのみ。書き換えない）:
  - data/patient_groups/patient_groups.json            … slug（= JSON の id）・団体名・疾患名
  - data/knowledge/comprehensive_rare_diseases_knowledge.json … 疾患名 → 配列上の位置（idx）

出すもの:
  標準出力に SQL を出すだけ。migration への貼り付けは人（または Claude Code）が行う。
  supabase/migrations/20260927_patient_group_tenancy.sql の
  「-- BEGIN SEED」〜「-- END SEED」の間がこの出力。

idx について（docs/kb_issues_2026-08-29.md の 47）:
  知識ファイルに固定 ID は無く、idx は配列の並び順。統合・追加・並べ替えでずれる。
  そのため、作った時点の疾患名を disease_names に併記する。
  疾患名が知識ファイルに無い・2 件以上ある場合は、推測で埋めずに止まる。

使い方:
  python3 scripts/portal/build_patient_group_seed.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GROUPS_PATH = ROOT / "data" / "patient_groups" / "patient_groups.json"
KNOWLEDGE_PATH = ROOT / "data" / "knowledge" / "comprehensive_rare_diseases_knowledge.json"


def sql_text(value: str) -> str:
    """SQL の文字列リテラル。単引用符を重ねる"""
    return "'" + value.replace("'", "''") + "'"


def main() -> int:
    groups = json.loads(GROUPS_PATH.read_text(encoding="utf-8"))["groups"]
    knowledge = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))

    positions: dict[str, list[int]] = {}
    for idx, record in enumerate(knowledge):
        positions.setdefault(record["disease"], []).append(idx)

    rows = []
    problems = []
    for g in groups:
        idxs = []
        for name in g["diseases"]:
            found = positions.get(name, [])
            if len(found) != 1:
                problems.append(f"{g['id']}: 疾患名「{name}」が知識ファイルに {len(found)} 件")
                continue
            idxs.append(found[0])
        rows.append((g["id"], g["name"], idxs, g["diseases"]))

    if problems:
        for p in problems:
            print(p, file=sys.stderr)
        print("疾患名の照合で止まりました。推測で埋めません。", file=sys.stderr)
        return 1

    print("-- BEGIN SEED（scripts/portal/build_patient_group_seed.py の出力。手で書き換えない）")
    print("INSERT INTO public.patient_groups (slug, name, disease_idxs, disease_names) VALUES")
    lines = []
    for slug, name, idxs, names in rows:
        idx_sql = "ARRAY[" + ", ".join(str(i) for i in idxs) + "]::INT[]"
        names_sql = "ARRAY[" + ", ".join(sql_text(n) for n in names) + "]::TEXT[]"
        lines.append(f"    ({sql_text(slug)}, {sql_text(name)}, {idx_sql}, {names_sql})")
    print(",\n".join(lines))
    print("ON CONFLICT (slug) DO UPDATE SET")
    print("    name          = EXCLUDED.name,")
    print("    disease_idxs  = EXCLUDED.disease_idxs,")
    print("    disease_names = EXCLUDED.disease_names;")
    print("-- END SEED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
