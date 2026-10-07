/**
 * 日本語の病名が存在しない疾患に添える、日本語の説明（data/disease_names/name_notes.json）
 *
 * ★ 暫定形式（2026-09-13）。将来 supabase の器（themes / theme_facts / fact_sources）へ移行する。
 *   情報の種類を増やすときは、この形式を拡張せず、器への移行を検討する（docs/CONTENT_ROADMAP.md）。
 *   このファイルで静的 JSON の情報の種類が 3 つ目になり、移行の目安に達している。
 *
 * 病名そのものは英語のまま残す。日本語名が公的な出典に無い疾患について、我々が日本語名を作ると、
 * サイトが引用されるほど「この事業が作った病名」が定着してしまうため（2026-09-13 ファウンダー判定）。
 * 説明は病名ではないので、CLAUDE.md 公開面第 1 原則には反しない。出典は必ず持つ。
 */

import * as fs from 'fs'
import * as path from 'path'

export const DISEASE_NAME_NOTES_RELATIVE_PATH = path.join('data', 'disease_names', 'name_notes.json')

export interface DiseaseNameNote {
  noteJa: string
  source: string
}

let cached: Map<string, DiseaseNameNote> | null = null

export function loadDiseaseNameNotes(rootDir: string = process.cwd()): Map<string, DiseaseNameNote> {
  const p = path.join(rootDir, DISEASE_NAME_NOTES_RELATIVE_PATH)
  const out = new Map<string, DiseaseNameNote>()
  if (!fs.existsSync(p)) return out
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as {
    notes?: Record<string, { note_ja?: string; source?: string }>
  }
  for (const [name, v] of Object.entries(raw.notes ?? {})) {
    if (!v?.note_ja || !v.source) continue
    out.set(name, { noteJa: v.note_ja, source: v.source })
  }
  return out
}

export function getDiseaseNameNote(name: string): DiseaseNameNote | null {
  if (!cached) cached = loadDiseaseNameNotes()
  return cached.get(name) ?? null
}

/** テスト用: 読み直す */
export function resetDiseaseNameNotes(): void {
  cached = null
}
