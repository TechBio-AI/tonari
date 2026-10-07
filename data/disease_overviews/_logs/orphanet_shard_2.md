# フェーズ1b-α orphanet_shard_2 の処理ログ

担当 180 件 / 出力 159 件 / Definition が無くスキップ 21 件 / 判断待ちで保留 0 件 / 落とした事実 0 件 / notes 710 件

- 手順: `docs/disease_overview_phase1_task.md` §2-4。出典は `_orphanet_definitions.json` の `definition_text` のみ。Web 取得なし。
- 抽出は Claude Code が Definition を 1 件ずつ読んで語句を選んだ（`build_orphanet_overviews.py` の機械抽出は使っていない）。
  symptoms は原文の語句そのまま。検査値・生検・画像・心電図の所見は §3 に従い symptoms に入れず、notes に書き写した。
  onset は人生の時期を明示する語句（at birth / in infancy / adulthood 等）だけ。early-onset・late-onset のような相対的な言い方と、数字・序数を含む記述は null。
  treatment は、治療の有無・内容を明示した Definition が 1 件も無かったため全件「記載なし」。
- 落とした事実: evidence を付けられずに落とした事実は 0 件（選んだ語句はすべて原文の部分文字列）。
- Orphanet の URL 形式は `https://www.orpha.net/en/disease/detail/{code}`（**未確定**）。

## 2026-09-26 の流し直し

- idx 288・705: 実体参照を復号した definition_text で summary / evidence を作り直した（ファウンダー判断。data/orphanet/SOURCE.md）。
- idx 355: 定義文中の薬剤名（5-FU）は疾患の定義の一部（毒性）として原文のまま（ファウンダー判断。docs/DECISIONS.md）。
- idx 23: onset「within the first year of life」は序数を含むため null に変えた（shard 1 のやり直しと基準をそろえた）。
- 全件: URL を `https://www.orpha.net/en/disease/detail/{code}` にそろえた。

## 出力しなかった疾患（Definition が無い）

| idx | 病名 | 理由 |
|---:|---|---|
| 20 | 原発性免疫不全症 | Orphanet の Definition が原本に無い |
| 38 | ANCA関連血管炎 | Orphanet の Definition が原本に無い |
| 56 | 筋強直性ジストロフィー | Orphanet の Definition が原本に無い |
| 91 | 糖原病 | Orphanet の Definition が原本に無い |
| 105 | 好酸球性消化管疾患 | Orphanet の Definition が原本に無い |
| 122 | ナルコレプシー | Orphanet の Definition が原本に無い |
| 201 | ミオクロニーてんかん | Orphanet の Definition が原本に無い |
| 206 | 魚鱗癬 | Orphanet の Definition が原本に無い |
| 214 | 鎖肛 | Orphanet の Definition が原本に無い |
| 296 | 周期性四肢麻痺 | Orphanet の Definition が原本に無い |
| 488 | PCDH19関連てんかん | Orphanet の Definition が原本に無い |
| 541 | 遺伝性感覚性自律神経性ニューロパチー | Orphanet の Definition が原本に無い |
| 546 | 頭蓋骨早期癒合症（非症候群性） | Orphanet の Definition が原本に無い |
| 610 | 先天性腎尿路奇形 | Orphanet の Definition が原本に無い |
| 630 | 傍腫瘍性小脳変性症 | Orphanet の Definition が原本に無い |
| 662 | 遺伝性網膜芽細胞腫 | Orphanet の Definition が原本に無い |
| 684 | PLA2G6関連神経変性 | Orphanet の Definition が原本に無い |
| 807 | 遺伝性有口赤血球症 | Orphanet の Definition が原本に無い |
| 824 | 遺伝性運動ニューロパチー（dHMN） | Orphanet の Definition が原本に無い |
| 847 | コエンザイムQ10欠損症 | Orphanet の Definition が原本に無い |
| 876 | Sarcoglycan関連肢帯型筋ジストロフィー | Orphanet の Definition が原本に無い |

## 出力した疾患

| idx | 病名 | 使った出典 | summary | symptoms | onset | treatment | 落とした事実 | 外した検査所見等 | notes 数 |
|---:|---|---|---|---:|---|---|---:|---:|---:|
| 7 | 遺伝性血管浮腫 | orphanet（Hereditary angioedema） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 13 | MELAS症候群 | orphanet（MELAS） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 23 | レーベル先天性黒内障 | orphanet（Leber congenital amaurosis） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 41 | 特発性血小板減少性紫斑病 | orphanet（Immune thrombocytopenia） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 47 | ターナー症候群 | orphanet（Turner syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 50 | ダウン症候群 | orphanet（Down syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 58 | 先天性甲状腺機能低下症 | orphanet（Congenital hypothyroidism） | 英語原文 | 0 | present from birth | 記載なし | 0 | 0 | 4 |
| 74 | 多系統萎縮症 | orphanet（Multiple system atrophy） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 80 | 視神経脊髄炎 | orphanet（Neuromyelitis optica spectrum disorder） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 97 | 成人スチル病 | orphanet（Adult-onset Still disease） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 128 | 原発性骨髄線維症 | orphanet（Primary myelofibrosis） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 132 | 多巣性運動ニューロパチー | orphanet（Multifocal motor neuropathy） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 145 | 特発性肺動脈性肺高血圧症 | orphanet（Idiopathic pulmonary arterial hypertension） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 152 | 消化管間質腫瘍 | orphanet（Gastrointestinal stromal tumor） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 176 | プロラクチノーマ | orphanet（Prolactinoma） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 181 | ヒルシュスプルング病 | orphanet（Hirschsprung disease） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 187 | キャッスルマン病 | orphanet（Castleman disease） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 216 | ブルガダ症候群 | orphanet（Brugada syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 225 | シトルリン血症 | orphanet（Citrullinemia） | 英語原文 | 5 | — | 記載なし | 0 | 2 | 5 |
| 236 | 多発性内軟骨腫症 | orphanet（Ollier disease） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 240 | IgA血管炎 | orphanet（Immunoglobulin A vasculitis） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 248 | 重症複合免疫不全症 | orphanet（Severe combined immunodeficiency） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 255 | 大腸ポリポーシス | orphanet（Familial adenomatous polyposis） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 259 | 多発性内分泌腫瘍症1型 | orphanet（Multiple endocrine neoplasia type 1） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 262 | 掌蹠膿疱症 | orphanet（Pustulosis palmaris et plantaris） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 267 | びまん性大細胞型B細胞リンパ腫 | orphanet（Diffuse large B-cell lymphoma） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 269 | ホジキンリンパ腫 | orphanet（Hodgkin lymphoma） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 272 | 遺伝性痙性対麻痺 | orphanet（Hereditary spastic paraplegia） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 280 | 特発性器質化肺炎 | orphanet（Cryptogenic organizing pneumonia） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 288 | 成人T細胞白血病リンパ腫 | orphanet（Adult T-cell leukemia/lymphoma） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 6 |
| 304 | 慢性炎症性脱髄性多発根神経炎（MADSAM型） | orphanet（Lewis-Sumner syndrome） | 英語原文 | 2 | adult onset | 記載なし | 0 | 0 | 3 |
| 308 | 先天性表皮水疱症（接合部型） | orphanet（Junctional epidermolysis bullosa） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 313 | 全身性ALアミロイドーシス | orphanet（AL amyloidosis） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 316 | 常染色体劣性多発性嚢胞腎 | orphanet（Autosomal recessive polycystic kidney disease） | 英語原文 | 0 | typically in utero or at birth | 記載なし | 0 | 2 | 5 |
| 323 | 腹壁破裂 | orphanet（Gastroschisis） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 327 | 赤色ぼろ繊維・ミオクローヌスてんかん症候群 | orphanet（MERRF） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 330 | Pearson症候群 | orphanet（Pearson syndrome） | 英語原文 | 2 | in early infancy | 記載なし | 0 | 3 | 4 |
| 333 | 孤立性線維性腫瘍 | orphanet（Solitary fibrous tumor） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 337 | ポルフィリン症（急性間欠性） | orphanet（Acute intermittent porphyria） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 339 | ウォルマン病 | orphanet（Wolman disease） | 英語原文 | 4 | in the neonatal or infantile period | 記載なし | 0 | 0 | 3 |
| 342 | 脊髄小脳変性症6型 | orphanet（Spinocerebellar ataxia type 6） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 353 | 副腎脳白質ジストロフィー脊髄型 | orphanet（Adrenomyeloneuropathy） | 英語原文 | 3 | Onset is typically in adulthood | 記載なし | 0 | 0 | 3 |
| 355 | ジヒドロピリミジナーゼ欠損症 | orphanet（Dihydropyrimidinuria） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 5 |
| 364 | カロリ病 | orphanet（Caroli disease） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 367 | 後部尿道弁 | orphanet（Posterior urethral valve） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 371 | 結節性多発動脈炎（皮膚型） | orphanet（Cutaneous polyarteritis nodosa） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 378 | Kabuki症候群 | orphanet（Kabuki syndrome） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 380 | VACTERL連合 | orphanet（VACTERL/VATER association） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 387 | Crouzon症候群 | orphanet（Crouzon syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 403 | Costello症候群 | orphanet（Costello syndrome） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 406 | Gorlin症候群 | orphanet（Gorlin syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 408 | Friedreich失調症 | orphanet（Friedreich ataxia） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 412 | Muenke症候群 | orphanet（Muenke syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 414 | Schinzel-Giedion症候群 | orphanet（Schinzel-Giedion syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 444 | Kostmann症候群 | orphanet（Severe congenital neutropenia） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 452 | CLOVES症候群 | orphanet（CLOVES syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 464 | Canavan病 | orphanet（Canavan disease） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 473 | 腫瘍性骨軟化症 | orphanet（Oncogenic osteomalacia） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 477 | ミトコンドリア神経胃腸脳筋症 | orphanet（Mitochondrial neurogastrointestinal encephalomyopathy） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 485 | 17q21.31欠失症候群 | orphanet（Koolen-De Vries syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 490 | ラフォラ病 | orphanet（Lafora disease） | 英語原文 | 3 | affecting previously healthy children or adolescents | 記載なし | 0 | 0 | 3 |
| 498 | 糖原病Ia型 | orphanet（Glycogen storage disease due to glucose-6-phosphatase deficiency） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 505 | カルバミルリン酸合成酵素I欠損症 | orphanet（Carbamoyl-phosphate synthetase 1 deficiency） | 英語原文 | 5 | — | 記載なし | 0 | 1 | 5 |
| 513 | 遺伝性オロト酸尿症 | orphanet（Hereditary orotic aciduria） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 517 | セロイドリポフスチン症 | orphanet（Neuronal ceroid lipofuscinosis） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 521 | Hartnup病 | orphanet（Hartnup disease） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 523 | Dent病 | orphanet（Dent disease） | 英語原文 | 0 | — | 記載なし | 0 | 4 | 6 |
| 525 | Gitelman症候群 | orphanet（Gitelman syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 3 | 6 |
| 527 | Gordon症候群 | orphanet（Pseudohypoaldosteronism type 2） | 英語原文 | 0 | — | 記載なし | 0 | 3 | 6 |
| 529 | 乳児型ネマリンミオパチー | orphanet（Nemaline myopathy） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 534 | ベスレムミオパチー | orphanet（Bethlem muscular dystrophy） | 英語原文 | 3 | congenital to childhood onset | 記載なし | 0 | 0 | 3 |
| 536 | 筋細管ミオパチー（X連鎖型） | orphanet（X-linked centronuclear myopathy） | 英語原文 | 3 | presents at birth | 記載なし | 0 | 1 | 4 |
| 538 | Freeman-Sheldon症候群 | orphanet（Freeman-Sheldon syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 553 | ミトコンドリア三機能蛋白欠損症 | orphanet（Long chain 3-hydroxyacyl-CoA dehydrogenase deficiency） | 英語原文 | 4 | onset in infancy/ early childhood | 記載なし | 0 | 2 | 4 |
| 555 | D-2-ヒドロキシグルタル酸尿症 | orphanet（D-2-hydroxyglutaric aciduria） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 6 |
| 557 | ヒスチジン血症 | orphanet（Histidinemia） | 英語原文 | 0 | — | 記載なし | 0 | 1 | 7 |
| 560 | 4H白質ジストロフィー | orphanet（4H leukodystrophy） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 566 | Danon病 | orphanet（Danon disease） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 568 | Timothy症候群 | orphanet（Timothy syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 571 | Conradi-Hünermann-Happle症候群 | orphanet（X-linked dominant chondrodysplasia punctata） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 573 | 骨形成不全症IV型 | orphanet（Osteogenesis imperfecta type 4） | 英語原文 | 5 | from infancy | 記載なし | 0 | 1 | 4 |
| 575 | 骨幹端異形成症(Schmid型) | orphanet（Metaphyseal chondrodysplasia, Schmid type） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 577 | 多発性骨端異形成症 | orphanet（Multiple epiphyseal dysplasia） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 582 | 捻曲性骨異形成症 | orphanet（Diastrophic dysplasia） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 585 | 屈曲肢異形成症 | orphanet（Campomelic dysplasia） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 588 | Meier-Gorlin症候群 | orphanet（Ear-patella-short stature syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 594 | アデノシンデアミナーゼ2欠損症 | orphanet（Deficiency of adenosine deaminase 2） | 英語原文 | 4 | typically presents in young children | 記載なし | 0 | 1 | 4 |
| 606 | 先天性嚢胞性腺腫様奇形 | orphanet（Congenital pulmonary airway malformation） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 620 | 遺伝性感覚性ニューロパチーI型 | orphanet（Hereditary sensory and autonomic neuropathy type 1） | 英語原文 | 2 | juvenile or adulthood disease onset | 記載なし | 0 | 0 | 3 |
| 623 | Morvan症候群 | orphanet（Morvan syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 632 | 眼球クローヌス・ミオクローヌス症候群 | orphanet（Opsoclonus-myoclonus syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 640 | 脊髄小脳変性症2型 | orphanet（Spinocerebellar ataxia type 2） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 642 | 脊髄小脳失調症31型 | orphanet（Spinocerebellar ataxia type 31） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 644 | 遺伝性痙性対麻痺4型 | orphanet（Autosomal dominant spastic paraplegia type 4） | 英語原文 | 4 | adult onset | 記載なし | 0 | 0 | 4 |
| 646 | 遺伝性びまん性白質脳症球状封入体型 | orphanet（Adult-onset leukoencephalopathy with axonal spheroids and pigmented glia） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 652 | von Hippel-Lindau病 | orphanet（Von Hippel-Lindau disease） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 656 | 若年性ポリポーシス症候群 | orphanet（Juvenile polyposis syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 658 | 多発性内分泌腫瘍症2A型 | orphanet（Multiple endocrine neoplasia type 2A） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 665 | Rothmund-Thomson症候群 | orphanet（Rothmund-Thomson syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 667 | 眼球運動失行を伴う失調症2型 | orphanet（Spinocerebellar ataxia with axonal neuropathy type 2） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 672 | アルギニン血症 | orphanet（Argininemia） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 675 | 先天性筋ジストロフィー（メロシン欠損型） | orphanet（Laminin subunit alpha 2-related congenital muscular dystrophy） | 英語原文 | 5 | at birth or during infancy | 記載なし | 0 | 0 | 3 |
| 679 | 性分化疾患（完全型AIS） | orphanet（Complete androgen insensitivity syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 686 | Kufor-Rakeb症候群 | orphanet（Kufor-Rakeb syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 689 | McLeod症候群 | orphanet（McLeod neuroacanthocytosis syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 1 | 5 |
| 691 | Perry症候群 | orphanet（Perry syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 700 | 先天性多発性関節拘縮症 | orphanet（Arthrogryposis multiplex congenita） | 英語原文 | 3 | at birth | 記載なし | 0 | 0 | 3 |
| 705 | 18トリソミー | orphanet（Trisomy 18 syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 6 |
| 709 | 遺伝性鉄過剰症(フェロポルチン病) | orphanet（Ferroportin disease） | 英語原文 | 0 | — | 記載なし | 0 | 2 | 6 |
| 712 | 後天性血栓性血小板減少性紫斑病 | orphanet（Immune-mediated thrombotic thrombocytopenic purpura） | 英語原文 | 0 | — | 記載なし | 0 | 2 | 6 |
| 722 | ネイルパテラ症候群 | orphanet（Nail-patella syndrome） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 726 | SeSAME/EAST症候群 | orphanet（EAST syndrome） | 英語原文 | 6 | present in infancy | 記載なし | 0 | 1 | 4 |
| 736 | 先天性吸収不良症候群（先天性クロール下痢） | orphanet（Congenital chloride diarrhea） | 英語原文 | 3 | — | 記載なし | 0 | 4 | 5 |
| 738 | 先天性微絨毛封入体病 | orphanet（Microvillus inclusion disease） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 744 | 先天性肺動静脈瘻 | orphanet（Pulmonary arteriovenous malformation） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 747 | 遺伝性眼瞼下垂 | orphanet（Congenital ptosis） | 英語原文 | 1 | present at birth | 記載なし | 0 | 0 | 3 |
| 749 | Duane眼球後退症候群 | orphanet（Duane retraction syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 751 | 遺伝性眼球運動失行症（Cogan型） | orphanet（Ocular motor apraxia, Cogan type） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 753 | 前眼部形成異常（Axenfeld-Rieger症候群） | orphanet（Axenfeld-Rieger syndrome） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 755 | Peters異常 | orphanet（Peters anomaly） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 758 | 青錐体単色型色覚異常 | orphanet（Blue cone monochromatism） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 761 | Best卵黄状黄斑ジストロフィー | orphanet（Best vitelliform macular dystrophy） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 766 | Bosch-Boonstra-Schaaf視神経萎縮症候群 | orphanet（Optic atrophy-intellectual disability syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 768 | 先天性魚鱗癬様紅皮症 | orphanet（Congenital ichthyosiform erythroderma） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 771 | Netherton症候群 | orphanet（Netherton syndrome） | 英語原文 | 3 | — | 記載なし | 0 | 0 | 4 |
| 773 | Chanarin-Dorfman症候群 | orphanet（Neutral lipid storage disease with ichthyosis） | 英語原文 | 8 | — | 記載なし | 0 | 2 | 5 |
| 776 | 水疱型先天性魚鱗癬様紅皮症 | orphanet（Autosomal dominant epidermolytic ichthyosis） | 英語原文 | 1 | at birth | 記載なし | 0 | 0 | 3 |
| 780 | Sneddon症候群 | orphanet（Sneddon syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 783 | 遺伝性掌蹠角化症（Papillon-Lefèvre症候群） | orphanet（Papillon-Lefèvre syndrome） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 786 | 遺伝性結合組織疾患（Cutis Laxa） | orphanet（Cutis laxa） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
| 793 | 遺伝性第XI因子欠損症 | orphanet（Congenital factor XI deficiency） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 797 | Gray Platelet症候群 | orphanet（Gray platelet syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 3 | 5 |
| 799 | Scott症候群 | orphanet（Scott syndrome） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 804 | 先天性第II因子欠損症 | orphanet（Congenital factor II deficiency） | 英語原文 | 1 | — | 記載なし | 0 | 1 | 5 |
| 820 | 遺伝性痙性対麻痺3A型 | orphanet（Autosomal dominant spastic paraplegia type 3） | 英語原文 | 5 | childhood-onset | 記載なし | 0 | 0 | 3 |
| 829 | 先天性大脳白質形成不全症（TUBB4A型） | orphanet（Hypomyelination with atrophy of basal ganglia and cerebellum） | 英語原文 | 5 | — | 記載なし | 0 | 1 | 5 |
| 831 | Allan-Herndon-Dudley症候群 | orphanet（Allan-Herndon-Dudley syndrome） | 英語原文 | 5 | — | 記載なし | 0 | 0 | 4 |
| 853 | セリンリン酸化経路異常症 | orphanet（Neu-Laxova syndrome） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 857 | 家族性低カルシウム尿性高カルシウム血症 | orphanet（Familial hypocalciuric hypercalcemia） | 英語原文 | 0 | — | 記載なし | 0 | 3 | 7 |
| 861 | 遺伝性低マグネシウム血症(TRPM6以外) | orphanet（Primary hypomagnesemia with hypercalciuria and nephrocalcinosis） | 英語原文 | 2 | — | 記載なし | 0 | 2 | 5 |
| 865 | 先天性ミオトニア(Thomsen/Becker型) | orphanet（Thomsen and Becker disease） | 英語原文 | 1 | — | 記載なし | 0 | 0 | 4 |
| 867 | Rippling Muscle Disease | orphanet（Rippling muscle disease） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 872 | FKRP関連肢帯型筋ジストロフィー | orphanet（FKRP-related limb-girdle muscular dystrophy R9） | 英語原文 | 8 | — | 記載なし | 0 | 2 | 5 |
| 874 | Dysferlin関連肢帯型筋ジストロフィー | orphanet（Dysferlin-related limb-girdle muscular dystrophy R2） | 英語原文 | 2 | onset in late adolescence or early adulthood | 記載なし | 0 | 1 | 4 |
| 883 | Desmin関連ミオパチー | orphanet（Desminopathy） | 英語原文 | 5 | — | 記載なし | 0 | 2 | 5 |
| 890 | 抗ARS抗体症候群 | orphanet（Antisynthetase syndrome） | 英語原文 | 8 | — | 記載なし | 0 | 1 | 5 |
| 897 | 遺伝性運動感覚性ニューロパチー(HMSN)VI型 | orphanet（Hereditary motor and sensory neuropathy type 6） | 英語原文 | 8 | — | 記載なし | 0 | 0 | 4 |
| 900 | 先天性無痛症（HSAN V型） | orphanet（Hereditary sensory and autonomic neuropathy type 5） | 英語原文 | 6 | — | 記載なし | 0 | 1 | 5 |
| 905 | AAアミロイドーシス | orphanet（AA amyloidosis） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 907 | 遺伝性全身性AApoAIアミロイドーシス | orphanet（AApoAI amyloidosis） | 英語原文 | 4 | — | 記載なし | 0 | 3 | 5 |
| 913 | メチオニンアデノシルトランスフェラーゼ欠損症 | orphanet（Methionine adenosyltransferase I/III deficiency） | 英語原文 | 3 | — | 記載なし | 0 | 2 | 5 |
| 915 | チロシン血症2型 | orphanet（Tyrosinemia type 2） | 英語原文 | 2 | — | 記載なし | 0 | 1 | 5 |
| 921 | 先天性十二指腸閉鎖症 | orphanet（Duodenal atresia） | 英語原文 | 0 | — | 記載なし | 0 | 0 | 5 |
| 925 | 先天性声門下狭窄 | orphanet（Congenital subglottic stenosis） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 927 | ピエール・ロバン症候群 | orphanet（Isolated Pierre Robin sequence） | 英語原文 | 4 | — | 記載なし | 0 | 0 | 4 |
| 931 | 頭蓋骨幹端異形成症（Pyle型） | orphanet（Pyle disease） | 英語原文 | 4 | — | 記載なし | 0 | 1 | 5 |
| 938 | Usher症候群1型 | orphanet（Usher syndrome type 1） | 英語原文 | 6 | — | 記載なし | 0 | 0 | 4 |
| 940 | Usher症候群3型 | orphanet（Usher syndrome type 3） | 英語原文 | 2 | Onset of hearing loss is usually in late childhood or adolescence | 記載なし | 0 | 0 | 3 |
| 946 | Waardenburg症候群2型 | orphanet（Waardenburg syndrome type 2） | 英語原文 | 2 | — | 記載なし | 0 | 0 | 4 |
