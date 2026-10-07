/**
 * 疾患ごとの追加資料のローダー（lib/portal/disease-extras.ts）
 *
 *   1. 本番データは fabry だけで、形が正しい（slug は DEMO_DISEASES の固定 slug）
 *   2. 画面用の型に evidence が無い
 *   3. 出典 URL は許可ドメインの https だけ（http は HTTP_EXCEPTION_HOSTS の 1 件だけ）。外れたらファイルごと読まない
 *   4. 手紙は approved のときだけ渡る。書く人向けの注記（writer_note）も一緒に渡る
 *   5. link（出典とは別のリンク）と diagram（図のマス）の検証
 */
import * as fs from 'fs'
import * as path from 'path'

import { DEMO_DISEASES } from '../diseases'
import {
  DISEASE_EXTRAS_RELATIVE_DIR,
  isAllowedSourceUrl,
  loadDiseaseExtras,
  numberSources,
  parseDiseaseExtras,
} from '../disease-extras'

const base = (over: Record<string, unknown> = {}) => ({
  slug: 'fabry',
  family: {
    inheritance: [{ text: '文', source_url: 'https://www.nanbyou.or.jp/entry/1', evidence: '原文' }],
    letter: { status: 'approved', paragraphs: ['段落'] },
    consult: [],
  },
  clinicians: { organs: [{ organ: '腎臓', facts: [{ text: '文2', source_url: 'https://www.shouman.jp/x', evidence: '原文2' }] }] },
  ...over,
})

test('本番データは fabry だけが公開で、読めない・崩れたファイルが無い。wilson・otc-deficiency は採否前の保留', () => {
  const r = loadDiseaseExtras(path.join(process.cwd(), DISEASE_EXTRAS_RELATIVE_DIR))
  expect(r.rejected).toEqual([])
  expect([...r.bySlug.keys()]).toEqual(['fabry'])
  expect(r.pending).toEqual([
    { file: 'otc-deficiency.json', reviewStatus: 'pending_founder_review' },
    { file: 'wilson.json', reviewStatus: 'pending_founder_review' },
  ])
  for (const slug of r.bySlug.keys()) expect(DEMO_DISEASES.map((d) => d.slug)).toContain(slug)
})

test('画面用の型に evidence が無い', () => {
  const ex = parseDiseaseExtras(base())!
  expect(JSON.stringify(ex)).not.toContain('原文')
  expect(ex.family.inheritance[0]).toEqual({ text: '文', sourceUrl: 'https://www.nanbyou.or.jp/entry/1', link: null })
})

test.each([
  ['https://www.nanbyou.or.jp/entry/1', true],
  ['https://shouman.jp/disease/details/08_06_091/', true],
  ['https://jams.med.or.jp/guideline/genetics-diagnosis_2022.pdf', true],
  ['https://www.idenshiiryoubumon.org/search/', true],
  ['https://jshg.jp/', true],
  ['https://jsimd.net/', true],
  ['http://www.nanbyou.or.jp/entry/1', false],
  // http の例外は www.idenshiiryoubumon.org の 1 件だけ（https で証明書が合わないため。D-6）
  ['http://www.idenshiiryoubumon.org/search/index.html', true],
  ['http://idenshiiryoubumon.org/search/index.html', false],
  ['http://jsimd.net/iof.html', false],
  ['https://example.com/', false],
  ['https://nanbyou.or.jp.example.com/', false],
  ['https://evilnanbyou.or.jp/', false],
  ['not a url', false],
])('isAllowedSourceUrl(%s) = %s', (url, ok) => {
  expect(isAllowedSourceUrl(url)).toBe(ok)
})

test('許可外ドメインが 1 つでもあればファイルごと読まない', () => {
  const errors: string[] = []
  const raw = base()
  raw.clinicians.organs[0].facts[0].source_url = 'https://example.com/x'
  expect(parseDiseaseExtras(raw, errors)).toBeNull()
  expect(errors.join()).toContain('許可ドメイン')
})

test('evidence が無い文があれば読まない', () => {
  const raw = base()
  ;(raw.family.inheritance[0] as Record<string, string>).evidence = ''
  expect(parseDiseaseExtras(raw)).toBeNull()
})

test('手紙は approved のときだけ渡る', () => {
  expect(parseDiseaseExtras(base())!.family.letter).toEqual({ paragraphs: ['段落'], writerNote: [] })
  const noted = base()
  ;(noted.family.letter as Record<string, unknown>).writer_note = ['注記']
  expect(parseDiseaseExtras(noted)!.family.letter).toEqual({ paragraphs: ['段落'], writerNote: ['注記'] })
  const draft = base()
  draft.family.letter.status = 'draft'
  expect(parseDiseaseExtras(draft)!.family.letter).toBeNull()
  const bad = base()
  bad.family.letter.status = 'ok'
  expect(parseDiseaseExtras(bad)).toBeNull()
})

test('link は url・label がそろい、許可ドメインのときだけ通る', () => {
  const ok = base()
  ;(ok.family.inheritance[0] as Record<string, unknown>).link = { url: 'https://jsimd.net/iof.html', label: '一覧' }
  expect(parseDiseaseExtras(ok)!.family.inheritance[0].link).toEqual({ url: 'https://jsimd.net/iof.html', label: '一覧' })
  const outside = base()
  ;(outside.family.inheritance[0] as Record<string, unknown>).link = { url: 'https://example.com/', label: '外' }
  expect(parseDiseaseExtras(outside)).toBeNull()
  const noLabel = base()
  ;(noLabel.family.inheritance[0] as Record<string, unknown>).link = { url: 'https://jsimd.net/iof.html' }
  expect(parseDiseaseExtras(noLabel)).toBeNull()
})

test('diagram が無ければ全マス null。マスは文か null。崩れたマスがあれば読まない', () => {
  expect(parseDiseaseExtras(base())!.family.diagram).toEqual({
    father: { son: null, daughter: null },
    mother: { son: null, daughter: null },
  })
  const withCell = base()
  ;(withCell.family as Record<string, unknown>).diagram = {
    father: { son: { text: 'マス', source_url: 'https://jsimd.net/x', evidence: '原文' }, daughter: null },
    mother: {},
  }
  expect(parseDiseaseExtras(withCell)!.family.diagram.father.son).toEqual({
    text: 'マス',
    sourceUrl: 'https://jsimd.net/x',
    link: null,
  })
  const bad = base()
  ;(bad.family as Record<string, unknown>).diagram = { mother: { son: { text: 'マス' } } }
  expect(parseDiseaseExtras(bad)).toBeNull()
})

test('出典番号は出てきた順・重複なし', () => {
  const m = numberSources([
    { text: 'a', sourceUrl: 'u1', link: null },
    { text: 'b', sourceUrl: 'u2', link: null },
    { text: 'c', sourceUrl: 'u1', link: null },
  ])
  expect([...m.entries()]).toEqual([
    ['u1', 1],
    ['u2', 2],
  ])
})

describe('採否前の下書き（wilson・otc-deficiency）の形', () => {
  const dir = path.join(process.cwd(), DISEASE_EXTRAS_RELATIVE_DIR)
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))

  test('slug はファイル名と同じ（otc-deficiency は疾患ページの slug と同じ）', () => {
    expect(read('otc-deficiency.json').slug).toBe('otc-deficiency')
    expect(read('wilson.json').slug).toBe('wilson')
    expect(DEMO_DISEASES.map((d) => d.slug)).toContain('otc-deficiency')
  })

  test('wilson は常染色体潜性用の図（両親＝保因者、4 分の 1 の割合）を持ち、X 連鎖用の図のマスは無い', () => {
    const ex = parseDiseaseExtras(read('wilson.json'))!
    expect(ex.family.diagramAr?.parents.text).toBe('保因者')
    expect(ex.family.diagramAr?.affected.text).toContain('4 分の 1 の割合で患者さん')
    expect(ex.family.diagram).toEqual({ father: { son: null, daughter: null }, mother: { son: null, daughter: null } })
  })

  test('otc-deficiency は X 連鎖用の図のマスが空（出典に記述が無い）で、常染色体潜性用の図は無い', () => {
    const ex = parseDiseaseExtras(read('otc-deficiency.json'))!
    expect(ex.family.diagram).toEqual({ father: { son: null, daughter: null }, mother: { son: null, daughter: null } })
    expect(ex.family.diagramAr).toBeNull()
  })

  test('相談先の先頭 6 行は、ファブリー病の C-01〜C-06 と同じ文・出典・evidence・リンク', () => {
    const fabry = read('fabry.json').family.consult.filter((c: { id: string }) => /^C-0[1-6]$/.test(c.id))
    for (const f of ['wilson.json', 'otc-deficiency.json']) {
      const g = read(f).family.consult.slice(0, 6)
      expect(g.map((c: Record<string, unknown>) => ({ text: c.text, source_url: c.source_url, evidence: c.evidence, link: c.link }))).toEqual(
        fabry.map((c: Record<string, unknown>) => ({ text: c.text, source_url: c.source_url, evidence: c.evidence, link: c.link }))
      )
    }
  })
})
