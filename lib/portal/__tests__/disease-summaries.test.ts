/**
 * 患者向けの「よくある症状」「治療について」（data/disease_summaries/、暫定形式）
 *
 * 確かめること:
 *   1. 11 疾患ぶんあり、slug と疾患名が DEMO_DISEASES と一致する
 *   2. よくある症状は 5〜8 個。各項目に出典（HPO ラベルか執筆者による記述）がある
 *   3. HPO を出典とする項目のラベルと ID は、重ね書き（hpo_symptoms_11.json）に実在する
 *      annotations を持つ出典（重ね書きに無い語）は、HPO 原本の公式訳と phenotype.hpoa の OMIM 行に実在する
 *   4. 検査所見・薬剤名・禁止表現を含まない
 *   5. 暫定形式であることが各ファイルに明記されている（器への移行）
 */
import * as fs from 'fs'
import * as path from 'path'

import { DEMO_DISEASES } from '../diseases'
import { DISEASE_SUMMARIES_RELATIVE_DIR, getDiseaseSummary, loadDiseaseSummaries } from '../disease-summaries'
import { getHpoOverlay } from '../hpo-overlay'

const LAB_WORDS = ['活性', 'CCL18', 'フェリチン', 'CRP', 'IgM', '血症', '尿症', 'アシドーシス']
const DRUG_NAMES = [
  'アガルシダーゼ', 'ミガーラスタット', 'イミグルセラーゼ', 'ベラグルセラーゼ', 'エリグルスタット',
  'アルグルコシダーゼ', 'アバルグルコシダーゼ', 'ラロニダーゼ', 'サプロプテリン', 'ヌシネルセン',
  'オナセムノゲン', 'リスジプラム', 'タファミジス', 'パチシラン', 'イノテルセン', 'ビュートリシラン',
  'ジフルニサル', 'ブロスマブ', 'アスホターゼ', 'フェニル酪酸', '安息香酸', 'シトルリン',
]
const BLOCKED = ['診断', 'あなたは', '可能性があります', '受診してください', '治ります']

// HPO 原本（data/hpo、読み取りのみ）。annotations を持つ出典の照合にだけ使う
const HPO_DIR = path.join(process.cwd(), 'data', 'hpo')
let jaCache: Map<string, string> | null = null
let rowsCache: string[][] | null = null
let versionCache: string | null = null
function officialJa(): Map<string, string> {
  if (!jaCache) {
    jaCache = new Map()
    for (const line of fs.readFileSync(path.join(HPO_DIR, 'hp-ja.babelon.tsv'), 'utf-8').split('\n')) {
      const c = line.split('\t')
      if (c[5] === 'rdfs:label' && c[13] === 'OFFICIAL') jaCache.set(c[4], c[7])
    }
  }
  return jaCache
}
function hpoaLines(): string[] {
  return fs.readFileSync(path.join(HPO_DIR, 'phenotype.hpoa'), 'utf-8').split('\n')
}
function hpoaRows(): string[][] {
  if (!rowsCache) {
    // 必要なのは OMIM 行の (database_id, disease_name, hpo_id, frequency) だけ
    rowsCache = hpoaLines()
      .filter((l) => l.startsWith('OMIM:'))
      .map((l) => l.split('\t'))
      .map((c) => [c[0], c[1], c[3], c[7]])
  }
  return rowsCache
}
function hpoaVersion(): string {
  if (!versionCache) versionCache = (hpoaLines().find((l) => l.startsWith('#version:')) ?? '').slice(9).trim()
  return versionCache
}

describe('読み込み', () => {
  test('11 疾患ぶんあり、slug と疾患名が DEMO_DISEASES と一致する', () => {
    const map = loadDiseaseSummaries()
    expect([...map.keys()].sort()).toEqual(DEMO_DISEASES.map((d) => d.slug).sort())
    for (const d of DEMO_DISEASES) expect(map.get(d.slug)?.disease).toBe(d.name)
    expect(getDiseaseSummary('no-such')).toBeNull()
  })

  test('暫定形式であることが各ファイルに明記されている', () => {
    const dir = path.join(process.cwd(), DISEASE_SUMMARIES_RELATIVE_DIR)
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as { _readme: string[] }
      const readme = raw._readme.join('\n')
      expect(readme).toContain('暫定形式')
      expect(readme).toContain('theme_facts')
      expect(readme).toContain('器への移行')
    }
  })
})

describe('よくある症状', () => {
  test.each(DEMO_DISEASES.map((d) => [d.slug, d.name]))('%s（%s）', (slug, name) => {
    const s = getDiseaseSummary(slug)!
    expect(s.common_symptoms.length).toBeGreaterThanOrEqual(5)
    expect(s.common_symptoms.length).toBeLessThanOrEqual(8)
    const overlay = getHpoOverlay().entries[name]
    const byId = new Map(overlay.symptoms.map((x) => [x.hpo_id, x]))
    for (const item of s.common_symptoms) {
      expect(item.text.length).toBeGreaterThan(0)
      expect(item.sources.length).toBeGreaterThan(0)
      for (const src of item.sources) {
        if (src.type === 'hpo' && src.annotations) {
          // 重ね書きに無い語は、HPO 原本（公式訳と phenotype.hpoa の行）に実在することを確かめる
          expect(src.labels_ja.length).toBe(src.hpo_ids.length)
          expect(src.hpo_annotation_version).toBe(hpoaVersion())
          src.hpo_ids.forEach((id, i) => {
            expect(officialJa().get(id)).toBe(src.labels_ja[i])
            for (const a of src.annotations!) {
              expect(hpoaRows()).toContainEqual([a.database_id, a.disease_name, id, a.frequency ?? ''])
            }
          })
        } else if (src.type === 'hpo') {
          expect(src.labels_ja.length).toBe(src.hpo_ids.length)
          src.hpo_ids.forEach((id, i) => {
            expect(byId.get(id)?.label_ja).toBe(src.labels_ja[i])
          })
        } else {
          expect(src.note).toContain('執筆者による記述')
        }
      }
      for (const w of [...LAB_WORDS, ...DRUG_NAMES, ...BLOCKED]) expect(item.text).not.toContain(w)
    }
    for (const t of [...s.treatment_summary, s.symptoms_preface ?? '']) {
      for (const w of [...DRUG_NAMES, ...BLOCKED]) expect(t).not.toContain(w)
    }
  })

  test('ファウンダー指示の 3 点（2026-09-13）', () => {
    const otc = getDiseaseSummary('otc-deficiency')!
    expect(otc.common_symptoms.map((x) => x.text)).not.toContain('脾臓が大きくなる')
    // 2026-10-02: 執筆者による記述から HPO（HP:0002013、phenotype.hpoa の OMIM:311250 行）に差し替え
    const vomit = otc.common_symptoms.find((x) => x.text === '嘔吐をくり返す')!
    expect(vomit.sources).toEqual([expect.objectContaining({ type: 'hpo', hpo_ids: ['HP:0002013'] })])

    const attr = getDiseaseSummary('attr')!
    expect(attr.common_symptoms.some((x) => x.text.includes('手根管症候群'))).toBe(true)

    const hpp = getDiseaseSummary('hypophosphatasia')!
    const teeth = hpp.common_symptoms[0]
    expect(teeth.text).toContain('乳歯が早く抜ける')
    // 2026-10-02: 「乳歯が早く抜ける」を執筆者による記述から HPO（HP:0006323）に差し替え
    expect(teeth.sources.map((x) => x.type)).toEqual(['hpo', 'hpo'])
    expect(teeth.sources.flatMap((x) => (x.type === 'hpo' ? x.hpo_ids : []))).toEqual(['HP:0000164', 'HP:0006323'])

    expect(getDiseaseSummary('pku')!.symptoms_preface).toContain('治療をしない場合')
    expect(getDiseaseSummary('gaucher')!.symptoms_preface).toBeNull()
  })
})
