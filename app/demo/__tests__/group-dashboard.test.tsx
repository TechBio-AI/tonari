/**
 * 世話人向けの「会員の状況」（/demo/community/[slug]/manage/dashboard）の検査
 *
 * DB には接続しない。group_dashboard の返り値は契約どおりの形でモックする（本物との結合はファウンダーが migration を当ててから）。
 *   1. 世話人だけ: 一般の会員・会員でない人は 404、未ログインは /demo/login。RPC も呼ばない。
 *      閲覧モードは見本の 26 行（2026-10-04。RPC を呼ばない）
 *   2. n はそのまま: '10未満' を数に直さない。実数の 3 行もそのまま
 *   3. 印刷: 会の名前・集計日時・注記が紙に出る（print:hidden の外）。A4 の指定。ボタンとリンクは紙に出さない
 *   4. 道のり調査の集計へのリンクは JOURNEY_SURVEY=on かつ道のり調査の会のときだけ
 *   5. 「診断」と禁止表現が無い。解釈の文を付けない
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const listGroups = jest.fn()
const myGroups = jest.fn()
const listPendingJoinRequests = jest.fn()
jest.mock('@/lib/portal/tenancy', () => ({
  ...jest.requireActual('@/lib/portal/tenancy'),
  listGroups: () => listGroups(),
  myGroups: () => myGroups(),
  listPendingJoinRequests: () => listPendingJoinRequests(),
}))

const rpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: (...a: unknown[]) => rpc(...a), auth: { getUser: async () => ({ data: { user: { id: 'u-me' } } }) } }),
}))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo/community',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import DashboardPage from '../community/[slug]/manage/dashboard/page'
import ManagePage from '../community/[slug]/manage/page'
import { DASHBOARD_NOTE, buildDashboard } from '../community/[slug]/_lib/dashboard'
import { DASHBOARD_CHOICES, DASHBOARD_ROW_COUNT, DASHBOARD_SECTIONS } from '@/lib/portal/group-dashboard'

const FABRY = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const OTHER = { id: '22222222-2222-4222-8222-222222222222', slug: 'gaucher-japan', name: 'テストの会B' }
const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }

// 契約どおりの返り値（架空）。lib/portal/group-dashboard.ts の DASHBOARD_CHOICES の全 26 行（0 人の行も返る）
const SAMPLE_N: Record<string, string> = {
  'members_total/all': '23',
  'moderators/all': '2',
  'join_requests_pending/all': '1',
  'registrant_type/self': '15',
  'gender/男性': '12',
  'region/kanto': '11',
}
const ROWS = DASHBOARD_SECTIONS.flatMap((section) =>
  (DASHBOARD_CHOICES[section] as readonly string[]).map((choice) => ({ section, choice, n: SAMPLE_N[`${section}/${choice}`] ?? '10未満' }))
)

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function as(role: 'member' | 'moderator' | null, group = FABRY) {
  getViewer.mockResolvedValue(MEMBER)
  myGroups.mockResolvedValue({ ok: true, value: role ? [{ ...group, role, joinedAt: 'x' }] : [] })
}

const savedJourney = process.env.JOURNEY_SURVEY
beforeEach(() => {
  getViewer.mockReset()
  listGroups.mockReset()
  myGroups.mockReset()
  rpc.mockReset()
  listGroups.mockResolvedValue({ ok: true, value: [FABRY, OTHER] })
  rpc.mockResolvedValue({ data: ROWS, error: null })
  delete process.env.JOURNEY_SURVEY
})
afterAll(() => {
  if (savedJourney === undefined) delete process.env.JOURNEY_SURVEY
  else process.env.JOURNEY_SURVEY = savedJourney
})

async function page(slug = FABRY.slug) {
  return render(await DashboardPage({ params: { slug } })).container
}

describe('世話人だけ', () => {
  test('一般の会員は 404。RPC を呼ばない', async () => {
    as('member')
    await expect(DashboardPage({ params: { slug: FABRY.slug } })).rejects.toThrow('notFound')
    expect(rpc).not.toHaveBeenCalled()
  })

  test('会員でない会（別の会の世話人でも）は 404', async () => {
    as('moderator', OTHER)
    await expect(DashboardPage({ params: { slug: FABRY.slug } })).rejects.toThrow('notFound')
    expect(rpc).not.toHaveBeenCalled()
  })

  test('閲覧モードは見本の 26 行（RPC を呼ばない）、未ログインは /demo/login', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const d = render(await DashboardPage({ params: { slug: 'sample' } })).container
    expect(d.querySelectorAll('[data-n]')).toHaveLength(26)
    expect(d.textContent).toContain('（見本）')
    getViewer.mockResolvedValue(null)
    await expect(DashboardPage({ params: { slug: FABRY.slug } })).rejects.toThrow('redirect:/demo/login')
    expect(rpc).not.toHaveBeenCalled()
  })

  test('世話人なら group_dashboard を、その会の id で呼ぶ', async () => {
    as('moderator')
    const c = await page()
    expect(rpc).toHaveBeenCalledWith('group_dashboard', { p_group_id: FABRY.id })
    expect(c.querySelector('h2')?.textContent).toBe('会員の状況')
  })

  test('世話人のページに入口がある', async () => {
    as('moderator')
    listGroups.mockResolvedValue({ ok: true, value: [FABRY] })
    listPendingJoinRequests.mockResolvedValue({ ok: true, value: [] })
    const c = render(await ManagePage({ params: { slug: FABRY.slug } })).container
    expect(c.querySelector(`a[href="/demo/community/${FABRY.slug}/manage/dashboard"]`)?.textContent).toBe('会員の状況を見る')
  })
})

describe('n は返ってきた文字列をそのまま出す', () => {
  test("'10未満' はそのまま。実数もそのまま。数に直したり合計したりしない", async () => {
    as('moderator')
    const c = await page()
    const cell = (section: string, label: string) => {
      const t = c.querySelector(`[data-dashboard-table="${section}"]`)!
      const row = [...t.querySelectorAll('tbody tr')].find((r) => r.querySelector('th')?.textContent === label)!
      return row.querySelector('[data-n]')!.textContent
    }
    expect(cell('members_total', '合計')).toBe('23')
    expect(cell('moderators', '合計')).toBe('2')
    expect(cell('join_requests_pending', '合計')).toBe('1')
    expect(cell('registrant_type', 'ご家族・代理の方')).toBe('10未満')
    expect(cell('gender', '女性')).toBe('10未満')
    expect(cell('region', '未登録')).toBe('10未満')
    expect(c.querySelector('[data-dashboard-table="consent_research_contact"]')).toBeNull() // 20261016 で外した
    expect(c.textContent).not.toContain('研究・治験の案内')
    const all = [...c.querySelectorAll('[data-n]')].map((x) => x.textContent)
    expect(all.filter((n) => n === '10未満')).toHaveLength(ROWS.filter((r) => r.n === '10未満').length)
    // 「9」「0」など、伏せた値を数に置き換えたものが出ていない
    expect(all.every((n) => ROWS.some((r) => r.n === n))).toBe(true)
    expect(c.querySelector('svg[role="img"], canvas')).toBeNull() // グラフにしない
  })

  test('契約どおり 26 行で、表は 7 つ', async () => {
    expect(ROWS).toHaveLength(26)
    expect(DASHBOARD_ROW_COUNT).toBe(26)
    as('moderator')
    const c = await page()
    expect(c.querySelectorAll('[data-dashboard-table]')).toHaveLength(7)
    expect(c.querySelectorAll('[data-n]')).toHaveLength(26)
  })

  test('表の順と区分の並びは契約の順（返ってこなかった区分は作らない）', () => {
    const t = buildDashboard(ROWS)
    expect(t.map((x) => x.section)).toEqual([
      'members_total', 'moderators', 'join_requests_pending', 'registrant_type', 'age_band', 'gender', 'region',
    ])
    expect(t.find((x) => x.section === 'registrant_type')!.rows.map((r) => r.label)).toEqual(['ご本人', 'ご家族・代理の方'])
    expect(t.find((x) => x.section === 'age_band')!.rows.map((r) => r.label)).toEqual([...DASHBOARD_CHOICES.age_band])
    expect(t.find((x) => x.section === 'region')!.rows.map((r) => r.label)).toEqual(['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄', '未登録'])
  })

  test('契約に無い section・区分は捨てずに、そのままの名前で後ろに出す', () => {
    const t = buildDashboard([...ROWS, { section: 'region', choice: 'mars', n: '10未満' }, { section: 'new_one', choice: 'x', n: '10未満' }])
    expect(t.find((x) => x.section === 'region')!.rows.map((r) => r.label)).toEqual(['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄', '未登録', 'mars'])
    expect(t[t.length - 1]).toEqual({ section: 'new_one', title: 'new_one', rows: [{ choice: 'x', label: 'x', n: '10未満' }] })
  })

  test('RPC が失敗・形が違うときは「読み込めませんでした」（表を作らない）', async () => {
    as('moderator')
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    let c = await page()
    expect(c.querySelector('[role="alert"]')?.textContent).toContain('読み込めませんでした')
    expect(c.querySelector('[data-dashboard-table]')).toBeNull()
    rpc.mockResolvedValue({ data: [{ section: 'gender', choice: '男性', n: 12 }], error: null }) // n が数（契約違反）
    c = await page()
    expect(c.querySelector('[data-dashboard-table]')).toBeNull()
    spy.mockRestore()
  })
})

describe('印刷', () => {
  test('会の名前・集計日時・注記が紙に出る（print:hidden の中に無い）。A4 の指定がある', async () => {
    as('moderator')
    const c = await page()
    const printed = (el: Element | null) => {
      expect(el).not.toBeNull()
      for (let e: Element | null = el; e; e = e.parentElement) expect(e.className?.toString() ?? '').not.toContain('print:hidden')
    }
    const note = c.querySelector('[data-dashboard-note]')
    expect(note?.textContent).toBe('10人未満の区分は「10未満」と表示しています')
    expect(DASHBOARD_NOTE).toBe('10人未満の区分は「10未満」と表示しています')
    printed(note)
    const h1 = c.querySelector('h1')
    expect(h1?.textContent).toBe(FABRY.name)
    printed(h1)
    const at = c.querySelector('[data-generated-at]')
    expect(at?.textContent).toMatch(/^集計日時：\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}$/)
    printed(at)
    for (const t of c.querySelectorAll('[data-dashboard-table]')) printed(t)

    const css = [...c.querySelectorAll('style')].map((s) => s.innerHTML).join('\n')
    expect(css).toContain('@media print')
    expect(css).toContain('size: A4')
    expect(css).toMatch(/header, footer, nav/)

    // 印刷ボタンは紙に出さない
    const button = [...c.querySelectorAll('button')].find((b) => b.textContent?.includes('印刷する'))!
    expect(button.closest('.print\\:hidden') ?? button.className.includes('print:hidden')).toBeTruthy()
  })

  test('「診断」と禁止表現が無く、解釈の文を付けない', async () => {
    as('moderator')
    const c = await page()
    expect(c.innerHTML).not.toContain('診断') // lint-wording: allow
    expect(BLOCKLIST.filter((w) => c.innerHTML.includes(w))).toEqual([])
    for (const w of ['多い', '少ない', '傾向', '割合', '%', '％']) expect(c.textContent).not.toContain(w)
  })
})

describe('道のり調査の集計へのリンク', () => {
  test('JOURNEY_SURVEY=on かつ道のり調査の会なら出す', async () => {
    process.env.JOURNEY_SURVEY = 'on'
    as('moderator')
    const c = await page()
    expect(c.querySelector(`a[href="/demo/community/${FABRY.slug}/journey/summary"]`)?.textContent).toBe('病気がわかるまでの道のり（集計）を見る')
  })

  test.each([undefined, 'off', 'ON'])('JOURNEY_SURVEY=%p なら出さない', async (v) => {
    if (v !== undefined) process.env.JOURNEY_SURVEY = v
    as('moderator')
    const c = await page()
    expect(c.querySelector('a[href$="/journey/summary"]')).toBeNull()
  })

  test('道のり調査の会でなければ、on でも出さない', async () => {
    process.env.JOURNEY_SURVEY = 'on'
    as('moderator', OTHER)
    const c = await page(OTHER.slug)
    expect(c.querySelector('a[href$="/journey/summary"]')).toBeNull()
  })
})
