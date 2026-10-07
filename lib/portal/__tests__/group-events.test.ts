/**
 * @jest-environment node
 *
 * 会の「行事」と「資料・リンク集」（lib/portal/group-events.ts・group-events-db.ts）の検査
 *
 * DB には接続しない（20261013 はまだ無い。Supabase は呼び出しを記録する擬似クライアント）。見るのは:
 *   1. 入力検証（上限・必須・http(s) の URL・日本時間の日時・is_public の既定は false）
 *   2. 過去と未来の分け方（終わり〔無ければ始まり〕が今以降ならこれから）と並び
 *   3. 権限: 書く関数は世話人でなければ DB に書かない（forbidden）。会員でなければ not_member
 *   4. 参加表明: 本人の行だけを読む・書く（user_id はセッションの本人。引数で他人を指せない。upsert は使わない）
 *   7. DB の名前・値・権限が 20261013 の原本と合っている
 *   5. 出欠一覧: 表示名と状態だけを渡す（DB が user_id を返しても捨てる）
 *   6. DB のエラーの語の読み替え
 */

import * as fs from 'fs'
import * as path from 'path'

type Call = { table: string; op: string; args: unknown[] }

let calls: Call[] = []
let currentUser: string | null = 'me-1'
let role: 'member' | 'moderator' | null = 'member'
/** 表ごとの結果（select の data・error） */
let results: Record<string, { data: unknown; error: { message: string } | null }> = {}
/** insert だけを失敗させるとき（主キーの重なりなど） */
let insertError: { message: string; code: string } | null = null
const mockRpc = jest.fn()

function builder(table: string) {
  const b: Record<string, unknown> = {}
  const rec = (op: string) => (...args: unknown[]) => {
    calls.push({ table, op, args })
    return b
  }
  for (const op of ['select', 'eq', 'is', 'order', 'insert', 'update', 'upsert', 'delete', 'limit']) b[op] = rec(op)
  const result = () => {
    if (table === 'memberships') return { data: role ? { role } : null, error: null }
    return results[table] ?? { data: [], error: null }
  }
  b.maybeSingle = () => {
    calls.push({ table, op: 'maybeSingle', args: [] })
    return Promise.resolve(result())
  }
  b.single = () => {
    calls.push({ table, op: 'single', args: [] })
    return Promise.resolve(result())
  }
  b.then = (resolve: (v: unknown) => void) => {
    const last = [...calls].reverse().find((c) => c.table === table && ['insert', 'update', 'delete', 'select'].includes(c.op))
    if (last?.op === 'insert' && insertError) return resolve({ data: null, error: insertError })
    return resolve(result())
  }
  return b
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser ? { id: currentUser } : null } }) },
    from: (t: string) => builder(t),
    rpc: (...a: unknown[]) => mockRpc(...a),
  }),
}))

import {
  ATTENDANCE_STATUSES,
  DB_NAMES,
  PUBLIC_NOTICE,
  PUBLIC_URL_WARNING,
  formatEventWhen,
  isHttpUrl,
  isoToJstLocal,
  jstLocalToIso,
  mapEventDbError,
  splitEvents,
  validateEventInput,
  validateLinkInput,
  type GroupEvent,
} from '@/lib/portal/group-events'
import {
  createEvent,
  createLink,
  deleteEvent,
  deleteLink,
  listAttendance,
  listEvents,
  myAttendance,
  setMyAttendance,
  updateEvent,
  updateLink,
} from '@/lib/portal/group-events-db'

const G = '11111111-1111-4111-8111-111111111111'
const E = '22222222-2222-4222-8222-222222222222'
const L = '33333333-3333-4333-8333-333333333333'

const EVENT_FORM = {
  title: '交流会',
  body: 'オンラインで集まります',
  startsAt: '2026-11-03T14:00',
  endsAt: '2026-11-03T16:00',
  place: '',
  onlineUrl: 'https://example.org/meet',
}

beforeEach(() => {
  calls = []
  currentUser = 'me-1'
  role = 'member'
  results = {}
  insertError = null
  mockRpc.mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

const writes = () => calls.filter((c) => ['insert', 'update', 'upsert', 'delete'].includes(c.op))

// ---- 1. 入力検証 -------------------------------------------------------------------

describe('validateEventInput', () => {
  test('通る。日時は日本時間として ISO に、空の場所は null に、is_public は既定で false', () => {
    const r = validateEventInput(EVENT_FORM)
    expect(r).toEqual({
      ok: true,
      value: {
        title: '交流会',
        body: 'オンラインで集まります',
        startsAt: '2026-11-03T14:00:00+09:00',
        endsAt: '2026-11-03T16:00:00+09:00',
        place: null,
        onlineUrl: 'https://example.org/meet',
        isPublic: false,
      },
    })
  })

  test('「公開ページにも出す」はチェックの値 on のときだけ true', () => {
    expect(validateEventInput({ ...EVENT_FORM, isPublic: 'on' }).ok && (validateEventInput({ ...EVENT_FORM, isPublic: 'on' }) as { value: { isPublic: boolean } }).value.isPublic).toBe(true)
    for (const v of ['off', 'true', '', undefined]) {
      const r = validateEventInput({ ...EVENT_FORM, isPublic: v })
      expect(r.ok && r.value.isPublic).toBe(false)
    }
  })

  test.each([
    ['title', '', 'title'],
    ['title', 'あ'.repeat(101), 'title'],
    ['body', '　', 'body'],
    ['body', 'あ'.repeat(4001), 'body'],
    ['startsAt', '', 'startsAt'],
    ['startsAt', '2026-02-30T10:00', 'startsAt'],
    ['endsAt', '2026-11-03T13:00', 'endsAt'],
    ['place', 'あ'.repeat(201), 'place'],
    ['onlineUrl', 'javascript:alert(1)', 'onlineUrl'],
    ['onlineUrl', 'ftp://example.org', 'onlineUrl'],
    ['onlineUrl', 'https://' + 'a'.repeat(493) + '.jp', 'onlineUrl'],
  ])('%s = %p は止める', (key, value, field) => {
    const r = validateEventInput({ ...EVENT_FORM, [key]: value })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.map((e) => e.field)).toContain(field)
  })

  test('上限ちょうどは通る（題 100・本文 4000・場所 200）', () => {
    const r = validateEventInput({ ...EVENT_FORM, title: 'あ'.repeat(100), body: 'あ'.repeat(4000), place: 'あ'.repeat(200) })
    expect(r.ok).toBe(true)
  })
})

describe('validateLinkInput', () => {
  test('通る。ひとことは空なら null', () => {
    expect(validateLinkInput({ title: '会報', url: 'https://example.org/a', note: ' ' })).toEqual({
      ok: true,
      value: { title: '会報', url: 'https://example.org/a', note: null },
    })
  })

  test.each([
    [{ title: '', url: 'https://example.org' }, 'title'],
    [{ title: 'あ'.repeat(101), url: 'https://example.org' }, 'title'],
    [{ title: 'a', url: '' }, 'url'],
    [{ title: 'a', url: 'example.org' }, 'url'],
    [{ title: 'a', url: 'data:text/html,x' }, 'url'],
    [{ title: 'a', url: 'https://example.org', note: 'あ'.repeat(501) }, 'note'],
  ])('%p は止める（%s）', (raw, field) => {
    const r = validateLinkInput(raw)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.map((e) => e.field)).toContain(field)
  })
})

test('isHttpUrl は http(s) だけ。空白を含むものは通さない', () => {
  expect(isHttpUrl('http://example.org')).toBe(true)
  expect(isHttpUrl('https://example.org/x?y=1')).toBe(true)
  expect(isHttpUrl('https://exa mple.org')).toBe(false)
  expect(isHttpUrl('mailto:a@example.org')).toBe(false)
})

test('日本時間の日時の行き来', () => {
  expect(jstLocalToIso('2026-01-01T00:30')).toBe('2026-01-01T00:30:00+09:00')
  expect(isoToJstLocal('2025-12-31T15:30:00Z')).toBe('2026-01-01T00:30')
  expect(isoToJstLocal(null)).toBe('')
  expect(jstLocalToIso('2026-1-1T00:30')).toBeNull()
})

// ---- 2. 過去と未来 -------------------------------------------------------------------

describe('splitEvents', () => {
  const ev = (id: string, startsAt: string, endsAt: string | null = null): GroupEvent => ({
    id, groupId: G, title: id, body: '', startsAt, endsAt, place: null, onlineUrl: null, isPublic: false,
  })
  const now = new Date('2026-10-02T12:00:00+09:00')

  test('終わり（無ければ始まり）が今以降ならこれから。これからは早い順、過去は新しい順', () => {
    const r = splitEvents(
      [
        ev('past-old', '2026-09-01T10:00:00+09:00'),
        ev('future-late', '2026-12-01T10:00:00+09:00'),
        ev('past-new', '2026-10-01T10:00:00+09:00', '2026-10-01T12:00:00+09:00'),
        ev('ongoing', '2026-10-02T10:00:00+09:00', '2026-10-02T15:00:00+09:00'),
        ev('future-soon', '2026-10-03T10:00:00+09:00'),
      ],
      now
    )
    expect(r.upcoming.map((e) => e.id)).toEqual(['ongoing', 'future-soon', 'future-late'])
    expect(r.past.map((e) => e.id)).toEqual(['past-new', 'past-old'])
  })

  test('始まりがちょうど今（終わり無し）はこれから。1 分前に始まって終わり無しは過去', () => {
    const r = splitEvents([ev('now', '2026-10-02T12:00:00+09:00'), ev('just-before', '2026-10-02T11:59:00+09:00')], now)
    expect(r.upcoming.map((e) => e.id)).toEqual(['now'])
    expect(r.past.map((e) => e.id)).toEqual(['just-before'])
  })

  test('日時の表示は日本時間。同じ日なら終わりは時刻だけ', () => {
    expect(formatEventWhen({ startsAt: '2026-11-03T05:00:00Z', endsAt: '2026-11-03T07:00:00Z' })).toBe('2026年11月3日（火）14:00〜16:00')
    expect(formatEventWhen({ startsAt: '2026-11-03T05:00:00Z', endsAt: '2026-11-04T05:00:00Z' })).toBe(
      '2026年11月3日（火）14:00〜2026年11月4日（水）14:00'
    )
  })
})

// ---- 3. 権限 -------------------------------------------------------------------------

describe('権限', () => {
  const input = () => {
    const r = validateEventInput(EVENT_FORM)
    if (!r.ok) throw new Error('EVENT_FORM が通らない')
    return r.value
  }
  const link = { title: '会報', url: 'https://example.org', note: null }

  test('一般の会員は、行事・リンクの作成・編集・削除で DB に書かない（forbidden）', async () => {
    role = 'member'
    for (const p of [
      createEvent(G, input()),
      updateEvent(G, E, input()),
      deleteEvent(G, E),
      createLink(G, link),
      updateLink(G, L, link),
      deleteLink(G, L),
      listAttendance(G, E),
    ]) {
      expect(await p).toEqual({ ok: false, reason: 'forbidden' })
    }
    expect(writes()).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('会員でなければ読むことも not_member。未ログインは unauthenticated', async () => {
    role = null
    expect(await listEvents(G)).toEqual({ ok: false, reason: 'not_member' })
    expect(await myAttendance(G, E)).toEqual({ ok: false, reason: 'not_member' })
    expect(await setMyAttendance(G, E, 'yes')).toEqual({ ok: false, reason: 'not_member' })
    currentUser = null
    expect(await listEvents(G)).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(writes()).toEqual([])
  })

  test('世話人は作れる。会の id を付け、is_public もそのまま送る', async () => {
    role = 'moderator'
    results.group_events = { data: { id: E }, error: null }
    expect(await createEvent(G, { ...input(), isPublic: true })).toEqual({ ok: true, value: { eventId: E } })
    const ins = calls.find((c) => c.table === 'group_events' && c.op === 'insert')
    expect(ins?.args[0]).toEqual({
      group_id: G,
      title: '交流会',
      body: 'オンラインで集まります',
      starts_at: '2026-11-03T14:00:00+09:00',
      ends_at: '2026-11-03T16:00:00+09:00',
      place: null,
      online_url: 'https://example.org/meet',
      is_public: true,
    })
  })

  test('編集は会の id と行事の id の両方で絞る。0 行なら not_found', async () => {
    role = 'moderator'
    results.group_events = { data: [], error: null }
    expect(await updateEvent(G, E, input())).toEqual({ ok: false, reason: 'not_found' })
    const eqs = calls.filter((c) => c.table === 'group_events' && c.op === 'eq').map((c) => c.args)
    expect(eqs).toEqual([['group_id', G], ['id', E]])
  })

  test('削除は DB 関数（delete_group_event・delete_group_link）', async () => {
    role = 'moderator'
    mockRpc.mockResolvedValue({ data: null, error: null })
    await deleteEvent(G, E)
    await deleteLink(G, L)
    expect(mockRpc.mock.calls).toEqual([
      ['delete_group_event', { p_event_id: E }],
      ['delete_group_link', { p_link_id: L }],
    ])
  })

  test('id の形が違えば DB を呼ばない', async () => {
    role = 'moderator'
    expect(await deleteEvent(G, '../x')).toEqual({ ok: false, reason: 'invalid_input' })
    expect(await listEvents('x')).toEqual({ ok: false, reason: 'invalid_input' })
    expect(calls).toEqual([])
  })
})

// ---- 4. 参加表明 ----------------------------------------------------------------------

describe('参加表明は自分の行だけ', () => {
  test('読むときは user_id をセッションの本人で絞る', async () => {
    results.event_attendance = { data: { status: 'maybe' }, error: null }
    expect(await myAttendance(G, E)).toEqual({ ok: true, value: 'maybe' })
    const eqs = calls.filter((c) => c.table === 'event_attendance' && c.op === 'eq').map((c) => c.args)
    expect(eqs).toEqual([['event_id', E], ['user_id', 'me-1']])
  })

  test('まだ表明していなければ、本人の行を insert（user_id はセッションの本人）。upsert は使わない', async () => {
    results.group_events = { data: { id: E, group_id: G, title: 't', body: 'b', starts_at: '2026-11-03T05:00:00Z' }, error: null }
    results.event_attendance = { data: null, error: null }
    expect(await setMyAttendance(G, E, 'no')).toEqual({ ok: true, value: null })
    expect(writes()).toEqual([{ table: 'event_attendance', op: 'insert', args: [{ event_id: E, user_id: 'me-1', status: 'no' }] }])
  })

  test('表明済みなら、本人の行の status だけを update（event_id と user_id で絞る）', async () => {
    results.group_events = { data: { id: E, group_id: G, title: 't', body: 'b', starts_at: '2026-11-03T05:00:00Z' }, error: null }
    results.event_attendance = { data: { status: 'maybe' }, error: null }
    expect(await setMyAttendance(G, E, 'yes')).toEqual({ ok: true, value: null })
    expect(writes()).toEqual([{ table: 'event_attendance', op: 'update', args: [{ status: 'yes' }] }])
    const eqs = calls.filter((c) => c.table === 'event_attendance' && c.op === 'eq').map((c) => c.args)
    expect(eqs.slice(-2)).toEqual([['event_id', E], ['user_id', 'me-1']])
  })

  test('insert が主キーの重なり（23505）なら update に切り替える', async () => {
    results.group_events = { data: { id: E, group_id: G, title: 't', body: 'b', starts_at: '2026-11-03T05:00:00Z' }, error: null }
    results.event_attendance = { data: null, error: null }
    insertError = { message: 'duplicate key value violates unique constraint', code: '23505' }
    expect(await setMyAttendance(G, E, 'maybe')).toEqual({ ok: true, value: null })
    expect(writes().map((c) => c.op)).toEqual(['insert', 'update'])
  })

  test('原本の権限と合っている（insert は event_id・user_id・status、update は status だけ。upsert は通らない）', () => {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20261013_community_features.sql'), 'utf-8')
    expect(sql).toContain('GRANT INSERT (event_id, user_id, status) ON public.event_attendance TO authenticated;')
    expect(sql).toContain('GRANT UPDATE (status) ON public.event_attendance TO authenticated;')
    const src = fs.readFileSync(path.join(process.cwd(), 'lib', 'portal', 'group-events-db.ts'), 'utf-8')
    expect(src).not.toMatch(/\.upsert\(/)
  })

  test('別の会の行事（その会に無い行事 id）には表明しない', async () => {
    results.group_events = { data: null, error: null }
    expect(await setMyAttendance(G, E, 'yes')).toEqual({ ok: false, reason: 'not_found' })
    expect(writes()).toEqual([])
  })

  test('関数の引数に他人の user_id を渡す口が無い', () => {
    expect(setMyAttendance.length).toBe(3)
    expect(myAttendance.length).toBe(2)
  })

  test('参加表明の値は 3 つ', () => {
    expect([...ATTENDANCE_STATUSES]).toEqual(['yes', 'maybe', 'no'])
  })
})

// ---- 5. 出欠一覧 ------------------------------------------------------------------------

describe('出欠一覧', () => {
  test('世話人だけ。表示名と状態だけを渡し、DB が user_id を返しても捨てる', async () => {
    role = 'moderator'
    mockRpc.mockResolvedValue({
      data: [
        { display_name: 'はなこ', status: 'yes', user_id: 'secret-user-1' },
        { display_name: null, status: 'maybe' },
      ],
      error: null,
    })
    const r = await listAttendance(G, E)
    expect(r).toEqual({ ok: true, value: [{ displayName: 'はなこ', status: 'yes' }, { displayName: null, status: 'maybe' }] })
    expect(JSON.stringify(r)).not.toContain('secret-user-1')
    expect(mockRpc).toHaveBeenCalledWith('list_event_attendance', { p_event_id: E })
  })
})

// ---- 6. エラーの語・画面の文 ---------------------------------------------------------------

test.each([
  ['forbidden', 'forbidden'],
  ['not_member', 'not_member'],
  ['invalid_input', 'invalid_input'],
  ['new row violates row-level security policy for table "group_events"', 'forbidden'],
  ['something else', 'failed'],
  [undefined, 'failed'],
])('mapEventDbError(%p) → %p', (m, expected) => {
  expect(mapEventDbError(m)).toBe(expected)
})

test('公開の注意文（ファウンダー指示の文言）', () => {
  expect(PUBLIC_NOTICE).toBe('公開にすると、この会の公式ページにも表示されます')
  expect(PUBLIC_URL_WARNING).toBe('URL も公開されます')
})

// ---- 7. 20261013 の原本との照合 ----------------------------------------------------------

describe('20261013 の原本と合っている', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20261013_community_features.sql'), 'utf-8')

  test('関数の名前と引数名', () => {
    expect(sql).toContain(`FUNCTION public.${DB_NAMES.deleteEvent}(${DB_NAMES.eventIdParam} UUID)`)
    expect(sql).toContain(`FUNCTION public.${DB_NAMES.deleteLink}(${DB_NAMES.linkIdParam} UUID)`)
    expect(sql).toContain(`FUNCTION public.${DB_NAMES.listAttendance}(${DB_NAMES.eventIdParam} UUID)`)
    expect(sql).toContain('RETURNS TABLE (display_name TEXT, status TEXT)')
  })

  test('参加表明の値', () => {
    const m = /status\s+TEXT NOT NULL CHECK \(status IN \(([^)]*)\)\)/.exec(sql)
    expect(m?.[1].split(',').map((x) => x.trim().replace(/'/g, ''))).toEqual([...ATTENDANCE_STATUSES])
  })

  test('画面が読み書きする列が、表と列の権限にある', () => {
    const table = (name: string) => sql.split(`CREATE TABLE IF NOT EXISTS public.${name} (`)[1].split(');')[0]
    for (const c of ['id', 'group_id', 'title', 'body', 'starts_at', 'ends_at', 'place', 'online_url', 'is_public']) {
      expect([c, new RegExp(`\\n\\s+${c}\\s`).test(table('group_events'))]).toEqual([c, true])
    }
    for (const c of ['id', 'group_id', 'title', 'url', 'note']) {
      expect([c, new RegExp(`\\n\\s+${c}\\s`).test(table('group_links'))]).toEqual([c, true])
    }
    expect(sql).toContain('GRANT INSERT (group_id, title, body, starts_at, ends_at, place, online_url, is_public, created_by)')
    expect(sql).toContain('GRANT UPDATE (title, body, starts_at, ends_at, place, online_url, is_public) ON public.group_events TO authenticated;')
    expect(sql).toContain('GRANT INSERT (group_id, title, url, note, created_by) ON public.group_links TO authenticated;')
    expect(sql).toContain('GRANT UPDATE (title, url, note) ON public.group_links TO authenticated;')
  })

  test('created_by は既定値が auth.uid()（画面は送らない。insert のポリシーは created_by = auth.uid() を求める）', () => {
    expect(sql.match(/created_by UUID DEFAULT auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(2)
    const src = fs.readFileSync(path.join(process.cwd(), 'lib', 'portal', 'group-events-db.ts'), 'utf-8')
    expect(src).not.toMatch(/created_by:/)
  })
})
