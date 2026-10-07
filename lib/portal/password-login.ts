/**
 * テスト用のパスワードログイン（プロダクトデモ用。本番前に削除。docs/REMOVE_BEFORE_PRODUCTION.md）
 *
 * TEST_PASSWORD_LOGIN: 本番前に削除
 *
 * Supabase Auth の signInWithPassword を呼ぶ薄いラッパ。本物の入口（マジックリンク）は変えない。
 *
 * ★ サインアップはしない
 *   signInWithPassword は既にいるユーザーでしか通らない（ここで人を作らない）。
 *   マジックリンクの shouldCreateUser: false と同じく、この経路から新しい人は入ってこない。
 *   パスワードを持っているのは、ファウンダーが用意したテスト用アカウントだけの想定
 *   （招待で入った会員はパスワードを持たないので、この経路では入れない）。
 *
 * ★ 環境変数 TEST_PASSWORD_LOGIN が 'on' ちょうどのときだけ動く
 *   未設定・空・'off' なら、関数は何もせず disabled を返し、route は 404 を返す。
 *   本番で設定し忘れても開かない側に倒すため（閲覧コード入口 DEMO_ACCESS_CODE と同じ考え方）。
 *
 * ★ メールアドレス・パスワードはログに出さない。Supabase のエラー文も画面に出さない。
 */

import { createClient } from '@/lib/supabase/server'

/** この経路を開く環境変数の名前。値が 'on' ちょうどのときだけ開く */
export const PASSWORD_LOGIN_ENV = 'TEST_PASSWORD_LOGIN'

/** メールアドレスの上限（RFC 5321 の経路全体の上限） */
export const EMAIL_MAX = 320
/** パスワードの上限。Supabase（bcrypt）は 72 バイトまでしか見ないが、長すぎる入力を送らないための上限 */
export const PASSWORD_MAX = 200

export function isPasswordLoginEnabled(): boolean {
  return process.env[PASSWORD_LOGIN_ENV] === 'on'
}

export type PasswordLoginResult =
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'invalid_input' | 'failed' }

export type CredentialsCheck =
  | { ok: true; email: string; password: string }
  | { ok: false }

/**
 * 入力の形だけを見る（DB に触らない）。
 * メールアドレスは前後の空白を落とす。パスワードは空白も含めてそのまま使う（落とすと別のパスワードになる）
 */
export function validateCredentials(rawEmail: unknown, rawPassword: unknown): CredentialsCheck {
  if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') return { ok: false }
  const email = rawEmail.trim()
  if (email === '' || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+$/.test(email)) return { ok: false }
  if (rawPassword === '' || rawPassword.length > PASSWORD_MAX) return { ok: false }
  return { ok: true, email, password: rawPassword }
}

/**
 * メールアドレスとパスワードでログインする。成功するとセッションの cookie が付く
 * （lib/supabase/server の cookie 書き込み。Route Handler / Server Action から呼ぶ）。
 * 失敗の理由（アカウントが無い・パスワード違い・未確認など）は区別せず failed にする。
 */
export async function signInWithPassword(rawEmail: unknown, rawPassword: unknown): Promise<PasswordLoginResult> {
  if (!isPasswordLoginEnabled()) return { ok: false, reason: 'disabled' }
  const input = validateCredentials(rawEmail, rawPassword)
  if (!input.ok) return { ok: false, reason: 'invalid_input' }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })
    if (error || !data.session) {
      // 理由のコードだけ残す（メールアドレス・パスワードは残さない）
      console.error('テスト用パスワードログインに失敗しました:', error?.status, error?.code)
      return { ok: false, reason: 'failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('テスト用パスワードログインで例外が発生しました:', err instanceof Error ? err.name : 'unknown')
    return { ok: false, reason: 'failed' }
  }
}
