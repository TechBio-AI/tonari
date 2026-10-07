/**
 * 会員エリア（/demo/community 配下）の上部バー（app/demo/community/layout.tsx）
 *
 *   - 右上に丸いアイコン: 会員は表示名の頭文字 1 字、閲覧モードは「見本」、プロフィールが無い会員は「会」
 *   - <details> で開閉する（JS 無しでも動く）。中身:
 *       member … マイページ／ログアウト（POST /demo/auth/signout）
 *       demo   … マイページ（サンプル）／閲覧を終了（POST /demo/auth/demo-access/end）
 *   - 見ている人が分からないときはバーを出さない
 *   - 禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const getMyProfile = jest.fn()
jest.mock('@/lib/portal/member-profile', () => ({ getMyProfile: () => getMyProfile() }))

import CommunityLayout from '../community/layout'
import { DEMO_AVATAR_TEXT, NO_PROFILE_AVATAR_TEXT, initialOf } from '../community/_components/MemberBar'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

// 架空の会員（テスト用）
const PROFILE = { userId: 'u1', fullName: 'テスト 花子', displayName: 'はなこ', ageBand: '30代', gender: '答えない', prefecture: '長野県', consentedAt: '2026-09-26T03:00:00Z' }

async function renderBar() {
  const { container } = render(await CommunityLayout({ children: <main>本文</main> }))
  return container
}

beforeEach(() => {
  getViewer.mockReset()
  getMyProfile.mockReset()
})

test('会員: 表示名の頭文字のアイコン。開くと「マイページ／ログアウト」。<details> で開閉する', async () => {
  getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true })
  getMyProfile.mockResolvedValue(PROFILE)
  const c = await renderBar()

  const details = c.querySelector('details[data-member-menu]')!
  expect(details).not.toBeNull()
  expect(details.hasAttribute('open')).toBe(false) // 最初は閉じている
  const summary = details.querySelector('summary')!
  expect(summary.textContent).toBe('は')
  expect(summary.getAttribute('aria-label')).toBe('会員メニュー')

  const items = [...details.querySelectorAll('a, button')].map((el) => el.textContent)
  expect(items).toEqual(['マイページ', 'ログアウト'])
  expect(details.querySelector('a')!.getAttribute('href')).toBe('/demo/community/profile')
  const form = details.querySelector('form')!
  expect(form.getAttribute('method')).toBe('post')
  expect(form.getAttribute('action')).toBe('/demo/auth/signout')

  // 氏名・メールはバーに出さない
  expect(c.textContent).not.toContain('テスト 花子')
  expect(c.textContent).not.toContain('a@example.com')
  expect(c.textContent).toContain('本文') // ページの中身はそのまま下に出る
  expect(BLOCKLIST.filter((w) => c.innerHTML.includes(w))).toEqual([])
})

test('閲覧モード: アイコンは「見本」。開くと「マイページ（サンプル）／閲覧を終了」。DB は読まない', async () => {
  getViewer.mockResolvedValue({ kind: 'demo' })
  const c = await renderBar()
  const details = c.querySelector('details[data-member-menu]')!
  expect(details.querySelector('summary')!.textContent).toBe(DEMO_AVATAR_TEXT)
  expect([...details.querySelectorAll('a, button')].map((el) => el.textContent)).toEqual(['マイページ（サンプル）', '閲覧を終了'])
  expect(details.querySelector('a')!.getAttribute('href')).toBe('/demo/community/profile')
  expect(details.querySelector('form')!.getAttribute('action')).toBe('/demo/auth/demo-access/end')
  expect(details.querySelector('form[action="/demo/auth/signout"]')).toBeNull()
  expect(getMyProfile).not.toHaveBeenCalled()
  expect(BLOCKLIST.filter((w) => c.innerHTML.includes(w))).toEqual([])
})

test('プロフィールの無い会員（初回の入力中）は「会」。プロフィールは読まない', async () => {
  getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: false })
  const c = await renderBar()
  expect(c.querySelector('summary')!.textContent).toBe(NO_PROFILE_AVATAR_TEXT)
  expect(getMyProfile).not.toHaveBeenCalled()
})

test('見ている人が分からないときはバーを出さない（ページ側が /demo/login へ送る）', async () => {
  getViewer.mockResolvedValue(null)
  const c = await renderBar()
  expect(c.querySelector('[data-member-bar]')).toBeNull()
  expect(c.textContent).toBe('本文')
})

test('頭文字: 英字は大文字、絵文字は割らない、空なら「会」', () => {
  expect(initialOf('alice')).toBe('A')
  expect(initialOf('🌸さくら')).toBe('🌸')
  expect(initialOf('  はな')).toBe('は')
  expect(initialOf('   ')).toBe(NO_PROFILE_AVATAR_TEXT)
})
