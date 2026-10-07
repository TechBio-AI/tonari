/**
 * 閲覧コード（閲覧モード）の見本に足した画面の検査（2026-10-04）
 *   会のホーム・行事（一覧と詳細）・資料・リンク・会の約束・会員の状況（26 行）・治験・研究の案内（2 件）・
 *   参加希望（登録済み）・運営画面（承認・保存のボタンは押しても何も起きない）
 *
 *   1. 各画面が開き、「（見本）」の印が出る
 *   2. DB を呼ばない（Supabase のクライアントを作ること自体を数える。どの画面も 0 回）
 *   3. 運営画面の見本のボタンは送信しない（form の中に無く、type="button"）。その旨の文がある
 *   4. 禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

jest.mock('../_lib/session', () => ({ getViewer: async () => ({ kind: 'demo' }) }))

// DB の入口（サーバー・ブラウザ・service role）をすべて差し替え、作られた回数を数える
const dbCalls: string[] = []
const fakeClient = (from: string) => {
  dbCalls.push(from)
  return new Proxy({}, { get: () => () => { throw new Error(`DB を呼んだ: ${from}`) } })
}
jest.mock('@/lib/supabase/server', () => ({ createClient: () => fakeClient('@/lib/supabase/server') }))
jest.mock('@/lib/supabase/client', () => ({ createClient: () => fakeClient('@/lib/supabase/client') }))
jest.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient('@supabase/supabase-js') }))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo',
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}))

import DemoCommunityPage from '../community/page'
import GroupHomePage from '../community/[slug]/page'
import EventsPage from '../community/[slug]/events/page'
import EventPage from '../community/[slug]/events/[id]/page'
import LinksPage from '../community/[slug]/links/page'
import RulesPage from '../community/[slug]/rules/page'
import ManagePage from '../community/[slug]/manage/page'
import DashboardPage from '../community/[slug]/manage/dashboard/page'
import NoticesPage from '../community/notices/page'
import WishStatusPage from '../wish/page'
import WishPage from '../wish/[idx]/page'
import OpsHomePage from '../ops/page'
import OpsWishesPage from '../ops/wishes/page'
import OpsRequestsPage from '../ops/requests/page'
import OpsNoticesPage from '../ops/notices/page'
import OpsReportsPage from '../ops/reports/page'
import { wishTargetByName } from '../wish/_lib/targets'
import { OPS_DEMO_NOTICE } from '../ops/_lib/samples'

const SAVED_FLAGS = { WISHES: process.env.WISHES, TRIAL_NOTICES: process.env.TRIAL_NOTICES, OPS: process.env.OPS }
beforeAll(() => {
  process.env.WISHES = 'on'
  process.env.TRIAL_NOTICES = 'on'
  process.env.OPS = 'on'
})
afterAll(() => {
  for (const [k, v] of Object.entries(SAVED_FLAGS)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})
beforeEach(() => {
  dbCalls.length = 0
  ;(global.fetch as jest.Mock | undefined)?.mockClear?.()
})

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

const page = async (p: Promise<JSX.Element>) => render(await p).container

const MPS2 = wishTargetByName('ムコ多糖症II型')!
const S = { slug: 'sample' }

const SCREENS: [string, () => Promise<JSX.Element>][] = [
  ['会のホーム', () => GroupHomePage({ params: S })],
  ['行事の一覧', () => EventsPage({ params: S })],
  ['行事の詳細', () => EventPage({ params: { ...S, id: 'sample-event-1' } })],
  ['資料・リンク', () => LinksPage({ params: S })],
  ['会の約束', () => RulesPage({ params: S })],
  ['世話人のページ', () => ManagePage({ params: S })],
  ['会員の状況（ダッシュボード）', () => DashboardPage({ params: S })],
  ['治験・研究の案内', () => NoticesPage({})],
  ['参加希望の一覧', () => WishStatusPage({})],
  ['参加希望（登録済み）', () => WishPage({ params: { idx: String(MPS2.idx) } })],
  ['運営のトップ', () => OpsHomePage()],
  ['運営：参加希望の集計', () => OpsWishesPage({})],
  ['運営：会の新設の申請', () => OpsRequestsPage({})],
  ['運営：治験・研究の案内', () => OpsNoticesPage({})],
  ['運営：通報（全会）', () => OpsReportsPage()],
]

test.each(SCREENS)('%s が開き、「（見本）」の印があり、DB を呼ばない', async (_n, open) => {
  const el = await page(open())
  expect(el.textContent).toContain('（見本）')
  expect(el.querySelector('[data-sample-mark]')).not.toBeNull()
  expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])
  expect(dbCalls).toEqual([])
})

test('見本の入口（/demo/community）から各画面へリンクがある', async () => {
  const el = await page(DemoCommunityPage())
  const hrefs = [...el.querySelectorAll('[data-demo-screens] a')].map((a) => a.getAttribute('href'))
  for (const h of ['/demo/community/sample', '/demo/community/sample/events', '/demo/community/sample/links', '/demo/community/sample/rules', '/demo/community/sample/manage/dashboard', '/demo/community/notices', '/demo/wish', '/demo/ops']) {
    expect(hrefs).toContain(h)
  }
  expect(dbCalls).toEqual([])
})

test('会員の状況は 26 行、治験・研究の案内は 2 件、参加希望は登録済みの見本', async () => {
  expect((await page(DashboardPage({ params: S }))).querySelectorAll('[data-n]')).toHaveLength(26)
  const n = await page(NoticesPage({}))
  expect(n.querySelector('[data-demo-notices]')?.querySelectorAll('[data-notice]')).toHaveLength(2)
  expect(n.textContent).toContain('見本では「興味がある」「表示しない」は押せません。')
  const w = await page(WishPage({ params: { idx: String(MPS2.idx) } }))
  expect(w.querySelector('[data-wish-done][data-wish-sample]')).not.toBeNull()
  expect(w.querySelector('form')).toBeNull()
  expect(dbCalls).toEqual([])
})

test('見本に無い行事の id は 404', async () => {
  await expect(EventPage({ params: { ...S, id: 'x' } })).rejects.toThrow('notFound')
})

test.each([
  ['運営：会の新設の申請', () => OpsRequestsPage({})],
  ['運営：治験・研究の案内', () => OpsNoticesPage({})],
] as const)('%s: 見本のボタンは送信しない（form の外・type="button"）。押しても何も起きないと書いてある', async (_n, open) => {
  const el = await page(open())
  expect(el.querySelector('[data-ops-demo]')?.textContent).toContain(OPS_DEMO_NOTICE)
  expect(el.querySelectorAll('form')).toHaveLength(0)
  const buttons = [...el.querySelectorAll('[data-ops-demo-buttons] button, button[data-ops-demo-buttons]')]
  expect(buttons.length).toBeGreaterThan(0)
  for (const b of buttons) expect(b.getAttribute('type')).toBe('button')
  expect(dbCalls).toEqual([])
})
