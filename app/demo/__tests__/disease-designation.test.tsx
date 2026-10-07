/**
 * 疾患ページの「制度の目印」（2026-09-25 ファウンダー指示）
 *
 * 出所は照合表（_match_table.json）の exact だけ。
 * 知識ファイルの description 末尾の「指定難病NNN。」も data/disease_summaries の nanbyo_number も読まない。
 *
 * 出す場所は 2 つ。同じページに二重に出さない:
 *   - 詳細 11 疾患  … 既存の「制度と支援」の中身として
 *   - それ以外      … 「病気の概要」の中、「公式情報」の直前に「制度」の小見出しで
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  notFound: () => {
    throw new Error('notFound')
  },
}))

import DemoLayout from '../layout'
import DiseasePage from '../diseases/[slug]/page'
import {
  DESIGNATION_NOT_READY,
  DESIGNATION_SHOUMAN_LABEL,
  DESIGNATION_TITLE,
} from '../diseases/_components/DesignationList'

function loadBlocklist(): string[] {
  return fs
    .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
}
const BLOCKLIST = loadBlocklist()

function renderDisease(slug: string) {
  return render(<DemoLayout>{<DiseasePage params={{ slug }} />}</DemoLayout>)
}
const stub = (name: string) => renderDisease(encodeURIComponent(name))

/**
 * 目印の各行（場所を問わず、ページ内に 1 か所だけのはず）。
 * href は、公式情報と同じ行き先でリンクを外した行では null になる。
 */
function designationItems(c: HTMLElement): { text: string; href: string | null }[] {
  const lists = c.querySelectorAll('[data-disease-designation]')
  expect(lists.length).toBeLessThanOrEqual(1) // 二重に出さない
  if (lists.length === 0) return []
  return [...lists[0].querySelectorAll('li')].map((li) => ({
    text: (li.textContent ?? '').trim(),
    href: li.querySelector('a')?.getAttribute('href') ?? null,
  }))
}

/** 公式情報として出ているリンク先 */
function officialHrefs(c: HTMLElement): string[] {
  const h3 = [...c.querySelectorAll('[data-disease-overview] h3')].find((h) => h.textContent === '公式情報')
  const part = h3?.parentElement
  return [...(part?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href') ?? '')
}

const h2s = (c: HTMLElement) => [...c.querySelectorAll('main h2')].map((h) => (h.textContent ?? '').trim())
const overviewH3s = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-disease-overview] h3')].map((h) => (h.textContent ?? '').trim())

/** 「制度と支援」の中身 */
function supportSection(c: HTMLElement): HTMLElement | null {
  const h2 = [...c.querySelectorAll('main h2')].find((h) => h.textContent === '制度と支援')
  return (h2?.closest('section') as HTMLElement) ?? null
}

const NANBYOU_HREF = /^https:\/\/www\.nanbyou\.or\.jp\/entry\/\d+$/
const SHOUMAN_HREF = /^https:\/\/www\.shouman\.jp\/disease\/details\/[0-9_]+\/$/

describe('詳細 11 疾患：「制度と支援」に一本化', () => {
  test('両方あり（軟骨無形成症）: 指定難病と小児慢性が「制度と支援」に並ぶ', () => {
    const { container } = renderDisease('achondroplasia')
    const items = designationItems(container)
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('指定難病（告示番号 276）')
    expect(items[1].text).toBe(DESIGNATION_SHOUMAN_LABEL)
    // 小慢は公式情報に無い行き先なのでリンクのまま
    expect(items[1].href).toMatch(SHOUMAN_HREF)

    // 出ている場所は「制度と支援」の中
    expect(supportSection(container)?.querySelector('[data-disease-designation]')).not.toBeNull()
    // 概要側には出さない
    expect(overviewH3s(container)).not.toContain(DESIGNATION_TITLE)
    expect(container.textContent).not.toContain(DESIGNATION_NOT_READY)
  })

  test('難病のみ（フェニルケトン尿症）: 指定難病だけ', () => {
    const { container } = renderDisease('pku')
    expect(designationItems(container).map((l) => l.text)).toEqual(['指定難病（告示番号 240）'])
    expect(container.textContent).not.toContain(DESIGNATION_SHOUMAN_LABEL)
  })

  test('小慢のみ（ファブリー病）: 小児慢性だけ。告示番号は出ない', () => {
    const { container } = renderDisease('fabry')
    expect(designationItems(container).map((l) => l.text)).toEqual([DESIGNATION_SHOUMAN_LABEL])
    expect(container.textContent).not.toContain('告示番号')
  })

  test('どちらも無い（X連鎖性低リン血症性くる病）: 従来の「準備しています」のまま', () => {
    const { container } = renderDisease('xlh')
    expect(designationItems(container)).toEqual([])
    expect(supportSection(container)?.textContent).toBe(`制度と支援${DESIGNATION_NOT_READY}`)
  })

  test('「制度と支援」の見出しは常にあり、順序も変えていない', () => {
    expect(h2s(renderDisease('achondroplasia').container)).toEqual([
      'この病気について', 'よくある症状', '治療について', '病気の概要',
      '相談できる診療科', '制度と支援', '患者会',
    ])
  })
})

describe('11 疾患以外：「病気の概要」の中、「公式情報」の直前', () => {
  test('両方あり（メチルマロン酸血症）: 2 つ出て、公式情報の直前にある', () => {
    const { container } = stub('メチルマロン酸血症')
    const items = designationItems(container)
    expect(items[0].text).toBe('指定難病（告示番号 246）')
    expect(items[1].text).toBe(DESIGNATION_SHOUMAN_LABEL)

    const h3 = overviewH3s(container)
    const designation = h3.indexOf(DESIGNATION_TITLE)
    expect(designation).toBeGreaterThanOrEqual(0)
    expect(h3.indexOf('公式情報')).toBe(designation + 1)
    // 準備中ページに「制度と支援」は無い
    expect(h2s(container)).not.toContain('制度と支援')
  })

  test('難病のみ（ハンチントン病）: 指定難病だけ', () => {
    const { container } = stub('ハンチントン病')
    expect(designationItems(container).map((l) => l.text)).toEqual(['指定難病（告示番号 8）'])
  })

  test('小慢のみ（ムコ多糖症II型）: 小児慢性だけ', () => {
    const { container } = stub('ムコ多糖症II型')
    expect(designationItems(container).map((l) => l.text)).toEqual([DESIGNATION_SHOUMAN_LABEL])
  })

  test('どちらも無い（ニーマン・ピック病C型）: 見出しごと出さない', () => {
    const { container } = stub('ニーマン・ピック病C型')
    expect(container.querySelector('[data-disease-overview]')).not.toBeNull()
    expect(container.querySelector('[data-disease-designation]')).toBeNull()
    expect(overviewH3s(container)).not.toContain(DESIGNATION_TITLE)
  })
})

/**
 * 同じ行き先を 2 回リンクで出さない（2026-09-26 ファウンダー指示）。
 * 血栓性血小板減少性紫斑病は、難病情報センターが公式情報と同じ URL・小児慢性は別 URL なので、
 * 1 ページで両方の場合を確かめられる。
 */
describe('公式情報と同じ URL のときはリンクにしない', () => {
  const TTP = '血栓性血小板減少性紫斑病'

  test('同じ URL（指定難病）: 制度側は素の文字で、リンクを持たない', () => {
    const { container } = stub(TTP)
    const nanbyou = designationItems(container).find((i) => i.text.startsWith('指定難病'))!
    expect(nanbyou.text).toBe('指定難病（告示番号 64）')
    expect(nanbyou.href).toBeNull()
    // 同じ行き先は公式情報の側に 1 本だけ残っている
    expect(officialHrefs(container)).toContain('https://www.nanbyou.or.jp/entry/87')
  })

  test('違う URL（小児慢性）: 今までどおりリンク', () => {
    const { container } = stub(TTP)
    const shouman = designationItems(container).find((i) => i.text === DESIGNATION_SHOUMAN_LABEL)!
    expect(shouman.href).toMatch(SHOUMAN_HREF)
    expect(officialHrefs(container)).not.toContain(shouman.href)
  })

  test('違う URL（指定難病）: 公式情報が Orphanet だけなら、制度側はリンクのまま', () => {
    // 多系統萎縮症は概要の出典が Orphanet で、難病情報センターの URL は公式情報に出ていない
    const { container } = stub('多系統萎縮症')
    const nanbyou = designationItems(container).find((i) => i.text.startsWith('指定難病'))!
    expect(nanbyou.href).toMatch(NANBYOU_HREF)
    expect(officialHrefs(container)).not.toContain(nanbyou.href)
  })
})

describe('根拠と表現', () => {
  test('知識ファイルの description 末尾の「指定難病NNN。」は根拠にしない', () => {
    // シスチン症は description が「…指定難病250。」で終わるが、難病情報センターの照合は none
    const { container } = stub('シスチン症')
    expect(designationItems(container).map((l) => l.text)).toEqual([DESIGNATION_SHOUMAN_LABEL])
    expect(container.textContent).not.toContain('告示番号')
    expect(container.textContent).not.toContain('250')
  })

  test('data/disease_summaries の nanbyo_number は読まない（全件 null でも告示番号が出る）', () => {
    // 11 疾患の nanbyo_number は全件 null。照合表から出ているので告示番号が出る
    expect(renderDisease('pku').container.textContent).toContain('指定難病（告示番号 240）')
  })

  test('リンクは別タブで開き、rel を持つ', () => {
    for (const slug of ['achondroplasia', 'pku', 'fabry']) {
      for (const a of renderDisease(slug).container.querySelectorAll('[data-disease-designation] a')) {
        expect(a.getAttribute('target')).toBe('_blank')
        expect(a.getAttribute('rel')).toContain('noopener')
      }
    }
  })

  test.each(['achondroplasia', 'pku', 'fabry', 'xlh'])('%s に禁止表現が無い', (slug) => {
    const html = renderDisease(slug).container.innerHTML
    expect({ slug, hits: BLOCKLIST.filter((w) => html.includes(w)) }).toEqual({ slug, hits: [] })
  })
})
