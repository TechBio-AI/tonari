/**
 * 難病の拠点病院・協力病院の一覧（/demo/nanbyo-hospitals）と、疾患ページからの入口
 *
 *   1. 冒頭に出典（難病情報センター）と取得日
 *   2. 指定なしは都道府県を選ぶ画面だけ。?pref=大阪府 で大阪府の一覧。無い名前は案内
 *   3. 47 都道府県すべてで、データの病院名・区分の見出し・専門分野がそのまま出る。evidence は出ない
 *   4. 「診断」の字が無い。例外は正式名称 1 件（九州大学病院 (未診断・未指定難病相談支援センター)）だけで、原文どおり全部出す。禁止語が無い
 *   5. 入力欄が無い（都道府県の切り替えはリンクだけ）
 *   6. 疾患ページ（詳細・準備中の両方）の「相談できる診療科」の下に入口がある
 *   7. データ: 出典は 1 ページだけ・取得日つき・区分は 3 区分＋県独自の 2 区分（出典の区分名のまま）・evidence は 40 字以内
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

import NanbyoHospitalsPage from '../nanbyo-hospitals/page'
import DiseasePage from '../diseases/[slug]/page'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  notFound: () => {
    throw new Error('notFound')
  },
}))

type Field = { value: string; evidence: string }
const DATA = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'nanbyo_hospitals.json'), 'utf-8')) as {
  source: { url: string; fetched_at: string }
  categories: string[]
  prefectures: {
    pref: string
    sections: { category: string; label: Field; as_of: string | null; hospitals: { name: Field; field?: Field }[] }[]
  }[]
}

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

/** 「診断」の字を含んでよいのは、この正式名称だけ（scripts/lint-wording.sh の例外と同じ 1 件） */
const ALLOWED_NAME_WITH_BARE_WORD = '九州大学病院 (未診断・未指定難病相談支援センター)'

function renderPage(pref?: string) {
  const { container } = render(<NanbyoHospitalsPage searchParams={pref === undefined ? {} : { pref }} />)
  const html = container.innerHTML
  expect(html.split(ALLOWED_NAME_WITH_BARE_WORD).join('')).not.toContain('診断')
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(container.querySelectorAll('input, select, textarea, form')).toHaveLength(0)
  for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
  return container
}

test('冒頭に出典と取得日', () => {
  const src = renderPage().querySelector('[data-source]')!
  expect(src.textContent).toContain('難病情報センター')
  expect(src.textContent).toContain('2026年10月3日取得')
  expect([...src.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toContain(DATA.source.url)
})

test('指定なしは都道府県を選ぶ画面だけ（一覧は出さない）', () => {
  const c = renderPage()
  expect(c.textContent).toContain('お住まいの都道府県を選んでください')
  expect(c.querySelectorAll('[data-hospital]')).toHaveLength(0)
  expect(c.querySelectorAll('[data-pref-nav] a')).toHaveLength(47)
})

test('?pref=大阪府 で大阪府の一覧', () => {
  const c = renderPage('大阪府')
  expect(c.querySelector('[data-pref]')?.getAttribute('data-pref')).toBe('大阪府')
  expect(c.querySelector('a[aria-current="page"]')?.textContent).toBe('大阪府')
  expect(c.querySelectorAll('[data-hospital]').length).toBeGreaterThan(0)
})

test('無い名前は案内（部分一致では引かない）', () => {
  const c = renderPage('大阪')
  expect(c.textContent).toContain('その都道府県名は見つかりませんでした')
  expect(c.querySelectorAll('[data-hospital]')).toHaveLength(0)
})

test('47 都道府県すべてで、病院名・区分の見出し・専門分野がそのまま出る', () => {
  expect(DATA.prefectures).toHaveLength(47)
  for (const p of DATA.prefectures) {
    const c = renderPage(p.pref)
    const text = c.textContent ?? ''
    const n = p.sections.reduce((k, s) => k + s.hospitals.length, 0)
    expect(c.querySelectorAll('[data-hospital]')).toHaveLength(n)
    for (const s of p.sections) {
      expect(text).toContain(s.label.value)
      for (const h of s.hospitals) {
        expect(text).toContain(h.name.value)
        if (h.field) expect(text).toContain(h.field.value)
      }
    }
  }
})

test('九州大学病院の正式名称は原文どおり全部出す（「診断」の字の例外はこの 1 件だけ）', () => {
  const withWord = DATA.prefectures.flatMap((p) =>
    p.sections.flatMap((s) => s.hospitals.filter((h) => h.name.value.includes('診断')).map((h) => ({ pref: p.pref, name: h.name.value })))
  )
  expect(withWord).toEqual([{ pref: '福岡県', name: ALLOWED_NAME_WITH_BARE_WORD }])
  const c = renderPage('福岡県')
  expect(c.textContent).toContain(ALLOWED_NAME_WITH_BARE_WORD)
  expect(c.textContent).not.toContain('一部省略')
})

test('県独自の区分は、出典の区分名のまま出る（茨城県・愛媛県）', () => {
  expect(renderPage('茨城県').textContent).toContain('難病医療指導機関（令和8年6月現在）')
  expect(renderPage('愛媛県').textContent).toContain('難病診療連携地域拠点病院（令和8年6月現在）')
})

test.each(['fabry', encodeURIComponent('メチルマロン酸血症')])('疾患ページ（%s）の「相談できる診療科」の下に入口', (slug) => {
  const { container } = render(<DiseasePage params={{ slug }} />)
  const link = container.querySelector('a[data-nanbyo-hospitals-link]')
  expect(link?.getAttribute('href')).toBe('/demo/nanbyo-hospitals')
  expect(link?.textContent).toContain('お住まいの都道府県の拠点病院')
  // 直前の要素が「相談できる診療科」の欄
  const prev = link!.previousElementSibling
  expect(prev?.querySelector('h2')?.textContent).toBe('相談できる診療科')
})

test('データ: 出典 1 ページ・取得日・区分は 3 区分＋県独自の 2 区分・evidence 40 字以内', () => {
  expect(DATA.source.url).toBe('https://www.nanbyou.or.jp/entry/5215')
  expect(DATA.source.fetched_at).toBe('2026-10-03')
  expect(DATA.categories).toEqual([
    '難病診療連携拠点病院',
    '難病診療分野別拠点病院',
    '難病医療協力病院',
    '難病医療指導機関',
    '難病診療連携地域拠点病院',
  ])
  for (const p of DATA.prefectures)
    for (const s of p.sections) {
      expect(DATA.categories).toContain(s.category)
      expect(s.label.value.startsWith(s.category)).toBe(true)
      expect(s.label.evidence.length).toBeLessThanOrEqual(40)
      for (const h of s.hospitals) {
        expect(h.name.evidence.length).toBeLessThanOrEqual(40)
        expect(h).not.toHaveProperty('display')
        if (h.field) {
          expect(s.category).toBe('難病診療分野別拠点病院')
          expect(h.field.evidence.length).toBeLessThanOrEqual(40)
        }
      }
    }
})
