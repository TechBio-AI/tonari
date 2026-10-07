/**
 * 患者会ディレクトリの読み込み
 *
 * data/patient_groups/patient_groups.json を読み取り専用で読む。
 * 1 団体が複数の疾患を持つ（diseases は配列）。1 団体 = 1 疾患にはしない。
 * 紹介文・URL はデータにあるものだけを出す。無いものは画面で「未確認」と書く。
 * tonari_status（2026-10-04）: "joined" の団体だけを「となりに参加している」と扱う。
 *   欄が無い・ほかの値は "not_joined"（参加していると言わない側に倒す）。
 */

import * as fs from 'fs'
import * as path from 'path'

import { tonariStatusOf, type TonariStatus } from './tonari-status'

export { tonariStatusOf, type TonariStatus }

export const PATIENT_GROUPS_RELATIVE_PATH = path.join(
  'data',
  'patient_groups',
  'patient_groups.json'
)

export interface PatientGroup {
  id: string
  name: string
  /** 公式サイト。未確認なら null（推測で埋めない） */
  url: string | null
  /** 対応する疾患（知識ファイルの表記） */
  diseases: string[]
  description: string
  /** となりへの参加の状態（JSON の tonari_status。"joined" 以外は not_joined） */
  tonariStatus: TonariStatus
}

type RawPatientGroup = Omit<PatientGroup, 'tonariStatus'> & { tonari_status?: unknown }

interface PatientGroupFile {
  version?: string
  status?: string
  groups?: RawPatientGroup[]
}

let cached: PatientGroup[] | null = null

export function loadPatientGroups(rootDir: string = process.cwd()): PatientGroup[] {
  const p = path.join(rootDir, PATIENT_GROUPS_RELATIVE_PATH)
  if (!fs.existsSync(p)) return []
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as PatientGroupFile
  return (raw.groups ?? []).map(({ tonari_status, ...g }) => ({ ...g, tonariStatus: tonariStatusOf(tonari_status) }))
}

export function getPatientGroups(): PatientGroup[] {
  if (!cached) cached = loadPatientGroups()
  return cached
}

/** となりに参加している団体だけ */
export function getJoinedPatientGroups(): PatientGroup[] {
  return getPatientGroups().filter((g) => g.tonariStatus === 'joined')
}

/** となりにまだ参加していない団体だけ */
export function getNotJoinedPatientGroups(): PatientGroup[] {
  return getPatientGroups().filter((g) => g.tonariStatus === 'not_joined')
}

/** その疾患を扱う患者会（参加の有無を問わない）。無ければ空配列（画面は「登録がありません」と書く） */
export function patientGroupsFor(diseaseName: string): PatientGroup[] {
  return getPatientGroups().filter((g) => g.diseases.includes(diseaseName))
}
