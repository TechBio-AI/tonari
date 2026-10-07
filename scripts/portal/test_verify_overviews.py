#!/usr/bin/env python3
"""verify_overviews.py のテスト（標準 unittest。本物のデータには触れない）。

    python3 -m unittest scripts/portal/test_verify_overviews.py
"""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_overviews as vo  # noqa: E402

PAGE = """<html><head><title>テスト病</title>
<script>var s = "スクリプトの中の文";</script><style>.a{}</style></head>
<body><h2>1. 「テスト病」とはどのような病気ですか</h2>
<p>テスト病は、筋肉が
  少しずつ弱くなる病気です。</p>
<h2>2. どのような症状がおきますか</h2>
<ul><li>歩きにくさがあります。</li><li>ＡＢＣ型の手のふるえが出ます。</li><li>疲れやすくなります。</li></ul>
<p>&lt;注&gt; 治療は症状を抑えるものが中心です。</p>
</body></html>"""
CACHE = ".cache/disease_sources/pages/nanbyou_entry_1.html"
NOW = datetime(2026, 9, 25, 12, 0, tzinfo=vo.JST)


def fact(evidence: str, text: str = "x") -> dict:
    return {"text": text, "source_id": "nanbyou", "evidence": evidence}


class VerifyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        page = self.root / CACHE
        page.parent.mkdir(parents=True)
        page.write_text(PAGE, encoding="utf-8")
        self.sha = hashlib.sha256(page.read_bytes()).hexdigest()
        table = {"entries": [{
            "idx": 7, "disease": "テスト病", "reading": "てすとびょう",
            "nanbyou": {"judgement": "exact", "page_fetch": {
                "url": "https://www.nanbyou.or.jp/entry/1", "sha256": self.sha, "cache_file": CACHE}},
            "shouman": {"judgement": "none"}, "orphanet": {"judgement": "none"},
        }]}
        orpha = {"source": {"file": "data/orphanet/en_product1.xml", "version": "2026-06-23"}, "definitions": {}}
        (self.root / vo.OVERVIEWS).mkdir(parents=True)
        (self.root / vo.TABLE).write_text(json.dumps(table, ensure_ascii=False), encoding="utf-8")
        (self.root / vo.ORPHA).write_text(json.dumps(orpha), encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def write_overview(self, summary: dict, symptoms: list[dict], sha: str | None = None) -> Path:
        data = {
            "idx": 7, "name": "テスト病",
            "sources": [{"id": "nanbyou", "url": "https://www.nanbyou.or.jp/entry/1", "sha256": sha or self.sha}],
            "summary": {**summary, "lang": "ja"},
            "symptoms": symptoms,
            "onset": None,
            "treatment": {"type": "症状を抑える治療が中心", "source_id": "nanbyou",
                          "evidence": "治療は症状を抑えるものが中心です。"},
            "links": [], "notes": ["そのまま残る"], "extracted_at": "2026-09-24T00:00:00+09:00", "shard": 1,
        }
        path = self.root / vo.OVERVIEWS / "7.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path

    def run_verify(self, dry_run: bool = False):
        return vo.run(self.root, dry_run=dry_run, now=NOW)

    def test_match(self) -> None:
        path = self.write_overview(
            fact("テスト病は、筋肉が少しずつ弱くなる病気です。"),
            [fact("歩きにくさがあります。"), fact("疲れやすくなります。"), fact("手のふるえが出ます。")])
        before = path.read_text(encoding="utf-8")
        result, report = self.run_verify()
        self.assertEqual((result.diseases, result.facts, len(result.dropped), len(result.unverified)), (1, 5, 0, 0))
        self.assertEqual(path.read_text(encoding="utf-8"), before)  # 何も落とさなければ書き換えない
        self.assertTrue(report.exists())

    def test_whitespace_and_width_difference(self) -> None:
        # 本文は改行・字下げを挟む。evidence は空白入り・全角半角違い。いずれも許容。
        self.write_overview(
            fact("テスト病は、筋肉が 少しずつ 弱くなる病気です。"),
            [fact("ABC型の手のふるえ"), fact("歩きにくさ　があります"), fact("ﾃｽﾄ病は、筋肉が")])
        result, _ = self.run_verify()
        self.assertEqual(len(result.dropped), 0, [r.reason for r in result.dropped])
        # 半角カナ（濁点つき）も揃う
        self.assertEqual(vo.normalize("ｶﾞｸ ｾｲ"), "ガクセイ")
        # 全角半角以外の差は揃えない（ローマ数字・丸数字）
        self.assertNotEqual(vo.normalize("Ⅰ型"), vo.normalize("I型"))
        self.assertNotEqual(vo.normalize("①"), vo.normalize("1"))

    def test_mismatch_is_dropped(self) -> None:
        path = self.write_overview(
            fact("テスト病は、筋肉が急に弱くなる病気です。"),  # 「少しずつ」→「急に」の改変
            [fact("歩きにくさがあります。"), fact("足がしびれます。"), fact("疲れやすくなります。"),
             fact("スクリプトの中の文")])  # script の中身は本文ではない
        result, report = self.run_verify(dry_run=True)
        self.assertEqual({r.fact for r in result.dropped}, {"summary", "symptoms[1]", "symptoms[3]"})
        untouched = json.loads(path.read_text(encoding="utf-8"))
        self.assertIsNotNone(untouched["summary"])  # dry-run は JSON を変えない
        self.assertIn("未適用", report.read_text(encoding="utf-8"))

        result, report = self.run_verify(dry_run=False)
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertIsNone(data["summary"])
        self.assertEqual([s["evidence"] for s in data["symptoms"]], ["歩きにくさがあります。", "疲れやすくなります。"])
        self.assertEqual(data["notes"], ["そのまま残る"])
        self.assertIsNotNone(data["treatment"])
        text = report.read_text(encoding="utf-8")
        self.assertIn("| 7 | テスト病（てすとびょう） | symptoms[1]: x | 足がしびれます。 | 本文に見つからない（nanbyou） |", text)
        self.assertIn("3 件未満", text)

    def test_sha_mismatch_marks_disease_unverified(self) -> None:
        path = self.write_overview(
            fact("本文に無い要約"), [fact("足がしびれます。"), fact("歩きにくさがあります。"), fact("疲れやすくなります。")])
        # 保存 HTML を後から書き換える → 照合表の sha と合わなくなる
        (self.root / CACHE).write_text(PAGE + "<!-- changed -->", encoding="utf-8")
        before = path.read_text(encoding="utf-8")
        result, _ = self.run_verify()
        self.assertEqual(len(result.dropped), 0)
        self.assertEqual(len(result.unverified), 5)
        self.assertTrue(all("sha256 が照合表と不一致" in r.reason for r in result.unverified))
        self.assertEqual(path.read_text(encoding="utf-8"), before)

    def test_orphanet_records_origin(self) -> None:
        # 補足：Orphanet は sha の代わりに取得元ファイル名と版を理由列に残す
        orpha = json.loads((self.root / vo.ORPHA).read_text(encoding="utf-8"))
        orpha["definitions"]["7"] = {"definition_text": "A rare neuromuscular disease characterized by weakness."}
        (self.root / vo.ORPHA).write_text(json.dumps(orpha), encoding="utf-8")
        path = self.write_overview(
            {"text": "x", "source_id": "orphanet", "evidence": "A rare neuromuscular disease"},
            [fact("歩きにくさがあります。"), fact("疲れやすくなります。"),
             {"text": "x", "source_id": "orphanet", "evidence": "characterized by pain"}])
        data = json.loads(path.read_text(encoding="utf-8"))
        data["sources"].append({"id": "orphanet"})
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        result, report = self.run_verify(dry_run=True)
        origin = "data/orphanet/en_product1.xml（2026-06-23 版）"
        self.assertEqual([r.fact for r in result.dropped], ["symptoms[2]"])
        self.assertIn(origin, result.dropped[0].reason)
        self.assertEqual([r.fact for r in result.orphanet_ok], ["summary"])
        self.assertIn(origin, report.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
