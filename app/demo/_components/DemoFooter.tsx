// /demo 専用フッター。但し書きは患者向けのことばで、医師判断優先の意味は残す。

import Link from 'next/link'
import { SITE_NOTICE_PLAIN } from '../_lib/wording'
import { MemberEntry } from './MemberEntry'

export const FOOTER_POLICY_LINKS = [
  { href: '/demo/privacy', label: 'プライバシー' },
  { href: '/demo/policy', label: 'このサイトの運営について' },
  { href: '/demo/for-groups', label: '患者会の皆さまへ' },
] as const

export function DemoFooter() {
  return (
    <footer className="border-t border-orange-100 bg-orange-50/60 mt-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-10 space-y-5">
        <p className="text-base text-stone-600 leading-relaxed max-w-3xl">{SITE_NOTICE_PLAIN}</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-base">
          <Link href="/demo/groups" className="text-stone-600 hover:text-orange-700">患者会をさがす</Link>
          <Link href="/demo/diseases" className="text-stone-600 hover:text-orange-700">病気のことを調べる</Link>
          <Link href="/demo/about" className="text-stone-600 hover:text-orange-700">このサイトについて</Link>
        </nav>
        {/* 取り扱い・運営・患者会向けの案内。/demo/policy と /demo/for-groups はパス固定（別の担当が作る） */}
        <nav aria-label="サイトの取り扱い" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {FOOTER_POLICY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-stone-500 hover:text-orange-700">{l.label}</Link>
          ))}
        </nav>
        {/* 会員の入口はヘッダーに置かず、ここと患者会のページの末尾だけに置く */}
        <MemberEntry />
        <p className="text-sm text-stone-400">となり — 準備中の画面です</p>
      </div>
    </footer>
  )
}
