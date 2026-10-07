// 資料・リンクの作成と一覧（世話人。/demo/community/[slug]/manage/links）
//
// 世話人だけ（../../_lib/events.ts。一般の会員・会員でない人・閲覧モードは 404）。
// リンクを足す。一覧から 1 件ずつ直す・削除する（./[id]）。

import type { Metadata } from 'next'
import Link from 'next/link'

import { listLinks } from '@/lib/portal/group-events-db'

import { groupPath } from '../../_lib/access'
import { requireEventsModeratorAccess } from '../../_lib/events'
import { EventsFlash } from '../../_components/EventsParts'
import { GroupShell } from '../../_components/GroupShell'
import { createLinkAction } from './actions'
import { LinkFields } from './LinkFields'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'リンクを足す・直す',
  robots: { index: false, follow: false },
}

export default async function ManageLinksPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const access = await requireEventsModeratorAccess(params.slug)
  const { group } = access
  const r = await listLinks(group.id)
  if (!r.ok) throw new Error('リンクを読み込めませんでした')

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage">
      <EventsFlash params={searchParams} />

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">リンクを足す</h2>
        <form action={createLinkAction.bind(null, group.slug)}>
          <LinkFields initial={{ title: '', url: '', note: '' }} />
          <button type="submit" className="mt-6 rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
            リンクを足す
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">リンクの一覧</h2>
        {r.value.length === 0 ? (
          <p className="mt-4 text-base text-stone-600">リンクはまだありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {r.value.map((l) => (
              <li key={l.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-stone-800">{l.title}</p>
                  <p className="text-sm text-stone-500 break-all">{l.url}</p>
                </div>
                <Link href={groupPath(group.slug, `/manage/links/${l.id}`)} className="text-base text-orange-700 hover:underline">
                  直す・削除する
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base">
        <Link href={groupPath(group.slug, '/links')} className="text-orange-700 hover:underline">
          会員向けの資料・リンクのページを見る
        </Link>
        <Link href={groupPath(group.slug, '/manage')} className="text-orange-700 hover:underline">
          世話人のページにもどる
        </Link>
      </p>
    </GroupShell>
  )
}
