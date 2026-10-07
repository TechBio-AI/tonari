// 「行事」と「資料・リンク」のページの入口の判定と、結果の 1 行（2026-10-02 ファウンダー指示）
//
//   会員向け（/events・/events/[id]・/links）     … 会員だけ。会員でない人は会のお知らせのページへ。閲覧モードは 404
//   世話人の作成・編集（/manage/events・/manage/links） … 世話人だけ。一般の会員・会員でない人・閲覧モードは 404
// 閲覧モードの見本は作らない（会員の状況〔ダッシュボード〕と同じ）。読み書きは lib/portal/group-events-db.ts。

import { notFound } from 'next/navigation'

import { EVENT_FAILURE_MESSAGES, isEventFailure } from '@/lib/portal/group-events'

import { requireMemberAccess, requireModeratorViewAccess, requireRealMemberAccess, type GroupAccess } from './access'

export type MemberAccess = Extract<GroupAccess, { mode: 'member' }>

/** 会員向けのページ（閲覧モードは 404） */
export async function requireEventsMemberAccess(rawSlug: string): Promise<MemberAccess> {
  return requireRealMemberAccess(rawSlug)
}

/**
 * 会員向けのページで、閲覧モードの見本も出すとき（2026-10-04。/events・/events/[id]・/links）。
 * 会員ならその会員、閲覧モードなら見本の会（DB は読まない）。会員でない人は会のホームへ
 */
export async function requireEventsViewAccess(rawSlug: string): Promise<MemberAccess | Extract<GroupAccess, { mode: 'demo' }>> {
  return requireMemberAccess(rawSlug)
}

/** 世話人の作成・編集のページ（閲覧モードも 404） */
export async function requireEventsModeratorAccess(rawSlug: string): Promise<MemberAccess> {
  const access = await requireModeratorViewAccess(rawSlug, 'notFound')
  if (access.mode !== 'member') notFound() // DEMO_ACCESS: 見本は作らない
  return access
}

const DONE: Record<string, string> = {
  event_created: '行事を作りました。',
  event_updated: '行事を直しました。',
  event_deleted: '行事を削除しました。',
  attendance: '参加の予定を記録しました。',
  link_created: 'リンクを足しました。',
  link_updated: 'リンクを直しました。',
  link_deleted: 'リンクを削除しました。',
}

export type EventsDone = keyof typeof DONE

/** ?error= / ?done= → 出す文。知らない値は出さない（URL の文字をそのまま画面に出さない） */
export function eventsFlash(params?: { error?: string | string[]; done?: string | string[] }): { tone: 'ok' | 'error'; text: string } | null {
  const error = typeof params?.error === 'string' ? params.error : undefined
  if (isEventFailure(error)) return { tone: 'error', text: EVENT_FAILURE_MESSAGES[error] }
  const done = typeof params?.done === 'string' ? params.done : undefined
  if (done && Object.prototype.hasOwnProperty.call(DONE, done)) return { tone: 'ok', text: DONE[done] }
  return null
}
