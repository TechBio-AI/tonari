/**
 * 共通契約 2026-10-03 の B〜E（運営・案件・公開の参加状況・会の新設）の、画面側の読み書き
 *
 * DB は supabase/migrations/20261022〜20261026（別担当。docs/patient_group_tenancy_rls.md「運営・案件・公開の参加状況・会の新設」）。
 * 画面はここだけを通す。DB の関数・表が無い間（未適用）は、どれも失敗として返り、画面は「読み込めませんでした」か空を出す。
 *
 * ★ 参加希望の実数は wish_summary_ops(disease_id)（患者会テナント担当が 20261023 で用意。運営だけ）。
 *   20261023 がまだリポジトリに無いので、引数名 p_disease_id と、返す列 (prefecture, relation, is_group_member, n) は仮（2026-10-03）。
 *   違っていたら getWishSummary を合わせる
 * ★ 案件（trial_notices）を会員の画面で読むのは list_my_trial_notices() だけ（表を直接読まない。B 層以外には存在も見せない）。
 * ★ 運営の画面は is_operator() が true のときだけ（画面側の判定。DB の関数も運営かを確かめる）。
 * 個人に関わる値（理由・メッセージ・内訳）はログに出さない。外部 LLM API へ送らない。
 */

import { createClient as createAnonClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export type ContractFailure =
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_input'
  | 'already_requested'
  | 'request_not_pending'
  | 'failed'
export type ContractResult<T> = { ok: true; value: T } | { ok: false; reason: ContractFailure }

export const CONTRACT_FAILURE_MESSAGES: Record<ContractFailure, string> = {
  unauthenticated: 'ログインしてください',
  forbidden: 'この操作はできません',
  invalid_input: '入力を確かめてください',
  already_requested: 'この病気の会の新設は、すでに申請しています',
  request_not_pending: 'この申請はすでに処理されています',
  failed: 'うまくいきませんでした。時間をおいてもう一度お試しください',
}

export function isContractFailure(raw: unknown): raw is ContractFailure {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(CONTRACT_FAILURE_MESSAGES, raw)
}

function mapError(message: string | undefined): ContractFailure {
  const known: ContractFailure[] = ['unauthenticated', 'forbidden', 'invalid_input', 'already_requested', 'request_not_pending']
  return known.find((k) => k === message) ?? 'failed'
}

function logFailure(where: string, message: string | undefined) {
  console.error(`共通契約: ${where} に失敗しました:`, message)
}

async function rpc<T>(where: string, fn: string, args?: Record<string, unknown>): Promise<ContractResult<T>> {
  try {
    const { data, error } = await createClient().rpc(fn, args)
    if (error) {
      logFailure(where, error.message)
      return { ok: false, reason: mapError(error.message) }
    }
    return { ok: true, value: data as T }
  } catch (err) {
    logFailure(where, err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createAnonClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ---- B: 運営 -------------------------------------------------------------------

/** 呼んだ本人が運営か。分からなければ false（運営の画面を出さない側に倒す） */
export async function isOperator(): Promise<boolean> {
  const r = await rpc<boolean>('運営かの確認', 'is_operator')
  return r.ok && r.value === true
}

export interface WishSummaryRow {
  prefecture: string
  relation: string
  /** 未回答は null */
  isGroupMember: boolean | null
  n: number
}

/** 参加希望の実数の内訳（運営だけ。DB 関数 wish_summary_ops） */
export async function getWishSummary(diseaseId: string): Promise<ContractResult<WishSummaryRow[]>> {
  const r = await rpc<unknown>('参加希望の内訳', 'wish_summary_ops', { p_disease_id: diseaseId })
  if (!r.ok) return r
  const rows = Array.isArray(r.value) ? (r.value as Record<string, unknown>[]) : []
  return {
    ok: true,
    value: rows.map((o) => ({
      prefecture: String(o.prefecture ?? ''),
      relation: String(o.relation ?? ''),
      isGroupMember: o.is_group_member === true ? true : o.is_group_member === false ? false : null,
      n: Number(o.n ?? 0),
    })),
  }
}

// ---- E: 会の新設 ---------------------------------------------------------------

export interface GroupRequest {
  id: string
  diseaseId: string
  proposedName: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  decidedAt: string | null
}

const GROUP_REQUEST_COLUMNS = 'id, disease_id, proposed_name, message, status, created_at, decided_at'

function toGroupRequest(o: Record<string, unknown>): GroupRequest {
  return {
    id: String(o.id),
    diseaseId: String(o.disease_id),
    proposedName: String(o.proposed_name ?? ''),
    message: String(o.message ?? ''),
    status: (o.status as GroupRequest['status']) ?? 'pending',
    createdAt: String(o.created_at ?? ''),
    decidedAt: (o.decided_at as string | null) ?? null,
  }
}

/** 会の新設の申請（運営は全行、それ以外は本人の行だけが RLS で返る）。申請者の id は読まない */
export async function listGroupRequests(): Promise<ContractResult<GroupRequest[]>> {
  try {
    const { data, error } = await createClient().from('group_requests').select(GROUP_REQUEST_COLUMNS).order('created_at', { ascending: false })
    if (error) {
      logFailure('新設の申請の一覧', error.message)
      return { ok: false, reason: mapError(error.message) }
    }
    return { ok: true, value: ((data ?? []) as Record<string, unknown>[]).map(toGroupRequest) }
  } catch (err) {
    logFailure('新設の申請の一覧', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

export const NEW_GROUP_NAME_MAX = 100
export const NEW_GROUP_MESSAGE_MAX = 1000
export const GROUP_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export async function requestNewGroup(diseaseId: string, name: string, message: string): Promise<ContractResult<string>> {
  const n = name.trim()
  if (n === '' || [...n].length > NEW_GROUP_NAME_MAX || [...message].length > NEW_GROUP_MESSAGE_MAX) {
    return { ok: false, reason: 'invalid_input' }
  }
  return rpc<string>('会の新設の申請', 'request_new_group', { p_disease_id: diseaseId, p_name: n, p_message: message.trim() })
}

export async function approveGroupRequest(requestId: string, slug: string): Promise<ContractResult<string>> {
  if (!GROUP_SLUG_PATTERN.test(slug)) return { ok: false, reason: 'invalid_input' }
  return rpc<string>('新設の承認', 'approve_group_request', { p_request_id: requestId, p_slug: slug })
}

export async function rejectGroupRequest(requestId: string): Promise<ContractResult<null>> {
  const r = await rpc<unknown>('新設の却下', 'reject_group_request', { p_request_id: requestId })
  return r.ok ? { ok: true, value: null } : r
}

// ---- C: 案件 -------------------------------------------------------------------

export const NOTICE_STATUSES = ['draft', 'published', 'closed'] as const
export type NoticeStatus = (typeof NOTICE_STATUSES)[number]

export interface OpsTrialNotice {
  id: string
  diseaseId: string
  registry: 'jrct' | 'ctgov'
  registryId: string
  registryUrl: string
  summary: string
  phase: string | null
  status: NoticeStatus
  publishedAt: string | null
  interested: number | null
  dismissed: number | null
}

/** 運営の一覧（表を直接読む。運営だけが読める）。反応の実数を添える */
export async function listTrialNoticesForOps(): Promise<ContractResult<OpsTrialNotice[]>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('trial_notices')
      .select('id, disease_id, registry, registry_id, registry_url, summary, phase, status, published_at')
      .order('created_at', { ascending: false })
    if (error) {
      logFailure('案件の一覧', error.message)
      return { ok: false, reason: mapError(error.message) }
    }
    const rows = (data ?? []) as Record<string, unknown>[]
    const out: OpsTrialNotice[] = []
    for (const o of rows) {
      const c = await rpc<{ interested: number; dismissed: number }[]>('反応の実数', 'notice_interest_counts', { p_notice_id: o.id })
      const counts = c.ok && Array.isArray(c.value) ? c.value[0] : undefined
      out.push({
        id: String(o.id),
        diseaseId: String(o.disease_id),
        registry: o.registry as OpsTrialNotice['registry'],
        registryId: String(o.registry_id),
        registryUrl: String(o.registry_url),
        summary: String(o.summary),
        phase: (o.phase as string | null) ?? null,
        status: o.status as NoticeStatus,
        publishedAt: (o.published_at as string | null) ?? null,
        interested: counts ? Number(counts.interested) : null,
        dismissed: counts ? Number(counts.dismissed) : null,
      })
    }
    return { ok: true, value: out }
  } catch (err) {
    logFailure('案件の一覧', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

export async function setNoticeStatus(id: string, status: NoticeStatus): Promise<ContractResult<null>> {
  if (!(NOTICE_STATUSES as readonly string[]).includes(status)) return { ok: false, reason: 'invalid_input' }
  const r = await rpc<unknown>('案件の状態', 'set_notice_status', { p_id: id, p_status: status })
  return r.ok ? { ok: true, value: null } : r
}

export interface MyTrialNotice {
  id: string
  diseaseId: string
  registry: string
  registryId: string
  registryUrl: string
  summary: string
  publishedAt: string | null
  myStatus: 'interested' | 'dismissed' | null
}

/** 本人に見せてよい案件（list_my_trial_notices だけ。B 層以外・対象外の病気には DB が返さない） */
export async function listMyTrialNotices(): Promise<ContractResult<MyTrialNotice[]>> {
  const r = await rpc<unknown>('自分の案件', 'list_my_trial_notices')
  if (!r.ok) return r
  const rows = Array.isArray(r.value) ? (r.value as Record<string, unknown>[]) : []
  return {
    ok: true,
    value: rows.map((o) => ({
      id: String(o.id),
      diseaseId: String(o.disease_id),
      registry: String(o.registry),
      registryId: String(o.registry_id),
      registryUrl: String(o.registry_url),
      summary: String(o.summary),
      publishedAt: (o.published_at as string | null) ?? null,
      myStatus: o.my_status === 'interested' || o.my_status === 'dismissed' ? o.my_status : null,
    })),
  }
}

export async function setNoticeInterest(noticeId: string, status: 'interested' | 'dismissed'): Promise<ContractResult<null>> {
  if (status !== 'interested' && status !== 'dismissed') return { ok: false, reason: 'invalid_input' }
  const r = await rpc<unknown>('案件への反応', 'set_notice_interest', { p_notice_id: noticeId, p_status: status })
  return r.ok ? { ok: true, value: null } : r
}

// ---- D・E: 公開（anon。cookie を使わない） ----------------------------------------

export interface Participation {
  diseaseId: string
  members: string
  researchContact: string
  wishes: string
}

/** 病気ごとの公開の参加状況。値は文字のまま（'10未満' を数に直さない）。読めなければ null */
export async function fetchParticipation(): Promise<Participation[] | null> {
  const client = anonClient()
  if (!client) return null
  try {
    const { data, error } = await client.from('public_disease_participation').select('disease_id, members, research_contact, wishes')
    if (error) {
      logFailure('公開の参加状況', error.message)
      return null
    }
    return ((data ?? []) as Record<string, unknown>[])
      .filter((o) => typeof o.disease_id === 'string')
      .map((o) => ({
        diseaseId: o.disease_id as string,
        members: String(o.members ?? '10未満'),
        researchContact: String(o.research_contact ?? '10未満'),
        wishes: String(o.wishes ?? '10未満'),
      }))
  } catch (err) {
    logFailure('公開の参加状況', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

export interface PublicGroup {
  slug: string
  name: string
  diseaseId: string | null
  createdAt: string
}

/** 公開用の会の一覧（public_groups）。読めなければ null */
export async function fetchPublicGroups(): Promise<PublicGroup[] | null> {
  const client = anonClient()
  if (!client) return null
  try {
    const { data, error } = await client.from('public_groups').select('slug, name, disease_id, created_at').order('created_at')
    if (error) {
      logFailure('公開の会の一覧', error.message)
      return null
    }
    return ((data ?? []) as Record<string, unknown>[]).map((o) => ({
      slug: String(o.slug),
      name: String(o.name),
      diseaseId: (o.disease_id as string | null) ?? null,
      createdAt: String(o.created_at ?? ''),
    }))
  } catch (err) {
    logFailure('公開の会の一覧', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

// ---- 通報（全会。20261030 list_all_reports。運営だけ） ------------------------------

export interface OpsReport {
  id: string
  groupSlug: string
  targetKind: 'post' | 'comment'
  postId: string | null
  commentId: string | null
  /** 通報した人が書いた理由（病状や人名が書かれうる。ログに出さない） */
  reason: string
  createdAt: string
  /** null なら未対応 */
  handledAt: string | null
}

/**
 * すべての会の通報（運営だけ。DB 関数 list_all_reports。未対応 → 対応済み、それぞれ新しい順で DB が返す）。
 * 通報した人・対応した人・本文は DB が返さない。対応済みにするのは各会の世話人（manage/reports）
 */
export async function listAllReports(): Promise<ContractResult<OpsReport[]>> {
  const r = await rpc<unknown>('通報（全会）の一覧', 'list_all_reports')
  if (!r.ok) return r
  const rows = Array.isArray(r.value) ? (r.value as Record<string, unknown>[]) : []
  return {
    ok: true,
    value: rows.map((o) => ({
      id: String(o.id),
      groupSlug: String(o.group_slug ?? ''),
      targetKind: o.target_kind === 'comment' ? 'comment' : 'post',
      postId: (o.post_id as string | null) ?? null,
      commentId: (o.comment_id as string | null) ?? null,
      reason: String(o.reason ?? ''),
      createdAt: String(o.created_at ?? ''),
      handledAt: (o.handled_at as string | null) ?? null,
    })),
  }
}
