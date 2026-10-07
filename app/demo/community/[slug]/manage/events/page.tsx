// 行事の作成と一覧（世話人。/demo/community/[slug]/manage/events）
//
// 世話人だけ（../../_lib/events.ts。一般の会員・会員でない人・閲覧モードは 404）。
// 行事を作る（「公開ページにも出す」は既定で入れない。./EventForm.tsx）。一覧から 1 件ずつ直す・削除する（./[id]）。
// 公開の印（is_public）は一覧にも出す（どれが公式ページに出るかを世話人が見落とさないように）。

import type { Metadata } from 'next'
import Link from 'next/link'

import { formatEventWhen, splitEvents } from '@/lib/portal/group-events'
import { listEvents } from '@/lib/portal/group-events-db'

import { groupPath } from '../../_lib/access'
import { requireEventsModeratorAccess } from '../../_lib/events'
import { EventsFlash } from '../../_components/EventsParts'
import { GroupShell } from '../../_components/GroupShell'
import { createEventAction } from './actions'
import { EMPTY_EVENT, EventForm } from './EventForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '行事を作る・直す',
  robots: { index: false, follow: false },
}

export default async function ManageEventsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const access = await requireEventsModeratorAccess(params.slug)
  const { group } = access
  const r = await listEvents(group.id)
  if (!r.ok) throw new Error('行事を読み込めませんでした')
  const { upcoming, past } = splitEvents(r.value, new Date())

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage">
      <EventsFlash params={searchParams} />

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">行事を作る</h2>
        <EventForm action={createEventAction.bind(null, group.slug)} initial={EMPTY_EVENT} submitLabel="行事を作る" />
      </section>

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">行事の一覧</h2>
        {[...upcoming, ...past].length === 0 ? (
          <p className="mt-4 text-base text-stone-600">行事はまだありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {[...upcoming, ...past].map((e) => (
              <li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-stone-800">
                    {e.title}
                    {e.isPublic && (
                      <span className="ml-2 rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-normal text-amber-900">公開ページにも出ています</span>
                    )}
                  </p>
                  <p className="text-sm text-stone-500">{formatEventWhen(e)}</p>
                </div>
                <Link href={groupPath(group.slug, `/manage/events/${e.id}`)} className="text-base text-orange-700 hover:underline">
                  直す・削除する
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base">
        <Link href={groupPath(group.slug, '/events')} className="text-orange-700 hover:underline">
          会員向けの行事のページを見る
        </Link>
        <Link href={groupPath(group.slug, '/manage')} className="text-orange-700 hover:underline">
          世話人のページにもどる
        </Link>
      </p>
    </GroupShell>
  )
}
