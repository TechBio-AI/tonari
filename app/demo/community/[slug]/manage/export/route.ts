// 書き出し（世話人のページから。GET /demo/community/[slug]/manage/export）
//
// 世話人以外・閲覧モード・会が無い slug は 404（中身を明かさない）。未ログインは /demo/login へ。
// 中身は DB 関数 export_group がそのまま作る（投稿・コメント・会員の表示名。本名と user_id は入らない）。
// ファイルの中身はログに出さない。

import { NextResponse } from 'next/server'

import { exportGroup, listGroups } from '@/lib/portal/tenancy'

import { getViewer } from '../../../../_lib/session'

export const dynamic = 'force-dynamic'

const notFound = () => new NextResponse('ページが見つかりません', { status: 404 })

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const viewer = await getViewer()
  if (!viewer) return new NextResponse(null, { status: 302, headers: { Location: '/demo/login' } })
  if (viewer.kind !== 'member') return notFound() // DEMO_ACCESS: 閲覧モードは書き出せない

  const slug = decodeURIComponent(params.slug)
  const groups = await listGroups()
  const group = groups.ok ? groups.value.find((g) => g.slug === slug) : undefined
  if (!group) return notFound()

  const r = await exportGroup(group.id)
  if (!r.ok) {
    if (r.reason === 'failed') return new NextResponse('うまくいきませんでした', { status: 500 })
    return notFound()
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(r.value, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${group.slug}-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
