/**
 * HPO 由来の症状を、体の系統の見出しに置く（折りたたみ「くわしい症状の一覧」用）
 *
 * 読むのは派生ファイル data/hpo_categories/hpo_categories_11.json だけ（hp.obo は読まない）。
 * 派生ファイルには「その症状の祖先にどのカテゴリがあるか」という事実だけがあり、
 * どの見出しに置くかの判断（順序・日本語・上書き）はすべてここにある。
 *
 * 判定は HEADINGS を上から順に当て、最初に合った見出しに置く（1 症状 1 見出し）。
 * 順序の考え方（docs/hpo_symptom_headings_proposal_2026-09-13.md、2026-09-13 承認）:
 *   - 検査所見を最初に取り出す（代謝/ホメオスターシス配下・細胞表現型配下・英語ラベルに laboratory）
 *   - 臓器が特定できる下位カテゴリ（肝・脾・筋）を上位カテゴリより先に当てる。脾腫は HPO 上「免疫系」だが患者には「脾臓」
 *   - 目・耳と神経を骨・関節より先に。頭・顔を骨・関節より先に。成長をホルモンより先に
 * 機械的な基準なので誤分類はある（発熱→検査、関節痛→体のこと、扁桃→心臓・血管 等）。
 * 折りたたみの中の分類なので許容し（2026-09-13 ファウンダー判定）、直すときは HPO_HEADING_OVERRIDES に 1 行足す。
 *
 * この分類は患者向けの「よくある症状」には使わない。そちらは data/disease_summaries/（lib/portal/disease-summaries.ts）。
 * 将来の用途: JSON-LD の構造化データ。
 */

import * as fs from 'fs'
import * as path from 'path'

export const HPO_CATEGORIES_RELATIVE_PATH = path.join('data', 'hpo_categories', 'hpo_categories_11.json')

export interface HpoCategoryEntry {
  label_en: string
  /** 祖先にある WATCHED カテゴリ（HPO ID） */
  categories: string[]
}

export interface HpoCategories {
  meta: { hpo_version?: string; watched_categories?: Record<string, string> }
  entries: Record<string, HpoCategoryEntry>
}

export type HpoHeadingKey =
  | 'lab'
  | 'liver_spleen'
  | 'blood'
  | 'eye_ear'
  | 'muscle'
  | 'nervous'
  | 'heart'
  | 'lung'
  | 'gut'
  | 'kidney'
  | 'skin'
  | 'head'
  | 'bone'
  | 'growth'
  | 'hormone'
  | 'immune'
  | 'tumor'
  | 'birth'
  | 'body'
  | 'other'

export interface HpoHeading {
  key: HpoHeadingKey
  labelJa: string
  /** 祖先にこのどれかがあれば当たり */
  categories: string[]
  /** 英語ラベルにこの語があれば当たり（小文字比較） */
  labelEnContains?: string[]
}

/** 上から順に当てる。順序が判断そのもの */
export const HPO_HEADINGS: ReadonlyArray<HpoHeading> = [
  { key: 'lab', labelJa: '検査でわかること', categories: ['HP:0001939', 'HP:0025354'], labelEnContains: ['laboratory'] },
  { key: 'liver_spleen', labelJa: '肝臓・脾臓のこと', categories: ['HP:0001392', 'HP:0025155', 'HP:0001743'] },
  { key: 'blood', labelJa: '血液のこと', categories: ['HP:0001871'] },
  { key: 'eye_ear', labelJa: '目・耳のこと', categories: ['HP:0000478', 'HP:0000598'] },
  { key: 'muscle', labelJa: '筋肉のこと', categories: ['HP:0003011'] },
  { key: 'nervous', labelJa: '神経のこと', categories: ['HP:0000707'] },
  { key: 'heart', labelJa: '心臓・血管のこと', categories: ['HP:0001626'] },
  { key: 'lung', labelJa: '肺・呼吸のこと', categories: ['HP:0002086', 'HP:0045027'] },
  { key: 'gut', labelJa: '胃腸・消化のこと', categories: ['HP:0025031'] },
  { key: 'kidney', labelJa: '腎臓・泌尿器・生殖器のこと', categories: ['HP:0000119'] },
  { key: 'skin', labelJa: '皮膚のこと', categories: ['HP:0001574'] },
  { key: 'head', labelJa: '頭・顔・口・歯のこと', categories: ['HP:0000152', 'HP:0001608'] },
  { key: 'bone', labelJa: '骨・関節のこと', categories: ['HP:0033127', 'HP:0040064', 'HP:0000924'] },
  { key: 'growth', labelJa: '成長・発育のこと', categories: ['HP:0001507'] },
  { key: 'hormone', labelJa: 'ホルモンのこと', categories: ['HP:0000818'] },
  { key: 'immune', labelJa: '免疫・感染のこと', categories: ['HP:0002715'] },
  { key: 'tumor', labelJa: '腫瘍のこと', categories: ['HP:0002664'] },
  { key: 'birth', labelJa: '生まれる前・生まれたときのこと', categories: ['HP:0001197'] },
  { key: 'body', labelJa: '体のこと', categories: ['HP:0025142'] },
  { key: 'other', labelJa: 'その他', categories: [] },
]

/**
 * 個別の上書き（HPO ID → 見出し）。機械的な判定を、ファウンダー判断で 1 件ずつ直す場所。
 * 2026-09-13 時点では空（ルール通りで進める判定）。足すときは理由を行末に書く。
 */
export const HPO_HEADING_OVERRIDES: Readonly<Record<string, HpoHeadingKey>> = {}

export function loadHpoCategories(rootDir: string = process.cwd()): HpoCategories {
  const p = path.join(rootDir, HPO_CATEGORIES_RELATIVE_PATH)
  if (!fs.existsSync(p)) return { meta: {}, entries: {} }
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as { _meta?: HpoCategories['meta']; entries?: Record<string, HpoCategoryEntry> }
  return { meta: raw._meta ?? {}, entries: raw.entries ?? {} }
}

let cached: HpoCategories | null = null

export function getHpoCategories(): HpoCategories {
  if (!cached) cached = loadHpoCategories()
  return cached
}

/** テスト用: 読み直す */
export function resetHpoCategories(): void {
  cached = null
}

export function headingByKey(key: HpoHeadingKey): HpoHeading {
  return HPO_HEADINGS.find((h) => h.key === key) ?? HPO_HEADINGS[HPO_HEADINGS.length - 1]
}

/** 祖先カテゴリと英語ラベルから見出しを決める（純関数。派生ファイルを読まない） */
export function headingFor(hpoId: string, categories: ReadonlyArray<string>, labelEn: string): HpoHeading {
  const override = HPO_HEADING_OVERRIDES[hpoId]
  if (override) return headingByKey(override)
  const anc = new Set(categories)
  const en = labelEn.toLowerCase()
  for (const h of HPO_HEADINGS) {
    if (h.categories.some((c) => anc.has(c))) return h
    if (h.labelEnContains?.some((w) => en.includes(w))) return h
  }
  return HPO_HEADINGS[HPO_HEADINGS.length - 1]
}

/** 派生ファイルを引いて見出しを決める。派生ファイルに無い ID は「その他」 */
export function headingOf(hpoId: string, labelEn: string): HpoHeading {
  const e = getHpoCategories().entries[hpoId]
  return headingFor(hpoId, e?.categories ?? [], e?.label_en ?? labelEn)
}
