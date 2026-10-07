# SCHEMA_CANON — スキーマの「正」の宣言 [Phase0-T4]

- **宣言日**: 2026-07-05
- **上位文書**: なし（この文書がスキーマの正）
- **性質**: 本文書は**宣言のみ**であり、DBへの物理変更（DROP / ALTER / データ操作）は一切伴わない。物理整理はピッチ後に人間が判断する。

---

## 1. 正（canonical）— これだけが「単一の正」

### 器の3テーブル

| テーブル | 役割 |
|---|---|
| `themes` | テーマ（疾患など）の基本情報。名称・国際コード・承認状態 |
| `theme_facts` | 情報の一片（汎用）。種類ラベル・中身・順序・承認状態 |
| `fact_sources` | 出典。**情報の一片単位**で複数紐付け（`fact_id → theme_facts.id`） |

- **定義の正**: `db_schema_archive/draft/0001_theme_facts_scaffold.sql`（正式版。本番適用済みの内容）
- 品質保証は**DBトリガで強制**: 出典ゼロは承認不可・承認は reviewer のみ。3テーブルとも RLS 有効（閲覧/書込/承認を分離）。
- 現状は**空の器**（実データ未投入）。投入は第1段の供給ラインで行う。
- **本番適用状態（2026-07-05 確定）**: 器3テーブルは**本番適用済み**（同日 Supabase Studio で `themes` 実在・空を目視、T6 の `slug`/`published_at` 追加SQLを実行し Success 確認）。`db_schema_archive/draft/README.md` の「未適用」表記は**古い**（更新前の記述）。

### Supabase 認証系

- `auth.*` スキーマ（Supabase 管理）。器の承認者権限・RLS の前提として正に含める。

## 2. レガシー・非使用 — 閲覧のみ・新規参照禁止・物理整理はピッチ後

### (a) 本番DBの他20テーブル（skeleton_old 由来）

出所は `db_schema_archive/skeleton_old_migrations/`（本番を実際に構築した設計図の控え。テーブル名レベルで20/20完全一致）。`budget_tiers`（4行）以外は全て0行（2026-06 棚卸し確定値、詳細: `db_inventory_report.md`）。

```
audit_logs, billing_reconciliation, budget_tiers, cost_snapshots,
current_tier_status, daily_budget_limits, differential_support_results,
differential_support_sessions, disease_symptoms, diseases, fleet_status,
followup_tasks, notification_preferences, patient_disease_assignments,
patient_identities, patients, pharma_companies, symptoms,
task_cost_history, tier_transitions
```

### (b) `supabase/schema.sql` 系

`case_followups` / `visits` / `treatment_records` / `drug_deliveries` / `patient_outcomes` ＋ `profiles` への列追加等。マイグレーション履歴に作成記録がなく、本番実在も未確認（`db_inventory_report.md` B-2 / F-12）。

### (c) `supabase/migrations/` 旧5本が定義するテーブル群

`profiles` / `articles` / `diseases` / `symptoms` / `disease_symptoms` / `diagnosis_history` / `diagnosis_stats` / A-5群 / `disease_candidates` 等。本番実在が未確認のものを含む（同 F-12）。旧アプリ（隔離済み）のみが参照する。

### レガシー群の扱い（共通ルール)

- **閲覧のみ可**。新規コード・新規機能からの参照は禁止。
- **DROP・カラム削除・データ操作は行わない**（ファウンダー専管。CLAUDE.md 権限境界）。
- 物理整理（不要テーブルの drop 等）は**ピッチ後**に人間が判断する。スキーマ考古学に期限内の時間を使わない。

## 3. ルール（最上位・公開面のデータ境界）

> **公開面は、器以外のテーブルを読まない。**

- 公開面 = `app/(portal)/` 配下および今後作る公開ページすべて。
- 公開されるものは、器（themes / theme_facts / fact_sources）を通過し**承認された**ものだけ。出典なき情報は存在させない。
- 旧JSONコーパス・RAG・レガシーテーブルは**下書きの材料**としてのみ使い、公開経路には乗せない。

## 参照資料

- `db_inventory_report.md` — DB棚卸し（3系統の食い違いの詳細）
- `db_schema_archive/draft/README.md` — 器の設計思想（骨格は固定・中身は柔軟）
- `db_schema_archive/skeleton_old_migrations/README.md` — 本番20テーブルの出所の経緯
- `FABLE_HANDOFF_REPORT.md` — 事実源（器の本番定着・承認ガードの記述）
