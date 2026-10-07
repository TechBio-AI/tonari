/**
 * @jest-environment node
 *
 * 公開層のサイトマップ（app/sitemap.ts）
 *   - /demo、/demo/diseases、/demo/groups、/demo/about、/demo/privacy、/demo/policy、/demo/for-groups と、
 *     疾患ページ全件（知識ファイルの件数）を含む
 *   - /demo/login、/demo/community（登録層）を含まない
 */
import { listAllDiseases } from '@/lib/portal/diseases'

import sitemap from '../sitemap'

const paths = () => sitemap().map((e) => new URL(e.url).pathname)

test('公開層のページと疾患ページ全件を含む', () => {
  const p = paths()
  for (const x of ['/demo', '/demo/diseases', '/demo/groups', '/demo/about']) expect(p).toContain(x)
  // フッターの案内 3 ページ（2026-09-26 追加）
  expect(p).toContain('/demo/privacy')
  expect(p).toContain('/demo/policy')
  expect(p).toContain('/demo/for-groups')
  // 固定パスは疾患ページと合わせて 1 件ずつ（重複しない）
  expect(p.length).toBe(7 + listAllDiseases().length)
  const diseases = p.filter((x) => x.startsWith('/demo/diseases/'))
  expect(diseases.length).toBe(listAllDiseases().length)
  expect(new Set(diseases).size).toBe(diseases.length)
  expect(diseases).toContain('/demo/diseases/fabry')
  expect(diseases).toContain(`/demo/diseases/${encodeURIComponent('シスチン症')}`)
})

test('登録層（/demo/community）とログインを含まない', () => {
  const p = paths()
  expect(p.filter((x) => x.startsWith('/demo/community'))).toEqual([])
  expect(p.filter((x) => x.startsWith('/demo/login'))).toEqual([])
})

test('すべて絶対 URL で、lastModified を作らない', () => {
  for (const e of sitemap()) {
    expect(e.url).toMatch(/^https?:\/\//)
    expect(e.lastModified).toBeUndefined()
  }
})
