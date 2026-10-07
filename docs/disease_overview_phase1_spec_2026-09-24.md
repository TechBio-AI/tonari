# フェーズ1 仕様：出典からの抽出

2026-09-24 ファウンダー確定。**以後これを正とする。**

## 原則
- 出典に書いてあることだけを書く。出典に無い事実は「記載なし」。自分の知識で補わない
- 各事実に evidence（出典本文の該当箇所、原文40字以内、無改変）を必ず付ける。付けられない事実は書かない
- 医学的判断をしない。矛盾・疑問は notes に書いて先へ進む
- 薬剤名・製品名・企業名は書かない。「診断」をサービスの動詞として使わない。docs/wording-blocklist-demo.txt を守る
- 出典の優先順：難病情報センター（患者向け解説タブ） > 小児慢性 > Orphanet（英語）
- 群ページ（judgement=group）は links にだけ入れ、本文抽出には使わない

## 出力：data/disease_overviews/<idx>.json

```json
{
  "idx": 数値,
  "name": "当サイトの病名",
  "sources": [ { "id": "nanbyou|shouman|orphanet", "url": "…", "fetched_at": "ISO日時", "sha256": "…", "title": "取得ページの見出し" } ],
  "summary": { "text": "80字以内。患者向けの平易な言い方", "source_id": "…", "evidence": "原文40字以内", "lang": "ja|en" },
  "symptoms": [ { "text": "短く", "source_id": "…", "evidence": "原文40字以内" } ],
  "onset": { "text": "…", "source_id": "…", "evidence": "…" },
  "treatment": { "type": "治療法あり|症状を抑える治療が中心|研究段階|記載なし", "source_id": "…", "evidence": "…" },
  "links": [ { "id": "nanbyou|shouman|orphanet", "url": "…", "label": "公式ページ|関連する群のページ" } ],
  "notes": [ "判断が要る点" ],
  "extracted_at": "ISO日時",
  "shard": 番号
}
```

- `symptoms` は 3〜8 件
- `onset` は無ければ `null`
- `summary.text` は evidence の言い換え。evidence に無い事実（有病率・遺伝形式・数値）を足さない
- 日本語出典が無く Orphanet のみの場合：`summary.text` は Definition の英語原文をそのまま、`lang: "en"`

## 担当リストと指示書
- `data/disease_overviews/_shards/shard_1.json` … `shard_4.json`（idx の配列。フェーズ1a は 297 件を 4 等分）
- `docs/disease_overview_phase1_task.md`：1 タスク分の指示書。冒頭に「担当は `_shards/shard_N.json` のみ。
  書き込み先は `data/disease_overviews/<idx>.json` と `_logs/shard_N.md` のみ。他に触れない。git 操作禁止。
  Web 取得禁止（`.cache/disease_sources/` の保存 HTML だけを読む）」を置く。N は起動時に置き換える

## 報告（各タスク、最後に1回）
処理件数／出力件数／出典なしでスキップ／evidence を付けられず落とした事実の数／notes の件数と `_logs` へのパス
