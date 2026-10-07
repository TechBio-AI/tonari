/**
 * 会員エリアの会ごとのページ（/demo/community/[slug]/**）・招待の受け口・会員バーの「所属している会」の検査
 *
 * DB には接続しない。lib/portal/tenancy.ts の DB に触れる関数と、見ている人（session.ts）を差し替える。
 *   1. 境界: 未ログイン → /demo/login、プロフィール無し → onboarding、会が無い slug → 404
 *   2. 会をまたぐアクセス: 会員でない会の下のページ → その会のお知らせのページへ送る（302 相当の redirect）。
 *      別の会の投稿 id → 404。世話人のページは世話人以外 404。書き出しは世話人以外 404
 *   3. 会員でない人: 「この会の会員ではありません」＋入会希望フォーム。申請中ならフォームの代わりにその旨
 *   4. 閲覧モード: 見本の会「サンプルの会」だけ。DB を読まない。フォームを出さない
 *   5. 文言: 禁止表現・「診断」が無い。会員一覧・申請一覧に user_id・本名が出ない
 *   6. server action: 閲覧モード・未ログインでは tenancy.ts を呼ばない。結果は ?done / ?error で戻す
 *   7. 会員バー: 所属 0 → 出さない、1 → リンクだけ（切り替え無し）、2 以上 → 切り替え
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

// ---- 差し替え ---------------------------------------------------------------
const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const getMyProfile = jest.fn()
jest.mock('@/lib/portal/member-profile', () => ({ getMyProfile: () => getMyProfile() }))

const db = {
  listGroups: jest.fn(),
  myGroups: jest.fn(),
  listPosts: jest.fn(),
  listComments: jest.fn(),
  listMembers: jest.fn(),
  myJoinRequest: jest.fn(),
  listPendingJoinRequests: jest.fn(),
  exportGroup: jest.fn(),
  requestJoin: jest.fn(),
  createPost: jest.fn(),
  createComment: jest.fn(),
  createInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  deletePost: jest.fn(),
  deleteComment: jest.fn(),
  leaveGroup: jest.fn(),
  appointModerator: jest.fn(),
  dismissModerator: jest.fn(),
}

// ログイン中の本人の id（削除ボタンを「自分の分」に出すため。access.ts の myUserId が読む）
let currentUserId: string | null = 'user-secret-1'
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }) } }),
}))
jest.mock('@/lib/portal/tenancy', () => {
  const actual = jest.requireActual('@/lib/portal/tenancy')
  const wrapped: Record<string, unknown> = {}
  // 名前は db と同じ。db の参照は呼ばれたとき（読み込みの順より後）に行う
  const names = ['listGroups', 'myGroups', 'listPosts', 'listComments', 'listMembers', 'myJoinRequest', 'listPendingJoinRequests', 'exportGroup', 'requestJoin', 'createPost', 'createComment', 'createInvitation', 'acceptInvitation', 'approve', 'reject', 'deletePost', 'deleteComment', 'leaveGroup', 'appointModerator', 'dismissModerator']
  for (const k of names) wrapped[k] = (...a: unknown[]) => (db as Record<string, jest.Mock>)[k](...a)
  return { ...actual, ...wrapped }
})

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo/community',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import AnnouncementsPage from '../community/[slug]/page'
import ThreadsPage from '../community/[slug]/threads/page'
import ThreadPage from '../community/[slug]/threads/[id]/page'
import AnnouncementPage from '../community/[slug]/announcements/[id]/page'
import MembersPage from '../community/[slug]/members/page'
import ManagePage from '../community/[slug]/manage/page'
import InvitationPage from '../community/invite/[token]/page'
import CommunityLayout from '../community/layout'
import LeavePage from '../community/[slug]/leave/page'
import {
  acceptInvitationAction,
  deleteCommentAction,
  deletePostAction,
  leaveGroupAction,
  appointModeratorAction,
  dismissModeratorAction,
  createCommentAction,
  createInvitationAction,
  createThreadAction,
  requestJoinAction,
} from '../community/[slug]/actions'
import { SAMPLE_GROUP, SAMPLE_POSTS } from '../community/_components/sample-group'
import { flashOf } from '../community/[slug]/_components/GroupShell'

// ---- 架空のデータ（テスト用） --------------------------------------------------
const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const B = { id: '22222222-2222-4222-8222-222222222222', slug: 'gaucher-japan', name: 'テストの会B' }
const POST_A = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  groupId: A.id,
  authorId: 'user-secret-1',
  authorDisplayName: 'はなこ',
  kind: 'thread',
  title: 'Aのスレッド',
  body: 'Aの本文',
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
}
const POST_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ANN_A = { ...POST_A, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', kind: 'announcement', title: 'Aのお知らせ' }

const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const ok = <T,>(value: T) => ({ ok: true, value })

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function expectCleanWording(html: string) {
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(html).not.toContain('診断') // lint-wording: allow
}

async function renderPage(p: Promise<React.ReactElement> | React.ReactElement) {
  return render(await p).container
}

/** 会員 A（role）として。B には所属しない */
function asMemberOfA(role: 'member' | 'moderator' = 'member') {
  getViewer.mockResolvedValue(MEMBER)
  db.myGroups.mockResolvedValue(ok([{ ...A, role, joinedAt: '2026-09-01T00:00:00Z' }]))
}

beforeEach(() => {
  currentUserId = 'user-secret-1'
  for (const m of Object.values(db)) m.mockReset()
  getViewer.mockReset()
  getMyProfile.mockReset()
  db.listGroups.mockResolvedValue(ok([A, B]))
  db.listPosts.mockImplementation(async (groupId: string, kind: string) =>
    ok(groupId === A.id ? [POST_A, ANN_A].filter((p) => p.kind === kind) : [])
  )
  db.listComments.mockResolvedValue(ok([{ id: 'c1', postId: POST_A.id, authorId: 'user-secret-2', authorDisplayName: null, body: 'コメント本文', createdAt: '2026-09-21T00:00:00Z' }]))
  db.listMembers.mockResolvedValue(
    ok([
      { userId: 'user-secret-1', displayName: 'はなこ', role: 'moderator', joinedAt: '2026-09-01T00:00:00Z' },
      { userId: 'user-secret-2', displayName: null, role: 'member', joinedAt: '2026-09-02T00:00:00Z' },
    ])
  )
  db.myJoinRequest.mockResolvedValue(ok(null))
  db.listPendingJoinRequests.mockResolvedValue(
    ok([
      { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', displayName: 'さくら', fullName: 'テスト 桜子', referrerName: 'テスト 紹介太郎', message: 'よろしくお願いします', createdAt: '2026-09-25T00:00:00Z' },
      { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', displayName: null, fullName: null, referrerName: null, message: '', createdAt: '2026-09-26T00:00:00Z' },
    ])
  )
})

// =============================================================================
describe('入口の境界', () => {
  const pages: [string, () => Promise<unknown>][] = [
    ['お知らせ', () => AnnouncementsPage({ params: { slug: A.slug } })],
    ['掲示板', () => ThreadsPage({ params: { slug: A.slug } })],
    ['スレッド', () => ThreadPage({ params: { slug: A.slug, id: POST_A.id } })],
    ['会員', () => MembersPage({ params: { slug: A.slug } })],
    ['世話人', () => ManagePage({ params: { slug: A.slug } })],
  ]

  test.each(pages)('未ログインなら %s は /demo/login へ', async (_n, open) => {
    getViewer.mockResolvedValue(null)
    await expect(open()).rejects.toThrow('redirect:/demo/login')
    expect(db.listGroups).not.toHaveBeenCalled()
  })

  test.each(pages)('プロフィールが無い会員は %s から onboarding へ（招待・申請が DB で止まるため先に）', async (_n, open) => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    await expect(open()).rejects.toThrow('redirect:/demo/community/onboarding')
  })

  test('利用目的の再同意が要る会員も onboarding へ', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, needsConsent: true })
    await expect(AnnouncementsPage({ params: { slug: A.slug } })).rejects.toThrow('redirect:/demo/community/onboarding')
  })

  test('会が無い slug は 404', async () => {
    asMemberOfA()
    await expect(AnnouncementsPage({ params: { slug: 'no-such-group' } })).rejects.toThrow('notFound')
    await expect(ThreadsPage({ params: { slug: 'sample' } })).rejects.toThrow('notFound') // 見本の会は会員には無い
  })
})

// =============================================================================
describe('会をまたいだアクセス', () => {
  test.each([
    ['掲示板', () => ThreadsPage({ params: { slug: B.slug } })],
    ['スレッド', () => ThreadPage({ params: { slug: B.slug, id: POST_B_ID } })],
    ['お知らせ 1 件', () => AnnouncementPage({ params: { slug: B.slug, id: POST_B_ID } })],
    ['会員', () => MembersPage({ params: { slug: B.slug } })],
  ])('A の会員が B の %s を開くと、B のお知らせのページへ送られ、B の行を読まない', async (_n, open) => {
    asMemberOfA()
    await expect(open()).rejects.toThrow(`redirect:/demo/community/${B.slug}`)
    expect(db.listPosts).not.toHaveBeenCalled()
    expect(db.listMembers).not.toHaveBeenCalled()
  })

  test('A の会員が B の世話人のページを開くと 404', async () => {
    asMemberOfA('moderator') // A の世話人でも B では 404
    await expect(ManagePage({ params: { slug: B.slug } })).rejects.toThrow('notFound')
    expect(db.listPendingJoinRequests).not.toHaveBeenCalled()
  })

  test('A の会の URL に B の投稿 id を付けても 404（A の一覧の中からしか引かない）', async () => {
    asMemberOfA()
    await expect(ThreadPage({ params: { slug: A.slug, id: POST_B_ID } })).rejects.toThrow('notFound')
    expect(db.listPosts).toHaveBeenCalledWith(A.id, 'thread')
    expect(db.listComments).not.toHaveBeenCalled()
  })

  test('スレッドの id をお知らせの URL で開いても 404（種類をまたがない）', async () => {
    asMemberOfA()
    await expect(AnnouncementPage({ params: { slug: A.slug, id: POST_A.id } })).rejects.toThrow('notFound')
  })

  test('B のお知らせのページは「この会の会員ではありません」＋入会希望フォーム。B の投稿は読まない', async () => {
    asMemberOfA()
    const c = await renderPage(AnnouncementsPage({ params: { slug: B.slug } }))
    expect(c.textContent).toContain('この会の会員ではありません')
    expect(c.querySelector('textarea[name="message"]')).not.toBeNull()
    expect(c.textContent).toContain('入会を申請する')
    // 紹介者の氏名（任意）と、申請中は世話人に氏名が見えることの書き添え（v2）
    const referrer = c.querySelector('input[name="referrerName"]') as HTMLInputElement
    expect(referrer).not.toBeNull()
    expect(referrer.required).toBe(false)
    expect(c.querySelector('label[for="join-referrer"]')?.textContent).toBe('紹介者の氏名（いる場合）')
    expect(c.textContent).toContain('申請中の間は、この会の世話人の方に、プロフィールに登録した氏名と表示名が見えます')
    expect(c.querySelector('nav[aria-label="この会のページ"]')).toBeNull() // 会員向けのタブは出さない
    expect(db.listPosts).not.toHaveBeenCalled()
    expect(db.myJoinRequest).toHaveBeenCalledWith(B.id)
    expectCleanWording(c.innerHTML)
  })

  test('申請中なら、フォームの代わりに「入会を申請しています」', async () => {
    asMemberOfA()
    db.myJoinRequest.mockResolvedValue(ok({ id: 'x', groupId: B.id, userId: 'u', message: '', status: 'pending', createdAt: '2026-09-25T00:00:00Z' }))
    const c = await renderPage(AnnouncementsPage({ params: { slug: B.slug } }))
    expect(c.textContent).toContain('入会を申請しています（2026年9月25日）')
    expect(c.querySelector('textarea[name="message"]')).toBeNull()
  })

  // 書き出し（Route Handler）の検査は group-export.test.ts（node 環境が要るため）
})

// =============================================================================
describe('会員', () => {
  test('お知らせ: 一覧が出て、各お知らせのページへリンクする。世話人のタブは無い', async () => {
    asMemberOfA('member')
    const c = await renderPage(AnnouncementsPage({ params: { slug: A.slug } }))
    expect(c.textContent).toContain('Aのお知らせ')
    expect(c.textContent).not.toContain('Aのスレッド')
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/announcements/${ANN_A.id}"]`)).not.toBeNull()
    const tabs = [...c.querySelectorAll('nav[aria-label="この会のページ"] a')].map((a) => a.textContent)
    // 1 列のタブ（2026-10-02）。会員一覧は世話人だけ（タブに置かない）
    expect(tabs).toEqual(['ホーム', 'お知らせ', '掲示板', '行事', '資料・リンク', '会の約束'])
    // 別の行の導線は無い。スマホ幅では折り返す
    expect(c.querySelectorAll('nav')).toHaveLength(1)
    expect(c.querySelector('nav[aria-label="この会の行事と資料"]')).toBeNull()
    expect(c.querySelector('nav[aria-label="この会のページ"]')!.className).toContain('flex-wrap')
    expect(c.querySelector('a[href$="/members"]')).toBeNull()
    expectCleanWording(c.innerHTML)
  })

  test('お知らせ 1 件: 本文とコメント、コメント欄がある（お知らせにもコメントできる）', async () => {
    asMemberOfA('member')
    const c = await renderPage(AnnouncementPage({ params: { slug: A.slug, id: ANN_A.id } }))
    expect(c.textContent).toContain('Aのお知らせ')
    expect(c.textContent).toContain('コメント本文')
    expect(c.textContent).toContain('名前未設定') // 表示名の無いコメント
    expect(c.querySelector('textarea[name="body"]')).not.toBeNull()
    expectCleanWording(c.innerHTML)
  })

  test('掲示板: スレッドの一覧と、新しいスレッドのフォーム', async () => {
    asMemberOfA('member')
    const c = await renderPage(ThreadsPage({ params: { slug: A.slug } }))
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/threads/${POST_A.id}"]`)).not.toBeNull()
    expect(c.querySelector('input[name="title"]')).not.toBeNull()
    expect(c.textContent).toContain('スレッドを立てる')
    expectCleanWording(c.innerHTML)
  })

  test('会員の一覧: 世話人が見ても表示名のまま（氏名・紹介者・user_id は出ない）', async () => {
    asMemberOfA('moderator')
    db.listMembers.mockResolvedValue(
      ok([{ userId: 'user-secret-1', displayName: 'はなこ', fullName: 'テスト 花子', role: 'moderator', joinedAt: '2026-09-01T00:00:00Z' }])
    )
    const c = await renderPage(MembersPage({ params: { slug: A.slug } }))
    expect(c.textContent).toContain('はなこ')
    expect(c.textContent).not.toContain('テスト 花子')
    expect(c.innerHTML).not.toContain('user-secret')
  })

  test('会員一覧: 一般の会員が開くと、会のお知らせのページへ送られ、会員一覧を読まない', async () => {
    asMemberOfA('member')
    await expect(MembersPage({ params: { slug: A.slug } })).rejects.toThrow(`redirect:/demo/community/${A.slug}`)
    expect(db.listMembers).not.toHaveBeenCalled()
  })

  test('一般の会員の画面（お知らせ・掲示板・スレッド・退会）のどこにも会員一覧へのリンクが無い', async () => {
    asMemberOfA('member')
    for (const p of [
      AnnouncementsPage({ params: { slug: A.slug } }),
      ThreadsPage({ params: { slug: A.slug } }),
      ThreadPage({ params: { slug: A.slug, id: POST_A.id } }),
      LeavePage({ params: { slug: A.slug } }),
    ]) {
      const c = await renderPage(p as Promise<React.ReactElement>)
      expect(c.querySelector('a[href$="/members"]')).toBeNull()
      expect(c.textContent).not.toContain('会員一覧')
    }
  })

  test('スレッドとコメントには、書き手の表示名がこれまでどおり出る', async () => {
    asMemberOfA('member')
    const c = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    expect(c.textContent).toContain('はなこ') // 投稿の書き手
    expect(c.textContent).toContain('名前未設定') // 表示名の無いコメントの書き手
  })

  test('会員一覧（世話人）: 表示名と世話人の印と入会日だけ。user_id・メールは出ない。世話人のページへ戻れる', async () => {
    asMemberOfA('moderator')
    const c = await renderPage(MembersPage({ params: { slug: A.slug } }))
    expect(c.querySelector('h2')?.textContent).toContain('会員一覧')
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/manage"]`)).not.toBeNull()
    expect(c.textContent).toContain('2026年9月1日 入会')
    expect(c.textContent).toContain('はなこ')
    expect(c.textContent).toContain('世話人')
    expect(c.textContent).toContain('名前未設定')
    expect(c.innerHTML).not.toContain('user-secret')
    expect(c.textContent).not.toContain('a@example.com')
    expectCleanWording(c.innerHTML)
  })

  test('一般の会員は世話人のページが 404', async () => {
    asMemberOfA('member')
    await expect(ManagePage({ params: { slug: A.slug } })).rejects.toThrow('notFound')
  })

  test('結果の 1 行: 知っている値だけを文にする（URL の文字をそのまま出さない）', () => {
    expect(flashOf({ done: 'posted' })?.text).toBe('投稿しました。')
    expect(flashOf({ error: 'not_member' })?.text).toBe('この会の会員ではありません')
    expect(flashOf({ error: '<script>' })).toBeNull()
    expect(flashOf({ done: 'toString' })).toBeNull()
  })
})

// =============================================================================
describe('世話人', () => {
  test('入会の申請: 申請した人の表示名が出る。無ければ「名前未設定」。user_id・メールは出ない', async () => {
    asMemberOfA('moderator')
    const c = await renderPage(ManagePage({ params: { slug: A.slug } }))
    const items = [...c.querySelectorAll('h2')].find((h) => h.textContent?.startsWith('入会の申請'))!.closest('section')!.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('さくら')
    expect(items[0].textContent).toContain('よろしくお願いします')
    expect(items[1].textContent).toContain('名前未設定')
    expect(items[1].textContent).toContain('（ひとことはありません）')
    // 審査用の氏名と紹介者の氏名（v2。世話人のページにだけ出る）
    expect(items[0].querySelector('[data-full-name]')?.textContent).toBe('テスト 桜子')
    expect(items[0].querySelector('[data-referrer-name]')?.textContent).toBe('テスト 紹介太郎')
    expect(items[1].querySelector('[data-full-name]')?.textContent).toBe('未登録')
    expect(items[1].querySelector('[data-referrer-name]')?.textContent).toBe('なし')
    expect(c.innerHTML).not.toContain('user-secret')
    expect(c.textContent).not.toContain('@example.com')
  })

  test('招待リンク・入会の申請・お知らせ・書き出しがそろう。申請に user_id は出ない', async () => {
    asMemberOfA('moderator')
    const c = await renderPage(ManagePage({ params: { slug: A.slug } }))
    const headings = [...c.querySelectorAll('h2')].map((h) => h.textContent)
    expect(headings).toEqual(['招待リンクを作る', '入会の申請（2 件）', '会員一覧', '会員の状況', '会の運営', 'お知らせを書く', '書き出し'])
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/members"]`)?.textContent).toBe('会員一覧を見る')
    expect(c.textContent).toContain('よろしくお願いします')
    expect(c.textContent).toContain('承認する')
    expect(c.textContent).toContain('見送る')
    expect(c.innerHTML).not.toContain('user-secret')
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/manage/export"]`)).not.toBeNull()
    const tabs = [...c.querySelectorAll('nav[aria-label="この会のページ"] a')].map((a) => a.textContent)
    expect(tabs).toEqual(['ホーム', 'お知らせ', '掲示板', '行事', '資料・リンク', '会の約束', '世話人のページ'])
    expectCleanWording(c.innerHTML)
  })
})

// =============================================================================
describe('閲覧モード（見本の会だけ。DB を読まない）', () => {
  beforeEach(() => getViewer.mockResolvedValue({ kind: 'demo' }))

  test.each([
    ['お知らせ', () => AnnouncementsPage({ params: { slug: 'sample' } })],
    ['掲示板', () => ThreadsPage({ params: { slug: 'sample' } })],
    ['スレッド', () => ThreadPage({ params: { slug: 'sample', id: SAMPLE_POSTS.find((p) => p.kind === 'thread')!.id } })],
    ['お知らせ 1 件', () => AnnouncementPage({ params: { slug: 'sample', id: SAMPLE_POSTS[0].id } })],
    ['会員一覧（世話人の見本）', () => MembersPage({ params: { slug: 'sample' } })],
  ])('%s: 見本だけが出て、フォームが無く、tenancy.ts を 1 つも呼ばない', async (_n, open) => {
    const c = await renderPage(open() as Promise<React.ReactElement>)
    expect(c.textContent).toContain('プロトタイプの閲覧モードです')
    expect(c.textContent).toContain('サンプルの会')
    expect(c.querySelector('form')).toBeNull()
    for (const m of Object.values(db)) expect(m).not.toHaveBeenCalled()
    expectCleanWording(c.innerHTML)
  })

  test('見本の会以外の slug は 404（実在の会の中身を見せない）', async () => {
    await expect(AnnouncementsPage({ params: { slug: A.slug } })).rejects.toThrow('notFound')
    await expect(ThreadsPage({ params: { slug: B.slug } })).rejects.toThrow('notFound')
    for (const m of Object.values(db)) expect(m).not.toHaveBeenCalled()
  })

  test('一般会員の見本のタブに会員一覧は無く、世話人のページ（見本）からだけ開ける', async () => {
    const c = await renderPage(AnnouncementsPage({ params: { slug: 'sample' } }))
    const tabs = [...c.querySelectorAll('nav[aria-label="この会のページ"] a')].map((a) => a.textContent)
    expect(tabs).toEqual(['ホーム', 'お知らせ', '掲示板', '行事', '資料・リンク', '会の約束', '世話人のページ（見本）'])
    expect(c.querySelector('a[href$="/members"]')).toBeNull()

    const m = await renderPage(ManagePage({ params: { slug: 'sample' } }))
    expect(m.textContent).toContain('世話人の方が使う画面の見本です')
    expect(m.querySelector('form')).toBeNull() // 見本では操作できない
    expect(m.querySelector('a[href="/demo/community/sample/members"]')?.textContent).toBe('会員一覧を見る')
    expect(m.textContent).not.toContain('退会') // 見本には退会の入口を出さない
    for (const x of Object.values(db)) expect(x).not.toHaveBeenCalled()
    expectCleanWording(m.innerHTML)
  })

  test('見本の内容に実在の会の名前が入っていない', () => {
    const text = JSON.stringify(SAMPLE_POSTS) + SAMPLE_GROUP.name
    const real = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'patient_groups', 'patient_groups.json'), 'utf-8'))
      .groups.map((g: { name: string }) => g.name)
    for (const n of real) expect(text).not.toContain(n)
  })
})

// =============================================================================
describe('server action', () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(o)) f.set(k, v)
    return f
  }

  test('閲覧モード・未ログインでは tenancy.ts を呼ばない', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(requestJoinAction(A.slug, fd({ message: 'x' }))).rejects.toThrow('redirect:/demo/login')
      await expect(createThreadAction(A.slug, fd({ title: 't', body: 'b' }))).rejects.toThrow('redirect:/demo/login')
      expect(await createInvitationAction(A.slug, 14)).toEqual({ ok: false, message: 'ログインしてください' })
    }
    expect(db.requestJoin).not.toHaveBeenCalled()
    expect(db.createPost).not.toHaveBeenCalled()
    expect(db.createInvitation).not.toHaveBeenCalled()
  })

  test('入会の申請: 会の id は slug からサーバー側で引く。済んだら ?done=requested', async () => {
    asMemberOfA()
    db.requestJoin.mockResolvedValue(ok({ requestId: 'r1' }))
    await expect(requestJoinAction(B.slug, fd({ message: 'よろしく', referrerName: 'テスト 紹介太郎' }))).rejects.toThrow(
      `redirect:/demo/community/${B.slug}?done=requested`
    )
    expect(db.requestJoin).toHaveBeenCalledWith(B.id, 'よろしく', 'テスト 紹介太郎')
    // 紹介者の氏名は任意。書かなければ空のまま渡す（空は tenancy.ts が「書かれていない」にする）
    await expect(requestJoinAction(B.slug, fd({ message: '' }))).rejects.toThrow('?done=requested')
    expect(db.requestJoin).toHaveBeenLastCalledWith(B.id, '', '')
  })

  test('入会の申請: プロフィールが無いと DB が止める → onboarding へ', async () => {
    asMemberOfA()
    db.requestJoin.mockResolvedValue({ ok: false, reason: 'profile_required' })
    await expect(requestJoinAction(B.slug, fd({}))).rejects.toThrow('redirect:/demo/community/onboarding')
  })

  test('会員でない会への投稿は ?error=not_member で戻る', async () => {
    asMemberOfA()
    // 投稿は分類つき（_lib/community.ts の createPostWithMeta）。書く前に本人の所属を確かめ、B には書かない
    await expect(createThreadAction(B.slug, fd({ title: 't', body: 'b' }))).rejects.toThrow(
      `redirect:/demo/community/${B.slug}/threads?error=not_member`
    )
    expect(db.createPost).not.toHaveBeenCalled()
  })

  test('コメント: 種類の値が変なら tenancy.ts を呼ばない', async () => {
    asMemberOfA()
    await expect(createCommentAction(A.slug, 'x' as 'threads', POST_A.id, fd({ body: 'b' }))).rejects.toThrow('?error=invalid_input')
    expect(db.createComment).not.toHaveBeenCalled()
  })

  test('招待リンク: 返すのはパスだけ（token は URL の ? に載せない）', async () => {
    asMemberOfA('moderator')
    db.createInvitation.mockResolvedValue(ok({ token: 'ab'.repeat(16), groupId: A.id, expiresAt: '2026-10-10T00:00:00Z' }))
    expect(await createInvitationAction(A.slug, 14)).toEqual({ ok: true, path: `/demo/community/invite/${'ab'.repeat(16)}`, expiresAt: '2026-10-10T00:00:00Z' })
    expect(db.createInvitation).toHaveBeenCalledWith(A.id, 14)
  })

  test('招待の受諾: 入った会のお知らせのページへ ?done=joined', async () => {
    asMemberOfA()
    db.acceptInvitation.mockResolvedValue(ok({ groupId: B.id }))
    await expect(acceptInvitationAction('ab'.repeat(16))).rejects.toThrow(`redirect:/demo/community/${B.slug}?done=joined`)
  })
})

// =============================================================================
describe('招待の受け口', () => {
  const token = 'ab'.repeat(16)

  test('プロフィールが無いと、受諾のボタンを出さずにプロフィールへ誘導', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    const c = await renderPage(InvitationPage({ params: { token } }))
    expect(c.querySelector('a[href="/demo/community/onboarding?from=invite"]')).not.toBeNull()
    expect(c.querySelector('form')).toBeNull()
    expectCleanWording(c.innerHTML)
  })

  test('プロフィールがあれば、ボタンを押したときだけ受ける（開いただけでは受けない）', async () => {
    getViewer.mockResolvedValue(MEMBER)
    const c = await renderPage(InvitationPage({ params: { token } }))
    expect(c.querySelector('form button')?.textContent).toBe('招待を受ける')
    expect(c.textContent).toContain('ほかの会員には表示名だけが見えます。氏名は運営だけが見ます。')
    expect(c.textContent).not.toContain('本名は見えません')
    expect(db.acceptInvitation).not.toHaveBeenCalled()
    expectCleanWording(c.innerHTML)
  })

  test('閲覧モードは 404、未ログインは /demo/login', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(InvitationPage({ params: { token } })).rejects.toThrow('notFound')
    getViewer.mockResolvedValue(null)
    await expect(InvitationPage({ params: { token } })).rejects.toThrow('redirect:/demo/login')
  })
})

// =============================================================================
describe('会員バーの「所属している会」', () => {
  async function bar() {
    return render(await CommunityLayout({ children: <main>本文</main> })).container
  }

  test('所属が 1 つなら、その会へのリンクだけ（切り替えは無い）', async () => {
    asMemberOfA()
    getMyProfile.mockResolvedValue({ displayName: 'はなこ' })
    const c = await bar()
    expect(c.querySelector('[data-group-switcher]')).toBeNull()
    expect(c.querySelector('a[data-my-group]')?.getAttribute('href')).toBe(`/demo/community/${A.slug}`)
    // 既存のメニュー（マイページ／ログアウト）は変わらない
    expect([...c.querySelectorAll('details[data-member-menu] a, details[data-member-menu] button')].map((e) => e.textContent)).toEqual(['マイページ', 'ログアウト'])
  })

  test('所属が 2 つ以上なら切り替えのメニュー', async () => {
    getViewer.mockResolvedValue(MEMBER)
    getMyProfile.mockResolvedValue({ displayName: 'はなこ' })
    db.myGroups.mockResolvedValue(ok([{ ...A, role: 'member', joinedAt: 'x' }, { ...B, role: 'moderator', joinedAt: 'y' }]))
    const c = await bar()
    const sw = c.querySelector('details[data-group-switcher]')!
    expect(sw).not.toBeNull()
    expect([...sw.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([`/demo/community/${A.slug}`, `/demo/community/${B.slug}`])
    expectCleanWording(c.innerHTML)
  })

  test('所属が無い・読めないときは出さない', async () => {
    getViewer.mockResolvedValue(MEMBER)
    getMyProfile.mockResolvedValue({ displayName: 'はなこ' })
    db.myGroups.mockResolvedValue(ok([]))
    let c = await bar()
    expect(c.querySelector('[data-my-group], [data-group-switcher]')).toBeNull()
    db.myGroups.mockRejectedValue(new Error('network'))
    c = await bar()
    expect(c.querySelector('[data-my-group], [data-group-switcher]')).toBeNull()
  })

  test('プロフィールが無い会員には出さない（所属を読みに行かない）', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, hasProfile: false })
    await bar()
    expect(db.myGroups).not.toHaveBeenCalled()
  })

  test('閲覧モードは見本の会だけ。DB を読まない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const c = await bar()
    expect(c.querySelector('a[data-my-group]')?.getAttribute('href')).toBe('/demo/community/sample')
    expect(c.querySelector('a[data-my-group]')?.textContent).toBe('サンプルの会')
    expect(db.myGroups).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('投稿・コメントの削除ボタン', () => {
  // POST_A の author は user-secret-1、コメント c1 の author は user-secret-2
  const delLabels = (c: HTMLElement) => [...c.querySelectorAll('details[data-delete] summary')].map((s) => s.textContent)

  test('一般の会員: 自分の投稿には出て、他人のコメントには出ない', async () => {
    asMemberOfA('member')
    const c = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    expect(delLabels(c)).toEqual(['この投稿を削除'])
    expectCleanWording(c.innerHTML)
  })

  test('一般の会員: 他人の投稿には出ず、自分のコメントには出る', async () => {
    asMemberOfA('member')
    currentUserId = 'user-secret-2'
    const c = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    expect(delLabels(c)).toEqual(['このコメントを削除'])
  })

  test('本人の id を読めないときは、一般の会員には出さない', async () => {
    asMemberOfA('member')
    currentUserId = null
    const c = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    expect(delLabels(c)).toEqual([])
  })

  test('世話人: その会の投稿・コメントすべてに出る（お知らせにも）', async () => {
    asMemberOfA('moderator')
    currentUserId = 'someone-else'
    const t = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    expect(delLabels(t)).toEqual(['この投稿を削除', 'このコメントを削除'])
    const a = await renderPage(AnnouncementPage({ params: { slug: A.slug, id: ANN_A.id } }))
    expect(delLabels(a)).toEqual(['この投稿を削除', 'このコメントを削除'])
  })

  test('閲覧モード: 出さない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const c = await renderPage(ThreadPage({ params: { slug: 'sample', id: SAMPLE_POSTS.find((p) => p.kind === 'thread')!.id } }))
    expect(delLabels(c)).toEqual([])
  })

  test('削除は確認つき（開くと「削除する」の確定ボタン）', async () => {
    asMemberOfA('member')
    const c = await renderPage(ThreadPage({ params: { slug: A.slug, id: POST_A.id } }))
    const d = c.querySelector('details[data-delete]')!
    expect(d.hasAttribute('open')).toBe(false)
    expect(d.querySelector('form button')?.textContent).toBe('削除する')
  })

  test('投稿の削除: 済んだら一覧へ ?done=deleted。DB が断ったら ?error で投稿へ戻る', async () => {
    asMemberOfA('member')
    db.deletePost.mockResolvedValue(ok(null))
    await expect(deletePostAction(A.slug, 'threads', POST_A.id)).rejects.toThrow(`redirect:/demo/community/${A.slug}/threads?done=deleted`)
    await expect(deletePostAction(A.slug, 'announcements', ANN_A.id)).rejects.toThrow(`redirect:/demo/community/${A.slug}/announcements?done=deleted`)
    db.deletePost.mockResolvedValue({ ok: false, reason: 'forbidden' })
    await expect(deletePostAction(A.slug, 'threads', POST_A.id)).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/threads/${POST_A.id}?error=forbidden`
    )
    expect(db.deletePost).toHaveBeenCalledWith(POST_A.id)
  })

  test('コメントの削除: 済んだら投稿へ ?done=comment_deleted。id の形が違えば呼ばない', async () => {
    asMemberOfA('member')
    const cid = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    db.deleteComment.mockResolvedValue(ok(null))
    await expect(deleteCommentAction(A.slug, 'threads', POST_A.id, cid)).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/threads/${POST_A.id}?done=comment_deleted`
    )
    expect(db.deleteComment).toHaveBeenCalledWith(cid)
    db.deleteComment.mockClear()
    await expect(deleteCommentAction(A.slug, 'threads', POST_A.id, 'not-a-uuid')).rejects.toThrow('?error=invalid_input')
    expect(db.deleteComment).not.toHaveBeenCalled()
  })

  test('閲覧モードでは削除の action が tenancy.ts を呼ばない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(deletePostAction('sample', 'threads', POST_A.id)).rejects.toThrow('redirect:/demo/login')
    expect(db.deletePost).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('退会', () => {
  test('会員のページの末尾に「この会を退会する」。閲覧モードには無い', async () => {
    asMemberOfA('member')
    const c = await renderPage(AnnouncementsPage({ params: { slug: A.slug } }))
    expect(c.querySelector(`a[href="/demo/community/${A.slug}/leave"]`)?.textContent).toBe('この会を退会する')
    getViewer.mockResolvedValue({ kind: 'demo' })
    const d = await renderPage(AnnouncementsPage({ params: { slug: 'sample' } }))
    expect(d.textContent).not.toContain('退会')
  })

  test('確認画面: 説明と「退会する」ボタン。開いただけでは退会しない', async () => {
    asMemberOfA('member')
    const c = await renderPage(LeavePage({ params: { slug: A.slug } }))
    expect(c.textContent).toContain('この会を退会しますか')
    expect(c.querySelector('form button')?.textContent).toBe('退会する')
    expect(c.querySelector(`a[href="/demo/community/${A.slug}"]`)).not.toBeNull()
    expect(db.leaveGroup).not.toHaveBeenCalled()
    expectCleanWording(c.innerHTML)
  })

  test('確認画面: 閲覧モードは 404、会員でない会はお知らせのページへ、未ログインは /demo/login', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(LeavePage({ params: { slug: 'sample' } })).rejects.toThrow('notFound')
    asMemberOfA()
    await expect(LeavePage({ params: { slug: B.slug } })).rejects.toThrow(`redirect:/demo/community/${B.slug}`)
    getViewer.mockResolvedValue(null)
    await expect(LeavePage({ params: { slug: A.slug } })).rejects.toThrow('redirect:/demo/login')
  })

  test('最後の世話人: 確認画面へ ?error=last_moderator で戻り、土台の文言が出る', async () => {
    asMemberOfA('moderator')
    db.leaveGroup.mockResolvedValue({ ok: false, reason: 'last_moderator' })
    await expect(leaveGroupAction(A.slug)).rejects.toThrow(`redirect:/demo/community/${A.slug}/leave?error=last_moderator`)
    expect(db.leaveGroup).toHaveBeenCalledWith(A.id)
    const c = await renderPage(LeavePage({ params: { slug: A.slug }, searchParams: { error: 'last_moderator' } }))
    const { FAILURE_MESSAGES } = jest.requireActual('@/lib/portal/tenancy')
    expect(c.querySelector('[role="alert"]')?.textContent).toBe(FAILURE_MESSAGES.last_moderator)
  })

  test('退会できたら会のお知らせのページへ ?done=left。そこは会員でない人の表示で「退会しました」', async () => {
    asMemberOfA('member')
    db.leaveGroup.mockResolvedValue(ok(null))
    await expect(leaveGroupAction(A.slug)).rejects.toThrow(`redirect:/demo/community/${A.slug}?done=left`)
    db.myGroups.mockResolvedValue(ok([]))
    const c = await renderPage(AnnouncementsPage({ params: { slug: A.slug }, searchParams: { done: 'left' } }))
    expect(c.textContent).toContain('この会を退会しました。')
    expect(c.textContent).toContain('この会の会員ではありません')
  })

  test('閲覧モードでは退会の action が tenancy.ts を呼ばない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(leaveGroupAction('sample')).rejects.toThrow('redirect:/demo/login')
    expect(db.leaveGroup).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('世話人の任命・解除（会員一覧）', () => {
  // 既定の会員一覧: user-secret-1（はなこ・世話人）と user-secret-2（表示名なし・一般会員）。本人は user-secret-1
  const rows = (c: HTMLElement) => [...c.querySelectorAll('ul li')]
  const labels = (li: Element) => [...li.querySelectorAll('details[data-role-change] summary')].map((x) => x.textContent)

  test('世話人の行には「世話人から外す」、一般会員の行には「世話人にする」。確認つき', async () => {
    asMemberOfA('moderator')
    currentUserId = 'someone-else'
    const c = await renderPage(MembersPage({ params: { slug: A.slug } }))
    const [mod, member] = rows(c)
    expect(labels(mod)).toEqual(['世話人から外す'])
    expect(labels(member)).toEqual(['世話人にする'])
    const d = member.querySelector('details[data-role-change]')!
    expect(d.hasAttribute('open')).toBe(false)
    expect(d.querySelector('form button')?.textContent).toBe('世話人にする')
    expect(d.textContent).toContain('表示名の無い会員を世話人にします') // 「名前未設定さん」とは呼ばない
    expect(mod.querySelector('details')!.textContent).toContain('はなこさんを世話人から外し')
    expect(c.innerHTML).not.toContain('user-secret') // user_id は画面の文字に出さない
    expect(db.appointModerator).not.toHaveBeenCalled()
    expectCleanWording(c.innerHTML)
  })

  test('自分の行は「（あなた）」と「自分を世話人から外す」', async () => {
    asMemberOfA('moderator')
    const c = await renderPage(MembersPage({ params: { slug: A.slug } }))
    const [me] = rows(c)
    expect(me.textContent).toContain('（あなた）')
    expect(labels(me)).toEqual(['自分を世話人から外す'])
    expect(me.querySelector('details')!.textContent).toContain('世話人のページと会員一覧は見られなくなります')
  })

  test('閲覧モードではボタンを出さない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const c = await renderPage(MembersPage({ params: { slug: 'sample' } }))
    expect(rows(c).length).toBeGreaterThan(0)
    expect(c.querySelector('details[data-role-change]')).toBeNull()
    expect(c.querySelector('form')).toBeNull()
  })

  test('user_id が無い行（古い DB の戻り）にはボタンを出さない', async () => {
    asMemberOfA('moderator')
    db.listMembers.mockResolvedValue(ok([{ userId: null, displayName: 'だれか', role: 'member', joinedAt: '2026-09-01T00:00:00Z' }]))
    const c = await renderPage(MembersPage({ params: { slug: A.slug } }))
    expect(c.querySelector('details[data-role-change]')).toBeNull()
  })

  test('任命: 会の id は slug から引く。済んだら会員一覧へ ?done=appointed', async () => {
    asMemberOfA('moderator')
    db.appointModerator.mockResolvedValue(ok(null))
    await expect(appointModeratorAction(A.slug, 'user-secret-2')).rejects.toThrow(`redirect:/demo/community/${A.slug}/members?done=appointed`)
    expect(db.appointModerator).toHaveBeenCalledWith(A.id, 'user-secret-2')
  })

  test('解除: 済んだら会員一覧へ ?done=dismissed。自分を外したら会のお知らせのページへ', async () => {
    asMemberOfA('moderator')
    db.dismissModerator.mockResolvedValue(ok(null))
    await expect(dismissModeratorAction(A.slug, 'user-secret-3', false)).rejects.toThrow(`redirect:/demo/community/${A.slug}/members?done=dismissed`)
    await expect(dismissModeratorAction(A.slug, 'user-secret-1', true)).rejects.toThrow(`redirect:/demo/community/${A.slug}?done=dismissed_self`)
    expect(db.dismissModerator).toHaveBeenCalledWith(A.id, 'user-secret-1')
  })

  test('最後の 1 人（自分を含む）: 土台の last_moderator の文言を会員一覧に出す', async () => {
    asMemberOfA('moderator')
    db.dismissModerator.mockResolvedValue({ ok: false, reason: 'last_moderator' })
    await expect(dismissModeratorAction(A.slug, 'user-secret-1', true)).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/members?error=last_moderator`
    )
    const c = await renderPage(MembersPage({ params: { slug: A.slug }, searchParams: { error: 'last_moderator' } }))
    const { FAILURE_MESSAGES } = jest.requireActual('@/lib/portal/tenancy')
    expect(c.querySelector('[role="alert"]')?.textContent).toBe(FAILURE_MESSAGES.last_moderator)
  })

  test('世話人でない・閲覧モード・未ログインでは土台を呼ばない（呼んでも DB 関数が断る）', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(appointModeratorAction(A.slug, 'user-secret-2')).rejects.toThrow('redirect:/demo/login')
      await expect(dismissModeratorAction(A.slug, 'user-secret-1', false)).rejects.toThrow('redirect:/demo/login')
    }
    expect(db.appointModerator).not.toHaveBeenCalled()
    expect(db.dismissModerator).not.toHaveBeenCalled()

    asMemberOfA('member')
    db.appointModerator.mockResolvedValue({ ok: false, reason: 'forbidden' })
    await expect(appointModeratorAction(A.slug, 'user-secret-2')).rejects.toThrow('?error=forbidden')
  })
})
