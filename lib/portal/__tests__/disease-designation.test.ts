/**
 * @jest-environment node
 *
 * 制度の目印（lib/portal/disease-designation.ts）
 *
 * 確かめること:
 *   1. 照合表の exact だけを拾う。partial・none は拾わない（推測で紐付けない）
 *   2. 告示番号・URL が欠けていたら拾わない
 *   3. 群（judgement = 'group'）は取り出せるが、画面には出さない（出さないことは描画の検査で見る）
 *   4. 本番データで「難病のみ」「小慢のみ」「両方」「どちらも無い」の 4 通りが引ける
 */
import * as fs from 'fs'
import * as path from 'path'

import {
  designationOf,
  hasDesignation,
  parseDesignation,
  type DiseaseDesignation,
} from '../disease-designation'
import { MATCH_TABLE_RELATIVE_PATH } from '../orpha-exact'

const NANBYOU_URL = 'https://www.nanbyou.or.jp/entry/4570'
const SHOUMAN_URL = 'https://www.shouman.jp/disease/details/15_02_002/'

describe('照合表 1 行の読み取り', () => {
  test('難病・小慢とも exact なら両方を拾う', () => {
    const d = parseDesignation({
      idx: 0,
      nanbyou: { judgement: 'exact', kokuji_no: 276, url: NANBYOU_URL },
      shouman: { judgement: 'exact', url: SHOUMAN_URL },
    })
    expect(d.nanbyou).toEqual({ kokujiNo: 276, url: NANBYOU_URL })
    expect(d.shouman).toEqual({ url: SHOUMAN_URL })
    expect(hasDesignation(d)).toBe(true)
  })

  test.each(['partial', 'none', 'group', undefined])('judgement が %s なら拾わない', (judgement) => {
    const d = parseDesignation({
      idx: 0,
      nanbyou: { judgement, kokuji_no: 276, url: NANBYOU_URL },
      shouman: { judgement, url: SHOUMAN_URL },
    })
    expect(d.nanbyou).toBeNull()
    expect(d.shouman).toBeNull()
    expect(hasDesignation(d)).toBe(false)
  })

  test('告示番号が無い・URL が無い・URL が https でない行は拾わない', () => {
    const cases = [
      { judgement: 'exact', url: NANBYOU_URL },
      { judgement: 'exact', kokuji_no: 0, url: NANBYOU_URL },
      { judgement: 'exact', kokuji_no: 276, url: null },
      { judgement: 'exact', kokuji_no: 276, url: 'http://www.nanbyou.or.jp/entry/4570' },
    ]
    for (const nanbyou of cases) {
      expect(parseDesignation({ idx: 0, nanbyou }).nanbyou).toBeNull()
    }
    expect(parseDesignation({ idx: 0, shouman: { judgement: 'exact', url: null } }).shouman).toBeNull()
  })

  test('行が無ければ全て null', () => {
    const d = parseDesignation(undefined)
    expect(d).toEqual({ nanbyou: null, shouman: null, nanbyouGroup: null })
    expect(hasDesignation(d)).toBe(false)
  })

  test('群は judgement が group のときだけ取り出す（画面には出さない）', () => {
    const group = { name: '筋ジストロフィー', url: 'https://www.nanbyou.or.jp/entry/4522' }
    const d = parseDesignation({
      idx: 0,
      nanbyou: { judgement: 'group', kokuji_no: 113, group_link: [group] },
    })
    expect(d.nanbyouGroup).toEqual({ name: group.name, url: group.url, kokujiNo: 113 })
    // 群だけでは「確定した目印」にならない
    expect(hasDesignation(d)).toBe(false)
  })
})

describe('本番データから引く', () => {
  const has = (d: DiseaseDesignation) => [d.nanbyou !== null, d.shouman !== null]

  test('難病のみ: フェニルケトン尿症（告示番号 240）', () => {
    const d = designationOf('フェニルケトン尿症')
    expect(has(d)).toEqual([true, false])
    expect(d.nanbyou?.kokujiNo).toBe(240)
    expect(d.nanbyou?.url).toMatch(/^https:\/\/www\.nanbyou\.or\.jp\/entry\/\d+$/)
  })

  test('小慢のみ: ファブリー病', () => {
    const d = designationOf('ファブリー病')
    expect(has(d)).toEqual([false, true])
    expect(d.shouman?.url).toMatch(/^https:\/\/www\.shouman\.jp\/disease\/details\/[0-9_]+\/$/)
  })

  test('両方: 軟骨無形成症（告示番号 276）', () => {
    const d = designationOf('軟骨無形成症')
    expect(has(d)).toEqual([true, true])
    expect(d.nanbyou?.kokujiNo).toBe(276)
  })

  test('どちらも無い: ニーマン・ピック病C型', () => {
    const d = designationOf('ニーマン・ピック病C型')
    expect(has(d)).toEqual([false, false])
    expect(hasDesignation(d)).toBe(false)
  })

  test('知識ファイルに無い名前は全て null', () => {
    expect(hasDesignation(designationOf('存在しない病気'))).toBe(false)
  })

  test('件数が照合表の exact と一致する（ずれたら気づけるように）', () => {
    const p = path.join(process.cwd(), MATCH_TABLE_RELATIVE_PATH)
    const entries = JSON.parse(fs.readFileSync(p, 'utf-8')).entries as {
      nanbyou: { judgement: string }
      shouman: { judgement: string }
    }[]
    const nanbyou = entries.filter((e) => e.nanbyou.judgement === 'exact').length
    const shouman = entries.filter((e) => e.shouman.judgement === 'exact').length
    const both = entries.filter(
      (e) => e.nanbyou.judgement === 'exact' && e.shouman.judgement === 'exact'
    ).length
    expect({ nanbyou, shouman, both }).toEqual({ nanbyou: 174, shouman: 242, both: 103 })
  })
})
