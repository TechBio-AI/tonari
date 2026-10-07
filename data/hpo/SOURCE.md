# HPO (Human Phenotype Ontology) 取得記録

このディレクトリには HPO の**原本**を一切改変せずに保存している。
加工・派生データは絶対にこのディレクトリに書かない（別ディレクトリへ出力すること）。

## 取得日

2026-08-02（JST）

## 使用バージョン（ライセンス条件2：バージョン記録）

| 項目 | 値 |
|---|---|
| HPO リリース | **v2026-06-23** |
| `hp.obo` data-version | `hp/releases/2026-06-23` |
| `phenotype.hpoa` version | `2026-06-23` |
| `phenotype.hpoa` が参照する HPO | `http://purl.obolibrary.org/obo/hp/releases/2026-06-23/hp.json` |
| 日本語訳 `hp-ja.babelon.tsv` の source_version | `hp/releases/2023-07-21`（**本体より約3年古い**） |
| 日本語訳ファイルの最終更新コミット | `56adddf625f36ea27929496c2e134dda2f2b3792`（2025-01-16） |

## ファイル一覧

| ファイル | 取得元 URL | サイズ (bytes) | SHA-256 |
|---|---|---|---|
| `hp.obo` | http://purl.obolibrary.org/obo/hp.obo | 11,222,341 | `a5092cbdf605f568403cf7380d9173014015692433b2cc631bc5c1b053876b1b` |
| `phenotype.hpoa` | http://purl.obolibrary.org/obo/hp/hpoa/phenotype.hpoa | 35,672,303 | `89004f85b253f980ffe84218d2c080665cbf67a57bbb322111d6a2db5eb31dff` |
| `hp-ja.babelon.tsv` | https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/master/src/translations/hp-ja.babelon.tsv | 3,821,368 | `cefe15af19d988598eee0077cc75e2d488837adb746522f4cb5d1312fc343eea` |
| `hp-ja-not-translated.babelon.tsv` | 同上ディレクトリ | 259,187 | `28469951f5837cd13259ad8a9c868305c7635c4351a817bf92521968abf325b2` |
| `translations-README.md` | 同上ディレクトリ | 43 | （内容 1 行のみ） |

`hp.obo` と `phenotype.hpoa` のサイズは GitHub リリース `v2026-06-23` の
アセットサイズと完全一致しており、正規リリース物であることを確認済み。

検証コマンド:

```bash
shasum -a 256 data/hpo/*.obo data/hpo/*.hpoa data/hpo/*.tsv
```

## 改変防止（ライセンス条件1）

全ファイルを `chmod 444`（読み取り専用）に設定済み。
再取得する場合は必ず上書きではなく、新バージョンのディレクトリを切ること。

```
-r--r--r--  hp.obo
-r--r--r--  phenotype.hpoa
-r--r--r--  hp-ja.babelon.tsv
-r--r--r--  hp-ja-not-translated.babelon.tsv
```

## ライセンス3条件（遵守事項）

HPO は **HPO ライセンス（hpo-license, CC BY 4.0 相当の独自ライセンス）** の下で
提供される。利用にあたり以下3点を絶対条件として遵守する。

### 条件1：内容および内部の論理的関係を一切改変しないこと

- ダウンロードした原本（`hp.obo` / `phenotype.hpoa` / `hp-ja.babelon.tsv`）は
  そのまま保存し、編集しない。
- ターム間の `is_a` 階層関係、疾患↔症状の対応、頻度情報を書き換えない。
- 独自の症状を HPO ID に紐付けて「HPO のデータ」として配布しない。
- 加工が必要な場合は**別ファイル・別ディレクトリ**へ出力し、
  派生物であることを明示する。

### 条件2：使用する HPO のバージョン（日付）を記録すること

- 本ファイル冒頭の「使用バージョン」表に記録済み。
- DB に取り込む際は、レコードに `hpo_release = '2026-06-23'` を必ず保持する。
- 画面表示時も参照バージョンを明示する。

### 条件3：HPO コンソーシアムの引用・謝辞が必要

公開面（`app/(portal)/` 配下および HPO 由来データを表示するすべての画面）に
以下の帰属表示を掲出する。

> 本サービスは Human Phenotype Ontology（HPO, リリース 2026-06-23）を利用しています。
> HPO コンソーシアムに謝意を表します。
> https://hpo.jax.org/

引用文献（論文引用が必要な場面ではこちらを使う）:

> Gargano MA, Matentzoglu N, Coleman B, et al.
> The Human Phenotype Ontology in 2024: phenotypes around the world.
> Nucleic Acids Res. 2024;52(D1):D1333–D1346.

日本語訳を表示する場合は、翻訳が HPO 公式の Babelon 翻訳ファイル
（`src/translations/hp-ja.babelon.tsv`）由来であることも併記する。

## 注意事項

- **日本語訳のバージョン差**: 日本語訳は `2023-07-21` 時点の HPO に対して作られており、
  本体（2026-06-23）より約3年古い。2023-07-21 以降に追加されたタームには
  日本語ラベルが存在しない。実測結果は `docs/survey_hpo_acquisition.md` を参照。
- 本ディレクトリのファイルを git にコミットするかの判断も
  `docs/survey_hpo_acquisition.md` に記載。
