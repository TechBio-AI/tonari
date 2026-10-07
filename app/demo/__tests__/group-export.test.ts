/**
 * @jest-environment node
 *
 * 世話人のページの書き出し（GET /demo/community/[slug]/manage/export）
 *   - 世話人ならファイル（JSON・attachment・no-store）
 *   - 一般の会員・会員でない会・無い slug・閲覧モードは 404（中身を明かさない）。未ログインは 302
 * DB には接続しない（tenancy.ts と session.ts を差し替える）。
 */

const getViewer = jest.fn()
jest.mock('@/app/demo/_lib/session', () => ({ getViewer: () => getViewer() }))

const listGroups = jest.fn()
const exportGroup = jest.fn()
jest.mock('@/lib/portal/tenancy', () => ({
  ...jest.requireActual('@/lib/portal/tenancy'),
  listGroups: () => listGroups(),
  exportGroup: (id: string) => exportGroup(id),
}))

import { GET } from '../community/[slug]/manage/export/route'

const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const B = { id: '22222222-2222-4222-8222-222222222222', slug: 'gaucher-japan', name: 'テストの会B' }
const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const call = (slug: string) => GET(new Request('http://localhost/x'), { params: { slug } })

beforeEach(() => {
  getViewer.mockReset()
  listGroups.mockReset()
  exportGroup.mockReset()
  listGroups.mockResolvedValue({ ok: true, value: [A, B] })
})

test('世話人ならファイルとして返す', async () => {
  getViewer.mockResolvedValue(MEMBER)
  exportGroup.mockResolvedValue({ ok: true, value: { format: 'tonari-patient-group-export/1', members: [{ display_name: 'はなこ' }] } })
  const r = await call(A.slug)
  expect(r.status).toBe(200)
  expect(r.headers.get('content-disposition')).toMatch(/^attachment; filename="fabry-fukurou-\d{4}-\d{2}-\d{2}\.json"$/)
  expect(r.headers.get('cache-control')).toBe('no-store')
  expect(JSON.parse(await r.text()).format).toBe('tonari-patient-group-export/1')
  expect(exportGroup).toHaveBeenCalledWith(A.id)
})

test('世話人でない（一般の会員・別の会）は 404', async () => {
  getViewer.mockResolvedValue(MEMBER)
  exportGroup.mockResolvedValue({ ok: false, reason: 'forbidden' })
  expect((await call(A.slug)).status).toBe(404)
  expect((await call(B.slug)).status).toBe(404)
})

test('無い slug は 404（DB の書き出しを呼ばない）', async () => {
  getViewer.mockResolvedValue(MEMBER)
  expect((await call('no-such')).status).toBe(404)
  expect(exportGroup).not.toHaveBeenCalled()
})

test('閲覧モードは 404（DB を読まない）', async () => {
  getViewer.mockResolvedValue({ kind: 'demo' })
  expect((await call('sample')).status).toBe(404)
  expect(listGroups).not.toHaveBeenCalled()
  expect(exportGroup).not.toHaveBeenCalled()
})

test('未ログインは /demo/login へ 302', async () => {
  getViewer.mockResolvedValue(null)
  const r = await call(A.slug)
  expect(r.status).toBe(302)
  expect(r.headers.get('location')).toBe('/demo/login')
})
