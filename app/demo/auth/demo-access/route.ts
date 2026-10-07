// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧コードを受け取り、合っていれば署名付きの閲覧用 cookie を渡して会員向けページの見本へ送る。
// DEMO_ACCESS_CODE が未設定なら 404（入口ごと無い扱い）。
//
// 戻り先は相対パスで返す。理由は ../callback/route.ts の冒頭と同じ。

import { NextResponse, type NextRequest } from 'next/server'

import {
  DEMO_COOKIE_MAX_AGE,
  DEMO_COOKIE_NAME,
  DEMO_COOKIE_PATH,
  codesMatch,
  getDemoAccessCode,
  getDemoSigningSecret,
  signDemoToken,
} from './token'

// 303: 戻り先は GET で開かせる
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } })
}

export async function POST(request: NextRequest) {
  const expected = getDemoAccessCode()
  const secret = getDemoSigningSecret()
  if (!expected || !secret) {
    return new NextResponse(null, { status: 404 })
  }

  let input = ''
  try {
    const form = await request.formData()
    const value = form.get('code')
    input = typeof value === 'string' ? value.trim() : ''
  } catch {
    // フォーム以外で来たときは不一致として扱う
  }

  if (!(await codesMatch(input, expected))) {
    return redirectTo('/demo/login?demo_error=1')
  }

  const exp = Math.floor(Date.now() / 1000) + DEMO_COOKIE_MAX_AGE
  const response = redirectTo('/demo/community')
  response.cookies.set(DEMO_COOKIE_NAME, await signDemoToken(exp, secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: DEMO_COOKIE_PATH,
    maxAge: DEMO_COOKIE_MAX_AGE,
  })
  return response
}
