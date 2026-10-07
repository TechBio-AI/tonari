/**
 * /demo/policy（このサイトの運営について）と /demo/for-groups（患者会の皆さまへ）の検査
 *
 *   1. 見出し・段落・リンクが、docs/site_policy_drafts_2026-09-26.md（正）に一字一句そのまま載っている
 *   2. 指示された項目が出る
 *   3. 「診断」という語を 1 文字も使わない（この 2 ページは一般名詞も含めて使わない）
 *   4. docs/wording-blocklist-demo.txt の禁止表現が含まれない
 */
import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'

import PolicyPage from '../policy/page'
import ForGroupsPage from '../for-groups/page'
import { POLICY_SECTIONS, POLICY_TITLE } from '../policy/content'
import { FOR_GROUPS_SECTIONS, FOR_GROUPS_TITLE } from '../for-groups/content'
import type { TextSection } from '../_components/TextSections'

const DRAFT = fs.readFileSync(path.join(process.cwd(), 'docs', 'site_policy_drafts_2026-09-26.md'), 'utf-8')

function loadBlocklist(): string[] {
  const p = path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt')
  return fs
    .readFileSync(p, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
}

/** 草案の中の、指定した「## 」章だけを取り出す（2 ページで同じ見出しがあっても取り違えない） */
function draftChapter(title: string): string {
  const heading = DRAFT.split('\n').find((l) => l.startsWith('## ') && l.endsWith(title))
  expect(heading).toBeDefined()
  const from = DRAFT.indexOf(heading!)
  const next = DRAFT.indexOf('\n## ', from + heading!.length)
  return DRAFT.slice(from, next === -1 ? undefined : next)
}

function expectMatchesDraft(chapterTitle: string, sections: readonly TextSection[]) {
  const chapter = draftChapter(chapterTitle)
  const lines = chapter.split('\n')
  for (const s of sections) {
    expect({ heading: s.title, found: lines.includes(`### ${s.title}`) }).toEqual({ heading: s.title, found: true })
    for (const p of s.body) {
      expect({ paragraph: p, found: lines.includes(p) }).toEqual({ paragraph: p, found: true })
    }
    for (const l of s.links ?? []) {
      const line = `- ${l.label} — ${l.href}`
      expect({ link: line, found: lines.includes(line) }).toEqual({ link: line, found: true })
    }
  }
}

function expectCleanWording(text: string) {
  expect(text).not.toContain('診断')
  for (const word of loadBlocklist()) {
    expect({ word, found: text.includes(word) }).toEqual({ word, found: false })
  }
}

test('草案であることが文書に明記されている', () => {
  expect(DRAFT).toContain('草案')
})

describe('/demo/policy', () => {
  test('文言は草案の文書と一字一句同じ', () => {
    expectMatchesDraft(POLICY_TITLE, POLICY_SECTIONS)
  })

  test('指示された項目が出る', () => {
    const { container } = render(<PolicyPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { level: 1, name: 'このサイトの運営について' })).toBeTruthy()
    for (const phrase of [
      '個人が運営',
      '無料',
      '営利を目的としたサイトではありません',
      'もとになった記述を記録',
      '機械で照合',
      '書かれていないことは書きません',
      'v2026-06-23',
      // A-5（2026-10-02）: HPO の用語は変えずに表示し、主な症状は言い換えであることを書く
      '用語そのものは変えずに表示',
      'やさしい言葉に言い換えたもの',
      // N-10: 患者会の紹介文の出どころ
      '各団体の公式サイトの記載をもとに運営が作成',
      'CC BY 4.0',
      '医療機器ではありません',
      '準備中',
      '資金の提供を受けていません',
      '広告も載せていません',
      '企業の都合で選ぶことはしません',
      '記録は、このサイトでは保存しません',
      // B-9: 配信事業者のアクセスログ
      '事業者の保持期間に従います',
      // 2026-10-02: 患者会への参加希望の仕組み
      '患者会への参加希望を登録できます',
      '都道府県・立場・会員かどうかごとの人数だけです',
      '参加希望を登録しても、会員エリアには入れません',
      // 2026-10-04: 病気ごとの参加の状況・研究・治験の案内・新しい会・公開のお知らせと行事
      'どなたにも無償で公開します',
      '10人未満の数は「10未満」と表示します',
      'お知らせするのは、公開の登録情報にあることだけです',
      'ご自身で登録情報の連絡先に連絡してください',
      '参加するかどうかは、主治医とご相談ください',
      '運営が見るのは、その人数だけです',
      '新しい会をつくる申請をできます',
      '承認すると会ができ、申請した方が世話人になります',
      // 2026-10-04: すでに患者会がある病気は、その会の意向を先に確かめる
      'その会の参加を先にして、別の会をつくるのはその会が辞退されたときだけにします',
      '会員でない方も、会の紹介ページで見られます',
      // A-1: 招待と、入会申請の承認の両方
      '患者会から招待を受けた方と、患者会に入会を申請して世話人の承認を受けた方',
    ]) {
      expect({ phrase, found: text.includes(phrase) }).toEqual({ phrase, found: true })
    }
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining(['https://www.nanbyou.or.jp/', 'https://www.shouman.jp/', 'https://www.orpha.net/']),
    )
  })

  test('「診断」も禁止表現も使わない', () => {
    const { container } = render(<PolicyPage />)
    expectCleanWording(container.textContent ?? '')
  })
})

describe('/demo/for-groups', () => {
  test('文言は草案の文書と一字一句同じ', () => {
    expectMatchesDraft(FOR_GROUPS_TITLE, FOR_GROUPS_SECTIONS)
  })

  test('指示された項目が出る', () => {
    const { container } = render(<ForGroupsPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { level: 1, name: '患者会の皆さまへ' })).toBeTruthy()
    for (const phrase of [
      '無料',
      '将来も',
      '費用をいただくことはありません',
      '当サイトが代わりに行います',
      'いつでも退去できます',
      // A-7（2026-10-02）: 返すもの・返さないものを実態どおりに
      '会の投稿・コメント、会員の表示名、行事、リンク集',
      '入会申請、行事への参加・不参加はお返ししません',
      '入会の申請を承認するかは、患者会の世話人が決めます',
      // N-1〜N-7・N-10
      '行事への参加・不参加は、ご本人と世話人だけが見ます',
      '大事な投稿を一覧の上に固定できます',
      '会の紹介ページにも表示されます',
      '通報した方が誰かは、世話人にもお伝えしません',
      '10人未満の数は伏せて表示します',
      '正式に公開する前に、必ず会の承認をいただきます',
      // 2026-10-04: 病気ごとの参加の状況・会員への研究・治験の案内・新しい会
      'この集計は無償で公開します',
      '公開の登録情報（jRCT・ClinicalTrials.gov）に載っている研究・治験だけです',
      '案内を出すかどうかは運営が決めます',
      '当サイトに新しい会ができ、申請した方が世話人になります',
      // 2026-10-04: すでに患者会がある病気は、その会の意向を先に確かめる
      '承認の前に、運営がその会に連絡してご意向を確かめます',
      '別の会をつくるのは、すでにある会が参加を辞退されたときだけです',
      // 2026-10-04: 申請者の氏名・連絡先は伝えない
      '申請した方の氏名や連絡先を、すでにある会にお伝えすることはありません',
      'お伝えするのは、申請があったことと、参加を希望している方の人数だけです',
      'ほかには使いません',
      '紹介文と連絡先の掲載から',
    ]) {
      expect({ phrase, found: text.includes(phrase) }).toEqual({ phrase, found: true })
    }
    expect(screen.getByRole('link', { name: 'プライバシーのページ' }).getAttribute('href')).toBe('/demo/privacy')
  })

  test('「診断」も禁止表現も使わない', () => {
    const { container } = render(<ForGroupsPage />)
    expectCleanWording(container.textContent ?? '')
  })
})
