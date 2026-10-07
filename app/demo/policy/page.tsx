// このサイトの運営について
//
// 文言は content.ts（正は docs/site_policy_drafts_2026-09-26.md。草案）。ここでは書かない。

import type { Metadata } from 'next'

import { TextSections } from '../_components/TextSections'
import { POLICY_SECTIONS, POLICY_TITLE } from './content'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: `${POLICY_TITLE} — となり`,
  description: '運営者、情報の出どころ、企業とのかかわり、お預かりしないものについて。',
}

export default function PolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{POLICY_TITLE}</h1>
      <TextSections sections={POLICY_SECTIONS} />
    </div>
  )
}
