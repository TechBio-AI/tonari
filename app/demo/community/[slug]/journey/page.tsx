// 「病気がわかるまでの道のり」の回答ページ（会員エリア。/demo/community/[slug]/journey）
//
// 入口の判定は ../_lib/access.ts（会員か閲覧モードの見本だけ。会員でない人は会のお知らせのページへ）。
//   - 調査を出す会でない            → 404（ファブリー病の会と、閲覧モードの見本の会だけ。../_lib/journey.ts）
//   - JOURNEY_SURVEY が on でない    → 「準備中（倫理審査の承認後に始めます）」だけを出す
//   - 回答済み                       → その旨と、自分の回答・集計への入口
//   - まだ回答していない             → 説明・回答フォーム・同意。同意の文が案（draft）のうちは送れない
//   - 閲覧モード（demo）             → フォームを見せるだけ（送れない）。DB は読まない
// 回答をもとに本人へ病気の可能性・助言・受診先を返さない（医療機器にあたる機能は作らない）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { consentLabelOf, currentConsentText } from '@/lib/portal/consent-texts'
import {
  JOURNEY_DISEASE,
  JOURNEY_FAILURE_MESSAGES,
  JOURNEY_PENDING_MESSAGE,
  JOURNEY_TITLE,
  isJourneyEnabled,
  isJourneyFailure,
} from '@/lib/portal/journey-survey'
import { myJourneyResponses } from '@/lib/portal/journey-survey-db'

import { groupPath, requireMemberAccess } from '../_lib/access'
import { MY_JOURNEY_PATH, isJourneyGroup } from '../_lib/journey'
import { GroupShell } from '../_components/GroupShell'
import { submitJourneyAction } from './actions'
import { JourneyForm } from './JourneyForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: JOURNEY_TITLE,
  robots: { index: false, follow: false },
}

/** 調査の説明（回答の前に読む） */
function About() {
  return (
    <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 text-base text-stone-700 leading-relaxed space-y-3">
      <p>
        {JOURNEY_DISEASE.name}とわかるまでに、どんな症状に気づき、どの診療科を受診したかを、
        会員の皆さんの回答から集計する調査です。集計した結果は、この会の会員が見られます。
      </p>
      <p>選ぶだけの 14 問で、3 分ほどで終わります。文章を書く欄はありません。</p>
      <p>
        回答をもとに、病気の可能性や受診先などをお返しすることはありません。
        体のことで気になることがあるときは、主治医にご相談ください。
      </p>
      <p>回答は氏名・表示名・メールアドレスと切り離して保存します。いつでも取り消せます。</p>
    </section>
  )
}

export default async function JourneyPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { error?: string | string[] }
}) {
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
      <h2 className="mt-8 text-xl font-bold text-stone-800">{JOURNEY_TITLE}</h2>
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

  const rawError = typeof searchParams?.error === 'string' ? searchParams.error : undefined
  const error = isJourneyFailure(rawError) ? JOURNEY_FAILURE_MESSAGES[rawError] : null

  // 回答済みか（会員だけ。読めなかったときはフォームを出さない側に倒す）
  let answered = false
  if (access.mode === 'member') {
    const mine = await myJourneyResponses()
    if (!mine.ok) {
      return shell(
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800">
          {JOURNEY_FAILURE_MESSAGES.failed}
        </p>
      )
    }
    answered = mine.value.some((r) => r.groupSlug === group.slug && r.diseaseId === JOURNEY_DISEASE.id)
  }

  const links = (
    <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base">
      <Link href={groupPath(group.slug, '/journey/summary')} className="text-orange-700 hover:underline">
        この会の集計を見る
      </Link>
      <Link href={MY_JOURNEY_PATH} className="text-orange-700 hover:underline">
        自分の回答を確かめる・取り消す
      </Link>
    </p>
  )

  if (answered) {
    return shell(
      <>
        <p role="status" className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-base text-emerald-800">
          回答をいただいています。ありがとうございました。答え直すときは、いまの回答を取り消してから、もう一度お答えください。
        </p>
        {links}
      </>
    )
  }

  const consent = currentConsentText('journey')
  const disabledReason = demo
    ? '閲覧モードでは回答を送れません（画面の見本です）。'
    : consent.draft
      ? JOURNEY_FAILURE_MESSAGES.consent_draft
      : null

  return shell(
    <>
      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800">
          {error}
        </p>
      )}
      <About />
      {links}
      <JourneyForm
        action={submitJourneyAction.bind(null, group.slug)}
        consentText={consent.text}
        consentLabel={consentLabelOf(consent)}
        disabled={disabledReason !== null}
        disabledReason={disabledReason}
      />
    </>
  )
}
