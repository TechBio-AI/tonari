'use server'

// 行事の参加表明（server action。/events/[id] から）
//
// 会員（kind: 'member'）であることを確かめ、値が「参加する／たぶん／参加しない」のどれかのときだけ、
// lib/portal/group-events-db.ts の setMyAttendance を呼ぶ（本人の行だけを upsert。user_id は画面から受け取らない）。
// 閲覧モード（demo）では何もしない。結果は ?error= / ?done= を付けて行事のページへ戻す。

import { redirect } from 'next/navigation'

import { isAttendanceStatus, type EventFailure } from '@/lib/portal/group-events'
import { setMyAttendance } from '@/lib/portal/group-events-db'
import { isUuid, listGroups } from '@/lib/portal/tenancy'

import { getViewer } from '../../../_lib/session'
import { groupPath } from '../_lib/access'

async function requireMemberViewer(): Promise<void> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')
  if (!viewer.hasProfile || viewer.needsConsent) redirect('/demo/community/onboarding')
}

async function groupIdOfSlug(slug: string): Promise<string | null> {
  const r = await listGroups()
  if (!r.ok) return null
  return r.value.find((g) => g.slug === slug)?.id ?? null
}

function back(path: string, key: 'error' | 'done', value: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(value)}`)
}

function failed(path: string, reason: EventFailure): never {
  if (reason === 'unauthenticated') redirect('/demo/login')
  back(path, 'error', reason)
}

export async function setAttendanceAction(slug: string, eventId: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(eventId)) failed(groupPath(slug, '/events'), 'not_found')
  const path = groupPath(slug, `/events/${eventId}`)
  const status = fd.get('status')
  if (!isAttendanceStatus(status)) failed(path, 'invalid_input')
  const groupId = await groupIdOfSlug(slug)
  if (!groupId) failed(path, 'not_member')
  const r = await setMyAttendance(groupId, eventId, status)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'attendance')
}
