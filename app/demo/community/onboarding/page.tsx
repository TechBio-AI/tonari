// 初回ログイン時の画面。利用目的を示し、同意とプロフィールの入力を受ける。
// 入力欄は共通部品 ProfileForm（マイページと同じ）。同意のチェックと保存（./actions.ts）はこちら側。
//
// 会員（member）でプロフィールがまだ無い方だけが入力できる。
//   - プロフィールがあり、利用目的のいまの版に同意済み → /demo/community へ
//   - プロフィールはあるが、利用目的の文の版が上がった（needsConsent）→ 再同意だけを出す（入力欄は出さない）
//   - 未ログイン → /demo/login へ（middleware.ts でも止めている。ここでも確かめる）
//   - 閲覧モード（demo）→ /demo/community へ（入力・保存はさせない。見本はマイページが出す）
//   - プロフィールが無い方の最初の入力は、招待リンク（?from=invite）か入会申請（?from=join）の経路からだけ
//     （2026-10-02 ファウンダー指示）。直接 URL で開いたら会員エリアのトップ（招待制の案内）へ戻す。
//     印は見せ方の振り分けで、会員になれるかどうかは DB（accept_invitation・request_join）が決める

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { PROFILE_CHOICES } from '@/lib/portal/member-profile'

import { getViewer } from '../../_lib/session'
import { USAGE_PURPOSE_TEXT } from '../_components/purpose'

import OnboardingProfileForm from './OnboardingProfileForm'
import ReconsentForm from './ReconsentForm'

// セッションに依存するので静的化させない
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

function UsagePurpose() {
  return (
    <section
      aria-labelledby="usage-purpose-heading"
      className="mt-10 rounded-2xl bg-white border border-stone-200 p-7"
    >
      <h2 id="usage-purpose-heading" className="text-xl font-bold text-stone-800">
        お預かりする情報の利用目的
      </h2>
      <p className="mt-4 text-lg text-stone-700 leading-loose">{USAGE_PURPOSE_TEXT}</p>
    </section>
  )
}

/** 最初の入力に入ってよい経路の印 */
const ONBOARDING_FROM = ['invite', 'join'] as const

// 引数に既定値（= {}）を付けない。付けると Next の型検査（PageProps）で、引数が undefined を許す形になりビルドが落ちる
export default async function OnboardingPage({ searchParams }: { searchParams?: { from?: string | string[] } }) {
  const viewer = await getViewer()

  if (!viewer) {
    redirect('/demo/login')
  }

  // DEMO_ACCESS: 本番前に削除。閲覧モードでは入力・保存をさせない。
  // 見本の会員情報はマイページ（/demo/community/profile）が出す（2026-09-26 ファウンダー判断）
  if (viewer.kind === 'demo') {
    redirect('/demo/community')
  }

  if (viewer.hasProfile && !viewer.needsConsent) {
    redirect('/demo/community')
  }

  if (!viewer.hasProfile) {
    const from = typeof searchParams?.from === 'string' ? searchParams.from : undefined
    if (!(ONBOARDING_FROM as readonly string[]).includes(from ?? '')) redirect('/demo/community')
  }

  if (viewer.hasProfile) {
    return (
      <div className="max-w-xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">利用目的の確認</h1>
        <p className="mt-6 text-lg text-stone-600 leading-loose">
          引き続きご利用いただくには、利用目的をご確認のうえ、改めて同意をお願いします。登録している内容は変わりません。
        </p>
        <UsagePurpose />
        <div className="mt-10">
          <ReconsentForm />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">はじめに</h1>
      <p className="mt-6 text-lg text-stone-600 leading-loose">
        会員向けページをご利用いただく前に、利用目的をご確認のうえ、プロフィールを入力してください。
      </p>
      <UsagePurpose />
      <div className="mt-10">
        <OnboardingProfileForm
          choices={PROFILE_CHOICES}
        />
      </div>
    </div>
  )
}
