// [Phase0-T2] 全体は許可しつつ、隔離した旧画面と内部APIをクロール対象から除外する
import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/portal/site-url'

// 全クローラ共通で外す経路。
// robots.txt はグループ単位で評価され、User-agent 固有のグループは「*」の記述を
// 引き継がない。そのため下の AI クローラ向けグループにも同じ配列を渡している。
const DISALLOW = [
  // 旧画面（Phase0-T2 で公開経路から隔離。物理削除はピッチ後）
  '/diagnosis',
  '/test-diagnosis',
  '/pharma',
  '/doctor',
  '/settings',
  // 内部扱いの経路
  '/api/',
  '/auth/',
  // 登録層（招待を受けた方だけの面。middleware.ts が /demo/login へ送る）
  '/demo/community/',
]

// 公開層（/demo/）のクロールを明示的に許す AI クローラ。
// 病気についての一般情報だけを置く面なので、拾われて広がることを妨げない。
// 登録層は上の DISALLOW で外す（同一グループ内では長く一致する規則が優先される）。
const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/demo/',
        disallow: DISALLOW,
      })),
    ],
    // 起点は NEXT_PUBLIC_SITE_URL（lib/portal/site-url.ts）。app/sitemap.ts の URL と同じ起点にする。
    // 未設定のときは仮の値のまま出る（本番では必ず環境変数を入れること）。
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
