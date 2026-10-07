/**
 * 世話人向けの「会員の状況」（/demo/community/[slug]/manage/dashboard）のデータ
 *
 * DB 関数 public.group_dashboard(p_group_id uuid) RETURNS TABLE(section text, choice text, n text) を RPC で呼ぶ
 * （患者会テナント担当が作る。契約の section・choice の並びと地方の名前は lib/portal/group-dashboard.ts。2026-10-02 ファウンダー指示）。
 *   - n は文字列。members_total / moderators / join_requests_pending の 3 行は実数。
 *     それ以外は 10 未満が '10未満' で来る（補完秘匿で 10 以上でも伏せられることがある）。
 *   - ここでは n を数に直さない・足し引きしない・並べ替えに使わない。返ってきた文字列をそのまま渡す。
 *   - choice は表示のための読み替えだけをする（知らない値はそのまま出す）。
 * 世話人かどうかは、画面（access.ts）と DB 関数の両方で確かめる。行の中身はログに出さない。
 */

import { DASHBOARD_CHOICES, DASHBOARD_SECTIONS, REGION_LABELS, type DashboardSection } from '@/lib/portal/group-dashboard'
import { isUuid } from '@/lib/portal/tenancy'
import { REGISTRANT_TYPE_LABELS } from '@/lib/portal/member-profile'
import { createClient } from '@/lib/supabase/server'

/** 画面が受け取る 1 行。契約の型（lib/portal/group-dashboard.ts の DashboardRow）より緩く受け、知らない値も捨てない */
export interface DashboardRow {
  section: string
  choice: string
  n: string
}

export interface DashboardTable {
  section: string
  title: string
  rows: { choice: string; label: string; n: string }[]
}

/** 表の見出しと、区分の表示の読み替え（並びは契約 DASHBOARD_CHOICES。section の順は DASHBOARD_SECTIONS） */
const SECTION_VIEW: Record<DashboardSection, { title: string; labels: Record<string, string> }> = {
  members_total: { title: '在籍している会員', labels: { all: '合計' } },
  moderators: { title: '世話人', labels: { all: '合計' } },
  join_requests_pending: { title: '審査中の入会申請', labels: { all: '合計' } },
  registrant_type: { title: '登録する方', labels: { ...REGISTRANT_TYPE_LABELS } },
  age_band: { title: '患者さんの年代', labels: {} },
  gender: { title: '患者さんの性別', labels: {} },
  region: { title: 'お住まいの地方', labels: { ...REGION_LABELS } },
}

export const SECTIONS = DASHBOARD_SECTIONS.map((section) => ({
  section,
  order: DASHBOARD_CHOICES[section] as readonly string[],
  ...SECTION_VIEW[section],
}))

export const DASHBOARD_NOTE = '10人未満の区分は「10未満」と表示しています'

function isRow(r: unknown): r is DashboardRow {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  return typeof o.section === 'string' && typeof o.choice === 'string' && typeof o.n === 'string'
}

/**
 * 行 → 表。契約にある section は決まった順に、区分は決まった並びで（返ってこなかった区分は作らない）。
 * 契約に無い section・区分は、返ってきた順で後ろに付ける（捨てない・作らない）
 */
export function buildDashboard(rows: readonly DashboardRow[]): DashboardTable[] {
  const bySection = new Map<string, DashboardRow[]>()
  for (const r of rows) {
    if (!bySection.has(r.section)) bySection.set(r.section, [])
    bySection.get(r.section)!.push(r)
  }
  const tables: DashboardTable[] = []
  for (const def of SECTIONS) {
    const got = bySection.get(def.section)
    if (!got) continue
    bySection.delete(def.section)
    const rank = (c: string) => {
      const i = def.order.indexOf(c)
      return i === -1 ? def.order.length : i
    }
    const sorted = got.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r.choice) - rank(b.r.choice) || a.i - b.i)
    tables.push({
      section: def.section,
      title: def.title,
      rows: sorted.map(({ r }) => ({ choice: r.choice, label: def.labels[r.choice] ?? r.choice, n: r.n })),
    })
  }
  for (const [section, got] of bySection) {
    tables.push({ section, title: section, rows: got.map((r) => ({ choice: r.choice, label: r.choice, n: r.n })) })
  }
  return tables
}

/** group_dashboard を呼ぶ。失敗・形の違う行は null（画面は「読み込めませんでした」） */
export async function fetchGroupDashboard(groupId: string): Promise<DashboardRow[] | null> {
  if (!isUuid(groupId)) return null
  try {
    const { data, error } = await createClient().rpc('group_dashboard', { p_group_id: groupId })
    if (error) {
      console.error('会員の状況の取得に失敗しました:', error.message)
      return null
    }
    if (!Array.isArray(data) || !data.every(isRow)) return null
    return data as DashboardRow[]
  } catch (err) {
    console.error('会員の状況の取得で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
    return null
  }
}
