// 投稿 1 件のページ（/announcements/[id] と /threads/[id] の共通部分）
//
// 投稿は「この会の、この種類の一覧」の中から id で引く。別の会の投稿 id・別の種類の id は見つからず 404
// （会をまたいだ読み取りを、RLS とは別に画面側でも閉じる）。
//
// 削除のボタン: 世話人はその会の投稿・コメントすべて、それ以外の会員は自分が書いた分だけに出す。
// 本人かどうかはセッションの user id と author_id で見る（見せ方だけ。消せるかは DB 関数が確かめる）。
// 閲覧モードには出さない。
//
// 2026-10-02 に足したもの:
//   - 印: 分類（スレッド）・固定・公開ページにも表示（お知らせ）
//   - 固定のボタン（スレッドだけ。世話人だけ。pin_group_post）
//   - 通報のボタン（投稿・コメントごと。会員だけ。閲覧モードには出さない）。通報した人はどこにも出さない

import { notFound } from 'next/navigation'

import { isUuid, listComments, listPosts, type GroupComment, type GroupPost, type PostKind } from '@/lib/portal/tenancy'

import { sampleComments, samplePosts } from '../../_components/sample-group'
import { createCommentAction, deleteCommentAction, deletePostAction, pinPostAction, reportAction } from '../actions'
import { groupPath, requireMemberAccess } from '../_lib/access'
import { POST_CATEGORY_LABELS, postMeta } from '../_lib/community'
import { GroupShell, type FlashParams } from './GroupShell'
import { PostDetail } from './Posts'

export async function PostPage({
  params,
  kind,
  searchParams,
}: {
  params: { slug: string; id: string }
  kind: PostKind
  searchParams?: FlashParams
}) {
  const access = await requireMemberAccess(params.slug)
  const { group } = access
  const base = kind === 'announcement' ? 'announcements' : 'threads'
  const id = decodeURIComponent(params.id)

  let post: GroupPost | undefined
  let comments: GroupComment[]
  if (access.mode === 'demo') {
    // DEMO_ACCESS: 本番前に削除
    post = samplePosts(kind).find((p) => p.id === id)
    if (!post) notFound()
    comments = sampleComments(post.id)
  } else {
    if (!isUuid(id)) notFound()
    const posts = await listPosts(group.id, kind)
    if (!posts.ok) throw new Error('投稿を読み込めませんでした')
    post = posts.value.find((p) => p.id === id)
    if (!post) notFound()
    const c = await listComments(post.id)
    if (!c.ok) throw new Error('コメントを読み込めませんでした')
    comments = c.value
  }

  const meta = access.mode === 'member' ? await postMeta(post.id) : null
  const moderator = access.mode === 'member' && access.role === 'moderator'
  const member = access.mode === 'member'
  const badges: string[] = []
  if (meta && kind === 'thread') badges.push(POST_CATEGORY_LABELS[meta.category])
  if (meta?.pinned && kind === 'thread') badges.push('固定')
  if (meta?.isPublic && kind === 'announcement') badges.push('公開ページにも表示')

  // authorId が null（アカウントが消された書き手）は本人扱いにしない。世話人だけが消せる
  const canDelete = (authorId: string | null) =>
    access.mode === 'member' &&
    (access.role === 'moderator' || (access.userId !== null && authorId !== null && authorId === access.userId))

  return (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={access.mode === 'demo'}
      moderator={access.mode === 'member' && access.role === 'moderator'}
      showLeave={access.mode === 'member'}
      tab={kind === 'announcement' ? 'announcements' : 'threads'}
      flash={searchParams}
    >
      <PostDetail
        post={post}
        comments={comments}
        backHref={kind === 'announcement' ? groupPath(group.slug, '/announcements') : groupPath(group.slug, '/threads')}
        backLabel={kind === 'announcement' ? 'お知らせの一覧にもどる' : '掲示板にもどる'}
        commentAction={access.mode === 'member' ? createCommentAction.bind(null, group.slug, base, post.id) : undefined}
        deletePost={canDelete(post.authorId) ? deletePostAction.bind(null, group.slug, base, post.id) : undefined}
        deleteCommentFor={(c) =>
          canDelete(c.authorId) ? deleteCommentAction.bind(null, group.slug, base, post.id, c.id) : undefined
        }
        badges={badges}
        reportPost={member ? reportAction.bind(null, group.slug, base, post.id, null) : undefined}
        reportCommentFor={(c) => (member ? reportAction.bind(null, group.slug, base, post.id, c.id) : undefined)}
        postControls={
          moderator && kind === 'thread' && meta ? (
            <form action={pinPostAction.bind(null, group.slug, post.id, !meta.pinned)} className="mt-4" data-pin>
              <button
                type="submit"
                className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
              >
                {meta.pinned ? '固定を外す' : 'このスレッドを固定する'}
              </button>
            </form>
          ) : undefined
        }
      />
    </GroupShell>
  )
}
