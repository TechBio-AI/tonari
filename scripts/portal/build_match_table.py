#!/usr/bin/env python3
"""951 疾患 × 3 出典の照合表を作る（フェーズ0）。

入力:
  - data/knowledge/comprehensive_rare_diseases_knowledge.json  … 951 疾患（読み取りのみ）
  - data/disease_readings/readings.json                    … ふりがな + 既知の出典 URL
  - .cache/disease_sources/*.html                          … 取得済みの索引（fetch_disease_sources.py）
  - data/orphanet/en_product1.xml                          … Orphanet 命名法の原本（読み取りのみ）

出力:
  - data/disease_overviews/_match_table.json
  - docs/disease_overview_match_2026-09-22.md

判定はすべて機械生成。推測での紐付けはしない。近そうなものは全て「部分一致」に落とす。
"""

from __future__ import annotations

import difflib
import html
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

OUT_JSON = Path("data/disease_overviews/_match_table.json")
OUT_MD = Path("docs/disease_overview_match_2026-09-22.md")
CACHE = Path(".cache/disease_sources")
TODAY = "2026-09-22"

# 難病情報センターの索引ページ自身（疾患ページではない）。既知一致の答え合わせから除く
NANBYOU_INDEX_ENTRIES = {"5461", "5462", "5463", "5464", "5465", "5466", "5467", "5468", "5469",
                         "5346", "5473", "5474", "5475", "5476", "5477", "5478", "5347"}


# --- 正規化 -----------------------------------------------------------------

_DROP = re.compile(r"[\s・/／\\\-‐−–—~〜、,，.。'\"’”「」『』【】<>《》:：;；!！?？]")


def norm(name: str, drop_paren: bool = False) -> str:
    """病名の正規化。NFKC → 連番落とし →（任意で）括弧の中身落とし → 記号落とし → 小文字化。"""
    s = unicodedata.normalize("NFKC", name)
    s = re.sub(r"^\d+\.\s*", "", s)  # 小児慢性の「12. 」
    if drop_paren:
        # 入れ子は無い前提。1 段だけ落とす
        for _ in range(3):
            new = re.sub(r"[(\[][^()\[\]]*[)\]]", "", s)
            if new == s:
                break
            s = new
    s = _DROP.sub("", s)
    return s.lower()


def strip_tags(fragment: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", fragment))).strip()


# --- 取得済み HTML の読み込み -------------------------------------------------


def load_manifest() -> dict:
    return json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))["files"]


def parse_nanbyou(manifest: dict) -> list[dict]:
    """告示番号順索引 7 ページから 348 件。告示番号・ふりがな・病名・解説ページ URL。"""
    out: list[dict] = []
    for key in sorted(k for k in manifest if k.startswith("nanbyou_kokuji_")):
        page = (CACHE / f"{key}.html").read_text(encoding="utf-8", errors="replace")
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S)
        for i, row in enumerate(rows):
            cells = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
            if len(cells) != 2 or not re.fullmatch(r"\d+", cells[0]):
                continue
            # 「（ふりがな） 病名」の形
            m = re.match(r"[(（]([^)）]*)[)）]\s*(.+)", cells[1])
            reading, name = (m.group(1), m.group(2).strip()) if m else ("", cells[1])
            # 直後の行にある最初の /entry/N が「病気の解説」
            url = None
            for j in range(i + 1, min(i + 4, len(rows))):
                m2 = re.search(r'href="(/entry/\d+)"', rows[j])
                if m2:
                    url = "https://www.nanbyou.or.jp" + m2.group(1)
                    break
            out.append({
                "kokuji_no": int(cells[0]),
                "name": name,
                "reading": reading,
                "url": url,
                "source_key": key,
            })
    return out


def parse_shouman(manifest: dict) -> list[dict]:
    """疾患群ページ 16 枚から個別ページ（/disease/details/{群}_{大分類}_{連番}/）。"""
    out: list[dict] = []
    seen: set[str] = set()
    for key in sorted(k for k in manifest if k.startswith("shouman_group_") and k != "shouman_group_index"):
        page = (CACHE / f"{key}.html").read_text(encoding="utf-8", errors="replace")
        for path, label in re.findall(r'<a[^>]*href="(/disease/details/[^"]+)"[^>]*>(.*?)</a>', page, re.S):
            name = re.sub(r"^\d+\.\s*", "", strip_tags(label)).strip()
            if not name or path in seen:
                continue
            seen.add(path)
            out.append({
                "disease_id": path.strip("/").split("/")[-1],
                "name": name,
                "url": "https://www.shouman.jp" + path,
                "source_key": key,
            })
    return out


# --- Orphanet（ローカル原本） -------------------------------------------------

STOPWORDS = {"disease", "syndrome", "deficiency", "rare", "non", "europe", "type", "the", "and", "with", "due"}


def load_orphanet() -> tuple[dict[str, str], dict[str, list[str]]]:
    text = Path("data/orphanet/en_product1.xml").read_text(encoding="utf-8", errors="replace")
    names: dict[str, str] = {}
    synonyms: dict[str, list[str]] = {}
    for block in re.finditer(r'<Disorder id="\d+">(.*?)</Disorder>', text, re.S):
        body = block.group(1)
        code = re.search(r"<OrphaCode>(\d+)</OrphaCode>", body)
        name = re.search(r'<Name lang="en">(.*?)</Name>', body, re.S)
        if not code or not name:
            continue
        names[code.group(1)] = html.unescape(name.group(1))
        synonyms[code.group(1)] = [html.unescape(s) for s in
                                   re.findall(r'<Synonym lang="en">(.*?)</Synonym>', body, re.S)]
    return names, synonyms


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS and len(t) > 2}


_ROMAN = {"I": "1", "II": "2", "III": "3", "IV": "4", "V": "5", "VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10"}


def norm_typed(text: str) -> str:
    """型番号を揃えた正規化（2026-09-25 追加）。大文字ローマ数字を算用数字に、語としての type を落とす。

    OI Type IV = OI type 4、HSAN II = HSAN2 を同一とみなす。norm は 3 文字未満の語や type を
    区別に使えず、課題 46 で型違いを「取り違え」と誤警報していた。
    """
    text = re.sub(r"\b(VIII|VII|VI|IV|IX|III|II|I|V|X)\b", lambda m: _ROMAN[m.group(1)], text)
    return norm(re.sub(r"\btype\b", "", text, flags=re.I))


def judge_orphanet(name: str, aliases: list[str], code_raw: str | None,
                   orpha_names: dict[str, str], orpha_syn: dict[str, list[str]]) -> dict:
    """記録済みの ORPHA コードが我々の病名（英字の名前・別名）と合うかを判定する。URL は組み立てない。"""
    orpha = {"orpha_code": code_raw, "matched_name": None, "judgement": "none",
             "reason": "orpha_code が無い"}
    if not code_raw:
        return orpha
    code = code_raw.split(":")[1]
    if code not in orpha_names:
        orpha["reason"] = "Orphanet 命名法に存在しないコード"
        return orpha
    orpha["matched_name"] = orpha_names[code]
    labels = [orpha_names[code]] + orpha_syn.get(code, [])
    latin = [x for x in [name] + aliases if re.search(r"[A-Za-z]", x)]
    if any(norm(x) in {norm(p) for p in labels} for x in latin):
        orpha.update(judgement="exact", reason="Orphanet の Name / Synonym と一致")
        return orpha
    typed_pool = {norm_typed(p) for p in labels} - {""}
    if any(norm_typed(x) in typed_pool for x in latin):
        orpha.update(judgement="exact", reason="Orphanet の Name / Synonym と一致（型番号を揃えて）")
        return orpha
    theirs = set()
    for p in labels:
        theirs |= tokens(p)
    ours = set()
    for x in latin:
        ours |= tokens(x)
    shared = theirs & ours
    if shared:
        orpha.update(judgement="partial", reason=f"語の重なり（{'・'.join(sorted(shared)[:3])}）")
    else:
        orpha.update(judgement="none", reason="病名が重ならない（コードの取り違えの疑い。リンク対象外）")
    return orpha


# --- 照合 -------------------------------------------------------------------


def build_index(records: list[dict]) -> tuple[dict, dict]:
    full: dict[str, list[int]] = defaultdict(list)
    noparen: dict[str, list[int]] = defaultdict(list)
    for i, r in enumerate(records):
        full[norm(r["name"])].append(i)
        noparen[norm(r["name"], drop_paren=True)].append(i)
    return full, noparen


def match_japanese(our_name: str, aliases: list[str], records: list[dict],
                   full: dict, noparen: dict) -> tuple[str, list[int], str]:
    """日本語の出典に対する照合。(judgement, 候補 index, 理由) を返す。"""
    key = norm(our_name)
    if key in full:
        hits = full[key]
        if len(hits) == 1:
            return "exact", hits, "正規化後に病名が同一"
        return "partial", hits, f"正規化後に同一だが候補が {len(hits)} 件"

    key_np = norm(our_name, drop_paren=True)
    if key_np in noparen:
        return "partial", noparen[key_np], "括弧の中身を落とせば一致"

    for alias in aliases:
        a = norm(alias)
        if a in full:
            return "partial", full[a], f"別名「{alias}」が一致"
        a_np = norm(alias, drop_paren=True)
        if a_np and a_np in noparen:
            return "partial", noparen[a_np], f"別名「{alias}」が括弧を落とせば一致"

    # 包含（短い側が長い側の 50% 以上、かつ 4 文字以上）
    if len(key_np) >= 4:
        contained: list[int] = []
        for i, r in enumerate(records):
            t = norm(r["name"], drop_paren=True)
            if len(t) < 4:
                continue
            short, long_ = (key_np, t) if len(key_np) <= len(t) else (t, key_np)
            if short in long_ and len(short) >= len(long_) * 0.5:
                contained.append(i)
        if contained:
            return "partial", contained[:5], f"包含（候補 {len(contained)} 件）"

        # 最後の手がかり: 字が近いもの（0.85 以上）。もっとも弱い根拠なので必ず要確認へ回す。
        # 異体字（靱/靭）・送り仮名・「症」の有無といった 1〜2 文字の違いを拾うためのもの。
        near: list[tuple[float, int]] = []
        for i, r in enumerate(records):
            t = norm(r["name"], drop_paren=True)
            if len(t) < 4 or abs(len(t) - len(key_np)) > 2:
                continue
            matcher = difflib.SequenceMatcher(None, key_np, t)
            if matcher.quick_ratio() < 0.85:
                continue
            ratio = matcher.ratio()
            if ratio >= 0.85:
                near.append((ratio, i))
        if near:
            near.sort(reverse=True)
            return ("partial", [i for _, i in near[:3]],
                    f"字が近い（最大 {near[0][0]:.2f}。もっとも弱い根拠）")

    return "none", [], "一致なし"


def main() -> None:
    kb = json.loads(Path("data/knowledge/comprehensive_rare_diseases_knowledge.json").read_text(encoding="utf-8"))
    readings = json.loads(Path("data/disease_readings/readings.json").read_text(encoding="utf-8"))["readings"]
    manifest = load_manifest()

    nanbyou = parse_nanbyou(manifest)
    shouman = parse_shouman(manifest)
    orpha_names, orpha_syn = load_orphanet()

    nb_full, nb_np = build_index(nanbyou)
    sh_full, sh_np = build_index(shouman)

    # readings.json に残っている既知一致（答え合わせ用）
    known_shouman: dict[str, str] = {}
    known_nanbyou: dict[str, str] = {}
    for name, value in readings.items():
        source = value.get("source", "")
        m = re.search(r"https://www\.shouman\.jp/disease/details/[0-9_]+/?", source)
        if m:
            known_shouman[name] = m.group(0).rstrip("/") + "/"
        m = re.search(r"https://www\.nanbyou\.or\.jp/entry/(\d+)", source)
        if m and m.group(1) not in NANBYOU_INDEX_ENTRIES:
            known_nanbyou[name] = m.group(0)

    entries = []
    for idx, record in enumerate(kb):
        name = record["disease"]
        aliases = record.get("alternate_names") or []

        # --- 難病情報センター
        judgement, hits, reason = match_japanese(name, aliases, nanbyou, nb_full, nb_np)
        nb = {"url": None, "kokuji_no": None, "matched_name": None,
              "judgement": judgement, "reason": reason, "candidates": []}
        if hits:
            best = nanbyou[hits[0]]
            nb["candidates"] = [{"name": nanbyou[h]["name"], "kokuji_no": nanbyou[h]["kokuji_no"],
                                 "url": nanbyou[h]["url"], "reading": nanbyou[h]["reading"]}
                                for h in hits]
            if judgement == "exact":
                nb.update(url=best["url"], kokuji_no=best["kokuji_no"], matched_name=best["name"])
            meta = manifest.get(best["source_key"], {})
            nb["source_fetch"] = {"index_url": meta.get("url"), "fetched_at": meta.get("fetched_at"),
                                  "sha256": meta.get("sha256")}

        # --- 小児慢性
        judgement, hits, reason = match_japanese(name, aliases, shouman, sh_full, sh_np)
        sh = {"url": None, "matched_name": None, "disease_id": None,
              "judgement": judgement, "reason": reason, "candidates": []}
        if hits:
            best = shouman[hits[0]]
            sh["candidates"] = [{"name": shouman[h]["name"], "url": shouman[h]["url"]} for h in hits]
            if judgement == "exact":
                sh.update(url=best["url"], matched_name=best["name"], disease_id=best["disease_id"])
            meta = manifest.get(best["source_key"], {})
            sh["source_fetch"] = {"index_url": meta.get("url"), "fetched_at": meta.get("fetched_at"),
                                  "sha256": meta.get("sha256")}

        # --- 既知一致（readings.json、ファウンダー確認済み）との突き合わせ
        # 候補の中に既知の URL があれば「確認済み」として確定させる。
        # 候補に無い／別の URL を指しているときだけ、判定によらず要確認へ回す。
        notes: list[str] = []
        if name in known_shouman:
            expected = known_shouman[name]
            got = ((sh["url"] or "").rstrip("/") + "/") if sh["url"] else None
            cand_urls = {c["url"].rstrip("/") + "/" for c in sh["candidates"] if c.get("url")}
            if got == expected:
                sh["reason"] += " ／ 既知一致と一致"
            elif expected in cand_urls:
                hit = next(c for c in sh["candidates"] if c["url"].rstrip("/") + "/" == expected)
                sh.update(judgement="exact", url=hit["url"], matched_name=hit["name"],
                          disease_id=hit["url"].strip("/").split("/")[-1])
                sh["reason"] += " ／ 既知一致（readings.json）で確定"
            else:
                # 確定させない。要確認の行に URL を残さない（推測で紐付けないため）。
                # ただし既知一致の URL と、それが指す索引側の病名は残す（○×表で両候補を並べる）
                sh.update(judgement="partial", url=None, matched_name=None, disease_id=None)
                sh["known_url"] = expected
                sh["known_name"] = next(
                    (r["name"] for r in shouman if r["url"].rstrip("/") + "/" == expected), None)
                sh["reason"] += f" ／ 既知一致と食い違い（readings.json: {expected}）"
                notes.append("既知一致と食い違い（小児慢性）")
        if name in known_nanbyou:
            expected = known_nanbyou[name]
            cand_urls = {c["url"] for c in nb["candidates"] if c.get("url")}
            if (nb["url"] or "") == expected:
                nb["reason"] += " ／ 既知一致と一致"
            elif expected in cand_urls:
                hit = next(c for c in nb["candidates"] if c["url"] == expected)
                nb.update(judgement="exact", url=hit["url"], matched_name=hit["name"],
                          kokuji_no=hit["kokuji_no"])
                nb["reason"] += " ／ 既知一致（readings.json）で確定"
            else:
                # 確定させない。要確認の行に URL を残さない（推測で紐付けないため）。
                # ただし既知一致の URL と、それが指す索引側の病名は残す（○×表で両候補を並べる）
                nb.update(judgement="partial", url=None, matched_name=None, kokuji_no=None)
                nb["known_url"] = expected
                known = next((r for r in nanbyou if r["url"] == expected), None)
                nb["known_name"] = known["name"] if known else None
                nb["known_kokuji_no"] = known["kokuji_no"] if known else None
                nb["known_reading"] = known["reading"] if known else None
                nb["reason"] += f" ／ 既知一致と食い違い（readings.json: {expected}）"
                notes.append("既知一致と食い違い（難病情報センター）")

        # --- Orphanet（URL は組み立てない。コードだけ持つ）
        orpha = judge_orphanet(name, aliases, record.get("orpha_code"), orpha_names, orpha_syn)

        entries.append({
            "idx": idx,
            "disease": name,
            "reading": readings.get(name, {}).get("reading"),
            "alternate_names": aliases,
            "nanbyou": nb,
            "shouman": sh,
            "orphanet": orpha,
            "note": "／".join(notes),
        })

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({
        "_readme": [
            "951 疾患 × 3 出典の照合表（フェーズ0、2026-09-22 生成）。",
            "★ judgement はすべて機械生成。人が確認したものではない。",
            "exact = 正規化後に病名が同一 / partial = 要確認 / none = 一致なし。",
            "partial と none には url を入れない（推測で紐付けない）。",
            "Orphanet は URL を組み立てない（形式をファウンダーが確認中。コードのみ）。",
            "生成: scripts/portal/build_match_table.py",
        ],
        "generated": TODAY,
        "method": "機械照合（未検証）",
        "sources": {
            "nanbyou": {"index": "告示番号順索引 7 ページ", "rows": len(nanbyou),
                        "fetched": [manifest[k] for k in sorted(manifest) if k.startswith("nanbyou_")]},
            "shouman": {"index": "疾患群別一覧 16 群", "rows": len(shouman),
                        "fetched": [manifest[k] for k in sorted(manifest) if k.startswith("shouman_")]},
            "orphanet": {"file": "data/orphanet/en_product1.xml", "version": "2026-06-23",
                         "licence": "CC BY 4.0", "note": "取得せずローカル原本を使用"},
        },
        "entries": entries,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"難病情報センター 索引 {len(nanbyou)} 件 / 小児慢性 索引 {len(shouman)} 件")
    for source in ("nanbyou", "shouman", "orphanet"):
        counts = defaultdict(int)
        for e in entries:
            counts[e[source]["judgement"]] += 1
        print(f"  {source}: 完全一致 {counts['exact']} / 部分一致 {counts['partial']} / なし {counts['none']}")
    all_none = [e for e in entries if all(e[s]["judgement"] == "none" for s in ("nanbyou", "shouman", "orphanet"))]
    print(f"  3 出典とも「なし」: {len(all_none)} 件")
    print(f"書き出し: {OUT_JSON}")


if __name__ == "__main__":
    main()
