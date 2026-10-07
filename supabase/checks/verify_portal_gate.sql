-- =============================================================================
-- 器・承認ゲートの適用後 検証クエリ集（読み取り専用・手動実行用）
--
-- 出所: docs/sql-review-s1-portal-hardening.md §2-3 の検証クエリを実行可能な形に整理。
-- 使い方: 器の連鎖（20260601 / T6 / 20260722 / 20260723）を適用した「直後」に、
--         Supabase Studio の SQL エディタ等で上から順に流して結果を目視確認する。
-- ※ このファイルは supabase/migrations/ の外に置いてある。db push では実行されない。
-- ※ 一切データを変更しない（SELECT のみ）。
-- =============================================================================

-- (1) RLS が有効か — 3テーブルすべて rowsecurity = true を期待 ------------------
SELECT relname AS table_name, relrowsecurity AS rls_enabled
  FROM pg_class
 WHERE relnamespace = 'public'::regnamespace
   AND relname IN ('themes', 'theme_facts', 'fact_sources')
 ORDER BY relname;
-- 期待: 3行すべて rls_enabled = t（false があれば RESTRICTIVE ポリシーが素通りする）

-- (2) ポリシーが揃っているか — PERMISSIVE(scaffold) と RESTRICTIVE(hardening) の共存 --
SELECT tablename, policyname, permissive, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('themes', 'theme_facts', 'fact_sources')
 ORDER BY tablename, permissive DESC, policyname;
-- 期待: 各テーブルに PERMISSIVE の *_select 等 と、RESTRICTIVE の *_public_read_guard が両方ある。
--       RESTRICTIVE が無いと未公開/未出典が漏れる。PERMISSIVE が無いと anon は何も見えない。

-- (3) 承認トリガ・出典削除ガードが実在するか ------------------------------------
SELECT t.tgname AS trigger_name,
       c.relname AS on_table,
       CASE WHEN t.tgenabled = 'D' THEN 'DISABLED' ELSE 'enabled' END AS state
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal
   AND t.tgname IN ('trg_guard_fact_approval', 'trg_guard_source_delete')
 ORDER BY t.tgname;
-- 期待: trg_guard_fact_approval（theme_facts, enabled）と
--       trg_guard_source_delete（fact_sources, enabled）の2行。

-- (4) ヘルパー関数が実在するか --------------------------------------------------
SELECT proname AS function_name,
       prosecdef AS is_security_definer
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND proname IN ('app_role','is_builder','is_reviewer',
                   'guard_fact_approval','guard_source_delete',
                   'fact_has_source','theme_is_public','set_updated_at')
 ORDER BY proname;
-- 期待: 8関数。fact_has_source / theme_is_public は is_security_definer = t
--       （相互再帰回避のため SECURITY DEFINER であること）。

-- (5) 不整合データが無いか — 「approved かつ 出典ゼロ」の theme_facts ------------
--     builder/reviewer 文脈でもゼロ件が理想（承認ガード＋削除ガードが効いていれば）。
SELECT count(*) AS approved_without_source
  FROM theme_facts f
 WHERE f.approval_status = 'approved'
   AND NOT EXISTS (SELECT 1 FROM fact_sources s WHERE s.fact_id = f.id);
-- 期待: 0。1以上なら過去に作られた不整合が残っている（削除ガード適用前の残骸の可能性）。

-- (6) ★ 匿名(anon)から「出典ゼロ/未承認/未公開」が見えないことの確認 ------------
--     以下は anon ロールになりきって実行する。トランザクション内で role を切り替え、
--     最後に ROLLBACK するので永続変更は無い。
--     ※ Supabase Studio は既定で service_role 相当のため、RLS を体感するには
--       この set local role で anon に切り替えて確認するのが確実。
BEGIN;
  SET LOCAL role anon;

  -- (6-a) anon から見える themes は「承認済み かつ 公開済み」だけのはず
  SELECT count(*) AS anon_visible_unpublished_or_unapproved_themes
    FROM themes
   WHERE approval_status <> 'approved' OR published_at IS NULL;
  -- 期待: 0（anon には承認済み＆公開済みしか見えないため、この条件に合う行は視界に無い）

  -- (6-b) anon から見える theme_facts に「出典ゼロ」は無いはず
  SELECT count(*) AS anon_visible_facts_without_source
    FROM theme_facts f
   WHERE NOT EXISTS (SELECT 1 FROM fact_sources s WHERE s.fact_id = f.id);
  -- 期待: 0

  -- (6-c) anon から見える theme_facts に「未承認」は無いはず
  SELECT count(*) AS anon_visible_unapproved_facts
    FROM theme_facts
   WHERE approval_status <> 'approved';
  -- 期待: 0
ROLLBACK;

-- =============================================================================
-- 補足: 器が現在 0 行なら (5)(6) はいずれも 0 件になる。真価が問われるのは中身
--       投入後（S2 以降）。中身を入れたあとに (6) を再実行し、意図的に作った
--       「未承認 fact」「出典ゼロ fact」「未公開 theme」が anon から 0 件で
--       あり続けることを確認するのが受け入れテストになる。
-- =============================================================================
