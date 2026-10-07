'use client'

// 参加希望の画面の、未ログインの方向けのメール欄。
// この画面だけは、まだアカウントの無い方にもマジックリンクを送る（shouldCreateUser: true。2026-10-02 ファウンダー指示）。
// ほかの入口（/demo/login）は今までどおり招待制（shouldCreateUser: false）。
// 送る直前に、戻り先の病気の idx を cookie に置く（/demo/auth/callback が読んで、この画面へ戻す）。
// メールアドレスはログに出さない。Supabase のエラー文は画面に出さない。

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

import { WISH_NEXT_COOKIE, WISH_NEXT_MAX_AGE } from '../_lib/targets'

export const WISH_SEND_FAILED = '送信できませんでした。メールアドレスをお確かめのうえ、もう一度お試しください。'
export const WISH_SENT = 'メールを送りました。届いたリンクを開くと、この画面に戻って入力できます。'

export function WishEmailForm({ idx }: { idx: number }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      document.cookie = `${WISH_NEXT_COOKIE}=${idx}; Path=/demo; Max-Age=${WISH_NEXT_MAX_AGE}; SameSite=Lax`
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/demo/auth/callback`,
          // この導線だけ、新しい方のアカウントを作る
          shouldCreateUser: true,
        },
      })
      if (error) {
        console.error('参加希望のメール送信に失敗しました')
        setState('failed')
      } else {
        setState('sent')
      }
    } catch {
      console.error('参加希望のメール送信で例外が発生しました')
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="mt-6 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-700 leading-relaxed" data-wish-sent>
        {WISH_SENT}
      </p>
    )
  }

  return (
    <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4" data-wish-email>
      <label htmlFor="wish-email" className="block text-base font-semibold text-stone-800">
        メールアドレス
      </label>
      <input
        id="wish-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800"
      />
      <p className="text-sm text-stone-500">ログイン用のリンクをお送りします。パスワードは要りません。</p>
      {state === 'failed' && (
        <p role="alert" className="text-base text-rose-700">
          {WISH_SEND_FAILED}
        </p>
      )}
      <button
        type="submit"
        disabled={!ready || state === 'sending'}
        className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {state === 'sending' ? '送信中…' : 'ログイン用のリンクを送る'}
      </button>
    </form>
  )
}
