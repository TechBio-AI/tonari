/**
 * @jest-environment node
 *
 * 世話人向けダッシュボードの契約（lib/portal/group-dashboard.ts と
 * supabase/migrations/*_group_dashboard.sql の public.group_dashboard / prefecture_region / stats_threshold）。
 * DB には接続しない。定数と SQL の文面が食い違わないことだけを見る。
 * 動きそのもの（伏せ方・権限）は scripts/portal/verify_dashboard.sql でファウンダーが確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

import {
  DASHBOARD_CHOICES,
  DASHBOARD_ROW_COUNT,
  DASHBOARD_SECTIONS,
  EXACT_SECTIONS,
  PREFECTURE_REGION,
  REGIONS,
  REGION_LABELS,
  STATS_THRESHOLD,
  SUPPRESSED,
} from '@/lib/portal/group-dashboard'
import { AGE_BANDS, GENDERS, PREFECTURES, REGISTRANT_TYPES } from '@/lib/portal/member-profile'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')

const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_group_dashboard.sql'))
const SQL = FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')) : ''
/** 20261016: group_dashboard の差し替え（研究協力の同意の行を外す） */
const DROP_FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_dashboard_drop_consent.sql'))
const SQL_DROP =
  DROP_FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, DROP_FILES[0]), 'utf-8')) : ''
const JOURNEY = stripComments(
  fs.readFileSync(
    path.join(MIGRATIONS_DIR, fs.readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith('_journey_survey.sql'))!),
    'utf-8'
  )
)

/** 最新の定義（20261016 → 20261012 の順に探す）の本文 */
const fnBody = (name: string) => {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`
  const body = [SQL_DROP, SQL].map((sql) => sql.split(marker)[1]).find((b) => b !== undefined)
  return (body ?? '').split('$$;')[0]
}
const quoted = (text: string) => [...text.matchAll(/'([^']*)'/g)].map((m) => m[1])

describe('ファイル', () => {
  test('*_group_dashboard.sql と *_dashboard_drop_consent.sql がそれぞれちょうど 1 本', () => {
    expect(FILES).toHaveLength(1)
    expect(DROP_FILES).toHaveLength(1)
  })
})

describe('しきい値', () => {
  test('stats_threshold() は 10 を返す IMMUTABLE。アプリ側の定数と同じ', () => {
    const def = fnBody('stats_threshold')
    expect(def).toContain('IMMUTABLE')
    expect(def).toMatch(/SELECT 10;/)
    expect(STATS_THRESHOLD).toBe(10)
    expect(SUPPRESSED).toBe('10未満')
  })

  test('group_dashboard はしきい値を直書きせず stats_threshold() から取る', () => {
    const def = fnBody('group_dashboard')
    expect(def).toContain('v_t INTEGER := public.stats_threshold();')
    expect(def).toContain('cells.cnt < v_t')
    expect(def).not.toMatch(/<\s*10\b/)
    expect(def).toContain(`'${SUPPRESSED}'`)
  })
})

describe('section と choice の並びが DB と同じ', () => {
  const def = () => fnBody('group_dashboard')

  test('section の並び', () => {
    const exact = def().split('exact AS')[1].split('opts AS')[0]
    const opts = def().split('opts AS')[1].split('cells AS')[0]
    const sections = [
      ...[...exact.matchAll(/\('(\w+)', (\d+),/g)].map((m) => [m[1], Number(m[2])] as const),
      ...[...opts.matchAll(/SELECT '(\w+)'(?:::TEXT AS s)?, (\d+)(?: AS s_ord)?,/g)].map((m) => [m[1], Number(m[2])] as const),
    ]
      .sort((a, b) => a[1] - b[1])
      .map(([s]) => s)
    expect(sections).toEqual(DASHBOARD_SECTIONS)
    expect(DASHBOARD_SECTIONS.slice(0, 3)).toEqual([...EXACT_SECTIONS])
  })

  test.each([
    ['registrant_type', REGISTRANT_TYPES],
    ['age_band', AGE_BANDS],
    ['gender', GENDERS],
    ['region', [...REGIONS, 'unknown']],
  ] as const)('%s の choice', (section, expected) => {
    const opts = def().split('opts AS')[1].split('cells AS')[0]
    const block = opts.split(`'${section}'`)[1].split('WITH ORDINALITY')[0]
    expect(quoted(block)).toEqual([...expected])
    expect([...DASHBOARD_CHOICES[section]]).toEqual([...expected])
  })

  test('実数の 3 行は all。研究協力の同意の行は無い（20261016）・26 行', () => {
    for (const s of EXACT_SECTIONS) expect([...DASHBOARD_CHOICES[s]]).toEqual(['all'])
    expect(Object.keys(DASHBOARD_CHOICES)).not.toContain('consent_research_contact')
    expect(def()).not.toContain('consent_research_contact')
    expect(def()).not.toContain('public.consents')
    expect(DASHBOARD_ROW_COUNT).toBe(3 + 2 + 9 + 3 + 9)
  })

  test('20261016 は 20261012 から同意の部分だけを外した差し替え（戻りの列・権限は同じ）', () => {
    const old = SQL.split('CREATE OR REPLACE FUNCTION public.group_dashboard(')[1].split('$$;')[0]
    const removed = old
      .replace(/\s+UNION ALL\s+SELECT 'consent_research_contact', 8, 'yes', 1/, '')
      .replace(/\s+WHEN 'consent_research_contact' THEN EXISTS \([\s\S]*?withdrawn_at IS NULL\)/, '')
    expect(def().replace(/\s+/g, ' ')).toBe(removed.replace(/\s+/g, ' '))
    expect(SQL_DROP).not.toMatch(/DROP FUNCTION/)
    expect(SQL_DROP).toMatch(/REVOKE ALL ON FUNCTION public\.group_dashboard\(UUID\)\s+FROM PUBLIC, anon;/)
    expect(SQL_DROP).toMatch(/GRANT EXECUTE ON FUNCTION public\.group_dashboard\(UUID\)\s+TO authenticated;/)
  })
})

describe('地方ブロック', () => {
  test('値は道のり調査の地方ブロックと同じ（no_answer を除く）', () => {
    const region = JOURNEY.split("WHEN 'region' THEN ARRAY[")[1].split(']')[0]
    expect(quoted(region).filter((r) => r !== 'no_answer')).toEqual([...REGIONS])
    for (const r of [...REGIONS, 'unknown'] as const) expect(REGION_LABELS[r]).toBeTruthy()
  })

  test('47 都道府県すべてに地方ブロックがあり、DB の prefecture_region と同じ', () => {
    expect(Object.keys(PREFECTURE_REGION).sort()).toEqual([...PREFECTURES].sort())
    const def = fnBody('prefecture_region')
    const fromSql: Record<string, string> = {}
    for (const m of def.matchAll(/WHEN p_prefecture (?:=|IN) \(?([^)]*?)\)? THEN '(\w+)'/g)) {
      for (const p of quoted(m[1])) fromSql[p] = m[2]
    }
    expect(fromSql).toEqual(PREFECTURE_REGION)
    expect(PREFECTURE_REGION['三重県']).toBe('kinki')
  })
})

describe('権限と止め方', () => {
  test('group_dashboard: SECURITY DEFINER・search_path 空・世話人でなければ forbidden', () => {
    const def = fnBody('group_dashboard')
    expect(def).toContain('SECURITY DEFINER')
    expect(def).toContain("SET search_path = ''")
    expect(def).toMatch(/IF auth\.uid\(\) IS NULL THEN\s+RAISE EXCEPTION USING MESSAGE = 'unauthenticated';/)
    expect(def).toMatch(/IF NOT public\.is_group_moderator\(p_group_id\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
  })

  test('在籍会員だけを数え、user_id・氏名を返さない', () => {
    const def = fnBody('group_dashboard')
    expect(def).toContain('mb.left_at IS NULL')
    expect(def).toContain("r.status = 'pending'")
    expect(def).toMatch(/RETURNS TABLE \(section TEXT, choice TEXT, n TEXT\)/)
    expect(def).not.toContain('full_name')
  })

  test('PUBLIC・anon は実行不可、authenticated は実行可。内側の 2 本はどの API ロールも実行不可', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.group_dashboard\(UUID\)\s+FROM PUBLIC, anon;/)
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.group_dashboard\(UUID\)\s+TO authenticated;/)
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.stats_threshold\(\)\s+FROM PUBLIC, anon, authenticated;/)
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.prefecture_region\(TEXT\)\s+FROM PUBLIC, anon, authenticated;/)
    expect(SQL).not.toMatch(/GRANT [^;]*(stats_threshold|prefecture_region)/)
    for (const f of ['stats_threshold', 'prefecture_region']) expect(fnBody(f)).toContain("SET search_path = ''")
  })
})

describe('確認台本 scripts/portal/verify_dashboard.sql', () => {
  const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_dashboard.sql'), 'utf-8')

  test('ローカル専用の明記と安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜12 と後片付けがそろっている', () => {
    for (let i = 0; i <= 12; i++) expect(SCRIPT).toMatch(new RegExp(`vd_(chk|rec)\\('${i}',`))
    expect(SCRIPT).toContain("vd_chk('後片付け'")
  })
})
