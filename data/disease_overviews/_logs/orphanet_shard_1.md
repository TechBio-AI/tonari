# フェーズ1b-α orphanet_shard_1 の処理ログ

担当 181 件 / 出力 176 件 / Definition が無くスキップ 5 件 / 判断待ちで保留 0 件 / 落とした事実 0 件 / notes 798 件

- 手順: `docs/disease_overview_phase1_task.md` §2-4。出典は `_orphanet_definitions.json` の `definition_text` のみ。Web 取得なし。
- 抽出は Claude Code が Definition を 1 件ずつ読んで語句を選んだ（`build_orphanet_overviews.py` の機械抽出は使っていない）。
  symptoms は原文の語句そのまま。検査値・生検・画像・心電図の所見は §3 に従い symptoms に入れず、notes に書き写した。
  onset は人生の時期を明示する語句（at birth / in infancy / adulthood 等）だけ。early-onset・late-onset のような相対的な言い方と、数字・序数を含む記述は null。
  treatment は、治療の有無・内容を明示した Definition が 1 件も無かったため全件「記載なし」。
- 落とした事実: evidence を付けられずに落とした事実は 0 件（選んだ語句はすべて原文の部分文字列）。
- Orphanet の URL 形式は `https://www.orpha.net/en/disease/detail/{code}`（**未確定**）。

## 2026-09-26 の流し直し

- 全 176 件を、Definition を読んで症状語句を選ぶ方法でやり直した（ファウンダー指示）。以前の機械抽出の結果は上書きした。
- idx 914: summary から治療薬名（nitisinone）を含む末尾の句を省き「（一部省略）」を付けた（summary.omitted: true。ファウンダー判断、docs/DECISIONS.md）。
- 変えた idx と変更点の一覧: `docs/orphanet_shard1_redo_2026-09-26.md`。
- idx 35・757・906: 実体参照を復号した definition_text を使った（data/orphanet/SOURCE.md）。

## 出力しなかった疾患（Definition が無い）

| idx | 病名 | 理由 |
|---:|---|---|
| 11 | 原発性高シュウ酸尿症1型 | Orphanet の Definition が原本に無い |
| 143 | 酸性スフィンゴミエリナーゼ欠損症 | Orphanet の Definition が原本に無い |
| 184 | 後天性血友病A | Orphanet の Definition が原本に無い |
| 752 | 遺伝性視神経症（常染色体優性） | Orphanet の Definition が原本に無い |
| 950 | 口顔指症候群 | Orphanet の Definition が原本に無い |

## 出力した疾患

| idx | 病名 | 使った出典 | summary | symptoms | onset | treatment | 落とした事実 | 外した検査所見等 | notes 数 |
|---:|---|---|---|---:|---|---|---:|---:|---:|
| 5 | ニーマン・ピック病C型 | orphanet（Niemann-Pick disease type C） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 15 | 遺伝性ATTR型アミロイドーシス | orphanet（Hereditary ATTR amyloidosis） | 英語原文 | 6 | adult onset | 記載なし | 0 | 0 | 3 |
| 21 | X連鎖性低リン血症性くる病 | orphanet（X-linked hypophosphatemia） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 35 | 皮膚筋炎 | orphanet（Dermatomyositis） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 40 | 特発性肺線維症 | orphanet（Idiopathic pulmonary fibrosis） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 45 | マルファン症候群 | orphanet（Marfan syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 49 | プラダー・ウィリー症候群 | orphanet（Prader-Willi syndrome） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 53 | 常染色体優性多発性嚢胞腎 | orphanet（Autosomal dominant polycystic kidney disease） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 57 | 先天性副腎過形成 | orphanet（Congenital adrenal hyperplasia） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 5 |
| 62 | 川崎病 | orphanet（Kawasaki disease） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 5 |
| 79 | ギラン・バレー症候群 | orphanet（Guillain-Barré syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 90 | ガラクトース血症 | orphanet（Galactosemia） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 94 | フォン・ヴィレブランド病 | orphanet（Von Willebrand disease） | 英語原文 | 1 | — | 記載なし | 0 | 2 | 5 |
| 103 | 類天疱瘡 | orphanet（Bullous pemphigoid） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 120 | ベッカー型筋ジストロフィー | orphanet（Becker muscular dystrophy） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 124 | 慢性リンパ性白血病 | orphanet（B-cell chronic lymphocytic leukemia） | 英語原文 | 7 | — | 記載なし | 0 | 2 | 5 |
| 129 | 多発性骨髄腫 | orphanet（Multiple myeloma） | 英語原文 | 3 | — | 記載なし | 0 | 3 | 5 |
| 146 | 短腸症候群 | orphanet（Short bowel syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 163 | ビオチニダーゼ欠損症 | orphanet（Biotinidase deficiency） | 英語原文 | 7 | — | 記載なし | 0 | 0 | 4 |
| 179 | びまん性汎細気管支炎 | orphanet（Diffuse panbronchiolitis） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 192 | ペリツェウス・メルツバッハー病 | orphanet（Pelizaeus-Merzbacher disease） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 205 | 汎発性膿疱性乾癬 | orphanet（Generalized pustular psoriasis） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 211 | デンスデポジット病 | orphanet（Dense deposit disease） | 英語原文 | 0 | — | 記載なし | 0 | 2 | 6 |
| 215 | 食道閉鎖症 | orphanet（Esophageal atresia） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 218 | カテコラミン誘発性多形性心室頻拍 | orphanet（Catecholaminergic polymorphic ventricular tachycardia） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 227 | グリコーゲン蓄積症II型 | orphanet（Glycogen storage disease due to acid maltase deficiency, late-onset） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 238 | 肺ランゲルハンス細胞組織球症 | orphanet（Pulmonary Langerhans cell histiocytosis） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 247 | 眼咽頭型筋ジストロフィー | orphanet（Oculopharyngeal muscular dystrophy） | 英語原文 | 5 | adult-onset | 記載なし | 0 | 0 | 3 |
| 252 | ウルリッヒ型先天性筋ジストロフィー | orphanet（Ullrich congenital muscular dystrophy） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 256 | アルミート不整脈原性心筋症 | orphanet（Inherited arrhythmogenic cardiomyopathy） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 260 | 多発性内分泌腫瘍症2型 | orphanet（Multiple endocrine neoplasia type 2） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 266 | 濾胞性リンパ腫 | orphanet（Follicular lymphoma） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 268 | マントル細胞リンパ腫 | orphanet（Mantle cell lymphoma） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 271 | ミオクローヌス・ジストニア症候群 | orphanet（Myoclonus-dystonia syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 278 | 突発性難聴 | orphanet（Sudden sensorineural hearing loss） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 5 |
| 281 | 過敏性肺炎 | orphanet（Hypersensitivity pneumonitis） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 289 | T細胞性大顆粒リンパ球性白血病 | orphanet（T-cell large granular lymphocyte leukemia） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 299 | 好酸球性筋膜炎 | orphanet（Eosinophilic fasciitis） | 英語原文 | 5 | presents during adulthood | 記載なし | 0 | 1 | 4 |
| 305 | フィッシャー症候群 | orphanet（Miller Fisher syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 309 | Leber遺伝性視神経症 | orphanet（Leber hereditary optic neuropathy） | 英語原文 | 1 | — | 記載なし | 0 | 2 | 5 |
| 314 | 老人性全身性アミロイドーシス | orphanet（Wild type ATTR amyloidosis） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 322 | 臍帯ヘルニア | orphanet（Omphalocele） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 325 | 反応性関節炎 | orphanet（Reactive arthritis） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 328 | Leigh脳症 | orphanet（Leigh syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 331 | 慢性偽性腸閉塞症 | orphanet（Chronic intestinal pseudoobstruction syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 335 | ランゲルハンス細胞組織球症 | orphanet（Langerhans cell histiocytosis） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 338 | 骨髄性プロトポルフィリン症 | orphanet（Autosomal erythropoietic protoporphyria） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 340 | 原発性シュウ酸過多症 | orphanet（Primary hyperoxaluria） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 343 | 脊髄小脳変性症3型 | orphanet（Spinocerebellar ataxia type 3） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 354 | 多種カルボキシラーゼ欠損症 | orphanet（Multiple carboxylase deficiency） | 英語原文 | 7 | — | 記載なし | 0 | 1 | 5 |
| 359 | 前頭側頭型認知症 | orphanet（Frontotemporal dementia） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 365 | 特発性好酸球増多症候群 | orphanet（Hypereosinophilic syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 369 | 未熟児網膜症 | orphanet（Retinopathy of prematurity） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 376 | Sotos症候群 | orphanet（Sotos syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 379 | CHARGE症候群 | orphanet（CHARGE syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 386 | Apert症候群 | orphanet（Apert syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 390 | 若年性パーキンソン病 | orphanet（Young-onset Parkinson disease） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 405 | 心臓粘液腫関連カーニー複合 | orphanet（Carney complex） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 407 | 毛細血管拡張症性小脳失調症2型 | orphanet（Ataxia-telangiectasia-like disorder） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 411 | Pfeiffer症候群 | orphanet（Pfeiffer syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 413 | Saethre-Chotzen症候群 | orphanet（Saethre-Chotzen syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 441 | 先天性角化不全症 | orphanet（Dyskeratosis congenita） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 449 | Klippel-Trenaunay症候群 | orphanet（Capillary-lymphatic-venous malformation with segmental distribution） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 454 | 遺伝性リンパ浮腫 | orphanet（Milroy disease） | 英語原文 | 1 | found at birth or developing in the early neonatal period | 記載なし | 0 | 0 | 3 |
| 470 | 多発性スルファターゼ欠損症 | orphanet（Multiple sulfatase deficiency） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 475 | 遺伝性低リン血症性くる病（FGF23関連） | orphanet（Autosomal dominant hypophosphatemic rickets） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 478 | Zellweger症候群（軽症型） | orphanet（Neonatal adrenoleukodystrophy） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 487 | CDKL5欠損症 | orphanet（CDKL5-deficiency disorder） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 489 | 進行性ミオクローヌスてんかん（Unverricht-Lundborg型） | orphanet（Progressive myoclonic epilepsy type 1） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 497 | セピアプテリン還元酵素欠損症 | orphanet（Dopa-responsive dystonia due to sepiapterin reductase deficiency） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 503 | 高フェニルアラニン血症（BH4反応型） | orphanet（Tetrahydrobiopterin-responsive phenylketonuria） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 507 | 遺伝性果糖不耐症 | orphanet（Hereditary fructose intolerance） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 514 | 遺伝性キサンチン尿症 | orphanet（Hereditary xanthinuria） | 英語原文 | 1 | — | 記載なし | 0 | 2 | 5 |
| 518 | Wolcott-Rallison症候群 | orphanet（Wolcott-Rallison syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 522 | Lowe症候群 | orphanet（Oculocerebrorenal syndrome of Lowe） | 英語原文 | 6 | — | 記載なし | 0 | 1 | 5 |
| 524 | Bartter症候群 | orphanet（Bartter syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 3 | 5 |
| 526 | Liddle症候群 | orphanet（Liddle syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 528 | 筋強直性ジストロフィー2型 | orphanet（Proximal myotonic myopathy） | 英語原文 | 2 | juvenile or adult-onset | 記載なし | 0 | 1 | 4 |
| 533 | 中心核ミオパチー | orphanet（Centronuclear myopathy） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 535 | エメリー・ドレイフス型筋ジストロフィー | orphanet（Emery-Dreifuss muscular dystrophy） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 537 | 遠位関節拘縮症 | orphanet（Distal arthrogryposis） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 540 | Barth症候群 | orphanet（Barth syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 543 | 巨大軸索ニューロパチー | orphanet（Giant axonal neuropathy） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 552 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | orphanet（Succinyl-CoA:3-oxoacid CoA transferase deficiency） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 554 | グルタル酸血症II型 | orphanet（Multiple acyl-CoA dehydrogenase deficiency） | 英語原文 | 4 | — | 記載なし | 0 | 2 | 5 |
| 556 | L-2-ヒドロキシグルタル酸尿症 | orphanet（L-2-hydroxyglutaric aciduria） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 559 | Rotor症候群 | orphanet（Rotor syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 565 | 遺伝性痙性対麻痺2型 | orphanet（Pelizaeus-Merzbacher-like disease） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 567 | Andersen-Tawil症候群 | orphanet（Andersen-Tawil syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 570 | 先天性ジストログリカノパチー | orphanet（Walker-Warburg syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 572 | Desbuquois骨異形成症 | orphanet（Desbuquois syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 574 | 骨形成不全症V型 | orphanet（Osteogenesis imperfecta type 5） | 英語原文 | 4 | — | 記載なし | 0 | 3 | 5 |
| 576 | ピクノジソストーシス | orphanet（Pycnodysostosis） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 578 | 先天性脊椎骨端異形成症 | orphanet（Spondyloepiphyseal dysplasia congenita） | 英語原文 | 1 | — | 記載なし | 0 | 2 | 5 |
| 583 | Ellis-van Creveld症候群 | orphanet（Ellis-Van Creveld syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 587 | Camurati-Engelmann病 | orphanet（Camurati-Engelmann disease） | 英語原文 | 5 | — | 記載なし | 0 | 1 | 5 |
| 590 | 全身性肥満細胞症 | orphanet（Systemic mastocytosis） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 605 | 先天性気管狭窄症 | orphanet（Congenital tracheal stenosis） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 608 | Cantrell五徴候群 | orphanet（Pentalogy of Cantrell） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 613 | Townes-Brocks症候群 | orphanet（Townes-Brocks syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 621 | 遺伝性圧脆弱性ニューロパチー | orphanet（Hereditary neuropathy with liability to pressure palsies） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 624 | Stiff-Person症候群 | orphanet（Stiff person spectrum disorder） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 631 | Lambert-Eaton筋無力症候群 | orphanet（Lambert-Eaton myasthenic syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 639 | 脊髄小脳変性症1型 | orphanet（Spinocerebellar ataxia type 1） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 641 | 脊髄小脳変性症7型 | orphanet（Spinocerebellar ataxia type 7） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 643 | 歯状核赤核淡蒼球ルイ体萎縮症 | orphanet（Dentatorubral pallidoluysian atrophy） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 645 | 遺伝性痙性対麻痺11型 | orphanet（Autosomal recessive spastic paraplegia type 11） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 649 | Gorham-Stout病 | orphanet（Gorham-Stout disease） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 655 | Peutz-Jeghers症候群 | orphanet（Peutz-Jeghers syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 657 | 遺伝性びまん性胃癌 | orphanet（Hereditary diffuse gastric cancer） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 659 | 多発性内分泌腫瘍症2B型 | orphanet（Multiple endocrine neoplasia type 2B） | 英語原文 | 7 | Onset is typically in infancy or childhood | 記載なし | 0 | 0 | 3 |
| 663 | 遺伝性平滑筋腫症腎細胞癌症候群 | orphanet（Hereditary leiomyomatosis and renal cell cancer） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 666 | 眼球運動失行を伴う失調症1型 | orphanet（Ataxia-oculomotor apraxia type 1） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 669 | TSH産生下垂体腺腫 | orphanet（TSH-secreting pituitary adenoma） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 673 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | orphanet（Hyperornithinemia-hyperammonemia-homocitrullinuria syndrome） | 英語原文 | 6 | — | 記載なし | 0 | 1 | 5 |
| 678 | 先天性リポイド過形成症 | orphanet（Congenital lipoid adrenal hyperplasia due to STAR deficency） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 683 | 遺伝性パントテン酸キナーゼ関連神経変性 | orphanet（Pantothenate kinase-associated neurodegeneration） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 685 | β-プロペラ蛋白関連神経変性 | orphanet（Beta-propeller protein-associated neurodegeneration） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 688 | Huntington病様2 | orphanet（Huntington disease-like 2） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 690 | 良性家族性舞踏病 | orphanet（Benign hereditary chorea） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 694 | X連鎖性ジストニア・パーキンソニズム | orphanet（X-linked dystonia-parkinsonism） | 英語原文 | 2 | adult-onset | 記載なし | 0 | 0 | 3 |
| 703 | 環状14番染色体症候群 | orphanet（Ring chromosome 14 syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 706 | 13トリソミー | orphanet（Trisomy 13 syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 711 | 遺伝性血栓性血小板減少性紫斑病 | orphanet（Congenital thrombotic thrombocytopenic purpura） | 英語原文 | 0 | — | 記載なし | 0 | 2 | 6 |
| 713 | C3腎症 | orphanet（C3 glomerulopathy） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 725 | 先天性腎性マグネシウム喪失症 | orphanet（Primary hypomagnesemia with secondary hypocalcemia） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 733 | 好酸球性消化管疾患（非食道型） | orphanet（Eosinophilic gastroenteritis） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 737 | 先天性ナトリウム下痢 | orphanet（Congenital sodium diarrhea） | 英語原文 | 1 | congenital onset | 記載なし | 0 | 3 | 4 |
| 739 | Tufting Enteropathy | orphanet（Congenital tufting enteropathy） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 745 | Mounier-Kuhn症候群 | orphanet（Mounier-Kühn syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 748 | 先天性線維症症候群 | orphanet（Congenital fibrosis of extraocular muscles） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 750 | Moebius症候群 | orphanet（Moebius syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 754 | Norrie病 | orphanet（Norrie disease） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 757 | 先天性停止性夜盲 | orphanet（Congenital stationary night blindness） | 英語原文 | 5 | — | 記載なし | 0 | 2 | 5 |
| 760 | Stargardt病 | orphanet（Stargardt disease） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 765 | Coffin-Lowry症候群 | orphanet（Coffin-Lowry syndrome） | 英語原文 | 7 | — | 記載なし | 0 | 0 | 4 |
| 767 | 遺伝性対側性色素異常症 | orphanet（Dyschromatosis symmetrica hereditaria） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 5 |
| 769 | 葉状魚鱗癬 | orphanet（Lamellar ichthyosis） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 772 | 遺伝性掌蹠角化症（Vörner型） | orphanet（Epidermolytic palmoplantar keratoderma） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 775 | Darier病 | orphanet（Darier disease） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 779 | 発作性極度疼痛症 | orphanet（Paroxysmal extreme pain disorder） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 782 | 遺伝性毛髪・歯・爪異常症 | orphanet（Ectodermal dysplasia syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 6 |
| 784 | 掌蹠角化症(Naxos病関連) | orphanet（Naxos disease） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 788 | 視床下部過誤腫（笑い発作てんかん） | orphanet（Gelastic seizures with hypothalamic hamartoma） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 795 | Glanzmann血小板無力症 | orphanet（Glanzmann thrombasthenia） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 798 | Quebec Platelet Disorder | orphanet（Quebec platelet disorder） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 802 | 先天性第V因子欠損症 | orphanet（Congenital factor V deficiency） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 806 | 先天性赤血球膜異常症(楕円赤血球症) | orphanet（Hereditary elliptocytosis） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 7 |
| 808 | 遺伝性血小板減少症(MYH9関連疾患) | orphanet（MYH9-related syndromic thrombocytopenia） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 821 | 遺伝性痙性対麻痺7型 | orphanet（Spastic paraplegia type 7） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 828 | 特発性頭蓋内圧亢進症 | orphanet（Idiopathic intracranial hypertension） | 英語原文 | 5 | — | 記載なし | 0 | 2 | 5 |
| 830 | 先天性大脳白質形成不全症（SOX10型） | orphanet（Peripheral demyelinating neuropathy-central dysmyelinating leukodystrophy-Waardenburg syndrome-Hirschsprung disease） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 840 | エチルマロン酸脳症 | orphanet（Ethylmalonic encephalopathy） | 英語原文 | 6 | — | 記載なし | 0 | 2 | 5 |
| 850 | 先天性intrinsic factor欠損症 | orphanet（Imerslund-Gräsbeck syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 3 | 7 |
| 856 | 先天性副腎不全(NR0B1型) | orphanet（X-linked adrenal hypoplasia congenita） | 英語原文 | 8 | acute onset in infancy or insidious onset in childhood | 記載なし | 0 | 1 | 4 |
| 859 | 新生児重症副甲状腺機能亢進症 | orphanet（Neonatal severe primary hyperparathyroidism） | 英語原文 | 0 | — | 記載なし | 0 | 2 | 6 |
| 864 | 先天性パラミオトニア | orphanet（Paramyotonia congenita of Von Eulenburg） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 866 | Schwartz-Jampel症候群 | orphanet（Schwartz-Jampel syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 868 | 遺伝性ミオパチー（GNE型） | orphanet（GNE myopathy） | 英語原文 | 1 | early adult-onset | 記載なし | 0 | 1 | 4 |
| 873 | Calpain3関連肢帯型筋ジストロフィー | orphanet（Calpain-3-related limb-girdle muscular dystrophy R1） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 875 | Anoctamin5関連肢帯型筋ジストロフィー | orphanet（Anoctamin-5-related limb-girdle muscular dystrophy R12） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 881 | VCP関連多系統蛋白症 | orphanet（Inclusion body myopathy with Paget disease of bone and frontotemporal dementia） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 884 | Myosin Heavy Chain 7関連ミオパチー | orphanet（Laing distal myopathy） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 896 | 遺伝性感覚性ニューロパチーII型 | orphanet（Hereditary sensory and autonomic neuropathy type 2） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 899 | 遺伝性ニューロパチー（GDAP1型） | orphanet（Charcot-Marie-Tooth disease type 4A） | 英語原文 | 7 | infancy to early childhood | 記載なし | 0 | 1 | 4 |
| 903 | 純粋自律神経不全症 | orphanet（Pure autonomic failure） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 906 | 透析アミロイドーシス | orphanet（Wild type ABeta2M amyloidosis） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 6 |
| 911 | カルニチンパルミトイルトランスフェラーゼ1A欠損症 | orphanet（Carnitine palmitoyl transferase 1A deficiency） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 914 | チロシン血症1型 | orphanet（Tyrosinemia type 1） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 918 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | orphanet（Infantile Refsum disease） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 922 | 先天性小腸閉鎖症 | orphanet（Small bowel atresia） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 926 | 先天性後鼻孔閉鎖 | orphanet（Choanal atresia） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 928 | Goldenhar症候群 | orphanet（Craniofacial microsomia） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 933 | 先天性緑内障 | orphanet（Congenital glaucoma） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 939 | Usher症候群2型 | orphanet（Usher syndrome type 2） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 945 | Waardenburg症候群1型 | orphanet（Waardenburg syndrome type 1） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
