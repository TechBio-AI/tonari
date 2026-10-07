'use client'

// 登録層の入口。招待を受けた方が、メールで届くリンクからログインする。
//
// ここでは会員を作らない（shouldCreateUser: false）。Supabase の管理画面で招待した
// アドレスだけが通る。この画面から新しく人が入ってくることはない。
// 「会員登録」「サインアップ」の語を置かないのは、そういう建て付けだから。
//
// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
// 環境変数はサーバー側（page.tsx）で読み、ここには閲覧コードの文字列と誤りの表示フラグだけが渡る。
// 以前は page.tsx そのものだった。削除するときは、この中身を page.tsx に戻し、demo の枠と props を外す。

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

// 画面に出す文言は固定にする。Supabase が返すエラー文（英語・内部事情を含む）は
// そのまま出さず、console.error にだけ残す。
const SEND_FAILED =
  'このメールアドレスには送信できませんでした。招待を受けたアドレスかご確認ください。'
const LINK_FAILED = 'リンクの確認ができませんでした。もう一度お試しください。'

// DEMO_ACCESS: 本番前に削除
const DEMO_ERROR = 'コードが違います。もう一度お試しください。'

// DEMO_ACCESS: 本番前に削除（閲覧コードの入口が無効なら demo は null）
export type DemoAccessProps = { code: string; error: boolean } | null

// TEST_PASSWORD_LOGIN: 本番前に削除（docs/REMOVE_BEFORE_PRODUCTION.md）
// テスト用ログイン（メールとパスワード）。入口が無効なら password は null（枠ごと出さない）。
// 失敗の理由は区別せず、固定の文言だけを出す（アカウントの有無を明かさない）。
export const PASSWORD_ERROR = 'メールアドレスかパスワードが違います'
export type PasswordLoginProps = { error: boolean } | null

export default function LoginForm({
  searchParams,
  demo,
  password = null,
}: {
  searchParams?: { error?: string }
  demo: DemoAccessProps // DEMO_ACCESS: 本番前に削除
  password?: PasswordLoginProps // TEST_PASSWORD_LOGIN: 本番前に削除
}) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  // コールバックで失敗して戻ってきた場合は、最初からその旨を出しておく
  const [error, setError] = useState<string | null>(
    searchParams?.error ? LINK_FAILED : null
  )
  // ハイドレーションが済むまで送信させない。
  // 済む前に押されると onSubmit が付いていないので、ブラウザが form を GET で送ってしまい、
  // メールアドレスが URL に載ったまま画面が再読み込みされる。
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // 環境変数ではなく、いま開いているオリジンから組み立てる。
          // 127.0.0.1:3000 で開けば 127.0.0.1:3000 に戻ってくる。
          emailRedirectTo: `${window.location.origin}/demo/auth/callback`,
          // 招待制。ここで新しい利用者を作らない
          shouldCreateUser: false,
        },
      })

      if (otpError) {
        console.error('signInWithOtp に失敗しました:', otpError)
        setError(SEND_FAILED)
      } else {
        setSent(true)
      }
    } catch (err) {
      console.error('signInWithOtp で例外が発生しました:', err)
      setError(SEND_FAILED)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">会員向けページ</h1>
      <p className="mt-6 text-lg text-stone-600 leading-loose">
        このページは、患者会からの招待を受けた方がご利用いただけます。
      </p>

      {sent ? (
        <p className="mt-10 rounded-2xl bg-white border border-stone-200 p-7 text-lg text-stone-700 leading-loose">
          メールを送りました。届いたリンクを開いてください。
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-semibold text-stone-700">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-orange-50 border border-orange-200 p-5 text-base text-stone-700 leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || sending}
            className="w-full rounded-2xl bg-orange-700 px-6 py-4 text-lg font-semibold text-white hover:bg-orange-800 disabled:opacity-50"
          >
            {sending ? '送信中…' : 'ログイン用リンクを送る'}
          </button>
        </form>
      )}

      {/* TEST_PASSWORD_LOGIN: 本番前に削除。マジックリンクの入口の下に置く。JS が無くても送れる素の POST フォーム
          （パスワードが URL に載らないよう method="post"。受け口は app/demo/auth/password/route.ts） */}
      {password && (
        <section
          aria-labelledby="password-login-heading"
          className="mt-12 rounded-2xl bg-stone-50 border border-dashed border-stone-300 p-7"
          data-password-login
        >
          <h2 id="password-login-heading" className="text-lg font-bold text-stone-800">
            テスト用ログイン
          </h2>
          <p className="mt-2 text-base text-stone-600 leading-relaxed">
            確認用のアカウントをお持ちの方のためのものです。招待を受けた方は、上のメールのリンクからお入りください。
          </p>

          <form method="post" action="/demo/auth/password" className="mt-6 space-y-5">
            <div>
              <label htmlFor="password-email" className="block text-base font-semibold text-stone-700">
                メールアドレス
              </label>
              <input
                id="password-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label htmlFor="password-password" className="block text-base font-semibold text-stone-700">
                パスワード
              </label>
              <input
                id="password-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            {password.error && (
              <p role="alert" className="rounded-2xl bg-orange-50 border border-orange-200 p-5 text-base text-stone-700 leading-relaxed">
                {PASSWORD_ERROR}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl border border-stone-400 bg-white px-6 py-4 text-lg font-semibold text-stone-700 hover:bg-stone-100"
            >
              パスワードでログイン
            </button>
          </form>
        </section>
      )}

      {/* DEMO_ACCESS: 本番前に削除。JS が無くても送れるよう、素の POST フォームにしている */}
      {demo && (
        <section
          aria-labelledby="demo-access-heading"
          className="mt-12 rounded-2xl bg-stone-50 border border-dashed border-stone-300 p-7"
        >
          <p id="demo-access-heading" className="text-base text-stone-700 leading-loose">
            【プロトタイプの閲覧用】現在は開発中のため、下のコードを入力すると会員向けページの見本をご覧いただけます。
          </p>
          <p className="mt-4 font-mono text-lg font-semibold text-stone-800 tracking-wider">{demo.code}</p>

          <form method="post" action="/demo/auth/demo-access" className="mt-6 space-y-5">
            <div>
              <label htmlFor="demo-code" className="block text-base font-semibold text-stone-700">
                閲覧コード
              </label>
              <input
                id="demo-code"
                name="code"
                type="text"
                autoComplete="off"
                required
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 font-mono text-lg text-stone-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            {demo.error && (
              <p role="alert" className="rounded-2xl bg-orange-50 border border-orange-200 p-5 text-base text-stone-700 leading-relaxed">
                {DEMO_ERROR}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl border border-stone-400 bg-white px-6 py-4 text-lg font-semibold text-stone-700 hover:bg-stone-100"
            >
              閲覧コードで見る
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
