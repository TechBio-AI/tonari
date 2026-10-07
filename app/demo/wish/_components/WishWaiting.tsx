'use client'

// 「希望している方：n 人」（/demo/groups の「となりへの参加を待っている患者会」と、疾患ページの患者会欄に出す）
//
// /demo/groups・疾患ページは静的に書き出すページなので、人数は開いたあとに /demo/wish/counts から読む（そちらは 600 秒ごとに作り直す）。
// n は受け取った文字のまま（'10未満' を数に直さない）。読めないときは何も出さない。
// 一度も希望の無い病気には行が無い（20261019）。読めたのに行が無い病気は「10未満」と出す（0 と 1〜9 を見分けさせない）。
// 同じページの中で何度も読まないよう、1 回の読み込みを共有する。

import { useEffect, useState } from 'react'

import { formatWaiting } from '../_lib/format'

let shared: Promise<Record<string, string> | null> | null = null

/** 読めなければ null */
function loadCounts(): Promise<Record<string, string> | null> {
  if (!shared) {
    shared = Promise.resolve()
      .then(() => fetch('/demo/wish/counts'))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => (j && typeof j === 'object' && j.counts && typeof j.counts === 'object' ? (j.counts as Record<string, string>) : null))
      .catch(() => null)
  }
  return shared
}

/** テストで読み込みをやり直すため */
export function resetWishCountsForTest() {
  shared = null
}

/** 行が無い病気（一度も希望が無い）の表示 */
const NO_ROW = '10未満'

export function WishWaiting({ idx, label }: { idx: number; label?: string }) {
  const [n, setN] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadCounts().then((c) => {
      if (!alive || c === null) return
      const v = c[String(idx)]
      setN(typeof v === 'string' && v.trim() !== '' ? v : NO_ROW)
    })
    return () => {
      alive = false
    }
  }, [idx])
  if (n === null) return null
  return (
    <span className="text-sm text-stone-600" data-wish-waiting>
      {formatWaiting(n, label)}
    </span>
  )
}
