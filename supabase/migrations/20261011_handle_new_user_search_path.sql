-- =============================================================================
-- handle_new_user の search_path 固定と実行権限の整理（2026-10-11）
--
-- ※ Claude Code は適用しない。ファウンダーがローカル Supabase で適用する。
-- ※ 00001_create_tables.sql（適用済み）は書き換えない。関数をこのファイルで差し替える。
--
-- 原本（00001_create_tables.sql）で確かめたこと:
--   - 本文は INSERT INTO public.profiles (id) VALUES (NEW.id) だけ。表名は既にスキーマ修飾されている。
--     NEW はトリガーの行で、名前の解決は要らない。search_path を空にしても動きは変わらない
--   - LANGUAGE plpgsql SECURITY DEFINER。SET search_path は無かった（このファイルで固定する）
--   - トリガー on_auth_user_created: AFTER INSERT ON auth.users FOR EACH ROW。作り直さない
--     （CREATE OR REPLACE は関数の oid を変えないので、トリガーはそのまま新しい本文を呼ぶ）
--   - 所有者・権限は 00001 に書かれていない。所有者は 00001 を当てたロール（ローカルでは postgres の見込み。不明）。
--     権限は PostgreSQL の既定（PUBLIC に EXECUTE）と Supabase の既定（anon・authenticated に付与）のまま
--
-- 権限:
--   20261010 の journey_links_delete_response（トリガー関数）と同じく、PUBLIC・anon・authenticated からはがす。
--   トリガー関数は API から呼ぶものではない（rpc で直接呼べると、profiles に任意の行を作る足場になる）。
--   auth.users への insert は Auth サーバーが supabase_auth_admin で行う。トリガーの発火時に
--   EXECUTE の権限が要るかは不明なので、supabase_auth_admin には付けておく（ロールが無い環境では飛ばす）。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
    END IF;
END;
$$;

-- =============================================================================
-- 適用後に確かめること（ローカル専用）:
--   scripts/portal/verify_tenancy.sql を流す。
--     13 handle_new_user: SECURITY DEFINER・search_path 空固定・anon / authenticated / PUBLIC に EXECUTE なし
--     18 auth.users にテスト行を 1 件入れると profiles の行ができ、後片付けで両方消える
--   あわせて、マジックリンク（またはテスト用パスワードログイン）で新しい人が入れることを画面で一度確かめる
--   （トリガーが失敗すると auth.users への insert ごと失敗し、新規の人がログインできなくなるため）
-- =============================================================================
