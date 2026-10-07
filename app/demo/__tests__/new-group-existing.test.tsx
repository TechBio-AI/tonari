/**
 * 既存の患者会がある病気の、会の新設（2026-10-04）
 *
 * DB には接続しない（session・contract-db の DB に触れる関数を差し替える）。
 *   1. 申請フォーム: data/patient_groups にその病気の団体（となり未参加を含む）があれば、冒頭に案内と公式サイトへのリンク。
 *      理由（運営へのひとこと）が必須になる。団体が無い病気は今までどおり（案内なし・ひとことは任意）
 *   2. action: 既存の会がある病気で理由が空なら、申請せずに ?error=reason_required。理由があれば申請する
 *   3. 運営の承認の画面: 同じ注意を出し、承認のフォームはそのまま（止めない）
 *   4. 公式サイトの URL が未確認（null）の団体は名前だけ
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const c = { isOperator: jest.fn(), listGroupRequests: jest.fn(), requestNewGroup: jest.fn() }
jest.mock('../_lib/contract-db', () => ({
  ...jest.requireActual('../_lib/contract-db'),
  isOperator: () => c.isOperator(),
  listGroupRequests: () => c.listGroupRequests(),
  requestNewGroup: (...a: unknown[]) => c.requestNewGroup(...a),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    throw new Error('DB を呼んだ')
  },
}))
jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo',
}))

import NewGroupPage from '../wish/[idx]/new-group/page'
import OpsRequestsPage from '../ops/requests/page'
import { requestNewGroupAction } from '../wish/actions'
import { existingGroupsOf, wishTargetByName } from '../wish/_lib/targets'
import { REASON_REQUIRED_MESSAGE } from '../wish/_components/ExistingGroupsNotice'

const SAVED = { WISHES: process.env.WISHES, OPS: process.env.OPS }
beforeAll(() => {
  process.env.WISHES = 'on'
  process.env.OPS = 'on'
})
afterAll(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const FABRY = wishTargetByName('ファブリー病')!
const HPP = wishTargetByName('低ホスファターゼ症')!
const POMPE = wishTargetByName('ポンペ病')!
const FUKUROU = '一般社団法人 全国ファブリー病患者と家族の会（ふくろうの会）'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

const page = async (p: Promise<JSX.Element>) => render(await p).container
const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

beforeEach(() => {
  getViewer.mockReset().mockResolvedValue(MEMBER)
  c.isOperator.mockReset().mockResolvedValue(true)
  c.listGroupRequests.mockReset().mockResolvedValue({ ok: true, value: [] })
  c.requestNewGroup.mockReset().mockResolvedValue({ ok: true, value: 'req-1' })
})

test('existingGroupsOf: data/patient_groups の団体を、公式サイトの URL つきで返す（無い病気は空）', () => {
  expect(existingGroupsOf('ファブリー病')).toEqual([{ id: 'fabry-fukurou', name: FUKUROU, url: 'https://fabrynet.jp', tonariStatus: 'joined' }])
  expect(existingGroupsOf('低ホスファターゼ症')).toEqual([{ id: 'hpp-hope', name: 'HPP HOPE（低ホスファターゼ症コミュニティ）', url: null, tonariStatus: 'joined' }])
  expect(existingGroupsOf('ポンペ病')).toEqual([])
})

test('申請フォーム: 既存の会があれば、冒頭に案内と公式サイトへのリンク。理由が必須', async () => {
  const el = await page(NewGroupPage({ params: { idx: String(FABRY.idx) } }))
  const notice = el.querySelector('[data-existing-groups]')!
  expect(notice).not.toBeNull()
  expect(notice.textContent).toContain(`この病気には患者会「${FUKUROU}」があります。まずその会の、となりへの参加を待つことをおすすめします。`)
  const link = notice.querySelector('a[data-existing-group-link]')!
  expect(link.getAttribute('href')).toBe('https://fabrynet.jp')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  // 冒頭（フォームより前）
  const form = el.querySelector('[data-new-group-form]')!
  expect(notice.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  const message = form.querySelector('textarea[name="message"]') as HTMLTextAreaElement
  expect(message.required).toBe(true)
  expect(form.textContent).toContain('それでも新しく会を作りたい理由')
  expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])
})

test('申請フォーム: 公式サイトが未確認の団体は名前だけ（リンクなし）', async () => {
  const el = await page(NewGroupPage({ params: { idx: String(HPP.idx) } }))
  expect(el.querySelector('[data-existing-groups]')?.textContent).toContain('「HPP HOPE（低ホスファターゼ症コミュニティ）」があります')
  expect(el.querySelector('[data-existing-group-link]')).toBeNull()
  expect((el.querySelector('textarea[name="message"]') as HTMLTextAreaElement).required).toBe(true)
})

test('申請フォーム: 既存の会が無い病気は今までどおり（案内なし・ひとことは任意）', async () => {
  const el = await page(NewGroupPage({ params: { idx: String(POMPE.idx) } }))
  expect(el.querySelector('[data-existing-groups]')).toBeNull()
  expect((el.querySelector('textarea[name="message"]') as HTMLTextAreaElement).required).toBe(false)
  expect(el.textContent).toContain('運営へのひとこと（なくてもかまいません）')
})

test('?error=reason_required で、理由を書くよう出す', async () => {
  const el = await page(NewGroupPage({ params: { idx: String(FABRY.idx) }, searchParams: { error: 'reason_required' } }))
  expect(el.querySelector('[role="alert"]')?.textContent).toBe(REASON_REQUIRED_MESSAGE)
})

test('action: 既存の会がある病気で理由が空（空白だけも）なら申請しない。理由があれば申請する', async () => {
  for (const message of ['', '   ']) {
    await expect(requestNewGroupAction(FABRY.idx, fd({ name: '新しい会', message }))).rejects.toThrow(
      `redirect:/demo/wish/${FABRY.idx}/new-group?error=reason_required`
    )
  }
  expect(c.requestNewGroup).not.toHaveBeenCalled()
  await expect(requestNewGroupAction(FABRY.idx, fd({ name: '新しい会', message: '地域の集まりを作りたいため' }))).rejects.toThrow(
    `redirect:/demo/wish/${FABRY.idx}/new-group?done=requested`
  )
  expect(c.requestNewGroup).toHaveBeenCalledWith(FABRY.diseaseId, '新しい会', '地域の集まりを作りたいため')
})

test('action: 既存の会が無い病気は、理由が空でも申請できる（今までどおり）', async () => {
  await expect(requestNewGroupAction(POMPE.idx, fd({ name: 'ポンペ病の会', message: '' }))).rejects.toThrow(
    `redirect:/demo/wish/${POMPE.idx}/new-group?done=requested`
  )
  expect(c.requestNewGroup).toHaveBeenCalledTimes(1)
})

test('運営の承認の画面: 既存の会がある病気の申請に同じ注意を出し、承認のフォームはそのまま', async () => {
  c.listGroupRequests.mockResolvedValue({
    ok: true,
    value: [
      { id: 'r1', diseaseId: FABRY.diseaseId, proposedName: '新しい会', message: '地域の集まりを作りたいため', status: 'pending', createdAt: '2026-10-04T00:00:00Z', decidedAt: null },
      { id: 'r2', diseaseId: POMPE.diseaseId, proposedName: 'ポンペ病の会', message: '', status: 'pending', createdAt: '2026-10-03T00:00:00Z', decidedAt: null },
    ],
  })
  const el = await page(OpsRequestsPage({}))
  const [fabry, pompe] = [...el.querySelectorAll('[data-ops-request]')]
  const notice = fabry.querySelector('[data-existing-groups]')!
  expect(notice.textContent).toContain(`この病気には患者会「${FUKUROU}」があります。まずその会の、となりへの参加を待つことをおすすめします。`)
  expect(notice.querySelector('a')?.getAttribute('href')).toBe('https://fabrynet.jp')
  expect(fabry.textContent).toContain('地域の集まりを作りたいため')
  expect(fabry.querySelector('form button[type="submit"]')?.textContent).toBe('承認して会を作る') // 止めない
  expect(pompe.querySelector('[data-existing-groups]')).toBeNull()
  expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])
})
