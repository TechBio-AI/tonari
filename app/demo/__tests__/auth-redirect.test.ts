/**
 * @jest-environment node
 *
 * 認証の戻り先が、相対パスであることの検査。
 *
 * 絶対 URL を組み立てると、どのホストに戻すかを決めなければならない。
 * request.url のオリジンは踏んだホストと食い違うことがあり（127.0.0.1:3000 で開いても
 * localhost:3000 を返す）、cookie はホスト単位なので、食い違うと発行したばかりの
 * セッションが次のリクエストに乗らない。かといって Host ヘッダから組み立てると、
 * 戻り先を外から差し替えられる形になる。
 *
 * 相対パスなら、ブラウザが「いま見ているホスト」で解決する。
 * ここでは「Location が相対パスで、Host にも x-forwarded-host にも影響されないこと」だけを見る。
 */
import { NextRequest } from 'next/server'

const exchangeCodeForSession = jest.fn()
const signOut = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession, signOut } }),
}))

// モックを定義してから読み込む
import { GET } from '@/app/demo/auth/callback/route'
import { POST } from '@/app/demo/auth/signout/route'

// request.url は localhost、実際に踏んだのは headers の Host、という食い違いを作る
function callbackRequest(headers: Record<string, string> = {}, query = '?code=abc') {
  return new NextRequest(`http://localhost:3000/demo/auth/callback${query}`, { headers })
}

// 「//evil.example.com」のような、ホストとして解釈されうる形になっていないこと
function expectRelative(location: string | null) {
  expect(location).not.toBeNull()
  expect(location!.startsWith('/')).toBe(true)
  expect(location!.startsWith('//')).toBe(false)
  expect(location).not.toMatch(/^https?:/)
}

// 戻り先を揺さぶろうとするヘッダの組み合わせ
const HOST_HEADERS: Array<[string, Record<string, string>]> = [
  ['Host のみ', { host: '127.0.0.1:3000' }],
  ['別ホストの Host', { host: 'evil.example.com' }],
  [
    'x-forwarded-host / proto 付き',
    { host: '127.0.0.1:3000', 'x-forwarded-host': 'evil.example.com', 'x-forwarded-proto': 'https' },
  ],
  ['ヘッダ無し', {}],
]

describe('マジックリンクの戻り先（/demo/auth/callback）', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    signOut.mockReset()
    exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  test.each(HOST_HEADERS)(
    '交換に成功したら /demo/community へ相対パスで戻す（%s に影響されない）',
    async (_name, headers) => {
      const response = await GET(callbackRequest(headers))
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe('/demo/community')
      expectRelative(response.headers.get('location'))
    }
  )

  test.each(HOST_HEADERS)(
    '交換に失敗したら /demo/login?error=1 へ相対パスで戻す（%s に影響されない）',
    async (_name, headers) => {
      exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid' } })
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const response = await GET(callbackRequest(headers))
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe('/demo/login?error=1')
      expectRelative(response.headers.get('location'))
      spy.mockRestore()
    }
  )

  test('code が無いときも入口へ戻す（交換を試みない）', async () => {
    const response = await GET(callbackRequest({ host: '127.0.0.1:3000' }, ''))
    expect(response.headers.get('location')).toBe('/demo/login?error=1')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  test('交換で例外が出ても、入口へ戻す（画面に理由を出さない）', async () => {
    exchangeCodeForSession.mockRejectedValue(new Error('network'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET(callbackRequest({ host: '127.0.0.1:3000' }))
    expect(response.headers.get('location')).toBe('/demo/login?error=1')
    spy.mockRestore()
  })
})

describe('ログアウトの戻り先（/demo/auth/signout）', () => {
  beforeEach(() => {
    signOut.mockReset()
    signOut.mockResolvedValue({ error: null })
  })

  test('入口へ相対パスで 303 で戻す', async () => {
    const response = await POST()
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/demo/login')
    expectRelative(response.headers.get('location'))
  })
})
