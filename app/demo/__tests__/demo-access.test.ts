/**
 * @jest-environment node
 *
 * DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
 *
 * 閲覧コードの入口（プロトタイプ用）の検査。
 *   - env あり: 正しいコード→303＋cookie／誤り→303 demo_error／cookie 有効→community 素通し／改ざん・期限切れ→login
 *   - env なし: route は 404、cookie があっても login へ
 * 本物のマジックリンク経路の検査（access-boundary / auth-redirect）は変えていない。
 */
import { NextRequest, NextResponse } from 'next/server'

const updateSession = jest.fn()
jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: (request: unknown) => updateSession(request),
}))

const getUser = jest.fn()
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser } })),
}))

// モックを定義してから読み込む
import { middleware } from '@/middleware'
import { POST as enter } from '@/app/demo/auth/demo-access/route'
import { POST as end } from '@/app/demo/auth/demo-access/end/route'
import {
  DEMO_COOKIE_NAME,
  codesMatch,
  signDemoToken,
  verifyDemoToken,
} from '@/app/demo/auth/demo-access/token'

const CODE = 'TONARI-2026'
const nowSec = () => Math.floor(Date.now() / 1000)

function postCode(code: string | null) {
  const body = new FormData()
  if (code !== null) body.set('code', code)
  return new NextRequest('http://localhost:3000/demo/auth/demo-access', { method: 'POST', body })
}

function communityRequest(cookie?: string) {
  const headers: Record<string, string> = cookie ? { cookie: `${DEMO_COOKIE_NAME}=${cookie}` } : {}
  return new NextRequest('http://localhost:3000/demo/community', { headers })
}

describe('閲覧コードの入口', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    updateSession.mockReset()
    getUser.mockReset()
    updateSession.mockResolvedValue(NextResponse.next())
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    // Supabase のセッションは無い状態
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    delete process.env.DEMO_ACCESS_CODE
    delete process.env.DEMO_ACCESS_SECRET
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('env あり', () => {
    beforeEach(() => {
      process.env.DEMO_ACCESS_CODE = CODE
    })

    test('正しいコード → 303 で /demo/community（相対パス）＋ 署名付き cookie', async () => {
      const response = await enter(postCode(CODE))
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe('/demo/community')

      const setCookie = response.headers.get('set-cookie')!
      expect(setCookie).toContain(`${DEMO_COOKIE_NAME}=`)
      expect(setCookie).toMatch(/HttpOnly/i)
      expect(setCookie).toMatch(/SameSite=Lax/i)
      expect(setCookie).toMatch(/Path=\/demo(;|$)/)
      expect(setCookie).toMatch(/Max-Age=86400/)
      // テスト環境（production 以外）では Secure を付けない
      expect(setCookie).not.toMatch(/Secure/i)

      const value = response.cookies.get(DEMO_COOKIE_NAME)!.value
      const [exp] = value.split('.')
      expect(Number(exp) - nowSec()).toBeGreaterThan(86400 - 60)
      expect(Number(exp) - nowSec()).toBeLessThanOrEqual(86400)
      expect(await verifyDemoToken(value, CODE)).toBe(true)
    })

    test('前後の空白は無視する', async () => {
      const response = await enter(postCode(`  ${CODE} `))
      expect(response.headers.get('location')).toBe('/demo/community')
    })

    test.each([['違うコード', 'WRONG'], ['空', ''], ['大文字小文字違い', CODE.toLowerCase()], ['欠落', null]])(
      '誤り（%s）→ 303 で /demo/login?demo_error=1、cookie を出さない',
      async (_name, code) => {
        const response = await enter(postCode(code))
        expect(response.status).toBe(303)
        expect(response.headers.get('location')).toBe('/demo/login?demo_error=1')
        expect(response.headers.get('set-cookie')).toBeNull()
      }
    )

    test('本番では Secure を付ける', async () => {
      const env = process.env as Record<string, string | undefined>
      const original = env.NODE_ENV
      env.NODE_ENV = 'production'
      try {
        const response = await enter(postCode(CODE))
        expect(response.headers.get('set-cookie')).toMatch(/Secure/i)
      } finally {
        env.NODE_ENV = original
      }
    })

    test('DEMO_ACCESS_SECRET があれば、そちらで署名する', async () => {
      process.env.DEMO_ACCESS_SECRET = 'separate-secret'
      const response = await enter(postCode(CODE))
      const value = response.cookies.get(DEMO_COOKIE_NAME)!.value
      expect(await verifyDemoToken(value, 'separate-secret')).toBe(true)
      expect(await verifyDemoToken(value, CODE)).toBe(false)

      // middleware も同じ鍵で確かめる
      expect((await middleware(communityRequest(value))).status).toBe(200)
      // 閲覧コードで署名した cookie は、鍵を分けた後は通らない
      const byCode = await signDemoToken(nowSec() + 3600, CODE)
      expect((await middleware(communityRequest(byCode))).status).toBe(302)
    })

    test('入口で受け取った cookie で /demo/community を素通し（200）', async () => {
      const issued = await enter(postCode(CODE))
      const value = issued.cookies.get(DEMO_COOKIE_NAME)!.value
      const response = await middleware(communityRequest(value))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    test('cookie 無しは従来どおり /demo/login へ 302', async () => {
      const response = await middleware(communityRequest())
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/demo/login')
    })

    test('改ざん（期限を延ばす）→ 302', async () => {
      const value = await signDemoToken(nowSec() + 3600, CODE)
      const [, sig] = value.split('.')
      const response = await middleware(communityRequest(`${nowSec() + 999999}.${sig}`))
      expect(response.status).toBe(302)
    })

    test('改ざん（署名を書き換える）→ 302', async () => {
      const value = await signDemoToken(nowSec() + 3600, CODE)
      const last = value.slice(-1) === '0' ? '1' : '0'
      const response = await middleware(communityRequest(value.slice(0, -1) + last))
      expect(response.status).toBe(302)
    })

    test('別の鍵で作った cookie → 302', async () => {
      const value = await signDemoToken(nowSec() + 3600, 'someone-else')
      expect((await middleware(communityRequest(value))).status).toBe(302)
    })

    test('期限切れ → 302', async () => {
      const value = await signDemoToken(nowSec() - 1, CODE)
      expect((await middleware(communityRequest(value))).status).toBe(302)
    })

    test.each(['garbage', '123', '.abc', '123.', '123.xyz', '123.abc'])('形の崩れた cookie（%s）→ 302', async (value) => {
      expect((await middleware(communityRequest(value))).status).toBe(302)
    })

    test('公開層は cookie の有無に関係なく素通し', async () => {
      const response = await middleware(new NextRequest('http://localhost:3000/demo/diseases'))
      expect(response.status).toBe(200)
    })

    test('閲覧を終了 → cookie を消して 303 で /demo/login（相対パス）', async () => {
      const response = await end()
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe('/demo/login')
      const setCookie = response.headers.get('set-cookie')!
      expect(setCookie).toContain(`${DEMO_COOKIE_NAME}=;`)
      expect(setCookie).toMatch(/Max-Age=0/)
      expect(setCookie).toMatch(/Path=\/demo(;|$)/)
    })
  })

  describe('env なし', () => {
    test('入口の route は 404（cookie を出さない）', async () => {
      const response = await enter(postCode(CODE))
      expect(response.status).toBe(404)
      expect(response.headers.get('set-cookie')).toBeNull()
    })

    test('終了の route も 404', async () => {
      expect((await end()).status).toBe(404)
    })

    test('空文字の env も未設定と同じ扱い', async () => {
      process.env.DEMO_ACCESS_CODE = ''
      expect((await enter(postCode(''))).status).toBe(404)
    })

    test('以前の閲覧コードで署名された有効な cookie があっても /demo/login へ 302', async () => {
      const value = await signDemoToken(nowSec() + 3600, CODE)
      const response = await middleware(communityRequest(value))
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/demo/login')
    })

    test('DEMO_ACCESS_SECRET だけがあっても入口は無い', async () => {
      process.env.DEMO_ACCESS_SECRET = 'separate-secret'
      const value = await signDemoToken(nowSec() + 3600, 'separate-secret')
      expect((await middleware(communityRequest(value))).status).toBe(302)
      expect((await enter(postCode(CODE))).status).toBe(404)
    })
  })

  test('codesMatch は一致だけを true にする', async () => {
    expect(await codesMatch(CODE, CODE)).toBe(true)
    expect(await codesMatch(`${CODE}x`, CODE)).toBe(false)
    expect(await codesMatch('', CODE)).toBe(false)
  })
})
