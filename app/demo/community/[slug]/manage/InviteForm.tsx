'use client'

// 招待リンクの発行（世話人のページ）。
// リンクは画面にだけ出す（URL の ? に token を載せない・ログに出さない）。ドメインは開いているページのものを付ける。

import { useState, useTransition } from 'react'

import type { InvitationResult } from '../actions'

export function InviteForm({
  create,
  daysDefault,
  daysMax,
}: {
  create: (days?: number) => Promise<InvitationResult>
  daysDefault: number
  daysMax: number
}) {
  const [days, setDays] = useState(String(daysDefault))
  const [result, setResult] = useState<InvitationResult | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(days)
    startTransition(async () => {
      try {
        setResult(await create(Number.isInteger(n) ? n : undefined))
      } catch {
        setResult({ ok: false, message: 'うまくいきませんでした。時間をおいてもう一度お試しください' })
      }
    })
  }

  const expires = result?.ok ? new Date(result.expiresAt) : null

  return (
    <form method="post" onSubmit={onSubmit}>
      <label htmlFor="invite-days" className="block text-base text-stone-700">
        有効な日数（1〜{daysMax} 日）
      </label>
      <input
        id="invite-days"
        name="days"
        type="number"
        min={1}
        max={daysMax}
        value={days}
        onChange={(e) => setDays(e.target.value)}
        className="mt-2 w-32 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800"
      />
      <button
        type="submit"
        disabled={pending}
        className="ml-3 rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? '作っています…' : '招待リンクを作る'}
      </button>
      <div aria-live="polite" className="mt-4">
        {result?.ok && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-base text-stone-800">招待リンクを作りました。1 人に 1 つずつお渡しください（1 回だけ使えます）。</p>
            <input
              readOnly
              aria-label="招待リンク"
              value={`${window.location.origin}${result.path}`}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
            />
            {expires && !Number.isNaN(expires.getTime()) && (
              <p className="mt-2 text-sm text-stone-600">
                有効期限: {expires.getFullYear()}年{expires.getMonth() + 1}月{expires.getDate()}日
              </p>
            )}
          </div>
        )}
        {result && !result.ok && (
          <p role="alert" className="text-base text-rose-700">
            {result.message}
          </p>
        )}
      </div>
    </form>
  )
}
