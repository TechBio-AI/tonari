// 招待リンクの受け口（会員エリア。/demo/community/invite/[token]）
//
// 開いただけでは会員にならない（リンクの先読みで使われてしまわないよう、ボタンを押したときだけ受ける）。
// 招待された人は招待の表を読めないため、どの会の招待かはここでは出せない（受けたあとに会のページへ移る）。
//   - 未ログイン                          → /demo/login
//   - 閲覧モード（demo）                  → 404（招待は使えない）
//   - プロフィールが無い・再同意が要る    → 先にプロフィールへ誘導（DB の accept_invitation がそこで止めるため）

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { isInvitationToken } from '@/lib/portal/tenancy'

import { getViewer } from '../../../_lib/session'
import { acceptInvitationAction } from '../../[slug]/actions'
import { Flash, type FlashParams } from '../../[slug]/_components/GroupShell'
import { buttonClass } from '../../[slug]/_components/Posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '患者会への招待',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams?: FlashParams
}) {
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')
  if (viewer.kind !== 'member') notFound() // DEMO_ACCESS: 閲覧モードでは招待を使えない

  const token = decodeURIComponent(params.token)
  const needsProfile = !viewer.hasProfile || viewer.needsConsent

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">患者会への招待</h1>
      <Flash params={searchParams} />

      {!isInvitationToken(token) ? (
        <p className="mt-8 text-base text-stone-700">招待が見つかりません。リンクをもう一度お確かめください。</p>
      ) : needsProfile ? (
        <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
          <p className="text-base text-stone-700 leading-relaxed">
            招待を受けるには、先にプロフィールを登録してください。
            登録が済んだら、もう一度この招待リンクを開いてください。
          </p>
          <Link href="/demo/community/onboarding?from=invite" className={`mt-5 inline-block ${buttonClass}`}>
            プロフィールを登録する
          </Link>
        </section>
      ) : (
        <form action={acceptInvitationAction.bind(null, token)} className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
          <p className="text-base text-stone-700 leading-relaxed">
            招待を受けると、その会の会員になり、お知らせや掲示板を読めるようになります。
            ほかの会員には表示名だけが見えます。氏名は運営だけが見ます。
          </p>
          <button type="submit" className={`mt-5 ${buttonClass}`}>
            招待を受ける
          </button>
        </form>
      )}
    </div>
  )
}
