/**
 * 会の「行事」と「資料・リンク集」— 型・入力検証・並べ方・表示（DB に触れない部分）— 2026-10-02 ファウンダー指示
 *
 * DB 側（表・RLS・関数）は患者会テナント担当が supabase/migrations/20261013_*.sql で作る。この担当は画面だけ。
 * DB との行き来は lib/portal/group-events-db.ts。
 *
 * 契約（ファウンダー指示 2026-10-02）と DB の原本 supabase/migrations/20261013_community_features.sql（2026-10-02 照合済み）:
 *   group_events(title ≤100 必須, body ≤4000 必須, starts_at 必須, ends_at 任意〔starts_at 以降〕, place ≤200 任意,
 *                online_url ≤500 任意・http(s), is_public 既定 false, created_by 既定 auth.uid(), deleted_at〔論理削除〕)
 *   group_links(title ≤100 必須, url ≤500 必須・http(s), note ≤500 任意, created_by 既定 auth.uid(), deleted_at)
 *   作成・編集は表を直接書く（RLS で世話人のみ。insert は created_by = auth.uid() を求めるので、列を送らず既定値に任せる）
 *   削除は delete_group_event(p_event_id uuid)・delete_group_link(p_link_id uuid)（論理削除。消した行は会員から見えない）
 *   参加表明は event_attendance(event_id, user_id, status ∈ yes/maybe/no。主キーは event_id + user_id)。
 *     insert は event_id・user_id・status、update は status だけが許されている（upsert は権限で通らない。group-events-db.ts）
 *   世話人の出欠一覧は list_event_attendance(p_event_id uuid) → (display_name, status)。user_id は返らない。
 *     在籍している会員の分だけ、参加する→たぶん→参加しないの順で返る
 *   エラーの語: forbidden / not_member / invalid_input（関数は unauthenticated も返す）
 *
 * クライアント部品（行事のフォーム）からも読むので、fs や Supabase を import しない。
 */

// ---- 上限（契約） ---------------------------------------------------------------

export const EVENT_TITLE_MAX = 100
export const EVENT_BODY_MAX = 4000
export const EVENT_PLACE_MAX = 200
export const EVENT_URL_MAX = 500
export const LINK_TITLE_MAX = 100
export const LINK_URL_MAX = 500
export const LINK_NOTE_MAX = 500

/** DB の名前（20261013 の原本と照合済み） */
export const DB_NAMES = {
  eventsTable: 'group_events',
  linksTable: 'group_links',
  attendanceTable: 'event_attendance',
  deleteEvent: 'delete_group_event',
  deleteLink: 'delete_group_link',
  listAttendance: 'list_event_attendance',
  /** 関数の引数名 */
  eventIdParam: 'p_event_id',
  linkIdParam: 'p_link_id',
} as const

/** 参加表明の値（20261013 の CHECK と同じ） */
export const ATTENDANCE_STATUSES = ['yes', 'maybe', 'no'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  yes: '参加する',
  maybe: 'たぶん',
  no: '参加しない',
}

export function isAttendanceStatus(raw: unknown): raw is AttendanceStatus {
  return typeof raw === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(raw)
}

// ---- 型 -------------------------------------------------------------------------

export interface GroupEvent {
  id: string
  groupId: string
  title: string
  body: string
  /** ISO 8601 */
  startsAt: string
  endsAt: string | null
  place: string | null
  onlineUrl: string | null
  isPublic: boolean
}

export interface GroupLink {
  id: string
  groupId: string
  title: string
  url: string
  note: string | null
}

/** 世話人の出欠一覧の 1 行（user_id は持たない） */
export interface AttendanceRow {
  displayName: string | null
  status: string
}

export const EVENT_FAILURES = ['unauthenticated', 'forbidden', 'not_member', 'invalid_input', 'not_found', 'failed'] as const
export type EventFailure = (typeof EVENT_FAILURES)[number]

export const EVENT_FAILURE_MESSAGES: Record<EventFailure, string> = {
  unauthenticated: 'ログインしてください',
  forbidden: 'この操作はできません',
  not_member: 'この会の会員ではありません',
  invalid_input: '入力を確かめてください',
  not_found: '見つかりません',
  failed: 'うまくいきませんでした。時間をおいてもう一度お試しください',
}

export function isEventFailure(raw: unknown): raw is EventFailure {
  return typeof raw === 'string' && (EVENT_FAILURES as readonly string[]).includes(raw)
}

/** DB のエラー文 → 理由。知らない文は failed（DB の文面を画面に出さない） */
export function mapEventDbError(message: string | undefined | null): EventFailure {
  if (!message) return 'failed'
  const hit = EVENT_FAILURES.find((r) => r !== 'failed' && message === r)
  if (hit) return hit
  if (/row-level security|permission denied/i.test(message)) return 'forbidden'
  return 'failed'
}

// ---- 画面の文 ---------------------------------------------------------------------

/** 「公開ページにも出す」のチェックに添える文（常に出す） */
export const PUBLIC_NOTICE = '公開にすると、この会の公式ページにも表示されます'
/** 公開にして、オンライン参加の URL も入っているときに出す注意 */
export const PUBLIC_URL_WARNING = 'URL も公開されます'

// ---- 入力検証 -----------------------------------------------------------------------

/** 前後の空白（全角も）を落とす */
function trimText(raw: string): string {
  return raw.replace(/^[\s　]+|[\s　]+$/g, '')
}

/** 文字数はコードポイントで数える（DB の char_length と同じ） */
function len(s: string): number {
  return [...s].length
}

/** http(s) の URL だけ。空白や改行を含むものは通さない */
export function isHttpUrl(raw: string): boolean {
  if (/\s/.test(raw)) return false
  try {
    const u = new URL(raw)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== ''
  } catch {
    return false
  }
}

/**
 * 画面の日時入力（datetime-local。"YYYY-MM-DDTHH:mm"）を日本時間として ISO 8601 にする。形が違えば null。
 * 実在しない日付（2 月 30 日など）も null
 */
export function jstLocalToIso(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  if (mo < 1 || mo > 12 || h > 23 || mi > 59) return null
  const utc = new Date(Date.UTC(y, mo - 1, d, h - 9, mi))
  // 日本時間に戻して同じ日付か（2 月 30 日などが翌月にずれていないか）
  const back = new Date(utc.getTime() + 9 * 3600 * 1000)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`
}

/** ISO 8601 → 画面の日時入力の値（日本時間）。読めなければ空 */
export function isoToJstLocal(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 16)
}

export interface EventInput {
  title: string
  body: string
  startsAt: string
  endsAt: string | null
  place: string | null
  onlineUrl: string | null
  isPublic: boolean
}

export type FieldErrors<K extends string> = { field: K; message: string }[]
export type Check<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> }

function requiredText(raw: unknown, max: number): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== 'string') return { ok: false, message: '入力してください' }
  const v = trimText(raw)
  if (v === '') return { ok: false, message: '入力してください' }
  if (len(v) > max) return { ok: false, message: `${max} 文字以内で入力してください` }
  return { ok: true, value: v }
}

function optionalText(raw: unknown, max: number): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, message: '文字で入力してください' }
  const v = trimText(raw)
  if (v === '') return { ok: true, value: null }
  if (len(v) > max) return { ok: false, message: `${max} 文字以内で入力してください` }
  return { ok: true, value: v }
}

function urlText(raw: unknown, max: number, required: boolean): { ok: true; value: string | null } | { ok: false; message: string } {
  const t = required ? requiredText(raw, max) : optionalText(raw, max)
  if (!t.ok || t.value === null) return t
  if (!isHttpUrl(t.value)) return { ok: false, message: 'http:// か https:// で始まる URL を入力してください' }
  return t
}

/** 行事の入力（日時は画面の datetime-local の値。日本時間）。is_public はチェックの値が 'on' のときだけ true */
export function validateEventInput(raw: unknown): Check<EventInput, keyof EventInput> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: FieldErrors<keyof EventInput> = []

  const title = requiredText(o.title, EVENT_TITLE_MAX)
  if (!title.ok) errors.push({ field: 'title', message: title.message })
  const body = requiredText(o.body, EVENT_BODY_MAX)
  if (!body.ok) errors.push({ field: 'body', message: body.message })

  const startsAt = typeof o.startsAt === 'string' ? jstLocalToIso(o.startsAt) : null
  if (!startsAt) errors.push({ field: 'startsAt', message: '日時を入力してください' })
  let endsAt: string | null = null
  if (typeof o.endsAt === 'string' && o.endsAt !== '') {
    endsAt = jstLocalToIso(o.endsAt)
    if (!endsAt) errors.push({ field: 'endsAt', message: '日時の形を確かめてください' })
    else if (startsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      errors.push({ field: 'endsAt', message: '終わりは始まりより後にしてください' })
    }
  }

  const place = optionalText(o.place, EVENT_PLACE_MAX)
  if (!place.ok) errors.push({ field: 'place', message: place.message })
  const onlineUrl = urlText(o.onlineUrl, EVENT_URL_MAX, false)
  if (!onlineUrl.ok) errors.push({ field: 'onlineUrl', message: onlineUrl.message })

  if (errors.length > 0 || !title.ok || !body.ok || !startsAt || !place.ok || !onlineUrl.ok) return { ok: false, errors }
  return {
    ok: true,
    value: {
      title: title.value,
      body: body.value,
      startsAt,
      endsAt,
      place: place.value,
      onlineUrl: onlineUrl.value,
      isPublic: o.isPublic === 'on' || o.isPublic === true,
    },
  }
}

export interface LinkInput {
  title: string
  url: string
  note: string | null
}

export function validateLinkInput(raw: unknown): Check<LinkInput, keyof LinkInput> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: FieldErrors<keyof LinkInput> = []
  const title = requiredText(o.title, LINK_TITLE_MAX)
  if (!title.ok) errors.push({ field: 'title', message: title.message })
  const url = urlText(o.url, LINK_URL_MAX, true)
  if (!url.ok) errors.push({ field: 'url', message: url.message })
  const note = optionalText(o.note, LINK_NOTE_MAX)
  if (!note.ok) errors.push({ field: 'note', message: note.message })
  if (errors.length > 0 || !title.ok || !url.ok || url.value === null || !note.ok) return { ok: false, errors }
  return { ok: true, value: { title: title.value, url: url.value, note: note.value } }
}

// ---- 並べ方・表示 -----------------------------------------------------------------

/**
 * これからの行事と過去の行事に分ける。
 * 終わり（無ければ始まり）が now 以降ならこれから。これからは始まりの早い順、過去は始まりの新しい順。
 */
export function splitEvents(events: readonly GroupEvent[], now: Date): { upcoming: GroupEvent[]; past: GroupEvent[] } {
  const t = now.getTime()
  const end = (e: GroupEvent) => new Date(e.endsAt ?? e.startsAt).getTime()
  const start = (e: GroupEvent) => new Date(e.startsAt).getTime()
  const upcoming = events.filter((e) => end(e) >= t).sort((a, b) => start(a) - start(b))
  const past = events.filter((e) => end(e) < t).sort((a, b) => start(b) - start(a))
  return { upcoming, past }
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 日本時間の日時（例: 2026年10月2日（金）14:00）。読めなければ空 */
export function formatJstDateTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const d = new Date(t + 9 * 3600 * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAYS[d.getUTCDay()]}）${hh}:${mm}`
}

/** 行事の日時の表示（終わりがあれば「〜」でつなぐ。同じ日なら終わりは時刻だけ） */
export function formatEventWhen(e: Pick<GroupEvent, 'startsAt' | 'endsAt'>): string {
  const s = formatJstDateTime(e.startsAt)
  if (!e.endsAt) return s
  const en = formatJstDateTime(e.endsAt)
  const sameDay = s.slice(0, s.indexOf('）') + 1) === en.slice(0, en.indexOf('）') + 1)
  return `${s}〜${sameDay ? en.slice(en.indexOf('）') + 1) : en}`
}
