/**
 * 病気がわかるまでの道のり調査 — DB との行き来（Server Component / Server Action からのみ）— 2026-10-02 ファウンダー指示
 *
 * 設問・選択肢・入力検証は lib/portal/journey-survey.ts、DB は supabase/migrations/20261010_journey_survey.sql。
 *
 * ★ 回答の表（journey_responses）は user_id を持たず、会員から直接は読めない。ここは DB 関数（rpc）だけを呼ぶ:
 *     submit_journey_response / my_journey_responses / withdraw_my_journey_response / journey_summary
 * ★ 全関数で JOURNEY_SURVEY=on を確かめ、閉じていれば DB を呼ばない（disabled）
 * ★ 同意は consents の journey（lib/portal/consent-texts.ts）。いまの版が案（draft）のうちは記録できない＝回答できない
 * ★ 個人情報（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）
 *   回答は医療情報。外部 LLM API（Anthropic 等）へ送らない。ログにも回答の値を出さない（出すのはエラーの理由だけ）。
 */

import { currentConsentText } from '@/lib/portal/consent-texts'
import { recordMyConsent } from '@/lib/portal/consents'
import { createClient } from '@/lib/supabase/server'

import {
  JOURNEY_DISEASE,
  SINGLE_KEYS,
  isJourneyEnabled,
  mapJourneyDbError,
  type JourneyAnswers,
  type JourneyFailure,
  type JourneySummaryRow,
  type MyJourneyResponse,
} from './journey-survey'

export type JourneyResult<T> = { ok: true; value: T } | { ok: false; reason: JourneyFailure }

function fail<T>(reason: JourneyFailure): JourneyResult<T> {
  return { ok: false, reason }
}

/** 理由だけ残す。回答の値はログに出さない */
function logFailure(where: string, message: string | undefined) {
  console.error(`道のり調査: ${where} に失敗しました:`, message)
}

async function signedIn(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  return Boolean(data.user?.id)
}

/**
 * 回答する。いまの journey の同意を記録してから、DB 関数で回答と対応を一緒に作る。
 * 同意が案（draft）なら何もしない（consent_draft）。
 * 同意のチェックは呼ぶ側（Server Action）が確かめてから呼ぶこと。
 */
export async function submitMyJourneyResponse(groupId: string, answers: JourneyAnswers): Promise<JourneyResult<null>> {
  if (!isJourneyEnabled()) return fail('disabled')
  const consent = currentConsentText('journey')
  if (consent.draft) return fail('consent_draft')

  const supabase = createClient()
  if (!(await signedIn(supabase))) return fail('unauthenticated')

  const recorded = await recordMyConsent('journey')
  if (!recorded.ok) {
    if (recorded.reason === 'unauthenticated') return fail('unauthenticated')
    if (recorded.reason === 'draft') return fail('consent_draft')
    return fail('failed')
  }

  const params: Record<string, unknown> = {
    p_group_id: groupId,
    // 疾患は固定 ID で渡す（20261028）。表示名は DB が会の disease_names から取る
    p_disease_id: JOURNEY_DISEASE.id,
    p_consent_version: consent.version,
    p_first_symptoms: answers.first_symptoms,
  }
  for (const key of SINGLE_KEYS) params[`p_${key}`] = answers[key]

  const { error } = await supabase.rpc('submit_journey_response', params)
  if (error) {
    logFailure('回答', error.message)
    return fail(mapJourneyDbError(error.message))
  }
  return { ok: true, value: null }
}

interface MyResponseRow {
  response_id: string
  group_slug: string
  group_name: string
  disease_id: string
  disease_name: string
  consent_version: number
  answered_month: string
  first_symptoms: string[] | null
  [key: string]: unknown
}

/** 本人の回答（会をまたいで。退会した会の分も）。読めなければ failed */
export async function myJourneyResponses(): Promise<JourneyResult<MyJourneyResponse[]>> {
  if (!isJourneyEnabled()) return fail('disabled')
  const supabase = createClient()
  if (!(await signedIn(supabase))) return fail('unauthenticated')

  const { data, error } = await supabase.rpc('my_journey_responses')
  if (error || !Array.isArray(data)) {
    logFailure('自分の回答の読み込み', error?.message)
    return fail(error ? mapJourneyDbError(error.message) : 'failed')
  }
  return {
    ok: true,
    value: (data as MyResponseRow[]).map((r) => {
      const answers = { first_symptoms: Array.isArray(r.first_symptoms) ? r.first_symptoms : [] } as JourneyAnswers
      for (const key of SINGLE_KEYS) answers[key] = typeof r[key] === 'string' ? (r[key] as string) : ''
      return {
        responseId: r.response_id,
        groupSlug: r.group_slug,
        groupName: r.group_name,
        diseaseId: r.disease_id,
        diseaseName: r.disease_name,
        consentVersion: r.consent_version,
        answeredMonth: r.answered_month,
        answers,
      }
    }),
  }
}

/** 回答を取り消す（回答も対応も消える。残る回答が無くなれば journey の同意も取り消される） */
export async function withdrawMyJourneyResponse(responseId: string): Promise<JourneyResult<null>> {
  if (!isJourneyEnabled()) return fail('disabled')
  const supabase = createClient()
  if (!(await signedIn(supabase))) return fail('unauthenticated')

  const { error } = await supabase.rpc('withdraw_my_journey_response', { p_response_id: responseId })
  if (error) {
    logFailure('回答の取り消し', error.message)
    return fail(mapJourneyDbError(error.message))
  }
  return { ok: true, value: null }
}

/** 会ごとの集計の行（DB が伏せた後のもの）。総数が 10 未満なら空の配列 */
export async function journeySummaryRows(groupId: string): Promise<JourneyResult<JourneySummaryRow[]>> {
  if (!isJourneyEnabled()) return fail('disabled')
  const supabase = createClient()
  if (!(await signedIn(supabase))) return fail('unauthenticated')

  const { data, error } = await supabase.rpc('journey_summary', {
    p_group_id: groupId,
    p_disease_id: JOURNEY_DISEASE.id,
  })
  if (error || !Array.isArray(data)) {
    logFailure('集計の読み込み', error?.message)
    return fail(error ? mapJourneyDbError(error.message) : 'failed')
  }
  return { ok: true, value: data as JourneySummaryRow[] }
}
