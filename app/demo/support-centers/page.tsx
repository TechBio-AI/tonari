// 難病相談支援センター（都道府県別の一覧）
//
// 出典は難病情報センターの一覧だけ（lib/portal/support-centers.ts → data/support_centers.json）。
// 冒頭に出典と取得日。都道府県で引ける：/demo/support-centers?pref=大阪府
// 都道府県の切り替えはリンクだけ（入力欄は持たない。入力から何かを計算・判定しない）。
// 印刷できる（紙には一覧の部分だけが出る。都道府県のリンクと印刷ボタンは出ない）。
// 出典に無い項目（受付日時など）は載せない。

import Link from 'next/link'
import { ArrowLeft, ExternalLink, MapPin, Phone } from 'lucide-react'

import {
  SUPPORT_CENTERS_SOURCE,
  getSupportCentersByPref,
  listSupportCenterPrefectures,
  type SupportCenterPrefecture,
} from '@/lib/portal/support-centers'
import { Notice } from '../_components/Notice'
import { PrintButton } from '../diseases/_components/PrintButton'

const SUPPORT_CENTERS_TITLE = '難病相談支援センター（都道府県別）'
const SUPPORT_CENTERS_UNKNOWN_PREF = 'その都道府県名は見つかりませんでした。下の一覧から選んでください。'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

function PrefSection({ p }: { p: SupportCenterPrefecture }) {
  return (
    <section data-pref={p.pref} className="break-inside-avoid">
      <h2 className="text-xl font-bold text-stone-800 print:text-[12pt]">{p.pref}</h2>
      <ul className="mt-3 space-y-3 print:mt-1 print:space-y-1.5">
        {p.centers.map((c, i) => (
          <li
            key={`${p.pref}-${i}`}
            data-center
            className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 print:rounded-none print:border-0 print:border-b print:p-1"
          >
            {c.heading !== p.pref && (
              <p className="text-sm text-stone-500 print:text-[8pt]">{c.heading}</p>
            )}
            <p className="font-semibold text-stone-800 text-base sm:text-lg print:text-[10pt]">
              {c.nameLines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
            {c.phones.length > 0 && (
              <div className="mt-2 flex gap-2 text-base text-stone-700 print:text-[9pt]">
                <Phone className="w-4 h-4 mt-1 flex-shrink-0 text-stone-400 print:hidden" />
                <div>
                  {c.phones.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
              </div>
            )}
            {c.addressLines.length > 0 && (
              <div className="mt-1 flex gap-2 text-base text-stone-700 print:text-[9pt]">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-stone-400 print:hidden" />
                <div>
                  {c.addressLines.map((l, j) => (
                    <p key={j}>{l}</p>
                  ))}
                </div>
              </div>
            )}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-base text-orange-700 hover:underline break-all print:text-[8pt] print:text-black"
              >
                {c.url}
                <ExternalLink className="w-4 h-4 print:hidden" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function SupportCentersPage({ searchParams }: { searchParams?: { pref?: string | string[] } }) {
  const all = listSupportCenterPrefectures()
  const requested = typeof searchParams?.pref === 'string' ? searchParams.pref : undefined
  const selected = requested ? getSupportCentersByPref(requested) : null
  const shown = selected ? [selected] : all

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14 print:max-w-none print:p-0">
      <style
        dangerouslySetInnerHTML={{ __html: '@media print { @page { size: A4; margin: 14mm; } }' }}
      />
      <Link
        href="/demo"
        className="print:hidden inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700"
      >
        <ArrowLeft className="w-4 h-4" />
        トップにもどる
      </Link>

      <header className="mt-5 pb-6 print:mt-0 print:pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 print:text-[16pt]">
          {SUPPORT_CENTERS_TITLE}
          {selected && <span className="ml-2 text-stone-600">— {selected.pref}</span>}
        </h1>
        <p data-source className="mt-3 text-base text-stone-600 leading-relaxed print:text-[9pt]">
          出典：
          <a href={SUPPORT_CENTERS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline print:text-black">
            {SUPPORT_CENTERS_SOURCE.name}
          </a>
          （{formatDate(SUPPORT_CENTERS_SOURCE.fetchedAt)}取得）
        </p>
        <p className="mt-1 text-base text-stone-500 leading-relaxed print:text-[9pt]">
          出典に載っている名称・電話・所在地・ホームページだけを載せています。受付の日時などは、各センターのページか出典でお確かめください。
        </p>
      </header>

      {requested && !selected && (
        <Notice tone="info" className="mb-5 print:hidden">
          <p>{SUPPORT_CENTERS_UNKNOWN_PREF}</p>
        </Notice>
      )}

      <nav data-pref-nav aria-label="都道府県" className="print:hidden rounded-3xl bg-white border border-stone-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-stone-800">都道府県を選ぶ</p>
          <PrintButton label={selected ? `${selected.pref}を印刷する` : '一覧を印刷する'} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {selected && (
            <li>
              <Link href="/demo/support-centers" className="inline-block rounded-lg border border-stone-300 px-2.5 py-1 text-base text-stone-700 hover:bg-stone-50">
                すべて
              </Link>
            </li>
          )}
          {all.map((p) => (
            <li key={p.pref}>
              <Link
                href={`/demo/support-centers?pref=${encodeURIComponent(p.pref)}`}
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

      <div className="mt-6 space-y-8 print:mt-2 print:space-y-3">
        {shown.map((p) => (
          <PrefSection key={p.pref} p={p} />
        ))}
      </div>

      <Notice tone="gentle" className="mt-8 print:hidden">
        <p>難病相談支援センターは、都道府県と指定都市に置かれています。</p>
      </Notice>
    </div>
  )
}
