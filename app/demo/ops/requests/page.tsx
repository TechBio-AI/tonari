// 会の新設の申請（運営。/demo/ops/requests。共通契約 2026-10-03 の E）
//
// 申請中のものに、slug（英小文字・数字・ハイフン）を入れて承認するか、却下する（DB 関数 approve_group_request / reject_group_request）。
// 承認すると会が作られ、申請者がその会の世話人になる。公開ページは public_groups から出る（/demo/groups/[slug]）。
// slug は data/patient_groups/patient_groups.json にある会と重ねない（DB は JSON だけの slug と比べられない。契約の注記）。
// 申請者が誰かは出さない（申請者の id は読まない）。
// 2026-10-04: その病気に data/patient_groups の団体（となり未参加を含む）があれば、申請の画面と同じ注意を出す（承認は止めない）。

import { approveGroupRequestAction, rejectGroupRequestAction } from '../actions'
import { listGroupRequests } from '../../_lib/contract-db'
import { opsViewMode } from '../_lib/access'
import { SAMPLE_GROUP_REQUESTS } from '../_lib/samples'
import { diseaseNameOf } from '../_lib/resolve'
import { existingGroupsOf, wishTargetByDiseaseId } from '../../wish/_lib/targets'
import { ExistingGroupsNotice } from '../../wish/_components/ExistingGroupsNotice'
import { OPS_METADATA, OpsShell, type OpsFlashParams } from '../_components/OpsShell'

export const dynamic = 'force-dynamic'
export const metadata = OPS_METADATA

const STATUS_LABEL = { pending: '申請中', approved: '承認済み', rejected: '却下' } as const

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default async function OpsRequestsPage({ searchParams }: { searchParams?: OpsFlashParams }) {
  const demo = (await opsViewMode()) === 'demo'
  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の申請（DB は読まない）
  const r = demo ? { ok: true as const, value: SAMPLE_GROUP_REQUESTS } : await listGroupRequests()

  return (
    <OpsShell tab="requests" flash={searchParams} demo={demo}>
      {!r.ok ? (
        <p role="alert" className="mt-8 text-base text-rose-700">読み込めませんでした。</p>
      ) : r.value.length === 0 ? (
        <p className="mt-8 text-base text-stone-600">申請はありません。</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {r.value.map((q) => (
            <li key={q.id} className="rounded-2xl bg-white border border-stone-200 p-5" data-ops-request>
              <p className="text-sm text-stone-500">
                {formatDate(q.createdAt)}・{diseaseNameOf(q.diseaseId)}・<span data-ops-request-status>{STATUS_LABEL[q.status]}</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-stone-800">{q.proposedName}</p>
              {q.status === 'pending' && <ExistingGroupsNotice groups={existingGroupsOf(wishTargetByDiseaseId(q.diseaseId)?.name ?? '')} ops />}
              {q.message && <p className="mt-1 text-base text-stone-700 whitespace-pre-line">{q.message}</p>}
              {q.status === 'pending' && demo && (
                // DEMO_ACCESS: 本番前に削除。見本のボタンは送らない（押しても何も起きない）
                <div className="mt-4 flex flex-wrap items-end gap-4" data-ops-demo-buttons>
                  <label className="block text-sm text-stone-700">
                    会の slug（英小文字・数字・ハイフン）
                    <input name="slug" className="mt-1 block w-56 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base" />
                  </label>
                  <button type="button" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">承認して会を作る</button>
                  <button type="button" className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700">却下する</button>
                  <p className="w-full text-sm text-stone-500">見本では、押しても何も起きません。</p>
                </div>
              )}
              {q.status === 'pending' && !demo && (
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <form action={approveGroupRequestAction.bind(null, q.id)} className="flex flex-wrap items-end gap-2">
                    <label className="block text-sm text-stone-700">
                      会の slug（英小文字・数字・ハイフン）
                      <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-1 block w-56 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base" />
                    </label>
                    <button type="submit" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                      承認して会を作る
                    </button>
                  </form>
                  <form action={rejectGroupRequestAction.bind(null, q.id)}>
                    <button type="submit" className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                      却下する
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </OpsShell>
  )
}
