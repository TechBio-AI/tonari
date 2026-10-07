// 病気ごとの参加の状況（公開。/demo/participation。共通契約 2026-10-03 の D）
//
// 読むのは公開用の表 public_disease_participation だけ（元の表は読まない）。値は文字のまま（'10未満' を数に直さない・合計しない）。
//   members          … その病気を対象にする会の在籍会員（同じ人が複数の会にいても 1 人）
//   research_contact … 研究・治験の案内を受け取る設定にし、その病気を選んでいる人
//   wishes           … となりへの参加を希望している人
// 解釈の文は付けない。個人の状態には触れない。静的に書き出し、600 秒ごとに作り直す。
// 並びは、どれかが「10未満」でない病気を先に、そのあとは一覧の順。各行に id（固定 ID）を付け、疾患ページから #rd00001 で飛べる。

import type { Metadata } from 'next'
import Link from 'next/link'

import { fetchParticipation } from '../_lib/contract-db'
import { allWishTargets } from '../wish/_lib/targets'
import { Notice } from '../_components/Notice'

export const dynamic = 'force-static'
export const revalidate = 600

export const metadata: Metadata = { title: '病気ごとの参加の状況' }

const SUPPRESSED = '10未満'

export default async function ParticipationPage() {
  const rows = await fetchParticipation()
  const byId = new Map((rows ?? []).map((r) => [r.diseaseId, r]))
  const list = allWishTargets()
    .filter((t) => t.diseaseId && byId.has(t.diseaseId))
    .map((t) => ({ t, p: byId.get(t.diseaseId as string)! }))
  const notable = (x: (typeof list)[number]) => [x.p.members, x.p.researchContact, x.p.wishes].some((v) => v !== SUPPRESSED)
  const ordered = [...list.filter(notable), ...list.filter((x) => !notable(x))]

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">病気ごとの参加の状況</h1>
      <p className="mt-3 text-base sm:text-lg text-stone-600 leading-relaxed">
        病気ごとに、「となり」の会員エリアに参加している方などの人数をお知らせしています。
      </p>
      <p className="mt-2 text-sm text-stone-500" data-participation-note>
        10 人未満は『10未満』と表示しています（0 人の場合も含みます）。
      </p>

      {rows === null ? (
        <p className="mt-8 text-base text-stone-600">いまは表示できません。時間をおいて、もう一度ご覧ください。</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-base" data-participation-table>
            <thead>
              <tr className="border-b border-stone-200 text-left text-sm text-stone-500">
                <th scope="col" className="py-2 pr-3 font-normal">病気</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">会の会員</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">研究・治験の案内を受け取る方</th>
                <th scope="col" className="py-2 text-right font-normal">となりへの参加を希望している方</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map(({ t, p }) => (
                <tr key={t.diseaseId} id={t.diseaseId ?? undefined} className="border-b border-stone-100" data-participation-row={t.diseaseId}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <Link href={`/demo/diseases/${encodeURIComponent(t.slug)}`} className="text-stone-800 hover:text-orange-700 hover:underline">
                      {t.name}
                    </Link>
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.members}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.researchContact}</td>
                  <td className="py-2 text-right tabular-nums">{p.wishes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Notice className="mt-10">
        <p>
          <Link href="/demo/groups" className="text-orange-700 hover:underline">患者会をさがす</Link>
          から、それぞれの会のページや、となりへの参加の希望の登録へ進めます。
        </p>
      </Notice>
    </div>
  )
}
