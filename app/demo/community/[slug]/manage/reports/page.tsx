// 通報の一覧（世話人向け。/demo/community/[slug]/manage/reports）
//
// 世話人だけ（一般の会員・会員でない人・閲覧モードは 404）。データは DB 関数 list_group_reports（../../_lib/community.ts）。
// 出すのは 対象へのリンク・理由・日時・対応の有無 だけ。通報した人・対応した人は DB 関数が返さず、ここでも出さない。
// 「対応済みにする」は mark_report_handled。削除は対象のページの「削除」から行う（このページからは消さない）。
// 理由には病状や人名が書かれうる。ログに出さない。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { markReportHandledAction } from '../../actions'
import { groupPath, requireModeratorViewAccess } from '../../_lib/access'
import { listReports } from '../../_lib/community'
import { GroupShell, formatDate, type FlashParams } from '../../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '通報',
  robots: { index: false, follow: false },
}

export default async function ReportsPage({ params, searchParams }: { params: { slug: string }; searchParams?: FlashParams }) {
  const access = await requireModeratorViewAccess(params.slug, 'notFound')
  if (access.mode !== 'member') notFound() // DEMO_ACCESS: 見本は作らない
  const { group } = access

  const r = await listReports(group.id)
  if (!r.ok) throw new Error('通報を読み込めませんでした')
  const reports = r.value

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator tab="manage" flash={searchParams}>
      <Link href={groupPath(group.slug, '/manage')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        世話人のページにもどる
      </Link>
      <h2 className="mt-5 text-xl font-bold text-stone-800">通報</h2>
      <p className="mt-2 text-base text-stone-600 leading-relaxed">
        会員から知らせのあった投稿・コメントです。だれが通報したかは表示されません。削除は対象のページから行えます。
      </p>

      {reports.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600">通報はありません。</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reports.map((rep) => (
            <li key={rep.id} className="rounded-2xl bg-white border border-stone-200 p-5" data-report-row>
              <p className="text-sm text-stone-500">
                {formatDate(rep.createdAt)}・{rep.commentId ? 'コメント' : '投稿'}
                {rep.handledAt ? <span className="ml-2 rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-800">対応済み</span> : <span className="ml-2 rounded-lg bg-amber-50 px-2 py-0.5 text-amber-800">未対応</span>}
              </p>
              <p className="mt-2 text-base text-stone-800 whitespace-pre-line" data-report-reason>
                {rep.reason !== '' ? rep.reason : '（理由は書かれていません）'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {rep.targetPath ? (
                  <Link href={groupPath(group.slug, rep.targetPath)} className="text-base text-orange-700 hover:underline" data-report-target>
                    対象を開く（削除はそのページから）
                  </Link>
                ) : (
                  <span className="text-base text-stone-400">対象はすでに削除されています</span>
                )}
                {!rep.handledAt && (
                  <form action={markReportHandledAction.bind(null, group.slug, rep.id)}>
                    <button type="submit" className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                      対応済みにする
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GroupShell>
  )
}
