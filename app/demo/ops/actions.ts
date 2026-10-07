'use server'

// 運営画面の操作（server action）。どれも先に運営かを確かめる（運営でなければ 404。DB の関数も確かめる）。
// 結果は ?done= / ?error= で戻す（入力値は URL に載せない）。案件の summary は lib/portal/trial-notices-ops.ts の
// saveTrialNotice を通す（/demo の禁止表現が含まれていたら保存しない）。

import { redirect } from 'next/navigation'

import { saveTrialNotice } from '@/lib/portal/trial-notices-ops'

import { approveGroupRequest, rejectGroupRequest, setNoticeStatus, type NoticeStatus } from '../_lib/contract-db'
import { requireOperator, requireTrialNoticesOperator, resolveDiseaseId } from './_lib/access'

function text(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}

export async function approveGroupRequestAction(requestId: string, fd: FormData): Promise<void> {
  await requireOperator()
  const r = await approveGroupRequest(requestId, text(fd, 'slug').trim())
  redirect(`/demo/ops/requests?${r.ok ? 'done=approved' : `error=${r.reason}`}`)
}

export async function rejectGroupRequestAction(requestId: string): Promise<void> {
  await requireOperator()
  const r = await rejectGroupRequest(requestId)
  redirect(`/demo/ops/requests?${r.ok ? 'done=rejected' : `error=${r.reason}`}`)
}

/** 案件を作る（id が null）・直す。summary に禁止表現があれば保存せず ?error=blocked_words */
export async function saveTrialNoticeAction(id: string | null, fd: FormData): Promise<void> {
  await requireTrialNoticesOperator()
  const diseaseId = resolveDiseaseId(text(fd, 'disease'))
  if (!diseaseId) redirect('/demo/ops/notices?error=invalid_input')
  const r = await saveTrialNotice({
    id,
    diseaseId,
    registry: text(fd, 'registry'),
    registryId: text(fd, 'registryId').trim(),
    registryUrl: text(fd, 'registryUrl').trim(),
    summary: text(fd, 'summary').trim(),
    phase: text(fd, 'phase').trim() || null,
  })
  if (!r.ok) redirect(`/demo/ops/notices?error=${r.reason}`)
  redirect(`/demo/ops/notices?done=${id ? 'notice_updated' : 'notice_created'}`)
}

export async function setNoticeStatusAction(id: string, status: NoticeStatus): Promise<void> {
  await requireTrialNoticesOperator()
  const r = await setNoticeStatus(id, status)
  redirect(`/demo/ops/notices?${r.ok ? `done=status_${status}` : `error=${r.reason}`}`)
}
