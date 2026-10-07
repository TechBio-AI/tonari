// 退会の確認画面（会員エリア。/demo/community/[slug]/leave）
//
// 会員だけ（会員でない人は会のお知らせのページへ、閲覧モードは 404）。ボタンを押したときだけ退会する。
// 退会は DB 関数 leave_group（本人の membership に left_at を立てる。投稿・コメントは会に残る）。
// 最後の世話人は退会できない。そのときは ?error=last_moderator で戻り、土台の文言（FAILURE_MESSAGES）が出る。

import type { Metadata } from 'next'
import Link from 'next/link'

import { leaveGroupAction } from '../actions'
import { groupPath, requireRealMemberAccess } from '../_lib/access'
import { GroupShell, type FlashParams } from '../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '退会',
  robots: { index: false, follow: false },
}

export default async function LeavePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: FlashParams
}) {
  const { group, role } = await requireRealMemberAccess(params.slug)

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator={role === 'moderator'} tab={null} flash={searchParams}>
      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">この会を退会しますか</h2>
        <ul className="mt-4 list-disc pl-6 space-y-2 text-base text-stone-700 leading-relaxed">
          <li>この会のお知らせと掲示板が見られなくなります。</li>
          <li>これまでに書いた投稿とコメントは会に残ります。名前は表示されなくなります。</li>
          <li>もう一度入るには、招待リンクか入会の申請が必要です。</li>
          <li>ほかの会の会員であることや、プロフィールは変わりません。</li>
        </ul>
        <p className="mt-4 text-sm text-stone-500 leading-relaxed">
          会員情報をすべて消したいときは、マイページの
          <Link href="/demo/community/account/delete" className="mx-1 text-orange-700 hover:underline">
            アカウントを削除する（すべての会員情報を消す）
          </Link>
          をお使いください。
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form action={leaveGroupAction.bind(null, group.slug)}>
            <button type="submit" className="rounded-2xl bg-rose-700 px-6 py-3 text-base font-semibold text-white hover:bg-rose-800">
              退会する
            </button>
          </form>
          <Link href={groupPath(group.slug)} className="text-base text-stone-600 hover:underline">
            やめる（お知らせにもどる）
          </Link>
        </div>
      </section>
    </GroupShell>
  )
}
