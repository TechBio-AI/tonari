/**
 * 診療科の重ね書き（data/specialties/disease_specialties.json）— 表示用の読み込み
 *
 * 候補群から共通の科を数える集計の検査は、旧ツールの
 * lib/scoring/__tests__/referral.test.ts にある。
 */
import { loadSpecialtyOverlay } from '@/lib/portal/specialties'

describe('重ね書きファイル（data/specialties/disease_specialties.json）', () => {
  const real = loadSpecialtyOverlay()
  const names = Object.keys(real.entries)

  test('11疾患・57行ある', () => {
    // 2026-09-11: 遺伝性ATTR型アミロイドーシス（5 行、ファウンダーの想定案を起こした草案）を追加
    expect(names).toHaveLength(11)
    expect(names.reduce((n, k) => n + real.entries[k].length, 0)).toBe(57)
  })

  test('ファウンダー判定済み', () => {
    expect((real as { decided_by?: string }).decided_by).toBe('founder')
  })

  test('role と age_scope が必ず付いている', () => {
    for (const n of names) {
      for (const s of real.entries[n]) {
        expect(['referral', 'entry']).toContain(s.role)
        expect(['child', 'adult', 'any']).toContain(s.age_scope)
      }
    }
  })

  test('entry には「なぜそこに最初にかかるのか」の note が必ずある', () => {
    for (const n of names) {
      for (const s of real.entries[n]) {
        if (s.role === 'entry') expect(typeof s.note === 'string' && s.note.length > 0).toBe(true)
      }
    }
  })

  test('実在の医療機関名・医師名を入れない（一般名詞のみ）', () => {
    const forbidden = ['病院', '大学', 'クリニック', 'センター', '医院', '先生']
    for (const n of names) {
      for (const s of real.entries[n]) {
        for (const word of forbidden) {
          expect(s.specialty_name).not.toContain(word)
        }
      }
    }
  })

  test('同じ科が referral と entry の両方を持てる（X連鎖性低リン血症性くる病の整形外科）', () => {
    const xlh = real.entries['X連鎖性低リン血症性くる病']
    const ortho = xlh.filter((s) => s.specialty_name === '整形外科')
    expect(ortho.map((s) => s.role).sort()).toEqual(['entry', 'referral'])
  })
})
