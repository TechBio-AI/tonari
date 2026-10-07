-- =============================================================================
-- 運営ロール operators（共通契約 2026-10-03 の B）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 適用済みの migration は書き換えない。
--
-- 何のための表か:
--   運営（会の新設の承認・参加希望の実数集計・案件の登録・公開の参加状況の確認をする人）を持つ。
--   運営画面は /demo/ops 配下で、運営以外と閲覧モードは 404（画面担当）。DB 側は is_operator() で確かめる。
--
-- 作るもの:
--   operators(user_id 主キー〔auth.users CASCADE〕, created_at, note)
--     表そのものは誰にも読ませない・書かせない（API ロールの権限をすべてはがす）。
--     運営を足す・外すのは SQL エディタから（最初の運営も同じ。画面からは作れない）。
--   is_operator()      … 呼んだ本人が運営か。RLS のポリシーや他の関数の中からも使う
--   list_operators()   … 運営どうしの一覧。返すのは表示名（member_profiles.display_name）だけ。運営でなければ forbidden
--
-- 最初の運営（test@example.com）について:
--   この migration には入れない。本番に当てたときに、その時点で test@example.com の人がいれば運営になってしまうため。
--   ローカル専用の seed（supabase/seed_operators_local.sql）に分けた（Claude Code の判断）。
--   本番の最初の運営は、ファウンダーが SQL エディタで 1 行入れる（この下の確認手順を参照）。
--
-- 権限:
--   関数は SECURITY DEFINER・search_path ''・PUBLIC と anon に EXECUTE なし・authenticated にあり（既存と同じ）。
--   エラーの語は既存どおり（forbidden）。
--   アカウント削除で operators の行を消すこと・最後の運営の削除を止めること（last_operator）は、
--   アカウント削除担当が 20261027 で delete_my_account を差し替えて行う（共通契約 G）。
--   それまでは auth.users の削除で CASCADE により消える。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operators (
    user_id    UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    note       TEXT CHECK (note IS NULL OR (btrim(note) <> '' AND char_length(note) <= 200))
);

COMMENT ON TABLE public.operators IS
'運営。表は API から読めず書けない。is_operator() で確かめ、list_operators() で運営どうしの表示名だけを見る。足す・外すのは SQL エディタから';
COMMENT ON COLUMN public.operators.note IS
'運営の側のメモ（任意。200 文字まで）。画面には出さない';

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operators FROM anon, authenticated;
-- ポリシーは作らない（表は関数経由でだけ読む）


-- -----------------------------------------------------------------------------
-- is_operator()：呼んだ本人が運営か（本人についてだけ答える）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM public.operators o WHERE o.user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- list_operators() → (display_name)：運営どうしの一覧。運営でなければ forbidden。
--   表示名だけを返す（user_id・氏名・メール・note は返さない）。プロフィールが無い運営は NULL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_operators()
RETURNS TABLE (display_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'unauthenticated';
    END IF;
    IF NOT public.is_operator() THEN
        RAISE EXCEPTION USING MESSAGE = 'forbidden';
    END IF;

    RETURN QUERY
        SELECT mp.display_name
          FROM public.operators o
          LEFT JOIN public.member_profiles mp ON mp.user_id = o.user_id
         ORDER BY o.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.is_operator()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_operators()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_operator()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_operators() TO authenticated;


-- =============================================================================
-- 適用後にすること（ローカル専用）:
--   1. supabase/seed_operators_local.sql を Studio の SQL エディタで流す（test@example.com を運営にする）
--   2. scripts/portal/verify_ops.sql を流す（20261023〜20261026 も当ててから）
--
-- 本番で最初の運営を入れるとき（ファウンダーが SQL エディタで）:
--   insert into public.operators (user_id, note)
--   select id, '最初の運営' from auth.users where email = '<運営のメールアドレス>';
-- =============================================================================
