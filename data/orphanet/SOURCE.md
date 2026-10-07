# Orphanet 命名法（Orphadata）取得記録

このディレクトリには Orphadata の**原本**を一切改変せずに保存している。
加工・派生データは絶対にこのディレクトリに書かない（別ディレクトリへ出力すること）。

## 取得日

2026-09-10（JST）

## 使用バージョン（ライセンス条件：版の明示）

| 項目 | 値 |
|---|---|
| `en_product1.xml` の JDBOR `date` | **2026-06-23 07:53:50**（Orphadata 掲載日 23 Jun 26、HTTP Last-Modified 2026-06-29） |
| `en_product1.xml` の JDBOR `version` | `1.3.42 / 4.1.8 [2025-03-03]`、`copyright="Orphanet (c) 2026"` |
| `en_product1.xml` のエンティティ数 | 11,645（`DisorderList count`。現役 10,101 / 非現役 1,544） |
| Nomenclature Pack の版 | **2025 版**（ZIP 内ファイル名 `*_en_2025.*`、`ORPHAnomenclature_en_2025.xml` の `ExtractionDate` = 2025-06-24 08:04:43） |
| `ORPHAnomenclature_en_2025.xml` のエンティティ数 | 11,239（Active 9,784 / Inactive 1,455） |
| Pack を置く GitHub コミット | 2026-06-29T12:47:29Z「JUL 2026」（Orphanet/Orphadata_aggregated, master） |

**注意**: GitHub のコミットは「JUL 2026」だが、ZIP の中身は 2025 版である（実測）。
`en_product1.xml`（2026-06-23）より 1 年古いので、現役/非現役の判定は `en_product1.xml` を正とし、
Pack は交差検証にのみ用いる。2026 版 Pack が公開され次第、新しいディレクトリを切って取得し直すこと。

## ファイル一覧

| ファイル | 取得元 URL | サイズ (bytes) | SHA-256 |
|---|---|---|---|
| `en_product1.xml` | https://www.orphadata.com/data/xml/en_product1.xml | 54,026,799 | `df8d562a0c6011af36a74eb4000ce81ca7d723e8031010819fb71727c0962bbb` |
| `Orphanet_Nomenclature_Pack_EN.zip` | https://raw.githubusercontent.com/Orphanet/Orphadata_aggregated/master/Rare%20diseases%20and%20classifications/Orphanet%20nomenclature%20files%20for%20coding/Orphanet_Nomenclature_Pack_EN.zip | 8,457,181 | `200a21930601f384f9479023eb1e6f0a853e7d46ddcd1e0dbc04f6ddb1bdec31` |
| `ORPHAnomenclature_en_2025.xml` | 上記 ZIP 内 `Orphanet_Nomenclature_Pack_EN/ORPHAnomenclature_en_2025.xml` を無改変で展開 | 20,410,789 | `769d6ffd449cc5dbbda45e37e0d59a752adbfe165f7911caf07bd36c7eec2811` |

- `en_product1.xml` のサイズは HTTP `Content-Length`（54,026,799）と完全一致。
- `ORPHAnomenclature_en_2025.xml` の SHA-256 は、`unzip -p` で ZIP から直接流した内容のハッシュと一致（展開後に改変が無いことを確認済み）。
- Orphadata 本家サイトの Nomenclature Pack ページ（https://www.orphadata.com/_pack-nomenclature/）はダウンロードリンクが JavaScript 生成で直接 URL を特定できなかったため、同ページが版の取得先として案内している Orphanet 公式 GitHub（github.com/Orphanet/Orphadata_aggregated）から取得した（2026-09-10 ファウンダー承認）。
- ZIP に同梱の分類ファイル（`Classifications/*.xml`）、線形化、ICD-10/11 対応表、Excel は ZIP 内に保持したまま展開していない。必要になったら `unzip -p` で読むこと。

検証コマンド:

```bash
shasum -a 256 data/orphanet/en_product1.xml data/orphanet/Orphanet_Nomenclature_Pack_EN.zip data/orphanet/ORPHAnomenclature_en_2025.xml
unzip -p data/orphanet/Orphanet_Nomenclature_Pack_EN.zip Orphanet_Nomenclature_Pack_EN/ORPHAnomenclature_en_2025.xml | shasum -a 256
```

## 改変防止

上記 3 ファイルを `chmod 444`（読み取り専用）に設定済み。
再取得する場合は必ず上書きではなく、新バージョンのディレクトリを切ること。

```
-r--r--r--  en_product1.xml
-r--r--r--  Orphanet_Nomenclature_Pack_EN.zip
-r--r--r--  ORPHAnomenclature_en_2025.xml
```

## ライセンス（CC BY 4.0）と遵守事項

Orphadata の疾患命名法・アライメント・Nomenclature Pack は
**Creative Commons Attribution 4.0 International (CC BY 4.0)** で提供される
（Orphadata Legal notice https://www.orphadata.com/legal-notice/ 、
各ファイル冒頭の `<Availability><Licence>` 要素にも `CC-BY-4.0` と
https://creativecommons.org/licenses/by/4.0/legalcode が記載されている）。

### 条件1：出典と版を明示すること（帰属表示）

公開面（`app/(portal)/` 配下および Orphanet 由来データを表示するすべての画面）と、
Orphanet 由来データを含む成果物に以下の帰属表示を掲出する。

> Orphadata: Free access data from Orphanet. © INSERM 1999. Available on https://www.orphadata.com.
> データ版: Rare diseases and alignments with terminologies and databases, en_product1.xml, 2026-06-23
> （Orphanet Nomenclature Pack EN 2025 版を併用）. Licensed under CC BY 4.0.

> 本サービスは Orphanet / Orphadata の疾患命名法（en_product1.xml、2026-06-23 版）を利用しています。
> © INSERM 1999. https://www.orphadata.com. CC BY 4.0 ライセンスに基づき利用。

DB に取り込む際は、レコードに `orphanet_version = '2026-06-23'` を必ず保持する。

### 条件2：改変した場合はその旨を示すこと

- 原本はこのディレクトリに無改変で保存する。
- 名前の正規化・照合結果・修正案などの派生物は `docs/` 等の別ディレクトリに出力し、
  「Orphadata 由来の派生物であり原本とは異なる」ことを明示する。
- 派生物に転記する疾患名・同義語は原本の `Name` / `Synonym` をそのまま用い、書き換えない。

### 条件3：ライセンスを制限する法的・技術的措置を加えないこと

- 派生物を配布する場合も CC BY 4.0 の再利用を妨げる条件を付けない。

## 本取得とは無関係だった既存ファイル（削除済み）

本取得より前（コミット d57d9d6、2026-03-05）から `data/orphanet/` に
`diseases-for-import.json` / `orphanet-diseases.json` / `seed-diseases.sql`、
`data/orphanet-raw/` に `ORPHAnomenclature.json` / `ORPHAgenes.json` / `ORPHAepidemiology.json` が存在した。
実体は `scripts/etl/convert-orphadata.ts` が 5 疾患の手書きサンプル（raw 3 ファイルは MD5 が同一で JDBOR ヘッダも無い）
から生成したもので、Orphadata から取得したものではなく出典を示せない。

2026-09-10 ファウンダー判断により **6 ファイルとも削除**（ファウンダーが手で実施）。
経緯は `docs/orpha_correction_proposal_v2_2026-08-30.md` §10-5。
`scripts/etl/fetch-orphadata.ts` / `convert-orphadata.ts` はこれらを入力に想定しているが、
参照先 URL（`data.orphadata.com/json/...`）も既に存在せず、扱いは別途判断。

---

## 派生物：英語 Definition の抜き出し（2026-09-24）

疾患概要プロジェクト フェーズ0/1 のために、`en_product1.xml` から英語の Definition を抜き出した。
**Web 取得は行っていない**（本ディレクトリの原本のみを読んだ）。原本は無改変のまま。

| 項目 | 値 |
|---|---|
| 取得元ファイル | `data/orphanet/en_product1.xml` |
| 版（JDBOR `date`） | **2026-06-23**（`version` = `1.3.42 / 4.1.8 [2025-03-03]`、`copyright="Orphanet (c) 2026"`） |
| ライセンス | **CC BY 4.0** |
| 抜き出した要素 | `SummaryInformation / TextSectionList / TextSection`（`TextSectionType` の `Name` が `Definition` のもの）の `Contents` |
| 対象 | 照合表 `data/disease_overviews/_match_table.json` で `orphanet.judgement == "exact"` の **547 疾患**（547 コード） |
| Definition が存在したもの | **509 件** |
| Definition が無かったもの | **38 件**（`Primary immunodeficiency` `Mitochondrial disease` `Glycogen storage disease` など、上位概念にあたるエンティティが多い） |
| 出力 | `data/disease_overviews/_orphanet_definitions.json` |
| 生成スクリプト | `scripts/portal/build_orphanet_definitions.py` |

### 条件2（改変の明示）への対応

- `definition_raw` … **原文そのまま**。`<i>…</i>` 等のタグを含むものが 13 件ある。
- `definition_text` … 表示用に**タグだけを外した**もの。語句の変更・翻訳・要約は一切していない。
- `definition_text` … 実体参照を復号（原本で二重に符号化された `&#945;` → `α`、`&nbsp;` → 空白 等。2026-09-26 追加、6 件が該当）。
- 疾患名・同義語は原本の `Name` / `Synonym` をそのまま転記している（書き換えていない）。

### 条件1（帰属表示）

Orphanet 由来の Definition を表示する画面には、次を掲出する。
文言は `data/disease_overviews/_orphanet_definitions.json` の `source.attribution_en` / `source.attribution_ja` に持たせてある。

> Orphadata: Free access data from Orphanet. © INSERM 1999. Available on https://www.orphadata.com.
> Data version: Rare diseases and alignments with terminologies and databases, en_product1.xml, 2026-06-23.
> Licensed under CC BY 4.0.

> 本サービスは Orphanet / Orphadata の疾患命名法（en_product1.xml、2026-06-23 版）を利用しています。
> © INSERM 1999. https://www.orphadata.com. CC BY 4.0 ライセンスに基づき利用。
