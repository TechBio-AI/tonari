/**
 * 初回ログイン時の同意とプロフィール入力（/demo/community/onboarding）、
 * 閲覧モードの会員情報の見本、session.ts の hasProfile の検査（2026-09-26）。
 *
 *   - demo: /demo/community に見本（山田 花子（サンプル）ほか）が出る。マイページのリンクは /demo/community/profile
 *     （見本のマイページの表示は profile 側。onboarding では入力も保存もさせない）
 *   - member: プロフィールが無い（未同意）なら onboarding へ。ある（同意後）なら community を表示
 *   - onboarding: 利用目的の文と同意チェック。同意が無ければ保存しない。保存できたら /demo/community へ
 *   - 利用目的のいまの版に同意していない会員（needsConsent）: community・onboarding は再同意の画面へ。同意すると consents に base を記録
 *   - どの画面も docs/wording-blocklist-demo.txt の禁止表現を含まない
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({
  getViewer: () => getViewer(),
}))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  // 共通部品 ProfileForm が使う（onboarding では onSaved を渡すので呼ばれない）
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}))

// 選択肢と検証は本物を使い、DB に触れる 2 つだけを差し替える
const upsertMyProfile = jest.fn()
jest.mock('@/lib/portal/member-profile', () => {
  const actual = jest.requireActual('@/lib/portal/member-profile')
  return { ...actual, getMyProfile: jest.fn(), upsertMyProfile: (raw: unknown) => upsertMyProfile(raw) }
})
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// 同意の記録（consents）は差し替える
const recordMyConsent = jest.fn()
jest.mock('@/lib/portal/consents', () => ({
  ...jest.requireActual('@/lib/portal/consents'),
  recordMyConsent: (kind: string) => recordMyConsent(kind),
}))

import DemoCommunityPage from '../community/page'
import OnboardingPage from '../community/onboarding/page'
import OnboardingProfileForm from '../community/onboarding/OnboardingProfileForm'
import ReconsentForm from '../community/onboarding/ReconsentForm'
import { reconsentBase, saveOnboardingProfile } from '../community/onboarding/actions'
import { USAGE_PURPOSE_TEXT, CONSENT_REQUIRED_MESSAGE } from '../community/_components/purpose'
import { PREFECTURES, PROFILE_CHOICES } from '@/lib/portal/member-profile'
import { FORM_FOOTNOTE, FORM_LEAD, PROXY_ATTESTATION_LABEL } from '../community/_components/ProfileForm'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function expectNoBlockedWords(html: string, where: string) {
  const hits = BLOCKLIST.filter((w) => html.includes(w))
  expect({ where, hits }).toEqual({ where, hits: [] })
}

// ファウンダー判断の文言（プライバシーのページと同じ）。base 版 3（2026-10-02。利用目的を実態に合わせた）
const PURPOSE =
  'お預かりする情報は、患者会ごとの会員の場の運営と、相談窓口のご案内にのみ使います。' +
  'お住まいの都道府県は、相談窓口のご案内と、会ごとの人数の集計に使います。' +
  '世話人は、会員の年代・性別・お住まいの地方などの人数の集計を見ます。集計では、10人未満の数は伏せます。' +
  '行事への参加・不参加は、ご本人と世話人だけが見ます。' +
  '企業への提供はしません。将来、別の目的で使う場合は改めて同意をお願いします。' +
  '患者さんが18歳未満のときは、保護者の方が法定代理人として同意します。18歳以上の患者さんの代わりに登録するときは、ご本人の意思に基づいて代わりに入力します'

const SAMPLE_VALUES = ['山田 花子（サンプル）', 'はなこ', '30代', '女性', '東京都']

const member = (hasProfile: boolean, needsConsent = false) => ({ kind: 'member', email: 'a@example.com', hasProfile, needsConsent })

beforeEach(() => {
  getViewer.mockReset()
  upsertMyProfile.mockReset()
  recordMyConsent.mockReset()
  recordMyConsent.mockResolvedValue({ ok: true })
})

describe('利用目的の文言', () => {
  test('ファウンダー指示の文言そのまま', () => {
    expect(USAGE_PURPOSE_TEXT).toBe(PURPOSE)
  })
})

describe('/demo/community', () => {
  test('demo: 帯とお知らせだけ。会員情報の枠は出さない（見本はマイページ。2026-09-26 に枠を撤去）', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const { container } = render(await DemoCommunityPage())

    expect(screen.getByText('プロトタイプの閲覧モードです。実際の会員のデータは表示されません')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '会員情報（サンプル）' })).toBeNull()
    for (const v of SAMPLE_VALUES) {
      expect(container.textContent).not.toContain(v)
    }
    expect(container.querySelector('input, select, textarea')).toBeNull()

    expectNoBlockedWords(container.innerHTML, 'community(demo)')
  })

  // 2026-10-02: onboarding へは送らず、招待制の案内を出す（登録は招待リンクか入会申請の経路からだけ）
  test('member でプロフィールが無い（未同意）→ 招待制の案内', async () => {
    getViewer.mockResolvedValue(member(false))
    const { container } = render(await DemoCommunityPage())
    expect(container.textContent).toContain('会員エリアは招待制です。')
  })

  test('member でプロフィールがある（同意後）→ community を表示。見本は出さない', async () => {
    getViewer.mockResolvedValue(member(true))
    const { container } = render(await DemoCommunityPage())
    expect(container.textContent).toContain('お知らせ') // 会員情報の枠は上部バーへ移した（2026-09-26）
    expect(container.textContent).not.toContain('サンプル')
  })
})

describe('/demo/community/onboarding', () => {
  test('未ログイン → /demo/login', async () => {
    getViewer.mockResolvedValue(null)
    await expect(OnboardingPage({})).rejects.toThrow('redirect:/demo/login')
  })

  test('member で同意済み → /demo/community（初回だけの画面）', async () => {
    getViewer.mockResolvedValue(member(true))
    await expect(OnboardingPage({})).rejects.toThrow('redirect:/demo/community')
  })

  test('member で未同意: 利用目的・5 項目・同意チェック・保存ボタン', async () => {
    getViewer.mockResolvedValue(member(false))
    // 2026-10-02: 最初の入力は招待リンク（?from=invite）か入会申請（?from=join）の経路からだけ
    const { container } = render(await OnboardingPage({ searchParams: { from: 'invite' } }))

    expect(container.textContent).toContain(PURPOSE)
    for (const label of ['氏名', '表示名', '年代', '性別', 'お住まいの都道府県']) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expect(screen.getByRole('checkbox', { name: '上の利用目的に同意します' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '同意して保存する' })).toBeTruthy()
    // 選択肢は member-profile.ts のもの
    const pref = screen.getByLabelText('お住まいの都道府県') as HTMLSelectElement
    expect([...pref.options].slice(1).map((o) => o.value)).toEqual([...PREFECTURES])
    // 性別は「男性・女性・答えない」の並び。「その他」は無い（先頭は「選んでください」）
    const sex = screen.getByLabelText('性別') as HTMLSelectElement
    expect([...sex.options].map((o) => o.textContent)).toEqual(['選んでください', '男性', '女性', '答えない'])

    expectNoBlockedWords(container.innerHTML, 'onboarding(member)')
  })

  test('demo: 入力も保存もさせず /demo/community へ（見本のマイページは profile 側）', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(OnboardingPage({})).rejects.toThrow('redirect:/demo/community')
  })
})

describe('入力フォーム（共通部品 ProfileForm ＋ 同意チェック）', () => {
  const choices = PROFILE_CHOICES
  const PROFILE = { fullName: '見本 太郎', displayName: 'たろう', ageBand: '40代', gender: '答えない', prefecture: '大阪府' }
  // 本人の登録で送る形（続柄・18歳未満かは null、自己申告は false）
  const SELF_PAYLOAD = { ...PROFILE, registrantType: 'self', proxyRelation: null, patientIsMinor: null, proxyAttestation: false }
  const originalLocation = window.location
  const assign = jest.fn()

  beforeEach(() => {
    assign.mockReset()
    // jsdom の location.assign は差し替えられないので、location ごと置き換える
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } })
    getViewer.mockResolvedValue(member(false))
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  function fill() {
    fireEvent.click(screen.getByRole('radio', { name: 'ご本人' }))
    fireEvent.change(screen.getByLabelText('氏名'), { target: { value: PROFILE.fullName } })
    fireEvent.change(screen.getByLabelText('表示名'), { target: { value: PROFILE.displayName } })
    fireEvent.change(screen.getByLabelText('年代'), { target: { value: PROFILE.ageBand } })
    fireEvent.change(screen.getByLabelText(/^性別/), { target: { value: PROFILE.gender } })
    fireEvent.change(screen.getByLabelText('お住まいの都道府県'), { target: { value: PROFILE.prefecture } })
  }
  const submit = () => fireEvent.click(screen.getByRole('button', { name: '同意して保存する' }))
  const agree = () => fireEvent.click(screen.getByRole('checkbox', { name: '上の利用目的に同意します' }))

  test('同意が無ければ保存せず、同意が必要な旨を出す', async () => {
    render(<OnboardingProfileForm choices={choices} />)
    fill()
    submit()
    expect(await screen.findByText(CONSENT_REQUIRED_MESSAGE)).toBeTruthy()
    expect(upsertMyProfile).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  test('同意して保存できたら、入力した値で保存し /demo/community へ', async () => {
    upsertMyProfile.mockResolvedValue({ ok: true, profile: { userId: 'u1', ...PROFILE, consentedAt: 'x' } })
    render(<OnboardingProfileForm choices={choices} />)
    fill()
    agree()
    submit()
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/demo/community'))
    expect(upsertMyProfile).toHaveBeenCalledWith(SELF_PAYLOAD)
  })

  test('冒頭と末尾の文（ファウンダー指示の文言そのまま）と、2 つのブロックが出る', () => {
    render(<OnboardingProfileForm choices={choices} />)
    expect(FORM_LEAD).toBe('このプロフィールは、患者さんについての情報です。ご本人が登録する場合は、ご自身のことを書いてください')
    expect(FORM_FOOTNOTE).toBe('18歳以上の患者さんは、できるかぎりご本人が登録してください')
    expect(screen.getByText(FORM_LEAD)).toBeTruthy()
    expect(screen.getByText(FORM_FOOTNOTE)).toBeTruthy()
    expect(screen.getByRole('group', { name: '登録する方について' })).toBeTruthy()
    expect(screen.getByRole('group', { name: '患者さんについて' })).toBeTruthy()
    // 本人の登録では、続柄・18歳未満かは出さない
    expect(screen.queryByLabelText('続柄')).toBeNull()
    expect(screen.queryByRole('group', { name: '患者さんは18歳未満ですか' })).toBeNull()
  })

  test('代理（18歳未満の患者さん）: 続柄と「18歳未満か」を出し、その値で保存する', async () => {
    upsertMyProfile.mockResolvedValue({ ok: true, profile: {} })
    render(<OnboardingProfileForm choices={choices} />)
    fill()
    fireEvent.click(screen.getByRole('radio', { name: 'ご家族・代理の方' }))
    const relation = screen.getByLabelText('続柄') as HTMLSelectElement
    expect([...relation.options].map((o) => o.textContent)).toEqual(['選んでください', '親', '配偶者', '子', 'その他'])
    fireEvent.change(relation, { target: { value: '親' } })
    fireEvent.click(screen.getByRole('radio', { name: 'はい' }))
    // 18歳未満なら自己申告のチェックは出さない
    expect(screen.queryByRole('checkbox', { name: PROXY_ATTESTATION_LABEL })).toBeNull()
    fireEvent.change(screen.getByLabelText('年代'), { target: { value: '10代' } })
    agree()
    submit()
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/demo/community'))
    expect(upsertMyProfile).toHaveBeenCalledWith({
      ...SELF_PAYLOAD,
      ageBand: '10代',
      registrantType: 'proxy',
      proxyRelation: '親',
      patientIsMinor: true,
    })
  })

  test('代理（18歳以上の患者さん）: 自己申告のチェックを出し、チェックの有無を送る', async () => {
    upsertMyProfile.mockResolvedValue({ ok: false, errors: [{ field: 'proxyAttestation', message: '代理で登録できるのは…' }] })
    render(<OnboardingProfileForm choices={choices} />)
    fill()
    fireEvent.click(screen.getByRole('radio', { name: 'ご家族・代理の方' }))
    fireEvent.change(screen.getByLabelText('続柄'), { target: { value: '子' } })
    fireEvent.click(screen.getByRole('radio', { name: 'いいえ' }))
    expect(screen.getByRole('checkbox', { name: PROXY_ATTESTATION_LABEL })).toBeTruthy()
    agree()
    submit()
    // サーバーが断った理由はチェック欄の下に出る
    expect(await screen.findByText('代理で登録できるのは…')).toBeTruthy()
    expect(upsertMyProfile).toHaveBeenCalledWith(expect.objectContaining({ registrantType: 'proxy', patientIsMinor: false, proxyAttestation: false }))
    expect(assign).not.toHaveBeenCalled()
  })

  test('サーバーが項目のエラーを返したら、その欄に印を付けて移動しない', async () => {
    upsertMyProfile.mockResolvedValue({ ok: false, errors: [{ field: 'displayName', message: '入力してください' }] })
    render(<OnboardingProfileForm choices={choices} />)
    fill()
    agree()
    submit()
    expect(await screen.findByText('入力してください')).toBeTruthy()
    expect(screen.getByLabelText('表示名').getAttribute('aria-invalid')).toBe('true')
    expect(assign).not.toHaveBeenCalled()
  })
})

describe('保存の server action（saveOnboardingProfile）', () => {
  const PROFILE = { fullName: '見本 太郎', displayName: 'たろう', ageBand: '40代', gender: '答えない', prefecture: '大阪府' }

  test.each([
    ['未ログイン', null],
    ['閲覧モード', { kind: 'demo' }],
  ])('%s では保存しない', async (_name, viewer) => {
    getViewer.mockResolvedValue(viewer)
    expect(await saveOnboardingProfile({ profile: PROFILE, consent: true })).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(upsertMyProfile).not.toHaveBeenCalled()
  })

  test.each([
    ['consent が無い', { profile: PROFILE }],
    ['consent が false', { profile: PROFILE, consent: false }],
    ['consent が文字列', { profile: PROFILE, consent: 'true' }],
  ])('%s → 同意のエラー、保存しない（画面のチェックを外して送られても通さない）', async (_name, input) => {
    getViewer.mockResolvedValue(member(false))
    expect(await saveOnboardingProfile(input)).toEqual({
      ok: false,
      errors: [{ field: 'consent', message: CONSENT_REQUIRED_MESSAGE }],
    })
    expect(upsertMyProfile).not.toHaveBeenCalled()
  })

  test('同意あり → profile だけを渡して保存。結果に入力値を含めない', async () => {
    getViewer.mockResolvedValue(member(false))
    upsertMyProfile.mockResolvedValue({ ok: true, profile: { userId: 'u1', ...PROFILE, consentedAt: 'x' } })
    const result = await saveOnboardingProfile({ profile: PROFILE, consent: true })
    expect(result).toEqual({ ok: true })
    expect(upsertMyProfile).toHaveBeenCalledWith(PROFILE)
    expect(recordMyConsent).toHaveBeenCalledWith('base')
    expect(JSON.stringify(result)).not.toContain(PROFILE.fullName)
  })

  test('プロフィールは保存できたが同意の記録に失敗したら failed（次に入ったとき再同意の画面が出る）', async () => {
    getViewer.mockResolvedValue(member(false))
    upsertMyProfile.mockResolvedValue({ ok: true, profile: { userId: 'u1', ...PROFILE, consentedAt: 'x' } })
    recordMyConsent.mockResolvedValue({ ok: false, reason: 'failed' })
    expect(await saveOnboardingProfile({ profile: PROFILE, consent: true })).toEqual({ ok: false, reason: 'failed' })
  })

  test('プロフィールの保存に失敗したら、同意の行は書かない', async () => {
    getViewer.mockResolvedValue(member(false))
    upsertMyProfile.mockResolvedValue({ ok: false, reason: 'failed' })
    await saveOnboardingProfile({ profile: PROFILE, consent: true })
    expect(recordMyConsent).not.toHaveBeenCalled()
  })

  test('項目のエラー・保存の失敗はそのまま返す', async () => {
    getViewer.mockResolvedValue(member(false))
    const errors = { ok: false, errors: [{ field: 'fullName', message: '入力してください' }] }
    upsertMyProfile.mockResolvedValue(errors)
    expect(await saveOnboardingProfile({ profile: { ...PROFILE, fullName: '' }, consent: true })).toEqual(errors)

    upsertMyProfile.mockResolvedValue({ ok: false, reason: 'failed' })
    expect(await saveOnboardingProfile({ profile: PROFILE, consent: true })).toEqual({ ok: false, reason: 'failed' })
  })
})

describe('利用目的の版が上がったときの再同意（needsConsent）', () => {
  const originalLocation = window.location
  const assign = jest.fn()
  beforeEach(() => {
    assign.mockReset()
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  test('/demo/community は再同意の画面へ送る', async () => {
    getViewer.mockResolvedValue(member(true, true))
    await expect(DemoCommunityPage()).rejects.toThrow('redirect:/demo/community/onboarding')
  })

  test('onboarding は利用目的と同意チェックだけを出す（プロフィールの入力欄は出さない）', async () => {
    getViewer.mockResolvedValue(member(true, true))
    const { container } = render(await OnboardingPage({}))
    expect(container.textContent).toContain(PURPOSE)
    expect(screen.getByRole('checkbox', { name: '上の利用目的に同意します' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '同意する' })).toBeTruthy()
    expect(screen.queryByLabelText('氏名')).toBeNull()
    expectNoBlockedWords(container.innerHTML, 'onboarding(reconsent)')
  })

  test('チェックが無ければ送らない。同意すると /demo/community へ', async () => {
    getViewer.mockResolvedValue(member(true, true))
    render(<ReconsentForm />)
    fireEvent.click(screen.getByRole('button', { name: '同意する' }))
    expect(await screen.findByText(CONSENT_REQUIRED_MESSAGE)).toBeTruthy()
    expect(recordMyConsent).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', { name: '上の利用目的に同意します' }))
    fireEvent.click(screen.getByRole('button', { name: '同意する' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/demo/community'))
    expect(recordMyConsent).toHaveBeenCalledWith('base')
  })

  test('reconsentBase: 同意が無い・会員でない・プロフィールが無いときは記録しない', async () => {
    getViewer.mockResolvedValue(member(true, true))
    expect(await reconsentBase({ consent: 'true' })).toEqual({ ok: false, errors: [{ field: 'consent', message: CONSENT_REQUIRED_MESSAGE }] })
    getViewer.mockResolvedValue({ kind: 'demo' })
    expect(await reconsentBase({ consent: true })).toEqual({ ok: false, reason: 'unauthenticated' })
    getViewer.mockResolvedValue(member(false))
    expect(await reconsentBase({ consent: true })).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(recordMyConsent).not.toHaveBeenCalled()
  })
})
