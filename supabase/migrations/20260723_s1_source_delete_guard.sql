-- =============================================================================
-- [Phase1-S1-C] 出典の全削除で「approved かつ出典ゼロ」が生まれるのを DB 層で塞ぐ
--
-- 出所: docs/sql-review-s1-portal-hardening.md §2-5 の提案トリガを正式採用したもの。
--       器の強制を DB 層で完結させる方針（承認の書き込み側ガードの穴を埋める）。
--
-- ※ Claude Code は適用しない。TechBio がレビュー後に手動適用する。
--
-- 前提: 20260601_t0_theme_facts_scaffold.sql（theme_facts / fact_sources / 承認ガード）
--       が先に適用済みであること。本ファイルは最後に流す。
--
-- 塞ぐ穴（scaffold / hardening の「残存する既知の限界」）:
--   承認ガード trg_guard_fact_approval は「承認する瞬間」に出典必須を課すが、
--   承認"後"に fact_sources を全削除する操作は止めていなかった。結果
--   「approved かつ出典ゼロ」という不整合データが作れてしまう。
--   読み取り側（20260722 の RESTRICTIVE ポリシー fact_has_source）で公開事故には
--   ならないが、データ整合として望ましくない。ここで書き込み側も閉じる。
--
-- 方針: 削除を「拒否(RAISE)」せず、親 fact の承認を pending に「差し戻す」。
--   理由: 出典の差し替え（古い出典を消して新しい出典を足す）を許すため。
--   差し替え後は再度 reviewer が承認し直す（＝出典が変わったら再レビュー）。
--
-- CASCADE 誤爆の回避（最重要）:
--   theme_facts や themes を削除すると ON DELETE CASCADE で fact_sources も消える。
--   その連鎖削除の最中に本トリガが発火すると、既に消えつつある親 fact を
--   pending に戻そうとして無駄・誤動作になり得る。そこで「親 fact が既に存在
--   しない場合は何もしない」ガードを先頭に置く（親削除に由来する出典削除では
--   親が先に消えているため素通りする）。
--   ★未確認: この「親が先に消える」順序は PostgreSQL の CASCADE 実行順序に依存する。
--     本番相当のDBで theme_facts / themes の削除時に本トリガが誤爆しないことを
--     適用前に実地検証すること（scaffold 作者が本トリガを見送った理由がこの相互作用）。
--
-- 冪等性: CREATE OR REPLACE FUNCTION と DROP TRIGGER IF EXISTS → CREATE。再実行安全。
-- =============================================================================

CREATE OR REPLACE FUNCTION guard_source_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- (a) 親 fact が既に無い（theme_facts/themes の CASCADE 由来）なら何もしない＝誤爆回避
  IF NOT EXISTS (SELECT 1 FROM theme_facts f WHERE f.id = OLD.fact_id) THEN
    RETURN OLD;
  END IF;

  -- (b) 削除しようとしているのが「最後の1件」なら、親 fact の承認を差し戻す。
  --     まだ他の出典が残るなら整合は保たれるので何もしない。
  IF NOT EXISTS (
    SELECT 1 FROM fact_sources s
     WHERE s.fact_id = OLD.fact_id
       AND s.id <> OLD.id
  ) THEN
    UPDATE theme_facts
       SET approval_status = 'pending',
           validation_flags = array_append(
             array_remove(validation_flags, 'no_source'), 'no_source')
     WHERE id = OLD.fact_id
       AND approval_status = 'approved';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_source_delete ON fact_sources;
CREATE TRIGGER trg_guard_source_delete
  BEFORE DELETE ON fact_sources
  FOR EACH ROW EXECUTE FUNCTION guard_source_delete();

-- =============================================================================
-- 含めることの影響（TechBio レビュー用・一言）
--   ・承認済み fact から最後の出典を消すと、その fact は自動的に「未承認(pending)」へ
--     戻り、validation_flags に 'no_source' が付く（公開面から自動的に外れる）。
--     ＝出典の裏付けを失った情報が承認済みのまま残らない。これが狙いどおりの効果。
--   ・出典の「差し替え」は可能（消す→足す→再承認）。削除自体はブロックしない。
--   ・CASCADE（fact や theme ごと削除）には影響しない想定だが、上記のとおり
--     実行順序依存のため適用前に実地検証が必要（未確認）。
-- =============================================================================
