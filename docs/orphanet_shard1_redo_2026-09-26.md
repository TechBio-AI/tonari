# Orphanet のみの疾患 shard 1 のやり直し — 変えた idx と変更点（2026-09-26）

- 対象: `data/disease_overviews/_shards/orphanet_shard_1.json`（181 件。Definition が無い 5 件は以前から出力なし）
- やり直しの方法（ファウンダー指示）: Claude Code が Definition を 1 件ずつ読み、症状語句を原文のまま選んだ。
  検査値・生検・画像・心電図の所見は symptoms に入れない（各 JSON の notes に書き写した）。
  onset は人生の時期を明示する語句だけ（at birth / in infancy / adult-onset 等）。early-onset・late-onset のような相対的な言い方、数字・序数を含む記述は null。
  treatment は、治療の有無を薬剤名なしで明示した Definition が無かったため全件「記載なし」（以前と同じ）。
- 以前の結果: `scripts/portal/build_orphanet_overviews.py` の機械抽出（「characterized by」以降をカンマで切ったもの）。
- 以前の結果のうち、新しい検証規則（症状でない語だけの項目）に当たるもの: **6 項目**（idx 518「other clinical manifestations」, idx 528「mild」, idx 552「severe」, idx 690「early-onset」, idx 739「early-onset severe」, idx 873「age of onset of progressive」）
- 検証: `python3 scripts/portal/validate_overview.py --shard-name orphanet_shard_1` → 175 件 / 不合格 0

## 集計

| 項目 | 件数 |
|---|---:|
| 出力 | 176（idx 914 は治療薬名を含む句を省いて出力） |
| 内容が変わった疾患 | 159 |
| notes 以外は変わらなかった疾患 | 17 |
| 外した症状項目 | 346 |
| 加えた症状項目 | 331 |
| onset が変わった疾患 | 20 |
| treatment が変わった疾患 | 0 |
| summary が変わった疾患（実体参照の復号） | 3 |

## ファウンダー判断が要るもの

- **idx 914 チロシン血症1型**: Definition 末尾の句「and a dramatic improvement in prognosis following treatment with nitisinone」（治療薬名を含む）を summary から省き、末尾に「（一部省略）」、`summary.omitted: true`、省いた句を notes に書き写した（2026-09-26 ファウンダー判断、`docs/DECISIONS.md`）。
- **idx 850 先天性 intrinsic factor 欠損症**: Definition に「responsive to parenteral vitamin B12 therapy」。**ビタミン B12 は物質名として原文のまま出す（2026-09-26 ファウンダー判断）。**

## 一覧（idx 順）

| idx | 病名 | 変わった項目 | symptoms 件数 | 外した症状 | 加えた症状 | onset |
|---:|---|---|---|---|---|---|
| 5 | ニーマン・ピック病C型 | symptoms | 8→8 | `neurological symptoms such as cognitive decline`<br>`vertical supranuclear gaze palsy (VSPG)`<br>`dystonia` | `cognitive decline`<br>`vertical supranuclear gaze palsy`<br>`seizures` | — |
| 15 | 遺伝性ATTR型アミロイドーシス | symptoms | 4→6 | `adult onset`<br>`sensorimotor`<br>`autonomic neuropathy` | `progressive sensorimotor and autonomic neuropathy`<br>`sensory loss in the extremities`<br>`motor neuropathy`<br>`rhythm abnormalities`<br>`heart failure` | — |
| 21 | X連鎖性低リン血症性くる病 | symptoms | 3→2 | `hypophosphatemia` | — | — |
| 35 | 皮膚筋炎 | symptoms、summary（実体参照の復号） | 3→2 | `muscle involvement with symmetrical proximal muscle weakness`<br>`specific histological features` | `symmetrical proximal muscle weakness` | — |
| 40 | 特発性肺線維症 | symptoms | 1→0 | `formation of scar tissue within the lungs in the absence of any known cause` | — | — |
| 45 | マルファン症候群 | symptoms | 2→0 | `combination of cardiovascular`<br>`pulmonary manifestations` | — | — |
| 49 | プラダー・ウィリー症候群 | symptoms | 5→6 | `hypothalamic-pituitary dysfunction with severe hypotonia`<br>`adulthood` | `severe hypotonia`<br>`feeding deficits during the neonatal period`<br>`hyperphagia` | — |
| 53 | 常染色体優性多発性嚢胞腎 | symptoms | 4→4 | `outgrowths of fluid-filled cysts from the renal epithelium` | `hematuria` | — |
| 57 | 先天性副腎過形成 | symptoms | 2→1 | `degrees of hyper- or hypoandrogenism manifestations` | — | — |
| 62 | 川崎病 | symptoms | 2→1 | `medium-vessel vasculitis primarily affecting children` | — | — |
| 79 | ギラン・バレー症候群 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 90 | ガラクトース血症 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 94 | フォン・ヴィレブランド病 | symptoms | 1→1 | `defective platelet adhesion` | `abnormal bleeding of variable severity` | — |
| 103 | 類天疱瘡 | symptoms | 3→2 | `acquired`<br>`subepidermal tense bullae occurring on normal of inflamed skin` | `subepidermal tense bullae` | — |
| 120 | ベッカー型筋ジストロフィー | symptoms | 4→1 | `muscle wasting`<br>`weakness due to degeneration of skeletal`<br>`smooth`<br>`cardiac muscle` | `progressive muscle wasting and weakness` | — |
| 124 | 慢性リンパ性白血病 | symptoms | 5→7 | `fatigue`<br>`fever (without evidence of infection)`<br>`night sweats as well as cervical lymphadenopathy` | `unintentional weight loss`<br>`severe fatigue`<br>`fever`<br>`night sweats`<br>`cervical lymphadenopathy` | — |
| 129 | 多発性骨髄腫 | symptoms | 2→3 | `overproduction of abnormal plasma cells in the bone marrow`<br>`skeletal destruction` | `bone pain`<br>`renal impairment`<br>`immunodeficiency` | — |
| 146 | 短腸症候群 | symptoms | 4→2 | `bowel dilation`<br>`dysmobility` | — | — |
| 163 | ビオチニダーゼ欠損症 | onset | 7→7 | — | — | late-onset → null |
| 179 | びまん性汎細気管支炎 | symptoms、onset | 0→4 | — | `chronic cough`<br>`exertional dyspnea`<br>`sputum production`<br>`chronic paranasal sinusitis` | Onset occurs in the second to fifth decade of life an → null |
| 192 | ペリツェウス・メルツバッハー病 | symptoms | 5→5 | `intellectual deficit` | `variable intellectual deficit` | — |
| 205 | 汎発性膿疱性乾癬 | symptoms | 3→4 | `neutrophil leukocytosis` | `episodic erythematous cutaneous eruptions`<br>`sterile cutaneous pustules formation` | — |
| 211 | デンスデポジット病 | symptoms | 3→0 | `in a patient with the classic clinical features of glomerulonephritis`<br>`electron microscopic findings of highly electron-dense intra-membranous`<br>`osmiophilic deposits` | — | — |
| 215 | 食道閉鎖症 | symptoms | 2→2 | `interruption in the continuity of the esophagus`<br>`or without persistent communication with the trachea` | `inability to swallow`<br>`respiratory distress` | — |
| 218 | カテコラミン誘発性多形性心室頻拍 | symptoms | 2→2 | `catecholamine-induced ventricular tachycardia (VT) manifesting as syncope`<br>`sudden death in young individuals` | `syncope`<br>`sudden death` | — |
| 227 | グリコーゲン蓄積症II型 | symptoms、onset | 3→3 | `excessive accumulation of glycogen in lysosomes most notably in skeletal muscle`<br>`leading to slowly progressive muscle weakness with walking disability` | `slowly progressive muscle weakness`<br>`walking disability` | late-onset → null |
| 238 | 肺ランゲルハンス細胞組織球症 | symptoms | 3→3 | `interstitial changes in the lung tissue`<br>`manifesting as a variable combination of cellular inflammation`<br>`fibrotic lesions` | `dyspnea`<br>`cough`<br>`fever` | — |
| 247 | 眼咽頭型筋ジストロフィー | symptoms | 5→5 | `eyelid ptosis` | `progressive eyelid ptosis` | — |
| 252 | ウルリッヒ型先天性筋ジストロフィー | symptoms | 6→6 | `loss of ambulation (if achieved)`<br>`uniform respiratory insufficiency during childhood` | `loss of ambulation`<br>`uniform respiratory insufficiency` | — |
| 256 | アルミート不整脈原性心筋症 | symptoms | 2→2 | `risk of sudden cardiac death` | `sudden cardiac death` | — |
| 260 | 多発性内分泌腫瘍症2型 | symptoms | 1→3 | `association of medullary thyroid carcinoma (MTC) with other endocrine tumors` | `medullary thyroid carcinoma`<br>`pheochromocytoma`<br>`primary hyperparathyroidism` | — |
| 266 | 濾胞性リンパ腫 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 268 | マントル細胞リンパ腫 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 271 | ミオクローヌス・ジストニア症候群 | symptoms | 1→2 | `mild to moderate dystonia along with 'lightning-like' myoclonic jerks` | `mild to moderate dystonia`<br>`'lightning-like' myoclonic jerks` | — |
| 278 | 突発性難聴 | symptoms | 3→4 | `sudden hearing loss of at least 30 decibels across three contiguous frequencies`<br>`within 72 hours or less`<br>`or occurring without any known cause` | `sudden hearing loss`<br>`aural fullness`<br>`tinnitus`<br>`vertigo` | — |
| 281 | 過敏性肺炎 | symptoms | 2→4 | `respiratory symptoms (cough, dyspnea) due to sensitization`<br>`subsequent hypersensitivity to environmental antigens` | `cough`<br>`dyspnea`<br>`weight loss`<br>`fatigue` | — |
| 289 | T細胞性大顆粒リンパ球性白血病 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 299 | 好酸球性筋膜炎 | symptoms、onset | 3→5 | `inflammation`<br>`thickening of the fascia`<br>`peripheral eosinophilia` | `symmetrical and painful swelling of mainly the extremities`<br>`Fatigue`<br>`disabling cutaneous fibrosis`<br>`myositis`<br>`arthritis` | null → presents during adulthood |
| 305 | フィッシャー症候群 | symptoms | 6→5 | `manifesting with diplopia`<br>`generalized areflexia` | `diplopia` | — |
| 309 | Leber遺伝性視神経症 | symptoms | 4→1 | `sudden onset`<br>`loss of retinal ganglion cells`<br>`optic atrophy` | — | — |
| 314 | 老人性全身性アミロイドーシス | symptoms | 2→0 | `deposition of wild type transthyretin predominantly in the heart`<br>`soft tissues (mainly the carpal tunnel region, lumbar canal and tendons)` | — | — |
| 322 | 臍帯ヘルニア | symptoms | 3→1 | `centered on the umbilical cord`<br>`in which the protruding viscera are protected by a sac` | — | — |
| 325 | 反応性関節炎 | symptoms | 1→1 | `becoming manifest after an infection` | `acute or chronic sterile synovitis` | — |
| 328 | Leigh脳症 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 331 | 慢性偽性腸閉塞症 | symptoms | 0→1 | — | `recurrent symptoms of intestinal obstruction` | — |
| 335 | ランゲルハンス細胞組織球症 | symptoms | 2→0 | `accumulation (usually organized in granulomas) of macrophage`<br>`bearing the features of Langerhans cells in various tissues` | — | — |
| 338 | 骨髄性プロトポルフィリン症 | symptoms | 4→1 | `accumulation of protoporphyrin in blood`<br>`erythrocytes`<br>`tissues` | — | — |
| 340 | 原発性シュウ酸過多症 | symptoms | 4→2 | `excess of oxalate resulting in kidney stones`<br>`nephrocalcinosis`<br>`ultimately renal failure`<br>`systemic oxalosis` | `kidney stones`<br>`renal failure` | — |
| 343 | 脊髄小脳変性症3型 | symptoms | 3→2 | `other neurological manifestations` | — | — |
| 354 | 多種カルボキシラーゼ欠損症 | 変更なし（notes のみ） | 7→7 | — | — | — |
| 359 | 前頭側頭型認知症 | symptoms | 4→3 | `changes in behavior`<br>`frontoinsular cortices` | `progressive changes in behavior` | — |
| 365 | 特発性好酸球増多症候群 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 369 | 未熟児網膜症 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 376 | Sotos症候群 | symptoms | 3→3 | `intellectual impairment` | `variable intellectual impairment` | — |
| 379 | CHARGE症候群 | symptoms | 5→4 | `broad phenotype with Coloboma`<br>`Characteristic external`<br>`inner ears (known as the major 4 C's)` | `Coloboma`<br>`Characteristic external and inner ears` | — |
| 386 | Apert症候群 | symptoms | 4→3 | `finger`<br>`toe anomalies and/or syndactyly` | `finger and toe anomalies and/or syndactyly` | — |
| 390 | 若年性パーキンソン病 | symptoms | 8→6 | `age of onset between 21-45 years`<br>`painful cramps followed by tremor`<br>`gait complaints`<br>`falls`<br>`other non-motor symptoms` | `painful cramps`<br>`tremor`<br>`gait complaints and falls` | — |
| 405 | 心臓粘液腫関連カーニー複合 | symptoms | 6→5 | `lentigines with a specific peri-orifical distribution`<br>`wide range of other tumors` | `lentigines` | — |
| 407 | 毛細血管拡張症性小脳失調症2型 | symptoms | 3→2 | `slowly progressive cerebellar degeneration resulting in ataxia`<br>`other cerebellar symptoms` | `ataxia` | — |
| 411 | Pfeiffer症候群 | symptoms | 4→3 | `hand`<br>`foot malformation with a wide range of clinical expression` | `hand and foot malformation` | — |
| 413 | Saethre-Chotzen症候群 | symptoms | 6→5 | `small ears with prominent superior and/or inferior crus`<br>`among other less common manifestations` | `small ears` | — |
| 441 | 先天性角化不全症 | symptoms | 2→3 | `high risk of bone marrow failure (BMF)`<br>`cancer` | `nail dysplasia`<br>`skin pigmentary changes`<br>`oral leukoplakia` | — |
| 449 | Klippel-Trenaunay症候群 | symptoms | 2→6 | `involving bone and/or soft tissues` | `venous varicosities`<br>`overgrowth of a limb`<br>`recurrent painful thrombophlebitis`<br>`venous thrombosis`<br>`sudden venous hemorrhage` | — |
| 454 | 遺伝性リンパ浮腫 | symptoms、onset | 0→1 | — | `painless, chronic lower-limb lymphedema` | null → found at birth or developing in the early neonatal period |
| 470 | 多発性スルファターゼ欠損症 | symptoms | 0→8 | — | `developmental delay`<br>`progressive neurologic deterioration`<br>`hydrocephalus`<br>`hypotonia`<br>`coarse facial features`<br>`skeletal anomalies`<br>`hepatomegaly`<br>`ichthyosis` | — |
| 475 | 遺伝性低リン血症性くる病（FGF23関連） | symptoms | 2→1 | `hypophosphatemia` | — | — |
| 478 | Zellweger症候群（軽症型） | symptoms | 4→2 | `leukodystrophy`<br>`vision`<br>`sensorineural hearing deficiencies` | `vision and sensorineural hearing deficiencies` | — |
| 487 | CDKL5欠損症 | symptoms、onset | 2→3 | `neurodevelopmental impairment with major motor development delay` | `severe neurodevelopmental impairment`<br>`major motor development delay` | early-onset → null |
| 489 | 進行性ミオクローヌスてんかん（Unverricht-Lundborg型） | symptoms | 4→4 | `action-`<br>`stimulus-sensitive myoclonus`<br>`tonic-clonic seizures with ataxia`<br>`but with only a mild cognitive decline over time` | `action- and stimulus-sensitive myoclonus`<br>`tonic-clonic seizures`<br>`ataxia`<br>`mild cognitive decline` | — |
| 497 | セピアプテリン還元酵素欠損症 | symptoms | 5→4 | `delays in motor`<br>`cognitive development` | `delays in motor and cognitive development` | — |
| 503 | 高フェニルアラニン血症（BH4反応型） | symptoms | 4→3 | `mild to moderate symptoms of PKU including impaired cognitive function`<br>`developmental disorders`<br>`essential cofactor of phenylalanine hydroxylase` | `impaired cognitive function`<br>`behavioral and developmental disorders` | — |
| 507 | 遺伝性果糖不耐症 | symptoms | 0→2 | — | `gastrointestinal disorders`<br>`postprandial hypoglycemia following fructose ingestion` | — |
| 514 | 遺伝性キサンチン尿症 | symptoms | 4→1 | `very low (or undetectable) concentrations of uric acid in blood`<br>`urine`<br>`very high concentration of xanthine in urine`<br>`leading to urolithiasis` | `urolithiasis` | — |
| 518 | Wolcott-Rallison症候群 | symptoms | 3→2 | `permanent neonatal diabetes mellitus (PNDM) with multiple epiphyseal dysplasia`<br>`other clinical manifestations` | `permanent neonatal diabetes mellitus` | — |
| 522 | Lowe症候群 | symptoms | 6→6 | `renal tubular dysfunction with chronic renal failure` | `chronic renal failure` | — |
| 524 | Bartter症候群 | symptoms | 7→1 | `impaired salt reabsorption in the thick ascending limb of Henle's loop`<br>`clinically by the association of hypokalemic alkalosis`<br>`hypercalciuria/nephrocalcinosis`<br>`increased levels of plasma renin`<br>`aldosterone`<br>`vascular resistance to angiotensin II` | — | — |
| 526 | Liddle症候群 | symptoms | 2→1 | `hypertension associated with decreased plasma levels of potassium`<br>`aldosterone` | `hypertension` | — |
| 528 | 筋強直性ジストロフィー2型 | symptoms、onset | 4→2 | `mild`<br>`fluctuating myotonia`<br>`rarely cardiac conduction disorders` | `mild and fluctuating myotonia` | adult-onset → juvenile or adult-onset |
| 533 | 中心核ミオパチー | symptoms | 2→0 | `clinical features of a congenital myopathy`<br>`centrally placed nuclei on muscle biopsy` | — | — |
| 535 | エメリー・ドレイフス型筋ジストロフィー | symptoms | 4→3 | `muscular weakness`<br>`atrophy` | `muscular weakness and atrophy` | — |
| 537 | 遠位関節拘縮症 | symptoms | 4→5 | `congenital contractures of two or more areas of the body`<br>`primarily involving the hands`<br>`feet`<br>`while the proximal joints are largely spared` | `congenital contractures`<br>`camptodactyly or pseudocamptodactyly`<br>`overriding fingers`<br>`ulnar deviation at the wrist`<br>`talipes equinovarus` | — |
| 540 | Barth症候群 | symptoms | 5→3 | `dilated cardiomyopathy (DCM)`<br>`neutropenia`<br>`organic aciduria` | `dilated cardiomyopathy` | — |
| 543 | 巨大軸索ニューロパチー | symptoms | 4→2 | `motor`<br>`sensory peripheral neuropathy`<br>`central nervous system involvement (including pyramidal and cerebellar signs)`<br>`characteristic kinky hair in most cases` | `progressive motor and sensory peripheral neuropathy`<br>`characteristic kinky hair` | — |
| 552 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | symptoms | 2→0 | `severe`<br>`potentially fatal intermittent episodes of ketoacidosis` | — | — |
| 554 | グルタル酸血症II型 | symptoms | 0→4 | — | `cardiomyopathy`<br>`liver disease`<br>`muscle weakness`<br>`respiratory failure` | — |
| 556 | L-2-ヒドロキシグルタル酸尿症 | symptoms | 3→3 | `macrocephaly or epilepsy` | `variable macrocephaly or epilepsy` | — |
| 559 | Rotor症候群 | symptoms | 3→0 | `benign`<br>`predominantly conjugated`<br>`nonhemolytic hyperbilirubinemia with normal liver histology` | — | — |
| 565 | 遺伝性痙性対麻痺2型 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 567 | Andersen-Tawil症候群 | symptoms | 8→8 | `characteristic physical features: short stature`<br>`broad nasal root`<br>`clinodactyly` | `ventricular arrhythmias`<br>`short stature`<br>`syndactyly` | — |
| 570 | 先天性ジストログリカノパチー | symptoms | 2→1 | `brain`<br>`eye abnormalities` | `severe brain and eye abnormalities` | — |
| 572 | Desbuquois骨異形成症 | symptoms | 5→3 | `micromelic dwarfism`<br>`metaphyseal abnormalities`<br>`advanced carpotarsal ossification` | `severe micromelic dwarfism` | — |
| 574 | 骨形成不全症V型 | symptoms | 8→4 | `increased bone fragility`<br>`metaphyseal changes at birth`<br>`mineralized interosseous membranes`<br>`hyperplasic callus (occurring more often during periods of more rapid growth)`<br>`absence of dentinogenesis imperfecta` | `susceptibility to bone fractures of variable severity` | — |
| 576 | ピクノジソストーシス | symptoms | 3→2 | `osteosclerosis of the skeleton` | — | — |
| 578 | 先天性脊椎骨端異形成症 | symptoms | 3→1 | `abnormal epiphyses`<br>`flattened vertebral bodies` | — | — |
| 583 | Ellis-van Creveld症候群 | symptoms | 4→4 | `heart defects` | `ectodermal and heart defects` | — |
| 587 | Camurati-Engelmann病 | symptoms | 8→5 | `hyperostosis of the long bones`<br>`skull`<br>`spine`<br>`pelvis`<br>`pain in the extremities` | `severe pain in the extremities`<br>`easy fatigability` | — |
| 590 | 全身性肥満細胞症 | symptoms | 0→1 | — | `skin involvement` | — |
| 605 | 先天性気管狭窄症 | symptoms | 1→1 | `absent membranous trachea` | `breathing difficulty` | — |
| 608 | Cantrell五徴候群 | symptoms | 5→5 | `presence of 5 major malformations: midline supraumbilical abdominal wall defect` | `midline supraumbilical abdominal wall defect` | — |
| 613 | Townes-Brocks症候群 | symptoms | 2→4 | `triad of imperforate anus` | `imperforate anus`<br>`dysplastic ears`<br>`sensorineural and/or conductive hearing impairment` | — |
| 621 | 遺伝性圧脆弱性ニューロパチー | symptoms | 0→1 | — | `recurrent mononeuropathies` | — |
| 624 | Stiff-Person症候群 | symptoms | 0→5 | — | `fluctuating trunk and limb stiffness`<br>`painful muscle spasms`<br>`task-specific phobia related to walking`<br>`an exaggerated startle response`<br>`ankylosing deformities` | — |
| 631 | Lambert-Eaton筋無力症候群 | symptoms | 2→2 | `autonomic dysfunction frequently associated with small-cell lung cancer (SCLC)` | `autonomic dysfunction` | — |
| 639 | 脊髄小脳変性症1型 | symptoms | 5→4 | `commonly nystagmus`<br>`saccadic abnormalities` | `nystagmus` | — |
| 641 | 脊髄小脳変性症7型 | symptoms | 5→5 | `ataxia`<br>`retinal degeneration leading to progressive blindness` | `progressive ataxia`<br>`progressive blindness` | — |
| 643 | 歯状核赤核淡蒼球ルイ体萎縮症 | symptoms | 6→5 | `prominent anticipation` | — | — |
| 645 | 遺伝性痙性対麻痺11型 | symptoms | 8→8 | `lower limbs weakness`<br>`spasticity` | `progressive lower limbs weakness and spasticity`<br>`dementia` | — |
| 649 | Gorham-Stout病 | symptoms | 2→2 | `proliferation`<br>`dilation of lymphatic vessels` | `localized pain`<br>`pathological fracture` | — |
| 655 | Peutz-Jeghers症候群 | symptoms | 1→2 | `by mucocutaneous pigmentation` | `hamartomatous polyps throughout the gastrointestinal (GI) tract`<br>`mucocutaneous pigmentation` | — |
| 657 | 遺伝性びまん性胃癌 | symptoms | 4→5 | `development of diffuse (signet ring cell) gastric cancer at a young age`<br>`germline heterozygous mutations of CDH1`<br>`MAP3K6`<br>`CTNNA1 genes` | `nausea and vomiting`<br>`dysphagia`<br>`loss of appetite`<br>`abdominal mass`<br>`weight loss` | — |
| 659 | 多発性内分泌腫瘍症2B型 | symptoms、onset | 1→7 | `notably pheochromocytoma (one or both adrenal glands can be affected)` | `medullary thyroid carcinoma`<br>`pheochromocytoma`<br>`mucosal neuromas of the lips and tongue`<br>`marfanoid body habitus`<br>`Chronic constipation`<br>`abdominal distension`<br>`diarrhea` | Onset is typically in infancy or childhood and pa → Onset is typically in infancy or childhood |
| 663 | 遺伝性平滑筋腫症腎細胞癌症候群 | symptoms | 4→2 | `predisposition to cutaneous`<br>`uterine leiomyomas and`<br>`in some families`<br>`to renal cell cancer` | `cutaneous and uterine leiomyomas`<br>`renal cell cancer` | — |
| 666 | 眼球運動失行を伴う失調症1型 | symptoms | 3→3 | `cerebellar ataxia associated with oculomotor apraxia`<br>`neuropathy`<br>`hypoalbuminemia` | `progressive cerebellar ataxia`<br>`oculomotor apraxia`<br>`severe neuropathy` | — |
| 669 | TSH産生下垂体腺腫 | symptoms | 7→8 | `presence of a pituitary mass associated with high levels of circulating`<br>`free`<br>`thyroid hormones in conjunction with normal to high levels of TSH`<br>`unresponsiveness of TSH levels to TRH stimulation`<br>`T3 suppression tests`<br>`manifesting with signs`<br>`symptoms of mild to moderate hyperthyroidism (e.g` | `goiter`<br>`palpitation`<br>`excessive sweating`<br>`weight loss`<br>`tremor`<br>`headache`<br>`visual field defects`<br>`galactorrhea` | — |
| 673 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | symptoms、onset | 6→6 | `either a neonatal-onset with manifestations of lethargy`<br>`tachypnea or`<br>`more commonly`<br>`presentations in infancy`<br>`childhood or adulthood with chronic neurocognitive deficits` | `lethargy`<br>`vomiting`<br>`tachypnea`<br>`chronic neurocognitive deficits`<br>`acute encephalopathy` | neonatal-onset → null |
| 678 | 先天性リポイド過形成症 | symptoms | 2→2 | `adrenal insufficiency` | `severe adrenal insufficiency` | — |
| 683 | 遺伝性パントテン酸キナーゼ関連神経変性 | symptoms、onset | 4→3 | `dystonia`<br>`abnormal iron accumulation in the globus pallidus` | `progressive dystonia` | early onset → null |
| 685 | β-プロペラ蛋白関連神経変性 | onset | 2→2 | — | — | early-onset → null |
| 688 | Huntington病様2 | symptoms | 3→5 | `triad of movement (chorea, oculomotor, parkinsonism)`<br>`psychiatric (prominently sadness, irritability and anxiety)`<br>`cognitive abnormalities (early cognitive decline and subcortical-like dementia)` | `chorea`<br>`parkinsonism`<br>`sadness, irritability and anxiety`<br>`early cognitive decline`<br>`subcortical-like dementia` | — |
| 690 | 良性家族性舞踏病 | symptoms、onset | 3→8 | `early-onset`<br>`aggravated by stress or anxiety`<br>`in various members of a family` | `very slowly progressive choreiform movements`<br>`hypotonia`<br>`psychomotor delay`<br>`dysarthria`<br>`myoclonus`<br>`dystonia`<br>`learning difficulties`<br>`spasticity with hyperreflexia` | early-onset → null |
| 694 | X連鎖性ジストニア・パーキンソニズム | symptoms | 2→2 | `adult-onset parkinsonism that is frequently accompanied by focal dystonia`<br>`that has a highly variable clinical course` | `adult-onset parkinsonism`<br>`focal dystonia` | — |
| 703 | 環状14番染色体症候群 | symptoms | 8→4 | `skin pigmentation disorders`<br>`flat occiput`<br>`epicanthal folds`<br>`downward slanting eyes`<br>`flat nasal bridge` | `retinal and skin pigmentation disorders` | — |
| 706 | 13トリソミー | symptoms | 8→8 | `presence of extra chromosome 13 material`<br>`manifesting with severe intellectual disability`<br>`multiple congenital anomalies including holoprosencephaly` | `severe intellectual disability`<br>`postaxial polydactyly`<br>`seizures` | — |
| 711 | 遺伝性血栓性血小板減少性紫斑病 | symptoms | 3→0 | `profound peripheral thrombocytopenia`<br>`microangiopathic hemolytic anemia (MAHA)`<br>`single or multiple organ failure of variable severity` | — | — |
| 713 | C3腎症 | 変更なし（notes のみ） | 0→0 | — | — | — |
| 725 | 先天性腎性マグネシウム喪失症 | symptoms | 5→3 | `hypomagnesemia`<br>`secondary hypocalcemia associated with neurological symptoms` | — | — |
| 733 | 好酸球性消化管疾患（非食道型） | symptoms | 4→0 | `presence of abnormal`<br>`nonspecific gastro-intestinal (GI) manifestations`<br>`eosinophilic infiltration of the GI tract`<br>`involve several layers within the GI wall` | — | — |
| 737 | 先天性ナトリウム下痢 | symptoms | 2→1 | `hyponatremia`<br>`metabolic acidosis` | `severe watery diarrhea` | — |
| 739 | Tufting Enteropathy | symptoms、onset | 2→2 | `early-onset severe`<br>`intractable diarrhea that leads to irreversible intestinal failure` | `early-onset severe and intractable diarrhea`<br>`irreversible intestinal failure` | early-onset → null |
| 745 | Mounier-Kuhn症候群 | symptoms | 3→2 | `marked dilatation of the trachea`<br>`proximal bronchi that leads to impaired airway secretion clearance` | `impaired airway secretion clearance` | — |
| 748 | 先天性線維症症候群 | symptoms | 1→6 | `their innervated muscles` | `abnormal resting position of the eyes`<br>`limitation of vertical and horizontal gaze`<br>`impaired binocular vision`<br>`amblyopia`<br>`unilateral or bilateral blepharoptosis`<br>`compensatory abnormal head posture` | — |
| 750 | Moebius症候群 | symptoms | 0→4 | — | `unilateral or bilateral non progressive congenital facial palsy`<br>`impairments of ocular abduction`<br>`orofacial anomalies`<br>`limb defects` | — |
| 754 | Norrie病 | symptoms | 1→4 | `abnormal retinal development with congenital blindness` | `congenital blindness`<br>`sensorineural hearing loss`<br>`developmental delay`<br>`intellectual disability and/or behavioral disorders` | — |
| 757 | 先天性停止性夜盲 | symptoms、summary（実体参照の復号） | 6→5 | `night or dim light vision disturbance or delayed dark adaptation`<br>`poor visual acuity (ranging from 20/30 to 20/200)`<br>`normal color vision`<br>`fundus abnormalities` | `night or dim light vision disturbance`<br>`poor visual acuity`<br>`myopia` | — |
| 760 | Stargardt病 | symptoms | 3→1 | `loss of central vision associated with irregular macular`<br>`perimacular yellow-white fundus flecks`<br>`so-called ''beaten bronze'' atrophic central macular lesion` | `progressive loss of central vision` | — |
| 765 | Coffin-Lowry症候群 | symptoms | 6→7 | `postnatal growth retardation leading to short stature`<br>`skeletal abnormalities including kyphoscoliosis` | `postnatal growth retardation`<br>`short stature`<br>`kyphoscoliosis` | — |
| 767 | 遺伝性対側性色素異常症 | symptoms | 3→1 | `presence of the mixture of hyperpigmented`<br>`hypopigmented macules of approximately 5mm in diameter`<br>`principally located on the extremities` | `hyperpigmented and hypopigmented macules` | — |
| 769 | 葉状魚鱗癬 | symptoms | 1→1 | `presence of large scales all over the body without significant erythroderma` | `large scales all over the body` | — |
| 772 | 遺伝性掌蹠角化症（Vörner型） | symptoms | 8→3 | `diffuse`<br>`yellowish`<br>`thick hyperkeratosis of the palms`<br>`soles with a sharp demarcation at the volar border`<br>`erythematous margin`<br>`epidermolytic pattern of changes on the skin biopsy`<br>`perinuclear vacuolization`<br>`granular degeneration of keratinocytes in the spinous` | `diffuse, yellowish, thick hyperkeratosis of the palms and soles`<br>`Painful fissures`<br>`hyperhidrosis` | — |
| 775 | Darier病 | symptoms | 4→8 | `acral wart-like lesions that can be associated with a trigger`<br>`may occur anywhere on the body (including mucosal surfaces)` | `acral wart-like lesions`<br>`nail anomalies`<br>`blepharitis`<br>`dry eye`<br>`neuropsychiatric illness`<br>`xerostomia` | — |
| 779 | 発作性極度疼痛症 | symptoms | 0→3 | — | `severe episodic perirectal pain`<br>`skin flushing`<br>`Ocular and submaxillary pain` | — |
| 782 | 遺伝性毛髪・歯・爪異常症 | symptoms | 6→0 | `defective development of two or more ectodermal derivatives`<br>`hair`<br>`teeth`<br>`nails`<br>`sweat glands`<br>`their modified structures (i.e` | — | — |
| 784 | 掌蹠角化症(Naxos病関連) | 変更なし（notes のみ） | 2→2 | — | — | — |
| 788 | 視床下部過誤腫（笑い発作てんかん） | symptoms、onset | 1→4 | `early-onset gelastic (i.e` | `early-onset gelastic (i.e. ictal laughter) or dacrystic (i.e., ictal crying) seizures`<br>`cognitive decline`<br>`behavioral disorders`<br>`precocious puberty` | early-onset → null |
| 795 | Glanzmann血小板無力症 | symptoms | 2→2 | `exaggerated response to trauma due to a constitutional thrombocytopenia` | `an exaggerated response to trauma` | — |
| 798 | Quebec Platelet Disorder | symptoms | 6→4 | `moderate to severe bleeding after trauma`<br>`surgery or obstetric interventions`<br>`muscle`<br>`joint bleeds` | `moderate to severe bleeding after trauma, surgery or obstetric interventions`<br>`muscle and joint bleeds` | — |
| 802 | 先天性第V因子欠損症 | 変更なし（notes のみ） | 1→1 | — | — | — |
| 806 | 先天性赤血球膜異常症(楕円赤血球症) | 変更なし（notes のみ） | 0→0 | — | — | — |
| 808 | 遺伝性血小板減少症(MYH9関連疾患) | symptoms | 5→3 | `congenital thrombocytopenia`<br>`possible subsequent manifestations of sensorineural hearing loss`<br>`elevation of liver enzymes`<br>`and/or progressive nephropathy often leading to end-stage renal disease (ESRD)` | `sensorineural hearing loss`<br>`progressive nephropathy` | — |
| 821 | 遺伝性痙性対麻痺7型 | symptoms | 2→8 | `spasticity`<br>`predominant cerebellar ataxia` | `progressive bilateral lower limb weakness and spasticity`<br>`cerebellar ataxia`<br>`sphincter dysfunction`<br>`optical neuropathy`<br>`nystagmus`<br>`blepharoptosis`<br>`decreased hearing`<br>`scoliosis` | — |
| 828 | 特発性頭蓋内圧亢進症 | symptoms | 5→5 | `isolated increased intracranial pressure manifesting with recurrent`<br>`persistent headaches`<br>`transient obstruction of the visual field`<br>`papilledema` | `recurrent and persistent headaches`<br>`vomiting`<br>`progressive and transient obstruction of the visual field`<br>`Visual loss` | — |
| 830 | 先天性大脳白質形成不全症（SOX10型） | 変更なし（notes のみ） | 0→0 | — | — | — |
| 840 | エチルマロン酸脳症 | symptoms、onset | 5→6 | `elevated excretion of ethylmalonic acid (EMA) with recurrent petechiae`<br>`chronic diarrhea associated with neurodevelopmental delay`<br>`hypotonia with brain magnetic resonance imaging (MRI) abnormalities` | `recurrent petechiae`<br>`chronic diarrhea`<br>`neurodevelopmental delay`<br>`hypotonia` | early-onset → null |
| 850 | 先天性intrinsic factor欠損症 | symptoms | 1→0 | `appears in childhood` | — | — |
| 856 | 先天性副腎不全(NR0B1型) | symptoms、onset | 1→8 | `primary adrenal insufficiency (AI) and/or hypogonadotropic hypogonadism (HH)` | `hyperpigmentation`<br>`vomiting`<br>`poor feeding`<br>`failure to thrive`<br>`seizures`<br>`vascular collapse`<br>`delayed or arrested puberty`<br>`infertility` | onset in infancy or insidious onset in childhood → acute onset in infancy or insidious onset in childhood |
| 859 | 新生児重症副甲状腺機能亢進症 | symptoms | 2→0 | `hypercalcemia (> 3.5 mM) from birth`<br>`major hyperparathyroidism` | — | — |
| 864 | 先天性パラミオトニア | 変更なし（notes のみ） | 1→1 | — | — | — |
| 866 | Schwartz-Jampel症候群 | symptoms | 1→8 | — | `mask-like facies`<br>`blepharospasm`<br>`small mouth with pursed lips`<br>`short stature`<br>`pectus carinatum`<br>`kyphoscoliosis`<br>`bowing of long bones` | — |
| 868 | 遺伝性ミオパチー（GNE型） | symptoms、onset | 2→1 | `early adult-onset`<br>`that usually spares the quadriceps femoris` | `slowly to moderately progressive distal muscle weakness` | adult-onset → early adult-onset |
| 873 | Calpain3関連肢帯型筋ジストロフィー | symptoms | 3→5 | `age of onset of progressive`<br>`selective weakness`<br>`atrophy of proximal shoulder-` | `weakness and atrophy of proximal shoulder- and pelvic-girdle muscles`<br>`exercise intolerance`<br>`a waddling gait`<br>`scapular winging`<br>`calf pseudo-hypertrophy` | — |
| 875 | Anoctamin5関連肢帯型筋ジストロフィー | symptoms、onset | 1→5 | `difficulties standing on tiptoes being one of the initial signs` | `mainly proximal lower limb weakness`<br>`difficulties standing on tiptoes`<br>`Proximal upper limb and distal lower limb weakness`<br>`atrophy of the quadriceps`<br>`Calf hypertrophy` | adult onset → null |
| 881 | VCP関連多系統蛋白症 | symptoms、onset | 8→8 | `adult-onset proximal`<br>`manifesting with bone pain`<br>`deformity`<br>`enlargement of the long-bones`<br>`premature frontotemporal dementia`<br>`manifesting first with dysnomia`<br>`comprehension deficits followed by progressive aphasia` | `proximal and distal muscle weakness`<br>`bone pain`<br>`dysnomia`<br>`comprehension deficits`<br>`progressive aphasia`<br>`alexia`<br>`agraphia` | adult-onset → null |
| 884 | Myosin Heavy Chain 7関連ミオパチー | symptoms | 4→1 | `preferential weakness of the great toe`<br>`ankle dorsiflexor`<br>`finger extensor`<br>`neck flexor` | `preferential weakness of the great toe, ankle dorsiflexor, finger extensor and neck flexor` | — |
| 896 | 遺伝性感覚性ニューロパチーII型 | symptoms | 3→1 | `profound`<br>`universal sensory loss involving large`<br>`small fiber nerves` | `profound and universal sensory loss` | — |
| 899 | 遺伝性ニューロパチー（GDAP1型） | symptoms、onset | 7→7 | `early-onset (infancy to early childhood) of severe`<br>`rapidly progressing axonal`<br>`or intermediate sensorimotor neuropathy usually affecting first`<br>`more severely`<br>`distal lower extremities`<br>`later the proximal muscles`<br>`upper extremities` | `distal muscle weakness and atrophy`<br>`sensory loss`<br>`pes cavus foot deformity`<br>`delayed motor development`<br>`vocal cord paresis`<br>`abolished deep tendon reflexes`<br>`skeletal deformities` | early-onset → infancy to early childhood |
| 903 | 純粋自律神経不全症 | symptoms | 1→2 | `slowly progressive symptoms of orthostatic hypotension (OH)` | `orthostatic hypotension`<br>`generalised dysautonomia` | — |
| 906 | 透析アミロイドーシス | symptoms、summary（実体参照の復号） | 4→3 | `cystic bone lesions`<br>`destructive osteoarthropathy` | `carpal tunnel syndrome` | — |
| 911 | カルニチンパルミトイルトランスフェラーゼ1A欠損症 | symptoms | 2→1 | `recurrent attacks of fasting-induced hypoketotic hypoglycemia` | — | — |
| 914 | チロシン血症1型 | summary（治療薬名を含む句を省略）、symptoms | 3→2 | `renal tubular dysfunction` | — | — |
| 918 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | 変更なし（notes のみ） | 5→5 | — | — | — |
| 922 | 先天性小腸閉鎖症 | symptoms | 2→1 | `disruption in the normal small intestine continuity`<br>`resulting in intestinal obstruction` | `intestinal obstruction` | — |
| 926 | 先天性後鼻孔閉鎖 | symptoms | 1→2 | `obstruction of one (unilateral) or both (bilateral) choanal aperture(s)` | `acute respiratory distress`<br>`chronic nasal obstruction` | — |
| 928 | Goldenhar症候群 | symptoms | 2→3 | `hemifacial microsomia associated with ear and/or eye malformations`<br>`vertebral anomalies of variable severity` | `hemifacial microsomia`<br>`ear and/or eye malformations`<br>`vertebral anomalies` | — |
| 933 | 先天性緑内障 | symptoms | 1→2 | `elevated intra-ocular pressure` | `increase in the size of the eye`<br>`corneal edema` | — |
| 939 | Usher症候群2型 | symptoms | 3→4 | `retinitis pigmentosa developing in the first or second decade`<br>`normal vestibular function` | `night blindness`<br>`constricted visual field (tunnel vision)`<br>`decreased visual acuity` | — |
| 945 | Waardenburg症候群1型 | symptoms | 4→3 | `hair`<br>`skin`<br>`in combination with dystopia canthorum` | `pigmentation anomalies of eyes, hair, and skin`<br>`dystopia canthorum` | — |
