// 会の行事（会員エリア。/demo/community/[slug]/events）
//
// 会員だけ（../_lib/events.ts。会員でない人は会のお知らせのページへ）。
// 閲覧モードは見本の行事（../../_components/sample-group.ts の sampleEvents。DB は読まない。2026-10-04）。
// これからの行事（始まりの早い順）と過去の行事（新しい順）に分ける（lib/portal/group-events.ts の splitEvents）。
// 人数は出さない。世話人には作成・編集のページへの入口を出す。

import type { Metadata } from 'next'
import Link from 'next/link'

import { formatEventWhen, splitEvents, type GroupEvent } from '@/lib/portal/group-events'
import { listEvents } from '@/lib/portal/group-events-db'

import { groupPath } from '../_lib/access'
import { requireEventsViewAccess } from '../_lib/events'
import { SAMPLE_MARK, sampleEvents } from '../../_components/sample-group'
import { GroupShell } from '../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '行事',
  robots: { index: false, follow: false },
}

function EventList({ slug, events, empty }: { slug: string; events: GroupEvent[]; empty: string }) {
  if (events.length === 0) {
    return <p className="mt-4 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600">{empty}</p>
  }
  return (
    <ul className="mt-4 space-y-3">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={groupPath(slug, `/events/${e.id}`)} className="block rounded-2xl bg-white border border-stone-200 p-5 hover:border-orange-300">
            <p className="text-lg font-semibold text-stone-800">{e.title}</p>
            <p className="mt-1 text-base text-stone-600">{formatEventWhen(e)}</p>
            {e.place && <p className="mt-1 text-sm text-stone-500">{e.place}</p>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function EventsPage({ params }: { params: { slug: string } }) {
  const access = await requireEventsViewAccess(params.slug)
  const { group } = access
  const demo = access.mode === 'demo'
  let all: GroupEvent[]
  if (demo) {
    all = sampleEvents() // DEMO_ACCESS: 本番前に削除
  } else {
    const r = await listEvents(group.id)
    if (!r.ok) throw new Error('行事を読み込めませんでした')
    all = r.value
  }
  const { upcoming, past } = splitEvents(all, new Date())
  const moderator = access.mode === 'member' && access.role === 'moderator'

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={demo} moderator={moderator} showLeave={!demo} tab="events">
      {demo && <p className="mt-6 text-base font-semibold text-stone-700" data-sample-mark>行事{SAMPLE_MARK}</p>}
      {moderator && (
        <p className="mt-6">
          <Link href={groupPath(group.slug, '/manage/events')} className="text-base text-orange-700 hover:underline">
            行事を作る・直す（世話人）
          </Link>
        </p>
      )}
      <h2 className="mt-8 text-xl font-bold text-stone-800">これからの行事</h2>
      <EventList slug={group.slug} events={upcoming} empty="予定されている行事はありません。" />
      <h2 className="mt-10 text-xl font-bold text-stone-800">過去の行事</h2>
      <EventList slug={group.slug} events={past} empty="過去の行事はありません。" />
    </GroupShell>
  )
}
