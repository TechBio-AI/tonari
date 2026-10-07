// 「病気がわかるまでの道のり」の自分の回答（会員エリア。/demo/community/journey）
//
// 会をまたいで、本人の回答を出す（退会した会の回答もここで取り消せるように、会ごとのページの外に置く）。
//   - 未ログイン                   → /demo/login
//   - JOURNEY_SURVEY が on でない  → 「準備中（倫理審査の承認後に始めます）」だけを出す
//   - 会員                         → 回答の一覧（設問と選んだ答え）と、回答ごとの「取り消す」（確認のチェック付き）
//   - 閲覧モード（demo）           → 架空の回答を 1 つ見せる（取り消せない）。DB は読まない
// 回答をもとに本人へ病気の可能性・助言・受診先を返さない。ここで出すのは本人が選んだ答えそのものだけ。

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  JOURNEY_FAILURE_MESSAGES,
  JOURNEY_PENDING_MESSAGE,
  JOURNEY_QUESTIONS,
  JOURNEY_TITLE,
  formatMonth,
  isJourneyEnabled,
  isJourneyFailure,
  optionLabel,
  type MyJourneyResponse,
} from '@/lib/portal/journey-survey'
import { myJourneyResponses } from '@/lib/portal/journey-survey-db'

import { getViewer } from '../../_lib/session'
import { DEMO_MODE_NOTICE } from '../_components/sample-group'
import { SAMPLE_MY_JOURNEY_RESPONSE } from '../_components/sample-journey'
import { groupPath } from '../[slug]/_lib/access'
import { withdrawJourneyAction } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${JOURNEY_TITLE}（自分の回答）`,
  robots: { index: false, follow: false },
}

const DONE: Record<string, string> = {
  answered: '回答を受け付けました。ありがとうございました。',
  withdrawn: '回答を取り消しました。回答は消えました。',
}

function answerText(r: MyJourneyResponse, key: (typeof JOURNEY_QUESTIONS)[number]['key']): string {
  if (key === 'first_symptoms') {
    return r.answers.first_symptoms.map((v) => optionLabel(key, v) ?? '（不明な値）').join('、')
  }
  return optionLabel(key, r.answers[key]) ?? '（不明な値）'
}

function ResponseCard({ r, demo }: { r: MyJourneyResponse; demo: boolean }) {
  return (
    <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-800">
        {r.groupName}・{r.diseaseName}
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        回答した月: {formatMonth(r.answeredMonth)}／同意した文の版: {r.consentVersion}
      </p>
      <dl className="mt-5 divide-y divide-stone-100">
        {JOURNEY_QUESTIONS.map((q) => (
          <div key={q.key} className="py-3 sm:grid sm:grid-cols-2 sm:gap-4">
            <dt className="text-sm text-stone-500">
              {q.no}. {q.title}
            </dt>
            <dd className="mt-1 sm:mt-0 text-base text-stone-800">{answerText(r, q.key)}</dd>
          </div>
        ))}
      </dl>

      <form action={withdrawJourneyAction.bind(null, r.responseId)} className="mt-6 rounded-2xl bg-stone-50 border border-stone-200 p-5">
        <h3 className="text-lg font-semibold text-stone-800">この回答を取り消す</h3>
        <p className="mt-2 text-base text-stone-700 leading-relaxed">
          取り消すと、この回答は消え、元に戻せません。翌月以降の集計から外れます。
          ほかに回答が残っていなければ、調査への同意も取り消したことになります。
        </p>
        <label className="mt-4 flex items-start gap-3 text-base text-stone-800">
          <input type="checkbox" name="confirm" value="yes" required disabled={demo} className="mt-1 h-5 w-5 accent-orange-600" />
          <span>回答を取り消すことを確かめました</span>
        </label>
        <button
          type="submit"
          disabled={demo}
          className="mt-4 rounded-2xl border border-rose-300 bg-white px-6 py-3 text-base font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          回答を取り消す
        </button>
        {demo && <p className="mt-3 text-sm text-stone-500">閲覧モードでは取り消せません（画面の見本です）。</p>}
      </form>

      <p className="mt-4">
        <Link href={groupPath(r.groupSlug, '/journey/summary')} className="text-base text-orange-700 hover:underline">
          この会の集計を見る
        </Link>
      </p>
    </section>
  )
}

export default async function MyJourneyPage({
  searchParams,
}: {
  searchParams?: { error?: string | string[]; done?: string | string[] }
}) {
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')
  const demo = viewer.kind === 'demo'

  let body: React.ReactNode
  if (!isJourneyEnabled()) {
    body = (
      <p role="status" className="mt-6 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-700">
        {JOURNEY_PENDING_MESSAGE}
      </p>
    )
  } else {
    let responses: MyJourneyResponse[] | null
    if (demo) {
      responses = [SAMPLE_MY_JOURNEY_RESPONSE] // DEMO_ACCESS: 本番前に削除
    } else {
      const r = await myJourneyResponses()
      responses = r.ok ? r.value : null
    }

    const rawError = typeof searchParams?.error === 'string' ? searchParams.error : undefined
    const error = isJourneyFailure(rawError) ? JOURNEY_FAILURE_MESSAGES[rawError] : null
    const rawDone = typeof searchParams?.done === 'string' ? searchParams.done : undefined
    const done = rawDone && Object.prototype.hasOwnProperty.call(DONE, rawDone) ? DONE[rawDone] : null

    body = (
      <>
        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-base text-emerald-800">
            {done}
          </p>
        )}
        {responses === null ? (
          <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800">
            {JOURNEY_FAILURE_MESSAGES.failed}
          </p>
        ) : responses.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-700">回答はありません。</p>
        ) : (
          responses.map((r) => <ResponseCard key={r.responseId} r={r} demo={demo} />)
        )}
      </>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      {demo && (
        // DEMO_ACCESS: 本番前に削除
        <p role="status" className="mb-8 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base font-semibold text-stone-800 leading-relaxed">
          {DEMO_MODE_NOTICE}
        </p>
      )}
      <Link href="/demo/community/profile" className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        マイページにもどる
      </Link>
      <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-stone-800">{JOURNEY_TITLE}（自分の回答）</h1>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        あなたが選んだ答えだけを表示します。回答はいつでも取り消せます。
      </p>
      {body}
    </div>
  )
}
