#!/usr/bin/env python3
"""フェーズ1 の出力（data/disease_overviews/<idx>.json）を検証する。

    python3 scripts/portal/validate_overview.py                  # 全件
    python3 scripts/portal/validate_overview.py --shard 2        # 担当ぶんだけ
    python3 scripts/portal/validate_overview.py --shard-name orphanet_shard_1
    python3 scripts/portal/validate_overview.py --file path.json # 1 ファイル

仕様は docs/disease_overview_phase1_spec_2026-09-24.md。
不合格が 1 件でもあれば exit 1。

落とす（不合格）:
  - 必須項目の欠け・型違い
  - summary.text が 80 字超 / evidence が 40 字超
    （summary.lang が "en" のときは 80 字の上限を当てはめない。上限は出典の原文全体）
  - evidence が出典本文に**そのままの形で見つからない**（改変の検出）
  - symptoms が 3〜8 件の外（summary.lang が "en" のときは 0〜8 件を許す）
  - treatment.type が決められた 4 つ以外
  - onset の text / evidence に数字（半角・全角・漢数字）を含む（2026-09-25 ファウンダー指示）
    ただし ONSET_KANSUJI_ALLOW の語の一部として現れる漢数字は許す（2026-09-25 承認）
  - docs/wording-blocklist-demo.txt の禁止語を含む
  - source_id が sources に無い / sources の url・sha256 が照合表と違う
  - 日本語の出典があるのに lang が "en"
  - lang en の症状語句が、症状でない語（progressive / depending on / onset / prognosis / clinical signs 等）だけでできている
    （2026-09-26 ファウンダー指示。NON_SYMPTOM_WORDS に無い語が 1 語でもあれば通す）

注意（不合格にはしないが出す）:
  - treatment にカタカナ 5 文字以上が残っている（薬剤名の混入かもしれない）
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
ORPHA = OVERVIEWS / "_orphanet_definitions.json"
BLOCKLIST_FILE = Path("docs/wording-blocklist-demo.txt")

KANJI_DIGITS = "〇零一二三四五六七八九十百千万億兆"
ARABIC_DIGIT = re.compile(r"[0-9０-９]")
KANJI_DIGIT = re.compile(r"[" + KANJI_DIGITS + r"]")

# onset の漢数字規則の許容一覧（2026-09-25 ファウンダー承認。13 語で固定）
#
# 数を表さない固定語だけを許す。難病情報センターの保存本文 163 枚から機械で洗い出し、
# onset の節に実際に出た語に絞ったもの（docs/onset_kansuji_allowlist_2026-09-25.md）。
# 部分一致で見るので「一般」を許せば「一般的」も通る。
#
# ★ 1b の抽出中に新しい語が出ても、この一覧は更新しない。その文は onset を null に落とす。
#   1b の完了後に「新たに落ちた文」をまとめて出し、追加するかを判断する（2026-09-25 指示）。
#
# 許容しない語（数の文脈で使われる。許すと規則の目的が崩れる）:
#   万人 / 万人当 / 万人対 / 万出 / 万出生 / 万人以 / 万人出 / 千人 / 千個 / 千種 / 千種類 /
#   一人 / 一次 / 一次性 / 一社 / 三尖 / 三尖弁 / 三叉 / 三叉神
ONSET_KANSUJI_ALLOW = (
    "一部", "一般", "一方", "一定", "一度", "十分", "四徴",
    "四肢", "二次", "一番", "三好", "同一", "一家",
)
DIGIT = re.compile(r"[0-9０-９" + KANJI_DIGITS + r"]")
TREATMENT_TYPES = {"治療法あり", "症状を抑える治療が中心", "研究段階", "記載なし"}
SOURCE_IDS = {"nanbyou", "shouman", "orphanet"}
KATAKANA_RUN = re.compile(r"[ァ-ヴ][ァ-ヴー]{4,}")
# 英語の症状語句（Orphanet のみの疾患）で、症状でない語だけからなる項目を落とす（2026-09-26 ファウンダー指示）。
# 例: "progressive" / "depending on the age of onset" / "variable clinical signs" / "characterized by"
# 1 語でもここに無い語（症状の中身）があれば通す。
NON_SYMPTOM_WORDS = frozenset("""
a an the and or of on in at to by with as from for such
progressive progressively slowly rapidly depending depend depends onset age ages prognosis
clinical clinically sign signs characterized characterised characterizing variable variably variety
often usually typically frequently sometimes mainly mostly generally commonly rarely occasionally
mild moderate severe severity rare common various several multiple other additional
early late presentation presentations manifestation manifestations feature features
symptom symptoms involvement course phenotype spectrum form forms type types
""".split())
WORD = re.compile(r"[a-z]+")


def non_symptom_only(text: str) -> bool:
    words = WORD.findall(text.lower())
    return bool(words) and all(w in NON_SYMPTOM_WORDS for w in words)


def onset_digits(text: str) -> str:
    """onset で許されない数字だけを返す。許容一覧の語の一部である漢数字は数えない。"""
    bad = []
    for match in ARABIC_DIGIT.finditer(text):
        bad.append(match.group(0))
    for match in KANJI_DIGIT.finditer(text):
        position = match.start()
        allowed = False
        for word in ONSET_KANSUJI_ALLOW:
            start = max(0, position - len(word) + 1)
            for begin in range(start, position + 1):
                if text[begin:begin + len(word)] == word:
                    allowed = True
                    break
            if allowed:
                break
        if not allowed:
            bad.append(match.group(0))
    return "".join(sorted(set(bad)))


def load_blocklist() -> list[str]:
    return [line.strip() for line in BLOCKLIST_FILE.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")]


def squeeze(text: str) -> str:
    """空白をすべて取り除いた形。HTML の改行位置の違いで誤検出しないため。"""
    return re.sub(r"\s+", "", text)


def page_text(path: str) -> str:
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style).*?</\1>", " ", raw, flags=re.S)
    return squeeze(html.unescape(re.sub(r"<[^>]+>", " ", raw)))


class Validator:
    def __init__(self) -> None:
        table = json.loads(TABLE.read_text(encoding="utf-8"))
        self.entries = {e["idx"]: e for e in table["entries"]}
        self.orpha = json.loads(ORPHA.read_text(encoding="utf-8"))["definitions"]
        self.blocklist = load_blocklist()
        self._page_cache: dict[str, str] = {}

    def source_body(self, idx: int, source_id: str) -> str | None:
        if source_id == "orphanet":
            record = self.orpha.get(str(idx))
            if not record:
                return None
            return squeeze((record.get("definition_raw") or "") + (record.get("definition_text") or ""))
        entry = self.entries.get(idx)
        fetch = entry[source_id].get("page_fetch") if entry else None
        if not fetch:
            return None
        path = fetch["cache_file"]
        if path not in self._page_cache:
            self._page_cache[path] = page_text(path)
        return self._page_cache[path]

    def check_fact(self, idx: int, where: str, fact: dict, ids: set[str],
                   errors: list[str], *, max_text: int | None = None) -> None:
        text = fact.get("text")
        evidence = fact.get("evidence")
        source_id = fact.get("source_id")
        if not isinstance(text, str) or not text.strip():
            errors.append(f"{where}: text が無い")
            return
        if max_text and len(text) > max_text:
            errors.append(f"{where}: text が {len(text)} 字（上限 {max_text}）")
        if not isinstance(evidence, str) or not evidence.strip():
            errors.append(f"{where}: evidence が無い")
            return
        if len(evidence) > 40:
            errors.append(f"{where}: evidence が {len(evidence)} 字（上限 40）")
        if source_id not in ids:
            errors.append(f"{where}: source_id {source_id!r} が sources に無い")
            return
        body = self.source_body(idx, source_id)
        if body is None:
            errors.append(f"{where}: 出典 {source_id} の本文が手元に無い（照合できない）")
        elif squeeze(evidence) not in body:
            errors.append(f"{where}: evidence が出典本文に見つからない（改変の疑い）: {evidence!r}")
        for word in self.blocklist:
            if word in text or word in evidence:
                errors.append(f"{where}: 禁止語「{word}」を含む")

    def validate(self, path: Path) -> tuple[list[str], list[str]]:
        errors: list[str] = []
        warnings: list[str] = []
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            return [f"JSON として読めない: {exc}"], []

        idx = data.get("idx")
        if not isinstance(idx, int):
            return ["idx が無い"], []
        if path.stem != str(idx):
            errors.append(f"ファイル名 {path.stem} と idx {idx} が違う")
        entry = self.entries.get(idx)
        if entry is None:
            return [f"照合表に idx {idx} が無い"], []
        if data.get("name") != entry["disease"]:
            errors.append(f"name が照合表と違う: {data.get('name')!r} ≠ {entry['disease']!r}")

        # sources
        sources = data.get("sources")
        if not isinstance(sources, list) or not sources:
            return errors + ["sources が空"], warnings
        ids: set[str] = set()
        for source in sources:
            sid = source.get("id")
            if sid not in SOURCE_IDS:
                errors.append(f"sources: id {sid!r} が不正")
                continue
            ids.add(sid)
            if sid == "orphanet":
                continue
            fetch = entry[sid].get("page_fetch")
            if not fetch:
                errors.append(f"sources[{sid}]: 照合表に取得記録が無い出典を使っている")
                continue
            if source.get("url") != fetch["url"]:
                errors.append(f"sources[{sid}]: url が照合表と違う")
            if source.get("sha256") != fetch["sha256"]:
                errors.append(f"sources[{sid}]: sha256 が照合表と違う")

        # summary
        summary = data.get("summary")
        english = isinstance(summary, dict) and summary.get("lang") == "en"
        if not isinstance(summary, dict):
            errors.append("summary が無い")
        else:
            # 英語の要約は Orphanet の Definition をそのまま出すので、80 字の上限は当てはめない
            # （2026-09-25 ファウンダー指示。上限は出典の原文全体）
            self.check_fact(idx, "summary", summary, ids, errors,
                            max_text=None if english else 80)
            lang = summary.get("lang")
            if lang not in {"ja", "en"}:
                errors.append(f"summary.lang が不正: {lang!r}")
            elif lang == "en" and (ids & {"nanbyou", "shouman"}):
                errors.append("日本語の出典があるのに summary.lang が en")

        # symptoms
        symptoms = data.get("symptoms")
        if not isinstance(symptoms, list):
            errors.append("symptoms が無い")
        else:
            # 英語の要約（Orphanet のみの疾患）は列挙が無いこともあるので下限を置かない
            low = 0 if english else 3
            if not low <= len(symptoms) <= 8:
                errors.append(f"symptoms が {len(symptoms)} 件（{low}〜8 件）")
            for i, symptom in enumerate(symptoms):
                self.check_fact(idx, f"symptoms[{i}]", symptom, ids, errors)
                text = symptom.get("text") if isinstance(symptom, dict) else None
                if english and isinstance(text, str) and non_symptom_only(text):
                    errors.append(f"symptoms[{i}]: 症状でない語だけの項目: {text!r}")

        # onset（null 可。数字を含めない）
        onset = data.get("onset", None)
        if onset is not None:
            if not isinstance(onset, dict):
                errors.append("onset が dict でも null でもない")
            else:
                self.check_fact(idx, "onset", onset, ids, errors)
                for field in ("text", "evidence"):
                    value = onset.get(field)
                    if not isinstance(value, str):
                        continue
                    found = onset_digits(value)
                    if found:
                        errors.append(f"onset.{field}: 数字を含む（{found}）。onset は数字を含めない")

        # treatment
        treatment = data.get("treatment")
        if not isinstance(treatment, dict):
            errors.append("treatment が無い")
        else:
            kind = treatment.get("type")
            if kind not in TREATMENT_TYPES:
                errors.append(f"treatment.type が不正: {kind!r}")
            if kind == "記載なし":
                if treatment.get("evidence"):
                    warnings.append("treatment.type が「記載なし」なのに evidence がある")
            else:
                fact = dict(treatment)
                fact["text"] = kind
                self.check_fact(idx, "treatment", fact, ids, errors)
            for field in ("type", "evidence"):
                value = treatment.get(field)
                if isinstance(value, str):
                    for run in KATAKANA_RUN.findall(value):
                        warnings.append(f"treatment.{field}: カタカナ「{run}」（薬剤名の混入かもしれない）")

        # links / notes / shard
        links = data.get("links")
        if not isinstance(links, list):
            errors.append("links が無い")
        else:
            for link in links:
                if link.get("id") not in SOURCE_IDS:
                    errors.append(f"links: id {link.get('id')!r} が不正")
                if link.get("label") not in {"公式ページ", "関連する群のページ"}:
                    errors.append(f"links: label {link.get('label')!r} が不正")
        if not isinstance(data.get("notes"), list):
            errors.append("notes が配列でない")
        if not isinstance(data.get("extracted_at"), str):
            errors.append("extracted_at が無い")
        shard = data.get("shard")
        if shard not in {1, 2, 3, 4}:
            errors.append(f"shard が不正: {shard!r}")
        else:
            # 担当リストは系統が複数ある（shard_N / orphanet_shard_N …）。
            # 宣言された番号のどれかに入っていればよい。
            lists = sorted((OVERVIEWS / "_shards").glob(f"*shard_{shard}.json"))
            belongs = any(idx in json.loads(p.read_text(encoding="utf-8")) for p in lists)
            if not belongs:
                names = " / ".join(p.stem for p in lists)
                errors.append(f"idx {idx} は shard {shard} のどの担当リストにも無い（{names}）")
        return errors, warnings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int)
    parser.add_argument("--shard-name", help="_shards/<名前>.json を担当リストとして使う")
    parser.add_argument("--file", type=Path)
    args = parser.parse_args()

    if args.file:
        files = [args.file]
    else:
        files = sorted(OVERVIEWS.glob("[0-9]*.json"), key=lambda p: int(p.stem))
        name = args.shard_name or (f"shard_{args.shard}" if args.shard else None)
        if name:
            assigned = set(json.loads(
                (OVERVIEWS / "_shards" / f"{name}.json").read_text(encoding="utf-8")))
            files = [f for f in files if int(f.stem) in assigned]

    if not files:
        print("検証する出力がありません。")
        return

    validator = Validator()
    ng = 0
    warn_total = 0
    for path in files:
        errors, warnings = validator.validate(path)
        warn_total += len(warnings)
        if errors:
            ng += 1
            print(f"✗ {path}")
            for message in errors:
                print(f"    {message}")
        for message in warnings:
            print(f"  ! {path.name}: {message}")

    print(f"\n検証 {len(files)} 件 / 不合格 {ng} 件 / 注意 {warn_total} 件")
    sys.exit(1 if ng else 0)


if __name__ == "__main__":
    main()
