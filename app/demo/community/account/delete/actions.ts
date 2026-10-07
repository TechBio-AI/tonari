'use server'

// アカウントの削除（server action。確認画面の「アカウントを削除する」から）
//
// 会員（kind: 'member'）であることを確かめ、確認のチェックが入っているときだけ、土台の deleteMyAccount() を呼ぶ。
// 閲覧モード（demo）・未ログインでは呼ばない。
// 成功したらこの端末だけサインアウト（scope: 'local'。失敗は無視）して、トップ（/demo?account_deleted=1）へ。
// トップが「アカウントを削除しました」を出す（完了の表示）。
// どこかの会の最後の世話人なら土台が last_moderator で止める（何も消えない）。確認画面へ ?error=last_moderator で戻す。
// 値（メールアドレスなど）はログに出さない。

import { redirect } from 'next/navigation'

import { deleteMyAccount } from '@/lib/portal/tenancy'
import { createClient } from '@/lib/supabase/server'

import { getViewer } from '../../../_lib/session'

const HERE = '/demo/community/account/delete'

export async function deleteAccountAction(fd: FormData): Promise<void> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')

  // 確認のチェック（画面の required とは別に、ここでも確かめる）
  if (fd.get('confirm') !== 'yes') redirect(`${HERE}?error=invalid_input`)

  const r = await deleteMyAccount()
  if (!r.ok) {
    if (r.reason === 'unauthenticated') redirect('/demo/login')
    redirect(`${HERE}?error=${encodeURIComponent(r.reason)}`)
  }

  // 会員情報は消えた（版 3 では auth.users も消える）。この端末のセッションだけを閉じる（scope: 'local'。
  // サーバー側のセッションはもう無いので、全端末のサインアウトは失敗しうる）。失敗しても無視して完了の表示へ
  try {
    await createClient().auth.signOut({ scope: 'local' })
  } catch {
    // 無視する（消えたことは変わらない）
  }
  redirect('/demo?account_deleted=1')
}
