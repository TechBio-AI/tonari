// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モードの終了。閲覧用 cookie を消して入口へ戻す。POST だけを受ける（リンクの先読みで消えないように）。
// HTML のフォームから DELETE は送れないので、終了はこの POST に一本化している。
// DEMO_ACCESS_CODE が未設定なら 404（入口ごと無い扱い）。

import { NextResponse } from 'next/server'

import { DEMO_COOKIE_NAME, DEMO_COOKIE_PATH, getDemoAccessCode } from '../token'

export async function POST() {
  if (!getDemoAccessCode()) {
    return new NextResponse(null, { status: 404 })
  }

  // 303: POST の後は GET で入口へ戻す
  const response = new NextResponse(null, { status: 303, headers: { Location: '/demo/login' } })
  response.cookies.set(DEMO_COOKIE_NAME, '', { path: DEMO_COOKIE_PATH, maxAge: 0 })
  return response
}
