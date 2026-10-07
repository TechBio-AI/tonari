// 登録層の入口。画面の中身は LoginForm.tsx（client component）にある。
//
// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
// このファイルがサーバー側にあるのは、閲覧コードの入口を出すかどうかを環境変数で決めるためだけ。
// 削除するときは LoginForm.tsx の中身をこのファイルに戻す。

import { getDemoAccessCode } from '../auth/demo-access/token'
// TEST_PASSWORD_LOGIN: 本番前に削除（docs/REMOVE_BEFORE_PRODUCTION.md）
import { isPasswordLoginEnabled } from '@/lib/portal/password-login'

import LoginForm from './LoginForm'

// 環境変数と searchParams で表示が変わるので静的化させない
export const dynamic = 'force-dynamic'

export default function DemoLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; demo_error?: string; password_error?: string }
}) {
  // DEMO_ACCESS: 本番前に削除。未設定なら null を渡し、注意書きごと出さない
  const code = getDemoAccessCode()
  const demo = code ? { code, error: searchParams?.demo_error === '1' } : null

  // TEST_PASSWORD_LOGIN: 本番前に削除。TEST_PASSWORD_LOGIN が 'on' のときだけ枠を出す（それ以外は null で枠ごと出さない）
  const password = isPasswordLoginEnabled() ? { error: searchParams?.password_error === '1' } : null

  return <LoginForm searchParams={{ error: searchParams?.error }} demo={demo} password={password} />
}
