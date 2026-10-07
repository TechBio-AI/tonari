'use client'

// アカウントを削除したあとにトップ（/demo?account_deleted=1）で出す 1 行。
//
// トップは静的に生成しているので、サーバー側で searchParams を読まない（読むとトップが動的になる）。
// 開いたあとにブラウザ側で URL を見て出す。出したら URL から印を外す（再読み込みやブックマークで出し続けない）。
// 値は '1' ちょうどのときだけ。URL の文字をそのまま画面に出さない。

import { useEffect, useState } from 'react'

export const ACCOUNT_DELETED_PARAM = 'account_deleted'
export const ACCOUNT_DELETED_MESSAGE = 'アカウントを削除しました。ご利用ありがとうございました'

export function AccountDeletedNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get(ACCOUNT_DELETED_PARAM) !== '1') return
      setShow(true)
      url.searchParams.delete(ACCOUNT_DELETED_PARAM)
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    } catch {
      // URL を読めないときは何も出さない
    }
  }, [])

  if (!show) return null
  return (
    <p role="status" className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-base sm:text-lg text-stone-800">
      {ACCOUNT_DELETED_MESSAGE}
    </p>
  )
}
