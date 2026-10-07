// TEST_PASSWORD_LOGIN: 本番前に削除（docs/REMOVE_BEFORE_PRODUCTION.md）
//
// テスト用ログイン（メールとパスワード）の受付。プロダクトデモ用（ローカル）。
// フォーム（email・password）を POST で受け、lib/portal/password-login.ts の signInWithPassword を呼ぶ。
// 成功したら登録層（/demo/community）へ、失敗したら /demo/login?password_error=1 へ 303 で送る。
// 環境変数 TEST_PASSWORD_LOGIN が 'on' でなければ 404（入口ごと無い扱い）。
//
// 戻り先は相対パスで返す。理由は ../callback/route.ts の冒頭と同じ。
// 別のサイトから送られたフォーム（Origin がこのホストと違う）は 403 にする（ログインの CSRF 対策）。

import { NextResponse, type NextRequest } from 'next/server'

import { isPasswordLoginEnabled, signInWithPassword } from '@/lib/portal/password-login'

// 303: 戻り先は GET で開かせる
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } })
}

/** Origin ヘッダがあれば、このリクエストの Host と一致するか。無いとき（古いブラウザ等）は通す */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const host = request.headers.get('host')
  try {
    return host !== null && new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!isPasswordLoginEnabled()) {
    return new NextResponse(null, { status: 404 })
  }
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403 })
  }

  let email: unknown = null
  let password: unknown = null
  try {
    const form = await request.formData()
    email = form.get('email')
    password = form.get('password')
  } catch {
    // フォーム以外で来たときは入力なしとして扱う
  }

  const result = await signInWithPassword(email, password)
  return redirectTo(result.ok ? '/demo/community' : '/demo/login?password_error=1')
}
