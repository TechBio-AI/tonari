/**
 * @jest-environment node
 *
 * TEST_PASSWORD_LOGIN: 本番前に削除（docs/REMOVE_BEFORE_PRODUCTION.md）
 *
 * テスト用パスワードログイン（lib/portal/password-login.ts と app/demo/auth/password/route.ts）。
 *   - env が 'on' ちょうどのときだけ開く（未設定・空・'off' は閉じる。route は 404）
 *   - サインアップを呼ばない（signInWithPassword だけ）
 *   - 失敗は理由を区別せず /demo/login?password_error=1、成功は /demo/community
 *   - 別のサイトからのフォームは 403
 * Supabase には接続しない（lib/supabase/server をモックする）。
 */
import { NextRequest } from 'next/server'

const signInWithPasswordMock = jest.fn()
const signUpMock = jest.fn()
const signInWithOtpMock = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { signInWithPassword: signInWithPasswordMock, signUp: signUpMock, signInWithOtp: signInWithOtpMock },
  }),
}))

import {
  EMAIL_MAX,
  PASSWORD_LOGIN_ENV,
  PASSWORD_MAX,
  isPasswordLoginEnabled,
  signInWithPassword,
  validateCredentials,
} from '@/lib/portal/password-login'
import { POST } from '@/app/demo/auth/password/route'

const EMAIL = 'test@example.com'
const PASSWORD = 'pass word 123'

function post(fields: Record<string, string> | null, headers: Record<string, string> = {}) {
  const body = new FormData()
  if (fields) for (const [k, v] of Object.entries(fields)) body.set(k, v)
  return new NextRequest('http://localhost:3000/demo/auth/password', {
    method: 'POST',
    body,
    headers: { host: 'localhost:3000', ...headers },
  })
}

describe('テスト用パスワードログイン', () => {
  const ORIGINAL_ENV = { ...process.env }
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    signInWithPasswordMock.mockReset()
    signUpMock.mockReset()
    signInWithOtpMock.mockReset()
    signInWithPasswordMock.mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null })
    process.env[PASSWORD_LOGIN_ENV] = 'on'
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    errorSpy.mockRestore()
  })

  describe('開閉', () => {
    test.each([
      ['未設定', undefined],
      ['空', ''],
      ['off', 'off'],
      ['ON（大文字）', 'ON'],
      ['true', 'true'],
    ])('%s なら閉じる。関数は Supabase を呼ばず、route は 404', async (_label, value) => {
      if (value === undefined) delete process.env[PASSWORD_LOGIN_ENV]
      else process.env[PASSWORD_LOGIN_ENV] = value
      expect(isPasswordLoginEnabled()).toBe(false)
      expect(await signInWithPassword(EMAIL, PASSWORD)).toEqual({ ok: false, reason: 'disabled' })
      const res = await POST(post({ email: EMAIL, password: PASSWORD }))
      expect(res.status).toBe(404)
      expect(signInWithPasswordMock).not.toHaveBeenCalled()
    })

    test("'on' ちょうどなら開く", () => {
      expect(isPasswordLoginEnabled()).toBe(true)
    })
  })

  describe('入力の形', () => {
    test('メールアドレスは前後の空白を落とし、パスワードはそのまま', () => {
      expect(validateCredentials(`  ${EMAIL} `, ` ${PASSWORD} `)).toEqual({ ok: true, email: EMAIL, password: ` ${PASSWORD} ` })
    })

    test.each([
      ['メールが空', '', PASSWORD],
      ['メールに @ が無い', 'test.example.com', PASSWORD],
      ['メールが長すぎる', `${'a'.repeat(EMAIL_MAX)}@example.com`, PASSWORD],
      ['パスワードが空', EMAIL, ''],
      ['パスワードが長すぎる', EMAIL, 'a'.repeat(PASSWORD_MAX + 1)],
      ['文字列でない', null, PASSWORD],
    ])('%s は通さない', (_label, email, password) => {
      expect(validateCredentials(email, password)).toEqual({ ok: false })
    })
  })

  describe('関数', () => {
    test('signInWithPassword だけを呼ぶ（サインアップ・マジックリンクは呼ばない）', async () => {
      expect(await signInWithPassword(` ${EMAIL} `, PASSWORD)).toEqual({ ok: true })
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD })
      expect(signUpMock).not.toHaveBeenCalled()
      expect(signInWithOtpMock).not.toHaveBeenCalled()
    })

    test('形の悪い入力は Supabase へ送らない', async () => {
      expect(await signInWithPassword('x', PASSWORD)).toEqual({ ok: false, reason: 'invalid_input' })
      expect(signInWithPasswordMock).not.toHaveBeenCalled()
    })

    test('Supabase のエラー・セッション無し・例外は failed。ログにメールもパスワードも出さない', async () => {
      signInWithPasswordMock.mockResolvedValueOnce({
        data: { session: null },
        error: { status: 400, code: 'invalid_credentials', message: `bad ${EMAIL}` },
      })
      expect(await signInWithPassword(EMAIL, PASSWORD)).toEqual({ ok: false, reason: 'failed' })
      signInWithPasswordMock.mockResolvedValueOnce({ data: { session: null }, error: null })
      expect(await signInWithPassword(EMAIL, PASSWORD)).toEqual({ ok: false, reason: 'failed' })
      signInWithPasswordMock.mockRejectedValueOnce(new Error(`boom ${PASSWORD}`))
      expect(await signInWithPassword(EMAIL, PASSWORD)).toEqual({ ok: false, reason: 'failed' })

      const logged = JSON.stringify(errorSpy.mock.calls)
      expect(logged).not.toContain(EMAIL)
      expect(logged).not.toContain(PASSWORD)
    })
  })

  describe('route', () => {
    test('成功したら /demo/community へ 303', async () => {
      const res = await POST(post({ email: EMAIL, password: PASSWORD }))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe('/demo/community')
    })

    test('失敗したら /demo/login?password_error=1 へ 303（理由は区別しない）', async () => {
      signInWithPasswordMock.mockResolvedValueOnce({ data: { session: null }, error: { status: 400 } })
      const res = await POST(post({ email: EMAIL, password: 'wrong' }))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe('/demo/login?password_error=1')
    })

    test('項目が欠けていたら Supabase を呼ばずに失敗へ', async () => {
      const res = await POST(post({ email: EMAIL }))
      expect(res.headers.get('location')).toBe('/demo/login?password_error=1')
      expect(signInWithPasswordMock).not.toHaveBeenCalled()
    })

    test('別のサイトからのフォームは 403（Supabase を呼ばない）', async () => {
      const res = await POST(post({ email: EMAIL, password: PASSWORD }, { origin: 'https://evil.example' }))
      expect(res.status).toBe(403)
      expect(signInWithPasswordMock).not.toHaveBeenCalled()
    })

    test('同じホストからのフォームは通る', async () => {
      const res = await POST(post({ email: EMAIL, password: PASSWORD }, { origin: 'http://localhost:3000' }))
      expect(res.status).toBe(303)
    })
  })
})
