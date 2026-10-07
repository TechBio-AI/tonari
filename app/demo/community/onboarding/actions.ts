'use server'

// 初回のプロフィール保存（server action。共通部品 ProfileForm の save に渡す）と、利用目的の再同意
//
// 会員（kind: 'member'）であることを確かめ、閲覧モード（demo）・未ログインでは保存しない。
// 同意（consent: true）が無いものは、項目がそろっていても保存しない（画面側のチェックとは別に、ここでも確かめる）。
// 結果に入力値（氏名など）は含めない。ログにも残さない（lib/portal/member-profile.ts の約束）。
//
// 同意は consents（kind: base、いまの版）に記録する（2026-09-26 同意の版管理）。
// member_profiles.consented_at も従来どおり最初の保存で立つ（後方互換。消さない）。
// 書く順番: プロフィール → 同意の行。同意の行だけ失敗したときは、次に入ったとき再同意の画面が出る（入れない側に倒れる）。

import { recordMyConsent } from '@/lib/portal/consents'
import { upsertMyProfile } from '@/lib/portal/member-profile'

import { getViewer } from '../../_lib/session'
import type { ProfileSaveResult } from '../_components/ProfileForm'
import { CONSENT_REQUIRED_MESSAGE } from '../_components/purpose'

export async function saveOnboardingProfile(input: { profile: unknown; consent?: unknown }): Promise<ProfileSaveResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') {
    return { ok: false, reason: 'unauthenticated' }
  }

  if (input?.consent !== true) {
    return { ok: false, errors: [{ field: 'consent', message: CONSENT_REQUIRED_MESSAGE }] }
  }

  const result = await upsertMyProfile(input.profile)
  if (!result.ok) {
    return result
  }
  return consentResult(await recordMyConsent('base'))
}

/** プロフィールはあるが、利用目的のいまの版に同意していない方の再同意（onboarding の ReconsentForm から） */
export async function reconsentBase(input: { consent?: unknown }): Promise<ProfileSaveResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member' || !viewer.hasProfile) {
    return { ok: false, reason: 'unauthenticated' }
  }
  if (input?.consent !== true) {
    return { ok: false, errors: [{ field: 'consent', message: CONSENT_REQUIRED_MESSAGE }] }
  }
  return consentResult(await recordMyConsent('base'))
}

function consentResult(r: Awaited<ReturnType<typeof recordMyConsent>>): ProfileSaveResult {
  if (r.ok) return { ok: true }
  return { ok: false, reason: r.reason === 'unauthenticated' ? 'unauthenticated' : 'failed' }
}
