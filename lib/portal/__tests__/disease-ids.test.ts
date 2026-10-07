/**
 * 疾患の固定 ID（stable_id、共通契約 A。docs/disease_ids.md）
 *
 * 確かめること:
 *   1. 知識ファイルの 951 件すべてに stable_id があり、一意で、rd00001〜 の形式
 *   2. data/disease_ids.json と一致する（stable_id・idx・主名・orpha_code）
 *   3. data/disease_index.json の各行（idx・主名）から stable_id が引ける
 */
import * as fs from 'fs'
import * as path from 'path'

import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '../knowledge-file'

const root = process.cwd()
const read = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8')) as T

const kb = read<KnowledgeRecord[]>(KNOWLEDGE_JSON_RELATIVE_PATH)
const ids = read<{ diseases: { stable_id: string; idx: number; name: string; orpha_code: string | null }[] }>(
  path.join('data', 'disease_ids.json')
).diseases

describe('stable_id', () => {
  test('951 件すべてにあり、一意で、rd + 5 桁', () => {
    expect(kb).toHaveLength(951)
    const all = kb.map((r) => r.stable_id)
    for (const id of all) expect(id).toMatch(/^rd\d{5}$/)
    expect(new Set(all).size).toBe(951)
  })

  test('data/disease_ids.json と一致する', () => {
    expect(ids).toHaveLength(951)
    expect(new Set(ids.map((x) => x.stable_id)).size).toBe(951)
    kb.forEach((r, idx) => {
      expect(ids[idx]).toEqual({
        stable_id: r.stable_id,
        idx,
        name: r.disease,
        orpha_code: r.orpha_code ?? null,
      })
    })
  })

  test('data/disease_index.json の各行から stable_id が引ける', () => {
    const index = read<{ diseases: { idx: number; name: string }[] }>(path.join('data', 'disease_index.json')).diseases
    const byIdx = new Map(ids.map((x) => [x.idx, x]))
    expect(index.length).toBeGreaterThan(0)
    for (const row of index) {
      const hit = byIdx.get(row.idx)
      expect(hit?.stable_id).toMatch(/^rd\d{5}$/)
      expect(hit?.name).toBe(row.name) // idx がずれていたら名前が合わない
    }
  })
})
