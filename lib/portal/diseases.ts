/**
 * デモ画面が読む疾患情報（11 疾患）
 *
 * 出所は 3 つだけ。いずれも読み取り専用で、原本は変更しない。
 *   - data/knowledge/comprehensive_rare_diseases_knowledge.json … 説明・症状・検査・治療
 *   - data/specialties/disease_specialties.json             … 相談できる科 / 最初に受診しがちな科
 *   - data/hpo_symptoms/hpo_symptoms_11.json                … HPO 由来の症状（日本語ラベルがあるものだけ出す）
 *   - data/hpo_categories/hpo_categories_11.json            … HPO 由来の症状の見出し分け（折りたたみの中）
 *   - data/disease_summaries/<slug>.json                     … 患者向けの「よくある症状」「治療について」
 *     ★ 暫定形式。将来 supabase の器（themes / theme_facts / fact_sources）へ移行する（docs/CONTENT_ROADMAP.md）
 *
 * 疾患名は知識ファイルの表記をそのまま鍵にする。表記を変えると診療科の重ね書きと
 * 患者会データの両方が引けなくなるため、slug は URL のためだけに持つ。
 */

import * as fs from 'fs'
import * as path from 'path'

import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '@/lib/portal/knowledge-file'
import {
  classifyDiseaseName,
  compareDiseaseEntries,
  type DiseaseListEntry,
} from '@/lib/portal/disease-list'
import { getDiseaseNameNote } from '@/lib/portal/disease-names'
import { getDiseaseReadings } from '@/lib/portal/disease-readings'
import { getDiseaseSummary, type CommonSymptom } from '@/lib/portal/disease-summaries'
import { headingOf, HPO_HEADINGS, type HpoHeadingKey } from '@/lib/portal/hpo-categories'
import { displayableHpoSymptoms, getHpoOverlay, HPO_FREQUENCY_LABEL_JA } from '@/lib/portal/hpo-overlay'
import {
  getSpecialtyOverlay,
  type AgeScope,
  type SpecialtyEntry,
} from '@/lib/portal/specialties'

/** デモで扱う 11 疾患。name は知識ファイルの表記そのもの */
export const DEMO_DISEASES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'fabry', name: 'ファブリー病' },
  { slug: 'gaucher', name: 'ゴーシェ病' },
  { slug: 'pompe', name: 'ポンペ病' },
  { slug: 'mps1', name: 'ムコ多糖症I型' },
  { slug: 'pku', name: 'フェニルケトン尿症' },
  { slug: 'otc-deficiency', name: 'オルニチントランスカルバミラーゼ欠損症' },
  { slug: 'achondroplasia', name: '軟骨無形成症' },
  { slug: 'hypophosphatasia', name: '低ホスファターゼ症' },
  { slug: 'xlh', name: 'X連鎖性低リン血症性くる病' },
  { slug: 'sma', name: '脊髄性筋萎縮症' },
  // 2026-09-11 ファウンダー判定で追加。受け入れテスト neuropathy-adult の対象疾患、診断遅延の代表例
  { slug: 'attr', name: '遺伝性ATTR型アミロイドーシス' },
]

export interface DemoSpecialty {
  specialtyName: string
  ageScope: AgeScope
  note: string | null
}

/** 頻度の並び順（必発 → 非常に多い → 多い → ときどき → まれ → 記載なし） */
const FREQUENCY_RANK: Record<string, number> = {
  'HP:0040280': 0,
  'HP:0040281': 1,
  'HP:0040282': 2,
  'HP:0040283': 3,
  'HP:0040284': 4,
}

/** 疾患ページの折りたたみ「くわしい症状の一覧」に出す HPO 由来の症状 1 件（日本語ラベルがあるものだけ） */
export interface DemoHpoSymptom {
  hpoId: string
  labelJa: string
  /** 頻度の日本語（非常に多い／多い／ときどき／まれ）。無ければ null */
  frequencyJa: string | null
  /** 頻度の並び順。小さいほど多い。記載なしは最後 */
  frequencyRank: number
  /** 体の系統の見出し（lib/portal/hpo-categories.ts） */
  headingKey: HpoHeadingKey
  headingJa: string
  /** 公式訳を訂正したものか */
  corrected: boolean
}

/** 折りたたみの中の 1 見出し。頻度順に並べた症状を持つ */
export interface DemoHpoHeadingGroup {
  key: HpoHeadingKey
  labelJa: string
  symptoms: DemoHpoSymptom[]
}

export interface DemoDisease {
  slug: string
  /** 知識ファイルの表記そのもの */
  name: string
  /** ふりがな（data/disease_readings/readings.json）。無ければ null */
  reading: string | null
  nameEn: string | null
  orphaCode: string | null
  description: string | null
  /** 医学用語の症状 */
  symptoms: string[]
  /** 患者の言い回し */
  symptomPatterns: string[]
  /** HPO 由来の症状（医学用語、日本語ラベルがあるものだけ）。頻度順。無ければ空 */
  hpoSymptoms: DemoHpoSymptom[]
  /** hpoSymptoms を見出しごとにまとめたもの（見出しの順は lib/portal/hpo-categories.ts）。空の見出しは持たない */
  hpoHeadingGroups: DemoHpoHeadingGroup[]
  /** 患者向けの「よくある症状」（data/disease_summaries/）。無ければ空 */
  commonSymptoms: CommonSymptom[]
  /** 「よくある症状」の前に置く一文。無ければ null */
  symptomsPreface: string | null
  /** 治療について（薬剤名なし）。無ければ空 */
  treatmentSummary: string[]
  /**
   * 指定難病の告示番号（data/disease_summaries/）。
   * ★ 2026-09-25 以降、画面はこれを読まない。制度の目印は照合表（_match_table.json）の exact から出す
   *   （lib/portal/disease-designation.ts）。全件 null だったため一本化した。
   */
  nanbyoNumber: string | null
  /** 検査（知識ファイルの diagnosis） */
  examinations: string[]
  treatments: string[]
  /** 相談できる科（role='referral'） */
  referralSpecialties: DemoSpecialty[]
  /** 最初に受診しがちな科（role='entry'）。note を必ず持つ */
  entrySpecialties: DemoSpecialty[]
}

let cachedRecords: Map<string, KnowledgeRecord> | null = null

/** 11 疾患ぶんだけを知識ファイルから拾って持つ。全件はメモリに残さない */
function getRecords(): Map<string, KnowledgeRecord> {
  if (cachedRecords) return cachedRecords
  const jsonPath = path.join(process.cwd(), KNOWLEDGE_JSON_RELATIVE_PATH)
  const all = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as KnowledgeRecord[]
  const wanted = new Set(DEMO_DISEASES.map((d) => d.name))
  const map = new Map<string, KnowledgeRecord>()
  for (const r of all) {
    if (wanted.has(r.disease) && !map.has(r.disease)) map.set(r.disease, r)
  }
  cachedRecords = map
  return map
}

function toSpecialty(s: SpecialtyEntry): DemoSpecialty {
  return { specialtyName: s.specialty_name, ageScope: s.age_scope, note: s.note ?? null }
}

/** alternate_names の中から英語表記を 1 つ選ぶ（英字で始まる最初のもの） */
function pickEnglishName(record: KnowledgeRecord): string | null {
  return (record.alternate_names ?? []).find((n) => /^[A-Za-z]/.test(n)) ?? null
}

export function getDemoDisease(slug: string): DemoDisease | null {
  const entry = DEMO_DISEASES.find((d) => d.slug === slug)
  if (!entry) return null

  const record = getRecords().get(entry.name)
  // 知識ファイルに無い疾患は、空の器を出さずに「無い」を返す（捏造しない）
  if (!record) return null

  const specialties = getSpecialtyOverlay().entries[entry.name] ?? []
  const summary = getDiseaseSummary(entry.slug)

  const hpoSymptoms: DemoHpoSymptom[] = displayableHpoSymptoms(getHpoOverlay().entries[entry.name])
    .map((s) => {
      const heading = headingOf(s.hpo_id, s.label_en)
      return {
        hpoId: s.hpo_id,
        labelJa: s.label_ja,
        frequencyJa: s.frequency ? HPO_FREQUENCY_LABEL_JA[s.frequency] ?? null : null,
        frequencyRank: s.frequency ? FREQUENCY_RANK[s.frequency] ?? 9 : 9,
        headingKey: heading.key,
        headingJa: heading.labelJa,
        corrected: s.label_ja_status === 'corrected',
      }
    })
    // 安定ソート: 頻度順、同じ頻度なら元の並び（phenotype.hpoa の順）
    .sort((a, b) => a.frequencyRank - b.frequencyRank)

  return {
    slug: entry.slug,
    name: record.disease,
    reading: getDiseaseReadings().get(record.disease)?.reading ?? null,
    nameEn: pickEnglishName(record),
    orphaCode: record.orpha_code ?? null,
    description: record.description ?? null,
    symptoms: record.symptoms ?? [],
    symptomPatterns: record.symptom_patterns ?? [],
    hpoSymptoms,
    hpoHeadingGroups: groupByHeading(hpoSymptoms),
    commonSymptoms: summary?.common_symptoms ?? [],
    symptomsPreface: summary?.symptoms_preface ?? null,
    treatmentSummary: summary?.treatment_summary ?? [],
    nanbyoNumber: summary?.nanbyo_number ?? null,
    examinations: record.diagnosis ?? [],
    treatments: record.treatment ?? [],
    referralSpecialties: specialties.filter((s) => s.role === 'referral').map(toSpecialty),
    entrySpecialties: specialties.filter((s) => s.role === 'entry').map(toSpecialty),
  }
}

/** 見出しごとにまとめる。見出しの順は HPO_HEADINGS、中は頻度順（入力の並びを保つ）。空の見出しは出さない */
function groupByHeading(symptoms: DemoHpoSymptom[]): DemoHpoHeadingGroup[] {
  const groups = new Map<HpoHeadingKey, DemoHpoHeadingGroup>()
  for (const s of symptoms) {
    const g = groups.get(s.headingKey) ?? { key: s.headingKey, labelJa: s.headingJa, symptoms: [] }
    g.symptoms.push(s)
    groups.set(s.headingKey, g)
  }
  return HPO_HEADINGS.map((h) => groups.get(h.key)).filter((g): g is DemoHpoHeadingGroup => !!g)
}

/** 一覧用。DEMO_DISEASES の並び順を保つ */
export function listDemoDiseases(): DemoDisease[] {
  return DEMO_DISEASES.map((d) => getDemoDisease(d.slug)).filter(
    (d): d is DemoDisease => d !== null
  )
}

/** 疾患名から slug を引く（候補一覧から疾患ページへ繋ぐため。11 疾患以外は null） */
/**
 * 病名 → 疾患ページの slug（11 疾患の固定 slug 以外）。
 *
 * 2026-10-03: 病名をそのまま slug にしていたため、「/」を含む病名（IgG4関連後腹膜/大動脈周囲炎 など 4 件）のページが 404 になっていた。
 * 「/」は URL のパスの区切りなので、1 つの [slug] に収まらない（Next.js は事前生成で %2F に置き換えるが、リンクの %2F と
 * 一致しない・途中で区切りに戻される）。slug からは、パスの区切りや URL で特別な意味を持つ文字（/ \ ? # %）を全角に置き換えて除く。
 * 病名そのもの（画面の表示・知識ファイル）は変えない。slug → 病気は getDiseaseStub が両方の書き方で引く。
 */
const SLUG_REPLACEMENTS: Record<string, string> = { '/': '／', '\\': '＼', '?': '？', '#': '＃', '%': '％' }
export function diseaseSlugFromName(name: string): string {
  return name.replace(/[/\\?#%]/g, (c) => SLUG_REPLACEMENTS[c] ?? c)
}

export function slugOf(diseaseName: string): string | null {
  return DEMO_DISEASES.find((d) => d.name === diseaseName)?.slug ?? null
}

// ---------------------------------------------------------------------------
// 全疾患の一覧（951 件。2026-09-13 の重複統合後）
//
// 分け方・並び順の純関数は lib/portal/disease-list.ts（クライアントからも使うので fs と分離）。ここから再輸出する。
//
// 一覧には病名と別名だけを出す。説明文・ORPHA 番号は出さない。
// 分け方は読みの頭文字（data/disease_readings/readings.json）。読みが無い疾患は「読みを準備中」に残す。
// 理由: 知識ファイルの後半は出典が無く、ORPHA 番号には誤りが記録されている
// （docs/kb_health_survey_2026-09-06.md）。くわしい説明は DEMO_DISEASES の 11 疾患から順に整える。
// ---------------------------------------------------------------------------

export {
  classifyDiseaseName,
  compareDiseaseEntries,
  diseaseSortKey,
  kanaRowOf,
  type DiseaseGroup,
  type DiseaseListEntry,
} from '@/lib/portal/disease-list'

let cachedAll: KnowledgeRecord[] | null = null

function getAllRecords(): KnowledgeRecord[] {
  if (cachedAll) return cachedAll
  const jsonPath = path.join(process.cwd(), KNOWLEDGE_JSON_RELATIVE_PATH)
  cachedAll = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as KnowledgeRecord[]
  return cachedAll
}

/** 一覧用。DEMO_DISEASES は固定 slug、それ以外は病名そのものを slug にする */
export function listAllDiseases(): DiseaseListEntry[] {
  const fixed = new Map(DEMO_DISEASES.map((d) => [d.name, d.slug]))
  const readings = getDiseaseReadings()
  const seen = new Set<string>()
  const out: DiseaseListEntry[] = []
  for (const r of getAllRecords()) {
    if (seen.has(r.disease)) continue
    seen.add(r.disease)
    out.push({
      name: r.disease,
      aliases: r.alternate_names ?? [],
      slug: fixed.get(r.disease) ?? diseaseSlugFromName(r.disease),
      detailed: fixed.has(r.disease),
      ...classifyDiseaseName(r.disease, readings.get(r.disease)?.reading ?? null),
    })
  }
  return out.sort(compareDiseaseEntries)
}

/** 患者会の有無しか出せない、準備中の疾患ページに使う */
export interface DiseaseStub {
  name: string
  /** ふりがな。無ければ null */
  reading: string | null
  aliases: string[]
  /** 日本語の病名が無い疾患に添える日本語の説明。無ければ null */
  nameNote: { noteJa: string; source: string } | null
}

/** 11 疾患以外の疾患ページ用。病名と別名だけ返す。無ければ null */
export function getDiseaseStub(slug: string): DiseaseStub | null {
  const key = decodeURIComponent(slug)
  // slug（diseaseSlugFromName）でも、病名そのものでも引ける（後者はコード内の呼び出し用）
  const r = getAllRecords().find((x) => diseaseSlugFromName(x.disease) === key) ?? getAllRecords().find((x) => x.disease === key)
  if (!r) return null
  return {
    name: r.disease,
    reading: getDiseaseReadings().get(r.disease)?.reading ?? null,
    aliases: r.alternate_names ?? [],
    nameNote: getDiseaseNameNote(r.disease),
  }
}
