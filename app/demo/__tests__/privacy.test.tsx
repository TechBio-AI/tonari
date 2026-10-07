/**
 * /demo/privacy と、フッターの 3 導線の検査
 *
 *   1. 利用目的は purpose.ts の USAGE_PURPOSE_TEXT が一字一句そのまま出る（同意画面と同じ文）
 *   2. 決めた 8 項目（収集する情報・利用目的・見える範囲・保存先・退会時の削除・企業への提供・再同意・お問い合わせ）が出る
 *   3. docs/wording-blocklist-demo.txt の禁止表現が含まれない
 *   4. フッターに「プライバシー」「このサイトの運営について」「患者会の皆さまへ」が固定のパスで出る
 */
import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'

import PrivacyPage from '../privacy/page'
import { DemoFooter } from '../_components/DemoFooter'
import { USAGE_PURPOSE_TEXT } from '../community/_components/purpose'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/privacy',
}))

// MemberEntry はセッションを見る。ここではフッターの導線だけを見るので、中身は空にする
jest.mock('../_components/MemberEntry', () => ({ MemberEntry: () => null }))

function loadBlocklist(): string[] {
  const p = path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt')
  return fs
    .readFileSync(p, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
}

describe('/demo/privacy', () => {
  test('利用目的は同意画面と同じ文を、一字一句そのまま出す', () => {
    const { container } = render(<PrivacyPage />)
    expect(container.textContent).toContain(USAGE_PURPOSE_TEXT)
    // base 版 3（2026-10-02。利用目的を実態に合わせた）
    expect(USAGE_PURPOSE_TEXT).toBe(
      'お預かりする情報は、患者会ごとの会員の場の運営と、相談窓口のご案内にのみ使います。' +
        'お住まいの都道府県は、相談窓口のご案内と、会ごとの人数の集計に使います。' +
        '世話人は、会員の年代・性別・お住まいの地方などの人数の集計を見ます。集計では、10人未満の数は伏せます。' +
        '行事への参加・不参加は、ご本人と世話人だけが見ます。' +
        '企業への提供はしません。将来、別の目的で使う場合は改めて同意をお願いします。' +
        '患者さんが18歳未満のときは、保護者の方が法定代理人として同意します。' +
        '18歳以上の患者さんの代わりに登録するときは、ご本人の意思に基づいて代わりに入力します',
    )
  })

  test('決めた項目がすべて出る', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''
    for (const heading of ['お預かりする情報', '利用目的', '見える範囲', '保存先', '退会とアカウントの削除', '保存する期間', '投稿・コメントの通報', '病気がわかるまでの道のり調査', '企業への提供', '目的を変えるとき', 'お問い合わせ']) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeTruthy()
    }
    for (const item of ['氏名', '表示名', 'ご本人か、ご家族・代理の方か', '続柄（代理の方のとき）', '患者さんが18歳未満か（代理の方のとき）', '年代', '性別', 'メールアドレス']) {
      expect(screen.getByText(item, { selector: 'li' })).toBeTruthy()
    }
    // 都道府県は「患者さんについて」と「患者会への参加希望を登録したとき」の両方に出る
    expect(screen.getAllByText('お住まいの都道府県', { selector: 'li' })).toHaveLength(2)
    // 2026-10-02: 患者会への参加希望（同意 wish 版 1）
    for (const item of ['病気', '立場（ご本人かご家族か）', 'その病気の患者会（当サイトの外の団体）の会員かどうか（任意）']) {
      expect(screen.getByText(item, { selector: 'li' })).toBeTruthy()
    }
    expect(screen.getByRole('heading', { level: 3, name: '患者会への参加希望を登録したとき' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: '患者会への参加希望' })).toBeTruthy()
    expect(text).toContain('希望する方の人数と、都道府県・立場・会員かどうかごとの人数を伝えます。お一人お一人の情報は伝えません')
    expect(text).toContain('公開ページには、希望する方の人数だけを出します。10人未満の数は伏せます')
    expect(text).toContain('参加希望を登録しても、患者会の会員エリアに入れるわけではありません')
    // 紹介者の氏名（任意。第三者の氏名）も集める項目に載せる（入会申請のとき）
    expect(screen.getByText('紹介者の氏名（任意。第三者の氏名）', { selector: 'li' })).toBeTruthy()
    // B-1〜B-4・N-1・N-5（2026-10-02）: 会員エリアでできる記録
    for (const item of ['申請のひとこと', '所属している会・役割・入会日・退会日', '投稿・コメントの本文', '行事への参加・不参加', '通報の記録（どの投稿・コメントを通報したか、理由）', '同意の記録（どの説明に、いつ同意したか）', '案内を受け取る病気の名前']) {
      expect(screen.getByText(item, { selector: 'li' })).toBeTruthy()
    }
    for (const heading of ['登録する方について', '患者さんについて', '入会申請のとき', '会員エリアを使うとき', '研究・治験の案内を希望したとき']) {
      expect(screen.getByRole('heading', { level: 3, name: heading })).toBeTruthy()
    }
    expect(text).toContain('患者さんの氏名と生年月日はお預かりしません')
    expect(text).toContain('代理の方ご自身の年代・性別はお預かりしません')
    expect(text).toContain('登録した方ご本人と運営です')
    expect(text).toContain('氏名は運営と、入会審査をする世話人が見ます。')
    expect(text).toContain('ほかの会員には、表示名だけが表示されます')
    expect(text).toContain('Supabase')
    // A-2・B-5・N-8・N-9（2026-10-02）: 退会では消さない／アカウント削除で消す（メールも）／期限なし／バックアップ
    expect(text).not.toContain('退会されたときは、お預かりした情報を削除します')
    expect(text).toContain('会を退会しても、お預かりした情報は削除しません')
    expect(text).toContain('ログインに使うメールアドレスを削除します')
    expect(text).toContain('投稿とコメントの本文は、アカウントを削除した後も会に残ります')
    expect(text).toContain('保存の期限を設けていません')
    expect(text).toContain('バックアップには一定期間残ります')
    // A-4・N-1・N-5・N-6・N-7・B-10: 世話人に見えるもの、公開ページ、書き手の記号
    expect(text).toContain('次のものは世話人も見ます')
    expect(text).toContain('10人未満の数は伏せます')
    expect(text).toContain('参加する人数は、ほかの会員には表示しません')
    expect(text).toContain('通報した方が誰かは、世話人にも伝えません')
    expect(text).toContain('会員でない方も、会の紹介ページで見られます')
    expect(text).toContain('書いた方を見分けるための記号')
    // A-3: 申告を確かめる仕組みは無い
    expect(text).not.toContain('申告の内容は、入会審査をする世話人が確かめます')
    expect(text).toContain('申告の内容を、運営や世話人が確かめる仕組みは、いまはありません')
    // B-6: 紹介者の氏名とひとことは審査の後も残る
    expect(text).toContain('紹介者の氏名と申請のひとことは、審査の後も残ります')
    expect(text).toContain('企業に提供することはしません')
    expect(text).toContain('改めて同意をお願いします')
    expect(text).toContain('窓口は準備中です')
  })

  test('性別の選び方の項: 選択肢は「男性」「女性」「答えない」。「その他」は出さない', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { level: 2, name: '性別の選び方' })).toBeTruthy()
    expect(text).toContain('性別は患者さんの性別で、「男性」「女性」「答えない」から選びます')
    expect(text).not.toContain('「その他」')
  })

  test('保護者・代理の方が登録する場合の項と、入会申請の項', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { level: 2, name: '保護者・代理の方が登録する場合' })).toBeTruthy()
    expect(text).toContain('原則として患者さんご本人が登録します')
    expect(text).toContain('患者さんが18歳未満のとき、または18歳以上で患者さんご本人が自分では操作できないときです')
    expect(text).toContain('保護者の方が法定代理人として同意します')
    expect(text).toContain('ご本人の意思に基づいて代わりに入力します')
    expect(text).toContain('18歳以上の患者さんは、できるかぎりご本人が登録してください')
    expect(screen.getByRole('heading', { level: 2, name: '入会申請のとき' })).toBeTruthy()
    expect(text).toContain('入会申請では、紹介者がいる場合その氏名をお預かりし、審査にだけ使います。')
  })

  test('研究・治験の案内（B 層）の項: 希望する方だけ・会員エリアに表示・本人が連絡・人数だけ数える・個人情報を渡さない・取り消しで病気の記録を削除', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''
    expect(screen.getByRole('heading', { level: 2, name: '研究・治験の案内（希望する方だけ）' })).toBeTruthy()
    expect(text).toContain('希望されない方には表示しません')
    // 2026-10-03: 案件の案内（共通契約 C）と research_contact 版 2 に合わせた
    expect(text).not.toContain('案内は当サイトから届きます')
    expect(text).toContain('会員エリアに表示します')
    expect(text).toContain('ご自身で案内先に連絡してください')
    expect(text).toContain('運営が見るのは、それぞれの人数だけです')
    expect(text).toContain('企業に、氏名・メールアドレスなどの個人情報を渡すことはありません')
    expect(text).toContain('同意をいただくまで、案内は表示しません')
    expect(text).toContain('個人情報を渡すことはありません')
    expect(text).toContain('選んだ病気の記録を削除し、案内は表示しなくなります')
  })

  test('禁止表現を含まない', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''
    for (const word of loadBlocklist()) {
      expect({ word, found: text.includes(word) }).toEqual({ word, found: false })
    }
  })
})

describe('フッターの導線', () => {
  test('3 つの導線が固定のパスで出る', () => {
    render(<DemoFooter />)
    const expected: Array<[string, string]> = [
      ['プライバシー', '/demo/privacy'],
      ['このサイトの運営について', '/demo/policy'],
      ['患者会の皆さまへ', '/demo/for-groups'],
    ]
    for (const [label, href] of expected) {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href)
    }
  })
})
