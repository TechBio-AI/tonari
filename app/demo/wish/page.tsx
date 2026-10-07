// となりへの参加を希望した患者会（/demo/wish。自分の一覧）
//
// 自分が参加を希望した病気（取り消していないもの）の一覧と、取り消し。
// 会員でない利用者（プロフィールの無い方）は、会員エリアのトップ（/demo/community）の案内からここへ来る。
//   - 未ログイン   … 患者会の一覧への案内だけ
//   - 閲覧モード   … 見本の説明だけ（DB は読まない）

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../_lib/session'
import { Notice } from '../_components/Notice'
import { listMyWishes } from './_lib/wishes'
import { MyWishList, WishFlash, type WishFlashParams } from './_components/WishParts'
import { SAMPLE_MARK } from '../community/_components/sample-group'

/** 閲覧モードの、登録済みの一覧の見本（架空の答え） */
const SAMPLE_WISH_LIST = [
  { name: 'ポンペ病', prefecture: '東京都', relation: 'ご家族' },
  { name: 'X連鎖性低リン血症性くる病', prefecture: '大阪府', relation: 'ご本人' },
]

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'となりへの参加を希望した患者会',
  robots: { index: false, follow: false },
}

export default async function WishStatusPage({ searchParams }: { searchParams?: WishFlashParams }) {
  if (!isFeatureEnabled('WISHES')) notFound() // 機能フラグ WISHES（既定 off）
  const viewer = await getViewer()

  let body: React.ReactNode
  if (viewer?.kind === 'demo') {
    // DEMO_ACCESS: 本番前に削除
    body = (
      <Notice className="mt-8">
        <p data-wish-demo>プロトタイプの閲覧モードです。下は、登録したあとの一覧の見本です（取り消しのボタンは出しません）。</p>
        <ul className="mt-3 space-y-1" data-wish-sample>
          {SAMPLE_WISH_LIST.map((x) => (
            <li key={x.name} className="text-base text-stone-800">
              {x.name}
              <span className="ml-1 text-sm text-stone-500">{x.prefecture}・{x.relation}</span>
              <span className="ml-1 text-sm text-stone-500" data-sample-mark>{SAMPLE_MARK}</span>
            </li>
          ))}
        </ul>
      </Notice>
    )
  } else if (!viewer) {
    body = (
      <p className="mt-8 text-base text-stone-600 leading-relaxed">
        となりへの参加の希望は、
        <Link href="/demo/groups" className="mx-1 text-orange-700 hover:underline">
          患者会をさがす
        </Link>
        のページや、それぞれの病気のページから登録できます。
      </p>
    )
  } else {
    const wishes = await listMyWishes()
    body =
      wishes === null ? (
        <p role="alert" className="mt-8 text-base text-rose-700">読み込めませんでした。時間をおいて、もう一度お試しください。</p>
      ) : wishes.length === 0 ? (
        <p className="mt-8 text-base text-stone-600" data-wish-empty>
          となりへの参加を希望した患者会はありません。
          <Link href="/demo/groups" className="ml-1 text-orange-700 hover:underline">
            患者会をさがす
          </Link>
        </p>
      ) : (
        <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
          <MyWishList wishes={wishes} back="list" />
        </section>
      )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">となりへの参加を希望した患者会</h1>
      <WishFlash params={searchParams} />
      {body}
    </div>
  )
}
