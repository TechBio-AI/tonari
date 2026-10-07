/**
 * となりへの参加の希望（/demo/groups の「となりへの参加を待っている患者会」・/demo/wish/[idx]・/demo/wish・マイページ）の検査
 *
 * DB には接続しない（session.ts・Supabase のクライアント・参加希望の読み書きを差し替える）。
 *   1. 対象の病気の定数が知識ファイルと一致する（実行時に知識ファイルを読まないための定数）
 *   1b. 対象は公開層の疾患一覧すべて（data/disease_index.json）。一覧に無い idx は 404。患者会が参加済みの病気は、その会へ案内
 *   2. /demo/groups: 「となりへの参加を待っている患者会」、各病気に「となりへの参加を希望する」と「希望している方」（'10未満' はそのまま）。
 *      その下の「ほかの病気の患者会を希望する」（病名検索の部品）
 *      以前の言い方（OLD_WORD）と「リクエスト」の語が画面に無い
 *   3. /demo/wish/[idx]: 未ログインはメール欄（shouldCreateUser: true・戻り先の cookie）、ログイン済みは入力、登録済みは「希望済み」と取り消し、
 *      閲覧モードは見本だけ
 *   4. action: 二重登録の文、取り消し、閲覧モード・未ログインでは書かない
 *   5. 同意の文は仮の文（同意担当の文ができたら、このテストが差し替え忘れを知らせる）
 *   6. プロフィールの無い方: 会員エリアのトップは招待制の案内。onboarding は招待・入会申請の経路からだけ
 *   7. マイページと /demo/wish に、となりへの参加を希望した患者会の一覧と取り消し
 */
import * as fs from 'fs'
import * as path from 'path'
import { act, fireEvent, render, screen } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const w = { listMyWishes: jest.fn(), listMyWishRows: jest.fn(), createWish: jest.fn(), resumeWish: jest.fn(), withdrawWish: jest.fn() }
jest.mock('../wish/_lib/wishes', () => {
  const actual = jest.requireActual('../wish/_lib/wishes')
  return {
    ...actual,
    listMyWishes: (...a: unknown[]) => w.listMyWishes(...a),
    listMyWishRows: (...a: unknown[]) => w.listMyWishRows(...a),
    createWish: (...a: unknown[]) => w.createWish(...a),
    resumeWish: (...a: unknown[]) => w.resumeWish(...a),
    withdrawWish: (...a: unknown[]) => w.withdrawWish(...a),
  }
})

const signInWithOtp = jest.fn()
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOtp: (a: unknown) => signInWithOtp(a) } }) }))

let profile: Record<string, unknown> | null = null
jest.mock('@/lib/portal/member-profile', () => ({
  ...jest.requireActual('@/lib/portal/member-profile'),
  getMyProfile: async () => profile,
}))
jest.mock('@/lib/portal/research-contact', () => ({
  ...jest.requireActual('@/lib/portal/research-contact'),
  getMyResearchContact: async () => ({ state: 'none', consentedAt: null, diseases: [] }),
  getMyGroupDiseaseIdxs: async () => [],
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo/groups',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import { CONSENT_KINDS, consentLabelOf, currentConsentText } from '@/lib/portal/consent-texts'
import { DEMO_DISEASES } from '@/lib/portal/diseases'
import { knowledgeFilePositionOf } from '@/lib/portal/disease-overviews'
import { getPatientGroups } from '@/lib/portal/patient-groups'

import GroupsPage from '../groups/page'
import WishPage from '../wish/[idx]/page'
import WishStatusPage from '../wish/page'
import { createWishAction, resumeWishAction, withdrawWishAction } from '../wish/actions'
import { WISH_NEXT_COOKIE, participatingGroupsOf, wishNextPath, wishTargetByName, wishTargetOf } from '../wish/_lib/targets'
import indexJson from '@/data/disease_index.json'
import { WISH_CONSENT_IS_PLACEHOLDER, WISH_CONSENT_PLACEHOLDER, WISH_CONSENT_TEXT, toWishCounts, validateWishInput } from '../wish/_lib/wishes'
import { formatWaiting } from '../wish/_lib/format'
import { resetWishCountsForTest } from '../wish/_components/WishWaiting'
import DemoCommunityPage from '../community/page'
import OnboardingPage from '../community/onboarding/page'
import MemberProfilePage from '../community/profile/page'

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
/** 以前の言い方（このファイル自身が grep に掛からないよう、2 文字に分けて組み立てる） */
const OLD_WORD = ['入', '居'].join('')
const clean = (html: string) => {
  expect(BLOCKLIST.filter((x) => html.includes(x))).toEqual([])
  expect(html).not.toContain(OLD_WORD)
  expect(html).not.toContain('リクエスト')
}

const MEMBER_NO_PROFILE = { kind: 'member', email: 'a@example.com', hasProfile: false, needsConsent: false }
const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const INDEX = (indexJson as { diseases: { idx: number; name: string; slug: string }[] }).diseases
const POMPE = wishTargetByName('ポンペ病')!
const MPS2 = wishTargetByName('ムコ多糖症II型')! // くわしい説明の無い病気（11 疾患の外）
const FABRY = wishTargetByName('ファブリー病')! // 患者会が参加している病気
const UNCOVERED = (() => {
  const covered = new Set(getPatientGroups().flatMap((g) => g.diseases))
  return DEMO_DISEASES.filter((d) => !covered.has(d.name))
})()
const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}
async function renderPage(p: Promise<unknown>) {
  return render((await p) as React.ReactElement).container
}

beforeEach(() => {
  getViewer.mockReset()
  for (const m of Object.values(w)) m.mockReset()
  signInWithOtp.mockReset()
  profile = null
  w.listMyWishes.mockResolvedValue([])
  w.listMyWishRows.mockResolvedValue([])
  window.history.replaceState(null, '', '/demo/groups')
  ;(global.fetch as jest.Mock).mockReset()
  resetWishCountsForTest()
  document.cookie = `${WISH_NEXT_COOKIE}=; Path=/demo; Max-Age=0`
})

// =============================================================================
describe('対象の病気（公開層の疾患一覧すべて）', () => {
  test('番号表のどの idx も通り、11 疾患も含む（番号表と知識ファイルの一致は disease-index.test.ts）', () => {
    expect(INDEX.length).toBeGreaterThan(900)
    for (const d of INDEX) expect(wishTargetOf(String(d.idx))).toMatchObject(d)
    // 固定 ID（共通契約 A）も引ける
    expect(wishTargetOf('0')?.diseaseId).toBe('rd00001')
    for (const d of DEMO_DISEASES) expect(wishTargetByName(d.name)?.idx).toBe(knowledgeFilePositionOf(d.name))
  })

  test('患者会が参加している病気は data/patient_groups から引く', () => {
    expect(participatingGroupsOf('ファブリー病').map((g) => g.id)).toEqual(['fabry-fukurou'])
    expect(participatingGroupsOf('ポンペ病')).toEqual([])
  })

  test('一覧に無い idx・形の違う値は null。戻り先は一覧にある idx だけ', () => {
    expect(wishTargetOf('4')?.name).toBe('ポンペ病')
    expect(wishTargetOf('2')?.name).toBe('ムコ多糖症II型')
    expect(wishTargetOf('999999')).toBeNull()
    expect(wishTargetOf('4abc')).toBeNull()
    expect(wishNextPath('4')).toBe('/demo/wish/4')
    expect(wishNextPath('https://evil.example')).toBeNull()
    expect(wishNextPath(undefined)).toBeNull()
  })
})

// =============================================================================
describe('/demo/groups「となりへの参加を待っている患者会」', () => {
  test('見出し・説明と、各病気の「となりへの参加を希望する」。以前の言い方と「リクエスト」が画面に無い', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const { container } = render(<GroupsPage />)
    const sec = container.querySelector('[data-not-yet]')!
    expect(sec.querySelector('h2')?.textContent).toBe('となりへの参加を待っている患者会')
    expect(sec.querySelector('p')?.textContent).toBe(
      '次の病気の患者会は、まだ「となり」に参加していません。「この病気の患者会に、となりへ参加してほしい」という希望を登録できます。希望する方の人数は、運営が患者会にお伝えします（お一人お一人の情報は伝えません）。'
    )
    const links = [...sec.querySelectorAll('a[data-wish-link]')]
    expect(links.map((a) => a.getAttribute('href')).sort()).toEqual(
      UNCOVERED.map((d) => `/demo/wish/${knowledgeFilePositionOf(d.name)}`).sort()
    )
    expect(links.every((a) => a.textContent === 'となりへの参加を希望する')).toBe(true)
    expect(container.textContent).toContain('参加している患者会')
    clean(container.innerHTML)
  })

  test('その下に「ほかの病気の患者会を希望する」。病名で選ぶと希望の画面へ。参加済みの病気は出ない', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const { container } = render(<GroupsPage />)
    const other = container.querySelector('[data-wish-other]')!
    expect(other.querySelector('h2')?.textContent).toBe('ほかの病気の患者会を希望する')
    // 「4 件」の節より下
    expect(container.querySelector('[data-not-yet]')!.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const input = other.querySelector('input[type="search"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ムコ多糖' } })
    const hrefs = [...other.querySelectorAll('li a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(`/demo/wish/${MPS2.idx}`)
    expect(hrefs).not.toContain(`/demo/wish/${wishTargetByName('ムコ多糖症I型')!.idx}`) // 患者会が参加している
    expect(other.querySelector('[data-readiness]')).toBeNull() // 充実度の印は出さない
    fireEvent.change(input, { target: { value: 'ファブリー' } })
    expect([...other.querySelectorAll('li a')].map((a) => a.getAttribute('href'))).not.toContain(`/demo/wish/${FABRY.idx}`)
  })

  test("「希望している方」: '10未満' はそのまま、数は「n 人」。読めなければ出さない", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ counts: { [String(POMPE.idx)]: '10未満', '21': '12' } }) })
    let container!: HTMLElement
    await act(async () => {
      container = render(<GroupsPage />).container
    })
    const items = [...container.querySelectorAll('[data-not-yet] li')]
    const of = (name: string) => items.find((li) => li.textContent?.includes(name))!.querySelector('[data-wish-waiting]')?.textContent
    expect(of('ポンペ病')).toBe('希望している方：10未満')
    expect(of('X連鎖性低リン血症性くる病')).toBe('希望している方：12 人')
    expect(of('遺伝性ATTR型アミロイドーシス')).toBe('希望している方：10未満') // 行が無い（一度も希望が無い）病気も「10未満」
    // 人数の読み込みは 1 回を共有する（一覧の画面は、DB にだけある会の一覧も別に読む）
    expect((global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/demo/wish/counts')).toHaveLength(1)
  })

  test('人数を読めなかったときは、どの病気にも出さない（「10未満」と言い切らない）', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    let container!: HTMLElement
    await act(async () => {
      container = render(<GroupsPage />).container
    })
    expect(container.querySelector('[data-wish-waiting]')).toBeNull()
  })

  test('人数の行を文字のまま受け取る（数に直さない）', () => {
    // public_disease_participation の disease_id・wishes → 画面の番号（idx）ごと
    const m = toWishCounts([{ disease_id: 'rd00005', wishes: '10未満' }, { disease_id: 'rd00022', wishes: 12 }, { disease_id: 'rd99999', wishes: '1' }, null])
    expect([...m]).toEqual([
      [4, '10未満'],
      [21, '12'],
    ])
    expect(formatWaiting('10未満')).toBe('希望している方：10未満')
    expect(formatWaiting('12')).toBe('希望している方：12 人')
  })
})

// =============================================================================
describe('/demo/wish/[idx]', () => {
  test('一覧に無い idx は 404', async () => {
    await expect(WishPage({ params: { idx: '999999' } })).rejects.toThrow('notFound')
    await expect(WishPage({ params: { idx: 'abc' } })).rejects.toThrow('notFound')
  })

  test('11 疾患の外の病気（任意の idx）でも入力できる', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    const c = await renderPage(WishPage({ params: { idx: String(MPS2.idx) } }))
    expect(c.querySelector('h1')?.textContent).toBe('「ムコ多糖症II型」の患者会の、となりへの参加を希望する')
    expect(c.querySelector('[data-wish-form] button[type="submit"]')?.textContent).toBe('となりへの参加を希望する')
    clean(c.innerHTML)
  })

  test('患者会が参加している病気は、希望の画面を出さずに、その会のページへ案内する（DB を読まない）', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    const c = await renderPage(WishPage({ params: { idx: String(FABRY.idx) } }))
    expect(c.querySelector('[data-wish-participating]')).not.toBeNull()
    expect(c.querySelector('form')).toBeNull()
    expect(c.querySelector('a[href="/demo/groups/fabry-fukurou"]')).not.toBeNull()
    expect(c.querySelector('h1')?.textContent).toBe('「ファブリー病」の患者会は、「となり」に参加しています')
    expect(w.listMyWishRows).not.toHaveBeenCalled() // 閲覧モードの見本を分けるため getViewer は先に呼ぶ（2026-10-04）
  })

  test('説明の文言', async () => {
    getViewer.mockResolvedValue(null)
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(c.textContent).toContain('「ポンペ病」の患者会は、まだ「となり」に参加していません。')
    expect(c.textContent).toContain('「この病気の患者会に、となりへ参加してほしい」という希望を登録できます。')
    expect(c.textContent).toContain('お一人お一人の情報は伝えません')
  })

  test('未ログイン: メール欄。送ると shouldCreateUser: true で、戻り先の cookie を置く', async () => {
    getViewer.mockResolvedValue(null)
    signInWithOtp.mockResolvedValue({ error: null })
    window.history.replaceState(null, '', `/demo/wish/${POMPE.idx}`) // cookie（Path=/demo）を読めるところに居る
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(c.querySelector('[data-wish-form]')).toBeNull()
    expect(c.querySelector('[data-wish-email]')).not.toBeNull()
    expect(c.textContent).toContain('会員エリアは招待制です')
    expect(w.listMyWishes).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'x@example.com' } })
    await act(async () => {
      fireEvent.submit(c.querySelector('[data-wish-email]')!)
    })
    expect(signInWithOtp).toHaveBeenCalledTimes(1)
    const arg = signInWithOtp.mock.calls[0][0]
    expect(arg.email).toBe('x@example.com')
    expect(arg.options.shouldCreateUser).toBe(true)
    expect(arg.options.emailRedirectTo).toMatch(/\/demo\/auth\/callback$/)
    expect(document.cookie).toContain(`${WISH_NEXT_COOKIE}=${POMPE.idx}`)
    expect(c.querySelector('[data-wish-sent]')).not.toBeNull()
    clean(c.innerHTML)
  })

  test('ログイン済み（プロフィール無しでも）: 入力のフォーム。都道府県・立場・会員か（任意）・同意', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    const form = c.querySelector('[data-wish-form]')!
    expect(form).not.toBeNull()
    expect((form.querySelector('select[name="prefecture"]') as HTMLSelectElement).required).toBe(true)
    expect([...form.querySelectorAll('input[name="relation"]')].map((i) => (i as HTMLInputElement).value)).toEqual(['self', 'family'])
    const member = [...form.querySelectorAll('input[name="isGroupMember"]')] as HTMLInputElement[]
    expect(member.map((i) => i.value)).toEqual(['yes', 'no', ''])
    expect(member.every((i) => !i.required)).toBe(true) // 任意
    expect((form.querySelector('[data-wish-consent]') as HTMLInputElement).required).toBe(true)
    expect(form.querySelector('[data-wish-consent-text]')?.textContent).toBe(currentConsentText('wish').text)
    expect(form.querySelector('[data-wish-consent]')!.closest('label')!.textContent).toBe(consentLabelOf(currentConsentText('wish')))
    clean(c.innerHTML)
  })

  test('プロフィールがあれば都道府県を最初から選んでおく', async () => {
    getViewer.mockResolvedValue(MEMBER)
    profile = { prefecture: '長野県' }
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect((c.querySelector('select[name="prefecture"]') as HTMLSelectElement).value).toBe('長野県')
  })

  test('登録済み: 「希望済み」と取り消しのボタン（フォームは出さない）', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.listMyWishRows.mockResolvedValue([{ diseaseIdx: POMPE.idx, prefecture: '長野県', relation: 'self', isGroupMember: null, createdAt: null, withdrawn: false }])
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(c.querySelector('[data-wish-form]')).toBeNull()
    expect(c.querySelector('[data-wish-done]')!.textContent).toContain('この病気の患者会の、となりへの参加を希望済みです。')
    expect(c.querySelector('[data-wish-withdraw] form button')?.textContent).toBe('取り消す')
  })

  test('取り消した後: 前の答えを見せて「もう一度希望する」（答えは変えられない。同意は改めて）', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.listMyWishRows.mockResolvedValue([{ diseaseIdx: POMPE.idx, prefecture: '長野県', relation: 'family', isGroupMember: null, createdAt: null, withdrawn: true }])
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(c.querySelector('[data-wish-form]')).toBeNull()
    const resume = c.querySelector('[data-wish-resume]')!
    expect(resume.textContent).toContain('長野県・ご家族')
    expect(resume.textContent).toContain('答えは変えられません')
    expect((resume.querySelector('[data-wish-consent]') as HTMLInputElement).required).toBe(true)
    expect(resume.querySelector('button')?.textContent).toBe('もう一度希望する')
  })

  test('二重登録の表示: ?error=already_wished', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) }, searchParams: { error: 'already_wished' } }))
    expect(c.querySelector('[role="alert"]')?.textContent).toBe('この病気の患者会には、すでにとなりへの参加を希望しています')
  })

  test('閲覧モード: 見本の説明だけ。フォーム・メール欄を出さず、DB を読まない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const c = await renderPage(WishPage({ params: { idx: String(POMPE.idx) } }))
    expect(c.querySelector('[data-wish-demo]')).not.toBeNull()
    expect(c.querySelector('form')).toBeNull()
    expect(w.listMyWishes).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('action', () => {
  test('登録: 入力を渡す。会員か（任意）は はい→true／いいえ→false／答えない→null', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.createWish.mockResolvedValue({ ok: true, value: null })
    await expect(createWishAction(POMPE.idx, fd({ prefecture: '長野県', relation: 'family', isGroupMember: 'yes', consent: 'yes' }))).rejects.toThrow(
      `redirect:/demo/wish/${POMPE.idx}?done=wished`
    )
    expect(w.createWish).toHaveBeenLastCalledWith({ diseaseIdx: POMPE.idx, prefecture: '長野県', relation: 'family', isGroupMember: true, consent: true })
    await expect(createWishAction(POMPE.idx, fd({ prefecture: '長野県', relation: 'self', isGroupMember: '', consent: 'yes' }))).rejects.toThrow('?done=wished')
    expect(w.createWish.mock.calls[1][0].isGroupMember).toBeNull()
  })

  test('二重登録は ?error=already_wished で戻る', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.createWish.mockResolvedValue({ ok: false, reason: 'already_wished' })
    await expect(createWishAction(POMPE.idx, fd({ prefecture: '長野県', relation: 'self', consent: 'yes' }))).rejects.toThrow(
      `redirect:/demo/wish/${POMPE.idx}?error=already_wished`
    )
  })

  test('再開: 同意のチェックを渡す', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.resumeWish.mockResolvedValue({ ok: true, value: null })
    await expect(resumeWishAction(POMPE.idx, fd({ consent: 'yes' }))).rejects.toThrow(`redirect:/demo/wish/${POMPE.idx}?done=wished`)
    expect(w.resumeWish).toHaveBeenLastCalledWith(POMPE.idx, true)
  })

  test('取り消し: 戻り先ごとに ?done=withdrawn', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.withdrawWish.mockResolvedValue({ ok: true, value: null })
    await expect(withdrawWishAction(POMPE.idx, 'wish')).rejects.toThrow(`redirect:/demo/wish/${POMPE.idx}?done=withdrawn`)
    await expect(withdrawWishAction(POMPE.idx, 'list')).rejects.toThrow('redirect:/demo/wish?done=withdrawn')
    await expect(withdrawWishAction(POMPE.idx, 'profile')).rejects.toThrow('redirect:/demo/community/profile?done=withdrawn')
    expect(w.withdrawWish).toHaveBeenCalledWith(POMPE.idx)
  })

  test('閲覧モード・未ログインでは書かない。対象外の idx は患者会の一覧へ', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(createWishAction(POMPE.idx, fd({ consent: 'yes' }))).rejects.toThrow(`redirect:/demo/wish/${POMPE.idx}`)
      await expect(withdrawWishAction(POMPE.idx, 'wish')).rejects.toThrow(`redirect:/demo/wish/${POMPE.idx}`)
    }
    expect(w.createWish).not.toHaveBeenCalled()
    expect(w.withdrawWish).not.toHaveBeenCalled()
    await expect(createWishAction(999999, fd({}))).rejects.toThrow('redirect:/demo/groups')
    // 患者会が参加している病気には登録しない（その病気の画面＝会への案内へ戻す）
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    await expect(createWishAction(FABRY.idx, fd({ prefecture: '長野県', relation: 'self', consent: 'yes' }))).rejects.toThrow(`redirect:/demo/wish/${FABRY.idx}`)
    await expect(resumeWishAction(FABRY.idx, fd({ consent: 'yes' }))).rejects.toThrow(`redirect:/demo/wish/${FABRY.idx}`)
    expect(w.createWish).not.toHaveBeenCalled()
    expect(w.resumeWish).not.toHaveBeenCalled()
  })

  test('入力の形: 同意が無い・知らない都道府県・知らない立場は通さない', () => {
    const base = { diseaseIdx: 4, prefecture: '長野県', relation: 'self', isGroupMember: null, consent: true }
    expect(validateWishInput(base)).not.toBeNull()
    expect(validateWishInput({ ...base, consent: false })).toBeNull()
    expect(validateWishInput({ ...base, prefecture: '火星' })).toBeNull()
    expect(validateWishInput({ ...base, relation: 'friend' })).toBeNull()
  })
})

// =============================================================================
describe('同意の文（仮の文の差し替え忘れの検知）', () => {
  test('同意担当の文（wish のいまの版）を使い、仮の文に戻っていない', () => {
    expect(WISH_CONSENT_TEXT).toBe(currentConsentText('wish').text)
    expect(WISH_CONSENT_TEXT).not.toBe(WISH_CONSENT_PLACEHOLDER)
    expect(WISH_CONSENT_TEXT.startsWith('【仮の文】')).toBe(false)
  })

  test('同意担当の文に参加希望の種類が無い間だけ、仮の文を使ってよい', () => {
    const hasWishKind = (CONSENT_KINDS as readonly string[]).some((k) => /wish/.test(k))
    // 同意担当が参加希望の同意文（例: 'wish'）を足したら、このテストが落ちる。
    // そのときは app/demo/wish/_lib/wishes.ts の WISH_CONSENT_TEXT を同意担当の文に差し替え、WISH_CONSENT_IS_PLACEHOLDER を false にする
    if (hasWishKind) expect(WISH_CONSENT_IS_PLACEHOLDER).toBe(false)
    else expect(WISH_CONSENT_TEXT).toBe(WISH_CONSENT_PLACEHOLDER)
    if (WISH_CONSENT_IS_PLACEHOLDER) expect(WISH_CONSENT_TEXT.startsWith('【仮の文】')).toBe(true)
  })
})

// =============================================================================
describe('プロフィールの無い方', () => {
  test('会員エリアのトップは招待制の案内と「となりへの参加を希望した患者会はこちら」（onboarding へ送らない）', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    const c = await renderPage(DemoCommunityPage())
    expect(c.querySelector('[data-no-profile]')!.textContent).toContain('会員エリアは招待制です。')
    const link = [...c.querySelectorAll('a')].find((a) => a.textContent === 'となりへの参加を希望した患者会はこちら')
    expect(link?.getAttribute('href')).toBe('/demo/wish')
    // 案内の 1 文として「会員エリアは招待制です。となりへの参加を希望した患者会はこちら」と読める
    expect(link!.closest('p')!.textContent!.replace(/\s+/g, '')).toBe('会員エリアは招待制です。となりへの参加を希望した患者会はこちら')
    expect(c.textContent).not.toContain('参加希望の状況')
    clean(c.innerHTML)
  })

  test('onboarding を直接開いたら案内へ戻す。招待・入会申請の経路なら入力できる', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    await expect(OnboardingPage({})).rejects.toThrow('redirect:/demo/community')
    await expect(OnboardingPage({ searchParams: { from: 'other' } })).rejects.toThrow('redirect:/demo/community')
    for (const from of ['invite', 'join']) {
      const c = await renderPage(OnboardingPage({ searchParams: { from } }))
      expect(c.textContent).toContain('はじめに')
    }
  })

  test('再同意だけの方（プロフィールあり）は経路の印が無くても onboarding を開ける', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, needsConsent: true })
    const c = await renderPage(OnboardingPage({}))
    expect(c.textContent).toContain('利用目的の確認')
  })
})

// =============================================================================
describe('参加希望の一覧と取り消し', () => {
  const WISHES = [{ diseaseIdx: POMPE.idx, prefecture: '長野県', relation: 'family', isGroupMember: true, createdAt: null }]

  test('/demo/wish: 一覧（病気・都道府県・立場）と取り消し。無ければその旨', async () => {
    getViewer.mockResolvedValue(MEMBER_NO_PROFILE)
    w.listMyWishes.mockResolvedValue(WISHES)
    let c = await renderPage(WishStatusPage({}))
    const list = c.querySelector('[data-my-wishes]')!
    expect(list.textContent).toContain('ポンペ病')
    expect(list.textContent).toContain('長野県・ご家族')
    expect(list.querySelector('[data-wish-withdraw]')).not.toBeNull()
    clean(c.innerHTML)

    w.listMyWishes.mockResolvedValue([])
    c = await renderPage(WishStatusPage({}))
    expect(c.querySelector('[data-wish-empty]')).not.toBeNull()
  })

  test('/demo/wish: 未ログインは患者会の一覧への案内、閲覧モードは見本だけ（DB を読まない）', async () => {
    getViewer.mockResolvedValue(null)
    let c = await renderPage(WishStatusPage({}))
    expect(c.querySelector('a[href="/demo/groups"]')).not.toBeNull()
    getViewer.mockResolvedValue({ kind: 'demo' })
    c = await renderPage(WishStatusPage({}))
    expect(c.querySelector('[data-wish-demo]')).not.toBeNull()
    expect(w.listMyWishes).not.toHaveBeenCalled()
  })

  test('マイページに「となりへの参加を希望した患者会」と取り消し', async () => {
    getViewer.mockResolvedValue(MEMBER)
    profile = {
      userId: 'u1', fullName: 'テスト 花子', displayName: 'はなこ', registrantType: 'self', proxyRelation: null,
      patientIsMinor: null, ageBand: '30代', gender: '答えない', prefecture: '長野県', consentedAt: '2026-09-26T03:00:00Z',
    }
    w.listMyWishes.mockResolvedValue(WISHES)
    const c = await renderPage(MemberProfilePage())
    const sec = c.querySelector('[data-my-wishes-section]')!
    expect(sec.querySelector('h2')?.textContent).toBe('となりへの参加を希望した患者会')
    expect(sec.textContent).toContain('ポンペ病')
    expect(sec.querySelector('[data-wish-withdraw]')).not.toBeNull()
  })
})
