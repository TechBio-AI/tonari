// 掲示板（会員エリア。/demo/community/[slug]/threads）
//
// スレッドの一覧（新しい順）と、新しいスレッドを立てるフォーム。会員でなければ会のお知らせのページへ送る。
// 閲覧モード（demo）は見本のスレッドだけ（フォームは出さない）。
//
// 分類（2026-10-02。日常の工夫／制度と手続き／通院と治療の経験／家族のこと／その他）:
//   立てるときに選ぶ（選ばなければ「その他」）。一覧は ?category= で絞り込める（知らない値は「すべて」扱い）。
//   固定（世話人が固定したもの）を一覧の先に出す。固定・外すのはスレッドのページ（世話人だけ）。

import type { Metadata } from 'next'
import Link from 'next/link'

import { POST_BODY_MAX, POST_TITLE_MAX, type GroupPost } from '@/lib/portal/tenancy'

import { samplePosts } from '../../_components/sample-group'
import { createThreadAction } from '../actions'
import { groupPath, requireMemberAccess } from '../_lib/access'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, isPostCategory, listPostsWithMeta, type GroupPostWithMeta } from '../_lib/community'
import { GroupShell, NO_THREADS, TAB_IDLE_CLASS, TAB_SELECTED_CLASS, type FlashParams } from '../_components/GroupShell'
import { PostList, buttonClass, inputClass } from '../_components/Posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '掲示板',
  robots: { index: false, follow: false },
}

export default async function ThreadsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: FlashParams & { category?: string | string[] }
}) {
  const access = await requireMemberAccess(params.slug)
  const { group } = access

  const rawCategory = typeof searchParams?.category === 'string' ? searchParams.category : undefined
  const category = isPostCategory(rawCategory) ? rawCategory : null

  let threads: GroupPost[]
  let all: GroupPostWithMeta[] = []
  if (access.mode === 'demo') {
    threads = samplePosts('thread') // DEMO_ACCESS: 本番前に削除（見本には分類が無いので絞り込まない）
  } else {
    const r = await listPostsWithMeta(group.id, 'thread')
    if (!r.ok) throw new Error('掲示板を読み込めませんでした')
    all = r.value
    threads = category ? all.filter((t) => t.category === category) : all
  }
  const metaOf = (p: GroupPost) => all.find((t) => t.id === p.id)

  return (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={access.mode === 'demo'}
      moderator={access.mode === 'member' && access.role === 'moderator'}
      showLeave={access.mode === 'member'}
      tab="threads"
      flash={searchParams}
    >
      <h2 className="mt-8 text-xl font-bold text-stone-800">掲示板</h2>
      <p className="mt-2 text-base text-stone-600 leading-relaxed">この会の会員だけが読める場所です。</p>
      {access.mode === 'member' && (
        <nav aria-label="分類で絞り込む" className="mt-5 flex flex-wrap gap-2 text-sm" data-category-filter>
          {[null, ...POST_CATEGORIES].map((c) => {
            const active = c === category
            return (
              <Link
                key={c ?? 'all'}
                href={c ? `${groupPath(group.slug, '/threads')}?category=${c}` : groupPath(group.slug, '/threads')}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl border px-3 py-1.5 ${active ? TAB_SELECTED_CLASS : TAB_IDLE_CLASS}`}
              >
                {c ? POST_CATEGORY_LABELS[c] : 'すべて'}
              </Link>
            )
          })}
        </nav>
      )}
      <PostList
        posts={threads}
        hrefOf={(p) => groupPath(group.slug, `/threads/${p.id}`)}
        empty={category ? 'この分類のスレッドはまだありません。' : NO_THREADS}
        badgesOf={(p) => {
          const m = metaOf(p)
          if (!m) return []
          return [...(m.pinned ? ['固定'] : []), POST_CATEGORY_LABELS[m.category]]
        }}
      />

      {access.mode === 'member' && (
        <form action={createThreadAction.bind(null, group.slug)} className="mt-10 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-stone-800">新しいスレッドを立てる</h3>
          <label htmlFor="thread-title" className="mt-4 block text-base font-semibold text-stone-800">
            題
          </label>
          <input id="thread-title" name="title" type="text" required maxLength={POST_TITLE_MAX} className={inputClass} />
          <label htmlFor="thread-body" className="mt-4 block text-base font-semibold text-stone-800">
            本文
          </label>
          <textarea id="thread-body" name="body" required maxLength={POST_BODY_MAX} rows={6} className={inputClass} />
          <label htmlFor="thread-category" className="mt-4 block text-base font-semibold text-stone-800">
            分類
          </label>
          <select id="thread-category" name="category" defaultValue={category ?? 'other'} className={inputClass}>
            {POST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {POST_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-stone-500">
            この会の会員だけが読めます。本名や連絡先は書かなくてかまいません。
          </p>
          <button type="submit" className={`mt-4 ${buttonClass}`}>
            スレッドを立てる
          </button>
        </form>
      )}
    </GroupShell>
  )
}
