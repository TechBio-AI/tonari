/**
 * 会員エリアの会ごとのページ（/demo/community/[slug]/**）の入口の判定
 *
 * middleware.ts でもセッションを確かめているが、ここでも確かめる（二重）。
 *   - 未ログイン                                 → /demo/login
 *   - 閲覧モード（demo）                          → 見本の会（slug = sample）だけ。他の slug は 404。DB は読まない
 *   - プロフィールが無い                           → /demo/community/onboarding?from=join（入会申請の経路。招待の受諾・入会申請が DB で止まるため先に）
 *   - 利用目的の再同意が要る                       → /demo/community/onboarding
 *   - 会が無い slug                               → 404
 *   - 会員でない会                                → お知らせのページ（/demo/community/[slug]）は「会員ではありません」＋入会希望フォーム。
 *                                                   その下のページ（掲示板・会員・世話人）は /demo/community/[slug] へ送る
 *   - 世話人のページ                              → 世話人（moderator）以外は 404。閲覧モードは見本（操作なし）
 *   - 会員一覧                                    → 世話人だけ。一般の会員は会のお知らせのページへ送る。閲覧モードは世話人の見本として見せる
 *   - 退会の確認画面                              → 会員だけ（閲覧モードは 404）
 *
 * 会の行（投稿・会員）は lib/portal/tenancy.ts だけを通して読む。そこでも本人の membership を確かめ、
 * DB 側も RLS で閉じている（三重）。
 */

import { notFound, redirect } from 'next/navigation'

import { listGroups, myGroups, type GroupRole, type GroupSummary } from '@/lib/portal/tenancy'
import { createClient } from '@/lib/supabase/server'

import { getViewer } from '../../../_lib/session'
import { SAMPLE_GROUP } from '../../_components/sample-group'

export type GroupAccess =
  // DEMO_ACCESS: 本番前に削除
  | { mode: 'demo'; group: GroupSummary }
  | { mode: 'member'; group: GroupSummary; role: GroupRole; userId: string | null }
  | { mode: 'outsider'; group: GroupSummary }

/**
 * ログイン中の本人の id（削除ボタンを「自分の分」に出すための見せ方だけに使う）。
 * 読むのはセッションだけで、表は読まない。消せるかどうかは DB 関数（delete_group_post / delete_group_comment）が決める。
 * 読めなかったときは null（本人の分のボタンを出さない側に倒す）。
 */
export async function myUserId(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export function groupPath(slug: string, sub = ''): string {
  return `/demo/community/${encodeURIComponent(slug)}${sub}`
}

/** slug → 会。会員になる前でも読める列（id / slug / name）だけ。見つからなければ null */
export async function findGroupBySlug(slug: string): Promise<GroupSummary | null> {
  const r = await listGroups()
  if (!r.ok) {
    if (r.reason === 'unauthenticated') redirect('/demo/login')
    throw new Error('患者会の一覧を読み込めませんでした')
  }
  return r.value.find((g) => g.slug === slug) ?? null
}

export async function resolveGroupAccess(rawSlug: string): Promise<GroupAccess> {
  const slug = decodeURIComponent(rawSlug)
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')

  // DEMO_ACCESS: 本番前に削除。見本の会だけを見せる（DB は読まない）
  if (viewer.kind === 'demo') {
    if (slug !== SAMPLE_GROUP.slug) notFound()
    return { mode: 'demo', group: SAMPLE_GROUP }
  }

  // プロフィールが無い方は、入会申請の経路として最初の入力へ（?from=join。2026-10-02）。再同意だけの方は印なしで
  if (!viewer.hasProfile) redirect('/demo/community/onboarding?from=join')
  if (viewer.needsConsent) redirect('/demo/community/onboarding')

  const group = await findGroupBySlug(slug)
  if (!group) notFound()

  // 所属を読めなかったときは会員でない扱い（中身を見せない側に倒す）
  const mine = await myGroups()
  const hit = mine.ok ? mine.value.find((g) => g.id === group.id) : undefined
  if (!hit) return { mode: 'outsider', group }
  return { mode: 'member', group, role: hit.role, userId: await myUserId() }
}

/** 会員（または閲覧モードの見本）でなければ、会のお知らせのページへ送る */
export async function requireMemberAccess(rawSlug: string): Promise<Exclude<GroupAccess, { mode: 'outsider' }>> {
  const access = await resolveGroupAccess(rawSlug)
  if (access.mode === 'outsider') redirect(groupPath(access.group.slug))
  return access
}

/**
 * 世話人の画面（世話人のページ・会員一覧）。世話人か、閲覧モードの見本だけ。
 * それ以外（一般の会員・会員でない人）は denied に従う:
 *   'redirect' … 会のお知らせのページへ送る（会員一覧）
 *   'notFound' … 404（世話人のページ。世話人の画面があることも明かさない）
 */
export async function requireModeratorViewAccess(
  rawSlug: string,
  denied: 'redirect' | 'notFound'
): Promise<Extract<GroupAccess, { mode: 'demo' } | { mode: 'member' }>> {
  const access = await resolveGroupAccess(rawSlug)
  if (access.mode === 'demo') return access
  if (access.mode === 'member' && access.role === 'moderator') return access
  if (denied === 'redirect') redirect(groupPath(access.group.slug))
  notFound()
}

/** 会員（閲覧モードではない）でなければ、会員でない人は会のお知らせのページへ、閲覧モードは 404 */
export async function requireRealMemberAccess(rawSlug: string): Promise<Extract<GroupAccess, { mode: 'member' }>> {
  const access = await requireMemberAccess(rawSlug)
  if (access.mode !== 'member') notFound()
  return access
}
