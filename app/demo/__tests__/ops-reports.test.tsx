/**
 * 運営画面の「通報（全会）」（/demo/ops/reports。DB 関数 list_all_reports〔20261030〕。2026-10-04）
 *
 * DB には接続しない（list_all_reports の RPC は差し替え＝モック）。
 *   1. 運営だけ。一般の会員・未ログインは 404 で、通報を読まない
 *   2. 未対応 → 対応済みに分けて出す。対応は各会の manage/reports へのリンク。このページに送信のフォームは無い
 *   3. 通報した人・対応した人は出さない（DB も返さない）
 *   4. 読めない（未適用・forbidden）ときは「読み込めませんでした」
 *   5. 閲覧モードは見本（DB を呼ばない）。リンクは世話人のページの見本へ
 *   6. 運営のタブとはじめのページに入口がある
 */
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const rpc = jest.fn()
const createClient = jest.fn(() => ({ rpc: (...a: unknown[]) => rpc(...a) }))
jest.mock('@/lib/supabase/server', () => ({ createClient: () => createClient() }))

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  usePathname: () => '/demo/ops',
}))

import OpsReportsPage from '../ops/reports/page'
import OpsHomePage from '../ops/page'
import { listAllReports } from '../_lib/contract-db'

const SAVED = process.env.OPS
beforeAll(() => {
  process.env.OPS = 'on'
})
afterAll(() => {
  if (SAVED === undefined) delete process.env.OPS
  else process.env.OPS = SAVED
})

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const ROWS = [
  { id: 'r1', group_slug: 'fabry-fukurou', target_kind: 'post', post_id: 'p1', comment_id: null, reason: '理由その1', created_at: '2026-10-03T00:00:00Z', handled_at: null },
  { id: 'r2', group_slug: 'pompe-kai', target_kind: 'comment', post_id: null, comment_id: 'c1', reason: '', created_at: '2026-10-02T00:00:00Z', handled_at: null },
  { id: 'r3', group_slug: 'fabry-fukurou', target_kind: 'post', post_id: 'p2', comment_id: null, reason: '理由その3', created_at: '2026-09-01T00:00:00Z', handled_at: '2026-09-02T00:00:00Z' },
]

/** is_operator と list_all_reports の返り値を決める */
function db(operator: boolean, reports: { data: unknown; error: { message: string } | null } = { data: ROWS, error: null }) {
  rpc.mockImplementation(async (fn: string) => {
    if (fn === 'is_operator') return { data: operator, error: null }
    if (fn === 'list_all_reports') return reports
    throw new Error(`想定外の RPC: ${fn}`)
  })
}
const calledReports = () => rpc.mock.calls.some(([fn]) => fn === 'list_all_reports')
const page = async () => render(await OpsReportsPage()).container

let errSpy: jest.SpyInstance
beforeEach(() => {
  rpc.mockReset()
  createClient.mockClear()
  getViewer.mockReset().mockResolvedValue(MEMBER)
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errSpy.mockRestore())

test('listAllReports は list_all_reports を引数なしで呼び、列を画面の形に直す', async () => {
  db(true)
  const r = await listAllReports()
  expect(rpc).toHaveBeenCalledWith('list_all_reports', undefined)
  expect(r).toEqual({
    ok: true,
    value: [
      { id: 'r1', groupSlug: 'fabry-fukurou', targetKind: 'post', postId: 'p1', commentId: null, reason: '理由その1', createdAt: '2026-10-03T00:00:00Z', handledAt: null },
      { id: 'r2', groupSlug: 'pompe-kai', targetKind: 'comment', postId: null, commentId: 'c1', reason: '', createdAt: '2026-10-02T00:00:00Z', handledAt: null },
      { id: 'r3', groupSlug: 'fabry-fukurou', targetKind: 'post', postId: 'p2', commentId: null, reason: '理由その3', createdAt: '2026-09-01T00:00:00Z', handledAt: '2026-09-02T00:00:00Z' },
    ],
  })
  db(true, { data: null, error: { message: 'forbidden' } })
  expect(await listAllReports()).toEqual({ ok: false, reason: 'forbidden' })
})

test('運営でない会員・未ログインは 404 で、通報を読まない', async () => {
  db(false)
  await expect(OpsReportsPage()).rejects.toThrow('notFound')
  getViewer.mockResolvedValue(null)
  await expect(OpsReportsPage()).rejects.toThrow('notFound')
  expect(calledReports()).toBe(false)
})

test('運営: 未対応 → 対応済みに分けて出し、対応は各会の manage/reports へ。フォームは無い', async () => {
  db(true)
  const el = await page()
  const open = [...el.querySelectorAll('[data-ops-reports-open] [data-ops-report]')]
  const done = [...el.querySelectorAll('[data-ops-reports-done] [data-ops-report]')]
  expect(open).toHaveLength(2)
  expect(done).toHaveLength(1)
  expect(el.textContent).toContain('未対応（2 件）')
  expect(el.textContent).toContain('対応済み（1 件）')
  expect(open[0].querySelector('[data-ops-report-group]')?.textContent).toBe('fabry-fukurou')
  expect(open[0].textContent).toContain('投稿への通報')
  expect(open[1].textContent).toContain('コメントへの通報')
  expect(open[1].querySelector('[data-ops-report-reason]')?.textContent).toBe('（理由は書かれていません）')
  expect(done[0].querySelector('[data-ops-report-status]')?.textContent).toBe('対応済み（2026年9月2日）')
  expect([...el.querySelectorAll('[data-ops-report-link]')].map((a) => a.getAttribute('href'))).toEqual([
    '/demo/community/fabry-fukurou/manage/reports',
    '/demo/community/pompe-kai/manage/reports',
    '/demo/community/fabry-fukurou/manage/reports',
  ])
  expect(el.querySelector('form')).toBeNull()
  expect(el.querySelector('[data-ops-demo]')).toBeNull()
})

test('通報した人・対応した人は出さない（DB が余計な列を返しても）', async () => {
  db(true, { data: [{ ...ROWS[0], reporter_id: 'u-reporter-secret', handled_by: 'u-handler-secret' }], error: null })
  const html = (await page()).innerHTML
  expect(html).not.toContain('u-reporter-secret')
  expect(html).not.toContain('u-handler-secret')
})

test('0 件なら「通報はありません」、読めなければ「読み込めませんでした」', async () => {
  db(true, { data: [], error: null })
  expect((await page()).textContent).toContain('通報はありません。')
  db(true, { data: null, error: { message: 'Could not find the function public.list_all_reports' } })
  expect((await page()).querySelector('[role="alert"]')?.textContent).toBe('読み込めませんでした。')
})

test('閲覧モードは見本（DB を呼ばない）。リンクは世話人のページの見本へ', async () => {
  getViewer.mockResolvedValue({ kind: 'demo' })
  const el = await page()
  expect(createClient).not.toHaveBeenCalled()
  expect(el.querySelector('[data-ops-demo]')).not.toBeNull()
  expect(el.querySelector('[data-sample-mark]')?.textContent).toBe('（見本）')
  expect(el.querySelectorAll('[data-ops-report]')).toHaveLength(3)
  for (const a of el.querySelectorAll('[data-ops-report-link]')) expect(a.getAttribute('href')).toBe('/demo/community/sample/manage')
})

test('運営のタブとはじめのページに「通報（全会）」の入口がある', async () => {
  db(true)
  const el = await page()
  const current = el.querySelector('nav[aria-label="運営のページ"] a[aria-current="page"]')
  expect(current?.textContent).toBe('通報（全会）')
  expect(current?.getAttribute('href')).toBe('/demo/ops/reports')
  const home = render(await OpsHomePage()).container
  expect(home.querySelector('ul a[href="/demo/ops/reports"]')?.textContent).toBe('通報（全会）')
})
