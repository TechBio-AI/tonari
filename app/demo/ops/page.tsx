// 運営画面のはじめのページ（/demo/ops。共通契約 2026-10-03 の B）。運営だけ（それ以外は 404）

import Link from 'next/link'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { opsViewMode } from './_lib/access'
import { OPS_METADATA, OpsShell } from './_components/OpsShell'

export const dynamic = 'force-dynamic'
export const metadata = OPS_METADATA

export default async function OpsHomePage() {
  const demo = (await opsViewMode()) === 'demo'
  return (
    <OpsShell tab="home" demo={demo}>
      <ul className="mt-8 space-y-4">
        {[
          ['/demo/ops/wishes', '参加希望の実数', '病気ごとの、となりへの参加の希望の内訳（都道府県・立場・会員かどうか）を実数で見ます。'],
          ['/demo/ops/requests', '会の新設の申請', '会を作りたいという申請を、slug を決めて承認するか、却下します。'],
          ['/demo/ops/notices', '治験・研究の案件', '公開の登録情報（jRCT・ClinicalTrials.gov）の案件を登録し、公開・終了します。'],
          ['/demo/ops/reports', '通報（全会）', 'すべての会の通報を、未対応のものから見ます。対応は、それぞれの会の世話人のページで行います。'],
        ]
          // 案件は TRIAL_NOTICES が on のときだけ
          .filter(([href]) => href !== '/demo/ops/notices' || isFeatureEnabled('TRIAL_NOTICES'))
          .map(([href, title, body]) => (
          <li key={href} className="rounded-2xl bg-white border border-stone-200 p-5">
            <Link href={href} className="text-lg font-semibold text-orange-700 hover:underline">
              {title}
            </Link>
            <p className="mt-1 text-base text-stone-600">{body}</p>
          </li>
        ))}
      </ul>
    </OpsShell>
  )
}
