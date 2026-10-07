/**
 * 同意の記録（consents）の読み書き — 2026-09-26 ファウンダー指示
 *
 * 文は lib/portal/consent-texts.ts（版番号付き）。この表は「誰が・どの種類の・どの版に・いつ同意し・いつ取り消したか」だけを持つ。
 *
 * ★ いまの版に同意しているか（consentState）
 *   - 'current'  … 取り消していない行の中に、いまの版の行がある
 *   - 'outdated' … 取り消していない行はあるが、どれも古い版（文が変わった。同意を取り直す）
 *   - 'none'     … 取り消していない行が無い（未同意か、取り消した）
 *   'current' 以外は、同意していないものとして扱う（案内を送らない・会員ページに入れない）。
 *
 * ★ 行の境界
 *   RLS で本人の行しか見えない（supabase/migrations/20260928_consents.sql）が、ここでも user_id で絞る（二重）。
 *   本人ができるのは insert と withdrawn_at を立てることだけ。delete はできない（同意の証拠を残す）。
 */

import { createClient } from '@/lib/supabase/server'

import {
  CONSENT_KINDS,
  CONSENT_TEXTS,
  currentConsentText,
  type ConsentKind,
  type ConsentText,
} from '@/lib/portal/consent-texts'

export interface ConsentRecord {
  id: string
  kind: ConsentKind
  version: number
  /** ISO 8601 */
  consentedAt: string
  /** 取り消した時刻（ISO 8601）。有効なら null */
  withdrawnAt: string | null
}

export type ConsentState = 'current' | 'outdated' | 'none'

type Texts = Readonly<Record<ConsentKind, readonly ConsentText[]>>

/** いまの版に同意しているか。texts はテストで版を差し替えるための引数 */
export function consentState(records: readonly ConsentRecord[], kind: ConsentKind, texts: Texts = CONSENT_TEXTS): ConsentState {
  const active = records.filter((r) => r.kind === kind && r.withdrawnAt === null)
  if (active.length === 0) return 'none'
  const current = currentConsentText(kind, texts)
  // 案（draft）の版への同意は記録しない決まり。もし行があっても「いまの版に同意済み」とは数えない
  if (!current.draft && active.some((r) => r.version === current.version)) return 'current'
  return 'outdated'
}

/** いまの版に同意した行のうち、いちばん新しいもの（同意した日の表示用）。無ければ null */
export function currentConsentRecord(records: readonly ConsentRecord[], kind: ConsentKind, texts: Texts = CONSENT_TEXTS): ConsentRecord | null {
  if (consentState(records, kind, texts) !== 'current') return null
  const version = currentConsentText(kind, texts).version
  const rows = records.filter((r) => r.kind === kind && r.withdrawnAt === null && r.version === version)
  return rows.sort((a, b) => b.consentedAt.localeCompare(a.consentedAt))[0] ?? null
}

// ---- DB との行き来 -----------------------------------------------------------

interface ConsentRow {
  id: string
  kind: string
  version: number
  consented_at: string
  withdrawn_at: string | null
}

const SELECT_COLUMNS = 'id, kind, version, consented_at, withdrawn_at'

/** 行 → 型。種類が分からない行は読まない（想像で当てはめない） */
function toRecord(row: ConsentRow): ConsentRecord | null {
  if (!(CONSENT_KINDS as readonly string[]).includes(row.kind)) return null
  if (!Number.isInteger(row.version) || row.version < 1) return null
  return {
    id: row.id,
    kind: row.kind as ConsentKind,
    version: row.version,
    consentedAt: row.consented_at,
    withdrawnAt: row.withdrawn_at ?? null,
  }
}

async function signedInUserId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * 本人の同意の行すべて（取り消した行も含む）。未ログイン・取得失敗は null。
 * 呼ぶ側は null を「同意していない」側に倒すこと。
 */
export async function getMyConsents(): Promise<ConsentRecord[] | null> {
  const supabase = createClient()
  const userId = await signedInUserId(supabase)
  if (!userId) return null

  const { data, error } = await supabase.from('consents').select(SELECT_COLUMNS).eq('user_id', userId)
  if (error || !data) {
    console.error('同意の記録の取得に失敗しました:', error?.message)
    return null
  }
  return (data as ConsentRow[]).map(toRecord).filter((r): r is ConsentRecord => r !== null)
}

export type ConsentWriteResult = { ok: true } | { ok: false; reason: 'unauthenticated' | 'failed' | 'draft' }

/**
 * いまの版への同意を記録する。すでにいまの版に同意していれば何もしない（行を増やさない）。
 * 案（draft）の版には記録しない。consented_at は DB の既定値（now()）に任せる。
 */
export async function recordMyConsent(kind: ConsentKind): Promise<ConsentWriteResult> {
  const current = currentConsentText(kind)
  if (current.draft) return { ok: false, reason: 'draft' }

  const supabase = createClient()
  const userId = await signedInUserId(supabase)
  if (!userId) return { ok: false, reason: 'unauthenticated' }

  const records = await getMyConsents()
  if (records === null) return { ok: false, reason: 'failed' }
  if (consentState(records, kind) === 'current') return { ok: true }

  const { error } = await supabase.from('consents').insert({ user_id: userId, kind, version: current.version })
  if (error) {
    console.error('同意の記録に失敗しました:', error.message)
    return { ok: false, reason: 'failed' }
  }
  return { ok: true }
}

/**
 * その種類の、取り消していない行すべてに withdrawn_at を立てる（古い版の行も含む）。
 * 時刻は DB のトリガーが now() にする（ここで送る値は使われない）。
 */
export async function withdrawMyConsent(kind: ConsentKind): Promise<ConsentWriteResult> {
  const supabase = createClient()
  const userId = await signedInUserId(supabase)
  if (!userId) return { ok: false, reason: 'unauthenticated' }

  const { error } = await supabase
    .from('consents')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('kind', kind)
    .is('withdrawn_at', null)
  if (error) {
    console.error('同意の取り消しに失敗しました:', error.message)
    return { ok: false, reason: 'failed' }
  }
  return { ok: true }
}
