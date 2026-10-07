// 医療者向けの気づき資材（疾患ごと。中身は data/disease_extras/<slug>.json。無い疾患は 404）
//
// 早期に気づくための手がかりを臓器別に、日本の公知情報から出典つきで載せる。
// 各文の後ろに出典番号、末尾に出典一覧（URL を重複なしで番号付け）。
// 印刷用 CSS つき。A4 で 1〜2 枚に収まる前提（紙には資材の部分だけが出る）。
// 個別の患者の判断に使うものではない旨を冒頭に固定で出す。入力は受けない。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getDemoDisease } from '@/lib/portal/diseases'
import { getDiseaseExtras, listDiseaseExtrasSlugs, numberSources } from '@/lib/portal/disease-extras'
import { Notice } from '../../../_components/Notice'
import { ASK_YOUR_DOCTOR } from '../../../_lib/wording'
import { CLINICIANS_LEAD, FactLink, NotReady, PrintOnlyTargetStyle } from '../../_components/ExtrasParts'
import { PrintButton } from '../../_components/PrintButton'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return listDiseaseExtrasSlugs().map((slug) => ({ slug }))
}

export default function ForCliniciansPage({ params }: { params: { slug: string } }) {
  const extras = getDiseaseExtras(params.slug)
  if (!extras) notFound()
  const disease = getDemoDisease(params.slug)
  if (!disease) notFound()
  const { organs } = extras.clinicians
  const sources = numberSources(organs.flatMap((o) => o.facts))

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <PrintOnlyTargetStyle />
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/demo/diseases/${disease.slug}`}
          className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700"
        >
          <ArrowLeft className="w-4 h-4" />
          {disease.name}のページにもどる
        </Link>
        {organs.length > 0 && <PrintButton label="印刷する" />}
      </div>

      <article
        data-print-target
        className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 print:border-0 print:p-0 print:text-[9.5pt] print:leading-snug print:text-black"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 print:text-[14pt] print:text-black">
          {disease.name}：早期に気づくための手がかり（医療者向け）
        </h1>
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-base text-stone-800 print:mt-2 print:px-2 print:py-1 print:text-[9.5pt]">
          {CLINICIANS_LEAD}
        </p>

        {organs.length > 0 ? (
          <>
            <div className="mt-6 space-y-5 print:mt-3 print:space-y-2">
              {organs.map((o) => (
                <section key={o.organ} className="break-inside-avoid">
                  <h2 className="text-lg font-bold text-stone-800 print:text-[11pt]">{o.organ}</h2>
                  <ul className="mt-2 space-y-1.5 print:mt-1 print:space-y-0.5">
                    {o.facts.map((f, i) => (
                      <li key={i} className="flex gap-2 text-base text-stone-700 leading-relaxed print:text-[9.5pt] print:leading-snug">
                        <span className="text-orange-400 flex-shrink-0 print:text-black">・</span>
                        <span>
                          {f.text}
                          <sup className="ml-0.5 text-stone-500">[{sources.get(f.sourceUrl)}]</sup>
                          {f.link && <FactLink link={f.link} />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <section className="mt-6 border-t border-stone-200 pt-4 print:mt-3 print:pt-2">
              <h2 className="text-base font-bold text-stone-800 print:text-[10pt]">出典</h2>
              <ol className="mt-2 space-y-1 text-sm text-stone-600 print:text-[8pt] print:mt-1">
                {[...sources.entries()].map(([url, n]) => (
                  <li key={url} className="break-all">
                    [{n}]{' '}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <div className="mt-6">
            <NotReady />
          </div>
        )}
      </article>

      <Notice tone="gentle" className="mt-8 print:hidden">
        <p>ここにあるのは、この病気についての一般的な情報です。</p>
        <p>{ASK_YOUR_DOCTOR}</p>
      </Notice>
    </div>
  )
}
