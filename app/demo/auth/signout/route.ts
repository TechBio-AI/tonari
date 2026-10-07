// ログアウト。POST だけを受ける（リンクの先読みで消えてしまわないように）。
//
// 戻り先は相対パスで返す。理由は callback/route.ts の冒頭と同じ。

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('signOut に失敗しました:', err)
  }

  // 303: POST の後は GET で入口へ戻す
  return new NextResponse(null, { status: 303, headers: { Location: '/demo/login' } })
}
