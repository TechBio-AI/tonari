/**
 * @jest-environment node
 *
 * 公開層の疾患一覧の番号表（data/disease_index.json）が、知識ファイルと一覧の作り方（lib/portal/diseases.ts の listAllDiseases）
 * に一致していることの検査。
 *
 * この表は、参加希望の画面（/demo/wish/[idx]）などが実行時に知識ファイルを読まずに済むように持つ（本番の実行時には読めない前提）。
 *   idx  … 知識ファイル上の位置（同名が複数あれば最初の位置）。DB の group_wishes.disease_idx と同じ
 *   name … 病名（知識ファイルの表記）
 *   slug … 疾患ページの slug（11 疾患は固定 slug、それ以外は病名）
 *
 * 知識ファイルや一覧の作り方が変わってこの検査が落ちたら、次で作り直す:
 *   UPDATE_DISEASE_INDEX=1 npx jest app/demo/__tests__/disease-index.test.ts
 * ★ idx は固定 ID ではない（知識ファイルの並び替えで変わる）。作り直すときは、登録済みの group_wishes の disease_idx も
 *   同じ計画で付け替えること（supabase/migrations/20261019_group_wishes.sql の注意書き）
 */
import * as fs from 'fs'
import * as path from 'path'

import { listAllDiseases } from '@/lib/portal/diseases'
import { knowledgeFilePositionOf } from '@/lib/portal/disease-overviews'

const FILE = path.join(process.cwd(), 'data', 'disease_index.json')

function build() {
  return {
    _readme: [
      '公開層の疾患一覧の番号表（app/demo/__tests__/disease-index.test.ts が作る・確かめる。手で書き換えない）。',
      'idx は知識ファイル上の位置（DB の group_wishes.disease_idx と同じ）。固定 ID ではない。',
      '作り直し: UPDATE_DISEASE_INDEX=1 npx jest app/demo/__tests__/disease-index.test.ts',
    ],
    diseases: listAllDiseases()
      .map((d) => ({ idx: knowledgeFilePositionOf(d.name) as number, name: d.name, slug: d.slug }))
      .sort((a, b) => a.idx - b.idx),
  }
}

test('番号表が、知識ファイルと公開層の一覧に一致する', () => {
  const expected = build()
  expect(expected.diseases.every((d) => Number.isInteger(d.idx) && d.idx >= 0)).toBe(true)
  if (process.env.UPDATE_DISEASE_INDEX === '1') {
    fs.writeFileSync(FILE, JSON.stringify(expected, null, 1) + '\n', 'utf-8')
  }
  const actual = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  expect(actual).toEqual(expected)
})

test('idx も slug も重複しない', () => {
  const { diseases } = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as { diseases: { idx: number; slug: string }[] }
  expect(new Set(diseases.map((d) => d.idx)).size).toBe(diseases.length)
  expect(new Set(diseases.map((d) => d.slug)).size).toBe(diseases.length)
})
