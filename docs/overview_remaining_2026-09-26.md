# 概要がまだ無い疾患（2026-09-26）

> **すべて機械生成。** 人が 1 件ずつ確認したものではない。

- 知識ファイル 951 疾患のうち、概要あり 630 件、**概要なし 321 件**
- 理由は 1 疾患に 1 つ。複数当てはまる場合は、下の表で上にある理由を採った
- 元データ: `data/disease_overviews/_match_table.json`、`_orphanet_definitions.json`、`_logs/shard_*.md`、`docs/disease_overview_review_2026-09-22.md`
- 生成: `scripts/portal/list_overview_remaining.py`

## 理由別の件数

| 理由 | 件数 | 意味 |
|---|---:|---|
| 案内ページのみ | 2 | 難病情報センターの解説が下位の病型へのリンクだけ。本文を取れない |
| 症状の節なし（抽出見送り） | 2 | 出典に症状の節が無く、症状を 3 件以上取れない |
| §1〜§4 で判定待ち | 37 | 難病・小慢の候補が「要確認」。○× が付けば抽出できる |
| §5 で判定待ち（Orphanet だけが手がかり） | 104 | 日本語出典なし。Orphanet のコードが「要確認」 |
| Orphanet に Definition なし | 21 | 日本語出典なし。Orphanet は完全一致だが英語 Definition が無い |
| 3 出典とも手がかりなし | 123 | 難病・小慢・Orphanet のどれにも紐付かない |
| その他（要確認） | 32 |  |
| 計 | 321 | |

## 一覧

| idx | 病名（ふりがな） | 理由 | 補足（機械） |
|---:|---|---|---|
| 24 | プリオン病（ぷりおんびょう） | 案内ページのみ | 難病情報センターの解説が下位の病型（クロイツフェルト・ヤコブ病ほか）へのリンクだけの案内ページで、番号つきの節を持たない。本文を取れないため出力せず。（shard_4.md） |
| 105 | 好酸球性消化管疾患（こうさんきゅうせいしょうかかんしっかん） | 案内ページのみ | 難病情報センターの解説が下位の病型（好酸球性食道炎・好酸球性胃腸炎）へのリンクだけの案内ページで、番号つきの節を持たない。本文を取れないため出力せず。（shard_4.md） |
| 177 | 巣状分節性糸球体硬化症（そうじょうぶんせつせいしきゅうたいこうかしょう） | 症状の節なし（抽出見送り） | 保存 HTML に症状の節が無い（概念・定義／病因／病態／診断／治療／予後のみ）。3 件以上の症状を出典から取れないため出力せず。（shard_1.md） |
| 717 | 巣状分節性糸球体硬化症（遺伝性）（そうじょうぶんせつせいしきゅうたいこうかしょう） | 症状の節なし（抽出見送り） | 保存 HTML に症状の節が無い（177 と同じページ構成）。同上。（shard_1.md） |
| 20 | 原発性免疫不全症（げんぱつせいめんえきふぜんしょう） | §1〜§4 で判定待ち | 確認シート §3（難病 が要確認） |
| 29 | 関節リウマチ（かんせつりうまち） | §1〜§4 で判定待ち | 確認シート §3（難病 が要確認） |
| 77 | てんかん（てんかん） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 107 | 肺胞蛋白症（はいほうたんぱくしょう） | §1〜§4 で判定待ち | 確認シート §3・§4（難病・小慢 が要確認） |
| 111 | ネフローゼ症候群（ねふろーぜしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §3・§4（難病・小慢 が要確認） |
| 201 | ミオクロニーてんかん（みおくろにーてんかん） | §1〜§4 で判定待ち | 確認シート §3・§4（小慢 が要確認） |
| 283 | 膀胱尿管逆流症（ぼうこうにょうかんぎゃくりゅうしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 296 | 周期性四肢麻痺（しゅうきせいししまひ） | §1〜§4 で判定待ち | 確認シート §3（難病 が要確認） |
| 329 | Kearns-Sayre症候群（かーんずせいやーしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 345 | 補体欠損症（ほたいけっそんしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 350 | 心房中隔欠損症（大型）（しんぼうちゅうかくけっそんしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 396 | 肺静脈還流異常症（はいじょうみゃくかんりゅういじょうしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 398 | DiGeorge症候群関連免疫不全（でぃじょーじしょうこうぐんかんれんめんえきふぜん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 419 | Cornelia de Lange症候群2型（こるねりあでらんげしょうこうぐんにがた） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 429 | Weaver症候群（うぃーばーしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 459 | Hyper-IgE症候群（はいぱーあいじーいーしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 460 | Omenn症候群（おーめんしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 467 | Niemann-Pick病B型（にーまんぴっくびょうびーがた） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 492 | クッシング症候群（ACTH非依存性）（くっしんぐしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 495 | レッシュ・ナイハン症候群（れっしゅないはんしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 511 | Niemann-Pick病A型（にーまんぴっくびょうえーがた） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 532 | 先天性線維型不均等症（せんてんせいせんいがたふきんとうしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 545 | 二分脊椎（にぶんせきつい） | §1〜§4 で判定待ち | 確認シート §3・§4（難病・小慢 が要確認） |
| 561 | Aicardi-Goutières症候群（えかるでぃぐてぃえーるしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 591 | 巨大リンパ管奇形(嚢胞性ヒグローマ)（きょだいりんぱかんきけい） | §1〜§4 で判定待ち | 確認シート §3（難病 が要確認） |
| 650 | Kasabach-Merritt現象（かさばっはめりっとげんしょう） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 654 | Cowden症候群（かうでんしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 693 | ドパ反応性ジストニア（どぱはんのうせいじすとにあ） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 718 | Alport症候群（X連鎖型）（あるぽーとしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 728 | 肝外門脈閉塞症（かんがいもんみゃくへいそくしょう） | §1〜§4 で判定待ち | 確認シート §3（難病 が要確認） |
| 789 | Rasmussen脳炎（らすむっせんのうえん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 796 | Bernard-Soulier症候群（べるなーるすーりえしょうこうぐん） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 824 | 遺伝性運動ニューロパチー（dHMN）（いでんせいうんどうにゅーろぱちー） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 842 | 先天性高乳酸血症（PC欠損症）（せんてんせいこうにゅうさんけっしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 860 | 先天性副甲状腺機能低下症(GCM2型)（せんてんせいふくこうじょうせんきのうていかしょう） | §1〜§4 で判定待ち | 確認シート §3・§4（難病・小慢 が要確認） |
| 910 | 全身性カルニチン欠乏症（ぜんしんせいかるにちんけつぼうしょう） | §1〜§4 で判定待ち | 確認シート §4（小慢 が要確認） |
| 930 | Pfeiffer症候群1型（ふぁいふぁーしょうこうぐんいちがた） | §1〜§4 で判定待ち | 確認シート §2（小慢 が要確認） |
| 48 | クラインフェルター症候群（くらいんふぇるたーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:484 NON RARE IN EUROPE: Klinefelter syndrome |
| 116 | クッシング症候群（くっしんぐしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:641613 Endogenous Cushing syndrome |
| 125 | 原発性マクログロブリン血症（げんぱつせいまくろぐろぶりんけっしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:33226 Waldenström macroglobulinemia |
| 171 | 線維性骨異形成症（せんいせいこついけいせいしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:249 Fibrous dysplasia of bone |
| 186 | POEMS症候群（ぽえむすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2905 POEMS syndrome |
| 253 | ツェルウェガー症候群（つぇるうぇがーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:912 Zellweger syndrome |
| 273 | エプスタイン奇形（えぷすたいんきけい） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:1880 Ebstein malformation of the tricuspid valve |
| 282 | 先天性巨大色素性母斑（せんてんせいきょだいしきそせいぼはん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:626 Large/giant congenital melanocytic nevus |
| 294 | リポ蛋白リパーゼ欠損症（りぽたんぱくりぱーぜけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:309015 Familial lipoprotein lipase deficiency |
| 300 | 肺動脈閉鎖症（はいどうみゃくへいさしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:1207 Pulmonary atresia with ventricular septal defect |
| 307 | 骨パジェット病（こつぱじぇっとびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2801 Juvenile Paget disease |
| 352 | 抗糸球体基底膜病（こうしきゅうたいきていまくびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:375 Anti-glomerular basement membrane disease |
| 375 | Silver-Russell症候群（しるばーらっせるしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:813 Silver-Russell syndrome |
| 385 | Treacher Collins症候群（とりーちゃーこりんずしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:861 Treacher-Collins syndrome |
| 394 | ピルビン酸キナーゼ欠損症（ぴるびんさんきなーぜけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:766 Hemolytic anemia due to red cell pyruvate kinase deficiency |
| 402 | Phelan-McDermid症候群（ふぇらんまくだーみっどしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:48652 Phelan-McDermid syndrome |
| 410 | Waardenburg症候群（わーるでんぶるぐしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:3440 Waardenburg syndrome |
| 415 | Mowat-Wilson症候群（もわっとうぃるそんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2152 Mowat-Wilson syndrome |
| 416 | Pitt-Hopkins症候群（ぴっとほぷきんすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2896 Pitt-Hopkins syndrome |
| 417 | Kleefstra症候群（くれーふすとらしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:261494 Kleefstra syndrome |
| 418 | Wiedemann-Steiner症候群（うぃーでまんしゅたいなーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:319182 Wiedemann-Steiner syndrome |
| 420 | Pallister-Killian症候群（ぱりすたーきりあんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:884 Pallister-Killian syndrome |
| 421 | Jacobsen症候群（やこぶせんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2308 Jacobsen syndrome |
| 422 | Emanuel症候群（えまぬえるしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:96170 Emanuel syndrome |
| 426 | Myhre症候群（みーれしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2588 Myhre syndrome |
| 427 | Floating-Harbor症候群（ふろーてぃんぐはーばーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2044 Floating-Harbor syndrome |
| 428 | Tatton-Brown-Rahman症候群（たっとんぶらうんらーまんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:404443 Tatton-Brown-Rahman syndrome |
| 430 | Marshall-Smith症候群（まーしゃるすみすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:561 Marshall-Smith syndrome |
| 431 | Bohring-Opitz症候群（ぼーりんぐおぴっつしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:97297 Bohring-Opitz syndrome |
| 435 | Alström症候群（あるすとれーむしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:64 Alström syndrome |
| 436 | Cohen症候群（こーえんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:193 Cohen syndrome |
| 450 | Proteus症候群（ぷろていうすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:744 Proteus syndrome |
| 457 | IPEX症候群（あいぺっくすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:37042 Immune dysregulation-polyendocrinopathy-enteropathy-X-linked syndrome |
| 461 | Chediak-Higashi症候群（ちぇでぃあっくひがししょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:167 Chédiak-Higashi syndrome |
| 462 | Griscelli症候群（ぐりせりしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:381 Griscelli syndrome |
| 481 | 2q37欠失症候群（にきゅうさんななけっしつしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:1001 2q37 microdeletion syndrome |
| 483 | 15q13.3欠失症候群（じゅうごきゅういちさんてんさんけっしつしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:199318 15q13.3 microdeletion syndrome |
| 484 | 16p11.2欠失症候群（じゅうろくぴーいちいちてんにけっしつしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:261211 16p11.2p12.2 microdeletion syndrome |
| 494 | GLUT1欠損症（ぐるっとわんけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:71277 Classic glucose transporter type 1 deficiency syndrome |
| 515 | モリブデン補因子欠損症（もりぶでんほいんしけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:99732 Sulfite oxidase deficiency due to molybdenum cofactor deficiency |
| 542 | 遺伝性運動感覚性ニューロパチー（デジェリーヌ・ソッタス型）（いでんせいうんどうかんかくせいにゅーろぱちー） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:64748 Dejerine-Sottas syndrome |
| 544 | Chiari奇形（I型）（きありきけい） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:268882 Arnold-Chiari malformation type I |
| 558 | Dubin-Johnson症候群（でゅびんじょんそんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:234 Dubin-Johnson syndrome |
| 562 | 白質消失病（はくしつしょうしつびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:135 CACH syndrome |
| 569 | 先天性QT短縮症候群（せんてんせいきゅーてぃーたんしゅくしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:51083 Congenital short QT syndrome |
| 579 | Stickler症候群（すてぃっくらーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:828 Stickler syndrome |
| 580 | Acromesomelic Dysplasia(Maroteaux型)（あくろめぞめりっくでぃすぷれいじあまろとーがた） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:40 Acromesomelic dysplasia, Maroteaux type |
| 586 | Hajdu-Cheney症候群（はじゅちぇにーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:955 Hajdu-Cheney syndrome |
| 589 | 多中心性Castleman病（たちゅうしんせいきゃっするまんびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:160 Castleman disease |
| 592 | SAPHO症候群（さふぉしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:793 SAPHO syndrome |
| 596 | Muckle-Wells症候群（まっくるうぇるずしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:575 Muckle-Wells syndrome |
| 597 | CINCA症候群（しんかしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:1451 CINCA syndrome |
| 598 | PAPA症候群（ぴーえーぴーえーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:69126 PAPA syndrome |
| 604 | Schnitzler症候群（しゅにっつらーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:37748 Schnitzler syndrome |
| 614 | Meckel-Gruber症候群（めっけるぐるーばーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:564 Meckel syndrome |
| 615 | Fraser症候群（ふれーざーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2052 Fraser syndrome |
| 616 | Pallister-Hall症候群（ぱりすたーほーるしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:672 Pallister-Hall syndrome |
| 617 | Baraitser-Winter症候群（ばらいざーうぃんたーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2995 Baraitser-Winter cerebrofrontofacial syndrome |
| 618 | Donnai-Barrow症候群（どないばろーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2143 Donnai-Barrow syndrome |
| 625 | 自己免疫性脳炎（抗NMDA受容体）（じこめんえきせいのうえん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:217253 NMDA receptor encephalitis |
| 626 | 抗LGI1抗体関連脳炎（こうえるじーあいわんこうたいかんれんのうえん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:163908 OBSOLETE: Limbic encephalitis with LGI1 antibodies |
| 651 | Birt-Hogg-Dubé症候群（ばーとほっぐでゅべしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:122 Birt-Hogg-Dubé syndrome |
| 653 | Li-Fraumeni症候群（りーふらうめにしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:524 Li-Fraumeni syndrome |
| 661 | Carney-Stratakis症候群（かーにーすとらたきすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:97286 Carney-Stratakis syndrome |
| 664 | Baller-Gerold症候群（ばれーじぇろるどしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:1225 Baller-Gerold syndrome |
| 676 | 先天性副腎皮質過形成症（11β-水酸化酵素欠損型）（せんてんせいふくじんひしつかけいせいしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:90795 Congenital adrenal hyperplasia due to 11-beta-hydroxylase deficiency |
| 677 | 先天性副腎皮質過形成症（17α-水酸化酵素欠損型）（せんてんせいふくじんひしつかけいせいしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:90793 Congenital adrenal hyperplasia due to 17-alpha-hydroxylase deficiency |
| 681 | Swyer症候群（すわいやーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:242 46,XY complete gonadal dysgenesis |
| 687 | Woodhouse-Sakati症候群（うっどはうすさかてぃしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:3464 Woodhouse-Sakati syndrome |
| 699 | 遺伝性多発性外骨腫（いでんせいたはつせいがいこつしゅ） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:321 Multiple osteochondromas |
| 720 | Denys-Drash症候群（どにーどらっしゅしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:220 Denys-Drash syndrome |
| 721 | Frasier症候群（ふれいじゃーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:347 Frasier syndrome |
| 731 | セリアック病（せりあっくびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:555 NON RARE IN EUROPE: Celiac disease |
| 743 | 先天性肺サーファクタント異常症（せんてんせいはいさーふぁくたんといじょうしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:217563 Neonatal acute respiratory distress syndrome due to SP-B deficiency |
| 756 | 先天性無虹彩症（せんてんせいむこうさいしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:77 OBSOLETE: Aniridia |
| 759 | 全色盲（CNGA3型）（ぜんしきもう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:49382 Achromatopsia |
| 764 | KBG症候群（けーびーじーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2332 KBG syndrome |
| 770 | Sjögren-Larsson症候群（しぇーぐれんらーそんしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:816 Sjögren-Larsson syndrome |
| 774 | Hailey-Hailey病（へいりーへいりーびょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2841 Hailey-Hailey disease |
| 777 | 遺伝性痛覚不全症（SCN9A型）（いでんせいつうかくふぜんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:217399 Congenital insensitivity to pain-hyperhidrosis-absence of cutaneous sensory innervation |
| 778 | 肢端紅痛症（SCN9A型）（したんこうつうしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:90026 Primary erythromelalgia |
| 787 | 先天性副腎皮質過形成症（3β-HSD欠損型）（せんてんせいふくじんひしつかけいせいしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:90791 Congenital adrenal hyperplasia due to 3-beta-hydroxysteroid dehydrogenase deficiency |
| 790 | 遺伝性ジスフィブリノゲン血症（いでんせいじすふぃぶりのげんけっしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:98881 Familial dysfibrinogenemia |
| 791 | 遺伝性第VII因子欠損症（いでんせいだいなないんしけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:327 Congenital factor VII deficiency |
| 792 | 遺伝性第X因子欠損症（いでんせいだいじゅういんしけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:328 Congenital factor X deficiency |
| 794 | 遺伝性第XIII因子欠損症（いでんせいだいじゅうさんいんしけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:330 Congenital factor XII deficiency |
| 800 | 先天性無フィブリノゲン血症（せんてんせいむふぃぶりのげんけっしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:98880 Familial afibrinogenemia |
| 801 | 先天性プラスミノゲン欠損症（せんてんせいぷらすみのげんけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:722 Hypoplasminogenemia |
| 803 | 第V因子・第VIII因子複合欠損症（だいごいんしだいはちいんしふくごうけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:35909 Combined deficiency of factor V and factor VIII |
| 812 | Legius症候群（れじうすしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:137605 Legius syndrome |
| 813 | Marden-Walker症候群（まーでんうぉーかーしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2461 Marden-Walker syndrome |
| 814 | Filippi症候群（ふぃりっぴしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:3255 Filippi syndrome |
| 836 | NARP症候群（なるぷしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:644 NARP syndrome |
| 838 | ミトコンドリアDNA枯渇症候群（筋型）（みとこんどりあでぃえぬえーこかつしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:254875 TK2-related mitochondrial DNA maintenance defect, myopathic form |
| 841 | 先天性高乳酸血症（PDH欠損症）（せんてんせいこうにゅうさんけっしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:765 Pyruvate dehydrogenase deficiency |
| 843 | 複合体I欠損症（ふくごうたいいちけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:2609 Isolated complex I deficiency |
| 854 | ピリドキサミン5リン酸酸化酵素欠損症（ぴりどきさみんごりんさんさんかこうそけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:79096 Pyridoxamine-5-phosphate deficiency-developmental and epileptic encephalopathy |
| 877 | SELENON関連ミオパチー（せれのんかんれんみおぱちー） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:97244 Rigid spine syndrome |
| 878 | DNM2関連中心核ミオパチー（でぃーえぬえむつーかんれんちゅうしんかくみおぱちー） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:169186 Autosomal recessive centronuclear myopathy |
| 879 | BIN1関連中心核ミオパチー（びーあいえぬわんかんれんちゅうしんかくみおぱちー） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:169189 Autosomal dominant centronuclear myopathy |
| 880 | TTN関連ミオパチー（てぃーてぃーえぬかんれんみおぱちー） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:609 Tibial muscular dystrophy |
| 916 | 先天性胆汁酸合成異常症(3β-HSD型)（せんてんせいたんじゅうさんごうせいいじょうしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:485631 Congenital bile acid synthesis defect |
| 919 | D-bifunctional protein欠損症（でぃーばいふぁんくしょなるぷろていんけっそんしょう） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:300 Bifunctional enzyme deficiency |
| 944 | Pendred症候群（ぺんどれっどしょうこうぐん） | §5 で判定待ち（Orphanet だけが手がかり） | ORPHA:705 Pendred syndrome |
| 11 | 原発性高シュウ酸尿症1型（げんぱつせいこうしゅうさんにょうしょういちがた） | Orphanet に Definition なし | ORPHA:93598 Primary hyperoxaluria type 1 |
| 38 | ANCA関連血管炎（あんかかんれんけっかんえん） | Orphanet に Definition なし | ORPHA:156152 Anti-neutrophil cytoplasmic antibody-associated vasculitis |
| 56 | 筋強直性ジストロフィー（きんきょうちょくせいじすとろふぃー） | Orphanet に Definition なし | ORPHA:206647 Myotonic dystrophy |
| 91 | 糖原病（とうげんびょう） | Orphanet に Definition なし | ORPHA:79201 Glycogen storage disease |
| 122 | ナルコレプシー（なるこれぷしー） | Orphanet に Definition なし | ORPHA:619284 Narcolepsy |
| 143 | 酸性スフィンゴミエリナーゼ欠損症（さんせいすふぃんごみえりなーぜけっそんしょう） | Orphanet に Definition なし | ORPHA:618899 Acid sphingomyelinase deficiency |
| 184 | 後天性血友病A（こうてんせいけつゆうびょうえー） | Orphanet に Definition なし | ORPHA:599480 Acquired hemophilia A |
| 206 | 魚鱗癬（ぎょりんせん） | Orphanet に Definition なし | ORPHA:79354 Ichthyosis |
| 214 | 鎖肛（さこう） | Orphanet に Definition なし | ORPHA:96346 Anorectal malformation |
| 488 | PCDH19関連てんかん（ぴーしーでぃーえいちわんないんかんれんてんかん） | Orphanet に Definition なし | ORPHA:714652 PCDH19 clustering epilepsy |
| 541 | 遺伝性感覚性自律神経性ニューロパチー（いでんせいかんかくせいじりつしんけいせいにゅーろぱちー） | Orphanet に Definition なし | ORPHA:140471 Hereditary sensory and autonomic neuropathy |
| 546 | 頭蓋骨早期癒合症（非症候群性）（とうがいこつそうきゆごうしょう） | Orphanet に Definition なし | ORPHA:139390 Non-syndromic craniosynostosis |
| 610 | 先天性腎尿路奇形（せんてんせいじんにょうろきけい） | Orphanet に Definition なし | ORPHA:93545 Renal or urinary tract malformation |
| 630 | 傍腫瘍性小脳変性症（ぼうしゅようせいしょうのうへんせいしょう） | Orphanet に Definition なし | ORPHA:623626 Paraneoplastic cerebellar degeneration |
| 662 | 遺伝性網膜芽細胞腫（いでんせいもうまくがさいぼうしゅ） | Orphanet に Definition なし | ORPHA:357027 Hereditary retinoblastoma |
| 684 | PLA2G6関連神経変性（ぴーえるえーつーじーしっくすかんれんしんけいへんせい） | Orphanet に Definition なし | ORPHA:329303 PLA2G6-related neurodegeneration |
| 752 | 遺伝性視神経症（常染色体優性）（いでんせいししんけいしょう） | Orphanet に Definition なし | ORPHA:98672 Autosomal dominant optic atrophy |
| 807 | 遺伝性有口赤血球症（いでんせいゆうこうせっけっきゅうしょう） | Orphanet に Definition なし | ORPHA:98365 Hereditary stomatocytosis |
| 847 | コエンザイムQ10欠損症（こえんざいむきゅーてんけっそんしょう） | Orphanet に Definition なし | ORPHA:35656 Coenzyme Q10 deficiency |
| 876 | Sarcoglycan関連肢帯型筋ジストロフィー（さるこぐりかんかんれんしたいがたきんじすとろふぃー） | Orphanet に Definition なし | ORPHA:207052 Qualitative or quantitative defects of sarcoglycan |
| 950 | 口顔指症候群（こうがんししょうこうぐん） | Orphanet に Definition なし | ORPHA:140997 Orofaciodigital syndrome |
| 16 | 遺伝性ALS（いでんせいえーえるえす） | 3 出典とも手がかりなし | orpha_code が無い |
| 25 | カタトニア症候群（かたとにあしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 119 | 尿崩症（にょうほうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 131 | 特発性正常圧水頭症（とくはつせいせいじょうあつすいとうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 144 | CLN2病（しーえるえぬつーびょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 153 | 神経内分泌腫瘍（しんけいないぶんぴしゅよう） | 3 出典とも手がかりなし | orpha_code が無い |
| 155 | 乾癬性関節炎（かんせんせいかんせつえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 170 | 心臓粘液腫（しんぞうねんえきしゅ） | 3 出典とも手がかりなし | orpha_code が無い |
| 189 | 甲状腺クリーゼ（こうじょうせんくりーぜ） | 3 出典とも手がかりなし | orpha_code が無い |
| 198 | 好酸球性食道炎（こうさんきゅうせいしょくどうえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 200 | ミトコンドリア脳筋症（みとこんどりあのうきんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 219 | 加齢黄斑変性（滲出型）（かれいおうはんへんせい） | 3 出典とも手がかりなし | orpha_code が無い |
| 228 | 原発性卵巣不全（げんぱつせいらんそうふぜん） | 3 出典とも手がかりなし | orpha_code が無い |
| 229 | 肝内結石症（かんないけっせきしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 231 | 遺伝性難聴（いでんせいなんちょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 265 | 特発性ステロイド性骨壊死症（とくはつせいすてろいどせいこつえししょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 279 | メニエール病（めにえーるびょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 285 | 関節リウマチ関連間質性肺疾患（かんせつりうまちかんれんかんしつせいはいしっかん） | 3 出典とも手がかりなし | orpha_code が無い |
| 291 | 自己免疫性好中球減少症（じこめんえきせいこうちゅうきゅうげんしょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 297 | 非ジストロフィー性ミオトニア（ひじすとろふぃーせいみおとにあ） | 3 出典とも手がかりなし | orpha_code が無い |
| 319 | 腸回転異常症（ちょうかいてんいじょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 324 | 好酸球性中耳炎（こうさんきゅうせいちゅうじえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 326 | 先天性水腎症（せんてんせいすいじんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 334 | 後腹膜線維症（こうふくまくせんいしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 341 | 正常圧水頭症（二次性）（せいじょうあつすいとうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 347 | メッケル憩室（めっけるけいしつ） | 3 出典とも手がかりなし | orpha_code が無い |
| 348 | 肝血管腫（かんけっかんしゅ） | 3 出典とも手がかりなし | orpha_code が無い |
| 356 | 慢性免疫性脱髄性多発根神経炎純運動型（まんせいめんえきせいだつずいせいたはつこんしんけいえんじゅんうんどうがた） | 3 出典とも手がかりなし | orpha_code が無い |
| 362 | リウマチ性多発筋痛症（りうまちせいたはつきんつうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 363 | RS3PE症候群（あーるえすすりーぴーいーしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 368 | 子宮内膜症（しきゅうないまくしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 370 | 環状肉芽腫（かんじょうにくげしゅ） | 3 出典とも手がかりなし | orpha_code が無い |
| 395 | 巨大結腸症（きょだいけっちょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 423 | Potocki-Lupski症候群（ぽときるぷすきしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 424 | Renpenning症候群（れんぺにんぐしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 448 | 遺伝性プロテインS欠乏症（いでんせいぷろていんえすけつぼうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 453 | Parkes Weber症候群（ぱーくすうぇーばーしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 482 | 8p23.1欠失症候群（はちぴーにさんてんいちけっしつしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 486 | 乳児てんかん性スパズム症候群（結節性硬化症関連）（にゅうじてんかんせいすぱずむしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 502 | ホロカルボキシラーゼ合成酵素欠損症（ほろかるぼきしらーぜごうせいこうそけっそんしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 504 | テトラヒドロビオプテリン欠乏症（てとらひどろびおぷてりんけつぼうしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 519 | Mitchell-Riley症候群（みっちぇるらいりーしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 520 | KCNJ11関連新生児糖尿病（けーしーえぬじぇいわんわんかんれんしんせいじとうにょうびょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 539 | ミトコンドリア心筋症（みとこんどりあしんきんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 595 | H症候群（えいちしょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 599 | PFAPA症候群（ぴーふぁぱしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 602 | A20ハプロ不全症（えーつーぜろはぷろふぜんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 603 | VEXAS症候群（べくさすしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 607 | 肺分画症（はいぶんかくしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 612 | 先天性気管支閉鎖症（せんてんせいきかんしへいさしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 622 | Isaac症候群（あいざっくしょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 627 | 視神経脊髄炎関連疾患（MOG抗体）（ししんけいせきずいえんかんれんしっかん） | 3 出典とも手がかりなし | orpha_code が無い |
| 628 | 抗GABAb受容体抗体関連脳炎（こうぎゃばびーじゅようたいこうたいかんれんのうえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 629 | 抗AMPA受容体抗体関連脳炎（こうあんぱじゅようたいこうたいかんれんのうえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 634 | IgG4関連硬膜炎（あいじーじーふぉーかんれんこうまくえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 635 | IgG4関連涙腺・唾液腺炎（あいじーじーふぉーかんれんるいせんだえきせんえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 636 | IgG4関連後腹膜/大動脈周囲炎（あいじーじーふぉーかんれんこうふくまくだいどうみゃくしゅういえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 660 | 遺伝性褐色細胞腫/パラガングリオーマ症候群（いでんせいかっしょくさいぼうしゅぱらがんぐりおーましょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 670 | 先天性甲状腺機能低下症（中枢性）（せんてんせいこうじょうせんきのうていかしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 671 | 成人成長ホルモン分泌不全症（せいじんせいちょうほるもんぶんぴふぜんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 674 | 遺伝性腎性低尿酸血症（いでんせいじんせいていにょうさんけっしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 695 | 遺伝性痙攣性発声障害（いでんせいけいれんせいはっせいしょうがい） | 3 出典とも手がかりなし | orpha_code が無い |
| 696 | 本態性振戦（重症型）（ほんたいせいしんせん） | 3 出典とも手がかりなし | orpha_code が無い |
| 707 | 部分トリソミー（不均衡転座）（ぶぶんとりそみー） | 3 出典とも手がかりなし | orpha_code が無い |
| 710 | 先天性溶血性貧血（不安定ヘモグロビン症）（せんてんせいようけつせいひんけつ） | 3 出典とも手がかりなし | orpha_code が無い |
| 719 | 先天性フィンランド型ネフローゼ症候群（せんてんせいふぃんらんどがたねふろーぜしょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 727 | 先天性腎尿細管障害（Fanconi症候群）（せんてんせいじんにょうさいかんしょうがい） | 3 出典とも手がかりなし | orpha_code が無い |
| 734 | 蛋白漏出性胃腸症（たんぱくろうしゅつせいいちょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 735 | 腸管囊胞様気腫症（ちょうかんのうほうようきしゅしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 746 | Williams-Campbell症候群（うぃりあむずきゃんべるしょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 763 | Kabuki症候群2型（かぶきしょうこうぐんにがた） | 3 出典とも手がかりなし | orpha_code が無い |
| 805 | PAI-1欠損症（ぴーえーあいわんけっそんしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 809 | X連鎖性血小板減少症（えっくすれんさせいけっしょうばんげんしょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 810 | ANKRD26関連血小板減少症（えーえぬけーあーるでぃーつーしっくすかんれんけっしょうばんげんしょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 815 | 特発性側弯症（重症進行性）（とくはつせいそくわんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 816 | 先天性側弯症（椎体形成異常）（せんてんせいそくわんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 817 | 変形性股関節症（二次性・若年型）（へんけいせいこかんせつしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 818 | 脊髄係留症候群（せきずいけいりゅうしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 819 | 環軸椎脱臼（先天性）（かんじくついだっきゅう） | 3 出典とも手がかりなし | orpha_code が無い |
| 822 | 遺伝性痙性対麻痺5A型（いでんせいけいせいついまひごえーがた） | 3 出典とも手がかりなし | orpha_code が無い |
| 823 | 遺伝性ニューロパチー（SORD欠損症）（いでんせいにゅーろぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 825 | 抗MAG抗体ニューロパチー（こうえむえーじーこうたいにゅーろぱちー） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 826 | 肥厚性硬膜炎（ひこうせいこうまくえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 827 | 脊髄硬膜動静脈瘻（せきずいこうまくどうじょうみゃくろう） | 3 出典とも手がかりなし | orpha_code が無い |
| 832 | 遺伝性線条体壊死（いでんせいせんじょうたいえし） | 3 出典とも手がかりなし | orpha_code が無い |
| 833 | 遺伝性小脳低形成（いでんせいしょうのうていけいせい） | 3 出典とも手がかりなし | orpha_code が無い |
| 834 | 先天性眼球振盪（せんてんせいがんきゅうしんとう） | 3 出典とも手がかりなし | orpha_code が無い |
| 835 | 進行性外眼筋麻痺(ミトコンドリア)（しんこうせいがいがんきんまひ） | 3 出典とも手がかりなし | orpha_code が無い |
| 839 | ミトコンドリア糖尿病・難聴（みとこんどりあとうにょうびょうなんちょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 844 | 複合体III欠損症（ふくごうたいさんけっそんしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 845 | 複合体IV欠損症（SCO2型）（ふくごうたいよんけっそんしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 846 | ミトコンドリア翻訳異常症（みとこんどりあほんやくいじょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 848 | 遺伝性マンガン輸送異常症（いでんせいまんがんゆそういじょうしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 851 | トランスコバラミン欠損症（とらんすこばらみんけっそんしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 852 | 遺伝性ピリドキシン依存性てんかん（いでんせいぴりどきしんいぞんせいてんかん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 855 | 先天性グルタミン合成酵素欠損症（せんてんせいぐるたみんごうせいこうそけっそんしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 858 | 常染色体優性低カルシウム血症（じょうせんしょくたいゆうせいていかるしうむけっしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 869 | 先天性筋緊張性ジストロフィー（せんてんせいきんきんちょうせいじすとろふぃー） | 3 出典とも手がかりなし | orpha_code が無い |
| 870 | 核膜病（LMNA関連拡張型心筋症）（かくまくびょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 882 | BAG3関連筋原線維性ミオパチー（びーえーじーすりーかんれんきんげんせんいせいみおぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 885 | 壊死性ミオパチー（抗SRP抗体型）（えしせいみおぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 886 | 壊死性ミオパチー（抗HMGCR抗体型）（えしせいみおぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 887 | 抗MDA5抗体陽性皮膚筋炎（こうえむでぃーえーふぁいぶこうたいようせいひふきんえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 888 | 抗TIF1γ抗体陽性皮膚筋炎（こうてぃーあいえふわんがんまこうたいようせいひふきんえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 889 | 抗Mi-2抗体陽性皮膚筋炎（こうえむあいつーこうたいようせいひふきんえん） | 3 出典とも手がかりなし | orpha_code が無い |
| 898 | 遺伝性ニューロパチー(NEFL型)（いでんせいにゅーろぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 901 | Ross症候群（ろすしょうこうぐん） | 3 出典とも手がかりなし | orpha_code が無い |
| 902 | 特発性自律神経ニューロパチー（とくはつせいじりつしんけいにゅーろぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 904 | 遺伝性アミロイドニューロパチー（V30M以外）（いでんせいあみろいどにゅーろぱちー） | 3 出典とも手がかりなし | orpha_code が無い |
| 908 | AGelアミロイドーシス（えーげるあみろいどーしす） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 909 | ALect2アミロイドーシス（えーえるいーしーてぃーつーあみろいどーしす） | 3 出典とも手がかりなし | orpha_code が無い |
| 917 | 先天性胆汁酸合成異常症(Δ4-3-oxosteroid型)（せんてんせいたんじゅうさんごうせいいじょうしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 923 | 先天性気管気管支軟化症（せんてんせいきかんきかんしなんかしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 924 | 先天性喉頭軟化症（せんてんせいこうとうなんかしょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 929 | 三角頭蓋（前頭縫合早期癒合）（さんかくとうがい） | 3 出典とも手がかりなし | orpha_code が無い |
| 932 | 先天性鼻涙管閉塞（せんてんせいびるいかんへいそく） | 3 出典とも手がかりなし | orpha_code が無い |
| 934 | 微小眼球症（びしょうがんきゅうしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 935 | 先天性白内障（せんてんせいはくないしょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 941 | 遺伝性難聴(GJB2型)（いでんせいなんちょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 942 | 遺伝性難聴(MYO15A型)（いでんせいなんちょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 943 | 遺伝性難聴(SLC26A4型-非症候群性)（いでんせいなんちょう） | 3 出典とも手がかりなし | orpha_code が無い |
| 948 | 遺伝性難聴(OTOF型)（いでんせいなんちょう） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 949 | COACH症候群（こーちしょうこうぐん） | 3 出典とも手がかりなし | 病名が重ならない（コードの取り違えの疑い。リンク対象外） |
| 81 | 全身型重症筋無力症（ぜんしんがたじゅうしょうきんむりょくしょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 115 | 原発性アルドステロン症（げんぱつせいあるどすてろんしょう） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 159 | ウィルソン病型肝障害（うぃるそんびょうがたかんしょうがい） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 169 | 心サルコイドーシス（しんさるこいどーしす） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 180 | 全身性エリテマトーデス皮膚型（ぜんしんせいえりてまとーですひふがた） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 254 | 腸管ベーチェット病（ちょうかんべーちぇっとびょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 264 | もやもや病（小児型）（もやもやびょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 270 | もやもや病関連脳出血（もやもやびょうかんれんのうしゅっけつ） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 290 | 原発性胆汁性胆管炎重症型（げんぱつせいたんじゅうせいたんかんえんじゅうしょうがた） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 306 | 原発性アルドステロン症（両側型）（げんぱつせいあるどすてろんしょう） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 310 | メープルシロップ尿症（間欠型）（めーぷるしろっぷにょうしょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 357 | 多系統萎縮症C型（たけいとういしゅくしょうしーがた） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 358 | 多系統萎縮症P型（たけいとういしゅくしょうぴーがた） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 360 | 特発性拡張型心筋症（小児）（とくはつせいかくちょうがたしんきんしょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 397 | 拡張型心筋症関連伝導障害（かくちょうがたしんきんしょうかんれんでんどうしょうがい） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 547 | 先天性中枢性低換気症候群（非ポリアラニン型）（せんてんせいちゅうすうせいていかんきしょうこうぐん） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 564 | X連鎖性副腎白質ジストロフィー（小児脳型）（えっくすれんさせいふくじんはくしつじすとろふぃー） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 609 | 膀胱尿管逆流症（先天性高度）（ぼうこうにょうかんぎゃくりゅうしょう） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 633 | 神経サルコイドーシス（しんけいさるこいどーしす） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 692 | 遺伝性ジストニア（DYT1）（いでんせいじすとにあ） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 714 | IgA腎症（重症進行型）（あいじーえいじんしょう） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 811 | ヌーナン症候群様疾患(CBL変異)（ぬーなんしょうこうぐんようしっかん） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 837 | ミトコンドリアDNA枯渇症候群（肝脳型）（みとこんどりあでぃえぬえーこかつしょうこうぐん） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 871 | LMNA関連肢帯型筋ジストロフィー（えるえむえぬえーかんれんしたいがたきんじすとろふぃー） | その他（要確認） | 難病 none ／ 小慢 group ／ Orphanet none |
| 891 | 先天性筋無力症候群（CHAT型）（せんてんせいきんむりょくしょうこうぐん） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 892 | 先天性筋無力症候群（COLQ型）（せんてんせいきんむりょくしょうこうぐん） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 893 | 先天性筋無力症候群（Rapsyn型）（せんてんせいきんむりょくしょうこうぐん） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 894 | 先天性筋無力症候群（SYT2型）（せんてんせいきんむりょくしょうこうぐん） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 895 | 先天性筋無力症候群（GFPT1型）（せんてんせいきんむりょくしょうこうぐん） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 920 | 先天性横隔膜ヘルニア（Morgagni型）（せんてんせいおうかくまくへるにあ） | その他（要確認） | 難病 group ／ 小慢 group ／ Orphanet none |
| 936 | 網膜色素変性症(X連鎖性)（もうまくしきそへんせいしょう） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
| 937 | 網膜色素変性症(常染色体劣性RHO以外)（もうまくしきそへんせいしょう） | その他（要確認） | 難病 group ／ 小慢 none ／ Orphanet none |
