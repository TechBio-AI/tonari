// /demo（患者・家族向けポータル）専用レイアウト。
//
// 置き場所について:
//   公開面の規範は「器（themes/theme_facts/fact_sources）を通った出典付きの情報だけを公開する」。
//   その置き場所として予定した app/(portal)/ は作られていない。/demo は知識ファイルを直接読むため、
//   器の規範はまだ満たさない。器に接続できた時点で昇格を検討する。
//   表現の守り（2026-09-25 から）:
//     - scripts/lint-wording.sh … app/demo/ と data/disease_overviews/*.json の text を
//       docs/wording-blocklist-demo.txt で検査（pre-commit から呼ばれる）
//     - __tests__/wording.test.tsx … 描画した HTML を同じリストで検査
//   import 隔壁（.eslintrc.json の no-restricted-imports）は app/(portal)/ 向けのままで、ここには掛かっていない。

import type { Metadata } from 'next'

import { DemoHeader } from './_components/DemoHeader'
import { DemoFooter } from './_components/DemoFooter'

export const metadata: Metadata = {
  title: 'となり — 病気は違っても、困りごとは似ている。',
  description: '希少疾患や難病と生きる人が、疾患をこえて集まる場所です。',
}

// ここではセッションを見ない。公開層はログインの有無で表示を変えないので、
// すべてのページを静的なまま置ける（会員の入口は MemberEntry を参照）。
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    // 文字は大きめ（高齢の利用者も想定）。背景は白より少し暖かい色。
    <div className="min-h-screen flex flex-col bg-[#fffaf5] text-stone-800 text-[17px] sm:text-lg">
      <DemoHeader />
      <main className="flex-1">{children}</main>
      <DemoFooter />
    </div>
  )
}
