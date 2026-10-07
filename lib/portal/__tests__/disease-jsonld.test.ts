/**
 * @jest-environment node
 *
 * 疾患ページの構造化データ（組み立て）と ORPHA コードの引き方
 */
import * as fs from 'fs'
import * as path from 'path'

import { buildDiseaseJsonLd, serializeJsonLd } from '../disease-jsonld'
import { loadDiseaseOverviews } from '../disease-overviews'
import { exactOrphaCodeOf } from '../orpha-exact'

const SAMPLES = path.join(process.cwd(), 'data', 'disease_overviews', '_samples')
const sample = (idx: number) => loadDiseaseOverviews(SAMPLES).byIdx.get(idx)!
const matchTable = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'disease_overviews', '_match_table.json'), 'utf-8')
).entries as { idx: number; disease: string; orphanet: { judgement: string; orpha_code: string | null } }[]

describe('ORPHA コード（照合表で完全一致のものだけ）', () => {
  test('ファブリー病は ORPHA:324', () => {
    expect(exactOrphaCodeOf('ファブリー病')).toBe('ORPHA:324')
  })
  test('partial・none の疾患には付かない', () => {
    for (const j of ['partial', 'none']) {
      const e = matchTable.find((x) => x.orphanet.judgement === j)!
      expect(exactOrphaCodeOf(e.disease)).toBeNull()
    }
    expect(exactOrphaCodeOf('存在しない病気')).toBeNull()
  })
})

describe('組み立て', () => {
  const base = { name: 'ファブリー病', aliases: ['Fabry病', 'Fabry disease'], url: 'https://x.example/demo/diseases/fabry' }

  test('概要あり: description・code（codingSystem Orphanet）・citation。evidence・notes は入らない', () => {
    const ld = buildDiseaseJsonLd({ ...base, overview: sample(0), orphaCode: 'ORPHA:324' }) as any
    expect(ld['@type']).toBe('MedicalWebPage')
    expect(ld.about).toEqual({
      '@type': 'MedicalCondition',
      name: 'ファブリー病',
      alternateName: ['Fabry病', 'Fabry disease'],
      description: sample(0).summary.text,
      code: { '@type': 'MedicalCode', code: 'ORPHA:324', codingSystem: 'Orphanet' },
    })
    expect(ld.citation).toEqual([
      { '@type': 'CreativeWork', name: '小児慢性特定疾病情報センター：公式ページ', url: 'https://example.invalid/sample/shouman' },
    ])
    const s = JSON.stringify(ld)
    expect(s).not.toContain('evidence')
    expect(s).not.toContain('仮の原文')
    expect(s).not.toContain('notes')
  })

  test('概要なし: name／alternateName／url だけ（code も出さない）', () => {
    const ld = buildDiseaseJsonLd({ ...base, overview: null, orphaCode: 'ORPHA:324' }) as any
    expect(Object.keys(ld).sort()).toEqual(['@context', '@type', 'about', 'inLanguage', 'name', 'url'])
    expect(Object.keys(ld.about).sort()).toEqual(['@type', 'alternateName', 'name'])
  })

  test('別名が無ければ alternateName を出さない', () => {
    const ld = buildDiseaseJsonLd({ ...base, aliases: [], overview: null, orphaCode: null }) as any
    expect(ld.about.alternateName).toBeUndefined()
  })

  test('埋め込み文字列は < をエスケープし、JSON として読める', () => {
    const ld = buildDiseaseJsonLd({ ...base, name: '</script><b>', overview: null, orphaCode: null })
    const s = serializeJsonLd(ld)
    expect(s).not.toContain('<')
    expect(JSON.parse(s).name).toBe('</script><b>')
  })
})
