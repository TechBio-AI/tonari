/**
 * @jest-environment node
 *
 * マジックリンクの戻り先（/demo/auth/callback）の、参加希望の画面へ戻す分の検査
 *   - 参加希望の画面から送ったもの（cookie に対象の idx）なら /demo/wish/[idx] へ戻し、cookie を消す
 *   - cookie が無い・対象外の値なら、今までどおり /demo/community へ（任意の URL へは戻さない）
 */
const exchangeCodeForSession = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession: (c: string) => exchangeCodeForSession(c) } }),
}))

import { NextRequest } from 'next/server'

import { GET } from '../auth/callback/route'
import { WISH_NEXT_COOKIE } from '../wish/_lib/targets'

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


function req(cookie?: string) {
  const r = new NextRequest('http://localhost:3000/demo/auth/callback?code=abc')
  if (cookie !== undefined) r.cookies.set(WISH_NEXT_COOKIE, cookie)
  return r
}

beforeEach(() => {
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
})

test('参加希望から送ったリンクなら、その病気の画面へ戻し、cookie を消す', async () => {
  const res = await GET(req('4'))
  expect(res.status).toBe(303)
  expect(res.headers.get('location')).toBe('/demo/wish/4')
  expect(res.headers.get('set-cookie')).toMatch(new RegExp(`${WISH_NEXT_COOKIE}=;.*Max-Age=0`, 'i'))
})

test.each([undefined, '', '999999', '../../evil', 'https://evil.example'])('cookie が %p なら今までどおり /demo/community', async (v) => {
  const res = await GET(req(v))
  expect(res.headers.get('location')).toBe('/demo/community')
})

test('交換に失敗したら、cookie があってもログイン画面へ', async () => {
  exchangeCodeForSession.mockResolvedValue({ error: { message: 'x' } })
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  const res = await GET(req('4'))
  expect(res.headers.get('location')).toBe('/demo/login?error=1')
  spy.mockRestore()
})
