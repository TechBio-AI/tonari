// リンクを直す・削除する（世話人。/demo/community/[slug]/manage/links/[id]）
//
// 世話人だけ（../../../_lib/events.ts。一般の会員・会員でない人・閲覧モードは 404）。別の会のリンク id は 404。
// 削除は確認のチェックを入れたときだけ（DB 関数 delete_group_link）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getLink } from '@/lib/portal/group-events-db'

import { groupPath } from '../../../_lib/access'
import { requireEventsModeratorAccess } from '../../../_lib/events'
import { DeleteForm, EventsFlash } from '../../../_components/EventsParts'
import { GroupShell } from '../../../_components/GroupShell'
import { deleteLinkAction, updateLinkAction } from '../actions'
import { LinkFields } from '../LinkFields'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'リンクを直す',
  robots: { index: false, follow: false },
}

export default async function EditLinkPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const access = await requireEventsModeratorAccess(params.slug)
  const { group } = access
  const r = await getLink(group.id, params.id)
  if (!r.ok) {
    if (r.reason === 'not_found' || r.reason === 'invalid_input') notFound()
    throw new Error('リンクを読み込めませんでした')
  }
  const l = r.value

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage">
      <Link href={groupPath(group.slug, '/manage/links')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        リンクの一覧にもどる
      </Link>
      <EventsFlash params={searchParams} />

      <section className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">リンクを直す</h2>
        <form action={updateLinkAction.bind(null, group.slug, l.id)}>
          <LinkFields initial={{ title: l.title, url: l.url, note: l.note ?? '' }} />
          <button type="submit" className="mt-6 rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
            直した内容を保存する
          </button>
        </form>
      </section>

      <DeleteForm action={deleteLinkAction.bind(null, group.slug, l.id)} label="このリンクを削除する" note="削除すると元に戻せません。" />
    </GroupShell>
  )
}
