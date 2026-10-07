# 知識ベースの構造修正案 — 重複統合と埋没疾患の洗い出し（2026-09-11）

- 対象: `data/knowledge/comprehensive_rare_diseases_knowledge.json`（1,001 件。2026-09-11 の ORPHA 承認分 209 件適用後: 番号あり 805 件）
- 元の調査: `docs/survey_kb_health_2026-08-29.md` §1.2（粒度不一致 28 件）・§2.2–2.3（重複 50 組・104 レコード）、`docs/kb_issues_2026-08-29.md` 課題 1・2・8〜11・18・23
- 突合先（読み取りのみ）: `data/orphanet/en_product1.xml`（2026-06-23、11,645 エンティティ）で各番号の Orphanet 名と種別（Disease / Clinical group / Subtype 等）を確認
- **知識ファイルは変更していない。** 修正案は `docs/kb_restructure_2026-09-11.json`（全件 `status: proposed`）。適用は別セッションで、`approved` の項目だけを適用する
- 記法: 「不明」= 手元のデータでは判定できない。「私の傾き」= 医学的判断を含む私見で、ファウンダーの判定が要る
- 手順の扱い: 指示は「タスク1 → 判定 → タスク3 → 承認 → JSON」だったが、このセッションはファウンダーの応答を待てないため、**JSON は判定欄（status）を空けた下書き**として同時に置いた。ORPHA 照合 v2（`docs/orpha_corrections_v2_2026-08-30.json`）と同じ、JSON 上で判定する流儀

## 0. 要約

| 項目 | 結果 |
|---|---|
| 重複 50 組（+ 追加 1 組） | **統合 47**（うち 3 件→1 件が 3 組）／**保留 2**（組 19・20: 番号修正で上位下位の関係になった）／**要判定 2**（組 44 Zellweger 軽症型、組 50 キャッスルマン病） |
| 粒度不一致 28 件 | **主名を付け直す 5**（家族性地中海熱・ロイス・ディーツ・ツェルウェガー・4H 白質ジストロフィー・常染色体優性多発性嚢胞腎）／**統合で解消 2**／**解消済み（番号修正で一致）9**／**要判定 12**（うち別名の整理だけで済むもの 6） |
| 影響（統合 47 + 付け直し 5 を適用した場合。手元で機械的に適用して実測） | 疾患 1,001 → **951**、番号あり 805 → **760**、症状語 3,663 → **3,663**、symptom_patterns 1,880 → **1,880**（減らない） |
| `fmf-colloquial` | **緑にならない。** 名前は既に `kb_aliases` で吸収されており、赤の原因は FMF レコードに「繰り返す発熱」に当たる語が無いこと（課題 1 の記録どおり）。統合の副作用で 高IgD症候群 がこの入力の同点 1 位になる（§4.2） |

指示になかったが判定に関わる点: (a) `docs/guardrails.md` 4 は「疾患 1,001 件も減らさない」と書いている。統合は意図的に件数を減らすので、適用前にこの 1 行の改訂承認が要る（§4.4）。(b) 発症年齢の重ね書き `data/onset/onset_ranges.json` に「ALS」の鍵があり、組 2 の統合で宙に浮く（§4.3）。

---

## 1. タスク1：重複レコードの全件一覧（統合 → 保留 → 要判定 の順）

- 調査報告の 50 組をすべて index で特定した（20 組は報告の表、30 組は報告の文中の名前から実データで再同定）。合計 104 レコード、余分 54 件。組 51 は報告の 50 組に無く、ORPHA 照合 v2 で見つかった追加の組（課題 11）
- 「症状数」は symptoms / symptom_patterns の語数。「ORPHA番号」の下は Orphanet の英語名（現ファイルの番号で引いたもの）
- ★残す = 統合後に残す側。基準はファウンダー指定の順（番号が正しい方 → 症状が多い方 → 日本語名が正式な方）だが、**症状は両方を合算するので「症状が多い方」は実質的に差を生まない**。そのため実際の決め手は「番号の正しさ」と「名前」で、迷った組は理由欄に書いた
- 亜型として別に残すレコード（統合に含めない）: 17 遺伝性ALS、948 遺伝性アミロイドニューロパチー（V30M以外）、573 先天性中心性低換気症候群（非ポリアラニン型）、711/712/826 先天性副腎皮質過形成症（酵素別）、922/923 DNM2/BIN1 関連中心核ミオパチー、236 グリコーゲン蓄積症II型（= 遅発型ポンペ病、ORPHA:420429 亜型。4 ポンペ病と親子）

### 統合（47 組）

| 組 | index | 疾患名 | ORPHA番号 | 症状数 | 別名 | 統合の推奨 |
|---|---|---|---|---|---|---|
| 1 | 16 | **遺伝性ATTR型アミロイドーシス** ★残す | 271861<br><small>Hereditary ATTR amyloidosis</small> | 5/5 | hATTR、家族性アミロイドポリニューロパチー | 統合（→ 16） |
|  | 326 | 遺伝性ニューロパチー伴うアミロイドーシス | 271861<br><small>Hereditary ATTR amyloidosis</small> | 5/5 | ATTRv、遺伝性TTRアミロイドーシス、hereditary ATTR Amyloidosis |  |
| | | <small>理由: 名前が臨床の呼び方に近く、/demo・発症年齢・診療科・HPO 重ね書きの鍵になっている（326 を残すと 4 ファイルの鍵が切れる）。番号は両方 271861 で同じ。326 の言い回し（立ちくらみ／下痢・便秘／目がかすむ）と治療（ビュートリシラン／肝移植／ジフルニサル）が加わる。948（V30M以外）は亜型として保留</small> | | | | |
| 2 | 26 | ALS | 803<br><small>Amyotrophic lateral sclerosis</small> | 6/6 | 筋萎縮性側索硬化症、Amyotrophic Lateral Sclerosis | 統合（→ 75） |
|  | 75 | **筋萎縮性側索硬化症** ★残す | 803<br><small>Amyotrophic lateral sclerosis</small> | 6/6 | ALS、Amyotrophic Lateral Sclerosis |  |
| | | <small>理由: 指定難病の正式名。番号は両方 803。26 は英字のみで日本語名なし枠に落ちる。発症年齢の重ね書き（data/onset）に 'ALS' の鍵が残るので、適用時に統合先へ寄せる。17 遺伝性ALS は家族性の亜型として保留</small> | | | | |
| 3 | 13 | 遺伝性チロシン血症1型 | （なし） | 5/5 | HT1、Hereditary tyrosinemia type 1 | 統合（→ 962） |
|  | 323 | チロシン血症I型 | 882<br><small>Tyrosinemia type 1</small> | 4/4 | HT1、Tyrosinemia Type 1 |  |
|  | 962 | **チロシン血症1型** ★残す | 882<br><small>Tyrosinemia type 1</small> | 4/4 | HT1、Tyrosinemia Type 1 |  |
| | | <small>理由: 番号 882 を持ち、算用数字（課題23 の方向）。13 は番号なし、323 はローマ数字。13（第1批次）の症状 5 語（肝腫大／肝硬変／発達遅滞／くる病様骨変化 等）は合算で残る。指定難病名は「高チロシン血症1型」だが名前の付け替えは今回扱わない</small> | | | | |
| 4 | 92 | **ホモシスチン尿症** ★残す | 394<br><small>Homocystinuria due to cystathionine beta-synthase deficiency</small> | 5/5 | Homocystinuria | 統合（→ 92） |
|  | 576 | ホモシスチン尿症（CBS欠損型） | 394<br><small>Homocystinuria due to cystathionine beta-synthase deficiency</small> | 5/5 | Classical Homocystinuria、CBS Deficiency |  |
|  | 960 | ホモシスチン尿症(CBS型) | 394<br><small>Homocystinuria due to cystathionine beta-synthase deficiency</small> | 5/5 | Classical Homocystinuria、CBS Deficiency |  |
| | | <small>理由: 指定難病の正式名「ホモシスチン尿症」。番号は 3 件とも 394（CBS 欠損型）。576/960 の別名 Classical Homocystinuria / CBS Deficiency を合算。CBS 型以外のホモシスチン尿症は収録なし</small> | | | | |
| 5 | 191 | 先天性赤芽球異形成性貧血 | 85<br><small>Congenital dyserythropoietic anemia</small> | 4/4 | CDA、Congenital Dyserythropoietic Anemia | 統合（→ 464） |
|  | 464 | **先天性赤血球形成異常性貧血** ★残す | 85<br><small>Congenital dyserythropoietic anemia</small> | 5/4 | CDA、Congenital Dyserythropoietic Anemia |  |
|  | 847 | 先天性赤血球生成異常性貧血 | 85<br><small>Congenital dyserythropoietic anemia</small> | 5/5 | CDA、Congenital Dyserythropoietic Anemia |  |
| | | <small>理由: 指定難病の正式名「先天性赤血球形成異常性貧血」。番号は 3 件とも 85。847 の症状（慢性貧血／胆石）と 191 のものは合算で残る</small> | | | | |
| 6 | 181 | **高IgD症候群** ★残す | 343<br><small>Hyperimmunoglobulinemia D with periodic fever</small> | 6/6 | HIDS、Hyper-IgD Syndrome、メバロン酸キナーゼ欠損症 | 統合（→ 181） |
|  | 632 | Mevalonate Kinase欠損症 | 343<br><small>Hyperimmunoglobulinemia D with periodic fever</small> | 5/5 | MKD、Hyper-IgD Syndrome、HIDS、メバロン酸キナーゼ欠損症 |  |
| | | <small>理由: 指定難病の正式名「高IgD症候群」。番号は両方 343（HIDS）。632 の主名 Mevalonate Kinase欠損症 は広い概念（メバロン酸尿症を含む。Orphanet 309025）だが中身は HIDS。MKD を別名として残す</small> | | | | |
| 7 | 52 | **プラダー・ウィリー症候群** ★残す | 739<br><small>Prader-Willi syndrome</small> | 6/6 | PWS、Prader-Willi Syndrome | 統合（→ 52） |
|  | 392 | Prader-Willi症候群 | 739<br><small>Prader-Willi syndrome</small> | 5/5 | PWS、プラダー・ウィリー症候群 |  |
| | | <small>理由: カナ表記・症状 6 語。番号は両方 739</small> | | | | |
| 8 | 171 | **ドラベ症候群** ★残す | 33069<br><small>Dravet syndrome</small> | 5/5 | SMEI、Dravet Syndrome | 統合（→ 171） |
|  | 508 | Dravet症候群 | 33069<br><small>Dravet syndrome</small> | 5/5 | SMEI、乳児重症ミオクロニーてんかん |  |
| | | <small>理由: 指定難病の正式名「ドラベ症候群」。番号は両方 33069。508 の別名「乳児重症ミオクロニーてんかん」が加わる</small> | | | | |
| 9 | 172 | **ウエスト症候群** ★残す | 697160<br><small>Infantile epileptic spasms syndrome</small> | 3/3 | WS、West Syndrome、点頭てんかん | 統合（→ 172） |
|  | 510 | West症候群 | 697160<br><small>Infantile epileptic spasms syndrome</small> | 3/3 | IS、点頭てんかん、Infantile Spasms |  |
| | | <small>理由: カナ表記「ウエスト症候群」。番号は両方 697160（IESS）。510 の別名 Infantile Spasms / IS が加わる</small> | | | | |
| 10 | 170 | **レノックス・ガストー症候群** ★残す | 2382<br><small>Lennox-Gastaut syndrome</small> | 5/5 | LGS、Lennox-Gastaut Syndrome | 統合（→ 170） |
|  | 509 | Lennox-Gastaut症候群 | 2382<br><small>Lennox-Gastaut syndrome</small> | 5/5 | LGS、レノックス・ガストー症候群 |  |
| | | <small>理由: カナ表記。番号は両方 2382</small> | | | | |
| 11 | 173 | **スタージ・ウェーバー症候群** ★残す | 3205<br><small>Sturge-Weber syndrome</small> | 5/5 | SWS、Sturge-Weber Syndrome | 統合（→ 173） |
|  | 468 | Sturge-Weber症候群 | 3205<br><small>Sturge-Weber syndrome</small> | 5/5 | SWS、スタージ・ウェーバー症候群 |  |
| | | <small>理由: カナ表記。番号は両方 3205</small> | | | | |
| 12 | 195 | 肺胞低換気症候群 | 661<br><small>Congenital central hypoventilation syndrome</small> | 4/4 | CCHS、先天性中枢性低換気症候群、Congenital Central Hypoventilation Syndrome | 統合（→ 475） |
|  | 475 | **先天性中枢性低換気症候群** ★残す | 661<br><small>Congenital central hypoventilation syndrome</small> | 4/4 | CCHS、Ondine curse |  |
| | | <small>理由: 主名が番号 661（CCHS）と中身に一致する。195 の主名「肺胞低換気症候群」は上位概念（指定難病 230 の名称）。粒度不一致 #4 も同時に解消。「肺胞低換気症候群」は別名へ移す（FMF と同じ扱い）。573（非ポリアラニン型）は亜型として保留</small> | | | | |
| 13 | 60 | **先天性副腎過形成** ★残す | 418<br><small>Congenital adrenal hyperplasia</small> | 6/6 | CAH、Congenital Adrenal Hyperplasia | 統合（→ 60） |
|  | 319 | 副腎皮質過形成症 | 418<br><small>Congenital adrenal hyperplasia</small> | 4/4 | CAH、Congenital Adrenal Hyperplasia、先天性副腎皮質過形成 |  |
| | | <small>理由: 症状 6 語、第2批次。番号は両方 418。319 の別名「先天性副腎皮質過形成」が加わる。711/712/826（酵素別）は亜型として保留</small> | | | | |
| 14 | 242 | **遺伝性出血性末梢血管拡張症** ★残す | 774<br><small>Hereditary hemorrhagic telangiectasia</small> | 5/5 | HHT、Osler-Weber-Rendu、遺伝性出血性毛細血管拡張症 | 統合（→ 242） |
|  | 670 | 遺伝性出血性毛細血管拡張症 | 774<br><small>Hereditary hemorrhagic telangiectasia</small> | 5/5 | HHT、Osler-Weber-Rendu Disease |  |
| | | <small>理由: 指定難病の正式名「遺伝性出血性末梢血管拡張症」。番号は両方 774。242 の別名に既に「遺伝性出血性毛細血管拡張症」がある</small> | | | | |
| 15 | 292 | 弾力線維性仮性黄色腫 | 758<br><small>Pseudoxanthoma elasticum</small> | 4/4 | PXE、Pseudoxanthoma Elasticum | 統合（→ 824） |
|  | 824 | **弾性線維性仮性黄色腫** ★残す | 758<br><small>Pseudoxanthoma elasticum</small> | 4/4 | PXE、Pseudoxanthoma Elasticum |  |
| | | <small>理由: 指定難病の正式名は「弾性線維性仮性黄色腫」（824）。番号は両方 758。292 の表記「弾力線維性」は別名へ</small> | | | | |
| 16 | 216 | **黄色靭帯骨化症** ★残す | （なし） | 4/4 | OYL、OLF、Ossification of Yellow Ligament | 統合（→ 216） |
|  | 855 | 黄色靱帯骨化症 | （なし） | 3/3 | OYL、Ossification of Yellow Ligament |  |
| | | <small>理由: 症状 4 語・検査 3・治療 2（855 は 3/1/1）。番号はどちらも無し。指定難病名は「黄色靱帯骨化症」（靱）。KB の 後縦靭帯骨化症 と字体を揃えるため 216 を残し、靱 表記を別名に</small> | | | | |
| 17 | 320 | 緑内障（先天性） | 98976<br><small>Congenital glaucoma</small> | 4/4 | PCG、Primary Congenital Glaucoma | 統合（→ 983） |
|  | 983 | **先天性緑内障** ★残す | 98976<br><small>Congenital glaucoma</small> | 4/4 | PCG、Primary Congenital Glaucoma |  |
| | | <small>理由: 自然な語順「先天性緑内障」。番号は両方 98976</small> | | | | |
| 18 | 346 | **慢性偽性腸閉塞症** ★残す | 2978<br><small>Chronic intestinal pseudoobstruction syndrome</small> | 5/5 | CIPO、Chronic Intestinal Pseudo-obstruction | 統合（→ 346） |
|  | 780 | 偽性腸閉塞症（慢性特発性） | 2978<br><small>Chronic intestinal pseudoobstruction syndrome</small> | 5/5 | CIPO、Chronic Intestinal Pseudo-Obstruction |  |
| | | <small>理由: 指定難病名「慢性特発性偽性腸閉塞症」に近い。番号は両方 2978</small> | | | | |
| 21 | 583 | **D-2-ヒドロキシグルタル酸尿症** ★残す | 79315<br><small>D-2-hydroxyglutaric aciduria</small> | 4/4 | D2HGA | 統合（→ 583） |
|  | 897 | D-2ヒドロキシグルタル酸尿症 | 79315<br><small>D-2-hydroxyglutaric aciduria</small> | 4/4 | D-2-HGA、D2HGA |  |
| | | <small>理由: ハイフン表記が Orphanet 名 D-2-hydroxyglutaric aciduria に対応。番号は両方 79315</small> | | | | |
| 22 | 584 | **L-2-ヒドロキシグルタル酸尿症** ★残す | 79314<br><small>L-2-hydroxyglutaric aciduria</small> | 5/5 | L2HGA | 統合（→ 584） |
|  | 898 | L-2ヒドロキシグルタル酸尿症 | 79314<br><small>L-2-hydroxyglutaric aciduria</small> | 4/4 | L-2-HGA、L2HGA |  |
| | | <small>理由: 症状 5 語。番号は両方 79314</small> | | | | |
| 23 | 79 | 皮質基底核変性症 | 2098<br><small>Acromesomelic dysplasia, Grebe type</small> | 5/5 | CBD、Corticobasal Degeneration | 統合（→ 80） |
|  | 80 | **大脳皮質基底核変性症** ★残す | （なし） | 4/4 | CBGD |  |
| | | <small>理由: 指定難病の正式名「大脳皮質基底核変性症」。79 の番号 2098 は Orphanet では Acromesomelic dysplasia, Grebe type（別疾患）。番号 2098 は誤りなので継承しない → 統合後は番号なし（805 → 804 の要因）。正しい番号は Orphanet 278 が廃止（→ 454887 Corticobasal syndrome）のため未特定（課題12）</small> | | | | |
| 24 | 164 | Lambert-Eaton症候群 | 43393<br><small>Lambert-Eaton myasthenic syndrome</small> | 4/4 | LEMS、Lambert-Eaton Myasthenic Syndrome | 統合（→ 663） |
|  | 663 | **Lambert-Eaton筋無力症候群** ★残す | 43393<br><small>Lambert-Eaton myasthenic syndrome</small> | 4/4 | LEMS |  |
| | | <small>理由: 主名に「筋無力」を含み指定難病名「ランバート・イートン筋無力症候群」に近い。番号は両方 43393。カナ表記の正式名は別名にも無い（名前の追加は今回扱わない）</small> | | | | |
| 25 | 575 | チロシン血症II型 | 28378<br><small>Tyrosinemia type 2</small> | 3/3 | HT2、Tyrosinemia Type II、Richner-Hanhart症候群 | 統合（→ 963） |
|  | 963 | **チロシン血症2型** ★残す | 28378<br><small>Tyrosinemia type 2</small> | 3/3 | HT2、Tyrosinemia Type 2、Richner-Hanhart症候群 |  |
| | | <small>理由: 算用数字（課題23 の方向）。番号は両方 28378</small> | | | | |
| 26 | 235 | カルニチン欠乏症 | 158<br><small>Systemic primary carnitine deficiency</small> | 4/4 | PCD、Primary Carnitine Deficiency、全身性カルニチン欠乏症 | 統合（→ 955） |
|  | 955 | **全身性カルニチン欠乏症** ★残す | 158<br><small>Systemic primary carnitine deficiency</small> | 4/4 | Primary Carnitine Deficiency、SLC22A5変異 |  |
| | | <small>理由: 主名「全身性カルニチン欠乏症」が番号 158（Systemic primary carnitine deficiency）に対応。235 の「カルニチン欠乏症」は二次性も含む広い名。235 の別名 PCD と主名は別名へ。955 の別名 'SLC22A5変異' は遺伝子名で疾患名ではない（残すが要整理）</small> | | | | |
| 27 | 20 | **非典型溶血性尿毒症症候群** ★残す | 2134<br><small>Atypical hemolytic uremic syndrome</small> | 5/5 | aHUS、Atypical hemolytic uremic syndrome | 統合（→ 20） |
|  | 750 | 非典型溶血性尿毒症症候群(補体介在型) | 2134<br><small>Atypical hemolytic uremic syndrome</small> | 4/4 | aHUS、Atypical Hemolytic Uremic Syndrome |  |
| | | <small>理由: 指定難病の正式名。症状 5 語。番号は両方 2134</small> | | | | |
| 28 | 333 | **腸回転異常症** ★残す | （なし） | 4/3 | Malrotation | 統合（→ 333） |
|  | 645 | 先天性腸回転異常症 | （なし） | 3/3 | Malrotation、腸回転異常 |  |
| | | <small>理由: 症状 4 語・検査 3。番号はどちらも無し</small> | | | | |
| 29 | 166 | **グルタル酸血症1型** ★残す | 25<br><small>Glutaryl-CoA dehydrogenase deficiency</small> | 4/4 | GA1、Glutaric Acidemia Type 1 | 統合（→ 166） |
|  | 527 | グルタル酸血症I型 | 25<br><small>Glutaryl-CoA dehydrogenase deficiency</small> | 5/5 | GA1、Glutaric Acidemia Type I |  |
| | | <small>理由: 算用数字（課題23 の方向）。番号は両方 25。527 の症状（基底核壊死／硬膜下血腫）は合算で残る</small> | | | | |
| 30 | 14 | **MELAS症候群** ★残す | 550<br><small>MELAS</small> | 6/6 | MELAS、ミトコンドリア脳筋症 | 統合（→ 14） |
|  | 341 | MELAS | 550<br><small>MELAS</small> | 7/7 | Mitochondrial Encephalomyopathy Lactic Acidosis and Stroke-like Episodes |  |
| | | <small>理由: 日本語を含む主名（341 'MELAS' は英字のみで日本語名なし枠）。番号は両方 550。341 の症状 7 語（頭痛／嘔吐／乳酸アシドーシス 等）は合算で残る。14 の別名「ミトコンドリア脳筋症」は上位概念（タスク3 #26）</small> | | | | |
| 31 | 223 | **食道閉鎖症** ★残す | 1199<br><small>Esophageal atresia</small> | 5/5 | EA、Esophageal Atresia | 統合（→ 223） |
|  | 969 | 先天性食道閉鎖症 | 1199<br><small>Esophageal atresia</small> | 3/3 | EA、Esophageal Atresia |  |
| | | <small>理由: 症状 5 語。番号は両方 1199</small> | | | | |
| 32 | 234 | **アルギニノコハク酸尿症** ★残す | 23<br><small>Argininosuccinic aciduria</small> | 4/4 | ASA、Argininosuccinic Aciduria | 統合（→ 234） |
|  | 705 | 尿素サイクル異常症（アルギニノコハク酸尿症） | 23<br><small>Argininosuccinic aciduria</small> | 4/4 | ASA、Argininosuccinic Aciduria |  |
| | | <small>理由: 疾患名そのもの。705 は群名を冠した表記。番号は両方 23</small> | | | | |
| 33 | 158 | 先天性フィブリノゲン欠乏症 | 98880<br><small>Familial afibrinogenemia</small> | 4/4 | Congenital Afibrinogenemia | 統合（→ 839） |
|  | 839 | **先天性無フィブリノゲン血症** ★残す | 98880<br><small>Familial afibrinogenemia</small> | 4/4 | Congenital Afibrinogenemia |  |
| | | <small>理由: 主名「先天性無フィブリノゲン血症」が番号 98880（Familial afibrinogenemia）に対応。158 の「フィブリノゲン欠乏症」は低・異常フィブリノゲン血症も含む広い名</small> | | | | |
| 34 | 244 | **大理石骨病** ★残す | 2781<br><small>Osteopetrosis and related disorders</small> | 5/5 | Osteopetrosis | 統合（→ 244） |
|  | 604 | 骨硬化症(大理石骨病) | 2783<br><small>Autosomal dominant osteopetrosis type 1</small> | 5/5 | Osteopetrosis、大理石骨病 |  |
| | | <small>理由: 指定難病の正式名「大理石骨病」。244 の番号 2781 は群（Osteopetrosis and related disorders）、604 の 2783 は常染色体優性1型で中身（TCIRG1/CLCN7、移植）と合わない。2783 は継承しない。番号の粒度は今回扱わない</small> | | | | |
| 35 | 261 | **ウルリッヒ型先天性筋ジストロフィー** ★残す | 75840<br><small>Ullrich congenital muscular dystrophy</small> | 5/5 | UCMD、Ullrich CMD | 統合（→ 261） |
|  | 710 | Ullrich型先天性筋ジストロフィー | 75840<br><small>Ullrich congenital muscular dystrophy</small> | 4/4 | UCMD |  |
| | | <small>理由: カナ表記・症状 5 語。番号は両方 75840</small> | | | | |
| 36 | 25 | AADC欠損症 | （なし） | 5/5 | 芳香族L-アミノ酸脱炭酸酵素欠損症 | 統合（→ 521） |
|  | 521 | **芳香族Lアミノ酸脱炭酸酵素欠損症** ★残す | 35708<br><small>Aromatic L-amino acid decarboxylase deficiency</small> | 5/5 | AADC欠損症、Aromatic L-Amino Acid Decarboxylase Deficiency |  |
| | | <small>理由: 番号 35708 を持ち、指定難病名「芳香族L-アミノ酸脱炭酸酵素欠損症」に対応。25 は番号なし。25 の別名にハイフン付き正式表記があり、合算で残る</small> | | | | |
| 37 | 96 | **アラジール症候群** ★残す | 52<br><small>Alagille syndrome</small> | 6/6 | Alagille Syndrome | 統合（→ 96） |
|  | 399 | Alagille症候群 | 52<br><small>Alagille syndrome</small> | 5/5 | ALGS、アラジール症候群 |  |
| | | <small>理由: 指定難病の正式名「アラジール症候群」。症状 6 語。番号は両方 52</small> | | | | |
| 38 | 192 | **ダイアモンド・ブラックファン貧血** ★残す | 124<br><small>Diamond-Blackfan anemia</small> | 5/5 | DBA、Diamond-Blackfan Anemia | 統合（→ 192） |
|  | 458 | Diamond-Blackfan貧血 | 124<br><small>Diamond-Blackfan anemia</small> | 5/5 | DBA、ダイアモンド・ブラックファン貧血 |  |
| | | <small>理由: 指定難病の正式名。番号は両方 124</small> | | | | |
| 39 | 200 | **ペリツェウス・メルツバッハー病** ★残す | 702<br><small>Pelizaeus-Merzbacher disease</small> | 5/4 | PMD、Pelizaeus-Merzbacher Disease | 統合（→ 200） |
|  | 486 | Pelizaeus-Merzbacher病 | 702<br><small>Pelizaeus-Merzbacher disease</small> | 5/5 | PMD、ペリツェウス・メルツバッハー病 |  |
| | | <small>理由: カナ表記。番号は両方 702。486 の言い回し「姿勢異常」が加わる</small> | | | | |
| 40 | 199 | **アレキサンダー病** ★残す | 58<br><small>Alexander disease</small> | 5/5 | Alexander Disease、AxD | 統合（→ 199） |
|  | 485 | Alexander病 | 58<br><small>Alexander disease</small> | 5/5 | Alexander Disease |  |
| | | <small>理由: カナ表記。番号は両方 58</small> | | | | |
| 41 | 159 | **先天性プロテインC欠乏症** ★残す | （なし） | 3/3 | Protein C Deficiency | 統合（→ 159） |
|  | 465 | 先天性蛋白C欠乏症 | （なし） | 4/4 | Protein C Deficiency |  |
| | | <small>理由: 「プロテインC」表記が一般的。番号はどちらも無し。465 は症状 4 語で 1 語多いが合算で残る</small> | | | | |
| 42 | 222 | **鎖肛** ★残す | 96346<br><small>Anorectal malformation</small> | 4/4 | Anorectal Malformation、直腸肛門奇形 | 統合（→ 222） |
|  | 972 | 鎖肛（直腸肛門奇形） | 96346<br><small>Anorectal malformation</small> | 4/4 | Anorectal Malformation、Imperforate Anus |  |
| | | <small>理由: 主名がそのもの。番号は両方 96346</small> | | | | |
| 43 | 314 | **慢性炎症性脱髄性多発根神経炎（MADSAM型）** ★残す | 48162<br><small>Lewis-Sumner syndrome</small> | 3/3 | MADSAM、Multifocal Acquired Demyelinating Sensory And Motor neuropathy | 統合（→ 314） |
|  | 866 | Lewis-Sumner症候群 | 48162<br><small>Lewis-Sumner syndrome</small> | 3/2 | MADSAM、Multifocal Acquired Demyelinating Sensory and Motor Neuropathy |  |
| | | <small>理由: CIDP の亜型であることが主名で分かる。症状 3 語（866 は 3/2）。番号は両方 48162。Orphanet 名 Lewis-Sumner syndrome は別名として残る</small> | | | | |
| 45 | 579 | **短鎖アシルCoA脱水素酵素欠損症** ★残す | 26792<br><small>Short chain acyl-CoA dehydrogenase deficiency</small> | 3/3 | SCADD、SCAD Deficiency | 統合（→ 579） |
|  | 957 | Short-Chain Acyl-CoA Dehydrogenase欠損症 | 26792<br><small>Short chain acyl-CoA dehydrogenase deficiency</small> | 3/1 | SCADD |  |
| | | <small>理由: 日本語主名・症状 3 語（957 は 3/1）。番号は両方 26792</small> | | | | |
| 46 | 577 | **3-ヒドロキシ-3-メチルグルタル酸尿症** ★残す | 20<br><small>3-hydroxy-3-methylglutaric aciduria</small> | 4/4 | HMG-CoA Lyase Deficiency | 統合（→ 577） |
|  | 958 | 3-Hydroxy-3-Methylglutaryl-CoA Lyase欠損症 | 20<br><small>3-hydroxy-3-methylglutaric aciduria</small> | 4/4 | HMG-CoA Lyase Deficiency |  |
| | | <small>理由: 日本語主名。番号は両方 20（2026-09-10 承認済み）。課題10 でファウンダーが統合検討を指示済み</small> | | | | |
| 47 | 327 | **全身性ALアミロイドーシス** ★残す | 85443<br><small>AL amyloidosis</small> | 5/5 | AL Amyloidosis | 統合（→ 327） |
|  | 949 | ALアミロイドーシス（免疫グロブリン軽鎖型） | 85443<br><small>AL amyloidosis</small> | 6/6 | AL Amyloidosis |  |
| | | <small>理由: 指定難病名「全身性アミロイドーシス」に沿う。番号は両方 85443。949 の症状 6 語（出血傾向／起立性低血圧）は合算で残る</small> | | | | |
| 48 | 51 | **クラインフェルター症候群** ★残す | 484<br><small>NON RARE IN EUROPE: Klinefelter syndrome</small> | 5/5 | Klinefelter Syndrome | 統合（→ 51） |
|  | 717 | Klinefelter症候群 | 484<br><small>NON RARE IN EUROPE: Klinefelter syndrome</small> | 5/5 | 47,XXY |  |
| | | <small>理由: カナ表記。番号は両方 484（Non-rare in Europe、維持方針）。717 の別名 '47,XXY' が加わる</small> | | | | |
| 49 | 280 | **ミオクローヌス・ジストニア症候群** ★残す | 36899<br><small>Myoclonus-dystonia syndrome</small> | 4/4 | M-D、Myoclonus-Dystonia Syndrome | 統合（→ 280） |
|  | 730 | 遺伝性ミオクロニージストニア | 36899<br><small>Myoclonus-dystonia syndrome</small> | 4/4 | DYT11、SGCE関連ジストニア |  |
| | | <small>理由: 指定難病名「ミオクローヌス・ジストニア」に近い。番号は両方 36899。730 の別名 DYT11 が加わる</small> | | | | |
| 51 | 631 | **中條-西村症候群** ★残す | 324977<br><small>Proteasome-associated autoinflammatory syndrome</small> | 5/5 | NNS、Nakajo-Nishimura Syndrome | 統合（→ 631）〔追加〕 |
|  | 623 | CANDLE症候群 | 324977<br><small>Proteasome-associated autoinflammatory syndrome</small> | 5/5 | Chronic Atypical Neutrophilic Dermatosis with Lipodystrophy and Elevated Temperature |  |
| | | <small>理由: 指定難病 268 の名称「中條-西村症候群」。番号は両方 324977（2026-09-10 に Orphanet 統合先へ追随、課題11）。調査の 50 組には無く、ORPHA 照合 v2 で見つかった追加の組。CANDLE症候群 は別名へ</small> | | | | |

### 保留（2 組）

| 組 | index | 疾患名 | ORPHA番号 | 症状数 | 別名 | 統合の推奨 |
|---|---|---|---|---|---|---|
| 19 | 11 | 原発性高シュウ酸尿症1型 | 93598<br><small>Primary hyperoxaluria type 1</small> | 5/5 | PH1、Primary hyperoxaluria type 1 | 保留 |
|  | 355 | 原発性シュウ酸過多症 | 416<br><small>Primary hyperoxaluria</small> | 4/4 | PH、Primary Hyperoxaluria |  |
| | | <small>理由: 番号修正で 11 = 93598（1型）、355 = 416（原発性高シュウ酸尿症の全体）になった。355 の検査は AGXT/GRHPR/HOGA1（1〜3型）で群レコードとして成立している。上位下位の関係。粒度不一致 #17 は番号修正で解消済み</small> | | | | |
| 20 | 559 | 中心核ミオパチー | 595<br><small>Centronuclear myopathy</small> | 4/4 | CNM、Centronuclear Myopathy | 保留 |
|  | 562 | 筋細管ミオパチー（X連鎖型） | 596<br><small>X-linked centronuclear myopathy</small> | 4/4 | XLMTM、X-Linked Myotubular Myopathy |  |
| | | <small>理由: 番号修正で 559 = 595（中心核ミオパチー全体）、562 = 596（X連鎖型）。559 の説明は MTM1/DNM2/BIN1 を並べた群の記述で、922/923 も別レコードにある。上位下位の関係。粒度不一致 #18 は番号修正で解消済み</small> | | | | |

### 要判定（2 組）

| 組 | index | 疾患名 | ORPHA番号 | 症状数 | 別名 | 統合の推奨 |
|---|---|---|---|---|---|---|
| 44 | 500 | Zellweger症候群（軽症型） | 44<br><small>Neonatal adrenoleukodystrophy</small> | 4/4 | NALD、Neonatal Adrenoleukodystrophy-like | 要判定 |
|  | 966 | ペルオキシソーム形成異常症（Zellweger Spectrum）軽症型 | 772<br><small>Infantile Refsum disease</small> | 4/4 | IRD、NALD、Infantile Refsum、Mild PBD |  |
| | | <small>理由: 中身は両方「Zellweger スペクトラム軽症型（NALD/IRD）」で同じだが、番号が 500 = 44（NALD、Orphanet では中間型）、966 = 772（IRD、軽症型）と別エンティティを指す。統合するなら番号は 772（Mild PBD-ZSD）が『軽症型』に合う。Orphanet が NALD と IRD を分けている以上、統合は医学判断</small> | | | | |
| 50 | 194 | キャッスルマン病 | 160<br><small>Castleman disease</small> | 6/5 | Castleman Disease、MCD | 要判定 |
|  | 210 | 特発性多中心性キャッスルマン病 | 570431<br><small>Idiopathic multicentric Castleman disease</small> | 6/6 | iMCD、Idiopathic Multicentric Castleman Disease |  |
|  | 618 | 多中心性Castleman病 | 160<br><small>Castleman disease</small> | 6/6 | MCD、Multicentric Castleman Disease |  |
| | | <small>理由: 3 段階の粒度: 194 キャッスルマン病（160 = CD 全体）⊃ 618 多中心性Castleman病（160）⊃ 210 特発性多中心性（570431 = iMCD 亜型）。ただし 3 件の中身（IL-6、シルツキシマブ、全身症状）はすべて MCD/iMCD の記述で、単中心性の記述は無い。案 A: 3 件を 210（指定難病 331 の名称）へ統合し、キャッスルマン病・多中心性Castleman病 を別名にする。案 B: 194+618 → 194 に統合し、210 を亜型として残す。私の傾き: 案 A（中身が iMCD）</small> | | | | |
---

## 2. タスク2：統合の設計（何を残し、何を捨てるか）

JSON の `_meta.apply_rules` に同じ内容を機械可読で置いた。

| 項目 | 規則 |
|---|---|
| `disease`（主名） | 残す側 |
| `alternate_names` | 残す側 ＋ **捨てる側の主名** ＋ 捨てる側の別名。重複除去。残す側の主名と同じ語は除く。捨てる側の主名を別名に入れるのは、旧名での検索（と受け入れテストの `kb_aliases`）を切らないため |
| `orpha_code` | 残す側（承認済み修正が入っている）。残す側が空で捨てる側にあれば継承し `orpha_inherited_from_dropped: true` を付ける（今回は該当なし）。残す側と違う番号は捨て、`dropped_orpha_codes_not_carried` に記録（組 23 の 2098、組 34 の 2783）。**組 23 は例外**: 残す側 80 に番号が無く、捨てる側 79 の 2098 は Orphanet で Acromesomelic dysplasia, Grebe type（別疾患）なので継承しない（`orpha_do_not_inherit: true`）。統合後は番号なし |
| `description` | 残す側。捨てる側の説明は `dropped_descriptions_for_review` にそのまま残した。目視で「捨てる側にしか無い情報」があるのは次の 4 組: 組 24（663 の「約60%に悪性腫瘍を合併」は残す側なので問題なし）、組 31（969 の「Gross分類C型が最多」）、組 42（972 の「高位/中位/低位」「VACTERL連合」）、組 33（839 は残す側）。いずれも説明文の補足で、症状・検査・治療は合算されるので失われない |
| `symptoms` / `symptom_patterns` | 順序を保った和集合（残す側 → 捨てる側）。**語は増えるだけで減らない** |
| `diagnosis` / `treatment` | 同上 |
| 主名の付け直し（タスク3） | `disease` を新主名に、旧主名を `alternate_names` の先頭へ。`remove_from_alternate` の語を別名から外す（外した語は JSON に記録してあるので追跡できる） |

**検証項目（適用セッションで必ず実行）**:

1. `symptom_patterns` の重複除去後の語数 = **1,880**（`lib/normalization/__tests__/symptom-index.test.ts` が固定している値と同じ）
2. `symptoms ∪ symptom_patterns` = **3,663**、`symptoms` = **1,962**
3. 統合前の全語が統合後のどこかのレコードに存在する（語の集合が等しい）
4. 統合後に同じ `disease` を持つレコードが 0 件
5. `toDiseaseId()`（`lib/scoring/knowledge.ts`）が「型」と大小文字を落とすため、`チロシン血症1型` と `チロシン血症I型` 等の ID 衝突が統合で**解消**することを確認（現状は採点層が先勝ちで片方を捨てている）

このセッションで、上記の規則を統合 47 組・付け直し 5 件にメモリ上で適用して 1〜4 を実測した（§4）。

---

## 3. タスク3：埋没した疾患の一覧（粒度不一致 28 件）

前提として重要な変化: 調査（2026-09-06）以後、2026-09-11 に ORPHA 承認分が適用され、28 件のうち **9 件は番号が群レベルに付け替えられて「名前＝番号＝中身の粒度」が揃った**（エーラス・ダンロス、ムコ多糖症I型、HSAN、周期性四肢麻痺、肺 LCH、ナルコレプシー、HLH、原発性シュウ酸過多症、中心核ミオパチー）。これらは「解消済み」として残し、件数を 28 に保った。

対処案の語彙: **主名を付け直す**（ファウンダー指定）／**分割**（該当 0 件。分割が要る組は無かった）／**要判定**。要判定のうち「別名から 1 語外す（または隣のレコードへ移す）だけ」で済むものは「要判定（別名整理）」と書いた。ファウンダーが決めやすいよう、要判定にはすべて案 A／案 B と私の傾きを付けた。

| index | 現在の主名 | 別名に埋もれている疾患 | ORPHA番号が指す疾患 | 対処案 |
|---|---|---|---|---|
| 178 | 自己炎症性疾患 | 家族性地中海熱 | 342 Familial Mediterranean fever | 主名を付け直す（新主名: 家族性地中海熱） |
| | <small>根拠: ORPHA:342 = FMF。説明・症状・検査（MEFV）・治療（コルヒチン）すべて FMF。他の自己炎症性疾患は独立レコードあり: CAPS 180、TRAPS 179、HIDS 181、Muckle-Wells 626、PFAPA 629、中條-西村 631。群名「自己炎症性疾患」は別名へ（ファウンダー案のとおり）。受け入れテストの kb_aliases は不要になる</small> | | | |
| 401 | Marfan症候群関連疾患 | ロイス・ディーツ症候群 | 60030 Loeys-Dietz syndrome | 主名を付け直す（新主名: ロイス・ディーツ症候群） |
| | <small>根拠: ORPHA:60030 = Loeys-Dietz。説明（TGFβ受容体）・症状（動脈蛇行／二分口蓋垂）・検査 TGFBR1/2 すべて LDS。マルファン症候群は 48 に独立レコードあり。群名「Marfan症候群関連疾患」を別名へ。LDS の別名として不正確なので外す案もある（要判定）</small> | | | |
| 109 | 好酸球性消化管疾患 | 好酸球性食道炎 | 402029 Primary eosinophilic gastrointestinal disease | 要判定（別名整理） |
| | <small>根拠: ORPHA:402029 = EGID（群）で名前と番号は一致。中身は食道（嚥下障害／食物つかえ感）と胃腸（腹痛／下痢／嘔吐）の混合＝群として妥当。好酸球性食道炎は 206 に独立レコードあり、非食道型は 771。別名から「好酸球性食道炎」を外すだけでよい。主名は指定難病 98 の名称なので変えない</small> | | | |
| 195 | 肺胞低換気症候群 | — | 661 Congenital central hypoventilation syndrome | 統合で解消（組12） |
| | <small>根拠: 組12 で 475 先天性中枢性低換気症候群 へ統合し、「肺胞低換気症候群」を別名へ移す</small> | | | |
| 262 | ペルオキシソーム病 | ツェルウェガー症候群 | 912 Zellweger syndrome | 主名を付け直す（新主名: ツェルウェガー症候群） |
| | <small>根拠: ORPHA:912 = Zellweger syndrome。説明は「先天性代謝疾患群」だが症状（筋緊張低下／痙攣／肝腫大／特徴的顔貌／難聴／視覚障害）は古典的 Zellweger。古典型の独立レコードは無い（500/966 は軽症型のみ）。群名「ペルオキシソーム病」（指定難病 234 の名称）は別名へ。FMF と同じ扱い。群レコードを別に残すかは要判定</small> | | | |
| 49 | エーラス・ダンロス症候群 | — | 98249 Ehlers-Danlos syndrome | 解消済み（番号修正） |
| | <small>根拠: 番号が 287（古典型）→ 98249（EDS 全体）に修正済み。中身も型を特定しない一般的な EDS。名前・番号・中身が群レベルで一致</small> | | | |
| 1 | ムコ多糖症I型 | — | 579 Mucopolysaccharidosis type 1 | 解消済み（番号修正） |
| | <small>根拠: 番号が 93473（Hurler）→ 579（MPS I 全体）に修正済み。別名の Hurler／Scheie／Hurler-Scheie は MPS I の亜型で、探す名前として残してよい。/demo の疾患。/demo・重ね書き 3 ファイルの鍵。変更しない</small> | | | |
| 567 | 遺伝性感覚性自律神経性ニューロパチー | — | 140471 Hereditary sensory and autonomic neuropathy | 解消済み（番号修正） |
| | <small>根拠: 番号が 642（HSAN IV）→ 140471（HSAN 全体）に修正済み。CIPA は 651 に独立レコードあり</small> | | | |
| 209 | ミオクロニーてんかん | ウンフェルリヒト・ルンドボルグ病 | 98261 Progressive myoclonic epilepsy | 要判定（別名整理） |
| | <small>根拠: 番号 98261（PME 全体）で群として一致。別名「ウンフェルリヒト・ルンドボルグ病」は 514 進行性ミオクローヌスてんかん（Unverricht-Lundborg型）に独立レコードがある。別名を 209 から外し、514 の別名へ移す（514 は日本語別名を持たないので探しやすくなる）。主名「ミオクロニーてんかん」は指定難病名「進行性ミオクローヌスてんかん」と違うが名前の修正は今回扱わない</small> | | | |
| 306 | 周期性四肢麻痺 | — | 206976 Periodic paralysis | 解消済み（番号修正） |
| | <small>根拠: 番号が 681（低K型）→ 206976（周期性四肢麻痺 全体）に修正済み。906/907 が低K／高K の独立レコード</small> | | | |
| 118 | 褐色細胞腫 | — | 29072 Hereditary pheochromocytoma-paraganglioma | 要判定 |
| | <small>根拠: 主名・中身は褐色細胞腫一般（散発例を含む）だが番号 29072 は Hereditary pheochromocytoma-paraganglioma。693 遺伝性褐色細胞腫/パラガングリオーマ症候群 も同じ 29072。Orphanet の Pheochromocytoma 群番号 717 は廃止、散発例は 276621 Sporadic pheochromocytoma/secreting paraganglioma。案 A: 118 を 693 へ統合（遺伝性に寄せる）。案 B: 118 は散発例として残し番号を 276621 へ（番号は今回対象外）。私の傾き: 案 B（散発例と遺伝性は別の探され方をする）</small> | | | |
| 247 | 肺ランゲルハンス細胞組織球症 | — | 687733 Pulmonary Langerhans cell histiocytosis | 解消済み（番号修正） |
| | <small>根拠: 番号が 389（LCH 全体）→ 687733（肺 LCH 亜型）に修正済み。LCH 全体は 350 に独立レコード</small> | | | |
| 106 | 天疱瘡 | — | 704 Pemphigus vulgaris | 要判定 |
| | <small>根拠: 主名「天疱瘡」は指定難病 35 の名称（尋常性・落葉状を含む群）。番号 704 = Pemphigus vulgaris、中身（弛緩性水疱・ニコルスキー）は尋常性。尋常性・落葉状の独立レコードは無い。案 A: 主名を「尋常性天疱瘡」にし「天疱瘡」を別名へ。案 B: 主名を残し番号を群へ（番号は今回対象外）。私の傾き: 案 B（患者は「天疱瘡」で探す）</small> | | | |
| 111 | 肺胞蛋白症 | — | 747 Autoimmune pulmonary alveolar proteinosis | 要判定 |
| | <small>根拠: 主名「肺胞蛋白症」は指定難病 229（自己免疫性又は先天性）の名称。番号 747 = 自己免疫性 PAP、検査に抗 GM-CSF 抗体。案 A: 主名を「自己免疫性肺胞蛋白症」に。案 B: 主名を残す（番号側の粒度、今回対象外）。私の傾き: 案 B</small> | | | |
| 126 | ナルコレプシー | — | 619284 Narcolepsy | 解消済み（番号修正） |
| | <small>根拠: 番号が 2073（1型）→ 619284（ナルコレプシー 全体）に修正済み</small> | | | |
| 212 | 血球貪食性リンパ組織球症 | — | 158032 Hemophagocytic syndrome | 解消済み（番号修正） |
| | <small>根拠: 番号が 540（家族性 HLH）→ 158032（血球貪食症候群）に修正済み。中身は HLH 一般</small> | | | |
| 355 | 原発性シュウ酸過多症 | — | 416 Primary hyperoxaluria | 解消済み（番号修正） |
| | <small>根拠: 番号が 93598（1型）→ 416（原発性高シュウ酸尿症 全体）に修正済み。組19 は保留</small> | | | |
| 559 | 中心核ミオパチー | — | 595 Centronuclear myopathy | 解消済み（番号修正） |
| | <small>根拠: 番号が 596（X連鎖型）→ 595（中心核ミオパチー 全体）に修正済み。組20 は保留</small> | | | |
| 588 | 先天性大脳白質形成不全症 | 4H白質ジストロフィー | 289494 4H leukodystrophy | 主名を付け直す（新主名: 4H白質ジストロフィー） |
| | <small>根拠: 番号 289494 = 4H leukodystrophy（承認済み）。説明・症状（歯牙低形成／低ゴナドトロピン）・検査 POLR3A/B すべて 4H。別名 LBSL は別疾患（ORPHA:137898、課題8）。主名「先天性大脳白質形成不全症」は指定難病 131 の群名で、871（TUBB4A型）872（SOX10型）200（PMD）が同じ群。新主名は要判定: 「4H白質ジストロフィー」または KB の他レコードに合わせた「先天性大脳白質形成不全症（POLR3型）」。LBSL は別名から外す（課題8 の対応）</small> | | | |
| 351 | 遠位型ミオパチー | 三好型ミオパチー／GNEミオパチー | 599 Distal myopathy | 要判定（別名整理） |
| | <small>根拠: 番号 599（Distal myopathy、Category）で群として一致。別名の三好型は 918 Dysferlin関連（別名に三好型ミオパチーあり）、GNE 型は 912 遺伝性ミオパチー（GNE型）に独立レコード。別名 2 語を 351 から外す。「GNEミオパチー」は 912 の別名へ移す（912 は日本語の呼び名を持たない）。主名は指定難病 30 の名称なので変えない</small> | | | |
| 56 | 多発性嚢胞腎 | 常染色体優性多発性嚢胞腎 | 730 Autosomal dominant polycystic kidney disease | 主名を付け直す（新主名: 常染色体優性多発性嚢胞腎） |
| | <small>根拠: 番号 730 = ADPKD。説明 PKD1/PKD2・治療トルバプタンは ADPKD。330 常染色体劣性多発性嚢胞腎 が独立レコードにあるので、対にする。群名「多発性嚢胞腎」（指定難病 67 の名称）は別名へ。付け直さず群名のまま残す案もある（要判定）</small> | | | |
| 326 | 遺伝性ニューロパチー伴うアミロイドーシス | — | 271861 Hereditary ATTR amyloidosis | 統合で解消（組1） |
| | <small>根拠: 組1 で 16 遺伝性ATTR型アミロイドーシス へ統合</small> | | | |
| 530 | テトラヒドロビオプテリン欠乏症 | — | 226 Dihydropteridine reductase deficiency | 要判定 |
| | <small>根拠: 主名「テトラヒドロビオプテリン欠乏症」は群名で、検査に PCBD/PTS/QDPR/GCH1 と群の中身。番号 226 = DHPR 欠損（亜型）。Orphanet の群番号は 238583 Hyperphenylalaninemia due to tetrahydrobiopterin deficiency。主名は変えない。番号を群へ付け替える案（番号は今回対象外、記録のみ）</small> | | | |
| 581 | ミトコンドリア三機能蛋白欠損症 | — | 5 Long chain 3-hydroxyacyl-CoA dehydrogenase deficiency | 要判定 |
| | <small>根拠: 主名「ミトコンドリア三機能蛋白欠損症」に対し番号 5 = LCHAD 欠損症（TFP の一酵素）。説明は「LCHAD 単独欠損を含む」。Orphanet の TFP 欠損症は 746。主名は変えない。番号を 746 へ付け替える案（番号は今回対象外、記録のみ）</small> | | | |
| 406 | 神経有棘赤血球症 | — | 263440 Neuroacanthocytosis | 要判定 |
| | <small>根拠: 主名「神経有棘赤血球症」（指定難病 8 の群名）、番号 263440 = Neuroacanthocytosis（群）。中身は VPS13A＝有棘赤血球舞踏病（ChAc、ORPHA:2388）。McLeod 症候群は 725 に独立レコードあり。案 A: そのまま（名前と番号は群で一致、中身が ChAc 寄りなだけ）。案 B: 主名を「有棘赤血球舞踏病」にし群名を別名へ。私の傾き: 案 A</small> | | | |
| 14 | MELAS症候群 | ミトコンドリア脳筋症 | 550 MELAS | 要判定（別名整理） |
| | <small>根拠: 別名「ミトコンドリア脳筋症」は MELAS より広い概念（ミトコンドリア病一般）。組30 の統合時に外す。ミトコンドリア病の独立レコードがあるか適用時に確認</small> | | | |
| 219 | デンスデポジット病 | C3腎症 | 93571 Dense deposit disease | 要判定（別名整理） |
| | <small>根拠: 別名「C3腎症」は DDD を含む上位概念で、751 C3腎症 に独立レコードあり。別名から外すだけ</small> | | | |
| 147 | 酸性スフィンゴミエリナーゼ欠損症 | ニーマン・ピック病A/B型 | 618899 Acid sphingomyelinase deficiency | 要判定（別名整理） |
| | <small>根拠: 番号 618899 = ASMD（群）で名前と一致。別名「ニーマン・ピック病A/B型」は 2 疾患の連結表記。537 Niemann-Pick病A型（77292）、489 Niemann-Pick病B型（77293）が独立レコードにある。別名を「ニーマン・ピック病A型」「ニーマン・ピック病B型」の 2 語に分ける（外さない。ASMD の旧称として探される）。あるいは 537/489 のカナ別名として移す</small> | | | |
補足（自己炎症性疾患の収録状況、課題 1 の「判断が必要な点」への回答）: CAPS（180、ORPHA:208650）、TRAPS（179）、高IgD症候群（181）、Muckle-Wells（626）、PFAPA（629）、中條-西村（631）、CANDLE（623）、VEXAS（634）が独立レコードにある。ブラウ症候群は無い。したがって「自己炎症性疾患」を群レコードとして残す必要は薄く、主名を家族性地中海熱に付け直して群名を別名に移すだけでよい。

---

## 4. タスク4：影響の見積もり

### 4.1 件数（機械的に適用して実測。統合 47 組 ＋ 主名付け直し 5 件 ＋ 別名整理 6 件）

| 指標 | 現在 | 適用後 | 差 | 備考 |
|---|---|---|---|---|
| 疾患数 | 1,001 | **951** | −50 | 統合 47 組（2 件→1 が 44 組、3 件→1 が 3 組）。要判定 2 組も統合なら 組 44 で −1、組 50 は案 A で −2／案 B で −1（最小 947） |
| ORPHA 番号を持つ疾患 | 805 | **760** | −45 | 捨てる側 50 件のうち番号ありが 45 件（残す側と同じ番号 43、違う番号 2 = 組 23 の 2098・組 34 の 2783）。番号の**種類**は減らない（組 23 の誤番号 2098 を除く） |
| 症状語（symptoms ∪ symptom_patterns） | 3,663 | **3,663** | 0 | 和集合なので減らない（実測） |
| symptom_patterns | 1,880 | **1,880** | 0 | 同上（実測）。`symptoms` も 1,962 のまま |
| 同名レコード | 0 | 0 | | 付け直し後の新主名が既存主名と衝突しないことを確認（家族性地中海熱・ロイス・ディーツ症候群・ツェルウェガー症候群・4H白質ジストロフィー・常染色体優性多発性嚢胞腎 はいずれも現在は別名にしか無い） |

統合後の 1 レコードあたりの語数は増える（例: 遺伝性ATTR型アミロイドーシス 5/5 → 8/9。「立ちくらみ」「心不全」「下痢・便秘」「目がかすむ」が加わる）。同じ概念の言い回しが 1 レコードに集まるので、概念単位で数える採点層（`lib/scoring/concepts.ts`）では二重カウントにならない。

### 4.2 受け入れテスト `fmf-colloquial`（入力「熱が繰り返し出て、お腹も痛くなる」）

- **緑にはならない**（適用後の順位を採点層 `rankCandidates` で実測）
  - 現在: 1. 肝内結石症 (100) / 2. カロリ病 (100) / 3. Mevalonate Kinase欠損症 (100) / 4. Hailey-Hailey病 (100) / 5. 遺伝性血管浮腫 (56)
  - 適用後: 1. **高IgD症候群** (100) / 2. 肝内結石症 (100) / 3. カロリ病 (100) / 4. Hailey-Hailey病 (100) / 5. 遺伝性血管浮腫 (56)
- 理由: 家族性地中海熱の語は `周期的発熱／周期的に高熱／お腹が痛い／…` で、「繰り返す発熱」の概念に当たる語が無い（課題 1 に記録済み）。名前の照合は `kb_aliases` で既に吸収されているので、主名の付け直しは表示名を正すが順位は変えない
- 副作用: 組 6 の統合で 高IgD症候群 が Mevalonate Kinase欠損症 の「繰り返す発熱」「腹痛」を受け取り、この入力で同点 1 位に上がる。FMF が勝つには、(a) FMF レコードに「繰り返す発熱」系の語を出典付きで足す（知識側、今回対象外）か、(b) 別名辞書で「周期的発熱」を「繰り返す発熱」と同じ概念に束ねる（`lib/normalization/alias-groups.ts`、ファウンダー判定事項）のどちらかが要る。(b) だけでは同点が残る可能性が高い（高IgD症候群・TRAPS・カロリ病も同じ 2 概念を持つ）
- 他の 2 件への影響: `neuropathy-adult`（45 歳）は 1. 遺伝性ATTR型アミロイドーシス (100) のまま（統合で語が増えても順位不変、5 位がポンペ病→ファブリー病に入れ替わるだけ）。`fabry-teen-male` は不変

### 4.3 重ね書き・画面への影響（適用時に同時に直すもの）

| ファイル | 影響 |
|---|---|
| `data/onset/onset_ranges.json` | 鍵「ALS」が組 2 の統合で宙に浮く（「筋萎縮性側索硬化症」の行は残る）。ファウンダーが 2026-09-10 に「重複への暫定対処」として置いた 2 行目なので、統合時に 1 行へ戻す |
| `data/specialties/disease_specialties.json`、`data/hpo_symptoms/hpo_symptoms_11.json`、`lib/portal/diseases.ts` の DEMO_DISEASES | 鍵は 遺伝性ATTR型アミロイドーシス・ムコ多糖症I型 で、どちらも残す側／変更なし側。影響なし |
| `acceptance/cases.yaml` | `fmf-colloquial` の `kb_aliases`（家族性地中海熱 → 自己炎症性疾患）と `precondition_notes` は付け直し後に不要になる。テストの期待値は変えない |
| `lib/normalization/__tests__/symptom-index.test.ts` | 1,880 / 3,663 の固定値は変わらない（実測） |
| `docs/asset_snapshot_2026-08-29.json` | 疾患数 1,001 の基準線。統合を承認するなら基準線の更新も承認事項 |

### 4.4 ガードレールとの関係

`docs/guardrails.md` 4 は「同 JSON の `symptoms`（1,962 語）との和集合 3,663 語、**疾患 1,001 件も同様に減らさない**」と書いている。語は減らないが疾患数は 951 になる。これは「同一疾患が複数レコードに割れている」ことを直す意図的な減少で、ガードレールが守ろうとした「資産を失わない」には反しない（すべての語・別名・検査・治療が残る）。ただし文言どおりには違反するので、**適用前にガードレール 4 の該当行を「疾患の概念を減らさない（同一疾患の統合は除く）」等へ改訂する承認**が要る。

---

## 5. 適用セッションへの引き継ぎ

1. ファウンダーが JSON の `status` を判定（approved / rejected）。要判定・保留の組は、統合するなら `keep_index` / `drop_indices` を書き足してから approved にする。付け直しで新主名を変える場合は `new_disease` を書き換える
2. 適用スクリプトは §2 の規則で approved だけを適用し、§2 の検証項目 1〜5 を通す。適用ログを `docs/` に残す
3. 同時に §4.3 の重ね書き（onset の「ALS」）と `acceptance/cases.yaml` の注記を直す。ガードレール 4 の改訂（§4.4）は別に承認を取る
4. HPO 横展開は、統合後の主名（= 残す側）を鍵にする

## 付録: 再現方法

集計・照合・適用シミュレーションはセッションのスクラッチ領域に置いた（repo には入れていない）。手順: (1) Python で知識ファイルと `data/orphanet/en_product1.xml` を読み、50 組・28 件の index と Orphanet 名を引く。(2) 判定を JSON に書き出す。(3) jest（repo の `jest.config.js` を継承した一時設定）で `lib/scoring` の `toScoringDisease` / `rankCandidates` を使い、JSON の規則をメモリ上で適用した知識で 3 ベクターを採点し、件数と順位を記録する。知識ファイル・重ね書き・テストはいずれも変更していない。
