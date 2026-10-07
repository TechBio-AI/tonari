// 家族への情報（疾患ごと。中身は data/disease_extras/<slug>.json。無い疾患は 404）
//
// 構成:
//   1. 遺伝のしかた（静的な図と、出典つきの一般的な説明）
//   2. 家族に渡す手紙のひな形（画面上で書き換えて印刷。保存しない）
//   3. 相談先（出典つきの案内と、施設検索へのリンク。施設名は転載しない）
//
// 個人の状態には触れない。入力から何かを計算・判定する処理は持たない。家系図は入力させない。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getDemoDisease } from '@/lib/portal/diseases'
import { getDiseaseExtras, listDiseaseExtrasSlugs } from '@/lib/portal/disease-extras'
import { Notice } from '../../../_components/Notice'
import { ASK_YOUR_DOCTOR } from '../../../_lib/wording'
import {
  ExtrasSection,
  FactList,
  NotReady,
  PrintOnlyTargetStyle,
} from '../../_components/ExtrasParts'
import { InheritanceDiagram } from '../../_components/InheritanceDiagram'
import { InheritanceDiagramAr } from '../../_components/InheritanceDiagramAr'
import { LetterTemplate } from '../../_components/LetterTemplate'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return listDiseaseExtrasSlugs().map((slug) => ({ slug }))
}

export default function FamilyPage({ params }: { params: { slug: string } }) {
  const extras = getDiseaseExtras(params.slug)
  if (!extras) notFound()
  const disease = getDemoDisease(params.slug)
  if (!disease) notFound()
  const { inheritance, letter, consult } = extras.family

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <PrintOnlyTargetStyle />
      <Link
        href={`/demo/diseases/${disease.slug}`}
        className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700"
      >
        <ArrowLeft className="w-4 h-4" />
        {disease.name}のページにもどる
      </Link>

      <header className="mt-5 pb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{disease.name}：家族への情報</h1>
        <p className="mt-2 text-base text-stone-500 leading-relaxed">
          この病気について、ご家族と話すときのための一般的な情報です。
        </p>
      </header>

      <div className="space-y-5">
        <ExtrasSection title="遺伝のしかた">
          {extras.family.diagramAr ? (
            <InheritanceDiagramAr cells={extras.family.diagramAr} />
          ) : (
            <InheritanceDiagram cells={extras.family.diagram} />
          )}
          <div className="mt-5">{inheritance.length > 0 ? <FactList facts={inheritance} /> : <NotReady />}</div>
        </ExtrasSection>

        <ExtrasSection title="家族に渡す手紙のひな形">
          {letter ? <LetterTemplate paragraphs={letter.paragraphs} writerNote={letter.writerNote} /> : <NotReady />}
        </ExtrasSection>

        <ExtrasSection title="相談先">
          {consult.length > 0 ? <FactList facts={consult} /> : <NotReady />}
        </ExtrasSection>
      </div>

      <Notice tone="gentle" className="mt-8 print:hidden">
        <p>ここにあるのは、この病気についての一般的な情報です。</p>
        <p>{ASK_YOUR_DOCTOR}</p>
      </Notice>
    </div>
  )
}
