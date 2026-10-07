// マジックリンクの戻り先。code をセッションに交換して登録層へ送る。
//
// 生成の仕方は既存の app/auth/callback/route.ts に合わせている（lib/supabase/server）。
// 監査ログはここでは書かない（会員まわりのテーブルを作らない範囲に留めるため）。
//
// 戻り先は相対パスで返す。絶対 URL を組み立てると、どのホストに戻すかを決める必要が出る。
// request.url のオリジンは踏んだホストと食い違うことがあり（127.0.0.1 で開いても localhost を返す）、
// cookie はホスト単位なので、食い違うと発行したセッションが次のリクエストに乗らない。
// かといって Host ヘッダから組み立てると、戻り先を外から差し替えられる形になる。
// 相対パスなら、ブラウザが「いま見ているホスト」で解決するので、どちらの問題も起きない。

import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { WISH_NEXT_COOKIE, wishNextPath } from '../../wish/_lib/targets'

// 303: 戻り先は GET で開かせる
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } })
}

// 参加希望（/demo/wish/[idx]）から送ったマジックリンクなら、その画面へ戻す（2026-10-02）。
// 戻り先は cookie の idx から組み立てる（対象の病気の idx だけ。任意の URL へは戻さない）。cookie は使ったら消す。
function clearWishCookie(res: NextResponse): NextResponse {
  res.cookies.set(WISH_NEXT_COOKIE, '', { path: '/demo', maxAge: 0 })
  return res
}

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')

  if (code) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        // 参加希望（機能フラグ WISHES）が閉じていれば、参加希望の画面へは戻さない
        const wish = isFeatureEnabled('WISHES') ? wishNextPath(request.cookies.get(WISH_NEXT_COOKIE)?.value) : null
        return wish ? clearWishCookie(redirectTo(wish)) : redirectTo('/demo/community')
      }
      // 画面には出さない。理由はログにだけ残す
      console.error('exchangeCodeForSession に失敗しました:', error)
    } catch (err) {
      console.error('exchangeCodeForSession で例外が発生しました:', err)
    }
  }

  return redirectTo('/demo/login?error=1')
}
