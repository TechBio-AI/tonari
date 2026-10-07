/**
 * 疾患ページの「病気の概要」の描画（data/disease_overviews/_samples/ を使う。本番データではない）
 *
 *   1. JSON あり（準備中ページ）: 「準備中」の位置に概要が出る。冒頭固定文・各見出し・群ページの表示
 *   2. JSON なし: 従来の「準備中」のまま
 *   3. lang: en: 英語のまま＋「日本語の公式情報は見つかりませんでした」。Orphanet の帰属表示
 *   4. 11 疾患は二階建て（患者の言葉が上、概要が下）
 *   5. evidence が出ない。禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

import { setDiseaseOverviewsDirForTest } from '@/lib/portal/disease-overviews'

import DiseasePage from '../[slug]/page'
import { ORPHANET_ATTRIBUTION_JA, OVERVIEW_LEAD, OVERVIEW_NO_JAPANESE_SOURCE } from '../_components/DiseaseOverview'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/diseases',
  notFound: () => {
    throw new Error('notFound')
  },
}))

const SAMPLES = path.join(process.cwd(), 'data', 'disease_overviews', '_samples')
const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function renderPage(slug: string) {
  const { container } = render(<DiseasePage params={{ slug }} />)
  const html = container.innerHTML
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(html).not.toContain('仮の原文') // evidence（日本語サンプル）
  expect(html).not.toContain('[SAMPLE] placeholder<') // evidence（英語サンプル。本文とは別の文字列）
  return container
}
const h2s = (c: HTMLElement) => [...c.querySelectorAll('h2')].map((h) => h.textContent)
const h3sIn = (c: HTMLElement) => [...c.querySelectorAll('[data-disease-overview] h3')].map((h) => h.textContent)

describe('サンプルがあるとき', () => {
  beforeAll(() => setDiseaseOverviewsDirForTest(SAMPLES))
  afterAll(() => setDiseaseOverviewsDirForTest(null))

  test('JSON あり（メチルマロン酸血症、idx 6）: 「準備中」の位置に概要。onset なし・治療「記載なし」は見出しごと出ない', () => {
    const c = renderPage(encodeURIComponent('メチルマロン酸血症'))
    const text = c.textContent ?? ''
    expect(h2s(c)).toEqual(['患者会', '病気の概要', '相談できる診療科'])
    expect(text).not.toContain('出典を確かめながら準備しています')
    expect(text).toContain(OVERVIEW_LEAD)
    // 「制度」は照合表（_match_table.json）の exact から出る。メチルマロン酸血症は難病・小慢とも exact
    expect(h3sIn(c)).toEqual(['ひとことで', '主な症状', '制度', '公式情報'])
    expect(text).toContain('【サンプル】症状の仮の文4')
    expect(text).toContain('難病情報センター：公式ページ')
    expect(text).toContain('難病情報センター：関連する群のページ')
    expect(text).not.toContain(OVERVIEW_NO_JAPANESE_SOURCE)
    expect(c.querySelector('[data-orphanet-attribution]')).toBeNull()
    // 見出しは知識ファイルの現在名
    expect(c.querySelector('h1')?.textContent).toContain('メチルマロン酸血症')
    for (const a of c.querySelectorAll('[data-disease-overview] a')) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    }
  })

  test('lang en（レーベル先天性黒内障、idx 23）: 英語のまま＋日本語が見つからなかった旨。Orphanet の帰属表示', () => {
    const c = renderPage(encodeURIComponent('レーベル先天性黒内障'))
    const text = c.textContent ?? ''
    const summary = c.querySelector('[data-disease-overview] p[lang="en"]')
    expect(summary?.textContent).toBe('[SAMPLE] Placeholder English definition text for layout only.')
    expect(text).toContain(OVERVIEW_NO_JAPANESE_SOURCE)
    expect(text).toContain('治療法は研究の段階です。')
    expect(c.querySelector('[data-orphanet-attribution]')?.textContent).toContain(ORPHANET_ATTRIBUTION_JA)
    expect(c.querySelector('a[href="https://creativecommons.org/licenses/by/4.0/deed.ja"]')).not.toBeNull()
  })

  test('JSON なし（シスチン症）: 従来の「準備中」のまま', () => {
    const c = renderPage(encodeURIComponent('シスチン症'))
    expect(c.querySelector('[data-disease-overview]')).toBeNull()
    expect(h2s(c)).toEqual(['患者会', 'くわしい説明', '相談できる診療科'])
    expect(c.textContent).toContain('出典を確かめながら準備しています')
  })

  test('11 疾患は二階建て（ファブリー病、idx 0）: 患者の言葉が上、概要が下', () => {
    const c = renderPage('fabry')
    expect(h2s(c)).toEqual(['この病気について', 'よくある症状', '治療について', '病気の概要', '相談できる診療科', '制度と支援', '患者会', '家族と医療者への情報'])
    // 詳細 11 疾患は制度の目印を下の「制度と支援」に一本化するので、概要側に「制度」は出ない（2026-09-25 指示）
    expect(h3sIn(c)).toEqual(['ひとことで', '主な症状', '発症しやすい時期', '治療について', '公式情報'])
    const text = c.textContent ?? ''
    expect(text).toContain('汗をかきにくい') // 上の階（患者の言葉）はそのまま
    expect(text).toContain('治療法があります。')
    expect(text).toContain('小児慢性特定疾病情報センター：公式ページ')
  })
})

describe('本番の場所（フェーズ1a のデータは到着中。件数に依らない形で確かめる）', () => {
  const REAL = path.join(process.cwd(), 'data', 'disease_overviews')
  const realIdx = new Set(
    fs.readdirSync(REAL).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.replace('.json', '')))
  )

  test('ファブリー病（idx 0）: 0.json があるときだけ概要が出る', () => {
    const c = renderPage('fabry')
    expect(c.querySelector('[data-disease-overview]') !== null).toBe(realIdx.has(0))
  })

  test('シスチン症: その idx の JSON が無ければ「準備中」のまま', () => {
    const { knowledgeFilePositionOf } = jest.requireActual('@/lib/portal/disease-overviews')
    const idx = knowledgeFilePositionOf('シスチン症')
    const c = renderPage(encodeURIComponent('シスチン症'))
    expect(c.querySelector('[data-disease-overview]') !== null).toBe(realIdx.has(idx))
  })
})
