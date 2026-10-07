// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モードの「会員の状況」の見本（2026-10-04）。sample-group.ts から分けた
// （会員エリアの枠が sample-group.ts を読むたびに、会員の状況の契約まで読み込まないため）。

import { DASHBOARD_CHOICES, DASHBOARD_SECTIONS } from '@/lib/portal/group-dashboard'

/** 見本の会員の状況（lib/portal/group-dashboard.ts の契約どおりの 26 行。数は架空） */
export const SAMPLE_DASHBOARD_ROWS: { section: string; choice: string; n: string }[] = (() => {
  const exact: Record<string, string> = { 'members_total/all': '24', 'moderators/all': '2', 'join_requests_pending/all': '1' }
  const big: Record<string, string> = { 'registrant_type/self': '14', 'region/kanto': '11', 'gender/女性': '13' }
  return DASHBOARD_SECTIONS.flatMap((section) =>
    (DASHBOARD_CHOICES[section] as readonly string[]).map((choice) => {
      const key = `${section}/${choice}`
      return { section, choice, n: exact[key] ?? big[key] ?? '10未満' }
    })
  )
})()

