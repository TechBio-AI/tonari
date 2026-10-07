// 運営画面（/demo/ops 配下）の入口（共通契約 2026-10-03 の B）
//
// 運営（DB の is_operator() が true）だけ。運営以外・未ログインは 404（運営画面があることも明かさない）。
// 閲覧モードは、ページだけ見本を出す（opsViewMode。2026-10-04）。action は閲覧モードも 404。
// DB の関数（approve_group_request・upsert_trial_notice など）も運営かを確かめる（二重）。

import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../../_lib/session'
import { isOperator } from '../../_lib/contract-db'

// 機能フラグ（lib/portal/feature-flags.ts。既定 off）:
//   OPS が on でなければ、運営画面はすべて 404（セッションも見ない）。
//   案件（/demo/ops/notices とその action）は、さらに TRIAL_NOTICES も on のときだけ。
export async function requireOperator(): Promise<void> {
  if (!isFeatureEnabled('OPS')) notFound()
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') notFound() // DEMO_ACCESS: 閲覧モードも 404
  if (!(await isOperator())) notFound()
}

/**
 * 運営画面のページの入口（2026-10-04）。運営なら 'operator'、閲覧モードなら 'demo'（見本を出す。DB は読まない）。
 * それ以外・OPS が off は 404。action は requireOperator を使う（閲覧モードは 404 のまま。見本からは何も書けない）
 */
export async function opsViewMode(opts: { trialNotices?: boolean } = {}): Promise<'operator' | 'demo'> {
  if (!isFeatureEnabled('OPS')) notFound()
  if (opts.trialNotices && !isFeatureEnabled('TRIAL_NOTICES')) notFound()
  const viewer = await getViewer()
  if (viewer?.kind === 'demo') return 'demo' // DEMO_ACCESS: 本番前に削除
  if (!viewer || viewer.kind !== 'member') notFound()
  if (!(await isOperator())) notFound()
  return 'operator'
}

/** 案件の運営画面（OPS と TRIAL_NOTICES の両方が on のときだけ） */
export async function requireTrialNoticesOperator(): Promise<void> {
  if (!isFeatureEnabled('TRIAL_NOTICES')) notFound()
  await requireOperator()
}

/** 病名か固定 ID（rd00001 形式）→ 固定 ID。見つからなければ null */
export { resolveDiseaseId } from './resolve'
