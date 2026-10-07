// 患者会の皆さまへ
//
// 文言は content.ts（正は docs/site_policy_drafts_2026-09-26.md。草案）。ここでは書かない。

import type { Metadata } from 'next'

import { TextSections } from '../_components/TextSections'
import { FOR_GROUPS_SECTIONS, FOR_GROUPS_TITLE } from './content'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: `${FOR_GROUPS_TITLE} — となり`,
  description: '掲載の費用、ページの更新、退去、会員の招待と会員の情報について。',
}

export default function ForGroupsPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{FOR_GROUPS_TITLE}</h1>
      <TextSections sections={FOR_GROUPS_SECTIONS} />
    </div>
  )
}
