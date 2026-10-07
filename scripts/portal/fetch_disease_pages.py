#!/usr/bin/env python3
"""照合表で URL が確定した疾患ページの本文 HTML を取得して .cache/ に置く（フェーズ1a）。

- 取得は直列。1 秒に 1 回を超えない。
- 取得先は nanbyou.or.jp / shouman.jp のみ。
- 保存先は .cache/disease_sources/pages/（.gitignore 済み）。
- 取得 URL・取得日時（JST）・本文 SHA-256・ページ見出しを pages_manifest.json に記録し、
  照合表（_match_table.json）の各行にも page_fetch として書き戻す。
- 取得済みは再取得しない。

使い方:
    python3 scripts/portal/fetch_disease_pages.py
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

TABLE = Path("data/disease_overviews/_match_table.json")
PAGES = Path(".cache/disease_sources/pages")
MANIFEST = PAGES / "pages_manifest.json"
ALLOWED_HOSTS = {"www.nanbyou.or.jp", "www.shouman.jp"}
MIN_INTERVAL_SEC = 1.0
USER_AGENT = "RareDx-research/0.1 (disease source matching; contact via repository owner)"
JST = timezone(timedelta(hours=9))

_last_request_at = 0.0


def _rate_limit() -> None:
    global _last_request_at
    wait = MIN_INTERVAL_SEC - (time.monotonic() - _last_request_at)
    if wait > 0:
        time.sleep(wait)
    _last_request_at = time.monotonic()


def key_for(source: str, url: str) -> str:
    """URL から安定したファイル名を作る（nanbyou_entry_73 / shouman_08_06_091）。"""
    tail = url.rstrip("/").split("/")[-1]
    return f"nanbyou_entry_{tail}" if source == "nanbyou" else f"shouman_{tail}"


def page_title(text: str) -> str:
    m = re.search(r"<title>(.*?)</title>", text, re.S)
    return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""


def fetch(key: str, url: str, manifest: dict) -> None:
    host = urllib.parse.urlparse(url).netloc
    if host not in ALLOWED_HOSTS:
        raise SystemExit(f"許可されていない取得先: {host}（{url}）")

    path = PAGES / f"{key}.html"
    if path.exists() and key in manifest["files"]:
        return

    tmp = PAGES / f".{key}.tmp"
    raw = b""
    status = 0
    last_error = ""
    for attempt in range(1, 6):
        _rate_limit()
        result = subprocess.run(
            ["curl", "-sS", "-L", "--compressed", "--http1.1", "--max-time", "90",
             "-A", USER_AGENT, "-o", str(tmp), "-w", "%{http_code}", url],
            capture_output=True, text=True,
        )
        status = int(result.stdout.strip() or 0)
        raw = tmp.read_bytes() if tmp.exists() else b""
        tmp.unlink(missing_ok=True)
        if result.returncode == 0 and status == 200 and b"</html>" in raw[-4096:]:
            break
        last_error = f"exit={result.returncode} status={status} bytes={len(raw)}"
        print(f"    取り直し {attempt}/5  {key}  ({last_error})", file=sys.stderr)
        time.sleep(2)
    else:
        # 取れなかったものは記録して先へ進む（1 件で全体を止めない）
        manifest["failed"][key] = {"url": url, "error": last_error,
                                   "at": datetime.now(JST).isoformat(timespec="seconds")}
        print(f"  × 取得できず {key}  {url}  ({last_error})", file=sys.stderr)
        return

    text = raw.decode("utf-8", errors="replace")
    path.write_text(text, encoding="utf-8")
    manifest["files"][key] = {
        "url": url,
        "fetched_at": datetime.now(JST).isoformat(timespec="seconds"),
        "http_status": status,
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "title": page_title(text),
    }


def main() -> None:
    PAGES.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {
        "_readme": ["フェーズ1a で取得した疾患ページの記録。HTML 本文は同ディレクトリの <key>.html。",
                    "リポジトリには入れない（.gitignore）。"],
        "files": {}, "failed": {},
    }
    manifest.setdefault("failed", {})

    data = json.loads(TABLE.read_text(encoding="utf-8"))
    targets: dict[str, tuple[str, str]] = {}
    for entry in data["entries"]:
        for source in ("nanbyou", "shouman"):
            url = entry[source].get("url")
            if url:
                targets[key_for(source, url)] = (source, url)

    print(f"取得対象 {len(targets)} URL（すでに取得済み {sum(1 for k in targets if k in manifest['files'])}）",
          file=sys.stderr)
    for i, (key, (_source, url)) in enumerate(sorted(targets.items()), start=1):
        fetch(key, url, manifest)
        if i % 25 == 0:
            MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print(f"  {i}/{len(targets)} 件", file=sys.stderr)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # 照合表の各行に取得記録を書き戻す
    written = 0
    for entry in data["entries"]:
        for source in ("nanbyou", "shouman"):
            url = entry[source].get("url")
            if not url:
                continue
            meta = manifest["files"].get(key_for(source, url))
            if meta:
                entry[source]["page_fetch"] = {
                    "url": meta["url"], "fetched_at": meta["fetched_at"],
                    "sha256": meta["sha256"], "title": meta["title"],
                    "cache_file": f".cache/disease_sources/pages/{key_for(source, url)}.html",
                }
                written += 1
    TABLE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"\n取得できた {len(manifest['files'])} / 失敗 {len(manifest['failed'])}")
    print(f"照合表に書き戻した取得記録: {written} 件")


if __name__ == "__main__":
    main()
