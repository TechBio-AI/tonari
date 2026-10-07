#!/usr/bin/env python3
"""fill_review.py のテスト（標準 unittest。本物の確認シートには触れない）。

    python3 -m unittest scripts/portal/test_fill_review.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fill_review as fr  # noqa: E402

HEADER7 = "| idx | 当サイトの病名（ふりがな） | 候補の公式病名（ふりがな） | 出典 | URL | 機械の根拠 | 判定 |\n|---:|---|---|---|---|---|---|"
HEADER8 = ("| idx | 当サイトの病名（ふりがな） | 候補の公式病名（ふりがな） | 出典 | URL | 機械の根拠 | 機械の推奨（機械生成） | 判定 |\n"
           "|---:|---|---|---|---|---|---|---|")

SHEET = f"""# 確認シート

## §2 機械は見つけられず

{HEADER7}
| 9 | 病A<br>（あ） | 候補Z<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/1 | 既知 |  |

## §3 難病情報センターの要確認

{HEADER8}
| 9 | 病A<br>（あ） | 告示 1 候補A<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/10 | 包含 | ○：d: 表記差 |  |
| 20 | 病B<br>（い） | 告示 2 候補B<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/20 | 包含 | 群：c: 下位型 |  |
| 350 | 病C<br>（う） | 告示 3 候補C1<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/31 | 包含 | ○：d: 表記差 |  |
| 350 | 病C<br>（う） | 告示 4 候補C2<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/32 | 包含 | ○：d: 表記差 |  |
| 197 | 病D<br>（え） | 告示 5 候補D<br>（—） | 難病情報センター | https://www.nanbyou.or.jp/entry/50 | 字が近い | ×：a〜d すべて偽 |  |

## §4 小児慢性の要確認

{HEADER8}
| 9 | 病A<br>（あ） | 候補A'<br>（—） | 小児慢性 | https://www.shouman.jp/disease/details/01_01_001/ | 包含 | ?：a |  |
"""


def marks(text: str, section: str) -> dict[tuple[int, str], str]:
    body = text.split(section, 1)[1].split("\n## ", 1)[0]
    out = {}
    for line in body.splitlines():
        if line.startswith("| ") and line[2].isdigit():
            cells = fr.split_row(line)
            out[(int(cells[0]), cells[4])] = cells[-1]
    return out


class FillReviewTest(unittest.TestCase):
    def test_follow_recommendation_with_exceptions(self) -> None:
        # 「§3 は推奨どおり、ただし 20 は ×、197 は群、350 は entry/31 だけ ○ で entry/32 は ×」
        text, changes = fr.fill(SHEET, 3, "推奨どおり",
                                ["20=×", "197=群", "350@entry/31=○", "350@entry/32=×"])
        got = marks(text, "## §3")
        self.assertEqual(got, {
            (9, "https://www.nanbyou.or.jp/entry/10"): "○",   # 推奨どおり
            (20, "https://www.nanbyou.or.jp/entry/20"): "×",  # 例外
            (350, "https://www.nanbyou.or.jp/entry/31"): "○",
            (350, "https://www.nanbyou.or.jp/entry/32"): "×",
            (197, "https://www.nanbyou.or.jp/entry/50"): "群",
        })
        self.assertEqual(len(changes), 5)
        # 他の節・他の列・行の順は変えない
        self.assertEqual(text.split("## §3")[0], SHEET.split("## §3")[0])
        self.assertEqual(text.split("## §4")[1], SHEET.split("## §4")[1])
        self.assertEqual([l[:60] for l in text.splitlines()], [l[:60] for l in SHEET.splitlines()])
        # 書き換えたシートは apply_review.py の読み方でも読める（8 列・判定は最後）
        import apply_review
        with tempfile.TemporaryDirectory() as tmp:
            sheet = Path(tmp) / "sheet.md"
            sheet.write_text(text, encoding="utf-8")
            apply_review.SHEET = sheet
            parsed = {(r["idx"], r["url"]): r["mark"] for r in apply_review.parse_sheet() if r["source"] == "nanbyou"}
        self.assertEqual(parsed[(197, "https://www.nanbyou.or.jp/entry/50")], "群")

    def test_refuses_without_writing(self) -> None:
        # 推奨どおりだと 350 に ○ が 2 つ → 止まる。dry-run でなくてもファイルは変わらない
        with tempfile.TemporaryDirectory() as tmp:
            sheet = Path(tmp) / "sheet.md"
            sheet.write_text(SHEET, encoding="utf-8")
            script = Path(__file__).resolve().parent / "fill_review.py"
            run = lambda *a: subprocess.run([sys.executable, str(script), "--sheet", str(sheet), *a],
                                            capture_output=True, text=True)
            r = run("--section", "3", "--default", "推奨どおり")
            self.assertEqual(r.returncode, 1)
            self.assertIn("○ が 2 つ以上", r.stderr)
            # 節に無い idx の例外も止まる
            r = run("--section", "3", "--default", "推奨どおり", "--set", "999=群")
            self.assertEqual(r.returncode, 1)
            self.assertIn("§3 にありません", r.stderr)
            # 推奨列の無い節に「推奨どおり」は使えない
            r = run("--section", "2", "--default", "推奨どおり")
            self.assertEqual(r.returncode, 1)
            self.assertEqual(sheet.read_text(encoding="utf-8"), SHEET)
            # dry-run は一覧だけ出して書かない
            r = run("--section", "3", "--default", "推奨どおり", "--set", "350@entry/32=×", "--dry-run")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("書き込む行 5", r.stdout)
            self.assertEqual(sheet.read_text(encoding="utf-8"), SHEET)
            # 記入済みと食い違うときは --overwrite が要る
            sheet.write_text(SHEET.replace("| ×：a〜d すべて偽 |  |", "| ×：a〜d すべて偽 | ? |"), encoding="utf-8")
            r = run("--section", "3", "--default", "推奨どおり", "--set", "350@entry/32=×")
            self.assertEqual(r.returncode, 1)
            self.assertIn("記入済み ? → ×", r.stderr)


class FillOrderTest(unittest.TestCase):
    def test_founder_sentence(self) -> None:
        # 「§3・§4 推奨どおり。例外：idx 20 は ×、idx 350@entry/32 は ×」。20 と 350 は §3 にだけある
        text, results = fr.fill_order(SHEET, "§3・§4 推奨どおり。例外：idx 20 は ×、idx 350@entry/32 は ×")
        self.assertEqual([s for s, _ in results], [3, 4])
        got3 = marks(text, "## §3")
        self.assertEqual(got3[(20, "https://www.nanbyou.or.jp/entry/20")], "×")
        self.assertEqual(got3[(350, "https://www.nanbyou.or.jp/entry/31")], "○")
        self.assertEqual(got3[(350, "https://www.nanbyou.or.jp/entry/32")], "×")
        self.assertEqual(marks(text, "## §4")[(9, "https://www.shouman.jp/disease/details/01_01_001/")], "?")
        self.assertEqual(text.split("## §3")[0], SHEET.split("## §3")[0])  # §2 は触らない

    def test_exception_goes_to_every_named_section_with_the_idx(self) -> None:
        text, _ = fr.fill_order(SHEET, "§3、§4 は推奨どおり、例外 9=群。例外：350@entry/32=×")
        self.assertEqual(marks(text, "## §3")[(9, "https://www.nanbyou.or.jp/entry/10")], "群")
        self.assertEqual(marks(text, "## §4")[(9, "https://www.shouman.jp/disease/details/01_01_001/")], "群")
        # 節を前に付けると、その節だけ
        text, _ = fr.fill_order(SHEET, "§3・§4 推奨どおり。例外：§4 idx 9 は ×、idx 350@entry/32 は ×")
        self.assertEqual(marks(text, "## §3")[(9, "https://www.nanbyou.or.jp/entry/10")], "○")
        self.assertEqual(marks(text, "## §4")[(9, "https://www.shouman.jp/disease/details/01_01_001/")], "×")
        # 「は」を省いた「idx 20 群、350@entry/32 ×」、空欄で未判定のまま残す
        text, _ = fr.fill_order(SHEET, "§3・§4 推奨どおり。例外：idx 20 群、350@entry/32 ×、9 空欄")
        self.assertEqual(marks(text, "## §3")[(20, "https://www.nanbyou.or.jp/entry/20")], "群")
        self.assertEqual(marks(text, "## §3")[(9, "https://www.nanbyou.or.jp/entry/10")], "")
        self.assertEqual(marks(text, "## §4")[(9, "https://www.shouman.jp/disease/details/01_01_001/")], "")
        # idx@URL は URL が当たる節にだけ当てる（9 は §3 にもあるが、01_01_001 は §4 だけ）
        text, _ = fr.fill_order(SHEET, "§3・§4 推奨どおり。例外：9@01_01_001 ○、350@entry/32 ×")
        self.assertEqual(marks(text, "## §3")[(9, "https://www.nanbyou.or.jp/entry/10")], "○")
        self.assertEqual(marks(text, "## §4")[(9, "https://www.shouman.jp/disease/details/01_01_001/")], "○")

    def test_refuses_whole_order(self) -> None:
        # どれか 1 つでも読めない・当たらない・○ が重なるなら、全部書かない
        for order, msg in [
            ("§3・§4 推奨どおり。例外：idx 999 は群", "どれにもありません"),
            ("§3・§4 推奨どおり。例外：idx 20 はたぶん群", "読めません"),
            ("§3 推奨どおりでお願いします", "読めません"),
            ("§4 推奨どおり。§3 推奨どおり", "○ が 2 つ以上"),  # 350 に ○ が 2 つ
            ("§2 推奨どおり", "推奨」列が無い"),
            ("§3 推奨どおり。例外：§4 idx 9 は ×", "節の文にありません"),
        ]:
            with self.subTest(order=order):
                with self.assertRaises(fr.FillError) as ctx:
                    fr.fill_order(SHEET, order)
                self.assertIn(msg, str(ctx.exception))

    def test_cli_dry_run_does_not_write(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            sheet = Path(tmp) / "sheet.md"
            sheet.write_text(SHEET, encoding="utf-8")
            script = Path(__file__).resolve().parent / "fill_review.py"
            r = subprocess.run([sys.executable, str(script), "--sheet", str(sheet), "--dry-run",
                                "--order", "§3・§4 推奨どおり。例外：idx 350@entry/32 は ×"],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("§3: 書き込む行 5", r.stdout)
            self.assertIn("§4: 書き込む行 1", r.stdout)
            self.assertEqual(sheet.read_text(encoding="utf-8"), SHEET)


if __name__ == "__main__":
    unittest.main()
