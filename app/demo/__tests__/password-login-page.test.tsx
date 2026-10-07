/**
 * TEST_PASSWORD_LOGIN: 本番前に削除（docs/REMOVE_BEFORE_PRODUCTION.md）
 *
 * /demo/login の「テスト用ログイン」（メールとパスワード）の枠の検査。
 *   - TEST_PASSWORD_LOGIN が 'on' ちょうどのときだけ枠を出す（未設定・'off'・'ON' では出さない）
 *   - 枠はマジックリンクの入口の下。素の POST フォームで /demo/auth/password へ（パスワードを URL に載せない）
 *   - ?password_error=1 で固定の文言。マジックリンクの誤りの文言とは混ぜない
 *   - 禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn() }))

import DemoLoginPage from '../login/page'
import { PASSWORD_ERROR } from '../login/LoginForm'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  delete process.env.DEMO_ACCESS_CODE
  delete process.env.TEST_PASSWORD_LOGIN
})
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('/demo/login のテスト用ログイン枠', () => {
  test("TEST_PASSWORD_LOGIN=on: マジックリンクの下に「テスト用ログイン」。POST で /demo/auth/password へ", () => {
    process.env.TEST_PASSWORD_LOGIN = 'on'
    const { container } = render(<DemoLoginPage searchParams={{}} />)
    const box = container.querySelector('[data-password-login]')!
    expect(box).not.toBeNull()
    expect(box.querySelector('h2')?.textContent).toBe('テスト用ログイン')

    const form = box.querySelector('form')!
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe('/demo/auth/password')
    expect((form.querySelector('input[name="email"]') as HTMLInputElement).type).toBe('email')
    expect((form.querySelector('input[name="password"]') as HTMLInputElement).type).toBe('password')

    // マジックリンクのボタンが先（上）、パスワードの枠が後（下）
    const magic = [...container.querySelectorAll('button')].find((b) => b.textContent === 'ログイン用リンクを送る')!
    expect(magic.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(container.textContent).not.toContain(PASSWORD_ERROR)
    expect(BLOCKLIST.filter((w) => container.innerHTML.includes(w))).toEqual([])
  })

  test('?password_error=1 で固定の文言を出す', () => {
    process.env.TEST_PASSWORD_LOGIN = 'on'
    const { container } = render(<DemoLoginPage searchParams={{ password_error: '1' }} />)
    const alert = container.querySelector('[data-password-login] [role="alert"]')
    expect(alert?.textContent).toBe('メールアドレスかパスワードが違います')
    // マジックリンク側の誤りの文言は出さない
    expect(container.textContent).not.toContain('リンクの確認ができませんでした')
  })

  test.each([undefined, '', 'off', 'ON', 'true'])('TEST_PASSWORD_LOGIN=%p では枠ごと出さない（文言も出さない）', (v) => {
    if (v !== undefined) process.env.TEST_PASSWORD_LOGIN = v
    const { container } = render(<DemoLoginPage searchParams={{ password_error: '1' }} />)
    expect(container.querySelector('[data-password-login]')).toBeNull()
    expect(container.querySelector('form[action="/demo/auth/password"]')).toBeNull()
    expect(container.textContent).not.toContain(PASSWORD_ERROR)
    expect(container.textContent).not.toContain('テスト用ログイン')
  })

  test('閲覧コードの枠と並べても、パスワードの枠は閲覧コードの枠より上', () => {
    process.env.TEST_PASSWORD_LOGIN = 'on'
    process.env.DEMO_ACCESS_CODE = 'TONARI-2026'
    const { container } = render(<DemoLoginPage searchParams={{}} />)
    const box = container.querySelector('[data-password-login]')!
    const demo = container.querySelector('form[action="/demo/auth/demo-access"]')!
    expect(box.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
