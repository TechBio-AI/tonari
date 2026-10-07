'use client'

// マイページの「研究・治験の案内」節（B 層。2026-09-26 ファウンダー指示）
//
// 希望する方だけの設定。同意の文をチェック欄にし、案内を受け取る病気を選ぶ（複数可）。
// 選べる病気は所属する会の disease_idxs から作ったもの（サーバー側のページが options で渡す）。
//   - options が空 … 選べる病気がまだ無い（会の登録が無い）。同意の欄は出さない。取り消しだけは出す
//   - status が null … いまの設定を読み込めなかった。何も書かせない
// 送るのは [{ idx, name }]。サーバー側が「いまその idx の名前が name か」を確かめる（見ていない病気に同意させない）。
// 保存済みの病気は、同意した時点の名前（member_diseases.disease_name）で出す。idx から引き直さない。
// 病名はログに出さない。

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { ConsentState } from '@/lib/portal/consents'
import type { MemberDisease, ResearchDiseaseOption, ResearchWriteResult } from '@/lib/portal/research-contact'

import { FAILED_MESSAGE, SAVED_MESSAGE, SIGNED_OUT_MESSAGE } from '../_components/ProfileForm'

export const RESEARCH_HEADING = '研究・治験の案内'
export const NO_OPTIONS_MESSAGE = '選べる病気がまだありません。所属する会の登録ができてから、選べるようになります。'
export const LOAD_FAILED_MESSAGE = 'いまの設定を読み込めませんでした。時間をおいて、もう一度お試しください。'
export const OUTDATED_MESSAGE = '案内の文を改めました。受け取りを続けるには、改めて同意してください。同意いただくまで、案内はお届けしません。'
export const WITHDRAWN_MESSAGE = '取り消しました。選んだ病気の記録も削除しました。'

export interface ResearchContactView {
  state: ConsentState
  /** いまの版に同意した日（表示用に整えた文字列）。無ければ '' */
  consentedDate: string
  diseases: MemberDisease[]
}

export interface ResearchContactSectionProps {
  /** 同意の文（いまの版）。チェック欄の文になる */
  consentLabel: string
  options: ResearchDiseaseOption[]
  status: ResearchContactView | null
  save: (input: { consent: boolean; diseases: ResearchDiseaseOption[] }) => Promise<ResearchWriteResult>
  withdraw: () => Promise<ResearchWriteResult>
}

type Message = { kind: 'ok' | 'error'; text: string; signedOut?: boolean } | null

function messageOf(result: ResearchWriteResult): Message {
  if (result.ok) return null
  if ('field' in result) return { kind: 'error', text: result.message }
  if (result.reason === 'unauthenticated') return { kind: 'error', text: SIGNED_OUT_MESSAGE, signedOut: true }
  return { kind: 'error', text: FAILED_MESSAGE }
}

export function ResearchContactSection({ consentLabel, options, status, save, withdraw }: ResearchContactSectionProps) {
  const savedNames = new Set(status?.diseases.map((d) => d.name) ?? [])
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(options.filter((o) => savedNames.has(o.name)).map((o) => o.idx))
  )
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [pending, startTransition] = useTransition()
  const [ready, setReady] = useState(false)
  const router = useRouter()
  useEffect(() => setReady(true), [])

  const current = status?.state === 'current'
  const hasSomething = !!status && (status.state !== 'none' || status.diseases.length > 0)

  function toggle(idx: number) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
    setMessage(null)
  }

  function run(action: () => Promise<ResearchWriteResult>, okText: string) {
    startTransition(async () => {
      let result: ResearchWriteResult
      try {
        result = await action()
      } catch (err) {
        console.error('研究・治験の案内の保存で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
        result = { ok: false, reason: 'failed' }
      }
      if (result.ok) {
        setConsent(false)
        setMessage({ kind: 'ok', text: okText })
        router.refresh()
      } else {
        setMessage(messageOf(result))
      }
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const diseases = options.filter((o) => selected.has(o.idx))
    run(() => save({ consent, diseases }), SAVED_MESSAGE)
  }

  return (
    <section aria-labelledby="research-contact-heading" className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-research-contact>
      <h2 id="research-contact-heading" className="text-xl font-bold text-stone-800">
        {RESEARCH_HEADING}
      </h2>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        希望する方だけの設定です。受け取らなくても、会員向けページはこれまでどおりご利用いただけます。
      </p>

      {status === null ? (
        <p className="mt-5 text-base text-rose-700">{LOAD_FAILED_MESSAGE}</p>
      ) : (
        <>
          {current && (
            <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-base text-stone-800">
              <p>案内を受け取る設定になっています{status.consentedDate && `（同意した日：${status.consentedDate}）`}。</p>
              {status.diseases.length > 0 && (
                <ul className="mt-2 list-disc pl-6" data-saved-diseases>
                  {status.diseases.map((d) => (
                    <li key={d.name}>{d.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {status.state === 'outdated' && (
            <p role="status" className="mt-5 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base text-stone-800">
              {OUTDATED_MESSAGE}
            </p>
          )}

          {options.length === 0 ? (
            <p className="mt-5 text-base text-stone-600">{NO_OPTIONS_MESSAGE}</p>
          ) : (
            <form method="post" onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
              <fieldset>
                <legend className="text-base font-semibold text-stone-800">案内を受け取る病気（いくつでも選べます）</legend>
                <div className="mt-3 space-y-2">
                  {options.map((o) => (
                    <label key={o.idx} className="flex items-start gap-3 text-base text-stone-800">
                      <input
                        type="checkbox"
                        name="diseases"
                        value={o.idx}
                        checked={selected.has(o.idx)}
                        onChange={() => toggle(o.idx)}
                        className="mt-1 h-5 w-5"
                      />
                      <span>{o.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {!current && (
                <label className="flex items-start gap-3 text-base text-stone-800">
                  <input
                    type="checkbox"
                    name="research-consent"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked)
                      setMessage(null)
                    }}
                    className="mt-1 h-5 w-5"
                  />
                  <span>{consentLabel}</span>
                </label>
              )}

              <button
                type="submit"
                disabled={!ready || pending}
                className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {pending ? '保存しています…' : current ? '選び直しを保存する' : '同意して保存する'}
              </button>
            </form>
          )}

          {hasSomething && (
            <div className="mt-6 border-t border-stone-200 pt-5">
              <p className="text-base text-stone-600">取り消すと、案内は届かなくなり、選んだ病気の記録も削除します。</p>
              <button
                type="button"
                disabled={!ready || pending}
                onClick={() => run(withdraw, WITHDRAWN_MESSAGE)}
                className="mt-3 rounded-2xl border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                案内の受け取りを取り消す
              </button>
            </div>
          )}
        </>
      )}

      <p aria-live="polite" className="mt-4 text-base">
        {message?.kind === 'ok' && <span className="text-emerald-700">{message.text}</span>}
        {message?.kind === 'error' && (
          <span role="alert" className="text-rose-700">
            {message.text}
            {message.signedOut && (
              <Link href="/demo/login" className="ml-2 text-orange-700 underline">
                ログイン画面へ
              </Link>
            )}
          </span>
        )}
      </p>
    </section>
  )
}

export default ResearchContactSection
