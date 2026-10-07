/**
 * 診療科の重ね書き — 疾患ページに「表示する」ための読み込み
 *
 * data/specialties/disease_specialties.json を疾患名で引く。
 *   referral … 相談できる科
 *   entry    … 最初に受診しがちな科（紹介先ではない。「その科でずっと診られていた」という
 *              診断遅延の実態を画面に残すため、なぜそこに最初にかかるのかの note を必ず持つ）
 *
 * 実在の医療機関名・医師名は扱わない。診療科名などの一般名詞だけ。
 *
 * 2026-09-12: 症状検索の分離（docs/DECISIONS.md）に伴い、lib/scoring/referral.ts から
 * 読み込みに要る部分だけをここに移した。候補群から共通の科を数える集計（summarizeReferral）と
 * 年齢での絞り込みは持ち込まない。それは「疾患を当てる」側の処理で、
 * 旧ツールの lib/scoring/referral.ts にある。
 */

import * as fs from 'fs'
import * as path from 'path'

export type SpecialtyRole = 'referral' | 'entry'
export type AgeScope = 'child' | 'adult' | 'any'

export interface SpecialtyEntry {
  specialty_name: string
  role: SpecialtyRole
  age_scope: AgeScope
  note?: string | null
}

export interface SpecialtyOverlay {
  version?: string
  status?: string
  entries: Record<string, SpecialtyEntry[]>
}

export const SPECIALTY_OVERLAY_RELATIVE_PATH = path.join('data', 'specialties', 'disease_specialties.json')

export function loadSpecialtyOverlay(rootDir: string = process.cwd()): SpecialtyOverlay {
  const p = path.join(rootDir, SPECIALTY_OVERLAY_RELATIVE_PATH)
  if (!fs.existsSync(p)) return { entries: {} }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as SpecialtyOverlay
}

let cached: SpecialtyOverlay | null = null

export function getSpecialtyOverlay(): SpecialtyOverlay {
  if (!cached) cached = loadSpecialtyOverlay()
  return cached
}

/** テスト用: 読み直す */
export function resetSpecialtyOverlay(): void {
  cached = null
}
