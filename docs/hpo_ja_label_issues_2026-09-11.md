# HPO 公式日本語訳の誤り一覧（GEM Japan への報告用、2026-09-11）

対象: `hp-ja.babelon.tsv`（source_version `hp/releases/2023-07-21`、最終更新コミット 56adddf6、2025-01-16）。
HPO v2026-06-23 の 11 疾患（ORPHA:324 / 355 / 365 / 579 / 716 / 664 / 15 / 436 / 89936 / 70 / 271861）に付く
aspect=P の 411 タームを目視した範囲で見つけたもの。原本は変更していない。
訂正はすべて派生ファイル `data/hpo_symptoms/hpo_symptoms_11.json` 側で行い、公式訳を `label_ja_official` に残している。

## 訂正済み（ファウンダー判定、2026-09-11）— 画面表示・照合に訂正後の訳を使う

| HPO ID | 英語 | 公式訳 | 訂正後 | 種別 |
|---|---|---|---|---|
| HP:0031006 | Acroparesthesia | 視覚障害 | 肢端錯感覚 | 別の概念 |
| HP:0500008 | Cornea verticillata | 垂直角膜 | 渦巻状角膜混濁 | 誤り |
| HP:0001097 | Keratoconjunctivitis sicca | 乾燥性 | 乾燥性角結膜炎 | 語の欠落 |
| HP:0002017 | Nausea and vomiting | 吐気と 嘔吐 | 吐き気と嘔吐 | 空白混入 |
| HP:0003233 | Decreased circulating HDL-C concentration | 高αリポ蛋白血症 | 低HDLコレステロール血症 | 意味が逆 |
| HP:0006844 | Absent patellar reflexes | 膝蓋腱反射 | 膝蓋腱反射消失 | 否定の欠落（意味が反転） |

## 報告のみ（未訂正）— 画面に出さず、照合には英語ラベルだけ使う

| HPO ID | 英語 | 公式訳 | 訂正案 | 種別 |
|---|---|---|---|---|
| HP:0012735 | Cough | 外層 | 咳 | 誤り |
| HP:0012418 | Hypoxemia | 低酸素血症への感受性の減少 | 低酸素血症 | 意味が異なる |
| HP:0001950 | Respiratory alkalosis | 活性減少アルカローシス | 呼吸性アルカローシス | 意味が異なる |
| HP:0008445 | Cervical spinal canal stenosis | 頚椎管後索 | 頚椎脊柱管狭窄 | 誤り |
| HP:0030757 | Tooth abscess | 歯槽膿漏 | 歯膿瘍 | 別の概念 |
| HP:0000726 | Dementia | Dementia | 認知症 | 未翻訳（status は OFFICIAL） |
| HP:0005216 | Impaired mastication | 咀嚼こんな | 咀嚼困難 | 誤字 |
| HP:0003572 | Low plasma citrulline | 血症シトルリン低値 | 血漿シトルリン低値 | 誤字 |
| HP:0002938 | Lumbar hyperlordosis | 腰椎前弯 hyperlordosis | 腰椎前弯過剰 | 英語混入 |
| HP:0008872 | Feeding difficulties in infancy | 食餌摂取障害 in infancy | 乳児期の哺乳障害 | 英語混入 |
| HP:0001156 | Brachydactyly | 短指症候群 | 短指症 | 症候群ではない |
| HP:0010885 | Avascular necrosis | 無菌性壊死 | 無血管性骨壊死 | 概念が異なる |

## 気になるが誤りとまでは言えないもの（参考）

| HPO ID | 英語 | 公式訳 | 備考 |
|---|---|---|---|
| HP:0001324 ほか | Muscle weakness 系 | 筋虚弱／遠位筋虚弱／近位筋虚弱… | 臨床では「筋力低下」が通常。別名辞書で橋を架けて対応（lib/normalization/alias-groups.ts） |
| HP:0000252 | Microcephaly | 小頭 | 「小頭症」が通常 |
| HP:0001297 | Stroke | 卒中 | 「脳卒中」が通常 |
| HP:0002571 | Achalasia | アカラジア | 「アカラシア」が通常 |
| HP:0001508 | Failure to thrive | 成長障害 (成長不全) | 2 訳併記 |
| HP:0002007 | Frontal bossing | 前頭突出, 額突出 | 2 訳併記 |
| HP:0010864 | Severe intellectual disability | 知的障害, 重度 | 語順 |
| HP:0004944 | Dilatation of the cerebral artery | 大脳動脈瘤 | 拡張と動脈瘤は別 |
| HP:0007018 | Attention deficit hyperactivity disorder | 注意力欠陥多動性疾患 | 「注意欠陥多動性障害」が通常 |
| HP:0003236 | Elevated circulating creatine kinase activity | 血清 creatine phosphokinase上昇 | 英語混入 |
| HP:0003391 | Gowers sign | Gowers サイン | 「ゴワーズ徴候」が通常 |

日本語訳が存在しないターム（2023-07-21 以降の新ターム）: HP:6000213、HP:3000062、HP:6000407。
