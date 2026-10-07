/**
 * /demo の表現の検査（患者・家族向けのガードレール）
 *
 * 各ページを実際に描画し、生成された HTML に対して:
 *   1. docs/wording-blocklist-demo.txt の禁止表現が含まれない
 *   2. パーセントが単独で出ない（必ず実数の内訳が続く）
 *   3. くわしい説明が無い病気のページに、説明文と ORPHA 番号が出ない
 * を検査する。
 * 症状検索（結果画面）の検査は 2026-09-12 に旧ツールへ移した（docs/DECISIONS.md）。
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen } from '@testing-library/react'

import { diseaseSortKey, getDiseaseStub, listAllDiseases } from '@/lib/portal/diseases'

import DemoLayout from '../layout'
import TopPage from '../page'
import AboutPage from '../about/page'
import GroupsPage from '../groups/page'
import DiseaseIndexPage from '../diseases/page'
import DiseasePage from '../diseases/[slug]/page'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  notFound: () => {
    throw new Error('notFound')
  },
}))

// ---- 禁止語の読み込み（scripts/lint-wording.sh と同じ書式） -----------------
function loadBlocklist(): string[] {
  const p = path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt')
  return fs
    .readFileSync(p, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
}
const BLOCKLIST = loadBlocklist()

function expectNoBlockedWords(html: string, where: string) {
  const hits = BLOCKLIST.filter((w) => html.includes(w))
  expect({ where, hits }).toEqual({ where, hits: [] })
}

function renderInLayout(page: React.ReactElement) {
  return render(<DemoLayout>{page}</DemoLayout>)
}

// ---- 静的なページ ---------------------------------------------------------
describe('静的なページに禁止表現が無い', () => {
  test('トップ', () => {
    const { container } = renderInLayout(<TopPage />)
    expectNoBlockedWords(container.innerHTML, 'top')
    expect(container.textContent).toContain('病気は違っても')
    expect(container.textContent).toContain('となり')
  })
  test('このサイトについて', () => {
    const { container } = renderInLayout(<AboutPage />)
    expectNoBlockedWords(container.innerHTML, 'about')
  })
  test('患者会', () => {
    const { container } = renderInLayout(<GroupsPage />)
    expectNoBlockedWords(container.innerHTML, 'groups')
    expect(container.textContent).toContain('参加している患者会') // 2026-10-02: 患者会が加わることは「参加」と言う
  })
  test('病気の一覧', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    expectNoBlockedWords(container.innerHTML, 'diseases')
  })
  test('病気のページ（くわしい説明あり: ファブリー病）。構成の順と、薬剤名が出ないこと', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: 'fabry' }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/fabry')
    const text = container.textContent ?? ''
    // 見出し（h2 と折りたたみの summary）の順が指示どおり
    const headings = [...container.querySelectorAll('main h2, main summary')].map((h) => (h.textContent ?? '').replace(/（.*）/, '').trim())
    expect(headings).toEqual(['この病気について', 'よくある症状', '治療について', '病気の概要', '相談できる診療科', '制度と支援', '患者会', '家族と医療者への情報', 'くわしい症状の一覧'])
    expect(text).toContain('汗をかきにくい') // よくある症状（患者の言葉）
    expect(text).not.toContain('アガルシダーゼ') // 薬剤名は出さない
    expect(text).not.toContain('ミガーラスタット')
    expect(text).toContain('小児慢性特定疾病の対象') // 制度と支援は照合表（小慢 exact）由来
  })
  test('病気のページ（くわしい説明あり: ゴーシェ病）。検査所見は「よくある症状」に出ず、折りたたみの中で「検査でわかること」に入る', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: 'gaucher' }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/gaucher')
    const text = container.textContent ?? ''
    expect(text).toContain('お腹が張る、脾臓や肝臓が大きくなる')
    const details = container.querySelector('details')!
    expect(details).not.toBeNull()
    expect(details.querySelector('summary')?.textContent).toContain('くわしい症状の一覧（88件）')
    expect(details.textContent).toContain('検査でわかること')
    expect(details.textContent).toContain('β-グルコセレブロシダーゼ')
    // 「よくある症状」の中には検査所見が無い（説明文にある酵素名は別。ここは症状の箇条書きだけを見る）
    const common = [...container.querySelectorAll('main h2')].find((h) => h.textContent === 'よくある症状')!.closest('section')!
    expect(common.textContent).not.toContain('β-グルコセレブロシダーゼ')
    expect(common.textContent).not.toContain('CCL18')
    expect(common.textContent).not.toContain('フェリチン')
    expect(text).not.toContain('イミグルセラーゼ')
  })
  test('病気のページ（くわしい説明あり: 遺伝性ATTR型アミロイドーシス。HPO 由来の症状と帰属表示）', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: 'attr' }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/attr')
    expect(container.textContent).toContain('筋虚弱') // HPO 由来（日本語ラベル。折りたたみの中）
    expect(container.textContent).not.toContain('Muscle weakness') // 英語ラベルは出さない
    expect(container.textContent).toContain('Human Phenotype Ontology') // 帰属表示（ライセンス条件 3）
    expect(container.textContent).toContain('脳神経内科')
    expect(container.textContent).toContain('手根管症候群') // 2026-09-13 ファウンダー判定で併記を残す
    expect(container.textContent).not.toContain('タファミジス')
  })
  test('病気のページ（フェニルケトン尿症）に「治療をしない場合」の前置きがある', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: 'pku' }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/pku')
    expect(container.textContent).toContain('治療をしない場合')
  })
  test('病気のページ（準備中）には説明文と ORPHA 番号が出ない', () => {
    // 概要の抽出が進行中なので病名を固定しない。その時点で概要ファイルが無い疾患（11 疾患以外）を選ぶ
    const { DISEASE_OVERVIEWS_RELATIVE_DIR, knowledgeFilePositionOf } = jest.requireActual('@/lib/portal/disease-overviews')
    const hasOverviewFile = (n: string) =>
      fs.existsSync(path.join(process.cwd(), DISEASE_OVERVIEWS_RELATIVE_DIR, `${knowledgeFilePositionOf(n)}.json`))
    const stub = listAllDiseases().find((d) => !d.detailed && !hasOverviewFile(d.name))
    expect(stub).toBeDefined()
    const name = getDiseaseStub(encodeURIComponent(stub!.name))!.name
    const { container } = renderInLayout(<DiseasePage params={{ slug: encodeURIComponent(name) }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/stub')
    // ORPHA は表示テキストだけを見る（構造化データの script の中身は除く。2026-09-25 docs/DECISIONS.md）
    const visible = container.cloneNode(true) as HTMLElement
    visible.querySelectorAll('script').forEach((s) => s.remove())
    expect(visible.textContent).not.toContain('ORPHA:')
    expect(container.textContent).toContain('準備')
  })
})

// ---- 疾患一覧の構造 -------------------------------------------------------
describe('疾患一覧の構造', () => {
  test('初期表示に疾患カードが 1 枚も無い（検索かタブを押すまで出さない）', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    // カードは <li><a href="/demo/diseases/..."> の形。ここに 1 件も無いこと
    const cards = container.querySelectorAll('li a[href^="/demo/diseases/"]')
    expect(cards.length).toBe(0)
    // 検索欄とタブはある
    expect(screen.getByLabelText('病名でさがす')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^あ / })).toBeInTheDocument()
  })

  test('「くわしい説明がある病気」の別枠を持たない', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    expect(container.textContent).not.toContain('くわしい説明がある病気')
  })

  test('「あ」を押すと読みが「あ」行の病気だけが出て、各カードに ●・○・無印（準備中）のいずれかが付く', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    fireEvent.click(screen.getByRole('button', { name: /^あ / }))
    const cards = [...container.querySelectorAll('li a[href^="/demo/diseases/"]')]
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      const text = card.textContent ?? ''
      // 3 段階（2026-09-25）: 記号と文言は必ず対で出る。● くわしい説明あり／○ 病気の概要あり／無印 準備中
      const pair = [text.includes('●'), text.includes('○'), text.includes('くわしい説明あり'), text.includes('病気の概要あり'), text.includes('準備中')]
      expect([
        [true, false, true, false, false],
        [false, true, false, true, false],
        [false, false, false, false, true],
      ]).toContainEqual(pair)
    }
    const names = cards.map((c) => c.querySelector('[data-disease-name]')?.textContent ?? '')
    // 読みで「あ」行に置かれた漢字・英字始まりの病名が入っている（読みの仕組み）
    expect(names).toContain('遺伝性ATTR型アミロイドーシス') // いでんせい…
    expect(names).toContain('X連鎖性低リン血症性くる病') // えっくす…
    // 他の行（読みが「か」行の病名）が混ざっていないこと
    expect(names).not.toContain('ゴーシェ病')
    expect(names).not.toContain('軟骨無形成症')
  })

  test('「漢字（読みを準備中）」と「英数」のタブが出ない（全 951 疾患に読みが付いたため）', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    // 2026-09-13: 読みを 820 件付け終え、読みの無い日本語名が 0 件になった。
    // 日本語名を持たない 3 件も読みで五十音へ移ったので、英数の枠も空になっている。
    expect(screen.queryByRole('button', { name: /^漢字/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^英数/ })).toBeNull()
    // 残るのは五十音の 10 行だけ
    const group = container.querySelector('[aria-label="頭文字"]')!
    const tabs = [...group.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim().charAt(0))
    expect(tabs).toEqual(['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'])
  })

  test('日本語の病名が無い病気は、読みで五十音に置かれ、ページに日本語の説明が出る', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    // りっぷりんぐ… なので ら行
    fireEvent.click(screen.getByRole('button', { name: /^ら / }))
    const names = [...container.querySelectorAll('li a[href^="/demo/diseases/"]')].map((c) => c.querySelector('[data-disease-name]')?.textContent ?? '')
    expect(names).toContain('Rippling Muscle Disease')
  })

  test('日本語の病名が無い病気のページに、説明と別名が出て、ORPHA 番号は出ない', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: encodeURIComponent('Rippling Muscle Disease') }} />)
    expectNoBlockedWords(container.innerHTML, 'disease/rippling')
    const text = container.textContent ?? ''
    expect(text).toContain('Rippling Muscle Disease')
    expect(text).toContain('筋肉が波打つように動く病気')
    expect(text).toContain('日本語の病名はまだありません')
    expect([...container.querySelectorAll('script')].reduce((t, s) => t.replace(s.textContent ?? '', ''), text)).not.toContain('ORPHA:') // 表示テキストのみ（構造化データの script は除く。docs/DECISIONS.md 2026-09-25）
    // 我々が日本語の病名を作っていないこと
    expect(text).not.toContain('波動性筋疾患')
  })

  test('並び順は名前順だけ。くわしい説明があるものを上に持ち上げない', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    fireEvent.change(screen.getByLabelText('病名でさがす'), { target: { value: 'ムコ多糖' } })
    const cards = [...container.querySelectorAll('li a[href^="/demo/diseases/"]')]
    expect(cards.length).toBeGreaterThan(1)
    const names = cards.map((c) => c.querySelector('[data-disease-name]')?.textContent ?? '')
    // 並びは読み（無ければ病名）の順そのもの。これが成り立つなら、くわしい説明があるものを持ち上げていない
    const keyOf = new Map(listAllDiseases().map((d) => [d.name, diseaseSortKey(d)]))
    const sortKey = (n: string) => keyOf.get(n) ?? n
    expect(names).toEqual([...names].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ja')))
    const detailed = cards.map((c) => (c.textContent ?? '').includes('くわしい説明あり'))
    expect(detailed.filter(Boolean).length).toBeGreaterThan(0) // この検索語には ● が 1 件含まれる
  })
})

describe('病名のふりがな', () => {
  test('一覧のカードに、病名の直後にふりがなが出る', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    fireEvent.change(screen.getByLabelText('病名でさがす'), { target: { value: '軟骨無形成症' } })
    const cards = [...container.querySelectorAll('li a[href^="/demo/diseases/"]')]
    const card = cards.find((c) => c.querySelector('[data-disease-name]')?.textContent === '軟骨無形成症')!
    expect(card).toBeDefined()
    expect(card.textContent).toContain('（なんこつむけいせいしょう）')
  })

  test('読める文字を繰り返すだけの病名には出さない', () => {
    const { container } = renderInLayout(<DiseaseIndexPage />)
    fireEvent.change(screen.getByLabelText('病名でさがす'), { target: { value: 'サルコイドーシス' } })
    const cards = [...container.querySelectorAll('li a[href^="/demo/diseases/"]')]
    const target = cards.find((c) => c.querySelector('[data-disease-name]')?.textContent === 'サルコイドーシス')!
    expect(target.textContent).not.toContain('（さるこいどーしす）')
  })

  test('疾患ページの見出しにもふりがなが出る', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: 'achondroplasia' }} />)
    expect(container.querySelector('h1')?.textContent).toBe('軟骨無形成症（なんこつむけいせいしょう）')
  })

  test('くわしい説明が無い病気のページにも出る', () => {
    const { container } = renderInLayout(<DiseasePage params={{ slug: encodeURIComponent('シスチン症') }} />)
    expect(container.querySelector('h1')?.textContent).toBe('シスチン症（しすちんしょう）')
  })
})

describe('トップページは特定の疾患へ誘導しない', () => {
  test('疾患へのリンクを持たず、一覧への導線だけを置く', () => {
    const { container } = renderInLayout(<TopPage />)
    expect(container.textContent).not.toContain('まず読んでほしい病気')
    expect(container.textContent).not.toContain('代表的な希少疾患')
    // 個々の疾患ページへのリンクが 1 本も無いこと（一覧 /demo/diseases だけは許す）
    const links = [...container.querySelectorAll('a[href^="/demo/diseases/"]')].filter(
      (a) => a.getAttribute('href') !== '/demo/diseases'
    )
    expect(links.map((a) => a.getAttribute('href'))).toEqual([])
    // 2 つの入口は残っている
    for (const label of ['患者会をさがす', '病気のことを調べる']) {
      expect(container.textContent).toContain(label)
    }
  })
})
