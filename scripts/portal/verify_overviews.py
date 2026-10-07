#!/usr/bin/env python3
"""フェーズ2 検証器：抽出結果の evidence が出典本文に実在するかを照合する。

    python3 scripts/portal/verify_overviews.py --dry-run   # 一覧だけ（JSON は変えない）
    python3 scripts/portal/verify_overviews.py             # 不一致の事実を JSON から落とす

- 入力は data/disease_overviews/<idx>.json（docs/disease_overview_phase1_spec_2026-09-24.md のスキーマ）と
  .cache/disease_sources/ の保存 HTML。Web 取得はしない。
- 照合対象は summary / symptoms[] / onset / treatment の evidence。
  本文（script・style を除き、タグを外し、実体参照を戻したもの）に無改変で含まれれば一致。
  許容する差は空白と全角・半角（U+FF00–FFEF の範囲だけ NFKC）のみ。それ以外の差は不一致。
- 保存 HTML の sha256 が照合表（と JSON の sources[].sha256）と一致しない、または保存 HTML が無い疾患は、
  全件「未検証」として何も落とさない。
- Orphanet は保存 HTML が無いので _orphanet_definitions.json の definition_text と照合する。
  sha は取れないため、代わりに取得元ファイル名と版を一覧の理由列に残す（2026-09-25 ファウンダー指示）。
- 不一致の事実は symptoms なら要素を削り、summary / onset / treatment は null にする。他は変えない。
- 一覧は docs/disease_overview_verify_<日付>.md。--dry-run でも一覧は書く（冒頭に「未適用」）。
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

OVERVIEWS = Path("data/disease_overviews")
TABLE = OVERVIEWS / "_match_table.json"
ORPHA = OVERVIEWS / "_orphanet_definitions.json"
DOCS = Path("docs")
JST = timezone(timedelta(hours=9))

SINGLE_FACTS = ("summary", "onset", "treatment")


# ---------------------------------------------------------------- 正規化


def _fold_width(ch: str) -> str:
    # 全角英数記号・半角カナの範囲だけ揃える。丸数字・ローマ数字・㈱ などは触らない。
    return unicodedata.normalize("NFKC", ch) if "\uff00" <= ch <= "\uffef" else ch


def normalize(text: str) -> str:
    """空白をすべて除き、全角・半角の差だけを揃える。"""
    folded = "".join(_fold_width(ch) for ch in text)
    folded = unicodedata.normalize("NFC", folded)  # 半角カナの濁点を結合させる
    return re.sub(r"\s+", "", folded)


def html_body(raw: str) -> str:
    raw = re.sub(r"<(script|style)\b.*?</\1\s*>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<!--.*?-->", " ", raw, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---------------------------------------------------------------- 結果


@dataclass
class Row:
    idx: int
    name: str
    reading: str
    fact: str  # "summary" / "symptoms[2]" など
    text: str
    evidence: str
    reason: str


@dataclass
class Result:
    diseases: int = 0
    facts: int = 0
    dropped: list[Row] = field(default_factory=list)
    unverified: list[Row] = field(default_factory=list)
    orphanet_ok: list[Row] = field(default_factory=list)
    warnings: list[Row] = field(default_factory=list)


# ---------------------------------------------------------------- 照合


class Verifier:
    def __init__(self, root: Path = Path(".")) -> None:
        self.root = root
        table = json.loads((root / TABLE).read_text(encoding="utf-8"))
        self.entries = {e["idx"]: e for e in table["entries"]}
        orpha = json.loads((root / ORPHA).read_text(encoding="utf-8"))
        self.orpha_defs = orpha["definitions"]
        src = orpha.get("source", {})
        self.orpha_origin = f"照合先 {src.get('file', '?')}（{src.get('version', '?')} 版）・sha なし"
        self._bodies: dict[str, str] = {}

    def _html_text(self, cache_file: str) -> str:
        if cache_file not in self._bodies:
            raw = (self.root / cache_file).read_text(encoding="utf-8", errors="replace")
            self._bodies[cache_file] = normalize(html_body(raw))
        return self._bodies[cache_file]

    def integrity_problem(self, data: dict) -> str | None:
        """使った出典の保存 HTML が照合表どおりかを確かめる。問題があれば理由を返す。"""
        entry = self.entries.get(data.get("idx"))
        if entry is None:
            return "照合表に idx が無い"
        declared = {s.get("id"): s for s in data.get("sources", []) if isinstance(s, dict)}
        for sid, source in declared.items():
            if sid == "orphanet":
                continue
            fetch = (entry.get(sid) or {}).get("page_fetch")
            if not fetch:
                return f"{sid}: 照合表に取得記録が無い"
            path = self.root / fetch["cache_file"]
            if not path.exists():
                return f"{sid}: 保存 HTML が無い（{fetch['cache_file']}）"
            actual = sha256_of(path)
            if actual != fetch["sha256"]:
                return f"{sid}: 保存 HTML の sha256 が照合表と不一致（{actual[:12]}… ≠ {fetch['sha256'][:12]}…）"
            if source.get("sha256") != fetch["sha256"]:
                return f"{sid}: sources[].sha256 が照合表と不一致"
        return None

    def check(self, idx: int, source_id: str, evidence: str, declared: set[str]) -> tuple[bool, str]:
        """(一致したか, 理由) を返す。"""
        if not isinstance(evidence, str) or not evidence.strip():
            return False, "evidence が空"
        if source_id not in declared:
            return False, f"source_id {source_id!r} が sources に無い"
        if source_id == "orphanet":
            record = self.orpha_defs.get(str(idx)) or {}
            body = record.get("definition_text")
            if not body:
                return False, f"Orphanet の Definition が無い／{self.orpha_origin}"
            if normalize(evidence) in normalize(body):
                return True, self.orpha_origin
            return False, f"本文に見つからない／{self.orpha_origin}"
        fetch = self.entries[idx][source_id]["page_fetch"]
        if normalize(evidence) in self._html_text(fetch["cache_file"]):
            return True, ""
        return False, f"本文に見つからない（{source_id}）"


def iter_facts(data: dict):
    """(fact 名, fact dict, symptoms の位置 or None) を返す。事実でないものは飛ばす。"""
    for key in SINGLE_FACTS:
        fact = data.get(key)
        if not isinstance(fact, dict):
            continue
        if key == "treatment" and fact.get("type") == "記載なし" and not fact.get("evidence"):
            continue
        yield key, fact, None
    for i, fact in enumerate(data.get("symptoms") or []):
        if isinstance(fact, dict):
            yield f"symptoms[{i}]", fact, i


def fact_label(key: str, fact: dict) -> str:
    return fact.get("type", "") if key == "treatment" else fact.get("text", "")


def verify_file(v: Verifier, path: Path, result: Result, apply: bool) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    idx = data.get("idx")
    entry = v.entries.get(idx, {})
    name = data.get("name") or entry.get("disease", "")
    reading = entry.get("reading", "")
    result.diseases += 1

    def row(key: str, fact: dict, reason: str) -> Row:
        return Row(idx, name, reading, key, fact_label(key, fact), fact.get("evidence", ""), reason)

    facts = list(iter_facts(data))
    result.facts += len(facts)

    problem = v.integrity_problem(data)
    if problem:
        result.unverified.extend(row(k, f, f"未検証：{problem}") for k, f, _ in facts)
        return

    declared = {s.get("id") for s in data.get("sources", []) if isinstance(s, dict)}
    drop_single: list[str] = []
    drop_symptoms: set[int] = set()
    for key, fact, pos in facts:
        ok, reason = v.check(idx, fact.get("source_id"), fact.get("evidence"), declared)
        if ok:
            if fact.get("source_id") == "orphanet":
                result.orphanet_ok.append(row(key, fact, reason))
            continue
        result.dropped.append(row(key, fact, reason))
        if pos is None:
            drop_single.append(key)
        else:
            drop_symptoms.add(pos)

    if not drop_single and not drop_symptoms:
        return

    remaining = len(data.get("symptoms") or []) - len(drop_symptoms)
    if remaining < 3:
        result.warnings.append(Row(idx, name, reading, "symptoms", "", "", f"落とした後の symptoms が {remaining} 件（3 件未満）"))
    if "summary" in drop_single:
        result.warnings.append(Row(idx, name, reading, "summary", "", "", "落とした後 summary が無い"))

    if apply:
        for key in drop_single:
            data[key] = None
        if drop_symptoms:
            data["symptoms"] = [s for i, s in enumerate(data["symptoms"]) if i not in drop_symptoms]
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def overview_files(root: Path) -> list[Path]:
    files = [p for p in (root / OVERVIEWS).glob("*.json") if not p.name.startswith("_")]
    return sorted(files, key=lambda p: int(p.stem) if p.stem.isdigit() else 10**9)


# ---------------------------------------------------------------- 一覧


def _cell(s: str) -> str:
    return (s or "").replace("|", "\\|").replace("\n", " ")


def _table(rows: list[Row], with_fact_cols: bool = True) -> list[str]:
    if not rows:
        return ["（なし）", ""]
    if with_fact_cols:
        out = ["| idx | 病名（ふりがな） | 落とした事実 | evidence | 理由 |", "|---|---|---|---|---|"]
        out += [f"| {r.idx} | {_cell(r.name)}（{_cell(r.reading)}） | {r.fact}: {_cell(r.text)} | {_cell(r.evidence)} | {_cell(r.reason)} |"
                for r in rows]
    else:
        out = ["| idx | 病名（ふりがな） | 項目 | 内容 |", "|---|---|---|---|"]
        out += [f"| {r.idx} | {_cell(r.name)}（{_cell(r.reading)}） | {r.fact} | {_cell(r.reason)} |" for r in rows]
    return out + [""]


def render_report(result: Result, dry_run: bool, now: datetime) -> str:
    unverified_diseases = len({r.idx for r in result.unverified})
    lines = [
        f"# 疾患概要 evidence 照合結果（{now.date().isoformat()}）",
        "",
        "> **dry-run：未適用。** JSON は変更していない。承認後に `--dry-run` なしで実行すると下の「不一致」を落とす。"
        if dry_run else f"> **適用済み**（{now.isoformat(timespec='seconds')}）。下の「不一致」は JSON から落とした。",
        "",
        "生成: `scripts/portal/verify_overviews.py`。許容する差は空白と全角・半角のみ。",
        "",
        "## 結果サマリ",
        "",
        "| 疾患数 | 事実数 | 不一致数 | 未検証数 |",
        "|---|---|---|---|",
        f"| {result.diseases} | {result.facts} | {len(result.dropped)} | {len(result.unverified)}（{unverified_diseases} 疾患） |",
        "",
        "## 不一致（落とす事実）",
        "",
        *_table(result.dropped),
        "## 未検証（sha 不一致・保存 HTML 無し。何も落としていない）",
        "",
        *_table(result.unverified),
        "## 要注意（落とした後に形が崩れるもの。直していない）",
        "",
        *_table(result.warnings, with_fact_cols=False),
        "## Orphanet 由来で一致した事実（sha を取れないため照合先を記録）",
        "",
        *_table(result.orphanet_ok),
    ]
    return "\n".join(lines)


def summary_line(result: Result) -> str:
    return (f"疾患数 {result.diseases}／事実数 {result.facts}／"
            f"不一致数 {len(result.dropped)}／未検証数 {len(result.unverified)}")


def run(root: Path, dry_run: bool, now: datetime | None = None) -> tuple[Result, Path]:
    now = now or datetime.now(JST)
    v = Verifier(root)
    result = Result()
    for path in overview_files(root):
        verify_file(v, path, result, apply=not dry_run)
    report = root / DOCS / f"disease_overview_verify_{now.date().isoformat()}.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(render_report(result, dry_run, now), encoding="utf-8")
    return result, report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="JSON を変えず一覧だけ書く")
    args = parser.parse_args()
    result, report = run(Path("."), args.dry_run)
    print(("[dry-run] " if args.dry_run else "") + summary_line(result))
    print(f"一覧: {report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
