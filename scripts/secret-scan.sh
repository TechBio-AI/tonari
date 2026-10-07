#!/usr/bin/env bash
#
# secret-scan.sh - コミット前の番人(秘密情報の流出防止)
#
# これからコミットされる差分(git diff --cached)をスキャンし、
# API キーや秘密らしき文字列を検知したらコミットを中止する(exit 1)。
# 検知時はキー本体をマスクして「どのファイルのどの行か」を表示する。
#
# 外部ツールのインストールは不要(grep など標準コマンドのみ使用)。
#
set -u

# ---- 検知パターン(拡張正規表現 / grep -E)----------------------------------
# 注: ここに書く文字列は「検知のためのパターン」であり、実際の秘密値ではない。
PATTERNS=(
  'sk-ant-'                         # Anthropic API キー接頭辞
  'ANTHROPIC_API_KEY[[:space:]]*=[[:space:]]*[^[:space:]"'"'"']+'   # 代入形
  'LITELLM_MASTER_KEY[[:space:]]*=[[:space:]]*[^[:space:]"'"'"']+'
  'LANGFUSE_SECRET_KEY[[:space:]]*=[[:space:]]*[^[:space:]"'"'"']+'
  'sk-[A-Za-z0-9_-]{20,}'           # "sk-" で始まる長い高エントロピーっぽい文字列
)

# ---- 除外パス(誤検知回避)--------------------------------------------------
# このスクリプト自身と、docs/security/ 配下の Markdown は対象外。
# (検知パターンの「例」を含むため)
is_excluded() {
  local f="$1"
  case "$f" in
    scripts/secret-scan.sh) return 0 ;;
    docs/security/*.md)      return 0 ;;
  esac
  return 1
}

# ---- マスク処理 ------------------------------------------------------------
# 検知行から秘密の値部分を伏せる。先頭の手がかり数文字だけ残して伏せ字に。
mask_line() {
  # sk-ant-XXXX... / sk-XXXX... を sk-ant-**** / sk-**** に
  # KEY=value を KEY=**** に
  sed -E \
    -e 's/(sk-ant-)[A-Za-z0-9_-]+/\1********/g' \
    -e 's/(sk-)[A-Za-z0-9_-]{20,}/\1********/g' \
    -e 's/((ANTHROPIC_API_KEY|LITELLM_MASTER_KEY|LANGFUSE_SECRET_KEY)[[:space:]]*=[[:space:]]*)[^[:space:]"'"'"']+/\1********/g'
}

# ---- メイン ----------------------------------------------------------------
# ステージされた(追加・変更された)ファイル一覧を取得。
staged_files="$(git diff --cached --name-only --diff-filter=ACM)"

found=0

# 単一の grep 用に全パターンを OR で連結。
joined_pattern="$(IFS='|'; echo "${PATTERNS[*]}")"

while IFS= read -r file; do
  [ -z "$file" ] && continue
  is_excluded "$file" && continue
  # .gitignore で除外済みのファイルはそもそも staged にならないので追加対応は不要。

  # ステージ済み(インデックス)の内容に対して、行番号付きで検知する。
  # ":<file>" 形式でインデックスの blob を読む。
  content="$(git show ":$file" 2>/dev/null)" || continue

  matches="$(printf '%s\n' "$content" | grep -nE "$joined_pattern" 2>/dev/null)"

  if [ -n "$matches" ]; then
    if [ "$found" -eq 0 ]; then
      echo "🚨 秘密情報の可能性を検知しました:" >&2
      echo "" >&2
    fi
    found=1
    while IFS= read -r m; do
      [ -z "$m" ] && continue
      lineno="${m%%:*}"
      masked="$(printf '%s' "${m#*:}" | mask_line)"
      printf '  %s:%s: %s\n' "$file" "$lineno" "$masked" >&2
    done <<< "$matches"
  fi
done <<< "$staged_files"

if [ "$found" -ne 0 ]; then
  echo "" >&2
  echo "秘密が含まれている可能性があるためコミットを中止しました。" >&2
  echo "値を取り除くか、誤検知の場合は scripts/secret-scan.sh の除外設定を確認してください。" >&2
  exit 1
fi

exit 0
