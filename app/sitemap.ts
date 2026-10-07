// 公開層（/demo）のサイトマップ。静的生成
//
// 含める: /demo、/demo/diseases、疾患ページ全件、/demo/groups、/demo/about、/demo/privacy、/demo/policy、/demo/for-groups
// 含めない: /demo/login、/demo/community（登録層。robots.ts でも除外している）
// lastModified は付けない（更新日を持っていないので、作らない）。
// 絶対 URL の起点は lib/portal/site-url.ts（独自ドメインは未確定）。

import type { MetadataRoute } from 'next'

import { listAllDiseases } from '@/lib/portal/diseases'
import { absoluteUrl, diseasePath } from '@/lib/portal/site-url'

export const dynamic = 'force-static'

const STATIC_PATHS = [
  '/demo',
  '/demo/diseases',
  '/demo/groups',
  '/demo/about',
  // フッターの取り扱い・運営・患者会向けの案内（2026-09-26）
  '/demo/privacy',
  '/demo/policy',
  '/demo/for-groups',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_PATHS.map((p) => ({ url: absoluteUrl(p) })),
    ...listAllDiseases().map((d) => ({ url: absoluteUrl(diseasePath(d.slug)) })),
  ]
}
