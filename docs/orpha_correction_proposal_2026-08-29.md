# ORPHA 番号の一括照合と修正案 — 1,001 疾患の番号を phenotype.hpoa と突き合わせる

- 作成日: 2026-09-10（ファイル名の日付は健全性調査 `docs/survey_kb_health_2026-08-29.md` に揃えた）
- 対象（読み取りのみ、無変更）: `data/knowledge/comprehensive_rare_diseases_knowledge.json`（1,001 レコード、`orpha_code` あり 701 / 無し 300）
- 物差し（読み取りのみ、無変更）: `data/hpo/phenotype.hpoa`（**HPO annotations version 2026-06-23**、ORPHA コード 4,335 件。1 コードにつき推奨名 1 つ、同義語なし）
- 補助: `lib/normalization/normalize.ts` の `bigramSimilarity`（Dice 係数）と `longestCommonSubstringLength` を Node から直接 import して使用
- 位置づけ: **照合と修正案の作成まで。** 知識ファイルは書き換えていない。適用はファウンダーが一覧を承認してから別セッションで行う
- 同時生成: `docs/orpha_corrections_2026-08-29.json`（機械可読な B・C）、`docs/orpha_review_manual_2026-08-29.md`（D の手動レビュー表）
- HPO のライセンス条件: 原本は無改変、バージョン v2026-06-23 を明示。ここに転記した英語疾患名は phenotype.hpoa の `disease_name` 列そのまま

## 0. 結論

| 分類 | 意味 | 件数 | 割合 |
|---|---|---:|---:|
| A. 一致 | 現在の ORPHA 番号が照合結果と一致 | 218 | 21.8% |
| B. 不一致 | 現在の番号が照合結果と異なる（＝誤りの疑い） | 21 | 2.1% |
| C. 補完可能 | 番号が無いが照合で特定できた | 50 | 5.0% |
| D. 照合不能 | 英語別名が無い、または対応表に見つからない | 712 | 71.1% |
| 合計 | | 1001 | 100% |

- 提案する修正は **B 21 件 + C 50 件 = 71 件**。すべて英語別名が phenotype.hpoa の推奨名と正規化後に一字違わず一致したものだけ。推測で割り当てた番号は 1 件も無い
- D は 712 件（前回の別マシンでの試行 725 件とほぼ同じ）。**主因は phenotype.hpoa に同義語が無いこと**であり、別名の質ではない（§5）。「Hunter syndrome」「McArdle disease」「Ondine curse」は Orphanet では同義語だが、対応表には「Mucopolysaccharidosis type 2」等の推奨名しか無い
- 現番号を持つ 701 件のうち、番号そのものが対応表に無いものが 121 件（17.3%）。これらは番号が正しくても phenotype.hpoa では検証できない（§5.3）
- 承認済み方針の外側で、参考として「英字語幹＋症候群/病」の接尾辞だけを英訳して当てる集計を行った。現番号を裏付けるもの 96 件、番号を補えるもの 3 件、**現番号が別疾患を指しているもの 4 件**が見つかった（§5.5）。ファウンダー判定（2026-09-10）: 規則としては不採用（日本語名から英語を組み立てる操作で「照合できたものだけ提案する」原則から外れる）。ただし誤番号 4 件は照合方法によらず誤りが明白なため、**JSON に「接尾辞英訳による発見」と区別して含めた**（§8）

## 1. 照合の方針（2026-09-10 承認済み）

### 1.1 対応表
phenotype.hpoa の `database_id` が `ORPHA:` で始まる行の `database_id` と `disease_name` を取り、コード → 英語推奨名の表（4,335 件）を作った。同一コードに異なる名前が付いている行は 0 件。

### 1.2 正規化（別名側・対応表側に同一適用）
1. Unicode NFKC 正規化、小文字化
2. 所有格 `'s` を除去（Wilson's → wilson）。承認時には明記していなかったが、アポストロフィ除去の一部として扱った。これで一致した B・C は idx 30（Wilson's disease）・120（Cushing's Syndrome）
3. 空白・ハイフン類（- ‐ ‑ – —）・スラッシュ・カンマ・ピリオド・括弧・コロン・セミコロンを除去
4. ローマ数字 → 算用数字（I〜XX、末尾の a〜d 付きも可）。誤変換を避けるため、`type` の直後にある語、または先頭以外の末尾の語だけを変換する（`X-linked` の X は変換しない）
5. 末尾の `disease` / `syndrome` を「付けた形」「外した形」の両方で試す。完全一致を先に試し、無ければ外した形で試す。外した形で一致したものは表に「disease/syndrome 無視で一致」と明記した（B・C で 2 件: idx 120、966）

### 1.3 照合に使う名前
- `alternate_names` の要素と `disease` 自体のうち、**ASCII 文字だけで書かれたもの**
- **略号は原則使わない**: すべての語が「5 文字以下の大文字・数字」またはローマ数字のもの（`MPS I`、`CCHS`、`SCA3`、`MSA-C`）。例外として、推奨名そのものが略号のとき（`MELAS`、`MERRF`）だけ完全一致で当てた（A 2 件、C 1 件: idx 14・341・342）。disease/syndrome を外した形での照合には使わない。それ以外は理由「略号のみ」で D に入れた
- `Pompe病` `Jacobsen症候群` のような英字語幹＋日本語接尾辞は英語名として扱わない（方針外。参考集計は §5.5）

### 1.4 「一致」の判定と 4 分類の優先順位
1. 正規化後の文字列が対応表の推奨名と**完全一致**した場合だけ「照合できた」とする。bigram 類似度は番号の提案に一切使わない
2. 現番号の推奨名がいずれかの英語別名と一致 → **A**（別の別名が別コードに当たっていても A を優先。例: Hurler 症候群レコードが「MPS I」で ORPHA:579 に当たっても、現番号 93473 = Hurler syndrome なら A）
3. 現番号は不一致だが、別名が別コード 1 つに一致 → **B**
4. 現番号なし、別名がコード 1 つに一致 → **C**
5. 別名が**複数の異なるコード**に一致 → 提案しない。D に「曖昧」として候補付きで記録（今回は 0 件）
6. それ以外 → **D**（理由: 英語名なし／略号のみ／対応表になし）

### 1.5 B の深刻さの判定基準（機械判定）
現番号の推奨名と提案番号の推奨名を比較する。
- **近縁・亜型**: 両者の bigram Dice ≥ 0.5、または 6 文字以上の内容語を共有（disease / syndrome / type / deficiency / congenital / familial / hereditary / autosomal / dominant / recessive 等の汎用語は除く）
- **全く別の疾患**: 上記のいずれにも該当しない
- **現番号が対応表に無く確認不能**: 現番号の推奨名が phenotype.hpoa に無い。現番号が別疾患なのか、HPO 注釈が無いだけの正しい番号なのかは判別できない

bigram Dice と内容語は機械的な文字列比較であり、医学的な近縁性の判定ではない。表には根拠となる Dice 値と共有語を併記した。

## 2. 分類結果の内訳

| 区分 | 件数 |
|---|---:|
| 現番号あり | 701 |
| 　うち現番号が対応表にある | 580 |
| 　うち現番号が対応表に無い | 121 |
| 現番号なし | 300 |
| 英語名（略号除く）を持つレコード | 825 |
| 英語名が略号のみ | 157 |
| 英語名なし | 19 |

| 分類 | 完全一致 | disease/syndrome 無視で一致 | 合計 |
|---|---:|---:|---:|
| A | 214 | 4 | 218 |
| B | 20 | 1 | 21 |
| C | 49 | 1 | 50 |

## 3. B. 不一致 — 現番号が誤っている疑いのあるレコード（21 件）

深刻な順（全く別の疾患 → 近縁・亜型 → 確認不能）。同じ区分内では Dice の小さい順。

| # | index | 疾患名（日本語） | 現在の ORPHA | **現在の番号が指している疾患名** | 提案する ORPHA | phenotype.hpoa 上の英語疾患名 | 照合に使った英語別名 | 一致の種類 | 深刻さ | Dice / 共有語 | 番号差 |
|--:|--:|---|---|---|---|---|---|---|---|---|--:|
| 1 | 5 | ニーマン・ピック病C型 | ORPHA:644 | NARP syndrome | **ORPHA:646** | Niemann-Pick disease type C | Niemann-Pick disease type C | 完全一致 | 全く別の疾患 | 0.00 | 2 |
| 2 | 726 | 良性家族性舞踏病 | ORPHA:1429 | Benign hereditary chorea | **ORPHA:209905** | Brain-lung-thyroid syndrome | Brain-Lung-Thyroid Syndrome | 完全一致 | 全く別の疾患 | 0.00 | 208,476 |
| 3 | 882 | エチルマロン酸脳症 | ORPHA:51 | Aicardi-Goutières syndrome | **ORPHA:51188** | Ethylmalonic encephalopathy | Ethylmalonic Encephalopathy | 完全一致 | 全く別の疾患 | 0.05 | 51,137 |
| 4 | 30 | ウィルソン病 | ORPHA:902 | Werner syndrome | **ORPHA:905** | Wilson disease | Wilson's disease | 完全一致 | 全く別の疾患 | 0.09 | 3 |
| 5 | 474 | 遺伝性リンパ浮腫 | ORPHA:2165 | Holoprosencephaly-caudal dysgenesis syndrome | **ORPHA:79452** | Milroy disease | Milroy Disease | 完全一致 | 全く別の疾患 | 0.13 | 77,287 |
| 6 | 637 | 先天性嚢胞性腺腫様奇形 | ORPHA:2357 | Bronchogenic cyst | **ORPHA:2444** | Congenital pulmonary airway malformation | Congenital Pulmonary Airway Malformation | 完全一致 | 全く別の疾患 | 0.17 | 87 |
| 7 | 472 | CLOVES症候群 | ORPHA:166272 | Odontochondrodysplasia | **ORPHA:140944** | CLOVES syndrome | CLOVES Syndrome | 完全一致 | 全く別の疾患 | 0.19 | 25,328 |
| 8 | 97 | 血友病B | ORPHA:101 | Dentatorubral pallidoluysian atrophy | **ORPHA:98879** | Hemophilia B | Hemophilia B | 完全一致 | 全く別の疾患 | 0.20 | 98,778 |
| 9 | 139 | 抗リン脂質抗体症候群 | ORPHA:464 | Incontinentia pigmenti | **ORPHA:80** | Antiphospholipid syndrome | Antiphospholipid Syndrome | 完全一致 | 全く別の疾患 | 0.24 | 384 |
| 10 | 554 | 筋強直性ジストロフィー2型 | ORPHA:99736 | Acetazolamide-responsive myotonia | **ORPHA:606** | Proximal myotonic myopathy | Proximal Myotonic Myopathy | 完全一致 | 全く別の疾患 | 0.24 | 99,130 |
| 11 | 588 | 先天性大脳白質形成不全症 | ORPHA:137898 | Leukoencephalopathy with brain stem and spinal cord involvement-high lactate syndrome | **ORPHA:289494** | 4H leukodystrophy | 4H Leukodystrophy | 完全一致 | 全く別の疾患 | 0.26 | 151,596 |
| 12 | 220 | グルカゴノーマ | ORPHA:97261 | GRFoma | **ORPHA:97280** | Glucagonoma | Glucagonoma | 完全一致 | 全く別の疾患 | 0.27 | 19 |
| 13 | 811 | 遺伝性掌蹠角化症（Vörner型） | ORPHA:2339 | Keratosis follicularis-dwarfism-cerebral atrophy syndrome | **ORPHA:2199** | Epidermolytic palmoplantar keratoderma | Epidermolytic Palmoplantar Keratoderma | 完全一致 | 全く別の疾患 | 0.30 | 140 |
| 14 | 838 | Scott症候群 | ORPHA:3204 | Stormorken-Sjaastad-Langslet syndrome | **ORPHA:806** | Scott syndrome | Scott Syndrome | 完全一致 | 全く別の疾患 | 0.37 | 2,398 |
| 15 | 928 | Myosin Heavy Chain 7関連ミオパチー | ORPHA:598 | Multiminicore myopathy | **ORPHA:59135** | Laing distal myopathy | Laing Distal Myopathy | 完全一致 | 近縁・亜型 | 0.42 / myopathy | 58,537 |
| 16 | 326 | 遺伝性ニューロパチー伴うアミロイドーシス | ORPHA:85447 | ATTRV30M amyloidosis | **ORPHA:271861** | Hereditary ATTR amyloidosis | hereditary ATTR Amyloidosis | 完全一致 | 近縁・亜型 | 0.62 / amyloidosis | 186,414 |
| 17 | 355 | 原発性シュウ酸過多症 | ORPHA:93598 | Primary hyperoxaluria type 1 | **ORPHA:416** | Primary hyperoxaluria | Primary Hyperoxaluria | 完全一致 | 近縁・亜型 | 0.92 / hyperoxaluria | 93,182 |
| 18 | 47 | 全身性アミロイドーシス | ORPHA:69 | （対応表に無し） | **ORPHA:85443** | AL amyloidosis | AL Amyloidosis | 完全一致 | 現番号が対応表に無く確認不能 | ― | 85,374 |
| 19 | 120 | クッシング症候群 | ORPHA:553 | （対応表に無し） | **ORPHA:96253** | Cushing disease | Cushing's Syndrome | disease/syndrome 無視で一致 | 現番号が対応表に無く確認不能 | ― | 95,700 |
| 20 | 787 | 先天性線維症症候群 | ORPHA:98692 | （対応表に無し） | **ORPHA:45358** | Congenital fibrosis of extraocular muscles | Congenital Fibrosis of Extraocular Muscles | 完全一致 | 現番号が対応表に無く確認不能 | ― | 53,334 |
| 21 | 978 | Goldenhar症候群 | ORPHA:374 | （対応表に無し） | **ORPHA:141132** | Oculo-auriculo-vertebral spectrum | Oculo-Auriculo-Vertebral Spectrum | 完全一致 | 現番号が対応表に無く確認不能 | ― | 140,758 |

### 3.1 B のうち、判定に注意が要るもの

機械判定は「英語別名が指す疾患」を正とみなしている。別名側が近縁疾患や上位・下位概念を指し、現番号のほうが正しい可能性があるものを挙げる。最終判断はファウンダー。

- idx 726 良性家族性舞踏病: 現番号 ORPHA:1429 = Benign hereditary chorea は日本語名「良性家族性舞踏病」の直訳。別名 Brain-Lung-Thyroid Syndrome は同じ NKX2-1 関連の別エンティティ。**現番号が正しく、別名が広い可能性**。**→ 却下（現番号維持）**: 疾患名「良性家族性舞踏病」に ORPHA:1429 が正しく対応。Brain-lung-thyroid は同じ NKX2-1 変異のより広い表現型で、番号を移すと名前と番号がずれる。記述を疾患名に合わせるべき（kb_issues 課題 9）。現番号を維持
- idx 355 原発性シュウ酸過多症: 現番号 93598 = Primary hyperoxaluria type 1、提案 416 = Primary hyperoxaluria（群）。健全性調査で「粒度不一致」とされた例。独立レコード idx 11「原発性高シュウ酸尿症1型」が C で 93598 を得るので、本レコードは群に付け替えるのが整合的だが、ファウンダー判断。**→ 採用**
- idx 326 遺伝性ニューロパチー伴うアミロイドーシス: 現番号 85447 = ATTRV30M amyloidosis（変異特異的）、提案 271861 = Hereditary ATTR amyloidosis（群）。健全性調査「残り 8 件」に挙がっていた粒度の問題。**→ 採用**
- idx 120 クッシング症候群: 別名 Cushing's Syndrome が disease/syndrome を無視して Cushing disease に当たった。Cushing 病は Cushing 症候群の下位（下垂体性）。**同義ではない**。現番号 ORPHA:553 は対応表に無い。適用は慎重に。**→ 却下（現番号維持）**: Cushing disease は下垂体腺腫による狭い概念。記述は副腎性も含む症候群全体で、治療にミトタンがある。現番号 ORPHA:553 を維持
- idx 588 先天性大脳白質形成不全症: 現番号 137898 = LBSL、提案 289494 = 4H leukodystrophy。健全性調査で「別名に 4H・POLR3 も混在」と指摘済み。レコード自体が複数疾患の混在で、番号だけの問題ではない可能性。**→ 採用**
- idx 928 Myosin Heavy Chain 7関連ミオパチー: 現番号 598 = Multiminicore myopathy（MYH7 ではない）、提案 59135 = Laing distal myopathy（MYH7 関連）。日本語名「Myosin Heavy Chain 7 関連ミオパチー」と提案側が整合。**→ 採用**
- idx 47 全身性アミロイドーシス: 現番号 ORPHA:69 は対応表に無い。別名 AL Amyloidosis から 85443 を提案。日本語名は「全身性アミロイドーシス」（群）なので、AL に限定してよいかはファウンダー判断。**→ 却下（現番号維持）**: 「疾患群」と明記され、治療にタファミジス（ATTR 用）がある。AL に限定できない。現番号 ORPHA:69 を維持
- idx 978 Goldenhar症候群: 現番号 ORPHA:374 は対応表に無い。提案 141132 = Oculo-auriculo-vertebral spectrum は Goldenhar 症候群の Orphanet 上の現行名。**→ 採用**
- idx 5 ニーマン・ピック病C型: 現番号 644 = NARP syndrome、提案 646 = Niemann-Pick disease type C。隣接番号の取り違え。idx 878「NARP症候群」が 644 を正しく持っている。**→ 採用**
- idx 30 ウィルソン病: 現番号 902 = Werner syndrome、提案 905 = Wilson disease。隣接番号の取り違え。idx 455「Werner症候群」が 902 を正しく持っている。**→ 採用**

idx 588 の別名に混入した「LBSL」（DARS2 変異による別疾患）と、idx 726 の記述が疾患名より広い問題は、番号ではなくレコード設計の問題として `docs/kb_issues_2026-08-29.md` 課題 8・9 に記録した。

## 4. C. 補完可能 — 番号が無く、照合で特定できたレコード（50 件）

| # | index | 疾患名（日本語） | 提案する ORPHA | phenotype.hpoa 上の英語疾患名 | 照合に使った英語別名 | 一致の種類 |
|--:|--:|---|---|---|---|---|
| 1 | 8 | 軟骨無形成症 | **ORPHA:15** | Achondroplasia | Achondroplasia | 完全一致 |
| 2 | 9 | デュシェンヌ型筋ジストロフィー | **ORPHA:98896** | Duchenne muscular dystrophy | Duchenne muscular dystrophy | 完全一致 |
| 3 | 10 | 血栓性血小板減少性紫斑病 | **ORPHA:54057** | Thrombotic thrombocytopenic purpura | Thrombotic thrombocytopenic purpura | 完全一致 |
| 4 | 11 | 原発性高シュウ酸尿症1型 | **ORPHA:93598** | Primary hyperoxaluria type 1 | Primary hyperoxaluria type 1 | 完全一致 |
| 5 | 12 | フェニルケトン尿症 | **ORPHA:716** | Phenylketonuria | Phenylketonuria | 完全一致 |
| 6 | 14 | MELAS症候群 | **ORPHA:550** | MELAS | MELAS | 完全一致 |
| 7 | 18 | 血友病A | **ORPHA:98878** | Hemophilia A | Hemophilia A | 完全一致 |
| 8 | 19 | 発作性夜間ヘモグロビン尿症 | **ORPHA:447** | Paroxysmal nocturnal hemoglobinuria | Paroxysmal nocturnal hemoglobinuria | 完全一致 |
| 9 | 20 | 非典型溶血性尿毒症症候群 | **ORPHA:2134** | Atypical hemolytic uremic syndrome | Atypical hemolytic uremic syndrome | 完全一致 |
| 10 | 22 | X連鎖性低リン血症性くる病 | **ORPHA:89936** | X-linked hypophosphatemia | X-linked hypophosphatemia | 完全一致 |
| 11 | 23 | 低ホスファターゼ症 | **ORPHA:436** | Hypophosphatasia | Hypophosphatasia | 完全一致 |
| 12 | 24 | レーベル先天性黒内障 | **ORPHA:65** | Leber congenital amaurosis | Leber congenital amaurosis | 完全一致 |
| 13 | 26 | ALS | **ORPHA:803** | Amyotrophic lateral sclerosis | Amyotrophic Lateral Sclerosis | 完全一致 |
| 14 | 29 | ハンチントン病 | **ORPHA:399** | Huntington disease | Huntington's disease | 完全一致 |
| 15 | 136 | 多巣性運動ニューロパチー | **ORPHA:641** | Multifocal motor neuropathy | Multifocal Motor Neuropathy | 完全一致 |
| 16 | 142 | アジソン病 | **ORPHA:85138** | Addison disease | Addison's Disease | 完全一致 |
| 17 | 156 | GIST | **ORPHA:44890** | Gastrointestinal stromal tumor | Gastrointestinal Stromal Tumor | 完全一致 |
| 18 | 182 | プロラクチノーマ | **ORPHA:2965** | Prolactinoma | Prolactinoma | 完全一致 |
| 19 | 189 | 寒冷凝集素症 | **ORPHA:56425** | Cold agglutinin disease | Cold Agglutinin Disease | 完全一致 |
| 20 | 196 | 閉塞性細気管支炎 | **ORPHA:1303** | Bronchiolitis obliterans | Bronchiolitis Obliterans | 完全一致 |
| 21 | 221 | VIPoma | **ORPHA:97282** | VIPoma | VIPoma | 完全一致 |
| 22 | 230 | 単心室症 | **ORPHA:1464** | Univentricular heart | Univentricular Heart | 完全一致 |
| 23 | 252 | 片側巨脳症 | **ORPHA:99802** | Hemimegalencephaly | Hemimegalencephaly | 完全一致 |
| 24 | 289 | 特発性器質化肺炎 | **ORPHA:1302** | Cryptogenic organizing pneumonia | Cryptogenic Organizing Pneumonia | 完全一致 |
| 25 | 308 | 進行性多巣性白質脳症 | **ORPHA:217260** | Progressive multifocal leukoencephalopathy | Progressive Multifocal Leukoencephalopathy | 完全一致 |
| 26 | 309 | 好酸球性筋膜炎 | **ORPHA:3165** | Eosinophilic fasciitis | Eosinophilic Fasciitis | 完全一致 |
| 27 | 315 | フィッシャー症候群 | **ORPHA:98919** | Miller Fisher syndrome | Miller Fisher Syndrome | 完全一致 |
| 28 | 328 | 老人性全身性アミロイドーシス | **ORPHA:330001** | Wild type ATTR amyloidosis | Wild-type ATTR Amyloidosis | 完全一致 |
| 29 | 339 | 反応性関節炎 | **ORPHA:29207** | Reactive arthritis | Reactive Arthritis | 完全一致 |
| 30 | 347 | クロンカイト・カナダ症候群 | **ORPHA:2930** | Cronkhite-Canada syndrome | Cronkhite-Canada Syndrome | 完全一致 |
| 31 | 348 | 孤立性線維性腫瘍 | **ORPHA:2126** | Solitary fibrous tumor | Solitary Fibrous Tumor | 完全一致 |
| 32 | 368 | 副腎脳白質ジストロフィー脊髄型 | **ORPHA:139399** | Adrenomyeloneuropathy | Adrenomyeloneuropathy | 完全一致 |
| 33 | 382 | 後部尿道弁 | **ORPHA:93110** | Posterior urethral valve | Posterior Urethral Valve | 完全一致 |
| 34 | 384 | 未熟児網膜症 | **ORPHA:90050** | Retinopathy of prematurity | Retinopathy of Prematurity | 完全一致 |
| 35 | 407 | 若年性パーキンソン病 | **ORPHA:2828** | Young-onset Parkinson disease | Young-Onset Parkinson's Disease | 完全一致 |
| 36 | 424 | 毛細血管拡張症性小脳失調症2型 | **ORPHA:251347** | Ataxia-telangiectasia-like disorder | Ataxia-Telangiectasia-Like Disorder | 完全一致 |
| 37 | 497 | 遺伝性低リン血症性くる病（FGF23関連） | **ORPHA:89937** | Autosomal dominant hypophosphatemic rickets | Autosomal Dominant Hypophosphatemic Rickets | 完全一致 |
| 38 | 540 | 遺伝性キサンチン尿症 | **ORPHA:3467** | Hereditary xanthinuria | Hereditary Xanthinuria | 完全一致 |
| 39 | 585 | ヒスチジン血症 | **ORPHA:2157** | Histidinemia | Histidinemia | 完全一致 |
| 40 | 636 | 先天性気管狭窄症 | **ORPHA:141127** | Congenital tracheal stenosis | Congenital Tracheal Stenosis | 完全一致 |
| 41 | 662 | 傍腫瘍性小脳変性症 | **ORPHA:623626** | Paraneoplastic cerebellar degeneration | Paraneoplastic Cerebellar Degeneration | 完全一致 |
| 42 | 671 | 原発性リンパ浮腫（Meige型） | **ORPHA:90186** | Meige disease | Meige Disease | 完全一致 |
| 43 | 783 | 先天性肺動静脈瘻 | **ORPHA:2038** | Pulmonary arteriovenous malformation | Pulmonary Arteriovenous Malformation | 完全一致 |
| 44 | 934 | 抗ARS抗体症候群 | **ORPHA:81** | Antisynthetase syndrome | Anti-Synthetase Syndrome | 完全一致 |
| 45 | 947 | 純粋自律神経不全症 | **ORPHA:441** | Pure autonomic failure | Pure Autonomic Failure | 完全一致 |
| 46 | 950 | AAアミロイドーシス | **ORPHA:85445** | AA amyloidosis | AA Amyloidosis | 完全一致 |
| 47 | 966 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | **ORPHA:772** | Infantile Refsum disease | Infantile Refsum | disease/syndrome 無視で一致 |
| 48 | 969 | 先天性食道閉鎖症 | **ORPHA:1199** | Esophageal atresia | Esophageal Atresia | 完全一致 |
| 49 | 970 | 先天性十二指腸閉鎖症 | **ORPHA:1203** | Duodenal atresia | Duodenal Atresia | 完全一致 |
| 50 | 976 | 先天性後鼻孔閉鎖 | **ORPHA:137914** | Choanal atresia | Choanal Atresia | 完全一致 |

C のうち注意が要るもの:
- idx 966 ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型: 別名「Infantile Refsum」が disease を無視して ORPHA:772 Infantile Refsum disease に当たった。Zellweger スペクトラム軽症型 = 乳児 Refsum 病という扱いは妥当だが、Orphanet では Zellweger spectrum disorder 全体に別コード（対応表内には無い）がある
- idx 424 毛細血管拡張症性小脳失調症2型: 別名 Ataxia-Telangiectasia-Like Disorder が ORPHA:251347 に一致。日本語名の「2型」との対応はファウンダー確認
- idx 497 遺伝性低リン血症性くる病（FGF23関連）: 別名 Autosomal Dominant Hypophosphatemic Rickets が ORPHA:89937 に一致。FGF23 関連 = ADHR の扱いは妥当
- idx 11 原発性高シュウ酸尿症1型 → ORPHA:93598。B の idx 355 と合わせて読むこと（§3.1）

## 5. D. 照合不能の分析（712 件）

### 5.1 理由の内訳

| 理由 | 現番号が対応表にある | 現番号が対応表に無い | 現番号なし | 合計 |
|---|---:|---:|---:|---:|
| 対応表に見つからない | 210 | 100 | 227 | 537 |
| 略号のみ | 122 | 17 | 17 | 156 |
| 英語名なし | 13 | 0 | 6 | 19 |
| 複数コードに当たり曖昧 | 0 | 0 | 0 | 0 |
| 合計 | 345 | 117 | 250 | 712 |

「対応表に見つからない」537 件は、英語名はあるのに推奨名と一致しなかったもの。無作為に 45 件を目視した結果、次の型に分かれた（件数は目視サンプルの印象であり、厳密な分類ではない）。

| 型 | 例（別名 → 対応表の推奨名） | 解決策 |
|---|---|---|
| 同義語・人名 vs 記述名 | Hunter syndrome → Mucopolysaccharidosis type 2、McArdle Disease → Glycogen storage disease due to muscle glycogen phosphorylase deficiency、Ondine curse → Congenital central hypoventilation syndrome、Kennedy disease は逆に対応表側が人名 | Orphanet 同義語表（ORDO / Orphadata nomenclature） |
| Orphanet 特有の記述的な語頭・語尾 | Sulfite Oxidase Deficiency → Encephalopathy due to sulfite oxidase deficiency、Pyruvate Kinase Deficiency → Hemolytic anemia due to red cell pyruvate kinase deficiency、Primary Carnitine Deficiency → Systemic primary carnitine deficiency | 同上 |
| 語順・所有格・略語混じり | Schmid Metaphyseal Chondrodysplasia → Metaphyseal chondrodysplasia, Schmid type、Anti-GBM Disease → Anti-glomerular basement membrane disease、Anti-Mi-2 DM | 同上（略語は Orphanet 同義語にも一部しか無い） |
| 上位群・スペクトラム名（対応表には亜型しか無い） | Ehlers-Danlos Syndrome（対応表は Classical EDS 等の亜型）、Pseudohypoparathyroidism（対応表は Pseudopseudohypoparathyroidism のみ）、Spinal muscular atrophy（Proximal SMA のみ）、Ichthyosis | 群コードは HPO 注釈が無いため phenotype.hpoa に無い。Orphanet 全体の分類表が必要 |
| 遺伝子名付きの独自名 | Isolated Hypoparathyroidism GCM2、ADTKD-MUC1、DNM2-CNM、Noonan-Like with CBL、CMS-GFPT1 | Orphanet に該当エンティティが無い場合がある。遺伝子→疾患表（Orphadata gene associations）で当てる |
| 希少疾患でない・Orphanet 外 | Hyperparathyroidism、Ulcerative Colitis（ORPHA:771 は存在するが HPO 注釈なし）、Congenital Hypothyroidism、Protein-Losing Enteropathy、Hepatolithiasis | Orphanet でも当たらないものは ORPHA 番号を持たせない判断が要る |

### 5.2 対応表の中で最も近い名前による見積もり（参考、提案ではない）

英語名を持つ D レコードについて、対応表 4,335 件の中で bigram Dice が最大の推奨名を求めた。**これは提案ではない**。「Pseudohypoparathyroidism」に対して「Pseudopseudohypoparathyroidism」が Dice 1.00 になるように、bigram は包含関係を区別できない。

| 最近傍の Dice | 件数 | 読み方 |
|---|---:|---|
| 0.8 以上 | 110 | 語順・所有格・語頭語尾の差。Orphanet 同義語でほぼ確実に解ける |
| 0.6 以上 0.8 未満 | 220 | 記述名との差。同義語で大半が解けるが、亜型・上位群の取り違えに注意 |
| 0.5 以上 0.6 未満 | 111 | 一部が同義語で解ける |
| 0.0 以上 0.5 未満 | 96 | 対応表に近い名前が無い。Orphanet に無いか、人名 vs 記述名の差 |
| 英語名なし（最近傍を計算していない） | 175 | 略号のみ・英語名なし |

最近傍が現番号そのものだったレコードは 52 件（例: idx 59 筋強直性ジストロフィー ORPHA:273 Steinert myotonic dystrophy に対して別名 Myotonic Dystrophy）。これらは現番号が正しく、別名が推奨名より短いだけと考えられる。

### 5.3 phenotype.hpoa に存在しない疾患の見積もり

phenotype.hpoa は「HPO 注釈を持つ Orphanet エンティティ」だけを含む。ヘッダーに `4337 ORPHANET` とあり、実際に取れたコードは 4,335 件。Orphanet 全体は疾患レベルで約 6,000〜7,000、群・亜型を含めると約 10,000〜11,000 のエンティティがあるので、**コード空間の 4〜6 割しか対応表に無い**。

1,001 件のうち、疾患そのものが対応表に無い件数の見積もり:

- **直接の観測**: 現番号を持つ 701 件のうち 121 件（17.3%）は、その番号が対応表に無い。健全性調査の「ローカルで検証不能 121 件」と同じ数字。このうち英語名を持つ 100 件の最近傍 Dice 分布は、0.6 以上が 69 件、0.5 未満が 8 件。番号の中身は ORPHA:771（潰瘍性大腸炎）、183660（重症複合免疫不全症）、94145（脊髄小脳変性症）、55（眼皮膚白皮症）、88948（ADTKD-MUC1）など、**群コードや HPO 注釈の無い正しい番号**に見えるものが多い
- **番号なし 300 件**: 英語名を持つ 276 件のうち C で当たったのは 50 件（18%）。番号あり群の当たり率（A+B 239 / 549 = 44%）の半分以下。番号なし群には潰瘍性大腸炎・副甲状腺機能亢進症・先天性甲状腺機能低下症・蛋白漏出性胃腸症・肝内結石症のような、Orphanet に無いか希少疾患でないものが多く混じる
- **最近傍が遠い**: 英語名を持つ D のうち最近傍 Dice 0.5 未満は 96 件（番号なし 59、番号が対応表に無い 8、番号が対応表にある 29）

以上から、**1,001 件のうち phenotype.hpoa に疾患そのものが無いものは 170〜250 件（17〜25%）** と見積もる。下限は「現番号が対応表に無い」比率 17% を全体に当てはめた値。上限は、番号なし群の当たり率の低さ（Orphanet 外の疾患が多い）を加味した値。**残り 750〜830 件は原理的に照合可能**で、今回の A+B+C = 289 件はその 3 分の 1 強にとどまる。差の大半が同義語の欠如による。

### 5.4 Orphanet の完全な命名法（同義語付き）を使った場合の改善見積もり

Orphadata の nomenclature（`ORPHAnomenclature_en.xml` 等）は、各エンティティに推奨名 + 同義語（平均 2〜3 個。MPS II なら Hunter syndrome、MPS 2、Iduronate 2-sulfatase deficiency）を持ち、群・亜型を含む全エンティティを収録する。

| 層 | 件数 | 同義語で解ける見込み | 根拠 |
|---|---:|---|---|
| 最近傍 Dice 0.8 以上 | 110 | 9 割 | 語順・所有格・語頭語尾の差で、同義語にほぼ確実に含まれる |
| 最近傍 Dice 0.6〜0.8 | 220 | 6〜7 割 | 記述名 vs 慣用名。同義語にあることが多いが、亜型しか無い場合は群コードが必要 |
| 最近傍 Dice 0.5〜0.6 | 111 | 4〜5 割 | 人名 vs 記述名（Hunter / McArdle / Ondine）。同義語表にあるが、対応表側の近傍とは無関係 |
| 最近傍 Dice 0.5 未満 | 96 | 2〜3 割 | Orphanet に無い疾患が多い |
| 略号のみ | 156 | 3〜4 割 | Orphanet 同義語は略号（MPS I、CCHS、SCA3、BWS）を一部収録する。残りは略号→正式名の辞書が要る |
| 英語名なし | 19 | 32%（接尾辞英訳で） | §5.5 の参考集計で 19 件中 6 件が当たった |

**見積もり: D 712 件のうち 347〜411 件（49%〜58%）が同義語付き命名法で解け、D は 301〜365 件に減る。** 残りは (a) Orphanet に無い疾患、(b) 遺伝子名付きの独自名、(c) 略号のみ。(a) は番号を持たせない判断、(b) は Orphadata の遺伝子関連表、(c) は略号辞書という別の手段が要る。

同義語照合を入れると「1 つの別名が複数コードに当たる」曖昧が今回の 0 件から増える（同義語は一意でない）。曖昧は今回と同じく提案せず手動レビューに回す設計を保つべき。

### 5.5 参考: 「英字語幹＋症候群/病/欠損症」の接尾辞だけを英訳した場合（方針外・未提案）

`Jacobsen症候群` → `Jacobsen syndrome`、`Krabbe病` → `Krabbe disease`、`…Dehydrogenase欠損症` → `… deficiency` のように、英字語幹に付いた日本語接尾辞だけを機械的に置き換えて対応表に当てた。日本語名からの推測ではなく決定的な置換だが、承認済み方針（英語別名のみ）の外側なので **B・C にも JSON にも入れていない**。

| 結果 | 件数 |
|---|---:|
| 当たった D レコード | 103 |
| 　現番号を裏付ける（現番号 = 当たったコード） | 96 |
| 　番号を補える（現番号なし） | 3 |
| 　**現番号が別のコード**（誤りの疑い） | 4 |

番号を補える 3 件と、現番号が別コードの 4 件:

| index | 疾患名 | 現在の ORPHA | 現在の番号が指す疾患名 | 接尾辞英訳 | 当たったコード | phenotype.hpoa 上の英語疾患名 |
|--:|---|---|---|---|---|---|
| 441 | Renpenning症候群 | （なし） |  | Renpenning syndrome | ORPHA:3242 | Renpenning syndrome |
| 473 | Parkes Weber症候群 | （なし） |  | Parkes Weber syndrome | ORPHA:90307 | Parkes Weber syndrome |
| 629 | PFAPA症候群 | （なし） |  | PFAPA syndrome | ORPHA:42642 | PFAPA syndrome |
| 612 | Ellis-van Creveld症候群 | ORPHA:298 | Mitochondrial neurogastrointestinal encephalomyopathy | Ellis-van Creveld syndrome | ORPHA:289 | Ellis Van Creveld syndrome |
| 655 | Morvan症候群 | ORPHA:84 | Fanconi anemia | Morvan syndrome | ORPHA:83467 | Morvan syndrome |
| 722 | Kufor-Rakeb症候群 | ORPHA:306669 | Hemiparkinsonism-hemiatrophy syndrome | Kufor-Rakeb syndrome | ORPHA:306674 | Kufor-Rakeb syndrome |
| 835 | Bernard-Soulier症候群 | ORPHA:868 | Triose phosphate-isomerase deficiency | Bernard-Soulier syndrome | ORPHA:274 | Bernard-Soulier syndrome |

idx 835 Bernard-Soulier 症候群に ORPHA:868（Triose phosphate-isomerase deficiency）、idx 655 Morvan 症候群に ORPHA:84（Fanconi anemia）が付いているのは、英語別名が無いため今回の方針では検出できなかった誤りである。**ファウンダー判定（2026-09-10）: 置換規則は採用しない。誤番号 4 件（idx 612・655・722・835）は JSON に `discovery: suffix_translation` として含める**（番号を補える 3 件は含めない）。

### 5.6 D を減らす方法の提案（優先順）

1. **Orphadata の命名法（同義語付き）を取得し、同義語も照合対象にする。** D の 5〜6 割が解ける見込み（§5.4）。ORDO（OWL）でも同じ情報が取れる。ライセンスは CC BY 4.0（要確認）で、HPO と同様に原本無改変・バージョン明示で使える
2. ~~接尾辞英訳の規則を採用する~~（§5.5）。ファウンダー判定で不採用。誤番号 4 件のみ個別に扱う
3. **略号辞書**: 157 件が略号のみ。MPS I〜VII、SCA 番号、MSA-C/P、CDG 型などは Orphanet 同義語にも一部あるが、`ASMD` `CBGD` `WM` は無い。健全性調査の別名辞書（`alias-groups.ts` 65 概念）と統合して、略号 → 正式英名の小さな表を人手で作るのが確実
4. **群・スペクトラム名は群コードに当てる**: Ehlers-Danlos、SMA、Ichthyosis、Pseudohypoparathyroidism のような群名は phenotype.hpoa に無い。Orphanet の分類（group of disorders）を使えば当たるが、「群コードを持たせるべきか、亜型に割るべきか」は器（themes）の設計判断と連動する
5. **Orphanet 外の疾患を分ける**: 潰瘍性大腸炎・先天性甲状腺機能低下症など、Orphanet に無いか希少疾患でないものは ORPHA 番号を空のまま「Orphanet 外」と印を付け、照合対象から外す

## 6. 観察の記録

### 6.1 誤番号は「近いが別物」に偏るか

- **隣接番号の取り違え**: B 21 件のうち番号差 30 以下が 3 件（idx 5 644→646、idx 30 902→905、idx 220 97261→97280）。方針外の参考集計でも idx 722 Kufor-Rakeb 306669→306674、idx 612 Ellis-van Creveld 298→289（数字の入れ替わり）が見つかった。**隣接番号の誤りは、疾患名が無関係でも起きる**（644 NARP と 646 Niemann-Pick C、902 Werner と 905 Wilson）。番号を手打ちまたは LLM 生成した際の桁ずれと考えられる
- **群 ↔ 亜型（粒度）**: idx 355（PH1 ↔ PH 群）、326（ATTRV30M ↔ 遺伝性 ATTR）、928（multiminicore ↔ Laing）の 3 件が「近縁・亜型」。D の手動レビュー表では「一致している可能性が高い」221 件の大半がこの型（Ehlers-Danlos → Classical EDS、多発性嚢胞腎 → ADPKD、天疱瘡 → 尋常性天疱瘡、肺胞蛋白症 → 自己免疫性）。健全性調査の「粒度違い 21 件」と整合する
- **synthase ↔ lyase**: idx 577・958（HMG-CoA リアーゼ欠損症）が ORPHA:35701 = 3-hydroxy-3-methylglutaryl-CoA **synthase** deficiency を持つ。今回の方針では別名 `HMG-CoA Lyase Deficiency` が推奨名（3-hydroxy-3-methylglutaryl-CoA lyase deficiency）に文字列一致しないため D 止まり。手動レビュー表で「近縁の可能性」に出る
- **disease ↔ syndrome の取り違え**: idx 120 Cushing（症候群と病は別エンティティ）。今回 disease/syndrome を無視して一致させる規則で拾ったが、この規則が誤りを生む側にも回りうる例
- **人名の似た別疾患**: idx 838 Scott syndrome（現番号 3204 = Stormorken-Sjaastad-Langslet syndrome。どちらも血小板疾患で、Stormorken は York platelet syndrome とも呼ばれる）、idx 30 Wilson（902 Werner）。**語頭が同じ人名は取り違えやすい**
- **全く無関係**: idx 97 血友病 B に ORPHA:101（DRPLA）、idx 882 エチルマロン酸脳症に 51（Aicardi-Goutières）、idx 474 遺伝性リンパ浮腫に 2165（全前脳胞症）、idx 349 後腹膜線維症に 31（オキソグルタル酸尿症）。番号差が大きく、名前にも共通点が無い。**短い番号（2 桁・3 桁）に集中している**のは、LLM 生成時に「もっともらしい小さい番号」を置いた痕跡と考えられる

### 6.2 B の深刻さ分布と番号差

| 深刻さ | 件数 | 番号差 30 以下 | 番号差 31〜1,000 | 番号差 1,000 超 |
|---|---:|---:|---:|---:|
| 全く別の疾患 | 14 | 3 | 3 | 8 |
| 近縁・亜型 | 3 | 0 | 0 | 3 |
| 現番号が対応表に無く確認不能 | 4 | 0 | 0 | 4 |

### 6.3 同じ誤番号を複数レコードが共有する

現番号が誤りの疑い（B、または D で「明らかに別疾患」）で、かつ同じ番号を他のレコードも持つもの。片方が正しく片方が誤りの場合、正しい側が手がかりになる。

| ORPHA | その番号が指す疾患名 | 持っているレコード（index: 疾患名 [分類]） |
|---|---|---|
| ORPHA:51 | Aicardi-Goutières syndrome | 589: Aicardi-Goutières症候群 [D/一致している可能性が高い]、882: エチルマロン酸脳症 [B] |
| ORPHA:84 | Fanconi anemia | 457: Fanconi貧血 [D/一致している可能性が高い]、655: Morvan症候群 [D/明らかに別疾患] |
| ORPHA:101 | Dentatorubral pallidoluysian atrophy | 97: 血友病B [B]、676: DRPLA [A] |
| ORPHA:136 | Cerebral autosomal dominant arteriopathy-subcortical infarcts-leukoencephalopathy | 984: 微小眼球症 [D/明らかに別疾患]、985: 先天性白内障 [D/近縁の可能性] |
| ORPHA:281 | Monosomy 5p syndrome | 214: 魚鱗癬 [D/明らかに別疾患]、296: 5p欠失症候群 [D/近縁の可能性]、543: セロイドリポフスチン症 [D/明らかに別疾患] |
| ORPHA:298 | Mitochondrial neurogastrointestinal encephalomyopathy | 499: ミトコンドリア神経胃腸脳筋症 [A]、612: Ellis-van Creveld症候群 [D/明らかに別疾患] |
| ORPHA:464 | Incontinentia pigmenti | 139: 抗リン脂質抗体症候群 [B]、417: 色素失調症 [A] |
| ORPHA:598 | Multiminicore myopathy | 557: ミニコア病 [D/一致している可能性が高い]、928: Myosin Heavy Chain 7関連ミオパチー [B] |
| ORPHA:644 | NARP syndrome | 5: ニーマン・ピック病C型 [B]、878: NARP症候群 [D/一致している可能性が高い] |
| ORPHA:902 | Werner syndrome | 30: ウィルソン病 [B]、455: Werner症候群 [D/一致している可能性が高い] |
| ORPHA:29072 | Hereditary pheochromocytoma-paraganglioma | 118: 褐色細胞腫 [D/一致している可能性が高い]、693: 遺伝性褐色細胞腫/パラガングリオーマ症候群 [D/明らかに別疾患] |
| ORPHA:79314 | L-2-hydroxyglutaric aciduria | 584: L-2-ヒドロキシグルタル酸尿症 [D/不明]、898: L-2ヒドロキシグルタル酸尿症 [D/明らかに別疾患] |
| ORPHA:79315 | D-2-hydroxyglutaric aciduria | 583: D-2-ヒドロキシグルタル酸尿症 [D/不明]、897: D-2ヒドロキシグルタル酸尿症 [D/明らかに別疾患] |

### 6.4 前回（別マシン、4 月時点のコピー）との比較

- 前回 D = 725 件、今回 D = 712 件。data/hpo/ の有無は D の件数をほとんど変えなかった。**前回の D の多さは物差しの不足ではなく、phenotype.hpoa に同義語が無いことに由来する**
- 今回加えた規則で増えた一致: ローマ数字変換 2 件（Tyrosinemia Type II、Pseudohypoaldosteronism Type II）、所有格除去 6 件（Wilson's、Cushing's）、disease/syndrome 無視 6 件（Ring Chromosome 14/20、Chronic Intestinal Pseudo-obstruction ×2、Infantile Refsum、Cushing）、略号の完全一致 3 件（MELAS ×2、MERRF）。合計 17 件前後で、効果はあるが D を大きく減らす規則ではない。ローマ数字変換が効いた件数が少ないのは、対応表側の型番号付き疾患（MPS、糖原病、ムコリピドーシス）の別名が人名で書かれているため
- 「ムコ多糖症 II 型 / Hunter 症候群 / Mucopolysaccharidosis type 2」のように、ライソゾーム病・糖原病の別名は人名（Hunter、Hurler、Sanfilippo、Morquio、Maroteaux-Lamy、McArdle、Pompe）で書かれており、推奨名は記述名。**この領域は同義語表なしには照合できない**（idx 2・144・145・146・525 はすべて D で、現番号は正しく見える）

## 7. 付録: 対応表の最近傍（Dice 0.75 以上、参考・提案ではない）

D のうち、英語別名と対応表の推奨名の bigram Dice が 0.75 以上のもの。**候補であって提案ではない**。「Glutaric Acidemia Type 1 → Glutaric acidemia type 3（0.95）」のように、型番号だけ違う別疾患が最近傍になる。現番号と最近傍が同じものは除いた。

| index | 疾患名 | 現在の ORPHA | 現在の番号が指す疾患名 | 英語別名 | 最近傍 ORPHA | 最近傍の英語疾患名 | Dice |
|--:|---|---|---|---|---|---|---:|
| 498 | 偽性副甲状腺機能低下症 | ORPHA:457 | Harlequin ichthyosis | Pseudohypoparathyroidism | ORPHA:79445 | Pseudopseudohypoparathyroidism | 1.00 |
| 166 | グルタル酸血症1型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | Glutaric Acidemia Type 1 | ORPHA:35706 | Glutaric acidemia type 3 | 0.95 |
| 527 | グルタル酸血症I型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | Glutaric Acidemia Type I | ORPHA:35706 | Glutaric acidemia type 3 | 0.95 |
| 567 | 遺伝性感覚性自律神経性ニューロパチー | ORPHA:642 | Hereditary sensory and autonomic neuropathy type 4 | Hereditary Sensory and Autonomic Neuropathy | ORPHA:36386 | Hereditary sensory and autonomic neuropathy type 1 | 0.94 |
| 707 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | ORPHA:415 | Hyperornithinemia-hyperammonemia-homocitrullinuria syndrome | HHH Syndrome | ORPHA:168569 | H syndrome | 0.94 |
| 771 | 好酸球性消化管疾患（非食道型） | （なし） |  | Eosinophilic Gastritis/Enteritis | ORPHA:2070 | Eosinophilic gastroenteritis | 0.94 |
| 191 | 先天性赤芽球異形成性貧血 | （なし） |  | Congenital Dyserythropoietic Anemia | ORPHA:98870 | Congenital dyserythropoietic anemia type III | 0.93 |
| 218 | 一次性膜性増殖性糸球体腎炎 | （なし） |  | Membranoproliferative Glomerulonephritis | ORPHA:54370 | Primary membranoproliferative glomerulonephritis | 0.93 |
| 370 | ジヒドロピリミジナーゼ欠損症 | （なし） |  | Dihydropyrimidinase Deficiency | ORPHA:1675 | Dihydropyrimidine dehydrogenase deficiency | 0.93 |
| 464 | 先天性赤血球形成異常性貧血 | ORPHA:85 | （対応表に無し） | Congenital Dyserythropoietic Anemia | ORPHA:98870 | Congenital dyserythropoietic anemia type III | 0.93 |
| 500 | Zellweger症候群（軽症型） | （なし） |  | Neonatal Adrenoleukodystrophy-like | ORPHA:44 | Neonatal adrenoleukodystrophy | 0.93 |
| 737 | 先天性多発性関節拘縮症 | ORPHA:1037 | （対応表に無し） | Arthrogryposis Multiplex Congenita | ORPHA:1143 | Neurogenic arthrogryposis multiplex congenita | 0.93 |
| 847 | 先天性赤血球生成異常性貧血 | ORPHA:85 | （対応表に無し） | Congenital Dyserythropoietic Anemia | ORPHA:98870 | Congenital dyserythropoietic anemia type III | 0.93 |
| 466 | 先天性アンチトロンビン欠乏症 | （なし） |  | AT Deficiency | ORPHA:650 | LCAT deficiency | 0.92 |
| 563 | 遠位関節拘縮症 | ORPHA:97120 | （対応表に無し） | Distal Arthrogryposis | ORPHA:1146 | Distal arthrogryposis type 1 | 0.92 |
| 597 | 先天性QT短縮症候群 | ORPHA:51083 | Congenital short QT syndrome | Short QT Syndrome | ORPHA:3163 | SHORT syndrome | 0.92 |
| 865 | 遺伝性運動ニューロパチー（dHMN） | （なし） |  | Distal Hereditary Motor Neuropathy | ORPHA:139536 | Distal hereditary motor neuropathy type 5 | 0.92 |
| 58 | 22q11.2欠失症候群 | ORPHA:567 | 22q11.2 deletion syndrome | Velocardiofacial Syndrome | ORPHA:2008 | Acrocardiofacial syndrome | 0.91 |
| 952 | 遺伝性全身性AApoAIアミロイドーシス | ORPHA:93560 | （対応表に無し） | AApoAI Amyloidosis | ORPHA:439232 | AApoAIV amyloidosis | 0.91 |
| 572 | 頭蓋骨早期癒合症（非症候群性） | （なし） |  | Non-Syndromic Craniosynostosis | ORPHA:3366 | Non-syndromic metopic craniosynostosis | 0.90 |
| 593 | 遺伝性痙性対麻痺2型 | （なし） |  | Pelizaeus-Merzbacher-Like Disease | ORPHA:702 | Pelizaeus-Merzbacher disease | 0.90 |
| 606 | 多発性骨端異形成症 | ORPHA:251 | （対応表に無し） | Multiple Epiphyseal Dysplasia | ORPHA:93308 | Multiple epiphyseal dysplasia type 1 | 0.90 |
| 790 | 遺伝性眼球運動失行症（Cogan型） | （なし） |  | Oculomotor Apraxia Cogan Type | ORPHA:1125 | Ocular motor apraxia, Cogan type | 0.90 |
| 832 | 遺伝性第XI因子欠損症 | ORPHA:329 | Congenital factor XI deficiency | Hemophilia C | ORPHA:98878 | Hemophilia A | 0.90 |
| 106 | 天疱瘡 | ORPHA:704 | Pemphigus vulgaris | Pemphigus | ORPHA:555905 | IgA pemphigus | 0.89 |
| 163 | シャルコー・マリー・トゥース病 | ORPHA:166 | （対応表に無し） | Charcot-Marie-Tooth Disease | ORPHA:90658 | Charcot-Marie-Tooth disease type 1E | 0.89 |
| 945 | Ross症候群 | （なし） |  | Ross Syndrome | ORPHA:2563 | MOMO syndrome | 0.89 |
| 7 | 遺伝性血管浮腫 | （なし） |  | Hereditary angioedema | ORPHA:100050 | Hereditary angioedema type 1 | 0.88 |
| 408 | メチルグルタコン酸尿症 | （なし） |  | Methylglutaconic Aciduria | ORPHA:67047 | 3-methylglutaconic aciduria type 3 | 0.88 |
| 426 | 眼皮膚白皮症 | ORPHA:55 | （対応表に無し） | Oculocutaneous Albinism | ORPHA:370097 | Oculocutaneous albinism type 6 | 0.88 |
| 680 | 副腎皮質刺激ホルモン単独欠損症 | （なし） |  | Isolated ACTH Deficiency | ORPHA:199299 | Late-onset isolated ACTH deficiency | 0.88 |
| 699 | Ataxia with oculomotor apraxia type 1 | ORPHA:14 | Abetalipoproteinemia | Ataxia with oculomotor apraxia type 1 | ORPHA:1168 | Ataxia-oculomotor apraxia type 1 | 0.88 |
| 15 | 脊髄性筋萎縮症 | （なし） |  | Spinal muscular atrophy | ORPHA:70 | Proximal spinal muscular atrophy | 0.87 |
| 111 | 肺胞蛋白症 | ORPHA:747 | Autoimmune pulmonary alveolar proteinosis | Pulmonary Alveolar Proteinosis | ORPHA:264675 | Hereditary pulmonary alveolar proteinosis | 0.87 |
| 157 | 神経内分泌腫瘍 | （なし） |  | Neuroendocrine Tumor | ORPHA:100078 | Ileal neuroendocrine tumor | 0.87 |
| 380 | 特発性好酸球増多症候群 | ORPHA:168956 | （対応表に無し） | Hypereosinophilic Syndrome | ORPHA:3260 | Idiopathic hypereosinophilic syndrome | 0.87 |
| 388 | 先天性副腎低形成症 | ORPHA:95 | Friedreich ataxia | Adrenal Hypoplasia Congenita | ORPHA:95702 | X-linked adrenal hypoplasia congenita | 0.87 |
| 462 | Kostmann症候群 | ORPHA:486 | Autosomal dominant severe congenital neutropenia | Severe Congenital Neutropenia | ORPHA:86788 | X-linked severe congenital neutropenia | 0.87 |
| 503 | 2q37欠失症候群 | ORPHA:1001 | 2q37 microdeletion syndrome | 2q37 Deletion Syndrome | ORPHA:251019 | 2q32q33 deletion syndrome | 0.87 |
| 696 | 遺伝性平滑筋腫症腎細胞癌症候群 | ORPHA:523 | Hereditary leiomyomatosis and renal cell cancer | Reed Syndrome | ORPHA:705 | Pendred syndrome | 0.87 |
| 27 | プリオン病 | （なし） |  | Creutzfeldt-Jakob Disease | ORPHA:204 | Sporadic Creutzfeldt-Jakob disease | 0.86 |
| 61 | 先天性甲状腺機能低下症 | （なし） |  | Congenital Hypothyroidism | ORPHA:95717 | Idiopathic congenital hypothyroidism | 0.86 |
| 74 | 表皮水疱症 | ORPHA:304 | （対応表に無し） | Epidermolysis Bullosa | ORPHA:2908 | Kindler epidermolysis bullosa | 0.86 |
| 353 | 骨髄性プロトポルフィリン症 | ORPHA:79278 | Autosomal erythropoietic protoporphyria | Erythropoietic Protoporphyria | ORPHA:95159 | Hepatoerythropoietic porphyria | 0.86 |
| 791 | 遺伝性視神経症（常染色体優性） | ORPHA:98672 | （対応表に無し） | Autosomal Dominant Optic Atrophy | ORPHA:67036 | Autosomal dominant optic atrophy and cataract | 0.86 |
| 821 | 遺伝性毛髪・歯・爪異常症 | （なし） |  | Ectodermal Dysplasia | ORPHA:1515 | Cranioectodermal dysplasia | 0.86 |
| 99 | 自己免疫性溶血性貧血 | ORPHA:98375 | （対応表に無し） | Autoimmune Hemolytic Anemia | ORPHA:90033 | Autoimmune hemolytic anemia, warm type | 0.85 |
| 442 | MECP2重複症候群 | ORPHA:85280 | X-linked intellectual disability-cubitus valgus-dysmorphism syndrome | MECP2 Duplication Syndrome | ORPHA:284180 | Xp22.13p22.2 duplication syndrome | 0.85 |
| 49 | エーラス・ダンロス症候群 | ORPHA:287 | Classical Ehlers-Danlos syndrome | Ehlers-Danlos Syndrome | ORPHA:75497 | X-linked Ehlers-Danlos syndrome | 0.84 |
| 86 | 肺動脈性肺高血圧症 | ORPHA:182090 | （対応表に無し） | Pulmonary Arterial Hypertension | ORPHA:275766 | Idiopathic pulmonary arterial hypertension | 0.84 |
| 140 | 副甲状腺機能低下症 | （なし） |  | Hypoparathyroidism | ORPHA:79445 | Pseudopseudohypoparathyroidism | 0.84 |
| 209 | ミオクロニーてんかん | ORPHA:308 | Progressive myoclonic epilepsy type 1 | Progressive Myoclonus Epilepsy | ORPHA:324290 | PRDM8-related progressive myoclonus epilepsy | 0.84 |
| 253 | 限局性皮質異形成 | （なし） |  | Focal Cortical Dysplasia | ORPHA:65683 | Isolated focal cortical dysplasia | 0.84 |
| 257 | 重症複合免疫不全症 | ORPHA:183660 | （対応表に無し） | Severe Combined Immunodeficiency | ORPHA:169095 | Severe combined immunodeficiency due to FOXN1 deficiency | 0.84 |
| 320 | 緑内障（先天性） | ORPHA:98977 | Juvenile glaucoma | Primary Congenital Glaucoma | ORPHA:98976 | Congenital glaucoma | 0.84 |
| 351 | 遠位型ミオパチー | ORPHA:399 | Huntington disease | Distal Myopathy | ORPHA:59135 | Laing distal myopathy | 0.84 |
| 555 | 乳児型ネマリンミオパチー | ORPHA:607 | （対応表に無し） | Nemaline Myopathy | ORPHA:98902 | Amish nemaline myopathy | 0.84 |
| 666 | IgG4関連硬膜炎 | （なし） |  | IgG4-RD Pachymeningitis | ORPHA:449427 | IgG4-related pachymeningitis | 0.84 |
| 738 | 大田原症候群 | ORPHA:65286 | 3q29 microdeletion syndrome | Early Infantile Epileptic Encephalopathy | ORPHA:1934 | Early infantile developmental and epileptic encephalopathy | 0.84 |
| 233 | シトルリン血症 | ORPHA:187 | （対応表に無し） | Citrullinemia | ORPHA:247585 | Citrullinemia type II | 0.83 |
| 260 | ミトコンドリアDNA枯渇症候群 | （なし） |  | Mitochondrial DNA Depletion Syndrome | ORPHA:352470 | DNA2-related mitochondrial DNA deletion syndrome | 0.83 |
| 303 | 家族性高コレステロール血症 | ORPHA:406 | （対応表に無し） | Familial Hypercholesterolemia | ORPHA:391665 | Homozygous familial hypercholesterolemia | 0.83 |
| 413 | 肺静脈還流異常症 | ORPHA:99062 | （対応表に無し） | Total Anomalous Pulmonary Venous Return | ORPHA:99125 | Congenital total pulmonary venous return anomaly | 0.83 |
| 665 | 神経サルコイドーシス | （なし） |  | Neurosarcoidosis | ORPHA:797 | Sarcoidosis | 0.83 |
| 700 | Ataxia with oculomotor apraxia type 2 | ORPHA:64753 | Spinocerebellar ataxia with axonal neuropathy type 2 | Ataxia with oculomotor apraxia type 2 | ORPHA:459033 | Ataxia-oculomotor apraxia type 4 | 0.83 |
| 777 | Tufting Enteropathy | ORPHA:92065 | （対応表に無し） | Tufting Enteropathy | ORPHA:92050 | Congenital tufting enteropathy | 0.83 |
| 979 | 三角頭蓋（前頭縫合早期癒合） | （なし） |  | Metopic Craniosynostosis | ORPHA:3366 | Non-syndromic metopic craniosynostosis | 0.83 |
| 87 | 特発性拡張型心筋症 | ORPHA:217604 | （対応表に無し） | Dilated Cardiomyopathy | ORPHA:66634 | Dilated cardiomyopathy with ataxia | 0.82 |
| 92 | ホモシスチン尿症 | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | Homocystinuria | ORPHA:214 | Cystinuria | 0.82 |
| 105 | IgG4関連疾患 | （なし） |  | IgG4-Related Disease | ORPHA:64744 | IgG4-related thyroid disease | 0.82 |
| 172 | ウエスト症候群 | ORPHA:3451 | （対応表に無し） | West Syndrome | ORPHA:199343 | EAST syndrome | 0.82 |
| 255 | 肢帯型筋ジストロフィー | ORPHA:263 | （対応表に無し） | Limb-Girdle Muscular Dystrophy | ORPHA:34515 | FKRP-related limb-girdle muscular dystrophy R9 | 0.82 |
| 306 | 周期性四肢麻痺 | ORPHA:681 | Hypokalemic periodic paralysis | Periodic Paralysis | ORPHA:682 | Hyperkalemic periodic paralysis | 0.82 |
| 150 | 短腸症候群 | （なし） |  | Short Bowel Syndrome | ORPHA:95427 | Secondary short bowel syndrome | 0.81 |
| 205 | 自己免疫性膵炎 | （なし） |  | Autoimmune Pancreatitis | ORPHA:2137 | Autoimmune hepatitis | 0.81 |
| 208 | ミトコンドリア脳筋症 | （なし） |  | Mitochondrial Encephalomyopathy | ORPHA:238329 | Severe X-linked mitochondrial encephalomyopathy | 0.81 |
| 349 | 後腹膜線維症 | ORPHA:31 | Oxoglutaric aciduria | Retroperitoneal Fibrosis | ORPHA:49041 | IgG4-related retroperitoneal fibrosis | 0.81 |
| 619 | 全身性肥満細胞症 | ORPHA:2467 | （対応表に無し） | Systemic Mastocytosis | ORPHA:98850 | Aggressive systemic mastocytosis | 0.81 |
| 706 | アルギニン血症 | ORPHA:90 | Argininemia | Arginase Deficiency | ORPHA:1361 | Carnosinase deficiency | 0.81 |
| 34 | パーキンソン病 | （なし） |  | Parkinson's Disease | ORPHA:2828 | Young-onset Parkinson disease | 0.80 |
| 46 | 骨髄異形成症候群 | ORPHA:52 | Alagille syndrome | Myelodysplastic Syndromes | ORPHA:98827 | Unclassified myelodysplastic syndrome | 0.80 |
| 411 | ピルビン酸キナーゼ欠損症 | ORPHA:766 | Hemolytic anemia due to red cell pyruvate kinase deficiency | Pyruvate Kinase Deficiency | ORPHA:765 | Pyruvate dehydrogenase deficiency | 0.80 |
| 716 | Swyer症候群 | ORPHA:242 | 46,XY complete gonadal dysgenesis | Pure Gonadal Dysgenesis | ORPHA:243 | 46,XX gonadal dysgenesis | 0.80 |
| 833 | 遺伝性第XIII因子欠損症 | ORPHA:330 | Congenital factor XII deficiency | Factor XIII Deficiency | ORPHA:331 | Congenital factor XIII deficiency | 0.80 |
| 94 | ガラクトース血症 | ORPHA:352 | （対応表に無し） | Galactosemia | ORPHA:79239 | Classic galactosemia | 0.79 |
| 278 | ホジキンリンパ腫 | ORPHA:98293 | （対応表に無し） | Hodgkin Lymphoma | ORPHA:391 | Classic Hodgkin lymphoma | 0.79 |
| 304 | リポ蛋白リパーゼ欠損症 | ORPHA:309015 | （対応表に無し） | Lipoprotein Lipase Deficiency | ORPHA:425 | Apolipoprotein A-I deficiency | 0.79 |
| 886 | 複合体III欠損症 | ORPHA:2611 | Linear verrucous nevus syndrome | Complex III Deficiency | ORPHA:2609 | Isolated complex I deficiency | 0.79 |
| 953 | AGELアミロイドーシス | ORPHA:93557 | （対応表に無し） | Finnish Amyloidosis | ORPHA:442582 | AH amyloidosis | 0.79 |
| 145 | ムコ多糖症IV型 | ORPHA:582 | Mucopolysaccharidosis type 4 | Morquio Syndrome | ORPHA:2563 | MOMO syndrome | 0.78 |
| 612 | Ellis-van Creveld症候群 | ORPHA:298 | Mitochondrial neurogastrointestinal encephalomyopathy | Chondroectodermal Dysplasia | ORPHA:189 | Hidrotic ectodermal dysplasia | 0.78 |
| 708 | 遺伝性腎性低尿酸血症 | （なし） |  | Renal Hypouricemia | ORPHA:94088 | Hereditary renal hypouricemia | 0.78 |
| 743 | 13トリソミー | ORPHA:3378 | Trisomy 13 syndrome | Patau Syndrome | ORPHA:90340 | Blau syndrome | 0.78 |
| 841 | 先天性第V因子欠損症 | ORPHA:326 | Congenital factor V deficiency | Parahemophilia | ORPHA:98879 | Hemophilia B | 0.78 |
| 874 | 遺伝性線条体壊死 | （なし） |  | Familial Striatal Necrosis | ORPHA:225154 | Familial infantile bilateral striatal necrosis | 0.78 |
| 877 | 進行性外眼筋麻痺(ミトコンドリア) | （なし） |  | Chronic Progressive External Ophthalmoplegia | ORPHA:254886 | Autosomal recessive progressive external ophthalmoplegia | 0.78 |
| 1000 | 口顔指症候群 | ORPHA:2750 | Orofaciodigital syndrome type 1 | Oral-Facial-Digital Syndrome | ORPHA:1988 | Femoral-facial syndrome | 0.78 |
| 2 | ムコ多糖症II型 | ORPHA:580 | Mucopolysaccharidosis type 2 | Hunter syndrome | ORPHA:93473 | Hurler syndrome | 0.77 |
| 85 | 全身型重症筋無力症 | （なし） |  | Generalized Myasthenia Gravis | ORPHA:589 | Myasthenia gravis | 0.77 |
| 89 | 拘束型心筋症 | （なし） |  | Restrictive Cardiomyopathy | ORPHA:75249 | Familial isolated restrictive cardiomyopathy | 0.77 |
| 100 | 特発性門脈圧亢進症 | （なし） |  | Idiopathic Portal Hypertension | ORPHA:275766 | Idiopathic pulmonary arterial hypertension | 0.77 |
| 144 | ムコ多糖症III型 | ORPHA:581 | Mucopolysaccharidosis type 3 | Sanfilippo Syndrome | ORPHA:3255 | Filippi syndrome | 0.77 |
| 175 | 心サルコイドーシス | （なし） |  | Cardiac Sarcoidosis | ORPHA:797 | Sarcoidosis | 0.77 |
| 526 | 中鎖アシルCoA脱水素酵素欠損症 | ORPHA:42 | Medium chain acyl-CoA dehydrogenase deficiency | MCAD Deficiency | ORPHA:650 | LCAT deficiency | 0.77 |
| 528 | ホロカルボキシラーゼ合成酵素欠損症 | ORPHA:79242 | Holocarboxylase synthetase deficiency | HLCS Deficiency | ORPHA:650 | LCAT deficiency | 0.77 |
| 579 | 短鎖アシルCoA脱水素酵素欠損症 | （なし） |  | SCAD Deficiency | ORPHA:650 | LCAT deficiency | 0.77 |
| 580 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | ORPHA:832 | Succinyl-CoA:3-oxoacid CoA transferase deficiency | SCOT Deficiency | ORPHA:650 | LCAT deficiency | 0.77 |
| 747 | 先天性溶血性貧血（不安定ヘモグロビン症） | （なし） |  | Unstable Hemoglobin Disease | ORPHA:90039 | Hemoglobin D disease | 0.77 |
| 984 | 微小眼球症 | ORPHA:136 | Cerebral autosomal dominant arteriopathy-subcortical infarcts-leukoencephalopathy | Microphthalmia | ORPHA:568 | Microphthalmia, Lenz type | 0.77 |
| 45 | 再生不良性貧血 | ORPHA:182040 | （対応表に無し） | Aplastic Anemia | ORPHA:88 | Idiopathic aplastic anemia | 0.76 |
| 60 | 先天性副腎過形成 | ORPHA:418 | （対応表に無し） | Congenital Adrenal Hyperplasia | ORPHA:95702 | X-linked adrenal hypoplasia congenita | 0.76 |
| 109 | 好酸球性消化管疾患 | （なし） |  | Eosinophilic Gastrointestinal Disease | ORPHA:2070 | Eosinophilic gastroenteritis | 0.76 |
| 165 | ウィルソン病型肝障害 | （なし） |  | Wilson Disease Hepatic | ORPHA:905 | Wilson disease | 0.76 |
| 207 | 先天性ミオパチー | ORPHA:97245 | （対応表に無し） | Congenital Myopathy | ORPHA:324581 | Benign Samaritan congenital myopathy | 0.76 |
| 319 | 副腎皮質過形成症 | ORPHA:418 | （対応表に無し） | Congenital Adrenal Hyperplasia | ORPHA:95702 | X-linked adrenal hypoplasia congenita | 0.76 |
| 340 | 先天性水腎症 | （なし） |  | Congenital Hydronephrosis | ORPHA:2185 | Congenital hydrocephalus | 0.76 |
| 522 | セピアプテリン還元酵素欠損症 | ORPHA:70594 | Dopa-responsive dystonia due to sepiapterin reductase deficiency | Sepiapterin Reductase Deficiency | ORPHA:226 | Dihydropteridine reductase deficiency | 0.76 |
| 538 | シアリドーシス | ORPHA:3166 | Sialuria | Sialidosis | ORPHA:812 | Sialidosis type 1 | 0.76 |
| 565 | ミトコンドリア心筋症 | （なし） |  | Mitochondrial Cardiomyopathy | ORPHA:254854 | Pure mitochondrial myopathy | 0.76 |
| 742 | 18トリソミー | ORPHA:3380 | Trisomy 18 syndrome | Edwards Syndrome | ORPHA:101016 | Romano-Ward syndrome | 0.76 |
| 892 | 先天性intrinsic factor欠損症 | ORPHA:35858 | Imerslund-Gräsbeck syndrome | Congenital IF Deficiency | ORPHA:335 | Congenital fibrinogen deficiency | 0.76 |
| 159 | 先天性プロテインC欠乏症 | （なし） |  | Protein C Deficiency | ORPHA:425 | Apolipoprotein A-I deficiency | 0.75 |
| 369 | 多種カルボキシラーゼ欠損症 | ORPHA:148 | （対応表に無し） | Multiple Carboxylase Deficiency | ORPHA:3008 | Pyruvate carboxylase deficiency | 0.75 |
| 374 | 前頭側頭型認知症 | ORPHA:282 | （対応表に無し） | Frontotemporal Dementia | ORPHA:275864 | Behavioral variant of frontotemporal dementia | 0.75 |
| 465 | 先天性蛋白C欠乏症 | （なし） |  | Protein C Deficiency | ORPHA:425 | Apolipoprotein A-I deficiency | 0.75 |
| 884 | 先天性高乳酸血症（PC欠損症） | ORPHA:3008 | Pyruvate carboxylase deficiency | PC Deficiency | ORPHA:650 | LCAT deficiency | 0.75 |
| 899 | 先天性グルタミン合成酵素欠損症 | ORPHA:71278 | （対応表に無し） | GS Deficiency | ORPHA:650 | LCAT deficiency | 0.75 |
| 974 | 先天性喉頭軟化症 | （なし） |  | Laryngomalacia | ORPHA:2373 | Congenital laryngomalacia | 0.75 |

## 8. ファウンダー判定の記録（2026-09-10）

| 対象 | 判定 | JSON 上の `status` |
|---|---|---|
| C. 補完可能 50 件 | 承認 | `approved` |
| B. 不一致のうち §3.1 の 10 件 → 採用 7 件（idx 5, 30, 326, 355, 588, 928, 978） | 内容を個別確認のうえ承認 | `approved` |
| B. 不一致のうち §3.1 の 10 件 → 却下 3 件（idx 47, 120, 726） | 現番号を維持。理由は JSON の `reject_reason` と §3.1。現番号の正誤は Orphadata 取得後に再確認 | `rejected`（適用対象外） |
| B. 不一致の残り 11 件 | 承認 | `approved` |
| §5.5 接尾辞英訳の規則 | 規則としては不採用 | ― |
| §5.5 で見つかった誤番号 4 件（idx 612・655・722・835） | 誤りが明白なため JSON に含める。発見経路を区別 | `approved`、`discovery: suffix_translation` |
| 次の物差し | Orphadata nomenclature（en_product1、CC BY 4.0）を 1 回取得し `data/orphanet/` に置く。原本無改変・バージョン・SHA-256・帰属表示。曖昧は候補併記で手動レビュー | ― |

