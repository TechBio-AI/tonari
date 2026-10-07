// 登録層の中身の置き場所。
//
// middleware.ts でもセッションを確かめているが、ここでも確かめる。
// middleware の設定漏れや直接の描画でも中身が出ないように、二重にしておく。
//
// 会員情報（ログイン中の表示・マイページ・ログアウト／閲覧の終了）は、会員エリアの上部バー（./layout.tsx）にある。
// このページはお知らせだけ（2026-09-26 ファウンダー指示）。
//
// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
// 閲覧コードで入った方（kind: 'demo'）には、架空のサンプルだけを出す。会員のデータは読まない。
// 投稿やモデレーターの操作も、demo では描かない。

import type { Metadata } from 'next'
import Link from 'next/link'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { redirect } from 'next/navigation'

import { getViewer } from '../_lib/session'
import { SAMPLE_GROUP } from './_components/sample-group'

import { NO_NOTICES_YET } from './_components/notices'

// セッションに依存するので静的化させない
export const dynamic = 'force-dynamic'

// robots.txt でも外しているが、ページ側にも検索避けを置いて二重にしておく
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// DEMO_ACCESS: 本番前に削除。架空のお知らせ（団体名・人名は使わない）
const DEMO_SAMPLE_NOTICES = [
  {
    title: '【サンプル】オンライン交流会のお知らせ',
    body: 'これは見本です。会員向けページでは、このように交流会の日程や参加方法をお知らせします。',
  },
  {
    title: '【サンプル】会報の最新号を掲載しました',
    body: 'これは見本です。会報や活動報告を、会員の方だけが読める形で掲載します。',
  },
  {
    title: '【サンプル】会員向けページの使い方',
    body: 'これは見本です。お知らせの読み方や、問い合わせ先の案内をここに置きます。',
  },
]

// DEMO_ACCESS: 本番前に削除
function DemoView() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <p role="status" className="rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base font-semibold text-stone-800 leading-relaxed">
        プロトタイプの閲覧モードです。実際の会員のデータは表示されません
      </p>

      <h1 className="mt-10 text-2xl sm:text-3xl font-bold text-stone-800">会員向けページ（サンプル）</h1>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-stone-800">お知らせ（サンプル）</h2>
        <ul className="mt-5 space-y-4">
          {DEMO_SAMPLE_NOTICES.map((notice) => (
            <li key={notice.title} className="rounded-2xl bg-white border border-stone-200 p-6">
              <p className="text-lg font-semibold text-stone-800">{notice.title}</p>
              <p className="mt-2 text-base text-stone-600 leading-relaxed">{notice.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 見本で見られる画面の一覧（2026-10-04）。機能フラグが閉じている機能は出さない */}
      <section className="mt-10" data-demo-screens>
        <h2 className="text-xl font-bold text-stone-800">見本で見られる画面</h2>
        <nav aria-label="見本で見られる画面" className="mt-4 flex flex-col gap-2 text-base">
          {demoScreens().map(([href, label]) => (
            <Link key={href} href={href} className="text-orange-700 hover:underline">
              {label}（見本）
            </Link>
          ))}
        </nav>
      </section>
    </div>
  )
}

// DEMO_ACCESS: 本番前に削除。見本の画面への入口（どれも DB を読まない）
function demoScreens(): [string, string][] {
  const s = SAMPLE_GROUP.slug
  const out: [string, string][] = [
    [`/demo/community/${s}`, '会のホーム'],
    [`/demo/community/${s}/events`, '行事'],
    [`/demo/community/${s}/links`, '資料・リンク'],
    [`/demo/community/${s}/rules`, '会の約束'],
    [`/demo/community/${s}/manage/dashboard`, '会員の状況（世話人）'],
  ]
  if (isFeatureEnabled('TRIAL_NOTICES')) out.push(['/demo/community/notices', '治験・研究の案内'])
  if (isFeatureEnabled('WISHES')) out.push(['/demo/wish', 'となりへの参加の希望'])
  if (isFeatureEnabled('OPS')) out.push(['/demo/ops', '運営画面'])
  return out
}

/** プロフィールの無い方への案内（会員エリアは招待制。となりへの参加を希望した患者会の一覧へ） */
function NoProfileView() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24" data-no-profile>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">会員向けページ</h1>
      <section className="mt-10 rounded-2xl bg-white border border-stone-200 p-6 sm:p-7">
        <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
          会員エリアは招待制です。
          {isFeatureEnabled('WISHES') && (
            <Link href="/demo/wish" className="ml-1 text-orange-700 hover:underline">
              となりへの参加を希望した患者会はこちら
            </Link>
          )}
        </p>
        <p className="mt-3 text-base text-stone-600 leading-relaxed">
          患者会から招待リンクを受け取った方は、そのリンクからお入りください。
          <Link href="/demo/groups" className="ml-1 text-orange-700 hover:underline">
            患者会をさがす
          </Link>
        </p>
      </section>
    </div>
  )
}

export default async function DemoCommunityPage() {
  // 確かめられなかったときは null が返る（session.ts 側で閉じる側に倒している）
  const viewer = await getViewer()

  if (!viewer) {
    redirect('/demo/login')
  }

  // DEMO_ACCESS: 本番前に削除
  if (viewer.kind === 'demo') {
    return <DemoView />
  }

  // プロフィールが無い方（参加希望のためにメールで入った方など）は、会員エリアの会員ではない（2026-10-02 ファウンダー指示）。
  // onboarding へは送らない（プロフィールの登録は、招待リンクか入会申請の経路からだけ）。案内だけを出す
  if (!viewer.hasProfile) {
    return <NoProfileView />
  }
  // 利用目的の文の版が上がった（または同意の記録を読めなかった）会員は、同意を取り直してから入る
  if (viewer.needsConsent) {
    redirect('/demo/community/onboarding')
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">会員向けページ</h1>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-stone-800">お知らせ</h2>
        <p className="mt-5 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600">
          {NO_NOTICES_YET}
        </p>
      </section>
    </div>
  )
}
