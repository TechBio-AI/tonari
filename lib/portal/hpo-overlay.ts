/**
 * HPO 由来の症状の重ね書き — 疾患ページに「表示する」ための読み込み（11 疾患）
 *
 * 知識ファイル（data/knowledge/comprehensive_rare_diseases_knowledge.json）は変更しない。
 * data/hpo_symptoms/hpo_symptoms_11.json を疾患名で重ね、HPO 由来の症状を「足す」だけに使う。
 * HPO の原本（data/hpo/）は読まない。読むのは派生ファイルだけ。
 *
 * HPO 由来の症状は医学用語である（「肢端錯感覚」「足背屈筋虚弱」）。患者の言葉ではない。
 * 疾患ページの「主な症状」に出すのは、日本語ラベルがあるものだけ（displayable）。
 *
 * 2026-09-12: 症状検索の分離（docs/DECISIONS.md）に伴い、lib/scoring/hpo.ts から
 * 表示に要る部分だけをここに移した。照合用（hpoMatchingTerms / hpoVocabulary）は持ち込まない。
 * 「疾患を説明する」ことと「疾患を当てる」ことの境界をコードの分割に反映するため。
 * 照合側は旧ツールの lib/scoring/hpo.ts にある。
 *
 * 日本語ラベルの status:
 *   official  … 公式訳そのまま
 *   corrected … 公式訳に誤りがあり、ファウンダー指示で訂正したもの（公式訳は label_ja_official に残す）
 *   reported  … 誤訳の疑いを報告済み・未訂正。表示に使わない
 *   none      … 日本語訳が無い。表示に使わない
 *
 * ライセンス（data/hpo/SOURCE.md の 3 条件）: 原本を改変しない／バージョンを記録する／引用する。
 * 画面に出すときは HPO_ATTRIBUTION_JA を必ず添える。
 */

import * as fs from 'fs'
import * as path from 'path'

export const HPO_OVERLAY_RELATIVE_PATH = path.join('data', 'hpo_symptoms', 'hpo_symptoms_11.json')

export type HpoLabelStatus = 'official' | 'corrected' | 'reported' | 'none'

export interface HpoSymptomEntry {
  hpo_id: string
  label_ja: string | null
  label_en: string
  /** phenotype.hpoa の frequency（HP:0040280〜HP:0040284）。無ければ null */
  frequency: string | null
  label_ja_status: HpoLabelStatus
  label_ja_official?: string | null
  label_ja_note?: string
}

export interface HpoDiseaseEntry {
  orpha_code: string
  hpoa_disease_name?: string
  hpo_version: string
  symptoms: HpoSymptomEntry[]
}

export interface HpoOverlayMeta {
  hpo_version?: string
  hpo_ja_source_version?: string
  frequency_labels?: Record<string, string>
  license?: { attribution_ja?: string; citation?: string }
}

export interface HpoOverlay {
  meta: HpoOverlayMeta
  /** 疾患名（知識ファイルの表記そのもの）→ HPO 由来の症状 */
  entries: Record<string, HpoDiseaseEntry>
}

/** 使用バージョン。画面表示・記録に使う（ライセンス条件 2） */
export const HPO_VERSION = 'v2026-06-23'

/** 公開面に必ず添える帰属表示（ライセンス条件 3。data/hpo/SOURCE.md と同文） */
export const HPO_ATTRIBUTION_JA =
  '本サービスは Human Phenotype Ontology（HPO, リリース 2026-06-23）を利用しています。' +
  'HPO コンソーシアムに謝意を表します。' +
  '日本語訳は HPO 公式の Babelon 翻訳ファイル（hp-ja.babelon.tsv）に基づきます。'

export const HPO_CITATION =
  'Gargano MA, Matentzoglu N, Coleman B, et al. The Human Phenotype Ontology in 2024: ' +
  'phenotypes around the world. Nucleic Acids Res. 2024;52(D1):D1333–D1346. https://hpo.jax.org/'

/** 頻度の日本語（画面用）。phenotype.hpoa の値そのものは frequency に残す */
export const HPO_FREQUENCY_LABEL_JA: Record<string, string> = {
  'HP:0040280': '必発',
  'HP:0040281': '非常に多い',
  'HP:0040282': '多い',
  'HP:0040283': 'ときどき',
  'HP:0040284': 'まれ',
  'HP:0040285': 'みられない',
}

export function loadHpoOverlay(rootDir: string = process.cwd()): HpoOverlay {
  const p = path.join(rootDir, HPO_OVERLAY_RELATIVE_PATH)
  if (!fs.existsSync(p)) return { meta: {}, entries: {} }
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>
  const entries: Record<string, HpoDiseaseEntry> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    entries[k] = v as HpoDiseaseEntry
  }
  return { meta: (raw._meta as HpoOverlayMeta) ?? {}, entries }
}

let cached: HpoOverlay | null = null

export function getHpoOverlay(): HpoOverlay {
  if (!cached) cached = loadHpoOverlay()
  return cached
}

/** テスト用: 読み直す */
export function resetHpoOverlay(): void {
  cached = null
}

/** 画面に出してよい日本語ラベルを持つか（official / corrected のみ） */
export function isDisplayable(s: HpoSymptomEntry): s is HpoSymptomEntry & { label_ja: string } {
  return (s.label_ja_status === 'official' || s.label_ja_status === 'corrected') && !!s.label_ja
}

/** 疾患ページに出す HPO 由来の症状（日本語ラベルがあるものだけ。英語のままは出さない） */
export function displayableHpoSymptoms(entry: HpoDiseaseEntry | undefined): Array<HpoSymptomEntry & { label_ja: string }> {
  if (!entry) return []
  return entry.symptoms.filter(isDisplayable)
}
