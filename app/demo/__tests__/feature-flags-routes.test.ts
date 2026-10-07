/**
 * @jest-environment node
 *
 * 機能フラグ WISHES（既定 off）の、Route Handler の分の検査
 *   - 人数の読み込み口 /demo/wish/counts は off なら 404（人数を出さない）
 *   - マジックリンクの戻り先は、off なら参加希望の画面へは戻さない（今までどおり /demo/community）
 */
const exchangeCodeForSession = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession: (c: string) => exchangeCodeForSession(c) } }),
}))
const fetchPublicWishCounts = jest.fn()
jest.mock('../wish/_lib/wishes', () => ({ fetchPublicWishCounts: () => fetchPublicWishCounts() }))

import { NextRequest } from 'next/server'

import { GET as countsGET } from '../wish/counts/route'
import { GET as callbackGET } from '../auth/callback/route'
import { WISH_NEXT_COOKIE } from '../wish/_lib/targets'

const SAVED = process.env.WISHES
afterAll(() => {
  if (SAVED === undefined) delete process.env.WISHES
  else process.env.WISHES = SAVED
})
beforeEach(() => {
  delete process.env.WISHES
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  fetchPublicWishCounts.mockReset().mockResolvedValue(new Map([[4, '10未満']]))
})

test('off: 人数の読み込み口は 404（DB を読まない）。on なら返す', async () => {
  let res = await countsGET()
  expect(res.status).toBe(404)
  expect(fetchPublicWishCounts).not.toHaveBeenCalled()
  process.env.WISHES = 'on'
  res = await countsGET()
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ counts: { '4': '10未満' } })
})

test('off: 戻り先の cookie があっても、参加希望の画面へは戻さない。on なら戻す', async () => {
  const req = () => {
    const r = new NextRequest('http://localhost:3000/demo/auth/callback?code=abc')
    r.cookies.set(WISH_NEXT_COOKIE, '4')
    return r
  }
  expect((await callbackGET(req())).headers.get('location')).toBe('/demo/community')
  process.env.WISHES = 'on'
  expect((await callbackGET(req())).headers.get('location')).toBe('/demo/wish/4')
})
