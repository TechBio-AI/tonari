/**
 * 会員エリアの追加機能（2026-10-02 ファウンダー指示。20261013〜20261016）の画面の検査
 *
 * DB には接続しない。tenancy.ts・行事の読み込み・_lib/community.ts の DB に触れる関数を差し替える。
 *   1. ホーム: 歓迎文・最新のお知らせ 3 件・これからの行事 3 件・固定スレッドの出し分け
 *   2. 掲示板の分類: 立てるときの選択、絞り込み、知らない値
 *   3. 固定: 世話人だけ。ボタンと action
 *   4. お知らせの「公開ページにも出す」: 注意文、is_public が渡ること
 *   5. 通報: 会員だけ・閲覧モードには無い、理由 200 文字、二重送信は「すでに通報しています」、通報者がどこにも出ないこと
 *   6. 会の約束: 運営の共通文（6 項目）＋会の約束。編集は世話人だけ
 *   7. 世話人のページの入口（行事・リンク・通報・会の約束）
 *   8. マイページの自分の投稿・コメント
 *   9. 権限（会員でない人・一般会員・閲覧モード）と禁止表現
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const t = {
  listGroups: jest.fn(),
  myGroups: jest.fn(),
  listPosts: jest.fn(),
  listComments: jest.fn(),
  myJoinRequest: jest.fn(),
  listPendingJoinRequests: jest.fn(),
}
jest.mock('@/lib/portal/tenancy', () => {
  const actual = jest.requireActual('@/lib/portal/tenancy')
  const names = ['listGroups', 'myGroups', 'listPosts', 'listComments', 'myJoinRequest', 'listPendingJoinRequests']
  const wrapped: Record<string, unknown> = {}
  for (const k of names) wrapped[k] = (...a: unknown[]) => (t as Record<string, jest.Mock>)[k](...a)
  return { ...actual, ...wrapped }
})

const listEvents = jest.fn()
jest.mock('@/lib/portal/group-events-db', () => ({ listEvents: (...a: unknown[]) => listEvents(...a) }))

const c = {
  listPostsWithMeta: jest.fn(),
  createPostWithMeta: jest.fn(),
  pinPost: jest.fn(),
  postMeta: jest.fn(),
  getGroupSettings: jest.fn(),
  saveRulesText: jest.fn(),
  reportContent: jest.fn(),
  listReports: jest.fn(),
  markReportHandled: jest.fn(),
  listMyContents: jest.fn(),
}
jest.mock('../community/[slug]/_lib/community', () => {
  const actual = jest.requireActual('../community/[slug]/_lib/community')
  const names = ['listPostsWithMeta', 'createPostWithMeta', 'pinPost', 'postMeta', 'getGroupSettings', 'saveRulesText', 'reportContent', 'listReports', 'markReportHandled', 'listMyContents']
  const wrapped: Record<string, unknown> = {}
  for (const k of names) wrapped[k] = (...a: unknown[]) => (c as Record<string, jest.Mock>)[k](...a)
  return { ...actual, ...wrapped }
})

let currentUserId: string | null = 'u-me'
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUserId ? { id: currentUserId } : null } }) } }),
}))

// マイページの描画に要るもの
let profilePrefecture: string | null = '長野県'
jest.mock('@/lib/portal/member-profile', () => ({
  ...jest.requireActual('@/lib/portal/member-profile'),
  getMyProfile: async () => (profilePrefecture === null ? null : {
    userId: 'u-me', fullName: 'テスト 花子', displayName: 'はなこ', registrantType: 'self', proxyRelation: null,
    patientIsMinor: null, ageBand: '30代', gender: '答えない', prefecture: profilePrefecture, consentedAt: '2026-09-26T03:00:00Z',
  }),
}))
jest.mock('@/lib/portal/research-contact', () => ({
  ...jest.requireActual('@/lib/portal/research-contact'),
  getMyResearchContact: async () => ({ state: 'none', consentedAt: null, diseases: [] }),
  getMyGroupDiseaseIdxs: async () => [],
}))

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

import { FAILURE_MESSAGES } from '@/lib/portal/tenancy'
import { PUBLIC_NOTICE } from '@/lib/portal/group-events'

import HomePage from '../community/[slug]/page'
import ThreadsPage from '../community/[slug]/threads/page'
import ThreadPage from '../community/[slug]/threads/[id]/page'
import AnnouncementPage from '../community/[slug]/announcements/[id]/page'
import AnnouncementsPage from '../community/[slug]/announcements/page'
import ManagePage from '../community/[slug]/manage/page'
import ReportsPage from '../community/[slug]/manage/reports/page'
import ManageRulesPage from '../community/[slug]/manage/rules/page'
import RulesPage from '../community/[slug]/rules/page'
import MemberProfilePage from '../community/profile/page'
import {
  createAnnouncementAction,
  createThreadAction,
  markReportHandledAction,
  pinPostAction,
  reportAction,
  saveRulesAction,
} from '../community/[slug]/actions'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, PUBLIC_POST_NOTICE } from '../community/[slug]/_lib/community'
import { TAB_IDLE_CLASS, TAB_SELECTED_CLASS, flashOf } from '../community/[slug]/_components/GroupShell'
import { SAMPLE_POSTS } from '../community/_components/sample-group'

// ---- 架空のデータ ------------------------------------------------------------------
const A = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会A' }
const B = { id: '22222222-2222-4222-8222-222222222222', slug: 'gaucher-japan', name: 'テストの会B' }
const MEMBER = { kind: 'member', email: 'a@example.com', hasProfile: true, needsConsent: false }
const ok = <T,>(value: T) => ({ ok: true, value })
const uuid = (n: number) => `${String(n).repeat(8).slice(0, 8)}-aaaa-4aaa-8aaa-${String(n).repeat(12).slice(0, 12)}`

const post = (n: number, kind: 'thread' | 'announcement', extra: Record<string, unknown> = {}) => ({
  id: uuid(n),
  groupId: A.id,
  authorId: 'u-other',
  authorDisplayName: 'はなこ',
  kind,
  title: `${kind === 'thread' ? 'スレッド' : 'お知らせ'}${n}`,
  body: `本文${n}`,
  createdAt: `2026-09-${String(10 + n).padStart(2, '0')}T00:00:00Z`,
  updatedAt: `2026-09-${String(10 + n).padStart(2, '0')}T00:00:00Z`,
  ...extra,
})
const withMeta = (p: ReturnType<typeof post>, category = 'other', pinned = false, isPublic = false) => ({ ...p, category, pinned, isPublic })

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))
const clean = (html: string) => expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])

function as(role: 'member' | 'moderator') {
  getViewer.mockResolvedValue(MEMBER)
  t.myGroups.mockResolvedValue(ok([{ ...A, role, joinedAt: '2026-09-01T00:00:00Z' }]))
}
async function renderPage(p: Promise<unknown>) {
  return render((await p) as React.ReactElement).container
}
const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

beforeEach(() => {
  currentUserId = 'u-me'
  profilePrefecture = '長野県'
  getViewer.mockReset()
  for (const m of [...Object.values(t), ...Object.values(c)]) m.mockReset()
  listEvents.mockReset()
  t.listGroups.mockResolvedValue(ok([A, B]))
  t.myJoinRequest.mockResolvedValue(ok(null))
  t.listPendingJoinRequests.mockResolvedValue(ok([]))
  t.listPosts.mockResolvedValue(ok([]))
  t.listComments.mockResolvedValue(ok([]))
  c.listPostsWithMeta.mockResolvedValue(ok([]))
  c.getGroupSettings.mockResolvedValue({ welcomeText: null, rulesText: null })
  c.postMeta.mockResolvedValue({ category: 'other', pinned: false, isPublic: false })
  listEvents.mockResolvedValue(ok([]))
})

// =============================================================================
describe('ホーム', () => {
  test('何も無ければ: 歓迎文・行事・固定の節は出さず、お知らせは「まだありません」', async () => {
    as('member')
    const el = await renderPage(HomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-welcome]')).toBeNull()
    expect(el.querySelector('[data-home-events]')).toBeNull()
    expect(el.querySelector('[data-home-pinned]')).toBeNull()
    expect(el.querySelector('[data-home-announcements]')!.textContent).toContain('お知らせはまだありません。')
    clean(el.innerHTML)
  })

  test('そろっていれば: 歓迎文・最新のお知らせ 3 件・これからの行事 3 件（終わったものは出さない）・固定スレッド', async () => {
    as('member')
    c.getGroupSettings.mockResolvedValue({ welcomeText: 'ようこそ。ゆっくりしていってください。', rulesText: null })
    t.listPosts.mockResolvedValue(ok([5, 4, 3, 2, 1].map((n) => post(n, 'announcement'))))
    listEvents.mockResolvedValue(
      ok([
        { id: 'e0', title: '終わった行事', startsAt: '2020-01-01T00:00:00Z', endsAt: null },
        ...[1, 2, 3, 4].map((n) => ({ id: `e${n}`, title: `行事${n}`, startsAt: `2099-0${n}-01T01:00:00Z`, endsAt: null })),
      ])
    )
    c.listPostsWithMeta.mockResolvedValue(ok([withMeta(post(7, 'thread'), 'daily', true), withMeta(post(8, 'thread'))]))
    const el = await renderPage(HomePage({ params: { slug: A.slug } }))

    expect(el.querySelector('[data-home-welcome]')!.textContent).toBe('ようこそ。ゆっくりしていってください。')
    const ann = el.querySelector('[data-home-announcements]')!
    expect([...ann.querySelectorAll('li')].map((li) => li.querySelector('p')?.textContent)).toEqual(['お知らせ5', 'お知らせ4', 'お知らせ3'])
    expect(ann.querySelector(`a[href="/demo/community/${A.slug}/announcements"]`)).not.toBeNull()

    const ev = el.querySelector('[data-home-events]')!
    expect([...ev.querySelectorAll('li')].map((li) => li.querySelector('p')?.textContent)).toEqual(['行事1', '行事2', '行事3'])
    expect(ev.textContent).not.toContain('終わった行事')
    expect(ev.querySelector(`a[href="/demo/community/${A.slug}/events"]`)).not.toBeNull()

    const pin = el.querySelector('[data-home-pinned]')!
    expect(pin.textContent).toContain('スレッド7')
    expect(pin.textContent).not.toContain('スレッド8')
    clean(el.innerHTML)
  })

  test('歓迎文・行事・固定が読めなくても、ホームは出る（その節を出さない）', async () => {
    as('member')
    c.getGroupSettings.mockResolvedValue(null)
    listEvents.mockRejectedValue(new Error('network'))
    c.listPostsWithMeta.mockResolvedValue({ ok: false, reason: 'failed' })
    const el = await renderPage(HomePage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-home-announcements]')).not.toBeNull()
    expect(el.querySelector('[data-home-welcome], [data-home-events], [data-home-pinned]')).toBeNull()
  })

  test('相談窓口へのリンク: 本人の都道府県を付ける。プロフィールが無ければ付けない', async () => {
    as('member')
    let el = await renderPage(HomePage({ params: { slug: A.slug } }))
    const href = () => el.querySelector('[data-home-support] a')?.getAttribute('href')
    expect(href()).toBe(`/demo/support-centers?pref=${encodeURIComponent('長野県')}`)
    expect(el.querySelector('[data-home-support] a')?.textContent).toBe('お住まいの都道府県の相談窓口')
    profilePrefecture = null
    el = await renderPage(HomePage({ params: { slug: A.slug } }))
    expect(href()).toBe('/demo/support-centers')
  })

  test('閲覧モード: 見本のお知らせだけ。設定・行事・掲示板を読まない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const el = await renderPage(HomePage({ params: { slug: 'sample' } }))
    expect(el.querySelector('[data-home-announcements]')!.textContent).toContain(SAMPLE_POSTS[0].title)
    expect(c.getGroupSettings).not.toHaveBeenCalled()
    expect(listEvents).not.toHaveBeenCalled()
    expect(c.listPostsWithMeta).not.toHaveBeenCalled()
  })

  test('お知らせの一覧は /announcements（公開しているものに印）', async () => {
    as('member')
    c.listPostsWithMeta.mockResolvedValue(ok([withMeta(post(1, 'announcement'), 'other', false, true), withMeta(post(2, 'announcement'))]))
    const el = await renderPage(AnnouncementsPage({ params: { slug: A.slug } }))
    const items = [...el.querySelectorAll('ul li')]
    expect(items.map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      `/demo/community/${A.slug}/announcements/${uuid(2)}`,
      `/demo/community/${A.slug}/announcements/${uuid(1)}`,
    ])
    expect(items[1].querySelector('[data-badges]')?.textContent).toBe('公開ページにも表示')
    expect(items[0].querySelector('[data-badges]')).toBeNull()
  })
})

// =============================================================================
describe('掲示板の分類', () => {
  test('立てるフォームに 5 つの分類（既定は「その他」）', async () => {
    as('member')
    const el = await renderPage(ThreadsPage({ params: { slug: A.slug } }))
    const select = el.querySelector('select[name="category"]') as HTMLSelectElement
    expect([...select.options].map((o) => o.textContent)).toEqual(['日常の工夫', '制度と手続き', '通院と治療の経験', '家族のこと', 'その他'])
    expect(select.value).toBe('other')
    expect(POST_CATEGORIES.map((k) => POST_CATEGORY_LABELS[k])).toEqual(['日常の工夫', '制度と手続き', '通院と治療の経験', '家族のこと', 'その他'])
  })

  test('?category= で絞り込む。固定を先に、分類と「固定」の印を付ける', async () => {
    as('member')
    c.listPostsWithMeta.mockResolvedValue(
      ok([withMeta(post(1, 'thread'), 'family', true), withMeta(post(2, 'thread'), 'daily'), withMeta(post(3, 'thread'), 'family')])
    )
    let el = await renderPage(ThreadsPage({ params: { slug: A.slug }, searchParams: { category: 'family' } }))
    const titles = () => [...el.querySelectorAll('ul li a p.text-lg')].map((p) => p.textContent)
    expect(titles()).toEqual(['スレッド1', 'スレッド3'])
    expect(el.querySelector('ul li [data-badges]')!.textContent).toBe('固定家族のこと')
    const current = el.querySelector('[data-category-filter] [aria-current="page"]')
    expect(current?.textContent).toBe('家族のこと')
    // 選択中の色はタブの選択中と同じ
    expect(current!.className).toContain(TAB_SELECTED_CLASS)
    const tabSelected = el.querySelector('nav[aria-label="この会のページ"] [aria-current="page"]')!
    expect(tabSelected.className).toContain(TAB_SELECTED_CLASS)
    expect(el.querySelector('[data-category-filter] a:not([aria-current])')!.className).toContain(TAB_IDLE_CLASS)

    el = await renderPage(ThreadsPage({ params: { slug: A.slug }, searchParams: { category: '<script>' } }))
    expect(titles()).toEqual(['スレッド1', 'スレッド2', 'スレッド3']) // 知らない値は「すべて」
    expect(el.querySelector('[data-category-filter] [aria-current="page"]')?.textContent).toBe('すべて')
  })

  test('その分類にスレッドが無ければ、その旨', async () => {
    as('member')
    const el = await renderPage(ThreadsPage({ params: { slug: A.slug }, searchParams: { category: 'system' } }))
    expect(el.textContent).toContain('この分類のスレッドはまだありません。')
  })

  test('action: 分類を渡す。空なら「その他」。知らない値は書かない', async () => {
    as('member')
    c.createPostWithMeta.mockResolvedValue(ok({ postId: uuid(9) }))
    await expect(createThreadAction(A.slug, fd({ title: 't', body: 'b', category: 'treatment' }))).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/threads/${uuid(9)}?done=posted`
    )
    expect(c.createPostWithMeta).toHaveBeenLastCalledWith(A.id, { kind: 'thread', title: 't', body: 'b', category: 'treatment' })
    await expect(createThreadAction(A.slug, fd({ title: 't', body: 'b' }))).rejects.toThrow('?done=posted')
    expect(c.createPostWithMeta).toHaveBeenLastCalledWith(A.id, { kind: 'thread', title: 't', body: 'b', category: 'other' })
    c.createPostWithMeta.mockClear()
    await expect(createThreadAction(A.slug, fd({ title: 't', body: 'b', category: 'politics' }))).rejects.toThrow('?error=invalid_input')
    expect(c.createPostWithMeta).not.toHaveBeenCalled()
  })

  test('スレッドのページに分類の印', async () => {
    as('member')
    t.listPosts.mockResolvedValue(ok([post(1, 'thread')]))
    c.postMeta.mockResolvedValue({ category: 'treatment', pinned: true, isPublic: false })
    const el = await renderPage(ThreadPage({ params: { slug: A.slug, id: uuid(1) } }))
    expect(el.querySelector('article [data-badges]')?.textContent).toBe('通院と治療の経験固定')
  })
})

// =============================================================================
describe('固定（世話人だけ）', () => {
  test('世話人にはスレッドのページに固定のボタン。一般会員には無い', async () => {
    t.listPosts.mockResolvedValue(ok([post(1, 'thread')]))
    as('moderator')
    let el = await renderPage(ThreadPage({ params: { slug: A.slug, id: uuid(1) } }))
    expect(el.querySelector('[data-pin] button')?.textContent).toBe('このスレッドを固定する')
    c.postMeta.mockResolvedValue({ category: 'other', pinned: true, isPublic: false })
    el = await renderPage(ThreadPage({ params: { slug: A.slug, id: uuid(1) } }))
    expect(el.querySelector('[data-pin] button')?.textContent).toBe('固定を外す')

    as('member')
    el = await renderPage(ThreadPage({ params: { slug: A.slug, id: uuid(1) } }))
    expect(el.querySelector('[data-pin]')).toBeNull()
  })

  test('お知らせのページには固定のボタンを出さない', async () => {
    as('moderator')
    t.listPosts.mockResolvedValue(ok([post(1, 'announcement')]))
    const el = await renderPage(AnnouncementPage({ params: { slug: A.slug, id: uuid(1) } }))
    expect(el.querySelector('[data-pin]')).toBeNull()
  })

  test('action: 固定・外す。DB が断ったら ?error=forbidden', async () => {
    as('moderator')
    c.pinPost.mockResolvedValue(ok(null))
    await expect(pinPostAction(A.slug, uuid(1), true)).rejects.toThrow(`redirect:/demo/community/${A.slug}/threads/${uuid(1)}?done=pinned`)
    expect(c.pinPost).toHaveBeenLastCalledWith(uuid(1), true)
    await expect(pinPostAction(A.slug, uuid(1), false)).rejects.toThrow('?done=unpinned')
    as('member')
    c.pinPost.mockResolvedValue({ ok: false, reason: 'forbidden' })
    await expect(pinPostAction(A.slug, uuid(1), true)).rejects.toThrow('?error=forbidden')
  })

  test('閲覧モード・未ログインでは呼ばない', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(pinPostAction(A.slug, uuid(1), true)).rejects.toThrow('redirect:/demo/login')
    }
    expect(c.pinPost).not.toHaveBeenCalled()
  })
})

// =============================================================================
describe('お知らせの「公開ページにも出す」', () => {
  test('世話人のページの作成フォームに、チェックと行事と同じ注意文', async () => {
    as('moderator')
    const el = await renderPage(ManagePage({ params: { slug: A.slug } }))
    const box = el.querySelector('input[name="isPublic"]') as HTMLInputElement
    expect(box.type).toBe('checkbox')
    expect(box.checked).toBe(false) // 既定は入れない
    expect(box.closest('label')!.textContent).toContain('公開ページにも出す')
    expect(box.closest('label')!.textContent).toContain('公開にすると、この会の公式ページにも表示されます')
    expect(PUBLIC_POST_NOTICE).toBe(PUBLIC_NOTICE)
  })

  test('action: チェックありなら isPublic: true、無ければ false', async () => {
    as('moderator')
    c.createPostWithMeta.mockResolvedValue(ok({ postId: uuid(3) }))
    await expect(createAnnouncementAction(A.slug, fd({ title: 't', body: 'b', isPublic: 'on' }))).rejects.toThrow('?done=announced')
    expect(c.createPostWithMeta).toHaveBeenLastCalledWith(A.id, { kind: 'announcement', title: 't', body: 'b', isPublic: true })
    await expect(createAnnouncementAction(A.slug, fd({ title: 't', body: 'b' }))).rejects.toThrow('?done=announced')
    expect(c.createPostWithMeta).toHaveBeenLastCalledWith(A.id, { kind: 'announcement', title: 't', body: 'b', isPublic: false })
  })
})

// =============================================================================
describe('通報', () => {
  test('会員には投稿・コメントごとに「通報する」（理由は 200 文字まで、空でもよい）', async () => {
    as('member')
    t.listPosts.mockResolvedValue(ok([post(1, 'thread')]))
    t.listComments.mockResolvedValue(ok([{ id: uuid(5), postId: uuid(1), authorId: 'u-x', authorDisplayName: 'さくら', body: 'コメント', createdAt: '2026-09-20T00:00:00Z' }]))
    const el = await renderPage(ThreadPage({ params: { slug: A.slug, id: uuid(1) } }))
    const reports = el.querySelectorAll('details[data-report]')
    expect(reports).toHaveLength(2) // 投稿とコメント
    const reason = reports[0].querySelector('textarea[name="reason"]') as HTMLTextAreaElement
    expect(reason.maxLength).toBe(200)
    expect(reason.required).toBe(false)
    expect(reports[0].textContent).toContain('だれが通報したかは、世話人の方にも表示されません')
    clean(el.innerHTML)
  })

  test('閲覧モードには通報のボタンが無い', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const el = await renderPage(ThreadPage({ params: { slug: 'sample', id: SAMPLE_POSTS.find((p) => p.kind === 'thread')!.id } }))
    expect(el.querySelector('details[data-report]')).toBeNull()
  })

  test('action: 投稿・コメントを指して理由を渡す。済んだら ?done=reported', async () => {
    as('member')
    c.reportContent.mockResolvedValue(ok(null))
    await expect(reportAction(A.slug, 'threads', uuid(1), null, fd({ reason: '気になる表現' }))).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/threads/${uuid(1)}?done=reported`
    )
    expect(c.reportContent).toHaveBeenLastCalledWith({ postId: uuid(1) }, '気になる表現')
    await expect(reportAction(A.slug, 'announcements', uuid(1), uuid(5), fd({}))).rejects.toThrow('?done=reported')
    expect(c.reportContent).toHaveBeenLastCalledWith({ commentId: uuid(5) }, '')
  })

  test('二重送信: 二度目は「すでに通報しています」', async () => {
    as('member')
    c.reportContent.mockResolvedValueOnce(ok(null)).mockResolvedValueOnce({ ok: false, reason: 'already_reported' })
    await expect(reportAction(A.slug, 'threads', uuid(1), null, fd({}))).rejects.toThrow('?done=reported')
    await expect(reportAction(A.slug, 'threads', uuid(1), null, fd({}))).rejects.toThrow(
      `redirect:/demo/community/${A.slug}/threads/${uuid(1)}?error=already_reported`
    )
    expect(FAILURE_MESSAGES.already_reported).toBe('すでに通報しています')
    expect(flashOf({ error: 'already_reported' })?.text).toBe('すでに通報しています')
  })

  test('閲覧モード・未ログインでは呼ばない。id の形が違えば呼ばない', async () => {
    for (const v of [{ kind: 'demo' }, null]) {
      getViewer.mockResolvedValue(v)
      await expect(reportAction(A.slug, 'threads', uuid(1), null, fd({}))).rejects.toThrow('redirect:/demo/login')
    }
    as('member')
    await expect(reportAction(A.slug, 'threads', 'not-a-uuid', null, fd({}))).rejects.toThrow('?error=invalid_input')
    expect(c.reportContent).not.toHaveBeenCalled()
  })

  test('世話人の通報一覧: 対象へのリンク・理由・日時・対応済みにする。通報者はどこにも出ない', async () => {
    as('moderator')
    c.listReports.mockResolvedValue(
      ok([
        { id: uuid(6), postId: uuid(1), commentId: null, reason: '理由その1', createdAt: '2026-09-30T00:00:00Z', handledAt: null, targetPath: `/threads/${uuid(1)}`, reporter_id: 'reporter-secret', reporterName: 'つうほうした人' },
        { id: uuid(7), postId: null, commentId: uuid(5), reason: '', createdAt: '2026-09-29T00:00:00Z', handledAt: '2026-09-30T01:00:00Z', targetPath: null },
      ])
    )
    const el = await renderPage(ReportsPage({ params: { slug: A.slug } }))
    const rows = el.querySelectorAll('[data-report-row]')
    expect(rows).toHaveLength(2)
    expect(rows[0].querySelector('[data-report-reason]')?.textContent).toBe('理由その1')
    expect(rows[0].textContent).toContain('2026年9月30日')
    expect(rows[0].querySelector('[data-report-target]')?.getAttribute('href')).toBe(`/demo/community/${A.slug}/threads/${uuid(1)}`)
    expect(rows[0].querySelector('form button')?.textContent).toBe('対応済みにする')
    expect(rows[1].textContent).toContain('対応済み')
    expect(rows[1].textContent).toContain('対象はすでに削除されています')
    expect(rows[1].querySelector('form')).toBeNull()
    expect(rows[1].querySelector('[data-report-reason]')?.textContent).toBe('（理由は書かれていません）')
    // 通報した人は出さない
    expect(el.innerHTML).not.toContain('reporter-secret')
    expect(el.textContent).not.toContain('つうほうした人')
    expect(el.textContent).not.toContain('u-me')
    clean(el.innerHTML)
  })

  test('通報一覧・対応済みは世話人だけ（一般会員・会員でない人・閲覧モードは 404）', async () => {
    as('member')
    await expect(ReportsPage({ params: { slug: A.slug } })).rejects.toThrow('notFound')
    await expect(ReportsPage({ params: { slug: B.slug } })).rejects.toThrow('notFound')
    getViewer.mockResolvedValue({ kind: 'demo' })
    await expect(ReportsPage({ params: { slug: 'sample' } })).rejects.toThrow('notFound')
    expect(c.listReports).not.toHaveBeenCalled()

    as('moderator')
    c.markReportHandled.mockResolvedValue(ok(null))
    await expect(markReportHandledAction(A.slug, uuid(6))).rejects.toThrow(`redirect:/demo/community/${A.slug}/manage/reports?done=handled`)
    as('member')
    c.markReportHandled.mockResolvedValue({ ok: false, reason: 'forbidden' })
    await expect(markReportHandledAction(A.slug, uuid(6))).rejects.toThrow('?error=forbidden')
  })
})

// =============================================================================
describe('会の約束', () => {
  test('運営の共通文（6 項目）、会の約束は rules_text。世話人には編集への入口', async () => {
    as('moderator')
    c.getGroupSettings.mockResolvedValue({ welcomeText: null, rulesText: '互いの体験を尊重しましょう。' })
    const el = await renderPage(RulesPage({ params: { slug: A.slug } }))
    expect(el.querySelectorAll('[data-common-rules] [data-common-rule]')).toHaveLength(6)
    expect(el.querySelector('[data-common-rules]')!.textContent).toContain('本名をたずねない')
    expect(el.querySelector('[data-common-rules]')!.textContent).not.toContain('未定')
    expect(el.querySelector('[data-group-rules]')!.textContent).toContain('互いの体験を尊重しましょう。')
    expect(el.querySelector(`a[href="/demo/community/${A.slug}/manage/rules"]`)).not.toBeNull()
    clean(el.innerHTML)
  })

  test('一般会員には編集の入口が無く、未設定なら「まだありません」', async () => {
    as('member')
    const el = await renderPage(RulesPage({ params: { slug: A.slug } }))
    expect(el.querySelector('[data-group-rules]')!.textContent).toContain('まだありません。')
    expect(el.querySelector('a[href$="/manage/rules"]')).toBeNull()
  })

  test('会員でない人は会のホームへ、閲覧モードは見本（DB を読まない。2026-10-04）', async () => {
    as('member')
    await expect(RulesPage({ params: { slug: B.slug } })).rejects.toThrow(`redirect:/demo/community/${B.slug}`)
    getViewer.mockResolvedValue({ kind: 'demo' })
    c.getGroupSettings.mockClear()
    const el = await renderPage(RulesPage({ params: { slug: 'sample' } }))
    expect(el.textContent).toContain('（見本）')
    expect(el.querySelectorAll('[data-common-rule]')).toHaveLength(6)
    expect(c.getGroupSettings).not.toHaveBeenCalled()
  })

  test('編集は世話人だけ。保存は rules を渡す', async () => {
    as('member')
    await expect(ManageRulesPage({ params: { slug: A.slug } })).rejects.toThrow('notFound')
    as('moderator')
    c.getGroupSettings.mockResolvedValue({ welcomeText: null, rulesText: '今の約束' })
    const el = await renderPage(ManageRulesPage({ params: { slug: A.slug } }))
    expect((el.querySelector('textarea[name="rules"]') as HTMLTextAreaElement).value).toBe('今の約束')
    c.saveRulesText.mockResolvedValue(ok(null))
    await expect(saveRulesAction(A.slug, fd({ rules: '新しい約束' }))).rejects.toThrow(`redirect:/demo/community/${A.slug}/manage/rules?done=rules_saved`)
    expect(c.saveRulesText).toHaveBeenLastCalledWith(A.id, '新しい約束')
  })
})

// =============================================================================
describe('世話人のページの入口', () => {
  test('行事・資料とリンク・通報・会の約束', async () => {
    as('moderator')
    const el = await renderPage(ManagePage({ params: { slug: A.slug } }))
    const hrefs = [...el.querySelectorAll('[data-manage-links] a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/manage/events', '/manage/links', '/manage/reports', '/manage/rules'].map((s) => `/demo/community/${A.slug}${s}`))
  })
})

// =============================================================================
describe('マイページの自分の投稿・コメント', () => {
  test('会・種類・日付と、投稿のページへのリンク', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.listMyContents.mockResolvedValue([
      { kind: 'post', groupSlug: A.slug, groupName: A.name, path: `/threads/${uuid(1)}`, text: '自分のスレッド', createdAt: '2026-09-30T00:00:00Z' },
      { kind: 'comment', groupSlug: A.slug, groupName: A.name, path: `/announcements/${uuid(2)}`, text: '自分のコメント', createdAt: '2026-09-29T00:00:00Z' },
    ])
    const el = await renderPage(MemberProfilePage())
    const sec = el.querySelector('[data-my-contents]')!
    const links = [...sec.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual([`/demo/community/${A.slug}/threads/${uuid(1)}`, `/demo/community/${A.slug}/announcements/${uuid(2)}`])
    expect(links[0].textContent).toContain('投稿・テストの会A')
    expect(links[1].textContent).toContain('コメント・テストの会A')
    clean(sec.innerHTML)
  })

  test('無ければ「まだありません」、読めなければその旨', async () => {
    getViewer.mockResolvedValue(MEMBER)
    c.listMyContents.mockResolvedValue([])
    let el = await renderPage(MemberProfilePage())
    expect(el.querySelector('[data-my-contents]')!.textContent).toContain('まだありません。')
    c.listMyContents.mockResolvedValue(null)
    el = await renderPage(MemberProfilePage())
    expect(el.querySelector('[data-my-contents]')!.textContent).toContain('読み込めませんでした')
  })
})
