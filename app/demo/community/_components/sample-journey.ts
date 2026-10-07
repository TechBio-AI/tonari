// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モード（kind: 'demo'）で見せる「病気がわかるまでの道のり」の見本。値はすべて架空で固定。DB は読まない。
// ★ 先行調査（PMC9411675）の数値は写さない（2026-10-02 ファウンダー決定）。人数は見本のための作り物。
// 集計の行は DB の journey_summary と同じ形（伏せたセルは「10未満」）。

import {
  JOURNEY_DISEASE,
  JOURNEY_QUESTIONS,
  SUMMARY_SEXES,
  SUPPRESSED,
  type JourneySummaryRow,
  type MyJourneyResponse,
} from '@/lib/portal/journey-survey'

import { SAMPLE_GROUP } from './sample-group'

/** 見本の総数と、全体の列で見せる数（それ以外は「10未満」）。単一選択の設問で伏せたセルが 1 つだけにならないようにしてある */
const SAMPLE_TOTAL = 24
const SAMPLE_VISIBLE: Record<string, Record<string, number>> = {
  respondent: { self: 14, proxy: 10 },
  first_symptoms: { limb_pain: 13 },
  other_diagnosis: { yes: 11 },
  family_history_clue: { no: 12 },
}

export const SAMPLE_JOURNEY_SUMMARY_ROWS: JourneySummaryRow[] = [
  { question: 'total', choice: 'total', sex: 'all', n: String(SAMPLE_TOTAL) },
  ...JOURNEY_QUESTIONS.flatMap((q) =>
    q.options.flatMap((o) =>
      SUMMARY_SEXES.filter((s) => s === 'all' || q.key !== 'gender').map((s) => ({
        question: q.key,
        choice: o.value,
        sex: s,
        // 性別ごとのセルは見本ではすべて伏せる（少人数の会ではそうなりやすい）
        n: s === 'all' && SAMPLE_VISIBLE[q.key]?.[o.value] !== undefined ? String(SAMPLE_VISIBLE[q.key][o.value]) : SUPPRESSED,
      }))
    )
  ),
]

export const SAMPLE_MY_JOURNEY_RESPONSE: MyJourneyResponse = {
  responseId: '00000000-0000-4000-8000-000000000901',
  groupSlug: SAMPLE_GROUP.slug,
  groupName: SAMPLE_GROUP.name,
  diseaseId: JOURNEY_DISEASE.id,
  diseaseName: JOURNEY_DISEASE.name,
  consentVersion: 1,
  answeredMonth: '2026-09-01',
  answers: {
    respondent: 'proxy',
    birth_year_band: '2010_2014',
    gender: 'no_answer',
    region: 'no_answer',
    first_symptoms: ['limb_pain', 'hypohidrosis'],
    onset_age_band: '5_9',
    first_department: 'pediatrics',
    diagnosis_department: 'pediatrics',
    facilities_count: '2_3',
    departments_count: '2_3',
    diagnosis_age_band: '10_14',
    other_diagnosis: 'unknown',
    family_history_clue: 'no',
    diagnosis_delay: '5_9',
  },
}
