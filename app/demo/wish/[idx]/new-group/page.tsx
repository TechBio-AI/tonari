// この病気の会を作りたい（会の新設の申請。/demo/wish/[idx]/new-group。共通契約 2026-10-03 の E）
//
// 申請できるのは、その病気の参加希望者か、その病気の会の在籍会員（DB 関数 request_new_group が確かめる）。
// 運営が承認すると会が作られ、申請した方がその会の世話人になる。公開ページは /demo/groups/<slug>（public_groups から出る）。
// 同じ病気への申請中は 1 人 1 件（already_requested）。本人の申請の状況（申請中・承認・却下）を出す。
//   - 未ログイン … 参加の希望の画面へ（そこでメールアドレスを確かめる）
//   - 閲覧モード … 見本の説明だけ（申請できない）
// 2026-10-04: data/patient_groups にその病気の団体（となり未参加を含む）があれば、冒頭にその会の案内と公式サイトへのリンクを出し、
//   それでも申請するときは理由（運営へのひとこと）を必須にする（action でも確かめる。?error=reason_required）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../../../_lib/session'
import { CONTRACT_FAILURE_MESSAGES, NEW_GROUP_MESSAGE_MAX, NEW_GROUP_NAME_MAX, isContractFailure, listGroupRequests } from '../../../_lib/contract-db'
import { requestNewGroupAction } from '../../actions'
import { existingGroupsOf, wishTargetOf } from '../../_lib/targets'
import { ExistingGroupsNotice, REASON_REQUIRED_MESSAGE } from '../../_components/ExistingGroupsNotice'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'この病気の会を作りたい',
  robots: { index: false, follow: false },
}

const STATUS_LABEL = { pending: '運営が確かめています', approved: '承認されました', rejected: '見送りになりました' } as const
const input = 'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800'

export default async function NewGroupPage({ params, searchParams }: { params: { idx: string }; searchParams?: { error?: string; done?: string } }) {
  if (!isFeatureEnabled('WISHES')) notFound() // 機能フラグ WISHES（既定 off）
  const t = wishTargetOf(decodeURIComponent(params.idx))
  if (!t) notFound()
  const viewer = await getViewer()
  if (!viewer) redirect(`/demo/wish/${t.idx}`)

  const error = typeof searchParams?.error === 'string' && isContractFailure(searchParams.error) ? CONTRACT_FAILURE_MESSAGES[searchParams.error] : null
  const forbidden = searchParams?.error === 'forbidden'
  const done = searchParams?.done === 'requested'
  const reasonRequired = searchParams?.error === 'reason_required'
  const existing = existingGroupsOf(t.name)

  let body: React.ReactNode
  if (viewer.kind === 'demo') {
    body = <p className="mt-8 text-base text-stone-600" data-new-group-demo>プロトタイプの閲覧モードです。見本では会の新設を申請できません。</p>
  } else {
    const mine = await listGroupRequests()
    const here = mine.ok ? mine.value.filter((q) => q.diseaseId === t.diseaseId) : []
    const pending = here.find((q) => q.status === 'pending')
    body = (
      <>
        {here.length > 0 && (
          <ul className="mt-8 space-y-2" data-new-group-status>
            {here.map((q) => (
              <li key={q.id} className="rounded-2xl bg-white border border-stone-200 p-4 text-base text-stone-700">
                「{q.proposedName}」：{STATUS_LABEL[q.status]}
              </li>
            ))}
          </ul>
        )}
        {!pending && (
          <form action={requestNewGroupAction.bind(null, t.idx)} className="mt-8 space-y-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-new-group-form>
            <label className="block text-base font-semibold text-stone-800">
              会の名前（案）
              <input name="name" required maxLength={NEW_GROUP_NAME_MAX} className={input} />
            </label>
            {existing.length > 0 ? (
              <label className="block text-base font-semibold text-stone-800">
                それでも新しく会を作りたい理由（運営へのひとこと。必ず書いてください）
                <textarea name="message" required maxLength={NEW_GROUP_MESSAGE_MAX} rows={4} className={input} />
              </label>
            ) : (
              <label className="block text-base font-semibold text-stone-800">
                運営へのひとこと（なくてもかまいません）
                <textarea name="message" maxLength={NEW_GROUP_MESSAGE_MAX} rows={4} className={input} />
              </label>
            )}
            <p className="text-sm text-stone-500">
              運営が確かめたうえで、会を作ります。会ができると、申請した方がその会の世話人になります。
            </p>
            <button type="submit" className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
              申請する
            </button>
          </form>
        )}
      </>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <Link href={`/demo/wish/${t.idx}`} className="inline-flex items-center gap-1 text-base text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" />
        となりへの参加の希望にもどる
      </Link>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">「{t.name}」の会を作りたい</h1>
      <p className="mt-4 text-base sm:text-lg text-stone-600 leading-loose">
        この病気の患者会が「となり」にまだ無いときに、新しく会を作ることを運営に申請できます。申請できるのは、この病気について、となりへの参加を希望している方です。
      </p>
      <ExistingGroupsNotice groups={existing} />
      {done && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-base text-emerald-800">申請を受け付けました。運営が確かめます。</p>}
      {reasonRequired && <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800">{REASON_REQUIRED_MESSAGE}</p>}
      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800">
          {forbidden ? '申請できるのは、この病気について、となりへの参加を希望している方です。先に参加の希望を登録してください。' : error}
        </p>
      )}
      {body}
    </div>
  )
}
