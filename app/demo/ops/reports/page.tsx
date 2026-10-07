// 通報（全会。運営。/demo/ops/reports。2026-10-04 ファウンダー指示）
//
// すべての会の通報を読むだけ（DB 関数 list_all_reports。20261030。運営以外は forbidden）。
// 出すのは 会・対象の種類・理由・日時・対応の有無 だけ。通報した人・対応した人・本文は DB 関数が返さず、ここでも出さない。
// 対応（対応済みにする・対象を消す）は、その会の世話人のページ（/demo/community/[slug]/manage/reports）で行う。
// 運営でも、その会の世話人でなければ manage/reports は開けない（404）。ここでは対応の操作を持たない。
// 理由には病状や人名が書かれうる。ログに出さない。

import Link from 'next/link'

import { listAllReports, type OpsReport } from '../../_lib/contract-db'
import { opsViewMode } from '../_lib/access'
import { SAMPLE_ALL_REPORTS } from '../_lib/samples'
import { OPS_METADATA, OpsShell } from '../_components/OpsShell'

export const dynamic = 'force-dynamic'
export const metadata = OPS_METADATA

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 対応する場所。閲覧モードは世話人のページの見本（見本の会に manage/reports は無い） */
function handleHref(slug: string, demo: boolean): string {
  const base = `/demo/community/${encodeURIComponent(slug)}/manage`
  return demo ? base : `${base}/reports`
}

function ReportItem({ rep, demo }: { rep: OpsReport; demo: boolean }) {
  return (
    <li className="rounded-2xl bg-white border border-stone-200 p-5" data-ops-report>
      <p className="text-sm text-stone-500">
        {formatDate(rep.createdAt)}・会 <span className="font-mono" data-ops-report-group>{rep.groupSlug}</span>・
        {rep.targetKind === 'post' ? '投稿' : 'コメント'}への通報・
        <span data-ops-report-status>{rep.handledAt ? `対応済み（${formatDate(rep.handledAt)}）` : '未対応'}</span>
      </p>
      <p className="mt-2 text-base text-stone-800 whitespace-pre-line" data-ops-report-reason>
        {rep.reason !== '' ? rep.reason : '（理由は書かれていません）'}
      </p>
      <Link href={handleHref(rep.groupSlug, demo)} className="mt-3 inline-block text-base text-orange-700 hover:underline" data-ops-report-link>
        この会の世話人のページで対応する
      </Link>
    </li>
  )
}

export default async function OpsReportsPage() {
  const demo = (await opsViewMode()) === 'demo'
  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の通報（DB は読まない）
  const r = demo ? { ok: true as const, value: SAMPLE_ALL_REPORTS } : await listAllReports()

  const open = r.ok ? r.value.filter((x) => !x.handledAt) : []
  const done = r.ok ? r.value.filter((x) => x.handledAt) : []

  return (
    <OpsShell tab="reports" demo={demo}>
      <p className="mt-8 text-base text-stone-600 leading-relaxed">
        すべての会の通報です。ここでは見るだけです。対応（対応済みにする・投稿やコメントを消す）は、その会の世話人が世話人のページで行います。
        運営の方でも、その会の世話人でなければ、世話人のページは開けません。
      </p>
      {demo && <p className="mt-2 text-sm text-stone-500">見本では、リンクは見本の会の世話人のページ（見本）へ進みます。</p>}
      {!r.ok ? (
        <p role="alert" className="mt-8 text-base text-rose-700">読み込めませんでした。</p>
      ) : r.value.length === 0 ? (
        <p className="mt-8 text-base text-stone-600">通報はありません。</p>
      ) : (
        <>
          <h2 className="mt-8 text-xl font-bold text-stone-800">未対応（{open.length} 件）</h2>
          {open.length === 0 ? (
            <p className="mt-3 text-base text-stone-600">未対応の通報はありません。</p>
          ) : (
            <ul className="mt-4 space-y-4" data-ops-reports-open>
              {open.map((rep) => <ReportItem key={rep.id} rep={rep} demo={demo} />)}
            </ul>
          )}
          {done.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold text-stone-800">対応済み（{done.length} 件）</h2>
              <ul className="mt-4 space-y-4" data-ops-reports-done>
                {done.map((rep) => <ReportItem key={rep.id} rep={rep} demo={demo} />)}
              </ul>
            </>
          )}
        </>
      )}
    </OpsShell>
  )
}
