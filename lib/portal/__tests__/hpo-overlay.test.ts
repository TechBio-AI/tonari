/**
 * HPO 由来の症状の重ね書き — 表示用の読み込み（11 疾患）
 *
 * 確かめること:
 *   1. 重ね書きが 11 疾患ぶん読める。疾患名は知識ファイルの表記と一致し、HPO のバージョンが記録されている
 *   2. 表示は日本語ラベル（official / corrected）だけ。英語のまま・誤訳の疑い（reported）は出さない
 *   3. 承認済みの訂正 6 件が重ね書き側に入っている（原本は変更していない）
 *   4. 帰属表示にバージョンと HPO の名が入っている（ライセンス条件 2・3）
 *
 * 照合・採点を通す検査は、旧ツールの lib/scoring/__tests__/hpo.test.ts にある。
 */
import * as fs from 'fs'
import * as path from 'path'

import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '../knowledge-file'
import {
  displayableHpoSymptoms,
  getHpoOverlay,
  HPO_ATTRIBUTION_JA,
  HPO_VERSION,
} from '../hpo-overlay'

const TARGETS = [
  'ファブリー病', 'ゴーシェ病', 'ポンペ病', 'ムコ多糖症I型', 'フェニルケトン尿症',
  'オルニチントランスカルバミラーゼ欠損症', '軟骨無形成症', '低ホスファターゼ症',
  'X連鎖性低リン血症性くる病', '脊髄性筋萎縮症', '遺伝性ATTR型アミロイドーシス',
]

function knowledgeDiseaseNames(): Set<string> {
  const p = path.join(process.cwd(), KNOWLEDGE_JSON_RELATIVE_PATH)
  const records = JSON.parse(fs.readFileSync(p, 'utf-8')) as KnowledgeRecord[]
  return new Set(records.map((r) => r.disease))
}

describe('重ね書きの読み込み', () => {
  test('11 疾患ぶんある。すべて知識ファイルの疾患名と一致し、HPO のバージョンが記録されている', () => {
    const overlay = getHpoOverlay()
    expect(Object.keys(overlay.entries).sort()).toEqual([...TARGETS].sort())
    const names = knowledgeDiseaseNames()
    for (const [name, e] of Object.entries(overlay.entries)) {
      expect(names.has(name)).toBe(true)
      expect(e.hpo_version).toBe(HPO_VERSION)
      expect(e.orpha_code).toMatch(/^ORPHA:\d+$/)
      expect(e.symptoms.length).toBeGreaterThan(0)
    }
    expect(overlay.meta.hpo_version).toBe(HPO_VERSION)
  })

  test('重ね書きの無い疾患は空を返す', () => {
    expect(displayableHpoSymptoms(getHpoOverlay().entries['シスチン症'])).toEqual([])
    expect(displayableHpoSymptoms(undefined)).toEqual([])
  })
})

describe('表示は日本語ラベルがあるものだけ', () => {
  test('英語のまま・reported は出さない', () => {
    for (const e of Object.values(getHpoOverlay().entries)) {
      for (const s of displayableHpoSymptoms(e)) {
        expect(s.label_ja).toMatch(/[぀-ヿ一-鿿]/)
        expect(['official', 'corrected']).toContain(s.label_ja_status)
      }
      const hidden = e.symptoms.filter((s) => s.label_ja_status === 'none' || s.label_ja_status === 'reported')
      const shown = new Set(displayableHpoSymptoms(e).map((s) => s.hpo_id))
      for (const h of hidden) expect(shown.has(h.hpo_id)).toBe(false)
    }
  })
})

describe('日本語ラベルの訂正（原本は変更しない。重ね書き側だけ）', () => {
  const byId = (id: string) => {
    for (const e of Object.values(getHpoOverlay().entries)) {
      const s = e.symptoms.find((x) => x.hpo_id === id)
      if (s) return s
    }
    throw new Error(`not found ${id}`)
  }

  test.each([
    ['HP:0031006', 'Acroparesthesia', '視覚障害', '肢端錯感覚'],
    ['HP:0500008', 'Cornea verticillata', '垂直角膜', '渦巻状角膜混濁'],
    ['HP:0001097', 'Keratoconjunctivitis sicca', '乾燥性', '乾燥性角結膜炎'],
    ['HP:0002017', 'Nausea and vomiting', '吐気と 嘔吐', '吐き気と嘔吐'],
    ['HP:0003233', 'Decreased circulating HDL-C concentration', '高αリポ蛋白血症', '低HDLコレステロール血症'],
    ['HP:0006844', 'Absent patellar reflexes', '膝蓋腱反射', '膝蓋腱反射消失'],
  ])('%s %s: 公式訳「%s」→「%s」', (id, en, official, fixed) => {
    const s = byId(id)
    expect(s.label_en).toBe(en)
    expect(s.label_ja_status).toBe('corrected')
    expect(s.label_ja_official).toBe(official)
    expect(s.label_ja).toBe(fixed)
    expect(s.label_ja_note).toContain('訂正')
  })

  test('誤訳の疑い（reported）は表示に使わない', () => {
    const cough = byId('HP:0012735') // Cough → 公式訳「外層」
    expect(cough.label_ja_status).toBe('reported')
    const owner = Object.values(getHpoOverlay().entries).find((e) => e.symptoms.includes(cough))!
    expect(displayableHpoSymptoms(owner).some((s) => s.hpo_id === 'HP:0012735')).toBe(false)
    expect(displayableHpoSymptoms(owner).map((s) => s.label_ja)).not.toContain('外層')
  })

  test('帰属表示にバージョンと HPO の名が入っている（ライセンス条件 2・3）', () => {
    expect(HPO_ATTRIBUTION_JA).toContain('2026-06-23')
    expect(HPO_ATTRIBUTION_JA).toContain('Human Phenotype Ontology')
  })
})
