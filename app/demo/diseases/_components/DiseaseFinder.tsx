'use client'

// 病名の一覧（951 件）。最初は検索欄とタブだけを出し、カードは
//   - 検索欄に文字を入れたとき（部分一致。くわしい説明がある病気を先に）
//   - タブを押したとき（その行・その頭文字の病気だけ）
// に初めて出す。951 件を一度に並べない（スマホでスクロールしきれないため）。
//
// 分け方は lib/portal/disease-list.ts の classifyDiseaseName（純関数。fs を使わない）。読みは推定しない。
//   五十音 … 読み（data/disease_readings/readings.json）の頭文字で分ける。カナで始まる病名は病名そのものを読みにする
//   漢字（読みを準備中） … 日本語名だが読みがまだ無い病気。2026-09-13 に 0 件になり、タブは出なくなった。
//                          新しい疾患を読み無しで足すと再び出る（そこで気づける）
//   英数   … 日本語名を持たない病気（英語名のみ）。2026-09-13 に 0 件（3 件とも読みを付けて五十音へ移した）
// 患者は「ファブリー病」を「ふ」で、「肝硬変」を「か」で探す。漢字とひらがなを別のタブにするのはシステムの都合。
// 読みは段階的に足す（第 1 段階は 11 疾患）。読みが付くたびに「漢字」から五十音へ移る。
//
// ほかの画面でも使う（2026-10-03。/demo/groups の「ほかの病気の患者会を希望する」）:
//   項目に href があれば、カードはそこへ向かう（無ければ今までどおり疾患ページ）。hideReadiness で充実度の印を出さない。
//   既定の動き（疾患一覧のページ）は変えない。

/** 項目ごとの行き先（任意） */
export type FinderItem = DiseaseListItem & { href?: string }

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

import {
  compareDiseaseEntries,
  READINESS_LABEL,
  READINESS_MARK,
  type DiseaseListItem,
  type Readiness,
} from '@/lib/portal/disease-list'
import { Furigana } from '../../_components/Furigana'

const KANA_ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'] as const
const PENDING_TAB = '漢字'
const PENDING_TAB_LABEL = '漢字（読みを準備中）'
const LATIN_TAB = '英数'

type Tab = (typeof KANA_ROWS)[number] | typeof PENDING_TAB | typeof LATIN_TAB

/**
 * 並び順は名前順（読みがあれば読み順）だけ。
 *
 * くわしい説明があるものを先に出すことはしない。それをすると、運営者が特定の疾患を
 * 上に置くことになるため（2026-09-11 ファウンダー判断）。
 * 中身がどこまであるかは、カードの中のマークだけで示す。
 */
function byName<T extends DiseaseListItem>(list: T[]): T[] {
  return [...list].sort(compareDiseaseEntries)
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-base leading-none transition-colors ${
        active
          ? 'border-orange-500 bg-orange-100 text-orange-900 font-semibold'
          : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-700'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * 中身の充実度のマーク（3 段階。lib/portal/disease-list.ts の Readiness）。
 *
 * ● くわしい説明あり / ○ 病気の概要あり / 無印 準備中。これは「いまどこまで書けているか」であって、
 * 疾患の属性ではない。説明が増えたらマークが変わるだけで、一覧の構造は変えない。
 * 主役は病名なので、マークは小さく、色も控えめにする。
 */
function ReadinessMark({ readiness }: { readiness: Readiness }) {
  const mark = READINESS_MARK[readiness]
  return (
    <span className="mt-1 flex items-center gap-1.5 text-sm text-stone-500" data-readiness={readiness}>
      {mark && (
        <span aria-hidden="true" className={readiness === 'detailed' ? 'text-sky-600' : 'text-sky-500'}>
          {mark}
        </span>
      )}
      {READINESS_LABEL[readiness]}
    </span>
  )
}

function DiseaseCards({ list, hideReadiness = false }: { list: FinderItem[]; hideReadiness?: boolean }) {
  if (list.length === 0) return null
  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {list.map((d) => (
        <li key={d.name}>
          <Link
            href={d.href ?? `/demo/diseases/${encodeURIComponent(d.slug)}`}
            className="block h-full rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-orange-300"
          >
            <span className="block text-base sm:text-lg text-stone-800 break-words">
              {/* 病名だけを取り出せるように分ける（ふりがなが混ざると検索・検査が壊れるため） */}
              <span data-disease-name>{d.name}</span>
              <Furigana name={d.name} reading={d.reading} />
            </span>
            {d.aliases.length > 0 && (
              <span className="block mt-0.5 text-sm text-stone-500 line-clamp-1">{d.aliases.join('、')}</span>
            )}
            {!hideReadiness && <ReadinessMark readiness={d.readiness} />}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function DiseaseFinder({ diseases, hideReadiness = false }: { diseases: FinderItem[]; hideReadiness?: boolean }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab | null>(null)

  // ---- 件数（押す前に分かるように） ------------------------------------
  const counts = useMemo(() => {
    const kana = new Map<string, number>()
    let pending = 0
    let latin = 0
    for (const d of diseases) {
      if (d.group === 'kana') kana.set(d.key, (kana.get(d.key) ?? 0) + 1)
      else if (d.group === 'pending') pending++
      else latin++
    }
    return { kana, pending, latin }
  }, [diseases])

  // ---- 検索 -------------------------------------------------------------
  const q = query.trim().toLowerCase()
  const searched = useMemo(() => {
    if (q === '') return []
    return byName(
      diseases.filter((d) => d.name.toLowerCase().includes(q) || d.aliases.some((a) => a.toLowerCase().includes(q)))
    )
  }, [diseases, q])

  // ---- タブで絞る ---------------------------------------------------------
  const shown = useMemo(() => {
    if (tab === null) return []
    if (tab === PENDING_TAB) return byName(diseases.filter((d) => d.group === 'pending'))
    if (tab === LATIN_TAB) return byName(diseases.filter((d) => d.group === 'latin'))
    return byName(diseases.filter((d) => d.group === 'kana' && d.key === tab))
  }, [diseases, tab])

  function pickTab(next: Tab) {
    setTab((cur) => (cur === next ? null : next))
  }

  return (
    <div>
      {/* 検索 */}
      <label htmlFor="diseaseQuery" className="block text-base font-semibold text-stone-800">
        病名でさがす
      </label>
      <div className="relative mt-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          id="diseaseQuery"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：ファブリー、ムコ多糖、SMA"
          className="w-full rounded-2xl border border-stone-300 bg-white pl-12 pr-4 py-3 text-lg text-stone-800 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {q !== '' ? (
        <div className="mt-3">
          <p className="text-base text-stone-500" aria-live="polite">
            {searched.length.toLocaleString('ja-JP')} 件が見つかりました
          </p>
          <DiseaseCards list={searched} hideReadiness={hideReadiness} />
          {searched.length === 0 && (
            <p className="mt-4 text-base sm:text-lg text-stone-600">
              その名前の病気は見つかりませんでした。別の書き方や、別名でも試してみてください。
            </p>
          )}
        </div>
      ) : (
        <>
          {/* タブ（件数つき） */}
          <p className="mt-6 text-base font-semibold text-stone-800">頭文字からさがす</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="頭文字">
            {KANA_ROWS.filter((r) => counts.kana.has(r)).map((r) => (
              <TabButton key={r} active={tab === r} onClick={() => pickTab(r)}>
                {r} <span className="text-sm text-stone-500">({counts.kana.get(r)})</span>
              </TabButton>
            ))}
            {counts.pending > 0 && (
              <TabButton active={tab === PENDING_TAB} onClick={() => pickTab(PENDING_TAB)}>
                {PENDING_TAB_LABEL} <span className="text-sm text-stone-500">({counts.pending})</span>
              </TabButton>
            )}
            {counts.latin > 0 && (
              <TabButton active={tab === LATIN_TAB} onClick={() => pickTab(LATIN_TAB)}>
                {LATIN_TAB} <span className="text-sm text-stone-500">({counts.latin})</span>
              </TabButton>
            )}
          </div>

          {tab === null && (
            <p className="mt-4 text-base text-stone-500 leading-relaxed">
              頭文字を押すと、その病気が並びます。読みがまだ付いていない病気は「漢字（読みを準備中）」にあります。順に読みを付けて、五十音へ移しています。
            </p>
          )}

          {tab === PENDING_TAB && (
            <p className="mt-4 text-base text-stone-500 leading-relaxed">
              読みがまだ付いていない病気です。名前の順に並んでいます。上の検索欄に病名の一部を入れると、ここからも探せます。
            </p>
          )}

          {tab === LATIN_TAB && (
            <p className="mt-4 text-base text-stone-500 leading-relaxed">
              英語の病名だけで登録されている病気です。日本語の病名を確かめて、順に整えています。
            </p>
          )}

          {tab !== null && shown.length > 0 && (
            <p className="mt-5 text-base text-stone-500" aria-live="polite">
              {shown.length} 件
            </p>
          )}
          <DiseaseCards list={shown} hideReadiness={hideReadiness} />
        </>
      )}
    </div>
  )
}
