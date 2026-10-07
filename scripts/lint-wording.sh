#!/usr/bin/env bash
#
# lint-wording.sh - 公開面（/demo）の表現リント [Phase0-T3、2026-09-25 対象を付け替え]
#
# docs/wording-blocklist-demo.txt の禁止語が公開面に含まれていないかを検査し、
# ヒットしたらファイル名・行番号（JSON は項目の位置）を表示して exit 1 する（pre-commit から呼ばれる）。
#
# 対象:
#   - app/demo/                         … ソース全体（__tests__/ は除く。テストは禁止語を検査のために持つ）
#   - data/disease_overviews/<idx>.json … "text" フィールドだけ（evidence は出典の原文なので対象外）
#   - data/disease_extras/<slug>.json   … 画面に出る文字列すべて（text・手紙の段落・注記・臓器名・リンクの文言）。
#                                         evidence・source_url・url・slug・status・id は対象外（2026-10-02 ファウンダー指示）
#   - data/support_centers.json         … 難病相談支援センター一覧の値（name・phone・address の value）（2026-10-02）
#   - data/nanbyo_hospitals.json        … 拠点病院・協力病院一覧の画面に出る値（区分の見出し・病院名・専門分野）。禁止語に加えて「診断」の字も検査し、
#                                         正式名称 1 件だけを例外にする（理由はスクリプト内。2026-10-03）
#   - data/patient_groups/*.json        … 患者会の紹介文の下書き（groups[].intro.facts[].text・intro.membership[].text）だけ（2026-10-02）
#
# 以前は app/(portal)/ と content/ を対象にしていたが、どちらも存在せず常に skip して成功扱いだった。
# 対象が 1 つも無い場合は、安全側に倒して失敗にする。
#
# 除外: 行内に「lint-wording: allow」と書いた行は検査しない（規則そのものを説明するコメント等）。
#
# 使い方:
#   bash scripts/lint-wording.sh          # 手動実行も可
#
set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
blocklist="$repo_root/docs/wording-blocklist-demo.txt"
code_dir="app/demo"
json_dir="data/disease_overviews"
extras_dir="data/disease_extras"
groups_dir="data/patient_groups"
allow_marker="lint-wording: allow"

if [ ! -d "$repo_root/$code_dir" ]; then
  echo "⚠️  表現リント: 対象ディレクトリ ($code_dir/) が見つかりません。安全側に倒してコミットを中止します。" >&2
  exit 1
fi

if [ ! -f "$blocklist" ]; then
  echo "⚠️  表現リント: 禁止語リスト ($blocklist) が見つかりません。" >&2
  echo "    docs/wording-blocklist-demo.txt を復元してください。安全側に倒してコミットを中止します。" >&2
  exit 1
fi

# ---- 禁止語の読み込み（# コメント行・空行を除外）---------------------------
words=()
while IFS= read -r line || [ -n "$line" ]; do
  word="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ -z "$word" ] && continue
  case "$word" in \#*) continue ;; esac
  words+=("$word")
done < "$blocklist"

if [ ${#words[@]} -eq 0 ]; then
  echo "⚠️  表現リント: 禁止語リストが空です。docs/wording-blocklist-demo.txt を確認してください。" >&2
  exit 1
fi

# ---- 検査 1: app/demo/（固定文字列・部分一致。バイナリ・__tests__ は除外）----
report=""
for word in "${words[@]}"; do
  hits="$(grep -rnHIF --exclude-dir=__tests__ -- "$word" "$repo_root/$code_dir" 2>/dev/null \
          | grep -vF -- "$allow_marker" || true)"
  if [ -n "$hits" ]; then
    report+="── 禁止語「${word}」:"$'\n'
    report+="$(printf '%s\n' "$hits" | sed "s|^$repo_root/||")"$'\n\n'
  fi
done

# ---- 検査 2: data/disease_overviews/<idx>.json の text フィールド -------------
json_count=0
if [ -d "$repo_root/$json_dir" ]; then
  json_hits="$(cd "$repo_root" && python3 - "$json_dir" "${words[@]}" <<'PY'
import glob, json, os, sys

json_dir, words = sys.argv[1], sys.argv[2:]


def walk(node, path):
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "text" and isinstance(value, str):
                yield f"{path}.text", value
            else:
                yield from walk(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from walk(value, f"{path}[{i}]")


files = sorted(p for p in glob.glob(os.path.join(json_dir, "*.json"))
               if not os.path.basename(p).startswith("_"))
print(f"#count {len(files)}")
for p in files:
    try:
        data = json.load(open(p, encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"{p}: JSON として読めない（{e}）")
        continue
    for where, text in walk(data, ""):
        for word in words:
            if word in text:
                print(f"{p}: {where.lstrip('.')} に禁止語「{word}」: {text}")
PY
)"
  if [ $? -ne 0 ]; then
    echo "⚠️  表現リント: $json_dir/ の検査に失敗しました（python3 が必要）。安全側に倒してコミットを中止します。" >&2
    exit 1
  fi
  json_count="$(printf '%s\n' "$json_hits" | sed -n 's/^#count //p')"
  json_hits="$(printf '%s\n' "$json_hits" | grep -v '^#count ' || true)"
  if [ -n "$json_hits" ]; then
    report+="── $json_dir/（text フィールド）:"$'\n'"$json_hits"$'\n\n'
  fi
fi

# ---- 検査 3: data/disease_extras/<slug>.json の画面に出る文字列 -----------------
extras_count=0
if [ -d "$repo_root/$extras_dir" ]; then
  extras_hits="$(cd "$repo_root" && python3 - "$extras_dir" "${words[@]}" <<'PY2'
import glob, json, os, sys

extras_dir, words = sys.argv[1], sys.argv[2:]
SKIP = {"evidence", "source_url", "url", "slug", "status", "id"}


def walk(node, path):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in SKIP:
                continue
            yield from walk(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from walk(value, f"{path}[{i}]")
    elif isinstance(node, str):
        yield path, node


files = sorted(p for p in glob.glob(os.path.join(extras_dir, "*.json"))
               if not os.path.basename(p).startswith("_"))
print(f"#count {len(files)}")
for p in files:
    try:
        data = json.load(open(p, encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"{p}: JSON として読めない（{e}）")
        continue
    for where, text in walk(data, ""):
        for word in words:
            if word in text:
                print(f"{p}: {where.lstrip('.')} に禁止語「{word}」: {text}")
PY2
)"
  if [ $? -ne 0 ]; then
    echo "⚠️  表現リント: $extras_dir/ の検査に失敗しました（python3 が必要）。安全側に倒してコミットを中止します。" >&2
    exit 1
  fi
  extras_count="$(printf '%s\n' "$extras_hits" | sed -n 's/^#count //p')"
  extras_hits="$(printf '%s\n' "$extras_hits" | grep -v '^#count ' || true)"
  if [ -n "$extras_hits" ]; then
    report+="── $extras_dir/（画面に出る文字列）:"$'\n'"$extras_hits"$'\n\n'
  fi
fi

# ---- 検査 4: data/patient_groups/*.json の紹介文（intro.facts[].text） -----------
groups_count=0
if [ -d "$repo_root/$groups_dir" ]; then
  groups_hits="$(cd "$repo_root" && python3 - "$groups_dir" "${words[@]}" <<'PY3'
import glob, json, os, sys

groups_dir, words = sys.argv[1], sys.argv[2:]
files = sorted(glob.glob(os.path.join(groups_dir, "*.json")))
n = 0
out = []
for p in files:
    try:
        data = json.load(open(p, encoding="utf-8"))
    except json.JSONDecodeError as e:
        out.append(f"{p}: JSON として読めない（{e}）")
        continue
    for g in data.get("groups", []):
        intro = g.get("intro") or {}
        for part in ("facts", "membership"):
            for i, f in enumerate(intro.get(part, [])):
                n += 1
                for word in words:
                    if word in f.get("text", ""):
                        out.append(f"{p}: {g.get('id')}.intro.{part}[{i}].text に禁止語「{word}」: {f['text']}")
print(f"#count {n}")
print("\n".join(out))
PY3
)"
  if [ $? -ne 0 ]; then
    echo "⚠️  表現リント: $groups_dir/ の検査に失敗しました（python3 が必要）。安全側に倒してコミットを中止します。" >&2
    exit 1
  fi
  groups_count="$(printf '%s\n' "$groups_hits" | sed -n 's/^#count //p')"
  groups_hits="$(printf '%s\n' "$groups_hits" | grep -v '^#count ' | grep -v '^$' || true)"
  if [ -n "$groups_hits" ]; then
    report+="── $groups_dir/（紹介文）:"$'\n'"$groups_hits"$'\n\n'
  fi
fi

# ---- 検査 5: data/support_centers.json の画面に出る値 ----------------------------
centers_count=0
if [ -f "$repo_root/data/support_centers.json" ]; then
  centers_hits="$(cd "$repo_root" && python3 - "data/support_centers.json" "${words[@]}" <<'PY4'
import json, sys

p, words = sys.argv[1], sys.argv[2:]
try:
    data = json.load(open(p, encoding="utf-8"))
except json.JSONDecodeError as e:
    print("#count 0")
    print(f"{p}: JSON として読めない（{e}）")
    sys.exit(0)
n = 0
out = []
for pref in data.get("prefectures", []):
    for i, c in enumerate(pref.get("centers", [])):
        vals = list((c.get("name") or {}).get("value", [])) + list((c.get("address") or {}).get("value", []))
        vals += [t.get("value", "") for t in c.get("phone", [])]
        n += 1
        for v in vals:
            for word in words:
                if word in v:
                    out.append(f"{p}: {pref.get('pref')}[{i}] に禁止語「{word}」: {v}")
print(f"#count {n}")
print("\n".join(out))
PY4
)"
  if [ $? -ne 0 ]; then
    echo "⚠️  表現リント: data/support_centers.json の検査に失敗しました（python3 が必要）。安全側に倒してコミットを中止します。" >&2
    exit 1
  fi
  centers_count="$(printf '%s\n' "$centers_hits" | sed -n 's/^#count //p')"
  centers_hits="$(printf '%s\n' "$centers_hits" | grep -v '^#count ' | grep -v '^$' || true)"
  if [ -n "$centers_hits" ]; then
    report+="── data/support_centers.json（画面に出る値）:"$'\n'"$centers_hits"$'\n\n'
  fi
fi

# ---- 検査 6: data/nanbyo_hospitals.json の画面に出る値 ---------------------------
hosp_count=0
if [ -f "$repo_root/data/nanbyo_hospitals.json" ]; then
  hosp_hits="$(cd "$repo_root" && python3 - "data/nanbyo_hospitals.json" "${words[@]}" <<'PY5'
import json, sys

p, words = sys.argv[1], sys.argv[2:]

# このデータは公開面にそのまま出るので、禁止語リストに加えて「診断」の字そのものも検査する。
# 例外（完全一致だけ）：
#   - 「九州大学病院 (未診断・未指定難病相談支援センター)」…出典（難病情報センター）に載っている正式名称。
#     名称を変えたり一部を省いたりせず原文どおり出す（2026-10-03 ファウンダー判断）。この 1 件だけを許可する。
BARE_WORD = "診断"
ALLOW_BARE = {"九州大学病院 (未診断・未指定難病相談支援センター)"}

try:
    data = json.load(open(p, encoding="utf-8"))
except json.JSONDecodeError as e:
    print("#count 0")
    print(f"{p}: JSON として読めない（{e}）")
    sys.exit(0)
n = 0
out = []
for pref in data.get("prefectures", []):
    for s in pref.get("sections", []):
        vals = [s.get("label", {}).get("value", "")]
        for h in s.get("hospitals", []):
            n += 1
            vals.append((h.get("name") or {}).get("value", ""))
            vals.append((h.get("field") or {}).get("value", ""))
        for v in vals:
            for word in words:
                if word in v:
                    out.append(f"{p}: {pref.get('pref')} に禁止語「{word}」: {v}")
            if BARE_WORD in v and v not in ALLOW_BARE:
                out.append(f"{p}: {pref.get('pref')} に「{BARE_WORD}」の字（例外は正式名称 1 件だけ）: {v}")
print(f"#count {n}")
print("\n".join(out))
PY5
)"
  if [ $? -ne 0 ]; then
    echo "⚠️  表現リント: data/nanbyo_hospitals.json の検査に失敗しました（python3 が必要）。安全側に倒してコミットを中止します。" >&2
    exit 1
  fi
  hosp_count="$(printf '%s\n' "$hosp_hits" | sed -n 's/^#count //p')"
  hosp_hits="$(printf '%s\n' "$hosp_hits" | grep -v '^#count ' | grep -v '^$' || true)"
  if [ -n "$hosp_hits" ]; then
    report+="── data/nanbyo_hospitals.json（画面に出る値）:"$'\n'"$hosp_hits"$'\n\n'
  fi
fi

if [ -n "$report" ]; then
  echo "🚫 表現リント: 公開面に禁止語が含まれています。" >&2
  echo "   （リスト: docs/wording-blocklist-demo.txt）" >&2
  echo "" >&2
  printf '%s' "$report" >&2
  echo "表現を修正するか、リスト自体の見直しが必要な場合は docs/wording-blocklist-demo.txt を編集してください。" >&2
  exit 1
fi

echo "✅ 表現リント: 禁止語ヒットなし（対象: $code_dir/、$json_dir/ の JSON ${json_count} 件の text 欄、$extras_dir/ の JSON ${extras_count} 件、$groups_dir/ の紹介文 ${groups_count} 文、data/support_centers.json の ${centers_count} センター、data/nanbyo_hospitals.json の ${hosp_count} 病院、禁止語 ${#words[@]} 語）"
exit 0
