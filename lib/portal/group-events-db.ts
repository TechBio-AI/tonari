/**
 * 会の「行事」と「資料・リンク集」— DB との行き来（Server Component / Server Action からのみ）— 2026-10-02 ファウンダー指示
 *
 * 型・入力検証・契約の名前は lib/portal/group-events.ts。DB（表・RLS・関数）は患者会テナント担当の 20261013。
 *
 * ★ 行の境界（二重で閉じる）
 *   DB 側: RLS（読むのはその会の会員、書くのはその会の世話人。参加表明は本人の行だけ）と関数。
 *   ここ:  全関数でログイン中の本人を取り、その会での役割を先に確かめる。書く関数は世話人でなければ forbidden。
 * ★ 参加表明は本人の行だけを読む・書く（user_id はセッションの本人で、画面からは受け取らない。upsert は使わない。setMyAttendance）。
 *   会員向けに人数は出さない。世話人の出欠一覧は list_event_attendance が返す表示名と状態だけを渡す（user_id は持たない）。
 * ★ ログには理由だけを出す（題・本文・URL・表示名は出さない）。
 */

import { isUuid } from '@/lib/portal/tenancy'
import { createClient } from '@/lib/supabase/server'

import {
  DB_NAMES,
  mapEventDbError,
  type AttendanceRow,
  type AttendanceStatus,
  type EventFailure,
  type EventInput,
  type GroupEvent,
  type GroupLink,
  type LinkInput,
} from './group-events'

export type EventResult<T> = { ok: true; value: T } | { ok: false; reason: EventFailure }

type Supabase = ReturnType<typeof createClient>
type Role = 'member' | 'moderator'

function fail<T>(reason: EventFailure): EventResult<T> {
  return { ok: false, reason }
}

function logFailure(where: string, message: string | undefined) {
  console.error(`行事・リンク: ${where} に失敗しました:`, message)
}

/** 本人の id と、その会での有効な役割。未ログインは unauthenticated、会員でなければ not_member */
async function whoAmI(supabase: Supabase, groupId: string): Promise<EventResult<{ userId: string; role: Role }>> {
  const { data } = await supabase.auth.getUser()
  const userId = data.user?.id
  if (!userId) return fail('unauthenticated')
  const { data: row, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .is('left_at', null)
    .maybeSingle()
  if (error || !row) return fail('not_member')
  return { ok: true, value: { userId, role: (row as { role: Role }).role } }
}

async function asModerator(supabase: Supabase, groupId: string): Promise<EventResult<{ userId: string }>> {
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  if (me.value.role !== 'moderator') return fail('forbidden')
  return { ok: true, value: { userId: me.value.userId } }
}

// ---- 行事 -----------------------------------------------------------------------

interface EventRow {
  id: string
  group_id: string
  title: string
  body: string
  starts_at: string
  ends_at: string | null
  place: string | null
  online_url: string | null
  is_public: boolean | null
}

const EVENT_COLUMNS = 'id, group_id, title, body, starts_at, ends_at, place, online_url, is_public'

function toEvent(r: EventRow): GroupEvent {
  return {
    id: r.id,
    groupId: r.group_id,
    title: r.title,
    body: r.body,
    startsAt: r.starts_at,
    endsAt: r.ends_at ?? null,
    place: r.place ?? null,
    onlineUrl: r.online_url ?? null,
    isPublic: r.is_public === true,
  }
}

function eventColumns(input: EventInput) {
  return {
    title: input.title,
    body: input.body,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    place: input.place,
    online_url: input.onlineUrl,
    is_public: input.isPublic,
  }
}

/** その会の行事（会員のみ）。並べ方は画面（splitEvents）が決める */
export async function listEvents(groupId: string): Promise<EventResult<GroupEvent[]>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.eventsTable)
    .select(EVENT_COLUMNS)
    .eq('group_id', groupId)
    .order('starts_at')
  if (error) {
    logFailure('行事の一覧', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: ((data ?? []) as EventRow[]).map(toEvent) }
}

/** その会の行事 1 件（会員のみ）。別の会の行事 id は not_found */
export async function getEvent(groupId: string, eventId: string): Promise<EventResult<GroupEvent>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('not_found')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.eventsTable)
    .select(EVENT_COLUMNS)
    .eq('group_id', groupId)
    .eq('id', eventId)
    .maybeSingle()
  if (error) {
    logFailure('行事の取得', error.message)
    return fail(mapEventDbError(error.message))
  }
  if (!data) return fail('not_found')
  return { ok: true, value: toEvent(data as EventRow) }
}

/** 行事を作る（世話人のみ）。is_public は入力のまま（既定は false） */
export async function createEvent(groupId: string, input: EventInput): Promise<EventResult<{ eventId: string }>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.eventsTable)
    .insert({ group_id: groupId, ...eventColumns(input) })
    .select('id')
    .single()
  if (error || !data) {
    logFailure('行事の作成', error?.message)
    return fail(mapEventDbError(error?.message))
  }
  return { ok: true, value: { eventId: (data as { id: string }).id } }
}

/** 行事を直す（世話人のみ）。会の id でも絞る（別の会の行事は書き換えない） */
export async function updateEvent(groupId: string, eventId: string, input: EventInput): Promise<EventResult<null>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.eventsTable)
    .update(eventColumns(input))
    .eq('group_id', groupId)
    .eq('id', eventId)
    .select('id')
  if (error) {
    logFailure('行事の更新', error.message)
    return fail(mapEventDbError(error.message))
  }
  if (!data || (data as unknown[]).length === 0) return fail('not_found')
  return { ok: true, value: null }
}

/** 行事を消す（DB 関数 delete_group_event。世話人かどうかは関数も確かめる） */
export async function deleteEvent(groupId: string, eventId: string): Promise<EventResult<null>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { error } = await supabase.rpc(DB_NAMES.deleteEvent, { [DB_NAMES.eventIdParam]: eventId })
  if (error) {
    logFailure('行事の削除', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: null }
}

// ---- 参加表明 ---------------------------------------------------------------------

/** 本人の参加表明（無ければ null）。本人の行だけを読む */
export async function myAttendance(groupId: string, eventId: string): Promise<EventResult<string | null>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('not_found')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.attendanceTable)
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', me.value.userId)
    .maybeSingle()
  if (error) {
    logFailure('参加表明の取得', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: data ? (data as { status: string }).status : null }
}

/**
 * 本人の参加表明を入れる・変える（本人の行だけ。user_id はセッションの本人）。
 *
 * ★ PostgREST の upsert は使わない。20261013 は event_attendance の UPDATE を status 列にだけ許していて、
 *   upsert（INSERT … ON CONFLICT DO UPDATE SET event_id・user_id・status）は event_id・user_id の UPDATE 権限も要るため、
 *   行が無いときも含めて権限エラーになる。代わりに、本人の行があれば status だけを update、無ければ insert する。
 *   insert が主キーの重なり（23505。同時に 2 回押したとき）で失敗したら、update に切り替える。
 */
export async function setMyAttendance(groupId: string, eventId: string, status: AttendanceStatus): Promise<EventResult<null>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  // 行事がその会のものか（別の会の行事 id に表明させない）
  const ev = await getEvent(groupId, eventId)
  if (!ev.ok) return ev

  const update = () =>
    supabase.from(DB_NAMES.attendanceTable).update({ status }).eq('event_id', eventId).eq('user_id', me.value.userId)

  const current = await myAttendance(groupId, eventId)
  if (!current.ok) return current
  let error: { message: string; code?: string } | null
  if (current.value !== null) {
    ;({ error } = await update())
  } else {
    ;({ error } = await supabase.from(DB_NAMES.attendanceTable).insert({ event_id: eventId, user_id: me.value.userId, status }))
    if (error?.code === '23505') ({ error } = await update())
  }
  if (error) {
    logFailure('参加表明', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: null }
}

/** 世話人の出欠一覧（DB 関数 list_event_attendance）。表示名と状態だけを渡す（ほかの列が来ても捨てる） */
export async function listAttendance(groupId: string, eventId: string): Promise<EventResult<AttendanceRow[]>> {
  if (!isUuid(groupId) || !isUuid(eventId)) return fail('not_found')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase.rpc(DB_NAMES.listAttendance, { [DB_NAMES.eventIdParam]: eventId })
  if (error || !Array.isArray(data)) {
    logFailure('出欠一覧', error?.message)
    return fail(error ? mapEventDbError(error.message) : 'failed')
  }
  return {
    ok: true,
    value: (data as { display_name?: unknown; status?: unknown }[]).map((r) => ({
      displayName: typeof r.display_name === 'string' ? r.display_name : null,
      status: typeof r.status === 'string' ? r.status : '',
    })),
  }
}

// ---- 資料・リンク -------------------------------------------------------------------

interface LinkRow {
  id: string
  group_id: string
  title: string
  url: string
  note: string | null
}

const LINK_COLUMNS = 'id, group_id, title, url, note'

function toLink(r: LinkRow): GroupLink {
  return { id: r.id, groupId: r.group_id, title: r.title, url: r.url, note: r.note ?? null }
}

/** その会のリンク（会員のみ。題の順） */
export async function listLinks(groupId: string): Promise<EventResult<GroupLink[]>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase.from(DB_NAMES.linksTable).select(LINK_COLUMNS).eq('group_id', groupId).order('title')
  if (error) {
    logFailure('リンクの一覧', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: ((data ?? []) as LinkRow[]).map(toLink) }
}

export async function getLink(groupId: string, linkId: string): Promise<EventResult<GroupLink>> {
  if (!isUuid(groupId) || !isUuid(linkId)) return fail('not_found')
  const supabase = createClient()
  const me = await whoAmI(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.linksTable)
    .select(LINK_COLUMNS)
    .eq('group_id', groupId)
    .eq('id', linkId)
    .maybeSingle()
  if (error) {
    logFailure('リンクの取得', error.message)
    return fail(mapEventDbError(error.message))
  }
  if (!data) return fail('not_found')
  return { ok: true, value: toLink(data as LinkRow) }
}

export async function createLink(groupId: string, input: LinkInput): Promise<EventResult<null>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { error } = await supabase.from(DB_NAMES.linksTable).insert({ group_id: groupId, ...input })
  if (error) {
    logFailure('リンクの作成', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: null }
}

export async function updateLink(groupId: string, linkId: string, input: LinkInput): Promise<EventResult<null>> {
  if (!isUuid(groupId) || !isUuid(linkId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { data, error } = await supabase
    .from(DB_NAMES.linksTable)
    .update({ title: input.title, url: input.url, note: input.note })
    .eq('group_id', groupId)
    .eq('id', linkId)
    .select('id')
  if (error) {
    logFailure('リンクの更新', error.message)
    return fail(mapEventDbError(error.message))
  }
  if (!data || (data as unknown[]).length === 0) return fail('not_found')
  return { ok: true, value: null }
}

export async function deleteLink(groupId: string, linkId: string): Promise<EventResult<null>> {
  if (!isUuid(groupId) || !isUuid(linkId)) return fail('invalid_input')
  const supabase = createClient()
  const me = await asModerator(supabase, groupId)
  if (!me.ok) return me
  const { error } = await supabase.rpc(DB_NAMES.deleteLink, { [DB_NAMES.linkIdParam]: linkId })
  if (error) {
    logFailure('リンクの削除', error.message)
    return fail(mapEventDbError(error.message))
  }
  return { ok: true, value: null }
}
