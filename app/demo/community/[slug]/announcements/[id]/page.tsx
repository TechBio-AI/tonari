// お知らせ 1 件とコメント（会員エリア）。組み立ては ../../_components/PostPage.tsx

import type { Metadata } from 'next'

import { PostPage } from '../../_components/PostPage'
import type { FlashParams } from '../../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'お知らせ',
  robots: { index: false, follow: false },
}

export default async function AnnouncementPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams?: FlashParams
}) {
  return PostPage({ params, kind: 'announcement', searchParams })
}
