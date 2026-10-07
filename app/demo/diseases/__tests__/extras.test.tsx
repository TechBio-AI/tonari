/**
 * 家族への情報（/demo/diseases/[slug]/family）と医療者向けの資材（/demo/diseases/[slug]/for-clinicians）
 *
 *   1. 中身（data/disease_extras/<slug>.json）の無い疾患は 404。事前生成は中身のある slug だけ
 *   2. 疾患ページの入口は中身のある疾患だけに出る
 *   3. 入力から計算・判定する処理が無い（描画結果とソースの両方で確かめる）
 *   4. 保存処理が無い（ストレージ・cookie・送信）
 *   5. 禁止語・薬剤名・製品名・企業名が無い。evidence が画面に出ない
 *   6. 手紙のひな形: approved のときだけ textarea に初期値。印刷ボタンで window.print
 *
 *   7. 本番データ: 照合済みの文が出る。照合できなかった F-03 は出ない。図・リンク・書く人向けの注記
 *
 * 部品の描画はフィクスチャ（__tests__/fixtures/disease_extras/。【サンプル】の仮の文）、
 * 中身が空の状態は __tests__/fixtures/disease_extras_empty/ で確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render } from '@testing-library/react'

import { setDiseaseExtrasDirForTest } from '@/lib/portal/disease-extras'

import DiseasePage from '../[slug]/page'
import FamilyPage, { generateStaticParams as familyParams } from '../[slug]/family/page'
import ForCliniciansPage, { generateStaticParams as cliniciansParams } from '../[slug]/for-clinicians/page'
import { CLINICIANS_LEAD, EXTRAS_NOT_READY } from '../_components/ExtrasParts'
import { LETTER_NOT_SAVED_NOTE } from '../_components/LetterTemplate'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/diseases',
  notFound: () => {
    throw new Error('notFound')
  },
}))

const FIXTURES = path.join(__dirname, 'fixtures', 'disease_extras')
const FIXTURES_EMPTY = path.join(__dirname, 'fixtures', 'disease_extras_empty')
const FIXTURES_AR = path.join(__dirname, 'fixtures', 'disease_extras_ar')

type RawFact = { id?: string; text: string; evidence: string }
const PROD = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'disease_extras', 'fabry.json'), 'utf-8')
) as {
  family: { inheritance: RawFact[]; consult: RawFact[]; letter: { paragraphs: string[]; writer_note: string[] } }
  clinicians: { organs: { organ: string; facts: RawFact[] }[] }
}
const PROD_FACTS: RawFact[] = [
  ...PROD.family.inheritance,
  ...PROD.family.consult,
  ...PROD.clinicians.organs.flatMap((o) => o.facts),
]

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

/** 「診断」をサービスの動詞にしない（ブロックリストに加えて、ここでも念のため） */
const DIAGNOSE_VERBS = ['診断します', '診断できます', '診断する', '診断して', '診断を受け', '診断しましょう']

/** ファブリー病の治療薬（一般名・製品名、日英）と企業名。分類名（酵素補充療法 等）は可 */
const DRUG_AND_COMPANY_NAMES = [
  'アガルシダーゼ', 'ミガーラスタット', 'ペグニガルシダーゼ', 'ファブラザイム', 'リプレガル', 'ガラフォルド',
  'agalsidase', 'Agalsidase', 'migalastat', 'Migalastat', 'pegunigalsidase', 'Fabrazyme', 'Replagal', 'Galafold', 'Elfabrio',
  'サノフィ', 'Sanofi', '武田', 'タケダ', 'Takeda', 'アミカス', 'Amicus', 'JCR', 'Chiesi', 'キエジ',
]

function expectClean(html: string) {
  expect(BLOCKLIST.filter((w) => html.includes(w))).toEqual([])
  expect(DIAGNOSE_VERBS.filter((w) => html.includes(w))).toEqual([])
  expect(DRUG_AND_COMPANY_NAMES.filter((w) => html.includes(w))).toEqual([])
  expect(html).not.toContain('仮の原文') // evidence
}

/** 入力から計算・判定する部品が無い（手紙の textarea と印刷ボタンだけ） */
function expectNoJudgingInputs(c: HTMLElement) {
  expect(c.querySelectorAll('input, select, form, button[type="submit"]')).toHaveLength(0)
  for (const b of c.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
}

describe('本番データ（data/disease_extras/）', () => {
  test('事前生成は中身のある slug（fabry）だけ', () => {
    expect(familyParams()).toEqual([{ slug: 'fabry' }])
    expect(cliniciansParams()).toEqual([{ slug: 'fabry' }])
  })

  test.each(['gaucher', 'pompe', encodeURIComponent('メチルマロン酸血症'), 'no-such'])(
    '中身の無い疾患（%s）は 404',
    (slug) => {
      expect(() => render(<FamilyPage params={{ slug }} />)).toThrow('notFound')
      expect(() => render(<ForCliniciansPage params={{ slug }} />)).toThrow('notFound')
    }
  )

  test('疾患ページの入口は fabry にあり、gaucher には無い', () => {
    const fabry = render(<DiseasePage params={{ slug: 'fabry' }} />).container
    expect(fabry.querySelector('a[href="/demo/diseases/fabry/family"]')).not.toBeNull()
    expect(fabry.querySelector('a[href="/demo/diseases/fabry/for-clinicians"]')).not.toBeNull()
    const gaucher = render(<DiseasePage params={{ slug: 'gaucher' }} />).container
    expect(gaucher.querySelector('a[href$="/family"]')).toBeNull()
    expect(gaucher.querySelector('a[href$="/for-clinicians"]')).toBeNull()
    expect(gaucher.textContent).not.toContain('家族と医療者への情報')
  })

  test('家族への情報: 照合済みの文が出る（F-03 を含む）。evidence は出ない', () => {
    const c = render(<FamilyPage params={{ slug: 'fabry' }} />).container
    expectClean(c.innerHTML)
    expectNoJudgingInputs(c)
    const text = c.textContent ?? ''
    for (const f of [...PROD.family.inheritance, ...PROD.family.consult]) expect(text).toContain(f.text)
    expect(text).toContain('父親が患者の場合、娘は通常、女性の患者（ヘテロ患者）になります。') // F-03
    expect(text).not.toContain('6.8') // 数字は医療者向け（K-26）だけ
    // evidence（自分の文に含まれないもの）は画面に出ない
    for (const f of PROD_FACTS) if (!f.text.includes(f.evidence)) expect(c.innerHTML).not.toContain(f.evidence)
    // 施設検索へのリンク（http の例外）
    expect(c.querySelector('a[data-fact-link][href="http://www.idenshiiryoubumon.org/search/index.html"]')).not.toBeNull()
    // お子さんの検査（C-09）は C-07・C-08 の直後、相談先の最後
    const items = [...c.querySelectorAll('section')].at(-1)!.querySelectorAll('li')
    expect(items[items.length - 1].textContent).toContain('お子さんの検査をどうするかは')
  })

  test('家族への情報: 図の 4 マスはすべて出典つきの文で埋まる', () => {
    const c = render(<FamilyPage params={{ slug: 'fabry' }} />).container
    const fig = c.querySelector('[data-inheritance-diagram]')!
    const [father, mother] = [...fig.querySelectorAll('figure')]
    expect(father.textContent).toContain('発症しません')
    expect(father.textContent).toContain('通常、女性ヘテロ患者になります')
    expect(father.textContent).not.toContain(EXTRAS_NOT_READY)
    expect(mother.textContent).toContain('受け継いだ息子は男性患者になります')
    expect(mother.textContent).toContain('受け継いだ娘は女性ヘテロ患者になります')
    expect(mother.textContent).not.toContain(EXTRAS_NOT_READY)
  })

  test('家族への情報: 手紙は受け取る側の自己決定、書く人向けの注記は印刷されない', () => {
    const c = render(<FamilyPage params={{ slug: 'fabry' }} />).container
    const ta = c.querySelector('textarea') as HTMLTextAreaElement
    expect(ta.value).toBe(PROD.family.letter.paragraphs.join('\n\n'))
    expect(ta.value).toContain('検査を受けるかどうかは、よく知ったうえで、あなたが自分で決めてよいことです。')
    const note = c.querySelector('[data-writer-note]')!
    expect(note.textContent).toContain('渡さない選択もあります')
    expect(note.textContent).toContain('渡す時期は、あなたが選べます')
    expect(note.closest('.print\\:hidden')).not.toBeNull()
    expect(c.querySelector('[data-print-target]')?.textContent).not.toContain('渡さない選択')
  })

  test('医療者向け: 臓器別の見出し、出典一覧、精密検査施設一覧へのリンク。evidence は出ない', () => {
    const c = render(<ForCliniciansPage params={{ slug: 'fabry' }} />).container
    expectClean(c.innerHTML)
    expectNoJudgingInputs(c)
    expect(c.textContent).toContain(CLINICIANS_LEAD)
    expect([...c.querySelectorAll('article h2')].map((h) => h.textContent)).toEqual([
      ...PROD.clinicians.organs.map((o) => o.organ),
      '出典',
    ])
    for (const f of PROD.clinicians.organs.flatMap((o) => o.facts)) {
      expect(c.textContent).toContain(f.text)
      if (!f.text.includes(f.evidence)) expect(c.innerHTML).not.toContain(f.evidence)
    }
    expect(c.textContent).not.toContain('透析患者のスクリーニング') // K-14 は載せない
    expect(c.querySelector('a[data-fact-link][href="https://jsimd.net/iof.html"]')).not.toBeNull()
  })
})

describe('中身が空（draft・空配列）のとき', () => {
  beforeAll(() => setDiseaseExtrasDirForTest(FIXTURES_EMPTY))
  afterAll(() => setDiseaseExtrasDirForTest(null))

  test('「準備中」。手紙の欄は出さない', () => {
    const fam = render(<FamilyPage params={{ slug: 'fabry' }} />).container
    expectClean(fam.innerHTML)
    expectNoJudgingInputs(fam)
    expect(fam.querySelector('textarea')).toBeNull()
    expect(fam.textContent).toContain(EXTRAS_NOT_READY)
    expect(fam.querySelector('[data-inheritance-diagram]')).not.toBeNull()

    const cl = render(<ForCliniciansPage params={{ slug: 'fabry' }} />).container
    expectClean(cl.innerHTML)
    expectNoJudgingInputs(cl)
    expect(cl.textContent).toContain(CLINICIANS_LEAD)
    expect(cl.textContent).toContain(EXTRAS_NOT_READY)
  })
})

describe('フィクスチャ（【サンプル】）', () => {
  beforeAll(() => setDiseaseExtrasDirForTest(FIXTURES))
  afterAll(() => setDiseaseExtrasDirForTest(null))

  test('家族への情報: 文と出典リンク、手紙のひな形（初期値・編集・印刷）。evidence は出ない', () => {
    const print = jest.fn()
    const orig = window.print
    window.print = print
    try {
      const c = render(<FamilyPage params={{ slug: 'fabry' }} />).container
      expectClean(c.innerHTML)
      expectNoJudgingInputs(c)
      expect(c.textContent).toContain('【サンプル】遺伝のしかたの仮の文1')
      expect(c.textContent).toContain('【サンプル】相談先の仮の文1')
      expect(c.querySelector('a[href="https://www.idenshiiryoubumon.org/SAMPLE"]')).not.toBeNull()
      expect(c.querySelector('a[data-fact-link]')?.textContent).toBe('【サンプル】施設を探す')
      expect(c.textContent).toContain('【サンプル】図の仮の文（父・息子）')
      expect(c.querySelector('[data-writer-note]')?.textContent).toBe('【サンプル】書く人向けの仮の注記')

      const ta = c.querySelector('textarea') as HTMLTextAreaElement
      expect(ta.value).toBe('【サンプル】手紙の仮の段落1\n\n【サンプル】手紙の仮の段落2')
      expect(c.textContent).toContain(LETTER_NOT_SAVED_NOTE)

      fireEvent.change(ta, { target: { value: '【サンプル】書き換えた手紙' } })
      expect(c.querySelector('[data-print-target]')?.textContent).toBe('【サンプル】書き換えた手紙')

      const buttons = c.querySelectorAll('button')
      expect(buttons).toHaveLength(1)
      fireEvent.click(buttons[0])
      expect(print).toHaveBeenCalledTimes(1)
    } finally {
      window.print = orig
    }
  })

  test('医療者向け: 冒頭の固定文、臓器別の見出し、出典番号（重複なし）と出典一覧', () => {
    const c = render(<ForCliniciansPage params={{ slug: 'fabry' }} />).container
    expectClean(c.innerHTML)
    expectNoJudgingInputs(c)
    expect(c.textContent).toContain(CLINICIANS_LEAD)
    expect([...c.querySelectorAll('article h2')].map((h) => h.textContent)).toEqual([
      '【サンプル】臓器1',
      '【サンプル】臓器2',
      '出典',
    ])
    expect([...c.querySelectorAll('article sup')].map((s) => s.textContent)).toEqual(['[1]', '[2]', '[1]'])
    expect([...c.querySelectorAll('article ol li a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://www.shouman.jp/SAMPLE',
      'https://www.nanbyou.or.jp/entry/SAMPLE',
    ])
    expect(c.querySelector('[data-print-target]')).not.toBeNull()
  })
})

describe('常染色体潜性用の図（diagram_ar があるとき）', () => {
  beforeAll(() => setDiseaseExtrasDirForTest(FIXTURES_AR))
  afterAll(() => setDiseaseExtrasDirForTest(null))

  test('X 連鎖用の図の代わりに出る。子の 4 マスのうち 1 つだけが「患者さん」、残り 3 マスは空', () => {
    const c = render(<FamilyPage params={{ slug: 'fabry' }} />).container
    expectClean(c.innerHTML)
    expectNoJudgingInputs(c)
    expect(c.querySelector('[data-inheritance-diagram]')).toBeNull()
    const fig = c.querySelector('[data-inheritance-diagram-ar]')!
    expect(fig.textContent).toContain('【サンプル】保因者')
    expect(fig.textContent).toContain('【サンプル】子の 4 マスのうち 1 つの仮の文')
    const cells = [...fig.querySelectorAll('[data-ar-cell]')]
    expect(cells).toHaveLength(4)
    expect(cells.filter((x) => x.getAttribute('data-ar-cell') === 'affected').map((x) => x.textContent)).toEqual(['患者さん'])
    expect(cells.filter((x) => x.getAttribute('data-ar-cell') === 'other').every((x) => x.textContent === '')).toBe(true)
  })
})

describe('ソースの静的検査（家族への情報・医療者向けの資材とその部品）', () => {
  const ROOT = path.join(process.cwd(), 'app', 'demo', 'diseases')
  const FILES = [
    '[slug]/family/page.tsx',
    '[slug]/for-clinicians/page.tsx',
    '_components/ExtrasParts.tsx',
    '_components/InheritanceDiagram.tsx',
    '_components/InheritanceDiagramAr.tsx',
    '_components/LetterTemplate.tsx',
    '_components/PrintButton.tsx',
  ].map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf-8')] as const)
  const LOADER = fs.readFileSync(path.join(process.cwd(), 'lib', 'portal', 'disease-extras.ts'), 'utf-8')

  test.each(FILES)('%s: 送信・サーバー処理・保存の処理が無い', (_f, src) => {
    for (const w of [
      'fetch(', 'axios', 'supabase', "'use server'", '"use server"', 'action=', 'XMLHttpRequest', 'sendBeacon',
      'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'cookies(',
    ]) {
      expect({ w, hit: src.includes(w) }).toEqual({ w, hit: false })
    }
  })

  test('ローダーは書き込まない', () => {
    expect(LOADER).not.toMatch(/writeFile|appendFile|mkdir|unlink/)
  })
})
