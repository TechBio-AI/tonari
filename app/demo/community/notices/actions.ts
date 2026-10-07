'use server'

// 案件への反応（「興味がある」「表示しない」）。本人に見えている案件にだけ付けられる（DB 関数 set_notice_interest が確かめる）

import { notFound, redirect } from 'next/navigation'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../../_lib/session'
import { setNoticeInterest } from '../../_lib/contract-db'

export async function setNoticeInterestAction(noticeId: string, status: 'interested' | 'dismissed'): Promise<void> {
  if (!isFeatureEnabled('TRIAL_NOTICES')) notFound() // 機能フラグ TRIAL_NOTICES（既定 off）
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')
  const r = await setNoticeInterest(noticeId, status)
  redirect(`/demo/community/notices?${r.ok ? `done=${status}` : `error=${r.reason}`}`)
}
