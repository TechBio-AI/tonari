#!/usr/bin/env python3
"""出典（難病情報センター / 小児慢性特定疾病情報センター）の索引 HTML を取得して .cache/ に置く。

- 取得は直列。1 秒に 1 回を超えない（2026-09-22 ファウンダー指示）。
- 取得先は nanbyou.or.jp / shouman.jp のみ。orpha.net へは取得しない
  （ローカル原本 data/orphanet/en_product1.xml を使う）。
- 保存先は .cache/disease_sources/（.gitignore 済み。リポジトリに入れない）。
- 1 ファイルにつき取得 URL・取得日時（JST）・本文 SHA-256 を manifest.json に記録する。
- すでに取得済みのものは再取得しない（サーバに優しく、結果を再現可能にする）。

使い方:
    python3 scripts/portal/fetch_disease_sources.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

CACHE_DIR = Path(".cache/disease_sources")
MANIFEST = CACHE_DIR / "manifest.json"
ALLOWED_HOSTS = {"www.nanbyou.or.jp", "www.shouman.jp"}
MIN_INTERVAL_SEC = 1.0
USER_AGENT = "RareDx-research/0.1 (disease source matching; contact via repository owner)"
JST = timezone(timedelta(hours=9))

# 難病情報センター 告示番号順索引（7 ページ）。範囲は索引ページ自身の表記
NANBYOU_KOKUJI_INDEX = [
    ("nanbyou_kokuji_001_050", "https://www.nanbyou.or.jp/entry/5346", "1〜50"),
    ("nanbyou_kokuji_051_100", "https://www.nanbyou.or.jp/entry/5473", "51〜100"),
    ("nanbyou_kokuji_101_150", "https://www.nanbyou.or.jp/entry/5474", "101〜150"),
    ("nanbyou_kokuji_151_200", "https://www.nanbyou.or.jp/entry/5475", "151〜200"),
    ("nanbyou_kokuji_201_250", "https://www.nanbyou.or.jp/entry/5476", "201〜250"),
    ("nanbyou_kokuji_251_300", "https://www.nanbyou.or.jp/entry/5477", "251〜300"),
    ("nanbyou_kokuji_301_348", "https://www.nanbyou.or.jp/entry/5478", "301〜348"),
]

# 小児慢性 疾患群別一覧の入口
SHOUMAN_GROUP_INDEX = ("shouman_group_index", "https://www.shouman.jp/disease/search/group/")

_last_request_at = 0.0


def _sleep_for_rate_limit() -> None:
    global _last_request_at
    wait = MIN_INTERVAL_SEC - (time.monotonic() - _last_request_at)
    if wait > 0:
        time.sleep(wait)
    _last_request_at = time.monotonic()


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"_readme": [
        "出典 HTML の取得記録。取得 URL・取得日時（JST）・本文 SHA-256 を持つ。",
        "HTML 本文は同じディレクトリの <key>.html。リポジトリには入れない（.gitignore）。",
    ], "files": {}}


def save_manifest(manifest: dict) -> None:
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch(key: str, url: str, manifest: dict, note: str = "") -> str:
    """URL を取得して .cache に保存し、本文を返す。取得済みならキャッシュを返す。"""
    host = urllib.parse.urlparse(url).netloc
    if host not in ALLOWED_HOSTS:
        raise SystemExit(f"許可されていない取得先: {host}（{url}）")

    path = CACHE_DIR / f"{key}.html"
    if path.exists() and key in manifest["files"]:
        return path.read_text(encoding="utf-8", errors="replace")

    # curl を使う。この環境の HTTP プロキシが chunked 転送を途中で切ることがあり
    # （urllib では IncompleteRead、curl では exit 18）、本文が </html> で終わるまで
    # 最大 5 回まで取り直す。取り直しのたびに 1 秒 1 回の間隔を守る（2026-09-22 実測）。
    body_path = CACHE_DIR / f".{key}.tmp"
    raw = b""
    status = 0
    last_error = ""
    for attempt in range(1, 6):
        _sleep_for_rate_limit()
        result = subprocess.run(
            ["curl", "-sS", "-L", "--compressed", "--http1.1", "--max-time", "90",
             "-A", USER_AGENT, "-o", str(body_path), "-w", "%{http_code}", url],
            capture_output=True, text=True,
        )
        status = int(result.stdout.strip() or 0)
        raw = body_path.read_bytes() if body_path.exists() else b""
        body_path.unlink(missing_ok=True)
        if result.returncode == 0 and status == 200 and b"</html>" in raw[-4096:]:
            break
        last_error = f"exit={result.returncode} status={status} bytes={len(raw)} {result.stderr.strip()}"
        print(f"    取り直し {attempt}/5  {key}  ({last_error})", file=sys.stderr)
        time.sleep(2)
    else:
        raise SystemExit(f"取得に失敗: {url}\n  {last_error}")
    text = raw.decode("utf-8", errors="replace")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    manifest["files"][key] = {
        "url": url,
        "fetched_at": datetime.now(JST).isoformat(timespec="seconds"),
        "http_status": status,
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "note": note,
    }
    save_manifest(manifest)
    print(f"  取得 {key}  {len(raw):>7} bytes  {url}", file=sys.stderr)
    return text


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()

    print("難病情報センター 告示番号順索引（7 ページ）", file=sys.stderr)
    for key, url, span in NANBYOU_KOKUJI_INDEX:
        fetch(key, url, manifest, note=f"告示番号順索引 {span}")

    print("小児慢性特定疾病情報センター 疾患群別一覧", file=sys.stderr)
    key, url = SHOUMAN_GROUP_INDEX
    index_html = fetch(key, url, manifest, note="疾患群別一覧の入口")

    # 群ページの URL は索引ページ自身から拾う（群名を推測で組み立てない）
    group_paths = sorted(set(re.findall(r'href="(/disease/search/group/list/\d+/[^"#]+)"', index_html)))
    print(f"  索引に出ている疾患群: {len(group_paths)} 群", file=sys.stderr)
    for path in group_paths:
        group_id = path.split("/")[5]
        # 群名は日本語。curl に渡す前にパスを percent-encode する
        encoded = "/".join(urllib.parse.quote(seg) for seg in path.split("/"))
        fetch(
            f"shouman_group_{group_id}",
            "https://www.shouman.jp" + encoded,
            manifest,
            note=f"疾患群 {urllib.parse.unquote(path.split('/')[6])}",
        )

    save_manifest(manifest)
    print(f"\n取得ファイル数: {len(manifest['files'])}（manifest: {MANIFEST}）", file=sys.stderr)


if __name__ == "__main__":
    main()
