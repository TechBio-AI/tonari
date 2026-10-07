/**
 * 難病相談支援センターの一覧（/demo/support-centers）
 *
 *   1. 冒頭に出典（難病情報センター）と取得日
 *   2. ?pref=大阪府 でその都道府県だけ。無い名前は案内を出して全件
 *   3. 47 都道府県すべてにセンターがあり、データの値がそのまま出る。evidence は出ない
 *   4. 「診断」の字が無い。禁止語が無い
 *   5. 入力欄が無い（都道府県の切り替えはリンクだけ）。印刷ボタンは type="button"
 *   6. データは出典の 1 ページだけ・https・取得日つき。evidence は 40 字以内
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

import SupportCentersPage from '../support-centers/page'

const DATA = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'support_centers.json'), 'utf-8')) as {
  source: { url: string; fetched_at: string }
  prefectures: {
    pref: string
    centers: {
      name?: { value: string[]; evidence: string }
      phone?: { value: string; evidence: string }[]
      address?: { value: string[]; evidence: string }
      url?: { value: string; evidence: string }
    }[]
  }[]
}

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function renderPage(pref?: string) {
  const { container } = render(<SupportCentersPage searchParams={pref === undefined ? {} : { pref }} />)
  const html = container.innerHTML
  expect(html).not.toContain('診断')
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(container.querySelectorAll('input, select, textarea, form')).toHaveLength(0)
  for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
  return container
}

const sections = (c: HTMLElement) => [...c.querySelectorAll('section[data-pref]')].map((s) => s.getAttribute('data-pref'))

test('冒頭に出典と取得日', () => {
  const c = renderPage()
  const src = c.querySelector('[data-source]')!
  expect(src.textContent).toContain('難病情報センター')
  expect(src.textContent).toContain('2026年10月2日取得')
  expect(src.querySelector(`a[href="${DATA.source.url}"]`)).not.toBeNull()
})

test('指定なしは 47 都道府県すべて', () => {
  const c = renderPage()
  expect(sections(c)).toHaveLength(47)
  expect(c.querySelectorAll('[data-center]')).toHaveLength(DATA.prefectures.reduce((n, p) => n + p.centers.length, 0))
})

test('?pref=大阪府 で大阪府だけ（堺市を含む）', () => {
  const c = renderPage('大阪府')
  expect(sections(c)).toEqual(['大阪府'])
  expect(c.textContent).toContain('堺市')
  expect(c.querySelector('a[aria-current="page"]')?.textContent).toBe('大阪府')
})

test('無い名前は案内を出して全件（部分一致では引かない）', () => {
  const c = renderPage('大阪')
  expect(c.textContent).toContain('その都道府県名は見つかりませんでした')
  expect(sections(c)).toHaveLength(47)
})

test('データの値がそのまま出る。evidence（値に含まれないもの）は出ない', () => {
  for (const p of DATA.prefectures) {
    const c = renderPage(p.pref)
    const text = c.textContent ?? ''
    expect(p.centers.length).toBeGreaterThan(0)
    for (const ctr of p.centers) {
      for (const l of ctr.name?.value ?? []) expect(text).toContain(l)
      for (const t of ctr.phone ?? []) expect(text).toContain(t.value)
      for (const l of ctr.address?.value ?? []) expect(text).toContain(l)
      if (ctr.url) {
        const hrefs = [...c.querySelectorAll('a')].map((a) => a.getAttribute('href'))
        expect({ pref: p.pref, url: ctr.url.value, found: hrefs.includes(ctr.url.value) }).toEqual({
          pref: p.pref,
          url: ctr.url.value,
          found: true,
        })
        // url の evidence はリンクの文言（多くは「〜ホームページへ」）。画面には出さない。
        // ただし文言がセンター名など表示する値と同じ場合は、その値として出る
        const shownValues = [...(ctr.name?.value ?? []), ...(ctr.address?.value ?? []), ctr.name?.value.join('') ?? '']
        if (!shownValues.some((v) => v.includes(ctr.url!.evidence))) expect(text).not.toContain(ctr.url.evidence)
      }
    }
  }
})

test('都道府県のリンクと印刷ボタンは印刷に出ない', () => {
  const c = renderPage('北海道')
  expect(c.querySelector('[data-pref-nav]')?.className).toContain('print:hidden')
  expect(c.querySelectorAll('button')).toHaveLength(1)
})

test('データ: 出典は 1 ページだけ・取得日つき・evidence は 40 字以内・都道府県は 47', () => {
  expect(DATA.source.url).toBe('https://www.nanbyou.or.jp/entry/1361')
  expect(DATA.source.fetched_at).toBe('2026-10-02')
  expect(DATA.prefectures).toHaveLength(47)
  for (const p of DATA.prefectures)
    for (const ctr of p.centers) {
      const evs = [ctr.name?.evidence, ctr.address?.evidence, ctr.url?.evidence, ...(ctr.phone ?? []).map((t) => t.evidence)]
      for (const e of evs) if (e !== undefined) expect(e.length).toBeLessThanOrEqual(40)
    }
})
