/**
 * ログイン中の方を確かめる（/demo/community でのみ使う）
 *
 * 公開層（/demo の他のページ）では使わない。公開層はログインの有無で表示を変えず、
 * 会員の入口は常に /demo/community に向ける。入れるかどうかは middleware.ts が決める。
 *
 * ここで見るのはセッションだけ。分からなかったときは必ず未ログイン扱いにする
 * （middleware.ts と同じく、閉じる側に倒す）。
 *
 * DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
 * セッションが無いときだけ、閲覧コードの cookie を確かめて { kind: 'demo' } を返す。
 * 削除するときは、戻り値から { kind: 'demo' } を外す（member と null だけにする）。
 *
 * 会員（member）には、プロフィール（= 利用目的への同意）の有無を hasProfile で持たせる。
 * 確かめられなかったときは false にする（初回の画面へ送る側に倒す。中身は見せない）。
 *
 * needsConsent（2026-09-26 同意の版管理）: プロフィールはあるが、利用目的（consents の base）の
 * いまの版に同意していない。文の版が上がったとき・同意の記録を読めなかったときに true（再同意の画面へ送る側に倒す）。
 */

import { cookies } from 'next/headers'

import { consentState, getMyConsents } from '@/lib/portal/consents'
import { getMyProfile } from '@/lib/portal/member-profile'
import { createClient } from '@/lib/supabase/server'

// DEMO_ACCESS: 本番前に削除
import { DEMO_COOKIE_NAME, hasValidDemoCookie } from '../auth/demo-access/token'

/** 見ている人。会員（メールアドレス・プロフィールの有無付き）／閲覧コードの見本／どちらでもない（null） */
export type Viewer =
  | { kind: 'member'; email: string; hasProfile: boolean; needsConsent: boolean }
  | { kind: 'demo' }
  | null

async function getSignedInEmail(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch (err) {
    // Supabase が未設定の場合もここに来る。未ログイン扱いにする
    console.error('セッションの確認に失敗しました:', err)
    return null
  }
}

/** プロフィールがあるか。取得に失敗したときは false（member-profile.ts 側も null を返す） */
async function hasMyProfile(): Promise<boolean> {
  try {
    return (await getMyProfile()) !== null
  } catch (err) {
    console.error('プロフィールの確認に失敗しました:', err)
    return false
  }
}

/** 利用目的（base）のいまの版に同意しているか。読めなかったときは false（再同意の画面へ送る側に倒す） */
async function hasCurrentBaseConsent(): Promise<boolean> {
  try {
    const records = await getMyConsents()
    return records !== null && consentState(records, 'base') === 'current'
  } catch (err) {
    console.error('同意の記録の確認に失敗しました:', err)
    return false
  }
}

export async function getViewer(): Promise<Viewer> {
  const email = await getSignedInEmail()
  if (email) {
    const hasProfile = await hasMyProfile()
    // プロフィールが無い方は、初回の画面で同意もする。ここで同意の記録を見に行かない
    const needsConsent = hasProfile ? !(await hasCurrentBaseConsent()) : false
    return { kind: 'member', email, hasProfile, needsConsent }
  }

  // DEMO_ACCESS: 本番前に削除。DEMO_ACCESS_CODE が未設定なら常に null になる
  try {
    if (await hasValidDemoCookie(cookies().get(DEMO_COOKIE_NAME)?.value)) {
      return { kind: 'demo' }
    }
  } catch (err) {
    console.error('閲覧コードの確認に失敗しました:', err)
  }

  return null
}
