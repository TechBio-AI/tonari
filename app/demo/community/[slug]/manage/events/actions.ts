'use server'

// 行事の作成・編集・削除（server action。世話人。/manage/events と /manage/events/[id] から）
//
// 会員（kind: 'member'）であることを確かめ、入力を lib/portal/group-events.ts で確かめてから
// lib/portal/group-events-db.ts を呼ぶ（世話人かどうかはそこと DB の RLS・関数が確かめる）。閲覧モードでは何もしない。
// 「公開ページにも出す」（is_public）はチェックが入っているときだけ true（既定は false）。
// 入力の値は URL に載せない。ログにも出さない。

import { redirect } from 'next/navigation'

import { validateEventInput, type EventFailure } from '@/lib/portal/group-events'
import { createEvent, deleteEvent, updateEvent } from '@/lib/portal/group-events-db'
import { isUuid, listGroups } from '@/lib/portal/tenancy'

import { getViewer } from '../../../../_lib/session'
import { groupPath } from '../../_lib/access'

async function requireMemberViewer(): Promise<void> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')
  if (!viewer.hasProfile || viewer.needsConsent) redirect('/demo/community/onboarding')
}

async function groupIdOf(slug: string): Promise<string | null> {
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

function eventRaw(fd: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const k of ['title', 'body', 'startsAt', 'endsAt', 'place', 'onlineUrl', 'isPublic']) {
    const v = fd.get(k)
    if (typeof v === 'string') raw[k] = v
  }
  return raw
}

export async function createEventAction(slug: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage/events')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'not_member')
  const check = validateEventInput(eventRaw(fd))
  if (!check.ok) failed(path, 'invalid_input')
  const r = await createEvent(groupId, check.value)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'event_created')
}

export async function updateEventAction(slug: string, eventId: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(eventId)) failed(groupPath(slug, '/manage/events'), 'not_found')
  const path = groupPath(slug, `/manage/events/${eventId}`)
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'not_member')
  const check = validateEventInput(eventRaw(fd))
  if (!check.ok) failed(path, 'invalid_input')
  const r = await updateEvent(groupId, eventId, check.value)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'event_updated')
}

export async function deleteEventAction(slug: string, eventId: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const list = groupPath(slug, '/manage/events')
  if (!isUuid(eventId)) failed(list, 'not_found')
  const path = groupPath(slug, `/manage/events/${eventId}`)
  if (fd.get('confirm') !== 'yes') failed(path, 'invalid_input')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'not_member')
  const r = await deleteEvent(groupId, eventId)
  if (!r.ok) failed(path, r.reason)
  back(list, 'done', 'event_deleted')
}
