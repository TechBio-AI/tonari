/**
 * @jest-environment node
 *
 * 同意の版管理（lib/portal/consents.ts）と、研究・治験の案内（lib/portal/research-contact.ts）の検査
 *
 *   1. 版が変わったら再同意が要る（いまの版に同意した行が無ければ 'outdated'。取り消した行は数えない）
 *   2. 同意の記録: いまの版で 1 行足す。すでにいまの版なら足さない。案（draft）には記録しない
 *   3. B 層: 選んだ病気を「同意した時点の名前」で保存し、同意の行を足す。idx の名前が変わっていたら保存しない
 *   4. 取り消しで病気が消え、withdrawn_at が立つ
 *   5. 他人の行には触れない
 *
 * Supabase の代わりに、表を配列で持つ擬似クライアントを使う（RLS そのものは migration 末尾の手順で確かめる）。
 */

// ---- 擬似 Supabase ------------------------------------------------------------

type Row = Record<string, unknown>
const db: { consents: Row[]; member_diseases: Row[] } = { consents: [], member_diseases: [] }
let currentUser: string | null = 'u1'
let seq = 0

function query(table: keyof typeof db) {
  const filters: Array<(r: Row) => boolean> = []
  let op: { kind: 'select' } | { kind: 'update'; patch: Row } | { kind: 'delete' } = { kind: 'select' }
  const q = {
    select: () => q,
    eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), q),
    is: (col: string, val: unknown) => (filters.push((r) => (r[col] ?? null) === val), q),
    update: (patch: Row) => ((op = { kind: 'update', patch }), q),
    delete: () => ((op = { kind: 'delete' }), q),
    insert: (rows: Row | Row[]) => {
      for (const r of Array.isArray(rows) ? rows : [rows]) {
        const row: Row = { id: `id${++seq}`, ...r }
        if (table === 'consents') Object.assign(row, { consented_at: `2026-09-26T00:00:${String(seq).padStart(2, '0')}Z`, withdrawn_at: null })
        db[table].push(row)
      }
      return Promise.resolve({ error: null })
    },
    then: (resolve: (v: unknown) => void) => {
      const hit = (r: Row) => filters.every((f) => f(r))
      if (op.kind === 'select') return resolve({ data: db[table].filter(hit), error: null })
      if (op.kind === 'delete') {
        db[table] = db[table].filter((r) => !hit(r)) as Row[]
        return resolve({ error: null })
      }
      const patch = op.patch
      db[table].filter(hit).forEach((r) => Object.assign(r, patch))
      return resolve({ error: null })
    },
  }
  return q
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser ? { id: currentUser } : null } }) },
    from: (table: 'consents' | 'member_diseases') => query(table),
  }),
}))

// 所属する会の disease_idxs はまだ仕組みが無い（不明）。ここでは idx 3・7 を持つ会に属するものとして差し替える
const myGroupsMock = jest.fn()
jest.mock('@/lib/portal/tenancy', () => ({ myGroups: () => myGroupsMock() }))

let groupIdxs: number[] | null = [3, 7]
let names: Record<number, string> = {}
const deps = { groupDiseaseIdxs: async () => groupIdxs, nameAt: (i: number) => names[i] ?? null }

import type { ConsentText, ConsentKind } from '@/lib/portal/consent-texts'
import { CONSENT_TEXTS, currentConsentText } from '@/lib/portal/consent-texts'
import {
  consentState,
  getMyConsents,
  recordMyConsent,
  withdrawMyConsent,
  type ConsentRecord,
} from '@/lib/portal/consents'
import * as rc from '@/lib/portal/research-contact'

beforeEach(() => {
  db.consents = []
  db.member_diseases = []
  currentUser = 'u1'
  seq = 0
  names = { 3: 'ファブリー病', 7: 'ゴーシェ病' }
  groupIdxs = [3, 7]
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

const rec = (kind: ConsentKind, version: number, withdrawnAt: string | null = null): ConsentRecord => ({
  id: `${kind}-${version}`,
  kind,
  version,
  consentedAt: '2026-09-26T00:00:00Z',
  withdrawnAt,
})

/** いまの版番号（base は 2026-09-26 に版 2 になった。テストは版番号を決め打ちしない） */
const cur = (kind: ConsentKind) => currentConsentText(kind).version

/** いまの CONSENT_TEXTS に、kind の次の版を足したもの（文が変わった後を作る） */
function withNextVersion(kind: ConsentKind): Record<ConsentKind, readonly ConsentText[]> {
  return { ...CONSENT_TEXTS, [kind]: [...CONSENT_TEXTS[kind], { version: cur(kind) + 1, text: '改めた文' }] }
}

// ---- 1. 版 -------------------------------------------------------------------

describe('版が変わったら再同意が要る', () => {
  test('いまの版に同意していれば current', () => {
    expect(consentState([rec('base', cur('base'))], 'base')).toBe('current')
  })

  test.each(['base', 'research_contact'] as const)('%s: 次の版が出たら、いまの版の同意は outdated（同意していない扱い）', (kind) => {
    expect(consentState([rec(kind, cur(kind))], kind, withNextVersion(kind))).toBe('outdated')
  })

  test('次の版に同意し直せば current に戻る', () => {
    expect(consentState([rec('base', cur('base')), rec('base', cur('base') + 1)], 'base', withNextVersion('base'))).toBe('current')
  })

  test('base は版 3（2026-10-02。利用目的を実態に合わせた）。版 1・版 2 の同意だけの会員は再同意が要る', () => {
    expect(cur('base')).toBe(3)
    expect(consentState([rec('base', 1)], 'base')).toBe('outdated')
    expect(consentState([rec('base', 1), rec('base', 2)], 'base')).toBe('outdated')
    expect(consentState([rec('base', 2), rec('base', 3)], 'base')).toBe('current')
  })

  test('取り消した行は数えない。何も無ければ none', () => {
    expect(consentState([rec('base', 1, '2026-09-27T00:00:00Z')], 'base')).toBe('none')
    expect(consentState([], 'base')).toBe('none')
  })

  test('ほかの種類の行は数えない', () => {
    expect(consentState([rec('base', 1)], 'research_contact')).toBe('none')
  })

  test('案（draft）の版には、行があっても current にしない', () => {
    expect(consentState([rec('stats', 1)], 'stats')).toBe('outdated')
  })
})

// ---- 2. 記録 -----------------------------------------------------------------

describe('同意の記録', () => {
  test('いまの版で 1 行足す。もう一度呼んでも増えない', async () => {
    expect(await recordMyConsent('base')).toEqual({ ok: true })
    expect(await recordMyConsent('base')).toEqual({ ok: true })
    expect(db.consents).toHaveLength(1)
    expect(db.consents[0]).toMatchObject({ user_id: 'u1', kind: 'base', version: cur('base') })
  })

  test('案（stats）には記録しない', async () => {
    expect(await recordMyConsent('stats')).toEqual({ ok: false, reason: 'draft' })
    expect(db.consents).toHaveLength(0)
  })

  test('未ログインでは記録しない', async () => {
    currentUser = null
    expect(await recordMyConsent('base')).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(db.consents).toHaveLength(0)
  })

  test('取り消すと withdrawn_at が立ち、他人の行には触れない', async () => {
    db.consents.push({ id: 'x', user_id: 'u2', kind: 'research_contact', version: 1, consented_at: 't', withdrawn_at: null })
    await recordMyConsent('research_contact')
    expect(await withdrawMyConsent('research_contact')).toEqual({ ok: true })
    const mine = db.consents.find((r) => r.user_id === 'u1')!
    expect(mine.withdrawn_at).not.toBeNull()
    expect(db.consents.find((r) => r.user_id === 'u2')!.withdrawn_at).toBeNull()
    expect(consentState((await getMyConsents())!, 'research_contact')).toBe('none')
  })
})

// ---- 3〜5. B 層 --------------------------------------------------------------

describe('研究・治験の案内（B 層）', () => {
  const both = [
    { idx: 3, name: 'ファブリー病' },
    { idx: 7, name: 'ゴーシェ病' },
  ]

  test('同意が無ければ保存しない', async () => {
    const r = await rc.saveMyResearchContact({ consent: false, diseases: both }, deps)
    expect(r).toEqual({ ok: false, field: 'consent', message: rc.RESEARCH_CONSENT_REQUIRED_MESSAGE })
    expect(db.member_diseases).toHaveLength(0)
    expect(db.consents).toHaveLength(0)
  })

  test('病気を 1 つも選ばなければ保存しない', async () => {
    const r = await rc.saveMyResearchContact({ consent: true, diseases: [] }, deps)
    expect(r).toEqual({ ok: false, field: 'diseases', message: rc.SELECT_DISEASE_MESSAGE })
    expect(db.consents).toHaveLength(0)
  })

  test('同意すると research_contact の行と、同意した時点の名前の病気が書かれる', async () => {
    expect(await rc.saveMyResearchContact({ consent: true, diseases: both }, deps)).toEqual({ ok: true })
    expect(db.consents).toEqual([expect.objectContaining({ user_id: 'u1', kind: 'research_contact', version: cur('research_contact') })])
    expect(db.member_diseases).toEqual([
      expect.objectContaining({ user_id: 'u1', disease_idx: 3, disease_name: 'ファブリー病' }),
      expect.objectContaining({ user_id: 'u1', disease_idx: 7, disease_name: 'ゴーシェ病' }),
    ])
    const s = await rc.getMyResearchContact()
    expect(s?.state).toBe('current')
    expect(s?.diseases.map((d) => d.name)).toEqual(['ファブリー病', 'ゴーシェ病'])
  })

  test('画面を出した後に idx の名前が変わっていたら、保存しない（見ていない病気に同意させない）', async () => {
    names = { 3: '別の病気', 7: 'ゴーシェ病' }
    const r = await rc.saveMyResearchContact({ consent: true, diseases: [{ idx: 3, name: 'ファブリー病' }] }, deps)
    expect(r).toEqual({ ok: false, field: 'diseases', message: rc.LIST_CHANGED_MESSAGE })
    expect(db.member_diseases).toHaveLength(0)
    expect(db.consents).toHaveLength(0)
  })

  test('所属する会に無い病気は保存しない', async () => {
    names[9] = 'ポンペ病'
    const r = await rc.saveMyResearchContact({ consent: true, diseases: [{ idx: 9, name: 'ポンペ病' }] }, deps)
    expect(r).toMatchObject({ ok: false, field: 'diseases' })
    expect(db.member_diseases).toHaveLength(0)
  })

  test('保存後に知識ファイルの並びが変わっても、記録した名前は変わらない', async () => {
    await rc.saveMyResearchContact({ consent: true, diseases: [both[0]] }, deps)
    names = { 3: '別の病気' }
    expect((await rc.getMyResearchContact())?.diseases).toEqual([{ idx: 3, name: 'ファブリー病' }])
  })

  test('同意済みの方の選び直しは、病気を入れ替えるだけ（同意の行は増えない）', async () => {
    await rc.saveMyResearchContact({ consent: true, diseases: both }, deps)
    expect(await rc.saveMyResearchContact({ diseases: [both[1]] }, deps)).toEqual({ ok: true })
    expect(db.consents).toHaveLength(1)
    expect(db.member_diseases.map((r) => r.disease_name)).toEqual(['ゴーシェ病'])
  })

  test('取り消すと病気が消え、withdrawn_at が立つ。他人の病気は消えない', async () => {
    db.member_diseases.push({ id: 'o', user_id: 'u2', disease_idx: 3, disease_name: 'ファブリー病' })
    await rc.saveMyResearchContact({ consent: true, diseases: both }, deps)

    expect(await rc.withdrawMyResearchContact()).toEqual({ ok: true })

    expect(db.member_diseases.filter((r) => r.user_id === 'u1')).toHaveLength(0)
    expect(db.member_diseases.filter((r) => r.user_id === 'u2')).toHaveLength(1)
    expect(db.consents.find((r) => r.user_id === 'u1')!.withdrawn_at).not.toBeNull()
    const s = await rc.getMyResearchContact()
    expect(s).toEqual({ state: 'none', consentedAt: null, diseases: [] })
  })

  test('取り消した後にもう一度同意すると、新しい行が足される（取り消した行は残る）', async () => {
    await rc.saveMyResearchContact({ consent: true, diseases: both }, deps)
    await rc.withdrawMyResearchContact()
    await rc.saveMyResearchContact({ consent: true, diseases: [both[0]] }, deps)
    expect(db.consents).toHaveLength(2)
    expect((await rc.getMyResearchContact())?.state).toBe('current')
  })

  test('所属する会が分からないとき（null）は、選べる病気が無い', () => {
    expect(rc.researchDiseaseOptions(null)).toEqual([])
  })

  test('選べる病気は重複をまとめ、名前の無い idx を落とす', () => {
    expect(rc.researchDiseaseOptions([3, 3, 99], (i: number) => names[i] ?? null)).toEqual([
      { idx: 3, name: 'ファブリー病' },
    ])
  })
})

describe('所属する会の disease_idxs（getMyGroupDiseaseIdxs）', () => {
  test('所属する会の JSON の病名から、いまの知識ファイル上の位置を作る。その位置の名前は元の病名', async () => {
    myGroupsMock.mockResolvedValue({ ok: true, value: [{ id: 'g1', slug: 'fabry-fukurou', name: 'x', role: 'member', joinedAt: 't' }] })
    const idxs = await rc.getMyGroupDiseaseIdxs()
    expect(idxs).not.toBeNull()
    expect(idxs!.length).toBeGreaterThan(0)
    expect(idxs!.map((i) => rc.knowledgeNameAt(i))).toEqual(['ファブリー病'])
  })

  test('所属する会が無ければ空、取得に失敗したら null', async () => {
    myGroupsMock.mockResolvedValue({ ok: true, value: [] })
    expect(await rc.getMyGroupDiseaseIdxs()).toEqual([])
    myGroupsMock.mockResolvedValue({ ok: false, reason: 'failed' })
    expect(await rc.getMyGroupDiseaseIdxs()).toBeNull()
  })
})
