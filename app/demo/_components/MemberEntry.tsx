// 会員（患者会から招待を受けた方）の入口。
//
// ヘッダーには置かない。公開層の顔は、だれでも見られるものだけにする。
// 置くのは 2 か所だけ: 患者会のページの末尾と、公開層のフッター。
//
// ログインの有無で文言も行き先も変えない。行き先は常に会員向けページ。
// ログインしていない方は middleware.ts が /demo/login へ送る。
// 公開層がセッションを見ないので、ページは静的なまま置ける。

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const MEMBER_ENTRY_LABEL = '患者会の会員の方はこちら'
export const MEMBER_ENTRY_HREF = '/demo/community'

export function MemberEntry({ className = '' }: { className?: string }) {
  return (
    <Link
      href={MEMBER_ENTRY_HREF}
      className={`inline-flex items-center gap-1.5 text-base font-medium text-stone-600 hover:text-orange-700 ${className}`}
    >
      {MEMBER_ENTRY_LABEL}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  )
}
