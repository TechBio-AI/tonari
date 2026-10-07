// 疾患ページの「相談できる診療科」の下に置く、都道府県別の拠点病院一覧（/demo/nanbyo-hospitals）への入口。
// 特定の病院をすすめるものではない。一覧へのリンクだけ。

import Link from 'next/link'
import { ChevronRight, Hospital } from 'lucide-react'

export const NANBYO_HOSPITALS_LINK_LABEL = 'お住まいの都道府県の拠点病院'

export function NanbyoHospitalsLink() {
  return (
    <Link
      data-nanbyo-hospitals-link
      href="/demo/nanbyo-hospitals"
      className="-mt-2 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-base sm:text-lg text-stone-700 hover:text-orange-700 hover:border-orange-200"
    >
      <Hospital className="w-5 h-5 text-stone-400 flex-shrink-0" />
      {NANBYO_HOSPITALS_LINK_LABEL}
      <ChevronRight className="w-4 h-4 text-stone-400 ml-auto" />
    </Link>
  )
}
