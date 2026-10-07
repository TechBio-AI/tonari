/**
 * 患者向けの「よくある症状」「治療について」（11 疾患）— data/disease_summaries/<slug>.json
 *
 * ★ 暫定形式（2026-09-13）。11 疾患だから成立する静的 JSON で、951 疾患では破綻する。
 *   将来は supabase の器（themes / theme_facts / fact_sources）へ移行する。
 *   情報の種類（制度・支援、専門医療機関、患者会の一次情報、移行期医療 …）を増やすときは、
 *   この形式を拡張せず、器への移行を検討する。docs/CONTENT_ROADMAP.md を参照。
 *
 * 中身はファウンダーが判定した文（docs/disease_summaries_draft_2026-09-13.md）。
 * HPO の「非常に多い」「多い」を元に患者の言葉へ言い換えたもので、各項目に元の HPO ラベルか
 * 「執筆者による記述」の出典を持つ。表示では頻度を区別しない（2026-09-13 ファウンダー判定）。
 * 薬剤名は持たない（治療は「酵素を補う治療があります」程度に留める。AUTONOMY.md B-7）。
 */

import * as fs from 'fs'
import * as path from 'path'

export const DISEASE_SUMMARIES_RELATIVE_DIR = path.join('data', 'disease_summaries')

/** phenotype.hpoa のアノテーション 1 行（11 疾患の重ね書き以外から引いたとき、根拠の行を残す） */
export interface HpoAnnotationRow {
  /** 例: OMIM:311250 */
  database_id: string
  disease_name: string
  /** phenotype.hpoa の frequency 列。空欄なら null */
  frequency: string | null
}

export type SummarySource =
  | {
      type: 'hpo'
      labels_ja: string[]
      hpo_ids: string[]
      /**
       * 重ね書き（hpo_symptoms_11.json、ORPHA 側）に無く、phenotype.hpoa の OMIM 行から引いたときだけ持つ
       * （2026-10-02 ファウンダー指示。OTC 欠損症の嘔吐、低ホスファターゼ症の乳歯）
       */
      annotations?: HpoAnnotationRow[]
      hpo_annotation_version?: string
    }
  | { type: 'author'; note: string }

export interface CommonSymptom {
  /** 患者の言葉 */
  text: string
  /** 出典。HPO のラベルと「執筆者による記述」が混ざることがある（例: 低ホスファターゼ症の歯） */
  sources: SummarySource[]
}

export interface DiseaseSummary {
  slug: string
  /** 知識ファイルの表記そのもの */
  disease: string
  /** 「よくある症状」の前に置く一文（無ければ null。例: フェニルケトン尿症の「治療をしない場合」） */
  symptoms_preface: string | null
  common_symptoms: CommonSymptom[]
  /** 治療について。薬剤名を含めない */
  treatment_summary: string[]
  treatment_source: string
  /** 指定難病の告示番号。無ければ null（画面は「準備中」） */
  nanbyo_number: string | null
}

let cached: Map<string, DiseaseSummary> | null = null

export function loadDiseaseSummaries(rootDir: string = process.cwd()): Map<string, DiseaseSummary> {
  const dir = path.join(rootDir, DISEASE_SUMMARIES_RELATIVE_DIR)
  const map = new Map<string, DiseaseSummary>()
  if (!fs.existsSync(dir)) return map
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as Record<string, unknown>
    const s: DiseaseSummary = {
      slug: String(raw.slug),
      disease: String(raw.disease),
      symptoms_preface: (raw.symptoms_preface as string | null) ?? null,
      common_symptoms: (raw.common_symptoms as CommonSymptom[]) ?? [],
      treatment_summary: (raw.treatment_summary as string[]) ?? [],
      treatment_source: String(raw.treatment_source ?? ''),
      nanbyo_number: (raw.nanbyo_number as string | null) ?? null,
    }
    map.set(s.slug, s)
  }
  return map
}

export function getDiseaseSummary(slug: string): DiseaseSummary | null {
  if (!cached) cached = loadDiseaseSummaries()
  return cached.get(slug) ?? null
}

/** テスト用: 読み直す */
export function resetDiseaseSummaries(): void {
  cached = null
}
