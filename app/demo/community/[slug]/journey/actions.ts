'use server'

// 「病気がわかるまでの道のり」の回答（server action）
//
// JOURNEY_SURVEY=on・会員（kind: 'member'）・調査を出す会・同意のチェック・全設問の値を確かめてから、
// lib/portal/journey-survey-db.ts の submitMyJourneyResponse を呼ぶ。閲覧モード（demo）では何もしない。
// 会の id は画面から受け取らず、slug からサーバー側で引く。
// 結果は ?error=<理由> を付けて回答のページへ戻すか、成功なら自分の回答のページへ ?done=answered で送る。
// 回答の値は URL に載せない。ログにも出さない。

import { redirect } from 'next/navigation'

import { isJourneyEnabled, journeyFormToRaw, validateJourneyAnswers, type JourneyFailure } from '@/lib/portal/journey-survey'
import { submitMyJourneyResponse } from '@/lib/portal/journey-survey-db'
import { listGroups } from '@/lib/portal/tenancy'

import { getViewer } from '../../../_lib/session'
import { groupPath } from '../_lib/access'
import { MY_JOURNEY_PATH, isJourneyGroup } from '../_lib/journey'

function back(slug: string, reason: JourneyFailure): never {
  if (reason === 'unauthenticated') redirect('/demo/login')
  redirect(`${groupPath(slug, '/journey')}?error=${encodeURIComponent(reason)}`)
}

export async function submitJourneyAction(slug: string, fd: FormData): Promise<void> {
  if (!isJourneyEnabled()) back(slug, 'disabled')

  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')
  if (!viewer.hasProfile || viewer.needsConsent) redirect('/demo/community/onboarding')
  if (!isJourneyGroup(slug, false)) back(slug, 'not_member')

  const groups = await listGroups()
  const groupId = groups.ok ? groups.value.find((g) => g.slug === slug)?.id : undefined
  if (!groupId) back(slug, 'not_member')

  // 同意のチェック（画面の required とは別に、ここでも確かめる）
  if (fd.get('consent') !== 'yes') back(slug, 'consent_required')

  const check = validateJourneyAnswers(journeyFormToRaw(fd))
  if (!check.ok) back(slug, 'invalid_input')

  const r = await submitMyJourneyResponse(groupId, check.value)
  if (!r.ok) back(slug, r.reason)
  redirect(`${MY_JOURNEY_PATH}?done=answered`)
}
