/**
 * 患者会のページ（公開。/demo/groups/[slug]）と一覧からのリンクの検査
 *
 *   1. 禁止表現（docs/wording-blocklist-demo.txt）が含まれない
 *   2. intro（公式サイトを出典にした下書き）を注記つきで出す。各文の末尾に出典。intro が無い団体は「準備中」のまま
 *   3. 公開のお知らせ・行事（表 public_group_items を anon で読む）は、あるときだけ節を出す。
 *      読む列を指定し、書いた人の情報は出さない。行事の online_url は出す。終わった行事は出さない
 *   4. 関連ページ（疾患・家族への情報・医療者向けは中身がある疾患だけ・相談窓口）と、会員エリアの節
 *   5. 一覧に無い slug は 404、静的生成は JSON の id と一致、600 秒ごとの作り直し
 */
import * as fs from 'fs'
import * as path from 'path'
import { render } from '@testing-library/react'

import { getPatientGroups } from '@/lib/portal/patient-groups'
import GroupsPage from '../groups/page'
import GroupPage, { dynamic, dynamicParams, generateStaticParams, revalidate } from '../groups/[slug]/page'
import { INTRO_DRAFT_NOTICE } from '../groups/_lib/intro'
import { PUBLIC_ITEM_COLUMNS, toPublicActivity } from '../groups/_lib/public-activity'

// 表 public_group_items を anon で読む部分（Supabase のクライアント）だけを差し替える。行を拾い直す関数は本物を使う
const rows = jest.fn()
const select = jest.fn()
const eq = jest.fn()
const from = jest.fn()
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      from(t)
      return {
        select: (cols: string) => {
          select(cols)
          return { eq: async (col: string, v: string) => (eq(col, v), { data: rows(), error: null }) }
        },
      }
    },
  }),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/groups',
  notFound: () => {
    throw new Error('notFound')
  },
}))

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

const groups = getPatientGroups()


type RawGroup = { id: string; url: string | null; intro?: { status: string; contact_url: string | null; facts: { kind: string; text: string; source_url: string }[] } }
const RAW: RawGroup[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'patient_groups', 'patient_groups.json'), 'utf-8')).groups
const withIntro = RAW.filter((g) => (g.intro?.facts.length ?? 0) > 0)
const withoutIntro = RAW.filter((g) => (g.intro?.facts.length ?? 0) === 0)

async function page(slug: string) {
  return render(await GroupPage({ params: { slug } })).container
}
const sectionOf = (c: HTMLElement, title: string) =>
  [...c.querySelectorAll('h2')].find((h) => h.textContent === title)?.closest('section') ?? null
const sectionText = (c: HTMLElement, title: string) => (sectionOf(c, title)?.textContent ?? '').replace(title, '').trim()

const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  rows.mockReset().mockReturnValue([])
  select.mockReset()
  eq.mockReset()
  from.mockReset()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})
afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('/demo/groups/[slug]', () => {
  test('静的生成で、生成するのは JSON の id と同じ。600 秒ごとに作り直す', () => {
    expect(dynamic).toBe('force-static')
    // 2026-10-03: data に無い会（会の新設で作られた会。public_groups）も出すため、未生成の slug を受け付ける
    expect(dynamicParams).toBe(true)
    expect(revalidate).toBe(600)
    expect(generateStaticParams()).toEqual(groups.map((g) => ({ slug: g.id })))
    expect(groups.length).toBeGreaterThan(0)
  })

  test.each(groups.map((g) => [g.id]))('%s: 禁止表現が無く、見出しがそろい、会員エリアの節がある', async (id) => {
    const g = groups.find((x) => x.id === id)!
    const c = await page(id)
    expect({ id, hits: BLOCKLIST.filter((w) => c.innerHTML.includes(w)) }).toEqual({ id, hits: [] })

    expect(c.querySelector('h1')?.textContent).toBe(g.name)
    const headings = [...c.querySelectorAll('h2')].map((h) => h.textContent)
    // 公開のお知らせ・行事が無いときは、その節ごと出ない
    expect(headings).toEqual(['紹介文', '対象の病気', '活動内容', '連絡先', '入会のご案内', '関連ページ', 'となりの会員エリア'])

    const area = c.querySelector('[data-member-area]')!
    expect(area.textContent).toContain('会員エリアへの参加は患者会からの招待が必要です。ご希望は会の連絡先へ。')
    // ログインの入口は「すでに会員の方」にだけ。申請の入口は置かない（新しくアカウントは作れない）
    const links = [...area.querySelectorAll('a')]
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe(`/demo/community/${encodeURIComponent(id)}`)
    expect(links[0].closest('div')?.textContent).toContain('すでに会員の方')
    expect(area.textContent).not.toContain('申請')
  })

  test.each(withIntro.map((g) => [g.id]))('%s（intro あり）: 冒頭の注記、各文の末尾に公式サイトの出典、連絡先ページへのリンク', async (id) => {
    const raw = RAW.find((g) => g.id === id)!
    const c = await page(id)
    expect(c.querySelector('[data-intro-notice]')?.textContent).toBe('紹介文は公式サイトの記載をもとに運営が作成しました。団体による確認はこれからです。')
    expect(INTRO_DRAFT_NOTICE).toBe('紹介文は公式サイトの記載をもとに運営が作成しました。団体による確認はこれからです。')
    // 注記は紹介文より前（ページ冒頭）
    const notice = c.querySelector('[data-intro-notice]')!
    expect(notice.compareDocumentPosition(sectionOf(c, '紹介文')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const shown = [...c.querySelectorAll('[data-intro-fact]')]
    expect(shown.length).toBe(raw.intro!.facts.filter((f) => ['name', 'founded', 'target', 'members', 'activity', 'contact', 'join'].includes(f.kind)).length)
    const officialHost = new URL(raw.url!).hostname.replace(/^www\./, '')
    for (const li of shown) {
      const src = li.querySelector('a[data-source]')!
      expect(new URL(src.getAttribute('href')!).hostname.replace(/^www\./, '')).toBe(officialHost)
      expect(li.lastElementChild?.contains(src)).toBe(true) // 出典は末尾
    }
    // 文は JSON の text そのまま（作り足さない）
    const texts = new Set(raw.intro!.facts.map((f) => f.text))
    for (const li of shown) expect(texts.has((li.firstChild?.textContent ?? '').trim())).toBe(true)
    // evidence（原文の抜き書き）は出さない
    expect(c.innerHTML).not.toContain('evidence')

    if (raw.intro!.contact_url) {
      expect(c.querySelector('[data-contact-link]')?.getAttribute('href')).toBe(raw.intro!.contact_url)
    }
    // 入会の文は intro に無いので「公式サイトをご覧ください」
    if (!raw.intro!.facts.some((f) => f.kind === 'join')) {
      expect(sectionText(c, '入会のご案内')).toBe('公式サイトをご覧ください')
    }
  })

  test.each(withoutIntro.map((g) => [g.id]))('%s（intro なし）: 注記を出さず、紹介文・活動内容・連絡先・入会のご案内は「準備中」のまま', async (id) => {
    const c = await page(id)
    expect(c.querySelector('[data-intro-notice]')).toBeNull()
    expect(c.querySelector('[data-intro-fact]')).toBeNull()
    for (const t of ['紹介文', '活動内容', '入会のご案内']) expect(sectionText(c, t)).toBe('準備中')
    expect(sectionText(c, '連絡先')).toContain('準備中')
    expect(c.querySelector('[data-contact-link]')).toBeNull()
  })

  test('intro なしの団体が 2 つあること（データの前提。変わったらこのテストを見直す）', () => {
    expect(withoutIntro.map((g) => g.id).sort()).toEqual(['hpp-hope', 'sma-kazoku'])
  })

  test('対象の病気は疾患ページへリンクする（ファブリー病 → /demo/diseases/fabry）', async () => {
    const g = groups.find((x) => x.diseases.includes('ファブリー病'))!
    const c = await page(g.id)
    const link = [...sectionOf(c, '対象の病気')!.querySelectorAll('a')].find((a) => a.textContent === 'ファブリー病')
    expect(link?.getAttribute('href')).toBe('/demo/diseases/fabry')
  })

  test('URL が null の会は、公式サイトのリンクを出さず確認中と書く', async () => {
    const g = groups.find((x) => x.url === null)
    if (!g) return
    const c = await page(g.id)
    expect(c.textContent).toContain('公式サイトのURLは、いま確認しています。')
    expect([...c.querySelectorAll('a[target="_blank"]')]).toHaveLength(0)
  })

  test('一覧に無い slug は 404', async () => {
    await expect(GroupPage({ params: { slug: 'no-such-group' } })).rejects.toThrow('notFound')
  })
})

describe('公開のお知らせ・これからの公開の行事', () => {
  test('表 public_group_items を group_slug で引き、読む列を指定する（書いた人の列を読まない）', async () => {
    await page('fabry-fukurou')
    expect(from).toHaveBeenCalledWith('public_group_items')
    expect(select).toHaveBeenCalledWith('kind, title, body, starts_at, ends_at, place, online_url, published_at')
    expect(PUBLIC_ITEM_COLUMNS).not.toMatch(/author|user|created_by|display/)
    expect(eq).toHaveBeenCalledWith('group_slug', 'fabry-fukurou')
  })

  test('公開項目がゼロなら、節ごと出さない', async () => {
    const c = await page('fabry-fukurou')
    expect(c.querySelector('[data-public-notices]')).toBeNull()
    expect(c.querySelector('[data-public-events]')).toBeNull()
  })

  test('Supabase が未設定・読めないときも、節ごと出さない', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const c = await page('fabry-fukurou')
    expect(from).not.toHaveBeenCalled()
    expect(c.querySelector('[data-public-notices], [data-public-events]')).toBeNull()
  })

  test('あれば出す。行事の online_url も出す。表に余計な列があっても書いた人の情報は出さない', async () => {
    rows.mockReturnValue([
      { kind: 'notice', title: '公開のお知らせの題', body: '本文です', published_at: '2026-10-01T00:00:00Z', author_id: 'user-secret-1', author_display_name: 'はなこ' },
      { kind: 'event', title: '交流会の題', starts_at: '2099-11-03T01:00:00Z', ends_at: null, place: '東京都内', online_url: 'https://example.com/meet/abc', body: null, created_by: 'user-secret-2', author: 'さくら' },
    ])
    const c = await page('fabry-fukurou')
    const n = c.querySelector('[data-public-notices]')!
    expect(n.textContent).toContain('公開のお知らせの題')
    expect(n.textContent).toContain('2026年10月1日')
    const e = c.querySelector('[data-public-events]')!
    expect(e.textContent).toContain('交流会の題')
    expect(e.textContent).toContain('2099年11月3日・東京都内')
    const url = e.querySelector('[data-online-url] a')!
    expect(url.getAttribute('href')).toBe('https://example.com/meet/abc')
    expect(url.getAttribute('rel')).toContain('noopener')
    expect(c.innerHTML).not.toContain('user-secret')
    expect(c.textContent).not.toContain('はなこ')
    expect(c.textContent).not.toContain('さくら')
    expect(BLOCKLIST.filter((w) => c.innerHTML.includes(w))).toEqual([])
  })

  test('拾い直した行に、書いた人の項目が無い（anon で見えるもの）', () => {
    const a = toPublicActivity(
      [
        { kind: 'notice', title: 't', body: 'b', published_at: '2026-10-01', author_id: 'u', author: 'a', display_name: 'd' },
        { kind: 'event', title: 'e', starts_at: '2099-11-01', online_url: 'https://x.example/', author_id: 'u', created_by: 'u' },
      ],
      new Date('2026-10-02T00:00:00Z')
    )
    expect(a.notices).toEqual([{ title: 't', body: 'b', date: '2026-10-01' }])
    expect(a.events).toEqual([{ title: 'e', startsAt: '2099-11-01', endsAt: null, place: null, onlineUrl: 'https://x.example/', body: null }])
    for (const row of [...a.notices, ...a.events]) {
      for (const k of Object.keys(row)) expect(k).not.toMatch(/author|created_by|user|display/)
    }
  })

  test('終わった行事は出さない。http(s) 以外の online_url は出さない。知らない kind・題の無い行は出さない', () => {
    const now = new Date('2026-10-02T00:00:00Z')
    const a = toPublicActivity(
      [
        { kind: 'event', title: '終わった', starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-09-01T02:00:00Z' },
        { kind: 'event', title: '開催中', starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-03T00:00:00Z' },
        { kind: 'event', title: '後', starts_at: '2026-12-01T00:00:00Z', online_url: 'javascript:alert(1)' },
        { kind: 'event', title: '先', starts_at: '2026-11-01T00:00:00Z' },
        { kind: 'memo', title: '知らない種類' },
        { kind: 'notice' },
      ],
      now
    )
    expect(a.events.map((e) => e.title)).toEqual(['開催中', '先', '後'])
    expect(a.events.find((e) => e.title === '後')!.onlineUrl).toBeNull()
    expect(a.notices).toEqual([])
    expect(toPublicActivity(null)).toEqual({ notices: [], events: [] })
  })

  test('お知らせは新しい順', () => {
    const a = toPublicActivity([
      { kind: 'notice', title: '古い', published_at: '2026-09-01T00:00:00Z' },
      { kind: 'notice', title: '新しい', published_at: '2026-10-01T00:00:00Z' },
    ])
    expect(a.notices.map((n) => n.title)).toEqual(['新しい', '古い'])
  })
})

describe('関連ページ', () => {
  test('疾患ページ・家族への情報・医療者向け（中身がある疾患だけ）・相談窓口', async () => {
    const c = await page('fabry-fukurou')
    const hrefs = [...c.querySelector('[data-related]')!.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/demo/diseases/fabry')
    expect(hrefs).toContain('/demo/support-centers')
    // 家族への情報・医療者向けは、data/disease_extras にある疾患だけ
    const hasExtras = fs.existsSync(path.join(process.cwd(), 'data', 'disease_extras', 'fabry.json'))
    expect(hrefs.includes('/demo/diseases/fabry/family')).toBe(hasExtras)
  })

  test('追加資料の無い疾患には、家族への情報・医療者向けのリンクを出さない', async () => {
    const c = await page('gaucher-japan')
    const hrefs = [...c.querySelector('[data-related]')!.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/demo/diseases/gaucher')
    expect(hrefs.some((h) => h?.endsWith('/family') || h?.endsWith('/for-clinicians'))).toBe(false)
  })
})

describe('/demo/groups（一覧）', () => {
  test('各会のページへリンクする', () => {
    const { container } = render(<GroupsPage />)
    const hrefs = new Set([...container.querySelectorAll('a')].map((a) => a.getAttribute('href')))
    for (const g of groups) {
      expect(hrefs.has(`/demo/groups/${encodeURIComponent(g.id)}`)).toBe(true)
    }
  })
})

describe('疾患ページの「患者会」欄', () => {
  test('会のページ /demo/groups/[slug] へリンクし、公式サイトへの直接のリンクは出さない', () => {
    const DiseasePage = require('../diseases/[slug]/page').default
    const { container } = render(<DiseasePage params={{ slug: 'fabry' }} />)
    const section = [...container.querySelectorAll('h2')].find((h) => h.textContent === '患者会')!.closest('section')!
    const hrefs = [...section.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/demo/groups/fabry-fukurou')
    expect(hrefs).toContain('/demo/groups') // 一覧への導線は残す
    expect(section.querySelectorAll('a[target="_blank"]')).toHaveLength(0)
    expect(hrefs).not.toContain('https://fabrynet.jp')
  })
})
