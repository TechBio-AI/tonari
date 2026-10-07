/**
 * 共通契約 2026-10-03 の画面側（運営画面・会員向けの案件・公開の参加状況・会の新設・JaSMIn・参加希望の disease_id）の検査
 *
 * DB には接続しない（app/demo/_lib/contract-db.ts の DB に触れる関数・session・Supabase を差し替える）。
 *   1. 権限: 運営画面は運営だけ。B 層（研究の案内に同意した会員）・一般の会員・未ログイン・閲覧モードは 404
 *   2. 案件: 会員の画面は list_my_trial_notices だけを読む（B 層以外には DB が返さない＝見えない）。表を直接読む運営の関数は呼ばない
 *   3. 案件の summary に禁止表現があれば保存しない（運営画面の action）
 *   4. 公開の参加状況: '10未満' はそのまま。見出し・注記
 *   5. 会の新設の流れ: 希望済み → 「この病気の会を作りたい」→ 申請 → 運営が slug で承認 → public_groups から公開ページ
 *   6. JaSMIn の案内は先天代謝異常症の会だけ。導線（疾患ページ・/demo/groups → 参加の状況）
 *   7. 禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const c = {
  isOperator: jest.fn(),
  getWishSummary: jest.fn(),
  listGroupRequests: jest.fn(),
  approveGroupRequest: jest.fn(),
  rejectGroupRequest: jest.fn(),
  listTrialNoticesForOps: jest.fn(),
  setNoticeStatus: jest.fn(),
  listMyTrialNotices: jest.fn(),
  setNoticeInterest: jest.fn(),
  requestNewGroup: jest.fn(),
  fetchParticipation: jest.fn(),
  fetchPublicGroups: jest.fn(),
}
jest.mock('../_lib/contract-db', () => {
  const actual = jest.requireActual('../_lib/contract-db')
  const names = ['isOperator', 'getWishSummary', 'listGroupRequests', 'approveGroupRequest', 'rejectGroupRequest', 'listTrialNoticesForOps', 'setNoticeStatus', 'listMyTrialNotices', 'setNoticeInterest', 'requestNewGroup', 'fetchParticipation', 'fetchPublicGroups']
  const wrapped: Record<string, unknown> = {}
  for (const k of names) wrapped[k] = (...a: unknown[]) => (c as Record<string, jest.Mock>)[k](...a)
  return { ...actual, ...wrapped }
})

// 案件の保存（lib/portal/trial-notices-ops.ts）が呼ぶ DB 関数
const rpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: (...a: unknown[]) => rpc(...a), auth: { getUser: async () => ({ data: { user: { id: 'u-me' } } }) } }),
}))

// 会のホームの描画に要るもの
const t = { listGroups: jest.fn(), myGroups: jest.fn(), listPosts: jest.fn(), myJoinRequest: jest.fn() }
jest.mock('@/lib/portal/tenancy', () => {
  const actual = jest.requireActual('@/lib/portal/tenancy')
  return {
    ...actual,
    listGroups: () => t.listGroups(),
    myGroups: () => t.myGroups(),
    listPosts: (...a: unknown[]) => t.listPosts(...a),
    myJoinRequest: (...a: unknown[]) => t.myJoinRequest(...a),
  }
})
jest.mock('@/lib/portal/group-events-db', () => ({ listEvents: async () => ({ ok: true, value: [] }) }))
jest.mock('../community/[slug]/_lib/community', () => ({
  ...jest.requireActual('../community/[slug]/_lib/community'),
  getGroupSettings: async () => ({ welcomeText: null, rulesText: null }),
  listPostsWithMeta: async () => ({ ok: true, value: [] }),
}))
jest.mock('@/lib/portal/member-profile', () => ({ ...jest.requireActual('@/lib/portal/member-profile'), getMyProfile: async () => null }))
const w = { listMyWishRows: jest.fn() }
jest.mock('../wish/_lib/wishes', () => ({ ...jest.requireActual('../wish/_lib/wishes'), listMyWishRows: () => w.listMyWishRows() }))

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

import OpsHomePage from '../ops/page'
import OpsWishesPage from '../ops/wishes/page'
import OpsRequestsPage from '../ops/requests/page'
import OpsNoticesPage from '../ops/notices/page'
import { approveGroupRequestAction, saveTrialNoticeAction } from '../ops/actions'
import NoticesPage from '../community/notices/page'
import GroupHomePage from '../community/[slug]/page'
import ParticipationPage from '../participation/page'
import WishPage from '../wish/[idx]/page'
import NewGroupPage from '../wish/[idx]/new-group/page'
import { requestNewGroupAction } from '../wish/actions'
import PublicGroupPage from '../groups/[slug]/page'
import GroupsPage from '../groups/page'
import DiseasePage from '../diseases/[slug]/page'
import { wishTargetByName } from '../wish/_lib/targets'
import { JASMIN_URL } from '../community/[slug]/_lib/group-diseases'

// 機能フラグ（lib/portal/feature-flags.ts。既定 off）を開いた状態で検査する。閉じたときの検査は feature-flags-wiring.test.tsx
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


const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))
const clean = (html: string) => expect(BLOCKLIST.filter((x) => html.includes(x))).toEqual([])

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const ok = <T,>(value: T) => ({ ok: true, value })
const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const SMA = { id: '22222222-2222-4222-8222-222222222222', slug: 'sma-kazoku', name: 'テストの会S' }
const FABRY = wishTargetByName('ファブリー病')!
const POMPE = wishTargetByName('ポンペ病')!
const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}
async function page(p: Promise<unknown>) {
  return render((await p) as React.ReactElement).container
}

beforeEach(() => {
  getViewer.mockReset()
  for (const m of [...Object.values(c), ...Object.values(t), ...Object.values(w)]) m.mockReset()
  rpc.mockReset()
  c.isOperator.mockResolvedValue(false)
  c.listMyTrialNotices.mockResolvedValue(ok([]))
  c.fetchPublicGroups.mockResolvedValue([])
  c.listGroupRequests.mockResolvedValue(ok([]))
  c.listTrialNoticesForOps.mockResolvedValue(ok([]))
  t.listGroups.mockResolvedValue(ok([A, SMA]))
  t.listPosts.mockResolvedValue(ok([]))
  t.myJoinRequest.mockResolvedValue(ok(null))
  w.listMyWishRows.mockResolvedValue([])
})

// =============================================================================
describe('運営画面の権限（運営だけ。それ以外は 404）', () => {
  const OPS = [
    ['はじめ', () => OpsHomePage()],
    ['参加希望の実数', () => OpsWishesPage({})],
    ['会の新設の申請', () => OpsRequestsPage({})],
    ['案件', () => OpsNoticesPage({})],
  ] as const

  test.each(OPS)('%s: 運営なら出る', async (_n, open) => {
    getViewer.mockResolvedValue(MEMBER)
    c.isOperator.mockResolvedValue(true)
    const el = await page(open())
    expect(el.querySelector('[data-ops]')).not.toBeNull()
    clean(el.innerHTML)
  })

  test.each(OPS)('%s: B 層の会員（研究の案内に同意）・一般の会員・未ログインは 404', async (_n, open) => {
    for (const v of [MEMBER, { ...MEMBER, hasProfile: false }, null]) {
      getViewer.mockResolvedValue(v)
      c.isOperator.mockResolvedValue(false)
      await expect(open()).rejects.toThrow('notFound')
    }
    expect(c.listGroupRequests).not.toHaveBeenCalled()
    expect(c.listTrialNoticesForOps).not.toHaveBeenCalled()
    expect(c.getWishSummary).not.toHaveBeenCalled()
  })

  test('未ログインは 404、閲覧モードは見本（どちらも運営かどうかを DB に問い合わせない。2026-10-04）', async () => {
    getViewer.mockResolvedValue(null)
    await expect(OpsHomePage()).rejects.toThrow('notFound')
    getViewer.mockResolvedValue({ kind: 'demo' })
    const el = await page(OpsHomePage())
    expect(el.querySelector('[data-ops-demo]')).not.toBeNull()
    expect(c.isOperator).not.toHaveBeenCalled()
  })

  test('運営の action も、運営でなければ 404（DB を呼ばない）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    await expect(approveGroupRequestAction('r1', fd({ slug: 'new-group' }))).rejects.toThrow('notFound')
    await expect(saveTrialNoticeAction(null, fd({ disease: 'ファブリー病', summary: 'x' }))).rejects.toThrow('notFound')
    expect(c.approveGroupRequest).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  test('参加希望の実数: 病名で探して選ぶと、内訳と合計（実数）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.isOperator.mockResolvedValue(true)
    c.getWishSummary.mockResolvedValue(ok([
      { prefecture: '長野県', relation: 'self', isGroupMember: true, n: 3 },
      { prefecture: '東京都', relation: 'family', isGroupMember: null, n: 2 },
    ]))
    let el = await page(OpsWishesPage({ searchParams: { q: 'ポンペ' } }))
    expect(el.querySelector(`[data-ops-disease-results] a[href="/demo/ops/wishes?disease=${POMPE.diseaseId}"]`)).not.toBeNull()
    el = await page(OpsWishesPage({ searchParams: { disease: POMPE.diseaseId! } }))
    expect(c.getWishSummary).toHaveBeenCalledWith(POMPE.diseaseId)
    expect(el.querySelector('[data-ops-wish-total]')?.textContent).toBe('合計 5 人（実数）')
    expect(el.textContent).toContain('ご家族')
    expect(el.textContent).toContain('未回答')
  })
})

// =============================================================================
describe('案件（治験・研究の案内）', () => {
  const NOTICE = { id: 'n1', diseaseId: FABRY.diseaseId!, registry: 'jrct', registryId: 'jRCT0000000001', registryUrl: 'https://jrct.niph.go.jp/x', summary: '成人を対象とした第2相の試験です。実施地域は関東です。', publishedAt: '2026-10-01', myStatus: null }

  test('B 層の会員: DB が返した案件だけを出す。主治医の固定文・連絡はリンク先へ・登録情報へのリンク', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.listMyTrialNotices.mockResolvedValue(ok([NOTICE, { ...NOTICE, id: 'n2', registryId: 'jRCT2', myStatus: 'dismissed' }]))
    const el = await page(NoticesPage({}))
    expect(el.querySelectorAll('[data-notice]')).toHaveLength(1) // 表示しないにしたものは出さない
    expect(el.textContent).toContain('表示しないにした案内が 1 件あります。')
    expect(el.querySelector('[data-notice-doctor]')?.textContent).toBe('参加するかどうかは主治医と相談してください')
    expect(el.querySelector('[data-notice-contact]')?.textContent).toContain('登録情報のページに書かれた連絡先へ')
    expect(el.querySelector('[data-notice] a[target="_blank"]')?.getAttribute('href')).toBe('https://jrct.niph.go.jp/x')
    expect(el.querySelector('[data-notice]')!.textContent).toContain('ファブリー病')
    clean(el.innerHTML)
  })

  test('B 層以外（DB が何も返さない）には案件が見えない。運営の表の読み取りは一度も呼ばない', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.listMyTrialNotices.mockResolvedValue(ok([]))
    const el = await page(NoticesPage({}))
    expect(el.querySelector('[data-notice]')).toBeNull()
    expect(el.querySelector('[data-notice-empty]')).not.toBeNull()
    expect(c.listMyTrialNotices).toHaveBeenCalledTimes(1)
    expect(c.listTrialNoticesForOps).not.toHaveBeenCalled()
  })

  test('会員の案件の画面: 未ログインはログインへ、閲覧モードは 404、プロフィールが無ければ会員エリアのトップへ', async () => {
    getViewer.mockResolvedValue(null)
    await expect(NoticesPage({})).rejects.toThrow('redirect:/demo/login')
    getViewer.mockResolvedValue({ kind: 'demo' })
    expect((await page(NoticesPage({}))).querySelector('[data-demo-notices]')).not.toBeNull() // 見本（2026-10-04）
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    await expect(NoticesPage({})).rejects.toThrow('redirect:/demo/community')
    expect(c.listMyTrialNotices).not.toHaveBeenCalled()
  })

  test('会のホーム: その会の病気の案件があれば 1 行の案内。B 層以外（返らない）なら出ない', async () => {
    getViewer.mockResolvedValue(MEMBER)
    // 会の病気は DB（public_groups.disease_id）から引く（2026-10-04）
    c.fetchPublicGroups.mockResolvedValue([{ slug: A.slug, name: A.name, diseaseId: FABRY.diseaseId, createdAt: 'x' }])
    t.myGroups.mockResolvedValue(ok([{ ...A, role: 'member', joinedAt: 'x' }]))
    c.listMyTrialNotices.mockResolvedValue(ok([NOTICE]))
    let el = await page(GroupHomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-notices]')?.textContent).toContain('治験・研究の案内が 1 件あります。')
    expect(el.querySelector('[data-home-notices] a')?.getAttribute('href')).toBe('/demo/community/notices')
    c.listMyTrialNotices.mockResolvedValue(ok([]))
    el = await page(GroupHomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-notices]')).toBeNull()
  })

  test('運営: summary に禁止表現があれば保存しない（DB 関数を呼ばない）。無ければ保存する', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.isOperator.mockResolvedValue(true)
    const base = { disease: 'ファブリー病', registry: 'jrct', registryId: 'jRCT1', registryUrl: 'https://jrct.niph.go.jp/x' }
    await expect(saveTrialNoticeAction(null, fd({ ...base, summary: 'あなたは対象になる可能性が高いです。' }))).rejects.toThrow('redirect:/demo/ops/notices?error=blocked_words')
    expect(rpc).not.toHaveBeenCalled()
    rpc.mockResolvedValue({ data: 'n9', error: null })
    await expect(saveTrialNoticeAction(null, fd({ ...base, summary: '成人を対象とした第2相の試験です。' }))).rejects.toThrow('redirect:/demo/ops/notices?done=notice_created')
    expect(rpc).toHaveBeenCalledWith('upsert_trial_notice', expect.objectContaining({ p_disease_id: FABRY.diseaseId }))
    const el = await page(OpsNoticesPage({ searchParams: { error: 'blocked_words' } }))
    expect(el.querySelector('[role="alert"]')?.textContent).toBe('使えない表現が含まれているため、保存しませんでした')
  })
})

// =============================================================================
describe('公開の参加状況（/demo/participation）', () => {
  test("見出し・注記。'10未満' はそのまま。数のある病気を先に。疾患ページへのリンク", async () => {
    c.fetchParticipation.mockResolvedValue([
      { diseaseId: POMPE.diseaseId, members: '10未満', researchContact: '10未満', wishes: '10未満' },
      { diseaseId: FABRY.diseaseId, members: '23', researchContact: '10未満', wishes: '10未満' },
    ])
    const el = await page(ParticipationPage())
    expect(el.querySelector('h1')?.textContent).toBe('病気ごとの参加の状況')
    expect(el.querySelector('[data-participation-note]')?.textContent).toContain('10 人未満は『10未満』')
    const rows = [...el.querySelectorAll('[data-participation-row]')]
    expect(rows.map((r) => r.getAttribute('data-participation-row'))).toEqual([FABRY.diseaseId, POMPE.diseaseId])
    expect([...rows[0].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['23', '10未満', '10未満'])
    expect([...rows[1].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['10未満', '10未満', '10未満'])
    expect(rows[0].id).toBe(FABRY.diseaseId) // 疾患ページから #rd00001 で飛べる
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/demo/diseases/fabry')
    clean(el.innerHTML)
  })

  test('読めなければ「いまは表示できません」', async () => {
    c.fetchParticipation.mockResolvedValue(null)
    const el = await page(ParticipationPage())
    expect(el.textContent).toContain('いまは表示できません')
    expect(el.querySelector('[data-participation-table]')).toBeNull()
  })

  test('導線: 疾患ページ（その病気の行へ）と /demo/groups から', () => {
    const d = render(<DiseasePage params={{ slug: 'pompe' }} />).container
    expect(d.querySelector('[data-participation-link]')?.getAttribute('href')).toBe(`/demo/participation#${POMPE.diseaseId}`)
    const g = render(<GroupsPage />).container
    expect(g.querySelector('[data-participation-link] a')?.getAttribute('href')).toBe('/demo/participation')
  })
})

// =============================================================================
describe('会の新設の流れ', () => {
  test('1. 希望済みの方に「この病気の会を作りたい」', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    w.listMyWishRows.mockResolvedValue([{ diseaseIdx: POMPE.idx, diseaseId: POMPE.diseaseId, prefecture: '長野県', relation: 'self', isGroupMember: null, createdAt: null, withdrawn: false }])
    const el = await page(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(el.querySelector('[data-new-group-link]')?.getAttribute('href')).toBe(`/demo/wish/${POMPE.idx}/new-group`)
  })

  test('2. 申請のフォーム → request_new_group（病気は固定 ID）。参加希望者でなければ断られた旨', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    let el = await page(NewGroupPage({ params: { idx: String(POMPE.idx) } }))
    expect(el.querySelector('[data-new-group-form] input[name="name"]')).not.toBeNull()
    c.requestNewGroup.mockResolvedValue(ok('req-1'))
    await expect(requestNewGroupAction(POMPE.idx, fd({ name: 'ポンペ病の会', message: 'よろしくお願いします' }))).rejects.toThrow(
      `redirect:/demo/wish/${POMPE.idx}/new-group?done=requested`
    )
    expect(c.requestNewGroup).toHaveBeenCalledWith(POMPE.diseaseId, 'ポンペ病の会', 'よろしくお願いします')
    el = await page(NewGroupPage({ params: { idx: String(POMPE.idx) }, searchParams: { error: 'forbidden' } }))
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('先に参加の希望を登録してください')
  })

  test('3. 申請中なら状況を出し、フォームは出さない', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    c.listGroupRequests.mockResolvedValue(ok([{ id: 'req-1', diseaseId: POMPE.diseaseId, proposedName: 'ポンペ病の会', message: '', status: 'pending', createdAt: '2026-10-03', decidedAt: null }]))
    const el = await page(NewGroupPage({ params: { idx: String(POMPE.idx) } }))
    expect(el.querySelector('[data-new-group-status]')?.textContent).toContain('「ポンペ病の会」：運営が確かめています')
    expect(el.querySelector('[data-new-group-form]')).toBeNull()
  })

  test('4. 運営が slug を入れて承認（形の違う slug は送らない）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.isOperator.mockResolvedValue(true)
    c.listGroupRequests.mockResolvedValue(ok([{ id: 'req-1', diseaseId: POMPE.diseaseId, proposedName: 'ポンペ病の会', message: 'よろしく', status: 'pending', createdAt: '2026-10-03', decidedAt: null }]))
    const el = await page(OpsRequestsPage({}))
    expect(el.querySelector('[data-ops-request]')!.textContent).toContain('ポンペ病')
    expect(el.querySelector('[data-ops-request] input[name="slug"]')).not.toBeNull()
    c.approveGroupRequest.mockImplementation(async (_id: string, slug: string) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? ok('g-new') : { ok: false, reason: 'invalid_input' }))
    await expect(approveGroupRequestAction('req-1', fd({ slug: 'pompe-kai' }))).rejects.toThrow('redirect:/demo/ops/requests?done=approved')
    expect(c.approveGroupRequest).toHaveBeenLastCalledWith('req-1', 'pompe-kai')
    await expect(approveGroupRequestAction('req-1', fd({ slug: 'ポンペ' }))).rejects.toThrow('?error=invalid_input')
  })

  test('5. 承認後: data に無い会でも public_groups から公開ページが開く。希望の画面はその会へ案内する', async () => {
    c.fetchPublicGroups.mockResolvedValue([{ slug: 'pompe-kai', name: 'ポンペ病の会', diseaseId: POMPE.diseaseId, createdAt: '2026-10-03' }])
    const el = await page(PublicGroupPage({ params: { slug: 'pompe-kai' } }))
    expect(el.querySelector('[data-new-public-group] h1')?.textContent).toBe('ポンペ病の会')
    expect(el.querySelector('a[href="/demo/diseases/pompe"]')).not.toBeNull()
    expect(el.querySelector('[data-member-area] a')?.getAttribute('href')).toBe('/demo/community/pompe-kai')
    await expect(PublicGroupPage({ params: { slug: 'no-such-group' } })).rejects.toThrow('notFound')
    await expect(PublicGroupPage({ params: { slug: 'ポンペ' } })).rejects.toThrow('notFound')

    getViewer.mockResolvedValue(null)
    const wish = await page(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(wish.querySelector('[data-wish-participating] a[href="/demo/groups/pompe-kai"]')).not.toBeNull()
    expect(wish.querySelector('form')).toBeNull()
  })
})

// =============================================================================
describe('JaSMIn の案内（先天代謝異常症の会だけ）', () => {
  test('ファブリー病の会には出て、脊髄性筋萎縮症の会には出ない（判定は DB の会の病気〔固定 ID〕で）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.fetchPublicGroups.mockResolvedValue([
      { slug: A.slug, name: A.name, diseaseId: 'rd00001', createdAt: 'x' },
      { slug: SMA.slug, name: SMA.name, diseaseId: 'rd00015', createdAt: 'x' },
    ])
    t.myGroups.mockResolvedValue(ok([{ ...A, role: 'member', joinedAt: 'x' }, { ...SMA, role: 'member', joinedAt: 'x' }]))
    let el = await page(GroupHomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-jasmin] a')?.getAttribute('href')).toBe('https://www.jasmin-mcbank.com/')
    expect(JASMIN_URL).toBe('https://www.jasmin-mcbank.com/')
    clean(el.innerHTML)
    el = await page(GroupHomePage({ params: { slug: SMA.slug } }))
    expect(el.querySelector('[data-home-jasmin]')).toBeNull()
  })
})
