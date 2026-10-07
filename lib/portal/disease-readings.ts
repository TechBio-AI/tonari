/**
 * 疾患名の読み（data/disease_readings/readings.json）
 *
 * 疾患一覧を五十音で分けるために使う。読みは推定しない。ファイルにあるものだけを使う
 * （形態素解析ライブラリは入れない。2026-09-13 ファウンダー指示）。
 * 読みが無い疾患は「漢字（読みを準備中）」に残る。第 2 段階で 50 件ずつ足していく。
 *
 * 鍵は知識ファイルの主名そのもの。知識ファイルは変更しない。
 *
 * 値は 2 通り書ける。
 *   "ふぁぶりーびょう"                                   … 読みだけ
 *   { "reading": "…", "level": 1, "source": "…" }        … 根拠つき
 * 根拠は「どこで確かめたか」を残すためのもの（2026-09-13 ファウンダー指示）。
 *   level 1 … 難病情報センター（五十音別索引・疾患ページのふりがな）
 *   level 2 … 学会の用語集
 *   level 3 … Orphanet の日本語表記
 *   level 4 … 一般的な医学用語の読み（学会誌・公的機関の併記表記など、出典を示せるもの）
 *   level 0 … 根拠が見つからず、ファウンダーが判定したもの（source に判定日を書く）
 * 表示には使わない。読みの由来を後から辿れるようにするためだけに持つ。
 */

import * as fs from 'fs'
import * as path from 'path'

export const DISEASE_READINGS_RELATIVE_PATH = path.join('data', 'disease_readings', 'readings.json')

/** 読み 1 件。根拠は記録のためだけに持ち、画面には出さない */
export interface DiseaseReading {
  reading: string
  /** 根拠の強さ。0 = ファウンダー判定（出典なし） */
  level: 0 | 1 | 2 | 3 | 4
  /** 出典（名称と URL、または判定の記録）。無ければ null */
  source: string | null
  note?: string
}

type RawReading = string | { reading: string; level?: number; source?: string; note?: string }

let cached: Map<string, DiseaseReading> | null = null

function normalize(v: RawReading): DiseaseReading | null {
  if (typeof v === 'string') return v ? { reading: v, level: 0, source: null } : null
  if (!v || typeof v.reading !== 'string' || !v.reading) return null
  const level = ([0, 1, 2, 3, 4] as const).find((n) => n === v.level) ?? 0
  return { reading: v.reading, level, source: v.source ?? null, ...(v.note ? { note: v.note } : {}) }
}

export function loadDiseaseReadings(rootDir: string = process.cwd()): Map<string, DiseaseReading> {
  const p = path.join(rootDir, DISEASE_READINGS_RELATIVE_PATH)
  if (!fs.existsSync(p)) return new Map()
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as { readings?: Record<string, RawReading> }
  const out = new Map<string, DiseaseReading>()
  for (const [name, v] of Object.entries(raw.readings ?? {})) {
    const r = normalize(v)
    if (r) out.set(name, r)
  }
  return out
}

export function getDiseaseReadings(): Map<string, DiseaseReading> {
  if (!cached) cached = loadDiseaseReadings()
  return cached
}

/** 読みの文字列だけが要るところ用 */
export function readingOf(name: string): string | null {
  return getDiseaseReadings().get(name)?.reading ?? null
}

/** テスト用: 読み直す */
export function resetDiseaseReadings(): void {
  cached = null
}
