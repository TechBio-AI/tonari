# ORPHA 番号の手動レビュー表 — 照合不能（D）のうち現番号が対応表にあるレコード

- 作成日: 2026-09-10。親文書: `docs/orpha_correction_proposal_2026-08-29.md`（方針・件数・分析はそちら）
- 物差し: `data/hpo/phenotype.hpoa`（HPO annotations version 2026-06-23）。英語疾患名は `disease_name` 列そのまま
- 対象: D 712 件のうち、現番号が対応表にあり英語疾患名が分かる **345 件**（§1）。加えて現番号が対応表に無い 117 件を §2 に置いた
- 複数コードに当たって曖昧になったレコードは **今回 0 件**。同義語照合を入れると出てくるので、その際は候補コードを併記する列を足す

## 見立ての判定基準（機械判定。医学的判断ではない）

現番号の英語疾患名と、そのレコードの英語別名（略号を除く）を正規化して比較した。

| 見立て | 基準（上から順に最初に該当したもの） |
|---|---|
| 明らかに別疾患 | (1) 接尾辞英訳（`Morvan症候群` → Morvan syndrome）が現番号と**別の**コードに当たった、または (2) 英語別名があるのに Dice < 0.2 かつ 4 文字以上の内容語を共有せず、略号の頭字語対応も無い |
| 一致している可能性が高い | (1) 接尾辞英訳が現番号に当たった、(2) 略号が現番号の英語名の頭字語と一致（CCHS ↔ Congenital central hypoventilation syndrome、LGMDR1 ↔ limb-girdle muscular dystrophy R1）、または (3) Dice ≥ 0.5 か 6 文字以上の内容語（人名・臓器名・酵素名）を共有 |
| 近縁の可能性 | Dice 0.2 以上 0.5 未満、または 4 文字以上の内容語を共有 |
| 不明 | 使える英語別名が無い（略号のみで頭字語も合わない、または英語名なし）。日本語名からは判断していない |

**「明らかに別疾患」には、英語別名が人名・慣用名（Hunter syndrome、Ondine curse、I-cell disease、Fahr disease）で現番号の記述名と文字列上の共通点が無いだけのものが混じる。** 上から判定する際は、まず「日本語疾患名」と「その番号が指す英語疾患名」を見比べてほしい。

「参考」列は §5.5・§5.2（親文書）の 2 つの参考集計。**提案ではない**。
- 接尾辞英訳: `Krabbe病` → `Krabbe disease` のように接尾辞だけ英訳して当たったコード。現番号と同じなら「現番号を裏付け」
- 最近傍: 対応表の中で英語別名に最も近い推奨名（Dice 0.6 以上のときだけ表示）

## 1. 現番号が対応表にあるレコード

「明らかに別疾患」を上に。同じ見立ての中では index 順。

| # | index | 日本語疾患名 | 現 ORPHA 番号 | その番号が指す英語疾患名 | 一致度の見立て | 根拠（英語別名 / Dice / 共有語） | 参考 |
|--:|--:|---|---|---|---|---|---|
| 1 | 2 | ムコ多糖症II型 | ORPHA:580 | Mucopolysaccharidosis type 2 | 明らかに別疾患 | Hunter syndrome / 0.00 | 最近傍: ORPHA:93473 Hurler syndrome (0.77) |
| 2 | 79 | 皮質基底核変性症 | ORPHA:2098 | Acromesomelic dysplasia, Grebe type | 明らかに別疾患 | Corticobasal Degeneration / 0.08 |  |
| 3 | 144 | ムコ多糖症III型 | ORPHA:581 | Mucopolysaccharidosis type 3 | 明らかに別疾患 | Sanfilippo Syndrome / 0.14 | 最近傍: ORPHA:3255 Filippi syndrome (0.77) |
| 4 | 145 | ムコ多糖症IV型 | ORPHA:582 | Mucopolysaccharidosis type 4 | 明らかに別疾患 | Morquio Syndrome / 0.05 | 最近傍: ORPHA:2563 MOMO syndrome (0.78) |
| 5 | 146 | ムコ多糖症VI型 | ORPHA:583 | Mucopolysaccharidosis type 6 | 明らかに別疾患 | Maroteaux-Lamy Syndrome / 0.09 | 最近傍: ORPHA:1777 Temtamy syndrome (0.67) |
| 6 | 214 | 魚鱗癬 | ORPHA:281 | Monosomy 5p syndrome | 明らかに別疾患 | Ichthyosis / 0.08 | 最近傍: ORPHA:313 Lamellar ichthyosis (0.72) |
| 7 | 262 | ペルオキシソーム病 | ORPHA:912 | Zellweger syndrome | 明らかに別疾患 | Peroxisomal Disorder / 0.19 |  |
| 8 | 284 | ムコリピドーシスII型 | ORPHA:576 | Mucolipidosis type II | 明らかに別疾患 | I-cell Disease / 0.07 |  |
| 9 | 349 | 後腹膜線維症 | ORPHA:31 | Oxoglutaric aciduria | 明らかに別疾患 | Retroperitoneal Fibrosis / 0.05 | 最近傍: ORPHA:49041 IgG4-related retroperitoneal fibrosis (0.81) |
| 10 | 351 | 遠位型ミオパチー | ORPHA:399 | Huntington disease | 明らかに別疾患 | Distal Myopathy / 0.14 | 最近傍: ORPHA:59135 Laing distal myopathy (0.84) |
| 11 | 543 | セロイドリポフスチン症 | ORPHA:281 | Monosomy 5p syndrome | 明らかに別疾患 | Neuronal Ceroid Lipofuscinosis / 0.19 |  |
| 12 | 612 | Ellis-van Creveld症候群 | ORPHA:298 | Mitochondrial neurogastrointestinal encephalomyopathy | 明らかに別疾患 | 接尾辞英訳が別コードに当たる（参考列）（英語別名 Chondroectodermal Dysplasia / Dice 0.29） | 接尾辞英訳: **ORPHA:289 Ellis Van Creveld syndrome**; 最近傍: ORPHA:189 Hidrotic ectodermal dysplasia (0.78) |
| 13 | 654 | Isaac症候群 | ORPHA:84142 | Isaacs syndrome | 明らかに別疾患 | Neuromyotonia / 0.16 |  |
| 14 | 655 | Morvan症候群 | ORPHA:84 | Fanconi anemia | 明らかに別疾患 | 接尾辞英訳が別コードに当たる（参考列）（英語別名 Morvan Fibrillary Chorea / Dice 0.07） | 接尾辞英訳: **ORPHA:83467 Morvan syndrome** |
| 15 | 681 | リンパ管腫症 | ORPHA:2136 | Hennekam syndrome | 明らかに別疾患 | Generalized Lymphatic Anomaly / 0.15 |  |
| 16 | 693 | 遺伝性褐色細胞腫/パラガングリオーマ症候群 | ORPHA:29072 | Hereditary pheochromocytoma-paraganglioma | 明らかに別疾患 | SDHx / 0.00 |  |
| 17 | 699 | Ataxia with oculomotor apraxia type 1 | ORPHA:14 | Abetalipoproteinemia | 明らかに別疾患 | Ataxia with oculomotor apraxia type 1 / 0.18 | 最近傍: ORPHA:1168 Ataxia-oculomotor apraxia type 1 (0.88) |
| 18 | 722 | Kufor-Rakeb症候群 | ORPHA:306669 | Hemiparkinsonism-hemiatrophy syndrome | 明らかに別疾患 | 接尾辞英訳が別コードに当たる（参考列） | 接尾辞英訳: **ORPHA:306674 Kufor-Rakeb syndrome** |
| 19 | 731 | X連鎖性ジストニア・パーキンソニズム | ORPHA:53351 | X-linked dystonia-parkinsonism | 明らかに別疾患 | Lubag / 0.00 |  |
| 20 | 735 | 特発性基底核石灰化症 | ORPHA:1980 | Bilateral striopallidodentate calcinosis | 明らかに別疾患 | Fahr Disease / 0.05 | 最近傍: ORPHA:333 Farber disease (0.70) |
| 21 | 784 | Mounier-Kuhn症候群 | ORPHA:3347 | Mounier-Kühn syndrome | 明らかに別疾患 | Tracheobronchomegaly / 0.17 |  |
| 22 | 805 | Bosch-Boonstra-Schaaf視神経萎縮症候群 | ORPHA:401777 | Optic atrophy-intellectual disability syndrome | 明らかに別疾患 | BBSOAS / 0.00 |  |
| 23 | 820 | 限局性強皮症 | ORPHA:2715 | Severe oculo-renal-cerebellar syndrome | 明らかに別疾患 | Morphea / 0.06 |  |
| 24 | 835 | Bernard-Soulier症候群 | ORPHA:868 | Triose phosphate-isomerase deficiency | 明らかに別疾患 | 接尾辞英訳が別コードに当たる（参考列） | 接尾辞英訳: **ORPHA:274 Bernard-Soulier syndrome** |
| 25 | 851 | ヌーナン症候群様疾患(CBL変異) | ORPHA:363700 | Neurofibromatosis type 1 due to NF1 mutation or intragenic deletion | 明らかに別疾患 | Noonan-Like with CBL / 0.06 |  |
| 26 | 867 | Anti-MAG抗体ニューロパチー | ORPHA:100057 | Renin-angiotensin-aldosterone system-blocker-induced angioedema | 明らかに別疾患 | Anti-MAG Neuropathy / 0.14 | 最近傍: ORPHA:643 Giant axonal neuropathy (0.61) |
| 27 | 886 | 複合体III欠損症 | ORPHA:2611 | Linear verrucous nevus syndrome | 明らかに別疾患 | Complex III Deficiency / 0.09 | 最近傍: ORPHA:2609 Isolated complex I deficiency (0.79) |
| 28 | 887 | 複合体IV欠損症（SCO2型） | ORPHA:2612 | Linear nevus sebaceus syndrome | 明らかに別疾患 | Complex IV Deficiency SCO2 / 0.05 | 最近傍: ORPHA:650 LCAT deficiency (0.72) |
| 29 | 892 | 先天性intrinsic factor欠損症 | ORPHA:35858 | Imerslund-Gräsbeck syndrome | 明らかに別疾患 | Congenital IF Deficiency / 0.00 | 最近傍: ORPHA:335 Congenital fibrinogen deficiency (0.76) |
| 30 | 897 | D-2ヒドロキシグルタル酸尿症 | ORPHA:79315 | D-2-hydroxyglutaric aciduria | 明らかに別疾患 | D-2-HGA / 0.15 |  |
| 31 | 898 | L-2ヒドロキシグルタル酸尿症 | ORPHA:79314 | L-2-hydroxyglutaric aciduria | 明らかに別疾患 | L-2-HGA / 0.15 |  |
| 32 | 900 | 先天性副腎不全(NR0B1型) | ORPHA:169 | Ringed hair disease | 明らかに別疾患 | X-Linked AHC / 0.17 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 33 | 922 | DNM2関連中心核ミオパチー | ORPHA:169186 | Autosomal recessive centronuclear myopathy | 明らかに別疾患 | DNM2-CNM / 0.00 |  |
| 34 | 923 | BIN1関連中心核ミオパチー | ORPHA:169189 | Autosomal dominant centronuclear myopathy | 明らかに別疾患 | BIN1-CNM / 0.05 |  |
| 35 | 984 | 微小眼球症 | ORPHA:136 | Cerebral autosomal dominant arteriopathy-subcortical infarcts-leukoencephalopathy | 明らかに別疾患 | Microphthalmia / 0.19 | 最近傍: ORPHA:568 Microphthalmia, Lenz type (0.77) |
| 36 | 46 | 骨髄異形成症候群 | ORPHA:52 | Alagille syndrome | 近縁の可能性 | Myelodysplastic Syndromes / 0.47 | 最近傍: ORPHA:98827 Unclassified myelodysplastic syndrome (0.80) |
| 37 | 58 | 22q11.2欠失症候群 | ORPHA:567 | 22q11.2 deletion syndrome | 近縁の可能性 | Velocardiofacial Syndrome / 0.41 | 最近傍: ORPHA:2008 Acrocardiofacial syndrome (0.91) |
| 38 | 166 | グルタル酸血症1型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | 近縁の可能性 | Glutaric Acidemia Type 1 / 0.31 | 最近傍: ORPHA:35706 Glutaric acidemia type 3 (0.95) |
| 39 | 181 | 高IgD症候群 | ORPHA:343 | Hyperimmunoglobulinemia D with periodic fever | 近縁の可能性 | Hyper-IgD Syndrome / 0.20 | 最近傍: ORPHA:87 Apert syndrome (0.67) |
| 40 | 228 | 総動脈幹遺残症 | ORPHA:3384 | Common arterial trunk | 近縁の可能性 | Truncus Arteriosus / 0.48 |  |
| 41 | 296 | 5p欠失症候群 | ORPHA:281 | Monosomy 5p syndrome | 近縁の可能性 | Cri du Chat Syndrome / 0.44 | 最近傍: ORPHA:1401 CHAND syndrome (0.67) |
| 42 | 367 | 抗糸球体基底膜病 | ORPHA:375 | Anti-glomerular basement membrane disease | 近縁の可能性 | Anti-GBM Disease / 0.45 / anti | 最近傍: ORPHA:991 PAGOD syndrome (0.67) |
| 43 | 388 | 先天性副腎低形成症 | ORPHA:95 | Friedreich ataxia | 近縁の可能性 | Adrenal Hypoplasia Congenita / 0.21 | 最近傍: ORPHA:95702 X-linked adrenal hypoplasia congenita (0.87) |
| 44 | 442 | MECP2重複症候群 | ORPHA:85280 | X-linked intellectual disability-cubitus valgus-dysmorphism syndrome | 近縁の可能性 | MECP2 Duplication Syndrome / 0.25 | 最近傍: ORPHA:284180 Xp22.13p22.2 duplication syndrome (0.85) |
| 45 | 476 | 腎性尿崩症 | ORPHA:223 | Arginine vasopressin resistance | 近縁の可能性 | Nephrogenic Diabetes Insipidus / 0.20 |  |
| 46 | 494 | シトリン欠損症 | ORPHA:247585 | Citrullinemia type II | 近縁の可能性 | Citrin Deficiency / 0.26 | 最近傍: ORPHA:335 Congenital fibrinogen deficiency (0.67) |
| 47 | 498 | 偽性副甲状腺機能低下症 | ORPHA:457 | Harlequin ichthyosis | 近縁の可能性 | Pseudohypoparathyroidism / 0.20 | 最近傍: ORPHA:79445 Pseudopseudohypoparathyroidism (1.00) |
| 48 | 523 | 糖原病Ia型 | ORPHA:364 | Glycogen storage disease due to glucose-6-phosphatase deficiency | 近縁の可能性 | Von Gierke Disease / 0.25 | 最近傍: ORPHA:31150 Tangier disease (0.69) |
| 49 | 524 | 糖原病III型 | ORPHA:366 | Glycogen storage disease due to glycogen debranching enzyme deficiency | 近縁の可能性 | Cori Disease / 0.27 | 最近傍: ORPHA:649 Norrie disease (0.70) |
| 50 | 525 | 糖原病V型 | ORPHA:368 | Glycogen storage disease due to muscle glycogen phosphorylase deficiency | 近縁の可能性 | McArdle Disease / 0.25 | 最近傍: ORPHA:3005 Pyle disease (0.67) |
| 51 | 526 | 中鎖アシルCoA脱水素酵素欠損症 | ORPHA:42 | Medium chain acyl-CoA dehydrogenase deficiency | 近縁の可能性 | MCAD Deficiency / 0.46 | 最近傍: ORPHA:650 LCAT deficiency (0.77) |
| 52 | 527 | グルタル酸血症I型 | ORPHA:25 | Glutaryl-CoA dehydrogenase deficiency | 近縁の可能性 | Glutaric Acidemia Type I / 0.31 | 最近傍: ORPHA:35706 Glutaric acidemia type 3 (0.95) |
| 53 | 528 | ホロカルボキシラーゼ合成酵素欠損症 | ORPHA:79242 | Holocarboxylase synthetase deficiency | 近縁の可能性 | HLCS Deficiency / 0.40 | 最近傍: ORPHA:650 LCAT deficiency (0.77) |
| 54 | 530 | テトラヒドロビオプテリン欠乏症 | ORPHA:226 | Dihydropteridine reductase deficiency | 近縁の可能性 | BH4 Deficiency / 0.42 | 最近傍: ORPHA:650 LCAT deficiency (0.72) |
| 55 | 531 | カルバミルリン酸合成酵素I欠損症 | ORPHA:147 | Carbamoyl-phosphate synthetase 1 deficiency | 近縁の可能性 | CPS1 Deficiency / 0.40 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 56 | 532 | N-アセチルグルタミン酸合成酵素欠損症 | ORPHA:927 | Hyperammonemia due to N-acetylglutamate synthase deficiency | 近縁の可能性 | NAGS Deficiency / 0.32 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 57 | 538 | シアリドーシス | ORPHA:3166 | Sialuria | 近縁の可能性 | Sialidosis / 0.43 | 最近傍: ORPHA:812 Sialidosis type 1 (0.76) |
| 58 | 577 | 3-ヒドロキシ-3-メチルグルタル酸尿症 | ORPHA:35701 | 3-hydroxy-3-methylglutaryl-CoA synthase deficiency | 近縁の可能性 | HMG-CoA Lyase Deficiency / 0.47 | 最近傍: ORPHA:103909 Trehalase deficiency (0.68) |
| 59 | 578 | カルニチンパルミトイルトランスフェラーゼII欠損症 | ORPHA:228302 | Carnitine palmitoyl transferase II deficiency, myopathic form | 近縁の可能性 | CPT2 Deficiency / 0.29 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 60 | 580 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | ORPHA:832 | Succinyl-CoA:3-oxoacid CoA transferase deficiency | 近縁の可能性 | SCOT Deficiency / 0.41 | 最近傍: ORPHA:650 LCAT deficiency (0.77) |
| 61 | 581 | ミトコンドリア三機能蛋白欠損症 | ORPHA:5 | Long chain 3-hydroxyacyl-CoA dehydrogenase deficiency | 近縁の可能性 | LCHAD Deficiency / 0.49 | 最近傍: ORPHA:650 LCAT deficiency (0.74) |
| 62 | 632 | Mevalonate Kinase欠損症 | ORPHA:343 | Hyperimmunoglobulinemia D with periodic fever | 近縁の可能性 | Hyper-IgD Syndrome / 0.20 | 最近傍: ORPHA:87 Apert syndrome (0.67) |
| 63 | 642 | 総排泄腔遺残 | ORPHA:93929 | Cloacal exstrophy | 近縁の可能性 | Persistent Cloaca / 0.40 |  |
| 64 | 701 | 甲状腺ホルモン不応症 | ORPHA:853 | Fetal and neonatal alloimmune thrombocytopenia | 近縁の可能性 | Resistance to Thyroid Hormone / 0.30 | 最近傍: ORPHA:566243 Resistance to thyroid hormone due to a mutation in thyroid hormone receptor beta (0.72) |
| 65 | 709 | 先天性筋ジストロフィー（メロシン欠損型） | ORPHA:258 | Laminin subunit alpha 2-related congenital muscular dystrophy | 近縁の可能性 | LAMA2-Related CMD / 0.35 |  |
| 66 | 713 | 先天性リポイド過形成症 | ORPHA:90790 | Congenital lipoid adrenal hyperplasia due to STAR deficency | 近縁の可能性 | StAR Deficiency / 0.37 / star | 最近傍: ORPHA:91 Aromatase deficiency (0.71) |
| 67 | 719 | 遺伝性パントテン酸キナーゼ関連神経変性 | ORPHA:157846 | Neuroferritinopathy | 近縁の可能性 | Neurodegeneration with Brain Iron Accumulation 1 / 0.38 |  |
| 68 | 736 | 遺伝性多発性外骨腫 | ORPHA:321 | Multiple osteochondromas | 近縁の可能性 | Multiple Hereditary Exostoses / 0.39 |  |
| 69 | 738 | 大田原症候群 | ORPHA:65286 | 3q29 microdeletion syndrome | 近縁の可能性 | Ohtahara Syndrome / 0.37 | 最近傍: ORPHA:1934 Early infantile developmental and epileptic encephalopathy (0.84) |
| 70 | 742 | 18トリソミー | ORPHA:3380 | Trisomy 18 syndrome | 近縁の可能性 | Edwards Syndrome / 0.48 | 最近傍: ORPHA:101016 Romano-Ward syndrome (0.76) |
| 71 | 775 | 先天性ナトリウム下痢 | ORPHA:103910 | Congenital enterocyte heparan sulfate deficiency | 近縁の可能性 | Congenital Sodium Diarrhea / 0.37 |  |
| 72 | 782 | 先天性肺サーファクタント異常症 | ORPHA:217563 | Neonatal acute respiratory distress syndrome | 近縁の可能性 | Surfactant Dysfunction Disorders / 0.25 |  |
| 73 | 800 | Best卵黄状黄斑ジストロフィー | ORPHA:1243 | Best vitelliform macular dystrophy | 近縁の可能性 | Best Disease / 0.16 / best | 最近傍: ORPHA:117 Behçet disease (0.70) |
| 74 | 844 | PAI-1欠損症 | ORPHA:99901 | Acyl-CoA dehydrogenase 9 deficiency | 近縁の可能性 | PAI-1 Deficiency / 0.45 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 75 | 848 | 遺伝性血小板減少症(MYH9関連疾患) | ORPHA:182050 | MYH9-related syndromic thrombocytopenia | 近縁の可能性 | MYH9-RD / 0.21 / myh9 |  |
| 76 | 883 | 先天性高乳酸血症（PDH欠損症） | ORPHA:765 | Pyruvate dehydrogenase deficiency | 近縁の可能性 | PDH Deficiency / 0.46 | 最近傍: ORPHA:650 LCAT deficiency (0.72) |
| 77 | 884 | 先天性高乳酸血症（PC欠損症） | ORPHA:3008 | Pyruvate carboxylase deficiency | 近縁の可能性 | PC Deficiency / 0.46 | 最近傍: ORPHA:650 LCAT deficiency (0.75) |
| 78 | 890 | 遺伝性マンガン輸送異常症 | ORPHA:521406 | Dystonia-parkinsonism-hypermanganesemia syndrome | 近縁の可能性 | SLC39A14-Related Manganism / 0.23 |  |
| 79 | 896 | ピリドキサミン5リン酸氧化酵素欠損症 | ORPHA:79096 | Pyridoxamine-5-phosphate deficiency-developmental and epileptic encephalopathy | 近縁の可能性 | PNPO Deficiency / 0.27 | 最近傍: ORPHA:650 LCAT deficiency (0.69) |
| 80 | 921 | SELENON関連ミオパチー | ORPHA:97244 | Rigid spine syndrome | 近縁の可能性 | Rigid Spine Muscular Dystrophy / 0.47 / rigid, spine | 最近傍: ORPHA:98896 Duchenne muscular dystrophy (0.72) |
| 81 | 956 | カルニチンパルミトイルトランスフェラーゼ1A欠損症 | ORPHA:156 | Carnitine palmitoyl transferase 1A deficiency | 近縁の可能性 | CPT1A Deficiency / 0.42 | 最近傍: ORPHA:650 LCAT deficiency (0.67) |
| 82 | 958 | 3-Hydroxy-3-Methylglutaryl-CoA Lyase欠損症 | ORPHA:35701 | 3-hydroxy-3-methylglutaryl-CoA synthase deficiency | 近縁の可能性 | HMG-CoA Lyase Deficiency / 0.47 | 最近傍: ORPHA:103909 Trehalase deficiency (0.68) |
| 83 | 985 | 先天性白内障 | ORPHA:136 | Cerebral autosomal dominant arteriopathy-subcortical infarcts-leukoencephalopathy | 近縁の可能性 | Congenital Cataract / 0.24 | 最近傍: ORPHA:115 Congenital contractural arachnodactyly (0.65) |
| 84 | 1 | ムコ多糖症I型 | ORPHA:93473 | Hurler syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け; 接尾辞英訳: **ORPHA:93474 Scheie syndrome**; 接尾辞英訳: **ORPHA:93476 Hurler-Scheie syndrome** |
| 85 | 49 | エーラス・ダンロス症候群 | ORPHA:287 | Classical Ehlers-Danlos syndrome | 一致している可能性が高い | 略号 EDS が頭字語に対応（英語別名 Ehlers-Danlos Syndrome / Dice 0.84） | 最近傍: ORPHA:75497 X-linked Ehlers-Danlos syndrome (0.84) |
| 86 | 56 | 多発性嚢胞腎 | ORPHA:730 | Autosomal dominant polycystic kidney disease | 一致している可能性が高い | 略号 PKD が頭字語に対応（英語別名 Polycystic Kidney Disease / Dice 0.72） | 最近傍 = 現番号 |
| 87 | 59 | 筋強直性ジストロフィー | ORPHA:273 | Steinert myotonic dystrophy | 一致している可能性が高い | Myotonic Dystrophy / 0.82 / myotonic, dystrophy | 最近傍 = 現番号 |
| 88 | 72 | 副腎白質ジストロフィー | ORPHA:43 | X-linked adrenoleukodystrophy | 一致している可能性が高い | Adrenoleukodystrophy / 0.84 / adrenoleukodystrophy | 最近傍 = 現番号 |
| 89 | 84 | 視神経脊髄炎 | ORPHA:71211 | Neuromyelitis optica spectrum disorder | 一致している可能性が高い | Neuromyelitis Optica / 0.71 / neuromyelitis, optica | 最近傍 = 現番号 |
| 90 | 92 | ホモシスチン尿症 | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | 一致している可能性が高い | Homocystinuria / 0.46 / homocystinuria | 最近傍: ORPHA:214 Cystinuria (0.82) |
| 91 | 106 | 天疱瘡 | ORPHA:704 | Pemphigus vulgaris | 一致している可能性が高い | Pemphigus / 0.67 / pemphigus | 最近傍: ORPHA:555905 IgA pemphigus (0.89) |
| 92 | 111 | 肺胞蛋白症 | ORPHA:747 | Autoimmune pulmonary alveolar proteinosis | 一致している可能性が高い | 略号 PAP が頭字語に対応（英語別名 Pulmonary Alveolar Proteinosis / Dice 0.84） | 最近傍: ORPHA:264675 Hereditary pulmonary alveolar proteinosis (0.87) |
| 93 | 118 | 褐色細胞腫 | ORPHA:29072 | Hereditary pheochromocytoma-paraganglioma | 一致している可能性が高い | Pheochromocytoma / 0.58 / pheochromocytoma | 最近傍: ORPHA:251912 Pineocytoma (0.61) |
| 94 | 125 | 福山型先天性筋ジストロフィー | ORPHA:272 | Congenital muscular dystrophy, Fukuyama type | 一致している可能性が高い | Fukuyama CMD / 0.29 / fukuyama | 最近傍 = 現番号 |
| 95 | 126 | ナルコレプシー | ORPHA:2073 | Narcolepsy type 1 | 一致している可能性が高い | Narcolepsy / 0.78 / narcolepsy | 最近傍 = 現番号 |
| 96 | 129 | 原発性マクログロブリン血症 | ORPHA:33226 | Waldenström macroglobulinemia | 一致している可能性が高い | 略号 WM が頭字語に対応 |  |
| 97 | 134 | 球脊髄性筋萎縮症 | ORPHA:481 | Kennedy disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Spinal and Bulbar Muscular Atrophy / Dice 0.00） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:70 Proximal spinal muscular atrophy (0.73) |
| 98 | 158 | 先天性フィブリノゲン欠乏症 | ORPHA:98880 | Familial afibrinogenemia | 一致している可能性が高い | Congenital Afibrinogenemia / 0.76 / afibrinogenemia | 最近傍 = 現番号 |
| 99 | 174 | 亜急性硬化性全脳炎 | ORPHA:2806 | Subacute sclerosing leukoencephalitis | 一致している可能性が高い | Subacute Sclerosing Panencephalitis / 0.86 / subacute, sclerosing | 最近傍 = 現番号 |
| 100 | 177 | 線維性骨異形成症 | ORPHA:249 | Fibrous dysplasia of bone | 一致している可能性が高い | Fibrous Dysplasia / 0.83 / fibrous, dysplasia | 最近傍 = 現番号 |
| 101 | 179 | TRAPS | ORPHA:32960 | Tumor necrosis factor receptor 1 associated periodic syndrome | 一致している可能性が高い | Tumor Necrosis Factor Receptor-Associated Periodic Syndrome / 0.97 / necrosis, factor, receptor, periodic | 最近傍 = 現番号 |
| 102 | 188 | 胆道閉鎖症 | ORPHA:30391 | Isolated biliary atresia | 一致している可能性が高い | Biliary Atresia / 0.77 / biliary, atresia | 最近傍 = 現番号 |
| 103 | 193 | POEMS症候群 | ORPHA:2905 | POEMS syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Polyneuropathy Organomegaly Endocrinopathy M-protein Skin changes / Dice 0.21） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:453533 Polyendocrine-polyneuropathy syndrome (0.63) |
| 104 | 209 | ミオクロニーてんかん | ORPHA:308 | Progressive myoclonic epilepsy type 1 | 一致している可能性が高い | 略号 PME が頭字語に対応（英語別名 Progressive Myoclonus Epilepsy / Dice 0.81） | 最近傍: ORPHA:324290 PRDM8-related progressive myoclonus epilepsy (0.84) |
| 105 | 212 | 血球貪食性リンパ組織球症 | ORPHA:540 | Familial hemophagocytic lymphohistiocytosis | 一致している可能性が高い | Hemophagocytic Lymphohistiocytosis / 0.87 / hemophagocytic, lymphohistiocytosis | 最近傍 = 現番号 |
| 106 | 229 | 完全大血管転位症 | ORPHA:860 | Congenitally uncorrected transposition of the great arteries | 一致している可能性が高い | 略号 TGA が頭字語に対応（英語別名 Transposition of Great Arteries / Dice 0.70） | 最近傍: ORPHA:216694 Congenitally corrected transposition of the great arteries (0.72) |
| 107 | 235 | カルニチン欠乏症 | ORPHA:158 | Systemic primary carnitine deficiency | 一致している可能性が高い | 略号 PCD が頭字語に対応（英語別名 Primary Carnitine Deficiency / Dice 0.87） | 最近傍 = 現番号 |
| 108 | 242 | 遺伝性出血性末梢血管拡張症 | ORPHA:774 | Hereditary hemorrhagic telangiectasia | 一致している可能性が高い | 略号 HHT が頭字語に対応（英語別名 Osler-Weber-Rendu / Dice 0.14） |  |
| 109 | 247 | 肺ランゲルハンス細胞組織球症 | ORPHA:389 | Langerhans cell histiocytosis | 一致している可能性が高い | Pulmonary Langerhans Cell Histiocytosis / 0.84 / langerhans, histiocytosis | 最近傍 = 現番号 |
| 110 | 249 | IgA血管炎 | ORPHA:761 | Immunoglobulin A vasculitis | 一致している可能性が高い | IgA Vasculitis / 0.59 / vasculitis | 最近傍 = 現番号 |
| 111 | 254 | 顔面肩甲上腕型筋ジストロフィー | ORPHA:269 | Facioscapulohumeral dystrophy | 一致している可能性が高い | Facioscapulohumeral Muscular Dystrophy / 0.87 / facioscapulohumeral, dystrophy | 最近傍 = 現番号 |
| 112 | 261 | ウルリッヒ型先天性筋ジストロフィー | ORPHA:75840 | Ullrich congenital muscular dystrophy | 一致している可能性が高い | 略号 UCMD が頭字語に対応（英語別名 Ullrich CMD / Dice 0.34） |  |
| 113 | 267 | ガストリノーマ | ORPHA:913 | Zollinger-Ellison syndrome | 一致している可能性が高い | 略号 ZES が頭字語に対応（英語別名 Gastrinoma / Dice 0.13） |  |
| 114 | 282 | エプスタイン奇形 | ORPHA:1880 | Ebstein malformation of the tricuspid valve | 一致している可能性が高い | Ebstein Anomaly / 0.38 / ebstein |  |
| 115 | 291 | 先天性巨大色素性母斑 | ORPHA:626 | Large/giant congenital melanocytic nevus | 一致している可能性が高い | Giant Congenital Melanocytic Nevus / 0.95 / melanocytic | 最近傍 = 現番号 |
| 116 | 306 | 周期性四肢麻痺 | ORPHA:681 | Hypokalemic periodic paralysis | 一致している可能性が高い | Periodic Paralysis / 0.80 / periodic, paralysis | 最近傍: ORPHA:682 Hyperkalemic periodic paralysis (0.82) |
| 117 | 317 | 骨パジェット病 | ORPHA:2801 | Juvenile Paget disease | 一致している可能性が高い | Paget's Disease of Bone / 0.59 / paget | 最近傍: ORPHA:329475 Spastic paraplegia-Paget disease of bone syndrome (0.60) |
| 118 | 320 | 緑内障（先天性） | ORPHA:98977 | Juvenile glaucoma | 一致している可能性が高い | Primary Congenital Glaucoma / 0.49 / glaucoma | 最近傍: ORPHA:98976 Congenital glaucoma (0.84) |
| 119 | 330 | 常染色体劣性多発性嚢胞腎 | ORPHA:731 | Autosomal recessive polycystic kidney disease | 一致している可能性が高い | 略号 ARPKD が頭字語に対応（英語別名 Autosomal Recessive PKD / Dice 0.61） | 最近傍: ORPHA:93329 Autosomal recessive omodysplasia (0.72) |
| 120 | 334 | 遺伝性膵炎 | ORPHA:676 | Autosomal dominant hereditary chronic pancreatitis | 一致している可能性が高い | Hereditary Pancreatitis / 0.59 / pancreatitis |  |
| 121 | 344 | Kearns-Sayre症候群 | ORPHA:480 | Kearns-Sayre syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 122 | 353 | 骨髄性プロトポルフィリン症 | ORPHA:79278 | Autosomal erythropoietic protoporphyria | 一致している可能性が高い | Erythropoietic Protoporphyria / 0.86 / erythropoietic, protoporphyria | 最近傍: ORPHA:95159 Hepatoerythropoietic porphyria (0.86) |
| 123 | 389 | Beckwith-Wiedemann症候群 | ORPHA:116 | Beckwith-Wiedemann syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 124 | 390 | Silver-Russell症候群 | ORPHA:813 | Silver-Russell syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 125 | 392 | Prader-Willi症候群 | ORPHA:739 | Prader-Willi syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 126 | 393 | Cornelia de Lange症候群 | ORPHA:199 | Cornelia de Lange syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 CdLS / Dice 0.00） | 接尾辞英訳: 現番号を裏付け |
| 127 | 396 | VACTERL連合 | ORPHA:887 | VACTERL/VATER association | 一致している可能性が高い | VACTERL Association / 0.91 / vacterl, association | 最近傍 = 現番号 |
| 128 | 397 | Rubinstein-Taybi症候群 | ORPHA:783 | Rubinstein-Taybi syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 129 | 398 | Smith-Magenis症候群 | ORPHA:819 | Smith-Magenis syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 130 | 399 | Alagille症候群 | ORPHA:52 | Alagille syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 131 | 400 | Crigler-Najjar症候群 | ORPHA:205 | Crigler-Najjar syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 132 | 402 | Treacher Collins症候群 | ORPHA:861 | Treacher-Collins syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 133 | 406 | 神経有棘赤血球症 | ORPHA:2388 | Choreoacanthocytosis | 一致している可能性が高い | Neuroacanthocytosis / 0.78 | 最近傍 = 現番号 |
| 134 | 410 | 遺伝性鉄芽球性貧血 | ORPHA:75564 | Acquired idiopathic sideroblastic anemia | 一致している可能性が高い | Hereditary Sideroblastic Anemia / 0.70 / sideroblastic, anemia | 最近傍: ORPHA:75563 X-linked sideroblastic anemia (0.73) |
| 135 | 411 | ピルビン酸キナーゼ欠損症 | ORPHA:766 | Hemolytic anemia due to red cell pyruvate kinase deficiency | 一致している可能性が高い | 略号 PKD が頭字語に対応（英語別名 Pyruvate Kinase Deficiency / Dice 0.66） | 最近傍: ORPHA:765 Pyruvate dehydrogenase deficiency (0.80) |
| 136 | 419 | Phelan-McDermid症候群 | ORPHA:48652 | Phelan-McDermid syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 137 | 421 | Coffin-Siris症候群 | ORPHA:1465 | Coffin-Siris syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 138 | 423 | Gorlin症候群 | ORPHA:377 | Gorlin syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Nevoid Basal Cell Carcinoma Syndrome / Dice 0.39） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:100093 Carcinoid syndrome (0.68) |
| 139 | 427 | Waardenburg症候群 | ORPHA:3440 | Waardenburg syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 140 | 430 | Saethre-Chotzen症候群 | ORPHA:794 | Saethre-Chotzen syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 141 | 431 | Schinzel-Giedion症候群 | ORPHA:798 | Schinzel-Giedion syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 142 | 432 | Mowat-Wilson症候群 | ORPHA:2152 | Mowat-Wilson syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 143 | 433 | Pitt-Hopkins症候群 | ORPHA:2896 | Pitt-Hopkins syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 144 | 434 | Kleefstra症候群 | ORPHA:261494 | Kleefstra syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 145 | 435 | Wiedemann-Steiner症候群 | ORPHA:319182 | Wiedemann-Steiner syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 146 | 437 | Pallister-Killian症候群 | ORPHA:884 | Pallister-Killian syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 147 | 438 | Jacobsen症候群 | ORPHA:2308 | Jacobsen syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 148 | 439 | Emanuel症候群 | ORPHA:96170 | Emanuel syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 149 | 443 | Myhre症候群 | ORPHA:2588 | Myhre syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 150 | 444 | Floating-Harbor症候群 | ORPHA:2044 | Floating-Harbor syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 151 | 445 | Tatton-Brown-Rahman症候群 | ORPHA:404443 | Tatton-Brown-Rahman syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 152 | 446 | Weaver症候群 | ORPHA:3447 | Weaver syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 153 | 447 | Marshall-Smith症候群 | ORPHA:561 | Marshall-Smith syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 154 | 448 | Bohring-Opitz症候群 | ORPHA:97297 | Bohring-Opitz syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 155 | 449 | Bardet-Biedl症候群 | ORPHA:110 | Bardet-Biedl syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 156 | 451 | Wolfram症候群 | ORPHA:3463 | Wolfram syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 DIDMOAD / Dice 0.00） | 接尾辞英訳: 現番号を裏付け |
| 157 | 453 | Cohen症候群 | ORPHA:193 | Cohen syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 158 | 454 | Cockayne症候群 | ORPHA:191 | Cockayne syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 159 | 455 | Werner症候群 | ORPHA:902 | Werner syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 160 | 456 | Bloom症候群 | ORPHA:125 | Bloom syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 161 | 457 | Fanconi貧血 | ORPHA:84 | Fanconi anemia | 一致している可能性が高い | 略号 FA が頭字語に対応 |  |
| 162 | 458 | Diamond-Blackfan貧血 | ORPHA:124 | Diamond-Blackfan anemia | 一致している可能性が高い | 略号 DBA が頭字語に対応 |  |
| 163 | 460 | Shwachman-Diamond症候群 | ORPHA:811 | Shwachman-Diamond syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 164 | 462 | Kostmann症候群 | ORPHA:486 | Autosomal dominant severe congenital neutropenia | 一致している可能性が高い | 略号 SCN が頭字語に対応（英語別名 Severe Congenital Neutropenia / Dice 0.77） | 最近傍: ORPHA:86788 X-linked severe congenital neutropenia (0.87) |
| 165 | 468 | Sturge-Weber症候群 | ORPHA:3205 | Sturge-Weber syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 166 | 470 | Proteus症候群 | ORPHA:744 | Proteus syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 167 | 471 | McCune-Albright症候群 | ORPHA:562 | McCune-Albright syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 168 | 475 | 先天性中枢性低換気症候群 | ORPHA:661 | Congenital central hypoventilation syndrome | 一致している可能性が高い | 略号 CCHS が頭字語に対応（英語別名 Ondine curse / Dice 0.09） |  |
| 169 | 480 | Omenn症候群 | ORPHA:39041 | Omenn syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 170 | 481 | Chediak-Higashi症候群 | ORPHA:167 | Chédiak-Higashi syndrome | 一致している可能性が高い | 略号 CHS が頭字語に対応 |  |
| 171 | 482 | Griscelli症候群 | ORPHA:381 | Griscelli syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 172 | 486 | Pelizaeus-Merzbacher病 | ORPHA:702 | Pelizaeus-Merzbacher disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 173 | 487 | Krabbe病 | ORPHA:487 | Krabbe disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Globoid Cell Leukodystrophy / Dice 0.00） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:289494 4H leukodystrophy (0.68) |
| 174 | 496 | ビタミンD依存性くる病 | ORPHA:289157 | Hypocalcemic vitamin D-dependent rickets | 一致している可能性が高い | 略号 VDDR が頭字語に対応（英語別名 Vitamin D Dependent Rickets / Dice 0.80） | 最近傍 = 現番号 |
| 175 | 503 | 2q37欠失症候群 | ORPHA:1001 | 2q37 microdeletion syndrome | 一致している可能性が高い | 2q37 Deletion Syndrome / 0.86 / 2q37 | 最近傍: ORPHA:251019 2q32q33 deletion syndrome (0.87) |
| 176 | 505 | 15q13.3欠失症候群 | ORPHA:199318 | 15q13.3 microdeletion syndrome | 一致している可能性が高い | 15q13.3 Deletion / 0.63 / 15q13 | 最近傍 = 現番号 |
| 177 | 506 | 16p11.2欠失症候群 | ORPHA:261211 | 16p11.2p12.2 microdeletion syndrome | 一致している可能性が高い | 16p11.2 Deletion / 0.60 / 16p11 | 最近傍: ORPHA:251066 8p11.2 deletion syndrome (0.67) |
| 178 | 508 | Dravet症候群 | ORPHA:33069 | Dravet syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 179 | 509 | Lennox-Gastaut症候群 | ORPHA:2382 | Lennox-Gastaut syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 180 | 513 | PCDH19関連てんかん | ORPHA:163703 | Febrile infection-related epilepsy syndrome | 一致している可能性が高い | PCDH19 Epilepsy / 0.27 / epilepsy | 最近傍: ORPHA:714652 PCDH19 clustering epilepsy (0.65) |
| 181 | 515 | Lafora病 | ORPHA:501 | Lafora disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 182 | 519 | GLUT1欠損症 | ORPHA:71277 | Classic glucose transporter type 1 deficiency syndrome | 一致している可能性が高い | Glucose Transporter Type 1 Deficiency / 0.82 / glucose, transporter | 最近傍 = 現番号 |
| 183 | 520 | Lesch-Nyhan症候群 | ORPHA:510 | Lesch-Nyhan syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 184 | 522 | セピアプテリン還元酵素欠損症 | ORPHA:70594 | Dopa-responsive dystonia due to sepiapterin reductase deficiency | 一致している可能性が高い | 略号 SRD が頭字語に対応（英語別名 Sepiapterin Reductase Deficiency / Dice 0.72） | 最近傍: ORPHA:226 Dihydropteridine reductase deficiency (0.76) |
| 185 | 536 | Smith-Lemli-Opitz症候群 | ORPHA:818 | Smith-Lemli-Opitz syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 186 | 542 | 亜硫酸酸化酵素欠損症 | ORPHA:833 | Encephalopathy due to sulfite oxidase deficiency | 一致している可能性が高い | Sulfite Oxidase Deficiency / 0.72 / sulfite, oxidase | 最近傍 = 現番号 |
| 187 | 544 | Wolcott-Rallison症候群 | ORPHA:1667 | Wolcott-Rallison syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 188 | 557 | ミニコア病 | ORPHA:598 | Multiminicore myopathy | 一致している可能性が高い | Multi-Minicore Disease / 0.63 | 最近傍 = 現番号 |
| 189 | 558 | 先天性線維型不均等症 | ORPHA:2020 | Congenital fiber-type disproportion myopathy | 一致している可能性が高い | 略号 CFTD が頭字語に対応（英語別名 Congenital Fiber Type Disproportion / Dice 0.89） | 最近傍 = 現番号 |
| 190 | 559 | 中心核ミオパチー | ORPHA:596 | X-linked centronuclear myopathy | 一致している可能性が高い | Centronuclear Myopathy / 0.85 / centronuclear, myopathy | 最近傍 = 現番号 |
| 191 | 560 | Bethlem型ミオパチー | ORPHA:610 | Bethlem muscular dystrophy | 一致している可能性が高い | Bethlem Myopathy / 0.50 / bethlem | 最近傍: ORPHA:602 GNE myopathy (0.70) |
| 192 | 561 | エメリー・ドレイフス型筋ジストロフィー | ORPHA:261 | Emery-Dreifuss muscular dystrophy | 一致している可能性が高い | 略号 EDMD が頭字語に対応（英語別名 Emery-Dreifuss MD / Dice 0.62） | 最近傍 = 現番号 |
| 193 | 562 | 筋細管ミオパチー（X連鎖型） | ORPHA:596 | X-linked centronuclear myopathy | 一致している可能性が高い | X-Linked Myotubular Myopathy / 0.61 / myopathy | 最近傍: ORPHA:456328 X-linked myotubular myopathy-abnormal genitalia syndrome (0.67) |
| 194 | 564 | Freeman-Sheldon症候群 | ORPHA:2053 | Freeman-Sheldon syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Whistling Face Syndrome / Dice 0.35） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:42775 PHACE syndrome (0.63) |
| 195 | 566 | Barth症候群 | ORPHA:111 | Barth syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 196 | 567 | 遺伝性感覚性自律神経性ニューロパチー | ORPHA:642 | Hereditary sensory and autonomic neuropathy type 4 | 一致している可能性が高い | 略号 HSAN が頭字語に対応（英語別名 Hereditary Sensory and Autonomic Neuropathy / Dice 0.94） | 最近傍: ORPHA:36386 Hereditary sensory and autonomic neuropathy type 1 (0.94) |
| 197 | 570 | Chiari奇形（I型） | ORPHA:268882 | Arnold-Chiari malformation type I | 一致している可能性が高い | Chiari I Malformation / 0.74 / chiari, malformation | 最近傍 = 現番号 |
| 198 | 576 | ホモシスチン尿症（CBS欠損型） | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | 一致している可能性が高い | Classical Homocystinuria / 0.46 / homocystinuria | 最近傍: ORPHA:650 LCAT deficiency (0.72) |
| 199 | 586 | Dubin-Johnson症候群 | ORPHA:234 | Dubin-Johnson syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 200 | 589 | Aicardi-Goutières症候群 | ORPHA:51 | Aicardi-Goutières syndrome | 一致している可能性が高い | 略号 AGS が頭字語に対応 |  |
| 201 | 590 | Vanishing White Matter Disease | ORPHA:135 | CACH syndrome | 一致している可能性が高い | 略号 CACH が頭字語に対応（英語別名 Vanishing White Matter Disease / Dice 0.00） |  |
| 202 | 595 | Andersen-Tawil症候群 | ORPHA:37553 | Andersen-Tawil syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 203 | 597 | 先天性QT短縮症候群 | ORPHA:51083 | Congenital short QT syndrome | 一致している可能性が高い | 略号 SQTS が頭字語に対応（英語別名 Short QT Syndrome / Dice 0.74） | 最近傍: ORPHA:3163 SHORT syndrome (0.92) |
| 204 | 603 | 骨幹端異形成症(Schmid型) | ORPHA:174 | Metaphyseal chondrodysplasia, Schmid type | 一致している可能性が高い | Schmid Metaphyseal Chondrodysplasia / 0.92 / schmid, metaphyseal, chondrodysplasia | 最近傍 = 現番号 |
| 205 | 608 | Stickler症候群 | ORPHA:828 | Stickler syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 206 | 615 | Hajdu-Cheney症候群 | ORPHA:955 | Hajdu-Cheney syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 207 | 616 | Camurati-Engelmann病 | ORPHA:1328 | Camurati-Engelmann disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Progressive Diaphyseal Dysplasia / Dice 0.17） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:53697 Gnathodiaphyseal dysplasia (0.67) |
| 208 | 618 | 多中心性Castleman病 | ORPHA:160 | Castleman disease | 一致している可能性が高い | Multicentric Castleman Disease / 0.70 / castleman | 最近傍 = 現番号 |
| 209 | 621 | SAPHO症候群 | ORPHA:793 | SAPHO syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Synovitis-Acne-Pustulosis-Hyperostosis-Osteitis / Dice 0.23） | 接尾辞英訳: 現番号を裏付け |
| 210 | 622 | 慢性再発性多発性骨髄炎 | ORPHA:324964 | Chronic nonbacterial osteomyelitis/Chronic recurrent multifocal osteomyelitis | 一致している可能性が高い | 略号 CRMO が頭字語に対応（英語別名 Chronic Non-bacterial Osteomyelitis / Dice 0.77） | 最近傍 = 現番号 |
| 211 | 625 | H症候群 | ORPHA:168569 | H syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Histiocytosis-Lymphadenopathy Plus Syndrome / Dice 0.30） | 接尾辞英訳: 現番号を裏付け |
| 212 | 626 | Muckle-Wells症候群 | ORPHA:575 | Muckle-Wells syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 213 | 627 | CINCA症候群 | ORPHA:1451 | CINCA syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 214 | 628 | PAPA症候群 | ORPHA:69126 | PAPA syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Pyogenic Arthritis-Pyoderma Gangrenosum-Acne / Dice 0.00） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:48104 Pyoderma gangrenosum (0.68) |
| 215 | 635 | Schnitzler症候群 | ORPHA:37748 | Schnitzler syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 216 | 644 | Townes-Brocks症候群 | ORPHA:857 | Townes-Brocks syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 217 | 647 | Fraser症候群 | ORPHA:2052 | Fraser syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Cryptophthalmos Syndrome / Dice 0.40） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:1104 Anophthalmia plus syndrome (0.67) |
| 218 | 648 | Pallister-Hall症候群 | ORPHA:672 | Pallister-Hall syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 219 | 650 | Donnai-Barrow症候群 | ORPHA:2143 | Donnai-Barrow syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 220 | 651 | 先天性無痛無汗症 | ORPHA:642 | Hereditary sensory and autonomic neuropathy type 4 | 一致している可能性が高い | 略号 HSAN IV が頭字語に対応（英語別名 Congenital Insensitivity to Pain with Anhidrosis / Dice 0.36） | 最近傍: ORPHA:453510 Congenital insensitivity to pain with severe intellectual disability (0.65) |
| 221 | 652 | 遺伝性感覚性ニューロパチーI型 | ORPHA:36386 | Hereditary sensory and autonomic neuropathy type 1 | 一致している可能性が高い | 略号 HSAN I が頭字語に対応 |  |
| 222 | 656 | Stiff-Person症候群 | ORPHA:3198 | Stiff person spectrum disorder | 一致している可能性が高い | 略号 SPS が頭字語に対応 |  |
| 223 | 657 | 自己免疫性脳炎（抗NMDA受容体） | ORPHA:217253 | NMDA receptor encephalitis | 一致している可能性が高い | Anti-NMDAR Encephalitis / 0.82 / encephalitis | 最近傍 = 現番号 |
| 224 | 663 | Lambert-Eaton筋無力症候群 | ORPHA:43393 | Lambert-Eaton myasthenic syndrome | 一致している可能性が高い | 略号 LEMS が頭字語に対応 |  |
| 225 | 670 | 遺伝性出血性毛細血管拡張症 | ORPHA:774 | Hereditary hemorrhagic telangiectasia | 一致している可能性が高い | 略号 HHT が頭字語に対応（英語別名 Osler-Weber-Rendu Disease / Dice 0.20） |  |
| 226 | 682 | Gorham-Stout病 | ORPHA:73 | Gorham-Stout disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Vanishing Bone Disease / Dice 0.30） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:96253 Cushing disease (0.62) |
| 227 | 684 | Birt-Hogg-Dubé症候群 | ORPHA:122 | Birt-Hogg-Dubé syndrome | 一致している可能性が高い | 略号 BHD が頭字語に対応 |  |
| 228 | 685 | von Hippel-Lindau病 | ORPHA:892 | Von Hippel-Lindau disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 229 | 686 | Li-Fraumeni症候群 | ORPHA:524 | Li-Fraumeni syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 230 | 687 | Cowden症候群 | ORPHA:201 | Cowden syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 PTEN Hamartoma Tumor Syndrome / Dice 0.44） | 接尾辞英訳: 現番号を裏付け |
| 231 | 688 | Peutz-Jeghers症候群 | ORPHA:2869 | Peutz-Jeghers syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 232 | 694 | Carney-Stratakis症候群 | ORPHA:97286 | Carney-Stratakis syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 CSS-GIST / Dice 0.21） | 接尾辞英訳: 現番号を裏付け |
| 233 | 695 | 遺伝性網膜芽細胞腫 | ORPHA:790 | Retinoblastoma | 一致している可能性が高い | Hereditary Retinoblastoma / 0.74 / retinoblastoma | 最近傍 = 現番号 |
| 234 | 696 | 遺伝性平滑筋腫症腎細胞癌症候群 | ORPHA:523 | Hereditary leiomyomatosis and renal cell cancer | 一致している可能性が高い | 略号 HLRCC が頭字語に対応（英語別名 Reed Syndrome / Dice 0.22） | 最近傍: ORPHA:705 Pendred syndrome (0.87) |
| 235 | 697 | Baller-Gerold症候群 | ORPHA:1225 | Baller-Gerold syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 236 | 698 | Rothmund-Thomson症候群 | ORPHA:2909 | Rothmund-Thomson syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 237 | 700 | Ataxia with oculomotor apraxia type 2 | ORPHA:64753 | Spinocerebellar ataxia with axonal neuropathy type 2 | 一致している可能性が高い | Ataxia with oculomotor apraxia type 2 / 0.44 / ataxia | 最近傍: ORPHA:459033 Ataxia-oculomotor apraxia type 4 (0.83) |
| 238 | 706 | アルギニン血症 | ORPHA:90 | Argininemia | 一致している可能性が高い | Hyperargininemia / 0.78 | 最近傍: ORPHA:1361 Carnosinase deficiency (0.81) |
| 239 | 707 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | ORPHA:415 | Hyperornithinemia-hyperammonemia-homocitrullinuria syndrome | 一致している可能性が高い | 略号 HHH Syndrome が頭字語に対応（英語別名 HHH Syndrome / Dice 0.29） | 最近傍: ORPHA:168569 H syndrome (0.94) |
| 240 | 710 | Ullrich型先天性筋ジストロフィー | ORPHA:75840 | Ullrich congenital muscular dystrophy | 一致している可能性が高い | 略号 UCMD が頭字語に対応 |  |
| 241 | 715 | 5α-還元酵素欠損症 | ORPHA:753 | 46,XY difference of sex development due to 5-alpha-reductase 2 deficiency | 一致している可能性が高い | 5-Alpha Reductase Deficiency / 0.61 / reductase | 最近傍: ORPHA:103909 Trehalase deficiency (0.73) |
| 242 | 716 | Swyer症候群 | ORPHA:242 | 46,XY complete gonadal dysgenesis | 一致している可能性が高い | Pure Gonadal Dysgenesis / 0.71 / gonadal, dysgenesis | 最近傍: ORPHA:243 46,XX gonadal dysgenesis (0.80) |
| 243 | 718 | Kallmann症候群 | ORPHA:478 | Kallmann syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 244 | 723 | Woodhouse-Sakati症候群 | ORPHA:3464 | Woodhouse-Sakati syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 WSS-DCAF17 / Dice 0.00） | 接尾辞英訳: 現番号を裏付け |
| 245 | 724 | Huntington病様2 | ORPHA:98934 | Huntington disease-like 2 | 一致している可能性が高い | 略号 HDL2 が頭字語に対応 |  |
| 246 | 743 | 13トリソミー | ORPHA:3378 | Trisomy 13 syndrome | 一致している可能性が高い | Patau Syndrome / 0.52 | 最近傍: ORPHA:90340 Blau syndrome (0.78) |
| 247 | 757 | 先天性フィンランド型ネフローゼ症候群 | ORPHA:839 | Congenital nephrotic syndrome, Finnish type | 一致している可能性が高い | 略号 CNF が頭字語に対応 |  |
| 248 | 758 | Denys-Drash症候群 | ORPHA:220 | Denys-Drash syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 249 | 759 | Frasier症候群 | ORPHA:347 | Frasier syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 FS-WT1 / Dice 0.00） | 接尾辞英訳: 現番号を裏付け |
| 250 | 768 | 先天性肝線維症 | ORPHA:2031 | Hepatic fibrosis-renal cysts-intellectual disability syndrome | 一致している可能性が高い | Congenital Hepatic Fibrosis / 0.47 / hepatic, fibrosis |  |
| 251 | 789 | Moebius症候群 | ORPHA:570 | Moebius syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 252 | 798 | 全色盲（CNGA3型） | ORPHA:49382 | Achromatopsia | 一致している可能性が高い | Achromatopsia CNGA3 / 0.86 / achromatopsia | 最近傍 = 現番号 |
| 253 | 803 | KBG症候群 | ORPHA:2332 | KBG syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 254 | 804 | Coffin-Lowry症候群 | ORPHA:192 | Coffin-Lowry syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 255 | 809 | Sjögren-Larsson症候群 | ORPHA:816 | Sjögren-Larsson syndrome | 一致している可能性が高い | 略号 SLS が頭字語に対応 |  |
| 256 | 810 | Netherton症候群 | ORPHA:634 | Netherton syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 257 | 813 | Hailey-Hailey病 | ORPHA:2841 | Hailey-Hailey disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Familial Benign Pemphigus / Dice 0.06） | 接尾辞英訳: 現番号を裏付け |
| 258 | 814 | Darier病 | ORPHA:218 | Darier disease | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Keratosis Follicularis / Dice 0.27） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:2340 Keratosis follicularis spinulosa decalvans (0.70) |
| 259 | 815 | 水疱型先天性魚鱗癬様紅皮症 | ORPHA:312 | Autosomal dominant epidermolytic ichthyosis | 一致している可能性が高い | Epidermolytic Hyperkeratosis / 0.60 / epidermolytic | 最近傍: ORPHA:455 Superficial epidermolytic ichthyosis (0.68) |
| 260 | 817 | 肢端紅痛症（SCN9A型） | ORPHA:90026 | Primary erythromelalgia | 一致している可能性が高い | Erythromelalgia / 0.82 / erythromelalgia | 最近傍 = 現番号 |
| 261 | 822 | 遺伝性掌蹠角化症（Papillon-Lefèvre症候群） | ORPHA:678 | Papillon-Lefèvre syndrome | 一致している可能性が高い | 略号 PLS が頭字語に対応 |  |
| 262 | 828 | Rasmussen脳炎 | ORPHA:1929 | Rasmussen subacute encephalitis | 一致している可能性が高い | Rasmussen Encephalitis / 0.78 / rasmussen, encephalitis | 最近傍 = 現番号 |
| 263 | 829 | 遺伝性ジスフィブリノゲン血症 | ORPHA:98881 | Familial dysfibrinogenemia | 一致している可能性が高い | Hereditary Dysfibrinogenemia / 0.67 / dysfibrinogenemia | 最近傍 = 現番号 |
| 264 | 830 | 遺伝性第VII因子欠損症 | ORPHA:327 | Congenital factor VII deficiency | 一致している可能性が高い | Factor VII Deficiency / 0.80 / factor | 最近傍 = 現番号 |
| 265 | 831 | 遺伝性第X因子欠損症 | ORPHA:328 | Congenital factor X deficiency | 一致している可能性が高い | Factor X Deficiency / 0.78 / factor | 最近傍 = 現番号 |
| 266 | 832 | 遺伝性第XI因子欠損症 | ORPHA:329 | Congenital factor XI deficiency | 一致している可能性が高い | Factor XI Deficiency / 0.79 / factor | 最近傍: ORPHA:98878 Hemophilia A (0.90) |
| 267 | 833 | 遺伝性第XIII因子欠損症 | ORPHA:330 | Congenital factor XII deficiency | 一致している可能性が高い | Factor XIII Deficiency / 0.80 / factor | 最近傍: ORPHA:331 Congenital factor XIII deficiency (0.80) |
| 268 | 836 | Gray Platelet症候群 | ORPHA:721 | Gray platelet syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 269 | 839 | 先天性無フィブリノゲン血症 | ORPHA:98880 | Familial afibrinogenemia | 一致している可能性が高い | Congenital Afibrinogenemia / 0.76 / afibrinogenemia | 最近傍 = 現番号 |
| 270 | 840 | 先天性プラスミノゲン欠損症 | ORPHA:722 | Hypoplasminogenemia | 一致している可能性が高い | Plasminogen Deficiency / 0.56 | 最近傍: ORPHA:137754 Aminoacylase 1 deficiency (0.70) |
| 271 | 841 | 先天性第V因子欠損症 | ORPHA:326 | Congenital factor V deficiency | 一致している可能性が高い | Factor V Deficiency / 0.78 / factor | 最近傍: ORPHA:98879 Hemophilia B (0.78) |
| 272 | 842 | 第V因子・第VIII因子複合欠損症 | ORPHA:35909 | Combined deficiency of factor V and factor VIII | 一致している可能性が高い | Combined FV/FVIII Deficiency / 0.64 | 最近傍 = 現番号 |
| 273 | 843 | 先天性第II因子欠損症 | ORPHA:325 | Congenital factor II deficiency | 一致している可能性が高い | Factor II Deficiency / 0.79 / factor | 最近傍 = 現番号 |
| 274 | 846 | 遺伝性有口赤血球症 | ORPHA:3202 | Dehydrated hereditary stomatocytosis | 一致している可能性が高い | Hereditary Stomatocytosis / 0.84 / stomatocytosis | 最近傍 = 現番号 |
| 275 | 852 | Legius症候群 | ORPHA:137605 | Legius syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 276 | 853 | Marden-Walker症候群 | ORPHA:2461 | Marden-Walker syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 MWS-MW / Dice 0.00） | 接尾辞英訳: 現番号を裏付け |
| 277 | 854 | Filippi症候群 | ORPHA:3255 | Filippi syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Craniodigital Syndrome - Filippi Type / Dice 0.59） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:363705 Craniofaciofrontodigital syndrome (0.69) |
| 278 | 870 | 特発性頭蓋内圧亢進症 | ORPHA:238624 | Idiopathic intracranial hypertension | 一致している可能性が高い | 略号 IIH が頭字語に対応（英語別名 Pseudotumor Cerebri / Dice 0.04） |  |
| 279 | 873 | Allan-Herndon-Dudley症候群 | ORPHA:59 | Allan-Herndon-Dudley syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 280 | 878 | NARP症候群 | ORPHA:644 | NARP syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる（英語別名 Neuropathy-Ataxia-Retinitis Pigmentosa / Dice 0.14） | 接尾辞英訳: 現番号を裏付け; 最近傍: ORPHA:791 Retinitis pigmentosa (0.69) |
| 281 | 880 | ミトコンドリアDNA枯渇症候群（筋型） | ORPHA:254875 | Mitochondrial DNA depletion syndrome, myopathic form | 一致している可能性が高い | MDS Myopathic / 0.30 / myopathic |  |
| 282 | 885 | 複合体I欠損症 | ORPHA:2609 | Isolated complex I deficiency | 一致している可能性が高い | Complex I Deficiency / 0.81 | 最近傍 = 現番号 |
| 283 | 902 | 常染色体優性低カルシウム血症 | ORPHA:428 | Autosomal dominant hypocalcemia | 一致している可能性が高い | 略号 ADH が頭字語に対応（英語別名 CASR Activating Mutation / Dice 0.14） |  |
| 284 | 904 | 先天性副甲状腺機能低下症(GCM2型) | ORPHA:2238 | Familial isolated hypoparathyroidism | 一致している可能性が高い | Isolated Hypoparathyroidism GCM2 / 0.80 / hypoparathyroidism | 最近傍 = 現番号 |
| 285 | 906 | 遺伝性低カリウム性周期性四肢麻痺 | ORPHA:681 | Hypokalemic periodic paralysis | 一致している可能性が高い | Hypokalemic PP / 0.61 / hypokalemic | 最近傍 = 現番号 |
| 286 | 907 | 遺伝性高カリウム性周期性四肢麻痺 | ORPHA:682 | Hyperkalemic periodic paralysis | 一致している可能性が高い | Hyperkalemic PP / 0.67 / hyperkalemic | 最近傍 = 現番号 |
| 287 | 908 | 先天性パラミオトニア | ORPHA:684 | Paramyotonia congenita of Von Eulenburg | 一致している可能性が高い | Paramyotonia Congenita / 0.75 / paramyotonia, congenita | 最近傍 = 現番号 |
| 288 | 910 | Schwartz-Jampel症候群 | ORPHA:800 | Schwartz-Jampel syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 289 | 917 | Calpain3関連肢帯型筋ジストロフィー | ORPHA:267 | Calpain-3-related limb-girdle muscular dystrophy R1 | 一致している可能性が高い | 略号 LGMDR1 が頭字語に対応（英語別名 LGMDR1 / Dice 0.04） |  |
| 290 | 918 | Dysferlin関連肢帯型筋ジストロフィー | ORPHA:268 | Dysferlin-related limb-girdle muscular dystrophy R2 | 一致している可能性が高い | 略号 LGMDR2 が頭字語に対応（英語別名 LGMDR2 / Dice 0.05） |  |
| 291 | 919 | Anoctamin5関連肢帯型筋ジストロフィー | ORPHA:206549 | Anoctamin-5-related limb-girdle muscular dystrophy R12 | 一致している可能性が高い | 略号 LGMDR12 が頭字語に対応（英語別名 LGMDR12 / Dice 0.08） |  |
| 292 | 924 | TTN関連ミオパチー | ORPHA:609 | Tibial muscular dystrophy | 一致している可能性が高い | 略号 TMD/LGMD2J が頭字語に対応（英語別名 Titinopathy / Dice 0.19） | 最近傍: ORPHA:98909 Desminopathy (0.70) |
| 293 | 943 | 遺伝性ニューロパチー（GDAP1型） | ORPHA:99948 | Charcot-Marie-Tooth disease type 4A | 一致している可能性が高い | 略号 CMT4A が頭字語に対応 |  |
| 294 | 955 | 全身性カルニチン欠乏症 | ORPHA:158 | Systemic primary carnitine deficiency | 一致している可能性が高い | Primary Carnitine Deficiency / 0.87 / carnitine | 最近傍 = 現番号 |
| 295 | 957 | Short-Chain Acyl-CoA Dehydrogenase欠損症 | ORPHA:26792 | Short chain acyl-CoA dehydrogenase deficiency | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 296 | 960 | ホモシスチン尿症(CBS型) | ORPHA:394 | Homocystinuria due to cystathionine beta-synthase deficiency | 一致している可能性が高い | Classical Homocystinuria / 0.46 / homocystinuria | 最近傍: ORPHA:650 LCAT deficiency (0.72) |
| 297 | 977 | Robin sequence | ORPHA:718 | Isolated Pierre Robin sequence | 一致している可能性が高い | 略号 PRS が頭字語に対応（英語別名 Pierre Robin Sequence / Dice 0.81） | 最近傍 = 現番号 |
| 298 | 980 | Pfeiffer症候群1型 | ORPHA:93258 | Pfeiffer syndrome type 1 | 一致している可能性が高い | Pfeiffer Type 1 / 0.67 / pfeiffer | 最近傍 = 現番号 |
| 299 | 983 | 先天性緑内障 | ORPHA:98976 | Congenital glaucoma | 一致している可能性が高い | Primary Congenital Glaucoma / 0.84 / glaucoma | 最近傍 = 現番号 |
| 300 | 994 | Pendred症候群 | ORPHA:705 | Pendred syndrome | 一致している可能性が高い | 接尾辞英訳が現番号に当たる | 接尾辞英訳: 現番号を裏付け |
| 301 | 995 | Waardenburg症候群1型 | ORPHA:894 | Waardenburg syndrome type 1 | 一致している可能性が高い | 略号 WS1 が頭字語に対応 |  |
| 302 | 996 | Waardenburg症候群2型 | ORPHA:895 | Waardenburg syndrome type 2 | 一致している可能性が高い | 略号 WS2 が頭字語に対応 |  |
| 303 | 997 | Branchio-Oto-Renal症候群 | ORPHA:107 | BOR syndrome | 一致している可能性が高い | 略号 BOR が頭字語に対応 |  |
| 304 | 1000 | 口顔指症候群 | ORPHA:2750 | Orofaciodigital syndrome type 1 | 一致している可能性が高い | Oral-Facial-Digital Syndrome / 0.75 | 最近傍: ORPHA:1988 Femoral-facial syndrome (0.78) |
| 305 | 4 | ポンペ病 | ORPHA:365 | Glycogen storage disease due to acid maltase deficiency | 不明 | 英語名なし |  |
| 306 | 36 | ベーチェット病 | ORPHA:117 | Behçet disease | 不明 | 英語名なし |  |
| 307 | 137 | シェーグレン症候群 | ORPHA:289390 | Primary Sjögren disease | 不明 | 略号のみ: SS |  |
| 308 | 147 | 酸性スフィンゴミエリナーゼ欠損症 | ORPHA:618 | Familial melanoma | 不明 | 略号のみ: ASMD |  |
| 309 | 285 | マンノシドーシス | ORPHA:61 | Alpha-mannosidosis | 不明 | 英語名なし |  |
| 310 | 358 | 脊髄小脳変性症3型 | ORPHA:98757 | Spinocerebellar ataxia type 3 | 不明 | 略号のみ: SCA3, MJD |  |
| 311 | 425 | Friedreich失調症 | ORPHA:95 | Friedreich ataxia | 不明 | 略号のみ: FRDA |  |
| 312 | 450 | Joubert症候群 | ORPHA:475 | Isolated Joubert syndrome | 不明 | 略号のみ: JS |  |
| 313 | 452 | Alström症候群 | ORPHA:64 | Alström syndrome | 不明 | 略号のみ: ALMS |  |
| 314 | 469 | Klippel-Trenaunay症候群 | ORPHA:90308 | Capillary-lymphatic-venous malformation with segmental distribution | 不明 | 略号のみ: KTS |  |
| 315 | 477 | IPEX症候群 | ORPHA:37042 | Immune dysregulation-polyendocrinopathy-enteropathy-X-linked syndrome | 不明 | 英語名なし |  |
| 316 | 478 | 自己免疫性リンパ増殖症候群 | ORPHA:3261 | Autoimmune lymphoproliferative syndrome | 不明 | 略号のみ: ALPS |  |
| 317 | 479 | Hyper-IgE症候群 | ORPHA:2314 | Autosomal dominant hyper-IgE syndrome due to STAT3 deficiency | 不明 | 略号のみ: HIES |  |
| 318 | 489 | Niemann-Pick病B型 | ORPHA:77293 | Chronic visceral acid sphingomyelinase deficiency | 不明 | 略号のみ: NPB |  |
| 319 | 514 | 進行性ミオクローヌスてんかん（Unverricht-Lundborg型） | ORPHA:308 | Progressive myoclonic epilepsy type 1 | 不明 | 略号のみ: EPM1, ULD |  |
| 320 | 548 | Lowe症候群 | ORPHA:534 | Oculocerebrorenal syndrome of Lowe | 不明 | 略号のみ: OCRL |  |
| 321 | 583 | D-2-ヒドロキシグルタル酸尿症 | ORPHA:79315 | D-2-hydroxyglutaric aciduria | 不明 | 略号のみ: D2HGA |  |
| 322 | 584 | L-2-ヒドロキシグルタル酸尿症 | ORPHA:79314 | L-2-hydroxyglutaric aciduria | 不明 | 略号のみ: L2HGA |  |
| 323 | 599 | Conradi-Hünermann-Happle症候群 | ORPHA:35173 | X-linked dominant chondrodysplasia punctata | 不明 | 略号のみ: CDPX2 |  |
| 324 | 609 | Acromesomelic Dysplasia(Maroteaux型) | ORPHA:40 | Acromesomelic dysplasia, Maroteaux type | 不明 | 略号のみ: AMDM |  |
| 325 | 646 | Meckel-Gruber症候群 | ORPHA:564 | Meckel syndrome | 不明 | 略号のみ: MKS |  |
| 326 | 649 | Baraitser-Winter症候群 | ORPHA:2995 | Baraitser-Winter cerebrofrontofacial syndrome | 不明 | 略号のみ: BRWS |  |
| 327 | 672 | 脊髄小脳変性症1型 | ORPHA:98755 | Spinocerebellar ataxia type 1 | 不明 | 略号のみ: SCA1 |  |
| 328 | 673 | 脊髄小脳変性症2型 | ORPHA:98756 | Spinocerebellar ataxia type 2 | 不明 | 略号のみ: SCA2 |  |
| 329 | 674 | 脊髄小脳変性症7型 | ORPHA:94147 | Spinocerebellar ataxia type 7 | 不明 | 略号のみ: SCA7 |  |
| 330 | 677 | 遺伝性痙性対麻痺4型 | ORPHA:100984 | Autosomal dominant spastic paraplegia type 3 | 不明 | 略号のみ: SPG4 |  |
| 331 | 678 | 遺伝性痙性対麻痺11型 | ORPHA:2822 | Autosomal recessive spastic paraplegia type 11 | 不明 | 略号のみ: SPG11 |  |
| 332 | 711 | 先天性副腎皮質過形成症（11β-水酸化酵素欠損型） | ORPHA:90795 | Congenital adrenal hyperplasia due to 11-beta-hydroxylase deficiency | 不明 | 英語名なし |  |
| 333 | 712 | 先天性副腎皮質過形成症（17α-水酸化酵素欠損型） | ORPHA:90793 | Congenital adrenal hyperplasia due to 17-alpha-hydroxylase deficiency | 不明 | 英語名なし |  |
| 334 | 721 | β-プロペラ蛋白関連神経変性 | ORPHA:329284 | Beta-propeller protein-associated neurodegeneration | 不明 | 略号のみ: BPAN, SENDA |  |
| 335 | 728 | 遺伝性ジストニア（DYT1） | ORPHA:256 | Early-onset generalized limb-onset dystonia | 不明 | 略号のみ: DYT1 |  |
| 336 | 730 | 遺伝性ミオクロニージストニア | ORPHA:36899 | Myoclonus-dystonia syndrome | 不明 | 略号のみ: DYT11 |  |
| 337 | 785 | Williams-Campbell症候群 | ORPHA:3348 | Tracheobronchopathia osteochondroplastica | 不明 | 略号のみ: WCS |  |
| 338 | 826 | 先天性副腎皮質過形成症（3β-HSD欠損型） | ORPHA:90791 | Congenital adrenal hyperplasia due to 3-beta-hydroxysteroid dehydrogenase deficiency | 不明 | 英語名なし |  |
| 339 | 861 | 遺伝性痙性対麻痺3A型 | ORPHA:100985 | Autosomal dominant spastic paraplegia type 4 | 不明 | 略号のみ: SPG3A |  |
| 340 | 871 | 先天性大脳白質形成不全症（TUBB4A型） | ORPHA:209370 | MECP2-related severe neonatal encephalopathy | 不明 | 略号のみ: H-ABC |  |
| 341 | 894 | 遺伝性ピリドキシン依存性てんかん | ORPHA:3006 | Pyridoxine-dependent-developmental and epileptic encephalopathy | 不明 | 略号のみ: PDE |  |
| 342 | 903 | 新生児重症副甲状腺機能亢進症 | ORPHA:417 | Neonatal severe primary hyperparathyroidism | 不明 | 略号のみ: NSHPT |  |
| 343 | 988 | Usher症候群1型 | ORPHA:231169 | Usher syndrome type 1 | 不明 | 略号のみ: USH1 |  |
| 344 | 989 | Usher症候群2型 | ORPHA:231178 | Usher syndrome type 2 | 不明 | 略号のみ: USH2 |  |
| 345 | 990 | Usher症候群3型 | ORPHA:231183 | Usher syndrome type 3 | 不明 | 略号のみ: USH3 |  |

### 1.1 見立ての件数

| 見立て | 件数 |
|---|---:|
| 明らかに別疾患 | 35 |
| 近縁の可能性 | 48 |
| 一致している可能性が高い | 221 |
| 不明 | 41 |
| 合計 | 345 |

## 2. 現番号が対応表に無いレコード（英語疾患名を示せない）

番号が誤りなのか、HPO 注釈が無いだけの正しい番号なのかは phenotype.hpoa では判別できない。Orphadata の命名法を取得すれば §1 と同じ表にできる。

| # | index | 日本語疾患名 | 現 ORPHA 番号 | 英語別名（略号含む） | 参考（最近傍、Dice 0.6 以上） |
|--:|--:|---|---|---|---|
| 1 | 33 | 多発性硬化症 | ORPHA:802 | Multiple Sclerosis, MS | ORPHA:3152 Sclerosteosis (0.62) |
| 2 | 42 | IgA腎症 | ORPHA:97556 | IgA Nephropathy |  |
| 3 | 45 | 再生不良性貧血 | ORPHA:182040 | Aplastic Anemia, AA | ORPHA:88 Idiopathic aplastic anemia (0.76) |
| 4 | 51 | クラインフェルター症候群 | ORPHA:484 | Klinefelter Syndrome | ORPHA:902 Werner syndrome (0.67) |
| 5 | 60 | 先天性副腎過形成 | ORPHA:418 | Congenital Adrenal Hyperplasia, CAH | ORPHA:95702 X-linked adrenal hypoplasia congenita (0.76) |
| 6 | 66 | クローン病 | ORPHA:206 | Crohn's Disease, CD | ORPHA:34587 Danon disease (0.60) |
| 7 | 67 | 潰瘍性大腸炎 | ORPHA:771 | Ulcerative Colitis, UC |  |
| 8 | 74 | 表皮水疱症 | ORPHA:304 | Epidermolysis Bullosa, EB | ORPHA:2908 Kindler epidermolysis bullosa (0.86) |
| 9 | 76 | 脊髄小脳変性症 | ORPHA:94145 | Spinocerebellar Degeneration, SCD | ORPHA:623626 Paraneoplastic cerebellar degeneration (0.74) |
| 10 | 83 | ギラン・バレー症候群 | ORPHA:2103 | GBS |  |
| 11 | 86 | 肺動脈性肺高血圧症 | ORPHA:182090 | Pulmonary Arterial Hypertension, PAH | ORPHA:275766 Idiopathic pulmonary arterial hypertension (0.84) |
| 12 | 87 | 特発性拡張型心筋症 | ORPHA:217604 | Dilated Cardiomyopathy, DCM | ORPHA:66634 Dilated cardiomyopathy with ataxia (0.82) |
| 13 | 88 | 肥大型心筋症 | ORPHA:217569 | Hypertrophic Cardiomyopathy, HCM | ORPHA:563 Peripartum cardiomyopathy (0.73) |
| 14 | 94 | ガラクトース血症 | ORPHA:352 | Galactosemia | ORPHA:79239 Classic galactosemia (0.79) |
| 15 | 99 | 自己免疫性溶血性貧血 | ORPHA:98375 | Autoimmune Hemolytic Anemia, AIHA | ORPHA:90033 Autoimmune hemolytic anemia, warm type (0.85) |
| 16 | 128 | 慢性リンパ性白血病 | ORPHA:67038 | Chronic Lymphocytic Leukemia, CLL |  |
| 17 | 152 | 分類不能型免疫不全症 | ORPHA:1572 | Common Variable Immunodeficiency, CVID | ORPHA:293978 Deficiency in anterior pituitary function-variable immunodeficiency syndrome (0.64) |
| 18 | 163 | シャルコー・マリー・トゥース病 | ORPHA:166 | Charcot-Marie-Tooth Disease, CMT | ORPHA:90658 Charcot-Marie-Tooth disease type 1E (0.89) |
| 19 | 172 | ウエスト症候群 | ORPHA:3451 | West Syndrome, WS | ORPHA:199343 EAST syndrome (0.82) |
| 20 | 180 | クリオピリン関連周期熱症候群 | ORPHA:208650 | Cryopyrin-Associated Periodic Syndromes, CAPS | ORPHA:32960 Tumor necrosis factor receptor 1 associated periodic syndrome (0.63) |
| 21 | 201 | 脊髄空洞症 | ORPHA:3280 | Syringomyelia | ORPHA:99857 Secondary syringomyelia (0.73) |
| 22 | 207 | 先天性ミオパチー | ORPHA:97245 | Congenital Myopathy | ORPHA:324581 Benign Samaritan congenital myopathy (0.76) |
| 23 | 211 | 慢性活動性EBウイルス感染症 | ORPHA:2100 | Chronic Active EBV Infection, CAEBV |  |
| 24 | 219 | デンスデポジット病 | ORPHA:91136 | Dense Deposit Disease, DDD | ORPHA:1652 Dent disease (0.67) |
| 25 | 225 | QT延長症候群 | ORPHA:768 | Long QT Syndrome, LQTS | ORPHA:199343 EAST syndrome (0.67) |
| 26 | 233 | シトルリン血症 | ORPHA:187 | Citrullinemia | ORPHA:247585 Citrullinemia type II (0.83) |
| 27 | 244 | 大理石骨病 | ORPHA:2781 | Osteopetrosis | ORPHA:210110 Intermediate osteopetrosis (0.71) |
| 28 | 255 | 肢帯型筋ジストロフィー | ORPHA:263 | Limb-Girdle Muscular Dystrophy, LGMD | ORPHA:34515 FKRP-related limb-girdle muscular dystrophy R9 (0.82) |
| 29 | 257 | 重症複合免疫不全症 | ORPHA:183660 | Severe Combined Immunodeficiency, SCID | ORPHA:169095 Severe combined immunodeficiency due to FOXN1 deficiency (0.84) |
| 30 | 265 | アルミート不整脈原性心筋症 | ORPHA:247 | Arrhythmogenic Cardiomyopathy, ACM, ARVC |  |
| 31 | 276 | びまん性大細胞型B細胞リンパ腫 | ORPHA:544 | Diffuse Large B-Cell Lymphoma, DLBCL |  |
| 32 | 278 | ホジキンリンパ腫 | ORPHA:98293 | Hodgkin Lymphoma, HL | ORPHA:391 Classic Hodgkin lymphoma (0.79) |
| 33 | 281 | 遺伝性痙性対麻痺 | ORPHA:685 | Hereditary Spastic Paraplegia, HSP | ORPHA:99015 Spastic paraplegia type 2 (0.68) |
| 34 | 294 | 強直性脊椎炎 | ORPHA:449 | Ankylosing Spondylitis, AS |  |
| 35 | 298 | 成人T細胞白血病リンパ腫 | ORPHA:86500 | Adult T-Cell Leukemia/Lymphoma, ATL, ATLL |  |
| 36 | 303 | 家族性高コレステロール血症 | ORPHA:406 | Familial Hypercholesterolemia, FH | ORPHA:391665 Homozygous familial hypercholesterolemia (0.83) |
| 37 | 304 | リポ蛋白リパーゼ欠損症 | ORPHA:309015 | Lipoprotein Lipase Deficiency, LPLD | ORPHA:425 Apolipoprotein A-I deficiency (0.79) |
| 38 | 307 | 非ジストロフィー性ミオトニア | ORPHA:228432 | Non-Dystrophic Myotonia, NDM | ORPHA:273 Steinert myotonic dystrophy (0.67) |
| 39 | 310 | 肺動脈閉鎖症 | ORPHA:1207 | Pulmonary Atresia, PA |  |
| 40 | 318 | 先天性表皮水疱症（接合部型） | ORPHA:305 | Junctional EB, JEB |  |
| 41 | 319 | 副腎皮質過形成症 | ORPHA:418 | Congenital Adrenal Hyperplasia, CAH | ORPHA:95702 X-linked adrenal hypoplasia congenita (0.76) |
| 42 | 331 | 前眼部形成異常 | ORPHA:137 | Anterior Segment Dysgenesis |  |
| 43 | 369 | 多種カルボキシラーゼ欠損症 | ORPHA:148 | Multiple Carboxylase Deficiency, MCD | ORPHA:3008 Pyruvate carboxylase deficiency (0.75) |
| 44 | 374 | 前頭側頭型認知症 | ORPHA:282 | Frontotemporal Dementia, FTD | ORPHA:275864 Behavioral variant of frontotemporal dementia (0.75) |
| 45 | 380 | 特発性好酸球増多症候群 | ORPHA:168956 | Hypereosinophilic Syndrome, HES | ORPHA:3260 Idiopathic hypereosinophilic syndrome (0.87) |
| 46 | 413 | 肺静脈還流異常症 | ORPHA:99062 | Total Anomalous Pulmonary Venous Return, TAPVR | ORPHA:99125 Congenital total pulmonary venous return anomaly (0.83) |
| 47 | 426 | 眼皮膚白皮症 | ORPHA:55 | Oculocutaneous Albinism, OCA | ORPHA:370097 Oculocutaneous albinism type 6 (0.88) |
| 48 | 440 | Potocki-Lupski症候群 | ORPHA:180469 | PTLS |  |
| 49 | 464 | 先天性赤血球形成異常性貧血 | ORPHA:85 | Congenital Dyserythropoietic Anemia, CDA | ORPHA:98870 Congenital dyserythropoietic anemia type III (0.93) |
| 50 | 510 | West症候群 | ORPHA:3451 | Infantile Spasms, IS | ORPHA:697160 Infantile epileptic spasms syndrome (0.63) |
| 51 | 516 | 脂肪萎縮症 | ORPHA:90990 | Lipodystrophy | ORPHA:90156 Centrifugal lipodystrophy (0.71) |
| 52 | 518 | 先天性高インスリン血症 | ORPHA:657 | Congenital Hyperinsulinism, CHI | ORPHA:79299 Congenital glucokinase-related hyperinsulinism (0.71) |
| 53 | 534 | 先天性グリコシル化異常症 | ORPHA:137 | Congenital Disorders of Glycosylation, CDG |  |
| 54 | 537 | Niemann-Pick病A型 | ORPHA:77292 | NPA |  |
| 55 | 541 | モリブデン補因子欠損症 | ORPHA:99732 | MoCD, Molybdenum Cofactor Deficiency | ORPHA:328 Congenital factor X deficiency (0.60) |
| 56 | 555 | 乳児型ネマリンミオパチー | ORPHA:607 | Nemaline Myopathy, NM | ORPHA:98902 Amish nemaline myopathy (0.84) |
| 57 | 563 | 遠位関節拘縮症 | ORPHA:97120 | Distal Arthrogryposis, DA | ORPHA:1146 Distal arthrogryposis type 1 (0.92) |
| 58 | 571 | 二分脊椎 | ORPHA:823 | Spina Bifida |  |
| 59 | 596 | Timothy症候群 | ORPHA:65283 | TS, LQT8 |  |
| 60 | 600 | Desbuquois骨異形成症 | ORPHA:2284 | DBQD |  |
| 61 | 604 | 骨硬化症(大理石骨病) | ORPHA:2783 | Osteopetrosis | ORPHA:210110 Intermediate osteopetrosis (0.71) |
| 62 | 606 | 多発性骨端異形成症 | ORPHA:251 | Multiple Epiphyseal Dysplasia, MED | ORPHA:93308 Multiple epiphyseal dysplasia type 1 (0.90) |
| 63 | 619 | 全身性肥満細胞症 | ORPHA:2467 | Systemic Mastocytosis, SM | ORPHA:98850 Aggressive systemic mastocytosis (0.81) |
| 64 | 623 | CANDLE症候群 | ORPHA:325004 | Chronic Atypical Neutrophilic Dermatosis with Lipodystrophy and Elevated Temperature |  |
| 65 | 624 | DADA2 | ORPHA:404553 | Deficiency of ADA2, DADA2 | ORPHA:650 LCAT deficiency (0.64) |
| 66 | 631 | 中條-西村症候群 | ORPHA:2615 | Nakajo-Nishimura Syndrome, NNS |  |
| 67 | 633 | A20ハプロ不全症 | ORPHA:512126 | A20 Haploinsufficiency, HA20 | ORPHA:439822 PDE4D haploinsufficiency syndrome (0.68) |
| 68 | 638 | 肺分画症 | ORPHA:2586 | Pulmonary Sequestration, BPS |  |
| 69 | 658 | 抗LGI1抗体関連脳炎 | ORPHA:163908 | Anti-LGI1 Encephalitis | ORPHA:79139 Japanese encephalitis (0.65) |
| 70 | 679 | 遺伝性びまん性白質脳症球状封入体型 | ORPHA:313808 | HDLS |  |
| 71 | 690 | 遺伝性びまん性胃癌 | ORPHA:26106 | Hereditary Diffuse Gastric Cancer, HDGC |  |
| 72 | 691 | 多発性内分泌腫瘍症2A型 | ORPHA:247698 | MEN2A |  |
| 73 | 692 | 多発性内分泌腫瘍症2B型 | ORPHA:247709 | MEN2B, MEN3 |  |
| 74 | 717 | Klinefelter症候群 | ORPHA:484 | 47,XXY |  |
| 75 | 720 | PLA2G6関連神経変性 | ORPHA:329303 | PLAN, INAD, NBIA2 |  |
| 76 | 725 | McLeod症候群 | ORPHA:59306 | MLS |  |
| 77 | 729 | ドパ反応性ジストニア | ORPHA:255 | Segawa Disease, DRD | ORPHA:2331 Kawasaki disease (0.64) |
| 78 | 737 | 先天性多発性関節拘縮症 | ORPHA:1037 | Arthrogryposis Multiplex Congenita, AMC | ORPHA:1143 Neurogenic arthrogryposis multiplex congenita (0.93) |
| 79 | 746 | 遺伝性鉄過剰症(フェロポルチン病) | ORPHA:139491 | Ferroportin Disease, Type 4 Hemochromatosis | ORPHA:446 Neonatal hemochromatosis (0.70) |
| 80 | 748 | 遺伝性血栓性血小板減少性紫斑病 | ORPHA:93583 | cTTP, Upshaw-Schulman Syndrome | ORPHA:510 Lesch-Nyhan syndrome (0.63) |
| 81 | 756 | Alport症候群（X連鎖型） | ORPHA:88917 | X-Linked Alport, XLAS |  |
| 82 | 761 | 常染色体優性尿細管間質性腎疾患(UMOD型) | ORPHA:88950 | ADTKD-UMOD, Uromodulin Associated Kidney Disease |  |
| 83 | 762 | 常染色体優性尿細管間質性腎疾患(MUC1型) | ORPHA:88948 | ADTKD-MUC1 |  |
| 84 | 763 | 先天性腎性マグネシウム喪失症 | ORPHA:34527 | Hypomagnesemia with Secondary Hypocalcemia, HSH |  |
| 85 | 769 | セリアック病 | ORPHA:555 | Celiac Disease | ORPHA:398063 Refractory celiac disease (0.71) |
| 86 | 770 | 自己免疫性腸症 | ORPHA:1564 | Autoimmune Enteropathy, AIE | ORPHA:36913 Autoimmune hypoparathyroidism (0.67) |
| 87 | 774 | 先天性吸収不良症候群（先天性クロール下痢） | ORPHA:53689 | Congenital Chloride Diarrhea, CLD |  |
| 88 | 777 | Tufting Enteropathy | ORPHA:92065 | Tufting Enteropathy, Intestinal Epithelial Dysplasia, TE | ORPHA:92050 Congenital tufting enteropathy (0.83) |
| 89 | 791 | 遺伝性視神経症（常染色体優性） | ORPHA:98672 | Autosomal Dominant Optic Atrophy, Kjer Disease, ADOA | ORPHA:67036 Autosomal dominant optic atrophy and cataract (0.86) |
| 90 | 795 | 先天性無虹彩症 | ORPHA:77 | Aniridia | ORPHA:250923 Isolated aniridia (0.64) |
| 91 | 801 | 先天性グリコシルホスファチジルイノシトール欠損症 | ORPHA:352587 | GPI Deficiency, PIGO/PIGM/PIGA Deficiency, IGD | ORPHA:650 LCAT deficiency (0.72) |
| 92 | 816 | 遺伝性痛覚不全症（SCN9A型） | ORPHA:217399 | CIP-SCN9A, Congenital Indifference to Pain SCN9A |  |
| 93 | 825 | 遺伝性結合組織疾患（Cutis Laxa） | ORPHA:209 | Cutis Laxa |  |
| 94 | 847 | 先天性赤血球生成異常性貧血 | ORPHA:85 | Congenital Dyserythropoietic Anemia, CDA | ORPHA:98870 Congenital dyserythropoietic anemia type III (0.93) |
| 95 | 850 | ANKRD26関連血小板減少症 | ORPHA:71015 | THC2 |  |
| 96 | 862 | 遺伝性痙性対麻痺7型 | ORPHA:104013 | SPG7 |  |
| 97 | 863 | 遺伝性痙性対麻痺5A型 | ORPHA:100987 | SPG5 |  |
| 98 | 879 | ミトコンドリアDNA枯渇症候群（肝脳型） | ORPHA:254902 | MDS Hepatocerebral |  |
| 99 | 889 | コエンザイムQ10欠損症 | ORPHA:35656 | CoQ10 Deficiency, Primary CoQ10 Deficiency | ORPHA:650 LCAT deficiency (0.67) |
| 100 | 893 | トランスコバラミン欠損症 | ORPHA:3321 | TC II Deficiency | ORPHA:650 LCAT deficiency (0.72) |
| 101 | 899 | 先天性グルタミン合成酵素欠損症 | ORPHA:71278 | GS Deficiency, GLUL Deficiency | ORPHA:650 LCAT deficiency (0.75) |
| 102 | 909 | 先天性ミオトニア(Thomsen/Becker型) | ORPHA:612 | Myotonia Congenita, MC | ORPHA:2309 Pachyonychia congenita (0.71) |
| 103 | 911 | Rippling Muscle Disease | ORPHA:97238 | Rippling Muscle Disease, RMD | ORPHA:3452 Whipple disease (0.65) |
| 104 | 916 | FKRP関連肢帯型筋ジストロフィー | ORPHA:34514 | LGMD2I, LGMDR9 |  |
| 105 | 920 | Sarcoglycan関連肢帯型筋ジストロフィー | ORPHA:206 | LGMD2C-F, Sarcoglycanopathy |  |
| 106 | 925 | VCP関連多系統蛋白症 | ORPHA:93401 | IBMPFD, VCP Disease, Inclusion Body Myopathy with Paget and FTD | ORPHA:52430 Inclusion body myopathy with Paget disease of bone and frontotemporal dementia (0.68) |
| 107 | 926 | BAG3関連ミオフィブリラーミオパチー | ORPHA:137163 | BAG3-MFM |  |
| 108 | 952 | 遺伝性全身性AApoAIアミロイドーシス | ORPHA:93560 | AApoAI Amyloidosis | ORPHA:439232 AApoAIV amyloidosis (0.91) |
| 109 | 953 | AGELアミロイドーシス | ORPHA:93557 | Finnish Amyloidosis, Meretoja Syndrome | ORPHA:442582 AH amyloidosis (0.79) |
| 110 | 961 | メチオニンアデノシルトランスフェラーゼ欠損症 | ORPHA:99946 | MAT I/III Deficiency | ORPHA:650 LCAT deficiency (0.74) |
| 111 | 964 | 先天性胆汁酸合成異常症(3β-HSD型) | ORPHA:485631 | CBAS1 |  |
| 112 | 965 | 先天性胆汁酸合成異常症(Δ4-3-oxosteroid型) | ORPHA:485641 | CBAS2 |  |
| 113 | 967 | D-二分岐鎖酸脱水素酵素欠損症 | ORPHA:300 | DBP Deficiency | ORPHA:650 LCAT deficiency (0.72) |
| 114 | 991 | 遺伝性難聴(GJB2型) | ORPHA:90635 | DFNB1 |  |
| 115 | 992 | 遺伝性難聴(MYO15A型) | ORPHA:90636 | DFNB3 |  |
| 116 | 998 | 遺伝性難聴(OTOF型) | ORPHA:90636 | Auditory Neuropathy OTOF, DFNB9 |  |
| 117 | 999 | COACH症候群 | ORPHA:2816 | Cerebellar Vermis Hypoplasia-Oligophrenia-Ataxia-Coloboma-Hepatic Fibrosis |  |

