'use client'

// 「病気がわかるまでの道のり」の回答フォーム（1 画面・選択式のみ・自由記述なし）。見せ方と入力の補助だけ。
//
// 決まり（docs/journey_survey_items.md）:
//   - 全設問必須。選択肢が多い設問（生まれ年・年齢・診療科）はプルダウン、それ以外はボタン状の選択
//   - 設問 5 で「症状に気づく前に…分かった」を選んだら、ほかの症状は選べず、設問 6・11・14 は「症状に気づく前に分かった」に固定
//   - 選んでいないときは、設問 6・11・14 の「症状に気づく前に分かった」は選べない
// サーバー（../actions.ts → lib/portal/journey-survey.ts）と DB（CHECK）でも同じ決まりを確かめる。

import { useState } from 'react'

import {
  BEFORE_SYMPTOMS,
  FOUND_BEFORE_SYMPTOMS,
  JOURNEY_QUESTIONS,
  LINKED_KEYS,
  type JourneyQuestion,
} from '@/lib/portal/journey-survey'

/** プルダウンにする設問（選択肢が多いもの） */
const SELECT_KEYS = new Set(['birth_year_band', 'onset_age_band', 'diagnosis_age_band', 'first_department', 'diagnosis_department'])

const fieldsetClass = 'rounded-2xl bg-white border border-stone-200 p-5 sm:p-6'
const legendClass = 'px-1 text-lg font-semibold text-stone-800'
const selectClass =
  'mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-stone-100 disabled:text-stone-500'
const choiceClass =
  'flex items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-800 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 has-[:disabled]:opacity-50'

function Linked({ q, foundBefore, disabled }: { q: JourneyQuestion; foundBefore: boolean; disabled: boolean }) {
  // 自動で「症状に気づく前に分かった」になるとき。disabled の入力は送られないので、値は hidden で送る
  if (foundBefore) {
    return (
      <>
        <input type="hidden" name={q.key} value={BEFORE_SYMPTOMS} />
        <p className="mt-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-base text-stone-700">
          症状に気づく前に分かった（設問5の答えから自動で入ります）
        </p>
      </>
    )
  }
  return <Single q={q} disabled={disabled} hideBeforeSymptoms />
}

function Single({ q, disabled, hideBeforeSymptoms = false }: { q: JourneyQuestion; disabled: boolean; hideBeforeSymptoms?: boolean }) {
  const options = hideBeforeSymptoms ? q.options.filter((o) => o.value !== BEFORE_SYMPTOMS) : q.options
  if (SELECT_KEYS.has(q.key)) {
    return (
      <select id={`q-${q.key}`} name={q.key} required disabled={disabled} defaultValue="" className={selectClass} aria-label={q.title}>
        <option value="" disabled>
          選んでください
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((o, i) => (
        <label key={o.value} className={choiceClass}>
          <input type="radio" name={q.key} value={o.value} required={i === 0} disabled={disabled} className="mt-1 h-5 w-5 accent-orange-600" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

export function JourneyForm({
  action,
  consentText,
  consentLabel,
  disabled,
  disabledReason,
}: {
  action: (fd: FormData) => void | Promise<void>
  consentText: string
  consentLabel: string
  /** 閲覧モード・同意が案のとき。入力も送信もできない */
  disabled: boolean
  disabledReason: string | null
}) {
  const [symptoms, setSymptoms] = useState<string[]>([])
  const foundBefore = symptoms.includes(FOUND_BEFORE_SYMPTOMS)

  function toggleSymptom(value: string, checked: boolean) {
    if (value === FOUND_BEFORE_SYMPTOMS) {
      setSymptoms(checked ? [FOUND_BEFORE_SYMPTOMS] : [])
      return
    }
    setSymptoms((prev) => (checked ? [...prev.filter((v) => v !== value), value] : prev.filter((v) => v !== value)))
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      {JOURNEY_QUESTIONS.map((q) => (
        <fieldset key={q.key} className={fieldsetClass}>
          <legend className={legendClass}>
            {q.no}. {q.title}
          </legend>
          {q.multi ? (
            <>
              <p className="mt-1 text-sm text-stone-500">少なくとも 1 つ選んでください。</p>
              <div className="mt-3 grid gap-2">
                {q.options.map((o) => {
                  const checked = symptoms.includes(o.value)
                  const blocked = foundBefore && o.value !== FOUND_BEFORE_SYMPTOMS
                  return (
                    <label key={o.value} className={choiceClass}>
                      <input
                        type="checkbox"
                        name="first_symptoms"
                        value={o.value}
                        checked={checked}
                        disabled={disabled || blocked}
                        onChange={(e) => toggleSymptom(o.value, e.target.checked)}
                        className="mt-1 h-5 w-5 accent-orange-600"
                      />
                      <span>{o.label}</span>
                    </label>
                  )
                })}
              </div>
            </>
          ) : (LINKED_KEYS as readonly string[]).includes(q.key) ? (
            <Linked q={q} foundBefore={foundBefore} disabled={disabled} />
          ) : (
            <Single q={q} disabled={disabled} />
          )}
        </fieldset>
      ))}

      <section className="rounded-2xl bg-stone-50 border border-stone-200 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-stone-800">同意について</h3>
        <p className="mt-2 text-base text-stone-700 leading-relaxed">{consentText}</p>
        <label className="mt-4 flex items-start gap-3 text-base text-stone-800">
          <input type="checkbox" name="consent" value="yes" required disabled={disabled} className="mt-1 h-5 w-5 accent-orange-600" />
          <span>{consentLabel}</span>
        </label>
      </section>

      {disabledReason && (
        <p role="status" className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-base text-stone-800">
          {disabledReason}
        </p>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        回答を送る
      </button>
    </form>
  )
}
