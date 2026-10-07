# フェーズ1a 抽出タスク（1 タスク分）

> ## 守ること（最初に読む）
>
> - **担当は `data/disease_overviews/_shards/shard_N.json` に書かれた idx だけ。** 他の idx には手を出さない。
> - **書き込み先は `data/disease_overviews/<idx>.json` と `data/disease_overviews/_logs/shard_N.md` だけ。** 他のファイルは読むだけで、1 バイトも変更しない。
> - **git 操作は禁止**（commit / push / checkout / restore / stash / add、すべて）。
> - **Web 取得は禁止。** `.cache/disease_sources/` に保存済みの HTML だけを読む。curl / fetch / requests を使わない。
> - **`.env*` を開かない。`npm install` をしない。**
> - 分からないことは「記載なし」か `notes` に書く。**推測で埋めない。**
>
> `N` は起動時に置き換えられる。

仕様の正は `docs/disease_overview_phase1_spec_2026-09-24.md`。本書はその実行手順。

---

## 1. 入力

| 読むもの | パス | 使い方 |
|---|---|---|
| 担当リスト | `data/disease_overviews/_shards/shard_N.json` | idx の配列。これだけを処理する |
| 照合表 | `data/disease_overviews/_match_table.json` | `entries` を idx で引く。出典の URL・取得記録がある |
| 保存 HTML | `.cache/disease_sources/pages/<key>.html` | 照合表の `<出典>.page_fetch.cache_file` にパスがある |
| Orphanet の英語 Definition | `data/disease_overviews/_orphanet_definitions.json` | `definitions["<idx>"]` で引く |
| 禁止表現 | `docs/wording-blocklist-demo.txt` | 出力前に必ず突き合わせる |

照合表 1 件の形（抜粋）:

```json
{ "idx": 0, "disease": "ファブリー病", "reading": "ふぁぶりーびょう",
  "nanbyou": { "url": "https://www.nanbyou.or.jp/entry/…", "judgement": "exact",
               "page_fetch": { "url": "…", "fetched_at": "…", "sha256": "…",
                               "title": "…", "cache_file": ".cache/disease_sources/pages/….html" } },
  "shouman": { "url": "https://www.shouman.jp/disease/details/…/", "judgement": "exact", "page_fetch": { … } },
  "orphanet": { "orpha_code": "ORPHA:324", "judgement": "exact" } }
```

- `judgement` が `exact` の出典だけ本文を読む。
- `judgement` が `group` の出典は **`links` にだけ**入れる（`label: "関連する群のページ"`）。本文は読まない。
- `judgement` が `partial` / `none` の出典は使わない（確認が済んでいない）。
- `page_fetch` が無い出典は、取得に失敗しているので使わない。`notes` に「保存 HTML が無い」と書く。

## 2. 出典ごとの読み方

### 2-1. 難病情報センター（最優先）

保存してあるのは「病気の解説（一般利用者向け）」のタブ。見出しが番号つきで揃っている
（実測: 保存した 163 枚のうち「とは」156・「症状」160・「治療法」158・「多いのですか」151）。

| 見出しに含まれる言葉 | 使い道 |
|---|---|
| `とは`（`1. 「〜」とはどのような病気ですか`） | **summary** |
| `どのくらいいるのですか`（患者数） | 使わない |
| `どのような人に多いのですか` | **onset**（発症年齢・好発年齢が書いてあるときだけ） |
| `原因` / `遺伝するのですか` | 使わない |
| `どのような症状がおきますか` | **symptoms** |
| `どのような治療法がありますか` | **treatment** |
| `経過` / `別名` / `資料・リンク` | 使わない |

番号は疾患によってずれる。**番号ではなく言葉で探す。** 見つからなければその項目は「記載なし」。

保存した 163 枚のうち **3 枚は番号つきの節を持たない**（`idx 24 プリオン病` / `idx 74 多系統萎縮症` /
`idx 105 好酸球性消化管疾患`）。下位の病型へのリンクだけの案内ページなので、
**本文は取らず、`links` に入れて `notes` に「解説が下位の病型に分かれている」と書いて先へ進む**。

### 2-2. 小児慢性特定疾病情報センター

`/disease/details/<id>/` の個別ページ。**見出しの言葉が疾患によってかなり揺れる**（実測値は 202 枚中の出現数）。
下の「言い換えの束」のどれかに当たればその項目として扱う。当たらなければ「記載なし」。

| 使い道 | 見出しの言い換えの束（実測） |
|---|---|
| **summary** | `概念・定義`(76) / `概要・定義`(50) / `疾患概念`(32) / `概要`(30) |
| **symptoms** | `症状`(112) / `臨床症状`(67) / `主な症状`(7) |
| **treatment** | `治療`(187) |
| **onset** | `疫学`(172) の中に**発症年齢が書いてあるときだけ**。※下の注意 |
| 使わない | `病因`(158) / `診断`(130) / `予後`(167) / `検査所見`(24) / `合併症`(29) / `参考文献` / `関連資料` / `成人期以降` |

> **※ `疫学` の扱い**: この節には患者数・有病率と発症年齢が混ざっている。
> **onset に使ってよいのは発症年齢の記述だけ**で、人数・有病率・発症率の数値は `text` にも `evidence` にも入れない。
> 発症年齢の一文を evidence に選べないなら `onset` は `null`。
>
> **`onset` の `text` と `evidence` に数字（半角 `0-9`・全角 `０-９`・漢数字）が 1 文字でも入っていたら不合格。**
> 検証器（`scripts/portal/validate_overview.py`）が落とす。数字を含まない言い方にできないなら `onset` は `null`。
>
> **ただし次の 13 語の一部として出てくる漢数字は許す**（2026-09-25 ファウンダー承認。数を表さない固定語）:
> `一部` `一般` `一方` `一定` `一度` `十分` `四徴` `四肢` `二次` `一番` `三好` `同一` `一家`
> 部分一致で見るので `一般` が許されれば `一般的` も通る。
> **この一覧は増やさない。** 載っていない漢数字で落ちたら `onset` は `null` にして `notes` に文を書き写す
> （1b の完了後にまとめて追加を判断するため）。
> 許容しない語の例: `万人` `万人当` `千人` `一人` `一次` `三尖` など（数そのものを作る語）。

ページ上部の `告示` / `版` / `更新日` / `文責` の表は本文ではないので使わない。

難病情報センターと両方ある疾患では、**難病情報センターを優先**する。
小児慢性は、難病情報センターに無い項目（`onset` だけ無い、など）を埋めるためだけに使う。

### 2-3. Orphanet（英語）

`_orphanet_definitions.json` の `definition_text`（タグを外した本文）を使う。
**日本語の出典が 1 つも無いときだけ** `summary` に使い、`lang: "en"`、`text` は**英語原文をそのまま**（訳さない・縮めない）。
`has_definition` が `false` の疾患には使わない。

### 2-4. Orphanet のみの疾患（フェーズ1b-α）

日本語の出典が無く、Orphanet の照合が `exact` の疾患。担当は `_shards/orphanet_shard_N.json`。

- **出典は `data/disease_overviews/_orphanet_definitions.json` の `definition_text` だけ。**
  Web 取得は禁止。`definition_raw`（`<i>` 等のタグを含む原文）は使わない。
- `has_definition` が `false` の疾患は**ファイルを作らない**。`_logs` に「Definition が無い」と記録する。
- **`summary`**: `text` は Definition の英語原文を**そのまま全文**。`lang: "en"`。
  **80 字の上限は英語には当てはめない**（上限は原文全体）。`evidence` は原文の冒頭 40 字。
- **`symptoms`**: Definition に列挙があるときだけ、**英語の語句をそのまま** 0〜8 件。`evidence` は必須。
  列挙が無ければ**空の配列**でよい（日本語出典の 3〜8 件の下限は当てはめない）。
- **`onset`**: Definition に発症時期の明示があれば英語のまま。無ければ `null`。
  数字の規則は英語にも当てはめる（`onset before 2 years` のように数字を含むなら `null`）。
- **`treatment`**: **一律 `type: "記載なし"`、`evidence: null`。**
  Orphanet の Definition は治療の出典として弱いため（2026-09-25 ファウンダー判断）。
  Definition に治療の記述があっても採らない。
- **`sources`**: 1 件だけ。

  ```json
  { "id": "orphanet",
    "url": "<lib/portal/orphanet-link.ts の定数から組み立てる。★形式は確認待ち>",
    "fetched_at": "2026-06-23",   // 原本 en_product1.xml の版
    "sha256": null,               // Web 取得していないので無い
    "title": "<Orphanet の疾患名（英語）>" }
  ```

  URL の形式は `lib/portal/orphanet-link.ts` の `ORPHANET_DISEASE_URL_TEMPLATE` **1 か所**で持つ。
  ファウンダーの確認後に確定し、確定したら `build_orphanet_overviews.py --rewrite-url` で流し直す。
- `links` は同じ URL を `label: "公式ページ"` で 1 件。
- **`symptoms` が 0 件のときは空配列のまま。** 表示側は「主な症状」の見出しごと出さない
  （`onset` が `null` のときと同じ扱い。2026-09-25 ファウンダー判断）。
- **英語のまま出す。** 画面には「日本語の公式情報は見つかりませんでした」を添える。
  翻訳するかどうかは後で判断する（2026-09-25 ファウンダー判断）。
- 翻訳しない。要約しない。日本語を足さない。**`notes` だけは日本語で書く。**

## 3. 書き方の決まり

- **evidence は出典本文からの 40 字以内の抜き書き。1 文字も変えない。** 付けられない事実は書かない。
- `summary.text` は 80 字以内。evidence の言い換えであって、evidence に無い事実（有病率・遺伝形式・数値・発症頻度）を足さない。
- `symptoms` は 3〜8 件。1 件ずつ短く。**検査所見（数値・画像・血液検査の結果）は症状ではない**ので入れない。
- `treatment.type` は 4 つのどれか: `治療法あり` / `症状を抑える治療が中心` / `研究段階` / `記載なし`。
  **薬剤名・製品名・企業名は書かない**（`type` と `evidence` の両方で）。
  evidence に薬剤名が含まれてしまう場合は、薬剤名を含まない別の箇所を evidence に選ぶ。選べなければ `記載なし`。
- `onset` は書いていなければ `null`。**`onset` の `text` / `evidence` に数字（半角・全角・漢数字）を含めない**
  （患者数・有病率が混ざるのを防ぐため。2026-09-25 ファウンダー指示）。
  §2-2 の 13 語（`一部` `一般` `一方` `一定` `一度` `十分` `四徴` `四肢` `二次` `一番` `三好` `同一` `一家`）に
  含まれる漢数字だけは許される。それ以外を含めざるを得ないなら `null` にし、その文を `notes` に書き写す。
- 「診断」をサービスの動詞に使わない（`診断します` `診断できます` `診断する` `診断して`）。医学用語としての「臨床診断」等はそのまま。
- 出力前に `docs/wording-blocklist-demo.txt` の全語を `text` と `evidence` に対して突き合わせ、**1 語でも当たったらその事実を落として `notes` に記録**する。
- 医学的な判断をしない。出典どうしが食い違っていたら、片方を選ばず `notes` に両方書いて先へ進む。

## 4. 出力

`data/disease_overviews/<idx>.json`。形は `docs/disease_overview_phase1_spec_2026-09-24.md` の「出力」のとおり。

- `sources` には**実際に本文を読んだ出典だけ**を入れる。`url` / `fetched_at` / `sha256` / `title` は照合表の `page_fetch` からそのまま写す。
- `source_id` は `sources[].id` と一致させる（`nanbyou` / `shouman` / `orphanet`）。
- `links` には、読んだ出典の公式ページ（`label: "公式ページ"`）と、`judgement=group` の群ページ（`label: "関連する群のページ"`）を入れる。
- `shard` には担当番号 N を入れる。
- `extracted_at` は ISO 日時。
- **本文が 1 つも読めなかった疾患はファイルを作らない。** `_logs/shard_N.md` に「出典なしでスキップ」として記録する。

## 5. ログ

`data/disease_overviews/_logs/shard_N.md` に、処理した idx を 1 行ずつ:

```
| idx | 病名 | 使った出典 | summary | symptoms | onset | treatment | 落とした事実 | notes |
```

## 6. 検証（出力のたびに必ず通す）

```bash
python3 scripts/portal/validate_overview.py --shard N
```

不合格が 1 件でもあれば exit 1。**不合格のまま報告しない。** 直せないものはファイルを作らず `notes` と `_logs` に理由を書く。

検証器が落とすもの: 必須項目の欠け／`summary.text` 80 字超／`evidence` 40 字超／
**`evidence` が出典本文にそのままの形で見つからない（改変の検出）**／`symptoms` が 3〜8 件の外／
`treatment.type` が 4 つ以外／**`onset` に数字（半角・全角・漢数字）**／禁止語／
`source_id` が `sources` に無い／`sources` の url・sha256 が照合表と違う／日本語出典があるのに `lang: "en"`。

不合格にはしないが出る注意: `treatment` にカタカナ 5 文字以上（薬剤名の混入かもしれない。目で見て判断する）。

## 7. 記入例（idx 0 ファブリー病。検証器を通したもの）

```json
{
 "idx": 0,
 "name": "ファブリー病",
 "sources": [
  {
   "id": "shouman",
   "url": "https://www.shouman.jp/disease/details/08_06_091/",
   "fetched_at": "2026-09-24T00:50:02+09:00",
   "sha256": "09848a223211b27c96c275d50db17a4723e716849ec06b7c58148274da6fad93",
   "title": "ファブリー（Fabry）病 概要 - 小児慢性特定疾病情報センター"
  }
 ],
 "summary": {
  "text": "酵素のはたらきが弱いために、体のいろいろな場所に物質がたまっていく、生まれつきの病気です。",
  "source_id": "shouman",
  "evidence": "α-ガラクトシダーゼ活性の低下により",
  "lang": "ja"
 },
 "symptoms": [
  {
   "text": "手足が痛む",
   "source_id": "shouman",
   "evidence": "手足の痛み（四肢末端痛）"
  },
  {
   "text": "汗をかきにくい",
   "source_id": "shouman",
   "evidence": "汗をかきにくいこと（低汗症や無汗症）"
  },
  {
   "text": "体温が上がりやすい",
   "source_id": "shouman",
   "evidence": "それによる体温の上昇を認める"
  },
  {
   "text": "目が見えにくくなることがある",
   "source_id": "shouman",
   "evidence": "角膜混濁"
  },
  {
   "text": "腎臓のはたらきが落ちる",
   "source_id": "shouman",
   "evidence": "腎障害"
  },
  {
   "text": "耳が聞こえにくくなることがある",
   "source_id": "shouman",
   "evidence": "難聴"
  }
 ],
 "onset": {
  "text": "多くは学童期までに症状が出ます",
  "source_id": "shouman",
  "evidence": "多くが、学童期までに発症する。"
 },
 "treatment": {
  "type": "治療法あり",
  "source_id": "shouman",
  "evidence": "酵素補充療法、シャペロン療法、対症療法がある。"
 },
 "links": [
  {
   "id": "shouman",
   "url": "https://www.shouman.jp/disease/details/08_06_091/",
   "label": "公式ページ"
  }
 ],
 "notes": [
  "難病情報センターの判定が none のため、小児慢性だけを読んだ。"
 ],
 "extracted_at": "2026-09-25T10:00:00+09:00",
 "shard": 1
}
```

この例では、難病情報センターの判定が `none` なので小児慢性だけを読んでいる。
`onset` は `疫学` 節の「多くが、学童期までに発症する。」から取った。同じ節にある有病率の数値には触れていない。
`treatment` の evidence は薬剤名を含まない一文を選んでいる（同じ節の後半には薬剤名がある）。

## 8. 報告（最後に 1 回だけ）

- 処理件数
- 出力件数
- 出典なしでスキップした件数
- evidence を付けられず落とした事実の数
- notes の件数と `_logs/shard_N.md` へのパス

途中経過は報告しない。
