'use client'

// DB にだけある会（会の新設で作られた会。public_groups）を、/demo/groups の一覧に並べる（2026-10-04）。
// /demo/groups は静的に書き出すページなので、開いたあとに /demo/public-groups から読む（そちらは 600 秒ごとに作り直す）。
// 紹介文はまだ無いので「紹介は準備中」と出す。読めない・0 件なら何も出さない。

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = { slug: string; name: string; disease: { name: string; slug: string } | null }

export function NewPublicGroups() {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(() => fetch('/demo/public-groups'))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j && Array.isArray(j.groups)) setItems(j.groups as Item[])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (items.length === 0) return null
  return (
    <ul className="mt-5 grid gap-5 sm:grid-cols-2" data-new-public-groups>
      {items.map((g) => (
        <li key={g.slug} className="flex flex-col rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-xl font-bold text-stone-800 leading-snug">
            <Link href={`/demo/groups/${encodeURIComponent(g.slug)}`} className="hover:text-orange-700 hover:underline">
              {g.name}
            </Link>
          </h3>
          {g.disease && (
            <div className="mt-4">
              <p className="text-sm text-stone-500">対応している病気</p>
              <Link
                href={`/demo/diseases/${encodeURIComponent(g.disease.slug)}`}
                className="mt-2 inline-block rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-base text-sky-900 hover:bg-sky-100"
              >
                {g.disease.name}
              </Link>
            </div>
          )}
          <p className="mt-4 text-base text-stone-500">紹介は準備中</p>
        </li>
      ))}
    </ul>
  )
}
