// 世話人のページ（会員エリア。/demo/community/[slug]/manage）
//
// 世話人（moderator）以外は 404。判定は ../_lib/access.ts。
// 閲覧モードは世話人の画面の見本（DemoManageView。架空・操作なし・DB は読まない）。
//   1. 招待リンクを作る（1 回だけ使える。期限つき）
//   2. 入会の申請を承認する／見送る。承認で会員になる（DB 関数 approve_join_request）。
//      申請した人は表示名・氏名・紹介者の氏名で出す（DB 関数 list_join_requests が世話人にだけ渡す。v2。user_id・メールは渡らない）。
//      氏名・紹介者の氏名は個人識別子なので、このページの審査の欄にだけ出す（会員一覧・書き出しには出さない。ログに出さない）
//   3. お知らせを書く
//   4. 書き出し（会の投稿・コメント・会員の表示名。本名と user_id は入らない）
//   会員一覧への入口もここだけ（世話人だけが見る。2026-10-01 ファウンダー指示）
//   会員の状況（集計。./dashboard）への入口もここだけ（2026-10-02 ファウンダー指示）
//   お知らせの「公開ページにも出す」（is_public。注意文は行事と同じ）。公開ページへの写しは DB のトリガーが作る
//   行事（./events）・資料とリンク（./links）・通報（./reports）・会の約束（./rules）の編集への入口

import type { Metadata } from 'next'
import Link from 'next/link'

import {
  INVITATION_DAYS_DEFAULT,
  INVITATION_DAYS_MAX,
  POST_BODY_MAX,
  POST_TITLE_MAX,
  listPendingJoinRequests,
} from '@/lib/portal/tenancy'

import {
  approveJoinRequestAction,
  createAnnouncementAction,
  createInvitationAction,
  rejectJoinRequestAction,
} from '../actions'
import { groupPath, requireModeratorViewAccess } from '../_lib/access'
import { GroupShell, NO_DISPLAY_NAME, formatDate, type FlashParams } from '../_components/GroupShell'
import { buttonClass, inputClass } from '../_components/Posts'
import { PUBLIC_POST_NOTICE } from '../_lib/community'
import { InviteForm } from './InviteForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '世話人のページ',
  robots: { index: false, follow: false },
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** 会員の状況（集計）への入口（世話人のページと、閲覧モードの見本に置く。見本では 26 行の架空の数へ） */
function DashboardCard({ slug }: { slug: string }) {
  return (
    <Card title="会員の状況">
      <p className="text-base text-stone-600 leading-relaxed">
        会員の人数や、登録する方・年代・性別・地方ごとの人数を見られます。印刷もできます。
      </p>
      <Link
        href={groupPath(slug, '/manage/dashboard')}
        className="mt-4 inline-block rounded-2xl border border-orange-200 bg-orange-50 px-6 py-3 text-base font-medium text-orange-800 hover:bg-orange-100"
      >
        会員の状況を見る
      </Link>
    </Card>
  )
}

/** 会員一覧への入口（世話人のページにだけ置く） */
function MembersCard({ slug }: { slug: string }) {
  return (
    <Card title="会員一覧">
      <p className="text-base text-stone-600 leading-relaxed">
        この会の会員の表示名・世話人の印・入会日を見られます。一般の会員には見えません。
      </p>
      <Link
        href={groupPath(slug, '/members')}
        className="mt-4 inline-block rounded-2xl border border-orange-200 bg-orange-50 px-6 py-3 text-base font-medium text-orange-800 hover:bg-orange-100"
      >
        会員一覧を見る
      </Link>
    </Card>
  )
}

// DEMO_ACCESS: 本番前に削除。世話人の画面の見本（操作はできない。DB は読まない）
function DemoManageView({ slug, name }: { slug: string; name: string }) {
  return (
    <GroupShell groupName={name} slug={slug} demo moderator={false} tab="manage">
      <p className="mt-8 text-base text-stone-600 leading-relaxed">
        <span className="font-semibold text-stone-700" data-sample-mark>世話人のページ（見本）</span>
        <br />
        世話人の方が使う画面の見本です。見本では、招待・承認・掲載・書き出しの操作はできません。
      </p>
      <Card title="招待リンクを作る">
        <p className="text-base text-stone-600 leading-relaxed">1 人に 1 つずつ、期限つきの招待リンクを作れます。</p>
      </Card>
      <Card title="入会の申請">
        <p className="text-base text-stone-600 leading-relaxed">入会を希望する方の申請を、承認したり見送ったりできます。</p>
      </Card>
      <MembersCard slug={slug} />
      {/* 会員の状況の見本（26 行の架空の数。2026-10-04） */}
      <DashboardCard slug={slug} />
      <Card title="お知らせを書く">
        <p className="text-base text-stone-600 leading-relaxed">会員の方だけが読めるお知らせを掲載できます。</p>
      </Card>
      <Card title="書き出し">
        <p className="text-base text-stone-600 leading-relaxed">会の投稿・コメント・会員の表示名を、1 つのファイルで保存できます。</p>
      </Card>
    </GroupShell>
  )
}

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: FlashParams
}) {
  const access = await requireModeratorViewAccess(params.slug, 'notFound')
  if (access.mode === 'demo') return <DemoManageView slug={access.group.slug} name={access.group.name} /> // DEMO_ACCESS: 本番前に削除
  const { group } = access
  const requests = await listPendingJoinRequests(group.id)
  if (!requests.ok) throw new Error('入会の申請を読み込めませんでした')

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage" flash={searchParams}>
      <Card title="招待リンクを作る">
        <p className="mb-4 text-base text-stone-600 leading-relaxed">
          リンクを受け取った方は、ログインしてプロフィールを登録したあと、リンクを開くとこの会の会員になります。
        </p>
        <InviteForm
          create={createInvitationAction.bind(null, group.slug)}
          daysDefault={INVITATION_DAYS_DEFAULT}
          daysMax={INVITATION_DAYS_MAX}
        />
      </Card>

      <Card title={`入会の申請（${requests.value.length} 件）`}>
        <p className="mb-4 text-sm text-stone-500 leading-relaxed">
          氏名は審査のためにお見せしています。申請中の間だけ表示されます。会の外に出さないでください。
        </p>
        {requests.value.length === 0 ? (
          <p className="text-base text-stone-600">申請はありません。</p>
        ) : (
          <ul className="space-y-4">
            {requests.value.map((r) => (
              <li key={r.id} className="rounded-2xl border border-stone-200 p-5">
                <p className="text-base font-semibold text-stone-800">{r.displayName ?? NO_DISPLAY_NAME}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base text-stone-700">
                  <dt className="text-stone-500">氏名</dt>
                  <dd data-full-name>{r.fullName ?? '未登録'}</dd>
                  <dt className="text-stone-500">紹介者</dt>
                  <dd data-referrer-name>{r.referrerName ?? 'なし'}</dd>
                </dl>
                <p className="mt-2 text-sm text-stone-500">{formatDate(r.createdAt)} の申請</p>
                <p className="mt-2 text-base text-stone-800 whitespace-pre-line">
                  {r.message !== '' ? r.message : '（ひとことはありません）'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={approveJoinRequestAction.bind(null, group.slug, r.id)}>
                    <button type="submit" className={buttonClass}>
                      承認する
                    </button>
                  </form>
                  <form action={rejectJoinRequestAction.bind(null, group.slug, r.id)}>
                    <button
                      type="submit"
                      className="rounded-2xl border border-stone-300 bg-white px-6 py-3 text-base text-stone-700 hover:bg-stone-50"
                    >
                      見送る
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MembersCard slug={group.slug} />
      <DashboardCard slug={group.slug} />

      <Card title="会の運営">
        <ul className="space-y-3 text-base" data-manage-links>
          {[
            ['/manage/events', '行事を作る・直す'],
            ['/manage/links', '資料とリンクを足す・直す'],
            ['/manage/reports', '通報を確かめる'],
            ['/manage/rules', '会の約束を書く'],
          ].map(([sub, label]) => (
            <li key={sub}>
              <Link href={groupPath(group.slug, sub)} className="text-orange-700 hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="お知らせを書く">
        <form action={createAnnouncementAction.bind(null, group.slug)}>
          <label htmlFor="announcement-title" className="block text-base font-semibold text-stone-800">
            題
          </label>
          <input id="announcement-title" name="title" type="text" required maxLength={POST_TITLE_MAX} className={inputClass} />
          <label htmlFor="announcement-body" className="mt-4 block text-base font-semibold text-stone-800">
            本文
          </label>
          <textarea id="announcement-body" name="body" required maxLength={POST_BODY_MAX} rows={6} className={inputClass} />
          <p className="mt-1 text-sm text-stone-500">「公開ページにも出す」を選ばなければ、この会の会員だけが読めます。</p>
          <label className="mt-4 flex items-start gap-3 text-base text-stone-800">
            <input type="checkbox" name="isPublic" className="mt-1 h-5 w-5" data-is-public />
            <span>
              公開ページにも出す
              <span className="block text-sm text-stone-500">{PUBLIC_POST_NOTICE}</span>
            </span>
          </label>
          <button type="submit" className={`mt-4 ${buttonClass}`}>
            お知らせを掲載する
          </button>
        </form>
      </Card>

      <Card title="書き出し">
        <p className="text-base text-stone-600 leading-relaxed">
          この会の投稿・コメント・会員の表示名を、1 つのファイル（JSON）で保存できます。本名と、会員を見分ける番号は入りません。
        </p>
        <a
          href={groupPath(group.slug, '/manage/export')}
          download
          className="mt-4 inline-block rounded-2xl border border-orange-200 bg-orange-50 px-6 py-3 text-base font-medium text-orange-800 hover:bg-orange-100"
        >
          ファイルを保存する
        </a>
      </Card>
    </GroupShell>
  )
}
