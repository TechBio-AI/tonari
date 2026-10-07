/**
 * @jest-environment node
 *
 * 患者会への参加希望（supabase/migrations/*_group_wishes.sql と *_delete_account_v4.sql）の文面の検査。
 * DB には接続しない。動きそのものは scripts/portal/verify_wishes.sql でファウンダーが確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

import { PREFECTURES } from '@/lib/portal/member-profile'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
const readOne = (suffix: string) => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(suffix))
  return { files, sql: files.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, files[0]), 'utf-8')) : '' }
}

const WISHES = readOne('_group_wishes.sql')
const V3 = readOne('_delete_account_v3.sql')
const V4 = readOne('_delete_account_v4.sql')
const SQL = WISHES.sql
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_wishes.sql'), 'utf-8')

const tableDef = (name: string) => SQL.split(`CREATE TABLE IF NOT EXISTS public.${name} (`)[1].split('\n);')[0]
const fnBody = (sql: string, name: string) => sql.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1].split('$$;')[0]
const quoted = (text: string) => [...text.matchAll(/'([^']*)'/g)].map((m) => m[1])

describe('ファイル', () => {
  test('group_wishes・delete_account_v3・delete_account_v4 がそれぞれ 1 本', () => {
    expect(WISHES.files).toHaveLength(1)
    expect(V3.files).toHaveLength(1)
    expect(V4.files).toHaveLength(1)
  })
})

describe('group_wishes', () => {
  test('列と制約（契約どおり）', () => {
    const t = tableDef('group_wishes')
    expect(t).toMatch(/disease_idx\s+INTEGER NOT NULL/)
    expect(t).toMatch(/user_id\s+UUID NOT NULL DEFAULT auth\.uid\(\) REFERENCES auth\.users ON DELETE CASCADE/)
    expect(t).toContain("relation        TEXT NOT NULL CHECK (relation IN ('self', 'family'))")
    expect(t).toMatch(/is_group_member BOOLEAN,/)
    expect(t).toMatch(/withdrawn_at\s+TIMESTAMP WITH TIME ZONE,/)
    expect(t).toContain('UNIQUE (disease_idx, user_id)')
  })

  test('都道府県の値域は member_profiles と同じ（lib/portal/member-profile.ts の PREFECTURES）', () => {
    const block = tableDef('group_wishes').split('prefecture      TEXT NOT NULL CHECK (prefecture IN (')[1].split('))')[0]
    expect(quoted(block)).toEqual([...PREFECTURES])
  })

  test('本人の行だけ insert / select / update。update は withdrawn_at だけ・delete は無い', () => {
    expect(SQL).toMatch(/ON public\.group_wishes\s+FOR SELECT TO authenticated\s+USING \(user_id = auth\.uid\(\)\)/)
    expect(SQL).toMatch(/ON public\.group_wishes\s+FOR INSERT TO authenticated\s+WITH CHECK \(user_id = auth\.uid\(\) AND withdrawn_at IS NULL\)/)
    expect(SQL).toMatch(/ON public\.group_wishes\s+FOR UPDATE TO authenticated\s+USING \(user_id = auth\.uid\(\)\)\s+WITH CHECK \(user_id = auth\.uid\(\)\)/)
    expect(SQL).toContain('GRANT UPDATE (withdrawn_at) ON public.group_wishes TO authenticated;')
    expect(SQL).toContain(
      'GRANT INSERT (disease_idx, user_id, prefecture, relation, is_group_member) ON public.group_wishes TO authenticated;'
    )
    expect(SQL).not.toMatch(/GRANT [^;]*DELETE/)
    expect(SQL).not.toMatch(/FOR DELETE/)
  })

  test('会員プロフィールを求めない（member_profiles を見ない）', () => {
    const policies = (SQL.match(/CREATE POLICY group_wishes_[\s\S]*?;/g) ?? []).join('\n')
    expect(policies).not.toContain('member_profiles')
  })
})

describe('public_wish_counts（公開用の集計）', () => {
  test('列は disease_idx・n・updated_at だけ（user_id を持たない）', () => {
    const t = tableDef('public_wish_counts')
    const cols = t
      .split('\n')
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((c) => /^[a-z_]+$/.test(c))
    expect(cols).toEqual(['disease_idx', 'n', 'updated_at'])
  })

  test('anon・authenticated は SELECT だけ。書くのはトリガーだけ', () => {
    expect(SQL).toMatch(/ON public\.public_wish_counts\s+FOR SELECT TO anon, authenticated\s+USING \(true\)/)
    const anonGrants = SQL.match(/GRANT [^;]*TO [^;]*anon[^;]*;/g) ?? []
    expect(anonGrants).toEqual(['GRANT SELECT ON public.public_wish_counts TO anon, authenticated;'])
    expect(SQL).not.toMatch(/GRANT (INSERT|UPDATE)[^;]*public_wish_counts/)
  })

  test('取り消していない行だけを数え、しきい値は stats_threshold() で「10未満」にする', () => {
    const f = fnBody(SQL, 'sync_public_wish_count')
    expect(f).toContain('w.withdrawn_at IS NULL')
    expect(f).toContain("CASE WHEN v_cnt < public.stats_threshold() THEN '10未満' ELSE v_cnt::TEXT END")
    expect(f).not.toMatch(/<\s*10\b/)
    expect(f).toContain('WHERE c.n IS DISTINCT FROM EXCLUDED.n')
    expect(f).not.toMatch(/DELETE FROM public\.public_wish_counts/)
  })

  test('トリガーは group_wishes の AFTER INSERT / UPDATE / DELETE', () => {
    expect(SQL).toMatch(
      /CREATE TRIGGER sync_public_wish_count\s+AFTER INSERT OR UPDATE OR DELETE ON public\.group_wishes\s+FOR EACH ROW EXECUTE FUNCTION public\.sync_public_wish_count\(\);/
    )
  })
})

describe('関数の属性', () => {
  const FUNCS = [
    ['stamp_group_wish_withdrawal', ''],
    ['sync_public_wish_count', ''],
    ['wish_summary', 'INTEGER'],
  ] as const

  test('すべて SECURITY DEFINER・search_path 空・どの API ロールにも EXECUTE なし', () => {
    for (const [f, args] of FUNCS) {
      const body = fnBody(SQL, f)
      expect(body).toContain('SECURITY DEFINER')
      expect(body).toContain("SET search_path = ''")
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\(${args}\\)\\s+FROM PUBLIC, anon, authenticated;`))
      expect(SQL).not.toMatch(new RegExp(`GRANT [^;]*${f}`))
    }
  })

  test('wish_summary は都道府県・続柄・会員かどうか・実数を返し、user_id を返さない', () => {
    const f = fnBody(SQL, 'wish_summary')
    expect(f).toMatch(/RETURNS TABLE \(prefecture TEXT, relation TEXT, is_group_member BOOLEAN, n BIGINT\)/)
    expect(f).toContain('w.withdrawn_at IS NULL')
    expect(f).not.toMatch(/user_id/)
  })
})

describe('delete_my_account 版 4', () => {
  test('版 3 の本文に group_wishes を消す 1 文を足しただけ', () => {
    const v3 = fnBody(V3.sql, 'delete_my_account')
    const v4 = fnBody(V4.sql, 'delete_my_account')
    const line = '    DELETE FROM public.group_wishes WHERE user_id = v_uid;\n'
    expect(v4).toContain(line)
    expect(v4.replace(line, '').replace(/\s+/g, ' ')).toBe(v3.replace(/\s+/g, ' '))
  })

  test('権限は版 3 と同じ（PUBLIC・anon から外し、authenticated に付ける）', () => {
    expect(V4.sql).toMatch(/REVOKE ALL ON FUNCTION public\.delete_my_account\(\)\s+FROM PUBLIC, anon;/)
    expect(V4.sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\) TO authenticated;/)
  })
})

describe('確認台本 scripts/portal/verify_wishes.sql', () => {
  test('ローカル専用の明記と安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜6 と後片付けがそろっている', () => {
    for (let i = 0; i <= 6; i++) expect(SCRIPT).toMatch(new RegExp(`vw_(chk|rec)\\('${i}',`))
    expect(SCRIPT).toContain("vw_chk('後片付け'")
  })
})
