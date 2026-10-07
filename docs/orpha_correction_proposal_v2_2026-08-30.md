# ORPHA 番号の再照合 v2 — Orphanet 同義語付き命名法で D 712 件を照合し直す

- 作成日: 2026-09-10（ファイル名の日付は前回成果物 `*_2026-08-29` の翌日に揃えた）
- 対象（読み取りのみ、無変更）: `data/knowledge/comprehensive_rare_diseases_knowledge.json`（1,001 レコード）のうち、前回（`docs/orpha_correction_proposal_2026-08-29.md`）で **D（照合不能）と分類された 712 件**
- 物差し（読み取りのみ、無変更、`chmod 444`）: `data/orphanet/en_product1.xml`（Orphadata「Rare diseases and alignments with terminologies and databases」、JDBOR date **2026-06-23**、11,645 エンティティ、推奨名＋同義語＋現役/非現役フラグ）。補助: `data/orphanet/ORPHAnomenclature_en_2025.xml`（Orphanet Nomenclature Pack 2025 版）。取得記録は `data/orphanet/SOURCE.md`
- 位置づけ: **照合と修正案の作成まで。** 知識ファイルは書き換えていない。前回承認済み 72 件・却下 3 件の判定は覆していない（差が出たものは §8「再検討候補」に別記）
- 同時生成: `docs/orpha_corrections_v2_2026-08-30.json`（機械可読な B・C、前回の 75 件とは別ファイル）、`docs/orpha_review_ambiguous_2026-08-30.md`（番号を提案しなかった一致の手動レビュー表）
- ライセンス: Orphadata は CC BY 4.0。ここに転記した英語疾患名・同義語は en_product1.xml の `Name` / `Synonym` そのまま

## 0. 結論

### 0.1 前回の再現（先に実施）

前回と同じ規則を phenotype.hpoa（v2026-06-23）に対して再実装した結果、**A 218 / B 21 / C 50 / D 712 が一字違わず再現**し、B・C 71 件の index と提案番号もすべて前回 JSON と一致した。よって以下で扱う D 712 件は前回の D と同一の集合である。

### 0.2 D 712 件の行き先

| 行き先 | 件数 | 意味 |
|---|---:|---|
| A 追加（英語別名の完全一致） | 96 | 現番号が Orphanet の推奨名または同義語と一致 → 現番号は正しい |
| A 追加（略号による裏付け） | 89 | 略号（`MPS IV`、`SCA3` 等）だけが現番号の同義語と一致。裏付けとしては弱いが、偶然現番号に当たる確率は低い |
| **B 追加（提案）** | **41** | 現番号と異なる 1 番号に完全一致 → 修正案 |
| B（前回承認済みの裏付け） | 2 | idx 612 Ellis-van Creveld・655 Morvan。前回「接尾辞英訳」で個別承認した番号と同義語照合の結果が一致。二重提案を避けて JSON から除外（§8） |
| **C 追加（提案）** | **42** | 番号なし、1 番号に完全一致 → 補完案 |
| 手動レビュー: 略号のみで一致 | 60 | 単一候補だが略号は衝突が多い（§2.4）。提案しない |
| 手動レビュー: 非現役エンティティにのみ一致 | 23 | 廃止・統合・非希少と Orphanet が判定した番号。移行先を併記 |
| **D のまま** | **359** | 英語名が無い／略号のみ／英語名が Orphanet のどのラベルとも一致しない |
| 合計 | 712 | |

- **D は 712 件から 359 件に減った**（353 件減、50%）。前回の見積もり（347〜411 件が解ける）の範囲内
- 新規提案は **B 41 + C 42 = 83 件**。すべて英語別名が en_product1.xml の**現役**エンティティの推奨名または同義語と正規化後に完全一致したもの。推測で割り当てた番号は無い
- 提案の内訳（当たったラベル / 一致の種類）: B 推奨名・完全一致 24 件、B 同義語・完全一致 17 件、C 推奨名・完全一致 25 件、C 推奨名・disease/syndrome 無視 2 件、C 同義語・完全一致 15 件
- 1,001 件全体では A 403 / B 63 / C 91 / レビュー待ち 84 / D 359（前回 A・B・C のうち idx 474 が複数候補に、idx 14 が略号扱いに変わったが、前回の判定は維持。§8）
- **ライソゾーム病・糖原病は主要なものが解けた**（§6）。Hunter・Sanfilippo・Morquio・Maroteaux-Lamy・I-cell・Krabbe・Von Gierke・Cori・McArdle は同義語で現番号が裏付けられ A に昇格。ポンペ病（英語名なし）、Niemann-Pick A/B（略号のみ）、マンノシドーシス（英語名なし）は残る
- 現番号 645 種のうち、**非現役（Obsolete/Deprecated/Non-rare）が 21 種、Orphanet に存在しない番号が 15 種**（§7）

## 1. 取得した命名法と対応表の被覆

### 1.1 ファイル

| ファイル | 版 | エンティティ数 | 現役 | 非現役 | 用途 |
|---|---|---:|---:|---:|---|
| `en_product1.xml` | JDBOR date 2026-06-23（Orphadata 掲載 23 Jun 26） | 11,645 | 10,101 | 1,544 | **主対応表**。推奨名＋同義語＋ `DisorderFlagList`（Inactive / Obsolete entity / Deprecated entity / Non-rare disease in Europe / Historical entity / Head of classification） |
| `ORPHAnomenclature_en_2025.xml`（Pack 内） | ExtractionDate 2025-06-24 | 11,239 | 9,784 | 1,455 | 交差検証。`FlagValue` + `Totalstatus`（Active / Inactive: Obsolete / Inactive: Deprecated / Inactive: Non rare disease in Europe / Active: Historical Entity） |

取得前の想定と違った点が 2 つある。
1. **en_product1.xml 自体に非現役エンティティとフラグが含まれていた。** 提案時は「product1 は現役のみ」と想定していたが、実際には Inactive 1,544 件（Obsolete 1,057 / Deprecated 337 / Non-rare 149 / Obsolete with resources 1）を `DisorderFlagList` で持ち、廃止・統合先も `DisorderDisorderAssociation`（Moved to / Referred to）で持つ。よって obsolete 判定は product1 2026 で直接読めた
2. **GitHub ミラーの Nomenclature Pack は 2025 版だった。** コミットは 2026-06-29「JUL 2026」だが、ZIP の中身は `*_en_2025.xml`（ExtractionDate 2025-06-24）。product1 より 1 年古い。2025→2026 で状態が変わったエンティティは 89 件（Active → Inactive 83、Active: Historical Entity → Inactive 5、Inactive: Deprecated → Active 1）、2026 で新設された番号は 406 件。**したがって現役/非現役の判定は product1 2026 を正とし、2025 版は交差検証にのみ使った。** 2026 版 Pack が Orphadata サイト（JavaScript 生成のリンク）から取れるかは未確認

### 1.2 phenotype.hpoa 対応表との被覆比較

| 項目 | phenotype.hpoa（前回） | en_product1.xml（今回） |
|---|---:|---:|
| ORPHA 番号数 | 4,335 | 11,645（現役 10,101） |
| 名前の数（推奨名＋同義語） | 4,335（推奨名のみ） | 24,310（現役分。推奨名 10,101 ＋ 同義語 14,209） |
| phenotype.hpoa の 4,335 番号のうち product1 にあるもの | ― | 4,335（100%） |
| うち product1 で非現役 | ― | 8（ORPHA:33475 Meningococcal meningitis、ORPHA:352582 Familial infantile myoclonic epilepsy、ORPHA:25968 Self-limited childhood occipital epilepsy、ORPHA:90041 Gaisböck syndrome、ORPHA:1842 Bone dysplasia, lethal Holmgren type、ORPHA:2356 Arachnoid cyst、ORPHA:411527 Central retinal vein occlusion、ORPHA:39044 Uveal melanoma） |
| 現番号 645 種のうち対応表にあるもの | 531（82%） | 630（98%） |

番号の被覆は 4,335 → 10,101（2.3 倍）、名前の被覆は 4,335 → 24,310（5.6 倍）。群・カテゴリ（Group of disorders 2,264 件）と亜型（Subtype 1,178 件）が加わったことで、前回「群コードは HPO 注釈が無いため無い」とした Ehlers-Danlos・Ichthyosis・Periodic paralysis 等の群名が当たるようになった。

## 2. 照合の方針（前回と同じ規則＋同義語対応で必要になった 3 点）

### 2.1 前回と同じ点

- 照合に使う名前: `disease` と `alternate_names` のうち ASCII のみのもの。略号（全語が 5 文字以下の大文字・数字、またはローマ数字）は除外
- 正規化: NFKC・小文字化、所有格 `'s` 除去、空白・ハイフン類・スラッシュ・カンマ・ピリオド・括弧・コロン・セミコロン除去、`type` 直後または末尾のローマ数字→算用数字、末尾 disease/syndrome の有無両方（完全一致を先に、無ければ外した形）
- 判定: 正規化後の**完全一致のみ**。現番号が一致 → A。別 1 番号 → B。番号なしで 1 番号 → C。複数番号 → 提案しない。bigram 類似度は提案に使わない

### 2.2 同義語対応で加えた点

1. **対応表のラベル = 推奨名 + 同義語すべて。** 非現役エンティティの名前に付く `OBSOLETE: ` / `NON RARE IN EUROPE: ` 接頭辞は正規化前に外した（外さないと何も当たらない）
2. **非現役エンティティへの一致は提案しない。** 現役エンティティに 1 つも当たらず非現役にだけ当たった場合は、Orphanet の移行先（Moved to / Referred to）を併記してレビュー表 §3 へ
3. **略号を含む別名での一致は提案しない（§2.4）。** 前回の「略号は使わない」規則を同義語にも適用した上で、さらに「略号＋汎用語だけからなる別名」（`GPI Deficiency`、`OI Type IV`、`EoE`）も略号扱いにした。これらはレビュー表 §2 へ。略号が**現番号**に当たった場合だけは A の裏付け（弱）として数えた

### 2.3 分類の優先順位

1. 略号を含まない別名が現役エンティティに完全一致 → 一致した番号の集合で A / B / C / 複数候補を判定（前回と同じ）
2. 1 が無い場合、略号を含まない別名で disease/syndrome を外した形を試す
3. 1・2 が無い場合、略号が現番号の同義語に一致すれば A（略号による裏付け）、別番号なら「略号のみ」としてレビュー表 §2
4. 現役に何も当たらず非現役に当たれば「非現役」としてレビュー表 §3
5. それ以外は D

### 2.4 略号を提案から外した根拠

略号を同義語に当てると、以下のように**明らかに別の疾患**に単一候補として当たる。単一候補であることは正しさの根拠にならない。

| index | 日本語疾患名 | 別名 | 当たった Orphanet エンティティ |
|--:|---|---|---|
| 32 | 関節リウマチ | `RA` | ORPHA:673574 Reactive angioendotheliomatosis（同義語 `RA`） |
| 45 | 再生不良性貧血 | `AA` | ORPHA:689430 Adenoid ameloblastoma（同義語 `AA`） |
| 172 | ウエスト症候群 | `WS` | ORPHA:902 Werner syndrome（同義語 `WS`） |
| 177 | 線維性骨異形成症 | `FD` | ORPHA:324 Fabry disease（同義語 `FD`） |
| 206 | 好酸球性食道炎 | `EoE` | ORPHA:370334 Extraskeletal Ewing sarcoma（同義語 `EOE`） |
| 457 | Fanconi貧血 | `FA` | ORPHA:95 Friedreich ataxia（同義語 `FA`） |
| 801 | 先天性グリコシルホスファチジルイノシトール欠損症 | `GPI Deficiency` | ORPHA:712 Hemolytic anemia due to glucophosphate isomerase deficiency（同義語 `GPI deficiency`） |
| 115 | ネフローゼ症候群 | `NS` | ORPHA:634 Netherton syndrome（同義語 `NS`） |
| 123 | 尿崩症 | `DI` | ORPHA:49042 Dentinogenesis imperfecta（同義語 `DI`） |

一方、`SCA6`・`SCA31`・`SPG4`・`PKAN`・`IPAH`・`MPS I` のように正しいものも混ざる。機械的に区別できないので、60 件すべてを候補付きでレビュー表 §2 に回した。

## 3. B 追加 — 現番号が誤っている疑いのあるレコード（41 件）

深刻さの区分は前回と同じ機械判定（現番号と提案番号の Orphanet 推奨名の bigram Dice と 6 文字以上の内容語の共有）。今回は「現番号が非現役」「現番号が Orphanet に存在しない」を先に判定する。医学的判断ではない。

| 区分 | 件数 |
|---|---:|
| 近縁・亜型・群 | 19 |
| 全く別の疾患 | 15 |
| 現番号が Orphanet に存在しない | 3 |
| 現番号が非現役（Deprecated entity） | 2 |
| 現番号が非現役（Obsolete entity） | 1 |
| 現番号が非現役（Non-rare disease in Europe） | 1 |

| # | index | 疾患名（日本語） | 現在の ORPHA | 現在の番号が指している疾患名（状態） | 提案する ORPHA | 提案番号の疾患名（分類レベル） | 照合に使った英語別名 → 当たったラベル | 一致 | 深刻さ | Dice / 共有語 |
|--:|--:|---|---|---|---|---|---|---|---|---|
| 1 | 909 | 先天性ミオトニア(Thomsen/Becker型) | ORPHA:612 | Potassium-aggravated myotonia（Active） | **ORPHA:614** | Thomsen and Becker disease（Disorder/Disease） | `Myotonia Congenita` → 同義語 `Myotonia congenita` | 完全一致 | 全く別の疾患 | 0.04 |
| 2 | 214 | 魚鱗癬 | ORPHA:281 | Monosomy 5p syndrome（Active） | **ORPHA:79354** | Ichthyosis（Group of disorders/Category） | `Ichthyosis` → 推奨名 `Ichthyosis` | 完全一致 | 全く別の疾患 | 0.08 |
| 3 | 219 | デンスデポジット病 | ORPHA:91136 | Acquired monoclonal Ig light chain-associated Fanconi syndrome（Active） | **ORPHA:93571** | Dense deposit disease（Subtype of disorder/Histopathological subtype） | `Dense Deposit Disease` → 推奨名 `Dense deposit disease` | 完全一致 | 全く別の疾患 | 0.10 |
| 4 | 351 | 遠位型ミオパチー | ORPHA:399 | Huntington disease（Active） | **ORPHA:599** | Distal myopathy（Group of disorders/Category） | `Distal Myopathy` → 推奨名 `Distal myopathy` | 完全一致 | 全く別の疾患 | 0.14 |
| 5 | 681 | リンパ管腫症 | ORPHA:2136 | Hennekam syndrome（Active） | **ORPHA:141209** | Generalized lymphatic anomaly（Disorder/Malformation syndrome） | `Generalized Lymphatic Anomaly` → 推奨名 `Generalized lymphatic anomaly` | 完全一致 | 全く別の疾患 | 0.15 |
| 6 | 543 | セロイドリポフスチン症 | ORPHA:281 | Monosomy 5p syndrome（Active） | **ORPHA:216** | Neuronal ceroid lipofuscinosis（Group of disorders/Clinical group） | `Neuronal Ceroid Lipofuscinosis` → 推奨名 `Neuronal ceroid lipofuscinosis` | 完全一致 | 全く別の疾患 | 0.19 |
| 7 | 498 | 偽性副甲状腺機能低下症 | ORPHA:457 | Harlequin ichthyosis（Active） | **ORPHA:97593** | Pseudohypoparathyroidism（Group of disorders/Category） | `Pseudohypoparathyroidism` → 推奨名 `Pseudohypoparathyroidism` | 完全一致 | 全く別の疾患 | 0.20 |
| 8 | 388 | 先天性副腎低形成症 | ORPHA:95 | Friedreich ataxia（Active） | **ORPHA:595337** | Adrenal hypoplasia congenita（Group of disorders/Clinical group） | `Adrenal Hypoplasia Congenita` → 推奨名 `Adrenal hypoplasia congenita` | 完全一致 | 全く別の疾患 | 0.21 |
| 9 | 738 | 大田原症候群 | ORPHA:65286 | 3q29 microdeletion syndrome（Active） | **ORPHA:1934** | Early infantile developmental and epileptic encephalopathy（Disorder/Clinical syndrome） | `Ohtahara Syndrome` → 同義語 `Ohtahara syndrome` | 完全一致 | 全く別の疾患 | 0.23 |
| 10 | 442 | MECP2重複症候群 | ORPHA:85280 | X-linked intellectual disability-cubitus valgus-dysmorphism syndrome（Active） | **ORPHA:1762** | Proximal Xq28 duplication syndrome（Disorder/Malformation syndrome） | `MECP2 Duplication Syndrome` → 同義語 `MECP2 duplication syndrome` | 完全一致 | 全く別の疾患 | 0.23 |
| 11 | 494 | シトリン欠損症 | ORPHA:247585 | Citrullinemia type II（Active） | **ORPHA:247582** | Citrin deficiency（Group of disorders/Category） | `Citrin Deficiency` → 推奨名 `Citrin deficiency` | 完全一致 | 全く別の疾患 | 0.26 |
| 12 | 331 | 前眼部形成異常 | ORPHA:137 | Congenital disorder of glycosylation（Active） | **ORPHA:88632** | Anterior segment developmental anomaly（Group of disorders/Category） | `Anterior Segment Dysgenesis` → 同義語 `Anterior segment dysgenesis` | 完全一致 | 全く別の疾患 | 0.31 |
| 13 | 775 | 先天性ナトリウム下痢 | ORPHA:103910 | Congenital enterocyte heparan sulfate deficiency（Active） | **ORPHA:103908** | Congenital sodium diarrhea（Disorder/Disease） | `Congenital Sodium Diarrhea` → 推奨名 `Congenital sodium diarrhea` | 完全一致 | 全く別の疾患 | 0.37 |
| 14 | 538 | シアリドーシス | ORPHA:3166 | Sialuria（Active） | **ORPHA:309294** | Sialidosis（Group of disorders/Clinical group） | `Sialidosis` → 推奨名 `Sialidosis` | 完全一致 | 全く別の疾患 | 0.43 |
| 15 | 687 | Cowden症候群 | ORPHA:201 | Cowden syndrome（Active） | **ORPHA:306498** | PTEN hamartoma tumor syndrome（Disorder/Disease） | `PTEN Hamartoma Tumor Syndrome` → 推奨名 `PTEN hamartoma tumor syndrome` | 完全一致 | 全く別の疾患 | 0.44 |
| 16 | 298 | 成人T細胞白血病リンパ腫 | ORPHA:86500 | （Orphanet に存在しない番号）（存在しない） | **ORPHA:86875** | Adult T-cell leukemia/lymphoma（Disorder/Disease） | `Adult T-Cell Leukemia/Lymphoma` → 推奨名 `Adult T-cell leukemia/lymphoma` | 完全一致 | 現番号が Orphanet に存在しない | ― |
| 17 | 777 | Tufting Enteropathy | ORPHA:92065 | （Orphanet に存在しない番号）（存在しない） | **ORPHA:92050** | Congenital tufting enteropathy（Disorder/Disease） | `Intestinal Epithelial Dysplasia` → 同義語 `Intestinal epithelial dysplasia` | 完全一致 | 現番号が Orphanet に存在しない | ― |
| 18 | 925 | VCP関連多系統蛋白症 | ORPHA:93401 | （Orphanet に存在しない番号）（存在しない） | **ORPHA:52430** | Inclusion body myopathy with Paget disease of bone and frontotemporal dementia（Disorder/Disease） | `IBMPFD` → 同義語 `IBMPFD` | 完全一致 | 現番号が Orphanet に存在しない | ― |
| 19 | 920 | Sarcoglycan関連肢帯型筋ジストロフィー | ORPHA:206 | Crohn disease（Inactive/Non-rare disease in Europe） | **ORPHA:207052** | Qualitative or quantitative defects of sarcoglycan（Group of disorders/Category） | `Sarcoglycanopathy` → 同義語 `Sarcoglycanopathy` | 完全一致 | 現番号が非現役（Non-rare disease in Europe） | 0.00 |
| 20 | 746 | 遺伝性鉄過剰症(フェロポルチン病) | ORPHA:139491 | Hemochromatosis type 4（Inactive/Obsolete entity; Referred to → ORPHA:647834 SLC40A1-related hemochromatosis） | **ORPHA:648562** | Ferroportin disease（Disorder/Disease） | `Ferroportin Disease` → 推奨名 `Ferroportin disease` | 完全一致 | 現番号が非現役（Obsolete entity） | 0.11 |
| 21 | 770 | 自己免疫性腸症 | ORPHA:1564 | Dandy-Walker malformation-facial hemangioma syndrome（Inactive/Deprecated entity; Moved to → ORPHA:42775 PHACE syndrome） | **ORPHA:94075** | Severe immune-mediated enteropathy（Group of disorders/Category） | `Autoimmune Enteropathy` → 同義語 `Autoimmune enteropathy` | 完全一致 | 現番号が非現役（Deprecated entity） | 0.19 |
| 22 | 42 | IgA腎症 | ORPHA:97556 | Congenital and infantile nephrotic syndrome（Inactive/Deprecated entity; Moved to → ORPHA:564127 Genetic nephrotic syndrome） | **ORPHA:34145** | Immunoglobulin A nephropathy（Disorder/Disease） | `IgA Nephropathy` → 同義語 `IgA nephropathy` | 完全一致 | 現番号が非現役（Deprecated entity） | 0.24 |
| 23 | 513 | PCDH19関連てんかん | ORPHA:163703 | Febrile infection-related epilepsy syndrome（Active） | **ORPHA:714652** | PCDH19 clustering epilepsy（Disorder/Disease） | `PCDH19 Epilepsy` → 同義語 `PCDH19 epilepsy` | 完全一致 | 近縁・亜型・群 | 0.33 / epilepsy |
| 24 | 212 | 血球貪食性リンパ組織球症 | ORPHA:540 | Familial hemophagocytic lymphohistiocytosis（Active） | **ORPHA:158032** | Hemophagocytic syndrome（Group of disorders/Category） | `Hemophagocytic Lymphohistiocytosis` → 同義語 `Hemophagocytic lymphohistiocytosis` | 完全一致 | 近縁・亜型・群 | 0.47 / hemophagocytic |
| 25 | 320 | 緑内障（先天性） | ORPHA:98977 | Juvenile glaucoma（Active） | **ORPHA:98976** | Congenital glaucoma（Disorder/Disease） | `Primary Congenital Glaucoma` → 同義語 `Primary congenital glaucoma` | 完全一致 | 近縁・亜型・群 | 0.58 / glaucoma |
| 26 | 577 | 3-ヒドロキシ-3-メチルグルタル酸尿症 | ORPHA:35701 | 3-hydroxy-3-methylglutaryl-CoA synthase deficiency（Active） | **ORPHA:20** | 3-hydroxy-3-methylglutaric aciduria（Disorder/Disease） | `HMG-CoA Lyase Deficiency` → 同義語 `HMG-CoA lyase deficiency` | 完全一致 | 近縁・亜型・群 | 0.63 / hydroxy |
| 27 | 958 | 3-Hydroxy-3-Methylglutaryl-CoA Lyase欠損症 | ORPHA:35701 | 3-hydroxy-3-methylglutaryl-CoA synthase deficiency（Active） | **ORPHA:20** | 3-hydroxy-3-methylglutaric aciduria（Disorder/Disease） | `HMG-CoA Lyase Deficiency` → 同義語 `HMG-CoA lyase deficiency` | 完全一致 | 近縁・亜型・群 | 0.63 / hydroxy |
| 28 | 695 | 遺伝性網膜芽細胞腫 | ORPHA:790 | Retinoblastoma（Active） | **ORPHA:357027** | Hereditary retinoblastoma（Subtype of disorder/Clinical subtype） | `Hereditary Retinoblastoma` → 推奨名 `Hereditary retinoblastoma` | 完全一致 | 近縁・亜型・群 | 0.74 / retinoblastoma |
| 29 | 462 | Kostmann症候群 | ORPHA:486 | Autosomal dominant severe congenital neutropenia（Active） | **ORPHA:42738** | Severe congenital neutropenia（Group of disorders/Clinical group） | `Severe Congenital Neutropenia` → 推奨名 `Severe congenital neutropenia` | 完全一致 | 近縁・亜型・群 | 0.77 / neutropenia, severe |
| 30 | 406 | 神経有棘赤血球症 | ORPHA:2388 | Choreoacanthocytosis（Active） | **ORPHA:263440** | Neuroacanthocytosis（Group of disorders/Clinical group） | `Neuroacanthocytosis` → 推奨名 `Neuroacanthocytosis` | 完全一致 | 近縁・亜型・群 | 0.78 |
| 31 | 126 | ナルコレプシー | ORPHA:2073 | Narcolepsy type 1（Active） | **ORPHA:619284** | Narcolepsy（Group of disorders/Clinical group） | `Narcolepsy` → 推奨名 `Narcolepsy` | 完全一致 | 近縁・亜型・群 | 0.78 / narcolepsy |
| 32 | 306 | 周期性四肢麻痺 | ORPHA:681 | Hypokalemic periodic paralysis（Active） | **ORPHA:206976** | Periodic paralysis（Group of disorders/Clinical group） | `Periodic Paralysis` → 推奨名 `Periodic paralysis` | 完全一致 | 近縁・亜型・群 | 0.80 / paralysis, periodic |
| 33 | 59 | 筋強直性ジストロフィー | ORPHA:273 | Steinert myotonic dystrophy（Active） | **ORPHA:206647** | Myotonic dystrophy（Group of disorders/Clinical group） | `Myotonic Dystrophy` → 推奨名 `Myotonic dystrophy` | 完全一致 | 近縁・亜型・群 | 0.82 / dystrophy, myotonic |
| 34 | 916 | FKRP関連肢帯型筋ジストロフィー | ORPHA:34514 | Telethonin-related limb-girdle muscular dystrophy R7（Active） | **ORPHA:34515** | FKRP-related limb-girdle muscular dystrophy R9（Disorder/Disease） | `LGMD2I` → 同義語 `LGMD2I` | 完全一致 | 近縁・亜型・群 | 0.83 / dystrophy, girdle, muscular |
| 35 | 846 | 遺伝性有口赤血球症 | ORPHA:3202 | Dehydrated hereditary stomatocytosis（Active; Moved to → ORPHA:? None） | **ORPHA:98365** | Hereditary stomatocytosis（Group of disorders/Clinical group） | `Hereditary Stomatocytosis` → 推奨名 `Hereditary stomatocytosis` | 完全一致 | 近縁・亜型・群 | 0.84 / stomatocytosis |
| 36 | 247 | 肺ランゲルハンス細胞組織球症 | ORPHA:389 | Langerhans cell histiocytosis（Active; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None） | **ORPHA:687733** | Pulmonary Langerhans cell histiocytosis（Subtype of disorder/Clinical subtype） | `Pulmonary Langerhans Cell Histiocytosis` → 推奨名 `Pulmonary Langerhans cell histiocytosis` | 完全一致 | 近縁・亜型・群 | 0.84 / histiocytosis, langerhans |
| 37 | 49 | エーラス・ダンロス症候群 | ORPHA:287 | Classical Ehlers-Danlos syndrome（Active; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Referred to → ORPHA:? None; Moved to → ORPHA:? None） | **ORPHA:98249** | Ehlers-Danlos syndrome（Group of disorders/Clinical group） | `Ehlers-Danlos Syndrome` → 推奨名 `Ehlers-Danlos syndrome` | 完全一致 | 近縁・亜型・群 | 0.84 / danlos, ehlers |
| 38 | 559 | 中心核ミオパチー | ORPHA:596 | X-linked centronuclear myopathy（Active） | **ORPHA:595** | Centronuclear myopathy（Group of disorders/Clinical group） | `Centronuclear Myopathy` → 推奨名 `Centronuclear myopathy` | 完全一致 | 近縁・亜型・群 | 0.85 / centronuclear, myopathy |
| 39 | 1000 | 口顔指症候群 | ORPHA:2750 | Orofaciodigital syndrome type 1（Active; Moved to → ORPHA:? None） | **ORPHA:140997** | Orofaciodigital syndrome（Group of disorders/Clinical group） | `Oral-Facial-Digital Syndrome` → 同義語 `Oral-facial-digital syndrome` | 完全一致 | 近縁・亜型・群 | 0.89 / orofaciodigital |
| 40 | 209 | ミオクロニーてんかん | ORPHA:308 | Progressive myoclonic epilepsy type 1（Active） | **ORPHA:98261** | Progressive myoclonic epilepsy（Group of disorders/Clinical group） | `Progressive Myoclonus Epilepsy` → 同義語 `Progressive myoclonus epilepsy` | 完全一致 | 近縁・亜型・群 | 0.91 / epilepsy, myoclonic, progressive |
| 41 | 567 | 遺伝性感覚性自律神経性ニューロパチー | ORPHA:642 | Hereditary sensory and autonomic neuropathy type 4（Active） | **ORPHA:140471** | Hereditary sensory and autonomic neuropathy（Group of disorders/Clinical group） | `Hereditary Sensory and Autonomic Neuropathy` → 推奨名 `Hereditary sensory and autonomic neuropathy` | 完全一致 | 近縁・亜型・群 | 0.94 / autonomic, neuropathy, sensory |

### 3.1 B のうち、判定に注意が要るもの（機械判定の限界）

- **群への付け替え**（Dice が高く「近縁・亜型・群」に入るもの）: idx 49 エーラス・ダンロス症候群（Classical EDS → EDS 群）、59 筋強直性ジストロフィー（Steinert → 群）、126 ナルコレプシー（type 1 → 群）、209 ミオクロニーてんかん（PME type 1 → PME 群）、212 血球貪食性リンパ組織球症（家族性 → 群）、306 周期性四肢麻痺（低 K → 群）、462 Kostmann（AD SCN → SCN 群）、567 HSAN（type 4 → 群）、1000 口顔指症候群（type 1 → 群）。日本語名が群名なら提案側が整合するが、記述が亜型を指すなら現番号維持が正しい。前回 idx 355（原発性シュウ酸過多症）で群への付け替えを採用した判断と同じ基準で
- **逆に群から亜型へ**: idx 247 肺ランゲルハンス細胞組織球症（LCH 群 → Pulmonary LCH）、695 遺伝性網膜芽細胞腫（Retinoblastoma → Hereditary retinoblastoma）、846 遺伝性有口赤血球症（Dehydrated HSt → HSt 群）は日本語名と提案側が整合
- **現番号が非現役**: idx 42 IgA腎症（現 97556 は Deprecated → Genetic nephrotic syndrome に統合。IgA 腎症とは無関係）、746 フェロポルチン病（現 139491 Hemochromatosis type 4 は Obsolete → SLC40A1-related hemochromatosis 647834 を参照。提案 648562 Ferroportin disease と 647834 のどちらが適切かはファウンダー判断）、770 自己免疫性腸症（現 1564 は Dandy-Walker… の Deprecated。無関係）、920 Sarcoglycan 関連 LGMD（現 206 = Crohn 病。idx 66 クローン病と同じ番号を誤って持つ）
- **現番号が存在しない**: idx 298 成人T細胞白血病リンパ腫（86500）、777 Tufting Enteropathy（92065）、925 VCP 関連多系統蛋白症（93401）。番号が Orphanet に無いので、提案番号に置き換えるのが妥当
- **隣接番号の取り違え**（前回 idx 5・30 と同型）: idx 320（98977 → 98976）、494 シトリン欠損症（247585 → 247582）、559 中心核ミオパチー（596 → 595）、775 先天性ナトリウム下痢（103910 → 103908）、916 FKRP-LGMD（34514 → 34515）
- **同じ誤番号を 2 レコードが共有**: ORPHA:281（Monosomy 5p）を idx 214 魚鱗癬と 543 セロイドリポフスチン症が持つ。ORPHA:35701（HMG-CoA synthase 欠損）を idx 577 と 958（どちらも HMG-CoA **lyase** 欠損 = ORPHA:20）が持つ。synthase と lyase は別酵素で、Orphanet も別番号
- idx 687 Cowden症候群: 現 201 = Cowden syndrome（日本語名と一致）。別名 PTEN hamartoma tumor syndrome は上位概念。**現番号維持が妥当と考える**が、機械判定は B に出るので載せた（前回 idx 726 と同型）
- idx 738 大田原症候群: 現 65286 = 3q29 microdeletion（無関係）。提案 1934 は Orphanet が Ohtahara syndrome を同義語とする EIDEE（早期乳児発達性てんかん性脳症）

## 4. C 追加 — 番号が無く、照合で特定できたレコード（42 件）

| # | index | 疾患名（日本語） | 提案する ORPHA | 提案番号の疾患名（分類レベル） | 照合に使った英語別名 → 当たったラベル | 一致 | 備考 |
|--:|--:|---|---|---|---|---|---|
| 1 | 7 | 遺伝性血管浮腫 | **ORPHA:91378** | Hereditary angioedema（Group of disorders/Clinical group） | `Hereditary angioedema` → 推奨名 `Hereditary angioedema` | 完全一致 |  |
| 2 | 21 | 原発性免疫不全症 | **ORPHA:101997** | Primary immunodeficiency（Group of disorders/Category） | `Primary immunodeficiency` → 推奨名 `Primary immunodeficiency` | 完全一致 | 群（Category） |
| 3 | 61 | 先天性甲状腺機能低下症 | **ORPHA:442** | Congenital hypothyroidism（Group of disorders/Category） | `Congenital Hypothyroidism` → 推奨名 `Congenital hypothyroidism` | 完全一致 | Orphanet では希少疾患扱い（Non-rare フラグなし） |
| 4 | 70 | ミトコンドリア病 | **ORPHA:68380** | Mitochondrial disease（Group of disorders/Category） | `Mitochondrial Disease` → 推奨名 `Mitochondrial disease` | 完全一致 | 群（Category） |
| 5 | 81 | てんかん | **ORPHA:166463** | Epilepsy syndrome（Group of disorders/Category） | `Epilepsy` → 推奨名 `Epilepsy syndrome` | disease/syndrome 無視 | 「Epilepsy」が disease/syndrome 無視で Epilepsy syndrome（群）に当たった。てんかん一般に希少疾患番号を付けるかは要判断 |
| 6 | 89 | 拘束型心筋症 | **ORPHA:217632** | Restrictive cardiomyopathy（Group of disorders/Category） | `Restrictive Cardiomyopathy` → 推奨名 `Restrictive cardiomyopathy` | 完全一致 |  |
| 7 | 95 | 糖原病 | **ORPHA:79201** | Glycogen storage disease（Group of disorders/Category） | `Glycogen Storage Disease` → 推奨名 `Glycogen storage disease` | 完全一致 | 群（Category）。idx 523〜525 の亜型と整合 |
| 8 | 150 | 短腸症候群 | **ORPHA:104008** | Short bowel syndrome（Group of disorders/Clinical group） | `Short Bowel Syndrome` → 推奨名 `Short bowel syndrome` | 完全一致 |  |
| 9 | 185 | びまん性汎細気管支炎 | **ORPHA:171700** | Diffuse panbronchiolitis（Disorder/Disease） | `Diffuse Panbronchiolitis` → 推奨名 `Diffuse panbronchiolitis` | 完全一致 |  |
| 10 | 190 | 後天性血友病A | **ORPHA:599480** | Acquired hemophilia A（Disorder/Disease） | `Acquired Hemophilia A` → 推奨名 `Acquired hemophilia A` | 完全一致 |  |
| 11 | 191 | 先天性赤芽球異形成性貧血 | **ORPHA:85** | Congenital dyserythropoietic anemia（Group of disorders/Clinical group） | `Congenital Dyserythropoietic Anemia` → 推奨名 `Congenital dyserythropoietic anemia` | 完全一致 |  |
| 12 | 205 | 自己免疫性膵炎 | **ORPHA:103919** | Autoimmune pancreatitis（Group of disorders/Clinical group） | `Autoimmune Pancreatitis` → 推奨名 `Autoimmune pancreatitis` | 完全一致 |  |
| 13 | 210 | 特発性多中心性キャッスルマン病 | **ORPHA:570431** | Idiopathic multicentric Castleman disease（Subtype of disorder/Clinical subtype） | `Idiopathic Multicentric Castleman Disease` → 推奨名 `Idiopathic multicentric Castleman disease` | 完全一致 |  |
| 14 | 222 | 鎖肛 | **ORPHA:96346** | Anorectal malformation（Group of disorders/Category） | `Anorectal Malformation` → 推奨名 `Anorectal malformation` | 完全一致 | idx 972 と同じ番号（重複レコード） |
| 15 | 236 | グリコーゲン蓄積症II型 | **ORPHA:420429** | Glycogen storage disease due to acid maltase deficiency, late-onset（Subtype of disorder/Clinical subtype） | `Pompe Disease Late-Onset` → 同義語 `Pompe disease, late-onset` | 完全一致 | Pompe 病遅発型。idx 4 ポンペ病（英語名なし）と 493 乳児型は D のまま |
| 16 | 246 | 特発性間質性肺炎 | **ORPHA:98300** | Idiopathic interstitial pneumonia（Group of disorders/Clinical group） | `Idiopathic Interstitial Pneumonia` → 推奨名 `Idiopathic interstitial pneumonia` | 完全一致 |  |
| 17 | 260 | ミトコンドリアDNA枯渇症候群 | **ORPHA:35698** | Mitochondrial DNA depletion syndrome（Group of disorders/Category） | `Mitochondrial DNA Depletion Syndrome` → 推奨名 `Mitochondrial DNA depletion syndrome` | 完全一致 |  |
| 18 | 271 | 掌蹠膿疱症 | **ORPHA:163927** | Pustulosis palmaris et plantaris（Disorder/Disease） | `Palmoplantar Pustulosis` → 同義語 `Palmoplantar pustulosis` | 完全一致 |  |
| 19 | 287 | 突発性難聴 | **ORPHA:90059** | Sudden sensorineural hearing loss（Disorder/Particular clinical situation in a disease or syndrome） | `Sudden Sensorineural Hearing Loss` → 推奨名 `Sudden sensorineural hearing loss` | 完全一致 |  |
| 20 | 290 | 過敏性肺炎 | **ORPHA:31740** | Hypersensitivity pneumonitis（Disorder/Disease） | `Hypersensitivity Pneumonitis` → 推奨名 `Hypersensitivity pneumonitis` | 完全一致 |  |
| 21 | 314 | 慢性炎症性脱髄性多発根神経炎（MADSAM型） | **ORPHA:48162** | Lewis-Sumner syndrome（Subtype of disorder/Clinical subtype） | `MADSAM` → 同義語 `MADSAM` | 完全一致 |  |
| 22 | 370 | ジヒドロピリミジナーゼ欠損症 | **ORPHA:38874** | Dihydropyrimidinuria（Disorder/Disease） | `Dihydropyrimidinase Deficiency` → 同義語 `Dihydropyrimidinase deficiency` | 完全一致 |  |
| 23 | 386 | 結節性多発動脈炎（皮膚型） | **ORPHA:439729** | Cutaneous polyarteritis nodosa（Subtype of disorder/Clinical subtype） | `Cutaneous PAN` → 同義語 `Cutaneous PAN` | 完全一致 |  |
| 24 | 495 | 腫瘍性骨軟化症 | **ORPHA:352540** | Oncogenic osteomalacia（Disorder/Disease） | `Tumor-Induced Osteomalacia` → 同義語 `Tumor-induced osteomalacia` | 完全一致 |  |
| 25 | 529 | 高フェニルアラニン血症（BH4反応型） | **ORPHA:293284** | Tetrahydrobiopterin-responsive phenylketonuria（Subtype of disorder/Clinical subtype） | `BH4-Responsive PKU` → 同義語 `BH4-responsive PKU` | 完全一致 |  |
| 26 | 568 | 遺伝性運動感覚性ニューロパチー（デジェリーヌ・ソッタス型） | **ORPHA:64748** | Dejerine-Sottas syndrome（Disorder/Disease） | `Dejerine-Sottas Disease` → 推奨名 `Dejerine-Sottas syndrome` | disease/syndrome 無視 | Dejerine-Sottas Disease → Dejerine-Sottas syndrome（disease/syndrome 無視） |
| 27 | 572 | 頭蓋骨早期癒合症（非症候群性） | **ORPHA:139390** | Non-syndromic craniosynostosis（Group of disorders/Clinical group） | `Non-Syndromic Craniosynostosis` → 推奨名 `Non-syndromic craniosynostosis` | 完全一致 |  |
| 28 | 593 | 遺伝性痙性対麻痺2型 | **ORPHA:280270** | Pelizaeus-Merzbacher-like disease（Disorder/Disease） | `Pelizaeus-Merzbacher-Like Disease` → 推奨名 `Pelizaeus-Merzbacher-like disease` | 完全一致 |  |
| 29 | 702 | TSH産生下垂体腺腫 | **ORPHA:91347** | TSH-secreting pituitary adenoma（Disorder/Disease） | `TSHoma` → 同義語 `TSH-oma` | 完全一致 |  |
| 30 | 745 | 先天性赤芽球癆(一過性) | **ORPHA:98871** | Transient erythroblastopenia of childhood（Disorder/Disease） | `Transient Erythroblastopenia of Childhood` → 推奨名 `Transient erythroblastopenia of childhood` | 完全一致 |  |
| 31 | 749 | 後天性血栓性血小板減少性紫斑病 | **ORPHA:93585** | Immune-mediated thrombotic thrombocytopenic purpura（Subtype of disorder/Clinical subtype） | `Acquired TTP` → 同義語 `Acquired TTP` | 完全一致 |  |
| 32 | 786 | 遺伝性眼瞼下垂 | **ORPHA:91411** | Congenital ptosis（Disorder/Disease） | `Congenital Ptosis` → 推奨名 `Congenital ptosis` | 完全一致 |  |
| 33 | 790 | 遺伝性眼球運動失行症（Cogan型） | **ORPHA:1125** | Ocular motor apraxia, Cogan type（Disorder/Disease） | `Oculomotor Apraxia Cogan Type` → 同義語 `Oculomotor apraxia, Cogan type` | 完全一致 |  |
| 34 | 821 | 遺伝性毛髪・歯・爪異常症 | **ORPHA:79373** | Ectodermal dysplasia syndrome（Group of disorders/Category） | `Ectodermal Dysplasia` → 同義語 `Ectodermal dysplasia` | 完全一致 |  |
| 35 | 827 | 視床下部過誤腫（笑い発作てんかん） | **ORPHA:86906** | Gelastic seizures with hypothalamic hamartoma（Disorder/Disease） | `Hypothalamic Hamartoma with Gelastic Seizures` → 同義語 `Hypothalamic hamartoma with gelastic seizures` | 完全一致 |  |
| 36 | 837 | Quebec Platelet Disorder | **ORPHA:220436** | Quebec platelet disorder（Disorder/Disease） | `Quebec Platelet Disorder` → 推奨名 `Quebec platelet disorder` | 完全一致 |  |
| 37 | 865 | 遺伝性運動ニューロパチー（dHMN） | **ORPHA:53739** | Distal hereditary motor neuropathy（Group of disorders/Clinical group） | `Distal Hereditary Motor Neuropathy` → 推奨名 `Distal hereditary motor neuropathy` | 完全一致 |  |
| 38 | 866 | Lewis-Sumner症候群 | **ORPHA:48162** | Lewis-Sumner syndrome（Subtype of disorder/Clinical subtype） | `MADSAM` → 同義語 `MADSAM` | 完全一致 | idx 314 と同じ番号（Lewis-Sumner = MADSAM）。ただし 314 は略号 MADSAM で当たったためレビュー表 §2 側 |
| 39 | 951 | Aβ2Mアミロイドーシス | **ORPHA:85446** | Wild type ABeta2M amyloidosis（Disorder/Disease） | `Dialysis-Related Amyloidosis` → 同義語 `Dialysis-related amyloidosis` | 完全一致 |  |
| 40 | 971 | 先天性小腸閉鎖症 | **ORPHA:1201** | Small bowel atresia（Disorder/Morphological anomaly） | `Jejunoileal Atresia` → 同義語 `Jejunoileal atresia` | 完全一致 |  |
| 41 | 972 | 鎖肛（直腸肛門奇形） | **ORPHA:96346** | Anorectal malformation（Group of disorders/Category） | `Anorectal Malformation` → 推奨名 `Anorectal malformation` | 完全一致 | idx 222 と同じ番号（重複レコード） |
| 42 | 975 | 先天性声門下狭窄 | **ORPHA:141121** | Congenital subglottic stenosis（Disorder/Malformation syndrome） | `Congenital Subglottic Stenosis` → 推奨名 `Congenital subglottic stenosis` | 完全一致 |  |

## 5. A 追加 — 現番号が同義語で裏付けられたレコード

### 5.1 英語別名の完全一致（96 件）

| index | 疾患名（日本語） | 現 ORPHA | Orphanet 推奨名 | 照合に使った英語別名 → 当たったラベル |
|--:|---|---|---|---|
| 2 | ムコ多糖症II型 | ORPHA:580 | Mucopolysaccharidosis type 2 | `Hunter syndrome` → 同義語 `Hunter syndrome` |
| 58 | 22q11.2欠失症候群 | ORPHA:567 | 22q11.2 deletion syndrome | `Velocardiofacial Syndrome` → 同義語 `Velocardiofacial syndrome` |
| 60 | 先天性副腎過形成 | ORPHA:418 | Congenital adrenal hyperplasia | `Congenital Adrenal Hyperplasia` → 推奨名 `Congenital adrenal hyperplasia` |
| 86 | 肺動脈性肺高血圧症 | ORPHA:182090 | Pulmonary arterial hypertension | `Pulmonary Arterial Hypertension` → 推奨名 `Pulmonary arterial hypertension` |
| 87 | 特発性拡張型心筋症 | ORPHA:217604 | Dilated cardiomyopathy | `Dilated Cardiomyopathy` → 推奨名 `Dilated cardiomyopathy` |
| 94 | ガラクトース血症 | ORPHA:352 | Galactosemia | `Galactosemia` → 推奨名 `Galactosemia` |
| 99 | 自己免疫性溶血性貧血 | ORPHA:98375 | Autoimmune hemolytic anemia | `Autoimmune Hemolytic Anemia` → 推奨名 `Autoimmune hemolytic anemia` |
| 128 | 慢性リンパ性白血病 | ORPHA:67038 | B-cell chronic lymphocytic leukemia | `Chronic Lymphocytic Leukemia` → 同義語 `Chronic lymphocytic leukemia` |
| 144 | ムコ多糖症III型 | ORPHA:581 | Mucopolysaccharidosis type 3 | `Sanfilippo Syndrome` → 同義語 `Sanfilippo syndrome` |
| 145 | ムコ多糖症IV型 | ORPHA:582 | Mucopolysaccharidosis type 4 | `Morquio Syndrome` → 同義語 `Morquio disease` |
| 146 | ムコ多糖症VI型 | ORPHA:583 | Mucopolysaccharidosis type 6 | `Maroteaux-Lamy Syndrome` → 同義語 `Maroteaux-Lamy disease` |
| 166 | グルタル酸血症1型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | `Glutaric Acidemia Type 1` → 同義語 `Glutaric acidemia type 1` |
| 174 | 亜急性硬化性全脳炎 | ORPHA:2806 | Subacute sclerosing leukoencephalitis | `Subacute Sclerosing Panencephalitis` → 同義語 `Subacute sclerosing panencephalitis` |
| 181 | 高IgD症候群 | ORPHA:343 | Hyperimmunoglobulinemia D with periodic fever | `Hyper-IgD Syndrome` → 同義語 `Hyper-IgD syndrome` |
| 201 | 脊髄空洞症 | ORPHA:3280 | Syringomyelia | `Syringomyelia` → 推奨名 `Syringomyelia` |
| 207 | 先天性ミオパチー | ORPHA:97245 | Congenital myopathy | `Congenital Myopathy` → 推奨名 `Congenital myopathy` |
| 228 | 総動脈幹遺残症 | ORPHA:3384 | Common arterial trunk | `Truncus Arteriosus` → 同義語 `Truncus arteriosus` |
| 233 | シトルリン血症 | ORPHA:187 | Citrullinemia | `Citrullinemia` → 推奨名 `Citrullinemia` |
| 249 | IgA血管炎 | ORPHA:761 | Immunoglobulin A vasculitis | `IgA Vasculitis` → 同義語 `IgA vasculitis` |
| 254 | 顔面肩甲上腕型筋ジストロフィー | ORPHA:269 | Facioscapulohumeral dystrophy | `Facioscapulohumeral Muscular Dystrophy` → 同義語 `Facioscapulohumeral muscular dystrophy` |
| 255 | 肢帯型筋ジストロフィー | ORPHA:263 | Limb-girdle muscular dystrophy | `Limb-Girdle Muscular Dystrophy` → 推奨名 `Limb-girdle muscular dystrophy` |
| 257 | 重症複合免疫不全症 | ORPHA:183660 | Severe combined immunodeficiency | `Severe Combined Immunodeficiency` → 推奨名 `Severe combined immunodeficiency` |
| 265 | アルミート不整脈原性心筋症 | ORPHA:247 | Inherited arrhythmogenic cardiomyopathy | `Arrhythmogenic Cardiomyopathy` → 同義語 `Arrhythmogenic cardiomyopathy` |
| 267 | ガストリノーマ | ORPHA:913 | Zollinger-Ellison syndrome | `Gastrinoma` → 同義語 `Gastrinoma` |
| 276 | びまん性大細胞型B細胞リンパ腫 | ORPHA:544 | Diffuse large B-cell lymphoma | `Diffuse Large B-Cell Lymphoma` → 推奨名 `Diffuse large B-cell lymphoma` |
| 278 | ホジキンリンパ腫 | ORPHA:98293 | Hodgkin lymphoma | `Hodgkin Lymphoma` → 推奨名 `Hodgkin lymphoma` |
| 281 | 遺伝性痙性対麻痺 | ORPHA:685 | Hereditary spastic paraplegia | `Hereditary Spastic Paraplegia` → 推奨名 `Hereditary spastic paraplegia` |
| 284 | ムコリピドーシスII型 | ORPHA:576 | Mucolipidosis type II | `I-cell Disease` → 同義語 `I-cell disease` |
| 296 | 5p欠失症候群 | ORPHA:281 | Monosomy 5p syndrome | `Cri du Chat Syndrome` → 同義語 `Cri du chat syndrome` |
| 319 | 副腎皮質過形成症 | ORPHA:418 | Congenital adrenal hyperplasia | `Congenital Adrenal Hyperplasia` → 推奨名 `Congenital adrenal hyperplasia` |
| 367 | 抗糸球体基底膜病 | ORPHA:375 | Anti-glomerular basement membrane disease | `Anti-GBM Disease` → 同義語 `Anti-GBM syndrome` |
| 369 | 多種カルボキシラーゼ欠損症 | ORPHA:148 | Multiple carboxylase deficiency | `Multiple Carboxylase Deficiency` → 推奨名 `Multiple carboxylase deficiency` |
| 374 | 前頭側頭型認知症 | ORPHA:282 | Frontotemporal dementia | `Frontotemporal Dementia` → 推奨名 `Frontotemporal dementia` |
| 380 | 特発性好酸球増多症候群 | ORPHA:168956 | Hypereosinophilic syndrome | `Hypereosinophilic Syndrome` → 推奨名 `Hypereosinophilic syndrome` |
| 396 | VACTERL連合 | ORPHA:887 | VACTERL/VATER association | `VACTERL Association` → 同義語 `VACTERL association` |
| 423 | Gorlin症候群 | ORPHA:377 | Gorlin syndrome | `Nevoid Basal Cell Carcinoma Syndrome` → 同義語 `Nevoid basal cell carcinoma syndrome` |
| 426 | 眼皮膚白皮症 | ORPHA:55 | Oculocutaneous albinism | `Oculocutaneous Albinism` → 推奨名 `Oculocutaneous albinism` |
| 451 | Wolfram症候群 | ORPHA:3463 | Wolfram syndrome | `DIDMOAD` → 同義語 `DIDMOAD syndrome` |
| 464 | 先天性赤血球形成異常性貧血 | ORPHA:85 | Congenital dyserythropoietic anemia | `Congenital Dyserythropoietic Anemia` → 推奨名 `Congenital dyserythropoietic anemia` |
| 475 | 先天性中枢性低換気症候群 | ORPHA:661 | Congenital central hypoventilation syndrome | `Ondine curse` → 同義語 `Ondine curse` |
| 476 | 腎性尿崩症 | ORPHA:223 | Arginine vasopressin resistance | `Nephrogenic Diabetes Insipidus` → 同義語 `Nephrogenic diabetes insipidus` |
| 487 | Krabbe病 | ORPHA:487 | Krabbe disease | `Globoid Cell Leukodystrophy` → 同義語 `Globoid cell leukodystrophy` |
| 522 | セピアプテリン還元酵素欠損症 | ORPHA:70594 | Dopa-responsive dystonia due to sepiapterin reductase deficiency | `Sepiapterin Reductase Deficiency` → 同義語 `Sepiapterin reductase deficiency` |
| 523 | 糖原病Ia型 | ORPHA:364 | Glycogen storage disease due to glucose-6-phosphatase deficiency | `Von Gierke Disease` → 同義語 `Von Gierke disease` |
| 524 | 糖原病III型 | ORPHA:366 | Glycogen storage disease due to glycogen debranching enzyme deficiency | `Cori Disease` → 同義語 `Cori disease` |
| 525 | 糖原病V型 | ORPHA:368 | Glycogen storage disease due to muscle glycogen phosphorylase deficiency | `McArdle Disease` → 同義語 `McArdle disease` |
| 527 | グルタル酸血症I型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | `Glutaric Acidemia Type I` → 同義語 `Glutaric acidemia type 1` |
| 555 | 乳児型ネマリンミオパチー | ORPHA:607 | Nemaline myopathy | `Nemaline Myopathy` → 推奨名 `Nemaline myopathy` |
| 557 | ミニコア病 | ORPHA:598 | Multiminicore myopathy | `Multi-Minicore Disease` → 同義語 `Multiminicore disease` |
| 560 | Bethlem型ミオパチー | ORPHA:610 | Bethlem muscular dystrophy | `Bethlem Myopathy` → 同義語 `Bethlem myopathy` |
| 562 | 筋細管ミオパチー（X連鎖型） | ORPHA:596 | X-linked centronuclear myopathy | `X-Linked Myotubular Myopathy` → 同義語 `X-linked myotubular myopathy` |
| 563 | 遠位関節拘縮症 | ORPHA:97120 | Distal arthrogryposis | `Distal Arthrogryposis` → 推奨名 `Distal arthrogryposis` |
| 564 | Freeman-Sheldon症候群 | ORPHA:2053 | Freeman-Sheldon syndrome | `Whistling Face Syndrome` → 同義語 `Whistling face syndrome` |
| 576 | ホモシスチン尿症（CBS欠損型） | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | `Classical Homocystinuria` → 同義語 `Classical homocystinuria` |
| 606 | 多発性骨端異形成症 | ORPHA:251 | Multiple epiphyseal dysplasia | `Multiple Epiphyseal Dysplasia` → 推奨名 `Multiple epiphyseal dysplasia` |
| 616 | Camurati-Engelmann病 | ORPHA:1328 | Camurati-Engelmann disease | `Progressive Diaphyseal Dysplasia` → 同義語 `Progressive diaphyseal dysplasia` |
| 619 | 全身性肥満細胞症 | ORPHA:2467 | Systemic mastocytosis | `Systemic Mastocytosis` → 推奨名 `Systemic mastocytosis` |
| 621 | SAPHO症候群 | ORPHA:793 | SAPHO syndrome | `Synovitis-Acne-Pustulosis-Hyperostosis-Osteitis` → 同義語 `Synovitis-acne-pustulosis-hyperostosis-osteitis syndrome` |
| 628 | PAPA症候群 | ORPHA:69126 | PAPA syndrome | `Pyogenic Arthritis-Pyoderma Gangrenosum-Acne` → 同義語 `Pyogenic arthritis-pyoderma gangrenosum-acne syndrome` |
| 632 | Mevalonate Kinase欠損症 | ORPHA:343 | Hyperimmunoglobulinemia D with periodic fever | `Hyper-IgD Syndrome` → 同義語 `Hyper-IgD syndrome` |
| 651 | 先天性無痛無汗症 | ORPHA:642 | Hereditary sensory and autonomic neuropathy type 4 | `Congenital Insensitivity to Pain with Anhidrosis` → 同義語 `Congenital insensitivity to pain with anhidrosis` |
| 682 | Gorham-Stout病 | ORPHA:73 | Gorham-Stout disease | `Vanishing Bone Disease` → 同義語 `Vanishing bone disease` |
| 690 | 遺伝性びまん性胃癌 | ORPHA:26106 | Hereditary diffuse gastric cancer | `Hereditary Diffuse Gastric Cancer` → 推奨名 `Hereditary diffuse gastric cancer` |
| 696 | 遺伝性平滑筋腫症腎細胞癌症候群 | ORPHA:523 | Hereditary leiomyomatosis and renal cell cancer | `Reed Syndrome` → 同義語 `Reed syndrome` |
| 706 | アルギニン血症 | ORPHA:90 | Argininemia | `Arginase Deficiency` → 同義語 `Arginase deficiency` |
| 713 | 先天性リポイド過形成症 | ORPHA:90790 | Congenital lipoid adrenal hyperplasia due to STAR deficency | `Lipoid CAH` → 同義語 `Lipoid CAH` |
| 731 | X連鎖性ジストニア・パーキンソニズム | ORPHA:53351 | X-linked dystonia-parkinsonism | `Lubag` → 同義語 `Lubag` |
| 737 | 先天性多発性関節拘縮症 | ORPHA:1037 | Arthrogryposis multiplex congenita | `Arthrogryposis Multiplex Congenita` → 推奨名 `Arthrogryposis multiplex congenita` |
| 742 | 18トリソミー | ORPHA:3380 | Trisomy 18 syndrome | `Edwards Syndrome` → 同義語 `Edwards syndrome` |
| 743 | 13トリソミー | ORPHA:3378 | Trisomy 13 syndrome | `Patau Syndrome` → 同義語 `Patau syndrome` |
| 748 | 遺伝性血栓性血小板減少性紫斑病 | ORPHA:93583 | Congenital thrombotic thrombocytopenic purpura | `Upshaw-Schulman Syndrome` → 同義語 `Upshaw-Schulman syndrome` |
| 756 | Alport症候群（X連鎖型） | ORPHA:88917 | X-linked Alport syndrome | `X-Linked Alport` → 推奨名 `X-linked Alport syndrome` |
| 761 | 常染色体優性尿細管間質性腎疾患(UMOD型) | ORPHA:88950 | UMOD-related autosomal dominant tubulointerstitial kidney disease | `Uromodulin Associated Kidney Disease` → 同義語 `Uromodulin-associated kidney disease` |
| 774 | 先天性吸収不良症候群（先天性クロール下痢） | ORPHA:53689 | Congenital chloride diarrhea | `Congenital Chloride Diarrhea` → 推奨名 `Congenital chloride diarrhea` |
| 784 | Mounier-Kuhn症候群 | ORPHA:3347 | Mounier-Kühn syndrome | `Tracheobronchomegaly` → 同義語 `Tracheobronchomegaly` |
| 791 | 遺伝性視神経症（常染色体優性） | ORPHA:98672 | Autosomal dominant optic atrophy | `Autosomal Dominant Optic Atrophy` → 推奨名 `Autosomal dominant optic atrophy` |
| 800 | Best卵黄状黄斑ジストロフィー | ORPHA:1243 | Best vitelliform macular dystrophy | `Best Disease` → 同義語 `Best disease` |
| 805 | Bosch-Boonstra-Schaaf視神経萎縮症候群 | ORPHA:401777 | Optic atrophy-intellectual disability syndrome | `BBSOAS` → 同義語 `BBSOAS` |
| 814 | Darier病 | ORPHA:218 | Darier disease | `Keratosis Follicularis` → 同義語 `Keratosis follicularis` |
| 815 | 水疱型先天性魚鱗癬様紅皮症 | ORPHA:312 | Autosomal dominant epidermolytic ichthyosis | `Epidermolytic Hyperkeratosis` → 同義語 `Epidermolytic hyperkeratosis` |
| 825 | 遺伝性結合組織疾患（Cutis Laxa） | ORPHA:209 | Cutis laxa | `Cutis Laxa` → 推奨名 `Cutis laxa` |
| 832 | 遺伝性第XI因子欠損症 | ORPHA:329 | Congenital factor XI deficiency | `Hemophilia C` → 同義語 `Hemophilia C` |
| 841 | 先天性第V因子欠損症 | ORPHA:326 | Congenital factor V deficiency | `Parahemophilia` → 同義語 `Parahemophilia` |
| 843 | 先天性第II因子欠損症 | ORPHA:325 | Congenital factor II deficiency | `Prothrombin Deficiency` → 同義語 `Prothrombin deficiency` |
| 847 | 先天性赤血球生成異常性貧血 | ORPHA:85 | Congenital dyserythropoietic anemia | `Congenital Dyserythropoietic Anemia` → 推奨名 `Congenital dyserythropoietic anemia` |
| 870 | 特発性頭蓋内圧亢進症 | ORPHA:238624 | Idiopathic intracranial hypertension | `Pseudotumor Cerebri` → 同義語 `Pseudotumor cerebri` |
| 878 | NARP症候群 | ORPHA:644 | NARP syndrome | `Neuropathy-Ataxia-Retinitis Pigmentosa` → 同義語 `Neuropathy-ataxia-retinitis pigmentosa syndrome` |
| 907 | 遺伝性高カリウム性周期性四肢麻痺 | ORPHA:682 | Hyperkalemic periodic paralysis | `Hyperkalemic PP` → 同義語 `Hyperkalemic PP` |
| 908 | 先天性パラミオトニア | ORPHA:684 | Paramyotonia congenita of Von Eulenburg | `Paramyotonia Congenita` → 同義語 `Paramyotonia congenita` |
| 911 | Rippling Muscle Disease | ORPHA:97238 | Rippling muscle disease | `Rippling Muscle Disease` → 推奨名 `Rippling muscle disease` |
| 917 | Calpain3関連肢帯型筋ジストロフィー | ORPHA:267 | Calpain-3-related limb-girdle muscular dystrophy R1 | `LGMD2A` → 同義語 `LGMD2A` |
| 918 | Dysferlin関連肢帯型筋ジストロフィー | ORPHA:268 | Dysferlin-related limb-girdle muscular dystrophy R2 | `LGMD2B` → 同義語 `LGMD2B` |
| 919 | Anoctamin5関連肢帯型筋ジストロフィー | ORPHA:206549 | Anoctamin-5-related limb-girdle muscular dystrophy R12 | `LGMD2L` → 同義語 `LGMD2L` |
| 952 | 遺伝性全身性AApoAIアミロイドーシス | ORPHA:93560 | AApoAI amyloidosis | `AApoAI Amyloidosis` → 推奨名 `AApoAI amyloidosis` |
| 960 | ホモシスチン尿症(CBS型) | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | `Classical Homocystinuria` → 同義語 `Classical homocystinuria` |
| 983 | 先天性緑内障 | ORPHA:98976 | Congenital glaucoma | `Primary Congenital Glaucoma` → 同義語 `Primary congenital glaucoma` |

### 5.2 略号による裏付け（89 件、弱い裏付け）

略号が現番号の同義語と一致した。§2.4 のとおり略号は衝突が多いが、**偶然に現番号へ当たる**確率は低いので「現番号を否定する材料は無い」程度の裏付けとして扱う。

| index | 疾患名（日本語） | 現 ORPHA | Orphanet 推奨名 | 略号 → 同義語 |
|--:|---|---|---|---|
| 56 | 多発性嚢胞腎 | ORPHA:730 | Autosomal dominant polycystic kidney disease | `ADPKD` → `ADPKD` |
| 72 | 副腎白質ジストロフィー | ORPHA:43 | X-linked adrenoleukodystrophy | `ALD` → `ALD` |
| 83 | ギラン・バレー症候群 | ORPHA:2103 | Guillain-Barré syndrome | `GBS` → `GBS` |
| 84 | 視神経脊髄炎 | ORPHA:71211 | Neuromyelitis optica spectrum disorder | `NMOSD` → `NMOSD` |
| 125 | 福山型先天性筋ジストロフィー | ORPHA:272 | Congenital muscular dystrophy, Fukuyama type | `FCMD` → `FCMD` |
| 134 | 球脊髄性筋萎縮症 | ORPHA:481 | Kennedy disease | `SBMA` → `SBMA` |
| 180 | クリオピリン関連周期熱症候群 | ORPHA:208650 | NLRP3-associated autoinflammatory disease | `CAPS` → `CAPS` |
| 242 | 遺伝性出血性末梢血管拡張症 | ORPHA:774 | Hereditary hemorrhagic telangiectasia | `HHT` → `HHT` |
| 261 | ウルリッヒ型先天性筋ジストロフィー | ORPHA:75840 | Ullrich congenital muscular dystrophy | `UCMD` → `UCMD` |
| 318 | 先天性表皮水疱症（接合部型） | ORPHA:305 | Junctional epidermolysis bullosa | `JEB` → `JEB` |
| 330 | 常染色体劣性多発性嚢胞腎 | ORPHA:731 | Autosomal recessive polycystic kidney disease | `ARPKD` → `AR-PKD` |
| 353 | 骨髄性プロトポルフィリン症 | ORPHA:79278 | Autosomal erythropoietic protoporphyria | `EPP` → `EPP` |
| 358 | 脊髄小脳変性症3型 | ORPHA:98757 | Spinocerebellar ataxia type 3 | `SCA3` → `SCA3` |
| 389 | Beckwith-Wiedemann症候群 | ORPHA:116 | Beckwith-Wiedemann syndrome | `BWS` → `BWS` |
| 421 | Coffin-Siris症候群 | ORPHA:1465 | Coffin-Siris syndrome | `CSS` → `CSS` |
| 425 | Friedreich失調症 | ORPHA:95 | Friedreich ataxia | `FRDA` → `FRDA` |
| 430 | Saethre-Chotzen症候群 | ORPHA:794 | Saethre-Chotzen syndrome | `SCS` → `SCS` |
| 431 | Schinzel-Giedion症候群 | ORPHA:798 | Schinzel-Giedion syndrome | `SGS` → `SGS` |
| 449 | Bardet-Biedl症候群 | ORPHA:110 | Bardet-Biedl syndrome | `BBS` → `BBS` |
| 458 | Diamond-Blackfan貧血 | ORPHA:124 | Diamond-Blackfan anemia | `DBA` → `DBA` |
| 460 | Shwachman-Diamond症候群 | ORPHA:811 | Shwachman-Diamond syndrome | `SDS` → `SDS` |
| 468 | Sturge-Weber症候群 | ORPHA:3205 | Sturge-Weber syndrome | `SWS` → `SWS` |
| 469 | Klippel-Trenaunay症候群 | ORPHA:90308 | Capillary-lymphatic-venous malformation with segmental distribution | `KTS` → `KTS` |
| 478 | 自己免疫性リンパ増殖症候群 | ORPHA:3261 | Autoimmune lymphoproliferative syndrome | `ALPS` → `ALPS` |
| 486 | Pelizaeus-Merzbacher病 | ORPHA:702 | Pelizaeus-Merzbacher disease | `PMD` → `PMD` |
| 508 | Dravet症候群 | ORPHA:33069 | Dravet syndrome | `SMEI` → `SMEI` |
| 514 | 進行性ミオクローヌスてんかん（Unverricht-Lundborg型） | ORPHA:308 | Progressive myoclonic epilepsy type 1 | `EPM1` → `EPM1` |
| 515 | Lafora病 | ORPHA:501 | Lafora disease | `EPM2` → `EPM2` |
| 526 | 中鎖アシルCoA脱水素酵素欠損症 | ORPHA:42 | Medium chain acyl-CoA dehydrogenase deficiency | `MCAD Deficiency` → `MCAD deficiency` |
| 531 | カルバミルリン酸合成酵素I欠損症 | ORPHA:147 | Carbamoyl-phosphate synthetase 1 deficiency | `CPS1 Deficiency` → `CPS1 deficiency` |
| 532 | N-アセチルグルタミン酸合成酵素欠損症 | ORPHA:927 | Hyperammonemia due to N-acetylglutamate synthase deficiency | `NAGS Deficiency` → `NAGS deficiency` |
| 534 | 先天性グリコシル化異常症 | ORPHA:137 | Congenital disorder of glycosylation | `CDG` → `CDG` |
| 536 | Smith-Lemli-Opitz症候群 | ORPHA:818 | Smith-Lemli-Opitz syndrome | `SLOS` → `SLOS` |
| 544 | Wolcott-Rallison症候群 | ORPHA:1667 | Wolcott-Rallison syndrome | `WRS` → `WRS` |
| 548 | Lowe症候群 | ORPHA:534 | Oculocerebrorenal syndrome of Lowe | `OCRL` → `OCRL` |
| 561 | エメリー・ドレイフス型筋ジストロフィー | ORPHA:261 | Emery-Dreifuss muscular dystrophy | `EDMD` → `EDMD` |
| 566 | Barth症候群 | ORPHA:111 | Barth syndrome | `BTHS` → `BTHS` |
| 580 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | ORPHA:832 | Succinyl-CoA:3-oxoacid CoA transferase deficiency | `SCOT Deficiency` → `SCOT deficiency` |
| 581 | ミトコンドリア三機能蛋白欠損症 | ORPHA:5 | Long chain 3-hydroxyacyl-CoA dehydrogenase deficiency | `LCHAD Deficiency` → `LCHAD deficiency` |
| 583 | D-2-ヒドロキシグルタル酸尿症 | ORPHA:79315 | D-2-hydroxyglutaric aciduria | `D2HGA` → `D-2-HGA` |
| 584 | L-2-ヒドロキシグルタル酸尿症 | ORPHA:79314 | L-2-hydroxyglutaric aciduria | `L2HGA` → `L-2-HGA` |
| 595 | Andersen-Tawil症候群 | ORPHA:37553 | Andersen-Tawil syndrome | `LQT7` → `LQT7` |
| 596 | Timothy症候群 | ORPHA:65283 | Timothy syndrome | `LQT8` → `LQT8` |
| 599 | Conradi-Hünermann-Happle症候群 | ORPHA:35173 | X-linked dominant chondrodysplasia punctata | `CDPX2` → `CDPX2` |
| 603 | 骨幹端異形成症(Schmid型) | ORPHA:174 | Metaphyseal chondrodysplasia, Schmid type | `SMCD` → `SMCD` |
| 624 | DADA2 | ORPHA:404553 | Deficiency of adenosine deaminase 2 | `DADA2` → `DADA2` |
| 644 | Townes-Brocks症候群 | ORPHA:857 | Townes-Brocks syndrome | `TBS` → `TBS` |
| 652 | 遺伝性感覚性ニューロパチーI型 | ORPHA:36386 | Hereditary sensory and autonomic neuropathy type 1 | `HSAN I` → `HSAN1` |
| 656 | Stiff-Person症候群 | ORPHA:3198 | Stiff person spectrum disorder | `SPS` → `SPS` |
| 670 | 遺伝性出血性毛細血管拡張症 | ORPHA:774 | Hereditary hemorrhagic telangiectasia | `HHT` → `HHT` |
| 672 | 脊髄小脳変性症1型 | ORPHA:98755 | Spinocerebellar ataxia type 1 | `SCA1` → `SCA1` |
| 673 | 脊髄小脳変性症2型 | ORPHA:98756 | Spinocerebellar ataxia type 2 | `SCA2` → `SCA2` |
| 674 | 脊髄小脳変性症7型 | ORPHA:94147 | Spinocerebellar ataxia type 7 | `SCA7` → `SCA7` |
| 678 | 遺伝性痙性対麻痺11型 | ORPHA:2822 | Autosomal recessive spastic paraplegia type 11 | `SPG11` → `SPG11` |
| 679 | 遺伝性びまん性白質脳症球状封入体型 | ORPHA:313808 | Adult-onset leukoencephalopathy with axonal spheroids and pigmented glia | `HDLS` → `HDLS` |
| 685 | von Hippel-Lindau病 | ORPHA:892 | Von Hippel-Lindau disease | `VHL` → `VHL` |
| 688 | Peutz-Jeghers症候群 | ORPHA:2869 | Peutz-Jeghers syndrome | `PJS` → `PJS` |
| 691 | 多発性内分泌腫瘍症2A型 | ORPHA:247698 | Multiple endocrine neoplasia type 2A | `MEN2A` → `MEN2A` |
| 692 | 多発性内分泌腫瘍症2B型 | ORPHA:247709 | Multiple endocrine neoplasia type 2B | `MEN2B` → `MEN2B` |
| 698 | Rothmund-Thomson症候群 | ORPHA:2909 | Rothmund-Thomson syndrome | `RTS` → `RTS` |
| 700 | Ataxia with oculomotor apraxia type 2 | ORPHA:64753 | Spinocerebellar ataxia with axonal neuropathy type 2 | `AOA2` → `AOA2` |
| 707 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | ORPHA:415 | Hyperornithinemia-hyperammonemia-homocitrullinuria syndrome | `HHH Syndrome` → `HHH syndrome` |
| 709 | 先天性筋ジストロフィー（メロシン欠損型） | ORPHA:258 | Laminin subunit alpha 2-related congenital muscular dystrophy | `MDC1A` → `MDC1A` |
| 710 | Ullrich型先天性筋ジストロフィー | ORPHA:75840 | Ullrich congenital muscular dystrophy | `UCMD` → `UCMD` |
| 720 | PLA2G6関連神経変性 | ORPHA:329303 | PLA2G6-related neurodegeneration | `PLAN` → `PLAN` |
| 721 | β-プロペラ蛋白関連神経変性 | ORPHA:329284 | Beta-propeller protein-associated neurodegeneration | `BPAN` → `BPAN` |
| 724 | Huntington病様2 | ORPHA:98934 | Huntington disease-like 2 | `HDL2` → `HDL2` |
| 725 | McLeod症候群 | ORPHA:59306 | McLeod neuroacanthocytosis syndrome | `MLS` → `MLS` |
| 735 | 特発性基底核石灰化症 | ORPHA:1980 | Bilateral striopallidodentate calcinosis | `PFBC` → `PFBC` |
| 804 | Coffin-Lowry症候群 | ORPHA:192 | Coffin-Lowry syndrome | `CLS` → `CLS` |
| 810 | Netherton症候群 | ORPHA:634 | Netherton syndrome | `NS` → `NS` |
| 822 | 遺伝性掌蹠角化症（Papillon-Lefèvre症候群） | ORPHA:678 | Papillon-Lefèvre syndrome | `PLS` → `PLS` |
| 836 | Gray Platelet症候群 | ORPHA:721 | Gray platelet syndrome | `GPS` → `GPS` |
| 848 | 遺伝性血小板減少症(MYH9関連疾患) | ORPHA:182050 | MYH9-related syndromic thrombocytopenia | `MYH9-RD` → `MYH9-RD` |
| 873 | Allan-Herndon-Dudley症候群 | ORPHA:59 | Allan-Herndon-Dudley syndrome | `AHDS` → `AHDS` |
| 889 | コエンザイムQ10欠損症 | ORPHA:35656 | Coenzyme Q10 deficiency | `CoQ10 Deficiency` → `CoQ10 deficiency` |
| 897 | D-2ヒドロキシグルタル酸尿症 | ORPHA:79315 | D-2-hydroxyglutaric aciduria | `D-2-HGA` → `D-2-HGA` |
| 898 | L-2ヒドロキシグルタル酸尿症 | ORPHA:79314 | L-2-hydroxyglutaric aciduria | `L-2-HGA` → `L-2-HGA` |
| 903 | 新生児重症副甲状腺機能亢進症 | ORPHA:417 | Neonatal severe primary hyperparathyroidism | `NSHPT` → `NSHPT` |
| 910 | Schwartz-Jampel症候群 | ORPHA:800 | Schwartz-Jampel syndrome | `SJS` → `SJS` |
| 943 | 遺伝性ニューロパチー（GDAP1型） | ORPHA:99948 | Charcot-Marie-Tooth disease type 4A | `CMT4A` → `CMT4A` |
| 956 | カルニチンパルミトイルトランスフェラーゼ1A欠損症 | ORPHA:156 | Carnitine palmitoyl transferase 1A deficiency | `CPT1A Deficiency` → `CPT1A deficiency` |
| 957 | Short-Chain Acyl-CoA Dehydrogenase欠損症 | ORPHA:26792 | Short chain acyl-CoA dehydrogenase deficiency | `SCADD` → `SCADD` |
| 977 | Robin sequence | ORPHA:718 | Isolated Pierre Robin sequence | `PRS` → `PRS` |
| 988 | Usher症候群1型 | ORPHA:231169 | Usher syndrome type 1 | `USH1` → `USH1` |
| 989 | Usher症候群2型 | ORPHA:231178 | Usher syndrome type 2 | `USH2` → `USH2` |
| 990 | Usher症候群3型 | ORPHA:231183 | Usher syndrome type 3 | `USH3` → `USH3` |
| 995 | Waardenburg症候群1型 | ORPHA:894 | Waardenburg syndrome type 1 | `WS1` → `WS1` |
| 996 | Waardenburg症候群2型 | ORPHA:895 | Waardenburg syndrome type 2 | `WS2` → `WS2` |

## 6. ライソゾーム病・糖原病の結果

ファウンダーの専門領域として個別に確認した。対象は日本語名・別名から手で選んだ（機械抽出ではない）。

### 6.1 ライソゾーム病（31 件）

| index | 疾患名（日本語） | 現 ORPHA（Orphanet 推奨名） | 今回の結果 | 根拠 |
|--:|---|---|---|---|
| 0 | ファブリー病 | ORPHA:324（Fabry disease） | 前回 A（今回も A） |  |
| 1 | ムコ多糖症I型 | ORPHA:93473（Hurler syndrome） | レビュー表 §2（略号 → ORPHA:579 Mucopolysaccharidosis type 1） | `MPS I` |
| 2 | ムコ多糖症II型 | ORPHA:580（Mucopolysaccharidosis type 2） | **A に昇格**（現番号を裏付け） | `Hunter syndrome` = Hunter syndrome |
| 3 | ゴーシェ病 | ORPHA:355（Gaucher disease） | 前回 A（今回も A） |  |
| 4 | ポンペ病 | ORPHA:365（Glycogen storage disease due to acid maltase deficiency） | **D のまま** | 英語名なし |
| 5 | ニーマン・ピック病C型 | ORPHA:644（NARP syndrome） | 前回 B（今回も B） |  |
| 71 | ライソゾーム病 | （なし） | **D のまま** | 英語名: Lysosomal Storage Disease, LSD |
| 91 | シスチン症 | ORPHA:213（Cystinosis） | 前回 A（今回も A） |  |
| 144 | ムコ多糖症III型 | ORPHA:581（Mucopolysaccharidosis type 3） | **A に昇格**（現番号を裏付け） | `Sanfilippo Syndrome` = Sanfilippo syndrome |
| 145 | ムコ多糖症IV型 | ORPHA:582（Mucopolysaccharidosis type 4） | **A に昇格**（現番号を裏付け） | `Morquio Syndrome` = Morquio disease |
| 146 | ムコ多糖症VI型 | ORPHA:583（Mucopolysaccharidosis type 6） | **A に昇格**（現番号を裏付け） | `Maroteaux-Lamy Syndrome` = Maroteaux-Lamy disease |
| 147 | 酸性スフィンゴミエリナーゼ欠損症 | ORPHA:618（Familial melanoma） | レビュー表 §2（略号 → ORPHA:618899 Acid sphingomyelinase deficiency） | `ASMD` |
| 148 | CLN2病 | （なし） | **D のまま** | 英語名なし |
| 284 | ムコリピドーシスII型 | ORPHA:576（Mucolipidosis type II） | **A に昇格**（現番号を裏付け） | `I-cell Disease` = I-cell disease |
| 285 | マンノシドーシス | ORPHA:61（Alpha-mannosidosis） | **D のまま** | 英語名なし |
| 286 | フコシドーシス | ORPHA:349（Fucosidosis） | 前回 A（今回も A） |  |
| 325 | ガラクトシアリドーシス | ORPHA:351（Galactosialidosis） | 前回 A（今回も A） |  |
| 354 | ウォルマン病 | ORPHA:75233（Wolman disease） | 前回 A（今回も A） |  |
| 487 | Krabbe病 | ORPHA:487（Krabbe disease） | **A に昇格**（現番号を裏付け） | `Globoid Cell Leukodystrophy` = Globoid cell leukodystrophy |
| 488 | 異染性白質ジストロフィー | ORPHA:512（Metachromatic leukodystrophy） | 前回 A（今回も A） |  |
| 489 | Niemann-Pick病B型 | ORPHA:77293（Chronic visceral acid sphingomyelinase deficiency） | **D のまま** | 英語名: NPB |
| 490 | GM1ガングリオシドーシス | ORPHA:354（GM1 gangliosidosis） | 前回 A（今回も A） |  |
| 491 | GM2ガングリオシドーシス（サンドホフ病） | ORPHA:796（Sandhoff disease） | 前回 A（今回も A） |  |
| 492 | 多発性スルファターゼ欠損症 | ORPHA:585（Multiple sulfatase deficiency） | 前回 A（今回も A） |  |
| 493 | Pompe病（乳児型） | （なし） | **D のまま** | 英語名: IOPD, Infantile-Onset Pompe Disease |
| 236 | グリコーゲン蓄積症II型 | （なし） | **C（提案）** → ORPHA:420429 Glycogen storage disease due to acid maltase deficiency, late-onset | `Pompe Disease Late-Onset` = Pompe disease, late-onset |
| 537 | Niemann-Pick病A型 | ORPHA:77292（Infantile neurovisceral acid sphingomyelinase deficiency） | **D のまま** | 英語名: NPA |
| 538 | シアリドーシス | ORPHA:3166（Sialuria） | **B（提案）** → ORPHA:309294 Sialidosis | `Sialidosis` = Sialidosis |
| 543 | セロイドリポフスチン症 | ORPHA:281（Monosomy 5p syndrome） | **B（提案）** → ORPHA:216 Neuronal ceroid lipofuscinosis | `Neuronal Ceroid Lipofuscinosis` = Neuronal ceroid lipofuscinosis |
| 594 | Danon病 | ORPHA:34587（Danon disease） | 前回 A（今回も A） |  |
| 605 | ピクノジソストーシス | ORPHA:763（Pycnodysostosis） | 前回 A（今回も A） |  |

### 6.2 糖原病・グリコーゲン代謝（9 件、Pompe/Danon はライソゾーム病と重複）

| index | 疾患名（日本語） | 現 ORPHA（Orphanet 推奨名） | 今回の結果 | 根拠 |
|--:|---|---|---|---|
| 4 | ポンペ病 | ORPHA:365（Glycogen storage disease due to acid maltase deficiency） | **D のまま** | 英語名なし |
| 95 | 糖原病 | （なし） | **C（提案）** → ORPHA:79201 Glycogen storage disease | `Glycogen Storage Disease` = Glycogen storage disease |
| 236 | グリコーゲン蓄積症II型 | （なし） | **C（提案）** → ORPHA:420429 Glycogen storage disease due to acid maltase deficiency, late-onset | `Pompe Disease Late-Onset` = Pompe disease, late-onset |
| 493 | Pompe病（乳児型） | （なし） | **D のまま** | 英語名: IOPD, Infantile-Onset Pompe Disease |
| 515 | Lafora病 | ORPHA:501（Lafora disease） | **A に昇格**（現番号を裏付け）（略号による） | `EPM2` = EPM2 |
| 523 | 糖原病Ia型 | ORPHA:364（Glycogen storage disease due to glucose-6-phosphatase deficiency） | **A に昇格**（現番号を裏付け） | `Von Gierke Disease` = Von Gierke disease |
| 524 | 糖原病III型 | ORPHA:366（Glycogen storage disease due to glycogen debranching enzyme deficiency） | **A に昇格**（現番号を裏付け） | `Cori Disease` = Cori disease |
| 525 | 糖原病V型 | ORPHA:368（Glycogen storage disease due to muscle glycogen phosphorylase deficiency） | **A に昇格**（現番号を裏付け） | `McArdle Disease` = McArdle disease |
| 594 | Danon病 | ORPHA:34587（Danon disease） | 前回 A（今回も A） |  |

- ライソゾーム病: 前回 D 18 件のうち、A 昇格 6、提案（B/C）3、レビュー表 2、D のまま 7
- 糖原病: 前回 D 8 件のうち、A 昇格 4、提案 2、D のまま 2
- **人名系の同義語（Hunter / Sanfilippo / Morquio / Maroteaux-Lamy / I-cell / Krabbe / Von Gierke / Cori / McArdle）はすべて当たった。** 前回の仮説（推奨名しか無いことが主因）は裏付けられた
- 残るのは (a) 英語名を持たないレコード（ポンペ病 idx 4、CLN2病 idx 148、マンノシドーシス idx 285）、(b) 略号しか無いレコード（Niemann-Pick A/B の `NPA`/`NPB`。Orphanet の同義語にはこの略号が無い）、(c) 語順が違うもの（`Infantile-Onset Pompe Disease` vs Orphanet `Pompe disease, infantile onset`）。(a)(b) は知識ファイル側に英語名を足すのが本筋
- ムコ多糖症I型（idx 1）: 現番号 93473 = Hurler syndrome（亜型）、略号 `MPS I` は 579 = MPS 1（群）に当たる。日本語名は群名なので付け替え候補だが、略号一致のためレビュー表 §2 に置いた
- 酸性スフィンゴミエリナーゼ欠損症（idx 147）: 現 618 = **Familial melanoma（無関係）**、略号 `ASMD` は 618899 = Acid sphingomyelinase deficiency に当たる。現番号は明らかに誤りだが、当たったのが略号のみなのでレビュー表 §2 に置いた（採用が妥当と考える）
- シアリドーシス（idx 538）: 現 3166 = Sialuria（別疾患）→ 309294 Sialidosis。セロイドリポフスチン症（idx 543）: 現 281 = Monosomy 5p（無関係）→ 216 NCL。どちらも B で提案

## 7. 現番号の検証（645 種、701 レコード）

### 7.1 状態の内訳

| 状態（en_product1.xml 2026-06-23） | 番号数 | レコード数 |
|---|---:|---:|
| Active | 606 | 659 |
| 存在しない | 15 | 15 |
| Inactive/Obsolete entity | 8 | 8 |
| Inactive/Deprecated entity | 7 | 8 |
| Inactive/Non-rare disease in Europe | 6 | 8 |
| Historical entity | 3 | 3 |

非現役 21 種のうち Obsolete 8、Deprecated 7、Non-rare in Europe 6。2025 版 Pack でも同じ 21 種が Inactive（2025→2026 の差は現番号の範囲では無し）。

### 7.2 非現役の番号（21 種）と Orphanet の移行先

| 現 ORPHA | Orphanet 名 | 状態 | 移行先（Moved to = 統合先 / Referred to = 参照先） | 持っているレコード | 今回の扱い |
|---|---|---|---|---|---|
| ORPHA:77 | OBSOLETE: Aniridia | Inactive/Obsolete entity | Referred to → ORPHA:88632 Anterior segment developmental anomaly | 795 先天性無虹彩症 | idx 795: レビュー §3 |
| ORPHA:206 | NON RARE IN EUROPE: Crohn disease | Inactive/Non-rare disease in Europe | ― | 66 クローン病; 920 Sarcoglycan関連肢帯型筋ジストロフィー | idx 66: レビュー §3; idx 920: B 提案 |
| ORPHA:374 | Goldenhar syndrome | Inactive/Deprecated entity | Moved to → ORPHA:141132 Craniofacial microsomia | 978 Goldenhar症候群 | idx 978: 前回 B（承認済み修正あり） |
| ORPHA:406 | NON RARE IN EUROPE: Heterozygous familial hypercholesterolemia | Inactive/Non-rare disease in Europe | ― | 303 家族性高コレステロール血症 | idx 303: レビュー §2 |
| ORPHA:484 | NON RARE IN EUROPE: Klinefelter syndrome | Inactive/Non-rare disease in Europe | ― | 51 クラインフェルター症候群; 717 Klinefelter症候群 | idx 51: レビュー §3; idx 717: D のまま |
| ORPHA:553 | OBSOLETE: Cushing syndrome | Inactive/Obsolete entity | Referred to → ORPHA:641613 Endogenous Cushing syndrome | 120 クッシング症候群 | idx 120: 前回 B（却下・現番号維持） |
| ORPHA:555 | NON RARE IN EUROPE: Celiac disease | Inactive/Non-rare disease in Europe | ― | 769 セリアック病 | idx 769: レビュー §3 |
| ORPHA:771 | NON RARE IN EUROPE: Ulcerative colitis | Inactive/Non-rare disease in Europe | ― | 67 潰瘍性大腸炎 | idx 67: レビュー §3 |
| ORPHA:802 | NON RARE IN EUROPE: Multiple sclerosis | Inactive/Non-rare disease in Europe | ― | 33 多発性硬化症 | idx 33: レビュー §3 |
| ORPHA:1564 | Dandy-Walker malformation-facial hemangioma syndrome | Inactive/Deprecated entity | Moved to → ORPHA:42775 PHACE syndrome | 770 自己免疫性腸症 | idx 770: B 提案 |
| ORPHA:1572 | OBSOLETE: Common variable immunodeficiency | Inactive/Obsolete entity | Referred to → ORPHA:696851 Common variable immunodeficiency and related disorders | 152 分類不能型免疫不全症 | idx 152: レビュー §3 |
| ORPHA:2284 | OBSOLETE: Primary T cell immunodeficiency | Inactive/Obsolete entity | Referred to → ORPHA:179006 Primary immunodeficiency due to a defect in adaptive immunity | 600 Desbuquois骨異形成症 | idx 600: レビュー §2 |
| ORPHA:2615 | Nakajo-Nishimura syndrome | Inactive/Deprecated entity | Moved to → ORPHA:324977 Proteasome-associated autoinflammatory syndrome | 631 中條-西村症候群 | idx 631: レビュー §3 |
| ORPHA:2816 | Spastic paraplegia-epilepsy-intellectual disability syndrome | Inactive/Deprecated entity | Moved to → ORPHA:71277 Classic glucose transporter type 1 deficiency syndrome | 999 COACH症候群 | idx 999: D のまま |
| ORPHA:3451 | West syndrome | Inactive/Deprecated entity | Moved to → ORPHA:697160 Infantile epileptic spasms syndrome | 172 ウエスト症候群; 510 West症候群 | idx 172: レビュー §2; idx 510: D のまま |
| ORPHA:34527 | OBSOLETE: Familial primary hypomagnesemia with normocalciuria and normocalcemia | Inactive/Obsolete entity | Referred to → ORPHA:93603 Rare renal tubular disease | 763 先天性腎性マグネシウム喪失症 | idx 763: レビュー §2 |
| ORPHA:97556 | Congenital and infantile nephrotic syndrome | Inactive/Deprecated entity | Moved to → ORPHA:564127 Genetic nephrotic syndrome | 42 IgA腎症 | idx 42: B 提案 |
| ORPHA:98692 | OBSOLETE: Nervous system anomaly with eye involvement | Inactive/Obsolete entity | Referred to → ORPHA:140653 Neuro-ophthalmological disease | 787 先天性線維症症候群 | idx 787: 前回 B（承認済み修正あり） |
| ORPHA:139491 | OBSOLETE: Hemochromatosis type 4 | Inactive/Obsolete entity | Referred to → ORPHA:647834 SLC40A1-related hemochromatosis | 746 遺伝性鉄過剰症(フェロポルチン病) | idx 746: B 提案 |
| ORPHA:163908 | OBSOLETE: Limbic encephalitis with LGI1 antibodies | Inactive/Obsolete entity | Referred to → ORPHA:622014 Autoimmune encephalitis | 658 抗LGI1抗体関連脳炎 | idx 658: D のまま |
| ORPHA:325004 | CANDLE syndrome | Inactive/Deprecated entity | Moved to → ORPHA:324977 Proteasome-associated autoinflammatory syndrome | 623 CANDLE症候群 | idx 623: D のまま |

**Non-rare disease in Europe** の 6 種（多発性硬化症・Klinefelter・Crohn・潰瘍性大腸炎・ヘテロ接合 FH・セリアック病）は Orphanet が「欧州では希少でない」として番号を非現役化したもの。番号自体は誤りではないが、希少疾患 DB として保持するかは方針判断。

### 7.3 Orphanet に存在しない番号（15 種）

en_product1.xml（2026）にも ORPHAnomenclature_en_2025.xml にも無い番号。過去に存在して削除された可能性もあるが、両ファイルは非現役番号も収録しているので、**そもそも発番されていない番号の可能性が高い**（例: 隣接番号の誤記）。

| 現 ORPHA | 持っているレコード | 今回の結果 |
|---|---|---|
| ORPHA:2100 | 211 慢性活動性EBウイルス感染症 | D のまま |
| ORPHA:2586 | 638 肺分画症 | D のまま |
| ORPHA:3321 | 893 トランスコバラミン欠損症 | D のまま |
| ORPHA:71015 | 850 ANKRD26関連血小板減少症 | D のまま |
| ORPHA:86500 | 298 成人T細胞白血病リンパ腫 | B 提案 → ORPHA:86875 |
| ORPHA:88948 | 762 常染色体優性尿細管間質性腎疾患(MUC1型) | レビュー §2 |
| ORPHA:90990 | 516 脂肪萎縮症 | D のまま |
| ORPHA:92065 | 777 Tufting Enteropathy | B 提案 → ORPHA:92050 |
| ORPHA:93401 | 925 VCP関連多系統蛋白症 | B 提案 → ORPHA:52430 |
| ORPHA:100987 | 863 遺伝性痙性対麻痺5A型 | D のまま |
| ORPHA:137163 | 926 BAG3関連ミオフィブリラーミオパチー | D のまま |
| ORPHA:180469 | 440 Potocki-Lupski症候群 | D のまま |
| ORPHA:228432 | 307 非ジストロフィー性ミオトニア | レビュー §2 |
| ORPHA:485641 | 965 先天性胆汁酸合成異常症(Δ4-3-oxosteroid型) | D のまま |
| ORPHA:512126 | 633 A20ハプロ不全症 | D のまま |

### 7.4 前回「対応表に無い」として D に落ちた 121 レコード（114 種）の実体

| 実体（en_product1.xml の分類レベル） | 番号数 |
|---|---:|
| Group of disorders/Clinical group | 34 |
| 非現役 | 21 |
| Disorder/Disease | 17 |
| Orphanet に存在しない | 15 |
| Group of disorders/Category | 12 |
| Subtype of disorder/Clinical subtype | 8 |
| Subtype of disorder/Etiological subtype | 3 |
| Disorder/Morphological anomaly | 2 |
| Disorder/Malformation syndrome | 2 |

phenotype.hpoa に無かった理由は、群・カテゴリ（HPO 注釈が付かない）46 種、非現役 21 種、存在しない番号 15 種、HPO 注釈が無いだけの現役疾患・亜型 32 種。前回の見積もり（群コードや注釈無しの正しい番号が多い）は概ね合っていたが、**非現役と存在しない番号が合わせて 36 種（32%）** あった。

### 7.5 前回却下した 3 件の現番号

| index | 疾患名 | 現 ORPHA | Orphanet 名（分類レベル） | 状態 | 同義語 | 所見 |
|--:|---|---|---|---|---|---|
| 47 | 全身性アミロイドーシス | ORPHA:69 | Amyloidosis（Group of disorders/Category） | Active | （なし） | 群（Category）として現役。「疾患群」という却下理由と整合。**却下維持で問題なし** |
| 120 | クッシング症候群 | ORPHA:553 | OBSOLETE: Cushing syndrome（Group of disorders/Clinical group） | **Inactive/Obsolete entity** | OBSOLETE: Hyperadrenocorticism, OBSOLETE: Hypercortisolism | **現番号は廃止済み。** Orphanet は Referred to → ORPHA:641613 Endogenous Cushing syndrome を参照先としている。却下理由（Cushing disease は下位概念）は正しいが、553 を維持すると廃止番号を持ち続けることになる。**再検討候補（§8）** |
| 726 | 良性家族性舞踏病 | ORPHA:1429 | Benign hereditary chorea（Disorder/Disease） | Active | BHC, Benign familial chorea | 同義語 `Benign familial chorea` が日本語名の直訳。**却下維持（現番号が正しい）を裏付け** |

## 8. 再検討候補（前回判定と異なる結果が出たもの。前回判定は上書きしていない）

| index | 疾患名 | 前回判定 | 今回の結果 | 論点 |
|--:|---|---|---|---|
| 474 | 遺伝性リンパ浮腫 | B 承認: 2165 → **79452** Milroy disease | 複数候補: `Primary Lymphedema` → **77240** Primary lymphedema（Group of disorders/Category）、`Milroy Disease` → 79452（Disorder/Disease） | phenotype.hpoa には 77240（群）が無かったため一意に見えた。日本語名「遺伝性リンパ浮腫」は群名寄り。Milroy（FLT4 型）に限定してよいか |
| 120 | クッシング症候群 | 却下（553 維持） | 553 は **Obsolete**。Referred to → 641613 Endogenous Cushing syndrome（Group of disorders/Category） | 廃止番号を維持するか、Orphanet の参照先 641613 に移すか。96253 Cushing disease への変更を却下した判断とは矛盾しない |
| 14 | MELAS症候群 | C 承認: → 550 | 今回の規則では `MELAS` は略号扱い（レビュー表 §2 相当）だが、当たった番号は 550 のみで前回と同じ | 前回は「推奨名そのものが略号」の例外で採用。結果は変わらないので**承認維持** |

前回「接尾辞英訳」で個別承認した 4 件の同義語による検証: idx 612 Ellis-van Creveld（289）は `Chondroectodermal Dysplasia` で、idx 655 Morvan（83467）は `Morvan Fibrillary Chorea` で**承認番号と一致**。idx 722 Kufor-Rakeb（306674）は略号 `PARK9` で一致（弱い裏付け）。idx 835 Bernard-Soulier（274）は英語名が無く検証できず。

## 9. 残る D 359 件の分析

### 9.1 理由の内訳

| 理由 | 現番号あり（Orphanet に存在） | 現番号あり（存在しない番号） | 現番号なし | 合計 |
|---|---:|---:|---:|---:|
| 英語名はあるが対応表に無し | 100 | 5 | 140 | 245 |
| 略号のみ | 67 | 5 | 23 | 95 |
| 英語名なし | 13 | 0 | 6 | 19 |
| 合計 | 180 | 10 | 169 | 359 |

### 9.2 英語名があるのに当たらない理由（最近傍ラベルとの差の型、参考・提案ではない）

英語名を持つ残り D について、現役エンティティの全ラベル（24,310）に対する bigram Dice 最大のラベルを求め、差の型を機械分類した。

| 差の型 | 件数 | 例 |
|---|---:|---|
| 記述の差（0.6〜0.8） | 69 | `Familial Benign Pemphigus` vs `Benign chronic familial pemphigus`; `Eosinophilic Otitis Media` vs `Eosinophilic colitis` |
| 別名が短い（Orphanet 側は亜型・限定名） | 60 | `Methylglutaconic Aciduria` vs `3-methylglutaconic aciduria`; `Resistance to Thyroid Hormone` vs `Resistance to thyroid hormone beta` |
| 綴り・語形の差（0.8 以上） | 38 | `TC II Deficiency` vs `TCI deficiency`; `Cerebellar Vermis Hypoplasia-Oligophrenia-Ataxia-Coloboma-Hepatic Fibrosis` vs `Cerebellar vermis hypoplasia-oligophrenia-congenital ataxia-coloboma-hepatic fibrosis` |
| 遠い（0.5〜0.6） | 35 | `Neuromyotonia` vs `Myotonic syndrome`; `Severe IgAN` vs `Severe PMD` |
| 別名が長い（Orphanet 側は上位・短い名） | 18 | `CPT2 Deficiency` vs `T2 deficiency`; `Chronic Progressive External Ophthalmoplegia` vs `Progressive external ophthalmoplegia` |
| 近いものが無い（0.5 未満） | 14 | `Surfactant Dysfunction Disorders` vs `Anti-platelet factor 4 disorder`; `ATTRv non-V30M` vs `ATTRV30M amyloidosis` |
| Orphanet 側に「Rare」接頭辞 | 5 | `Hyperparathyroidism` vs `Rare hyperparathyroidism`; `Hypoparathyroidism` vs `Rare hypoparathyroidism` |
| 語順の差 | 5 | `Tumor Necrosis Factor Receptor-Associated Periodic Syndrome` vs `Tumor necrosis factor receptor 1 associated periodic syndrome`; `Infantile-Onset Pompe Disease` vs `Pompe disease, infantile onset` |
| 単複の差 | 1 | `Myelodysplastic Syndromes` vs `Myelodysplastic syndrome` |

上位 3 型（「Rare」接頭辞・単複・語順）は正規化規則を 3 行足せば完全一致になる。ただし「Rare hyperparathyroidism」「Rare hypertrophic cardiomyopathy」は Orphanet が**希少な一部だけ**を指す群名であり、日本語名「副甲状腺機能亢進症」「肥大型心筋症」一般と同一視してよいかは疾患概念の判断になる。規則として採用するかはファウンダー判断（§9.4）。

### 9.3 最近傍 Dice 0.85 以上の一覧（参考。提案ではない）

| index | 疾患名 | 現 ORPHA | 英語別名 | 最近傍ラベル（ORPHA・推奨名） | Dice | 差の型 |
|--:|---|---|---|---|---:|---|
| 46 | 骨髄異形成症候群 | ORPHA:52 | `Myelodysplastic Syndromes` | `Myelodysplastic syndrome`（ORPHA:52688 Myelodysplastic syndrome） | 0.98 | 単複の差 |
| 408 | メチルグルタコン酸尿症 | ― | `Methylglutaconic Aciduria` | `3-methylglutaconic aciduria`（ORPHA:289902 3-methylglutaconic aciduria） | 0.98 | 別名が短い（Orphanet 側は亜型・限定名） |
| 179 | TRAPS | ORPHA:32960 | `Tumor Necrosis Factor Receptor-Associated Periodic Syndrome` | `Tumor necrosis factor receptor 1 associated periodic syndrome`（ORPHA:32960 Tumor necrosis factor receptor 1 associated periodic syndrome） | 0.97 | 語順の差 |
| 701 | 甲状腺ホルモン不応症 | ORPHA:853 | `Resistance to Thyroid Hormone` | `Resistance to thyroid hormone beta`（ORPHA:566243 Resistance to thyroid hormone due to a mutation in thyroid hormone receptor beta） | 0.96 | 別名が短い（Orphanet 側は亜型・限定名） |
| 493 | Pompe病（乳児型） | ― | `Infantile-Onset Pompe Disease` | `Pompe disease, infantile onset`（ORPHA:308552 Glycogen storage disease due to acid maltase deficiency, infantile onset） | 0.96 | 語順の差 |
| 893 | トランスコバラミン欠損症 | ORPHA:3321 | `TC II Deficiency` | `TCI deficiency`（ORPHA:2967 Haptocorrin deficiency） | 0.96 | 綴り・語形の差（0.8 以上） |
| 291 | 先天性巨大色素性母斑 | ORPHA:626 | `Giant Congenital Melanocytic Nevus` | `Large/giant congenital melanocytic nevus`（ORPHA:626 Large/giant congenital melanocytic nevus） | 0.95 | 別名が短い（Orphanet 側は亜型・限定名） |
| 999 | COACH症候群 | ORPHA:2816 | `Cerebellar Vermis Hypoplasia-Oligophrenia-Ataxia-Coloboma-Hepatic Fibrosis` | `Cerebellar vermis hypoplasia-oligophrenia-congenital ataxia-coloboma-hepatic fibrosis`（ORPHA:1454 Joubert syndrome with hepatic defect） | 0.95 | 綴り・語形の差（0.8 以上） |
| 945 | Ross症候群 | ― | `Ross Syndrome` | `Cross syndrome`（ORPHA:2719 Oculocerebral hypopigmentation syndrome, Cross type） | 0.95 | 別名が短い（Orphanet 側は亜型・限定名） |
| 141 | 副甲状腺機能亢進症 | ― | `Hyperparathyroidism` | `Rare hyperparathyroidism`（ORPHA:181408 Rare hyperparathyroidism） | 0.94 | Orphanet 側に「Rare」接頭辞 |
| 140 | 副甲状腺機能低下症 | ― | `Hypoparathyroidism` | `Rare hypoparathyroidism`（ORPHA:181405 Rare hypoparathyroidism） | 0.94 | Orphanet 側に「Rare」接頭辞 |
| 88 | 肥大型心筋症 | ORPHA:217569 | `Hypertrophic Cardiomyopathy` | `Rare hypertrophic cardiomyopathy`（ORPHA:217569 Rare hypertrophic cardiomyopathy） | 0.94 | Orphanet 側に「Rare」接頭辞 |
| 218 | 一次性膜性増殖性糸球体腎炎 | ― | `Membranoproliferative Glomerulonephritis` | `Primary membranoproliferative glomerulonephritis`（ORPHA:54370 Primary membranoproliferative glomerulonephritis） | 0.93 | 別名が短い（Orphanet 側は亜型・限定名） |
| 119 | 原発性アルドステロン症 | ― | `Primary Aldosteronism` | `Rare primary aldosteronism`（ORPHA:181415 Rare primary hyperaldosteronism） | 0.93 | Orphanet 側に「Rare」接頭辞 |
| 322 | メープルシロップ尿症（間欠型） | ― | `MSUD Intermittent` | `Intermittent MSUD`（ORPHA:268173 Intermittent maple syrup urine disease） | 0.92 | 語順の差 |
| 597 | 先天性QT短縮症候群 | ORPHA:51083 | `Short QT Syndrome` | `SHORT syndrome`（ORPHA:3163 SHORT syndrome） | 0.92 | 綴り・語形の差（0.8 以上） |
| 466 | 先天性アンチトロンビン欠乏症 | ― | `AT Deficiency` | `LCAT deficiency`（ORPHA:650 LCAT deficiency） | 0.92 | 別名が短い（Orphanet 側は亜型・限定名） |
| 578 | カルニチンパルミトイルトランスフェラーゼII欠損症 | ORPHA:228302 | `CPT2 Deficiency` | `T2 deficiency`（ORPHA:134 Beta-ketothiolase deficiency） | 0.92 | 別名が長い（Orphanet 側は上位・短い名） |
| 883 | 先天性高乳酸血症（PDH欠損症） | ORPHA:765 | `PDH Deficiency` | `LDH deficiency`（ORPHA:2364 Glycogen storage disease due to lactate dehydrogenase deficiency） | 0.92 | 綴り・語形の差（0.8 以上） |
| 899 | 先天性グルタミン合成酵素欠損症 | ORPHA:71278 | `GS Deficiency` | `NAGS deficiency`（ORPHA:927 Hyperammonemia due to N-acetylglutamate synthase deficiency） | 0.92 | 別名が短い（Orphanet 側は亜型・限定名） |
| 877 | 進行性外眼筋麻痺(ミトコンドリア) | ― | `Chronic Progressive External Ophthalmoplegia` | `Progressive external ophthalmoplegia`（ORPHA:520820 Progressive external ophthalmoplegia） | 0.91 | 別名が長い（Orphanet 側は上位・短い名） |
| 163 | シャルコー・マリー・トゥース病 | ORPHA:166 | `Charcot-Marie-Tooth Disease` | `Charcot-Marie-Tooth disease type 1`（ORPHA:65753 Charcot-Marie-Tooth disease type 1） | 0.91 | 別名が短い（Orphanet 側は亜型・限定名） |
| 496 | ビタミンD依存性くる病 | ORPHA:289157 | `Vitamin D Dependent Rickets` | `Vitamin D dependent rickets type I`（ORPHA:289157 Hypocalcemic vitamin D-dependent rickets） | 0.91 | 別名が短い（Orphanet 側は亜型・限定名） |
| 716 | Swyer症候群 | ORPHA:242 | `Pure Gonadal Dysgenesis` | `46,XX pure gonadal dysgenesis`（ORPHA:243 46,XX gonadal dysgenesis） | 0.91 | 別名が短い（Orphanet 側は亜型・限定名） |
| 868 | 肥厚性硬膜炎 | ― | `Hypertrophic Pachymeningitis` | `Idiopathic hypertrophic pachymeningitis`（ORPHA:449427 IgG4-related pachymeningitis） | 0.91 | 別名が短い（Orphanet 側は亜型・限定名） |
| 884 | 先天性高乳酸血症（PC欠損症） | ORPHA:3008 | `PC Deficiency` | `PCI deficiency`（ORPHA:71528 Obesity due to prohormone convertase I deficiency） | 0.91 | 綴り・語形の差（0.8 以上） |
| 74 | 表皮水疱症 | ORPHA:304 | `Epidermolysis Bullosa` | `Dermolytic epidermolysis bullosa`（ORPHA:303 Dystrophic epidermolysis bullosa） | 0.90 | 別名が短い（Orphanet 側は亜型・限定名） |
| 657 | 自己免疫性脳炎（抗NMDA受容体） | ORPHA:217253 | `Anti-NMDAR Encephalitis` | `anti-NMDA receptor encephalitis`（ORPHA:217253 NMDA receptor encephalitis） | 0.90 | 綴り・語形の差（0.8 以上） |
| 111 | 肺胞蛋白症 | ORPHA:747 | `Pulmonary Alveolar Proteinosis` | `Secondary pulmonary alveolar proteinosis`（ORPHA:420259 Secondary pulmonary alveolar proteinosis） | 0.90 | 別名が短い（Orphanet 側は亜型・限定名） |
| 157 | 神経内分泌腫瘍 | ― | `Neuroendocrine Tumor` | `Genetic neuroendocrine tumor`（ORPHA:271847 Genetic neuroendocrine tumor） | 0.89 | 別名が短い（Orphanet 側は亜型・限定名） |
| 243 | リンパ管腫 | ― | `Lymphatic Malformation` | `Rare lymphatic malformation`（ORPHA:2415 Rare lymphatic malformation） | 0.89 | Orphanet 側に「Rare」接頭辞 |
| 558 | 先天性線維型不均等症 | ORPHA:2020 | `Congenital Fiber Type Disproportion` | `Congenital fiber-type disproportion myopathy`（ORPHA:2020 Congenital fiber-type disproportion myopathy） | 0.89 | 別名が短い（Orphanet 側は亜型・限定名） |
| 106 | 天疱瘡 | ORPHA:704 | `Pemphigus` | `IgA pemphigus`（ORPHA:555905 IgA pemphigus） | 0.89 | 別名が短い（Orphanet 側は亜型・限定名） |
| 768 | 先天性肝線維症 | ORPHA:2031 | `Congenital Hepatic Fibrosis` | `Isolated congenital hepatic fibrosis`（ORPHA:485426 Isolated congenital hepatic fibrosis） | 0.89 | 別名が短い（Orphanet 側は亜型・限定名） |
| 840 | 先天性プラスミノゲン欠損症 | ORPHA:722 | `Plasminogen Deficiency` | `Plasminogen deficiency type 1`（ORPHA:722 Hypoplasminogenemia） | 0.88 | 別名が短い（Orphanet 側は亜型・限定名） |
| 506 | 16p11.2欠失症候群 | ORPHA:261211 | `16p11.2 Deletion` | `11p11.2 deletion`（ORPHA:52022 Potocki-Shaffer syndrome） | 0.88 | 語順の差 |
| 542 | 亜硫酸酸化酵素欠損症 | ORPHA:833 | `Sulfite Oxidase Deficiency` | `Isolated sulfite oxidase deficiency`（ORPHA:99731 Isolated sulfite oxidase deficiency） | 0.88 | 別名が短い（Orphanet 側は亜型・限定名） |
| 896 | ピリドキサミン5リン酸氧化酵素欠損症 | ORPHA:79096 | `PNPO Deficiency` | `PNP deficiency`（ORPHA:760 Purine nucleoside phosphorylase deficiency） | 0.88 | 綴り・語形の差（0.8 以上） |
| 869 | 脊髄硬膜動静脈瘻 | ― | `Spinal Dural Arteriovenous Fistula` | `Acquired spinal dural arteriovenous fistula`（ORPHA:715307 Acquired spinal dural arteriovenous fistula） | 0.88 | 別名が短い（Orphanet 側は亜型・限定名） |
| 304 | リポ蛋白リパーゼ欠損症 | ORPHA:309015 | `Lipoprotein Lipase Deficiency` | `Familial lipoprotein lipase deficiency`（ORPHA:309015 Familial lipoprotein lipase deficiency） | 0.87 | 別名が短い（Orphanet 側は亜型・限定名） |
| 955 | 全身性カルニチン欠乏症 | ORPHA:158 | `Primary Carnitine Deficiency` | `Systemic primary carnitine deficiency`（ORPHA:158 Systemic primary carnitine deficiency） | 0.87 | 別名が短い（Orphanet 側は亜型・限定名） |
| 503 | 2q37欠失症候群 | ORPHA:1001 | `2q37 Deletion Syndrome` | `2q32q33 deletion syndrome`（ORPHA:251019 2q32q33 deletion syndrome） | 0.87 | 綴り・語形の差（0.8 以上） |
| 842 | 第V因子・第VIII因子複合欠損症 | ORPHA:35909 | `Combined FV/FVIII Deficiency` | `FV and FVIII combined deficiency`（ORPHA:35909 Combined deficiency of factor V and factor VIII） | 0.87 | 綴り・語形の差（0.8 以上） |
| 667 | IgG4関連涙腺・唾液腺炎 | ― | `Mikulicz Disease IgG4` | `Mikulicz disease`（ORPHA:79078 IgG4-related dacryoadenitis and sialadenitis） | 0.87 | 別名が長い（Orphanet 側は上位・短い名） |
| 708 | 遺伝性腎性低尿酸血症 | ― | `Renal Hypouricemia` | `Familial renal hypouricemia`（ORPHA:94088 Hereditary renal hypouricemia） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 647 | Fraser症候群 | ORPHA:2052 | `Cryptophthalmos Syndrome` | `Cryptophthalmos-syndactyly syndrome`（ORPHA:2052 Fraser syndrome） | 0.86 | 綴り・語形の差（0.8 以上） |
| 208 | ミトコンドリア脳筋症 | ― | `Mitochondrial Encephalomyopathy` | `Mitochondrial encephalomyopathy due to COXPD6`（ORPHA:238329 Severe X-linked mitochondrial encephalomyopathy） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 27 | プリオン病 | ― | `Creutzfeldt-Jakob Disease` | `Sporadic Creutzfeldt-Jakob disease`（ORPHA:204 Sporadic Creutzfeldt-Jakob disease） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 798 | 全色盲（CNGA3型） | ORPHA:49382 | `Achromatopsia CNGA3` | `Achromatopsia`（ORPHA:49382 Achromatopsia） | 0.86 | 別名が長い（Orphanet 側は上位・短い名） |
| 887 | 複合体IV欠損症（SCO2型） | ORPHA:2612 | `COX Deficiency` | `Benign COX deficiency`（ORPHA:254864 Mitochondrial myopathy with reversible cytochrome C oxidase deficiency） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 924 | TTN関連ミオパチー | ORPHA:609 | `Titinopathy` | `MFM-titinopathy`（ORPHA:178464 Hereditary myopathy with early respiratory failure） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 984 | 微小眼球症 | ORPHA:136 | `Microphthalmia` | `Lenz microphthalmia`（ORPHA:568 Microphthalmia, Lenz type） | 0.86 | 別名が短い（Orphanet 側は亜型・限定名） |
| 184 | 膜性腎症 | ― | `Membranous Nephropathy` | `Primary membranous nephropathy`（ORPHA:97560 Primary membranous glomerulonephritis） | 0.85 | 別名が短い（Orphanet 側は亜型・限定名） |
| 892 | 先天性intrinsic factor欠損症 | ORPHA:35858 | `Congenital IF Deficiency` | `Congenital F9 deficiency`（ORPHA:98879 Hemophilia B） | 0.85 | 綴り・語形の差（0.8 以上） |

### 9.4 次に取るべき手段（優先順）

1. **レビュー表の判定**（85 件）: 略号一致 60 件は 1 件 10 秒程度で採否が決まる。正しいものだけで 20〜30 件が解ける見込み
2. **正規化規則の追加をファウンダー承認の上で実施**: (a) Orphanet 側の `Rare ` 接頭辞を外す、(b) 末尾 `s` の単複、(c) 語順無視（語の多重集合一致）。9.2 の上位 3 型 11 件が対象。誤照合リスクは低いが、(a) は疾患概念の判断を伴う
3. **知識ファイルに英語名を足す**: 英語名なし 19 件、略号のみ 95 件は、正式英語名が 1 つあれば同じ手順で当たる。ポンペ病・CLN2 病・マンノシドーシス・Niemann-Pick A/B が含まれる。これは知識ファイルの変更なので別タスク
4. **上位群と亜型の関係を使った検証**: en_product1.xml の `DisorderDisorderAssociation` ではなく、Pack 内の分類ファイル（ORPHAclassification_*.xml）で親子関係を取れる。「別名が亜型、現番号が群」の型（idx 163 CMT、74 表皮水疱症、111 肺胞蛋白症）は親子関係が確認できれば A 相当と判定できる
5. **希少疾患でないもの・Orphanet に無いものの切り分け**: 最近傍 0.5 未満 14 件と Non-rare 6 種は、番号を持たせない判断が要る
6. Orphanet の日本語名は Orphadata に無い（`ja_product1.xml` は 404）。日本語名での照合は当面できない

## 10. 気づいた問題（指示外）

1. **GitHub ミラーの Pack が 1 年古い**（§1.1）。「JUL 2026」コミットで 2025 版 ZIP が置かれている。Orphanet 側のミスか、2026 版 Pack が未公開かは不明。SOURCE.md には実測の版（2025-06-24）を記録した
2. **知識ファイルの現番号のうち非現役 21 種・存在しない番号 15 種**（§7）。健全性調査（`docs/survey_kb_health_2026-08-29.md`）の「60 件の誤 ORPHA」に加わる新しい種類の問題。特に ORPHA:206（Crohn 病）を Sarcoglycan-LGMD が持つ、ORPHA:281（Monosomy 5p）を魚鱗癬とセロイドリポフスチン症が持つ、など**番号のコピーミス**が疑われる
3. **phenotype.hpoa に非現役番号が 8 件残っている**（§1.2）。HPO 側の注釈が Orphanet の廃止に追随していない。前回 A と判定した 218 件のうちこの 8 番号を持つものは無いことを確認済み（無し）
4. **略号の同義語は危険**（§2.4）。今後、略号を照合に使う場合は「略号 → 正式名」の辞書をファウンダーが監修する形にすべき。Orphanet の同義語をそのまま辞書にはできない
5. **`data/orphanet/` の既存 3 ファイルの出所**（ファウンダー依頼）: `diseases-for-import.json` / `orphanet-diseases.json` / `seed-diseases.sql` は、コミット d57d9d6（2026-03-05「Supabase接続 + Vercelデプロイ準備」）で追加された。`seed-diseases.sql` のヘッダに「自動生成: scripts/etl/convert-orphadata.ts、疾患数: 5、生成日: 2026-02-28」とあり、`scripts/etl/fetch-orphadata.ts` → `convert-orphadata.ts` の ETL パイプラインの出力。入力は `data/orphanet-raw/ORPHAnomenclature.json` 等（同コミット）だが、**raw 3 ファイルは MD5 が完全に同一（22,465 bytes、5 疾患: ORPHA 324/355/70/589/716）で、JDBOR ヘッダ属性も無い**。fetch-orphadata.ts が参照する `https://data.orphadata.com/json/ORPHAnomenclature.json` は現在存在しない URL。よって raw 3 ファイルは Orphadata から取得したものではなく、**開発者（または AI）が手書きした 5 疾患のサンプル**で、その `TextAuto` 記述文も出典不明。派生 3 ファイルは Fabry・Gaucher・SMA・重症筋無力症(589)・フェニルケトン尿症(716) の 5 件で、`source_version: "2024-07"` と記載されているが、その版の Orphadata を実際に取得した痕跡は無い。出典を示せないデータであり、削除または `archive/` への移動を提案する（判断はファウンダー）。参照元コードは `scripts/etl/*.ts` と `docs/survey_platform_full_inventory.md` 等 8 ファイル
6. **重複レコード**が同じ番号を得る: idx 222/972（鎖肛）、314/866（MADSAM = Lewis-Sumner）、577/958（HMG-CoA lyase）、41/1000 等。番号修正とは別に、健全性調査の重複問題として処理が要る
7. 前回 idx 14 MELAS の「推奨名が略号なら採用」の例外規則は、同義語込みでは適用範囲が広がりすぎる（`RA` も `FD` も同義語として存在する）ため、今回は適用しなかった。結果は変わらない

## 11. ファウンダー判定の記録

2026-09-10 第 1 回:
- 略号を提案から外した判断（§2.4）を支持
- **C 42 件を一括承認**（JSON で `status: approved`）
- **idx 120 クッシング症候群: v1 の却下を撤回し ORPHA:553 → ORPHA:641613 Endogenous Cushing syndrome に変更**。理由: 641613 は下垂体性も副腎性も含み記述と一致、553 は廃止済み。v2 JSON に `discovery: orphanet_referred_to`, `status: approved` で追加（v1 の idx 120 却下記録を上書きする）
- `data/orphanet/` の既存 3 ファイルと `data/orphanet-raw/` の 3 ファイルは削除（ファウンダーが手で実施）
- `.claude/settings.local.json` の `Bash(unzip *)` はそのまま残す

2026-09-10 第 2 回（B 41 件・再検討候補・非現役番号）:
- **B「明らかに別疾患」22 件**: 承認 21（idx 298, 777, 925, 920, 770, 42, 909, 214, 543, 219, 351, 681, 498, 388, 442, 738, 331, 775, 538 に加え、idx 494 シトリン欠損症は機械判定を覆して群 247582 を承認＝レコード名が群名で CTLN2 と NICCD を含む、idx 746 フェロポルチン病は Orphanet の参照先 647834 ではなくレコード名と一致する 648562 を採用）。**却下 1**: idx 687 Cowden症候群は現番号 201 が疾患名と一致、PTEN 過誤腫症候群は上位概念（v1 idx 726 と同型）。疾患名と番号が一致しているものを広い概念へ移さない
- **B「近縁・亜型・群」19 件: 全件承認**。「亜型→群」12 件は日本語名が群名で型を特定していないため v1 idx 355 と同じ基準で群を採用。idx 462 Kostmann は現番号 486 が AD、Kostmann 病は AR（HAX1）なので現番号が誤り。idx 577・958（HMG-CoA lyase）は承認するが 2 レコードが同一疾患 → `kb_issues` 課題 10
- **idx 474 遺伝性リンパ浮腫: v1 承認の 79452 Milroy を維持**。診断欄が FLT4 のみで記述が Milroy 病を指す。群 77240 は採らない
- **Obsolete 8 種**: 参照先が群（Category）のものは付け替えない（疾患から群へ広がるのは後退）。現番号を維持し「廃止番号を持っている」ことを `kb_issues` 課題 12 に記録。例外は idx 746（Disease → Disease、上記承認）と idx 120（第 1 回承認）
- **Deprecated 7 種: 統合先（Moved to）へ付け替え**。JSON に `discovery: orphanet_moved_to` で idx 631 中條-西村（2615 → 324977）、idx 172・510 ウエスト症候群（3451 → 697160）、idx 623 CANDLE（325004 → 324977）を追加。idx 978（374）は v1 で同じ 141132 を承認済み、idx 42（97556）・770（1564）は現番号が無関係な誤番号で B 承認済みの番号を優先。**idx 999 COACH症候群（2816 → 71277 GLUT1 欠損症）は現番号が無関係な誤番号で、統合先へ追随すると誤りが伝播するため付け替えていない**（`kb_issues` 課題 13）。中條-西村と CANDLE が同一番号 324977 になる件は `kb_issues` 課題 11
- **Non-rare in Europe 6 種: 現番号を維持**。番号の誤りではなく収載方針の問題
- **存在しない番号 15 種**: v2 提案のある idx 298・777・925 と隣接番号候補の idx 762 を除く **11 件は番号を削除して「番号なし」にする**（JSON に `action: remove`, `status: approved`）

2026-09-10 第 3 回（レビュー表 85 件）:
- **§1 複数候補 2 件: 両方却下、現番号維持**（idx 235 は PCD の候補 2 つが別疾患で現番号 158 が正しい。idx 618 は正解 93686 が非現役）
- **§2 略号 58 件: 採用 36 / 却下 20 / 保留 1 / 未判定 1**。採用 = idx 1, 15, 16, 41, 105, 109, 143, 147, 149, 229, 299, 357, 450, 500, 579, 600, 601, 602, 641, 675, 677, 719, 722, 762, 763, 771, 861, 862, 871, 872, 900, 905, 940, 941, 944, 961（JSON `discovery: abbreviation_synonym_exact`, `status: approved`）。idx 677・861 は SPG4/SPG3A の番号が入れ替わっており相互交換で両方直る。却下 = idx 32, 45, 63, 76, 115, 123, 172, 177, 253, 303, 307, 398, 427, 435, 448, 457, 615, 680, 732, 801（略号の衝突。JSON に `status: rejected` で記録）。idx 801 は現番号も誤り → `kb_issues` 課題 14。保留 = idx 206 好酸球性食道炎（候補 370334 は誤り。「Eosinophilic esophagitis」で再検索した結果 ORPHA:73247 が該当するが **Non-rare in Europe で非現役**。idx 34 と同じ基準なら番号なしのまま。ファウンダー確認待ち）。未判定だった idx 699 Ataxia with oculomotor apraxia type 1 は**採用**（略号 AOA1 → 1168、現番号 14 = Abetalipoproteinemia は無関係。採用リストからの伝達漏れ）。idx 206 は **却下**（73247 は Non-rare で非現役、番号なしのまま）
- 最終集計: v2 JSON は approved 137（fix 61 / add 65 / remove 11）、rejected 22、duplicate_of_v1 1（idx 722）。レビュー表 85 件はすべて判定済み
- **§3 非現役 23 件**: Non-rare 11 件（idx 33, 51, 66, 67, 160, 272, 294, 317, 377, 381, 769）は現番号維持・変更なし。idx 34 パーキンソン病は番号を追加しない。Obsolete 6 件（idx 79, 116, 152, 340, 747, 795）は参照先が群なので付け替えず `kb_issues` 課題 12 に記録。idx 817 は参照先 90026 を既に持っており変更不要。**Deprecated 3 件は統合先へ付け替え承認**: idx 620 → 79489 Macrocystic lymphatic malformation、idx 867 → 209004、idx 915 → 98853（レコード名との食い違いを `kb_issues` 課題 15）
