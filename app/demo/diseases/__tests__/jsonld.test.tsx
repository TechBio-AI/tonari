/**
 * 疾患ページに埋め込んだ構造化データ（JSON-LD）の検査
 *   - 有効な JSON で、MedicalWebPage ＋ MedicalCondition
 *   - ファブリー病に ORPHA:324 が入る（概要はサンプルで固定）
 *   - 概要が無い疾患は name／alternateName／url だけ
 *   - 見出しは知識ファイルの現在名と同じ name
 */
import * as path from 'path'
import { render } from '@testing-library/react'

import { setDiseaseOverviewsDirForTest } from '@/lib/portal/disease-overviews'

import DiseasePage from '../[slug]/page'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/diseases',
  notFound: () => {
    throw new Error('notFound')
  },
}))

const SAMPLES = path.join(process.cwd(), 'data', 'disease_overviews', '_samples')

function jsonLdOf(slug: string): any {
  const { container } = render(<DiseasePage params={{ slug }} />)
  const scripts = container.querySelectorAll('script[type="application/ld+json"]')
  expect(scripts.length).toBe(1)
  return JSON.parse(scripts[0].textContent ?? '') // 有効な JSON でなければここで落ちる
}

beforeAll(() => setDiseaseOverviewsDirForTest(SAMPLES))
afterAll(() => setDiseaseOverviewsDirForTest(null))

test('ファブリー病（11 疾患・概要あり）: ORPHA:324、description、citation、url', () => {
  const ld = jsonLdOf('fabry')
  expect(ld['@context']).toBe('https://schema.org')
  expect(ld['@type']).toBe('MedicalWebPage')
  expect(ld.url).toMatch(/\/demo\/diseases\/fabry$/)
  expect(ld.about['@type']).toBe('MedicalCondition')
  expect(ld.about.name).toBe('ファブリー病')
  expect(ld.about.alternateName).toEqual(expect.arrayContaining(['Fabry disease']))
  expect(ld.about.code).toEqual({ '@type': 'MedicalCode', code: 'ORPHA:324', codingSystem: 'Orphanet' })
  expect(ld.about.description).toBe('【サンプル】ひとことでの説明の仮の文です。')
  expect(ld.citation.map((c: any) => c.url)).toEqual(['https://example.invalid/sample/shouman'])
  expect(JSON.stringify(ld)).not.toContain('evidence')
})

test('準備中ページ（概要あり、lang en）: description は英語の summary のまま', () => {
  const ld = jsonLdOf(encodeURIComponent('レーベル先天性黒内障'))
  expect(ld.about.description).toBe('[SAMPLE] Placeholder English definition text for layout only.')
  expect(ld.url).toMatch(new RegExp(`/demo/diseases/${encodeURIComponent('レーベル先天性黒内障')}$`))
})

test('概要が無い疾患（シスチン症）: name／alternateName／url だけ', () => {
  const ld = jsonLdOf(encodeURIComponent('シスチン症'))
  expect(Object.keys(ld).sort()).toEqual(['@context', '@type', 'about', 'inLanguage', 'name', 'url'])
  expect(Object.keys(ld.about).filter((k) => !['@type', 'name', 'alternateName'].includes(k))).toEqual([])
  expect(ld.about.name).toBe('シスチン症')
})
