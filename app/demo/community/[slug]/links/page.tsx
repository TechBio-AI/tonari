// 会の資料・リンク（会員エリア。/demo/community/[slug]/links）
//
// 会員だけ（../_lib/events.ts。会員でない人は会のお知らせのページへ、閲覧モードは 404）。
// 外部のページは別タブで開く（target="_blank"・rel="noopener noreferrer"）。世話人には作成・編集のページへの入口を出す。

import type { Metadata } from 'next'
import Link from 'next/link'

import { listLinks } from '@/lib/portal/group-events-db'

import { groupPath } from '../_lib/access'
import { requireEventsViewAccess } from '../_lib/events'
import { SAMPLE_LINKS, SAMPLE_MARK } from '../../_components/sample-group'
import type { GroupLink } from '@/lib/portal/group-events'
import { ExternalAnchor } from '../_components/EventsParts'
import { GroupShell } from '../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '資料・リンク',
  robots: { index: false, follow: false },
}

export default async function LinksPage({ params }: { params: { slug: string } }) {
  // 閲覧モードは見本のリンク（DB は読まない。2026-10-04）
  const access = await requireEventsViewAccess(params.slug)
  const { group } = access
  const demo = access.mode === 'demo'
  let links: GroupLink[]
  if (demo) {
    links = SAMPLE_LINKS // DEMO_ACCESS: 本番前に削除
  } else {
    const r = await listLinks(group.id)
    if (!r.ok) throw new Error('リンクを読み込めませんでした')
    links = r.value
  }
  const moderator = access.mode === 'member' && access.role === 'moderator'
  const r = { value: links }

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={demo} moderator={moderator} showLeave={!demo} tab="links">
      {moderator && (
        <p className="mt-6">
          <Link href={groupPath(group.slug, '/manage/links')} className="text-base text-orange-700 hover:underline">
            リンクを足す・直す（世話人）
          </Link>
        </p>
      )}
      <h2 className="mt-8 text-xl font-bold text-stone-800">資料・リンク{demo && <span data-sample-mark>{SAMPLE_MARK}</span>}</h2>
      {r.value.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600">リンクはまだありません。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {r.value.map((l) => (
            <li key={l.id} className="rounded-2xl bg-white border border-stone-200 p-5">
              <ExternalAnchor href={l.url} className="inline-flex items-center gap-1 text-lg font-semibold text-orange-700 hover:underline">
                {l.title}
              </ExternalAnchor>
              {l.note && <p className="mt-2 text-base text-stone-600 whitespace-pre-line">{l.note}</p>}
              <p className="mt-1 text-sm text-stone-400 break-all">{l.url}</p>
            </li>
          ))}
        </ul>
      )}
    </GroupShell>
  )
}
