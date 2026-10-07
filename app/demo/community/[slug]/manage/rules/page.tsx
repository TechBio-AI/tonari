// 会の約束の編集（世話人向け。/demo/community/[slug]/manage/rules）
//
// 世話人だけ（それ以外・閲覧モードは 404）。group_settings.rules_text に直接書く（../../_lib/community.ts の saveRulesText）。
// 4000 文字まで。空にして保存すると消える。運営の共通文はここでは変えない（../../_lib/rules.ts）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { saveRulesAction } from '../../actions'
import { groupPath, requireModeratorViewAccess } from '../../_lib/access'
import { RULES_TEXT_MAX, getGroupSettings } from '../../_lib/community'
import { GroupShell, type FlashParams } from '../../_components/GroupShell'
import { buttonClass, inputClass } from '../../_components/Posts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '会の約束を書く',
  robots: { index: false, follow: false },
}

export default async function ManageRulesPage({ params, searchParams }: { params: { slug: string }; searchParams?: FlashParams }) {
  const access = await requireModeratorViewAccess(params.slug, 'notFound')
  if (access.mode !== 'member') notFound() // DEMO_ACCESS: 見本は作らない
  const { group } = access
  const settings = await getGroupSettings(group.id)
  if (settings === null) throw new Error('会の設定を読み込めませんでした')

  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator showLeave tab="manage" flash={searchParams}>
      <Link href={groupPath(group.slug, '/manage')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        世話人のページにもどる
      </Link>
      <h2 className="mt-5 text-xl font-bold text-stone-800">会の約束を書く</h2>
      <form action={saveRulesAction.bind(null, group.slug)} className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <label htmlFor="rules-text" className="block text-base font-semibold text-stone-800">
          この会の約束
        </label>
        <textarea id="rules-text" name="rules" maxLength={RULES_TEXT_MAX} rows={10} defaultValue={settings.rulesText ?? ''} className={inputClass} />
        <p className="mt-1 text-sm text-stone-500">
          この会の会員が「会の約束」のページで読みます。{RULES_TEXT_MAX} 文字まで。空にして保存すると消えます。
        </p>
        <button type="submit" className={`mt-4 ${buttonClass}`}>
          保存する
        </button>
      </form>
      <Link href={groupPath(group.slug, '/rules')} className="mt-6 inline-block text-base text-orange-700 hover:underline">
        会員が見る「会の約束」のページを見る
      </Link>
    </GroupShell>
  )
}
