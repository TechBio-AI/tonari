/**
 * 機能フラグ（lib/portal/feature-flags.ts。既定 off）の配線の検査（2026-10-03）
 *
 *   WISHES        … /demo/wish/** は 404、action は書かない。/demo/groups・疾患ページの希望のボタンと人数、
 *                   「ほかの病気の患者会を希望する」、会員エリアのトップとマイページの導線を出さない
 *   TRIAL_NOTICES … /demo/community/notices は 404、action は書かない。会のホームの案内・マイページの導線を出さない。
 *                   運営画面の案件（/demo/ops/notices）も 404
 *   OPS           … /demo/ops/** は 404（セッションも見ない）
 * あわせて: 参加希望の実数は wish_summary_ops を呼ぶ／last_operator の文言
 * （Route Handler の分は feature-flags-routes.test.ts）
 */
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const c = { isOperator: jest.fn(), listMyTrialNotices: jest.fn(), fetchPublicGroups: jest.fn(), requestNewGroup: jest.fn(), setNoticeInterest: jest.fn() }
jest.mock('../_lib/contract-db', () => {
  const actual = jest.requireActual('../_lib/contract-db')
  return {
    ...actual,
    isOperator: () => c.isOperator(),
    listMyTrialNotices: () => c.listMyTrialNotices(),
    fetchPublicGroups: () => c.fetchPublicGroups(),
    requestNewGroup: (...a: unknown[]) => c.requestNewGroup(...a),
    setNoticeInterest: (...a: unknown[]) => c.setNoticeInterest(...a),
  }
})
const w = { listMyWishes: jest.fn(), listMyWishRows: jest.fn(), createWish: jest.fn(), withdrawWish: jest.fn() }
jest.mock('../wish/_lib/wishes', () => ({
  ...jest.requireActual('../wish/_lib/wishes'),
  listMyWishes: () => w.listMyWishes(),
  listMyWishRows: () => w.listMyWishRows(),
  createWish: (...a: unknown[]) => w.createWish(...a),
  withdrawWish: (...a: unknown[]) => w.withdrawWish(...a),
}))
const rpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: (...a: unknown[]) => rpc(...a), auth: { getUser: async () => ({ data: { user: { id: 'u-me' } } }) } }),
}))
const t = { listGroups: jest.fn(), myGroups: jest.fn(), listPosts: jest.fn() }
jest.mock('@/lib/portal/tenancy', () => ({
  ...jest.requireActual('@/lib/portal/tenancy'),
  listGroups: () => t.listGroups(),
  myGroups: () => t.myGroups(),
  listPosts: (...a: unknown[]) => t.listPosts(...a),
}))
jest.mock('@/lib/portal/group-events-db', () => ({ listEvents: async () => ({ ok: true, value: [] }) }))
jest.mock('../community/[slug]/_lib/community', () => ({
  ...jest.requireActual('../community/[slug]/_lib/community'),
  getGroupSettings: async () => ({ welcomeText: null, rulesText: null }),
  listPostsWithMeta: async () => ({ ok: true, value: [] }),
  listMyContents: async () => [],
}))
jest.mock('@/lib/portal/member-profile', () => ({
  ...jest.requireActual('@/lib/portal/member-profile'),
  getMyProfile: async () => ({
    userId: 'u-me', fullName: 'テスト 花子', displayName: 'はなこ', registrantType: 'self', proxyRelation: null,
    patientIsMinor: null, ageBand: '30代', gender: '答えない', prefecture: '長野県', consentedAt: '2026-09-26T03:00:00Z',
  }),
}))
jest.mock('@/lib/portal/research-contact', () => ({
  ...jest.requireActual('@/lib/portal/research-contact'),
  getMyResearchContact: async () => ({ state: 'none', consentedAt: null, diseases: [] }),
  getMyGroupDiseaseIdxs: async () => [],
}))
jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import { FAILURE_MESSAGES } from '@/lib/portal/tenancy'
import { getWishSummary } from '../_lib/contract-db'

import OpsHomePage from '../ops/page'
import OpsWishesPage from '../ops/wishes/page'
import OpsRequestsPage from '../ops/requests/page'
import OpsNoticesPage from '../ops/notices/page'
import { approveGroupRequestAction, saveTrialNoticeAction } from '../ops/actions'
import WishStatusPage from '../wish/page'
import WishPage from '../wish/[idx]/page'
import NewGroupPage from '../wish/[idx]/new-group/page'
import { createWishAction, requestNewGroupAction, withdrawWishAction } from '../wish/actions'
import GroupsPage from '../groups/page'
import DiseasePage from '../diseases/[slug]/page'
import DemoCommunityPage from '../community/page'
import MemberProfilePage from '../community/profile/page'
import NoticesPage from '../community/notices/page'
import { setNoticeInterestAction } from '../community/notices/actions'
import GroupHomePage from '../community/[slug]/page'
import { wishTargetByName } from '../wish/_lib/targets'

const FLAGS = ['WISHES', 'TRIAL_NOTICES', 'OPS'] as const
const SAVED = Object.fromEntries(FLAGS.map((f) => [f, process.env[f]]))
const setFlags = (on: Partial<Record<(typeof FLAGS)[number], string>>) => {
  for (const f of FLAGS) {
    if (on[f] === undefined) delete process.env[f]
    else process.env[f] = on[f]
  }
}
afterAll(() => {
  for (const f of FLAGS) {
    if (SAVED[f] === undefined) delete process.env[f]
    else process.env[f] = SAVED[f]
  }
})

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const ok = <T,>(value: T) => ({ ok: true, value })
const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const POMPE = wishTargetByName('ポンペ病')!
const FABRY = wishTargetByName('ファブリー病')!
const fd = () => new FormData()
async function page(p: Promise<unknown>) {
  return render((await p) as React.ReactElement).container
}

beforeEach(() => {
  setFlags({}) // 既定はすべて off
  getViewer.mockReset().mockResolvedValue(MEMBER)
  for (const m of [...Object.values(c), ...Object.values(w), ...Object.values(t)]) m.mockReset()
  rpc.mockReset()
  c.isOperator.mockResolvedValue(true)
  c.listMyTrialNotices.mockResolvedValue(ok([{ id: 'n1', diseaseId: FABRY.diseaseId, registry: 'jrct', registryId: 'x', registryUrl: 'https://jrct.niph.go.jp/x', summary: 's', publishedAt: null, myStatus: null }]))
  c.fetchPublicGroups.mockResolvedValue([])
  w.listMyWishes.mockResolvedValue([])
  w.listMyWishRows.mockResolvedValue([])
  t.listGroups.mockResolvedValue(ok([A]))
  t.myGroups.mockResolvedValue(ok([{ ...A, role: 'member', joinedAt: 'x' }]))
  t.listPosts.mockResolvedValue(ok([]))
})

// =============================================================================
describe('OPS', () => {
  test.each([
    ['はじめ', () => OpsHomePage()],
    ['参加希望の実数', () => OpsWishesPage({})],
    ['会の新設の申請', () => OpsRequestsPage({})],
    ['案件', () => OpsNoticesPage({})],
  ])('off: %s は運営でも 404。セッションも運営かも見ない', async (_n, open) => {
    await expect(open()).rejects.toThrow('notFound')
    expect(getViewer).not.toHaveBeenCalled()
    expect(c.isOperator).not.toHaveBeenCalled()
  })

  test('off: 運営の action も 404（DB を呼ばない）', async () => {
    await expect(approveGroupRequestAction('r1', fd())).rejects.toThrow('notFound')
    await expect(saveTrialNoticeAction(null, fd())).rejects.toThrow('notFound')
    expect(rpc).not.toHaveBeenCalled()
  })

  test('on でも TRIAL_NOTICES が off なら、案件のページ・action は 404、タブにも出ない', async () => {
    setFlags({ OPS: 'on' })
    await expect(OpsNoticesPage({})).rejects.toThrow('notFound')
    await expect(saveTrialNoticeAction(null, fd())).rejects.toThrow('notFound')
    const el = await page(OpsHomePage())
    expect([...el.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))).not.toContain('/demo/ops/notices')
    expect(el.querySelector('a[href="/demo/ops/notices"]')).toBeNull()
    setFlags({ OPS: 'on', TRIAL_NOTICES: 'on' })
    const el2 = await page(OpsHomePage())
    expect(el2.querySelector('a[href="/demo/ops/notices"]')).not.toBeNull()
  })

  test.each(['', 'off', 'ON', 'true', '1', ' on'])('OPS=%p は閉じたまま', async (v) => {
    setFlags({ OPS: v })
    await expect(OpsHomePage()).rejects.toThrow('notFound')
  })
})

// =============================================================================
describe('WISHES', () => {
  test('off: /demo/wish・/demo/wish/[idx]・会の新設の申請は 404', async () => {
    await expect(WishStatusPage({})).rejects.toThrow('notFound')
    await expect(WishPage({ params: { idx: String(POMPE.idx) } })).rejects.toThrow('notFound')
    await expect(NewGroupPage({ params: { idx: String(POMPE.idx) } })).rejects.toThrow('notFound')
    expect(w.listMyWishRows).not.toHaveBeenCalled()
  })

  test('off: action は 404（何も書かない）', async () => {
    const f = new FormData()
    f.set('prefecture', '長野県')
    f.set('relation', 'self')
    f.set('consent', 'yes')
    await expect(createWishAction(POMPE.idx, f)).rejects.toThrow('notFound')
    await expect(withdrawWishAction(POMPE.idx, 'wish')).rejects.toThrow('notFound')
    await expect(requestNewGroupAction(POMPE.idx, f)).rejects.toThrow('notFound')
    expect(w.createWish).not.toHaveBeenCalled()
    expect(w.withdrawWish).not.toHaveBeenCalled()
    expect(c.requestNewGroup).not.toHaveBeenCalled()
  })

  test('off: /demo/groups に希望のボタン・人数・「ほかの病気の患者会を希望する」を出さない（節と病名は出す）', () => {
    const el = render(<GroupsPage />).container
    expect(el.querySelector('[data-not-yet] h2')?.textContent).toBe('となりへの参加を待っている患者会')
    expect(el.querySelector('[data-not-yet]')!.textContent).toContain('ポンペ病')
    expect(el.querySelector('a[data-wish-link]')).toBeNull()
    expect(el.querySelector('[data-wish-other]')).toBeNull()
    expect(el.querySelector('a[href^="/demo/wish"]')).toBeNull()
  })

  test('on: /demo/groups に出る', () => {
    setFlags({ WISHES: 'on' })
    const el = render(<GroupsPage />).container
    expect(el.querySelector('a[data-wish-link]')).not.toBeNull()
    expect(el.querySelector('[data-wish-other]')).not.toBeNull()
  })

  test('off: 疾患ページは一文だけ（ボタンを出さない）。on なら出る', () => {
    let el = render(<DiseasePage params={{ slug: 'pompe' }} />).container
    expect(el.querySelector('[data-no-group-yet]')!.textContent).toContain('まだ「となり」に参加していません')
    expect(el.querySelector('a[data-wish-link]')).toBeNull()
    setFlags({ WISHES: 'on' })
    el = render(<DiseasePage params={{ slug: 'pompe' }} />).container
    expect(el.querySelector('a[data-wish-link]')).not.toBeNull()
  })

  test('off: 会員エリアのトップ（プロフィールの無い方）とマイページに、参加希望の導線を出さない', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    let el = await page(DemoCommunityPage())
    expect(el.textContent).toContain('会員エリアは招待制です。')
    expect(el.querySelector('a[href="/demo/wish"]')).toBeNull()
    getViewer.mockResolvedValue(MEMBER)
    el = await page(MemberProfilePage())
    expect(el.querySelector('[data-my-wishes-section]')).toBeNull()
    expect(w.listMyWishes).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('TRIAL_NOTICES', () => {
  test('off: /demo/community/notices は 404。action は書かない', async () => {
    await expect(NoticesPage({})).rejects.toThrow('notFound')
    await expect(setNoticeInterestAction('n1', 'interested')).rejects.toThrow('notFound')
    expect(c.listMyTrialNotices).not.toHaveBeenCalled()
    expect(c.setNoticeInterest).not.toHaveBeenCalled()
  })

  test('off: 会のホームに案内を出さず、案件も読まない。マイページの導線も出さない', async () => {
    let el = await page(GroupHomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-notices]')).toBeNull()
    expect(c.listMyTrialNotices).not.toHaveBeenCalled()
    el = await page(MemberProfilePage())
    expect(el.querySelector('[data-notices-link]')).toBeNull()
  })

  test('on: 会のホームに案内、マイページに導線', async () => {
    setFlags({ TRIAL_NOTICES: 'on' })
    c.fetchPublicGroups.mockResolvedValue([{ slug: A.slug, name: A.name, diseaseId: FABRY.diseaseId, createdAt: 'x' }])
    let el = await page(GroupHomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-notices]')).not.toBeNull()
    el = await page(MemberProfilePage())
    expect(el.querySelector('[data-notices-link] a')?.getAttribute('href')).toBe('/demo/community/notices')
  })
})

// =============================================================================
describe('あわせて', () => {
  test('参加希望の実数は wish_summary_ops を、固定 ID で呼ぶ', async () => {
    rpc.mockResolvedValue({ data: [{ prefecture: '長野県', relation: 'self', is_group_member: null, n: 2 }], error: null })
    const r = await getWishSummary('rd00005')
    expect(rpc).toHaveBeenCalledWith('wish_summary_ops', { p_disease_id: 'rd00005' })
    expect(r).toEqual({ ok: true, value: [{ prefecture: '長野県', relation: 'self', isGroupMember: null, n: 2 }] })
  })

  test('last_operator の文言', () => {
    expect(FAILURE_MESSAGES.last_operator).toBe('ほかに運営がいないため、削除できません')
  })
})
