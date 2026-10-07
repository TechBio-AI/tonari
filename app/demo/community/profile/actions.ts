'use server'

// マイページの保存（server action）
//
// 本人確認は二重にする: ここで getViewer() が会員であることを確かめ、upsertMyProfile() の中でも
// セッションの user_id で行を決める（他人の行は書けない。RLS の with check と合わせて三重）。
// 閲覧コードの見本（kind: 'demo'）では保存しない。
//
// 研究・治験の案内（B 層）の同意・選び直し・取り消しも同じ確かめ方をする（lib/portal/research-contact.ts）。
// 利用目的（base）のいまの版に同意していない方には書かせない（先に再同意）。

import { upsertMyProfile, type UpsertResult } from '@/lib/portal/member-profile'
import {
  saveMyResearchContact,
  withdrawMyResearchContact,
  type ResearchWriteResult,
} from '@/lib/portal/research-contact'

import { getViewer } from '../../_lib/session'

/** 共通部品 ProfileForm の save に渡す形（{ profile, consent }）。マイページは同意済みの方だけなので consent は見ない */
export async function saveMyProfile(input: { profile: unknown; consent?: boolean }): Promise<UpsertResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') return { ok: false, reason: 'unauthenticated' }
  return upsertMyProfile(input?.profile)
}

async function isConsentedMember(): Promise<boolean> {
  const viewer = await getViewer()
  return !!viewer && viewer.kind === 'member' && viewer.hasProfile && !viewer.needsConsent
}

/** 研究・治験の案内に同意する（同意済みの方は、病気の選び直し） */
export async function saveResearchContact(input: { consent?: unknown; diseases?: unknown }): Promise<ResearchWriteResult> {
  if (!(await isConsentedMember())) return { ok: false, reason: 'unauthenticated' }
  return saveMyResearchContact(input)
}

/** 研究・治験の案内を取り消す（選んだ病気の記録も消える） */
export async function withdrawResearchContact(): Promise<ResearchWriteResult> {
  if (!(await isConsentedMember())) return { ok: false, reason: 'unauthenticated' }
  return withdrawMyResearchContact()
}
