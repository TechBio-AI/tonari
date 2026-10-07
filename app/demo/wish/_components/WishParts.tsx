// 参加希望の画面で共通の見せ方（結果の 1 行・自分の希望の一覧と取り消し）。表示だけ。

import Link from 'next/link'

import { withdrawWishAction } from '../actions'
import { wishTargetOf } from '../_lib/targets'
import { WISH_FAILURE_MESSAGES, WISH_RELATION_LABELS, isWishFailure, type MyWish } from '../_lib/wishes'

export const WISH_DONE_MESSAGES = {
  wished: 'となりへの参加の希望を受け付けました。',
  withdrawn: 'となりへの参加の希望を取り消しました。',
} as const

export type WishFlashParams = { error?: string | string[]; done?: string | string[] }

/** ?error= / ?done= → 出す文。知らない値は出さない（URL の文字をそのまま画面に出さない） */
export function wishFlashOf(p?: WishFlashParams): { tone: 'ok' | 'error'; text: string } | null {
  const error = typeof p?.error === 'string' ? p.error : undefined
  if (isWishFailure(error)) return { tone: 'error', text: WISH_FAILURE_MESSAGES[error] }
  const done = typeof p?.done === 'string' ? p.done : undefined
  if (done && Object.prototype.hasOwnProperty.call(WISH_DONE_MESSAGES, done)) {
    return { tone: 'ok', text: WISH_DONE_MESSAGES[done as keyof typeof WISH_DONE_MESSAGES] }
  }
  return null
}

export function WishFlash({ params }: { params?: WishFlashParams }) {
  const f = wishFlashOf(params)
  if (!f) return null
  return (
    <p
      role={f.tone === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-2xl border p-4 text-base ${f.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
    >
      {f.text}
    </p>
  )
}

/** 取り消しのボタン（確認つき。<details> を開くと確定のボタン） */
export function WithdrawWishButton({ idx, back }: { idx: number; back: 'wish' | 'list' | 'profile' }) {
  return (
    <details className="text-sm" data-wish-withdraw>
      <summary className="inline-block cursor-pointer select-none text-stone-500 hover:text-rose-700 hover:underline">希望を取り消す</summary>
      <form action={withdrawWishAction.bind(null, idx, back)} className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm text-stone-700">この病気の患者会の、となりへの参加の希望を取り消します。希望している方の人数からも外れます。</p>
        <button type="submit" className="mt-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">
          取り消す
        </button>
      </form>
    </details>
  )
}

/** 自分の参加希望の一覧（病気・都道府県・立場）。各行に取り消し */
export function MyWishList({ wishes, back }: { wishes: MyWish[]; back: 'list' | 'profile' }) {
  return (
    <ul className="mt-4 divide-y divide-stone-100" data-my-wishes>
      {wishes.map((w) => {
        const t = wishTargetOf(w.diseaseIdx)
        return (
          <li key={w.diseaseIdx} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div>
              {t ? (
                <Link href={`/demo/wish/${t.idx}`} className="text-base font-semibold text-stone-800 hover:text-orange-700">
                  {t.name}
                </Link>
              ) : (
                <span className="text-base font-semibold text-stone-800">（病気の番号 {w.diseaseIdx}）</span>
              )}
              <p className="text-sm text-stone-500">
                {w.prefecture}・{WISH_RELATION_LABELS[w.relation] ?? w.relation}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link href={`/demo/wish/${w.diseaseIdx}/new-group`} className="text-sm text-orange-700 hover:underline" data-new-group-link>
                この病気の会を作りたい
              </Link>
              <WithdrawWishButton idx={w.diseaseIdx} back={back} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
