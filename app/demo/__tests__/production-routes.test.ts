/**
 * @jest-environment node
 *
 * 本番で出す面の境界（middleware.ts。2026-09-26 ファウンダー指示）
 *
 * 本番に出すのは『となり』（/demo/**）だけ。旧画面と旧 API は 404 にする。
 * utils/supabase/middleware.ts の updateSession は差し替えている（その中身には触れていない）。
 *
 * 止めた経路では updateSession を呼ばないことも確かめる。
 * 旧コード（Basic 認証・profiles のロール読み取り）を本番で動かさないため。
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

import { middleware } from '@/middleware'

function request(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

/** NODE_ENV は読み取り専用の扱いなので、定義し直して入れ替える */
function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true, writable: true })
}

/** チェックリスト 1 に挙がっていた旧画面と旧 API */
const LEGACY_PATHS = [
  '/diagnosis',
  '/diagnosis/results',
  '/pharma',
  '/pharma/dashboard',
  '/doctor',
  '/doctor/followups',
  '/settings',
  '/articles',
  '/test-diagnosis',
  '/api/llm-analyze',
  '/api/diagnosis',
  '/auth/callback',
]

/** 本番でも出す面 */
const KEPT_PATHS = [
  '/demo',
  '/demo/',
  '/demo/diseases',
  '/demo/diseases/fabry',
  '/demo/groups',
  '/demo/about',
  '/demo/login',
  '/demo/auth/callback',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/globe.svg',
  '/_next/data/abc/demo.json',
]

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  updateSession.mockReset()
  getUser.mockReset()
  updateSession.mockResolvedValue(NextResponse.next())
  getUser.mockResolvedValue({ data: { user: null }, error: null })
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  delete process.env.LEGACY_ROUTES
})

afterEach(() => {
  setNodeEnv(ORIGINAL_ENV.NODE_ENV ?? 'test')
  process.env = { ...ORIGINAL_ENV }
})

describe('本番（NODE_ENV=production）', () => {
  beforeEach(() => setNodeEnv('production'))

  test.each(LEGACY_PATHS)('%s は 404', async (pathname) => {
    const response = await middleware(request(pathname))
    expect(response.status).toBe(404)
  })

  test.each(KEPT_PATHS)('%s は素通し（200）', async (pathname) => {
    const response = await middleware(request(pathname))
    expect(response.status).toBe(200)
  })

  test('止めた経路では updateSession を呼ばない（旧コードを動かさない）', async () => {
    await middleware(request('/api/llm-analyze'))
    expect(updateSession).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })

  test('通す経路では今までどおり updateSession を通す', async () => {
    await middleware(request('/demo/diseases'))
    expect(updateSession).toHaveBeenCalledTimes(1)
  })

  test('許可は前方一致で、似た名前を巻き込まない', async () => {
    // /demo で始まるだけの別経路は通さない
    expect((await middleware(request('/demoted'))).status).toBe(404)
    expect((await middleware(request('/api/demo'))).status).toBe(404)
  })

  test('知らない経路は既定で 404（許可制。新しい旧画面が足されても出ない）', async () => {
    expect((await middleware(request('/whatever'))).status).toBe(404)
    expect((await middleware(request('/api/新しいもの'))).status).toBe(404)
  })

  test('404 の本文は日本語で、中身を明かさない', async () => {
    const response = await middleware(request('/pharma/dashboard'))
    expect(await response.text()).toBe('このページはありません。')
    expect(response.headers.get('content-type')).toContain('charset=utf-8')
  })

  test('/demo/community の判定は変えていない（セッション無しは /demo/login へ 302）', async () => {
    const response = await middleware(request('/demo/community'))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('http://localhost:3000/demo/login')
  })

  test('updateSession が止めた応答（401）はそのまま返す', async () => {
    updateSession.mockResolvedValue(new NextResponse('Unauthorized', { status: 401 }))
    expect((await middleware(request('/demo'))).status).toBe(401)
  })
})

describe('LEGACY_ROUTES=on（旧パスを開ける）', () => {
  beforeEach(() => {
    setNodeEnv('production')
    process.env.LEGACY_ROUTES = 'on'
  })

  test.each(LEGACY_PATHS)('%s は通る（200）', async (pathname) => {
    const response = await middleware(request(pathname))
    expect(response.status).toBe(200)
  })

  test.each(KEPT_PATHS)('%s も今までどおり通る', async (pathname) => {
    expect((await middleware(request(pathname))).status).toBe(200)
  })

  test('/demo/community の判定は変わらない', async () => {
    expect((await middleware(request('/demo/community'))).status).toBe(302)
  })

  test.each(['', 'off', 'ON', 'true', '1'])('LEGACY_ROUTES=%p では開かない（on ちょうどだけ）', async (value) => {
    process.env.LEGACY_ROUTES = value
    expect((await middleware(request('/diagnosis'))).status).toBe(404)
  })
})

describe('本番以外（開発・テスト）', () => {
  test.each(['development', 'test'])('NODE_ENV=%s では旧パスを止めない', async (env) => {
    setNodeEnv(env)
    for (const pathname of LEGACY_PATHS) {
      expect((await middleware(request(pathname))).status).toBe(200)
    }
  })
})
