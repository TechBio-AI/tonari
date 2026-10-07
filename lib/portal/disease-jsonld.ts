/**
 * 疾患ページの構造化データ（schema.org MedicalWebPage ＋ MedicalCondition）
 *
 * 2026-09-25 ファウンダー指示。旧 (portal) の jsonld.ts は参考にしたが、移植していない。
 *   - name          … 知識ファイルの現在名（概要 JSON の name は使わない）
 *   - alternateName … 知識ファイルの別名
 *   - description   … 疾患概要の summary（あれば）
 *   - code          … ORPHA コード（照合表で完全一致のものだけ。codingSystem は Orphanet）
 *   - citation      … 疾患概要の公式情報のリンク
 *   evidence・notes は入れない（そもそも DiseaseOverview 型が持たない）。
 *   概要が無い疾患は name／alternateName／url だけ（出典の無い記述を構造化データで撒かない）。
 *   判定・助言系の型やプロパティ（症状との照合・受診の案内など）は使わない。疾患一般の情報として記述する。
 */
import { OVERVIEW_SOURCE_NAME_JA, type DiseaseOverview } from '@/lib/portal/disease-overviews'

export interface DiseaseJsonLdInput {
  /** 知識ファイルの現在名 */
  name: string
  aliases: string[]
  /** 疾患ページの絶対 URL */
  url: string
  overview: DiseaseOverview | null
  /** 完全一致の ORPHA コード（'ORPHA:324' の形）。無ければ null */
  orphaCode: string | null
}

export function buildDiseaseJsonLd(input: DiseaseJsonLdInput): Record<string, unknown> {
  const { name, aliases, url, overview, orphaCode } = input
  const alternateName = aliases.filter((a) => a.trim() !== '' && a !== name)

  const condition: Record<string, unknown> = {
    '@type': 'MedicalCondition',
    name,
    ...(alternateName.length > 0 ? { alternateName } : {}),
  }
  const page: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    url,
    name,
    inLanguage: 'ja',
    about: condition,
  }
  if (!overview) return page

  condition.description = overview.summary.text
  if (orphaCode) condition.code = { '@type': 'MedicalCode', code: orphaCode, codingSystem: 'Orphanet' }
  if (overview.links.length > 0) {
    page.citation = overview.links.map((l) => ({
      '@type': 'CreativeWork',
      name: `${OVERVIEW_SOURCE_NAME_JA[l.id]}：${l.label}`,
      url: l.url,
    }))
  }
  return page
}

/** <script type="application/ld+json"> に入れる文字列。</script> で抜けられないよう < をエスケープする */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
