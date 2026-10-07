/**
 * 公開面の絶対 URL の起点（sitemap と JSON-LD が使う）
 *
 * 独自ドメインは未確定（app/robots.ts の sitemap も仮の値のまま）。
 * NEXT_PUBLIC_SITE_URL があればそれを使い、無ければ robots.ts と同じ仮の値にする。
 * 確定したら環境変数で与える（ここに本番ドメインを直書きしない）。
 */
const PLACEHOLDER = 'https://REPLACE-WITH-PRODUCTION-DOMAIN.example'

export function siteOrigin(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return (v && /^https?:\/\//.test(v) ? v : PLACEHOLDER).replace(/\/+$/, '')
}

/** 公開面のパス（先頭 /）→ 絶対 URL */
export function absoluteUrl(pathname: string): string {
  return `${siteOrigin()}${pathname}`
}

/** 疾患ページのパス。11 疾患は固定 slug、それ以外は病名（URL エンコードする） */
export function diseasePath(slug: string): string {
  return `/demo/diseases/${encodeURIComponent(slug)}`
}
