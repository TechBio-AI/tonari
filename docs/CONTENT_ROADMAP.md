# CONTENT_ROADMAP — 疾患ページの情報を、どう増やし、どこへ移すか

- 作成日: 2026-09-13
- 位置づけ: 疾患ページ（`app/demo/diseases/[slug]`）に載せる情報の「現状」「今後足す種類」「移行先」を 1 か所で示す。
  静的 JSON を足すたびに読む文書。**情報の量がこのサイトの差別化になる**ので、増やせる構造へ移る判断の目安をここに置く。
- 関連: `docs/SCHEMA_CANON.md`（器の宣言）、`docs/hpo_symptom_headings_proposal_2026-09-13.md`（HPO の見出し対応表）、
  `docs/disease_summaries_draft_2026-09-13.md`（よくある症状の下書きと判定）

---

## 1. 現状（2026-09-13）

| 項目 | 中身 | 置き場所 | 形式 |
|---|---|---|---|
| この病気について | 知識ファイルの description そのまま（将来書き直す） | `data/knowledge/comprehensive_rare_diseases_knowledge.json` | 静的 JSON（読み取りのみ） |
| よくある症状 | 11 疾患、5〜8 個、患者の言葉。各項目に出典（HPO ラベル or 執筆者による記述） | `data/disease_summaries/<slug>.json` | **静的 JSON（暫定形式）** |
| 治療について | 薬剤名を除いた一言（下書き、ファウンダー確認待ち） | 同上 | 同上 |
| 相談できる診療科 | 紹介先の科・最初にかかりやすい科 | `data/specialties/disease_specialties.json` | 静的 JSON |
| 制度と支援 | 指定難病番号は未収録。画面は「準備中」 | `data/disease_summaries/<slug>.json` の `nanbyo_number`（全件 null） | 同上 |
| 患者会 | 入居している患者会へのリンク | `data/patient_groups/patient_groups.json` | 静的 JSON |
| くわしい症状の一覧 | HPO 全件、頻度順、体の系統の見出しつき（折りたたみ） | `data/hpo_symptoms/hpo_symptoms_11.json` + `data/hpo_categories/hpo_categories_11.json` | 静的 JSON（派生） |

対象は **11 疾患**。疾患一覧の 951 件のうち、残りは病名・別名・患者会の有無だけのページ。

### この形式が暫定である理由

`data/disease_summaries/` は「1 疾患 1 ファイル、決まった項目」の形で、**11 疾患だから成立する**。

- 951 疾患では、ファイル数と項目の増減を人が管理できない
- 情報の種類を 1 つ足すたびに、JSON の形と読み込みコード（`lib/portal/disease-summaries.ts`）と画面の 3 か所を変える
- 出典は各項目に書いているが、「出典の無い項目を公開できない」ことを機械的に保証する仕組みが無い

## 2. 今後足す情報の種類

| 種類 | 中身の例 | 出典の例 |
|---|---|---|
| 治療 | 治療法の有無、種類（酵素を補う／遺伝子治療／食事療法 …）。薬剤名・製品名は載せない | 診療ガイドライン、難病情報センター |
| 制度と支援 | 指定難病番号、医療費助成、小児慢性特定疾病 | 厚生労働省告示、難病情報センター、小児慢性特定疾病情報センター |
| 専門医療機関の探し方 | 難病診療連携拠点病院、専門医の探し方（実在の機関名は器を通してから） | 各都道府県の難病相談支援センター |
| 患者会からの一次情報 | 生活の工夫、学校や仕事のこと | 入居している患者会（テナント）からの提供 |
| 移行期医療 | 小児科から成人科へ移るときのこと | 学会の移行期医療ガイド |

これらは「種類」であって、疾患ごとに有無も数もばらばらになる。固定の項目名で JSON を広げていくと、空欄だらけのファイルになる。

## 3. 移行先: 器（themes / theme_facts / fact_sources）

2026 年 7 月に作った 3 テーブル。定義は `supabase/migrations/20260601_t0_theme_facts_scaffold.sql`（本番適用済み。`docs/SCHEMA_CANON.md`）。
これを読む公開面 `app/(portal)/` 一式は **`_ARCHIVE_DO_NOT_USE/app/(portal)/`** に隔離してある（2026-07-26。理由は `_ARCHIVE_DO_NOT_USE/README.md`。git 履歴があり、`mv` で戻せる）。

| テーブル | 役割 | この文書での意味 |
|---|---|---|
| `themes` | テーマ（疾患）の基本情報。名称・国際コード（ORPHA）・承認状態 | 1 疾患 = 1 行 |
| `theme_facts` | 情報の一片。種類ラベル（`fact_type`）・中身（`content`）・順序・承認状態 | 「よくある症状」の 1 項目、「治療」の 1 文、「制度」の 1 件 … が各 1 行 |
| `fact_sources` | 出典。**情報の一片単位**で複数紐付け（`fact_id → theme_facts.id`） | 今の JSON の `sources` に相当 |

`fact_type` は自由ラベルで、推奨の対応表は `scripts/ingest/fact_type_mapping.json`（成り立ち／特徴／気づかれにくさ／比較対象／確認方法／相談先 …）。
今の疾患ページの構成は、そのまま `fact_type` に写せる（この病気について＝成り立ち、よくある症状＝特徴、治療について＝対応の概要、制度と支援＝新しいラベル、など）。

### なぜ器が必要か

1. **情報の種類が増えても構造を変えずに済む。** 種類は `fact_type` の値であって、テーブルの列ではない。新しい種類を足すのに、スキーマも読み込みコードも変えない。
2. **出典が必ず付く。** 出典ゼロの情報は DB トリガで承認できない（`20260601_t0_theme_facts_scaffold.sql`）。出典を全部消して「承認済み・出典ゼロ」を作ることも塞いである（`20260723_s1_source_delete_guard.sql`）。JSON では人の注意にしか頼れない。
3. **AI に引用されるための構造化データを生成できる。** 疾患 1 件＝出典付きの事実の集まり、という形は JSON-LD（`MedicalCondition` ＋ `citation`）にそのまま写せる。隔離した `app/(portal)/_lib/jsonld.ts` がその下書き。`data/hpo_categories/` の見出し分けも、ここで `signOrSymptom` の分類に使える。
4. 公開面の最上位規範（`CLAUDE.md`「公開面は器以外のテーブルを読まない」）に、そのまま合う。`/demo` は知識ファイルを直接読むため、この規範の外に置いている（`app/demo/layout.tsx`）。器に接続できた時点で昇格する。

## 4. 判断の目安

次のどちらかに達したら、静的 JSON を広げるのをやめ、器への移行を検討する。

- **疾患が 30 件を超える**
- **情報の種類が 3 つを超える**（現状は「よくある症状」「治療について」の 2 つ。「制度と支援」を実データで埋めた時点で 3 つ）

移行の手順（概要）:
1. `data/disease_summaries/` の各項目を `theme_facts` 行 + `fact_sources` 行に写す（`scripts/ingest/` の供給ラインを使う）
2. ファウンダーが reviewer として承認（自動投入は承認できない設計）
3. `/demo` の疾患ページを、器を読む形に差し替える（`_ARCHIVE_DO_NOT_USE/app/(portal)/_lib/queries.ts` が参考）
4. `data/disease_summaries/` は読み取り専用の記録として残し、公開経路から外す

## 5. 変更履歴

- 2026-09-13: 作成。11 疾患の「よくある症状」「治療について」を `data/disease_summaries/` に暫定形式で置いた。HPO の見出し分けは `data/hpo_categories/` に分離（折りたたみの中と将来の JSON-LD 用）。
