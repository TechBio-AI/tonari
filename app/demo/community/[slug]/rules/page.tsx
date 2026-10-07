// 会の約束（会員エリア。/demo/community/[slug]/rules）
//
// 会員だけ（会員でない人は会のホームへ）。閲覧モードは見本（この会の約束は見本の文。DB は読まない。2026-10-04）。
//   1. 運営の共通文（../_lib/rules.ts。docs/site_policy_drafts_2026-09-26.md 第 3 章の 6 項目。2026-10-04）
//   2. この会の約束（group_settings.rules_text。世話人が ./manage/rules で書く。無ければ「まだありません」）

import type { Metadata } from 'next'
import Link from 'next/link'

import { groupPath, requireMemberAccess } from '../_lib/access'
import { SAMPLE_GROUP_RULES, SAMPLE_MARK } from '../../_components/sample-group'
import { getGroupSettings } from '../_lib/community'
import { COMMON_RULES, COMMON_RULES_LEAD } from '../_lib/rules'
import { GroupShell } from '../_components/GroupShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '会の約束',
  robots: { index: false, follow: false },
}

export default async function RulesPage({ params }: { params: { slug: string } }) {
  const access = await requireMemberAccess(params.slug)
  const { group } = access
  const demo = access.mode === 'demo'
  // DEMO_ACCESS: 本番前に削除。閲覧モードは見本の文（DB は読まない）
  const settings = demo ? { welcomeText: null, rulesText: SAMPLE_GROUP_RULES } : await getGroupSettings(group.id)
  const moderator = access.mode === 'member' && access.role === 'moderator'

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={demo} moderator={moderator} showLeave={!demo} tab="rules">
      <h2 className="mt-8 text-xl font-bold text-stone-800">会の約束{demo && <span data-sample-mark>{SAMPLE_MARK}</span>}</h2>

      <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-common-rules>
        <h3 className="text-lg font-semibold text-stone-800">このサイトの共通の約束</h3>
        <p className="mt-3 text-base text-stone-700 leading-relaxed" data-common-rules-lead>
          {COMMON_RULES_LEAD}
        </p>
        <ol className="mt-4 list-decimal pl-6 space-y-3 text-base text-stone-700 leading-relaxed">
          {COMMON_RULES.map((r) => (
            <li key={r.title} data-common-rule>
              <span className="font-semibold text-stone-800" data-common-rule-title>{r.title}</span>
              <span className="block" data-common-rule-body>{r.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-group-rules>
        <h3 className="text-lg font-semibold text-stone-800">この会の約束</h3>
        {settings === null ? (
          <p className="mt-3 text-base text-rose-700">読み込めませんでした。時間をおいて、もう一度お試しください。</p>
        ) : settings.rulesText ? (
          <p className="mt-3 text-base text-stone-700 leading-loose whitespace-pre-line">{settings.rulesText}</p>
        ) : (
          <p className="mt-3 text-base text-stone-400">まだありません。</p>
        )}
        {moderator && (
          <Link href={groupPath(group.slug, '/manage/rules')} className="mt-4 inline-block text-base text-orange-700 hover:underline">
            この会の約束を書く・直す
          </Link>
        )}
      </section>
    </GroupShell>
  )
}
