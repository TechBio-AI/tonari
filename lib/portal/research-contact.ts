/**
 * 研究・治験の案内（B 層。consents.kind = research_contact）— 2026-09-26 ファウンダー指示
 *
 * 希望する会員だけが、マイページで「案内を受け取る病気」を選んで同意する。
 * 選べる病気は、会員が所属する会の disease_idxs（getMyGroupDiseaseIdxs）から作る。所属する会が無ければ選べない。
 *
 * ★ 同意の対象は「同意した時点の表示名」（member_diseases.disease_name）
 *   disease_idx は知識ファイルの並び順の位置で、固定 ID ではない（統合・追加でずれる）。
 *   - 画面は idx と名前の組を送る。サーバーは「いまの知識ファイルでその idx の名前が、送られた名前と同じか」を確かめ、
 *     違えば保存しない（画面を出した後に一覧が変わったとき、見ていない病気に同意させない）
 *   - 保存した後は disease_name を正とする。表示も案内の送り先の判定も名前で行い、idx から名前を引き直さない
 *
 * ★ 書く順番（DB の 1 トランザクションにはしていない。途中で失敗しても「案内が届く」側に倒れない順にする）
 *   同意: 病気を入れ替える → 同意の行を足す（病気だけ残っても、同意がいまの版でなければ案内は送らない）
 *   取り消し: 病気を消す → 同意の行に withdrawn_at を立てる（病気が先に消える）
 *
 * ★ 個人情報: member_diseases は「会員 × 病名」で医療情報に当たる。外部 LLM API へ送らない。ログに病名を出さない。
 */

import * as fs from 'fs'
import * as path from 'path'

import { createClient } from '@/lib/supabase/server'

import { knowledgeFilePositionOf } from '@/lib/portal/disease-overviews'
import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '@/lib/portal/knowledge-file'
import { getPatientGroups } from '@/lib/portal/patient-groups'
import { myGroups } from '@/lib/portal/tenancy'
import {
  consentState,
  currentConsentRecord,
  getMyConsents,
  recordMyConsent,
  withdrawMyConsent,
  type ConsentState,
} from '@/lib/portal/consents'

export interface ResearchDiseaseOption {
  /** 知識ファイル上のいまの位置（固定 ID ではない） */
  idx: number
  /** いまの表示名 */
  name: string
}

/** 会員が選んだ病気（保存済み）。name は同意した時点の表示名 */
export interface MemberDisease {
  idx: number
  name: string
}

export const SELECT_DISEASE_MESSAGE = '案内を受け取る病気を 1 つ以上選んでください'
export const LIST_CHANGED_MESSAGE = '病気の一覧が変わりました。ページを読み直して、選び直してください'
export const RESEARCH_CONSENT_REQUIRED_MESSAGE = '案内を受け取るには、上の文への同意が必要です'

// ---- 選べる病気 ---------------------------------------------------------------

let cachedNames: string[] | null = null

/** 知識ファイルのいまの並びで、idx の位置にある病名。範囲外は null */
export function knowledgeNameAt(idx: number): string | null {
  if (!cachedNames) {
    const records = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), KNOWLEDGE_JSON_RELATIVE_PATH), 'utf-8')
    ) as KnowledgeRecord[]
    cachedNames = records.map((r) => r.disease)
  }
  if (!Number.isInteger(idx) || idx < 0 || idx >= cachedNames.length) return null
  return cachedNames[idx] ?? null
}

/**
 * 会員が所属する会の disease_idxs（重複あり・順不同。researchDiseaseOptions がまとめる）。取得に失敗したら null。
 *
 * 所属は lib/portal/tenancy.ts の myGroups()（memberships。本人の有効な所属だけ）から取る。
 * 会の病気は DB の patient_groups.disease_idxs ではなく、data/patient_groups/patient_groups.json（id = slug）の
 * diseases（病名）から、いまの知識ファイル上の位置を求めて作る。理由: 会員には disease_idxs 列の読み取り権限が無い
 * （supabase/migrations/20260927_patient_group_tenancy.sql「画面は JSON から疾患を引く」）。
 * 求め方は scripts/portal/build_patient_group_seed.py と同じ（同名が複数あれば最初の位置）。
 * 知識ファイルに無い病名は落とす（推測で近い病気に当てない）。
 */
export async function getMyGroupDiseaseIdxs(): Promise<number[] | null> {
  const mine = await myGroups()
  if (!mine.ok) return null
  const slugs = new Set(mine.value.map((g) => g.slug))
  const idxs: number[] = []
  for (const g of getPatientGroups()) {
    if (!slugs.has(g.id)) continue
    for (const name of g.diseases) {
      const idx = knowledgeFilePositionOf(name)
      if (idx !== null) idxs.push(idx)
    }
  }
  return idxs
}

/**
 * 所属する会の idx から、選べる病気を作る。重複は 1 つにまとめ、いまの知識ファイルに無い idx は落とす。
 * nameAt はテストで差し替えるための引数。
 */
export function researchDiseaseOptions(
  groupIdxs: readonly number[] | null,
  nameAt: (idx: number) => string | null = knowledgeNameAt
): ResearchDiseaseOption[] {
  if (!groupIdxs) return []
  const out: ResearchDiseaseOption[] = []
  const seen = new Set<number>()
  for (const idx of groupIdxs) {
    if (seen.has(idx)) continue
    seen.add(idx)
    const name = nameAt(idx)
    if (name) out.push({ idx, name })
  }
  return out
}

export type SelectionResult =
  | { ok: true; value: ResearchDiseaseOption[] }
  | { ok: false; message: string }

/**
 * 画面から送られた選択（[{ idx, name }]）を確かめる。
 * 選べる病気の中にあり、いまの名前が送られた名前と一致するものだけを通す。1 つでも外れたら全体を通さない。
 */
export function validateResearchSelection(raw: unknown, options: readonly ResearchDiseaseOption[]): SelectionResult {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, message: SELECT_DISEASE_MESSAGE }
  const byIdx = new Map(options.map((o) => [o.idx, o]))
  const out: ResearchDiseaseOption[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const idx = o.idx
    const name = o.name
    if (typeof idx !== 'number' || !Number.isInteger(idx) || typeof name !== 'string') {
      return { ok: false, message: LIST_CHANGED_MESSAGE }
    }
    const option = byIdx.get(idx)
    if (!option || option.name !== name) return { ok: false, message: LIST_CHANGED_MESSAGE }
    if (seen.has(idx)) continue
    seen.add(idx)
    out.push(option)
  }
  return { ok: true, value: out }
}

// ---- DB との行き来 -----------------------------------------------------------

export interface ResearchContactStatus {
  state: ConsentState
  /** いまの版に同意した日（ISO 8601）。state が current のときだけ */
  consentedAt: string | null
  /** 保存済みの病気（同意した時点の名前） */
  diseases: MemberDisease[]
}

interface MemberDiseaseRow {
  disease_idx: number
  disease_name: string
}

/** 本人の B 層の状態。未ログイン・取得失敗は null（画面は「読み込めませんでした」） */
export async function getMyResearchContact(): Promise<ResearchContactStatus | null> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const records = await getMyConsents()
  if (records === null) return null

  const { data, error } = await supabase
    .from('member_diseases')
    .select('disease_idx, disease_name')
    .eq('user_id', userId)
  if (error || !data) {
    console.error('案内の対象の病気の取得に失敗しました:', error?.message)
    return null
  }
  return {
    state: consentState(records, 'research_contact'),
    consentedAt: currentConsentRecord(records, 'research_contact')?.consentedAt ?? null,
    diseases: (data as MemberDiseaseRow[]).map((r) => ({ idx: r.disease_idx, name: r.disease_name })),
  }
}

export type ResearchWriteResult =
  | { ok: true }
  | { ok: false; field: 'consent' | 'diseases'; message: string }
  | { ok: false; reason: 'unauthenticated' | 'failed' }

/**
 * 同意する（または、同意済みの方が病気を選び直す）。
 * いまの版に同意していない方は consent: true が要る。同意済みの方の選び直しでは consent を見ない。
 */
export interface ResearchContactDeps {
  groupDiseaseIdxs: () => Promise<number[] | null>
  nameAt: (idx: number) => string | null
}

const DEFAULT_DEPS: ResearchContactDeps = { groupDiseaseIdxs: getMyGroupDiseaseIdxs, nameAt: knowledgeNameAt }

/** deps はテストで所属する会と知識ファイルを差し替えるための引数。画面からは渡さない */
export async function saveMyResearchContact(
  input: { consent?: unknown; diseases?: unknown },
  deps: ResearchContactDeps = DEFAULT_DEPS
): Promise<ResearchWriteResult> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return { ok: false, reason: 'unauthenticated' }

  const records = await getMyConsents()
  if (records === null) return { ok: false, reason: 'failed' }
  const alreadyCurrent = consentState(records, 'research_contact') === 'current'
  if (!alreadyCurrent && input?.consent !== true) {
    return { ok: false, field: 'consent', message: RESEARCH_CONSENT_REQUIRED_MESSAGE }
  }

  // 選べる病気はサーバー側で作り直す（画面から来た一覧は信じない）
  const options = researchDiseaseOptions(await deps.groupDiseaseIdxs(), deps.nameAt)
  const selection = validateResearchSelection(input?.diseases, options)
  if (!selection.ok) return { ok: false, field: 'diseases', message: selection.message }

  // 病気を入れ替える（消してから入れる）
  const del = await supabase.from('member_diseases').delete().eq('user_id', userId)
  if (del.error) {
    console.error('案内の対象の病気の入れ替えに失敗しました:', del.error.message)
    return { ok: false, reason: 'failed' }
  }
  const ins = await supabase.from('member_diseases').insert(
    selection.value.map((d) => ({ user_id: userId, disease_idx: d.idx, disease_name: d.name }))
  )
  if (ins.error) {
    console.error('案内の対象の病気の保存に失敗しました:', ins.error.message)
    return { ok: false, reason: 'failed' }
  }

  // 最後に同意の行（すでにいまの版に同意済みなら足さない）
  const consent = await recordMyConsent('research_contact')
  if (!consent.ok) return { ok: false, reason: consent.reason === 'unauthenticated' ? 'unauthenticated' : 'failed' }
  return { ok: true }
}

/** 取り消す。病気を消してから、同意の行に withdrawn_at を立てる */
export async function withdrawMyResearchContact(): Promise<ResearchWriteResult> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return { ok: false, reason: 'unauthenticated' }

  const del = await supabase.from('member_diseases').delete().eq('user_id', userId)
  if (del.error) {
    console.error('案内の対象の病気の削除に失敗しました:', del.error.message)
    return { ok: false, reason: 'failed' }
  }
  const w = await withdrawMyConsent('research_contact')
  if (!w.ok) return { ok: false, reason: w.reason === 'unauthenticated' ? 'unauthenticated' : 'failed' }
  return { ok: true }
}
