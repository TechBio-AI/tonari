// 疾患概要（フェーズ1 の抽出結果）を出す枠
//
// 入力は lib/portal/disease-overviews.ts が検証したものだけ。evidence はそこで落ちているので、ここには来ない。
// 空の項目は見出しごと出さない（onset が null、治療が「記載なし」、症状が 0 件）。
// 群ページのリンクは label（「関連する群のページ」）で見分けがつくようにする。

import { ExternalLink } from 'lucide-react'

import {
  OVERVIEW_SOURCE_NAME_JA,
  type DiseaseOverview as DiseaseOverviewData,
  type OverviewTreatmentType,
} from '@/lib/portal/disease-overviews'
import { hasDesignation, type DiseaseDesignation } from '@/lib/portal/disease-designation'
import { DESIGNATION_TITLE, DesignationList } from './DesignationList'

/** 冒頭に必ず置く文（2026-09-24 ファウンダー指示。文言を変えない） */
export const OVERVIEW_LEAD =
  'この説明は公式情報をもとに当サイトがまとめたものです。受診や治療については主治医にご相談ください'

export const OVERVIEW_NO_JAPANESE_SOURCE = '日本語の公式情報は見つかりませんでした'

export const ORPHANET_ATTRIBUTION_JA =
  'この概要には Orphanet（www.orpha.net）の情報を含みます。CC BY 4.0 に基づき利用しています。'

/** summary.omitted のとき帰属表示に添える（CC BY 4.0 の改変の明示。2026-09-26 ファウンダー指示） */
export const ORPHANET_OMISSION_NOTE_JA = '一部省略あり（治療薬名を含む句）'

/** 「記載なし」は見出しごと出さないので持たない */
const TREATMENT_TEXT: Record<Exclude<OverviewTreatmentType, '記載なし'>, string> = {
  治療法あり: '治療法があります。',
  症状を抑える治療が中心: '症状を抑える治療が中心です。',
  研究段階: '治療法は研究の段階です。',
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="font-semibold text-stone-800 text-base sm:text-lg">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function DiseaseOverview({
  overview,
  designation,
}: {
  overview: DiseaseOverviewData
  /**
   * 照合表で確定している制度の目印。無ければ見出しごと出さない。
   * ★ 詳細 11 疾患では渡さない（ページ側の「制度と支援」に一本化するため。2026-09-25 指示）
   */
  designation?: DiseaseDesignation
}) {
  const { summary, symptoms, onset, treatmentType, links } = overview
  // 群（designation.nanbyouGroup）はここでは出さない。○× の反映後に出す
  const showDesignation = designation !== undefined && hasDesignation(designation)
  return (
    <section className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-disease-overview>
      <h2 className="text-xl font-bold text-stone-800">病気の概要</h2>
      <p className="mt-2 text-base text-stone-500 leading-relaxed">{OVERVIEW_LEAD}</p>

      <div className="mt-6">
        <Part title="ひとことで">
          <p className="text-base sm:text-lg text-stone-700 leading-loose" lang={summary.lang}>
            {summary.text}
          </p>
          {summary.lang === 'en' && (
            <p className="mt-2 text-base text-stone-500">{OVERVIEW_NO_JAPANESE_SOURCE}</p>
          )}
        </Part>

        {symptoms.length > 0 && (
          <Part title="主な症状">
            <ul className="space-y-2">
              {symptoms.map((s, i) => (
                <li key={`${s.text}-${i}`} className="flex gap-2 text-base sm:text-lg text-stone-700 leading-relaxed">
                  <span className="text-orange-400 flex-shrink-0">・</span>
                  {s.text}
                </li>
              ))}
            </ul>
          </Part>
        )}

        {onset && (
          <Part title="発症しやすい時期">
            <p className="text-base sm:text-lg text-stone-700 leading-relaxed">{onset.text}</p>
          </Part>
        )}

        {treatmentType !== '記載なし' && (
          <Part title="治療について">
            <p className="text-base sm:text-lg text-stone-700 leading-relaxed">{TREATMENT_TEXT[treatmentType]}</p>
            <p className="mt-2 text-base text-stone-500 leading-relaxed">
              どの治療を行うかは、一人ひとりの状態によって違います。くわしくは主治医にお聞きください。
            </p>
          </Part>
        )}

        {showDesignation && (
          <Part title={DESIGNATION_TITLE}>
            {/* 下の「公式情報」と同じ行き先なら、制度側はリンクにしない */}
            <DesignationList designation={designation!} officialUrls={links.map((l) => l.url)} />
          </Part>
        )}

        {links.length > 0 && (
          <Part title="公式情報">
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-base text-orange-700 hover:underline"
                  >
                    {OVERVIEW_SOURCE_NAME_JA[l.id]}：{l.label}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </Part>
        )}
      </div>

      {overview.usesOrphanet && (
        <p className="mt-6 text-sm text-stone-500 leading-relaxed" data-orphanet-attribution>
          {ORPHANET_ATTRIBUTION_JA}
          {overview.summary.omitted && <span data-orphanet-omission>{ORPHANET_OMISSION_NOTE_JA}。</span>}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.ja"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-orange-700 hover:underline"
          >
            ライセンス（CC BY 4.0）
          </a>
        </p>
      )}
    </section>
  )
}
