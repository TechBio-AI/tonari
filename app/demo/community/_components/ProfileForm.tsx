'use client'

// 会員プロフィールの入力フォーム（共通部品。マイページの編集と、初回の onboarding の両方が使う）
//
// 2 つのブロックに分ける（2026-09-26 ファウンダー決定。docs/DECISIONS.md「プロフィールを『登録する方』と『患者さん』に分ける」）:
//   - 登録する方について: 登録する方（ご本人／ご家族・代理の方）・氏名・表示名。
//     代理のときだけ、続柄・「患者さんは18歳未満ですか」・（18歳以上なら）自己申告のチェック
//   - 患者さんについて: 年代・性別・お住まいの都道府県
//   冒頭と末尾の文はファウンダー指示の文言そのまま（FORM_LEAD・FORM_FOOTNOTE）。
//
// props:
//   - initial         初期値。無い項目は空（選択肢は「選んでください」から始まる）
//   - save            保存先。{ profile, consent } を受け取り、結果を返す関数（server action でも fetch の包みでもよい）
//   - requireConsent  true なら利用目的への同意のチェックを出す。未チェックなら save を呼ばずに理由を出す
//   - onSaved         保存できたあとの動き。省略時は「保存しました」を出してページを読み直す
//
// lib/portal/member-profile.ts はサーバー側の Supabase を読むので、ここからは型だけを使う（値は import しない）。
// 選択肢と上限は呼ぶ側（サーバー側のページ）から props で受け取る。
// 入力値の検証はサーバー側（validateMemberProfileInput）だけが行う。ここで確かめるのは同意だけ。
// ハイドレーションが済むまで送信させない（済む前に押されると、ブラウザが form を送って氏名が URL に残るおそれがある。
// method="post" も付けて GET にはならないようにしてある）。入力値はログに出さない。

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { MemberProfileInput, RegistrantType } from '@/lib/portal/member-profile'

import { CONSENT_LABEL, CONSENT_REQUIRED_MESSAGE } from './purpose'

export const SAVED_MESSAGE = '保存しました。'
export const FAILED_MESSAGE = '保存できませんでした。時間をおいて、もう一度お試しください。'
export const SIGNED_OUT_MESSAGE = 'ログインが切れています。もう一度ログインしてください。'

/** フォーム冒頭の文（ファウンダー指示の文言そのまま） */
export const FORM_LEAD = 'このプロフィールは、患者さんについての情報です。ご本人が登録する場合は、ご自身のことを書いてください'
/** フォーム末尾の文（ファウンダー指示の文言そのまま） */
export const FORM_FOOTNOTE = '18歳以上の患者さんは、できるかぎりご本人が登録してください'
/** 18 歳以上の患者さんの代理の自己申告 */
export const PROXY_ATTESTATION_LABEL = '患者さんご本人が自分では操作できないため、ご本人の意思に基づいて代わりに入力します'

export interface ProfileChoices {
  /** 登録する方の選択肢（値と表示。member-profile.ts の REGISTRANT_TYPES・REGISTRANT_TYPE_LABELS から作る） */
  registrantTypes: ReadonlyArray<{ value: RegistrantType; label: string }>
  ageBands: readonly string[]
  genders: readonly string[]
  prefectures: readonly string[]
  proxyRelations: readonly string[]
  fullNameMax?: number
  displayNameMax?: number
}

/** save に渡す形。値の確かめはサーバー側（validateMemberProfileInput）が行う */
export interface ProfilePayload {
  fullName: string
  displayName: string
  registrantType: string
  /** 代理のときだけ値。本人のときは null */
  proxyRelation: string | null
  /** 代理のときだけ true / false（未選択は null）。本人のときは null */
  patientIsMinor: boolean | null
  /** 18 歳以上の患者さんの代理の自己申告（列には持たない） */
  proxyAttestation: boolean
  ageBand: string
  gender: string
  prefecture: string
}

type FieldName = keyof MemberProfileInput | 'proxyAttestation' | 'consent'

/** save の結果。lib/portal/member-profile.ts の UpsertResult をそのまま返してよい */
export type ProfileSaveResult =
  | { ok: true }
  | { ok: false; errors: Array<{ field: string; message: string }> }
  | { ok: false; reason: 'unauthenticated' | 'failed' }

export interface ProfileFormInitial {
  fullName?: string
  displayName?: string
  registrantType?: RegistrantType
  proxyRelation?: string | null
  patientIsMinor?: boolean | null
  ageBand?: string
  gender?: string
  prefecture?: string
}

export interface ProfileFormProps {
  initial?: ProfileFormInitial
  choices: ProfileChoices
  save: (input: { profile: ProfilePayload; consent: boolean }) => Promise<ProfileSaveResult>
  requireConsent?: boolean
  submitLabel?: string
  onSaved?: () => void
}

type Status = 'idle' | 'saved' | 'failed' | 'signedOut'
type TextField = 'fullName' | 'displayName' | 'proxyRelation' | 'ageBand' | 'gender' | 'prefecture'

const inputClass =
  'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 aria-[invalid=true]:border-orange-500'
const blockClass = 'rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6'
const blockLegendClass = 'px-2 text-lg font-bold text-stone-800'

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} role="alert" className="mt-1 text-base text-rose-700">
      {error}
    </p>
  )
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold text-stone-800">
        {label}
      </label>
      {hint && <p className="mt-1 text-sm text-stone-500 leading-relaxed">{hint}</p>}
      {children}
      <ErrorText id={id} error={error} />
    </div>
  )
}

function minorToText(v: boolean | null | undefined): '' | 'yes' | 'no' {
  return v === true ? 'yes' : v === false ? 'no' : ''
}

export function ProfileForm({ initial, choices, save, requireConsent = false, submitLabel = '保存する', onSaved }: ProfileFormProps) {
  const [values, setValues] = useState<Record<TextField, string>>({
    fullName: initial?.fullName ?? '',
    displayName: initial?.displayName ?? '',
    proxyRelation: initial?.proxyRelation ?? '',
    ageBand: initial?.ageBand ?? '',
    gender: initial?.gender ?? '',
    prefecture: initial?.prefecture ?? '',
  })
  const [registrantType, setRegistrantType] = useState<RegistrantType | ''>(initial?.registrantType ?? '')
  const [minor, setMinor] = useState<'' | 'yes' | 'no'>(minorToText(initial?.patientIsMinor))
  // 保存済みの「18 歳以上の患者さんの代理」は、保存のときに申告済み。外せば保存できない
  const [attested, setAttested] = useState(initial?.registrantType === 'proxy' && initial?.patientIsMinor === false)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [pending, startTransition] = useTransition()
  const [ready, setReady] = useState(false)
  const router = useRouter()
  useEffect(() => setReady(true), [])

  const proxy = registrantType === 'proxy'

  const set = (field: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    setStatus('idle')
  }
  const aria = (field: FieldName) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${field}-error` } : {}

  function payload(): ProfilePayload {
    return {
      fullName: values.fullName,
      displayName: values.displayName,
      registrantType,
      proxyRelation: proxy ? values.proxyRelation : null,
      patientIsMinor: proxy ? (minor === 'yes' ? true : minor === 'no' ? false : null) : null,
      proxyAttestation: proxy && minor === 'no' ? attested : false,
      ageBand: values.ageBand,
      gender: values.gender,
      prefecture: values.prefecture,
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (requireConsent && !consent) {
      setErrors({ consent: CONSENT_REQUIRED_MESSAGE })
      setStatus('idle')
      return
    }
    startTransition(async () => {
      let result: ProfileSaveResult
      try {
        // 値の形はサーバー側で確かめる（選択肢の外・空はそこで落ちる）
        result = await save({ profile: payload(), consent })
      } catch (err) {
        console.error('プロフィールの保存で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
        result = { ok: false, reason: 'failed' }
      }
      if (result.ok) {
        setErrors({})
        if (onSaved) {
          onSaved()
        } else {
          setStatus('saved')
          router.refresh() // サーバー側の表示（いまの登録内容）を読み直す
        }
      } else if ('errors' in result) {
        const next: Partial<Record<FieldName, string>> = {}
        for (const e of result.errors) if (!next[e.field as FieldName]) next[e.field as FieldName] = e.message
        setErrors(next)
        setStatus('idle')
      } else {
        setErrors({})
        setStatus(result.reason === 'unauthenticated' ? 'signedOut' : 'failed')
      }
    })
  }

  const select = (field: 'proxyRelation' | 'ageBand' | 'gender' | 'prefecture', options: readonly string[]) => (
    <select id={field} name={field} value={values[field]} onChange={set(field)} className={inputClass} {...aria(field)}>
      {values[field] === '' && <option value="">選んでください</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )

  const radio = (name: string, value: string, label: string, checked: boolean, onChange: () => void, field: FieldName) => (
    <label key={value} className="flex items-center gap-3 text-base text-stone-800">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="h-5 w-5" {...aria(field)} />
      <span>{label}</span>
    </label>
  )

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-6" noValidate>
      <p className="text-base sm:text-lg text-stone-700 leading-relaxed" data-form-lead>
        {FORM_LEAD}
      </p>

      <fieldset className={blockClass}>
        <legend className={blockLegendClass}>登録する方について</legend>

        <fieldset>
          <legend className="text-base font-semibold text-stone-800">登録する方</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {choices.registrantTypes.map((t) =>
              radio('registrantType', t.value, t.label, registrantType === t.value, () => {
                setRegistrantType(t.value)
                setStatus('idle')
              }, 'registrantType')
            )}
          </div>
          <ErrorText id="registrantType" error={errors.registrantType} />
        </fieldset>

        <Field
          id="fullName"
          label="氏名"
          hint="登録する方の氏名です。運営と、入会審査をする世話人だけが見ます。会員どうしの場には出ません。"
          error={errors.fullName}
        >
          <input id="fullName" name="fullName" type="text" autoComplete="name" maxLength={choices.fullNameMax} value={values.fullName} onChange={set('fullName')} className={inputClass} {...aria('fullName')} />
        </Field>
        <Field
          id="displayName"
          label="表示名"
          hint="会員どうしの場に出る名前です。本名でなくてかまいません。「〇〇の母」のような書き方でもかまいません。"
          error={errors.displayName}
        >
          <input id="displayName" name="displayName" type="text" autoComplete="nickname" maxLength={choices.displayNameMax} value={values.displayName} onChange={set('displayName')} className={inputClass} {...aria('displayName')} />
        </Field>

        {proxy && (
          <>
            <Field id="proxyRelation" label="続柄" hint="患者さんから見た、登録する方の続柄です。" error={errors.proxyRelation}>
              {select('proxyRelation', choices.proxyRelations)}
            </Field>
            <fieldset>
              <legend className="text-base font-semibold text-stone-800">患者さんは18歳未満ですか</legend>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {radio('patientIsMinor', 'yes', 'はい', minor === 'yes', () => setMinor('yes'), 'patientIsMinor')}
                {radio('patientIsMinor', 'no', 'いいえ', minor === 'no', () => setMinor('no'), 'patientIsMinor')}
              </div>
              <ErrorText id="patientIsMinor" error={errors.patientIsMinor} />
            </fieldset>
            {minor === 'no' && (
              <div>
                <label className="flex items-start gap-3 text-base text-stone-800">
                  <input
                    type="checkbox"
                    name="proxyAttestation"
                    checked={attested}
                    onChange={(e) => {
                      setAttested(e.target.checked)
                      setErrors((x) => ({ ...x, proxyAttestation: undefined }))
                    }}
                    className="mt-1 h-5 w-5"
                    {...aria('proxyAttestation')}
                  />
                  <span>{PROXY_ATTESTATION_LABEL}</span>
                </label>
                <ErrorText id="proxyAttestation" error={errors.proxyAttestation} />
              </div>
            )}
          </>
        )}
      </fieldset>

      <fieldset className={blockClass}>
        <legend className={blockLegendClass}>患者さんについて</legend>
        <Field id="ageBand" label="年代" error={errors.ageBand}>
          {select('ageBand', choices.ageBands)}
        </Field>
        <Field id="gender" label="性別" hint="「答えない」を選ぶこともできます。" error={errors.gender}>
          {select('gender', choices.genders)}
        </Field>
        <Field id="prefecture" label="お住まいの都道府県" error={errors.prefecture}>
          {select('prefecture', choices.prefectures)}
        </Field>
      </fieldset>

      <p className="text-base text-stone-600 leading-relaxed" data-form-footnote>
        {FORM_FOOTNOTE}
      </p>

      {requireConsent && (
        <div>
          <label className="flex items-start gap-3 text-base text-stone-800">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                setErrors((x) => ({ ...x, consent: undefined }))
              }}
              className="mt-1 h-5 w-5"
              {...aria('consent')}
            />
            <span>{CONSENT_LABEL}</span>
          </label>
          <ErrorText id="consent" error={errors.consent} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={!ready || pending}
          className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? '保存しています…' : submitLabel}
        </button>
        <p aria-live="polite" className="text-base">
          {status === 'saved' && <span className="text-emerald-700">{SAVED_MESSAGE}</span>}
          {status === 'failed' && <span className="text-rose-700">{FAILED_MESSAGE}</span>}
          {status === 'signedOut' && (
            <span className="text-rose-700">
              {SIGNED_OUT_MESSAGE}
              <Link href="/demo/login" className="ml-2 text-orange-700 underline">
                ログイン画面へ
              </Link>
            </span>
          )}
        </p>
      </div>
    </form>
  )
}

export default ProfileForm
