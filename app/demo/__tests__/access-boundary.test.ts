/**
 * @jest-environment node
 *
 * 公開層（/demo）と登録層（/demo/community）の境界の検査。
 *
 * ここで見るのは middleware.ts が重ねた境界だけ。
 * updateSession（Basic認証・Supabase セッション・ロール制御）は
 * utils/supabase/middleware.ts のもので、この検査では差し替えている。
 * その中身に触れていないこと自体を、401 の素通しで確かめる。
 */
import { NextRequest, NextResponse } from 'next/server'

import robots from '@/app/robots'

const updateSession = jest.fn()
jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: (request: unknown) => updateSession(request),
}))

// セッションの有無は @supabase/ssr 経由で見ているので、そこを差し替える
const getUser = jest.fn()
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser } })),
}))

// モックを定義してから読み込む
import { middleware } from '@/middleware'

function request(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

const loggedIn = () => getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@example.com' } }, error: null })
const loggedOut = () => getUser.mockResolvedValue({ data: { user: null }, error: null })

describe('登録層の境界（middleware）', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    updateSession.mockReset()
    getUser.mockReset()
    // 既存の updateSession が素通しした状態（NextResponse.next() は 200）
    updateSession.mockResolvedValue(NextResponse.next())
    // Supabase が設定済みの状態を既定にする
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    loggedOut()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test.each(['/demo/community', '/demo/community/', '/demo/community/rooms/123'])(
    'セッションが無いとき %s は /demo/login へ 302',
    async (pathname) => {
      const response = await middleware(request(pathname))
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/demo/login')
    }
  )

  test.each(['/demo/community', '/demo/community/rooms/123'])(
    'セッションがあるとき %s は素通し（200）',
    async (pathname) => {
      loggedIn()
      const response = await middleware(request(pathname))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    }
  )

  test.each(['/demo', '/demo/diseases', '/demo/diseases/fabry', '/demo/groups', '/demo/login'])(
    '%s はセッションが無くても素通し（200）',
    async (pathname) => {
      const response = await middleware(request(pathname))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    }
  )

  test('公開層ではセッションを確認しない（余計な問い合わせをしない）', async () => {
    await middleware(request('/demo/diseases'))
    expect(getUser).not.toHaveBeenCalled()
  })

  test('マジックリンクの戻り先 /demo/auth/callback は素通し（200）', async () => {
    const response = await middleware(request('/demo/auth/callback?code=abc'))
    expect(response.status).toBe(200)
  })

  test('/demo/communities のような別の経路を巻き込まない', async () => {
    const response = await middleware(request('/demo/communities'))
    expect(response.status).toBe(200)
  })

  test('Supabase が未設定なら、セッション無しとして 302（開けっ放しにしない）', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    loggedIn() // 呼ばれても関係なく閉じる
    const response = await middleware(request('/demo/community'))
    expect(response.status).toBe(302)
    expect(getUser).not.toHaveBeenCalled()
  })

  test('セッションの確認が失敗したときも 302（閉じる側に倒す）', async () => {
    getUser.mockRejectedValue(new Error('network'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const response = await middleware(request('/demo/community'))
    expect(response.status).toBe(302)
    spy.mockRestore()
  })

  test('既存の updateSession が止めた応答（Basic認証の 401）はそのまま返す', async () => {
    updateSession.mockResolvedValue(
      new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="RareDx"' },
      })
    )
    const response = await middleware(request('/demo/community'))
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="RareDx"')
  })
})

describe('robots.txt', () => {
  const rules = () => {
    const r = robots().rules
    return Array.isArray(r) ? r : [r]
  }
  const ruleFor = (userAgent: string) => rules().find((rule) => rule.userAgent === userAgent)!
  const asArray = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

  test('全クローラに対して /demo/community/ を Disallow', () => {
    expect(asArray(ruleFor('*').disallow)).toContain('/demo/community/')
  })

  test.each(['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot'])(
    '%s は /demo/ を Allow、/demo/community/ は Disallow',
    (userAgent) => {
      const rule = ruleFor(userAgent)
      expect(asArray(rule.allow)).toContain('/demo/')
      expect(asArray(rule.disallow)).toContain('/demo/community/')
    }
  )

  test('旧画面と内部経路の Disallow を落としていない', () => {
    const disallow = asArray(ruleFor('*').disallow)
    for (const path of ['/diagnosis', '/test-diagnosis', '/pharma', '/doctor', '/settings', '/api/', '/auth/']) {
      expect(disallow).toContain(path)
    }
  })
})

// 登録層の 2 画面は、検索から人が来る場所ではない。
// robots.txt だけに頼らず、ページ側にも検索避けを置いておく。
describe('登録層の検索避け（noindex）', () => {
  test('/demo/login', () => {
    const { metadata } = require('../login/layout')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  test('/demo/community', () => {
    const { metadata } = require('../community/page')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
