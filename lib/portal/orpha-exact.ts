/**
 * 疾患の ORPHA コード（照合表で「完全一致」のものだけ）
 *
 * 知識ファイルの orpha_code には取り違えが記録されている（docs/kb_issues_2026-08-29.md の 46、44 件）。
 * そのため構造化データには知識ファイルの値を使わず、フェーズ0 の照合表
 * （data/disease_overviews/_match_table.json）で Orphanet の Name / Synonym と完全一致（judgement = exact）
 * したコードだけを使う。partial・none は出さない（推測で紐付けない）。
 *
 * 引き方は疾患概要と同じ: 知識ファイルの現在名 → 知識ファイル上の位置 → idx（kb_issues 47）。
 */
import * as fs from 'fs'
import * as path from 'path'

import { knowledgeFilePositionOf } from '@/lib/portal/disease-overviews'

// 定数で持つ（path.join(cwd, 変数, 'ファイル名') の形にすると、webpack が cwd 直下の全フォルダを探しに行く）
export const MATCH_TABLE_RELATIVE_PATH = path.join('data', 'disease_overviews', '_match_table.json')

interface MatchEntry {
  idx: number
  orphanet?: { orpha_code?: string | null; judgement?: string }
}

let cached: MatchEntry[] | null = null

function entries(): MatchEntry[] {
  if (!cached) {
    const p = path.join(process.cwd(), MATCH_TABLE_RELATIVE_PATH)
    cached = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')).entries as MatchEntry[]) : []
  }
  return cached
}

/** 例: 'ORPHA:324'。完全一致でなければ null */
export function exactOrphaCodeOf(diseaseName: string): string | null {
  const idx = knowledgeFilePositionOf(diseaseName)
  if (idx === null) return null
  const e = entries()[idx]
  if (!e || e.idx !== idx || e.orphanet?.judgement !== 'exact') return null
  const code = e.orphanet.orpha_code
  return typeof code === 'string' && /^ORPHA:\d+$/.test(code) ? code : null
}
