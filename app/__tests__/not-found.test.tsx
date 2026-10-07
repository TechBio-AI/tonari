/**
 * 見つからないページ（app/not-found.tsx）
 *   - 日本語の見出し「ページが見つかりません」
 *   - 病名で探す入口（/demo/diseases）とトップへ（/demo）
 *   - 「診断」の字を出さない。/demo の禁止表現（docs/wording-blocklist-demo.txt）も出さない
 */
import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'

import NotFound from '../not-found'

test('日本語の見出し、病名で探す入口とトップへの道があり、「診断」の字を出さない', () => {
  const { container } = render(<NotFound />)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ページが見つかりません')
  expect(screen.getByRole('link', { name: '病名で探す' })).toHaveAttribute('href', '/demo/diseases')
  expect(screen.getByRole('link', { name: 'トップへ' })).toHaveAttribute('href', '/demo')

  const html = container.innerHTML
  expect(html).not.toContain('診断')
  const blocklist = fs
    .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
  expect(blocklist.filter((w) => html.includes(w))).toEqual([])
})
