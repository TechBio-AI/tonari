/**
 * 会員の入口（/demo）
 *
 * 入口は 2 か所だけ。患者会のページの末尾と、公開層のフッター。
 * ヘッダーには置かない（公開層の顔は、だれでも見られるものだけにする）。
 *
 * 公開層はログインの有無を見ない。文言は 1 種類、行き先は常に会員向けページで、
 * 入れるかどうかは middleware.ts が決める（未ログインなら /demo/login へ送られる。
 * その境界は access-boundary.test.ts で見る）。おかげでページは静的なまま置ける。
 */
import { render } from '@testing-library/react'

import DemoLayout from '../layout'
import GroupsPage, { dynamic as groupsDynamic } from '../groups/page'
import { MEMBER_ENTRY_HREF, MEMBER_ENTRY_LABEL } from '../_components/MemberEntry'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/groups',
}))

/** 患者会のページを、レイアウト（ヘッダー・フッター込み）ごと描く */
const renderGroups = () => render(<DemoLayout><GroupsPage /></DemoLayout>)

const hrefs = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLAnchorElement>('a')].map((a) => a.getAttribute('href'))

describe('会員の入口', () => {
  test('患者会のページの末尾とフッターの 2 か所にあり、どちらも同じ文言で会員向けページへ向く', () => {
    const { container } = renderGroups()

    const entries = [...container.querySelectorAll(`a[href="${MEMBER_ENTRY_HREF}"]`)]
    expect(entries.length).toBe(2)
    for (const entry of entries) {
      expect(entry.textContent).toContain(MEMBER_ENTRY_LABEL)
    }

    // 1 つ目は本文の末尾、2 つ目はフッターの中
    const main = container.querySelector('main')!
    expect(main.querySelector('section:last-of-type')!.contains(entries[0])).toBe(true)
    expect(container.querySelector('footer')!.contains(entries[1])).toBe(true)
  })

  test('文言は 1 種類。ログインの有無で変わる言い方を置かない', () => {
    const { container } = renderGroups()
    const text = container.textContent ?? ''

    expect(text.split(MEMBER_ENTRY_LABEL).length - 1).toBe(2)
    expect(text).not.toContain('会員向けページ')
    expect(text).not.toContain('ログイン')
  })

  test('/demo/login へ直接向かう導線は公開層に置かない（送るのは middleware の役目）', () => {
    const { container } = renderGroups()
    expect(hrefs(container)).not.toContain('/demo/login')
  })

  test('ヘッダーには入口を置かない', () => {
    const { container } = renderGroups()
    const header = container.querySelector('header')!
    expect(hrefs(header)).toEqual(['/demo', '/demo/groups', '/demo/diseases', '/demo/about'])
  })

  test('患者会のページ以外（フッターだけ）では入口は 1 か所', () => {
    const { container } = render(<DemoLayout><p>本文</p></DemoLayout>)
    expect(container.querySelectorAll(`a[href="${MEMBER_ENTRY_HREF}"]`).length).toBe(1)
    expect(container.querySelector('main')!.querySelectorAll('a').length).toBe(0)
  })

  test('患者会のページは静的なまま（セッションを見ないので静的に書き出せる）', () => {
    expect(groupsDynamic).toBe('force-static')
  })
})
