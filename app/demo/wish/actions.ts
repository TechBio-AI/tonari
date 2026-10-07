'use server'

// 参加希望の登録・取り消し（server action）
//
// ログイン中の本人（kind: 'member'。プロフィールの有無は問わない）だけ。閲覧モード・未ログインでは書かない。
// 結果は ?done= / ?error= を付けて戻す（入力値は URL に載せない。ログにも出さない）。

import { notFound, redirect } from 'next/navigation'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'

import { getViewer } from '../_lib/session'
import { existingGroupsOf, isWishable, wishTargetOf } from './_lib/targets'
import { createWish, resumeWish, withdrawWish } from './_lib/wishes'
import { requestNewGroup } from '../_lib/contract-db'

function text(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}

async function requireSignedIn(back: string): Promise<void> {
  if (!isFeatureEnabled('WISHES')) notFound() // 機能フラグ WISHES（既定 off）。閉じていれば何も書かない
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect(back)
}

export async function createWishAction(idx: number, fd: FormData): Promise<void> {
  const target = wishTargetOf(idx)
  if (!target) redirect('/demo/groups')
  const here = `/demo/wish/${target.idx}`
  // 患者会がすでに参加している病気には登録しない（画面はその会へ案内している）
  if (!isWishable(target)) redirect(here)
  await requireSignedIn(here)
  const member = text(fd, 'isGroupMember')
  const r = await createWish({
    diseaseIdx: target.idx,
    prefecture: text(fd, 'prefecture'),
    relation: text(fd, 'relation'),
    isGroupMember: member === 'yes' ? true : member === 'no' ? false : null,
    consent: fd.get('consent') === 'yes',
  })
  if (!r.ok) redirect(`${here}?error=${r.reason}`)
  redirect(`${here}?done=wished`)
}

/** 取り消した希望を再開する（答えは前のまま。同意は改めて） */
export async function resumeWishAction(idx: number, fd: FormData): Promise<void> {
  const target = wishTargetOf(idx)
  if (!target) redirect('/demo/groups')
  const here = `/demo/wish/${target.idx}`
  if (!isWishable(target)) redirect(here)
  await requireSignedIn(here)
  const r = await resumeWish(target.idx, fd.get('consent') === 'yes')
  if (!r.ok) redirect(`${here}?error=${r.reason}`)
  redirect(`${here}?done=wished`)
}

/** 取り消す。back は戻り先（参加希望の画面・状況の一覧・マイページのどれか） */
export async function withdrawWishAction(idx: number, back: 'wish' | 'list' | 'profile'): Promise<void> {
  const target = wishTargetOf(idx)
  if (!target) redirect('/demo/groups')
  const path = back === 'list' ? '/demo/wish' : back === 'profile' ? '/demo/community/profile' : `/demo/wish/${target.idx}`
  await requireSignedIn(path)
  const r = await withdrawWish(target.idx)
  if (!r.ok) redirect(`${path}?error=${r.reason}`)
  redirect(`${path}?done=withdrawn`)
}

/**
 * この病気の会を作りたい（会の新設の申請。DB 関数 request_new_group。共通契約 2026-10-03 の E）。
 * 申請できるのは、その病気の参加希望者か、その病気の会の在籍会員だけ（DB が確かめる。それ以外は forbidden）
 */
export async function requestNewGroupAction(idx: number, fd: FormData): Promise<void> {
  const target = wishTargetOf(idx)
  if (!target) redirect('/demo/groups')
  const here = `/demo/wish/${target.idx}/new-group`
  await requireSignedIn(here)
  if (!target.diseaseId) redirect(`${here}?error=invalid_input`)
  // data/patient_groups に既存の会がある病気は、理由（運営へのひとこと）を必須にする（2026-10-04）
  if (existingGroupsOf(target.name).length > 0 && text(fd, 'message').trim() === '') redirect(`${here}?error=reason_required`)
  const r = await requestNewGroup(target.diseaseId, text(fd, 'name'), text(fd, 'message'))
  if (!r.ok) redirect(`${here}?error=${r.reason}`)
  redirect(`${here}?done=requested`)
}
