# ORPHA番号 適用ログ（2026-08-30 承認分）

対象ファイル: `data/knowledge/comprehensive_rare_diseases_knowledge.json`
適用元:
- `docs/orpha_corrections_2026-08-29.json`（v1・承認 72 件）
- `docs/orpha_corrections_v2_2026-08-30.json`（v2・承認 137 件）

変更対象は **`orpha_code` フィールドのみ**。疾患名・別名・説明・症状・症状表現・診断・治療には一切触れない。

---

## 適用前

### 1. ファイル指紋

| 項目 | 値 |
|---|---|
| SHA-256 | `287437f6a04b6b7078a086ec0b715c1a0e8be7872bcbb9bf908a6910c72536e7` |
| バイト数 | 771,949 |

### 2. 現在の件数

| 項目 | 実測 | 期待 | 判定 |
|---|---|---|---|
| 疾患数 | 1,001 | 1,001 | 一致 |
| ORPHA番号を持つ疾患数 | 701 | 701 | 一致 |
| 症状語の総数（symptoms ∪ symptom_patterns のユニーク語） | 3,663 | 3,663 | 一致 |
| symptom_patterns（ユニーク語） | 1,880 | 1,880 | 一致 |

補足（内訳）:
- `symptoms` ユニーク語 1,962 件、`symptom_patterns` ユニーク語 1,880 件、和集合 3,663 件。
- 延べ数（重複込み）は `symptoms` 4,319 件、`symptom_patterns` 4,258 件。基準線 3,663 / 1,880 はユニーク語数を指す。

### 3. 構造の事前確認

- レコードのキー順は2種類のみ。`orpha_code` を持つ 701 件はすべて `disease, alternate_names, orpha_code, description, symptoms, symptom_patterns, diagnosis, treatment`。持たない 300 件は `orpha_code` を除いた同じ並び。→ `add` は必ず `alternate_names` と `description` の間に挿入する。
- `orpha_code` が `null` や空文字のレコードは 0 件。「番号なし」＝フィールド自体が無い、で統一されている。→ `remove` はフィールドごと削除する。
- 承認 209 件の index は v1 と v2 で重複なし（積集合は空）。同一 index が2回書き換わることはない。
- 209 件すべてについて、対象レコードの `disease` が修正案の `disease` と一致することを確認済み。
- `fix` 83 件すべてについて、現在の `orpha_code` が修正案の `current` と一致することを確認済み（＝未適用であることの裏付け）。
- `add` 115 件すべてについて、対象レコードに `orpha_code` が存在しないことを確認済み。
- `remove` 11 件すべてについて、対象レコードに `orpha_code` が存在することを確認済み。
- `proposed` の値はすべて `ORPHA:<数字>` 形式（`remove` を除く）。

### 4. 競合の扱い（確認済みの方針どおり）

| index | 内容 | 扱い |
|---|---|---|
| 120 | v1 で却下（ORPHA:96253）、v2 で承認（ORPHA:641613） | v2 を適用（v1 の却下分は承認集合に含まれないため自動的に除外） |
| 722 | v1 承認・v2 は `duplicate_of_v1`（同一番号 ORPHA:306674） | v1 のみ適用（v2 は承認集合に含まれない） |

### 5. 適用件数の内訳（予定）

| 版 | fix | add | remove | 計 |
|---|---|---|---|---|
| v1 | 22 | 50 | 0 | 72 |
| v2 | 61 | 65 | 11 | 137 |
| 合計 | 83 | 115 | 11 | 209 |

適用後に ORPHA番号を持つ疾患数の予測: 701 + 115（add）− 11（remove） = **805**

> 注意: 指示書の予測は「701 + 補完65 − 削除11 = 755」。この 65 は v2 の `add` のみで、v1 の `add` 50 件が数えられていない。v1 の add 対象 50 件はいずれも現在 `orpha_code` を持たないレコードであることを実測で確認済みのため、正しい予測値は 805 件。

### 6. 変更する 209 件の一覧

| index | 疾患 | 版 | action | 現在 | 適用後 |
|---|---|---|---|---|---|
| 5 | ニーマン・ピック病C型 | v1 | fix | ORPHA:644 | ORPHA:646 |
| 8 | 軟骨無形成症 | v1 | add | — | ORPHA:15 |
| 9 | デュシェンヌ型筋ジストロフィー | v1 | add | — | ORPHA:98896 |
| 10 | 血栓性血小板減少性紫斑病 | v1 | add | — | ORPHA:54057 |
| 11 | 原発性高シュウ酸尿症1型 | v1 | add | — | ORPHA:93598 |
| 12 | フェニルケトン尿症 | v1 | add | — | ORPHA:716 |
| 14 | MELAS症候群 | v1 | add | — | ORPHA:550 |
| 18 | 血友病A | v1 | add | — | ORPHA:98878 |
| 19 | 発作性夜間ヘモグロビン尿症 | v1 | add | — | ORPHA:447 |
| 20 | 非典型溶血性尿毒症症候群 | v1 | add | — | ORPHA:2134 |
| 22 | X連鎖性低リン血症性くる病 | v1 | add | — | ORPHA:89936 |
| 23 | 低ホスファターゼ症 | v1 | add | — | ORPHA:436 |
| 24 | レーベル先天性黒内障 | v1 | add | — | ORPHA:65 |
| 26 | ALS | v1 | add | — | ORPHA:803 |
| 29 | ハンチントン病 | v1 | add | — | ORPHA:399 |
| 30 | ウィルソン病 | v1 | fix | ORPHA:902 | ORPHA:905 |
| 97 | 血友病B | v1 | fix | ORPHA:101 | ORPHA:98879 |
| 136 | 多巣性運動ニューロパチー | v1 | add | — | ORPHA:641 |
| 139 | 抗リン脂質抗体症候群 | v1 | fix | ORPHA:464 | ORPHA:80 |
| 142 | アジソン病 | v1 | add | — | ORPHA:85138 |
| 156 | GIST | v1 | add | — | ORPHA:44890 |
| 182 | プロラクチノーマ | v1 | add | — | ORPHA:2965 |
| 189 | 寒冷凝集素症 | v1 | add | — | ORPHA:56425 |
| 196 | 閉塞性細気管支炎 | v1 | add | — | ORPHA:1303 |
| 220 | グルカゴノーマ | v1 | fix | ORPHA:97261 | ORPHA:97280 |
| 221 | VIPoma | v1 | add | — | ORPHA:97282 |
| 230 | 単心室症 | v1 | add | — | ORPHA:1464 |
| 252 | 片側巨脳症 | v1 | add | — | ORPHA:99802 |
| 289 | 特発性器質化肺炎 | v1 | add | — | ORPHA:1302 |
| 308 | 進行性多巣性白質脳症 | v1 | add | — | ORPHA:217260 |
| 309 | 好酸球性筋膜炎 | v1 | add | — | ORPHA:3165 |
| 315 | フィッシャー症候群 | v1 | add | — | ORPHA:98919 |
| 326 | 遺伝性ニューロパチー伴うアミロイドーシス | v1 | fix | ORPHA:85447 | ORPHA:271861 |
| 328 | 老人性全身性アミロイドーシス | v1 | add | — | ORPHA:330001 |
| 339 | 反応性関節炎 | v1 | add | — | ORPHA:29207 |
| 347 | クロンカイト・カナダ症候群 | v1 | add | — | ORPHA:2930 |
| 348 | 孤立性線維性腫瘍 | v1 | add | — | ORPHA:2126 |
| 355 | 原発性シュウ酸過多症 | v1 | fix | ORPHA:93598 | ORPHA:416 |
| 368 | 副腎脳白質ジストロフィー脊髄型 | v1 | add | — | ORPHA:139399 |
| 382 | 後部尿道弁 | v1 | add | — | ORPHA:93110 |
| 384 | 未熟児網膜症 | v1 | add | — | ORPHA:90050 |
| 407 | 若年性パーキンソン病 | v1 | add | — | ORPHA:2828 |
| 424 | 毛細血管拡張症性小脳失調症2型 | v1 | add | — | ORPHA:251347 |
| 472 | CLOVES症候群 | v1 | fix | ORPHA:166272 | ORPHA:140944 |
| 474 | 遺伝性リンパ浮腫 | v1 | fix | ORPHA:2165 | ORPHA:79452 |
| 497 | 遺伝性低リン血症性くる病（FGF23関連） | v1 | add | — | ORPHA:89937 |
| 540 | 遺伝性キサンチン尿症 | v1 | add | — | ORPHA:3467 |
| 554 | 筋強直性ジストロフィー2型 | v1 | fix | ORPHA:99736 | ORPHA:606 |
| 585 | ヒスチジン血症 | v1 | add | — | ORPHA:2157 |
| 588 | 先天性大脳白質形成不全症 | v1 | fix | ORPHA:137898 | ORPHA:289494 |
| 612 | Ellis-van Creveld症候群 | v1 | fix | ORPHA:298 | ORPHA:289 |
| 636 | 先天性気管狭窄症 | v1 | add | — | ORPHA:141127 |
| 637 | 先天性嚢胞性腺腫様奇形 | v1 | fix | ORPHA:2357 | ORPHA:2444 |
| 655 | Morvan症候群 | v1 | fix | ORPHA:84 | ORPHA:83467 |
| 662 | 傍腫瘍性小脳変性症 | v1 | add | — | ORPHA:623626 |
| 671 | 原発性リンパ浮腫（Meige型） | v1 | add | — | ORPHA:90186 |
| 722 | Kufor-Rakeb症候群 | v1 | fix | ORPHA:306669 | ORPHA:306674 |
| 783 | 先天性肺動静脈瘻 | v1 | add | — | ORPHA:2038 |
| 787 | 先天性線維症症候群 | v1 | fix | ORPHA:98692 | ORPHA:45358 |
| 811 | 遺伝性掌蹠角化症（Vörner型） | v1 | fix | ORPHA:2339 | ORPHA:2199 |
| 835 | Bernard-Soulier症候群 | v1 | fix | ORPHA:868 | ORPHA:274 |
| 838 | Scott症候群 | v1 | fix | ORPHA:3204 | ORPHA:806 |
| 882 | エチルマロン酸脳症 | v1 | fix | ORPHA:51 | ORPHA:51188 |
| 928 | Myosin Heavy Chain 7関連ミオパチー | v1 | fix | ORPHA:598 | ORPHA:59135 |
| 934 | 抗ARS抗体症候群 | v1 | add | — | ORPHA:81 |
| 947 | 純粋自律神経不全症 | v1 | add | — | ORPHA:441 |
| 950 | AAアミロイドーシス | v1 | add | — | ORPHA:85445 |
| 966 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | v1 | add | — | ORPHA:772 |
| 969 | 先天性食道閉鎖症 | v1 | add | — | ORPHA:1199 |
| 970 | 先天性十二指腸閉鎖症 | v1 | add | — | ORPHA:1203 |
| 976 | 先天性後鼻孔閉鎖 | v1 | add | — | ORPHA:137914 |
| 978 | Goldenhar症候群 | v1 | fix | ORPHA:374 | ORPHA:141132 |
| 1 | ムコ多糖症I型 | v2 | fix | ORPHA:93473 | ORPHA:579 |
| 7 | 遺伝性血管浮腫 | v2 | add | — | ORPHA:91378 |
| 15 | 脊髄性筋萎縮症 | v2 | add | — | ORPHA:70 |
| 16 | 遺伝性ATTR型アミロイドーシス | v2 | add | — | ORPHA:271861 |
| 21 | 原発性免疫不全症 | v2 | add | — | ORPHA:101997 |
| 41 | ANCA関連血管炎 | v2 | add | — | ORPHA:156152 |
| 42 | IgA腎症 | v2 | fix | ORPHA:97556 | ORPHA:34145 |
| 49 | エーラス・ダンロス症候群 | v2 | fix | ORPHA:287 | ORPHA:98249 |
| 59 | 筋強直性ジストロフィー | v2 | fix | ORPHA:273 | ORPHA:206647 |
| 61 | 先天性甲状腺機能低下症 | v2 | add | — | ORPHA:442 |
| 70 | ミトコンドリア病 | v2 | add | — | ORPHA:68380 |
| 81 | てんかん | v2 | add | — | ORPHA:166463 |
| 89 | 拘束型心筋症 | v2 | add | — | ORPHA:217632 |
| 95 | 糖原病 | v2 | add | — | ORPHA:79201 |
| 105 | IgG4関連疾患 | v2 | add | — | ORPHA:284264 |
| 109 | 好酸球性消化管疾患 | v2 | add | — | ORPHA:402029 |
| 120 | クッシング症候群 | v2 | fix | ORPHA:553 | ORPHA:641613 |
| 126 | ナルコレプシー | v2 | fix | ORPHA:2073 | ORPHA:619284 |
| 143 | 中枢性尿崩症 | v2 | add | — | ORPHA:178029 |
| 147 | 酸性スフィンゴミエリナーゼ欠損症 | v2 | fix | ORPHA:618 | ORPHA:618899 |
| 149 | 特発性肺動脈性肺高血圧症 | v2 | add | — | ORPHA:275766 |
| 150 | 短腸症候群 | v2 | add | — | ORPHA:104008 |
| 172 | ウエスト症候群 | v2 | fix | ORPHA:3451 | ORPHA:697160 |
| 185 | びまん性汎細気管支炎 | v2 | add | — | ORPHA:171700 |
| 190 | 後天性血友病A | v2 | add | — | ORPHA:599480 |
| 191 | 先天性赤芽球異形成性貧血 | v2 | add | — | ORPHA:85 |
| 205 | 自己免疫性膵炎 | v2 | add | — | ORPHA:103919 |
| 209 | ミオクロニーてんかん | v2 | fix | ORPHA:308 | ORPHA:98261 |
| 210 | 特発性多中心性キャッスルマン病 | v2 | add | — | ORPHA:570431 |
| 211 | 慢性活動性EBウイルス感染症 | v2 | remove | ORPHA:2100 | （フィールド削除） |
| 212 | 血球貪食性リンパ組織球症 | v2 | fix | ORPHA:540 | ORPHA:158032 |
| 214 | 魚鱗癬 | v2 | fix | ORPHA:281 | ORPHA:79354 |
| 219 | デンスデポジット病 | v2 | fix | ORPHA:91136 | ORPHA:93571 |
| 222 | 鎖肛 | v2 | add | — | ORPHA:96346 |
| 229 | 完全大血管転位症 | v2 | fix | ORPHA:860 | ORPHA:216675 |
| 236 | グリコーゲン蓄積症II型 | v2 | add | — | ORPHA:420429 |
| 246 | 特発性間質性肺炎 | v2 | add | — | ORPHA:98300 |
| 247 | 肺ランゲルハンス細胞組織球症 | v2 | fix | ORPHA:389 | ORPHA:687733 |
| 260 | ミトコンドリアDNA枯渇症候群 | v2 | add | — | ORPHA:35698 |
| 271 | 掌蹠膿疱症 | v2 | add | — | ORPHA:163927 |
| 287 | 突発性難聴 | v2 | add | — | ORPHA:90059 |
| 290 | 過敏性肺炎 | v2 | add | — | ORPHA:31740 |
| 298 | 成人T細胞白血病リンパ腫 | v2 | fix | ORPHA:86500 | ORPHA:86875 |
| 299 | T細胞性大顆粒リンパ球性白血病 | v2 | add | — | ORPHA:86872 |
| 306 | 周期性四肢麻痺 | v2 | fix | ORPHA:681 | ORPHA:206976 |
| 307 | 非ジストロフィー性ミオトニア | v2 | remove | ORPHA:228432 | （フィールド削除） |
| 314 | 慢性炎症性脱髄性多発根神経炎（MADSAM型） | v2 | add | — | ORPHA:48162 |
| 320 | 緑内障（先天性） | v2 | fix | ORPHA:98977 | ORPHA:98976 |
| 331 | 前眼部形成異常 | v2 | fix | ORPHA:137 | ORPHA:88632 |
| 351 | 遠位型ミオパチー | v2 | fix | ORPHA:399 | ORPHA:599 |
| 357 | 脊髄小脳変性症6型 | v2 | add | — | ORPHA:98758 |
| 370 | ジヒドロピリミジナーゼ欠損症 | v2 | add | — | ORPHA:38874 |
| 386 | 結節性多発動脈炎（皮膚型） | v2 | add | — | ORPHA:439729 |
| 388 | 先天性副腎低形成症 | v2 | fix | ORPHA:95 | ORPHA:595337 |
| 406 | 神経有棘赤血球症 | v2 | fix | ORPHA:2388 | ORPHA:263440 |
| 440 | Potocki-Lupski症候群 | v2 | remove | ORPHA:180469 | （フィールド削除） |
| 442 | MECP2重複症候群 | v2 | fix | ORPHA:85280 | ORPHA:1762 |
| 450 | Joubert症候群 | v2 | fix | ORPHA:475 | ORPHA:140874 |
| 462 | Kostmann症候群 | v2 | fix | ORPHA:486 | ORPHA:42738 |
| 494 | シトリン欠損症 | v2 | fix | ORPHA:247585 | ORPHA:247582 |
| 495 | 腫瘍性骨軟化症 | v2 | add | — | ORPHA:352540 |
| 498 | 偽性副甲状腺機能低下症 | v2 | fix | ORPHA:457 | ORPHA:97593 |
| 500 | Zellweger症候群（軽症型） | v2 | add | — | ORPHA:44 |
| 510 | West症候群 | v2 | fix | ORPHA:3451 | ORPHA:697160 |
| 513 | PCDH19関連てんかん | v2 | fix | ORPHA:163703 | ORPHA:714652 |
| 516 | 脂肪萎縮症 | v2 | remove | ORPHA:90990 | （フィールド削除） |
| 529 | 高フェニルアラニン血症（BH4反応型） | v2 | add | — | ORPHA:293284 |
| 538 | シアリドーシス | v2 | fix | ORPHA:3166 | ORPHA:309294 |
| 543 | セロイドリポフスチン症 | v2 | fix | ORPHA:281 | ORPHA:216 |
| 559 | 中心核ミオパチー | v2 | fix | ORPHA:596 | ORPHA:595 |
| 567 | 遺伝性感覚性自律神経性ニューロパチー | v2 | fix | ORPHA:642 | ORPHA:140471 |
| 568 | 遺伝性運動感覚性ニューロパチー（デジェリーヌ・ソッタス型） | v2 | add | — | ORPHA:64748 |
| 572 | 頭蓋骨早期癒合症（非症候群性） | v2 | add | — | ORPHA:139390 |
| 577 | 3-ヒドロキシ-3-メチルグルタル酸尿症 | v2 | fix | ORPHA:35701 | ORPHA:20 |
| 579 | 短鎖アシルCoA脱水素酵素欠損症 | v2 | add | — | ORPHA:26792 |
| 593 | 遺伝性痙性対麻痺2型 | v2 | add | — | ORPHA:280270 |
| 600 | Desbuquois骨異形成症 | v2 | fix | ORPHA:2284 | ORPHA:1425 |
| 601 | 骨形成不全症IV型 | v2 | add | — | ORPHA:216820 |
| 602 | 骨形成不全症V型 | v2 | add | — | ORPHA:216828 |
| 620 | 巨大リンパ管奇形(嚢胞性ヒグローマ) | v2 | add | — | ORPHA:79489 |
| 623 | CANDLE症候群 | v2 | fix | ORPHA:325004 | ORPHA:324977 |
| 631 | 中條-西村症候群 | v2 | fix | ORPHA:2615 | ORPHA:324977 |
| 633 | A20ハプロ不全症 | v2 | remove | ORPHA:512126 | （フィールド削除） |
| 638 | 肺分画症 | v2 | remove | ORPHA:2586 | （フィールド削除） |
| 641 | 先天性腎尿路奇形 | v2 | add | — | ORPHA:93545 |
| 675 | SCA31 | v2 | add | — | ORPHA:217012 |
| 677 | 遺伝性痙性対麻痺4型 | v2 | fix | ORPHA:100984 | ORPHA:100985 |
| 681 | リンパ管腫症 | v2 | fix | ORPHA:2136 | ORPHA:141209 |
| 695 | 遺伝性網膜芽細胞腫 | v2 | fix | ORPHA:790 | ORPHA:357027 |
| 699 | Ataxia with oculomotor apraxia type 1 | v2 | fix | ORPHA:14 | ORPHA:1168 |
| 702 | TSH産生下垂体腺腫 | v2 | add | — | ORPHA:91347 |
| 719 | 遺伝性パントテン酸キナーゼ関連神経変性 | v2 | fix | ORPHA:157846 | ORPHA:157850 |
| 738 | 大田原症候群 | v2 | fix | ORPHA:65286 | ORPHA:1934 |
| 745 | 先天性赤芽球癆(一過性) | v2 | add | — | ORPHA:98871 |
| 746 | 遺伝性鉄過剰症(フェロポルチン病) | v2 | fix | ORPHA:139491 | ORPHA:648562 |
| 749 | 後天性血栓性血小板減少性紫斑病 | v2 | add | — | ORPHA:93585 |
| 762 | 常染色体優性尿細管間質性腎疾患(MUC1型) | v2 | fix | ORPHA:88948 | ORPHA:88949 |
| 763 | 先天性腎性マグネシウム喪失症 | v2 | fix | ORPHA:34527 | ORPHA:30924 |
| 770 | 自己免疫性腸症 | v2 | fix | ORPHA:1564 | ORPHA:94075 |
| 771 | 好酸球性消化管疾患（非食道型） | v2 | add | — | ORPHA:2070 |
| 775 | 先天性ナトリウム下痢 | v2 | fix | ORPHA:103910 | ORPHA:103908 |
| 777 | Tufting Enteropathy | v2 | fix | ORPHA:92065 | ORPHA:92050 |
| 786 | 遺伝性眼瞼下垂 | v2 | add | — | ORPHA:91411 |
| 790 | 遺伝性眼球運動失行症（Cogan型） | v2 | add | — | ORPHA:1125 |
| 821 | 遺伝性毛髪・歯・爪異常症 | v2 | add | — | ORPHA:79373 |
| 827 | 視床下部過誤腫（笑い発作てんかん） | v2 | add | — | ORPHA:86906 |
| 837 | Quebec Platelet Disorder | v2 | add | — | ORPHA:220436 |
| 846 | 遺伝性有口赤血球症 | v2 | fix | ORPHA:3202 | ORPHA:98365 |
| 850 | ANKRD26関連血小板減少症 | v2 | remove | ORPHA:71015 | （フィールド削除） |
| 861 | 遺伝性痙性対麻痺3A型 | v2 | fix | ORPHA:100985 | ORPHA:100984 |
| 862 | 遺伝性痙性対麻痺7型 | v2 | fix | ORPHA:104013 | ORPHA:99013 |
| 863 | 遺伝性痙性対麻痺5A型 | v2 | remove | ORPHA:100987 | （フィールド削除） |
| 865 | 遺伝性運動ニューロパチー（dHMN） | v2 | add | — | ORPHA:53739 |
| 866 | Lewis-Sumner症候群 | v2 | add | — | ORPHA:48162 |
| 867 | Anti-MAG抗体ニューロパチー | v2 | fix | ORPHA:100057 | ORPHA:209004 |
| 871 | 先天性大脳白質形成不全症（TUBB4A型） | v2 | fix | ORPHA:209370 | ORPHA:139441 |
| 872 | 先天性大脳白質形成不全症（SOX10型） | v2 | add | — | ORPHA:163746 |
| 893 | トランスコバラミン欠損症 | v2 | remove | ORPHA:3321 | （フィールド削除） |
| 900 | 先天性副腎不全(NR0B1型) | v2 | fix | ORPHA:169 | ORPHA:95702 |
| 905 | 遺伝性低マグネシウム血症(TRPM6以外) | v2 | add | — | ORPHA:306516 |
| 909 | 先天性ミオトニア(Thomsen/Becker型) | v2 | fix | ORPHA:612 | ORPHA:614 |
| 915 | LMNA関連肢帯型筋ジストロフィー | v2 | add | — | ORPHA:98853 |
| 916 | FKRP関連肢帯型筋ジストロフィー | v2 | fix | ORPHA:34514 | ORPHA:34515 |
| 920 | Sarcoglycan関連肢帯型筋ジストロフィー | v2 | fix | ORPHA:206 | ORPHA:207052 |
| 925 | VCP関連多系統蛋白症 | v2 | fix | ORPHA:93401 | ORPHA:52430 |
| 926 | BAG3関連ミオフィブリラーミオパチー | v2 | remove | ORPHA:137163 | （フィールド削除） |
| 940 | 遺伝性感覚性ニューロパチーII型 | v2 | add | — | ORPHA:970 |
| 941 | 遺伝性運動感覚性ニューロパチー(HMSN)VI型 | v2 | add | — | ORPHA:90120 |
| 944 | 先天性無痛症（HSAN V型） | v2 | add | — | ORPHA:64752 |
| 951 | Aβ2Mアミロイドーシス | v2 | add | — | ORPHA:85446 |
| 958 | 3-Hydroxy-3-Methylglutaryl-CoA Lyase欠損症 | v2 | fix | ORPHA:35701 | ORPHA:20 |
| 961 | メチオニンアデノシルトランスフェラーゼ欠損症 | v2 | fix | ORPHA:99946 | ORPHA:168598 |
| 965 | 先天性胆汁酸合成異常症(Δ4-3-oxosteroid型) | v2 | remove | ORPHA:485641 | （フィールド削除） |
| 971 | 先天性小腸閉鎖症 | v2 | add | — | ORPHA:1201 |
| 972 | 鎖肛（直腸肛門奇形） | v2 | add | — | ORPHA:96346 |
| 975 | 先天性声門下狭窄 | v2 | add | — | ORPHA:141121 |
| 1000 | 口顔指症候群 | v2 | fix | ORPHA:2750 | ORPHA:140997 |

---

---

## 適用後（2026-09-11 実施）

適用方法: 知識ファイルは `json.dumps(indent=2, ensure_ascii=False)` の出力と完全一致することを事前に確認したうえで、Python で読み込み → `orpha_code` のみ操作 → 同一設定で書き戻し。`add` は `alternate_names` と `description` の間に挿入。`remove` はフィールドごと削除。

### 1. ファイル指紋

| 項目 | 適用前 | 適用後 |
|---|---|---|
| SHA-256 | `287437f6a04b6b7078a086ec0b715c1a0e8be7872bcbb9bf908a6910c72536e7` | `a1d82a2dad29f5ff0a0f1e03a79809c54dbe07c41fe7c0c0f462567ff21c5ab6` |
| バイト数 | 771,949 | 775,426 |

### 2. 適用件数（実績）

| 版 | fix | add | remove | 計 |
|---|---|---|---|---|
| v1 | 22 | 50 | 0 | 72 |
| v2 | 61 | 65 | 11 | 137 |
| 合計 | 83 | 115 | 11 | 209 |

競合 index 120 は v2 を適用、index 722 は v1 のみ適用（予定どおり）。

### 3. 検証結果

| 項目 | 適用前 | 適用後 | 期待 | 判定 |
|---|---|---|---|---|
| 疾患数 | 1,001 | 1,001 | 1,001 | 一致 |
| ORPHA番号を持つ疾患数 | 701 | 805 | 805 | 一致 |
| 症状語（symptoms ∪ symptom_patterns ユニーク） | 3,663 | 3,663 | 3,663 | 一致 |
| symptom_patterns（ユニーク） | 1,880 | 1,880 | 1,880 | 一致 |
| `orpha_code` を除いたレコードのハッシュ（1,001件） | — | 不一致 0 件 | 0 件 | 一致 |
| `git diff` の変更行 | — | 292 行（+198 / −94）、すべて `"orpha_code"` 行 | orpha_code 行のみ | 一致 |
| レコードのキー順 | 2 種類 | 2 種類（orpha_code あり 805 / なし 196） | 2 種類 | 一致 |

変更行の内訳: fix 83 件 × (−1, +1) = 166 行、add 115 件 × (+1) = 115 行、remove 11 件 × (−1) = 11 行 → 合計 292 行。

適用スクリプトは一時ディレクトリで実行（リポジトリには含めない）。git commit は未実施（ファウンダー確認待ち）。
