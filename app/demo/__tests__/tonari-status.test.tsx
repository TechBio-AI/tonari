/**
 * 患者会の tonari_status（"joined" | "not_joined"。data/patient_groups/patient_groups.json。2026-10-04）
 *
 *   1. データ: 7 団体すべてに tonari_status があり、いまは 7 団体とも "joined"。_readme に欄の意味が 1 行
 *   2. 読み方: "joined" 以外（欄が無い・ほかの値）は not_joined（参加していると言わない側）
 *   3. 画面（JSON を差し替え、日本ゴーシェ病の会だけを "not_joined" にして確かめる。DB には接続しない）
 *      - 参加希望: 希望の画面を出し、冒頭に「患者会「○○」があります（となり未参加）。参加を待っている方：n 人」
 *        "joined" の会の病気は今までどおりその会へ案内する
 *      - 会の新設: 既存の会の注意を出し、理由が必須
 *      - /demo/groups: 「参加している患者会」に並べず、「となりへの参加を待っている患者会」に病名と団体名（となり未参加）
 *      - 会のページ: 会員エリアの節の代わりに「まだ参加していません」と希望の入口。公開のお知らせ・行事は読まない
 *      - 疾患ページの「患者会」欄: 「患者会「○○」があります（となり未参加）」と公式サイト、その下に希望の入口と人数
 */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { act, render } from '@testing-library/react'

// 日本ゴーシェ病の会だけを "not_joined" にした JSON（targets.ts は import で、lib/portal/patient-groups.ts は fs で読むので両方差し替える）
jest.mock('@/data/patient_groups/patient_groups.json', () => {
  const actual = jest.requireActual('@/data/patient_groups/patient_groups.json')
  return {
    ...actual,
    groups: actual.groups.map((g: { id: string }) => (g.id === 'gaucher-japan' ? { ...g, tonari_status: 'not_joined' } : g)),
  }
})
jest.mock('@/lib/portal/patient-groups', () => {
  const actual = jest.requireActual('@/lib/portal/patient-groups')
  const all = actual.getPatientGroups().map((g: { id: string }) => (g.id === 'gaucher-japan' ? { ...g, tonariStatus: 'not_joined' } : g))
  return {
    ...actual,
    getPatientGroups: () => all,
    getJoinedPatientGroups: () => all.filter((g: { tonariStatus: string }) => g.tonariStatus === 'joined'),
    getNotJoinedPatientGroups: () => all.filter((g: { tonariStatus: string }) => g.tonariStatus === 'not_joined'),
    patientGroupsFor: (n: string) => all.filter((g: { diseases: string[] }) => g.diseases.includes(n)),
  }
})

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))
const listMyWishRows = jest.fn()
jest.mock('../wish/_lib/wishes', () => ({ ...jest.requireActual('../wish/_lib/wishes'), listMyWishRows: () => listMyWishRows() }))
jest.mock('@/lib/portal/member-profile', () => ({ ...jest.requireActual('@/lib/portal/member-profile'), getMyProfile: async () => null }))
const c = { fetchPublicGroups: jest.fn(), listGroupRequests: jest.fn() }
jest.mock('../_lib/contract-db', () => ({
  ...jest.requireActual('../_lib/contract-db'),
  fetchPublicGroups: () => c.fetchPublicGroups(),
  listGroupRequests: () => c.listGroupRequests(),
}))
const listPublicActivity = jest.fn()
jest.mock('../groups/_lib/public-activity', () => ({ listPublicActivity: (...a: unknown[]) => listPublicActivity(...a) }))
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
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}))

import { loadPatientGroups, tonariStatusOf } from '@/lib/portal/patient-groups'
import WishPage from '../wish/[idx]/page'
import NewGroupPage from '../wish/[idx]/new-group/page'
import GroupsPage from '../groups/page'
import PatientGroupPage from '../groups/[slug]/page'
import DiseasePage from '../diseases/[slug]/page'
import { isWishable, notJoinedGroupsOf, participatingGroupsOf, wishTargetByName } from '../wish/_lib/targets'
import { resetWishCountsForTest } from '../wish/_components/WishWaiting'

const SAVED = process.env.WISHES
beforeAll(() => {
  process.env.WISHES = 'on'
})
afterAll(() => {
  if (SAVED === undefined) delete process.env.WISHES
  else process.env.WISHES = SAVED
})

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const GAUCHER = wishTargetByName('ゴーシェ病')!
const FABRY = wishTargetByName('ファブリー病')!
const GAUCHER_GROUP = '日本ゴーシェ病の会'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

/** サーバーの画面を描き、開いたあとの人数の読み込み（WishWaiting）まで待つ */
async function show(p: Promise<JSX.Element> | JSX.Element): Promise<HTMLElement> {
  const el = await p
  let c!: HTMLElement
  await act(async () => {
    c = render(el).container
  })
  return c
}

beforeEach(() => {
  getViewer.mockReset().mockResolvedValue(MEMBER)
  listMyWishRows.mockReset().mockResolvedValue([])
  c.fetchPublicGroups.mockReset().mockResolvedValue([])
  c.listGroupRequests.mockReset().mockResolvedValue({ ok: true, value: [] })
  listPublicActivity.mockReset().mockResolvedValue({ notices: [], events: [] })
  resetWishCountsForTest()
  ;(global.fetch as jest.Mock).mockReset().mockImplementation(async (u: string) =>
    u === '/demo/wish/counts' ? { ok: true, json: async () => ({ counts: { [String(GAUCHER.idx)]: '12' } }) } : { ok: false }
  )
})

describe('データと読み方', () => {
  const real = jest.requireActual('@/data/patient_groups/patient_groups.json') as { _readme: string[]; groups: Record<string, unknown>[] }

  test('7 団体すべてに tonari_status があり、いまは 7 団体とも "joined"。_readme に欄の意味が 1 行', () => {
    expect(real.groups).toHaveLength(7)
    for (const g of real.groups) expect(g.tonari_status).toBe('joined')
    expect(real._readme.filter((l) => l.includes('tonari_status'))).toHaveLength(1)
  })

  test('"joined" 以外（欄が無い・ほかの値）は not_joined', () => {
    expect(tonariStatusOf('joined')).toBe('joined')
    for (const v of ['not_joined', undefined, null, '', 'JOINED', true]) expect(tonariStatusOf(v)).toBe('not_joined')
  })

  test('loadPatientGroups は tonari_status を tonariStatus に直す（欄が無ければ not_joined）', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-'))
    fs.mkdirSync(path.join(dir, 'data', 'patient_groups'), { recursive: true })
    const base = { url: null, diseases: ['x'], description: '準備中' }
    fs.writeFileSync(
      path.join(dir, 'data', 'patient_groups', 'patient_groups.json'),
      JSON.stringify({ groups: [{ ...base, id: 'a', name: 'A', tonari_status: 'joined' }, { ...base, id: 'b', name: 'B', tonari_status: 'not_joined' }, { ...base, id: 'c', name: 'C' }] })
    )
    expect(loadPatientGroups(dir).map((g) => [g.id, g.tonariStatus])).toEqual([['a', 'joined'], ['b', 'not_joined'], ['c', 'not_joined']])
    expect(loadPatientGroups(dir)[0]).not.toHaveProperty('tonari_status')
  })
})

describe('"not_joined" の団体がある病気（JSON を差し替えて確かめる）', () => {
  test('判定: 参加している会には数えず、未参加の団体として返す。希望できる', () => {
    expect(participatingGroupsOf('ゴーシェ病')).toEqual([])
    expect(notJoinedGroupsOf('ゴーシェ病').map((g) => g.name)).toEqual([GAUCHER_GROUP])
    expect(isWishable(GAUCHER)).toBe(true)
    expect(participatingGroupsOf('ファブリー病')).toHaveLength(1) // "joined" は今までどおり
    expect(isWishable(FABRY)).toBe(false)
  })

  test('参加希望の画面: 希望のフォームと、「患者会「○○」があります（となり未参加）。参加を待っている方：n 人」', async () => {
    const el = await show(WishPage({ params: { idx: String(GAUCHER.idx) } }))
    expect(el.querySelector('[data-wish-participating]')).toBeNull()
    expect(el.querySelector('[data-wish-form]')).not.toBeNull()
    const box = el.querySelector('[data-not-joined-groups]')!
    expect(box.textContent).toBe(`患者会「${GAUCHER_GROUP}」があります（となり未参加）。参加を待っている方：12 人`)
    expect(box.querySelector('a')?.getAttribute('href')).toBe('/demo/groups/gaucher-japan')
    expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])
  })

  test('参加希望の画面: 人数が読めなければ、団体の案内だけ出す', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const el = await show(WishPage({ params: { idx: String(GAUCHER.idx) } }))
    expect(el.querySelector('[data-not-joined-groups]')?.textContent).toBe(`患者会「${GAUCHER_GROUP}」があります（となり未参加）。`)
  })

  test('参加希望の画面: "joined" の会の病気は今までどおり、その会へ案内する', async () => {
    const el = await show(WishPage({ params: { idx: String(FABRY.idx) } }))
    expect(el.querySelector('[data-wish-participating]')).not.toBeNull()
    expect(el.querySelector('[data-not-joined-groups]')).toBeNull()
  })

  test('会の新設: 既存の会の注意を出し、理由が必須', async () => {
    const el = await show(NewGroupPage({ params: { idx: String(GAUCHER.idx) } }))
    expect(el.querySelector('[data-existing-groups]')?.textContent).toContain(`この病気には患者会「${GAUCHER_GROUP}」があります。`)
    expect((el.querySelector('textarea[name="message"]') as HTMLTextAreaElement).required).toBe(true)
  })

  test('/demo/groups: 参加している患者会は "joined" の 6 団体。ゴーシェ病は「待っている」に団体名（となり未参加）つきで並ぶ', async () => {
    const el = await show(GroupsPage())
    expect(el.textContent).toContain('6 団体')
    expect(el.querySelector('ul.grid a[href="/demo/groups/gaucher-japan"]')).toBeNull()
    expect(el.querySelector('ul.grid a[href="/demo/groups/fabry-fukurou"]')).not.toBeNull()
    const waiting = el.querySelector('[data-not-yet]')!
    const row = [...waiting.querySelectorAll('li')].find((li) => li.querySelector('a[href="/demo/diseases/gaucher"]'))!
    expect(row).toBeDefined()
    expect(row.querySelector('[data-not-joined-group]')?.textContent).toBe(`患者会「${GAUCHER_GROUP}」があります（となり未参加）`)
    expect(row.querySelector('[data-wish-link]')?.getAttribute('href')).toBe(`/demo/wish/${GAUCHER.idx}`)
    expect(waiting.querySelector('a[href="/demo/diseases/fabry"]')).toBeNull()
    expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])
  })

  test('会のページ: 会員エリアの節の代わりに「まだ参加していません」と希望の入口。公開のお知らせ・行事は読まない', async () => {
    const el = await show(PatientGroupPage({ params: { slug: 'gaucher-japan' } }))
    expect(el.querySelector('h1')?.textContent).toBe(GAUCHER_GROUP)
    expect(el.querySelector('[data-member-area]')).toBeNull()
    const sec = el.querySelector('[data-not-joined]')!
    expect(sec.textContent).toContain('この会は、まだ「となり」に参加していません。')
    expect(sec.querySelector('[data-wish-link]')?.getAttribute('href')).toBe(`/demo/wish/${GAUCHER.idx}`)
    expect(sec.querySelector('[data-wish-waiting]')?.textContent).toBe('参加を待っている方：12 人')
    expect(listPublicActivity).not.toHaveBeenCalled()
  })

  test('会のページ: "joined" の会は今までどおり会員エリアの節', async () => {
    const el = await show(PatientGroupPage({ params: { slug: 'fabry-fukurou' } }))
    expect(el.querySelector('[data-member-area]')).not.toBeNull()
    expect(el.querySelector('[data-not-joined]')).toBeNull()
    expect(listPublicActivity).toHaveBeenCalledWith('fabry-fukurou')
  })

  test('疾患ページの「患者会」欄: 未参加の団体と公式サイト、その下に希望の入口と人数。"joined" の病気は会へのリンクだけ', async () => {
    const el = await show(DiseasePage({ params: { slug: 'gaucher' } }))
    const sec = [...el.querySelectorAll('section')].find((x) => x.querySelector('h2')?.textContent === '患者会')!
    expect(sec.querySelector('[data-not-joined-group]')?.textContent).toContain(`患者会「${GAUCHER_GROUP}」があります（となり未参加）`)
    expect(sec.querySelector('[data-official-link]')?.getAttribute('href')).toBe('https://gaucherjapan.com')
    expect(sec.querySelector('a[href="/demo/groups/gaucher-japan"]')).toBeNull() // 参加している会としては並べない
    expect(sec.querySelector('[data-wish-link]')?.getAttribute('href')).toBe(`/demo/wish/${GAUCHER.idx}`)
    expect(sec.querySelector('[data-wish-waiting]')?.textContent).toBe('参加を待っている方：12 人')
    expect(sec.querySelector('[data-no-group-yet]')).toBeNull()
    expect(BLOCKLIST.filter((x) => el.innerHTML.includes(x))).toEqual([])

    const fabry = await show(DiseasePage({ params: { slug: 'fabry' } }))
    const fsec = [...fabry.querySelectorAll('section')].find((x) => x.querySelector('h2')?.textContent === '患者会')!
    expect(fsec.querySelector('a[href="/demo/groups/fabry-fukurou"]')).not.toBeNull()
    expect(fsec.querySelector('[data-not-joined-group], [data-wish-link]')).toBeNull()
  })
})
