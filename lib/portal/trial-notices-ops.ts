/**
 * 運営画面の、治験・研究の案内（trial_notices）の保存（共通契約 2026-10-03 の C。DB は supabase/migrations/20261024_trial_notices.sql）
 *
 * 運営画面のサーバー処理（server action / Route Handler）は、案件を作る・直すときに必ずこの saveTrialNotice を通す。
 *   1. summary に /demo の禁止表現（lib/portal/wording-blocklist.ts。docs/wording-blocklist-demo.txt と同じ語）が
 *      含まれていたら、DB に送らずに止める（blocked_words。どの語かを返す）
 *   2. 通れば DB 関数 upsert_trial_notice を呼ぶ（運営かどうか・入力の形は DB 関数が確かめる）
 * summary は運営が書く中立の要約（疾患・相・対象・実施地域）。薬剤名・製品名・企業名・効果・参加を勧める表現は書かない（契約）。
 * ここで止めるのは禁止表現の一覧にある語だけ。それ以外の線引きは、運営の確認と公開前の専門家の確認による。
 * 本文はログに出さない。外部 LLM API へ送らない。
 */

import { createClient } from '@/lib/supabase/server'

import { findBlockedWords } from './wording-blocklist'

export interface TrialNoticeInput {
  /** 直すときの id。新しく作るときは null（draft で作られる） */
  id: string | null
  diseaseId: string
  registry: string
  registryId: string
  registryUrl: string
  summary: string
  phase?: string | null
}

export type TrialNoticeSaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'blocked_words'; words: string[] }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'failed' }

export const BLOCKED_WORDS_MESSAGE = '使えない表現が含まれているため、保存しませんでした'

export async function saveTrialNotice(input: TrialNoticeInput): Promise<TrialNoticeSaveResult> {
  if (typeof input?.summary !== 'string') return { ok: false, reason: 'invalid_input' }
  const words = findBlockedWords(input.summary)
  if (words.length > 0) return { ok: false, reason: 'blocked_words', words }

  try {
    const { data, error } = await createClient().rpc('upsert_trial_notice', {
      p_id: input.id,
      p_disease_id: input.diseaseId,
      p_registry: input.registry,
      p_registry_id: input.registryId,
      p_registry_url: input.registryUrl,
      p_summary: input.summary,
      p_phase: input.phase ?? null,
    })
    if (error) {
      const m = error.message
      console.error('案件の保存に失敗しました:', m)
      if (m === 'unauthenticated' || m === 'forbidden' || m === 'invalid_input') return { ok: false, reason: m }
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, id: data as string }
  } catch (err) {
    console.error('案件の保存で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}
