/**
 * DB にだけある会（会の新設で作られた会。public_groups）の扱い（2026-10-04）
 *   1. /demo/groups の一覧に「紹介は準備中」で並ぶ（data にある会は二重に並べない。読めない・0 件なら何も出さない）
 *   2. 会のホームの案件の案内と JaSMIn の判定は、data の JSON ではなく DB（public_groups.disease_id）の病気で引く
 */
import { act, render } from '@testing-library/react'

const fetchPublicGroups = jest.fn()
jest.mock('../_lib/contract-db', () => ({
  ...jest.requireActual('../_lib/contract-db'),
  fetchPublicGroups: () => fetchPublicGroups(),
}))

jest.mock('next/navigation', () => ({ usePathname: () => '/demo/groups', notFound: () => { throw new Error('notFound') } }))

import GroupsPage from '../groups/page'
import { NewPublicGroups } from '../groups/_components/NewPublicGroups'
import { toNewPublicGroupItems } from '../groups/_lib/new-public-groups'
import { diseaseIdsOfGroup, isJasminTarget } from '../community/[slug]/_lib/group-diseases'

beforeEach(() => {
  fetchPublicGroups.mockReset()
  ;(global.fetch as jest.Mock).mockReset()
})

test('一覧用に拾い直す: data にある会は除き、病気は名前と疾患ページの slug', () => {
  const items = toNewPublicGroupItems([
    { slug: 'fabry-fukurou', name: 'data にある会', diseaseId: 'rd00001' },
    { slug: 'pompe-kai', name: 'ポンペ病の会', diseaseId: 'rd00005' },
    { slug: 'no-disease', name: '病気の無い会', diseaseId: null },
  ])
  expect(items).toEqual([
    { slug: 'pompe-kai', name: 'ポンペ病の会', disease: { name: 'ポンペ病', slug: 'pompe' } },
    { slug: 'no-disease', name: '病気の無い会', disease: null },
  ])
})

test('/demo/groups に、DB にだけある会が「紹介は準備中」で並ぶ（会のページ・疾患ページへのリンク）', async () => {
  ;(global.fetch as jest.Mock).mockImplementation(async (u: string) =>
    u === '/demo/public-groups'
      ? { ok: true, json: async () => ({ groups: [{ slug: 'pompe-kai', name: 'ポンペ病の会', disease: { name: 'ポンペ病', slug: 'pompe' } }] }) }
      : { ok: false }
  )
  let el!: HTMLElement
  await act(async () => {
    el = render(<GroupsPage />).container
  })
  const list = el.querySelector('[data-new-public-groups]')!
  expect(list).not.toBeNull()
  expect(list.querySelector('a[href="/demo/groups/pompe-kai"]')?.textContent).toBe('ポンペ病の会')
  expect(list.querySelector('a[href="/demo/diseases/pompe"]')).not.toBeNull()
  expect(list.textContent).toContain('紹介は準備中')
  expect(global.fetch).toHaveBeenCalledWith('/demo/public-groups')
})

test('読めない・0 件なら何も出さない', async () => {
  for (const impl of [async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ groups: [] }) }), async () => { throw new Error('x') }]) {
    ;(global.fetch as jest.Mock).mockImplementation(impl)
    let el!: HTMLElement
    await act(async () => {
      el = render(<NewPublicGroups />).container
    })
    expect(el.querySelector('[data-new-public-groups]')).toBeNull()
  }
})

test('会の病気は DB（public_groups.disease_id）から引く。DB に無ければ、data にある会でも空（JSON は見ない）', async () => {
  fetchPublicGroups.mockResolvedValue([{ slug: 'pku-new', name: 'フェニルケトン尿症の新しい会', diseaseId: 'rd00013', createdAt: 'x' }])
  expect(await diseaseIdsOfGroup('pku-new')).toEqual(['rd00013'])
  expect(await diseaseIdsOfGroup('fabry-fukurou')).toEqual([]) // data にはあるが、DB の行が無い
  fetchPublicGroups.mockResolvedValue(null) // 読めない
  expect(await diseaseIdsOfGroup('pku-new')).toEqual([])
})

test('JaSMIn は病気（固定 ID）で判定する: 会の新設で作られた会でも、先天代謝異常症の病気なら出る', () => {
  expect(isJasminTarget(['rd00013'])).toBe(true) // フェニルケトン尿症
  expect(isJasminTarget(['rd00001'])).toBe(true) // ファブリー病
  expect(isJasminTarget(['rd00015'])).toBe(false) // 脊髄性筋萎縮症
  expect(isJasminTarget(['rd00023'])).toBe(false) // 低ホスファターゼ症（対象か不明のため入れていない）
  expect(isJasminTarget([])).toBe(false)
})
