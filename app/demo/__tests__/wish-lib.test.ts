/**
 * @jest-environment node
 *
 * 参加希望の読み書き（app/demo/wish/_lib/wishes.ts）の検査。DB には接続しない。
 *   - 登録: 同意（'wish'）を記録してから insert。送る列は契約の列（disease_id と、互換の disease_idx）。有効な希望があれば already_wished
 *   - DB の行は disease_id（固定 ID）で読み書きする（2026-10-03。画面の番号 idx 4 ＝ rd00005）
 *   - 取り消した希望がある病気には新しい行を作らない（一意制約）。再開は withdrawn_at を NULL に戻す
 *   - 取り消しは withdrawn_at を立てる（行は消さない）
 *   - 一覧は取り消したものを除く
 */

const recordMyConsent = jest.fn()
jest.mock('@/lib/portal/consents', () => ({ recordMyConsent: (k: string) => recordMyConsent(k) }))

type Call = { op: string; args: unknown[] }
let calls: Call[] = []
let rows: unknown[] = []
let userId: string | null = 'u-me'
function chain() {
  const q: Record<string, unknown> = {}
  const rec = (op: string) => (...args: unknown[]) => {
    calls.push({ op, args })
    return q
  }
  q.select = rec('select')
  q.eq = rec('eq')
  q.is = rec('is')
  q.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null })
  q.insert = (...args: unknown[]) => {
    calls.push({ op: 'insert', args })
    return Promise.resolve({ error: null })
  }
  q.update = (...args: unknown[]) => {
    calls.push({ op: 'update', args })
    const u: Record<string, unknown> = {}
    u.eq = (...a: unknown[]) => {
      calls.push({ op: 'update.eq', args: a })
      return u
    }
    u.is = (...a: unknown[]) => {
      calls.push({ op: 'update.is', args: a })
      return u
    }
    u.then = (resolve: (v: unknown) => void) => resolve({ error: null })
    return u
  }
  return q
}
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: (t: string) => {
      calls.push({ op: `from:${t}`, args: [] })
      return chain()
    },
  }),
}))

import { createWish, listMyWishes, resumeWish, withdrawWish } from '../wish/_lib/wishes'

const INPUT = { diseaseIdx: 4, prefecture: '長野県', relation: 'family', isGroupMember: null, consent: true }
const row = (withdrawn: boolean) => ({ disease_id: 'rd00005', prefecture: '長野県', relation: 'family', is_group_member: null, created_at: 'x', withdrawn_at: withdrawn ? 'y' : null })

beforeEach(() => {
  calls = []
  rows = []
  userId = 'u-me'
  recordMyConsent.mockReset().mockResolvedValue({ ok: true })
})

test('登録: 同意を記録してから、契約の列だけを insert', async () => {
  expect(await createWish(INPUT)).toEqual({ ok: true, value: null })
  expect(recordMyConsent).toHaveBeenCalledWith('wish')
  const ins = calls.find((c) => c.op === 'insert')!
  expect(ins.args[0]).toEqual({ user_id: 'u-me', disease_id: 'rd00005', disease_idx: 4, prefecture: '長野県', relation: 'family', is_group_member: null })
})

test('同意を記録できなければ登録しない', async () => {
  recordMyConsent.mockResolvedValue({ ok: false, reason: 'failed' })
  expect(await createWish(INPUT)).toEqual({ ok: false, reason: 'failed' })
  expect(calls.find((c) => c.op === 'insert')).toBeUndefined()
})

test('二重登録: 有効な希望があれば already_wished（同意も記録しない）', async () => {
  rows = [row(false)]
  expect(await createWish(INPUT)).toEqual({ ok: false, reason: 'already_wished' })
  expect(recordMyConsent).not.toHaveBeenCalled()
  expect(calls.find((c) => c.op === 'insert')).toBeUndefined()
})

test('取り消した希望がある病気には新しい行を作らない（再開を使う）', async () => {
  rows = [row(true)]
  expect(await createWish(INPUT)).toEqual({ ok: false, reason: 'invalid_input' })
  expect(calls.find((c) => c.op === 'insert')).toBeUndefined()
})

test('再開: 同意を記録して withdrawn_at を NULL に戻す。有効なら already_wished、行が無ければ invalid_input', async () => {
  rows = [row(true)]
  expect(await resumeWish(4, true)).toEqual({ ok: true, value: null })
  expect(recordMyConsent).toHaveBeenCalledWith('wish')
  expect(calls.find((c) => c.op === 'update')!.args[0]).toEqual({ withdrawn_at: null })
  rows = [row(false)]
  expect(await resumeWish(4, true)).toEqual({ ok: false, reason: 'already_wished' })
  rows = []
  expect(await resumeWish(4, true)).toEqual({ ok: false, reason: 'invalid_input' })
  expect(await resumeWish(4, false)).toEqual({ ok: false, reason: 'invalid_input' })
})

test('取り消し: withdrawn_at を立てる（本人・その病気・有効な行だけ）', async () => {
  expect(await withdrawWish(4)).toEqual({ ok: true, value: null })
  const upd = calls.find((c) => c.op === 'update')!
  expect(Object.keys(upd.args[0] as object)).toEqual(['withdrawn_at'])
  expect(calls.filter((c) => c.op === 'update.eq').map((c) => c.args)).toEqual([
    ['user_id', 'u-me'],
    ['disease_id', 'rd00005'],
  ])
  expect(calls.find((c) => c.op === 'update.is')!.args).toEqual(['withdrawn_at', null])
})

test('一覧は取り消したものを除く。未ログインなら空', async () => {
  rows = [row(true), { ...row(false), disease_id: 'rd00022' }]
  expect((await listMyWishes())!.map((w) => w.diseaseIdx)).toEqual([21])
  userId = null
  expect(await listMyWishes()).toEqual([])
  expect(await createWish(INPUT)).toEqual({ ok: false, reason: 'unauthenticated' })
})
