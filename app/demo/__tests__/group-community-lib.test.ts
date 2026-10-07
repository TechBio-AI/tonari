/**
 * @jest-environment node
 *
 * 会員エリアの追加機能の読み書き（app/demo/community/[slug]/_lib/community.ts）の検査。DB には接続しない。
 *   - 通報の一覧は、DB 関数が通報者を返してきても拾わない
 *   - 公開はお知らせだけ・世話人だけ。分類は決まった 5 つだけ
 *   - 通報の理由は 200 文字まで（空でもよい）。二度目は already_reported
 *   - 会の約束は世話人だけ。空なら消す（NULL）。行があれば update、無ければ insert（group_id は書き直さない）
 */

const myGroups = jest.fn()
const listGroups = jest.fn()
jest.mock('@/lib/portal/tenancy', () => ({
  ...jest.requireActual('@/lib/portal/tenancy'),
  myGroups: () => myGroups(),
  listGroups: () => listGroups(),
  listPosts: jest.fn(),
}))

// Supabase のクライアント（呼ばれた表・操作・値を記録する）
type Call = { table?: string; op: string; args: unknown[] }
let calls: Call[] = []
let rpcResult: { data: unknown; error: { message: string } | null } = { data: null, error: null }
let existingSettings: unknown = null
function chain(table: string) {
  const q: Record<string, unknown> = {}
  const record = (op: string) => (...args: unknown[]) => {
    calls.push({ table, op, args })
    return q
  }
  for (const op of ['select', 'eq', 'is', 'in', 'order']) q[op] = record(op)
  q.insert = (...args: unknown[]) => {
    calls.push({ table, op: 'insert', args })
    return { ...q, select: () => ({ single: async () => ({ data: { id: 'new-id' }, error: null }) }), then: (r: (v: unknown) => void) => r({ error: null }) }
  }
  q.update = (...args: unknown[]) => {
    calls.push({ table, op: 'update', args })
    return { eq: async () => ({ error: null }) }
  }
  q.maybeSingle = async () => ({ data: table === 'group_settings' ? existingSettings : null, error: null })
  return q
}
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-me' } } }) },
    from: (t: string) => chain(t),
    rpc: async (fn: string, args: unknown) => {
      calls.push({ op: `rpc:${fn}`, args: [args] })
      return rpcResult
    },
  }),
}))

import { createPostWithMeta, listReports, reportContent, saveRulesText } from '../community/[slug]/_lib/community'

const G = '11111111-1111-4111-8111-111111111111'
const P = '33333333-3333-4333-8333-333333333333'
const asRole = (role: 'member' | 'moderator' | null) =>
  myGroups.mockResolvedValue({ ok: true, value: role ? [{ id: G, slug: 'fabry-fukurou', name: 'A', role, joinedAt: 'x' }] : [] })

beforeEach(() => {
  calls = []
  rpcResult = { data: null, error: null }
  existingSettings = null
  myGroups.mockReset()
  listGroups.mockReset()
})

describe('createPostWithMeta', () => {
  test('スレッドに公開は付けられない（DB に送らない）', async () => {
    asRole('moderator')
    const r = await createPostWithMeta(G, { kind: 'thread', title: 't', body: 'b', isPublic: true })
    expect(r).toMatchObject({ ok: false, reason: 'invalid_input' })
    expect(calls.find((c) => c.op === 'insert')).toBeUndefined()
  })

  test('お知らせ・公開は世話人だけ', async () => {
    asRole('member')
    expect(await createPostWithMeta(G, { kind: 'announcement', title: 't', body: 'b', isPublic: true })).toMatchObject({ reason: 'forbidden' })
    expect(await createPostWithMeta(G, { kind: 'announcement', title: 't', body: 'b' })).toMatchObject({ reason: 'forbidden' })
    expect(calls.find((c) => c.op === 'insert')).toBeUndefined()
  })

  test('知らない分類は送らない。分類が無ければ other', async () => {
    asRole('member')
    expect(await createPostWithMeta(G, { kind: 'thread', title: 't', body: 'b', category: 'politics' })).toMatchObject({ reason: 'invalid_input' })
    await createPostWithMeta(G, { kind: 'thread', title: 't', body: 'b' })
    const ins = calls.find((c) => c.op === 'insert')!
    expect(ins.args[0]).toEqual({ group_id: G, author_id: 'u-me', kind: 'thread', title: 't', body: 'b', category: 'other', is_public: false })
  })

  test('世話人のお知らせは is_public を付けて送る', async () => {
    asRole('moderator')
    const r = await createPostWithMeta(G, { kind: 'announcement', title: 't', body: 'b', isPublic: true })
    expect(r).toEqual({ ok: true, value: { postId: 'new-id' } })
    expect(calls.find((c) => c.op === 'insert')!.args[0]).toMatchObject({ kind: 'announcement', is_public: true })
  })

  test('会員でない会には書かない', async () => {
    asRole(null)
    expect(await createPostWithMeta(G, { kind: 'thread', title: 't', body: 'b' })).toMatchObject({ reason: 'not_member' })
  })
})

describe('reportContent', () => {
  test('理由は 200 文字まで（前後の空白は落とす）。空でもよい', async () => {
    expect(await reportContent({ postId: P }, 'あ'.repeat(201))).toMatchObject({ reason: 'invalid_input' })
    expect(calls).toEqual([])
    expect(await reportContent({ postId: P }, `  ${'あ'.repeat(200)}　`)).toEqual({ ok: true, value: null })
    expect(calls[0]).toEqual({ op: 'rpc:report_group_content', args: [{ p_post_id: P, p_comment_id: null, p_reason: 'あ'.repeat(200) }] })
    await reportContent({ commentId: P }, undefined)
    expect(calls[1].args[0]).toEqual({ p_post_id: null, p_comment_id: P, p_reason: '' })
  })

  test('二度目は already_reported', async () => {
    rpcResult = { data: null, error: { message: 'already_reported' } }
    expect(await reportContent({ postId: P }, '')).toEqual({ ok: false, reason: 'already_reported', message: 'すでに通報しています' })
  })
})

describe('listReports', () => {
  test('世話人でなければ DB 関数を呼ばない', async () => {
    asRole('member')
    expect(await listReports(G)).toMatchObject({ reason: 'forbidden' })
    expect(calls.find((c) => c.op.startsWith('rpc:'))).toBeUndefined()
  })

  test('関数が通報者を返してきても拾わない', async () => {
    asRole('moderator')
    rpcResult = {
      data: [{ id: 'r1', post_id: null, comment_id: null, reason: 'x', created_at: '2026-09-30', handled_at: null, reporter_id: 'secret', handled_by: 'secret2' }],
      error: null,
    }
    const r = await listReports(G)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toEqual([{ id: 'r1', postId: null, commentId: null, reason: 'x', createdAt: '2026-09-30', handledAt: null, targetPath: null }])
    expect(JSON.stringify(r.value)).not.toContain('secret')
  })
})

describe('saveRulesText', () => {
  test('世話人だけ', async () => {
    asRole('member')
    expect(await saveRulesText(G, '約束')).toMatchObject({ reason: 'forbidden' })
    expect(calls.find((c) => c.op === 'insert' || c.op === 'update')).toBeUndefined()
  })

  test('行が無ければ insert、あれば rules_text だけ update（group_id は書き直さない）。空なら NULL', async () => {
    asRole('moderator')
    await saveRulesText(G, '  約束です  ')
    expect(calls.find((c) => c.op === 'insert')!.args[0]).toEqual({ group_id: G, rules_text: '約束です' })
    calls = []
    existingSettings = { group_id: G }
    await saveRulesText(G, '　')
    expect(calls.find((c) => c.op === 'update')!.args[0]).toEqual({ rules_text: null })
  })

  test('4000 文字を超えたら送らない', async () => {
    asRole('moderator')
    expect(await saveRulesText(G, 'あ'.repeat(4001))).toMatchObject({ reason: 'invalid_input' })
  })
})
