# ORPHA 番号 手動レビュー表（v2, 同義語照合で番号を提案しなかったもの）

- 作成日: 2026-09-10（ファイル名の日付は前回成果物の連番に揃えた）
- 対象: 前回 D 712 件のうち、Orphanet 同義語付き命名法（`data/orphanet/en_product1.xml`, 2026-06-23）で当たりはしたが**番号を提案しなかった**もの
- 提案しなかった理由は 3 種類。§1 複数の番号に当たった、§2 略号（または略号だけからなる別名）でしか当たらなかった、§3 非現役（廃止・統合・非希少）エンティティにしか当たらなかった
- 判定はファウンダー。ここに載った番号は**推測ではなく文字列の完全一致**だが、略号は衝突が多いため（例: `RA` → Reactive angioendotheliomatosis、`FD` → Fabry disease、`EoE` → Extraskeletal Ewing sarcoma）機械的には採用しない
- 「候補」欄の疾患名は en_product1.xml の推奨名そのまま。括弧内は当たったラベル（推奨名/同義語）と Orphanet の分類レベル

## 1. 複数の ORPHA 番号に当たったもの（2 件）

別名ごとに別の番号へ当たった、または 1 つの略号が複数エンティティの同義語になっているもの。

| index | 日本語疾患名 | 現ORPHA番号 | 照合に使った英語別名 | 候補となったORPHA番号と疾患名（複数） |
|--:|---|---|---|---|
| 235 | カルニチン欠乏症 | ORPHA:158 | PCD | **ORPHA:244** Primary ciliary dyskinesia（同義語 `PCD`, Disorder/Disease）<br>**ORPHA:623626** Paraneoplastic cerebellar degeneration（同義語 `PCD`, Disorder/Disease） |
| 618 | 多中心性Castleman病 | ORPHA:160 | MCD, Multicentric Castleman Disease | **ORPHA:148** Multiple carboxylase deficiency（同義語 `MCD`, Group of disorders/Clinical group）<br>**ORPHA:98969** Macular corneal dystrophy（同義語 `MCD`, Disorder/Disease）<br>**ORPHA:93686** Multicentric Castleman disease（推奨名 `Multicentric Castleman disease`, Subtype of disorder/Clinical subtype, 非現役: Inactive/Obsolete entity） |

## 2. 略号を含む別名だけで一致したもの（単一候補・低信頼、58 件）

別名が略号（`SCA6`、`MPS I`）か、略号＋汎用語（`GPI Deficiency`、`OI Type IV`）だけで構成され、それが Orphanet の同義語と完全一致したもの。正しいもの（SCA6、SPG4、IPAH 等）と明らかな誤り（`RA`、`WS`、`FD` 等）が混在する。**ファウンダーが 1 件ずつ採否を判定する。**

| index | 日本語疾患名 | 現ORPHA番号 | 照合に使った英語別名 | 候補となったORPHA番号と疾患名（複数） |
|--:|---|---|---|---|
| 1 | ムコ多糖症I型 | ORPHA:93473（Hurler syndrome） | MPS I | **ORPHA:579** Mucopolysaccharidosis type 1（同義語 `MPS1`, Disorder/Disease） |
| 15 | 脊髄性筋萎縮症 | （なし） | SMA | **ORPHA:70** Proximal spinal muscular atrophy（同義語 `SMA`, Disorder/Disease） |
| 16 | 遺伝性ATTR型アミロイドーシス | （なし） | hATTR | **ORPHA:271861** Hereditary ATTR amyloidosis（同義語 `hATTR`, Disorder/Disease） |
| 32 | 関節リウマチ | （なし） | RA | **ORPHA:673574** Reactive angioendotheliomatosis（同義語 `RA`, Disorder/Disease） |
| 41 | ANCA関連血管炎 | （なし） | AAV | **ORPHA:156152** Anti-neutrophil cytoplasmic antibody-associated vasculitis（同義語 `AAV`, Group of disorders/Clinical group） |
| 45 | 再生不良性貧血 | ORPHA:182040（Rare aplastic anemia） | AA | **ORPHA:689430** Adenoid ameloblastoma（同義語 `AA`, Disorder/Disease） |
| 63 | 特発性大腿骨頭壊死症 | （なし） | ION | **ORPHA:499096** Isolated optic neuritis（同義語 `ION`, Disorder/Disease） |
| 76 | 脊髄小脳変性症 | ORPHA:94145（Autosomal dominant cerebellar ataxia type I） | SCD | **ORPHA:98967** Schnyder corneal dystrophy（同義語 `SCD`, Disorder/Disease） |
| 105 | IgG4関連疾患 | （なし） | IgG4-Related Disease | **ORPHA:284264** IgG4-related disease（推奨名 `IgG4-related disease`, Group of disorders/Clinical group） |
| 109 | 好酸球性消化管疾患 | （なし） | EGID | **ORPHA:402029** Primary eosinophilic gastrointestinal disease（同義語 `EGID`, Group of disorders/Clinical group） |
| 115 | ネフローゼ症候群 | （なし） | NS | **ORPHA:634** Netherton syndrome（同義語 `NS`, Disorder/Disease） |
| 123 | 尿崩症 | （なし） | DI | **ORPHA:49042** Dentinogenesis imperfecta（同義語 `DI`, Disorder/Disease） |
| 143 | 中枢性尿崩症 | （なし） | CDI | **ORPHA:178029** Arginine vasopressin deficiency（同義語 `CDI`, Disorder/Disease） |
| 147 | 酸性スフィンゴミエリナーゼ欠損症 | ORPHA:618（Familial melanoma） | ASMD | **ORPHA:618899** Acid sphingomyelinase deficiency（同義語 `ASMD`, Group of disorders/Clinical group） |
| 149 | 特発性肺動脈性肺高血圧症 | （なし） | IPAH | **ORPHA:275766** Idiopathic pulmonary arterial hypertension（同義語 `IPAH`, Subtype of disorder/Etiological subtype） |
| 172 | ウエスト症候群 | ORPHA:3451（West syndrome） | WS | **ORPHA:902** Werner syndrome（同義語 `WS`, Disorder/Disease） |
| 177 | 線維性骨異形成症 | ORPHA:249（Fibrous dysplasia of bone） | FD | **ORPHA:324** Fabry disease（同義語 `FD`, Disorder/Disease） |
| 206 | 好酸球性食道炎 | （なし） | EoE | **ORPHA:370334** Extraskeletal Ewing sarcoma（同義語 `EOE`, Disorder/Disease） |
| 229 | 完全大血管転位症 | ORPHA:860（Congenitally uncorrected transposition of the great arteries） | TGA | **ORPHA:216675** Transposition of the great arteries（同義語 `TGA`, Group of disorders/Category） |
| 253 | 限局性皮質異形成 | （なし） | FCD | **ORPHA:98970** Fleck corneal dystrophy（同義語 `FCD`, Disorder/Disease） |
| 299 | T細胞性大顆粒リンパ球性白血病 | （なし） | T-LGL | **ORPHA:86872** T-cell large granular lymphocyte leukemia（同義語 `T-LGL`, Disorder/Disease） |
| 303 | 家族性高コレステロール血症 | ORPHA:406（Heterozygous familial hypercholesterolemia） | FH | **ORPHA:235936** Familial hyperaldosteronism（同義語 `FH`, Group of disorders/Clinical group） |
| 307 | 非ジストロフィー性ミオトニア | ORPHA:228432（（Orphanet に存在しない番号）） | NDM | **ORPHA:224** Neonatal diabetes mellitus（同義語 `NDM`, Group of disorders/Clinical group） |
| 357 | 脊髄小脳変性症6型 | （なし） | SCA6 | **ORPHA:98758** Spinocerebellar ataxia type 6（同義語 `SCA6`, Disorder/Disease） |
| 398 | Smith-Magenis症候群 | ORPHA:819（Smith-Magenis syndrome） | SMS | **ORPHA:3198** Stiff person spectrum disorder（同義語 `SMS`, Disorder/Disease） |
| 427 | Waardenburg症候群 | ORPHA:3440（Waardenburg syndrome） | WS | **ORPHA:902** Werner syndrome（同義語 `WS`, Disorder/Disease） |
| 435 | Wiedemann-Steiner症候群 | ORPHA:319182（Wiedemann-Steiner syndrome） | WSS | **ORPHA:2834** Wrinkly skin syndrome（同義語 `WSS`, Subtype of disorder/Clinical subtype） |
| 448 | Bohring-Opitz症候群 | ORPHA:97297（Bohring-Opitz syndrome） | BOS | **ORPHA:658602** Transplant-related bronchiolitis obliterans（同義語 `BOS`, Disorder/Disease） |
| 450 | Joubert症候群 | ORPHA:475（Isolated Joubert syndrome） | JS | **ORPHA:140874** Joubert syndrome（同義語 `JS`, Disorder/Malformation syndrome） |
| 457 | Fanconi貧血 | ORPHA:84（Fanconi anemia） | FA | **ORPHA:95** Friedreich ataxia（同義語 `FA`, Disorder/Disease） |
| 500 | Zellweger症候群（軽症型） | （なし） | NALD | **ORPHA:44** Neonatal adrenoleukodystrophy（同義語 `NALD`, Disorder/Disease） |
| 579 | 短鎖アシルCoA脱水素酵素欠損症 | （なし） | SCAD Deficiency, SCADD | **ORPHA:26792** Short chain acyl-CoA dehydrogenase deficiency（同義語 `SCAD deficiency`, Disorder/Disease） |
| 600 | Desbuquois骨異形成症 | ORPHA:2284（Primary T cell immunodeficiency） | DBQD | **ORPHA:1425** Desbuquois syndrome（同義語 `DBQD`, Disorder/Malformation syndrome） |
| 601 | 骨形成不全症IV型 | （なし） | OI Type IV | **ORPHA:216820** Osteogenesis imperfecta type 4（同義語 `OI type 4`, Subtype of disorder/Clinical subtype） |
| 602 | 骨形成不全症V型 | （なし） | OI Type V | **ORPHA:216828** Osteogenesis imperfecta type 5（同義語 `OI type 5`, Subtype of disorder/Clinical subtype） |
| 615 | Hajdu-Cheney症候群 | ORPHA:955（Hajdu-Cheney syndrome） | HCS | **ORPHA:163690** Hypotonia-cystinuria syndrome（同義語 `HCS`, Disorder/Disease） |
| 641 | 先天性腎尿路奇形 | （なし） | CAKUT | **ORPHA:93545** Renal or urinary tract malformation（同義語 `CAKUT`, Group of disorders/Category） |
| 675 | SCA31 | （なし） | SCA31 | **ORPHA:217012** Spinocerebellar ataxia type 31（同義語 `SCA31`, Disorder/Disease） |
| 677 | 遺伝性痙性対麻痺4型 | ORPHA:100984（Autosomal dominant spastic paraplegia type 3） | SPG4 | **ORPHA:100985** Autosomal dominant spastic paraplegia type 4（同義語 `SPG4`, Disorder/Disease） |
| 680 | 副腎皮質刺激ホルモン単独欠損症 | （なし） | IAD | **ORPHA:480512** Idiopathic ductopenia（同義語 `IAD`, Disorder/Disease） |
| 699 | Ataxia with oculomotor apraxia type 1 | ORPHA:14（Abetalipoproteinemia） | AOA1 | **ORPHA:1168** Ataxia-oculomotor apraxia type 1（同義語 `AOA1`, Disorder/Disease） |
| 719 | 遺伝性パントテン酸キナーゼ関連神経変性 | ORPHA:157846（Neuroferritinopathy） | NBIA1, PKAN | **ORPHA:157850** Pantothenate kinase-associated neurodegeneration（同義語 `PKAN`, Disorder/Disease） |
| 722 | Kufor-Rakeb症候群 | ORPHA:306669（Hemiparkinsonism-hemiatrophy syndrome） | PARK9 | **ORPHA:306674** Kufor-Rakeb syndrome（同義語 `PARK9`, Disorder/Disease） |
| 732 | 遺伝性痙攣性発声障害 | （なし） | ADSD | **ORPHA:228169** Autosomal dominant striatal neurodegeneration（同義語 `ADSD`, Disorder/Disease） |
| 762 | 常染色体優性尿細管間質性腎疾患(MUC1型) | ORPHA:88948（（Orphanet に存在しない番号）） | ADTKD-MUC1 | **ORPHA:88949** MUC1-related autosomal dominant tubulointerstitial kidney disease（同義語 `ADTKD-MUC1`, Subtype of disorder/Clinical subtype） |
| 763 | 先天性腎性マグネシウム喪失症 | ORPHA:34527（Familial primary hypomagnesemia with normocalciuria and normocalcemia） | HSH | **ORPHA:30924** Primary hypomagnesemia with secondary hypocalcemia（同義語 `HSH`, Disorder/Disease） |
| 771 | 好酸球性消化管疾患（非食道型） | （なし） | EGE | **ORPHA:2070** Eosinophilic gastroenteritis（同義語 `EGE`, Disorder/Disease） |
| 801 | 先天性グリコシルホスファチジルイノシトール欠損症 | ORPHA:352587（Focal epilepsy-intellectual disability-cerebro-cerebellar malformation） | GPI Deficiency | **ORPHA:712** Hemolytic anemia due to glucophosphate isomerase deficiency（同義語 `GPI deficiency`, Disorder/Disease） |
| 861 | 遺伝性痙性対麻痺3A型 | ORPHA:100985（Autosomal dominant spastic paraplegia type 4） | SPG3A | **ORPHA:100984** Autosomal dominant spastic paraplegia type 3（同義語 `SPG3A`, Disorder/Disease） |
| 862 | 遺伝性痙性対麻痺7型 | ORPHA:104013（Metabolic disease with intestinal involvement） | SPG7 | **ORPHA:99013** Spastic paraplegia type 7（同義語 `SPG7`, Disorder/Disease） |
| 871 | 先天性大脳白質形成不全症（TUBB4A型） | ORPHA:209370（MECP2-related severe neonatal encephalopathy） | H-ABC | **ORPHA:139441** Hypomyelination with atrophy of basal ganglia and cerebellum（同義語 `H-ABC`, Disorder/Disease） |
| 872 | 先天性大脳白質形成不全症（SOX10型） | （なし） | PCWH | **ORPHA:163746** Peripheral demyelinating neuropathy-central dysmyelinating leukodystrophy-Waardenburg syndrome-Hirschsprung disease（同義語 `PCWH`, Disorder/Disease） |
| 900 | 先天性副腎不全(NR0B1型) | ORPHA:169（Ringed hair disease） | X-Linked AHC | **ORPHA:95702** X-linked adrenal hypoplasia congenita（同義語 `X-linked AHC`, Disorder/Disease） |
| 905 | 遺伝性低マグネシウム血症(TRPM6以外) | （なし） | FHHNC | **ORPHA:306516** Primary hypomagnesemia with hypercalciuria and nephrocalcinosis（同義語 `FHHNC`, Disorder/Disease） |
| 940 | 遺伝性感覚性ニューロパチーII型 | （なし） | HSAN II | **ORPHA:970** Hereditary sensory and autonomic neuropathy type 2（同義語 `HSAN2`, Disorder/Disease） |
| 941 | 遺伝性運動感覚性ニューロパチー(HMSN)VI型 | （なし） | CMT6 | **ORPHA:90120** Hereditary motor and sensory neuropathy type 6（同義語 `CMT6`, Disorder/Disease） |
| 944 | 先天性無痛症（HSAN V型） | （なし） | HSAN V | **ORPHA:64752** Hereditary sensory and autonomic neuropathy type 5（同義語 `HSAN5`, Disorder/Disease） |
| 961 | メチオニンアデノシルトランスフェラーゼ欠損症 | ORPHA:99946（Autosomal dominant Charcot-Marie-Tooth disease type 2A1） | MAT I/III Deficiency | **ORPHA:168598** Methionine adenosyltransferase I/III deficiency（同義語 `MAT I/III deficiency`, Disorder/Disease） |

## 3. 非現役エンティティにだけ一致したもの（23 件）

英語別名が Orphanet の**非現役**エンティティ（Obsolete＝廃止、Deprecated＝統合、Non-rare in Europe＝欧州で希少でない）の名前と一致した。Orphanet が「Moved to / Referred to」で示す移行先を併記する。移行先を採用するかは番号の付け替えではなく疾患概念の判断になるためファウンダーが決める。

| index | 日本語疾患名 | 現ORPHA番号 | 照合に使った英語別名 | 候補となったORPHA番号と疾患名（複数） |
|--:|---|---|---|---|
| 33 | 多発性硬化症 | ORPHA:802 | Multiple Sclerosis | **ORPHA:802** NON RARE IN EUROPE: Multiple sclerosis（Inactive/Non-rare disease in Europe; 移行先なし） |
| 34 | パーキンソン病 | （なし） | Parkinson's Disease | **ORPHA:319705** NON RARE IN EUROPE: Parkinson disease（Inactive/Non-rare disease in Europe; 移行先なし） |
| 51 | クラインフェルター症候群 | ORPHA:484 | Klinefelter Syndrome | **ORPHA:484** NON RARE IN EUROPE: Klinefelter syndrome（Inactive/Non-rare disease in Europe; 移行先なし） |
| 66 | クローン病 | ORPHA:206 | Crohn's Disease | **ORPHA:206** NON RARE IN EUROPE: Crohn disease（Inactive/Non-rare disease in Europe; 移行先なし） |
| 67 | 潰瘍性大腸炎 | ORPHA:771 | Ulcerative Colitis | **ORPHA:771** NON RARE IN EUROPE: Ulcerative colitis（Inactive/Non-rare disease in Europe; 移行先なし） |
| 79 | 皮質基底核変性症 | ORPHA:2098 | Corticobasal Degeneration | **ORPHA:278** OBSOLETE: Corticobasal degeneration（Inactive/Obsolete entity; Referred to → ORPHA:454887 Corticobasal syndrome） |
| 116 | 急速進行性糸球体腎炎 | （なし） | Rapidly Progressive Glomerulonephritis | **ORPHA:280569** OBSOLETE: Rapidly progressive glomerulonephritis（Inactive/Obsolete entity; Referred to → ORPHA:93548 Glomerular disease） |
| 152 | 分類不能型免疫不全症 | ORPHA:1572 | Common Variable Immunodeficiency | **ORPHA:1572** OBSOLETE: Common variable immunodeficiency（Inactive/Obsolete entity; Referred to → ORPHA:696851 Common variable immunodeficiency and related disorders） |
| 160 | 乾癬性関節炎 | （なし） | Psoriatic Arthritis | **ORPHA:40050** NON RARE IN EUROPE: Psoriatic arthritis（Inactive/Non-rare disease in Europe; 移行先なし） |
| 272 | 悪性黒色腫 | （なし） | Melanoma | **ORPHA:411533** NON RARE IN EUROPE: Melanoma（Inactive/Non-rare disease in Europe; 移行先なし） |
| 294 | 強直性脊椎炎 | ORPHA:449 | Ankylosing Spondylitis | **ORPHA:825** NON RARE IN EUROPE: Ankylosing spondylitis（Inactive/Non-rare disease in Europe; 移行先なし） |
| 317 | 骨パジェット病 | ORPHA:2801 | Paget's Disease of Bone | **ORPHA:280110** NON RARE IN EUROPE: Paget disease of bone（Inactive/Non-rare disease in Europe; 移行先なし） |
| 340 | 先天性水腎症 | （なし） | Congenital Hydronephrosis | **ORPHA:2190** OBSOLETE: Congenital hydronephrosis（Inactive/Obsolete entity; Referred to → ORPHA:93546 Non-syndromic renal or urinary tract malformation） |
| 377 | リウマチ性多発筋痛症 | （なし） | Polymyalgia Rheumatica | **ORPHA:93569** NON RARE IN EUROPE: Polymyalgia rheumatica（Inactive/Non-rare disease in Europe; 移行先なし） |
| 381 | 巨赤芽球性貧血（ビタミンB12欠乏） | （なし） | Pernicious Anemia | **ORPHA:120** NON RARE IN EUROPE: Pernicious anemia（Inactive/Non-rare disease in Europe; 移行先なし） |
| 620 | 巨大リンパ管奇形(嚢胞性ヒグローマ) | （なし） | Cystic Hygroma | **ORPHA:79486** Cystic hygroma（Inactive/Deprecated entity; Moved to → ORPHA:79489 Macrocystic lymphatic malformation） |
| 631 | 中條-西村症候群 | ORPHA:2615 | Nakajo-Nishimura Syndrome | **ORPHA:2615** Nakajo-Nishimura syndrome（Inactive/Deprecated entity; Moved to → ORPHA:324977 Proteasome-associated autoinflammatory syndrome） |
| 747 | 先天性溶血性貧血（不安定ヘモグロビン症） | （なし） | Unstable Hemoglobin Disease | **ORPHA:99139** OBSOLETE: Unstable hemoglobin disease（Inactive/Obsolete entity; Referred to → ORPHA:231226 Unstable beta globin chain variant disease） |
| 769 | セリアック病 | ORPHA:555 | Celiac Disease | **ORPHA:555** NON RARE IN EUROPE: Celiac disease（Inactive/Non-rare disease in Europe; 移行先なし） |
| 795 | 先天性無虹彩症 | ORPHA:77 | Aniridia | **ORPHA:77** OBSOLETE: Aniridia（Inactive/Obsolete entity; Referred to → ORPHA:88632 Anterior segment developmental anomaly） |
| 817 | 肢端紅痛症（SCN9A型） | ORPHA:90026 | Erythromelalgia | **ORPHA:1956** OBSOLETE: Erythromelalgia（Inactive/Obsolete entity; Referred to → ORPHA:90026 Primary erythromelalgia） |
| 867 | Anti-MAG抗体ニューロパチー | ORPHA:100057 | Anti-MAG Neuropathy | **ORPHA:639** Polyneuropathy associated with IgM monoclonal gammopathy with anti-MAG（Inactive/Deprecated entity; Moved to → ORPHA:209004 Polyneuropathy associated with IgM monoclonal gammopathy） |
| 915 | LMNA関連肢帯型筋ジストロフィー | （なし） | LGMD1B | **ORPHA:264** Autosomal dominant limb-girdle muscular dystrophy type 1B（Inactive/Deprecated entity; Moved to → ORPHA:98853 Autosomal dominant Emery-Dreifuss muscular dystrophy） |
