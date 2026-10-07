// 治験・研究の案内（会員エリア。/demo/community/notices。共通契約 2026-10-03 の C）
//
// 見せるのは DB 関数 list_my_trial_notices() が返す案件だけ（研究・治験の案内に同意し、その病気を選んでいる方＝B 層。
// それ以外の方・対象外の病気の案件は、DB が返さない。この画面は表を直接読まない）。
// 案内は「公開の登録情報があることを知らせる」もの。出すのは病名・登録番号・要約・登録情報へのリンクだけ。
// 連絡は本人がリンク先へ（連絡先をどこにも流さない）。「参加するかどうかは主治医と相談してください」を固定文で出す。
// 「興味がある」「表示しない」は本人の反応（運営には実数だけが見える）。表示しないにしたものは一覧から外す。
//   - 未ログイン → /demo/login、プロフィールが無い → /demo/community、再同意が要る → onboarding
//   - 閲覧モード → 見本の案件 2 件（../_components/sample-group.ts。DB は読まない。ボタンは押せない。2026-10-04）

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../../_lib/session'
import { CONTRACT_FAILURE_MESSAGES, isContractFailure, listMyTrialNotices } from '../../_lib/contract-db'
import { diseaseNameOf } from '../../ops/_lib/resolve'
import { setNoticeInterestAction } from './actions'
import { SAMPLE_MARK, SAMPLE_NOTICES, SAMPLE_NOTICE_DISEASE_NAME } from '../_components/sample-group'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '治験・研究の案内',
  robots: { index: false, follow: false },
}

const NOTICE_DOCTOR_NOTE = '参加するかどうかは主治医と相談してください'
const NOTICE_CONTACT_NOTE = 'このサイトは、参加の受付や連絡の取り次ぎをしません。問い合わせは、登録情報のページに書かれた連絡先へ、ご自身でお願いします。'

const DONE: Record<string, string> = { interested: '「興味がある」にしました。', dismissed: 'この案内を表示しないようにしました。' }

// DEMO_ACCESS: 本番前に削除。閲覧モードの見本（架空の案件 2 件。ボタンは見た目だけで押せない）
function DemoNoticesView() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16" data-demo-notices>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
        治験・研究の案内<span className="ml-1 text-lg font-normal text-stone-500" data-sample-mark>{SAMPLE_MARK}</span>
      </h1>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        プロトタイプの閲覧モードです。実際の画面では、研究・治験の案内を受け取る設定をした方に、選んだ病気の公開の登録情報があることをお知らせします。
      </p>
      <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-base font-semibold text-stone-800">{NOTICE_DOCTOR_NOTE}</p>
      <p className="mt-2 text-sm text-stone-600">{NOTICE_CONTACT_NOTE}</p>
      <ul className="mt-8 space-y-4">
        {SAMPLE_NOTICES.map((n) => (
          <li key={n.id} className="rounded-2xl bg-white border border-stone-200 p-5" data-notice>
            <p className="text-sm text-stone-500">
              {SAMPLE_NOTICE_DISEASE_NAME}・{n.registry === 'jrct' ? 'jRCT' : 'ClinicalTrials.gov'} {n.registryId}
              {n.myStatus === 'interested' && <span className="ml-2 rounded-lg bg-orange-100 px-2 py-0.5 text-orange-800">興味がある</span>}
            </p>
            <p className="mt-2 text-base text-stone-800 leading-relaxed">{n.summary}</p>
            <p className="mt-3 text-sm text-stone-500">見本では「興味がある」「表示しない」は押せません。</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function NoticesPage({ searchParams }: { searchParams?: { error?: string; done?: string } }) {
  if (!isFeatureEnabled('TRIAL_NOTICES')) notFound() // 機能フラグ TRIAL_NOTICES（既定 off）
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')
  if (viewer.kind === 'demo') return <DemoNoticesView /> // DEMO_ACCESS: 本番前に削除
  if (viewer.kind !== 'member') notFound()
  if (!viewer.hasProfile) redirect('/demo/community')
  if (viewer.needsConsent) redirect('/demo/community/onboarding')

  const r = await listMyTrialNotices()
  const shown = r.ok ? r.value.filter((n) => n.myStatus !== 'dismissed') : []
  const hidden = r.ok ? r.value.length - shown.length : 0
  const error = typeof searchParams?.error === 'string' && isContractFailure(searchParams.error) ? CONTRACT_FAILURE_MESSAGES[searchParams.error] : null
  const done = typeof searchParams?.done === 'string' ? DONE[searchParams.done] ?? null : null

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">治験・研究の案内</h1>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        研究・治験の案内を受け取る設定にしている方に、選んだ病気について、公開の登録情報（jRCT・ClinicalTrials.gov）があることをお知らせします。
      </p>
      <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-base font-semibold text-stone-800" data-notice-doctor>
        {NOTICE_DOCTOR_NOTE}
      </p>
      <p className="mt-2 text-sm text-stone-600" data-notice-contact>{NOTICE_CONTACT_NOTE}</p>

      {error && <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800">{error}</p>}
      {done && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-base text-emerald-800">{done}</p>}

      {!r.ok ? (
        <p role="alert" className="mt-8 text-base text-rose-700">読み込めませんでした。時間をおいて、もう一度お試しください。</p>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600" data-notice-empty>
          <p>いまお知らせしている案内はありません。</p>
          <p className="mt-2 text-sm">
            案内は、マイページの「研究・治験の案内」で受け取る設定にし、病気を選んだ方にだけ届きます。
            <Link href="/demo/community/profile" className="ml-1 text-orange-700 hover:underline">マイページへ</Link>
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {shown.map((n) => (
            <li key={n.id} className="rounded-2xl bg-white border border-stone-200 p-5" data-notice>
              <p className="text-sm text-stone-500">
                {diseaseNameOf(n.diseaseId)}・{n.registry === 'jrct' ? 'jRCT' : 'ClinicalTrials.gov'} {n.registryId}
                {n.myStatus === 'interested' && <span className="ml-2 rounded-lg bg-orange-100 px-2 py-0.5 text-orange-800">興味がある</span>}
              </p>
              <p className="mt-2 text-base text-stone-800 leading-relaxed whitespace-pre-line">{n.summary}</p>
              <a href={n.registryUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-base text-orange-700 hover:underline">
                登録情報を見る（連絡はリンク先へ）
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="mt-3 flex flex-wrap gap-2">
                {n.myStatus !== 'interested' && (
                  <form action={setNoticeInterestAction.bind(null, n.id, 'interested')}>
                    <button type="submit" className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm text-orange-800 hover:bg-orange-100">興味がある</button>
                  </form>
                )}
                <form action={setNoticeInterestAction.bind(null, n.id, 'dismissed')}>
                  <button type="submit" className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">表示しない</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && <p className="mt-4 text-sm text-stone-500">表示しないにした案内が {hidden} 件あります。</p>}
    </div>
  )
}
