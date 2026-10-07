'use server'

// 「病気がわかるまでの道のり」の回答の取り消し（server action。/demo/community/journey から）
//
// JOURNEY_SURVEY=on・会員（kind: 'member'）・確認のチェックを確かめてから、withdrawMyJourneyResponse を呼ぶ。
// 本人の回答かどうかは DB の withdraw_my_journey_response が対応表で確かめる（他人の回答は not_found）。
// 閲覧モード（demo）では何もしない。プロフィール・利用目的の再同意が無くても取り消せる（研究への参加をやめる道は閉じない）。

import { redirect } from 'next/navigation'

import { isJourneyEnabled, type JourneyFailure } from '@/lib/portal/journey-survey'
import { withdrawMyJourneyResponse } from '@/lib/portal/journey-survey-db'
import { isUuid } from '@/lib/portal/tenancy'

import { getViewer } from '../../_lib/session'
import { MY_JOURNEY_PATH } from '../[slug]/_lib/journey'

function back(reason: JourneyFailure): never {
  if (reason === 'unauthenticated') redirect('/demo/login')
  redirect(`${MY_JOURNEY_PATH}?error=${encodeURIComponent(reason)}`)
}

export async function withdrawJourneyAction(responseId: string, fd: FormData): Promise<void> {
  if (!isJourneyEnabled()) back('disabled')

  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')

  if (!isUuid(responseId)) back('not_found')
  if (fd.get('confirm') !== 'yes') back('invalid_input')

  const r = await withdrawMyJourneyResponse(responseId)
  if (!r.ok) back(r.reason)
  redirect(`${MY_JOURNEY_PATH}?done=withdrawn`)
}
