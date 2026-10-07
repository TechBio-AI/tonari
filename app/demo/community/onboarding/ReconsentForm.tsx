'use client'

// 利用目的の再同意（プロフィールはあるが、利用目的の文の版が上がった会員向け）。
// 同意のチェックと送信だけ。プロフィールの入力欄は出さない（登録内容は変わらない）。
// 保存後は画面ごと読み直す（session.ts の needsConsent を確かめ直させるため）。

import { useEffect, useState, useTransition } from 'react'

import { FAILED_MESSAGE, SIGNED_OUT_MESSAGE, type ProfileSaveResult } from '../_components/ProfileForm'
import { CONSENT_LABEL, CONSENT_REQUIRED_MESSAGE } from '../_components/purpose'

import { reconsentBase } from './actions'

export default function ReconsentForm() {
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) {
      setMessage(CONSENT_REQUIRED_MESSAGE)
      return
    }
    startTransition(async () => {
      let result: ProfileSaveResult
      try {
        result = await reconsentBase({ consent })
      } catch (err) {
        console.error('同意の保存で例外が発生しました:', err instanceof Error ? err.message : 'unknown')
        result = { ok: false, reason: 'failed' }
      }
      if (result.ok) {
        window.location.assign('/demo/community')
      } else if ('errors' in result) {
        setMessage(result.errors[0]?.message ?? FAILED_MESSAGE)
      } else {
        setMessage(result.reason === 'unauthenticated' ? SIGNED_OUT_MESSAGE : FAILED_MESSAGE)
      }
    })
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-6" noValidate>
      <label className="flex items-start gap-3 text-base text-stone-800">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked)
            setMessage(null)
          }}
          className="mt-1 h-5 w-5"
        />
        <span>{CONSENT_LABEL}</span>
      </label>
      {message && (
        <p role="alert" className="text-base text-rose-700">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={!ready || pending}
        className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? '保存しています…' : '同意する'}
      </button>
    </form>
  )
}
