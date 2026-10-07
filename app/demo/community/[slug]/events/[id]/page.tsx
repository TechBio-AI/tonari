// 会の行事 1 件（会員エリア。/demo/community/[slug]/events/[id]）
//
// 会員だけ（../../_lib/events.ts。閲覧モードは 404）。別の会の行事 id は 404。
//   - 参加表明（参加する／たぶん／参加しない）。見えるのは自分の表明だけ。会員向けに人数は出さない
//   - 世話人には出欠一覧（DB 関数 list_event_attendance の表示名と状態だけ。user_id は無い）。印刷できる
//     （医療者向けの資材と同じ印刷の部品。[data-print-target] の中だけを紙に出す）
// オンライン参加の URL は別タブで開く（noopener noreferrer）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  formatEventWhen,
  isAttendanceStatus,
  type AttendanceRow,
} from '@/lib/portal/group-events'
import { getEvent, listAttendance, myAttendance } from '@/lib/portal/group-events-db'

import { PrintOnlyTargetStyle } from '../../../../diseases/_components/ExtrasParts'
import { PrintButton } from '../../../../diseases/_components/PrintButton'
import { groupPath } from '../../_lib/access'
import { requireEventsViewAccess } from '../../_lib/events'
import { SAMPLE_MARK, sampleEvents } from '../../../_components/sample-group'
import { EventsFlash, ExternalAnchor } from '../../_components/EventsParts'
import { GroupShell, NO_DISPLAY_NAME } from '../../_components/GroupShell'
import { setAttendanceAction } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '行事',
  robots: { index: false, follow: false },
}

function statusLabel(s: string): string {
  return isAttendanceStatus(s) ? ATTENDANCE_LABELS[s] : '—'
}

function AttendanceList({ eventTitle, when, rows }: { eventTitle: string; when: string; rows: AttendanceRow[] }) {
  return (
    <section className="mt-10 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
      <PrintOnlyTargetStyle />
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-stone-800">出欠一覧（世話人だけに見えます）</h2>
        {rows.length > 0 && <PrintButton label="印刷する" />}
      </div>
      <div data-print-target className="print:text-black">
        <div className="hidden print:block">
          <p className="text-[14pt] font-bold">出欠一覧</p>
          <p className="mt-1 text-[10pt]">
            {eventTitle}　{when}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-base text-stone-600">まだ参加の表明はありません。</p>
        ) : (
          <table className="mt-4 w-full text-base print:mt-2 print:text-[10pt]">
            <thead>
              <tr className="border-b border-stone-200 text-left text-sm text-stone-500">
                <th scope="col" className="py-2 pr-3 font-normal">表示名</th>
                <th scope="col" className="py-2 font-normal">予定</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 pr-3 text-stone-800">{r.displayName ?? NO_DISPLAY_NAME}</td>
                  <td className="py-2 text-stone-700">{statusLabel(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

/** 閲覧モードの見本の行事。参加の予定のボタンは出さず、説明だけ */
function DemoEventView({ slug, name, e }: { slug: string; name: string; e: ReturnType<typeof sampleEvents>[number] }) {
  return (
    <GroupShell groupName={name} slug={slug} demo moderator={false} tab="events">
      <Link href={groupPath(slug, '/events')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        行事の一覧にもどる
      </Link>
      <article className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-800 leading-snug">
          {e.title}
          <span className="ml-1 text-base font-normal text-stone-500" data-sample-mark>{SAMPLE_MARK}</span>
        </h2>
        <p className="mt-3 text-base text-stone-800">日時: {formatEventWhen(e)}</p>
        {e.place && <p className="mt-1 text-base text-stone-800">場所: {e.place}</p>}
        <p className="mt-5 text-base sm:text-lg text-stone-700 leading-loose whitespace-pre-line">{e.body}</p>
      </article>
      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">参加の予定</h2>
        <p className="mt-2 text-base text-stone-600">
          実際の画面では、ここで「{ATTENDANCE_STATUSES.map((s) => ATTENDANCE_LABELS[s]).join('」「')}」を選べます。見本では選べません。
        </p>
      </section>
    </GroupShell>
  )
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const access = await requireEventsViewAccess(params.slug)
  const { group } = access
  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の行事（DB は読まない。参加の予定は押せない。2026-10-04）
  if (access.mode === 'demo') {
    const sample = sampleEvents().find((x) => x.id === decodeURIComponent(params.id))
    if (!sample) notFound()
    return <DemoEventView slug={group.slug} name={group.name} e={sample} />
  }
  const moderator = access.role === 'moderator'

  const ev = await getEvent(group.id, params.id)
  if (!ev.ok) {
    if (ev.reason === 'not_found' || ev.reason === 'invalid_input') notFound()
    throw new Error('行事を読み込めませんでした')
  }
  const e = ev.value
  const when = formatEventWhen(e)

  const mine = await myAttendance(group.id, e.id)
  const myStatus = mine.ok ? mine.value : null
  const attendance = moderator ? await listAttendance(group.id, e.id) : null

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator={moderator} showLeave tab="events">
      <Link href={groupPath(group.slug, '/events')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        行事の一覧にもどる
      </Link>
      <EventsFlash params={searchParams} />

      <article className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-800 leading-snug">{e.title}</h2>
        <dl className="mt-4 space-y-2 text-base">
          <div>
            <dt className="inline text-stone-500">日時: </dt>
            <dd className="inline text-stone-800">{when}</dd>
          </div>
          {e.place && (
            <div>
              <dt className="inline text-stone-500">場所: </dt>
              <dd className="inline text-stone-800">{e.place}</dd>
            </div>
          )}
          {e.onlineUrl && (
            <div>
              <dt className="inline text-stone-500">オンライン参加: </dt>
              <dd className="inline">
                <ExternalAnchor href={e.onlineUrl}>{e.onlineUrl}</ExternalAnchor>
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-5 text-base sm:text-lg text-stone-700 leading-loose whitespace-pre-line">{e.body}</p>
      </article>

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">参加の予定</h2>
        <p className="mt-2 text-sm text-stone-500">
          あなたの予定は、あなたと世話人だけが見られます。ほかの会員には見えません。
        </p>
        {myStatus && isAttendanceStatus(myStatus) && (
          <p className="mt-3 text-base text-stone-800">
            いまの予定: <span className="font-semibold">{ATTENDANCE_LABELS[myStatus]}</span>
          </p>
        )}
        <form action={setAttendanceAction.bind(null, group.slug, e.id)} className="mt-4 flex flex-wrap gap-3">
          {ATTENDANCE_STATUSES.map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              aria-pressed={myStatus === s}
              className={`rounded-2xl border px-5 py-2 text-base ${
                myStatus === s ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-stone-300 text-stone-800 hover:border-orange-300'
              }`}
            >
              {ATTENDANCE_LABELS[s]}
            </button>
          ))}
        </form>
      </section>

      {attendance &&
        (attendance.ok ? (
          <AttendanceList eventTitle={e.title} when={when} rows={attendance.value} />
        ) : (
          <p role="alert" className="mt-10 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800">
            出欠一覧を読み込めませんでした。
          </p>
        ))}
    </GroupShell>
  )
}
