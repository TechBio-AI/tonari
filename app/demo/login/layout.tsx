// /demo/login はクライアント側の画面なので、この layout から検索避けだけを付ける。
//
// 登録層の入口は招待を受けた方のためのもので、検索から人が来る場所ではない。
// robots.txt（app/robots.ts）は /demo/community/ を外しているが、入口のこの画面は
// 公開層に置いたままなので、ページ側の指定で noindex にする。

import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DemoLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
