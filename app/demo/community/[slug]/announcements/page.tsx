// お知らせの一覧（会員エリア。/demo/community/[slug]/announcements）
//
// 2026-10-02 にホーム（../page.tsx）から分けた。会員と閲覧モードの見本だけ（会員でない人は会のホームへ）。
// 新しい順。公開ページにも出しているものには印を付ける（世話人が「公開ページにも出す」としたもの）。

import type { Metadata } from 'next'

import type { GroupPost } from '@/lib/portal/tenancy'

import { samplePosts } from '../../_components/sample-group'
import { groupPath, requireMemberAccess } from '../_lib/access'
import { listPostsWithMeta } from '../_lib/community'
import { GroupShell, NO_ANNOUNCEMENTS, type FlashParams } from '../_components/GroupShell'
import { PostList } from '../_components/Posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'お知らせ',
  robots: { index: false, follow: false },
}

export default async function AnnouncementsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: FlashParams
}) {
  const access = await requireMemberAccess(params.slug)
  const { group } = access
  let posts: (GroupPost & { isPublic?: boolean })[]
  if (access.mode === 'demo') {
    posts = samplePosts('announcement') // DEMO_ACCESS: 本番前に削除
  } else {
    const r = await listPostsWithMeta(group.id, 'announcement')
    if (!r.ok) throw new Error('お知らせを読み込めませんでした')
    // お知らせは固定を使わないので、新しい順のまま
    posts = [...r.value].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }

  return (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={access.mode === 'demo'}
      moderator={access.mode === 'member' && access.role === 'moderator'}
      showLeave={access.mode === 'member'}
      tab="announcements"
      flash={searchParams}
    >
      <h2 className="mt-8 text-xl font-bold text-stone-800">お知らせ</h2>
      <PostList
        posts={posts}
        hrefOf={(p) => groupPath(group.slug, `/announcements/${p.id}`)}
        empty={NO_ANNOUNCEMENTS}
        badgesOf={(p) => ((p as { isPublic?: boolean }).isPublic ? ['公開ページにも表示'] : [])}
      />
    </GroupShell>
  )
}
