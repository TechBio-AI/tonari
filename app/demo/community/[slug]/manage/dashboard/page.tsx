// 会員の状況（世話人向け。/demo/community/[slug]/manage/dashboard）
//
// 世話人だけ（access.ts の requireModeratorViewAccess。一般の会員・会員でない人は 404）。
// 閲覧モードは見本（26 行の架空の数。../../../_components/sample-group.ts。DB は読まない。2026-10-04）。
// データは DB 関数 group_dashboard（../../_lib/dashboard.ts）。n は返ってきた文字列をそのまま出す:
//   '10未満' を数に直さない・合計しない・グラフにしない・解釈の文を付けない。
// 印刷（A4）: 会の名前・集計日・注記「10人未満の区分は『10未満』と表示しています」を紙にも出す。
//   サイトのヘッダー・タブ・フッター・ボタンは紙に出さない。
// 道のり調査の集計へのリンクは、JOURNEY_SURVEY が on ちょうどで、道のり調査の会のときだけ（既存の判定）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { isJourneyEnabled, JOURNEY_TITLE } from '@/lib/portal/journey-survey'

import { PrintButton } from '../../../../diseases/_components/PrintButton'
import { groupPath, requireModeratorViewAccess } from '../../_lib/access'
import { DASHBOARD_NOTE, buildDashboard, fetchGroupDashboard, type DashboardTable } from '../../_lib/dashboard'
import { isJourneyGroup } from '../../_lib/journey'
import { GroupShell } from '../../_components/GroupShell'
import { SAMPLE_MARK } from '../../../_components/sample-group'
import { SAMPLE_DASHBOARD_ROWS } from '../../../_components/sample-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '会員の状況',
  robots: { index: false, follow: false },
}

/** 印刷のときだけの指定。サイトの枠（ヘッダー・フッター・会員バー・タブ）は紙に出さない */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 15mm; }
  body { background: #fff !important; }
  header, footer, nav, [data-member-bar] { display: none !important; }
  [data-dashboard-table] { break-inside: avoid; }
}
`

function formatDateTime(d: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${v('year')}年${v('month')}月${v('day')}日 ${v('hour')}:${v('minute')}`
}

function Table({ t }: { t: DashboardTable }) {
  return (
    <section className="mt-6 rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 print:mt-4 print:p-3" data-dashboard-table={t.section}>
      <h3 className="text-lg font-semibold text-stone-800">{t.title}</h3>
      <table className="mt-3 w-full max-w-md text-base">
        <thead>
          <tr className="border-b border-stone-200 text-left text-sm text-stone-500">
            <th scope="col" className="py-2 pr-4 font-normal">区分</th>
            <th scope="col" className="py-2 text-right font-normal">人数</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.choice} className="border-b border-stone-100 last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-stone-700">
                {r.label}
              </th>
              <td className="py-2 text-right text-stone-800 tabular-nums" data-n>
                {r.n}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default async function DashboardPage({ params }: { params: { slug: string } }) {
  const access = await requireModeratorViewAccess(params.slug, 'notFound')
  const { group } = access
  const demo = access.mode === 'demo'

  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の 26 行（DB は読まない）
  const rows = demo ? SAMPLE_DASHBOARD_ROWS : await fetchGroupDashboard(group.id)
  const tables = rows ? buildDashboard(rows) : null
  const generatedAt = formatDateTime(new Date())
  const journey = !demo && isJourneyEnabled() && isJourneyGroup(group.slug, false)

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={demo} moderator={!demo} tab="manage">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={groupPath(group.slug, '/manage')} className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
          <ArrowLeft className="w-4 h-4" />
          世話人のページにもどる
        </Link>
        <PrintButton label="印刷する" />
      </div>

      <h2 className="mt-6 text-xl font-bold text-stone-800">会員の状況{demo && <span data-sample-mark>{SAMPLE_MARK}</span>}</h2>
      <p className="mt-2 text-base text-stone-600" data-generated-at>
        集計日時：{generatedAt}
      </p>
      <p className="mt-1 text-sm text-stone-500" data-dashboard-note>
        {DASHBOARD_NOTE}
      </p>

      {tables === null ? (
        <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800 print:hidden">
          会員の状況を読み込めませんでした。時間をおいて、もう一度お試しください。
        </p>
      ) : tables.length === 0 ? (
        <p className="mt-6 text-base text-stone-600">表示できる集計がありません。</p>
      ) : (
        tables.map((t) => <Table key={t.section} t={t} />)
      )}

      {journey && (
        <p className="mt-8 print:hidden">
          <Link href={groupPath(group.slug, '/journey/summary')} className="text-base text-orange-700 hover:underline">
            {JOURNEY_TITLE}（集計）を見る
          </Link>
        </p>
      )}
    </GroupShell>
  )
}
