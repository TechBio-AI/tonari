/**
 * @jest-environment node
 *
 * session.ts の hasProfile と needsConsent（利用目的のいまの版に同意しているか）の検査（2026-09-26）。
 * 初回の保存（onboarding の server action）の検査は member-onboarding.test.tsx に移した
 * （保存を route handler から server action に替えたため）。
 */
const getMyProfile = jest.fn()
jest.mock('@/lib/portal/member-profile', () => ({
  getMyProfile: () => getMyProfile(),
}))

// 同意の記録（consents）は差し替える。版の判定（consentState）は本物を使う
const getMyConsents = jest.fn()
jest.mock('@/lib/portal/consents', () => ({
  ...jest.requireActual('@/lib/portal/consents'),
  getMyConsents: () => getMyConsents(),
}))

const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser } }),
}))

const cookieGet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: () => ({ get: (name: string) => cookieGet(name) }),
}))

// モックを定義してから読み込む
import { getViewer } from '@/app/demo/_lib/session'

const signedIn = () => getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@example.com' } } })
const signedOut = () => getUser.mockResolvedValue({ data: { user: null } })

// いまの版（base は 2026-10-02 に版 3）
const BASE_V1 = { id: 'c1', kind: 'base', version: 3, consentedAt: '2026-09-26T00:00:00Z', withdrawnAt: null }

beforeEach(() => {
  getMyConsents.mockReset()
  getMyConsents.mockResolvedValue([BASE_V1])
  getMyProfile.mockReset()
  getUser.mockReset()
  cookieGet.mockReset()
  delete process.env.DEMO_ACCESS_CODE
})

describe('session.ts の hasProfile', () => {
  test('プロフィールがあれば true', async () => {
    signedIn()
    getMyProfile.mockResolvedValue({ userId: 'u1' })
    expect(await getViewer()).toEqual({ kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false })
  })

  test('プロフィールが無ければ false', async () => {
    signedIn()
    getMyProfile.mockResolvedValue(null)
    expect(await getViewer()).toEqual({ kind: 'member', email: 'a@example.com', hasProfile: false, needsConsent: false })
  })

  test('確かめられなかったときも false（入力の画面へ送る側に倒す）', async () => {
    signedIn()
    getMyProfile.mockRejectedValue(new Error('db'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getViewer()).toEqual({ kind: 'member', email: 'a@example.com', hasProfile: false, needsConsent: false })
    spy.mockRestore()
  })

  test('未ログインならプロフィールを見に行かない', async () => {
    signedOut()
    expect(await getViewer()).toBeNull()
    expect(getMyProfile).not.toHaveBeenCalled()
  })
})

describe('session.ts の needsConsent（利用目的のいまの版に同意しているか）', () => {
  beforeEach(() => {
    signedIn()
    getMyProfile.mockResolvedValue({ userId: 'u1' })
  })

  test('いまの版（base 版 3）に同意していれば false', async () => {
    expect(await getViewer()).toMatchObject({ hasProfile: true, needsConsent: false })
  })

  test('同意の行が無ければ true（再同意の画面へ）', async () => {
    getMyConsents.mockResolvedValue([])
    expect(await getViewer()).toMatchObject({ hasProfile: true, needsConsent: true })
  })

  test('取り消した行しか無ければ true', async () => {
    getMyConsents.mockResolvedValue([{ ...BASE_V1, withdrawnAt: '2026-09-27T00:00:00Z' }])
    expect(await getViewer()).toMatchObject({ needsConsent: true })
  })

  test('同意の記録を読めなかったら true（入れない側に倒す）', async () => {
    getMyConsents.mockResolvedValue(null)
    expect(await getViewer()).toMatchObject({ needsConsent: true })
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    getMyConsents.mockRejectedValue(new Error('db'))
    expect(await getViewer()).toMatchObject({ needsConsent: true })
    spy.mockRestore()
  })

  test('プロフィールが無い方は、同意の記録を見に行かない（初回の画面で同意する）', async () => {
    getMyProfile.mockResolvedValue(null)
    expect(await getViewer()).toMatchObject({ hasProfile: false, needsConsent: false })
    expect(getMyConsents).not.toHaveBeenCalled()
  })
})

describe('base の版が 2 に上がった後', () => {
  test('版 1 にしか同意していない会員は needsConsent（再同意の画面へ）', async () => {
    signedIn()
    getMyProfile.mockResolvedValue({ userId: 'u1' })
    getMyConsents.mockResolvedValue([{ ...BASE_V1, version: 1 }])
    expect(await getViewer()).toMatchObject({ hasProfile: true, needsConsent: true })
  })
})

describe('base の版が 3 に上がった後（2026-10-02）', () => {
  test('版 2 にしか同意していない会員は needsConsent（再同意の画面へ）', async () => {
    signedIn()
    getMyProfile.mockResolvedValue({ userId: 'u1' })
    getMyConsents.mockResolvedValue([{ ...BASE_V1, version: 2 }])
    expect(await getViewer()).toMatchObject({ hasProfile: true, needsConsent: true })
  })
})
