/**
 * 患者会への参加希望（group_wishes / public_wish_counts。2026-10-02 ファウンダー指示）
 *
 * 2026-10-03: DB は disease_id（固定 ID。共通契約 A。20261023 で group_wishes に足される列）で読み書きする。
 *   画面・URL は互換のため idx のまま受け取り、../_lib/targets.ts の対応表で disease_id に引き直す。
 *   insert には disease_idx も送る（20261019 の NOT NULL の列。20261023 で外れるかは不明なので、両方送る）。
 *   人数は public_disease_participation（20261025。disease_id ごとの wishes）を読み、画面向けに idx に引き直す。
 * DB は supabase/migrations/20261019_group_wishes.sql（別担当）:
 *   group_wishes(disease_idx, user_id, prefecture, relation 'self'|'family', is_group_member, withdrawn_at)
 *     本人の行だけ insert / select / update（withdrawn_at だけ）。一意制約 (disease_idx, user_id)
 *     → 取り消した後にもう一度希望するときは、新しい行を作らず withdrawn_at を NULL に戻す（答えは前のまま。変えられない）
 *     取り消しの時刻は DB のトリガーが now() にする
 *   public_wish_counts(disease_idx, n)
 *     病気ごとの人数。n は '10未満' か数字の文字。数に直さない・足し引きしない。一度も希望の無い病気には行が無い
 *     （画面は、行が無い病気も「10未満」と出す）
 * 同意は lib/portal/consent-texts.ts の 'wish'（同意担当）。登録の前に recordMyConsent('wish') で記録する。
 * 都道府県・立場・会員かどうかは個人に関わる情報。ログに出さない。外部 LLM API へ送らない。
 */

import { createClient as createAnonClient } from '@supabase/supabase-js'

import { consentLabelOf, currentConsentText } from '@/lib/portal/consent-texts'
import { recordMyConsent } from '@/lib/portal/consents'
import { PREFECTURES } from '@/lib/portal/member-profile'
import { createClient } from '@/lib/supabase/server'

import { wishTargetByDiseaseId, wishTargetOf } from './targets'

export const WISH_RELATIONS = ['self', 'family'] as const
export type WishRelation = (typeof WISH_RELATIONS)[number]
export const WISH_RELATION_LABELS: Record<WishRelation, string> = { self: 'ご本人', family: 'ご家族' }

/**
 * 同意の文。同意担当の文（lib/portal/consent-texts.ts の 'wish' のいまの版）。
 * 同意担当の文ができる前は仮の文を置いていた（2026-10-02 に差し替えた。app/demo/__tests__/wish.test.tsx が仮の文に戻っていないかを見る）
 */
export const WISH_CONSENT_PLACEHOLDER =
  '【仮の文】入力した都道府県・立場・会員かどうかを、この病気の患者会ができたときのご案内と、参加を待っている方の人数（10人未満は「10未満」）の表示に使うことに同意します。'
const WISH_CONSENT = currentConsentText('wish')
export const WISH_CONSENT_TEXT = WISH_CONSENT.text
export const WISH_CONSENT_LABEL = consentLabelOf(WISH_CONSENT)
export const WISH_CONSENT_IS_PLACEHOLDER = false

export interface MyWish {
  /** 画面・URL 用の番号（disease_id から引き直したもの） */
  diseaseIdx: number
  /** 固定 ID（rd00001 形式） */
  diseaseId: string
  prefecture: string
  relation: WishRelation
  isGroupMember: boolean | null
  createdAt: string | null
  /** 取り消したもの（もう一度希望するときは、この行を再開する） */
  withdrawn: boolean
}

export type WishFailure = 'unauthenticated' | 'invalid_input' | 'already_wished' | 'failed'
export type WishResult<T> = { ok: true; value: T } | { ok: false; reason: WishFailure }

export const WISH_FAILURE_MESSAGES: Record<WishFailure, string> = {
  unauthenticated: 'ログインが切れています。もう一度お試しください',
  invalid_input: '入力を確かめてください',
  already_wished: 'この病気の患者会には、すでにとなりへの参加を希望しています',
  failed: 'うまくいきませんでした。時間をおいてもう一度お試しください',
}

export function isWishFailure(raw: unknown): raw is WishFailure {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(WISH_FAILURE_MESSAGES, raw)
}

export interface WishInput {
  diseaseIdx: number
  prefecture: string
  relation: WishRelation
  isGroupMember: boolean | null
  consent: boolean
}

/** 入力の形だけを見る（DB に触らない） */
export function validateWishInput(raw: unknown): WishInput | null {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (typeof o.diseaseIdx !== 'number' || !Number.isInteger(o.diseaseIdx) || o.diseaseIdx < 0) return null
  if (typeof o.prefecture !== 'string' || !(PREFECTURES as readonly string[]).includes(o.prefecture)) return null
  if (typeof o.relation !== 'string' || !(WISH_RELATIONS as readonly string[]).includes(o.relation)) return null
  if (!(o.isGroupMember === true || o.isGroupMember === false || o.isGroupMember === null)) return null
  if (o.consent !== true) return null
  return { diseaseIdx: o.diseaseIdx, prefecture: o.prefecture, relation: o.relation as WishRelation, isGroupMember: o.isGroupMember, consent: true }
}

async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

function logFailure(where: string, message: string | undefined) {
  console.error(`参加希望: ${where} に失敗しました:`, message)
}

/** 本人の、取り消していない参加希望。未ログインなら []、読めなければ null */
export async function listMyWishes(): Promise<MyWish[] | null> {
  const all = await listMyWishRows()
  return all === null ? null : all.filter((w) => !w.withdrawn)
}

/** 本人の参加希望（取り消したものも含む）。未ログインなら []、読めなければ null */
export async function listMyWishRows(): Promise<MyWish[] | null> {
  const userId = await sessionUserId()
  if (!userId) return []
  try {
    const { data, error } = await createClient()
      .from('group_wishes')
      .select('disease_id, prefecture, relation, is_group_member, created_at, withdrawn_at')
      .eq('user_id', userId)
    if (error) {
      logFailure('一覧の取得', error.message)
      return null
    }
    const rows = (data ?? []) as {
      disease_id: string
      prefecture: string
      relation: WishRelation
      is_group_member: boolean | null
      created_at?: string | null
      withdrawn_at?: string | null
    }[]
    // 対応表に無い disease_id の行は画面に出せない（出す病気が分からない）ので除く
    return rows.flatMap((r) => {
      const t = wishTargetByDiseaseId(r.disease_id)
      return t ? [{ r, idx: t.idx }] : []
    }).map(({ r, idx }) => ({
      diseaseIdx: idx,
      diseaseId: r.disease_id,
      prefecture: r.prefecture,
      relation: r.relation,
      isGroupMember: r.is_group_member,
      createdAt: r.created_at ?? null,
      withdrawn: r.withdrawn_at !== null && r.withdrawn_at !== undefined,
    }))
  } catch (err) {
    logFailure('一覧の取得', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

/** 同意（'wish' のいまの版）を記録する。済んでいれば何もしない */
async function recordWishConsent(): Promise<WishResult<null>> {
  const r = await recordMyConsent('wish')
  if (r.ok) return { ok: true, value: null }
  return { ok: false, reason: r.reason === 'unauthenticated' ? 'unauthenticated' : 'failed' }
}

/**
 * 参加を希望する（初めての病気）。取り消していない希望があれば already_wished。
 * 取り消した希望がある病気は、新しい行を作れない（一意制約）ので resumeWish を使う（画面がそちらを出す）
 */
export async function createWish(raw: unknown): Promise<WishResult<null>> {
  const input = validateWishInput(raw)
  if (!input) return { ok: false, reason: 'invalid_input' }
  const userId = await sessionUserId()
  if (!userId) return { ok: false, reason: 'unauthenticated' }
  const mine = await listMyWishRows()
  if (mine === null) return { ok: false, reason: 'failed' }
  const existing = mine.find((w) => w.diseaseIdx === input.diseaseIdx)
  if (existing) return { ok: false, reason: existing.withdrawn ? 'invalid_input' : 'already_wished' }
  const target = wishTargetOf(input.diseaseIdx)
  if (!target?.diseaseId) return { ok: false, reason: 'invalid_input' }
  const consent = await recordWishConsent()
  if (!consent.ok) return consent
  try {
    const { error } = await createClient().from('group_wishes').insert({
      user_id: userId,
      disease_id: target.diseaseId,
      disease_idx: input.diseaseIdx,
      prefecture: input.prefecture,
      relation: input.relation,
      is_group_member: input.isGroupMember,
    })
    if (error) {
      logFailure('登録', error.message)
      return { ok: false, reason: /duplicate|unique/i.test(error.message) ? 'already_wished' : 'failed' }
    }
    return { ok: true, value: null }
  } catch (err) {
    logFailure('登録', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

/**
 * 取り消した希望を再開する（withdrawn_at を NULL に戻す。答えは前のまま）。同意は改めて記録する。
 * 取り消した行が無ければ invalid_input、すでに有効なら already_wished
 */
export async function resumeWish(diseaseIdx: number, consent: boolean): Promise<WishResult<null>> {
  if (!Number.isInteger(diseaseIdx) || diseaseIdx < 0 || consent !== true) return { ok: false, reason: 'invalid_input' }
  const userId = await sessionUserId()
  if (!userId) return { ok: false, reason: 'unauthenticated' }
  const mine = await listMyWishRows()
  if (mine === null) return { ok: false, reason: 'failed' }
  const existing = mine.find((w) => w.diseaseIdx === diseaseIdx)
  if (!existing) return { ok: false, reason: 'invalid_input' }
  if (!existing.withdrawn) return { ok: false, reason: 'already_wished' }
  const recorded = await recordWishConsent()
  if (!recorded.ok) return recorded
  try {
    const { error } = await createClient()
      .from('group_wishes')
      .update({ withdrawn_at: null })
      .eq('user_id', userId)
      .eq('disease_id', existing.diseaseId)
    if (error) {
      logFailure('再開', error.message)
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, value: null }
  } catch (err) {
    logFailure('再開', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

/** 参加希望を取り消す（withdrawn_at を立てる。時刻は DB のトリガーが now() にする。行は消さない） */
export async function withdrawWish(diseaseIdx: number): Promise<WishResult<null>> {
  if (!Number.isInteger(diseaseIdx) || diseaseIdx < 0) return { ok: false, reason: 'invalid_input' }
  const target = wishTargetOf(diseaseIdx)
  if (!target?.diseaseId) return { ok: false, reason: 'invalid_input' }
  const userId = await sessionUserId()
  if (!userId) return { ok: false, reason: 'unauthenticated' }
  try {
    const { error } = await createClient()
      .from('group_wishes')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('disease_id', target.diseaseId)
      .is('withdrawn_at', null)
    if (error) {
      logFailure('取り消し', error.message)
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, value: null }
  } catch (err) {
    logFailure('取り消し', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}

/**
 * 病気ごとの「参加を待っている方」の人数（公開ページ /demo/groups が読む。anon。cookie を使わない）。
 * n は受け取った文字のまま（'10未満' を数に直さない）。読めない・未設定なら空
 */
export async function fetchPublicWishCounts(): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return out
  try {
    const client = createAnonClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.from('public_disease_participation').select('disease_id, wishes')
    if (error) {
      console.error('参加を待っている方の人数の取得に失敗しました:', error.message)
      return out
    }
    return toWishCounts(data)
  } catch (err) {
    console.error('参加を待っている方の人数の取得で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
    return out
  }
}

/**
 * 行（public_disease_participation の disease_id・wishes）→ 画面の番号（idx）ごとの n（文字のまま）。
 * 対応表に無い disease_id・形の違う行は捨てる
 */
export function toWishCounts(rows: unknown): Map<number, string> {
  const out = new Map<number, string>()
  if (!Array.isArray(rows)) return out
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    if (typeof o.disease_id !== 'string') continue
    const t = wishTargetByDiseaseId(o.disease_id)
    if (!t) continue
    if (typeof o.wishes === 'string' && o.wishes.trim() !== '') out.set(t.idx, o.wishes)
    else if (typeof o.wishes === 'number' && Number.isFinite(o.wishes)) out.set(t.idx, String(o.wishes))
  }
  return out
}

