#!/usr/bin/env python3
"""ファウンダーが ○ × ? を記入する確認シートを書き出す。

_match_table.json の「要確認」を、**候補 1 つにつき 1 行**にほどいて並べる。
判定列だけが人の記入欄で、それ以外はすべて機械生成。

記入後は scripts/portal/apply_review.py で _match_table.json に反映する。
行の同定は (idx, 出典, URL / ORPHA コード) で行うので、**列の順と内容は変えないこと**。
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_match_table import CACHE, load_manifest, norm, parse_nanbyou, parse_shouman  # noqa: E402

SRC = Path("data/disease_overviews/_match_table.json")
OUT = Path("docs/disease_overview_review_2026-09-22.md")

SOURCE_LABEL = {"nanbyou": "難病情報センター", "shouman": "小児慢性", "orphanet": "Orphanet"}


def escape(text: str | None) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ")


class ReadingResolver:
    """候補の公式病名にふりがなを添える。見つからなければ「—」（推測しない）。"""

    def __init__(self) -> None:
        manifest = load_manifest()
        self.official: dict[str, str] = {}
        for row in parse_nanbyou(manifest):
            if row["reading"]:
                self.official[norm(row["name"], drop_paren=True)] = row["reading"]
        readings = json.loads(Path("data/disease_readings/readings.json").read_text(encoding="utf-8"))["readings"]
        self.ours = {norm(k, drop_paren=True): v.get("reading") for k, v in readings.items()}

    def of(self, name: str) -> str:
        key = norm(name, drop_paren=True)
        return self.official.get(key) or self.ours.get(key) or "—"


def row(idx: int, ours: str, ours_reading: str, candidate: str, cand_reading: str,
        source: str, url: str, reason: str) -> str:
    return (f"| {idx} | {escape(ours)}<br>（{escape(ours_reading)}） | "
            f"{escape(candidate)}<br>（{escape(cand_reading)}） | {SOURCE_LABEL[source]} | "
            f"{url} | {escape(reason)} |  |")


HEADER = [
    "| idx | 当サイトの病名（ふりがな） | 候補の公式病名（ふりがな） | 出典 | URL | 機械の根拠 | 判定 |",
    "|---:|---|---|---|---|---|---|",
]


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    entries = data["entries"]
    reading_of = ReadingResolver()

    conflict_rows: list[str] = []      # 機械にも候補があり、既知一致と食い違うもの
    known_only_rows: list[str] = []    # 機械は見つけられず、既知一致だけがあるもの
    jp_rows: dict[str, list[str]] = {"nanbyou": [], "shouman": []}
    orpha_rows: list[str] = []
    counts = {"conflict": 0, "known_only": 0, "nanbyou": 0, "shouman": 0, "orphanet": 0}

    for e in entries:
        idx, ours = e["idx"], e["disease"]
        ours_reading = e.get("reading") or "—"
        has_jp_partial = any(e[s]["judgement"] == "partial" for s in ("nanbyou", "shouman"))

        for source in ("nanbyou", "shouman"):
            cell = e[source]
            if cell["judgement"] != "partial":
                continue
            conflicted = cell.get("known_url") is not None
            known_url = (cell.get("known_url") or "").rstrip("/") + "/"
            rival = [c for c in cell["candidates"]
                     if c.get("url") and c["url"].rstrip("/") + "/" != known_url]
            if conflicted:
                bucket = conflict_rows if rival else known_only_rows
                bucket_key = "conflict" if rival else "known_only"
            else:
                bucket = jp_rows[source]
                bucket_key = source

            if conflicted:
                # 既知一致（readings.json、ファウンダー確認済み）の候補を先に置く
                bucket.append(row(idx, ours, ours_reading,
                                  cell.get("known_name") or "（今の索引に無い URL）",
                                  reading_of.of(cell.get("known_name") or ""),
                                  source, cell["known_url"],
                                  "readings.json の既知一致（過去に確認済み）"))
                counts[bucket_key] += 1

            for candidate in cell["candidates"]:
                if not candidate.get("url"):
                    continue
                if conflicted and candidate["url"].rstrip("/") + "/" == (cell["known_url"] or "").rstrip("/") + "/":
                    continue
                label = candidate["name"]
                if candidate.get("kokuji_no"):
                    label = f"告示 {candidate['kokuji_no']} {label}"
                bucket.append(row(idx, ours, ours_reading, label,
                                  candidate.get("reading") or reading_of.of(candidate["name"]),
                                  source, candidate["url"], cell["reason"].split(" ／")[0]))
                counts[bucket_key] += 1

            if not conflicted and not cell["candidates"]:
                bucket.append(row(idx, ours, ours_reading, "（候補なし）", "—",
                                  source, "—", cell["reason"]))
                counts[bucket_key] += 1

        # Orphanet のみ要確認の行は後ろへ
        if e["orphanet"]["judgement"] == "partial" and not has_jp_partial:
            orpha = e["orphanet"]
            orpha_rows.append(
                f"| {idx} | {escape(ours)}<br>（{escape(ours_reading)}） | "
                f"{escape(orpha.get('matched_name'))}<br>（{orpha['orpha_code']}） | Orphanet | "
                f"—（URL 形式の確認待ち） | {escape(orpha['reason'])} |  |")
            counts["orphanet"] += 1

    lines: list[str] = []
    add = lines.append
    add("# 疾患概要プロジェクト フェーズ0：出典の確認シート（○× 記入用）")
    add("")
    add(f"生成日 {data['generated']}。元データ: `data/disease_overviews/_match_table.json`")
    add("")
    add("> ## 記入欄は「判定」列だけです。それ以外の列はすべて機械生成で、人が確認したものではありません。")
    add(">")
    add("> - `○` … この候補で確定してよい")
    add("> - `群` … この候補は疾患のページではなく「群」のページ（本文は取らず、リンクだけに使う）")
    add("> - `×` … この候補は違う")
    add("> - `?` … 保留（判断がつかない・調べてから決める）")
    add("> - 空欄 … 未記入として扱い、判定を変えません")
    add(">")
    add("> **候補 1 つにつき 1 行**です。同じ idx が複数行に出ることがあります。")
    add("> 1 つの疾患・1 つの出典に ○ は 1 つだけ付けてください（2 つ以上あるとエラーにします）。")
    add("> ○ と `群` は同じ疾患・同じ出典に同時に付けられます（疾患のページに ○、群のページに `群`）。")
    add("> 記入後は `python3 scripts/portal/apply_review.py` で `_match_table.json` に反映します。")
    add("> **列の順と内容は変えないでください**（行の同定に idx・出典・URL を使っています）。")
    add("")
    add("| 節 | 内容 | 行数 |")
    add("|---|---|---:|")
    add(f"| §1 | 【最優先】過去の確認と機械判定が**食い違った**行（候補が 2 つ並ぶ） | {counts['conflict']} |")
    add(f"| §2 | 機械は見つけられず、過去に確認済みの URL だけがある行 | {counts['known_only']} |")
    add(f"| §3 | 難病情報センターの要確認 | {counts['nanbyou']} |")
    add(f"| §4 | 小児慢性の要確認 | {counts['shouman']} |")
    add(f"| §5 | Orphanet だけが要確認の行（後置） | {counts['orphanet']} |")
    add(f"| 計 | | {sum(counts.values())} |")
    add("")

    add("## §1 【最優先】過去の確認と機械判定が食い違った行")
    add("")
    add("`data/disease_readings/readings.json` に残っていた出典 URL（ふりがな付与のときに確認済み）と、")
    add("今回の機械照合が**別の候補**を出した行です。**同じ idx に 2 行並んでいます。**")
    add("どちらか一方に ○、もう一方に × を付けてください（どちらも違うなら両方 ×）。")
    add("")
    add("**この 3 件は、判断に要る事実だけ実際に開いて確かめました**（2026-09-24、各 1 回）:")
    add("")
    add("- idx 490 ラフォラ病 … readings.json の `11_28_079` は **404**（ページが無い）。")
    add("  機械が出した `11_29_084`（ラフォラ（Lafora）病）は開ける。")
    add("- idx 526 Liddle症候群 … 機械が出した `RIDDLE症候群` は「字が近い」だけの候補で、別の病気。")
    add("  readings.json の `リドル（Liddle）症候群` が同じ病気に見える。")
    add("- idx 534 ベスレムミオパチー … `/entry/4005` と `/entry/4006` は**同じ病気の別のタブ**。")
    add("  4005 が「病気の解説（一般利用者向け）」、4006 が「診断・治療指針（医療従事者向け）」。")
    add("  readings.json はふりがなを取るために 4006 を見ていた。患者向けなら 4005。")
    add("")
    add("それでも判定は機械が決めるものではないので、○× はファウンダーにお願いします。")
    add("")
    lines.extend(HEADER)
    lines.extend(conflict_rows)
    add("")

    add("## §2 機械は見つけられず、過去に確認済みの URL だけがある行")
    add("")
    add("機械照合では候補が出ませんでしたが、`readings.json` に確認済みの URL が残っている行です。")
    add("病名の表記が索引と違うために機械が外したものが多く、**そのまま ○ で確定できるものが多い**はずです。")
    add("候補の病名が別の病気に見えるときだけ × を付けてください。")
    add("")
    lines.extend(HEADER)
    lines.extend(known_only_rows)
    add("")

    add("## §3 難病情報センターの要確認")
    add("")
    lines.extend(HEADER)
    lines.extend(jp_rows["nanbyou"])
    add("")

    add("## §4 小児慢性の要確認")
    add("")
    lines.extend(HEADER)
    lines.extend(jp_rows["shouman"])
    add("")

    add("## §5 Orphanet だけが要確認の行")
    add("")
    add("日本語の 2 出典では要確認が出ていない行です。ORPHA コードは記録済みのものをそのまま載せています。")
    add("URL は形式の確認待ちのため組み立てていません。")
    add("")
    lines.extend(HEADER)
    lines.extend(orpha_rows)
    add("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT}")
    for key, value in counts.items():
        print(f"  {key}: {value} 行")
    print(f"  合計 {sum(counts.values())} 行")


if __name__ == "__main__":
    main()
