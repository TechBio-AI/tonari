/**
 * @jest-environment node
 *
 * 疾患概要の読み込み（lib/portal/disease-overviews.ts）とデータの門番
 *
 * 確かめること:
 *   1. 形の検査: 画面に渡す型に evidence が無い。崩れた JSON は読まない
 *   2. 本番の読み込みは _samples/ を読まない
 *   3. idx のずれ検知（2026-09-25 ファウンダー承認）
 *      - 知識ファイルと照合表（_match_table.json）の件数が違えば失敗（統合・追加で位置がずれた）
 *      - 概要 JSON の idx が知識ファイルの範囲外なら失敗
 *      - 概要 JSON の name と知識ファイルの現在名が違うのは警告だけ（改名は続くため。name は使わない）
 *   4. 本番データ（<idx>.json）が届いたら: 全件が形の検査を通り、禁止表現を含まず、各事実に evidence がある
 */
import * as fs from 'fs'
import * as path from 'path'

import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '../knowledge-file'
import {
  DISEASE_OVERVIEWS_RELATIVE_DIR,
  knowledgeFilePositionOf,
  loadDiseaseOverviews,
  parseDiseaseOverview,
} from '../disease-overviews'

const ROOT = process.cwd()
const DIR = path.join(ROOT, DISEASE_OVERVIEWS_RELATIVE_DIR)
const SAMPLES = path.join(DIR, '_samples')
const KB = JSON.parse(fs.readFileSync(path.join(ROOT, KNOWLEDGE_JSON_RELATIVE_PATH), 'utf-8')) as KnowledgeRecord[]

const BLOCKLIST = fs
  .readFileSync(path.join(ROOT, 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

const realFiles = () => (fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f)) : [])
const readRaw = (dir: string, f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as Record<string, any>

function validSample(): Record<string, any> {
  return readRaw(SAMPLES, '0.json')
}

describe('形の検査', () => {
  test('画面に渡す形に evidence・notes・name が無い', () => {
    const ov = parseDiseaseOverview(validSample())!
    expect(ov).not.toBeNull()
    const json = JSON.stringify(ov)
    expect(json).not.toContain('evidence')
    expect(json).not.toContain('【サンプル】仮の原文') // evidence の中身
    expect(json).not.toContain('notes')
    expect(json).not.toContain('ファブリー病') // name は持たない
  })

  test.each([
    ['summary.lang が不正', (o: any) => (o.summary.lang = 'fr')],
    ['source_id が不正', (o: any) => (o.symptoms[0].source_id = 'wikipedia')],
    ['treatment.type が不正', (o: any) => (o.treatment.type = '治ります')],
    ['links の label が不正', (o: any) => (o.links[0].label = 'おすすめ')],
    ['links の url が http でない', (o: any) => (o.links[0].url = 'javascript:alert(1)')],
    ['summary.text が空', (o: any) => (o.summary.text = ' ')],
    ['idx が無い', (o: any) => delete o.idx],
  ])('%s なら読まない', (_why, mutate) => {
    const o = validSample()
    mutate(o)
    const errors: string[] = []
    expect(parseDiseaseOverview(o, errors)).toBeNull()
    expect(errors.length).toBe(1)
  })

  test('onset は null を許す。Orphanet の有無を見分ける', () => {
    const six = parseDiseaseOverview(readRaw(SAMPLES, '6.json'))!
    expect(six.onset).toBeNull()
    expect(six.usesOrphanet).toBe(false)
    expect(parseDiseaseOverview(readRaw(SAMPLES, '23.json'))!.usesOrphanet).toBe(true)
  })

  test('ファイル名と idx が違うものは読まない', () => {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ov-'))
    fs.writeFileSync(path.join(tmp, '5.json'), JSON.stringify(validSample())) // 中身は idx 0
    const r = loadDiseaseOverviews(tmp)
    expect(r.byIdx.size).toBe(0)
    expect(r.rejected[0].reason).toContain('ファイル名と idx')
  })
})

describe('読む場所', () => {
  test('_samples/ は 3 件読める（開発用）', () => {
    const r = loadDiseaseOverviews(SAMPLES)
    expect([...r.byIdx.keys()].sort((a, b) => a - b)).toEqual([0, 6, 23])
    expect(r.rejected).toEqual([])
  })

  test('本番の読み込みはサンプルを拾わない', () => {
    const r = loadDiseaseOverviews(DIR)
    for (const f of realFiles()) expect(readRaw(DIR, f)._sample).toBeUndefined()
    expect(r.byIdx.size).toBe(realFiles().length - r.rejected.length)
  })
})

describe('idx のずれ検知', () => {
  const matchTable = readRaw(DIR, '_match_table.json') as { entries: { idx: number; disease: string }[] }

  test('知識ファイルと照合表の件数が一致する（違えば統合・追加で idx がずれている）', () => {
    expect(KB.length).toBe(matchTable.entries.length)
  })

  test('slug → 知識ファイル上の位置 = idx', () => {
    expect(knowledgeFilePositionOf('ファブリー病')).toBe(0)
    expect(knowledgeFilePositionOf('メチルマロン酸血症')).toBe(6)
    expect(knowledgeFilePositionOf('存在しない病気')).toBeNull()
    KB.forEach((r, i) => expect(knowledgeFilePositionOf(r.disease)).toBe(i))
  })

  test.each([
    ['本番', DIR],
    ['サンプル', SAMPLES],
  ])('%s: 概要 JSON の idx が知識ファイルの範囲内。name の食い違いは警告だけ', (_label, dir) => {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)) : []
    const outOfRange: string[] = []
    const renamed: string[] = []
    for (const f of files) {
      const raw = readRaw(dir, f)
      const idx = raw.idx as number
      if (!Number.isInteger(idx) || idx < 0 || idx >= KB.length) {
        outOfRange.push(`${f}: idx=${idx}`)
        continue
      }
      if (raw.name !== KB[idx].disease) renamed.push(`${f}: JSON「${raw.name}」／知識ファイル「${KB[idx].disease}」`)
    }
    if (renamed.length > 0) {
      console.warn(`[疾患概要] 病名の食い違い ${renamed.length} 件（改名か idx のずれ。表示には影響しない）:\n` + renamed.join('\n'))
    }
    expect(outOfRange).toEqual([])
  })
})

describe('本番データの門番（<idx>.json が届いたら効く。いまは 0 件）', () => {
  const texts = (raw: Record<string, any>): string[] => [
    raw.summary?.text,
    ...(raw.symptoms ?? []).map((s: any) => s.text),
    raw.onset?.text,
  ].filter((t): t is string => typeof t === 'string')

  test('全件が形の検査を通る', () => {
    expect(loadDiseaseOverviews(DIR).rejected).toEqual([])
  })

  test('画面に出る文に禁止表現が無い', () => {
    const hits: string[] = []
    for (const f of realFiles()) {
      for (const t of texts(readRaw(DIR, f))) for (const w of BLOCKLIST) if (t.includes(w)) hits.push(`${f}: ${w}`)
    }
    expect(hits).toEqual([])
  })

  test('画面に出る事実すべてに evidence がある（仕様: 付けられない事実は書かない）', () => {
    const missing: string[] = []
    for (const f of realFiles()) {
      const raw = readRaw(DIR, f)
      const facts = [raw.summary, ...(raw.symptoms ?? []), raw.onset].filter(Boolean)
      if (raw.treatment?.type !== '記載なし') facts.push(raw.treatment)
      for (const x of facts) if (typeof x.evidence !== 'string' || x.evidence.trim() === '') missing.push(f)
    }
    expect(missing).toEqual([])
  })
})
