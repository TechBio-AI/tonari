/**
 * 病気の一覧（/demo/diseases）の充実度マーク 3 段階
 *
 * 抽出は進行中なので件数を固定しない。期待値は、その時点の
 * data/disease_overviews/<idx>.json（検証を通ったもの）と知識ファイル上の位置から求める。
 *   ● … 11 疾患 / ○ … 有効な概要がある疾患（11 疾患を除く） / 無印 … それ以外（「準備中」）
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen } from '@testing-library/react'

import { DEMO_DISEASES, listAllDiseases } from '@/lib/portal/diseases'
import { DISEASE_OVERVIEWS_RELATIVE_DIR, knowledgeFilePositionOf, loadDiseaseOverviews } from '@/lib/portal/disease-overviews'

import DiseaseIndexPage from '../page'

jest.mock('next/navigation', () => ({ usePathname: () => '/demo/diseases' }))

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

/** その時点のデータから期待値を作る */
function expectedReadiness(): Map<string, 'detailed' | 'overview' | 'pending'> {
  const valid = loadDiseaseOverviews(path.join(process.cwd(), DISEASE_OVERVIEWS_RELATIVE_DIR)).byIdx
  const detailed = new Set(DEMO_DISEASES.map((d) => d.name))
  return new Map(
    listAllDiseases().map((d) => {
      const idx = knowledgeFilePositionOf(d.name)
      const r = detailed.has(d.name) ? 'detailed' : idx !== null && valid.has(idx) ? 'overview' : 'pending'
      return [d.name, r] as const
    })
  )
}

/** 全タブを押して、全カードの（病名, マーク, 表示文言）を集める */
function collectAllCards(container: HTMLElement) {
  const out = new Map<string, { readiness: string; text: string }>()
  const tabs = [...container.querySelectorAll('[aria-label="頭文字"] button')] as HTMLElement[]
  for (const tab of tabs) {
    fireEvent.click(tab)
    for (const card of container.querySelectorAll('li a[href^="/demo/diseases/"]')) {
      const name = card.querySelector('[data-disease-name]')?.textContent ?? ''
      const mark = card.querySelector('[data-readiness]')!
      out.set(name, { readiness: mark.getAttribute('data-readiness') ?? '', text: mark.textContent ?? '' })
    }
    fireEvent.click(tab) // 閉じる
  }
  return out
}

test('全カードのマークが、その時点のデータと一致する（● 11 件、○ は有効な概要の数、残りは無印）', () => {
  const { container } = render(<DiseaseIndexPage />)
  const cards = collectAllCards(container)
  const expected = expectedReadiness()
  expect(cards.size).toBe(expected.size)
  for (const [name, r] of expected) expect({ name, r: cards.get(name)?.readiness }).toEqual({ name, r })

  for (const { readiness, text } of cards.values()) {
    if (readiness === 'detailed') expect(text).toBe('●くわしい説明あり')
    if (readiness === 'overview') expect(text).toBe('○病気の概要あり')
    if (readiness === 'pending') expect(text).toBe('準備中') // 無印
  }
  const n = (r: string) => [...cards.values()].filter((c) => c.readiness === r).length
  expect(n('detailed')).toBe(DEMO_DISEASES.length)
  expect(n('overview') + n('pending')).toBe(expected.size - DEMO_DISEASES.length)
})

test('冒頭の件数と凡例が、マークと同じ記号・文言', () => {
  const { container } = render(<DiseaseIndexPage />)
  const expected = [...expectedReadiness().values()]
  const text = container.textContent ?? ''
  expect(text).toContain(`くわしい説明があるのは ${expected.filter((r) => r === 'detailed').length} の病気`)
  expect(text).toContain(`病気の概要があるのは ${expected.filter((r) => r === 'overview').length} の病気`)

  const legend = container.querySelector('[data-readiness-legend]')!
  const rows = [...legend.querySelectorAll('dt')].map((dt) => dt.textContent)
  expect(rows).toEqual(['●くわしい説明あり', '○病気の概要あり', '無印 準備中'])
  expect(BLOCKLIST.filter((w) => container.innerHTML.includes(w))).toEqual([])
})

test('並び順は充実度で変わらない（検索結果は名前順のまま）', () => {
  const { container } = render(<DiseaseIndexPage />)
  fireEvent.change(screen.getByLabelText('病名でさがす'), { target: { value: '症' } })
  const names = [...container.querySelectorAll('li a[href^="/demo/diseases/"] [data-disease-name]')].map((e) => e.textContent ?? '')
  const order = new Map(listAllDiseases().map((d, i) => [d.name, i]))
  const idx = names.map((n) => order.get(n)!)
  expect(idx).toEqual([...idx].sort((a, b) => a - b))
})
