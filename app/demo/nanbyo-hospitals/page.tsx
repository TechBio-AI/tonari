// 難病の拠点病院・協力病院（都道府県別の一覧）
//
// 出典は難病情報センター「難病の医療提供体制（医療機関情報）」だけ
// （lib/portal/nanbyo-hospitals.ts → data/nanbyo_hospitals.json）。冒頭に出典と取得日。
// 都道府県で引ける：/demo/nanbyo-hospitals?pref=大阪府 。指定が無いときは都道府県を選ぶ画面だけ（1,600 件を超えるため）。
// 都道府県の切り替えはリンクだけ（入力欄は持たない）。印刷できる（紙には一覧の部分だけが出る）。
// 載せるのは区分・病院名・専門分野だけ。病院名は原文どおり全部出す。特定の病院をすすめない。
// 区分は出典の 3 区分に加え、県独自の区分（出典の区分名のまま）も出す。

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import {
  NANBYO_HOSPITALS_SOURCE,
  getNanbyoHospitalsByPref,
  listNanbyoHospitalPrefectures,
  type NanbyoHospitalPrefecture,
} from '@/lib/portal/nanbyo-hospitals'
import { Notice } from '../_components/Notice'
import { ASK_YOUR_DOCTOR } from '../_lib/wording'
import { PrintButton } from '../diseases/_components/PrintButton'

const TITLE = '難病の拠点病院・協力病院（都道府県別）'
const UNKNOWN_PREF = 'その都道府県名は見つかりませんでした。下から選んでください。'
const CHOOSE_PREF = 'お住まいの都道府県を選んでください。'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

function PrefList({ p }: { p: NanbyoHospitalPrefecture }) {
  return (
    <div data-pref={p.pref} className="space-y-6 print:space-y-3">
      {p.sections.map((s, i) => (
        <section key={`${s.category}-${i}`} data-category={s.category} className="break-inside-avoid-page">
          <h2 className="text-lg sm:text-xl font-bold text-stone-800 print:text-[11pt]">{s.label}</h2>
          <ul className="mt-2 space-y-2 print:mt-1 print:space-y-0.5">
            {s.hospitals.map((h, j) => (
              <li
                key={`${h.name}-${j}`}
                data-hospital
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-800 print:rounded-none print:border-0 print:px-0 print:py-0 print:text-[9pt]"
              >
                {h.name}
                {h.field && <span className="ml-2 text-sm text-stone-600 print:text-[8.5pt]">専門分野：{h.field}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function NanbyoHospitalsPage({ searchParams }: { searchParams?: { pref?: string | string[] } }) {
  const all = listNanbyoHospitalPrefectures()
  const requested = typeof searchParams?.pref === 'string' ? searchParams.pref : undefined
  const selected = requested ? getNanbyoHospitalsByPref(requested) : null

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14 print:max-w-none print:p-0">
      <style dangerouslySetInnerHTML={{ __html: '@media print { @page { size: A4; margin: 14mm; } }' }} />
      <Link
        href="/demo/diseases"
        className="print:hidden inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700"
      >
        <ArrowLeft className="w-4 h-4" />
        病気の一覧にもどる
      </Link>

      <header className="mt-5 pb-6 print:mt-0 print:pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 print:text-[16pt]">
          {TITLE}
          {selected && <span className="ml-2 text-stone-600">— {selected.pref}</span>}
        </h1>
        <p data-source className="mt-3 text-base text-stone-600 leading-relaxed print:text-[9pt]">
          出典：
          <a href={NANBYO_HOSPITALS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline print:text-black">
            {NANBYO_HOSPITALS_SOURCE.name}
          </a>
          （{formatDate(NANBYO_HOSPITALS_SOURCE.fetchedAt)}取得）
        </p>
        <p className="mt-1 text-base text-stone-500 leading-relaxed print:text-[9pt]">
          都道府県が指定した病院の一覧です。区分の見出しは出典のまま（時点を含む）です。所在地や電話番号は、出典か各病院のページでお確かめください。
        </p>
      </header>

      {requested && !selected && (
        <Notice tone="info" className="mb-5 print:hidden">
          <p>{UNKNOWN_PREF}</p>
        </Notice>
      )}

      <nav data-pref-nav aria-label="都道府県" className="print:hidden rounded-3xl bg-white border border-stone-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-stone-800">{selected ? '都道府県を変える' : CHOOSE_PREF}</p>
          {selected && <PrintButton label={`${selected.pref}を印刷する`} />}
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {all.map((p) => (
            <li key={p.pref}>
              <Link
                href={`/demo/nanbyo-hospitals?pref=${encodeURIComponent(p.pref)}`}
                aria-current={selected?.pref === p.pref ? 'page' : undefined}
                className={`inline-block rounded-lg border px-2.5 py-1 text-base ${
                  selected?.pref === p.pref
                    ? 'border-orange-300 bg-orange-50 text-orange-800'
                    : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {p.pref}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {selected && (
        <div className="mt-6 print:mt-2">
          <PrefList p={selected} />
        </div>
      )}

      <Notice tone="gentle" className="mt-8 print:hidden">
        <p>ここにあるのは、出典に載っている病院の一覧です。特定の病院をすすめるものではありません。</p>
        <p>{ASK_YOUR_DOCTOR}</p>
      </Notice>
    </div>
  )
}
