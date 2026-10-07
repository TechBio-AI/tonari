/**
 * アカウントの削除（/demo/community/account/delete）と、マイページ・退会の確認画面・トップからの見え方の検査
 *
 * DB には接続しない（session.ts・tenancy.ts・Supabase のサーバー用クライアントを差し替える）。
 *   1. 確認画面: 消えるもの（delete_my_account 版 5 の 10 項目。運営の人にだけ「運営としての役割」）と、
 *      残るもの（投稿・コメント、作った行事などや対応の記録。名前は出ない）
 *      ログインのメールが残ることは 1 行（強調しない）。「この会を退会する」との区別
 *   2. 境界: 未ログイン → /demo/login、閲覧モード → 404
 *   3. action: 確認のチェックが無ければ呼ばない。成功 → サインアウトしてトップへ。last_moderator・last_operator → 土台の文言と案内
 *   4. トップ: ?account_deleted=1 のときだけ「アカウントを削除しました。ご利用ありがとうございました」
 *   5. 文言: 禁止表現・「診断」が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { act, render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const deleteMyAccount = jest.fn()
const myGroups = jest.fn()
const listGroups = jest.fn()
jest.mock('@/lib/portal/tenancy', () => ({
  ...jest.requireActual('@/lib/portal/tenancy'),
  deleteMyAccount: () => deleteMyAccount(),
  myGroups: () => myGroups(),
  listGroups: () => listGroups(),
}))

// マイページ（入口）の描画に要る分だけ差し替える
const PROFILE = {
  userId: 'u1', fullName: 'テスト 花子', displayName: 'はなこ', registrantType: 'self', proxyRelation: null,
  patientIsMinor: null, ageBand: '30代', gender: '答えない', prefecture: '長野県', consentedAt: '2026-09-26T03:00:00Z',
}
jest.mock('@/lib/portal/member-profile', () => ({
  ...jest.requireActual('@/lib/portal/member-profile'),
  getMyProfile: async () => PROFILE,
}))
jest.mock('@/lib/portal/research-contact', () => ({
  ...jest.requireActual('@/lib/portal/research-contact'),
  getMyResearchContact: async () => ({ state: 'none', consentedAt: null, diseases: [] }),
  getMyGroupDiseaseIdxs: async () => [],
}))

const isOperator = jest.fn()
jest.mock('../_lib/contract-db', () => ({ ...jest.requireActual('../_lib/contract-db'), isOperator: () => isOperator() }))

const signOut = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { signOut: (opts?: unknown) => signOut(opts) } }) }))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import { FAILURE_MESSAGES } from '@/lib/portal/tenancy'

import DeleteAccountPage from '../community/account/delete/page'
import MemberProfilePage from '../community/profile/page'
import LeavePage from '../community/[slug]/leave/page'
import { deleteAccountAction } from '../community/account/delete/actions'
import { ACCOUNT_DELETED_MESSAGE, AccountDeletedNotice } from '../_components/AccountDeletedNotice'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function expectCleanWording(html: string) {
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(html).not.toContain('診断') // lint-wording: allow
}

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A', role: 'member', joinedAt: 'x' }

const fd = (confirm: boolean) => {
  const f = new FormData()
  if (confirm) f.set('confirm', 'yes')
  return f
}

beforeEach(() => {
  getViewer.mockReset()
  deleteMyAccount.mockReset()
  myGroups.mockReset()
  signOut.mockReset()
  myGroups.mockResolvedValue({ ok: true, value: [A] })
  isOperator.mockReset().mockResolvedValue(false)
})

describe('確認画面', () => {
  test('消えるもの・残るもの・取り消せないこと。メールが残ることは小さな 1 行', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({}))
    expect(container.querySelector('h1')?.textContent).toBe('アカウントを削除する（すべての会員情報を消す）')

    const items = [...container.querySelectorAll('[data-deleted-items] li')].map((li) => li.textContent ?? '')
    expect(items).toHaveLength(10) // 運営でない会員（「運営としての役割」は出ない）
    expect(items[0]).toContain('プロフィール')
    expect(items[1]).toContain('同意')
    expect(items[2]).toContain('案内を受け取る病気')
    expect(items[3]).toBe('治験・研究の案内への「興味がある」「表示しない」の記録') // notice_interest（版 5）
    expect(items[4]).toBe('病気がわかるまでの道のりの回答')
    expect(items[5]).toBe('行事への参加の予定')
    expect(items[6]).toBe('あなたがした通報')
    expect(items[7]).toBe('患者会への参加の希望') // 20261020（版 4）で消える
    expect(items[8]).toBe('会を作りたいという申請（申請中のものも、結果が出たものも）') // group_requests（版 5）
    expect(items[9]).toContain('すべての会の会員資格')
    expect(items.join('')).not.toContain('運営')

    const text = container.textContent ?? ''
    expect(text).toContain('これまでに書いた投稿とコメントは、会に残ります。名前は表示されなくなります。')
    expect(container.querySelector('[data-kept-records]')?.textContent).toContain(
      '世話人や運営として作った行事・リンク・案内や、対応・審査の記録も残ります。あなたの名前とは結びつかなくなります。'
    )
    expect(container.querySelector('[data-kept-records]')?.textContent).toContain('あなたの申請でできた会は、そのまま残ります。')
    expect(text).toContain('元に戻せません')

    // メールのことは 1 行だけ・小さな文字（強調しない）。版 3 ではメールアドレスも消える
    const mailLines = [...container.querySelectorAll('p')].filter((p) => (p.textContent ?? '').includes('メールアドレス'))
    expect(mailLines).toHaveLength(1)
    expect(mailLines[0].className).toContain('text-sm')
    expect(mailLines[0].querySelector('strong, b')).toBeNull()
    expect(mailLines[0].textContent).toContain('ログインに使うメールアドレスも消えます')
    expect(text).not.toContain('メールアドレスだけは残ります')

    expect(deleteMyAccount).not.toHaveBeenCalled() // 開いただけでは消さない
    expectCleanWording(container.innerHTML)
  })

  test('「この会を退会する」と区別し、所属する会ごとの退会の入口を並べる', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({}))
    const leave = [...container.querySelectorAll('[data-leave-links] a')]
    expect(leave.map((a) => a.getAttribute('href'))).toEqual([`/demo/community/${A.slug}/leave`])
    expect(leave[0].textContent).toContain('この会を退会する')
    const button = container.querySelector('form button[type="submit"]')!
    expect(button.textContent).toBe('アカウントを削除する')
  })

  test('確認のチェックが必須', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({}))
    const box = container.querySelector('form input[name="confirm"]') as HTMLInputElement
    expect(box.type).toBe('checkbox')
    expect(box.required).toBe(true)
  })

  test('last_moderator: 土台の文言と、世話人を代わってもらう案内', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({ searchParams: { error: 'last_moderator' } }))
    const alert = container.querySelector('[role="alert"]')!
    expect(alert.textContent).toContain(FAILURE_MESSAGES.last_moderator)
    expect(alert.textContent).toContain('世話人を代わってもらってから')
  })

  test('運営の人にだけ、最後に「運営としての役割」（operators。版 5）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    isOperator.mockResolvedValue(true)
    const { container } = render(await DeleteAccountPage({}))
    const items = [...container.querySelectorAll('[data-deleted-items] li')].map((li) => li.textContent ?? '')
    expect(items).toHaveLength(11)
    expect(items[10]).toBe('運営としての役割')
  })

  test('last_operator: 土台の文言と、運営を代わってもらう案内', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({ searchParams: { error: 'last_operator' } }))
    const alert = container.querySelector('[role="alert"]')!
    expect(alert.textContent).toContain(FAILURE_MESSAGES.last_operator)
    expect(alert.textContent).toContain('運営を務めているときは、ほかの方に運営を代わってもらってから、もう一度お試しください。')
    expect(alert.textContent).not.toContain('世話人を代わってもらって')
  })

  test('知らない error の値は出さない', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await DeleteAccountPage({ searchParams: { error: '<script>' } }))
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  test('未ログインは /demo/login、閲覧モードは 404', async () => {
    getViewer.mockResolvedValue(null)
    await expect(DeleteAccountPage({})).rejects.toThrow('redirect:/demo/login')
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(DeleteAccountPage({})).rejects.toThrow('notFound')
    expect(myGroups).not.toHaveBeenCalled()
  })
})

describe('削除の action', () => {
  test('成功: deleteMyAccount → サインアウト → トップ（?account_deleted=1）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    deleteMyAccount.mockResolvedValue({ ok: true, value: null })
    await expect(deleteAccountAction(fd(true))).rejects.toThrow('redirect:/demo?account_deleted=1')
    expect(deleteMyAccount).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' }) // この端末だけ（版 3 でサーバー側の人はもういない）
    expect(deleteMyAccount.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0])
  })

  test('サインアウトが失敗しても、消えたのでトップへ送る', async () => {
    getViewer.mockResolvedValue(MEMBER)
    deleteMyAccount.mockResolvedValue({ ok: true, value: null })
    signOut.mockRejectedValue(new Error('network'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(deleteAccountAction(fd(true))).rejects.toThrow('redirect:/demo?account_deleted=1')
    spy.mockRestore()
  })

  test('last_moderator: 何も消えず、確認画面へ ?error=last_moderator（サインアウトしない）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    deleteMyAccount.mockResolvedValue({ ok: false, reason: 'last_moderator' })
    await expect(deleteAccountAction(fd(true))).rejects.toThrow('redirect:/demo/community/account/delete?error=last_moderator')
    expect(signOut).not.toHaveBeenCalled()
  })

  test('確認のチェックが無ければ呼ばない', async () => {
    getViewer.mockResolvedValue(MEMBER)
    await expect(deleteAccountAction(fd(false))).rejects.toThrow('?error=invalid_input')
    expect(deleteMyAccount).not.toHaveBeenCalled()
  })

  test('閲覧モード・未ログインでは呼ばない', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(deleteAccountAction(fd(true))).rejects.toThrow('redirect:/demo/login')
    }
    expect(deleteMyAccount).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })
})

describe('トップの「アカウントを削除しました」', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  test('?account_deleted=1 のときだけ出し、URL から印を外す', async () => {
    window.history.replaceState(null, '', '/demo?account_deleted=1')
    let c!: HTMLElement
    await act(async () => {
      c = render(<AccountDeletedNotice />).container
    })
    expect(c.textContent).toBe('アカウントを削除しました。ご利用ありがとうございました')
    expect(ACCOUNT_DELETED_MESSAGE).toBe('アカウントを削除しました。ご利用ありがとうございました')
    expect(window.location.search).toBe('')
  })

  test.each(['/demo', '/demo?account_deleted=0', '/demo?account_deleted=<b>x</b>'])('%s では出さない', async (url) => {
    window.history.replaceState(null, '', url)
    let c!: HTMLElement
    await act(async () => {
      c = render(<AccountDeletedNotice />).container
    })
    expect(c.textContent).toBe('')
  })
})

describe('入口と区別', () => {
  test('マイページの末尾に「アカウントを削除する（すべての会員情報を消す）」。会の退会とは別に説明する', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await MemberProfilePage())
    const section = container.querySelector('[data-account-section]')!
    expect(section).not.toBeNull()
    const link = section.querySelector('a')!
    expect(link.getAttribute('href')).toBe('/demo/community/account/delete')
    expect(link.textContent).toBe('アカウントを削除する（すべての会員情報を消す）')
    expect(section.textContent).toContain('「この会を退会する」')
    expectCleanWording(section.innerHTML)
  })

  test('会の退会の確認画面から、アカウントの削除へ案内する（文言は別）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    myGroups.mockResolvedValue({ ok: true, value: [{ ...A, role: 'member' }] })
    listGroups.mockResolvedValue({ ok: true, value: [A] })
    const { container } = render(await LeavePage({ params: { slug: A.slug } }))
    expect(container.querySelector('form button')?.textContent).toBe('退会する')
    const link = container.querySelector('a[href="/demo/community/account/delete"]')
    expect(link?.textContent).toBe('アカウントを削除する（すべての会員情報を消す）')
  })
})

describe('マイページの「病気がわかるまでの道のり」への入口', () => {
  const saved = process.env.JOURNEY_SURVEY
  afterEach(() => {
    if (saved === undefined) delete process.env.JOURNEY_SURVEY
    else process.env.JOURNEY_SURVEY = saved
  })

  test('JOURNEY_SURVEY=on: 「自分の回答を確認・取り消す」が /demo/community/journey へ', async () => {
    process.env.JOURNEY_SURVEY = 'on'
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await MemberProfilePage())
    const link = container.querySelector('[data-journey-section] a')
    expect(link?.getAttribute('href')).toBe('/demo/community/journey')
    expect(link?.textContent).toBe('自分の回答を確認・取り消す')
    expect(container.querySelector('[data-journey-section] h2')?.textContent).toBe('病気がわかるまでの道のり')
    expectCleanWording(container.innerHTML)
  })

  test.each([undefined, '', 'off', 'ON', 'true'])('JOURNEY_SURVEY=%p では出さない', async (v) => {
    if (v === undefined) delete process.env.JOURNEY_SURVEY
    else process.env.JOURNEY_SURVEY = v
    getViewer.mockResolvedValue(MEMBER)
    const { container } = render(await MemberProfilePage())
    expect(container.querySelector('[data-journey-section]')).toBeNull()
    expect(container.querySelector('a[href="/demo/community/journey"]')).toBeNull()
  })

  test('閲覧モードでは出さない（on でも）', async () => {
    process.env.JOURNEY_SURVEY = 'on'
    getViewer.mockResolvedValue({ kind: 'demo' })
    const { container } = render(await MemberProfilePage())
    expect(container.querySelector('a[href="/demo/community/journey"]')).toBeNull()
    expect(container.textContent).not.toContain('自分の回答を確認・取り消す')
  })
})
