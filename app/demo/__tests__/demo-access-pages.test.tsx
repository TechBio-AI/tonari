/**
 * DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
 *
 * 閲覧コードの入口の画面側の検査。
 *   - /demo/login: env ありなら注意書き・コード・入力欄・ボタン、?demo_error=1 で誤りの文言。env なしなら何も出さない
 *   - /demo/community: demo なら帯・サンプル 3 件。会員の表示（メール・ログアウト）は出さない
 *     （閲覧を終了・ログアウトは 2026-09-26 に会員エリアの上部バーへ移した。app/demo/__tests__/member-bar.test.tsx）
 *   - どちらも docs/wording-blocklist-demo.txt の禁止表現を含まない
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({
  getViewer: () => getViewer(),
}))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
}))

// 会員はプロフィールがある状態（無いと /demo/community/onboarding へ送られる。2026-09-26）
jest.mock('@/lib/portal/member-profile', () => ({
  getMyProfile: jest.fn().mockResolvedValue({ userId: 'u1', fullName: 'テスト 花子', displayName: 'はなこ', ageBand: '30代', gender: '答えない', prefecture: '東京都', consentedAt: '2026-09-26T00:00:00Z' }),
}))

// 入口の画面は送信しない限り Supabase を呼ばないが、読み込みで env を要求しないよう差し替える
jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn() }))

import DemoLoginPage from '../login/page'
import DemoCommunityPage from '../community/page'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function expectNoBlockedWords(html: string, where: string) {
  const hits = BLOCKLIST.filter((w) => html.includes(w))
  expect({ where, hits }).toEqual({ where, hits: [] })
}

const NOTICE = '【プロトタイプの閲覧用】現在は開発中のため、下のコードを入力すると会員向けページの見本をご覧いただけます。'
const DEMO_ERROR = 'コードが違います。もう一度お試しください。'

describe('/demo/login の閲覧コード枠', () => {
  const ORIGINAL_ENV = { ...process.env }
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('env あり: 注意書き・コード（等幅）・入力欄「閲覧コード」・ボタンが、マジックリンクのボタンの下に出る', () => {
    process.env.DEMO_ACCESS_CODE = 'TONARI-2026'
    const { container, getByLabelText, getByRole } = render(<DemoLoginPage searchParams={{}} />)

    expect(container.textContent).toContain(NOTICE)
    const code = [...container.querySelectorAll('.font-mono')].find((el) => el.textContent === 'TONARI-2026')
    expect(code).toBeDefined()

    const input = getByLabelText('閲覧コード') as HTMLInputElement
    expect(input.name).toBe('code')
    const form = input.closest('form')!
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe('/demo/auth/demo-access')

    const demoButton = getByRole('button', { name: '閲覧コードで見る' })
    const magicButton = getByRole('button', { name: 'ログイン用リンクを送る' })
    // DOM 上でマジックリンクのボタンより後ろ
    expect(magicButton.compareDocumentPosition(demoButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(container.textContent).not.toContain(DEMO_ERROR)
    expectNoBlockedWords(container.innerHTML, 'login(env あり)')
  })

  test('env あり + ?demo_error=1: 誤りの文言を出す', () => {
    process.env.DEMO_ACCESS_CODE = 'TONARI-2026'
    const { container } = render(<DemoLoginPage searchParams={{ demo_error: '1' }} />)
    expect(container.textContent).toContain(DEMO_ERROR)
    expectNoBlockedWords(container.innerHTML, 'login(demo_error)')
  })

  test('env なし: 注意書き・コード・入力欄を出さない（?demo_error=1 でも）', () => {
    delete process.env.DEMO_ACCESS_CODE
    const { container, queryByLabelText } = render(<DemoLoginPage searchParams={{ demo_error: '1' }} />)
    expect(container.textContent).not.toContain('プロトタイプの閲覧用')
    expect(container.textContent).not.toContain(DEMO_ERROR)
    expect(queryByLabelText('閲覧コード')).toBeNull()
    expect(container.querySelector('form[action="/demo/auth/demo-access"]')).toBeNull()
    // マジックリンクの入口はそのまま
    expect(queryByLabelText('メールアドレス')).not.toBeNull()
  })

  test('env なし: 既存のリンク失敗の文言（?error=1）はそのまま出る', () => {
    delete process.env.DEMO_ACCESS_CODE
    const { container } = render(<DemoLoginPage searchParams={{ error: '1' }} />)
    expect(container.textContent).toContain('リンクの確認ができませんでした。もう一度お試しください。')
  })
})

describe('/demo/community の表示の切り替え', () => {
  beforeEach(() => getViewer.mockReset())

  test('demo: 帯・サンプルのお知らせ 3 件。会員の表示は出さない（閲覧を終了は上部バー）', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const { container } = render(await DemoCommunityPage())

    expect(container.textContent).toContain('プロトタイプの閲覧モードです。実際の会員のデータは表示されません')
    const items = container.querySelectorAll('li')
    expect(items.length).toBe(3)
    for (const item of items) {
      expect(item.textContent).toContain('サンプル')
    }

    expect(container.textContent).not.toContain('ログイン中')
    expect(container.querySelector('form[action="/demo/auth/signout"]')).toBeNull()
    expectNoBlockedWords(container.innerHTML, 'community(demo)')
  })

  test('member: お知らせだけ（会員情報・ログアウトは上部バー。帯・サンプルは出さない）', async () => {
    getViewer.mockResolvedValue({ kind: 'member', email: 'a@example.com', hasProfile: true })
    const { container } = render(await DemoCommunityPage())
    expect(container.textContent).toContain('お知らせ')
    expect(container.textContent).not.toContain('a@example.com')
    expect(container.textContent).not.toContain('閲覧モード')
    expect(container.textContent).not.toContain('サンプル')
  })

  test('null: /demo/login へ', async () => {
    getViewer.mockResolvedValue(null)
    await expect(DemoCommunityPage()).rejects.toThrow('redirect:/demo/login')
  })
})
