// 参加希望の実数（運営。/demo/ops/wishes）
//
// 病名で探して病気を選ぶ（?q=）→ その病気の内訳（?disease=rd00001）。内訳は DB 関数 wish_summary_ops（../../_lib/contract-db.ts）。
// 実数（伏せない）なので、運営の画面の外に出さない。user_id は返らない。

import Link from 'next/link'

import { WISH_RELATION_LABELS, type WishRelation } from '../../wish/_lib/wishes'
import { getWishSummary } from '../../_lib/contract-db'
import { opsViewMode } from '../_lib/access'
import { SAMPLE_WISH_SUMMARY } from '../_lib/samples'
import { diseaseNameOf, searchDiseases } from '../_lib/resolve'
import { OPS_METADATA, OpsShell } from '../_components/OpsShell'

export const dynamic = 'force-dynamic'
export const metadata = OPS_METADATA

export default async function OpsWishesPage({ searchParams }: { searchParams?: { q?: string | string[]; disease?: string | string[] } }) {
  const demo = (await opsViewMode()) === 'demo'
  const q = typeof searchParams?.q === 'string' ? searchParams.q : ''
  const disease = typeof searchParams?.disease === 'string' && /^rd\d{5}$/.test(searchParams.disease) ? searchParams.disease : null
  const found = searchDiseases(q)
  // DEMO_ACCESS: 本番前に削除。閲覧モードは、どの病気を選んでも見本の内訳（DB は読まない）
  const summary = disease ? (demo ? { ok: true as const, value: SAMPLE_WISH_SUMMARY } : await getWishSummary(disease)) : null
  const total = summary?.ok ? summary.value.reduce((s, r) => s + r.n, 0) : null

  return (
    <OpsShell tab="wishes" demo={demo}>
      <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
        <label className="block text-base text-stone-700">
          病名で探す
          <input name="q" defaultValue={q} className="mt-1 block w-72 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base" />
        </label>
        <button type="submit" className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-base">探す</button>
      </form>
      {found.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" data-ops-disease-results>
          {found.map((t) => (
            <li key={t.diseaseId}>
              <Link href={`/demo/ops/wishes?disease=${t.diseaseId}`} className="rounded-xl bg-white border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:border-orange-300">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {disease && (
        <section className="mt-8" data-ops-wish-summary>
          <h2 className="text-xl font-bold text-stone-800">{diseaseNameOf(disease)}</h2>
          {!summary?.ok ? (
            <p role="alert" className="mt-3 text-base text-rose-700">読み込めませんでした（運営の権限か、DB の関数を確かめてください）。</p>
          ) : summary.value.length === 0 ? (
            <p className="mt-3 text-base text-stone-600">この病気への参加の希望はありません。</p>
          ) : (
            <>
              <p className="mt-2 text-base text-stone-700" data-ops-wish-total>合計 {total} 人（実数）</p>
              <table className="mt-3 w-full text-base">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-sm text-stone-500">
                    <th className="py-2 pr-3 font-normal">都道府県</th>
                    <th className="py-2 pr-3 font-normal">立場</th>
                    <th className="py-2 pr-3 font-normal">患者会の会員か</th>
                    <th className="py-2 text-right font-normal">人数</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.value.map((r, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-2 pr-3">{r.prefecture}</td>
                      <td className="py-2 pr-3">{WISH_RELATION_LABELS[r.relation as WishRelation] ?? r.relation}</td>
                      <td className="py-2 pr-3">{r.isGroupMember === null ? '未回答' : r.isGroupMember ? 'はい' : 'いいえ'}</td>
                      <td className="py-2 text-right tabular-nums">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </OpsShell>
  )
}
