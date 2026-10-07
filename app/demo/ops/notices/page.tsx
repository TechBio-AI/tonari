// 治験・研究の案件（運営。/demo/ops/notices。共通契約 2026-10-03 の C）
//
// 案件は「公開の登録情報（jRCT・ClinicalTrials.gov）があることを会員に知らせる」ものに限る。
// summary は運営が書く中立の要約（疾患・相・対象・実施地域。連絡はリンク先へ）。薬剤名・製品名・企業名・効果の記述・
// 参加を勧める表現は書かない。保存は lib/portal/trial-notices-ops.ts を通し、/demo の禁止表現があれば保存しない。
// 作ると下書き（draft）。公開（published）・終了（closed）・下書きに戻すは set_notice_status。
// 反応（関心あり・見送り）は実数だけ（notice_interest_counts。誰かは出ない）。

import { saveTrialNoticeAction, setNoticeStatusAction } from '../actions'
import { listTrialNoticesForOps, type OpsTrialNotice } from '../../_lib/contract-db'
import { opsViewMode } from '../_lib/access'
import { SAMPLE_OPS_NOTICES } from '../_lib/samples'
import { SAMPLE_NOTICE_DISEASE_NAME } from '../../community/_components/sample-group'
import { diseaseNameOf } from '../_lib/resolve'
import { OPS_METADATA, OpsShell, type OpsFlashParams } from '../_components/OpsShell'

export const dynamic = 'force-dynamic'
export const metadata = OPS_METADATA

const STATUS_LABEL = { draft: '下書き', published: '公開中', closed: '終了' } as const
const input = 'mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base'

/** 病名（見本の案件は架空の病気） */
const nameOf = (diseaseId: string) => (diseaseId === 'sample' ? SAMPLE_NOTICE_DISEASE_NAME : diseaseNameOf(diseaseId))

function NoticeForm({ n, demo = false }: { n?: OpsTrialNotice; demo?: boolean }) {
  // DEMO_ACCESS: 本番前に削除。見本は送らない（action を付けない・ボタンは type="button"）
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    demo ? (
      <div className="space-y-3" data-ops-notice-form data-ops-demo-buttons>
        {children}
      </div>
    ) : (
      <form action={saveTrialNoticeAction.bind(null, n?.id ?? null)} className="space-y-3" data-ops-notice-form>
        {children}
      </form>
    )
  return (
    <Wrapper>
      <label className="block text-sm text-stone-700">
        病気（病名か固定 ID。例: ファブリー病 / rd00001）
        <input name="disease" required defaultValue={n ? nameOf(n.diseaseId) : ''} className={input} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="block text-sm text-stone-700">
          登録先
          <select name="registry" defaultValue={n?.registry ?? 'jrct'} className={input}>
            <option value="jrct">jRCT</option>
            <option value="ctgov">ClinicalTrials.gov</option>
          </select>
        </label>
        <label className="block text-sm text-stone-700">
          登録番号
          <input name="registryId" required maxLength={50} defaultValue={n?.registryId ?? ''} className={input} />
        </label>
        <label className="block text-sm text-stone-700">
          相（任意）
          <input name="phase" maxLength={50} defaultValue={n?.phase ?? ''} className={input} />
        </label>
      </div>
      <label className="block text-sm text-stone-700">
        登録情報の URL（https。jRCT は https://jrct.niph.go.jp/、ClinicalTrials.gov は https://clinicaltrials.gov/ で始まるもの）
        <input name="registryUrl" type="url" required maxLength={500} defaultValue={n?.registryUrl ?? ''} className={input} />
      </label>
      <label className="block text-sm text-stone-700">
        要約（2000 文字まで。疾患・相・対象・実施地域だけ。薬剤名・企業名・効果・参加を勧める表現は書かない）
        <textarea name="summary" required maxLength={2000} rows={4} defaultValue={n?.summary ?? ''} className={input} />
      </label>
      <button type={demo ? 'button' : 'submit'} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
        {n ? '直す' : '下書きで作る'}
      </button>
      {demo && <p className="text-sm text-stone-500">見本では、押しても何も起きません。</p>}
    </Wrapper>
  )
}

export default async function OpsNoticesPage({ searchParams }: { searchParams?: OpsFlashParams }) {
  const demo = (await opsViewMode({ trialNotices: true })) === 'demo'
  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の案件（DB は読まない）
  const r = demo ? { ok: true as const, value: SAMPLE_OPS_NOTICES } : await listTrialNoticesForOps()

  return (
    <OpsShell tab="notices" flash={searchParams} demo={demo}>
      <section className="mt-8 rounded-2xl bg-white border border-stone-200 p-5">
        <h2 className="text-lg font-bold text-stone-800">案件を作る</h2>
        <div className="mt-3">
          <NoticeForm demo={demo} />
        </div>
      </section>

      <h2 className="mt-10 text-lg font-bold text-stone-800">案件の一覧</h2>
      {!r.ok ? (
        <p role="alert" className="mt-3 text-base text-rose-700">読み込めませんでした。</p>
      ) : r.value.length === 0 ? (
        <p className="mt-3 text-base text-stone-600">案件はありません。</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {r.value.map((n) => (
            <li key={n.id} className="rounded-2xl bg-white border border-stone-200 p-5" data-ops-notice>
              <p className="text-sm text-stone-500">
                {nameOf(n.diseaseId)}・{n.registry === 'jrct' ? 'jRCT' : 'ClinicalTrials.gov'} {n.registryId}・
                <span data-ops-notice-status>{STATUS_LABEL[n.status]}</span>
                {n.interested !== null && `・関心あり ${n.interested}・見送り ${n.dismissed}`}
              </p>
              <p className="mt-2 text-base text-stone-800 whitespace-pre-line">{n.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['published', 'closed', 'draft'] as const)
                  .filter((s) => s !== n.status)
                  .map((s) => (
                    demo ? (
                      // DEMO_ACCESS: 本番前に削除。見本は送らない
                      <button key={s} type="button" className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700" data-ops-demo-buttons>
                        {s === 'published' ? '公開する' : s === 'closed' ? '終了する' : '下書きに戻す'}
                      </button>
                    ) : (
                      <form key={s} action={setNoticeStatusAction.bind(null, n.id, s)}>
                        <button type="submit" className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
                          {s === 'published' ? '公開する' : s === 'closed' ? '終了する' : '下書きに戻す'}
                        </button>
                      </form>
                    )
                  ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-orange-700">中身を直す</summary>
                <div className="mt-3">
                  <NoticeForm n={n} demo={demo} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </OpsShell>
  )
}
