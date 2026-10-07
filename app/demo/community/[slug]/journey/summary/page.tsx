// 「病気がわかるまでの道のり」の会ごとの集計（会員エリア。/demo/community/[slug]/journey/summary）
//
// 会員（世話人に限らない）と閲覧モードの見本だけ。入口の判定は ../../_lib/access.ts。
// 数は DB の journey_summary が伏せた後のものをそのまま出す（ここで足し引きしない）。
//   - 10 未満のセルは「10未満」。総数が 10 未満なら DB は何も返さない → 「まだ表示していません」
//   - 設問ごとの単純集計と、性別との 2 軸まで
//   - 数えるのは前月までの回答
// 閲覧モードは架空の固定データ（../../../_components/sample-journey.ts。先行調査の数値は写さない）。DB は読まない。
// 印刷: 医療者向けの資材（diseases/[slug]/for-clinicians）と同じ作り。[data-print-target] の中だけを紙に出す。
//   紙に出すのは 会の名前・集計日・注記（JOURNEY_PRINT_NOTE）・総数・表 だけ。解釈の文は入れない（画面の説明文は印刷しない）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  JOURNEY_FAILURE_MESSAGES,
  JOURNEY_NOT_ENOUGH_MESSAGE,
  JOURNEY_PENDING_MESSAGE,
  JOURNEY_PRINT_NOTE,
  JOURNEY_TITLE,
  SUMMARY_SEXES,
  SUMMARY_SEX_LABELS,
  buildSummary,
  formatTokyoDate,
  isJourneyEnabled,
  type JourneySummary,
  type SummaryTable,
} from '@/lib/portal/journey-survey'
import { journeySummaryRows } from '@/lib/portal/journey-survey-db'

import { PrintOnlyTargetStyle } from '../../../../diseases/_components/ExtrasParts'
import { PrintButton } from '../../../../diseases/_components/PrintButton'
import { SAMPLE_JOURNEY_SUMMARY_ROWS } from '../../../_components/sample-journey'
import { groupPath, requireMemberAccess } from '../../_lib/access'
import { isJourneyGroup } from '../../_lib/journey'
import { GroupShell } from '../../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${JOURNEY_TITLE}（集計）`,
  robots: { index: false, follow: false },
}

function Table({ t }: { t: SummaryTable }) {
  const sexes = t.bySex ? SUMMARY_SEXES : (['all'] as const)
  return (
    <section className="mt-6 rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 print:mt-3 print:border-0 print:p-0 print:break-inside-avoid">
      <h3 className="text-lg font-semibold text-stone-800 print:text-[10.5pt] print:text-black">
        {t.no}. {t.title}
      </h3>
      {t.multi && <p className="mt-1 text-sm text-stone-500 print:text-[8.5pt]">複数選んだ方は、それぞれに数えています。</p>}
      <div className="mt-3 overflow-x-auto print:mt-1 print:overflow-visible">
        <table className="w-full min-w-[28rem] text-base print:min-w-0 print:text-[9pt] print:leading-snug print:text-black">
          <thead>
            <tr className="border-b border-stone-200 text-left text-sm text-stone-500">
              <th scope="col" className="py-2 pr-3 font-normal">選択肢</th>
              {sexes.map((s) => (
                <th key={s} scope="col" className="py-2 px-2 text-right font-normal whitespace-nowrap">
                  {SUMMARY_SEX_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.lines.map((l) => (
              <tr key={l.value} className="border-b border-stone-100 last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-stone-800">
                  {l.label}
                </th>
                {sexes.map((s) => (
                  <td key={s} className="py-2 px-2 text-right tabular-nums text-stone-700 whitespace-nowrap">
                    {l.cells[s] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function JourneySummaryPage({ params }: { params: { slug: string } }) {
  const access = await requireMemberAccess(params.slug)
  const { group } = access
  const demo = access.mode === 'demo'
  if (!isJourneyGroup(group.slug, demo)) notFound()

  const shell = (children: React.ReactNode) => (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={demo}
      moderator={access.mode === 'member' && access.role === 'moderator'}
      showLeave={access.mode === 'member'}
      tab="journey"
    >
      <h2 className="mt-8 text-xl font-bold text-stone-800">{JOURNEY_TITLE}（この会の集計）</h2>
      {children}
    </GroupShell>
  )

  if (!isJourneyEnabled()) {
    return shell(
      <p role="status" className="mt-5 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-700">
        {JOURNEY_PENDING_MESSAGE}
      </p>
    )
  }

  let summary: JourneySummary | null
  if (demo) {
    summary = buildSummary(SAMPLE_JOURNEY_SUMMARY_ROWS) // DEMO_ACCESS: 本番前に削除
  } else {
    const r = await journeySummaryRows(group.id)
    if (!r.ok) {
      return shell(
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800">
          {JOURNEY_FAILURE_MESSAGES[r.reason]}
        </p>
      )
    }
    summary = buildSummary(r.value)
  }

  const printedOn = formatTokyoDate(new Date())

  return shell(
    <>
      <div className="print:hidden mt-5 rounded-2xl bg-stone-50 border border-stone-200 p-5 text-sm text-stone-700 leading-relaxed space-y-2">
        <p>この会の会員の回答をまとめた数です。個々の方の病気について何かを示すものではありません。</p>
        <p>
          10人に満たない数は「10未満」と表示します。引き算で戻せないよう、10人以上の数を伏せることもあります。
          その月の回答は、翌月から数に入ります。
        </p>
      </div>

      {summary === null ? (
        <p role="status" className="mt-6 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-700">
          {JOURNEY_NOT_ENOUGH_MESSAGE}
        </p>
      ) : (
        <>
          <PrintOnlyTargetStyle />
          <div className="print:hidden mt-6 flex justify-end">
            <PrintButton label="印刷する" />
          </div>
          <div data-print-target className="print:text-black">
            <div className="hidden print:block">
              <p className="text-[14pt] font-bold">
                {JOURNEY_TITLE}（集計）{demo && '（サンプル）'}
              </p>
              <p className="mt-1 text-[10pt]">{group.name}</p>
              <p className="text-[10pt]">集計日: {printedOn}</p>
              <p className="mt-1 text-[9pt]">{JOURNEY_PRINT_NOTE}</p>
            </div>
            <p className="mt-6 text-base text-stone-800 print:mt-2 print:text-[10pt] print:text-black">
              回答した方: <span className="font-semibold tabular-nums">{summary.total}</span> 人
            </p>
            {summary.tables.map((t) => (
              <Table key={t.key} t={t} />
            ))}
          </div>
        </>
      )}

      <p className="mt-8 print:hidden">
        <Link href={groupPath(group.slug, '/journey')} className="text-base text-orange-700 hover:underline">
          {JOURNEY_TITLE}のページにもどる
        </Link>
      </p>
    </>
  )
}
