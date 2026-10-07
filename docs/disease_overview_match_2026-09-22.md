# 疾患概要プロジェクト フェーズ0：出典照合表

生成日 2026-09-22。生成: `scripts/portal/build_match_table.py` → `scripts/portal/write_match_report.py`

> ## ★ この表の判定列は、すべて機械生成です。人が確認したものではありません。
>
> 「完全一致」も含め、正しさは保証されません。**要確認**の行に ○ / × を付けてください。
> 推測での紐付けはしていません。少しでも確信が持てないものは、すべて **要確認** に落としてあります。

判定の意味:

| 判定 | 意味 |
|---|---|
| 完全一致 | 正規化（記号・空白落とし、全角半角そろえ）のあとで病名が同一。または readings.json の既知一致で確定 |
| **要確認** | 括弧の中身を落とせば一致 / 別名が一致 / 包含 / 字が近い / 既知一致と食い違い / 候補が複数。**URL は入れていません** |
| なし | どの手がかりでも当たらなかった |

## 1. 件数

| 出典 | 完全一致 | 要確認（部分一致） | なし |
|---|---:|---:|---:|
| 難病情報センター | 163 | 108 | 680 |
| 小児慢性特定疾病情報センター | 212 | 187 | 552 |
| Orphanet | 547 | 170 | 234 |

- 対象疾患: **951 件**
- 3 出典とも「なし」: **123 件**
- 1 つ以上「要確認」を含む行（下の §3 の表）: **394 件**

## 2. 取得元（索引ページ）

取得は直列、1 秒に 1 回。生 HTML は `.cache/disease_sources/`（リポジトリには入れない）。

| 索引 | URL | 取得日時 (JST) | bytes | 本文 SHA-256 |
|---|---|---|---:|---|
| 告示番号順索引 1〜50 | https://www.nanbyou.or.jp/entry/5346 | 2026-09-22T12:11:42+09:00 | 167741 | `3211b238981c4cc9b2bc7a1bbdbc33446a1abb3b9d0ab808a55c62bacddb9794` |
| 告示番号順索引 51〜100 | https://www.nanbyou.or.jp/entry/5473 | 2026-09-22T12:11:43+09:00 | 163823 | `0206393b65f237db18d050dc742c6ff0370a8756ee7eb981abdd1e67afb04c2c` |
| 告示番号順索引 101〜150 | https://www.nanbyou.or.jp/entry/5474 | 2026-09-22T12:11:44+09:00 | 157251 | `e2ae5848d02cbe050070bd41a7066d2e0062e0dc9840da2ab52b157005dda9a4` |
| 告示番号順索引 151〜200 | https://www.nanbyou.or.jp/entry/5475 | 2026-09-22T12:11:45+09:00 | 167840 | `296d0fddd29c8de80aa58ba7828b0fe162610ad639ca4567ea39eb5875da583f` |
| 告示番号順索引 201〜250 | https://www.nanbyou.or.jp/entry/5476 | 2026-09-22T12:11:47+09:00 | 157192 | `51d8c22da951b3df4e6382c05509c18094f2d0c29becdf49bbce50182e59e82f` |
| 告示番号順索引 251〜300 | https://www.nanbyou.or.jp/entry/5477 | 2026-09-22T12:11:48+09:00 | 173381 | `568aa80e0b7938e192fee18ee1c783abae73b90a85b19b9c73d934d6b8b16628` |
| 告示番号順索引 301〜348 | https://www.nanbyou.or.jp/entry/5478 | 2026-09-22T12:11:49+09:00 | 146298 | `414d2138fa575a50166ba0d3fb414e3079ac7c0dfef3d3a2162b617619b4d53f` |
| 疾患群 悪性新生物 | https://www.shouman.jp/disease/search/group/list/01/%E6%82%AA%E6%80%A7%E6%96%B0%E7%94%9F%E7%89%A9 | 2026-09-22T12:12:22+09:00 | 79454 | `391cfda1b5492358391ab3bbc08c713c883dcdc3cdb3ada7909559bc4f3636d9` |
| 疾患群 慢性腎疾患 | https://www.shouman.jp/disease/search/group/list/02/%E6%85%A2%E6%80%A7%E8%85%8E%E7%96%BE%E6%82%A3 | 2026-09-22T12:12:50+09:00 | 55153 | `6ea42500acc446c8fbcd44a76aa62d0f44d9ca3519b79fcb33cda353a35d636b` |
| 疾患群 慢性呼吸器疾患 | https://www.shouman.jp/disease/search/group/list/03/%E6%85%A2%E6%80%A7%E5%91%BC%E5%90%B8%E5%99%A8%E7%96%BE%E6%82%A3 | 2026-09-22T12:12:51+09:00 | 27539 | `00607aed7a2b8bed0f023174ba1d03b3c1d7a46e881c32ca57a955e92646023c` |
| 疾患群 慢性心疾患 | https://www.shouman.jp/disease/search/group/list/04/%E6%85%A2%E6%80%A7%E5%BF%83%E7%96%BE%E6%82%A3 | 2026-09-22T12:12:52+09:00 | 95199 | `7f7bb5b9d51bd68139203d072b16497e197d89cb8ddff454f72f409a9ff645c2` |
| 疾患群 内分泌疾患 | https://www.shouman.jp/disease/search/group/list/05/%E5%86%85%E5%88%86%E6%B3%8C%E7%96%BE%E6%82%A3 | 2026-09-22T12:12:53+09:00 | 88179 | `2b595f5cb571ffcf05452e222fc7f3013e04863e22c6860961fd514dfbfc88b1` |
| 疾患群 膠原病 | https://www.shouman.jp/disease/search/group/list/06/%E8%86%A0%E5%8E%9F%E7%97%85 | 2026-09-22T12:12:54+09:00 | 34001 | `b8ecfc31a247ae365b98da749acfb4231e17d3ddfc1091640a515de5eccba976` |
| 疾患群 糖尿病 | https://www.shouman.jp/disease/search/group/list/07/%E7%B3%96%E5%B0%BF%E7%97%85 | 2026-09-22T12:12:55+09:00 | 20642 | `23e9bc49e1ad5d9b8fc9de4c83e57364f2928f6d891d7f122ce524f057de2d3c` |
| 疾患群 先天性代謝異常 | https://www.shouman.jp/disease/search/group/list/08/%E5%85%88%E5%A4%A9%E6%80%A7%E4%BB%A3%E8%AC%9D%E7%95%B0%E5%B8%B8 | 2026-09-22T12:12:58+09:00 | 115166 | `400689ca26614b35010ef90a35104e57c44f5b340a79878e60f7f6a26435c5bd` |
| 疾患群 血液疾患 | https://www.shouman.jp/disease/search/group/list/09/%E8%A1%80%E6%B6%B2%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:02+09:00 | 56553 | `d0b61936567ccafb116cdc92a42642ce708ec8a9423421d376cc7f2eb72fb32d` |
| 疾患群 免疫疾患 | https://www.shouman.jp/disease/search/group/list/10/%E5%85%8D%E7%96%AB%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:03+09:00 | 56875 | `22dc6185c025cf5e8fba58193d8b7471a5a78d6b4170fdf8dc8f0e49880ed110` |
| 疾患群 神経・筋疾患 | https://www.shouman.jp/disease/search/group/list/11/%E7%A5%9E%E7%B5%8C%E3%83%BB%E7%AD%8B%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:09+09:00 | 96735 | `f34802b360652fe6f03b179814bbe68f528a170c4ccd907083711a31d17b1b2f` |
| 疾患群 慢性消化器疾患 | https://www.shouman.jp/disease/search/group/list/12/%E6%85%A2%E6%80%A7%E6%B6%88%E5%8C%96%E5%99%A8%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:10+09:00 | 49857 | `5eadfd4800c04d5bf0e544fc12a85b06ac28d69aa45d32d94610ccf0ac8784a4` |
| 疾患群 染色体又は遺伝子に変化を伴う症候群 | https://www.shouman.jp/disease/search/group/list/13/%E6%9F%93%E8%89%B2%E4%BD%93%E5%8F%88%E3%81%AF%E9%81%BA%E4%BC%9D%E5%AD%90%E3%81%AB%E5%A4%89%E5%8C%96%E3%82%92%E4%BC%B4%E3%81%86%E7%97%87%E5%80%99%E7%BE%A4 | 2026-09-22T12:13:13+09:00 | 44503 | `10feb0dbcf6017cc753612b3ddd288b8871825732ba409238c5ea104996893ae` |
| 疾患群 皮膚疾患群 | https://www.shouman.jp/disease/search/group/list/14/%E7%9A%AE%E8%86%9A%E7%96%BE%E6%82%A3%E7%BE%A4 | 2026-09-22T12:13:16+09:00 | 29859 | `4ed66bfd090f33bb663bc4be3abec5294c0281ab62015e9961cc8dbe95e9e66e` |
| 疾患群 骨系統疾患 | https://www.shouman.jp/disease/search/group/list/15/%E9%AA%A8%E7%B3%BB%E7%B5%B1%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:17+09:00 | 27749 | `de09160da5cb58ba8dca659bed6a423437ef02534b97bb2275ed6a868de7298a` |
| 疾患群 脈管系疾患 | https://www.shouman.jp/disease/search/group/list/16/%E8%84%88%E7%AE%A1%E7%B3%BB%E7%96%BE%E6%82%A3 | 2026-09-22T12:13:18+09:00 | 22528 | `4ff2fcce5786f5f659413f9461c71a5f2b268b6a055af3b8327f4cf9c06cff65` |
| 疾患群別一覧の入口 | https://www.shouman.jp/disease/search/group/ | 2026-09-22T12:12:02+09:00 | 71760 | `048f0310a51ec13c8a6560ed9ef3b6b502403756dbc5adb63296f28c6357bfac` |
| Orphanet 命名法（取得せずローカル原本） | data/orphanet/en_product1.xml | 版 2026-06-23 | — | `data/orphanet/SOURCE.md` を参照 |

- 難病情報センターの索引から拾えた指定難病: **348 件**
- 小児慢性の索引（16 疾患群）から拾えた個別ページ: **858 件**

## 3. 【要確認】判定が「要確認」を含む行

**394 件。ここだけ見て ○ / × を付けてください。** 候補の病名はリンクになっています。

Orphanet の URL は、形式の確認待ちのため組み立てていません（ORPHA コードのみ）。

| idx | 病名 | ふりがな | 難病情報センター | 小児慢性 | Orphanet | 取得（日時・本文SHA-256先頭） | 備考 |
|---:|---|---|---|---|---|---|---|
| 5 | ニーマン・ピック病C型 | にーまんぴっくびょうしーがた | なし | [ニーマン・ピック（Niemann-Pick）病](https://www.shouman.jp/disease/details/08_06_089/)<br>**要確認**（包含（候補 1 件）） | ORPHA:646<br>Niemann-Pick disease type C<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 7 | 遺伝性血管浮腫 | いでんせいけっかんふしゅ | なし | [遺伝性血管性浮腫（C1インヒビター欠損症）](https://www.shouman.jp/disease/details/10_07_050/)<br>**要確認**（字が近い（最大 0.93。もっとも弱い根拠）） | ORPHA:91378<br>Hereditary angioedema<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 9 | デュシェンヌ型筋ジストロフィー | でゅしぇんぬがたきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | [デュシェンヌ（Duchenne）型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_047/)<br>完全一致 | ORPHA:98896<br>Duchenne muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 11 | 原発性高シュウ酸尿症1型 | げんぱつせいこうしゅうさんにょうしょういちがた | なし | [原発性高シュウ酸尿症](https://www.shouman.jp/disease/details/08_02_035/)<br>**要確認**（包含（候補 1 件）） | ORPHA:93598<br>Primary hyperoxaluria type 1<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 12 | フェニルケトン尿症 | ふぇにるけとんにょうしょう | [告示 240 フェニルケトン尿症](https://www.nanbyou.or.jp/entry/4747)<br>完全一致 | [フェニルケトン尿症（高フェニルアラニン血症）](https://www.shouman.jp/disease/details/08_01_001/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:716<br>Phenylketonuria<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 20 | 原発性免疫不全症 | げんぱつせいめんえきふぜんしょう | [告示 65 原発性免疫不全症候群](https://www.nanbyou.or.jp/entry/95)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:101997<br>Primary immunodeficiency<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 26 | ハンチントン病 | はんちんとんびょう | [告示 8 ハンチントン病](https://www.nanbyou.or.jp/entry/175)<br>完全一致 | なし | ORPHA:399<br>Huntington disease<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c` |  |
| 27 | ウィルソン病 | うぃるそんびょう | [告示 171 ウィルソン病](https://www.nanbyou.or.jp/entry/4543)<br>完全一致 | [ウィルソン（Wilson）病](https://www.shouman.jp/disease/details/08_08_107/)<br>完全一致 | ORPHA:905<br>Wilson disease<br>**要確認** | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 29 | 関節リウマチ | かんせつりうまち | [告示 46 悪性関節リウマチ](https://www.nanbyou.or.jp/entry/43)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 30 | 多発性硬化症 | たはつせいこうかしょう | [告示 13 多発性硬化症／視神経脊髄炎](https://www.nanbyou.or.jp/entry/3806)<br>**要確認**（包含（候補 1 件）） | [多発性硬化症](https://www.shouman.jp/disease/details/11_42_103/)<br>完全一致 | ORPHA:802<br>NON RARE IN EUROPE: Multiple sclerosis<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 33 | ベーチェット病 | べーちぇっとびょう | [告示 56 ベーチェット病](https://www.nanbyou.or.jp/entry/187)<br>完全一致 | [ベーチェット（Behçet）病](https://www.shouman.jp/disease/details/06_01_006/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:117<br>Behçet disease<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 42 | 再生不良性貧血 | さいせいふりょうせいひんけつ | [告示 60 再生不良性貧血](https://www.nanbyou.or.jp/entry/106)<br>完全一致 | [再生不良性貧血](https://www.shouman.jp/disease/details/09_26_052/)<br>完全一致 | ORPHA:182040<br>Rare aplastic anemia<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 44 | 全身性アミロイドーシス | ぜんしんせいあみろいどーしす | [告示 28 全身性アミロイドーシス](https://www.nanbyou.or.jp/entry/45)<br>完全一致 | なし | ORPHA:69<br>Amyloidosis<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c` |  |
| 45 | マルファン症候群 | まるふぁんしょうこうぐん | なし | [マルファン（Marfan）症候群](https://www.shouman.jp/disease/details/13_01_017/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:558<br>Marfan syndrome<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 46 | エーラス・ダンロス症候群 | えーらすだんろすしょうこうぐん | [告示 168 エーラス・ダンロス症候群](https://www.nanbyou.or.jp/entry/4801)<br>完全一致 | [エーラス・ダンロス（Ehlers-Danlos）症候群](https://www.shouman.jp/disease/details/08_13_135/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:98249<br>Ehlers-Danlos syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 47 | ターナー症候群 | たーなーしょうこうぐん | なし | [ターナー（Turner）症候群](https://www.shouman.jp/disease/details/05_41_088/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:881<br>Turner syndrome<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 48 | クラインフェルター症候群 | くらいんふぇるたーしょうこうぐん | なし | なし | ORPHA:484<br>NON RARE IN EUROPE: Klinefelter syndrome<br>**要確認** |  |  |
| 49 | プラダー・ウィリー症候群 | ぷらだーうぃりーしょうこうぐん | [告示 193 プラダー・ウィリ症候群](https://www.nanbyou.or.jp/entry/4768)<br>**要確認**（字が近い（最大 0.95。もっとも弱い根拠）） | [プラダー・ウィリ（Prader-Willi）症候群](https://www.shouman.jp/disease/details/05_41_089/)<br>**要確認**（字が近い（最大 0.95。もっとも弱い根拠）） | ORPHA:739<br>Prader-Willi syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 50 | ダウン症候群 | だうんしょうこうぐん | なし | [ダウン（Down）症候群](https://www.shouman.jp/disease/details/13_01_014/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:870<br>Down syndrome<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 52 | 神経線維腫症1型 | しんけいせんいしゅしょういちがた | [告示 34 神経線維腫症](https://www.nanbyou.or.jp/entry/5361)<br>**要確認**（包含（候補 1 件）） | [レックリングハウゼン（Recklinghausen）病（神経線維腫症Ⅰ型）](https://www.shouman.jp/disease/details/14_06_011/)<br>完全一致 | ORPHA:636<br>Neurofibromatosis type 1<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 53 | 常染色体優性多発性嚢胞腎 | じょうせんしょくたいゆうせいたはつせいのうほうじん | [告示 67 多発性嚢胞腎](https://www.nanbyou.or.jp/entry/146)<br>**要確認**（別名「多発性嚢胞腎」が一致） | [多発性嚢胞腎](https://www.shouman.jp/disease/details/02_17_038/)<br>**要確認**（別名「多発性嚢胞腎」が一致） | ORPHA:730<br>Autosomal dominant polycystic kidney disease<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 63 | クローン病 | くろーんびょう | [告示 96 クローン病](https://www.nanbyou.or.jp/entry/81)<br>完全一致 | [クローン（Crohn）病](https://www.shouman.jp/disease/details/12_04_015/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:206<br>NON RARE IN EUROPE: Crohn disease<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 64 | 潰瘍性大腸炎 | かいようせいだいちょうえん | [告示 97 潰瘍性大腸炎](https://www.nanbyou.or.jp/entry/62)<br>完全一致 | [潰瘍性大腸炎](https://www.shouman.jp/disease/details/12_04_014/)<br>完全一致 | ORPHA:771<br>NON RARE IN EUROPE: Ulcerative colitis<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 71 | 表皮水疱症 | ひょうひすいほうしょう | [告示 36 表皮水疱症](https://www.nanbyou.or.jp/entry/5338)<br>完全一致 | [表皮水疱症](https://www.shouman.jp/disease/details/14_03_008/)<br>完全一致 | ORPHA:304<br>Epidermolysis bullosa simplex<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 73 | 脊髄小脳変性症 | せきずいしょうのうへんせいしょう | [告示 18 ） 脊髄小脳変性症(多系統萎縮症を除く。)](https://www.nanbyou.or.jp/entry/4879)<br>**要確認**（包含（候補 1 件）） | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>完全一致 | ORPHA:94145<br>Autosomal dominant cerebellar ataxia type I<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 77 | てんかん | てんかん | なし | [点頭てんかん（ウエスト（West）症候群）](https://www.shouman.jp/disease/details/11_26_067/)<br>**要確認**（包含（候補 1 件）） | ORPHA:166463<br>Epilepsy syndrome<br>**要確認** | 小 2026-09-22T12:13 `f34802b36065` |  |
| 78 | 慢性炎症性脱髄性多発神経炎 | まんせいえんしょうせいだつずいせいたはつしんけいえん | [告示 14 慢性炎症性脱髄性多発神経炎／多巣性運動ニューロパチー](https://www.nanbyou.or.jp/entry/4089)<br>**要確認**（包含（候補 1 件）） | [慢性炎症性脱髄性多発神経炎](https://www.shouman.jp/disease/details/11_43_104/)<br>完全一致 | ORPHA:2932<br>Chronic inflammatory demyelinating polyneuropathy<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 80 | 視神経脊髄炎 | ししんけいせきずいえん | [告示 13 多発性硬化症／視神経脊髄炎](https://www.nanbyou.or.jp/entry/3806)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:71211<br>Neuromyelitis optica spectrum disorder<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 81 | 全身型重症筋無力症 | ぜんしんがたじゅうしょうきんむりょくしょう | [告示 11 重症筋無力症](https://www.nanbyou.or.jp/entry/120)<br>**要確認**（包含（候補 1 件）） | [重症筋無力症](https://www.shouman.jp/disease/details/11_44_105/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 83 | 特発性拡張型心筋症 | とくはつせいかくちょうがたしんきんしょう | [告示 57 特発性拡張型心筋症](https://www.nanbyou.or.jp/entry/3985)<br>完全一致 | [拡張型心筋症](https://www.shouman.jp/disease/details/04_15_019/)<br>**要確認**（包含（候補 1 件）） | ORPHA:217604<br>Dilated cardiomyopathy<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 84 | 肥大型心筋症 | ひだいがたしんきんしょう | [告示 58 肥大型心筋症](https://www.nanbyou.or.jp/entry/177)<br>完全一致 | [肥大型心筋症](https://www.shouman.jp/disease/details/04_12_016/)<br>完全一致 | ORPHA:217569<br>Rare hypertrophic cardiomyopathy<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 86 | 大動脈炎症候群 | だいどうみゃくえんしょうこうぐん | [告示 40 高安動脈炎](https://www.nanbyou.or.jp/entry/141)<br>**要確認**（別名「高安動脈炎」が一致） | [高安動脈炎（大動脈炎症候群）](https://www.shouman.jp/disease/details/06_02_007/)<br>完全一致 | ORPHA:3287<br>Takayasu arteritis<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 92 | アラジール症候群 | あらじーるしょうこうぐん | [告示 297 アラジール症候群](https://www.nanbyou.or.jp/entry/4844)<br>完全一致 | [アラジール（Alagille）症候群](https://www.shouman.jp/disease/details/12_08_024/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:52<br>Alagille syndrome<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 95 | 自己免疫性溶血性貧血 | じこめんえきせいようけつせいひんけつ | [告示 61 自己免疫性溶血性貧血](https://www.nanbyou.or.jp/entry/114)<br>完全一致 | [溶血性貧血（脾機能亢進症によるものに限る。）](https://www.shouman.jp/disease/details/09_09_019/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98375<br>Autoimmune hemolytic anemia<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 96 | 特発性門脈圧亢進症 | とくはつせいもんみゃくあつこうしんしょう | [告示 92 特発性門脈圧亢進症](https://www.nanbyou.or.jp/entry/162)<br>完全一致 | [門脈圧亢進症（バンチ（Banti）症候群を含む。）](https://www.shouman.jp/disease/details/12_10_031/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 97 | 成人スチル病 | せいじんすちるびょう | [告示 54 成人発症スチル病](https://www.nanbyou.or.jp/entry/132)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | なし | ORPHA:829<br>Adult-onset Still disease<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 102 | 天疱瘡 | てんぽうそう | [告示 35 天疱瘡](https://www.nanbyou.or.jp/entry/153)<br>完全一致 | なし | ORPHA:704<br>Pemphigus vulgaris<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c` |  |
| 103 | 類天疱瘡 | るいてんぽうそう | [告示 162 ） 類天疱瘡（後天性表皮水疱症を含む。）](https://www.nanbyou.or.jp/entry/4525)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:703<br>Bullous pemphigoid<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 106 | リンパ脈管筋腫症 | りんぱみゃっかんきんしゅしょう | [告示 89 リンパ脈管筋腫症](https://www.nanbyou.or.jp/entry/173)<br>完全一致 | [リンパ管腫症](https://www.shouman.jp/disease/details/16_01_007/)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | ORPHA:538<br>Lymphangioleiomyomatosis<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `4ff2fcce5786` |  |
| 107 | 肺胞蛋白症 | はいほうたんぱくしょう | [告示 229 ） 肺胞蛋白症（自己免疫性又は先天性）](https://www.nanbyou.or.jp/entry/4774)<br>**要確認**（包含（候補 1 件）） | [先天性肺胞蛋白症（遺伝子異常が原因の間質性肺疾患を含む。）](https://www.shouman.jp/disease/details/03_04_005/)<br>**要確認**（包含（候補 1 件）） | ORPHA:747<br>Autoimmune pulmonary alveolar proteinosis<br>**要確認** | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 111 | ネフローゼ症候群 | ねふろーぜしょうこうぐん | [告示 222 一次性ネフローゼ症候群](https://www.nanbyou.or.jp/entry/4516)<br>**要確認**（包含（候補 1 件）） | [微小変化型ネフローゼ症候群](https://www.shouman.jp/disease/details/02_01_003/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 112 | 急速進行性糸球体腎炎 | きゅうそくしんこうせいしきゅうたいじんえん | [告示 220 急速進行性糸球体腎炎](https://www.nanbyou.or.jp/entry/74)<br>完全一致 | [急速進行性糸球体腎炎（顕微鏡的多発血管炎によるものに限る。）](https://www.shouman.jp/disease/details/02_02_016/)<br>[急速進行性糸球体腎炎（多発血管炎性肉芽腫症によるものに限る。）](https://www.shouman.jp/disease/details/02_02_017/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 113 | バセドウ病 | ばせどうびょう | なし | [バセドウ（Basedow）病](https://www.shouman.jp/disease/details/05_10_015/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 114 | 褐色細胞腫 | かっしょくさいぼうしゅ | なし | [褐色細胞腫](https://www.shouman.jp/disease/details/01_05_064/)<br>完全一致 | ORPHA:29072<br>Hereditary pheochromocytoma-paraganglioma<br>**要確認** | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 115 | 原発性アルドステロン症 | げんぱつせいあるどすてろんしょう | なし | [アルドステロン症](https://www.shouman.jp/disease/details/05_20_043/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 116 | クッシング症候群 | くっしんぐしょうこうぐん | なし | なし | ORPHA:641613<br>Endogenous Cushing syndrome<br>**要確認** |  |  |
| 120 | ベッカー型筋ジストロフィー | べっかーがたきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:98895<br>Becker muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 121 | 福山型先天性筋ジストロフィー | ふくやまがたせんてんせいきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | [福山型先天性筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_051/)<br>完全一致 | ORPHA:272<br>Congenital muscular dystrophy, Fukuyama type<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 125 | 原発性マクログロブリン血症 | げんぱつせいまくろぐろぶりんけっしょう | なし | なし | ORPHA:33226<br>Waldenström macroglobulinemia<br>**要確認** |  |  |
| 128 | 原発性骨髄線維症 | げんぱつせいこつずいせんいしょう | なし | [骨髄線維症](https://www.shouman.jp/disease/details/09_25_051/)<br>**要確認**（包含（候補 1 件）） | ORPHA:824<br>Primary myelofibrosis<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 130 | 球脊髄性筋萎縮症 | きゅうせきずいせいきんいしゅくしょう | [告示 1 球脊髄性筋萎縮症](https://www.nanbyou.or.jp/entry/73)<br>完全一致 | [脊髄性筋萎縮症](https://www.shouman.jp/disease/details/11_19_044/)<br>**要確認**（包含（候補 1 件）） | ORPHA:481<br>Kennedy disease<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 133 | シェーグレン症候群 | しぇーぐれんしょうこうぐん | [告示 53 シェーグレン症候群](https://www.nanbyou.or.jp/entry/111)<br>完全一致 | [シェーグレン（Sjögren）症候群](https://www.shouman.jp/disease/details/06_01_004/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:289390<br>Primary Sjögren disease<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 135 | 抗リン脂質抗体症候群 | こうりんししつこうたいしょうこうぐん | [告示 48 原発性抗リン脂質抗体症候群](https://www.nanbyou.or.jp/entry/4101)<br>**要確認**（包含（候補 1 件）） | [抗リン脂質抗体症候群](https://www.shouman.jp/disease/details/06_01_005/)<br>完全一致 | ORPHA:80<br>Antiphospholipid syndrome<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 136 | 副甲状腺機能低下症 | ふくこうじょうせんきのうていかしょう | [告示 235 副甲状腺機能低下症](https://www.nanbyou.or.jp/entry/4426)<br>完全一致 | [副甲状腺機能低下症（副甲状腺欠損症を除く。）](https://www.shouman.jp/disease/details/05_15_028/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 138 | アジソン病 | あじそんびょう | [告示 83 アジソン病](https://www.nanbyou.or.jp/entry/44)<br>完全一致 | なし | ORPHA:85138<br>Addison disease<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 145 | 特発性肺動脈性肺高血圧症 | とくはつせいはいどうみゃくせいはいこうけつあつしょう | [告示 86 肺動脈性肺高血圧症](https://www.nanbyou.or.jp/entry/171)<br>**要確認**（包含（候補 1 件）） | [肺動脈性肺高血圧症](https://www.shouman.jp/disease/details/04_61_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:275766<br>Idiopathic pulmonary arterial hypertension<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 148 | 分類不能型免疫不全症 | ぶんるいふのうがためんえきふぜんしょう | なし | [分類不能型免疫不全症](https://www.shouman.jp/disease/details/10_03_024/)<br>完全一致 | ORPHA:1572<br>OBSOLETE: Common variable immunodeficiency<br>**要確認** | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 158 | シャルコー・マリー・トゥース病 | しゃるこーまりーとぅーすびょう | [告示 10 シャルコー・マリー・トゥース病](https://www.nanbyou.or.jp/entry/3773)<br>完全一致 | なし | ORPHA:166<br>Charcot-Marie-Tooth disease/Hereditary motor and sensory neuropathy<br>**要確認** | 難 2026-09-22T12:11 `3211b238981c` |  |
| 159 | ウィルソン病型肝障害 | うぃるそんびょうがたかんしょうがい | [告示 171 ウィルソン病](https://www.nanbyou.or.jp/entry/4543)<br>**要確認**（包含（候補 1 件）） | [ウィルソン（Wilson）病](https://www.shouman.jp/disease/details/08_08_107/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 164 | レノックス・ガストー症候群 | れのっくすがすとーしょうこうぐん | [告示 144 レノックス・ガストー症候群](https://www.nanbyou.or.jp/entry/4889)<br>完全一致 | [レノックス・ガストー（Lennox-Gastaut）症候群](https://www.shouman.jp/disease/details/11_26_068/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:2382<br>Lennox-Gastaut syndrome<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 165 | ドラベ症候群 | どらべしょうこうぐん | [告示 140 ドラベ症候群](https://www.nanbyou.or.jp/entry/4744)<br>完全一致 | [乳児重症ミオクロニーてんかん](https://www.shouman.jp/disease/details/11_26_066/)<br>**要確認**（別名「乳児重症ミオクロニーてんかん」が一致） | ORPHA:33069<br>Dravet syndrome<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 166 | ウエスト症候群 | うえすとしょうこうぐん | [告示 145 ウエスト症候群](https://www.nanbyou.or.jp/entry/4414)<br>完全一致 | [点頭てんかん（ウエスト（West）症候群）](https://www.shouman.jp/disease/details/11_26_067/)<br>**要確認**（別名「点頭てんかん」が括弧を落とせば一致） | ORPHA:697160<br>Infantile epileptic spasms syndrome<br>**要確認** | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 167 | スタージ・ウェーバー症候群 | すたーじうぇーばーしょうこうぐん | [告示 157 スタージ・ウェーバー症候群](https://www.nanbyou.or.jp/entry/4307)<br>完全一致 | [スタージ・ウェーバー（Sturge-Weber）症候群](https://www.shouman.jp/disease/details/11_07_022/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:3205<br>Sturge-Weber syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 169 | 心サルコイドーシス | しんさるこいどーしす | [告示 84 サルコイドーシス](https://www.nanbyou.or.jp/entry/110)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 171 | 線維性骨異形成症 | せんいせいこついけいせいしょう | なし | なし | ORPHA:249<br>Fibrous dysplasia of bone<br>**要確認** |  |  |
| 173 | TNF受容体関連周期性症候群 | てぃーえぬえふじゅようたいかんれんしゅうきせいしょうこうぐん | [告示 108 ＴＮＦ受容体関連周期性症候群](https://www.nanbyou.or.jp/entry/4033)<br>完全一致 | [TNF受容体関連周期性症候群](https://www.shouman.jp/disease/details/06_05_017/)<br>完全一致 | ORPHA:32960<br>Tumor necrosis factor receptor 1 associated periodic syndrome<br>**要確認** | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 175 | 高IgD症候群 | こうあいじーでぃーしょうこうぐん | [告示 267 高IgD症候群](https://www.nanbyou.or.jp/entry/4750)<br>完全一致 | [高IgD症候群（メバロン酸キナーゼ欠損症）](https://www.shouman.jp/disease/details/06_05_020/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:343<br>Hyperimmunoglobulinemia D with periodic fever<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 180 | 全身性エリテマトーデス皮膚型 | ぜんしんせいえりてまとーですひふがた | [告示 49 全身性エリテマトーデス](https://www.nanbyou.or.jp/entry/53)<br>**要確認**（包含（候補 1 件）） | [全身性エリテマトーデス](https://www.shouman.jp/disease/details/06_01_002/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 181 | ヒルシュスプルング病 | ひるしゅすぷるんぐびょう | [告示 291 ） ヒルシュスプルング病（全結腸型又は小腸型）](https://www.nanbyou.or.jp/entry/4699)<br>**要確認**（包含（候補 1 件）） | [ヒルシュスプルング（Hirschsprung）病](https://www.shouman.jp/disease/details/12_16_040/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:388<br>Hirschsprung disease<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 182 | 胆道閉鎖症 | たんどうへいさしょう | [告示 296 胆道閉鎖症](https://www.nanbyou.or.jp/entry/4735)<br>完全一致 | [胆道閉鎖症](https://www.shouman.jp/disease/details/12_08_023/)<br>完全一致 | ORPHA:30391<br>Isolated biliary atresia<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 184 | 後天性血友病A | こうてんせいけつゆうびょうえー | なし | [血友病Ａ](https://www.shouman.jp/disease/details/09_21_040/)<br>**要確認**（包含（候補 1 件）） | ORPHA:599480<br>Acquired hemophilia A<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 186 | POEMS症候群 | ぽえむすしょうこうぐん | なし | なし | ORPHA:2905<br>POEMS syndrome<br>**要確認** |  |  |
| 187 | キャッスルマン病 | きゃっするまんびょう | [告示 331 特発性多中心性キャッスルマン病](https://www.nanbyou.or.jp/entry/5749)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:160<br>Castleman disease<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 191 | アレキサンダー病 | あれきさんだーびょう | [告示 131 アレキサンダー病](https://www.nanbyou.or.jp/entry/4345)<br>完全一致 | [アレキサンダー（Alexander）病](https://www.shouman.jp/disease/details/11_09_027/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:58<br>Alexander disease<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 194 | ウィリアムズ症候群 | うぃりあむずしょうこうぐん | [告示 179 ウィリアムズ症候群](https://www.nanbyou.or.jp/entry/4765)<br>完全一致 | [ウィリアムズ（Williams）症候群](https://www.shouman.jp/disease/details/04_56_073/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:904<br>Williams syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 195 | アンジェルマン症候群 | あんじぇるまんしょうこうぐん | [告示 201 アンジェルマン症候群](https://www.nanbyou.or.jp/entry/4771)<br>完全一致 | [アンジェルマン（Angelman）症候群](https://www.shouman.jp/disease/details/13_01_009/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:72<br>Angelman syndrome<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 196 | ヌーナン症候群 | ぬーなんしょうこうぐん | [告示 195 ヌーナン症候群](https://www.nanbyou.or.jp/entry/4865)<br>完全一致 | [ヌーナン（Noonan）症候群](https://www.shouman.jp/disease/details/05_41_091/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:648<br>Noonan syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 197 | 自己免疫性膵炎 | じこめんえきせいすいえん | [告示 95 自己免疫性肝炎](https://www.nanbyou.or.jp/entry/113)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | [自己免疫性膵炎](https://www.shouman.jp/disease/details/12_12_036/)<br>完全一致 | ORPHA:103919<br>Autoimmune pancreatitis<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 201 | ミオクロニーてんかん | みおくろにーてんかん | [告示 142 ミオクロニー欠神てんかん](https://www.nanbyou.or.jp/entry/4597)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | [乳児重症ミオクロニーてんかん](https://www.shouman.jp/disease/details/11_26_066/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98261<br>Progressive myoclonic epilepsy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 205 | 汎発性膿疱性乾癬 | はんぱつせいのうほうせいかんせん | なし | [膿疱性乾癬（汎発型）](https://www.shouman.jp/disease/details/14_04_009/)<br>**要確認**（包含（候補 1 件）） | ORPHA:247353<br>Generalized pustular psoriasis<br>完全一致 | 小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 207 | 後縦靭帯骨化症 | こうじゅうじんたいこっかしょう | [告示 69 後縦靱帯骨化症](https://www.nanbyou.or.jp/entry/98)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 208 | 黄色靭帯骨化症 | おうしょくじんたいこっかしょう | [告示 68 黄色靱帯骨化症](https://www.nanbyou.or.jp/entry/58)<br>**要確認**（別名「黄色靱帯骨化症」が一致） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 210 | 一次性膜性増殖性糸球体腎炎 | いちじせいまくせいぞうしょくせいしきゅうたいじんえん | [告示 223 一次性膜性増殖性糸球体腎炎](https://www.nanbyou.or.jp/entry/4423)<br>完全一致 | [膜性増殖性糸球体腎炎](https://www.shouman.jp/disease/details/02_02_010/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 215 | 食道閉鎖症 | しょくどうへいさしょう | なし | [先天性食道閉鎖症](https://www.shouman.jp/disease/details/12_14_038/)<br>**要確認**（別名「先天性食道閉鎖症」が一致） | ORPHA:1199<br>Esophageal atresia<br>完全一致 | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 217 | QT延長症候群 | きゅーてぃーえんちょうしょうこうぐん | なし | [QT延長症候群](https://www.shouman.jp/disease/details/04_11_015/)<br>完全一致 | ORPHA:768<br>Congenital long QT syndrome<br>**要確認** | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 218 | カテコラミン誘発性多形性心室頻拍 | かてこらみんゆうはつせいたけいせいしんしつひんぱく | なし | [カテコラミン誘発多形性心室頻拍](https://www.shouman.jp/disease/details/04_07_010/)<br>**要確認**（字が近い（最大 0.97。もっとも弱い根拠）） | ORPHA:3286<br>Catecholaminergic polymorphic ventricular tachycardia<br>完全一致 | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 223 | ファロー四徴症 | ふぁろーしちょうしょう | [告示 215 ファロー四徴症](https://www.nanbyou.or.jp/entry/4741)<br>完全一致 | [ファロー（Fallot）四徴症](https://www.shouman.jp/disease/details/04_33_041/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:3303<br>Tetralogy of Fallot<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 226 | アルギニノコハク酸尿症 | あるぎにのこはくさんにょうしょう | [告示 251 尿素サイクル異常症](https://www.nanbyou.or.jp/entry/4732)<br>**要確認**（別名「尿素サイクル異常症（アルギニノコハク酸尿症）」が括弧を落とせば一致） | [アルギニノコハク酸尿症](https://www.shouman.jp/disease/details/08_01_015/)<br>完全一致 | ORPHA:23<br>Argininosuccinic aciduria<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 235 | 大理石骨病 | だいりせきこつびょう | [告示 326 大理石骨病](https://www.nanbyou.or.jp/entry/5392)<br>完全一致 | [大理石骨病](https://www.shouman.jp/disease/details/15_02_007/)<br>完全一致 | ORPHA:2781<br>Osteopetrosis and related disorders<br>**要確認** | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 236 | 多発性内軟骨腫症 | たはつせいないなんこつしゅしょう | なし | [内軟骨腫症](https://www.shouman.jp/disease/details/15_02_009/)<br>**要確認**（包含（候補 1 件）） | ORPHA:296<br>Ollier disease<br>完全一致 | 小 2026-09-22T12:13 `de09160da5cb` |  |
| 238 | 肺ランゲルハンス細胞組織球症 | はいらんげるはんすさいぼうそしききゅうしょう | なし | [ランゲルハンス（Langerhans）細胞組織球症](https://www.shouman.jp/disease/details/01_04_024/)<br>**要確認**（包含（候補 1 件）） | ORPHA:687733<br>Pulmonary Langerhans cell histiocytosis<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 245 | 顔面肩甲上腕型筋ジストロフィー | がんめんけんこうじょうわんがたきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | [顔面肩甲上腕型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_050/)<br>完全一致 | ORPHA:269<br>Facioscapulohumeral dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 246 | 肢帯型筋ジストロフィー | したいがたきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | [肢帯型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_049/)<br>完全一致 | ORPHA:263<br>Limb-girdle muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 247 | 眼咽頭型筋ジストロフィー | がんいんとうがたきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:270<br>Oculopharyngeal muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 248 | 重症複合免疫不全症 | じゅうしょうふくごうめんえきふぜんしょう | なし | [X連鎖重症複合免疫不全症](https://www.shouman.jp/disease/details/10_01_001/)<br>**要確認**（包含（候補 1 件）） | ORPHA:183660<br>Severe combined immunodeficiency<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 252 | ウルリッヒ型先天性筋ジストロフィー | うるりっひがたせんてんせいきんじすとろふぃー | なし | [ウルリヒ（Ullrich）型先天性筋ジストロフィー（類縁疾患を含む。）](https://www.shouman.jp/disease/details/11_21_053/)<br>**要確認**（字が近い（最大 0.97。もっとも弱い根拠）） | ORPHA:75840<br>Ullrich congenital muscular dystrophy<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 253 | ツェルウェガー症候群 | つぇるうぇがーしょうこうぐん | なし | なし | ORPHA:912<br>Zellweger syndrome<br>**要確認** |  |  |
| 254 | 腸管ベーチェット病 | ちょうかんべーちぇっとびょう | [告示 56 ベーチェット病](https://www.nanbyou.or.jp/entry/187)<br>**要確認**（包含（候補 1 件）） | [ベーチェット（Behçet）病](https://www.shouman.jp/disease/details/06_01_006/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 259 | 多発性内分泌腫瘍症1型 | たはつせいないぶんぴしゅようしょういちがた | なし | [多発性内分泌腫瘍1型（ウェルマー（Wermer）症候群）](https://www.shouman.jp/disease/details/05_39_084/)<br>[多発性内分泌腫瘍2型（シップル（Sipple）症候群）](https://www.shouman.jp/disease/details/05_39_085/)<br>**要確認**（字が近い（最大 0.95。もっとも弱い根拠）） | ORPHA:652<br>Multiple endocrine neoplasia type 1<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 260 | 多発性内分泌腫瘍症2型 | たはつせいないぶんぴしゅようしょうにがた | なし | [多発性内分泌腫瘍2型（シップル（Sipple）症候群）](https://www.shouman.jp/disease/details/05_39_085/)<br>[多発性内分泌腫瘍1型（ウェルマー（Wermer）症候群）](https://www.shouman.jp/disease/details/05_39_084/)<br>**要確認**（字が近い（最大 0.95。もっとも弱い根拠）） | ORPHA:653<br>Multiple endocrine neoplasia type 2<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 264 | もやもや病（小児型） | もやもやびょう | [告示 22 もやもや病](https://www.nanbyou.or.jp/entry/47)<br>**要確認**（括弧の中身を落とせば一致） | [もやもや病](https://www.shouman.jp/disease/details/11_16_041/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 269 | ホジキンリンパ腫 | ほじきんりんぱしゅ | なし | [ホジキン（Hodgkin）リンパ腫](https://www.shouman.jp/disease/details/01_03_022/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:98293<br>Hodgkin lymphoma<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 270 | もやもや病関連脳出血 | もやもやびょうかんれんのうしゅっけつ | [告示 22 もやもや病](https://www.nanbyou.or.jp/entry/47)<br>**要確認**（包含（候補 1 件）） | [もやもや病](https://www.shouman.jp/disease/details/11_16_041/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 273 | エプスタイン奇形 | えぷすたいんきけい | なし | なし | ORPHA:1880<br>Ebstein malformation of the tricuspid valve<br>**要確認** |  |  |
| 274 | 両大血管右室起始症 | りょうだいけっかんうしつきししょう | [告示 216 両大血管右室起始症](https://www.nanbyou.or.jp/entry/4873)<br>完全一致 | [両大血管右室起始症（タウジッヒ・ビング（Taussig-Bing）奇形を除く。）](https://www.shouman.jp/disease/details/04_34_043/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:3426<br>Double outlet right ventricle<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 276 | マンノシドーシス | まんのしどーしす | なし | [マンノシドーシス](https://www.shouman.jp/disease/details/08_06_082/)<br>完全一致 | ORPHA:61<br>Alpha-mannosidosis<br>**要確認** | 小 2026-09-22T12:12 `400689ca2661` |  |
| 282 | 先天性巨大色素性母斑 | せんてんせいきょだいしきそせいぼはん | なし | なし | ORPHA:626<br>Large/giant congenital melanocytic nevus<br>**要確認** |  |  |
| 283 | 膀胱尿管逆流症 | ぼうこうにょうかんぎゃくりゅうしょう | なし | [膀胱尿管逆流（下部尿路の閉塞性尿路疾患による場合を除く。)](https://www.shouman.jp/disease/details/02_18_047/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 290 | 原発性胆汁性胆管炎重症型 | げんぱつせいたんじゅうせいたんかんえんじゅうしょうがた | [告示 93 原発性胆汁性胆管炎](https://www.nanbyou.or.jp/entry/93)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 293 | 家族性高コレステロール血症 | かぞくせいこうこれすてろーるけっしょう | [告示 79 ） 家族性高コレステロール血症（ホモ接合体）](https://www.nanbyou.or.jp/entry/65)<br>**要確認**（包含（候補 1 件）） | [家族性高コレステロール血症](https://www.shouman.jp/disease/details/08_12_130/)<br>完全一致 | ORPHA:406<br>NON RARE IN EUROPE: Heterozygous familial hypercholesterolemia<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 294 | リポ蛋白リパーゼ欠損症 | りぽたんぱくりぱーぜけっそんしょう | なし | [リパーゼ欠損症](https://www.shouman.jp/disease/details/12_01_006/)<br>**要確認**（包含（候補 1 件）） | ORPHA:309015<br>Familial lipoprotein lipase deficiency<br>**要確認** | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 296 | 周期性四肢麻痺 | しゅうきせいししまひ | [告示 115 遺伝性周期性四肢麻痺](https://www.nanbyou.or.jp/entry/4528)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:206976<br>Periodic paralysis<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 300 | 肺動脈閉鎖症 | はいどうみゃくへいさしょう | なし | なし | ORPHA:1207<br>Pulmonary atresia with ventricular septal defect<br>**要確認** |  |  |
| 304 | 慢性炎症性脱髄性多発根神経炎（MADSAM型） | まんせいえんしょうせいだつずいせいたはつこんしんけいえん | なし | [慢性炎症性脱髄性多発神経炎](https://www.shouman.jp/disease/details/11_43_104/)<br>**要確認**（字が近い（最大 0.96。もっとも弱い根拠）） | ORPHA:48162<br>Lewis-Sumner syndrome<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 306 | 原発性アルドステロン症（両側型） | げんぱつせいあるどすてろんしょう | なし | [アルドステロン症](https://www.shouman.jp/disease/details/05_20_043/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 307 | 骨パジェット病 | こつぱじぇっとびょう | なし | なし | ORPHA:2801<br>Juvenile Paget disease<br>**要確認** |  |  |
| 308 | 先天性表皮水疱症（接合部型） | せんてんせいひょうひすいほうしょう | [告示 36 表皮水疱症](https://www.nanbyou.or.jp/entry/5338)<br>**要確認**（包含（候補 1 件）） | [表皮水疱症](https://www.shouman.jp/disease/details/14_03_008/)<br>**要確認**（包含（候補 1 件）） | ORPHA:305<br>Junctional epidermolysis bullosa<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 310 | メープルシロップ尿症（間欠型） | めーぷるしろっぷにょうしょう | [告示 244 メープルシロップ尿症](https://www.nanbyou.or.jp/entry/4813)<br>**要確認**（括弧の中身を落とせば一致） | [メープルシロップ尿症](https://www.shouman.jp/disease/details/08_01_007/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 313 | 全身性ALアミロイドーシス | ぜんしんせいえーえるあみろいどーしす | [告示 28 全身性アミロイドーシス](https://www.nanbyou.or.jp/entry/45)<br>**要確認**（字が近い（最大 0.92。もっとも弱い根拠）） | なし | ORPHA:85443<br>AL amyloidosis<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 314 | 老人性全身性アミロイドーシス | ろうじんせいぜんしんせいあみろいどーしす | [告示 28 全身性アミロイドーシス](https://www.nanbyou.or.jp/entry/45)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:330001<br>Wild type ATTR amyloidosis<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 316 | 常染色体劣性多発性嚢胞腎 | じょうせんしょくたいれっせいたはつせいのうほうじん | [告示 67 多発性嚢胞腎](https://www.nanbyou.or.jp/entry/146)<br>**要確認**（包含（候補 1 件）） | [多発性嚢胞腎](https://www.shouman.jp/disease/details/02_17_038/)<br>**要確認**（包含（候補 1 件）） | ORPHA:731<br>Autosomal recessive polycystic kidney disease<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 318 | 肺動脈性肺高血圧症（結合組織病関連） | はいどうみゃくせいはいこうけつあつしょう | [告示 86 肺動脈性肺高血圧症](https://www.nanbyou.or.jp/entry/171)<br>**要確認**（括弧の中身を落とせば一致） | [肺動脈性肺高血圧症](https://www.shouman.jp/disease/details/04_61_085/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 320 | 遺伝性膵炎 | いでんせいすいえん | [告示 298 遺伝性膵炎](https://www.nanbyou.or.jp/entry/4780)<br>完全一致 | [遺伝性膵炎](https://www.shouman.jp/disease/details/12_12_035/)<br>完全一致 | ORPHA:676<br>Autosomal dominant hereditary chronic pancreatitis<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 329 | Kearns-Sayre症候群 | かーんずせいやーしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/08_04_057/）） | ORPHA:480<br>Kearns-Sayre syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 335 | ランゲルハンス細胞組織球症 | らんげるはんすさいぼうそしききゅうしょう | なし | [ランゲルハンス（Langerhans）細胞組織球症](https://www.shouman.jp/disease/details/01_04_024/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:389<br>Langerhans cell histiocytosis<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 337 | ポルフィリン症（急性間欠性） | ぽるふぃりんしょう | [告示 254 ポルフィリン症](https://www.nanbyou.or.jp/entry/5545)<br>**要確認**（括弧の中身を落とせば一致） | [先天性ポルフィリン症](https://www.shouman.jp/disease/details/14_12_017/)<br>**要確認**（包含（候補 1 件）） | ORPHA:79276<br>Acute intermittent porphyria<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 338 | 骨髄性プロトポルフィリン症 | こつずいせいぷろとぽるふぃりんしょう | [告示 254 ポルフィリン症](https://www.nanbyou.or.jp/entry/5545)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:79278<br>Autosomal erythropoietic protoporphyria<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 339 | ウォルマン病 | うぉるまんびょう | なし | [酸性リパーゼ欠損症](https://www.shouman.jp/disease/details/08_06_098/)<br>**要確認**（別名「酸性リパーゼ欠損症」が一致） | ORPHA:75233<br>Wolman disease<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 342 | 脊髄小脳変性症6型 | せきずいしょうのうへんせいしょうろくがた | なし | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98758<br>Spinocerebellar ataxia type 6<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 343 | 脊髄小脳変性症3型 | せきずいしょうのうへんせいしょうさんがた | なし | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98757<br>Spinocerebellar ataxia type 3<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 345 | 補体欠損症 | ほたいけっそんしょう | なし | [先天性補体欠損症](https://www.shouman.jp/disease/details/10_07_049/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 350 | 心房中隔欠損症（大型） | しんぼうちゅうかくけっそんしょう | なし | [二次孔型心房中隔欠損症](https://www.shouman.jp/disease/details/04_43_053/)<br>[静脈洞型心房中隔欠損症](https://www.shouman.jp/disease/details/04_43_054/)<br>**要確認**（包含（候補 2 件）） | —<br>なし | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 352 | 抗糸球体基底膜病 | こうしきゅうたいきていまくびょう | なし | なし | ORPHA:375<br>Anti-glomerular basement membrane disease<br>**要確認** |  |  |
| 357 | 多系統萎縮症C型 | たけいとういしゅくしょうしーがた | [告示 17 多系統萎縮症](https://www.nanbyou.or.jp/entry/5365)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 358 | 多系統萎縮症P型 | たけいとういしゅくしょうぴーがた | [告示 17 多系統萎縮症](https://www.nanbyou.or.jp/entry/5365)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 360 | 特発性拡張型心筋症（小児） | とくはつせいかくちょうがたしんきんしょう | [告示 57 特発性拡張型心筋症](https://www.nanbyou.or.jp/entry/3985)<br>**要確認**（括弧の中身を落とせば一致） | [拡張型心筋症](https://www.shouman.jp/disease/details/04_15_019/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 371 | 結節性多発動脈炎（皮膚型） | けっせつせいたはつどうみゃくえん | [告示 42 結節性多発動脈炎](https://www.nanbyou.or.jp/entry/85)<br>**要確認**（括弧の中身を落とせば一致） | なし | ORPHA:439729<br>Cutaneous polyarteritis nodosa<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 372 | 高安動脈炎（若年型） | たかやすどうみゃくえん | [告示 40 高安動脈炎](https://www.nanbyou.or.jp/entry/141)<br>**要確認**（括弧の中身を落とせば一致） | [高安動脈炎（大動脈炎症候群）](https://www.shouman.jp/disease/details/06_02_007/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 375 | Silver-Russell症候群 | しるばーらっせるしょうこうぐん | なし | なし | ORPHA:813<br>Silver-Russell syndrome<br>**要確認** |  |  |
| 376 | Sotos症候群 | そとすしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_002/）） | ORPHA:821<br>Sotos syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 377 | コルネリア・デランゲ症候群 | こるねりあでらんげしょうこうぐん | なし | [コルネリア・デランゲ（Cornelia de Lange）症候群](https://www.shouman.jp/disease/details/13_01_007/)<br>完全一致 | ORPHA:199<br>Cornelia de Lange syndrome<br>**要確認** | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 378 | Kabuki症候群 | かぶきしょうこうぐん | [告示 187 歌舞伎症候群](https://www.nanbyou.or.jp/entry/4663)<br>**要確認**（別名「歌舞伎症候群」が一致） | [歌舞伎症候群](https://www.shouman.jp/disease/details/13_01_005/)<br>**要確認**（別名「歌舞伎症候群」が一致） | ORPHA:2322<br>Kabuki syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 381 | ルビンシュタイン・テイビ症候群 | るびんしゅたいんていびしょうこうぐん | [告示 102 ルビンシュタイン・テイビ症候群](https://www.nanbyou.or.jp/entry/4067)<br>完全一致 | [ルビンシュタイン・テイビ（Rubinstein-Taybi）症候群](https://www.shouman.jp/disease/details/13_01_004/)<br>完全一致 | ORPHA:783<br>Rubinstein-Taybi syndrome<br>**要確認** | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 382 | スミス・マギニス症候群 | すみすまぎにすしょうこうぐん | [告示 202 スミス・マギニス症候群](https://www.nanbyou.or.jp/entry/4853)<br>完全一致 | [スミス・マギニス（Smith-Magenis）症候群](https://www.shouman.jp/disease/details/13_01_003/)<br>完全一致 | ORPHA:819<br>Smith-Magenis syndrome<br>**要確認** | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 383 | クリグラー・ナジャー症候群 | くりぐらーなじゃーしょうこうぐん | なし | [クリグラー・ナジャー（Crigler-Najjar）症候群](https://www.shouman.jp/disease/details/12_11_034/)<br>完全一致 | ORPHA:205<br>Crigler-Najjar syndrome<br>**要確認** | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 384 | ロイス・ディーツ症候群 | ろいすでぃーつしょうこうぐん | [告示 167 マルファン症候群／ロイス・ディーツ症候群](https://www.nanbyou.or.jp/entry/4792)<br>**要確認**（包含（候補 1 件）） | [ロイス・ディーツ症候群](https://www.shouman.jp/disease/details/13_01_018/)<br>完全一致 | ORPHA:60030<br>Loeys-Dietz syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 385 | Treacher Collins症候群 | とりーちゃーこりんずしょうこうぐん | なし | なし | ORPHA:861<br>Treacher-Collins syndrome<br>**要確認** |  |  |
| 386 | Apert症候群 | あぺーるしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_15_038/）） | ORPHA:87<br>Apert syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 387 | Crouzon症候群 | くるーぞんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_15_039/）） | ORPHA:207<br>Crouzon syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 388 | レット症候群 | れっとしょうこうぐん | [告示 156 レット症候群](https://www.nanbyou.or.jp/entry/4366)<br>完全一致 | [レット（Rett）症候群](https://www.shouman.jp/disease/details/11_06_017/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:778<br>Rett syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 390 | 若年性パーキンソン病 | じゃくねんせいぱーきんそんびょう | [告示 6 パーキンソン病](https://www.nanbyou.or.jp/entry/169)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:2828<br>Young-onset Parkinson disease<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 393 | 遺伝性鉄芽球性貧血 | いでんせいてつがきゅうせいひんけつ | [告示 286 遺伝性鉄芽球性貧血](https://www.nanbyou.or.jp/entry/4405)<br>完全一致 | [鉄芽球性貧血](https://www.shouman.jp/disease/details/09_04_005/)<br>**要確認**（包含（候補 1 件）） | ORPHA:75564<br>Acquired idiopathic sideroblastic anemia<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 394 | ピルビン酸キナーゼ欠損症 | ぴるびんさんきなーぜけっそんしょう | なし | なし | ORPHA:766<br>Hemolytic anemia due to red cell pyruvate kinase deficiency<br>**要確認** |  |  |
| 396 | 肺静脈還流異常症 | はいじょうみゃくかんりゅういじょうしょう | なし | [総肺静脈還流異常症](https://www.shouman.jp/disease/details/04_46_058/)<br>[部分肺静脈還流異常症](https://www.shouman.jp/disease/details/04_46_059/)<br>**要確認**（包含（候補 2 件）） | ORPHA:99062<br>Mitral valve agenesis<br>なし | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 397 | 拡張型心筋症関連伝導障害 | かくちょうがたしんきんしょうかんれんでんどうしょうがい | なし | [拡張型心筋症](https://www.shouman.jp/disease/details/04_15_019/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 398 | DiGeorge症候群関連免疫不全 | でぃじょーじしょうこうぐんかんれんめんえきふぜん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/10_02_019/）） | —<br>なし |  | 既知一致と食い違い（小児慢性） |
| 402 | Phelan-McDermid症候群 | ふぇらんまくだーみっどしょうこうぐん | なし | なし | ORPHA:48652<br>Phelan-McDermid syndrome<br>**要確認** |  |  |
| 403 | Costello症候群 | こすてろしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_020/）） | ORPHA:3071<br>Costello syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 404 | コフィン・シリス症候群 | こふぃんしりすしょうこうぐん | [告示 185 コフィン・シリス症候群](https://www.nanbyou.or.jp/entry/4762)<br>完全一致 | [コフィン・シリス（Coffin-Siris）症候群](https://www.shouman.jp/disease/details/13_01_026/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:1465<br>Coffin-Siris syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 406 | Gorlin症候群 | ごーりんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_07_020/）） | ORPHA:377<br>Gorlin syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 409 | 眼皮膚白皮症 | がんひふはくひしょう | [告示 164 眼皮膚白皮症](https://www.nanbyou.or.jp/entry/4492)<br>完全一致 | [眼皮膚白皮症（先天性白皮症）](https://www.shouman.jp/disease/details/14_01_001/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:55<br>Oculocutaneous albinism<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 410 | Waardenburg症候群 | わーるでんぶるぐしょうこうぐん | なし | なし | ORPHA:3440<br>Waardenburg syndrome<br>**要確認** |  |  |
| 411 | Pfeiffer症候群 | ふぁいふぁーしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_025/）） | ORPHA:710<br>Pfeiffer syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 415 | Mowat-Wilson症候群 | もわっとうぃるそんしょうこうぐん | なし | なし | ORPHA:2152<br>Mowat-Wilson syndrome<br>**要確認** |  |  |
| 416 | Pitt-Hopkins症候群 | ぴっとほぷきんすしょうこうぐん | なし | なし | ORPHA:2896<br>Pitt-Hopkins syndrome<br>**要確認** |  |  |
| 417 | Kleefstra症候群 | くれーふすとらしょうこうぐん | なし | なし | ORPHA:261494<br>Kleefstra syndrome<br>**要確認** |  |  |
| 418 | Wiedemann-Steiner症候群 | うぃーでまんしゅたいなーしょうこうぐん | なし | なし | ORPHA:319182<br>Wiedemann-Steiner syndrome<br>**要確認** |  |  |
| 419 | Cornelia de Lange症候群2型 | こるねりあでらんげしょうこうぐんにがた | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_007/）） | —<br>なし |  | 既知一致と食い違い（小児慢性） |
| 420 | Pallister-Killian症候群 | ぱりすたーきりあんしょうこうぐん | なし | なし | ORPHA:884<br>Pallister-Killian syndrome<br>**要確認** |  |  |
| 421 | Jacobsen症候群 | やこぶせんしょうこうぐん | なし | なし | ORPHA:2308<br>Jacobsen syndrome<br>**要確認** |  |  |
| 422 | Emanuel症候群 | えまぬえるしょうこうぐん | なし | なし | ORPHA:96170<br>Emanuel syndrome<br>**要確認** |  |  |
| 426 | Myhre症候群 | みーれしょうこうぐん | なし | なし | ORPHA:2588<br>Myhre syndrome<br>**要確認** |  |  |
| 427 | Floating-Harbor症候群 | ふろーてぃんぐはーばーしょうこうぐん | なし | なし | ORPHA:2044<br>Floating-Harbor syndrome<br>**要確認** |  |  |
| 428 | Tatton-Brown-Rahman症候群 | たっとんぶらうんらーまんしょうこうぐん | なし | なし | ORPHA:404443<br>Tatton-Brown-Rahman syndrome<br>**要確認** |  |  |
| 429 | Weaver症候群 | うぃーばーしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_006/）） | ORPHA:3447<br>Weaver syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 430 | Marshall-Smith症候群 | まーしゃるすみすしょうこうぐん | なし | なし | ORPHA:561<br>Marshall-Smith syndrome<br>**要確認** |  |  |
| 431 | Bohring-Opitz症候群 | ぼーりんぐおぴっつしょうこうぐん | なし | なし | ORPHA:97297<br>Bohring-Opitz syndrome<br>**要確認** |  |  |
| 433 | ジュベール症候群 | じゅべーるしょうこうぐん | [告示 177 ジュベール症候群関連疾患](https://www.nanbyou.or.jp/entry/4552)<br>**要確認**（包含（候補 1 件）） | [ジュベール（Joubert）症候群関連疾患](https://www.shouman.jp/disease/details/11_05_016/)<br>完全一致 | ORPHA:140874<br>Joubert syndrome<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 434 | ウォルフラム症候群 | うぉるふらむしょうこうぐん | [告示 233 ウォルフラム症候群](https://www.nanbyou.or.jp/entry/4789)<br>完全一致 | なし | ORPHA:3463<br>Wolfram syndrome<br>**要確認** | 難 2026-09-22T12:11 `51d8c22da951` |  |
| 435 | Alström症候群 | あるすとれーむしょうこうぐん | なし | なし | ORPHA:64<br>Alström syndrome<br>**要確認** |  |  |
| 436 | Cohen症候群 | こーえんしょうこうぐん | なし | なし | ORPHA:193<br>Cohen syndrome<br>**要確認** |  |  |
| 437 | コケイン症候群 | こけいんしょうこうぐん | [告示 192 コケイン症候群](https://www.nanbyou.or.jp/entry/4435)<br>完全一致 | [コケイン（Cockayne）症候群](https://www.shouman.jp/disease/details/11_08_024/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:191<br>Cockayne syndrome<br>**要確認** | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 438 | ウェルナー症候群 | うぇるなーしょうこうぐん | [告示 191 ウェルナー症候群](https://www.nanbyou.or.jp/entry/5320)<br>完全一致 | [ウェルナー（Werner）症候群](https://www.shouman.jp/disease/details/11_08_023/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:902<br>Werner syndrome<br>**要確認** | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 439 | ブルーム症候群 | ぶるーむしょうこうぐん | なし | [ブルーム（Bloom）症候群](https://www.shouman.jp/disease/details/10_02_014/)<br>完全一致 | ORPHA:125<br>Bloom syndrome<br>**要確認** | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 440 | ファンコニ貧血 | ふぁんこにひんけつ | [告示 285 ファンコニ貧血](https://www.nanbyou.or.jp/entry/4441)<br>完全一致 | [ファンコニ（Fanconi）貧血](https://www.shouman.jp/disease/details/09_16_028/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:84<br>Fanconi anemia<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 444 | Kostmann症候群 | こすとまんしょうこうぐん | なし | [重症先天性好中球減少症](https://www.shouman.jp/disease/details/10_05_035/)<br>**要確認**（別名「重症先天性好中球減少症」が一致） | ORPHA:42738<br>Severe congenital neutropenia<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 450 | Proteus症候群 | ぷろていうすしょうこうぐん | なし | なし | ORPHA:744<br>Proteus syndrome<br>**要確認** |  |  |
| 451 | マッキューン・オルブライト症候群 | まっきゅーんおるぶらいとしょうこうぐん | なし | [マッキューン・オルブライト（McCune-Albright）症候群](https://www.shouman.jp/disease/details/05_41_090/)<br>完全一致 | ORPHA:562<br>McCune-Albright syndrome<br>**要確認** | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 455 | 先天性中枢性低換気症候群 | せんてんせいちゅうすうせいていかんきしょうこうぐん | [告示 230 肺胞低換気症候群](https://www.nanbyou.or.jp/entry/172)<br>**要確認**（別名「肺胞低換気症候群」が一致） | [先天性中枢性低換気症候群](https://www.shouman.jp/disease/details/03_03_003/)<br>完全一致 | ORPHA:661<br>Congenital central hypoventilation syndrome<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 456 | 腎性尿崩症 | じんせいにょうほうしょう | [告示 225 先天性腎性尿崩症](https://www.nanbyou.or.jp/entry/5537)<br>**要確認**（包含（候補 1 件）） | [腎性尿崩症](https://www.shouman.jp/disease/details/05_08_013/)<br>完全一致 | ORPHA:223<br>Arginine vasopressin resistance<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 457 | IPEX症候群 | あいぺっくすしょうこうぐん | なし | なし | ORPHA:37042<br>Immune dysregulation-polyendocrinopathy-enteropathy-X-linked syndrome<br>**要確認** |  |  |
| 459 | Hyper-IgE症候群 | はいぱーあいじーいーしょうこうぐん | なし | [高IgE症候群](https://www.shouman.jp/disease/details/10_02_020/)<br>**要確認**（別名「高IgE症候群」が一致） | ORPHA:2314<br>Autosomal dominant hyper-IgE syndrome due to STAT3 deficiency<br>**要確認** | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 460 | Omenn症候群 | おーめんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/10_01_004/）） | ORPHA:39041<br>Omenn syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 461 | Chediak-Higashi症候群 | ちぇでぃあっくひがししょうこうぐん | なし | なし | ORPHA:167<br>Chédiak-Higashi syndrome<br>**要確認** |  |  |
| 462 | Griscelli症候群 | ぐりせりしょうこうぐん | なし | なし | ORPHA:381<br>Griscelli syndrome<br>**要確認** |  |  |
| 463 | メンケス病 | めんけすびょう | [告示 169 メンケス病](https://www.nanbyou.or.jp/entry/4729)<br>完全一致 | [メンケス（Menkes）病](https://www.shouman.jp/disease/details/08_08_108/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:565<br>Menkes disease<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 464 | Canavan病 | かなばんびょう | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_09_026/）） | ORPHA:141<br>Canavan disease<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 467 | Niemann-Pick病B型 | にーまんぴっくびょうびーがた | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/08_06_089/）） | ORPHA:77293<br>Chronic visceral acid sphingomyelinase deficiency<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 474 | ビタミンD依存性くる病 | びたみんでぃーいぞんせいくるびょう | [告示 239 ビタミンＤ依存性くる病／骨軟化症](https://www.nanbyou.or.jp/entry/4561)<br>**要確認**（包含（候補 1 件）） | [ビタミンD依存性くる病](https://www.shouman.jp/disease/details/05_35_080/)<br>完全一致 | ORPHA:289157<br>Hypocalcemic vitamin D-dependent rickets<br>**要確認** | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 476 | 偽性副甲状腺機能低下症 | ぎせいふくこうじょうせんきのうていかしょう | [告示 236 偽性副甲状腺機能低下症](https://www.nanbyou.or.jp/entry/72)<br>完全一致 | [偽性副甲状腺機能低下症（偽性偽性副甲状腺機能低下症を除く。）](https://www.shouman.jp/disease/details/05_17_032/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:97593<br>Pseudohypoparathyroidism<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 479 | アンジェルマン症候群（母性UPD型） | あんじぇるまんしょうこうぐん | [告示 201 アンジェルマン症候群](https://www.nanbyou.or.jp/entry/4771)<br>**要確認**（括弧の中身を落とせば一致） | [アンジェルマン（Angelman）症候群](https://www.shouman.jp/disease/details/13_01_009/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 481 | 2q37欠失症候群 | にきゅうさんななけっしつしょうこうぐん | なし | なし | ORPHA:1001<br>2q37 microdeletion syndrome<br>**要確認** |  |  |
| 483 | 15q13.3欠失症候群 | じゅうごきゅういちさんてんさんけっしつしょうこうぐん | なし | なし | ORPHA:199318<br>15q13.3 microdeletion syndrome<br>**要確認** |  |  |
| 484 | 16p11.2欠失症候群 | じゅうろくぴーいちいちてんにけっしつしょうこうぐん | なし | なし | ORPHA:261211<br>16p11.2p12.2 microdeletion syndrome<br>**要確認** |  |  |
| 489 | 進行性ミオクローヌスてんかん（Unverricht-Lundborg型） | しんこうせいみおくろーぬすてんかん | [告示 309 進行性ミオクローヌスてんかん](https://www.nanbyou.or.jp/entry/5425)<br>**要確認**（括弧の中身を落とせば一致） | なし | ORPHA:308<br>Progressive myoclonic epilepsy type 1<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 490 | ラフォラ病 | らふぉらびょう | なし | [ラフォラ（Lafora）病](https://www.shouman.jp/disease/details/11_29_084/)<br>**要確認**（括弧の中身を落とせば一致 ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_28_079/）） | ORPHA:501<br>Lafora disease<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` | 既知一致と食い違い（小児慢性） |
| 492 | クッシング症候群（ACTH非依存性） | くっしんぐしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/05_18_033/）） | —<br>なし |  | 既知一致と食い違い（小児慢性） |
| 493 | 先天性高インスリン血症 | せんてんせいこういんすりんけっしょう | なし | [先天性高インスリン血症](https://www.shouman.jp/disease/details/05_34_078/)<br>完全一致 | ORPHA:657<br>Congenital isolated hyperinsulinism<br>**要確認** | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 494 | GLUT1欠損症 | ぐるっとわんけっそんしょう | なし | なし | ORPHA:71277<br>Classic glucose transporter type 1 deficiency syndrome<br>**要確認** |  |  |
| 495 | レッシュ・ナイハン症候群 | れっしゅないはんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/08_09_114/）） | ORPHA:510<br>Lesch-Nyhan syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 497 | セピアプテリン還元酵素欠損症 | せぴあぷてりんかんげんこうそけっそんしょう | [告示 319 けっそんしょう） セピアプテリン還元酵素（SR）欠損症](https://www.nanbyou.or.jp/entry/5437)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:70594<br>Dopa-responsive dystonia due to sepiapterin reductase deficiency<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 498 | 糖原病Ia型 | とうげんびょういちえーがた | なし | [糖原病Ⅰ型](https://www.shouman.jp/disease/details/08_05_066/)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | ORPHA:364<br>Glycogen storage disease due to glucose-6-phosphatase deficiency<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 501 | 中鎖アシルCoA脱水素酵素欠損症 | ちゅうさあしるこえーだっすいそこうそけっそんしょう | [告示 344 極長鎖アシル-CoA 脱水素酵素欠損症](https://www.nanbyou.or.jp/entry/28612)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | [中鎖アシルCoA脱水素酵素欠損症](https://www.shouman.jp/disease/details/08_03_045/)<br>完全一致 | ORPHA:42<br>Medium chain acyl-CoA dehydrogenase deficiency<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 505 | カルバミルリン酸合成酵素I欠損症 | かるばみるりんさんごうせいこうそいちけっそんしょう | なし | [カルバミルリン酸合成酵素欠損症](https://www.shouman.jp/disease/details/08_01_012/)<br>**要確認**（字が近い（最大 0.97。もっとも弱い根拠）） | ORPHA:147<br>Carbamoyl-phosphate synthetase 1 deficiency<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 511 | Niemann-Pick病A型 | にーまんぴっくびょうえーがた | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/08_06_089/）） | ORPHA:77292<br>Infantile neurovisceral acid sphingomyelinase deficiency<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 513 | 遺伝性オロト酸尿症 | いでんせいおろとさんにょうしょう | なし | [オロト酸尿症](https://www.shouman.jp/disease/details/08_09_118/)<br>**要確認**（包含（候補 1 件）） | ORPHA:30<br>Hereditary orotic aciduria<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 514 | 遺伝性キサンチン尿症 | いでんせいきさんちんにょうしょう | なし | [キサンチン尿症](https://www.shouman.jp/disease/details/08_09_116/)<br>**要確認**（包含（候補 1 件）） | ORPHA:3467<br>Hereditary xanthinuria<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 515 | モリブデン補因子欠損症 | もりぶでんほいんしけっそんしょう | なし | なし | ORPHA:99732<br>Sulfite oxidase deficiency due to molybdenum cofactor deficiency<br>**要確認** |  |  |
| 516 | 亜硫酸酸化酵素欠損症 | ありゅうさんさんかこうそけっそんしょう | なし | [亜硫酸酸化酵素欠損症](https://www.shouman.jp/disease/details/08_08_111/)<br>完全一致 | ORPHA:833<br>Encephalopathy due to sulfite oxidase deficiency<br>**要確認** | 小 2026-09-22T12:12 `400689ca2661` |  |
| 517 | セロイドリポフスチン症 | せろいどりぽふすちんしょう | なし | [神経セロイドリポフスチン症](https://www.shouman.jp/disease/details/08_06_101/)<br>**要確認**（包含（候補 1 件）） | ORPHA:216<br>Neuronal ceroid lipofuscinosis<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 521 | Hartnup病 | はーとなっぷびょう | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/08_01_019/）） | ORPHA:2116<br>Hartnup disease<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 522 | Lowe症候群 | ろうしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/02_21_051/）） | ORPHA:534<br>Oculocerebrorenal syndrome of Lowe<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 524 | Bartter症候群 | ばーたーしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/02_14_034/）） | ORPHA:112<br>Bartter syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 525 | Gitelman症候群 | ぎってるまんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/02_13_033/）） | ORPHA:358<br>Gitelman syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 526 | Liddle症候群 | りどるしょうこうぐん | なし | [RIDDLE症候群](https://www.shouman.jp/disease/details/10_02_017/)<br>**要確認**（字が近い（最大 0.89。もっとも弱い根拠） ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/05_22_045/）） | ORPHA:526<br>Liddle syndrome<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` | 既知一致と食い違い（小児慢性） |
| 527 | Gordon症候群 | ごーどんしょうこうぐん | なし | なし | ORPHA:757<br>Pseudohypoaldosteronism type 2<br>**要確認** |  |  |
| 529 | 乳児型ネマリンミオパチー | にゅうじがたねまりんみおぱちー | なし | [ネマリンミオパチー](https://www.shouman.jp/disease/details/11_23_058/)<br>**要確認**（包含（候補 1 件）） | ORPHA:607<br>Nemaline myopathy<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 532 | 先天性線維型不均等症 | せんてんせいせんいがたふきんとうしょう | なし | [先天性筋線維不均等症](https://www.shouman.jp/disease/details/11_23_057/)<br>**要確認**（字が近い（最大 0.90。もっとも弱い根拠）） | ORPHA:2020<br>Congenital fiber-type disproportion myopathy<br>**要確認** | 小 2026-09-22T12:13 `f34802b36065` |  |
| 534 | ベスレムミオパチー | べすれむみおぱちー | [告示 31 ベスレムミオパチー](https://www.nanbyou.or.jp/entry/4005)<br>**要確認**（正規化後に病名が同一 ／ 既知一致と食い違い（readings.json: https://www.nanbyou.or.jp/entry/4006）） | なし | ORPHA:610<br>Bethlem muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` | 既知一致と食い違い（難病情報センター） |
| 535 | エメリー・ドレイフス型筋ジストロフィー | えめりーどれいふすがたきんじすとろふぃー | なし | [エメリー・ドレイフス（Emery-Dreifuss）型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_048/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:261<br>Emery-Dreifuss muscular dystrophy<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 542 | 遺伝性運動感覚性ニューロパチー（デジェリーヌ・ソッタス型） | いでんせいうんどうかんかくせいにゅーろぱちー | なし | [遺伝性運動感覚ニューロパチー](https://www.shouman.jp/disease/details/11_20_046/)<br>**要確認**（字が近い（最大 0.97。もっとも弱い根拠）） | ORPHA:64748<br>Dejerine-Sottas syndrome<br>**要確認** | 小 2026-09-22T12:13 `f34802b36065` |  |
| 544 | Chiari奇形（I型） | きありきけい | なし | なし | ORPHA:268882<br>Arnold-Chiari malformation type I<br>**要確認** |  |  |
| 545 | 二分脊椎 | にぶんせきつい | [告示 118 脊髄髄膜瘤](https://www.nanbyou.or.jp/entry/4633)<br>**要確認**（別名「脊髄髄膜瘤」が一致） | [脊髄髄膜瘤](https://www.shouman.jp/disease/details/11_01_002/)<br>**要確認**（別名「脊髄髄膜瘤」が一致） | ORPHA:823<br>Spina bifida and other spinal dysraphisms<br>**要確認** | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 547 | 先天性中枢性低換気症候群（非ポリアラニン型） | せんてんせいちゅうすうせいていかんきしょうこうぐん | なし | [先天性中枢性低換気症候群](https://www.shouman.jp/disease/details/03_03_003/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 小 2026-09-22T12:12 `00607aed7a2b` |  |
| 550 | カルニチンパルミトイルトランスフェラーゼII欠損症 | かるにちんぱるみといるとらんすふぇらーぜにけっそんしょう | なし | [カルニチンパルミトイルトランスフェラーゼⅡ欠損症](https://www.shouman.jp/disease/details/08_03_042/)<br>完全一致 | ORPHA:228302<br>Carnitine palmitoyl transferase II deficiency, myopathic form<br>**要確認** | 小 2026-09-22T12:12 `400689ca2661` |  |
| 551 | 短鎖アシルCoA脱水素酵素欠損症 | たんさあしるこえーだっすいそこうそけっそんしょう | [告示 344 極長鎖アシル-CoA 脱水素酵素欠損症](https://www.nanbyou.or.jp/entry/28612)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | [短鎖アシルCoA脱水素酵素欠損症](https://www.shouman.jp/disease/details/08_03_046/)<br>完全一致 | ORPHA:26792<br>Short chain acyl-CoA dehydrogenase deficiency<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 552 | ケトアシドーシス発作を伴うスクシニル-CoA: 3-ケト酸CoAトランスフェラーゼ欠損症 | けとあしどーしすほっさをともなうすくしにるこえーすりーけとさんこえーとらんすふぇらーぜけっそんしょう | なし | [スクシニル-CoA：3-ケト酸CoAトランスフェラーゼ（SCOT）欠損症](https://www.shouman.jp/disease/details/08_02_031/)<br>**要確認**（包含（候補 1 件）） | ORPHA:832<br>Succinyl-CoA:3-oxoacid CoA transferase deficiency<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 558 | Dubin-Johnson症候群 | でゅびんじょんそんしょうこうぐん | なし | なし | ORPHA:234<br>Dubin-Johnson syndrome<br>**要確認** |  |  |
| 560 | 4H白質ジストロフィー | よんえいちはくしつじすとろふぃー | [告示 139 先天性大脳白質形成不全症](https://www.nanbyou.or.jp/entry/4886)<br>**要確認**（別名「先天性大脳白質形成不全症」が一致） | なし | ORPHA:289494<br>4H leukodystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 561 | Aicardi-Goutières症候群 | えかるでぃぐてぃえーるしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_36_097/）） | ORPHA:51<br>Aicardi-Goutières syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 562 | 白質消失病 | はくしつしょうしつびょう | なし | なし | ORPHA:135<br>CACH syndrome<br>**要確認** |  |  |
| 564 | X連鎖性副腎白質ジストロフィー（小児脳型） | えっくすれんさせいふくじんはくしつじすとろふぃー | [告示 20 副腎白質ジストロフィー](https://www.nanbyou.or.jp/entry/186)<br>**要確認**（包含（候補 1 件）） | [副腎白質ジストロフィー](https://www.shouman.jp/disease/details/08_07_104/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 569 | 先天性QT短縮症候群 | せんてんせいきゅーてぃーたんしゅくしょうこうぐん | なし | なし | ORPHA:51083<br>Congenital short QT syndrome<br>**要確認** |  |  |
| 573 | 骨形成不全症IV型 | こつけいせいふぜんしょうよんがた | [告示 274 骨形成不全症](https://www.nanbyou.or.jp/entry/4567)<br>**要確認**（包含（候補 1 件）） | [骨形成不全症](https://www.shouman.jp/disease/details/15_02_005/)<br>**要確認**（包含（候補 1 件）） | ORPHA:216820<br>Osteogenesis imperfecta type 4<br>なし | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 574 | 骨形成不全症V型 | こつけいせいふぜんしょうごがた | [告示 274 骨形成不全症](https://www.nanbyou.or.jp/entry/4567)<br>**要確認**（包含（候補 1 件）） | [骨形成不全症](https://www.shouman.jp/disease/details/15_02_005/)<br>**要確認**（包含（候補 1 件）） | ORPHA:216828<br>Osteogenesis imperfecta type 5<br>なし | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 579 | Stickler症候群 | すてぃっくらーしょうこうぐん | なし | なし | ORPHA:828<br>Stickler syndrome<br>**要確認** |  |  |
| 580 | Acromesomelic Dysplasia(Maroteaux型) | あくろめぞめりっくでぃすぷれいじあまろとーがた | なし | なし | ORPHA:40<br>Acromesomelic dysplasia, Maroteaux type<br>**要確認** |  |  |
| 584 | 偽性軟骨無形成症 | ぎせいなんこつむけいせいしょう | [告示 276 軟骨無形成症](https://www.nanbyou.or.jp/entry/4570)<br>**要確認**（包含（候補 1 件）） | [偽性軟骨無形成症](https://www.shouman.jp/disease/details/15_02_012/)<br>完全一致 | ORPHA:750<br>Pseudoachondroplasia<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 586 | Hajdu-Cheney症候群 | はじゅちぇにーしょうこうぐん | なし | なし | ORPHA:955<br>Hajdu-Cheney syndrome<br>**要確認** |  |  |
| 589 | 多中心性Castleman病 | たちゅうしんせいきゃっするまんびょう | なし | なし | ORPHA:160<br>Castleman disease<br>**要確認** |  |  |
| 591 | 巨大リンパ管奇形(嚢胞性ヒグローマ) | きょだいりんぱかんきけい | [告示 278 ） 巨大リンパ管奇形（頚部顔面病変）](https://www.nanbyou.or.jp/entry/4892)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:79489<br>Macrocystic lymphatic malformation<br>なし | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 592 | SAPHO症候群 | さふぉしょうこうぐん | なし | なし | ORPHA:793<br>SAPHO syndrome<br>**要確認** |  |  |
| 593 | 慢性再発性多発性骨髄炎 | まんせいさいはつせいたはつせいこつずいえん | [告示 270 慢性再発性多発性骨髄炎](https://www.nanbyou.or.jp/entry/4465)<br>完全一致 | [慢性再発性多発性骨髄炎](https://www.shouman.jp/disease/details/06_05_022/)<br>完全一致 | ORPHA:324964<br>Chronic nonbacterial osteomyelitis/Chronic recurrent multifocal osteomyelitis<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 594 | アデノシンデアミナーゼ2欠損症 | あでのしんであみなーぜつーけっそんしょう | なし | [アデノシンデアミナーゼ（ADA）欠損症](https://www.shouman.jp/disease/details/10_01_003/)<br>**要確認**（字が近い（最大 0.97。もっとも弱い根拠）） | ORPHA:404553<br>Deficiency of adenosine deaminase 2<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 596 | Muckle-Wells症候群 | まっくるうぇるずしょうこうぐん | なし | なし | ORPHA:575<br>Muckle-Wells syndrome<br>**要確認** |  |  |
| 597 | CINCA症候群 | しんかしょうこうぐん | なし | なし | ORPHA:1451<br>CINCA syndrome<br>**要確認** |  |  |
| 598 | PAPA症候群 | ぴーえーぴーえーしょうこうぐん | なし | なし | ORPHA:69126<br>PAPA syndrome<br>**要確認** |  |  |
| 600 | ブラウ症候群 | ぶらうしょうこうぐん | [告示 110 ブラウ症候群](https://www.nanbyou.or.jp/entry/3826)<br>完全一致 | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/06_05_018/）） | ORPHA:90340<br>Blau syndrome<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` | 既知一致と食い違い（小児慢性） |
| 601 | 中條-西村症候群 | なかじょうにしむらしょうこうぐん | [告示 268 中條・西村症候群](https://www.nanbyou.or.jp/entry/4582)<br>完全一致 | [中條・西村症候群](https://www.shouman.jp/disease/details/06_05_019/)<br>完全一致 | ORPHA:324977<br>Proteasome-associated autoinflammatory syndrome<br>**要確認** | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 604 | Schnitzler症候群 | しゅにっつらーしょうこうぐん | なし | なし | ORPHA:37748<br>Schnitzler syndrome<br>**要確認** |  |  |
| 609 | 膀胱尿管逆流症（先天性高度） | ぼうこうにょうかんぎゃくりゅうしょう | なし | [膀胱尿管逆流（下部尿路の閉塞性尿路疾患による場合を除く。)](https://www.shouman.jp/disease/details/02_18_047/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 614 | Meckel-Gruber症候群 | めっけるぐるーばーしょうこうぐん | なし | なし | ORPHA:564<br>Meckel syndrome<br>**要確認** |  |  |
| 615 | Fraser症候群 | ふれーざーしょうこうぐん | なし | なし | ORPHA:2052<br>Fraser syndrome<br>**要確認** |  |  |
| 616 | Pallister-Hall症候群 | ぱりすたーほーるしょうこうぐん | なし | なし | ORPHA:672<br>Pallister-Hall syndrome<br>**要確認** |  |  |
| 617 | Baraitser-Winter症候群 | ばらいざーうぃんたーしょうこうぐん | なし | なし | ORPHA:2995<br>Baraitser-Winter cerebrofrontofacial syndrome<br>**要確認** |  |  |
| 618 | Donnai-Barrow症候群 | どないばろーしょうこうぐん | なし | なし | ORPHA:2143<br>Donnai-Barrow syndrome<br>**要確認** |  |  |
| 625 | 自己免疫性脳炎（抗NMDA受容体） | じこめんえきせいのうえん | [告示 95 自己免疫性肝炎](https://www.nanbyou.or.jp/entry/113)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | [自己免疫性膵炎](https://www.shouman.jp/disease/details/12_12_036/)<br>[自己免疫性肝炎](https://www.shouman.jp/disease/details/12_07_021/)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | ORPHA:217253<br>NMDA receptor encephalitis<br>**要確認** | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 626 | 抗LGI1抗体関連脳炎 | こうえるじーあいわんこうたいかんれんのうえん | なし | なし | ORPHA:163908<br>OBSOLETE: Limbic encephalitis with LGI1 antibodies<br>**要確認** |  |  |
| 633 | 神経サルコイドーシス | しんけいさるこいどーしす | [告示 84 サルコイドーシス](https://www.nanbyou.or.jp/entry/110)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 639 | 脊髄小脳変性症1型 | せきずいしょうのうへんせいしょういちがた | なし | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98755<br>Spinocerebellar ataxia type 1<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 640 | 脊髄小脳変性症2型 | せきずいしょうのうへんせいしょうにがた | なし | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98756<br>Spinocerebellar ataxia type 2<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 641 | 脊髄小脳変性症7型 | せきずいしょうのうへんせいしょうなながた | なし | [脊髄小脳変性症](https://www.shouman.jp/disease/details/11_30_085/)<br>**要確認**（包含（候補 1 件）） | ORPHA:94147<br>Spinocerebellar ataxia type 7<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 648 | リンパ管腫症 | りんぱかんしゅしょう | [告示 277 リンパ管腫症／ゴーハム病](https://www.nanbyou.or.jp/entry/4636)<br>**要確認**（包含（候補 1 件）） | [リンパ管腫症](https://www.shouman.jp/disease/details/16_01_007/)<br>完全一致 | ORPHA:141209<br>Generalized lymphatic anomaly<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `4ff2fcce5786` |  |
| 650 | Kasabach-Merritt現象 | かさばっはめりっとげんしょう | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/16_03_009/）） | —<br>なし |  | 既知一致と食い違い（小児慢性） |
| 651 | Birt-Hogg-Dubé症候群 | ばーとほっぐでゅべしょうこうぐん | なし | なし | ORPHA:122<br>Birt-Hogg-Dubé syndrome<br>**要確認** |  |  |
| 652 | von Hippel-Lindau病 | ふぉんひっぺるりんどうびょう | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_07_021/）） | ORPHA:892<br>Von Hippel-Lindau disease<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 653 | Li-Fraumeni症候群 | りーふらうめにしょうこうぐん | なし | なし | ORPHA:524<br>Li-Fraumeni syndrome<br>**要確認** |  |  |
| 654 | Cowden症候群 | かうでんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/12_02_012/）） | ORPHA:201<br>Cowden syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 655 | Peutz-Jeghers症候群 | ぽいつじぇーがーすしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/12_02_011/）） | ORPHA:2869<br>Peutz-Jeghers syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 656 | 若年性ポリポーシス症候群 | じゃくねんせいぽりぽーしすしょうこうぐん | なし | [若年性ポリポーシス](https://www.shouman.jp/disease/details/12_02_010/)<br>**要確認**（包含（候補 1 件）） | ORPHA:2929<br>Juvenile polyposis syndrome<br>完全一致 | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 658 | 多発性内分泌腫瘍症2A型 | たはつせいないぶんぴしゅようしょうにえーがた | なし | [多発性内分泌腫瘍2型（シップル（Sipple）症候群）](https://www.shouman.jp/disease/details/05_39_085/)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | ORPHA:247698<br>Multiple endocrine neoplasia type 2A<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 659 | 多発性内分泌腫瘍症2B型 | たはつせいないぶんぴしゅようしょうにびーがた | なし | [多発性内分泌腫瘍2型（シップル（Sipple）症候群）](https://www.shouman.jp/disease/details/05_39_085/)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | ORPHA:247709<br>Multiple endocrine neoplasia type 2B<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 661 | Carney-Stratakis症候群 | かーにーすとらたきすしょうこうぐん | なし | なし | ORPHA:97286<br>Carney-Stratakis syndrome<br>**要確認** |  |  |
| 662 | 遺伝性網膜芽細胞腫 | いでんせいもうまくがさいぼうしゅ | なし | [網膜芽細胞腫](https://www.shouman.jp/disease/details/01_05_029/)<br>**要確認**（包含（候補 1 件）） | ORPHA:357027<br>Hereditary retinoblastoma<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 664 | Baller-Gerold症候群 | ばれーじぇろるどしょうこうぐん | なし | なし | ORPHA:1225<br>Baller-Gerold syndrome<br>**要確認** |  |  |
| 669 | TSH産生下垂体腺腫 | てぃーえすえいちさんせいかすいたいせんしゅ | なし | [下垂体腺腫](https://www.shouman.jp/disease/details/01_06_081/)<br>**要確認**（包含（候補 1 件）） | ORPHA:91347<br>TSH-secreting pituitary adenoma<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 672 | アルギニン血症 | あるぎにんけっしょう | なし | [高アルギニン血症](https://www.shouman.jp/disease/details/08_01_016/)<br>**要確認**（包含（候補 1 件）） | ORPHA:90<br>Argininemia<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 675 | 先天性筋ジストロフィー（メロシン欠損型） | せんてんせいきんじすとろふぃー | [告示 113 筋ジストロフィー](https://www.nanbyou.or.jp/entry/4522)<br>**要確認**（包含（候補 1 件）） | [福山型先天性筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_051/)<br>[メロシン欠損型先天性筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_052/)<br>[ウルリヒ（Ullrich）型先天性筋ジストロフィー（類縁疾患を含む。）](https://www.shouman.jp/disease/details/11_21_053/)<br>**要確認**（包含（候補 3 件）） | ORPHA:258<br>Laminin subunit alpha 2-related congenital muscular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 676 | 先天性副腎皮質過形成症（11β-水酸化酵素欠損型） | せんてんせいふくじんひしつかけいせいしょう | なし | なし | ORPHA:90795<br>Congenital adrenal hyperplasia due to 11-beta-hydroxylase deficiency<br>**要確認** |  |  |
| 677 | 先天性副腎皮質過形成症（17α-水酸化酵素欠損型） | せんてんせいふくじんひしつかけいせいしょう | なし | なし | ORPHA:90793<br>Congenital adrenal hyperplasia due to 17-alpha-hydroxylase deficiency<br>**要確認** |  |  |
| 679 | 性分化疾患（完全型AIS） | せいぶんかしっかん | なし | [卵精巣性性分化疾患](https://www.shouman.jp/disease/details/05_31_066/)<br>[46,XX性分化疾患](https://www.shouman.jp/disease/details/05_31_072/)<br>**要確認**（包含（候補 2 件）） | ORPHA:99429<br>Complete androgen insensitivity syndrome<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 680 | 5α-還元酵素欠損症 | ごあるふぁかんげんこうそけっそんしょう | なし | [5α-還元酵素欠損症](https://www.shouman.jp/disease/details/05_31_068/)<br>完全一致 | ORPHA:753<br>46,XY difference of sex development due to 5-alpha-reductase 2 deficiency<br>**要確認** | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 681 | Swyer症候群 | すわいやーしょうこうぐん | なし | なし | ORPHA:242<br>46,XY complete gonadal dysgenesis<br>**要確認** |  |  |
| 682 | カルマン症候群 | かるまんしょうこうぐん | なし | [カルマン（Kallmann）症候群](https://www.shouman.jp/disease/details/05_29_061/)<br>完全一致 | ORPHA:478<br>Kallmann syndrome<br>**要確認** | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 683 | 遺伝性パントテン酸キナーゼ関連神経変性 | いでんせいぱんとてんさんきなーぜかんれんしんけいへんせい | なし | [パントテン酸キナーゼ関連神経変性症](https://www.shouman.jp/disease/details/11_33_089/)<br>**要確認**（字が近い（最大 0.89。もっとも弱い根拠）） | ORPHA:157850<br>Pantothenate kinase-associated neurodegeneration<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 687 | Woodhouse-Sakati症候群 | うっどはうすさかてぃしょうこうぐん | なし | なし | ORPHA:3464<br>Woodhouse-Sakati syndrome<br>**要確認** |  |  |
| 692 | 遺伝性ジストニア（DYT1） | いでんせいじすとにあ | [告示 120 遺伝性ジストニア](https://www.nanbyou.or.jp/entry/4898)<br>**要確認**（括弧の中身を落とせば一致） | なし | ORPHA:256<br>Early-onset generalized limb-onset dystonia<br>なし | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 693 | ドパ反応性ジストニア | どぱはんのうせいじすとにあ | なし | [瀬川病](https://www.shouman.jp/disease/details/11_32_088/)<br>**要確認**（別名「瀬川病」が一致） | ORPHA:255<br>Dopa-responsive dystonia<br>なし | 小 2026-09-22T12:13 `f34802b36065` |  |
| 699 | 遺伝性多発性外骨腫 | いでんせいたはつせいがいこつしゅ | なし | なし | ORPHA:321<br>Multiple osteochondromas<br>**要確認** |  |  |
| 705 | 18トリソミー | じゅうはちとりそみー | なし | [18トリソミー症候群](https://www.shouman.jp/disease/details/13_01_012/)<br>**要確認**（包含（候補 1 件）） | ORPHA:3380<br>Trisomy 18 syndrome<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 706 | 13トリソミー | じゅうさんとりそみー | なし | [13トリソミー症候群](https://www.shouman.jp/disease/details/13_01_013/)<br>**要確認**（包含（候補 1 件）） | ORPHA:3378<br>Trisomy 13 syndrome<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 708 | 先天性赤芽球癆(一過性) | せんてんせいせきがきゅうろう | [告示 283 後天性赤芽球癆](https://www.nanbyou.or.jp/entry/4450)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | [先天性赤芽球癆（ダイアモンド・ブラックファン（Diamond-Blackfan）貧血）](https://www.shouman.jp/disease/details/09_02_003/)<br>完全一致 | ORPHA:98871<br>Transient erythroblastopenia of childhood<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 710 | 先天性溶血性貧血（不安定ヘモグロビン症） | せんてんせいようけつせいひんけつ | なし | [溶血性貧血（脾機能亢進症によるものに限る。）](https://www.shouman.jp/disease/details/09_09_019/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 711 | 遺伝性血栓性血小板減少性紫斑病 | いでんせいけっせんせいけっしょうばんげんしょうせいしはんびょう | [告示 64 血栓性血小板減少性紫斑病](https://www.nanbyou.or.jp/entry/87)<br>**要確認**（包含（候補 1 件）） | [血栓性血小板減少性紫斑病](https://www.shouman.jp/disease/details/09_14_025/)<br>**要確認**（包含（候補 1 件）） | ORPHA:93583<br>Congenital thrombotic thrombocytopenic purpura<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 712 | 後天性血栓性血小板減少性紫斑病 | こうてんせいけっせんせいけっしょうばんげんしょうせいしはんびょう | [告示 64 血栓性血小板減少性紫斑病](https://www.nanbyou.or.jp/entry/87)<br>**要確認**（包含（候補 1 件）） | [血栓性血小板減少性紫斑病](https://www.shouman.jp/disease/details/09_14_025/)<br>**要確認**（包含（候補 1 件）） | ORPHA:93585<br>Immune-mediated thrombotic thrombocytopenic purpura<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 714 | IgA腎症（重症進行型） | あいじーえいじんしょう | [告示 66 ＩｇＡ腎症](https://www.nanbyou.or.jp/entry/41)<br>**要確認**（括弧の中身を落とせば一致） | [IgA腎症](https://www.shouman.jp/disease/details/02_02_008/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 718 | Alport症候群（X連鎖型） | あるぽーとしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/02_02_013/）） | ORPHA:88917<br>X-linked Alport syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 720 | Denys-Drash症候群 | どにーどらっしゅしょうこうぐん | なし | なし | ORPHA:220<br>Denys-Drash syndrome<br>**要確認** |  |  |
| 721 | Frasier症候群 | ふれいじゃーしょうこうぐん | なし | なし | ORPHA:347<br>Frasier syndrome<br>**要確認** |  |  |
| 722 | ネイルパテラ症候群 | ねいるぱてらしょうこうぐん | なし | [ネイル・パテラ（Nail-Patella）症候群（爪膝蓋症候群）](https://www.shouman.jp/disease/details/02_02_019/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:2614<br>Nail-patella syndrome<br>完全一致 | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 728 | 肝外門脈閉塞症 | かんがいもんみゃくへいそくしょう | [告示 346 原発性肝外門脈閉塞症](https://www.nanbyou.or.jp/entry/28618)<br>**要確認**（包含（候補 1 件）） | なし | —<br>なし | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 729 | 原発性硬化性胆管炎（小児型） | げんぱつせいこうかせいたんかんえん | [告示 94 原発性硬化性胆管炎](https://www.nanbyou.or.jp/entry/3967)<br>**要確認**（括弧の中身を落とせば一致） | [原発性硬化性胆管炎](https://www.shouman.jp/disease/details/12_07_022/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 730 | 先天性肝線維症 | せんてんせいかんせんいしょう | なし | [先天性肝線維症](https://www.shouman.jp/disease/details/12_09_029/)<br>完全一致 | ORPHA:2031<br>Hepatic fibrosis-renal cysts-intellectual disability syndrome<br>**要確認** | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 731 | セリアック病 | せりあっくびょう | なし | なし | ORPHA:555<br>NON RARE IN EUROPE: Celiac disease<br>**要確認** |  |  |
| 733 | 好酸球性消化管疾患（非食道型） | こうさんきゅうせいしょうかかんしっかん | [告示 98 好酸球性消化管疾患](https://www.nanbyou.or.jp/entry/5388)<br>**要確認**（括弧の中身を落とせば一致） | なし | ORPHA:2070<br>Eosinophilic gastroenteritis<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 738 | 先天性微絨毛封入体病 | せんてんせいびじゅうもうふうにゅうたいびょう | なし | [微絨毛封入体病](https://www.shouman.jp/disease/details/12_01_007/)<br>**要確認**（包含（候補 1 件）） | ORPHA:2290<br>Microvillus inclusion disease<br>完全一致 | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 740 | クローン病（小児型重症） | くろーんびょう | [告示 96 クローン病](https://www.nanbyou.or.jp/entry/81)<br>**要確認**（括弧の中身を落とせば一致） | [クローン（Crohn）病](https://www.shouman.jp/disease/details/12_04_015/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 741 | 潰瘍性大腸炎（難治型） | かいようせいだいちょうえん | [告示 97 潰瘍性大腸炎](https://www.nanbyou.or.jp/entry/62)<br>**要確認**（括弧の中身を落とせば一致） | [潰瘍性大腸炎](https://www.shouman.jp/disease/details/12_04_014/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 743 | 先天性肺サーファクタント異常症 | せんてんせいはいさーふぁくたんといじょうしょう | なし | なし | ORPHA:217563<br>Neonatal acute respiratory distress syndrome due to SP-B deficiency<br>**要確認** |  |  |
| 744 | 先天性肺動静脈瘻 | せんてんせいはいどうじょうみゃくろう | なし | [肺動静脈瘻](https://www.shouman.jp/disease/details/04_60_082/)<br>**要確認**（包含（候補 1 件）） | ORPHA:2038<br>Pulmonary arteriovenous malformation<br>完全一致 | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 752 | 遺伝性視神経症（常染色体優性） | いでんせいししんけいしょう | [告示 302 レーベル遺伝性視神経症](https://www.nanbyou.or.jp/entry/4660)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:98672<br>Autosomal dominant optic atrophy<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 753 | 前眼部形成異常（Axenfeld-Rieger症候群） | ぜんがんぶけいせいいじょう | [告示 328 前眼部形成異常](https://www.nanbyou.or.jp/entry/5455)<br>**要確認**（括弧の中身を落とせば一致） | なし | ORPHA:782<br>Axenfeld-Rieger syndrome<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 756 | 先天性無虹彩症 | せんてんせいむこうさいしょう | [告示 329 無虹彩症](https://www.nanbyou.or.jp/entry/5452)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:77<br>OBSOLETE: Aniridia<br>**要確認** | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 759 | 全色盲（CNGA3型） | ぜんしきもう | なし | なし | ORPHA:49382<br>Achromatopsia<br>**要確認** |  |  |
| 761 | Best卵黄状黄斑ジストロフィー | べすとらんおうじょうおうはんじすとろふぃー | [告示 301 黄斑ジストロフィー](https://www.nanbyou.or.jp/entry/4798)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:1243<br>Best vitelliform macular dystrophy<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 762 | 先天性グリコシルホスファチジルイノシトール欠損症 | せんてんせいぐりこしるほすふぁちじるいのしとーるけっそんしょう | [告示 320 けっそんしょう） 先天性グリコシルホスファチジルイノシトール（ＧＰＩ）欠損症](https://www.nanbyou.or.jp/entry/5410)<br>**要確認**（包含（候補 1 件）） | [先天性グリコシルホスファチジルイノシトール（GPI）欠損症](https://www.shouman.jp/disease/details/11_13_035/)<br>完全一致 | ORPHA:352587<br>Focal epilepsy-intellectual disability-cerebro-cerebellar malformation<br>なし | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 764 | KBG症候群 | けーびーじーしょうこうぐん | なし | なし | ORPHA:2332<br>KBG syndrome<br>**要確認** |  |  |
| 765 | Coffin-Lowry症候群 | こふぃんろーりーしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_001/）） | ORPHA:192<br>Coffin-Lowry syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 768 | 先天性魚鱗癬様紅皮症 | せんてんせいぎょりんせんようこうひしょう | [告示 160 先天性魚鱗癬](https://www.nanbyou.or.jp/entry/139)<br>**要確認**（包含（候補 1 件）） | なし | ORPHA:79394<br>Congenital ichthyosiform erythroderma<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 770 | Sjögren-Larsson症候群 | しぇーぐれんらーそんしょうこうぐん | なし | なし | ORPHA:816<br>Sjögren-Larsson syndrome<br>**要確認** |  |  |
| 771 | Netherton症候群 | ねざーとんしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/14_02_005/）） | ORPHA:634<br>Netherton syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 774 | Hailey-Hailey病 | へいりーへいりーびょう | なし | なし | ORPHA:2841<br>Hailey-Hailey disease<br>**要確認** |  |  |
| 777 | 遺伝性痛覚不全症（SCN9A型） | いでんせいつうかくふぜんしょう | なし | なし | ORPHA:217399<br>Congenital insensitivity to pain-hyperhidrosis-absence of cutaneous sensory innervation<br>**要確認** |  |  |
| 778 | 肢端紅痛症（SCN9A型） | したんこうつうしょう | なし | なし | ORPHA:90026<br>Primary erythromelalgia<br>**要確認** |  |  |
| 787 | 先天性副腎皮質過形成症（3β-HSD欠損型） | せんてんせいふくじんひしつかけいせいしょう | なし | なし | ORPHA:90791<br>Congenital adrenal hyperplasia due to 3-beta-hydroxysteroid dehydrogenase deficiency<br>**要確認** |  |  |
| 788 | 視床下部過誤腫（笑い発作てんかん） | ししょうかぶかごしゅ | なし | [視床下部過誤腫症候群](https://www.shouman.jp/disease/details/11_26_073/)<br>**要確認**（包含（候補 1 件）） | ORPHA:86906<br>Gelastic seizures with hypothalamic hamartoma<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 789 | Rasmussen脳炎 | らすむっせんのうえん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_38_099/）） | ORPHA:1929<br>Rasmussen syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 790 | 遺伝性ジスフィブリノゲン血症 | いでんせいじすふぃぶりのげんけっしょう | なし | なし | ORPHA:98881<br>Familial dysfibrinogenemia<br>**要確認** |  |  |
| 791 | 遺伝性第VII因子欠損症 | いでんせいだいなないんしけっそんしょう | なし | なし | ORPHA:327<br>Congenital factor VII deficiency<br>**要確認** |  |  |
| 792 | 遺伝性第X因子欠損症 | いでんせいだいじゅういんしけっそんしょう | なし | なし | ORPHA:328<br>Congenital factor X deficiency<br>**要確認** |  |  |
| 794 | 遺伝性第XIII因子欠損症 | いでんせいだいじゅうさんいんしけっそんしょう | なし | なし | ORPHA:330<br>Congenital factor XII deficiency<br>**要確認** |  |  |
| 796 | Bernard-Soulier症候群 | べるなーるすーりえしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/09_20_032/）） | ORPHA:274<br>Bernard-Soulier syndrome<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 800 | 先天性無フィブリノゲン血症 | せんてんせいむふぃぶりのげんけっしょう | なし | なし | ORPHA:98880<br>Familial afibrinogenemia<br>**要確認** |  |  |
| 801 | 先天性プラスミノゲン欠損症 | せんてんせいぷらすみのげんけっそんしょう | なし | なし | ORPHA:722<br>Hypoplasminogenemia<br>**要確認** |  |  |
| 803 | 第V因子・第VIII因子複合欠損症 | だいごいんしだいはちいんしふくごうけっそんしょう | なし | なし | ORPHA:35909<br>Combined deficiency of factor V and factor VIII<br>**要確認** |  |  |
| 808 | 遺伝性血小板減少症(MYH9関連疾患) | いでんせいけっしょうばんげんしょうしょう | なし | [血小板減少症（脾機能亢進症によるものに限る。）](https://www.shouman.jp/disease/details/09_15_026/)<br>**要確認**（包含（候補 1 件）） | ORPHA:182050<br>MYH9-related syndromic thrombocytopenia<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 809 | X連鎖性血小板減少症 | えっくすれんさせいけっしょうばんげんしょうしょう | なし | [血小板減少症（脾機能亢進症によるものに限る。）](https://www.shouman.jp/disease/details/09_15_026/)<br>**要確認**（包含（候補 1 件）） | —<br>なし | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 811 | ヌーナン症候群様疾患(CBL変異) | ぬーなんしょうこうぐんようしっかん | [告示 195 ヌーナン症候群](https://www.nanbyou.or.jp/entry/4865)<br>**要確認**（包含（候補 1 件）） | [ヌーナン（Noonan）症候群](https://www.shouman.jp/disease/details/05_41_091/)<br>**要確認**（包含（候補 1 件）） | ORPHA:363700<br>Neurofibromatosis type 1 due to NF1 mutation or intragenic deletion<br>なし | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 812 | Legius症候群 | れじうすしょうこうぐん | なし | なし | ORPHA:137605<br>Legius syndrome<br>**要確認** |  |  |
| 813 | Marden-Walker症候群 | まーでんうぉーかーしょうこうぐん | なし | なし | ORPHA:2461<br>Marden-Walker syndrome<br>**要確認** |  |  |
| 814 | Filippi症候群 | ふぃりっぴしょうこうぐん | なし | なし | ORPHA:3255<br>Filippi syndrome<br>**要確認** |  |  |
| 824 | 遺伝性運動ニューロパチー（dHMN） | いでんせいうんどうにゅーろぱちー | なし | [遺伝性運動感覚ニューロパチー](https://www.shouman.jp/disease/details/11_20_046/)<br>**要確認**（字が近い（最大 0.92。もっとも弱い根拠）） | ORPHA:53739<br>Distal hereditary motor neuropathy<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 829 | 先天性大脳白質形成不全症（TUBB4A型） | せんてんせいだいのうはくしつけいせいふぜんしょう | [告示 139 先天性大脳白質形成不全症](https://www.nanbyou.or.jp/entry/4886)<br>**要確認**（括弧の中身を落とせば一致） | [先天性大脳白質形成不全病](https://www.shouman.jp/disease/details/11_09_028/)<br>**要確認**（字が近い（最大 0.92。もっとも弱い根拠）） | ORPHA:139441<br>Hypomyelination with atrophy of basal ganglia and cerebellum<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 830 | 先天性大脳白質形成不全症（SOX10型） | せんてんせいだいのうはくしつけいせいふぜんしょう | [告示 139 先天性大脳白質形成不全症](https://www.nanbyou.or.jp/entry/4886)<br>**要確認**（括弧の中身を落とせば一致） | [先天性大脳白質形成不全病](https://www.shouman.jp/disease/details/11_09_028/)<br>**要確認**（字が近い（最大 0.92。もっとも弱い根拠）） | ORPHA:163746<br>Peripheral demyelinating neuropathy-central dysmyelinating leukodystrophy-Waardenburg syndrome-Hirschsprung disease<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 836 | NARP症候群 | なるぷしょうこうぐん | なし | なし | ORPHA:644<br>NARP syndrome<br>**要確認** |  |  |
| 837 | ミトコンドリアDNA枯渇症候群（肝脳型） | みとこんどりあでぃえぬえーこかつしょうこうぐん | なし | [ミトコンドリアDNA枯渇症候群](https://www.shouman.jp/disease/details/08_04_055/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:254902<br>Renal tubulopathy-encephalopathy-liver failure syndrome<br>なし | 小 2026-09-22T12:12 `400689ca2661` |  |
| 838 | ミトコンドリアDNA枯渇症候群（筋型） | みとこんどりあでぃえぬえーこかつしょうこうぐん | なし | [ミトコンドリアDNA枯渇症候群](https://www.shouman.jp/disease/details/08_04_055/)<br>**要確認**（括弧の中身を落とせば一致） | ORPHA:254875<br>TK2-related mitochondrial DNA maintenance defect, myopathic form<br>**要確認** | 小 2026-09-22T12:12 `400689ca2661` |  |
| 841 | 先天性高乳酸血症（PDH欠損症） | せんてんせいこうにゅうさんけっしょう | なし | なし | ORPHA:765<br>Pyruvate dehydrogenase deficiency<br>**要確認** |  |  |
| 842 | 先天性高乳酸血症（PC欠損症） | せんてんせいこうにゅうさんけっしょう | なし | [ピルビン酸カルボキシラーゼ欠損症](https://www.shouman.jp/disease/details/08_04_051/)<br>**要確認**（別名「ピルビン酸カルボキシラーゼ欠損症」が一致） | ORPHA:3008<br>Pyruvate carboxylase deficiency<br>なし | 小 2026-09-22T12:12 `400689ca2661` |  |
| 843 | 複合体I欠損症 | ふくごうたいいちけっそんしょう | なし | なし | ORPHA:2609<br>Isolated complex I deficiency<br>**要確認** |  |  |
| 849 | 先天性葉酸吸収不全 | せんてんせいようさんきゅうしゅうふぜん | [告示 253 先天性葉酸吸収不全](https://www.nanbyou.or.jp/entry/4822)<br>完全一致 | [先天性葉酸吸収不全症](https://www.shouman.jp/disease/details/08_10_120/)<br>**要確認**（包含（候補 1 件）） | ORPHA:90045<br>Hereditary folate malabsorption<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 854 | ピリドキサミン5リン酸酸化酵素欠損症 | ぴりどきさみんごりんさんさんかこうそけっそんしょう | なし | なし | ORPHA:79096<br>Pyridoxamine-5-phosphate deficiency-developmental and epileptic encephalopathy<br>**要確認** |  |  |
| 859 | 新生児重症副甲状腺機能亢進症 | しんせいじじゅうしょうふくこうじょうせんきのうこうしんしょう | なし | [甲状腺機能亢進症（バセドウ（Basedow）病を除く。）](https://www.shouman.jp/disease/details/05_10_016/)<br>[副甲状腺機能亢進症](https://www.shouman.jp/disease/details/05_14_026/)<br>**要確認**（包含（候補 2 件）） | ORPHA:417<br>Neonatal severe primary hyperparathyroidism<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 860 | 先天性副甲状腺機能低下症(GCM2型) | せんてんせいふくこうじょうせんきのうていかしょう | [告示 235 副甲状腺機能低下症](https://www.nanbyou.or.jp/entry/4426)<br>**要確認**（包含（候補 1 件）） | [副甲状腺機能低下症（副甲状腺欠損症を除く。）](https://www.shouman.jp/disease/details/05_15_028/)<br>**要確認**（包含（候補 1 件）） | ORPHA:2238<br>Familial isolated hypoparathyroidism<br>**要確認** | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 862 | 遺伝性低カリウム性周期性四肢麻痺 | いでんせいていかりうむせいしゅうきせいししまひ | なし | [遺伝性低カリウム性周期性四肢麻痺](https://www.shouman.jp/disease/details/11_24_064/)<br>完全一致 | ORPHA:681<br>Hypokalemic periodic paralysis<br>**要確認** | 小 2026-09-22T12:13 `f34802b36065` |  |
| 866 | Schwartz-Jampel症候群 | しゅわるつやんぺるしょうこうぐん | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/11_25_065/）） | ORPHA:800<br>Schwartz-Jampel syndrome<br>完全一致 |  | 既知一致と食い違い（小児慢性） |
| 871 | LMNA関連肢帯型筋ジストロフィー | えるえむえぬえーかんれんしたいがたきんじすとろふぃー | なし | [肢帯型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_049/)<br>**要確認**（包含（候補 1 件）） | ORPHA:98853<br>Autosomal dominant Emery-Dreifuss muscular dystrophy<br>なし | 小 2026-09-22T12:13 `f34802b36065` |  |
| 872 | FKRP関連肢帯型筋ジストロフィー | えふけーあーるぴーかんれんしたいがたきんじすとろふぃー | なし | [肢帯型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_049/)<br>**要確認**（包含（候補 1 件）） | ORPHA:34515<br>FKRP-related limb-girdle muscular dystrophy R9<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 873 | Calpain3関連肢帯型筋ジストロフィー | かるぱいんすりーかんれんしたいがたきんじすとろふぃー | なし | [肢帯型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_049/)<br>**要確認**（包含（候補 1 件）） | ORPHA:267<br>Calpain-3-related limb-girdle muscular dystrophy R1<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 874 | Dysferlin関連肢帯型筋ジストロフィー | じすふぇるりんかんれんしたいがたきんじすとろふぃー | なし | [肢帯型筋ジストロフィー](https://www.shouman.jp/disease/details/11_21_049/)<br>**要確認**（包含（候補 1 件）） | ORPHA:268<br>Dysferlin-related limb-girdle muscular dystrophy R2<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 877 | SELENON関連ミオパチー | せれのんかんれんみおぱちー | なし | なし | ORPHA:97244<br>Rigid spine syndrome<br>**要確認** |  |  |
| 878 | DNM2関連中心核ミオパチー | でぃーえぬえむつーかんれんちゅうしんかくみおぱちー | なし | なし | ORPHA:169186<br>Autosomal recessive centronuclear myopathy<br>**要確認** |  |  |
| 879 | BIN1関連中心核ミオパチー | びーあいえぬわんかんれんちゅうしんかくみおぱちー | なし | なし | ORPHA:169189<br>Autosomal dominant centronuclear myopathy<br>**要確認** |  |  |
| 880 | TTN関連ミオパチー | てぃーてぃーえぬかんれんみおぱちー | なし | なし | ORPHA:609<br>Tibial muscular dystrophy<br>**要確認** |  |  |
| 891 | 先天性筋無力症候群（CHAT型） | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 892 | 先天性筋無力症候群（COLQ型） | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 893 | 先天性筋無力症候群（Rapsyn型） | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 894 | 先天性筋無力症候群（SYT2型） | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 895 | 先天性筋無力症候群（GFPT1型） | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 900 | 先天性無痛症（HSAN V型） | せんてんせいむつうしょう | [告示 130 先天性無痛無汗症](https://www.nanbyou.or.jp/entry/4360)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | [先天性無痛無汗症](https://www.shouman.jp/disease/details/11_20_045/)<br>**要確認**（字が近い（最大 0.86。もっとも弱い根拠）） | ORPHA:64752<br>Hereditary sensory and autonomic neuropathy type 5<br>なし | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 910 | 全身性カルニチン欠乏症 | ぜんしんせいかるにちんけつぼうしょう | なし | [全身性カルニチン欠損症](https://www.shouman.jp/disease/details/08_03_040/)<br>**要確認**（字が近い（最大 0.91。もっとも弱い根拠）） | ORPHA:158<br>Systemic primary carnitine deficiency<br>**要確認** | 小 2026-09-22T12:12 `400689ca2661` |  |
| 911 | カルニチンパルミトイルトランスフェラーゼ1A欠損症 | かるにちんぱるみといるとらんすふぇらーぜわんえーけっそんしょう | なし | [カルニチンパルミトイルトランスフェラーゼⅠ欠損症](https://www.shouman.jp/disease/details/08_03_041/)<br>[カルニチンパルミトイルトランスフェラーゼⅡ欠損症](https://www.shouman.jp/disease/details/08_03_042/)<br>**要確認**（字が近い（最大 0.94。もっとも弱い根拠）） | ORPHA:156<br>Carnitine palmitoyl transferase 1A deficiency<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 912 | 3-メチルグルタコン酸尿症（Barth型以外） | さんめちるぐるたこんさんにょうしょう | [告示 324 メチルグルタコン酸尿症](https://www.nanbyou.or.jp/entry/5449)<br>**要確認**（包含（候補 1 件）） | [メチルグルタコン酸尿症](https://www.shouman.jp/disease/details/08_02_028/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 914 | チロシン血症1型 | ちろしんけっしょういちがた | [告示 241 高チロシン血症１型](https://www.nanbyou.or.jp/entry/4690)<br>**要確認**（包含（候補 1 件）） | [高チロシン血症１型](https://www.shouman.jp/disease/details/08_01_002/)<br>**要確認**（包含（候補 1 件）） | ORPHA:882<br>Tyrosinemia type 1<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 915 | チロシン血症2型 | ちろしんけっしょうにがた | [告示 242 高チロシン血症２型](https://www.nanbyou.or.jp/entry/4693)<br>**要確認**（包含（候補 1 件）） | [高チロシン血症２型](https://www.shouman.jp/disease/details/08_01_003/)<br>**要確認**（包含（候補 1 件）） | ORPHA:28378<br>Tyrosinemia type 2<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 916 | 先天性胆汁酸合成異常症(3β-HSD型) | せんてんせいたんじゅうさんごうせいいじょうしょう | なし | なし | ORPHA:485631<br>Congenital bile acid synthesis defect<br>**要確認** |  |  |
| 918 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | ぺるおきしそーむけいせいいじょうしょうけいしょうがた | なし | [ペルオキシソーム形成異常症](https://www.shouman.jp/disease/details/08_07_103/)<br>**要確認**（包含（候補 1 件）） | ORPHA:772<br>Infantile Refsum disease<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 919 | D-bifunctional protein欠損症 | でぃーばいふぁんくしょなるぷろていんけっそんしょう | なし | なし | ORPHA:300<br>Bifunctional enzyme deficiency<br>**要確認** |  |  |
| 920 | 先天性横隔膜ヘルニア（Morgagni型） | せんてんせいおうかくまくへるにあ | [告示 294 先天性横隔膜ヘルニア](https://www.nanbyou.or.jp/entry/4510)<br>**要確認**（括弧の中身を落とせば一致） | [先天性横隔膜ヘルニア](https://www.shouman.jp/disease/details/03_11_013/)<br>**要確認**（括弧の中身を落とせば一致） | —<br>なし | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 930 | Pfeiffer症候群1型 | ふぁいふぁーしょうこうぐんいちがた | なし | <br>**要確認**（一致なし ／ 既知一致と食い違い（readings.json: https://www.shouman.jp/disease/details/13_01_025/）） | ORPHA:93258<br>Pfeiffer syndrome type 1<br>**要確認** |  | 既知一致と食い違い（小児慢性） |
| 936 | 網膜色素変性症(X連鎖性) | もうまくしきそへんせいしょう | [告示 90 網膜色素変性症](https://www.nanbyou.or.jp/entry/196)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 937 | 網膜色素変性症(常染色体劣性RHO以外) | もうまくしきそへんせいしょう | [告示 90 網膜色素変性症](https://www.nanbyou.or.jp/entry/196)<br>**要確認**（括弧の中身を落とせば一致） | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 944 | Pendred症候群 | ぺんどれっどしょうこうぐん | なし | なし | ORPHA:705<br>Pendred syndrome<br>**要確認** |  |  |
| 947 | 鰓耳腎症候群 | さいじじんしょうこうぐん | [告示 190 鰓耳腎症候群](https://www.nanbyou.or.jp/entry/4387)<br>完全一致 | [鰓耳腎症候群](https://www.shouman.jp/disease/details/02_17_044/)<br>完全一致 | ORPHA:107<br>BOR syndrome<br>**要確認** | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |

## 4. 要確認を含まない行（完全一致のみ、またはなし混じり）

434 件。機械判定では確定しているが、**確認はされていない**。

| idx | 病名 | ふりがな | 難病情報センター | 小児慢性 | Orphanet | 取得（日時・本文SHA-256先頭） | 備考 |
|---:|---|---|---|---|---|---|---|
| 0 | ファブリー病 | ふぁぶりーびょう | なし | [ファブリー（Fabry）病](https://www.shouman.jp/disease/details/08_06_091/)<br>完全一致 | ORPHA:324<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 1 | ムコ多糖症I型 | むこたとうしょういちがた | なし | [ムコ多糖症Ⅰ型](https://www.shouman.jp/disease/details/08_06_075/)<br>完全一致 | ORPHA:579<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 2 | ムコ多糖症II型 | むこたとうしょうにがた | なし | [ムコ多糖症Ⅱ型](https://www.shouman.jp/disease/details/08_06_076/)<br>完全一致 | ORPHA:580<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 3 | ゴーシェ病 | ごーしぇびょう | なし | [ゴーシェ（Gaucher）病](https://www.shouman.jp/disease/details/08_06_090/)<br>完全一致 | ORPHA:355<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 4 | ポンペ病 | ぽんぺびょう | なし | [ポンペ（Pompe）病](https://www.shouman.jp/disease/details/08_06_097/)<br>完全一致 | ORPHA:365<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 6 | メチルマロン酸血症 | めちるまろんさんけっしょう | [告示 246 メチルマロン酸血症](https://www.nanbyou.or.jp/entry/4859)<br>完全一致 | [メチルマロン酸血症](https://www.shouman.jp/disease/details/08_02_023/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 8 | 軟骨無形成症 | なんこつむけいせいしょう | [告示 276 軟骨無形成症](https://www.nanbyou.or.jp/entry/4570)<br>完全一致 | [軟骨無形成症](https://www.shouman.jp/disease/details/15_02_002/)<br>完全一致 | ORPHA:15<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 10 | 血栓性血小板減少性紫斑病 | けっせんせいけっしょうばんげんしょうせいしはんびょう | [告示 64 血栓性血小板減少性紫斑病](https://www.nanbyou.or.jp/entry/87)<br>完全一致 | [血栓性血小板減少性紫斑病](https://www.shouman.jp/disease/details/09_14_025/)<br>完全一致 | ORPHA:54057<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 13 | MELAS症候群 | めらすしょうこうぐん | なし | なし | ORPHA:550<br>完全一致 |  |  |
| 14 | 脊髄性筋萎縮症 | せきずいせいきんいしゅくしょう | [告示 3 脊髄性筋萎縮症](https://www.nanbyou.or.jp/entry/135)<br>完全一致 | [脊髄性筋萎縮症](https://www.shouman.jp/disease/details/11_19_044/)<br>完全一致 | ORPHA:70<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 15 | 遺伝性ATTR型アミロイドーシス | いでんせいえーてぃーてぃーあーるがたあみろいどーしす | なし | なし | ORPHA:271861<br>完全一致 |  |  |
| 17 | 血友病A | けつゆうびょうえー | なし | [血友病Ａ](https://www.shouman.jp/disease/details/09_21_040/)<br>完全一致 | ORPHA:98878<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 18 | 発作性夜間ヘモグロビン尿症 | ほっさせいやかんへもぐろびんにょうしょう | [告示 62 発作性夜間ヘモグロビン尿症](https://www.nanbyou.or.jp/entry/3783)<br>完全一致 | [発作性夜間ヘモグロビン尿症](https://www.shouman.jp/disease/details/09_07_010/)<br>完全一致 | ORPHA:447<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 19 | 非典型溶血性尿毒症症候群 | ひてんけいようけつせいにょうどくしょうしょうこうぐん | [告示 109 非典型溶血性尿毒症症候群](https://www.nanbyou.or.jp/entry/3846)<br>完全一致 | [非典型溶血性尿毒症症候群](https://www.shouman.jp/disease/details/02_02_018/)<br>完全一致 | ORPHA:2134<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 21 | X連鎖性低リン血症性くる病 | えっくすれんさせいていりんけっしょうせいくるびょう | なし | なし | ORPHA:89936<br>完全一致 |  |  |
| 22 | 低ホスファターゼ症 | ていほすふぁたーぜしょう | [告示 172 低ホスファターゼ症](https://www.nanbyou.or.jp/entry/4564)<br>完全一致 | [低ホスファターゼ症](https://www.shouman.jp/disease/details/15_02_006/)<br>完全一致 | ORPHA:436<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 23 | レーベル先天性黒内障 | れーべるせんてんせいこくないしょう | なし | なし | ORPHA:65<br>完全一致 |  |  |
| 24 | プリオン病 | ぷりおんびょう | [告示 23 プリオン病](https://www.nanbyou.or.jp/entry/5370)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 28 | 全身性エリテマトーデス | ぜんしんせいえりてまとーです | [告示 49 全身性エリテマトーデス](https://www.nanbyou.or.jp/entry/53)<br>完全一致 | [全身性エリテマトーデス](https://www.shouman.jp/disease/details/06_01_002/)<br>完全一致 | ORPHA:536<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 31 | パーキンソン病 | ぱーきんそんびょう | [告示 6 パーキンソン病](https://www.nanbyou.or.jp/entry/169)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 32 | 重症筋無力症 | じゅうしょうきんむりょくしょう | [告示 11 重症筋無力症](https://www.nanbyou.or.jp/entry/120)<br>完全一致 | [重症筋無力症](https://www.shouman.jp/disease/details/11_44_105/)<br>完全一致 | ORPHA:589<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 34 | 全身性強皮症 | ぜんしんせいきょうひしょう | [告示 51 全身性強皮症](https://www.nanbyou.or.jp/entry/4026)<br>完全一致 | [全身性強皮症](https://www.shouman.jp/disease/details/06_04_013/)<br>完全一致 | ORPHA:90291<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 35 | 皮膚筋炎 | ひふきんえん | なし | なし | ORPHA:221<br>完全一致 |  |  |
| 36 | サルコイドーシス | さるこいどーしす | [告示 84 サルコイドーシス](https://www.nanbyou.or.jp/entry/110)<br>完全一致 | なし | ORPHA:797<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 37 | 結節性多発動脈炎 | けっせつせいたはつどうみゃくえん | [告示 42 結節性多発動脈炎](https://www.nanbyou.or.jp/entry/85)<br>完全一致 | なし | ORPHA:767<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 38 | ANCA関連血管炎 | あんかかんれんけっかんえん | なし | なし | ORPHA:156152<br>完全一致 |  |  |
| 39 | IgA腎症 | あいじーえいじんしょう | [告示 66 ＩｇＡ腎症](https://www.nanbyou.or.jp/entry/41)<br>完全一致 | [IgA腎症](https://www.shouman.jp/disease/details/02_02_008/)<br>完全一致 | ORPHA:34145<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 40 | 特発性肺線維症 | とくはつせいはいせんいしょう | なし | なし | ORPHA:2032<br>完全一致 |  |  |
| 41 | 特発性血小板減少性紫斑病 | とくはつせいけっしょうばんげんしょうせいしはんびょう | なし | なし | ORPHA:3002<br>完全一致 |  |  |
| 43 | 骨髄異形成症候群 | こつずいいけいせいしょうこうぐん | なし | [骨髄異形成症候群](https://www.shouman.jp/disease/details/01_02_017/)<br>完全一致 | ORPHA:52<br>Alagille syndrome<br>なし | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 51 | 結節性硬化症 | けっせつせいこうかしょう | [告示 158 結節性硬化症](https://www.nanbyou.or.jp/entry/4384)<br>完全一致 | [結節性硬化症](https://www.shouman.jp/disease/details/11_07_018/)<br>完全一致 | ORPHA:805<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 54 | 嚢胞性線維症 | のうほうせいせんいしょう | [告示 299 嚢胞性線維症](https://www.nanbyou.or.jp/entry/4531)<br>完全一致 | [嚢胞性線維症](https://www.shouman.jp/disease/details/03_06_008/)<br>完全一致 | ORPHA:586<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 55 | 22q11.2欠失症候群 | にじゅうにきゅういちいちてんにけっしつしょうこうぐん | [告示 203 22q11.2欠失症候群](https://www.nanbyou.or.jp/entry/5317)<br>完全一致 | なし | ORPHA:567<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951` |  |
| 56 | 筋強直性ジストロフィー | きんきょうちょくせいじすとろふぃー | なし | なし | ORPHA:206647<br>完全一致 |  |  |
| 57 | 先天性副腎過形成 | せんてんせいふくじんかけいせい | なし | なし | ORPHA:418<br>完全一致 |  |  |
| 58 | 先天性甲状腺機能低下症 | せんてんせいこうじょうせんきのうていかしょう | なし | なし | ORPHA:442<br>完全一致 |  |  |
| 59 | 成長ホルモン分泌不全性低身長症 | せいちょうほるもんぶんぴふぜんせいていしんちょうしょう | なし | [成長ホルモン（GH）分泌不全性低身長症（脳の器質的原因によるものに限る。）](https://www.shouman.jp/disease/details/05_04_005/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 60 | 特発性大腿骨頭壊死症 | とくはつせいだいたいこっとうえししょう | [告示 71 特発性大腿骨頭壊死症](https://www.nanbyou.or.jp/entry/160)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 61 | もやもや病 | もやもやびょう | [告示 22 もやもや病](https://www.nanbyou.or.jp/entry/47)<br>完全一致 | [もやもや病](https://www.shouman.jp/disease/details/11_16_041/)<br>完全一致 | ORPHA:2573<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 62 | 川崎病 | かわさきびょう | なし | なし | ORPHA:2331<br>完全一致 |  |  |
| 65 | 原発性胆汁性胆管炎 | げんぱつせいたんじゅうせいたんかんえん | [告示 93 原発性胆汁性胆管炎](https://www.nanbyou.or.jp/entry/93)<br>完全一致 | なし | ORPHA:186<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 66 | 自己免疫性肝炎 | じこめんえきせいかんえん | [告示 95 自己免疫性肝炎](https://www.nanbyou.or.jp/entry/113)<br>完全一致 | [自己免疫性肝炎](https://www.shouman.jp/disease/details/12_07_021/)<br>完全一致 | ORPHA:2137<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 67 | ミトコンドリア病 | みとこんどりあびょう | [告示 21 ミトコンドリア病](https://www.nanbyou.or.jp/entry/194)<br>完全一致 | なし | ORPHA:68380<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 68 | ライソゾーム病 | らいそぞーむびょう | [告示 19 ライソゾーム病](https://www.nanbyou.or.jp/entry/4063)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 69 | 副腎白質ジストロフィー | ふくじんはくしつじすとろふぃー | [告示 20 副腎白質ジストロフィー](https://www.nanbyou.or.jp/entry/186)<br>完全一致 | [副腎白質ジストロフィー](https://www.shouman.jp/disease/details/08_07_104/)<br>完全一致 | ORPHA:43<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 70 | 色素性乾皮症 | しきそせいかんぴしょう | [告示 159 色素性乾皮症](https://www.nanbyou.or.jp/entry/112)<br>完全一致 | [色素性乾皮症](https://www.shouman.jp/disease/details/14_05_010/)<br>完全一致 | ORPHA:910<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 72 | 筋萎縮性側索硬化症 | きんいしゅくせいそくさくこうかしょう | [告示 2 筋萎縮性側索硬化症](https://www.nanbyou.or.jp/entry/52)<br>完全一致 | なし | ORPHA:803<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 74 | 多系統萎縮症 | たけいとういしゅくしょう | [告示 17 多系統萎縮症](https://www.nanbyou.or.jp/entry/5365)<br>完全一致 | なし | ORPHA:102<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 75 | 進行性核上性麻痺 | しんこうせいかくじょうせいまひ | [告示 5 進行性核上性麻痺](https://www.nanbyou.or.jp/entry/4114)<br>完全一致 | なし | ORPHA:683<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 76 | 大脳皮質基底核変性症 | だいのうひしつきていかくへんせいしょう | [告示 7 大脳皮質基底核変性症](https://www.nanbyou.or.jp/entry/142)<br>完全一致 | なし | ORPHA:2098<br>Acromesomelic dysplasia, Grebe type<br>なし | 難 2026-09-22T12:11 `3211b238981c` |  |
| 79 | ギラン・バレー症候群 | ぎらんばれーしょうこうぐん | なし | なし | ORPHA:2103<br>完全一致 |  |  |
| 82 | 肺動脈性肺高血圧症 | はいどうみゃくせいはいこうけつあつしょう | [告示 86 肺動脈性肺高血圧症](https://www.nanbyou.or.jp/entry/171)<br>完全一致 | [肺動脈性肺高血圧症](https://www.shouman.jp/disease/details/04_61_085/)<br>完全一致 | ORPHA:182090<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 85 | 拘束型心筋症 | こうそくがたしんきんしょう | [告示 59 拘束型心筋症](https://www.nanbyou.or.jp/entry/100)<br>完全一致 | [拘束型心筋症](https://www.shouman.jp/disease/details/04_16_020/)<br>完全一致 | ORPHA:217632<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 87 | シスチン症 | しすちんしょう | なし | [シスチン症](https://www.shouman.jp/disease/details/08_06_099/)<br>完全一致 | ORPHA:213<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 88 | ホモシスチン尿症 | ほもしすちんにょうしょう | [告示 337 ホモシスチン尿症](https://www.nanbyou.or.jp/entry/22375)<br>完全一致 | [ホモシスチン尿症](https://www.shouman.jp/disease/details/08_01_008/)<br>完全一致 | ORPHA:394<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 89 | メープルシロップ尿症 | めーぷるしろっぷにょうしょう | [告示 244 メープルシロップ尿症](https://www.nanbyou.or.jp/entry/4813)<br>完全一致 | [メープルシロップ尿症](https://www.shouman.jp/disease/details/08_01_007/)<br>完全一致 | ORPHA:511<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 90 | ガラクトース血症 | がらくとーすけっしょう | なし | なし | ORPHA:352<br>完全一致 |  |  |
| 91 | 糖原病 | とうげんびょう | なし | なし | ORPHA:79201<br>完全一致 |  |  |
| 93 | 血友病B | けつゆうびょうびー | なし | [血友病Ｂ](https://www.shouman.jp/disease/details/09_21_041/)<br>完全一致 | ORPHA:98879<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 94 | フォン・ヴィレブランド病 | ふぉんゔぃれぶらんどびょう | なし | なし | ORPHA:903<br>完全一致 |  |  |
| 98 | 混合性結合組織病 | こんごうせいけつごうそしきびょう | [告示 52 混合性結合組織病](https://www.nanbyou.or.jp/entry/105)<br>完全一致 | [混合性結合組織病](https://www.shouman.jp/disease/details/06_04_014/)<br>完全一致 | ORPHA:809<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 99 | 好酸球性多発血管炎性肉芽腫症 | こうさんきゅうせいたはつけっかんえんせいにくげしゅしょう | [告示 45 好酸球性多発血管炎性肉芽腫症](https://www.nanbyou.or.jp/entry/3877)<br>完全一致 | [好酸球性多発血管炎性肉芽腫症](https://www.shouman.jp/disease/details/06_02_011/)<br>完全一致 | ORPHA:183<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 100 | 巨細胞性動脈炎 | きょさいぼうせいどうみゃくえん | [告示 41 巨細胞性動脈炎](https://www.nanbyou.or.jp/entry/3928)<br>完全一致 | なし | ORPHA:397<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 101 | IgG4関連疾患 | あいじーじーふぉーかんれんしっかん | [告示 300 IgG4関連疾患](https://www.nanbyou.or.jp/entry/4504)<br>完全一致 | なし | ORPHA:284264<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 104 | 原発性硬化性胆管炎 | げんぱつせいこうかせいたんかんえん | [告示 94 原発性硬化性胆管炎](https://www.nanbyou.or.jp/entry/3967)<br>完全一致 | [原発性硬化性胆管炎](https://www.shouman.jp/disease/details/12_07_022/)<br>完全一致 | ORPHA:171<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 105 | 好酸球性消化管疾患 | こうさんきゅうせいしょうかかんしっかん | [告示 98 好酸球性消化管疾患](https://www.nanbyou.or.jp/entry/5388)<br>完全一致 | なし | ORPHA:402029<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 108 | 進行性骨化性線維異形成症 | しんこうせいこっかせいせんいいけいせいしょう | [告示 272 進行性骨化性線維異形成症](https://www.nanbyou.or.jp/entry/54)<br>完全一致 | [進行性骨化性線維異形成症](https://www.shouman.jp/disease/details/15_02_014/)<br>完全一致 | ORPHA:337<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 109 | 骨形成不全症 | こつけいせいふぜんしょう | [告示 274 骨形成不全症](https://www.nanbyou.or.jp/entry/4567)<br>完全一致 | [骨形成不全症](https://www.shouman.jp/disease/details/15_02_005/)<br>完全一致 | ORPHA:666<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 110 | 網膜色素変性症 | もうまくしきそへんせいしょう | [告示 90 網膜色素変性症](https://www.nanbyou.or.jp/entry/196)<br>完全一致 | なし | ORPHA:791<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 117 | 先端巨大症 | せんたんきょだいしょう | なし | [先端巨大症](https://www.shouman.jp/disease/details/05_03_004/)<br>完全一致 | ORPHA:963<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 118 | 下垂体前葉機能低下症 | かすいたいぜんようきのうていかしょう | [告示 78 下垂体前葉機能低下症](https://www.nanbyou.or.jp/entry/4017)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 122 | ナルコレプシー | なるこれぷしー | なし | なし | ORPHA:619284<br>完全一致 |  |  |
| 123 | 慢性骨髄性白血病 | まんせいこつずいせいはっけつびょう | なし | [慢性骨髄性白血病](https://www.shouman.jp/disease/details/01_01_013/)<br>完全一致 | ORPHA:521<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 124 | 慢性リンパ性白血病 | まんせいりんぱせいはっけつびょう | なし | なし | ORPHA:67038<br>完全一致 |  |  |
| 126 | 本態性血小板血症 | ほんたいせいけっしょうばんけっしょう | なし | [本態性血小板血症](https://www.shouman.jp/disease/details/09_19_031/)<br>完全一致 | ORPHA:3318<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 127 | 真性多血症 | しんせいたけつしょう | なし | [真性多血症](https://www.shouman.jp/disease/details/09_11_021/)<br>完全一致 | ORPHA:729<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 129 | 多発性骨髄腫 | たはつせいこつずいしゅ | なし | なし | ORPHA:29073<br>完全一致 |  |  |
| 132 | 多巣性運動ニューロパチー | たそうせいうんどうにゅーろぱちー | なし | なし | ORPHA:641<br>完全一致 |  |  |
| 134 | 再発性多発軟骨炎 | さいはつせいたはつなんこつえん | [告示 55 再発性多発軟骨炎](https://www.nanbyou.or.jp/entry/3856)<br>完全一致 | [再発性多発軟骨炎](https://www.shouman.jp/disease/details/06_03_012/)<br>完全一致 | ORPHA:728<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 137 | 副甲状腺機能亢進症 | ふくこうじょうせんきのうこうしんしょう | なし | [副甲状腺機能亢進症](https://www.shouman.jp/disease/details/05_14_026/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 139 | 中枢性尿崩症 | ちゅうすうせいにょうほうしょう | なし | [中枢性尿崩症](https://www.shouman.jp/disease/details/05_08_011/)<br>完全一致 | ORPHA:178029<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 140 | ムコ多糖症III型 | むこたとうしょうさんがた | なし | [ムコ多糖症Ⅲ型](https://www.shouman.jp/disease/details/08_06_077/)<br>完全一致 | ORPHA:581<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 141 | ムコ多糖症IV型 | むこたとうしょうよんがた | なし | [ムコ多糖症Ⅳ型](https://www.shouman.jp/disease/details/08_06_078/)<br>完全一致 | ORPHA:582<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 142 | ムコ多糖症VI型 | むこたとうしょうろくがた | なし | [ムコ多糖症Ⅵ型](https://www.shouman.jp/disease/details/08_06_079/)<br>完全一致 | ORPHA:583<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 143 | 酸性スフィンゴミエリナーゼ欠損症 | さんせいすふぃんごみえりなーぜけっそんしょう | なし | なし | ORPHA:618899<br>完全一致 |  |  |
| 146 | 短腸症候群 | たんちょうしょうこうぐん | なし | なし | ORPHA:104008<br>完全一致 |  |  |
| 147 | X連鎖無ガンマグロブリン血症 | えっくすれんさむがんまぐろぶりんけっしょう | なし | [X連鎖無ガンマグロブリン血症](https://www.shouman.jp/disease/details/10_03_023/)<br>完全一致 | ORPHA:47<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 149 | 網膜芽細胞腫 | もうまくがさいぼうしゅ | なし | [網膜芽細胞腫](https://www.shouman.jp/disease/details/01_05_029/)<br>完全一致 | ORPHA:790<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 150 | 封入体筋炎 | ふうにゅうたいきんえん | [告示 15 封入体筋炎](https://www.nanbyou.or.jp/entry/3801)<br>完全一致 | なし | ORPHA:611<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 151 | ループス腎炎 | るーぷすじんえん | なし | [ループス腎炎](https://www.shouman.jp/disease/details/02_02_015/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 152 | 消化管間質腫瘍 | しょうかかんかんしつしゅよう | なし | なし | ORPHA:44890<br>完全一致 |  |  |
| 154 | 先天性プロテインC欠乏症 | せんてんせいぷろていんしーけつぼうしょう | なし | [先天性プロテインC欠乏症](https://www.shouman.jp/disease/details/09_22_048/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 156 | オルニチントランスカルバミラーゼ欠損症 | おるにちんとらんすかるばみらーぜけっそんしょう | なし | [オルニチントランスカルバミラーゼ欠損症](https://www.shouman.jp/disease/details/08_01_013/)<br>完全一致 | ORPHA:664<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 157 | プロピオン酸血症 | ぷろぴおんさんけっしょう | [告示 245 プロピオン酸血症](https://www.nanbyou.or.jp/entry/5323)<br>完全一致 | [プロピオン酸血症](https://www.shouman.jp/disease/details/08_02_024/)<br>完全一致 | ORPHA:35<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 160 | グルタル酸血症1型 | ぐるたるさんけっしょういちがた | [告示 249 グルタル酸血症１型](https://www.nanbyou.or.jp/entry/4831)<br>完全一致 | [グルタル酸血症１型](https://www.shouman.jp/disease/details/08_02_033/)<br>完全一致 | ORPHA:25<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 161 | イソ吉草酸血症 | いそきっそうさんけっしょう | [告示 247 イソ吉草酸血症](https://www.nanbyou.or.jp/entry/4816)<br>完全一致 | [イソ吉草酸血症](https://www.shouman.jp/disease/details/08_02_026/)<br>完全一致 | ORPHA:33<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 162 | 極長鎖アシルCoA脱水素酵素欠損症 | ごくちょうさあしるこえーだっすいそこうそけっそんしょう | [告示 344 極長鎖アシル-CoA 脱水素酵素欠損症](https://www.nanbyou.or.jp/entry/28612)<br>完全一致 | [極長鎖アシルCoA脱水素酵素欠損症](https://www.shouman.jp/disease/details/08_03_044/)<br>完全一致 | ORPHA:26793<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 163 | ビオチニダーゼ欠損症 | びおちにだーぜけっそんしょう | なし | なし | ORPHA:79241<br>完全一致 |  |  |
| 168 | 亜急性硬化性全脳炎 | あきゅうせいこうかせいぜんのうえん | [告示 24 亜急性硬化性全脳炎](https://www.nanbyou.or.jp/entry/42)<br>完全一致 | [亜急性硬化性全脳炎](https://www.shouman.jp/disease/details/11_37_098/)<br>完全一致 | ORPHA:2806<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 172 | 家族性地中海熱 | かぞくせいちちゅうかいねつ | [告示 266 家族性地中海熱](https://www.nanbyou.or.jp/entry/4447)<br>完全一致 | [家族性地中海熱](https://www.shouman.jp/disease/details/06_05_015/)<br>完全一致 | ORPHA:342<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 174 | クリオピリン関連周期熱症候群 | くりおぴりんかんれんしゅうきねつしょうこうぐん | [告示 106 クリオピリン関連周期熱症候群](https://www.nanbyou.or.jp/entry/3994)<br>完全一致 | [クリオピリン関連周期熱症候群](https://www.shouman.jp/disease/details/06_05_016/)<br>完全一致 | ORPHA:208650<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:12 `b8ecfc31a247` |  |
| 176 | プロラクチノーマ | ぷろらくちのーま | なし | なし | ORPHA:2965<br>完全一致 |  |  |
| 177 | 巣状分節性糸球体硬化症 | そうじょうぶんせつせいしきゅうたいこうかしょう | なし | [巣状分節性糸球体硬化症](https://www.shouman.jp/disease/details/02_01_004/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 178 | 膜性腎症 | まくせいじんしょう | なし | [膜性腎症](https://www.shouman.jp/disease/details/02_01_005/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 179 | びまん性汎細気管支炎 | びまんせいはんさいきかんしえん | なし | なし | ORPHA:171700<br>完全一致 |  |  |
| 183 | 寒冷凝集素症 | かんれいぎょうしゅうそしょう | なし | [寒冷凝集素症](https://www.shouman.jp/disease/details/09_06_007/)<br>完全一致 | ORPHA:56425<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 185 | ダイアモンド・ブラックファン貧血 | だいあもんどぶらっくふぁんひんけつ | [告示 284 ダイアモンド・ブラックファン貧血](https://www.nanbyou.or.jp/entry/4420)<br>完全一致 | なし | ORPHA:124<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 188 | 閉塞性細気管支炎 | へいそくせいさいきかんしえん | [告示 228 閉塞性細気管支炎](https://www.nanbyou.or.jp/entry/4720)<br>完全一致 | [閉塞性細気管支炎](https://www.shouman.jp/disease/details/03_10_012/)<br>完全一致 | ORPHA:1303<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 190 | インスリノーマ | いんすりのーま | なし | [インスリノーマ](https://www.shouman.jp/disease/details/05_34_077/)<br>完全一致 | ORPHA:97279<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 192 | ペリツェウス・メルツバッハー病 | ぺりつぇうすめるつばっはーびょう | なし | なし | ORPHA:702<br>完全一致 |  |  |
| 193 | 脊髄空洞症 | せきずいくうどうしょう | [告示 117 脊髄空洞症](https://www.nanbyou.or.jp/entry/133)<br>完全一致 | [脊髄空洞症](https://www.shouman.jp/disease/details/11_02_004/)<br>完全一致 | ORPHA:3280<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 199 | 先天性ミオパチー | せんてんせいみおぱちー | [告示 111 先天性ミオパチー](https://www.nanbyou.or.jp/entry/4726)<br>完全一致 | なし | ORPHA:97245<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 202 | 特発性多中心性キャッスルマン病 | とくはつせいたちゅうしんせいきゃっするまんびょう | [告示 331 特発性多中心性キャッスルマン病](https://www.nanbyou.or.jp/entry/5749)<br>完全一致 | なし | ORPHA:570431<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 203 | 慢性活動性EBウイルス感染症 | まんせいかつどうせいいーびーういるすかんせんしょう | なし | [慢性活動性EBウイルス感染症](https://www.shouman.jp/disease/details/10_09_053/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 204 | 血球貪食性リンパ組織球症 | けっきゅうどんしょくせいりんぱそしききゅうしょう | なし | [血球貪食性リンパ組織球症](https://www.shouman.jp/disease/details/01_04_025/)<br>完全一致 | ORPHA:158032<br>完全一致 | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 206 | 魚鱗癬 | ぎょりんせん | なし | なし | ORPHA:79354<br>完全一致 |  |  |
| 209 | 広範脊柱管狭窄症 | こうはんせきちゅうかんきょうさくしょう | [告示 70 広範脊柱管狭窄症](https://www.nanbyou.or.jp/entry/101)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 211 | デンスデポジット病 | でんすでぽじっとびょう | なし | なし | ORPHA:93571<br>完全一致 |  |  |
| 212 | グルカゴノーマ | ぐるかごのーま | なし | [グルカゴノーマ](https://www.shouman.jp/disease/details/05_33_076/)<br>完全一致 | ORPHA:97280<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 213 | VIP産生腫瘍 | ぶいあいぴーさんせいしゅよう | なし | [VIP産生腫瘍](https://www.shouman.jp/disease/details/05_32_073/)<br>完全一致 | ORPHA:97282<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 214 | 鎖肛 | さこう | なし | なし | ORPHA:96346<br>完全一致 |  |  |
| 216 | ブルガダ症候群 | ぶるがだしょうこうぐん | なし | なし | ORPHA:130<br>完全一致 |  |  |
| 220 | 総動脈幹遺残症 | そうどうみゃくかんいざんしょう | [告示 207 総動脈幹遺残症](https://www.nanbyou.or.jp/entry/4895)<br>完全一致 | [総動脈幹遺残症](https://www.shouman.jp/disease/details/04_39_048/)<br>完全一致 | ORPHA:3384<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 221 | 完全大血管転位症 | かんぜんだいけっかんてんいしょう | [告示 209 完全大血管転位症](https://www.nanbyou.or.jp/entry/4477)<br>完全一致 | [完全大血管転位症](https://www.shouman.jp/disease/details/04_36_045/)<br>完全一致 | ORPHA:216675<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 222 | 単心室症 | たんしんしつしょう | [告示 210 単心室症](https://www.nanbyou.or.jp/entry/4369)<br>完全一致 | [単心室症](https://www.shouman.jp/disease/details/04_30_037/)<br>完全一致 | ORPHA:1464<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 224 | 尿素サイクル異常症 | にょうそさいくるいじょうしょう | [告示 251 尿素サイクル異常症](https://www.nanbyou.or.jp/entry/4732)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 225 | シトルリン血症 | しとるりんけっしょう | なし | なし | ORPHA:187<br>完全一致 |  |  |
| 227 | グリコーゲン蓄積症II型 | ぐりこーげんちくせきしょうにがた | なし | なし | ORPHA:420429<br>完全一致 |  |  |
| 230 | バッド・キアリ症候群 | ばっどきありしょうこうぐん | [告示 91 バッド・キアリ症候群](https://www.nanbyou.or.jp/entry/174)<br>完全一致 | なし | ORPHA:131<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2` |  |
| 232 | 若年発症型両側性感音難聴 | じゃくねんはっしょうがたりょうそくせいかんおんなんちょう | [告示 304 若年発症型両側性感音難聴](https://www.nanbyou.or.jp/entry/4627)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 233 | 遺伝性出血性末梢血管拡張症 | いでんせいしゅっけつせいまっしょうけっかんかくちょうしょう | なし | [遺伝性出血性末梢血管拡張症（オスラー病）](https://www.shouman.jp/disease/details/16_02_008/)<br>完全一致 | ORPHA:774<br>完全一致 | 小 2026-09-22T12:13 `4ff2fcce5786` |  |
| 234 | リンパ管腫 | りんぱかんしゅ | なし | [リンパ管腫](https://www.shouman.jp/disease/details/16_01_006/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `4ff2fcce5786` |  |
| 237 | 特発性間質性肺炎 | とくはつせいかんしつせいはいえん | [告示 85 特発性間質性肺炎](https://www.nanbyou.or.jp/entry/156)<br>完全一致 | [特発性間質性肺炎](https://www.shouman.jp/disease/details/03_04_004/)<br>完全一致 | ORPHA:98300<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 239 | 好酸球性副鼻腔炎 | こうさんきゅうせいふくびくうえん | [告示 306 好酸球性副鼻腔炎](https://www.nanbyou.or.jp/entry/4537)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 240 | IgA血管炎 | あいじーえいけっかんえん | なし | なし | ORPHA:761<br>完全一致 |  |  |
| 241 | 特発性後天性全身性無汗症 | とくはつせいこうてんせいぜんしんせいむかんしょう | [告示 163 特発性後天性全身性無汗症](https://www.nanbyou.or.jp/entry/4390)<br>完全一致 | [特発性後天性全身性無汗症](https://www.shouman.jp/disease/details/14_09_014/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 242 | 遺伝性球状赤血球症 | いでんせいきゅうじょうせっけっきゅうしょう | なし | [遺伝性球状赤血球症](https://www.shouman.jp/disease/details/09_08_011/)<br>完全一致 | ORPHA:822<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 243 | 片側巨脳症 | へんそくきょのうしょう | [告示 136 片側巨脳症](https://www.nanbyou.or.jp/entry/4783)<br>完全一致 | [片側巨脳症](https://www.shouman.jp/disease/details/11_04_014/)<br>完全一致 | ORPHA:99802<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 244 | 限局性皮質異形成 | げんきょくせいひしついけいせい | [告示 137 限局性皮質異形成](https://www.nanbyou.or.jp/entry/4456)<br>完全一致 | [限局性皮質異形成](https://www.shouman.jp/disease/details/11_04_015/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 249 | ウィスコット・オルドリッチ症候群 | うぃすこっとおるどりっちしょうこうぐん | なし | [ウィスコット・オルドリッチ（Wiskott-Aldrich）症候群](https://www.shouman.jp/disease/details/10_02_011/)<br>完全一致 | ORPHA:906<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 250 | 毛細血管拡張性運動失調症 | もうさいけっかんかくちょうせいうんどうしっちょうしょう | なし | [毛細血管拡張性運動失調症](https://www.shouman.jp/disease/details/10_02_012/)<br>完全一致 | ORPHA:100<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 251 | ミトコンドリアDNA枯渇症候群 | みとこんどりあでぃえぬえーこかつしょうこうぐん | なし | [ミトコンドリアDNA枯渇症候群](https://www.shouman.jp/disease/details/08_04_055/)<br>完全一致 | ORPHA:35698<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 255 | 大腸ポリポーシス | だいちょうぽりぽーしす | なし | なし | ORPHA:733<br>完全一致 |  |  |
| 256 | アルミート不整脈原性心筋症 | あるみーとふせいみゃくげんせいしんきんしょう | なし | なし | ORPHA:247<br>完全一致 |  |  |
| 257 | 三尖弁閉鎖症 | さんせんべんへいさしょう | [告示 212 三尖弁閉鎖症](https://www.nanbyou.or.jp/entry/4480)<br>完全一致 | [三尖弁閉鎖症](https://www.shouman.jp/disease/details/04_31_038/)<br>完全一致 | ORPHA:1209<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 258 | ガストリノーマ | がすとりのーま | なし | [ガストリノーマ](https://www.shouman.jp/disease/details/05_32_074/)<br>完全一致 | ORPHA:913<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 261 | アルポート症候群 | あるぽーとしょうこうぐん | [告示 218 アルポート症候群](https://www.nanbyou.or.jp/entry/4348)<br>完全一致 | なし | ORPHA:63<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951` |  |
| 262 | 掌蹠膿疱症 | しょうせきのうほうしょう | なし | なし | ORPHA:163927<br>完全一致 |  |  |
| 263 | 悪性黒色腫 | あくせいこくしょくしゅ | なし | [悪性黒色腫](https://www.shouman.jp/disease/details/01_05_063/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `391cfda1b549` |  |
| 266 | 濾胞性リンパ腫 | ろほうせいりんぱしゅ | なし | なし | ORPHA:545<br>完全一致 |  |  |
| 267 | びまん性大細胞型B細胞リンパ腫 | びまんせいだいさいぼうがたびーさいぼうりんぱしゅ | なし | なし | ORPHA:544<br>完全一致 |  |  |
| 268 | マントル細胞リンパ腫 | まんとるさいぼうりんぱしゅ | なし | なし | ORPHA:52416<br>完全一致 |  |  |
| 271 | ミオクローヌス・ジストニア症候群 | みおくろーぬすじすとにあしょうこうぐん | なし | なし | ORPHA:36899<br>完全一致 |  |  |
| 272 | 遺伝性痙性対麻痺 | いでんせいけいせいついまひ | なし | なし | ORPHA:685<br>完全一致 |  |  |
| 275 | ムコリピドーシスII型 | むこりぴどーしすにがた | なし | [ムコリピドーシスⅡ型（I-cell病）](https://www.shouman.jp/disease/details/08_06_095/)<br>完全一致 | ORPHA:576<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 277 | フコシドーシス | ふこしどーしす | なし | [フコシドーシス](https://www.shouman.jp/disease/details/08_06_081/)<br>完全一致 | ORPHA:349<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 278 | 突発性難聴 | とっぱつせいなんちょう | なし | なし | ORPHA:90059<br>完全一致 |  |  |
| 280 | 特発性器質化肺炎 | とくはつせいきしつかはいえん | なし | なし | ORPHA:1302<br>完全一致 |  |  |
| 281 | 過敏性肺炎 | かびんせいはいえん | なし | なし | ORPHA:31740<br>完全一致 |  |  |
| 284 | 強直性脊椎炎 | きょうちょくせいせきついえん | [告示 271 強直性脊椎炎](https://www.nanbyou.or.jp/entry/4847)<br>完全一致 | なし | ORPHA:449<br>Hepatoblastoma<br>なし | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 286 | 5p欠失症候群 | ごぴーけっしつしょうこうぐん | [告示 199 ５ｐ欠失症候群](https://www.nanbyou.or.jp/entry/4862)<br>完全一致 | なし | ORPHA:281<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 287 | 4p欠失症候群 | よんぴーけっしつしょうこうぐん | [告示 198 ４ｐ欠失症候群](https://www.nanbyou.or.jp/entry/4804)<br>完全一致 | なし | ORPHA:280<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 288 | 成人T細胞白血病リンパ腫 | せいじんてぃーさいぼうはっけつびょうりんぱしゅ | なし | なし | ORPHA:86875<br>完全一致 |  |  |
| 289 | T細胞性大顆粒リンパ球性白血病 | てぃーさいぼうせいだいかりゅうりんぱきゅうせいはっけつびょう | なし | なし | ORPHA:86872<br>完全一致 |  |  |
| 292 | 周期性好中球減少症 | しゅうきせいこうちゅうきゅうげんしょうしょう | なし | [周期性好中球減少症](https://www.shouman.jp/disease/details/10_05_036/)<br>完全一致 | ORPHA:2686<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 295 | 先天性筋無力症候群 | せんてんせいきんむりょくしょうこうぐん | [告示 12 先天性筋無力症候群](https://www.nanbyou.or.jp/entry/3963)<br>完全一致 | なし | ORPHA:590<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 298 | 進行性多巣性白質脳症 | しんこうせいたそうせいはくしつのうしょう | [告示 25 進行性多巣性白質脳症](https://www.nanbyou.or.jp/entry/126)<br>完全一致 | なし | ORPHA:217260<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 299 | 好酸球性筋膜炎 | こうさんきゅうせいきんまくえん | なし | なし | ORPHA:3165<br>完全一致 |  |  |
| 301 | 大動脈縮窄症 | だいどうみゃくしゅくさくしょう | なし | [大動脈縮窄症](https://www.shouman.jp/disease/details/04_56_070/)<br>完全一致 | ORPHA:1457<br>完全一致 | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 302 | 先天性胆道拡張症 | せんてんせいたんどうかくちょうしょう | なし | [先天性胆道拡張症](https://www.shouman.jp/disease/details/12_08_028/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 303 | 先天性門脈欠損症 | せんてんせいもんみゃくけっそんしょう | なし | [先天性門脈欠損症](https://www.shouman.jp/disease/details/12_10_032/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 305 | フィッシャー症候群 | ふぃっしゃーしょうこうぐん | なし | なし | ORPHA:98919<br>完全一致 |  |  |
| 309 | Leber遺伝性視神経症 | れーべるいでんせいししんけいしょう | なし | なし | ORPHA:104<br>完全一致 |  |  |
| 311 | 非ケトーシス型高グリシン血症 | ひけとーしすがたこうぐりしんけっしょう | [告示 321 非ケトーシス型高グリシン血症](https://www.nanbyou.or.jp/entry/5440)<br>完全一致 | [非ケトーシス型高グリシン血症](https://www.shouman.jp/disease/details/08_01_010/)<br>完全一致 | ORPHA:407<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 312 | ガラクトシアリドーシス | がらくとしありどーしす | なし | [ガラクトシアリドーシス](https://www.shouman.jp/disease/details/08_06_085/)<br>完全一致 | ORPHA:351<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 315 | 気管支拡張症 | きかんしかくちょうしょう | なし | [気管支拡張症](https://www.shouman.jp/disease/details/03_07_009/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `00607aed7a2b` |  |
| 317 | 前眼部形成異常 | ぜんがんぶけいせいいじょう | [告示 328 前眼部形成異常](https://www.nanbyou.or.jp/entry/5455)<br>完全一致 | なし | ORPHA:88632<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57` |  |
| 321 | 先天性横隔膜ヘルニア | せんてんせいおうかくまくへるにあ | [告示 294 先天性横隔膜ヘルニア](https://www.nanbyou.or.jp/entry/4510)<br>完全一致 | [先天性横隔膜ヘルニア](https://www.shouman.jp/disease/details/03_11_013/)<br>完全一致 | ORPHA:2140<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `00607aed7a2b` |  |
| 322 | 臍帯ヘルニア | さいたいへるにあ | なし | なし | ORPHA:660<br>完全一致 |  |  |
| 323 | 腹壁破裂 | ふくへきはれつ | なし | なし | ORPHA:2368<br>完全一致 |  |  |
| 325 | 反応性関節炎 | はんのうせいかんせつえん | なし | なし | ORPHA:29207<br>完全一致 |  |  |
| 327 | 赤色ぼろ繊維・ミオクローヌスてんかん症候群 | せきしょくぼろせんいみおくろーぬすてんかんしょうこうぐん | なし | なし | ORPHA:551<br>完全一致 |  |  |
| 328 | Leigh脳症 | りーのうしょう | なし | なし | ORPHA:506<br>完全一致 |  |  |
| 330 | Pearson症候群 | ぴあそんしょうこうぐん | なし | なし | ORPHA:699<br>完全一致 |  |  |
| 331 | 慢性偽性腸閉塞症 | まんせいぎせいちょうへいそくしょう | なし | なし | ORPHA:2978<br>完全一致 |  |  |
| 332 | クロンカイト・カナダ症候群 | くろんかいとかなだしょうこうぐん | [告示 289 クロンカイト・カナダ症候群](https://www.nanbyou.or.jp/entry/4606)<br>完全一致 | なし | ORPHA:2930<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 333 | 孤立性線維性腫瘍 | こりつせいせんいせいしゅよう | なし | なし | ORPHA:2126<br>完全一致 |  |  |
| 336 | 遠位型ミオパチー | えんいがたみおぱちー | [告示 30 遠位型ミオパチー](https://www.nanbyou.or.jp/entry/4002)<br>完全一致 | なし | ORPHA:599<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 340 | 原発性シュウ酸過多症 | げんぱつせいしゅうさんかたしょう | なし | なし | ORPHA:416<br>完全一致 |  |  |
| 344 | 慢性肉芽腫症 | まんせいにくげしゅしょう | なし | [慢性肉芽腫症](https://www.shouman.jp/disease/details/10_05_040/)<br>完全一致 | ORPHA:379<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 346 | 遺伝性血管性浮腫（III型） | いでんせいけっかんせいふしゅ | なし | [遺伝性血管性浮腫（C1インヒビター欠損症）](https://www.shouman.jp/disease/details/10_07_050/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 349 | 心室中隔欠損症（大型） | しんしつちゅうかくけっそんしょう | なし | [心室中隔欠損症](https://www.shouman.jp/disease/details/04_45_057/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 351 | 動脈管開存症 | どうみゃくかんかいぞんしょう | なし | [動脈管開存症](https://www.shouman.jp/disease/details/04_42_051/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 353 | 副腎脳白質ジストロフィー脊髄型 | ふくじんのうはくしつじすとろふぃーせきずいがた | なし | なし | ORPHA:139399<br>完全一致 |  |  |
| 354 | 多種カルボキシラーゼ欠損症 | たしゅかるぼきしらーぜけっそんしょう | なし | なし | ORPHA:148<br>完全一致 |  |  |
| 355 | ジヒドロピリミジナーゼ欠損症 | じひどろぴりみじなーぜけっそんしょう | なし | なし | ORPHA:38874<br>完全一致 |  |  |
| 359 | 前頭側頭型認知症 | ぜんとうそくとうがたにんちしょう | なし | なし | ORPHA:282<br>完全一致 |  |  |
| 361 | 左心低形成症候群 | さしんていけいせいしょうこうぐん | [告示 211 左心低形成症候群](https://www.nanbyou.or.jp/entry/4372)<br>完全一致 | [左心低形成症候群](https://www.shouman.jp/disease/details/04_29_036/)<br>完全一致 | ORPHA:2248<br>完全一致 | 難 2026-09-22T12:11 `51d8c22da951`<br>小 2026-09-22T12:12 `7f7bb5b9d51b` |  |
| 364 | カロリ病 | かろりびょう | なし | なし | ORPHA:53035<br>完全一致 |  |  |
| 365 | 特発性好酸球増多症候群 | とくはつせいこうさんきゅうぞうたしょうこうぐん | なし | なし | ORPHA:168956<br>完全一致 |  |  |
| 366 | 巨赤芽球性貧血（ビタミンB12欠乏） | きょせきがきゅうせいひんけつ | なし | [巨赤芽球性貧血](https://www.shouman.jp/disease/details/09_01_001/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 367 | 後部尿道弁 | こうぶにょうどうべん | なし | なし | ORPHA:93110<br>完全一致 |  |  |
| 369 | 未熟児網膜症 | みじゅくじもうまくしょう | なし | なし | ORPHA:90050<br>完全一致 |  |  |
| 373 | 先天性副腎低形成症 | せんてんせいふくじんていけいせいしょう | [告示 82 先天性副腎低形成症](https://www.nanbyou.or.jp/entry/3852)<br>完全一致 | [先天性副腎低形成症](https://www.shouman.jp/disease/details/05_19_040/)<br>完全一致 | ORPHA:595337<br>完全一致 | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 374 | ベックウィズ・ヴィーデマン症候群 | べっくうぃずゔぃーでまんしょうこうぐん | なし | [ベックウィズ・ヴィーデマン（Beckwith-Wiedemann）症候群](https://www.shouman.jp/disease/details/13_01_008/)<br>完全一致 | ORPHA:116<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 379 | CHARGE症候群 | ちゃーじしょうこうぐん | なし | なし | ORPHA:138<br>完全一致 |  |  |
| 380 | VACTERL連合 | ばくたーるれんごう | なし | なし | ORPHA:887<br>完全一致 |  |  |
| 389 | 神経有棘赤血球症 | しんけいゆうきょくせっけっきゅうしょう | [告示 9 神経有棘赤血球症](https://www.nanbyou.or.jp/entry/4051)<br>完全一致 | なし | ORPHA:263440<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 391 | メチルグルタコン酸尿症 | めちるぐるたこんさんにょうしょう | [告示 324 メチルグルタコン酸尿症](https://www.nanbyou.or.jp/entry/5449)<br>完全一致 | [メチルグルタコン酸尿症](https://www.shouman.jp/disease/details/08_02_028/)<br>完全一致 | —<br>なし | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 392 | リジン尿性蛋白不耐症 | りじんにょうせいたんぱくふたいしょう | [告示 252 リジン尿性蛋白不耐症](https://www.nanbyou.or.jp/entry/4681)<br>完全一致 | [リジン尿性蛋白不耐症](https://www.shouman.jp/disease/details/08_01_020/)<br>完全一致 | ORPHA:470<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 399 | ネフロン癆 | ねふろんろう | [告示 335 ネフロン癆](https://www.nanbyou.or.jp/entry/22436)<br>完全一致 | [ネフロン癆](https://www.shouman.jp/disease/details/02_08_028/)<br>完全一致 | ORPHA:655<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `6ea42500acc4` |  |
| 400 | 色素失調症 | しきそしっちょうしょう | なし | [色素失調症](https://www.shouman.jp/disease/details/13_01_023/)<br>完全一致 | ORPHA:464<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 401 | 肥厚性皮膚骨膜症 | ひこうせいひふこつまくしょう | [告示 165 肥厚性皮膚骨膜症](https://www.nanbyou.or.jp/entry/4603)<br>完全一致 | [肥厚性皮膚骨膜症](https://www.shouman.jp/disease/details/14_07_012/)<br>完全一致 | ORPHA:2796<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c`<br>小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 405 | 心臓粘液腫関連カーニー複合 | しんぞうねんえきしゅかんれんかーにーふくごう | なし | なし | ORPHA:1359<br>完全一致 |  |  |
| 407 | 毛細血管拡張症性小脳失調症2型 | もうさいけっかんかくちょうしょうせいしょうのうしっちょうしょうにがた | なし | なし | ORPHA:251347<br>完全一致 |  |  |
| 408 | Friedreich失調症 | ふりーどらいひしっちょうしょう | なし | なし | ORPHA:95<br>完全一致 |  |  |
| 412 | Muenke症候群 | みゅんけしょうこうぐん | なし | なし | ORPHA:53271<br>完全一致 |  |  |
| 413 | Saethre-Chotzen症候群 | せーとれこっつぇんしょうこうぐん | なし | なし | ORPHA:794<br>完全一致 |  |  |
| 414 | Schinzel-Giedion症候群 | しんつぇるぎでぃおんしょうこうぐん | なし | なし | ORPHA:798<br>完全一致 |  |  |
| 425 | MECP2重複症候群 | えむいーしーぴーつーちょうふくしょうこうぐん | [告示 339 MECP2重複症候群](https://www.nanbyou.or.jp/entry/28597)<br>完全一致 | [MECP2重複症候群](https://www.shouman.jp/disease/details/13_01_033/)<br>完全一致 | ORPHA:1762<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 432 | バルデー・ビードル症候群 | ばるでーびーどるしょうこうぐん | なし | [バルデー・ビードル（Bardet-Biedl）症候群](https://www.shouman.jp/disease/details/05_41_092/)<br>完全一致 | ORPHA:110<br>完全一致 | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 441 | 先天性角化不全症 | せんてんせいかくかふぜんしょう | なし | なし | ORPHA:1775<br>完全一致 |  |  |
| 442 | シュワッハマン・ダイアモンド症候群 | しゅわっはまんだいあもんどしょうこうぐん | なし | [シュワッハマン・ダイアモンド（Shwachman-Diamond）症候群](https://www.shouman.jp/disease/details/10_05_039/)<br>完全一致 | ORPHA:811<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 443 | 先天性無巨核球性血小板減少症 | せんてんせいむきょかくきゅうせいけっしょうばんげんしょうしょう | なし | [先天性無巨核球性血小板減少症](https://www.shouman.jp/disease/details/09_16_027/)<br>完全一致 | ORPHA:3319<br>完全一致 | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 445 | ウィスコット・オルドリッチ症候群関連血小板減少症 | うぃすこっとおるどりっちしょうこうぐんかんれんけっしょうばんげんしょうしょう | なし | [ウィスコット・オルドリッチ（Wiskott-Aldrich）症候群](https://www.shouman.jp/disease/details/10_02_011/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 446 | 先天性赤血球形成異常性貧血 | せんてんせいせっけっきゅうけいせいいじょうせいひんけつ | [告示 282 先天性赤血球形成異常性貧血](https://www.nanbyou.or.jp/entry/4363)<br>完全一致 | [先天性赤血球形成異常性貧血](https://www.shouman.jp/disease/details/09_03_004/)<br>完全一致 | ORPHA:85<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `d0b61936567c` |  |
| 447 | 先天性アンチトロンビン欠乏症 | せんてんせいあんちとろんびんけつぼうしょう | なし | [先天性アンチトロンビン欠乏症](https://www.shouman.jp/disease/details/09_24_050/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `d0b61936567c` |  |
| 449 | Klippel-Trenaunay症候群 | くりっぺるとれのねーしょうこうぐん | なし | なし | ORPHA:90308<br>完全一致 |  |  |
| 452 | CLOVES症候群 | くろーぶすしょうこうぐん | なし | なし | ORPHA:140944<br>完全一致 |  |  |
| 454 | 遺伝性リンパ浮腫 | いでんせいりんぱふしゅ | なし | なし | ORPHA:79452<br>完全一致 |  |  |
| 458 | 自己免疫性リンパ増殖症候群 | じこめんえきせいりんぱぞうしょくしょうこうぐん | なし | [自己免疫性リンパ増殖症候群（ALPS）](https://www.shouman.jp/disease/details/10_04_033/)<br>完全一致 | ORPHA:3261<br>完全一致 | 小 2026-09-22T12:13 `22dc6185c025` |  |
| 465 | クラッベ病 | くらっべびょう | なし | [クラッベ（Krabbe）病](https://www.shouman.jp/disease/details/08_06_092/)<br>完全一致 | ORPHA:487<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 466 | 異染性白質ジストロフィー | いせんせいはくしつじすとろふぃー | なし | [異染性白質ジストロフィー](https://www.shouman.jp/disease/details/08_06_088/)<br>完全一致 | ORPHA:512<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 468 | GM1ガングリオシドーシス | じーえむわんがんぐりおしどーしす | なし | [GM1-ガングリオシドーシス](https://www.shouman.jp/disease/details/08_06_086/)<br>完全一致 | ORPHA:354<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 469 | GM2ガングリオシドーシス（サンドホフ病） | じーえむつーがんぐりおしどーしす | なし | [GM2-ガングリオシドーシス](https://www.shouman.jp/disease/details/08_06_087/)<br>完全一致 | ORPHA:796<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 470 | 多発性スルファターゼ欠損症 | たはつせいするふぁたーぜけっそんしょう | なし | なし | ORPHA:585<br>完全一致 |  |  |
| 471 | ポンペ病（乳児型） | ぽんぺびょう | なし | [ポンペ（Pompe）病](https://www.shouman.jp/disease/details/08_06_097/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `400689ca2661` |  |
| 472 | シトリン欠損症 | しとりんけっそんしょう | [告示 318 シトリン欠損症](https://www.nanbyou.or.jp/entry/5434)<br>完全一致 | [シトリン欠損症](https://www.shouman.jp/disease/details/08_01_017/)<br>完全一致 | ORPHA:247582<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 473 | 腫瘍性骨軟化症 | しゅようせいこつなんかしょう | なし | なし | ORPHA:352540<br>完全一致 |  |  |
| 475 | 遺伝性低リン血症性くる病（FGF23関連） | いでんせいていりんけっしょうせいくるびょう | なし | なし | ORPHA:89937<br>完全一致 |  |  |
| 477 | ミトコンドリア神経胃腸脳筋症 | みとこんどりあしんけいいちょうのうきんしょう | なし | なし | ORPHA:298<br>完全一致 |  |  |
| 478 | Zellweger症候群（軽症型） | つぇるうぇーがーしょうこうぐん | なし | なし | ORPHA:44<br>完全一致 |  |  |
| 480 | 1p36欠失症候群 | いちぴーさんろくけっしつしょうこうぐん | [告示 197 １ｐ３６欠失症候群](https://www.nanbyou.or.jp/entry/4495)<br>完全一致 | なし | ORPHA:1606<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 485 | 17q21.31欠失症候群 | じゅうななきゅうにいちてんさんいちけっしつしょうこうぐん | なし | なし | ORPHA:96169<br>完全一致 |  |  |
| 487 | CDKL5欠損症 | しーでぃーけーえるふぁいぶけっそんしょう | なし | なし | ORPHA:505652<br>完全一致 |  |  |
| 488 | PCDH19関連てんかん | ぴーしーでぃーえいちわんないんかんれんてんかん | なし | なし | ORPHA:714652<br>完全一致 |  |  |
| 491 | 脂肪萎縮症 | しぼういしゅくしょう | [告示 265 脂肪萎縮症](https://www.nanbyou.or.jp/entry/5332)<br>完全一致 | なし | —<br>なし | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 496 | 芳香族Lアミノ酸脱炭酸酵素欠損症 | ほうこうぞくえるあみのさんだつたんさんこうそけっそんしょう | [告示 323 芳香族Ｌ-アミノ酸脱炭酸酵素欠損症](https://www.nanbyou.or.jp/entry/5446)<br>完全一致 | [芳香族L-アミノ酸脱炭酸酵素欠損症](https://www.shouman.jp/disease/details/08_11_124/)<br>完全一致 | ORPHA:35708<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:12 `400689ca2661` |  |
| 499 | 糖原病III型 | とうげんびょうさんがた | なし | [糖原病Ⅲ型](https://www.shouman.jp/disease/details/08_05_067/)<br>完全一致 | ORPHA:366<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 500 | 糖原病V型 | とうげんびょうごがた | なし | [糖原病Ⅴ型](https://www.shouman.jp/disease/details/08_05_069/)<br>完全一致 | ORPHA:368<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 503 | 高フェニルアラニン血症（BH4反応型） | こうふぇにるあらにんけっしょう | なし | なし | ORPHA:293284<br>完全一致 |  |  |
| 506 | N-アセチルグルタミン酸合成酵素欠損症 | えぬあせちるぐるたみんさんごうせいこうそけっそんしょう | なし | [N-アセチルグルタミン酸合成酵素欠損症](https://www.shouman.jp/disease/details/08_01_011/)<br>完全一致 | ORPHA:927<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 507 | 遺伝性果糖不耐症 | いでんせいかとうふたいしょう | なし | なし | ORPHA:469<br>完全一致 |  |  |
| 508 | 先天性グリコシル化異常症 | せんてんせいぐりこしるかいじょうしょう | なし | [先天性グリコシル化異常症](https://www.shouman.jp/disease/details/11_13_034/)<br>完全一致 | ORPHA:137<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 509 | 脳腱黄色腫症 | のうけんおうしょくしゅしょう | [告示 263 脳腱黄色腫症](https://www.nanbyou.or.jp/entry/4618)<br>完全一致 | なし | ORPHA:909<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79` |  |
| 510 | スミス・レムリ・オピッツ症候群 | すみすれむりおぴっつしょうこうぐん | なし | [スミス・レムリ・オピッツ（Smith-Lemli-Opitz）症候群](https://www.shouman.jp/disease/details/13_01_028/)<br>完全一致 | ORPHA:818<br>完全一致 | 小 2026-09-22T12:13 `10feb0dbcf60` |  |
| 512 | シアリドーシス | しありどーしす | なし | [シアリドーシス](https://www.shouman.jp/disease/details/08_06_084/)<br>完全一致 | ORPHA:309294<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 518 | Wolcott-Rallison症候群 | うぉるこっとらりそんしょうこうぐん | なし | なし | ORPHA:1667<br>完全一致 |  |  |
| 523 | Dent病 | でんとびょう | なし | なし | ORPHA:1652<br>完全一致 |  |  |
| 528 | 筋強直性ジストロフィー2型 | きんきょうちょくせいじすとろふぃーにがた | なし | なし | ORPHA:606<br>完全一致 |  |  |
| 530 | セントラルコア病 | せんとらるこあびょう | なし | [セントラルコア病](https://www.shouman.jp/disease/details/11_23_059/)<br>完全一致 | ORPHA:597<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 531 | ミニコア病 | みにこあびょう | なし | [ミニコア病](https://www.shouman.jp/disease/details/11_23_061/)<br>完全一致 | ORPHA:598<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 533 | 中心核ミオパチー | ちゅうしんかくみおぱちー | なし | なし | ORPHA:595<br>完全一致 |  |  |
| 536 | 筋細管ミオパチー（X連鎖型） | きんさいかんみおぱちー | なし | なし | ORPHA:596<br>完全一致 |  |  |
| 537 | 遠位関節拘縮症 | えんいかんせつこうしゅくしょう | なし | なし | ORPHA:97120<br>完全一致 |  |  |
| 538 | Freeman-Sheldon症候群 | ふりーまんしぇるどんしょうこうぐん | なし | なし | ORPHA:2053<br>完全一致 |  |  |
| 540 | Barth症候群 | ばーすしょうこうぐん | なし | なし | ORPHA:111<br>完全一致 |  |  |
| 541 | 遺伝性感覚性自律神経性ニューロパチー | いでんせいかんかくせいじりつしんけいせいにゅーろぱちー | なし | なし | ORPHA:140471<br>完全一致 |  |  |
| 543 | 巨大軸索ニューロパチー | きょだいじくさくにゅーろぱちー | なし | なし | ORPHA:643<br>完全一致 |  |  |
| 546 | 頭蓋骨早期癒合症（非症候群性） | とうがいこつそうきゆごうしょう | なし | なし | ORPHA:139390<br>完全一致 |  |  |
| 548 | 進行性家族性肝内胆汁うっ滞症 | しんこうせいかぞくせいかんないたんじゅううったいしょう | [告示 338 進行性家族性肝内胆汁うっ滞症](https://www.nanbyou.or.jp/entry/22457)<br>完全一致 | [進行性家族性肝内胆汁うっ滞症](https://www.shouman.jp/disease/details/12_08_026/)<br>完全一致 | ORPHA:172<br>完全一致 | 難 2026-09-22T12:11 `414d2138fa57`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 549 | 3-ヒドロキシ-3-メチルグルタル酸血症 | さんひどろきしさんめちるぐるたるさんけっしょう | なし | [3-ヒドロキシ-3-メチルグルタル酸血症](https://www.shouman.jp/disease/details/08_02_029/)<br>完全一致 | ORPHA:20<br>完全一致 | 小 2026-09-22T12:12 `400689ca2661` |  |
| 553 | ミトコンドリア三機能蛋白欠損症 | みとこんどりあさんきのうたんぱくけっそんしょう | なし | なし | ORPHA:5<br>完全一致 |  |  |
| 554 | グルタル酸血症II型 | ぐるたるさんけっしょうにがた | なし | なし | ORPHA:26791<br>完全一致 |  |  |
| 555 | D-2-ヒドロキシグルタル酸尿症 | でぃーつーひどろきしぐるたるさんにょうしょう | なし | なし | ORPHA:79315<br>完全一致 |  |  |
| 556 | L-2-ヒドロキシグルタル酸尿症 | えるつーひどろきしぐるたるさんにょうしょう | なし | なし | ORPHA:79314<br>完全一致 |  |  |
| 557 | ヒスチジン血症 | ひすちじんけっしょう | なし | なし | ORPHA:2157<br>完全一致 |  |  |
| 559 | Rotor症候群 | ろーたーしょうこうぐん | なし | なし | ORPHA:3111<br>完全一致 |  |  |
| 563 | 皮質下嚢胞をもつ大頭型白質脳症 | ひしつかのうほうをもつだいとうがたはくしつのうしょう | なし | [皮質下嚢胞をもつ大頭型白質脳症](https://www.shouman.jp/disease/details/11_09_029/)<br>完全一致 | ORPHA:2478<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 565 | 遺伝性痙性対麻痺2型 | いでんせいけいせいついまひにがた | なし | なし | ORPHA:280270<br>完全一致 |  |  |
| 566 | Danon病 | だのんびょう | なし | なし | ORPHA:34587<br>完全一致 |  |  |
| 567 | Andersen-Tawil症候群 | あんだーせんたうぃるしょうこうぐん | なし | なし | ORPHA:37553<br>完全一致 |  |  |
| 568 | Timothy症候群 | てぃもしーしょうこうぐん | なし | なし | ORPHA:65283<br>完全一致 |  |  |
| 570 | 先天性ジストログリカノパチー | せんてんせいじすとろぐりかのぱちー | なし | なし | ORPHA:899<br>完全一致 |  |  |
| 571 | Conradi-Hünermann-Happle症候群 | こんらーでぃひゅーねるまんはっぷるしょうこうぐん | なし | なし | ORPHA:35173<br>完全一致 |  |  |
| 572 | Desbuquois骨異形成症 | でぶきーこついけいせいしょう | なし | なし | ORPHA:1425<br>完全一致 |  |  |
| 575 | 骨幹端異形成症(Schmid型) | こつかんたんいけいせいしょう | なし | なし | ORPHA:174<br>完全一致 |  |  |
| 576 | ピクノジソストーシス | ぴくのじそすとーしす | なし | なし | ORPHA:763<br>完全一致 |  |  |
| 577 | 多発性骨端異形成症 | たはつせいこったんいけいせいしょう | なし | なし | ORPHA:251<br>完全一致 |  |  |
| 578 | 先天性脊椎骨端異形成症 | せんてんせいせきついこったんいけいせいしょう | なし | なし | ORPHA:94068<br>完全一致 |  |  |
| 581 | タナトフォリック骨異形成症 | たなとふぉりっくこついけいせいしょう | [告示 275 タナトフォリック骨異形成症](https://www.nanbyou.or.jp/entry/4714)<br>完全一致 | [タナトフォリック骨異形成症](https://www.shouman.jp/disease/details/15_02_004/)<br>完全一致 | ORPHA:2655<br>完全一致 | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `de09160da5cb` |  |
| 582 | 捻曲性骨異形成症 | ねんきょくせいこついけいせいしょう | なし | なし | ORPHA:628<br>完全一致 |  |  |
| 583 | Ellis-van Creveld症候群 | えりすふぁんくれべるとしょうこうぐん | なし | なし | ORPHA:289<br>完全一致 |  |  |
| 585 | 屈曲肢異形成症 | くっきょくしいけいせいしょう | なし | なし | ORPHA:140<br>完全一致 |  |  |
| 587 | Camurati-Engelmann病 | かむらてぃえんげるまんびょう | なし | なし | ORPHA:1328<br>完全一致 |  |  |
| 588 | Meier-Gorlin症候群 | まいやーごーりんしょうこうぐん | なし | なし | ORPHA:2554<br>完全一致 |  |  |
| 590 | 全身性肥満細胞症 | ぜんしんせいひまんさいぼうしょう | なし | なし | ORPHA:2467<br>完全一致 |  |  |
| 605 | 先天性気管狭窄症 | せんてんせいきかんきょうさくしょう | なし | なし | ORPHA:141127<br>完全一致 |  |  |
| 606 | 先天性嚢胞性腺腫様奇形 | せんてんせいのうほうせいせんしゅようきけい | なし | なし | ORPHA:2444<br>完全一致 |  |  |
| 608 | Cantrell五徴候群 | かんとれるごちょうこうぐん | なし | なし | ORPHA:1335<br>完全一致 |  |  |
| 610 | 先天性腎尿路奇形 | せんてんせいじんにょうろきけい | なし | なし | ORPHA:93545<br>完全一致 |  |  |
| 611 | 総排泄腔遺残 | そうはいせつくういざん | [告示 293 総排泄腔遺残](https://www.nanbyou.or.jp/entry/4588)<br>完全一致 | [総排泄腔遺残](https://www.shouman.jp/disease/details/12_17_044/)<br>完全一致 | ORPHA:93929<br>Cloacal exstrophy<br>なし | 難 2026-09-22T12:11 `568aa80e0b79`<br>小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 613 | Townes-Brocks症候群 | たうんずぶろっくすしょうこうぐん | なし | なし | ORPHA:857<br>完全一致 |  |  |
| 619 | 先天性無痛無汗症 | せんてんせいむつうむかんしょう | [告示 130 先天性無痛無汗症](https://www.nanbyou.or.jp/entry/4360)<br>完全一致 | [先天性無痛無汗症](https://www.shouman.jp/disease/details/11_20_045/)<br>完全一致 | ORPHA:642<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 621 | 遺伝性圧脆弱性ニューロパチー | いでんせいあつぜいじゃくせいにゅーろぱちー | なし | なし | ORPHA:640<br>完全一致 |  |  |
| 623 | Morvan症候群 | もるゔぁんしょうこうぐん | なし | なし | ORPHA:83467<br>完全一致 |  |  |
| 624 | Stiff-Person症候群 | すてぃっふぱーそんしょうこうぐん | なし | なし | ORPHA:3198<br>完全一致 |  |  |
| 630 | 傍腫瘍性小脳変性症 | ぼうしゅようせいしょうのうへんせいしょう | なし | なし | ORPHA:623626<br>完全一致 |  |  |
| 631 | Lambert-Eaton筋無力症候群 | らんばーといーとんきんむりょくしょうこうぐん | なし | なし | ORPHA:43393<br>完全一致 |  |  |
| 632 | 眼球クローヌス・ミオクローヌス症候群 | がんきゅうくろーぬすみおくろーぬすしょうこうぐん | なし | なし | ORPHA:1183<br>完全一致 |  |  |
| 637 | 肺胞微石症 | はいほうびせきしょう | なし | [肺胞微石症](https://www.shouman.jp/disease/details/03_04_006/)<br>完全一致 | ORPHA:60025<br>完全一致 | 小 2026-09-22T12:12 `00607aed7a2b` |  |
| 638 | 原発性リンパ浮腫（Meige型） | げんぱつせいりんぱふしゅ | なし | [原発性リンパ浮腫](https://www.shouman.jp/disease/details/16_01_005/)<br>完全一致 | ORPHA:90186<br>完全一致 | 小 2026-09-22T12:13 `4ff2fcce5786` |  |
| 642 | 脊髄小脳失調症31型 | せきずいしょうのうしっちょうしょうさんじゅういちがた | なし | なし | ORPHA:217012<br>完全一致 |  |  |
| 643 | 歯状核赤核淡蒼球ルイ体萎縮症 | しじょうかくせきかくたんそうきゅうるいたいいしゅくしょう | なし | なし | ORPHA:101<br>完全一致 |  |  |
| 644 | 遺伝性痙性対麻痺4型 | いでんせいけいせいついまひよんがた | なし | なし | ORPHA:100985<br>完全一致 |  |  |
| 645 | 遺伝性痙性対麻痺11型 | いでんせいけいせいついまひじゅういちがた | なし | なし | ORPHA:2822<br>完全一致 |  |  |
| 646 | 遺伝性びまん性白質脳症球状封入体型 | いでんせいびまんせいはくしつのうしょうきゅうじょうふうにゅうたいがた | なし | なし | ORPHA:313808<br>完全一致 |  |  |
| 647 | 副腎皮質刺激ホルモン単独欠損症 | ふくじんひしつしげきほるもんたんどくけっそんしょう | なし | [副腎皮質刺激ホルモン（ACTH）単独欠損症](https://www.shouman.jp/disease/details/05_19_038/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `2b595f5cb571` |  |
| 649 | Gorham-Stout病 | ごーはむすとらうとびょう | なし | なし | ORPHA:73<br>完全一致 |  |  |
| 657 | 遺伝性びまん性胃癌 | いでんせいびまんせいいがん | なし | なし | ORPHA:26106<br>完全一致 |  |  |
| 663 | 遺伝性平滑筋腫症腎細胞癌症候群 | いでんせいへいかつきんしゅしょうじんさいぼうがんしょうこうぐん | なし | なし | ORPHA:523<br>完全一致 |  |  |
| 665 | Rothmund-Thomson症候群 | ろすむんととむそんしょうこうぐん | なし | なし | ORPHA:2909<br>完全一致 |  |  |
| 666 | 眼球運動失行を伴う失調症1型 | がんきゅううんどうしっこうをともなうしっちょうしょういちがた | なし | なし | ORPHA:1168<br>完全一致 |  |  |
| 667 | 眼球運動失行を伴う失調症2型 | がんきゅううんどうしっこうをともなうしっちょうしょうにがた | なし | なし | ORPHA:64753<br>完全一致 |  |  |
| 668 | 甲状腺ホルモン不応症 | こうじょうせんほるもんふおうしょう | [告示 80 甲状腺ホルモン不応症](https://www.nanbyou.or.jp/entry/99)<br>完全一致 | [甲状腺ホルモン不応症](https://www.shouman.jp/disease/details/05_12_024/)<br>完全一致 | ORPHA:853<br>Fetal and neonatal alloimmune thrombocytopenia<br>なし | 難 2026-09-22T12:11 `0206393b65f2`<br>小 2026-09-22T12:12 `2b595f5cb571` |  |
| 673 | 高オルニチン血症-高アンモニア血症-ホモシトルリン尿症症候群 | こうおるにちんけっしょうこうあんもにあけっしょうほもしとるりんにょうしょうしょうこうぐん | なし | なし | ORPHA:415<br>完全一致 |  |  |
| 678 | 先天性リポイド過形成症 | せんてんせいりぽいどかけいせいしょう | なし | なし | ORPHA:90790<br>完全一致 |  |  |
| 684 | PLA2G6関連神経変性 | ぴーえるえーつーじーしっくすかんれんしんけいへんせい | なし | なし | ORPHA:329303<br>完全一致 |  |  |
| 685 | β-プロペラ蛋白関連神経変性 | べーたぷろぺらたんぱくかんれんしんけいへんせい | なし | なし | ORPHA:329284<br>完全一致 |  |  |
| 686 | Kufor-Rakeb症候群 | くふぉーらけぶしょうこうぐん | なし | なし | ORPHA:306674<br>完全一致 |  |  |
| 688 | Huntington病様2 | はんちんとんびょうように | なし | なし | ORPHA:98934<br>完全一致 |  |  |
| 689 | McLeod症候群 | まくろーどしょうこうぐん | なし | なし | ORPHA:59306<br>完全一致 |  |  |
| 690 | 良性家族性舞踏病 | りょうせいかぞくせいぶとうびょう | なし | なし | ORPHA:1429<br>完全一致 |  |  |
| 691 | Perry症候群 | ぺりーしょうこうぐん | なし | なし | ORPHA:178509<br>完全一致 |  |  |
| 694 | X連鎖性ジストニア・パーキンソニズム | えっくすれんさせいじすとにあぱーきんそにずむ | なし | なし | ORPHA:53351<br>完全一致 |  |  |
| 697 | 脳表ヘモジデリン沈着症 | のうひょうへもじでりんちんちゃくしょう | [告示 122 脳表ヘモジデリン沈着症](https://www.nanbyou.or.jp/entry/4810)<br>完全一致 | なし | ORPHA:247245<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c` |  |
| 698 | 特発性基底核石灰化症 | とくはつせいきていかくせっかいかしょう | [告示 27 特発性基底核石灰化症](https://www.nanbyou.or.jp/entry/3838)<br>完全一致 | なし | ORPHA:1980<br>完全一致 | 難 2026-09-22T12:11 `3211b238981c` |  |
| 700 | 先天性多発性関節拘縮症 | せんてんせいたはつせいかんせつこうしゅくしょう | なし | なし | ORPHA:1037<br>完全一致 |  |  |
| 701 | 大田原症候群 | おおたはらしょうこうぐん | [告示 146 大田原症候群](https://www.nanbyou.or.jp/entry/4381)<br>完全一致 | [大田原症候群](https://www.shouman.jp/disease/details/11_26_070/)<br>完全一致 | ORPHA:1934<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 702 | 遊走性焦点発作を伴う乳児てんかん | ゆうそうせいしょうてんほっさをともなうにゅうじてんかん | [告示 148 遊走性焦点発作を伴う乳児てんかん](https://www.nanbyou.or.jp/entry/4717)<br>完全一致 | [遊走性焦点発作を伴う乳児てんかん](https://www.shouman.jp/disease/details/11_26_080/)<br>完全一致 | ORPHA:293181<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 703 | 環状14番染色体症候群 | かんじょうじゅうよんばんせんしょくたいしょうこうぐん | なし | なし | ORPHA:1440<br>完全一致 |  |  |
| 704 | 環状20番染色体症候群 | かんじょうにじゅうばんせんしょくたいしょうこうぐん | [告示 150 環状２０番染色体症候群](https://www.nanbyou.or.jp/entry/4576)<br>完全一致 | [環状20番染色体症候群](https://www.shouman.jp/disease/details/11_26_071/)<br>完全一致 | ORPHA:1444<br>完全一致 | 難 2026-09-22T12:11 `e2ae5848d02c`<br>小 2026-09-22T12:13 `f34802b36065` |  |
| 709 | 遺伝性鉄過剰症(フェロポルチン病) | いでんせいてつかじょうしょう | なし | なし | ORPHA:648562<br>完全一致 |  |  |
| 713 | C3腎症 | しーすりーじんしょう | なし | なし | ORPHA:329918<br>完全一致 |  |  |
| 715 | 膜性腎症（PLA2R陽性型） | まくせいじんしょう | なし | [膜性腎症](https://www.shouman.jp/disease/details/02_01_005/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 716 | 微小変化型ネフローゼ症候群（成人） | びしょうへんかがたねふろーぜしょうこうぐん | なし | [微小変化型ネフローゼ症候群](https://www.shouman.jp/disease/details/02_01_003/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 717 | 巣状分節性糸球体硬化症（遺伝性） | そうじょうぶんせつせいしきゅうたいこうかしょう | なし | [巣状分節性糸球体硬化症](https://www.shouman.jp/disease/details/02_01_004/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 723 | 常染色体優性尿細管間質性腎疾患(UMOD型) | じょうせんしょくたいゆうせいにょうさいかんかんしつせいじんしっかん | なし | [常染色体優性尿細管間質性腎疾患](https://www.shouman.jp/disease/details/02_07_027/)<br>完全一致 | ORPHA:88950<br>完全一致 | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 724 | 常染色体優性尿細管間質性腎疾患(MUC1型) | じょうせんしょくたいゆうせいにょうさいかんかんしつせいじんしっかん | なし | [常染色体優性尿細管間質性腎疾患](https://www.shouman.jp/disease/details/02_07_027/)<br>完全一致 | ORPHA:88949<br>完全一致 | 小 2026-09-22T12:12 `6ea42500acc4` |  |
| 725 | 先天性腎性マグネシウム喪失症 | せんてんせいじんせいまぐねしうむそうしつしょう | なし | なし | ORPHA:30924<br>完全一致 |  |  |
| 726 | SeSAME/EAST症候群 | せさみいーすとしょうこうぐん | なし | なし | ORPHA:199343<br>完全一致 |  |  |
| 732 | 自己免疫性腸症 | じこめんえきせいちょうしょう | なし | [自己免疫性腸症（IPEX症候群を含む。）](https://www.shouman.jp/disease/details/12_04_017/)<br>完全一致 | ORPHA:94075<br>完全一致 | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 736 | 先天性吸収不良症候群（先天性クロール下痢） | せんてんせいきゅうしゅうふりょうしょうこうぐん | なし | なし | ORPHA:53689<br>完全一致 |  |  |
| 737 | 先天性ナトリウム下痢 | せんてんせいなとりうむげり | なし | なし | ORPHA:103908<br>完全一致 |  |  |
| 739 | Tufting Enteropathy | たふてぃんぐえんてろぱちー | なし | なし | ORPHA:92050<br>完全一致 |  |  |
| 742 | ヒルシュスプルング病関連腸炎 | ひるしゅすぷるんぐびょうかんれんちょうえん | なし | [ヒルシュスプルング（Hirschsprung）病](https://www.shouman.jp/disease/details/12_16_040/)<br>完全一致 | —<br>なし | 小 2026-09-22T12:13 `5eadfd4800c0` |  |
| 745 | Mounier-Kuhn症候群 | むにえくーんしょうこうぐん | なし | なし | ORPHA:3347<br>完全一致 |  |  |
| 747 | 遺伝性眼瞼下垂 | いでんせいがんけんかすい | なし | なし | ORPHA:91411<br>完全一致 |  |  |
| 748 | 先天性線維症症候群 | せんてんせいせんいしょうしょうこうぐん | なし | なし | ORPHA:45358<br>完全一致 |  |  |
| 749 | Duane眼球後退症候群 | でゅあんがんきゅうこうたいしょうこうぐん | なし | なし | ORPHA:233<br>完全一致 |  |  |
| 750 | Moebius症候群 | めびうすしょうこうぐん | なし | なし | ORPHA:570<br>完全一致 |  |  |
| 751 | 遺伝性眼球運動失行症（Cogan型） | いでんせいがんきゅううんどうしっこうしょう | なし | なし | ORPHA:1125<br>完全一致 |  |  |
| 754 | Norrie病 | のりーびょう | なし | なし | ORPHA:649<br>完全一致 |  |  |
| 755 | Peters異常 | ぴーたーすいじょう | なし | なし | ORPHA:708<br>完全一致 |  |  |
| 757 | 先天性停止性夜盲 | せんてんせいていしせいやもう | なし | なし | ORPHA:215<br>完全一致 |  |  |
| 758 | 青錐体単色型色覚異常 | せいすいたいたんしょくがたしきかくいじょう | なし | なし | ORPHA:16<br>完全一致 |  |  |
| 760 | Stargardt病 | すたるがるとびょう | なし | なし | ORPHA:827<br>完全一致 |  |  |
| 766 | Bosch-Boonstra-Schaaf視神経萎縮症候群 | ぼっしゅぶーんすとらしゃーふししんけいいしゅくしょうこうぐん | なし | なし | ORPHA:401777<br>完全一致 |  |  |
| 767 | 遺伝性対側性色素異常症 | いでんせいたいそくせいしきそいじょうしょう | なし | なし | ORPHA:41<br>完全一致 |  |  |
| 769 | 葉状魚鱗癬 | ようじょうぎょりんせん | なし | なし | ORPHA:313<br>完全一致 |  |  |
| 772 | 遺伝性掌蹠角化症（Vörner型） | いでんせいしょうせきかくかしょう | なし | なし | ORPHA:2199<br>完全一致 |  |  |
| 773 | Chanarin-Dorfman症候群 | ちゃなりんどるふまんしょうこうぐん | なし | なし | ORPHA:98907<br>完全一致 |  |  |
| 775 | Darier病 | だりえびょう | なし | なし | ORPHA:218<br>完全一致 |  |  |
| 776 | 水疱型先天性魚鱗癬様紅皮症 | すいほうがたせんてんせいぎょりんせんようこうひしょう | なし | なし | ORPHA:312<br>完全一致 |  |  |
| 779 | 発作性極度疼痛症 | ほっさせいきょくどとうつうしょう | なし | なし | ORPHA:46348<br>完全一致 |  |  |
| 780 | Sneddon症候群 | すねどんしょうこうぐん | なし | なし | ORPHA:820<br>完全一致 |  |  |
| 781 | 限局性強皮症 | げんきょくせいきょうひしょう | なし | [限局性強皮症](https://www.shouman.jp/disease/details/14_11_016/)<br>完全一致 | ORPHA:2715<br>Severe oculo-renal-cerebellar syndrome<br>なし | 小 2026-09-22T12:13 `4ed66bfd090f` |  |
| 782 | 遺伝性毛髪・歯・爪異常症 | いでんせいもうはつしそういじょうしょう | なし | なし | ORPHA:79373<br>完全一致 |  |  |
| 783 | 遺伝性掌蹠角化症（Papillon-Lefèvre症候群） | いでんせいしょうせきかくかしょう | なし | なし | ORPHA:678<br>完全一致 |  |  |
| 784 | 掌蹠角化症(Naxos病関連) | しょうせきかくかしょう | なし | なし | ORPHA:34217<br>完全一致 |  |  |
| 785 | 弾性線維性仮性黄色腫 | だんせいせんいせいかせいおうしょくしゅ | [告示 166 弾性線維性仮性黄色腫](https://www.nanbyou.or.jp/entry/4579)<br>完全一致 | なし | ORPHA:758<br>完全一致 | 難 2026-09-22T12:11 `296d0fddd29c` |  |
| 786 | 遺伝性結合組織疾患（Cutis Laxa） | いでんせいけつごうそしきしっかん | なし | なし | ORPHA:209<br>完全一致 |  |  |
| 793 | 遺伝性第XI因子欠損症 | いでんせいだいじゅういちいんしけっそんしょう | なし | なし | ORPHA:329<br>完全一致 |  |  |
| 795 | Glanzmann血小板無力症 | ぐらんつまんけっしょうばんむりょくしょう | なし | なし | ORPHA:849<br>完全一致 |  |  |
| 797 | Gray Platelet症候群 | ぐれーぷれーとれっとしょうこうぐん | なし | なし | ORPHA:721<br>完全一致 |  |  |
| 798 | Quebec Platelet Disorder | けべっくぷれーとれっとでぃすおーだー | なし | なし | ORPHA:220436<br>完全一致 |  |  |
| 799 | Scott症候群 | すこっとしょうこうぐん | なし | なし | ORPHA:806<br>完全一致 |  |  |
| 802 | 先天性第V因子欠損症 | せんてんせいだいごいんしけっそんしょう | なし | なし | ORPHA:326<br>完全一致 |  |  |
| 804 | 先天性第II因子欠損症 | せんてんせいだいにいんしけっそんしょう | なし | なし | ORPHA:325<br>完全一致 |  |  |
| 806 | 先天性赤血球膜異常症(楕円赤血球症) | せんてんせいせっけっきゅうまくいじょうしょう | なし | なし | ORPHA:288<br>完全一致 |  |  |
| 807 | 遺伝性有口赤血球症 | いでんせいゆうこうせっけっきゅうしょう | なし | なし | ORPHA:98365<br>完全一致 |  |  |
| 820 | 遺伝性痙性対麻痺3A型 | いでんせいけいせいついまひさんえーがた | なし | なし | ORPHA:100984<br>完全一致 |  |  |
| 821 | 遺伝性痙性対麻痺7型 | いでんせいけいせいついまひなながた | なし | なし | ORPHA:99013<br>完全一致 |  |  |
| 828 | 特発性頭蓋内圧亢進症 | とくはつせいずがいないあつこうしんしょう | なし | なし | ORPHA:238624<br>完全一致 |  |  |
| 831 | Allan-Herndon-Dudley症候群 | あらんはーんどんだどれーしょうこうぐん | なし | なし | ORPHA:59<br>完全一致 |  |  |
| 840 | エチルマロン酸脳症 | えちるまろんさんのうしょう | なし | なし | ORPHA:51188<br>完全一致 |  |  |
| 847 | コエンザイムQ10欠損症 | こえんざいむきゅーてんけっそんしょう | なし | なし | ORPHA:35656<br>完全一致 |  |  |
| 850 | 先天性intrinsic factor欠損症 | せんてんせいいんとりんしっくふぁくたーけっそんしょう | なし | なし | ORPHA:35858<br>完全一致 |  |  |
| 853 | セリンリン酸化経路異常症 | せりんりんさんかけいろいじょうしょう | なし | なし | ORPHA:2671<br>完全一致 |  |  |
| 856 | 先天性副腎不全(NR0B1型) | せんてんせいふくじんふぜん | なし | なし | ORPHA:95702<br>完全一致 |  |  |
| 857 | 家族性低カルシウム尿性高カルシウム血症 | かぞくせいていかるしうむにょうせいこうかるしうむけっしょう | なし | なし | ORPHA:405<br>完全一致 |  |  |
| 861 | 遺伝性低マグネシウム血症(TRPM6以外) | いでんせいていまぐねしうむけっしょう | なし | なし | ORPHA:306516<br>完全一致 |  |  |
| 863 | 遺伝性高カリウム性周期性四肢麻痺 | いでんせいこうかりうむせいしゅうきせいししまひ | なし | [遺伝性高カリウム性周期性四肢麻痺](https://www.shouman.jp/disease/details/11_24_063/)<br>完全一致 | ORPHA:682<br>完全一致 | 小 2026-09-22T12:13 `f34802b36065` |  |
| 864 | 先天性パラミオトニア | せんてんせいぱらみおとにあ | なし | なし | ORPHA:684<br>完全一致 |  |  |
| 865 | 先天性ミオトニア(Thomsen/Becker型) | せんてんせいみおとにあ | なし | なし | ORPHA:614<br>完全一致 |  |  |
| 867 | Rippling Muscle Disease | りっぷりんぐまっするでぃじーず | なし | なし | ORPHA:97238<br>完全一致 |  |  |
| 868 | 遺伝性ミオパチー（GNE型） | いでんせいみおぱちー | なし | なし | ORPHA:602<br>完全一致 |  |  |
| 875 | Anoctamin5関連肢帯型筋ジストロフィー | あのくたみんごかんれんしたいがたきんじすとろふぃー | なし | なし | ORPHA:206549<br>完全一致 |  |  |
| 876 | Sarcoglycan関連肢帯型筋ジストロフィー | さるこぐりかんかんれんしたいがたきんじすとろふぃー | なし | なし | ORPHA:207052<br>完全一致 |  |  |
| 881 | VCP関連多系統蛋白症 | ぶいしーぴーかんれんたけいとうたんぱくしょう | なし | なし | ORPHA:52430<br>完全一致 |  |  |
| 883 | Desmin関連ミオパチー | ですみんかんれんみおぱちー | なし | なし | ORPHA:98909<br>完全一致 |  |  |
| 884 | Myosin Heavy Chain 7関連ミオパチー | みおしんへびーちぇーんせぶんかんれんみおぱちー | なし | なし | ORPHA:59135<br>完全一致 |  |  |
| 890 | 抗ARS抗体症候群 | こうえーあーるえすこうたいしょうこうぐん | なし | なし | ORPHA:81<br>完全一致 |  |  |
| 897 | 遺伝性運動感覚性ニューロパチー(HMSN)VI型 | いでんせいうんどうかんかくせいにゅーろぱちーろくがた | なし | なし | ORPHA:90120<br>完全一致 |  |  |
| 899 | 遺伝性ニューロパチー（GDAP1型） | いでんせいにゅーろぱちー | なし | なし | ORPHA:99948<br>完全一致 |  |  |
| 903 | 純粋自律神経不全症 | じゅんすいじりつしんけいふぜんしょう | なし | なし | ORPHA:441<br>完全一致 |  |  |
| 905 | AAアミロイドーシス | えーえーあみろいどーしす | なし | なし | ORPHA:85445<br>完全一致 |  |  |
| 906 | 透析アミロイドーシス | とうせきあみろいどーしす | なし | なし | ORPHA:85446<br>完全一致 |  |  |
| 907 | 遺伝性全身性AApoAIアミロイドーシス | いでんせいぜんしんせいえーあぽえーわんあみろいどーしす | なし | なし | ORPHA:93560<br>完全一致 |  |  |
| 913 | メチオニンアデノシルトランスフェラーゼ欠損症 | めちおにんあでのしるとらんすふぇらーぜけっそんしょう | なし | なし | ORPHA:168598<br>完全一致 |  |  |
| 921 | 先天性十二指腸閉鎖症 | せんてんせいじゅうにしちょうへいさしょう | なし | なし | ORPHA:1203<br>完全一致 |  |  |
| 922 | 先天性小腸閉鎖症 | せんてんせいしょうちょうへいさしょう | なし | なし | ORPHA:1201<br>完全一致 |  |  |
| 925 | 先天性声門下狭窄 | せんてんせいせいもんかきょうさく | なし | なし | ORPHA:141121<br>完全一致 |  |  |
| 926 | 先天性後鼻孔閉鎖 | せんてんせいこうびこうへいさ | なし | なし | ORPHA:137914<br>完全一致 |  |  |
| 927 | ピエール・ロバン症候群 | ぴえーるろばんしょうこうぐん | なし | なし | ORPHA:718<br>完全一致 |  |  |
| 928 | Goldenhar症候群 | ごーるでんはーしょうこうぐん | なし | なし | ORPHA:141132<br>完全一致 |  |  |
| 931 | 頭蓋骨幹端異形成症（Pyle型） | とうがいこつかんたんいけいせいしょう | なし | なし | ORPHA:3005<br>完全一致 |  |  |
| 933 | 先天性緑内障 | せんてんせいりょくないしょう | なし | なし | ORPHA:98976<br>完全一致 |  |  |
| 938 | Usher症候群1型 | あっしゃーしょうこうぐんいちがた | なし | なし | ORPHA:231169<br>完全一致 |  |  |
| 939 | Usher症候群2型 | あっしゃーしょうこうぐんにがた | なし | なし | ORPHA:231178<br>完全一致 |  |  |
| 940 | Usher症候群3型 | あっしゃーしょうこうぐんさんがた | なし | なし | ORPHA:231183<br>完全一致 |  |  |
| 945 | Waardenburg症候群1型 | わーるでんぶるぐしょうこうぐんいちがた | なし | なし | ORPHA:894<br>完全一致 |  |  |
| 946 | Waardenburg症候群2型 | わーるでんぶるぐしょうこうぐんにがた | なし | なし | ORPHA:895<br>完全一致 |  |  |
| 950 | 口顔指症候群 | こうがんししょうこうぐん | なし | なし | ORPHA:140997<br>完全一致 |  |  |

## 5. 3 出典とも「なし」

123 件。フェーズ1 で出典を取れない疾患。

| idx | 病名 | ふりがな | ORPHA コード |
|---:|---|---|---|
| 16 | 遺伝性ALS | いでんせいえーえるえす | — |
| 25 | カタトニア症候群 | かたとにあしょうこうぐん | — |
| 119 | 尿崩症 | にょうほうしょう | — |
| 131 | 特発性正常圧水頭症 | とくはつせいせいじょうあつすいとうしょう | — |
| 144 | CLN2病 | しーえるえぬつーびょう | — |
| 153 | 神経内分泌腫瘍 | しんけいないぶんぴしゅよう | — |
| 155 | 乾癬性関節炎 | かんせんせいかんせつえん | — |
| 170 | 心臓粘液腫 | しんぞうねんえきしゅ | — |
| 189 | 甲状腺クリーゼ | こうじょうせんくりーぜ | — |
| 198 | 好酸球性食道炎 | こうさんきゅうせいしょくどうえん | — |
| 200 | ミトコンドリア脳筋症 | みとこんどりあのうきんしょう | — |
| 219 | 加齢黄斑変性（滲出型） | かれいおうはんへんせい | — |
| 228 | 原発性卵巣不全 | げんぱつせいらんそうふぜん | — |
| 229 | 肝内結石症 | かんないけっせきしょう | — |
| 231 | 遺伝性難聴 | いでんせいなんちょう | — |
| 265 | 特発性ステロイド性骨壊死症 | とくはつせいすてろいどせいこつえししょう | — |
| 279 | メニエール病 | めにえーるびょう | — |
| 285 | 関節リウマチ関連間質性肺疾患 | かんせつりうまちかんれんかんしつせいはいしっかん | — |
| 291 | 自己免疫性好中球減少症 | じこめんえきせいこうちゅうきゅうげんしょうしょう | — |
| 297 | 非ジストロフィー性ミオトニア | ひじすとろふぃーせいみおとにあ | — |
| 319 | 腸回転異常症 | ちょうかいてんいじょうしょう | — |
| 324 | 好酸球性中耳炎 | こうさんきゅうせいちゅうじえん | — |
| 326 | 先天性水腎症 | せんてんせいすいじんしょう | — |
| 334 | 後腹膜線維症 | こうふくまくせんいしょう | ORPHA:31 |
| 341 | 正常圧水頭症（二次性） | せいじょうあつすいとうしょう | — |
| 347 | メッケル憩室 | めっけるけいしつ | — |
| 348 | 肝血管腫 | かんけっかんしゅ | — |
| 356 | 慢性免疫性脱髄性多発根神経炎純運動型 | まんせいめんえきせいだつずいせいたはつこんしんけいえんじゅんうんどうがた | — |
| 362 | リウマチ性多発筋痛症 | りうまちせいたはつきんつうしょう | — |
| 363 | RS3PE症候群 | あーるえすすりーぴーいーしょうこうぐん | — |
| 368 | 子宮内膜症 | しきゅうないまくしょう | — |
| 370 | 環状肉芽腫 | かんじょうにくげしゅ | — |
| 395 | 巨大結腸症 | きょだいけっちょうしょう | — |
| 423 | Potocki-Lupski症候群 | ぽときるぷすきしょうこうぐん | — |
| 424 | Renpenning症候群 | れんぺにんぐしょうこうぐん | — |
| 448 | 遺伝性プロテインS欠乏症 | いでんせいぷろていんえすけつぼうしょう | — |
| 453 | Parkes Weber症候群 | ぱーくすうぇーばーしょうこうぐん | — |
| 482 | 8p23.1欠失症候群 | はちぴーにさんてんいちけっしつしょうこうぐん | — |
| 486 | 乳児てんかん性スパズム症候群（結節性硬化症関連） | にゅうじてんかんせいすぱずむしょうこうぐん | — |
| 502 | ホロカルボキシラーゼ合成酵素欠損症 | ほろかるぼきしらーぜごうせいこうそけっそんしょう | ORPHA:79242 |
| 504 | テトラヒドロビオプテリン欠乏症 | てとらひどろびおぷてりんけつぼうしょう | ORPHA:226 |
| 519 | Mitchell-Riley症候群 | みっちぇるらいりーしょうこうぐん | — |
| 520 | KCNJ11関連新生児糖尿病 | けーしーえぬじぇいわんわんかんれんしんせいじとうにょうびょう | — |
| 539 | ミトコンドリア心筋症 | みとこんどりあしんきんしょう | — |
| 595 | H症候群 | えいちしょうこうぐん | ORPHA:168569 |
| 599 | PFAPA症候群 | ぴーふぁぱしょうこうぐん | — |
| 602 | A20ハプロ不全症 | えーつーぜろはぷろふぜんしょう | — |
| 603 | VEXAS症候群 | べくさすしょうこうぐん | — |
| 607 | 肺分画症 | はいぶんかくしょう | — |
| 612 | 先天性気管支閉鎖症 | せんてんせいきかんしへいさしょう | — |
| 620 | 遺伝性感覚性ニューロパチーI型 | いでんせいかんかくせいにゅーろぱちーいちがた | ORPHA:36386 |
| 622 | Isaac症候群 | あいざっくしょうこうぐん | ORPHA:84142 |
| 627 | 視神経脊髄炎関連疾患（MOG抗体） | ししんけいせきずいえんかんれんしっかん | — |
| 628 | 抗GABAb受容体抗体関連脳炎 | こうぎゃばびーじゅようたいこうたいかんれんのうえん | — |
| 629 | 抗AMPA受容体抗体関連脳炎 | こうあんぱじゅようたいこうたいかんれんのうえん | — |
| 634 | IgG4関連硬膜炎 | あいじーじーふぉーかんれんこうまくえん | — |
| 635 | IgG4関連涙腺・唾液腺炎 | あいじーじーふぉーかんれんるいせんだえきせんえん | — |
| 636 | IgG4関連後腹膜/大動脈周囲炎 | あいじーじーふぉーかんれんこうふくまくだいどうみゃくしゅういえん | — |
| 660 | 遺伝性褐色細胞腫/パラガングリオーマ症候群 | いでんせいかっしょくさいぼうしゅぱらがんぐりおーましょうこうぐん | ORPHA:29072 |
| 670 | 先天性甲状腺機能低下症（中枢性） | せんてんせいこうじょうせんきのうていかしょう | — |
| 671 | 成人成長ホルモン分泌不全症 | せいじんせいちょうほるもんぶんぴふぜんしょう | — |
| 674 | 遺伝性腎性低尿酸血症 | いでんせいじんせいていにょうさんけっしょう | — |
| 695 | 遺伝性痙攣性発声障害 | いでんせいけいれんせいはっせいしょうがい | — |
| 696 | 本態性振戦（重症型） | ほんたいせいしんせん | — |
| 707 | 部分トリソミー（不均衡転座） | ぶぶんとりそみー | — |
| 719 | 先天性フィンランド型ネフローゼ症候群 | せんてんせいふぃんらんどがたねふろーぜしょうこうぐん | ORPHA:839 |
| 727 | 先天性腎尿細管障害（Fanconi症候群） | せんてんせいじんにょうさいかんしょうがい | — |
| 734 | 蛋白漏出性胃腸症 | たんぱくろうしゅつせいいちょうしょう | — |
| 735 | 腸管囊胞様気腫症 | ちょうかんのうほうようきしゅしょう | — |
| 746 | Williams-Campbell症候群 | うぃりあむずきゃんべるしょうこうぐん | ORPHA:3348 |
| 763 | Kabuki症候群2型 | かぶきしょうこうぐんにがた | — |
| 805 | PAI-1欠損症 | ぴーえーあいわんけっそんしょう | ORPHA:99901 |
| 810 | ANKRD26関連血小板減少症 | えーえぬけーあーるでぃーつーしっくすかんれんけっしょうばんげんしょうしょう | — |
| 815 | 特発性側弯症（重症進行性） | とくはつせいそくわんしょう | — |
| 816 | 先天性側弯症（椎体形成異常） | せんてんせいそくわんしょう | — |
| 817 | 変形性股関節症（二次性・若年型） | へんけいせいこかんせつしょう | — |
| 818 | 脊髄係留症候群 | せきずいけいりゅうしょうこうぐん | — |
| 819 | 環軸椎脱臼（先天性） | かんじくついだっきゅう | — |
| 822 | 遺伝性痙性対麻痺5A型 | いでんせいけいせいついまひごえーがた | — |
| 823 | 遺伝性ニューロパチー（SORD欠損症） | いでんせいにゅーろぱちー | — |
| 825 | 抗MAG抗体ニューロパチー | こうえむえーじーこうたいにゅーろぱちー | ORPHA:209004 |
| 826 | 肥厚性硬膜炎 | ひこうせいこうまくえん | — |
| 827 | 脊髄硬膜動静脈瘻 | せきずいこうまくどうじょうみゃくろう | — |
| 832 | 遺伝性線条体壊死 | いでんせいせんじょうたいえし | — |
| 833 | 遺伝性小脳低形成 | いでんせいしょうのうていけいせい | — |
| 834 | 先天性眼球振盪 | せんてんせいがんきゅうしんとう | — |
| 835 | 進行性外眼筋麻痺(ミトコンドリア) | しんこうせいがいがんきんまひ | — |
| 839 | ミトコンドリア糖尿病・難聴 | みとこんどりあとうにょうびょうなんちょう | — |
| 844 | 複合体III欠損症 | ふくごうたいさんけっそんしょう | ORPHA:2611 |
| 845 | 複合体IV欠損症（SCO2型） | ふくごうたいよんけっそんしょう | ORPHA:2612 |
| 846 | ミトコンドリア翻訳異常症 | みとこんどりあほんやくいじょうしょう | — |
| 848 | 遺伝性マンガン輸送異常症 | いでんせいまんがんゆそういじょうしょう | ORPHA:521406 |
| 851 | トランスコバラミン欠損症 | とらんすこばらみんけっそんしょう | — |
| 852 | 遺伝性ピリドキシン依存性てんかん | いでんせいぴりどきしんいぞんせいてんかん | ORPHA:3006 |
| 855 | 先天性グルタミン合成酵素欠損症 | せんてんせいぐるたみんごうせいこうそけっそんしょう | ORPHA:71278 |
| 858 | 常染色体優性低カルシウム血症 | じょうせんしょくたいゆうせいていかるしうむけっしょう | ORPHA:428 |
| 869 | 先天性筋緊張性ジストロフィー | せんてんせいきんきんちょうせいじすとろふぃー | — |
| 870 | 核膜病（LMNA関連拡張型心筋症） | かくまくびょう | — |
| 882 | BAG3関連筋原線維性ミオパチー | びーえーじーすりーかんれんきんげんせんいせいみおぱちー | — |
| 885 | 壊死性ミオパチー（抗SRP抗体型） | えしせいみおぱちー | — |
| 886 | 壊死性ミオパチー（抗HMGCR抗体型） | えしせいみおぱちー | — |
| 887 | 抗MDA5抗体陽性皮膚筋炎 | こうえむでぃーえーふぁいぶこうたいようせいひふきんえん | — |
| 888 | 抗TIF1γ抗体陽性皮膚筋炎 | こうてぃーあいえふわんがんまこうたいようせいひふきんえん | — |
| 889 | 抗Mi-2抗体陽性皮膚筋炎 | こうえむあいつーこうたいようせいひふきんえん | — |
| 896 | 遺伝性感覚性ニューロパチーII型 | いでんせいかんかくせいにゅーろぱちーにがた | ORPHA:970 |
| 898 | 遺伝性ニューロパチー(NEFL型) | いでんせいにゅーろぱちー | — |
| 901 | Ross症候群 | ろすしょうこうぐん | — |
| 902 | 特発性自律神経ニューロパチー | とくはつせいじりつしんけいにゅーろぱちー | — |
| 904 | 遺伝性アミロイドニューロパチー（V30M以外） | いでんせいあみろいどにゅーろぱちー | — |
| 908 | AGelアミロイドーシス | えーげるあみろいどーしす | ORPHA:93557 |
| 909 | ALect2アミロイドーシス | えーえるいーしーてぃーつーあみろいどーしす | — |
| 917 | 先天性胆汁酸合成異常症(Δ4-3-oxosteroid型) | せんてんせいたんじゅうさんごうせいいじょうしょう | — |
| 923 | 先天性気管気管支軟化症 | せんてんせいきかんきかんしなんかしょう | — |
| 924 | 先天性喉頭軟化症 | せんてんせいこうとうなんかしょう | — |
| 929 | 三角頭蓋（前頭縫合早期癒合） | さんかくとうがい | — |
| 932 | 先天性鼻涙管閉塞 | せんてんせいびるいかんへいそく | — |
| 934 | 微小眼球症 | びしょうがんきゅうしょう | ORPHA:136 |
| 935 | 先天性白内障 | せんてんせいはくないしょう | ORPHA:136 |
| 941 | 遺伝性難聴(GJB2型) | いでんせいなんちょう | ORPHA:90635 |
| 942 | 遺伝性難聴(MYO15A型) | いでんせいなんちょう | ORPHA:90636 |
| 943 | 遺伝性難聴(SLC26A4型-非症候群性) | いでんせいなんちょう | — |
| 948 | 遺伝性難聴(OTOF型) | いでんせいなんちょう | ORPHA:90636 |
| 949 | COACH症候群 | こーちしょうこうぐん | ORPHA:2816 |

## 6. Orphanet リンク対象外（orpha_code の取り違えの疑い）

44 件。コードは実在するが、指している疾患が我々の病名と重ならない。
`docs/kb_issues_2026-08-29.md` にも同じ一覧を追記した。

| idx | 病名 | ふりがな | 記録されている ORPHA コード | そのコードが指す Orphanet の疾患名 |
|---:|---|---|---|---|
| 43 | 骨髄異形成症候群 | こつずいいけいせいしょうこうぐん | ORPHA:52 | Alagille syndrome |
| 73 | 脊髄小脳変性症 | せきずいしょうのうへんせいしょう | ORPHA:94145 | Autosomal dominant cerebellar ataxia type I |
| 76 | 大脳皮質基底核変性症 | だいのうひしつきていかくへんせいしょう | ORPHA:2098 | Acromesomelic dysplasia, Grebe type |
| 284 | 強直性脊椎炎 | きょうちょくせいせきついえん | ORPHA:449 | Hepatoblastoma |
| 334 | 後腹膜線維症 | こうふくまくせんいしょう | ORPHA:31 | Oxoglutaric aciduria |
| 396 | 肺静脈還流異常症 | はいじょうみゃくかんりゅういじょうしょう | ORPHA:99062 | Mitral valve agenesis |
| 502 | ホロカルボキシラーゼ合成酵素欠損症 | ほろかるぼきしらーぜごうせいこうそけっそんしょう | ORPHA:79242 | Holocarboxylase synthetase deficiency |
| 504 | テトラヒドロビオプテリン欠乏症 | てとらひどろびおぷてりんけつぼうしょう | ORPHA:226 | Dihydropteridine reductase deficiency |
| 573 | 骨形成不全症IV型 | こつけいせいふぜんしょうよんがた | ORPHA:216820 | Osteogenesis imperfecta type 4 |
| 574 | 骨形成不全症V型 | こつけいせいふぜんしょうごがた | ORPHA:216828 | Osteogenesis imperfecta type 5 |
| 591 | 巨大リンパ管奇形(嚢胞性ヒグローマ) | きょだいりんぱかんきけい | ORPHA:79489 | Macrocystic lymphatic malformation |
| 595 | H症候群 | えいちしょうこうぐん | ORPHA:168569 | H syndrome |
| 611 | 総排泄腔遺残 | そうはいせつくういざん | ORPHA:93929 | Cloacal exstrophy |
| 620 | 遺伝性感覚性ニューロパチーI型 | いでんせいかんかくせいにゅーろぱちーいちがた | ORPHA:36386 | Hereditary sensory and autonomic neuropathy type 1 |
| 622 | Isaac症候群 | あいざっくしょうこうぐん | ORPHA:84142 | Isaacs syndrome |
| 660 | 遺伝性褐色細胞腫/パラガングリオーマ症候群 | いでんせいかっしょくさいぼうしゅぱらがんぐりおーましょうこうぐん | ORPHA:29072 | Hereditary pheochromocytoma-paraganglioma |
| 668 | 甲状腺ホルモン不応症 | こうじょうせんほるもんふおうしょう | ORPHA:853 | Fetal and neonatal alloimmune thrombocytopenia |
| 692 | 遺伝性ジストニア（DYT1） | いでんせいじすとにあ | ORPHA:256 | Early-onset generalized limb-onset dystonia |
| 693 | ドパ反応性ジストニア | どぱはんのうせいじすとにあ | ORPHA:255 | Dopa-responsive dystonia |
| 719 | 先天性フィンランド型ネフローゼ症候群 | せんてんせいふぃんらんどがたねふろーぜしょうこうぐん | ORPHA:839 | Congenital nephrotic syndrome, Finnish type |
| 746 | Williams-Campbell症候群 | うぃりあむずきゃんべるしょうこうぐん | ORPHA:3348 | Tracheobronchopathia osteochondroplastica |
| 762 | 先天性グリコシルホスファチジルイノシトール欠損症 | せんてんせいぐりこしるほすふぁちじるいのしとーるけっそんしょう | ORPHA:352587 | Focal epilepsy-intellectual disability-cerebro-cerebellar malformation |
| 781 | 限局性強皮症 | げんきょくせいきょうひしょう | ORPHA:2715 | Severe oculo-renal-cerebellar syndrome |
| 805 | PAI-1欠損症 | ぴーえーあいわんけっそんしょう | ORPHA:99901 | Acyl-CoA dehydrogenase 9 deficiency |
| 811 | ヌーナン症候群様疾患(CBL変異) | ぬーなんしょうこうぐんようしっかん | ORPHA:363700 | Neurofibromatosis type 1 due to NF1 mutation or intragenic deletion |
| 825 | 抗MAG抗体ニューロパチー | こうえむえーじーこうたいにゅーろぱちー | ORPHA:209004 | Polyneuropathy associated with IgM monoclonal gammopathy |
| 837 | ミトコンドリアDNA枯渇症候群（肝脳型） | みとこんどりあでぃえぬえーこかつしょうこうぐん | ORPHA:254902 | Renal tubulopathy-encephalopathy-liver failure syndrome |
| 842 | 先天性高乳酸血症（PC欠損症） | せんてんせいこうにゅうさんけっしょう | ORPHA:3008 | Pyruvate carboxylase deficiency |
| 844 | 複合体III欠損症 | ふくごうたいさんけっそんしょう | ORPHA:2611 | Linear verrucous nevus syndrome |
| 845 | 複合体IV欠損症（SCO2型） | ふくごうたいよんけっそんしょう | ORPHA:2612 | Linear nevus sebaceus syndrome |
| 848 | 遺伝性マンガン輸送異常症 | いでんせいまんがんゆそういじょうしょう | ORPHA:521406 | Dystonia-parkinsonism-hypermanganesemia syndrome |
| 852 | 遺伝性ピリドキシン依存性てんかん | いでんせいぴりどきしんいぞんせいてんかん | ORPHA:3006 | Pyridoxine-dependent-developmental and epileptic encephalopathy |
| 855 | 先天性グルタミン合成酵素欠損症 | せんてんせいぐるたみんごうせいこうそけっそんしょう | ORPHA:71278 | Congenital brain dysgenesis due to glutamine synthetase deficiency |
| 858 | 常染色体優性低カルシウム血症 | じょうせんしょくたいゆうせいていかるしうむけっしょう | ORPHA:428 | Autosomal dominant hypocalcemia |
| 871 | LMNA関連肢帯型筋ジストロフィー | えるえむえぬえーかんれんしたいがたきんじすとろふぃー | ORPHA:98853 | Autosomal dominant Emery-Dreifuss muscular dystrophy |
| 896 | 遺伝性感覚性ニューロパチーII型 | いでんせいかんかくせいにゅーろぱちーにがた | ORPHA:970 | Hereditary sensory and autonomic neuropathy type 2 |
| 900 | 先天性無痛症（HSAN V型） | せんてんせいむつうしょう | ORPHA:64752 | Hereditary sensory and autonomic neuropathy type 5 |
| 908 | AGelアミロイドーシス | えーげるあみろいどーしす | ORPHA:93557 | Light and heavy chain deposition disease |
| 934 | 微小眼球症 | びしょうがんきゅうしょう | ORPHA:136 | CADASIL |
| 935 | 先天性白内障 | せんてんせいはくないしょう | ORPHA:136 | CADASIL |
| 941 | 遺伝性難聴(GJB2型) | いでんせいなんちょう | ORPHA:90635 | Autosomal dominant non-syndromic genetic deafness |
| 942 | 遺伝性難聴(MYO15A型) | いでんせいなんちょう | ORPHA:90636 | Autosomal recessive non-syndromic genetic deafness |
| 948 | 遺伝性難聴(OTOF型) | いでんせいなんちょう | ORPHA:90636 | Autosomal recessive non-syndromic genetic deafness |
| 949 | COACH症候群 | こーちしょうこうぐん | ORPHA:2816 | Spastic paraplegia-epilepsy-intellectual disability syndrome |

## 7. フェーズ1 の 10 分割案

「出典の手がかりがあるもの」**828 件**（3 出典のいずれかが「完全一致」か「要確認」）を等分し、
知識ファイルの出現順（idx）で連続した範囲に切った。出典が無い行も範囲には含まれる。

**§3 の ○× が付いたあとに件数が動くので、そのときは作り直す。**

| 分割 | idx 範囲 | 出典ありの件数 | 範囲内の疾患数 |
|---:|---|---:|---:|
| 1 | 0–84 | 83 | 85 |
| 2 | 85–173 | 83 | 89 |
| 3 | 174–263 | 83 | 90 |
| 4 | 264–359 | 83 | 96 |
| 5 | 360–450 | 83 | 91 |
| 6 | 451–541 | 83 | 91 |
| 7 | 542–638 | 83 | 97 |
| 8 | 639–730 | 83 | 92 |
| 9 | 731–828 | 82 | 98 |
| 10 | 829–950 | 82 | 122 |

いま URL が確定していて、すぐ本文を取りに行けるのは **297 件**
（難病情報センター 163 件 / 小児慢性 212 件、両方ある 78 件）。
残りは §3 の確認を経てから増える。

