#!/usr/bin/env python3
"""疾患の固定 ID（stable_id）を知識ファイルに付け、対応表 data/disease_ids.json を作る（共通契約 A、2026-10-03）。

    python3 scripts/portal/assign_stable_ids.py --dry-run
    python3 scripts/portal/assign_stable_ids.py

- 付番は rd00001 から、いまの idx 順。各レコードの先頭のキーとして入れる
- すでに stable_id を持つレコードがあれば何もせずに止まる（付け直さない。対応は不変）
- 書き込んだ後、stable_id を外して同じ書式で書き出したものの sha256 が、書き込む前の原本の sha256 と
  一致することを確かめる（差分が stable_id の追加だけであることの確認）。一致しなければ原本に戻して止まる
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

KB = Path("data/knowledge/comprehensive_rare_diseases_knowledge.json")
IDS = Path("data/disease_ids.json")


def dump(data) -> bytes:
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="stable_id を付ける")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    original = KB.read_bytes()
    kb = json.loads(original)
    if dump(kb) != original:
        print("知識ファイルの書式が json.dumps(indent=2) と一致しません。差分の確認ができないので止めます。", file=sys.stderr)
        return 1
    if any("stable_id" in r for r in kb):
        print("すでに stable_id を持つレコードがあります。付け直しはしません。", file=sys.stderr)
        return 1

    new = [{"stable_id": f"rd{i + 1:05d}", **r} for i, r in enumerate(kb)]
    stripped = [{k: v for k, v in r.items() if k != "stable_id"} for r in new]
    before, after_stripped = sha(original), sha(dump(stripped))
    print(f"件数 {len(new)}／{new[0]['stable_id']}〜{new[-1]['stable_id']}")
    print(f"原本 sha256 {before}")
    print(f"stable_id を外した版の sha256 {after_stripped}")
    if before != after_stripped:
        print("一致しません。書き込みません。", file=sys.stderr)
        return 1
    ids = {
        "_readme": [
            "疾患の固定 ID（stable_id）と、知識ファイル上の位置（idx）・主名・orpha_code の対応表（共通契約 A）。",
            "この対応は不変。知識ファイルの並び替え・統合・分割をしても stable_id は変えない。新しい疾患は末尾に付番する。",
            "idx・主名・orpha_code は作成時（2026-10-03）の値。詳しくは docs/disease_ids.md",
            "生成: scripts/portal/assign_stable_ids.py",
        ],
        "diseases": [{"stable_id": r["stable_id"], "idx": i, "name": r["disease"], "orpha_code": r.get("orpha_code")}
                     for i, r in enumerate(new)],
    }
    if args.dry_run:
        print("--dry-run なので書いていません。")
        return 0

    written = dump(new)
    KB.write_bytes(written)
    check = sha(dump([{k: v for k, v in r.items() if k != "stable_id"} for r in json.loads(KB.read_bytes())]))
    if check != before:
        KB.write_bytes(original)
        print("書き込み後の確認で一致しませんでした。原本に戻しました。", file=sys.stderr)
        return 1
    IDS.write_text(json.dumps(ids, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"書き込み後 sha256 {sha(written)}（stable_id を外すと原本と一致）")
    print(f"書き込み: {KB}、{IDS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
