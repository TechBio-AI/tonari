/**
 * 患者会がこのサイトに加わることを「参加」と言う（2026-10-02 ファウンダー指示）の検査
 *
 *   1. 以前の言い方（下の OLD_WORD）が app/・lib/・data/ のどのファイルにも無い（画面の文言・コメント・テスト・データとも 0 件）
 *   2. 疾患ページの患者会欄: 「この病気の患者会は、まだ「となり」に参加していません。」と「となりへの参加を希望する」（全疾患。2026-10-03）
 *   3. /demo/about の見出しが「患者会の参加について」
 *
 * このファイル自身が 1 に掛からないよう、以前の言い方は 2 文字に分けて組み立てる。
 */
import * as fs from 'fs'
import * as path from 'path'
import { act, render } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  notFound: () => {
    throw new Error('notFound')
  },
}))

import DiseasePage from '../diseases/[slug]/page'
import AboutPage from '../about/page'
import { NO_GROUP_YET } from '../_lib/wording'
import { wishTargetByName } from '../wish/_lib/targets'
import { resetWishCountsForTest } from '../wish/_components/WishWaiting'

// 機能フラグ（lib/portal/feature-flags.ts。既定 off）を開いた状態で検査する。閉じたときの検査は feature-flags-wiring.test.tsx
const SAVED_FLAGS = { WISHES: process.env.WISHES, TRIAL_NOTICES: process.env.TRIAL_NOTICES, OPS: process.env.OPS }
beforeAll(() => {
  process.env.WISHES = 'on'
  process.env.TRIAL_NOTICES = 'on'
  process.env.OPS = 'on'
})
afterAll(() => {
  for (const [k, v] of Object.entries(SAVED_FLAGS)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})


const OLD_WORD = ['入', '居'].join('')
const ROOT = process.cwd()
const DIRS = ['app', 'lib', 'data']
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.csv', '.sql', '.css', '.html', '.yml', '.yaml'])

function walk(dir: string, out: string[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (TEXT_EXT.has(path.extname(e.name))) out.push(p)
  }
}

test('以前の言い方が app/・lib/・data/ に 0 件', () => {
  const files: string[] = []
  for (const d of DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d), files)
  expect(files.length).toBeGreaterThan(0)
  const hits = files.filter((f) => fs.readFileSync(f, 'utf-8').includes(OLD_WORD)).map((f) => path.relative(ROOT, f))
  expect(hits).toEqual([])
})

const groupSection = (c: HTMLElement) =>
  [...c.querySelectorAll('main h2, h2')].find((h) => h.textContent === '患者会')!.closest('section')!

test('疾患ページ（患者会がまだ参加していない病気）: 新しい一文と「となりへの参加を希望する」', () => {
  const { container } = render(<DiseasePage params={{ slug: 'pompe' }} />)
  const sec = groupSection(container)
  expect(NO_GROUP_YET).toBe('この病気の患者会は、まだ「となり」に参加していません。')
  expect(sec.textContent).toContain('この病気の患者会は、まだ「となり」に参加していません。')
  const link = sec.querySelector('a[data-wish-link]')
  expect(link?.textContent).toBe('となりへの参加を希望する')
  expect(link?.getAttribute('href')).toBe(`/demo/wish/${wishTargetByName('ポンペ病')!.idx}`)
})

test('疾患ページ（患者会がある病気）には「参加を希望する」を出さない', () => {
  const { container } = render(<DiseasePage params={{ slug: 'fabry' }} />)
  expect(groupSection(container).querySelector('a[data-wish-link]')).toBeNull()
})

test('くわしい説明の無い病気（11 疾患の外）にも「となりへの参加を希望する」', () => {
  const { container } = render(<DiseasePage params={{ slug: encodeURIComponent('シスチン症') }} />)
  const sec = groupSection(container)
  expect(sec.textContent).toContain('この病気の患者会は、まだ「となり」に参加していません。')
  expect(sec.querySelector('a[data-wish-link]')?.getAttribute('href')).toBe(`/demo/wish/${wishTargetByName('シスチン症')!.idx}`)
})

test('疾患ページの「希望している方」（読めた人数をそのまま。行が無い病気は「10未満」）', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ counts: { [String(wishTargetByName('ポンペ病')!.idx)]: '12' } }) })
  resetWishCountsForTest()
  let container!: HTMLElement
  await act(async () => {
    container = render(<DiseasePage params={{ slug: 'pompe' }} />).container
  })
  expect(groupSection(container).querySelector('[data-wish-waiting]')?.textContent).toBe('希望している方：12 人')
})

test('/demo/about の見出しは「患者会の参加について」', () => {
  const { container } = render(<AboutPage />)
  expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toContain('患者会の参加について')
  expect(container.textContent).not.toContain(OLD_WORD)
})
