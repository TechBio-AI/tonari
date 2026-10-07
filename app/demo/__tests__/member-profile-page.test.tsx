/**
 * マイページ（/demo/community/profile）と、/demo/community からの導線・振り分けの検査
 *
 *   1. 表示: 会員本人のプロフィールが「いまの登録内容」とフォームの初期値に出る。禁止表現が無い
 *   2. 編集の保存: フォームの値で保存（server action）が呼ばれ、「保存しました」。通らない項目は欄の下に理由
 *   3. 振り分け: 未ログイン → /demo/login、見本（demo）→ /demo/community、プロフィール無し → onboarding
 *   4. /demo/community: 「マイページ」への導線が 1 つ。プロフィールの無い会員は onboarding へ
 *   5. server action: 会員でなければ保存しない
 *   6. 研究・治験の案内（B 層）: 同意の文・病気の選択・取り消し。同意した時点の名前で出す。会員でなければ書かない
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const getMyProfile = jest.fn()
const upsertMyProfile = jest.fn()
jest.mock('@/lib/portal/member-profile', () => ({
  ...jest.requireActual('@/lib/portal/member-profile'),
  getMyProfile: () => getMyProfile(),
  upsertMyProfile: (input: unknown) => upsertMyProfile(input),
}))

// 研究・治験の案内（B 層）の DB に触れる部分だけを差し替える
const getMyResearchContact = jest.fn()
const getMyGroupDiseaseIdxs = jest.fn()
const saveMyResearchContact = jest.fn()
const withdrawMyResearchContact = jest.fn()
jest.mock('@/lib/portal/research-contact', () => ({
  ...jest.requireActual('@/lib/portal/research-contact'),
  getMyResearchContact: () => getMyResearchContact(),
  getMyGroupDiseaseIdxs: () => getMyGroupDiseaseIdxs(),
  researchDiseaseOptions: (idxs: number[] | null) =>
    jest.requireActual('@/lib/portal/research-contact').researchDiseaseOptions(idxs, (i: number) => ({ 3: 'ファブリー病', 7: 'ゴーシェ病' } as Record<number, string>)[i] ?? null),
  saveMyResearchContact: (input: unknown) => saveMyResearchContact(input),
  withdrawMyResearchContact: () => withdrawMyResearchContact(),
}))

const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  useRouter: () => ({ refresh }),
}))

import { PROFILE_CHOICES, type MemberProfile } from '@/lib/portal/member-profile'

import MemberProfilePage from '../community/profile/page'
import DemoCommunityPage from '../community/page'
import { saveMyProfile, saveResearchContact, withdrawResearchContact } from '../community/profile/actions'
import {
  NO_OPTIONS_MESSAGE,
  OUTDATED_MESSAGE,
  ResearchContactSection,
  WITHDRAWN_MESSAGE,
} from '../community/profile/ResearchContactSection'
import { currentConsentText } from '@/lib/portal/consent-texts'
import { PROXY_ATTESTATION_LABEL, ProfileForm, SAVED_MESSAGE } from '../community/_components/ProfileForm'
import { CONSENT_LABEL, CONSENT_REQUIRED_MESSAGE } from '../community/_components/purpose'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

// 架空の会員（テスト用）
const PROFILE: MemberProfile = {
  userId: 'u1',
  fullName: 'テスト 花子',
  displayName: 'はなこ',
  registrantType: 'self',
  proxyRelation: null,
  patientIsMinor: null,
  ageBand: '30代',
  gender: '答えない',
  prefecture: '長野県',
  consentedAt: '2026-09-26T03:00:00Z',
}
const CHOICES = PROFILE_CHOICES

beforeEach(() => {
  getMyResearchContact.mockReset()
  getMyResearchContact.mockResolvedValue({ state: 'none', consentedAt: null, diseases: [] })
  getMyGroupDiseaseIdxs.mockReset()
  getMyGroupDiseaseIdxs.mockResolvedValue([])
  saveMyResearchContact.mockReset()
  withdrawMyResearchContact.mockReset()
  getViewer.mockReset()
  getMyProfile.mockReset()
  upsertMyProfile.mockReset()
  refresh.mockReset()
})

describe('マイページの表示', () => {
  test('本人のプロフィールが「いまの登録内容」とフォームの初期値に出る。禁止表現が無い', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com' })
    getMyProfile.mockResolvedValue(PROFILE)
    const { container } = render(await MemberProfilePage())

    const summary = container.querySelector('[data-profile-summary]')!
    for (const v of ['テスト 花子', 'はなこ', '30代', '答えない', '長野県', 'ご本人']) expect(summary.textContent).toContain(v)
    // 登録する方と患者さんの 2 ブロック。本人なら続柄は出さない
    for (const h of ['登録する方について', '患者さんについて']) expect(screen.getByRole('heading', { level: 3, name: h })).toBeTruthy()
    expect(summary.textContent).not.toContain('続柄')
    expect((screen.getByRole('radio', { name: 'ご本人' }) as HTMLInputElement).checked).toBe(true)
    expect(summary.textContent).toContain('利用目的に同意した日：2026年9月26日')

    expect((screen.getByLabelText('氏名') as HTMLInputElement).value).toBe('テスト 花子')
    expect((screen.getByLabelText('表示名') as HTMLInputElement).value).toBe('はなこ')
    expect((screen.getByLabelText('年代') as HTMLSelectElement).value).toBe('30代')
    expect((screen.getByLabelText('性別') as HTMLSelectElement).value).toBe('答えない')
    // 性別は「男性・女性・答えない」の並び。「その他」は無い
    expect([...(screen.getByLabelText('性別') as HTMLSelectElement).options].map((o) => o.value)).toEqual(['男性', '女性', '答えない'])
    expect((screen.getByLabelText('お住まいの都道府県') as HTMLSelectElement).value).toBe('長野県')
    expect(container.querySelector('a[href="/demo/community"]')).not.toBeNull()

    expect(BLOCKLIST.filter((w) => container.innerHTML.includes(w))).toEqual([])
    expect(container.textContent).not.toContain('診断')
  })
})

describe('マイページ: 代理の方の登録内容', () => {
  test('続柄と「18歳未満か」を「登録する方について」に出す', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false })
    getMyProfile.mockResolvedValue({ ...PROFILE, registrantType: 'proxy', proxyRelation: '親', patientIsMinor: true, ageBand: '10歳未満' })
    const { container } = render(await MemberProfilePage())
    const summary = container.querySelector('[data-profile-summary]')!
    for (const v of ['ご家族・代理の方', '続柄', '親', '患者さんは18歳未満か', 'はい', '10歳未満']) expect(summary.textContent).toContain(v)
    expect(container.textContent).toContain('氏名は運営と、入会審査をする世話人だけが見ます')
  })
})

describe('マイページの振り分け', () => {
  test('未ログインは /demo/login へ（プロフィールは読まない）', async () => {
    getViewer.mockResolvedValue(null)
    await expect(MemberProfilePage()).rejects.toThrow('redirect:/demo/login')
    expect(getMyProfile).not.toHaveBeenCalled()
  })
  test('閲覧モード（demo）は見本を読み取り専用で出す。community へ戻さず、DB も読まない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const { container } = render(await MemberProfilePage())
    expect(getMyProfile).not.toHaveBeenCalled()
    expect(container.textContent).toContain('プロトタイプの閲覧モードです')
    for (const v of ['山田 花子（サンプル）', 'はなこ', '30代', '女性', '東京都']) expect(container.textContent).toContain(v)
    // 読み取り専用: 入力欄も保存ボタンも無い
    expect(container.querySelectorAll('input, select, textarea, button').length).toBe(0)
    expect(container.querySelector('form')).toBeNull()
    expect(BLOCKLIST.filter((w) => container.innerHTML.includes(w))).toEqual([])
  })
  test('利用目的のいまの版に同意していない会員は /demo/community/onboarding へ（プロフィールは読まない）', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: true })
    await expect(MemberProfilePage()).rejects.toThrow('redirect:/demo/community/onboarding')
    expect(getMyProfile).not.toHaveBeenCalled()
  })
  // 2026-10-02: プロフィールの登録は招待リンクか入会申請の経路からだけ。マイページからは会員エリアのトップ（招待制の案内）へ
  test('プロフィールが無い会員は /demo/community へ', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com' })
    getMyProfile.mockResolvedValue(null)
    await expect(MemberProfilePage()).rejects.toThrow('redirect:/demo/community')
  })
})

describe('編集の保存', () => {
  const initial = {
    fullName: PROFILE.fullName,
    displayName: PROFILE.displayName,
    registrantType: PROFILE.registrantType,
    proxyRelation: PROFILE.proxyRelation,
    patientIsMinor: PROFILE.patientIsMinor,
    ageBand: PROFILE.ageBand,
    gender: PROFILE.gender,
    prefecture: PROFILE.prefecture,
  }

  test('変えた値で保存が呼ばれ、「保存しました」が出て、ページを読み直す', async () => {
    const save = jest.fn().mockResolvedValue({ ok: true, profile: { ...PROFILE, displayName: 'はな', prefecture: '沖縄県' } })
    render(<ProfileForm initial={initial} choices={CHOICES} save={save} />)
    fireEvent.change(screen.getByLabelText('表示名'), { target: { value: 'はな' } })
    fireEvent.change(screen.getByLabelText('お住まいの都道府県'), { target: { value: '沖縄県' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByText(SAVED_MESSAGE)).toBeInTheDocument())
    expect(save).toHaveBeenCalledWith({ profile: { ...initial, displayName: 'はな', prefecture: '沖縄県', proxyAttestation: false }, consent: false })
    expect(refresh).toHaveBeenCalled()
  })

  test('通らない項目は、入力を残したまま欄の下に理由が出る', async () => {
    const save = jest.fn().mockResolvedValue({ ok: false, errors: [{ field: 'displayName', message: '入力してください' }] })
    render(<ProfileForm initial={initial} choices={CHOICES} save={save} />)
    fireEvent.change(screen.getByLabelText('表示名'), { target: { value: '　' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('入力してください'))
    expect(screen.getByLabelText('表示名')).toHaveAttribute('aria-invalid', 'true')
    expect((screen.getByLabelText('氏名') as HTMLInputElement).value).toBe('テスト 花子')
    expect(screen.queryByText(SAVED_MESSAGE)).toBeNull()
    expect(refresh).not.toHaveBeenCalled()
  })

  test('server action: 会員なら upsertMyProfile に渡す。未ログイン・見本では保存しない', async () => {
    upsertMyProfile.mockResolvedValue({ ok: true, profile: PROFILE })
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com' })
    await expect(saveMyProfile({ profile: initial })).resolves.toEqual({ ok: true, profile: PROFILE })
    expect(upsertMyProfile).toHaveBeenCalledWith(initial)

    upsertMyProfile.mockClear()
    for (const v of [null, { kind: 'demo' }]) {
      getViewer.mockResolvedValue(v)
      await expect(saveMyProfile({ profile: initial })).resolves.toEqual({ ok: false, reason: 'unauthenticated' })
    }
    expect(upsertMyProfile).not.toHaveBeenCalled()
  })
})

describe('共通部品 ProfileForm（onboarding でも使う）', () => {
  test('同意あり: 未チェックなら保存を呼ばずに理由を出し、チェックすると consent: true で保存して onSaved を呼ぶ', async () => {
    const save = jest.fn().mockResolvedValue({ ok: true })
    const onSaved = jest.fn()
    render(<ProfileForm choices={CHOICES} save={save} requireConsent submitLabel="同意して登録する" onSaved={onSaved} />)
    // 初期値なしなら選択肢は「選んでください」から
    expect((screen.getByLabelText('年代') as HTMLSelectElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('氏名'), { target: { value: 'テスト 花子' } })

    fireEvent.click(screen.getByRole('button', { name: '同意して登録する' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(CONSENT_REQUIRED_MESSAGE))
    expect(save).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(CONSENT_LABEL))
    fireEvent.click(screen.getByRole('button', { name: '同意して登録する' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(save).toHaveBeenCalledWith({
      profile: {
        fullName: 'テスト 花子',
        displayName: '',
        registrantType: '',
        proxyRelation: null,
        patientIsMinor: null,
        proxyAttestation: false,
        ageBand: '',
        gender: '',
        prefecture: '',
      },
      consent: true,
    })
    expect(refresh).not.toHaveBeenCalled() // onSaved を渡したときは呼ぶ側に任せる
  })

  test('同意なし（マイページ）: 同意のチェックを出さない', () => {
    render(<ProfileForm choices={CHOICES} save={jest.fn()} />)
    expect(screen.queryByLabelText(CONSENT_LABEL)).toBeNull()
  })

  test('保存済みの代理（18歳以上の患者さん）: 続柄・18歳未満か・自己申告が初期値で出る', () => {
    const initial = { ...PROFILE, registrantType: 'proxy' as const, proxyRelation: '子', patientIsMinor: false, ageBand: '70代' }
    render(<ProfileForm initial={initial} choices={CHOICES} save={jest.fn()} />)
    expect((screen.getByRole('radio', { name: 'ご家族・代理の方' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('続柄') as HTMLSelectElement).value).toBe('子')
    expect((screen.getByRole('radio', { name: 'いいえ' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: PROXY_ATTESTATION_LABEL }) as HTMLInputElement).checked).toBe(true)
  })
})

describe('/demo/community からの導線と振り分け', () => {
  test('会員（プロフィールあり）: ページ本体はお知らせだけ（マイページへの導線は上部バー。member-bar.test.tsx）', async () => {
    // プロフィールの有無は session.ts の getViewer が hasProfile で返す（2026-09-26）
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true })
    getMyProfile.mockResolvedValue(PROFILE)
    const { container } = render(await DemoCommunityPage())
    expect(container.querySelector('a[href="/demo/community/profile"]')).toBeNull()
    expect(container.querySelector('form[action="/demo/auth/signout"]')).toBeNull()
    expect(container.textContent).toContain('お知らせはまだありません。')
  })
  // 2026-10-02: onboarding へは送らず、招待制の案内と、となりへの参加を希望した患者会へのリンクを出す
  test('プロフィールの無い会員（未同意・未入力）には招待制の案内を出す', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: false })
    getMyProfile.mockResolvedValue(null)
    const { container } = render(await DemoCommunityPage())
    expect(container.textContent).toContain('会員エリアは招待制です。')
  })
  test('未ログインは /demo/login へ（プロフィールは読まない）', async () => {
    getViewer.mockResolvedValue(null)
    await expect(DemoCommunityPage()).rejects.toThrow('redirect:/demo/login')
    expect(getMyProfile).not.toHaveBeenCalled()
  })
})

describe('研究・治験の案内（B 層）', () => {
  const TEXT = currentConsentText('research_contact').text
  const OPTIONS = [
    { idx: 3, name: 'ファブリー病' },
    { idx: 7, name: 'ゴーシェ病' },
  ]
  const none = { state: 'none' as const, consentedDate: '', diseases: [] }

  test('ページ: 同意の文（ファウンダー指示の文言）がチェック欄になり、所属する会の病気を選べる。禁止表現が無い', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false })
    getMyProfile.mockResolvedValue(PROFILE)
    getMyGroupDiseaseIdxs.mockResolvedValue([3, 7, 3])
    const { container } = render(await MemberProfilePage())
    // research_contact 版 2（2026-10-03。案件の案内〔共通契約 C〕に合わせた）
    expect(TEXT).toBe(
      '私の病気に関する研究や治験の案内を受け取ります。' +
        '案内は当サイトの会員エリアに表示されます。参加を考えるときは、私が自分で案内先（公開の登録情報）に連絡します。' +
        '案内に関心があるかどうかを付けると、運営はその人数だけを数えます。' +
        '企業に、私の氏名・連絡先などの個人情報が渡ることはありません。いつでも取り消せます'
    )
    expect(screen.getByRole('heading', { name: '研究・治験の案内' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: TEXT })).toBeTruthy()
    expect(screen.getAllByRole('checkbox', { name: /ファブリー病|ゴーシェ病/ })).toHaveLength(2)
    expect(BLOCKLIST.filter((w) => container.innerHTML.includes(w))).toEqual([])
  })

  test('所属する会が無ければ、選べないことを出し、同意の欄は出さない', () => {
    render(<ResearchContactSection consentLabel={TEXT} options={[]} status={none} save={jest.fn()} withdraw={jest.fn()} />)
    expect(screen.getByText(NO_OPTIONS_MESSAGE)).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: TEXT })).toBeNull()
  })

  test('選んだ病気を idx と名前の組で送る（同意のチェックも送る）', async () => {
    const save = jest.fn().mockResolvedValue({ ok: true })
    render(<ResearchContactSection consentLabel={TEXT} options={OPTIONS} status={none} save={save} withdraw={jest.fn()} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'ゴーシェ病' }))
    fireEvent.click(screen.getByRole('checkbox', { name: TEXT }))
    fireEvent.click(screen.getByRole('button', { name: '同意して保存する' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith({ consent: true, diseases: [{ idx: 7, name: 'ゴーシェ病' }] }))
    expect(refresh).toHaveBeenCalled()
  })

  test('サーバーの理由（同意が無い・一覧が変わった）を出す', async () => {
    const save = jest.fn().mockResolvedValue({ ok: false, field: 'consent', message: '案内を受け取るには、上の文への同意が必要です' })
    render(<ResearchContactSection consentLabel={TEXT} options={OPTIONS} status={none} save={save} withdraw={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '同意して保存する' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('上の文への同意が必要です'))
    expect(refresh).not.toHaveBeenCalled()
  })

  test('同意済み: 同意した時点の名前で出し、選び直しでは同意の欄を出さない。取り消せる', async () => {
    const withdraw = jest.fn().mockResolvedValue({ ok: true })
    // 保存済みの名前は、いまの一覧（OPTIONS）に無い名前でもそのまま出す（idx から引き直さない）
    const status = { state: 'current' as const, consentedDate: '2026年9月26日', diseases: [{ idx: 3, name: '旧い病名' }, { idx: 7, name: 'ゴーシェ病' }] }
    const { container } = render(<ResearchContactSection consentLabel={TEXT} options={OPTIONS} status={status} save={jest.fn()} withdraw={withdraw} />)
    const saved = container.querySelector('[data-saved-diseases]')!
    expect(saved.textContent).toContain('旧い病名')
    expect(saved.textContent).not.toContain('ファブリー病')
    expect(container.textContent).toContain('同意した日：2026年9月26日')
    expect(screen.queryByRole('checkbox', { name: TEXT })).toBeNull()
    // 保存済みの名前と一致するものだけに印が付く
    expect((screen.getByRole('checkbox', { name: 'ゴーシェ病' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'ファブリー病' }) as HTMLInputElement).checked).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '案内の受け取りを取り消す' }))
    await waitFor(() => expect(screen.getByText(WITHDRAWN_MESSAGE)).toBeTruthy())
    expect(withdraw).toHaveBeenCalled()
  })

  test('版が上がった（outdated）: 改めて同意を求め、同意の欄を出す', () => {
    const status = { state: 'outdated' as const, consentedDate: '', diseases: [{ idx: 3, name: 'ファブリー病' }] }
    render(<ResearchContactSection consentLabel={TEXT} options={OPTIONS} status={status} save={jest.fn()} withdraw={jest.fn()} />)
    expect(screen.getByText(OUTDATED_MESSAGE)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: TEXT })).toBeTruthy()
  })

  test('server action: 同意済みの会員だけが書ける（未ログイン・見本・再同意待ちでは書かない）', async () => {
    saveMyResearchContact.mockResolvedValue({ ok: true })
    withdrawMyResearchContact.mockResolvedValue({ ok: true })
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false })
    const input = { consent: true, diseases: [{ idx: 3, name: 'ファブリー病' }] }
    await expect(saveResearchContact(input)).resolves.toEqual({ ok: true })
    expect(saveMyResearchContact).toHaveBeenCalledWith(input)
    await expect(withdrawResearchContact()).resolves.toEqual({ ok: true })

    saveMyResearchContact.mockClear()
    withdrawMyResearchContact.mockClear()
    for (const v of [null, { kind: 'demo' }, { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: true }]) {
      getViewer.mockResolvedValue(v)
      await expect(saveResearchContact(input)).resolves.toEqual({ ok: false, reason: 'unauthenticated' })
      await expect(withdrawResearchContact()).resolves.toEqual({ ok: false, reason: 'unauthenticated' })
    }
    expect(saveMyResearchContact).not.toHaveBeenCalled()
    expect(withdrawMyResearchContact).not.toHaveBeenCalled()
  })
})
