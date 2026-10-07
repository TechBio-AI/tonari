// アカウントの削除の確認画面（会員エリア。/demo/community/account/delete）
//
// 「この会を退会する」（1 つの会を抜けるだけ。会員情報は残る）とは別物。ここは会員情報をすべて消す。
// 消えるもの・残るものは docs/account-deletion.md の表と同じにする（土台の delete_my_account 版 5。20261027。auth.users も消える）。
// 関数の文との突き合わせは scripts/portal/diff_delete_items.py（docs/account_deletion_screen_diff_2026-10-04.md）。
// 「運営としての役割」は運営の人にだけ出す（is_operator()。分からなければ出さない）。
//   - 未ログイン → /demo/login
//   - 閲覧モード（demo）→ 404（見本は消せない）
//   - プロフィールが無い会員も開ける（消すものが少ないだけ）
// ボタンは確認のチェックを入れたときだけ送れる。押したら ./actions.ts がサインアウトしてトップへ送る。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { FAILURE_MESSAGES, myGroups, type FailureReason, type MyGroup } from '@/lib/portal/tenancy'

import { isOperator } from '../../../_lib/contract-db'
import { getViewer } from '../../../_lib/session'
import { deleteAccountAction } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'アカウントを削除する',
  robots: { index: false, follow: false },
}

/** 最後の世話人のときに、土台の文言に添える案内 */
const LAST_MODERATOR_GUIDE =
  '世話人を務めている会があるときは、その会のほかの会員に世話人を代わってもらってから、もう一度お試しください。'

/** ほかに運営がいないときに、土台の文言に添える案内 */
const LAST_OPERATOR_GUIDE = '運営を務めているときは、ほかの方に運営を代わってもらってから、もう一度お試しください。'

async function myGroupsSafe(): Promise<MyGroup[]> {
  try {
    const r = await myGroups()
    return r.ok ? r.value : []
  } catch {
    return []
  }
}

export default async function DeleteAccountPage({ searchParams }: { searchParams?: { error?: string | string[] } }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')
  if (viewer.kind !== 'member') notFound() // DEMO_ACCESS: 閲覧モードでは使えない

  const rawError = typeof searchParams?.error === 'string' ? searchParams.error : undefined
  const error =
    rawError && Object.prototype.hasOwnProperty.call(FAILURE_MESSAGES, rawError) ? (rawError as FailureReason) : null
  const [groups, operator] = await Promise.all([myGroupsSafe(), isOperator()])

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <Link href="/demo/community/profile" className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        マイページにもどる
      </Link>

      <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-stone-800">アカウントを削除する（すべての会員情報を消す）</h1>

      {error && (
        <div role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-base text-rose-800 leading-relaxed">
          <p>{FAILURE_MESSAGES[error]}</p>
          {error === 'last_moderator' && <p className="mt-2">{LAST_MODERATOR_GUIDE}</p>}
          {error === 'last_operator' && <p className="mt-2">{LAST_OPERATOR_GUIDE}</p>}
        </div>
      )}

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">消えるもの</h2>
        <ul className="mt-3 list-disc pl-6 space-y-2 text-base text-stone-700 leading-relaxed" data-deleted-items>
          <li>プロフィール（氏名・表示名・年代・性別・お住まいの都道府県など）</li>
          <li>利用目的などへの同意の記録</li>
          <li>研究・治験の案内を受け取る病気</li>
          <li>治験・研究の案内への「興味がある」「表示しない」の記録</li>
          <li>病気がわかるまでの道のりの回答</li>
          <li>行事への参加の予定</li>
          <li>あなたがした通報</li>
          <li>患者会への参加の希望</li>
          <li>会を作りたいという申請（申請中のものも、結果が出たものも）</li>
          <li>すべての会の会員資格（入会の申請と、発行した招待も消えます）</li>
          {operator && <li>運営としての役割</li>}
        </ul>

        <h2 className="mt-8 text-xl font-bold text-stone-800">残るもの</h2>
        <p className="mt-3 text-base text-stone-700 leading-relaxed">
          これまでに書いた投稿とコメントは、会に残ります。名前は表示されなくなります。
        </p>
        <p className="mt-2 text-base text-stone-700 leading-relaxed" data-kept-records>
          世話人や運営として作った行事・リンク・案内や、対応・審査の記録も残ります。あなたの名前とは結びつかなくなります。
          あなたの申請でできた会は、そのまま残ります。
        </p>

        <p className="mt-6 text-base text-stone-700 leading-relaxed">削除すると、元に戻せません。</p>
        <p className="mt-2 text-sm text-stone-500 leading-relaxed">
          ログインに使うメールアドレスも消えます。もう一度ご利用になるには、改めて患者会からの招待が必要です。
        </p>
      </section>

      <section className="mt-6 rounded-3xl bg-stone-50 border border-stone-200 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-stone-800">1 つの会だけを抜けたいときは</h2>
        <p className="mt-2 text-base text-stone-600 leading-relaxed">
          アカウントの削除ではなく、その会のページの末尾にある「この会を退会する」をお使いください。
          会員情報とほかの会の会員資格はそのまま残ります。
        </p>
        {groups.length > 0 && (
          <ul className="mt-3 space-y-1" data-leave-links>
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/demo/community/${encodeURIComponent(g.slug)}/leave`}
                  className="text-base text-orange-700 hover:underline"
                >
                  {g.name}：この会を退会する
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deleteAccountAction} className="mt-8 rounded-3xl bg-white border border-rose-200 p-6 sm:p-8">
        <label className="flex items-start gap-3 text-base text-stone-800">
          <input type="checkbox" name="confirm" value="yes" required className="mt-1 h-5 w-5" />
          <span>上の内容を確かめました。すべての会員情報を消します。</span>
        </label>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="submit" className="rounded-2xl bg-rose-700 px-6 py-3 text-base font-semibold text-white hover:bg-rose-800">
            アカウントを削除する
          </button>
          <Link href="/demo/community/profile" className="text-base text-stone-600 hover:underline">
            やめる（マイページにもどる）
          </Link>
        </div>
      </form>
    </div>
  )
}
