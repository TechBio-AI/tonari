// 病気ごとの「参加を待っている方」の人数（GET /demo/wish/counts。/demo/groups の画面が読む）
//
// public_wish_counts を anon で読み、{ counts: { "<idx>": "<n>" } } で返す。n は文字のまま（'10未満' を数に直さない）。
// 個人の情報は含まない（病気ごとの人数だけ）。600 秒ごとに作り直す。読めないときは空。

import { NextResponse } from 'next/server'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { fetchPublicWishCounts } from '../_lib/wishes'

export const revalidate = 600

export async function GET() {
  // 機能フラグ WISHES（既定 off）が on でなければ 404（人数も出さない）
  if (!isFeatureEnabled('WISHES')) return new NextResponse(null, { status: 404 })
  const counts = await fetchPublicWishCounts()
  return NextResponse.json({ counts: Object.fromEntries([...counts].map(([k, v]) => [String(k), v])) })
}
