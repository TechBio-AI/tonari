/**
 * 疾患一覧のリンク先と、疾患ページのルートが 951 件すべてで一致することの機械的な検査（2026-10-03 の 404 の再発防止）
 *
 * 2026-10-03: 病名に「/」を含む 4 件（IgG4関連後腹膜/大動脈周囲炎 など）は、病名をそのまま slug にしていたため 404 になっていた。
 * 「/」はパスの区切りなので 1 つの [slug] に収まらず、Next.js が事前生成で作るパス（「/」を %2F に置き換える。
 * node_modules/next/dist/build/utils.js の escapePathDelimiters）と、一覧のリンク（encodeURIComponent）の行き先が合わない。
 * slug は lib/portal/diseases.ts の diseaseSlugFromName で作り、区切りになる文字を含まないようにした。
 *
 * data/disease_index.json の全件について確かめる:
 *   1. 一覧のカード（DiseaseFinder）のリンク先が /demo/diseases/<encodeURIComponent(slug)> の 1 段のパス
 *   2. slug に、パスの区切りや URL で特別な意味を持つ文字（/ \ ? # %）が無い（事前生成のパスで置き換えが起きない）
 *   3. 事前生成（generateStaticParams）に、その slug がちょうど 1 回入っている
 *   4. 疾患ページが、事前生成の値（そのまま）でも、リンクから来た値（エンコード済み）でも、同じ病気を引ける
 *   5. 構造化データの URL も同じ slug を使う
 *   6. dynamicParams は true（2026-10-03: false だと dev で日本語の病名 940 件が 404 だった。dev は params を
 *      エンコードのまま渡し、事前生成の値〔デコード済み〕と文字列のまま比べるため）。
 *      ページは、エンコードのまま届いた slug でも、デコード済みの slug でも開ける。一覧に無い slug は描画の最初に 404
 *
 * ★ 単体テストは Next.js のルーティングを通らない。実機の確認は dev サーバーに全件を叩く（docs に手順は無い。2026-10-03 は
 *   /demo/diseases の HTML から抜いた slug と data/disease_index.json の全件を curl で叩き、951/951 が 200）
 */
import { render, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/diseases',
  notFound: () => {
    throw new Error('notFound')
  },
}))

import indexJson from '@/data/disease_index.json'
import { diseaseSlugFromName, getDemoDisease, getDiseaseStub, listAllDiseases } from '@/lib/portal/diseases'
import { withReadiness } from '@/lib/portal/disease-list'
import { diseasePath } from '@/lib/portal/site-url'

import { DiseaseFinder } from '../diseases/_components/DiseaseFinder'
import DiseasePage, { dynamicParams, generateStaticParams } from '../diseases/[slug]/page'

// Next.js 14 が事前生成のパスを作るときの置き換え（原本の関数をそのまま使う）
const escapePathDelimiters: (s: string, escapeEncoded?: boolean) => string = require('next/dist/shared/lib/router/utils/escape-path-delimiters').default

const INDEX = (indexJson as { diseases: { idx: number; name: string; slug: string }[] }).diseases

/** 病名に、以前の slug（病名そのまま）だと 1 つの区切りに収まらない文字があるか（機械で数える） */
const BROKEN_BEFORE = INDEX.filter((d) => d.slug === diseaseSlugFromName(d.name) && d.name !== d.slug)

test('951 件ある', () => {
  expect(INDEX.length).toBe(951)
})

test('以前の slug（病名そのまま）では 404 になっていたのは、「/」を含む 4 件（機械で数えた結果）', () => {
  expect(BROKEN_BEFORE.map((d) => d.name)).toEqual([
    'IgG4関連後腹膜/大動脈周囲炎',
    '遺伝性褐色細胞腫/パラガングリオーマ症候群',
    'SeSAME/EAST症候群',
    '先天性ミオトニア(Thomsen/Becker型)',
  ])
  // どれも、以前の slug を事前生成のパスにすると置き換えが起きる（＝リンクの行き先と一致しない）
  for (const d of BROKEN_BEFORE) expect(escapePathDelimiters(d.name, true)).not.toBe(d.name)
})

describe('全件: 一覧のリンク先 = 疾患ページが解決する slug', () => {
  const params = new Map<string, number>()
  for (const p of generateStaticParams()) params.set(p.slug, (params.get(p.slug) ?? 0) + 1)

  test.each(INDEX.map((d) => [d.idx, d.name, d.slug] as const))('%i %s', (_idx, name, slug) => {
    // 2. 区切りになる文字が無く、事前生成のパスで置き換えが起きない
    expect(slug).not.toMatch(/[/\\?#%]/)
    expect(escapePathDelimiters(slug, true)).toBe(slug)
    // 1. リンクは 1 段のパス
    const href = `/demo/diseases/${encodeURIComponent(slug)}`
    expect(href.split('/')).toHaveLength(4)
    expect(decodeURIComponent(href.split('/')[3])).toBe(slug)
    // 3. 事前生成にちょうど 1 回
    expect(params.get(slug)).toBe(1)
    // 4. 事前生成の値でも、リンクから来た値でも、同じ病気
    const resolve = (p: string) => getDemoDisease(p)?.name ?? getDiseaseStub(p)?.name ?? null
    expect(resolve(slug)).toBe(name)
    expect(resolve(encodeURIComponent(slug))).toBe(name)
    // 5. 構造化データ・サイトマップの URL も同じ
    expect(diseasePath(slug)).toBe(href)
  })
})

test('一覧の部品（DiseaseFinder）が出すリンクは、番号表の slug から作ったもの（行き先を差し替えていない）', () => {
  const all = withReadiness(listAllDiseases(), () => false)
  const { container } = render(<DiseaseFinder diseases={all} />)
  const input = container.querySelector('input[type="search"]') as HTMLInputElement
  for (const d of BROKEN_BEFORE) {
    fireEvent.change(input, { target: { value: d.name } })
    const card = [...container.querySelectorAll('li a')].find((a) => a.querySelector('[data-disease-name]')?.textContent === d.name)!
    expect(card.getAttribute('href')).toBe(`/demo/diseases/${encodeURIComponent(d.slug)}`)
    expect(card.getAttribute('href')!.split('/')).toHaveLength(4)
  }
})

describe('ページの入口（dev では params がエンコードのまま届く）', () => {
  test('dynamicParams は true（false に戻すと dev で日本語の病名のページが 404 になる）', () => {
    expect(dynamicParams).toBe(true)
  })

  test.each([
    ['ターナー症候群'],
    ['IgG4関連後腹膜／大動脈周囲炎'],
    ['fabry'],
  ])('%s: エンコードのまま届いても、デコード済みで届いても、同じ病気のページ', (slug) => {
    const name = INDEX.find((d) => d.slug === slug)!.name
    for (const p of [encodeURIComponent(slug), slug]) {
      const { container, unmount } = render(<DiseasePage params={{ slug: p }} />)
      expect(container.querySelector('h1')?.textContent).toContain(name)
      unmount()
    }
  })

  test('一覧に無い slug・壊れたエンコードは 404（描画の最初で止める）', () => {
    expect(() => DiseasePage({ params: { slug: encodeURIComponent('存在しない病気') } })).toThrow('notFound')
    expect(() => DiseasePage({ params: { slug: '%E0%A4%A' } })).toThrow('notFound')
    // 「/」を含む以前の slug（病名そのまま）も一覧には無い
    expect(() => DiseasePage({ params: { slug: encodeURIComponent('IgG4関連後腹膜/大動脈周囲炎') } })).toThrow('notFound')
  })
})
