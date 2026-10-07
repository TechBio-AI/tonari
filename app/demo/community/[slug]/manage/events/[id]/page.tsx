// 行事を直す・削除する（世話人。/demo/community/[slug]/manage/events/[id]）
//
// 世話人だけ（../../../_lib/events.ts。一般の会員・会員でない人・閲覧モードは 404）。別の会の行事 id は 404。
// 削除は確認のチェックを入れたときだけ（DB 関数 delete_group_event）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { isoToJstLocal } from '@/lib/portal/group-events'
import { getEvent } from '@/lib/portal/group-events-db'

import { groupPath } from '../../../_lib/access'
import { requireEventsModeratorAccess } from '../../../_lib/events'
import { DeleteForm, EventsFlash } from '../../../_components/EventsParts'
import { GroupShell } from '../../../_components/GroupShell'
import { deleteEventAction, updateEventAction } from '../actions'
import { EventForm } from '../EventForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '行事を直す',
  robots: { index: false, follow: false },
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const access = await requireEventsModeratorAccess(params.slug)
  const { group } = access
  const r = await getEvent(group.id, params.id)
  if (!r.ok) {
    if (r.reason === 'not_found' || r.reason === 'invalid_input') notFound()
    throw new Error('行事を読み込めませんでした')
  }
  const e = r.value

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage">
      <Link href={groupPath(group.slug, '/manage/events')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        行事の一覧にもどる
      </Link>
      <EventsFlash params={searchParams} />

      <section className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">行事を直す</h2>
        <EventForm
          action={updateEventAction.bind(null, group.slug, e.id)}
          initial={{
            title: e.title,
            body: e.body,
            startsAt: isoToJstLocal(e.startsAt),
            endsAt: isoToJstLocal(e.endsAt),
            place: e.place ?? '',
            onlineUrl: e.onlineUrl ?? '',
            isPublic: e.isPublic,
          }}
          submitLabel="直した内容を保存する"
        />
      </section>

      <DeleteForm
        action={deleteEventAction.bind(null, group.slug, e.id)}
        label="この行事を削除する"
        note="削除すると、会員の参加の予定も一緒に消え、元に戻せません。公開ページに出していた場合は、そこからも消えます。"
      />
    </GroupShell>
  )
}
