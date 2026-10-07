/**
 * 患者会の「公開のお知らせ」と「これからの公開の行事」（公開ページ /demo/groups/[slug] が読む）
 *
 * 表 public_group_items を、未ログイン（anon）のまま group_slug で引く（公開面が DB を読む例外。2026-10-02 ファウンダー指示）。
 * cookie を使わないクライアントで読む（cookie を読むとページが静的でなくなるため。再生成は revalidate）。
 *
 * ★ 読む列は PUBLIC_ITEM_COLUMNS だけ（select で列を指定する）。書いた人・会員の情報は読まない。
 *   受け取った行からも、下の項目だけを拾い直す（列が増えても画面に渡さない）。
 * ★ online_url は行事の参加 URL。世話人は公開するときに注意を受けている（2026-10-02 ファウンダー指示）ので、そのまま出す。
 *   http / https のものだけ（ほかの形は出さない）。
 * ★ kind の値は 'notice' / 'event'（2026-10-02 ファウンダー確定）。知らない kind の行は出さない。
 * 読めない・失敗・未設定のときは空（節ごと出さない）。
 */

import { createClient } from '@supabase/supabase-js'

export const PUBLIC_ITEMS_TABLE = 'public_group_items'
export const PUBLIC_ITEM_COLUMNS = 'kind, title, body, starts_at, ends_at, place, online_url, published_at'
export const KIND = { notice: 'notice', event: 'event' } as const

export interface PublicNotice {
  title: string
  body: string | null
  date: string | null
}

export interface PublicEvent {
  title: string
  startsAt: string
  endsAt: string | null
  place: string | null
  onlineUrl: string | null
  body: string | null
}

export interface PublicActivity {
  notices: PublicNotice[]
  events: PublicEvent[]
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

function httpUrl(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

function time(iso: string | null): number {
  const t = iso ? new Date(iso).getTime() : NaN
  return Number.isNaN(t) ? NaN : t
}

/**
 * 行 → お知らせ・行事。お知らせは新しい順。行事は「これから」（終わっていない）だけを、始まる順に。
 * now は「これから」の基準（テストのため引数にしている）
 */
export function toPublicActivity(rows: unknown, now: Date = new Date()): PublicActivity {
  const out: PublicActivity = { notices: [], events: [] }
  if (!Array.isArray(rows)) return out
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const title = str(o.title)
    if (!title) continue
    if (o.kind === KIND.notice) {
      out.notices.push({ title, body: str(o.body), date: str(o.published_at) })
    } else if (o.kind === KIND.event) {
      const startsAt = str(o.starts_at)
      if (!startsAt || Number.isNaN(time(startsAt))) continue
      const endsAt = str(o.ends_at)
      // 終わった行事は出さない（終わりが無ければ始まりで見る）
      const end = Number.isNaN(time(endsAt)) ? time(startsAt) : time(endsAt)
      if (end < now.getTime()) continue
      out.events.push({ title, startsAt, endsAt, place: str(o.place), onlineUrl: httpUrl(o.online_url), body: str(o.body) })
    }
  }
  out.notices.sort((a, b) => (time(b.date) || 0) - (time(a.date) || 0))
  out.events.sort((a, b) => time(a.startsAt) - time(b.startsAt))
  return out
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** 表を読む（DB に触れるのはここだけ。テストはここを差し替える） */
export async function fetchPublicItems(slug: string): Promise<unknown> {
  const client = anonClient()
  if (!client) return null
  try {
    const { data, error } = await client.from(PUBLIC_ITEMS_TABLE).select(PUBLIC_ITEM_COLUMNS).eq('group_slug', slug)
    if (error) {
      console.error('公開のお知らせ・行事の取得に失敗しました:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('公開のお知らせ・行事の取得で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

export async function listPublicActivity(slug: string): Promise<PublicActivity> {
  return toPublicActivity(await fetchPublicItems(slug))
}
