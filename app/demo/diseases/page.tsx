// 病気のことを調べる（一覧・951 件）
//
// 一覧は 1 つだけ。「くわしい説明がある病気」を別枠にしない。
// それは今どこまで書けているかという進捗であって、疾患の分類ではないため
// （説明が全件に付いたら、その枠は「全部」になって意味を失う）。
// 充実度は各カードの中に小さなマークで出す（DiseaseFinder の ReadinessMark）。
// 3 段階（2026-09-25）: ● くわしい説明（11 件）／○ 出典付きの病気の概要／無印 準備中。
// 概要の有無は疾患ページと同じ引き方（知識ファイル上の位置 → idx、検証を通ったものだけ）。静的生成のまま。

import { BookOpen } from 'lucide-react'

import { getDiseaseOverviewForKnowledgeRecord } from '@/lib/portal/disease-overviews'
import { READINESS_LABEL, READINESS_LEGEND, READINESS_MARK, withReadiness, type Readiness } from '@/lib/portal/disease-list'
import { listAllDiseases } from '@/lib/portal/diseases'
import { DiseaseFinder } from './_components/DiseaseFinder'

export const dynamic = 'force-static'

export default function DiseaseIndexPage() {
  const all = withReadiness(listAllDiseases(), (name) => getDiseaseOverviewForKnowledgeRecord(name) !== null)
  const count = (r: Readiness) => all.filter((d) => d.readiness === r).length

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="flex items-start gap-4">
        <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 items-center justify-center flex-shrink-0">
          <BookOpen className="w-7 h-7" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">病気のことを調べる</h1>
          <p className="mt-3 text-lg text-stone-600 leading-loose">
            {all.length.toLocaleString('ja-JP')} の病気を載せています。
            いまのところ、くわしい説明があるのは {count('detailed')} の病気、
            公式情報をもとにまとめた病気の概要があるのは {count('overview')} の病気です。順に増やしています。
          </p>
          <p className="mt-3 text-base text-stone-600 leading-relaxed">
            どちらもまだ無い病気のページでは、病名と別名、患者会の有無だけをお知らせしています。
            五十音の分け方は病名の読みによります。読みがまだ付いていない病気は「漢字（読みを準備中）」にまとめてあります。
          </p>
        </div>
      </div>

      {/* 凡例（カードのマークと同じ文言・記号） */}
      <dl className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 space-y-1.5 text-base text-stone-600" data-readiness-legend>
        {(['detailed', 'overview', 'pending'] as const).map((r) => (
          <div key={r} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-stone-700">
              <span aria-hidden="true" className="inline-block w-4 text-sky-600">{READINESS_MARK[r] ?? ''}</span>
              {READINESS_MARK[r] ? '' : '無印 '}
              {READINESS_LABEL[r]}
            </dt>
            <dd>{READINESS_LEGEND[r]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <DiseaseFinder diseases={all} />
      </div>
    </div>
  )
}
