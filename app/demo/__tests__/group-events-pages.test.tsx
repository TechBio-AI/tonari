/**
 * 会の「行事」と「資料・リンク」の画面（/events・/events/[id]・/links・/manage/events・/manage/links）と server action の検査
 *
 * DB には接続しない。見ている人（session.ts）・tenancy.ts の DB 関数・group-events-db.ts を差し替える。
 *   1. 権限: 閲覧モードは、会員向けのページ（/events・/events/[id]・/links）は見本を出し（2026-10-04）、世話人のページは 404。どれも DB を読まない。会員でない人は会員向けページから会のお知らせへ、世話人のページは 404。
 *      一般の会員は世話人のページが 404 で、出欠一覧を読まない
 *   2. 行事: これからと過去に分けて出す。会員向けに人数は出さない。自分の予定だけ見える
 *   3. 出欠一覧（世話人）: 表示名と状態だけ。user_id は出ない。印刷できる
 *   4. 公開の注意文: チェックの横に常に出す。公開にして URL もあるときだけ「URL も公開されます」
 *   5. リンク: 別タブ・rel に noopener
 *   6. server action: 閲覧モード・値の不備では DB を呼ばない。参加表明は値と行事 id だけを渡す
 *   7. 文言: 禁止表現が無い
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen } from '@testing-library/react'

// ---- 差し替え ---------------------------------------------------------------
const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const tenancy = { listGroups: jest.fn(), myGroups: jest.fn() }
jest.mock('@/lib/portal/tenancy', () => {
  const actual = jest.requireActual('@/lib/portal/tenancy')
  return {
    ...actual,
    listGroups: (...a: unknown[]) => tenancy.listGroups(...a),
    myGroups: (...a: unknown[]) => tenancy.myGroups(...a),
  }
})

const edb = {
  listEvents: jest.fn(),
  getEvent: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  myAttendance: jest.fn(),
  setMyAttendance: jest.fn(),
  listAttendance: jest.fn(),
  listLinks: jest.fn(),
  getLink: jest.fn(),
  createLink: jest.fn(),
  updateLink: jest.fn(),
  deleteLink: jest.fn(),
}
jest.mock('@/lib/portal/group-events-db', () => {
  const out: Record<string, unknown> = {}
  for (const k of ['listEvents', 'getEvent', 'createEvent', 'updateEvent', 'deleteEvent', 'myAttendance', 'setMyAttendance', 'listAttendance', 'listLinks', 'getLink', 'createLink', 'updateLink', 'deleteLink']) {
    out[k] = (...a: unknown[]) => (edb as Record<string, jest.Mock>)[k](...a)
  }
  return out
})

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-secret-1' } } }) } }),
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

import AnnouncementsPage from '../community/[slug]/page'
import EventsPage from '../community/[slug]/events/page'
import EventPage from '../community/[slug]/events/[id]/page'
import LinksPage from '../community/[slug]/links/page'
import ManageEventsPage from '../community/[slug]/manage/events/page'
import EditEventPage from '../community/[slug]/manage/events/[id]/page'
import ManageLinksPage from '../community/[slug]/manage/links/page'
import EditLinkPage from '../community/[slug]/manage/links/[id]/page'
import { setAttendanceAction } from '../community/[slug]/events/actions'
import { createEventAction, deleteEventAction } from '../community/[slug]/manage/events/actions'
import { createLinkAction } from '../community/[slug]/manage/links/actions'
import { EMPTY_EVENT, EventForm } from '../community/[slug]/manage/events/EventForm'
import { SAMPLE_GROUP } from '../community/_components/sample-group'
import { PUBLIC_NOTICE, PUBLIC_URL_WARNING, type GroupEvent } from '@/lib/portal/group-events'

// ---- 準備 -------------------------------------------------------------------
const G = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'テストの会' }
const E1 = '22222222-2222-4222-8222-222222222222'
const L1 = '33333333-3333-4333-8333-333333333333'
const MEMBER = { kind: 'member', email: 'm@example.invalid', hasProfile: true, needsConsent: false }

const FUTURE: GroupEvent = {
  id: E1, groupId: G.id, title: '秋の交流会', body: '本文です', startsAt: '2099-11-03T05:00:00Z', endsAt: null,
  place: '公民館', onlineUrl: 'https://example.org/meet', isPublic: false,
}
const PAST: GroupEvent = { ...FUTURE, id: '44444444-4444-4444-8444-444444444444', title: '春の勉強会', startsAt: '2001-04-01T05:00:00Z' }

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function as(roleName: 'member' | 'moderator' | null) {
  getViewer.mockResolvedValue(MEMBER)
  tenancy.myGroups.mockResolvedValue({ ok: true, value: roleName ? [{ ...G, role: roleName, joinedAt: '2026-09-01T00:00:00Z' }] : [] })
}

async function html(el: Promise<JSX.Element> | JSX.Element): Promise<string> {
  const { container } = render(await el)
  return container.innerHTML
}

async function thrown(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as Error).message
  }
  return '(throw しなかった)'
}

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

beforeEach(() => {
  jest.clearAllMocks()
  as('member')
  tenancy.listGroups.mockResolvedValue({ ok: true, value: [G] })
  edb.listEvents.mockResolvedValue({ ok: true, value: [PAST, FUTURE] })
  edb.getEvent.mockResolvedValue({ ok: true, value: FUTURE })
  edb.myAttendance.mockResolvedValue({ ok: true, value: null })
  edb.listAttendance.mockResolvedValue({ ok: true, value: [{ displayName: 'はなこ', status: 'yes' }, { displayName: null, status: 'maybe' }] })
  edb.listLinks.mockResolvedValue({ ok: true, value: [{ id: L1, groupId: G.id, title: '会報', url: 'https://example.org/news', note: 'ひとこと' }] })
  edb.getLink.mockResolvedValue({ ok: true, value: { id: L1, groupId: G.id, title: '会報', url: 'https://example.org/news', note: null } })
  for (const k of ['createEvent', 'updateEvent', 'deleteEvent', 'setMyAttendance', 'createLink', 'updateLink', 'deleteLink'] as const) {
    edb[k].mockResolvedValue({ ok: true, value: k === 'createEvent' ? { eventId: E1 } : null })
  }
})

const noDb = () => {
  for (const f of Object.values(edb)) expect(f).not.toHaveBeenCalled()
}

const PAGES = (slug: string) => [
  ['/events', () => EventsPage({ params: { slug } })],
  ['/events/[id]', () => EventPage({ params: { slug, id: E1 } })],
  ['/links', () => LinksPage({ params: { slug } })],
  ['/manage/events', () => ManageEventsPage({ params: { slug } })],
  ['/manage/events/[id]', () => EditEventPage({ params: { slug, id: E1 } })],
  ['/manage/links', () => ManageLinksPage({ params: { slug } })],
  ['/manage/links/[id]', () => EditLinkPage({ params: { slug, id: L1 } })],
] as const

// ---- 1. 権限 -------------------------------------------------------------------
describe('権限', () => {
  test.each(PAGES(SAMPLE_GROUP.slug).filter(([n]) => n.startsWith('/manage')).map(([n, f]) => [n, f]))('閲覧モードは %s（世話人のページ）が 404 で、DB を読まない', async (_n, f) => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    expect(await thrown(f())).toBe('notFound')
    noDb()
  })

  test('閲覧モードは /events・/events/[id]・/links が見本を出し、DB を読まない（2026-10-04）', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    for (const p of [
      EventsPage({ params: { slug: SAMPLE_GROUP.slug } }),
      EventPage({ params: { slug: SAMPLE_GROUP.slug, id: 'sample-event-1' } }),
      LinksPage({ params: { slug: SAMPLE_GROUP.slug } }),
    ]) {
      expect(await html(p)).toContain('（見本）')
    }
    expect(await thrown(EventPage({ params: { slug: SAMPLE_GROUP.slug, id: E1 } }))).toBe('notFound') // 見本に無い id
    noDb()
  })

  test('会員でない人: 会員向けページは会のお知らせへ、世話人のページは 404', async () => {
    as(null)
    for (const [name, f] of PAGES(G.slug)) {
      const expected = name.startsWith('/manage') ? 'notFound' : `redirect:/demo/community/${G.slug}`
      expect([name, await thrown(f())]).toEqual([name, expected])
    }
    noDb()
  })

  test('一般の会員: 世話人のページは 404。行事の詳細で出欠一覧を読まない', async () => {
    as('member')
    for (const [name, f] of PAGES(G.slug).filter(([n]) => n.startsWith('/manage'))) {
      expect([name, await thrown(f())]).toEqual([name, 'notFound'])
    }
    const h = await html(EventPage({ params: { slug: G.slug, id: E1 } }))
    expect(h).not.toContain('出欠一覧')
    expect(edb.listAttendance).not.toHaveBeenCalled()
    expect(h).not.toContain('/manage/events')
  })

  test('別の会の行事 id（DB が not_found）は 404', async () => {
    edb.getEvent.mockResolvedValue({ ok: false, reason: 'not_found' })
    expect(await thrown(EventPage({ params: { slug: G.slug, id: E1 } }))).toBe('notFound')
    as('moderator')
    expect(await thrown(EditEventPage({ params: { slug: G.slug, id: E1 } }))).toBe('notFound')
  })

  test('会員のページに「行事」「資料・リンク」の入口があり、閲覧モードの会のページにもある（見本。2026-10-04）', async () => {
    const h = await html(LinksPage({ params: { slug: G.slug } }))
    expect(h).toContain(`href="/demo/community/${G.slug}/events"`)
    expect(h).toContain(`href="/demo/community/${G.slug}/links"`)
    getViewer.mockResolvedValue({ kind: 'demo' })
    const demo = await html(AnnouncementsPage({ params: { slug: SAMPLE_GROUP.slug } }))
    expect(demo).toContain(`href="/demo/community/${SAMPLE_GROUP.slug}/events"`)
    expect(demo).toContain(`href="/demo/community/${SAMPLE_GROUP.slug}/links"`)
  })
})

// ---- 2. 行事 -------------------------------------------------------------------
describe('行事（会員）', () => {
  test('これからの行事と過去の行事に分けて出す', async () => {
    const { container } = render(await EventsPage({ params: { slug: G.slug } }))
    const sections = [...container.querySelectorAll('h2')].map((h) => h.textContent)
    expect(sections).toEqual(['これからの行事', '過去の行事'])
    const lists = container.querySelectorAll('ul')
    expect(lists[0].textContent).toContain('秋の交流会')
    expect(lists[0].textContent).not.toContain('春の勉強会')
    expect(lists[1].textContent).toContain('春の勉強会')
  })

  test('詳細: 参加の 3 つのボタン。自分の予定だけが見え、人数は出さない', async () => {
    edb.myAttendance.mockResolvedValue({ ok: true, value: 'maybe' })
    const h = await html(EventPage({ params: { slug: G.slug, id: E1 } }))
    for (const l of ['参加する', 'たぶん', '参加しない']) expect(h).toContain(`>${l}</button>`)
    expect(h).toContain('いまの予定: <span class="font-semibold">たぶん</span>')
    expect(h).not.toMatch(/\d+\s*(人|名)/)
    expect(edb.myAttendance).toHaveBeenCalledWith(G.id, E1)
  })

  test('オンライン参加の URL は別タブ・noopener', async () => {
    const { container } = render(await EventPage({ params: { slug: G.slug, id: E1 } }))
    const a = container.querySelector('a[href="https://example.org/meet"]')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')).toContain('noopener')
  })
})

// ---- 3. 出欠一覧 -------------------------------------------------------------------
describe('出欠一覧（世話人）', () => {
  test('表示名と状態だけ。user_id は出ない。印刷できる', async () => {
    as('moderator')
    const { container } = render(await EventPage({ params: { slug: G.slug, id: E1 } }))
    expect(edb.listAttendance).toHaveBeenCalledWith(G.id, E1)
    const target = container.querySelector('[data-print-target]')
    expect(target?.textContent).toContain('はなこ')
    expect(target?.textContent).toContain('参加する')
    expect(target?.textContent).toContain('名前未設定')
    expect(target?.textContent).toContain('秋の交流会')
    expect(container.innerHTML).not.toContain('user-secret-1')
    expect(screen.getByRole('button', { name: '印刷する' }).closest('.print\\:hidden')).not.toBeNull()
    expect(container.innerHTML).toContain('@media print')
  })
})

// ---- 4. 公開の注意文 ------------------------------------------------------------------
describe('「公開ページにも出す」', () => {
  test('作成の画面: チェックは既定で入っておらず、注意文は常に出る', async () => {
    as('moderator')
    const { container } = render(await ManageEventsPage({ params: { slug: G.slug } }))
    const box = container.querySelector('input[name="isPublic"]') as HTMLInputElement
    expect(box.checked).toBe(false)
    expect(container.querySelector('[data-public-notice]')?.textContent).toBe(PUBLIC_NOTICE)
    expect(container.querySelector('[data-public-url-warning]')).toBeNull()
  })

  test('公開にして URL もあるときだけ「URL も公開されます」', () => {
    const { container } = render(<EventForm action={jest.fn()} initial={EMPTY_EVENT} submitLabel="作る" />)
    const box = container.querySelector('input[name="isPublic"]') as HTMLInputElement
    const url = container.querySelector('input[name="onlineUrl"]') as HTMLInputElement
    const warning = () => container.querySelector('[data-public-url-warning]')?.textContent ?? null

    fireEvent.click(box)
    expect(warning()).toBeNull() // URL が無い
    fireEvent.change(url, { target: { value: 'https://example.org/meet' } })
    expect(warning()).toBe(PUBLIC_URL_WARNING)
    fireEvent.click(box)
    expect(warning()).toBeNull() // 公開しない
    fireEvent.click(box)
    fireEvent.change(url, { target: { value: '  ' } })
    expect(warning()).toBeNull()
  })

  test('編集の画面: 公開で URL がある行事は、開いた時点で注意が出る', async () => {
    as('moderator')
    edb.getEvent.mockResolvedValue({ ok: true, value: { ...FUTURE, isPublic: true } })
    const { container } = render(await EditEventPage({ params: { slug: G.slug, id: E1 } }))
    expect((container.querySelector('input[name="isPublic"]') as HTMLInputElement).checked).toBe(true)
    expect(container.querySelector('[data-public-url-warning]')?.textContent).toBe(PUBLIC_URL_WARNING)
  })

  test('一覧に「公開ページにも出ています」の印', async () => {
    as('moderator')
    edb.listEvents.mockResolvedValue({ ok: true, value: [{ ...FUTURE, isPublic: true }, PAST] })
    const h = await html(ManageEventsPage({ params: { slug: G.slug } }))
    expect((h.match(/公開ページにも出ています/g) ?? []).length).toBe(1)
  })
})

// ---- 5. リンク ------------------------------------------------------------------------
describe('資料・リンク', () => {
  test('外部リンクは別タブ・rel に noopener', async () => {
    const { container } = render(await LinksPage({ params: { slug: G.slug } }))
    const a = container.querySelector('a[href="https://example.org/news"]')
    expect(a?.textContent).toContain('会報')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')?.split(' ')).toContain('noopener')
    expect(container.textContent).toContain('ひとこと')
  })
})

// ---- 6. server action ------------------------------------------------------------------
describe('server action', () => {
  test('参加表明: 知らない値・行事 id の形が違うときは DB を呼ばない', async () => {
    expect(await thrown(setAttendanceAction(G.slug, E1, form({ status: 'all' })))).toBe(
      `redirect:/demo/community/${G.slug}/events/${E1}?error=invalid_input`
    )
    expect(await thrown(setAttendanceAction(G.slug, '../x', form({ status: 'yes' })))).toBe(
      `redirect:/demo/community/${G.slug}/events?error=not_found`
    )
    noDb()
  })

  test('参加表明: 会の id・行事 id・値だけを渡す（user_id は渡さない）', async () => {
    expect(await thrown(setAttendanceAction(G.slug, E1, form({ status: 'yes', user_id: 'someone-else' })))).toBe(
      `redirect:/demo/community/${G.slug}/events/${E1}?done=attendance`
    )
    expect(edb.setMyAttendance).toHaveBeenCalledWith(G.id, E1, 'yes')
  })

  test('閲覧モードでは何もしない', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    expect(await thrown(setAttendanceAction(SAMPLE_GROUP.slug, E1, form({ status: 'yes' })))).toBe('redirect:/demo/login')
    expect(await thrown(createEventAction(SAMPLE_GROUP.slug, form({})))).toBe('redirect:/demo/login')
    noDb()
  })

  test('行事の作成: 不備は DB を呼ばない。チェックが無ければ is_public は false', async () => {
    const base = { title: '交流会', body: '本文', startsAt: '2026-11-03T14:00', onlineUrl: 'https://example.org' }
    expect(await thrown(createEventAction(G.slug, form({ ...base, title: '' })))).toBe(
      `redirect:/demo/community/${G.slug}/manage/events?error=invalid_input`
    )
    expect(edb.createEvent).not.toHaveBeenCalled()
    expect(await thrown(createEventAction(G.slug, form(base)))).toBe(`redirect:/demo/community/${G.slug}/manage/events?done=event_created`)
    expect(edb.createEvent.mock.calls[0][1]).toMatchObject({ isPublic: false, onlineUrl: 'https://example.org' })
    await thrown(createEventAction(G.slug, form({ ...base, isPublic: 'on' })))
    expect(edb.createEvent.mock.calls[1][1]).toMatchObject({ isPublic: true })
  })

  test('DB が forbidden（一般の会員）なら ?error=forbidden', async () => {
    edb.createLink.mockResolvedValue({ ok: false, reason: 'forbidden' })
    expect(await thrown(createLinkAction(G.slug, form({ title: '会報', url: 'https://example.org' })))).toBe(
      `redirect:/demo/community/${G.slug}/manage/links?error=forbidden`
    )
  })

  test('削除は確認のチェックが無ければ DB を呼ばない', async () => {
    expect(await thrown(deleteEventAction(G.slug, E1, form({})))).toBe(
      `redirect:/demo/community/${G.slug}/manage/events/${E1}?error=invalid_input`
    )
    expect(edb.deleteEvent).not.toHaveBeenCalled()
    expect(await thrown(deleteEventAction(G.slug, E1, form({ confirm: 'yes' })))).toBe(
      `redirect:/demo/community/${G.slug}/manage/events?done=event_deleted`
    )
    expect(edb.deleteEvent).toHaveBeenCalledWith(G.id, E1)
  })
})

// ---- 7. 文言 ----------------------------------------------------------------------------
describe('文言', () => {
  test('全ページに禁止表現が無い', async () => {
    as('moderator')
    for (const [name, f] of PAGES(G.slug)) {
      const h = await html(f())
      for (const w of BLOCKLIST) expect([name, w, h.includes(w)]).toEqual([name, w, false])
    }
  })
})
