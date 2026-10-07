#!/usr/bin/env python3
"""_match_table.json から、ファウンダーが読む照合表（Markdown）を書き出す。

部分一致の行だけを先頭の【要確認】表に集め、そこに ○× を付けてもらう前提で並べる。
判定はすべて機械生成であることを冒頭に明記する。
"""

from __future__ import annotations

import json
from pathlib import Path

SRC = Path("data/disease_overviews/_match_table.json")
OUT = Path("docs/disease_overview_match_2026-09-22.md")

JUDGEMENT_JA = {"exact": "完全一致", "partial": "**要確認**", "none": "なし"}


def escape(text: str | None) -> str:
    if not text:
        return ""
    return text.replace("|", "\\|").replace("\n", " ")


def nanbyou_cell(nb: dict, detailed: bool) -> str:
    mark = JUDGEMENT_JA[nb["judgement"]]
    if nb["judgement"] == "exact":
        return f"[告示 {nb['kokuji_no']} {escape(nb['matched_name'])}]({nb['url']})<br>{mark}"
    if nb["judgement"] == "partial" and detailed:
        parts = [f"[告示 {c['kokuji_no']} {escape(c['name'])}]({c['url']})" if c.get("url")
                 else f"告示 {c['kokuji_no']} {escape(c['name'])}" for c in nb["candidates"][:3]]
        return "<br>".join(parts) + f"<br>{mark}（{escape(nb['reason'])}）"
    if nb["judgement"] == "partial":
        return f"{mark}（候補 {len(nb['candidates'])} 件）"
    return mark


def shouman_cell(sh: dict, detailed: bool) -> str:
    mark = JUDGEMENT_JA[sh["judgement"]]
    if sh["judgement"] == "exact":
        return f"[{escape(sh['matched_name'])}]({sh['url']})<br>{mark}"
    if sh["judgement"] == "partial" and detailed:
        parts = [f"[{escape(c['name'])}]({c['url']})" for c in sh["candidates"][:3]]
        return "<br>".join(parts) + f"<br>{mark}（{escape(sh['reason'])}）"
    if sh["judgement"] == "partial":
        return f"{mark}（候補 {len(sh['candidates'])} 件）"
    return mark


def orpha_cell(orpha: dict, detailed: bool) -> str:
    mark = JUDGEMENT_JA[orpha["judgement"]]
    code = orpha.get("orpha_code") or "—"
    if detailed or orpha["judgement"] != "exact":
        matched = escape(orpha.get("matched_name"))
        return f"{code}<br>{matched}<br>{mark}" if matched else f"{code}<br>{mark}"
    return f"{code}<br>{mark}"


def fetch_mark(entry: dict) -> str:
    """その行がどの索引ページから来たかを、取得日時と SHA-256 の先頭で示す。"""
    bits = []
    for key, label in (("nanbyou", "難"), ("shouman", "小")):
        meta = entry[key].get("source_fetch")
        if meta and meta.get("sha256"):
            bits.append(f"{label} {meta['fetched_at'][:16]} `{meta['sha256'][:12]}`")
    return "<br>".join(bits)


def table(rows: list[dict], detailed: bool) -> list[str]:
    out = ["| idx | 病名 | ふりがな | 難病情報センター | 小児慢性 | Orphanet | 取得（日時・本文SHA-256先頭） | 備考 |",
           "|---:|---|---|---|---|---|---|---|"]
    for e in rows:
        out.append("| {idx} | {name} | {reading} | {nb} | {sh} | {orpha} | {fetch} | {note} |".format(
            idx=e["idx"],
            name=escape(e["disease"]),
            reading=escape(e.get("reading")) or "—",
            nb=nanbyou_cell(e["nanbyou"], detailed),
            sh=shouman_cell(e["shouman"], detailed),
            orpha=orpha_cell(e["orphanet"], detailed),
            fetch=fetch_mark(e),
            note=escape(e.get("note")),
        ))
    return out


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    entries = data["entries"]

    def judged(source: str, value: str) -> list[dict]:
        return [e for e in entries if e[source]["judgement"] == value]

    needs_check = [e for e in entries
                   if any(e[s]["judgement"] == "partial" for s in ("nanbyou", "shouman", "orphanet"))]
    all_exact_or_partial = [e for e in entries if e not in needs_check
                            and any(e[s]["judgement"] == "exact" for s in ("nanbyou", "shouman", "orphanet"))]
    all_none = [e for e in entries
                if all(e[s]["judgement"] == "none" for s in ("nanbyou", "shouman", "orphanet"))]
    orpha_withheld = [e for e in entries
                      if e["orphanet"]["judgement"] == "none" and e["orphanet"].get("orpha_code")]

    lines: list[str] = []
    add = lines.append

    add("# 疾患概要プロジェクト フェーズ0：出典照合表")
    add("")
    add(f"生成日 {data['generated']}。生成: `scripts/portal/build_match_table.py` → `scripts/portal/write_match_report.py`")
    add("")
    add("> ## ★ この表の判定列は、すべて機械生成です。人が確認したものではありません。")
    add(">")
    add("> 「完全一致」も含め、正しさは保証されません。**要確認**の行に ○ / × を付けてください。")
    add("> 推測での紐付けはしていません。少しでも確信が持てないものは、すべて **要確認** に落としてあります。")
    add("")
    add("判定の意味:")
    add("")
    add("| 判定 | 意味 |")
    add("|---|---|")
    add("| 完全一致 | 正規化（記号・空白落とし、全角半角そろえ）のあとで病名が同一。または readings.json の既知一致で確定 |")
    add("| **要確認** | 括弧の中身を落とせば一致 / 別名が一致 / 包含 / 字が近い / 既知一致と食い違い / 候補が複数。**URL は入れていません** |")
    add("| なし | どの手がかりでも当たらなかった |")
    add("")

    # --- 件数
    add("## 1. 件数")
    add("")
    add("| 出典 | 完全一致 | 要確認（部分一致） | なし |")
    add("|---|---:|---:|---:|")
    for source, label in (("nanbyou", "難病情報センター"), ("shouman", "小児慢性特定疾病情報センター"), ("orphanet", "Orphanet")):
        add(f"| {label} | {len(judged(source,'exact'))} | {len(judged(source,'partial'))} | {len(judged(source,'none'))} |")
    add("")
    add(f"- 対象疾患: **{len(entries)} 件**")
    add(f"- 3 出典とも「なし」: **{len(all_none)} 件**")
    add(f"- 1 つ以上「要確認」を含む行（下の §3 の表）: **{len(needs_check)} 件**")
    add("")

    # --- 取得元
    add("## 2. 取得元（索引ページ）")
    add("")
    add("取得は直列、1 秒に 1 回。生 HTML は `.cache/disease_sources/`（リポジトリには入れない）。")
    add("")
    add("| 索引 | URL | 取得日時 (JST) | bytes | 本文 SHA-256 |")
    add("|---|---|---|---:|---|")
    for source in ("nanbyou", "shouman"):
        for f in data["sources"][source]["fetched"]:
            add(f"| {escape(f.get('note'))} | {f['url']} | {f['fetched_at']} | {f['bytes']} | `{f['sha256']}` |")
    orphanet = data["sources"]["orphanet"]
    add(f"| Orphanet 命名法（取得せずローカル原本） | {orphanet['file']} | 版 {orphanet['version']} | — | `data/orphanet/SOURCE.md` を参照 |")
    add("")
    add(f"- 難病情報センターの索引から拾えた指定難病: **{data['sources']['nanbyou']['rows']} 件**")
    add(f"- 小児慢性の索引（16 疾患群）から拾えた個別ページ: **{data['sources']['shouman']['rows']} 件**")
    add("")

    # --- 要確認
    add("## 3. 【要確認】判定が「要確認」を含む行")
    add("")
    add(f"**{len(needs_check)} 件。ここだけ見て ○ / × を付けてください。** 候補の病名はリンクになっています。")
    add("")
    add("Orphanet の URL は、形式の確認待ちのため組み立てていません（ORPHA コードのみ）。")
    add("")
    lines.extend(table(needs_check, detailed=True))
    add("")

    # --- 完全一致
    add("## 4. 要確認を含まない行（完全一致のみ、またはなし混じり）")
    add("")
    add(f"{len(all_exact_or_partial)} 件。機械判定では確定しているが、**確認はされていない**。")
    add("")
    lines.extend(table(all_exact_or_partial, detailed=False))
    add("")

    # --- 3出典ともなし
    add("## 5. 3 出典とも「なし」")
    add("")
    add(f"{len(all_none)} 件。フェーズ1 で出典を取れない疾患。")
    add("")
    add("| idx | 病名 | ふりがな | ORPHA コード |")
    add("|---:|---|---|---|")
    for e in all_none:
        add(f"| {e['idx']} | {escape(e['disease'])} | {escape(e.get('reading')) or '—'} | {e['orphanet'].get('orpha_code') or '—'} |")
    add("")

    # --- Orphanet リンク対象外
    add("## 6. Orphanet リンク対象外（orpha_code の取り違えの疑い）")
    add("")
    add(f"{len(orpha_withheld)} 件。コードは実在するが、指している疾患が我々の病名と重ならない。")
    add("`docs/kb_issues_2026-08-29.md` にも同じ一覧を追記した。")
    add("")
    add("| idx | 病名 | ふりがな | 記録されている ORPHA コード | そのコードが指す Orphanet の疾患名 |")
    add("|---:|---|---|---|---|")
    for e in orpha_withheld:
        add(f"| {e['idx']} | {escape(e['disease'])} | {escape(e.get('reading')) or '—'} | "
            f"{e['orphanet']['orpha_code']} | {escape(e['orphanet'].get('matched_name'))} |")
    add("")

    # --- フェーズ1 の 10 分割（出典の手がかりがあるものを等分）
    flags = [1 if any(e[s]["judgement"] != "none" for s in ("nanbyou", "shouman", "orphanet")) else 0
             for e in entries]
    total = sum(flags)
    targets = [total // 10 + (1 if i < total % 10 else 0) for i in range(10)]
    splits = []
    cursor = 0
    for part, target in enumerate(targets, start=1):
        start = cursor
        counted = 0
        while cursor < len(entries) and counted < target:
            counted += flags[cursor]
            cursor += 1
        while cursor < len(entries) and flags[cursor] == 0:  # 末尾の「出典なし」はこの分割に含める
            cursor += 1
        splits.append((part, start, cursor - 1, counted, cursor - start))

    add("## 7. フェーズ1 の 10 分割案")
    add("")
    add(f"「出典の手がかりがあるもの」**{total} 件**（3 出典のいずれかが「完全一致」か「要確認」）を等分し、")
    add("知識ファイルの出現順（idx）で連続した範囲に切った。出典が無い行も範囲には含まれる。")
    add("")
    add("**§3 の ○× が付いたあとに件数が動くので、そのときは作り直す。**")
    add("")
    add("| 分割 | idx 範囲 | 出典ありの件数 | 範囲内の疾患数 |")
    add("|---:|---|---:|---:|")
    for part, start, end, counted, span in splits:
        add(f"| {part} | {start}–{end} | {counted} | {span} |")
    add("")
    url_ready = sum(1 for e in entries if e["nanbyou"]["url"] or e["shouman"]["url"])
    add(f"いま URL が確定していて、すぐ本文を取りに行けるのは **{url_ready} 件**")
    add(f"（難病情報センター {sum(1 for e in entries if e['nanbyou']['url'])} 件 / "
        f"小児慢性 {sum(1 for e in entries if e['shouman']['url'])} 件、両方ある {sum(1 for e in entries if e['nanbyou']['url'] and e['shouman']['url'])} 件）。")
    add("残りは §3 の確認を経てから増える。")
    add("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT}  ({len(lines)} 行)")
    print(f"  要確認 {len(needs_check)} / 要確認なし {len(all_exact_or_partial)} / 3出典ともなし {len(all_none)} / Orphanet 対象外 {len(orpha_withheld)}")


if __name__ == "__main__":
    main()
