/**
 * 疾患概要（フェーズ1 の抽出結果）— data/disease_overviews/<idx>.json
 *
 * 仕様: docs/disease_overview_phase1_spec_2026-09-24.md（入力の JSON スキーマ）
 *
 * ★ 紐付けは idx だけ（2026-09-25 ファウンダー確定）
 *   疾患ページ → 知識ファイル上の位置 → idx で引く。JSON の name は検索にも表示にも使わない
 *   （病名は改名が続くため。見出しは知識ファイルの現在名）。
 *   idx は知識ファイルの並び順なので、統合・追加・並べ替えでずれる。固定 ID が無いことは
 *   docs/kb_issues_2026-08-29.md の 47 に記録。ずれの検知は lib/portal/__tests__/disease-overviews.test.ts。
 *
 * 画面に渡す型は evidence を持たない（evidence は画面に出さない。型の段階で落とす）。
 * 形の崩れたファイルは読まない（見出しだけ出して中身を想像させないため、疾患ごと「準備中」のまま）。
 */

import * as fs from 'fs'
import * as path from 'path'

import { KNOWLEDGE_JSON_RELATIVE_PATH, type KnowledgeRecord } from '@/lib/portal/knowledge-file'

export const DISEASE_OVERVIEWS_RELATIVE_DIR = path.join('data', 'disease_overviews')

/** 抽出結果のファイル名。_match_table.json・_shards/・_samples/ などは対象外 */
const OVERVIEW_FILE = /^(\d+)\.json$/

export type OverviewSourceId = 'nanbyou' | 'shouman' | 'orphanet'
export type OverviewTreatmentType = '治療法あり' | '症状を抑える治療が中心' | '研究段階' | '記載なし'
export type OverviewLinkLabel = '公式ページ' | '関連する群のページ'

const SOURCE_IDS: readonly OverviewSourceId[] = ['nanbyou', 'shouman', 'orphanet']
const TREATMENT_TYPES: readonly OverviewTreatmentType[] = ['治療法あり', '症状を抑える治療が中心', '研究段階', '記載なし']
const LINK_LABELS: readonly OverviewLinkLabel[] = ['公式ページ', '関連する群のページ']

/** 出典の表示名 */
export const OVERVIEW_SOURCE_NAME_JA: Record<OverviewSourceId, string> = {
  nanbyou: '難病情報センター',
  shouman: '小児慢性特定疾病情報センター',
  orphanet: 'Orphanet',
}

/** 画面に渡す形。evidence・notes・sha256 は持たない */
export interface DiseaseOverview {
  idx: number
  /** omitted: 原文の一部（治療薬名を含む文・句）を省いたもの（2026-09-26 docs/DECISIONS.md）。帰属表示に添える */
  summary: { text: string; lang: 'ja' | 'en'; sourceId: OverviewSourceId; omitted: boolean }
  symptoms: { text: string; sourceId: OverviewSourceId }[]
  onset: { text: string; sourceId: OverviewSourceId } | null
  treatmentType: OverviewTreatmentType
  links: { id: OverviewSourceId; url: string; label: OverviewLinkLabel }[]
  /** 本文の出典か links に Orphanet がある（CC BY 4.0 の帰属表示が要る） */
  usesOrphanet: boolean
}

// ---- 検証（崩れていたら null。理由は errors に積む） ----------------------

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isSourceId = (v: unknown): v is OverviewSourceId => SOURCE_IDS.includes(v as OverviewSourceId)

function parseFact(v: unknown): { text: string; sourceId: OverviewSourceId } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!isStr(o.text) || !isSourceId(o.source_id)) return null
  return { text: o.text.trim(), sourceId: o.source_id }
}

export function parseDiseaseOverview(raw: unknown, errors: string[] = []): DiseaseOverview | null {
  const fail = (why: string) => {
    errors.push(why)
    return null
  }
  if (!raw || typeof raw !== 'object') return fail('オブジェクトでない')
  const o = raw as Record<string, unknown>

  if (!Number.isInteger(o.idx) || (o.idx as number) < 0) return fail('idx が非負の整数でない')

  const s = o.summary as Record<string, unknown> | undefined
  const summaryFact = parseFact(s)
  if (!summaryFact) return fail('summary が無いか、text・source_id が不正')
  if (s!.lang !== 'ja' && s!.lang !== 'en') return fail('summary.lang が ja/en でない')

  if (!Array.isArray(o.symptoms)) return fail('symptoms が配列でない')
  const symptoms = o.symptoms.map(parseFact)
  if (symptoms.some((x) => x === null)) return fail('symptoms に不正な項目がある')

  let onset: DiseaseOverview['onset'] = null
  if (o.onset !== null && o.onset !== undefined) {
    onset = parseFact(o.onset)
    if (!onset) return fail('onset が null でも正しい形でもない')
  }

  const t = o.treatment as Record<string, unknown> | undefined
  if (!t || !TREATMENT_TYPES.includes(t.type as OverviewTreatmentType)) return fail('treatment.type が不正')

  if (!Array.isArray(o.links)) return fail('links が配列でない')
  const links: DiseaseOverview['links'] = []
  for (const l of o.links as Record<string, unknown>[]) {
    if (!l || !isSourceId(l.id) || !isStr(l.url) || !/^https?:\/\//.test(l.url)) return fail('links に不正な項目がある')
    if (!LINK_LABELS.includes(l.label as OverviewLinkLabel)) return fail('links の label が不正')
    links.push({ id: l.id, url: l.url, label: l.label as OverviewLinkLabel })
  }

  const sourceIds = [
    summaryFact.sourceId,
    ...symptoms.map((x) => x!.sourceId),
    ...(onset ? [onset.sourceId] : []),
    ...(isSourceId(t.source_id) ? [t.source_id] : []),
    ...links.map((l) => l.id),
  ]

  return {
    idx: o.idx as number,
    summary: { ...summaryFact, lang: s!.lang, omitted: s!.omitted === true },
    symptoms: symptoms as { text: string; sourceId: OverviewSourceId }[],
    onset,
    treatmentType: t.type as OverviewTreatmentType,
    links,
    usesOrphanet: sourceIds.includes('orphanet'),
  }
}

// ---- 読み込み -------------------------------------------------------------

export interface OverviewLoadResult {
  byIdx: Map<number, DiseaseOverview>
  /** 読まなかったファイルと理由 */
  rejected: { file: string; reason: string }[]
}

export function loadDiseaseOverviews(dir: string): OverviewLoadResult {
  const byIdx = new Map<number, DiseaseOverview>()
  const rejected: OverviewLoadResult['rejected'] = []
  if (!fs.existsSync(dir)) return { byIdx, rejected }
  for (const f of fs.readdirSync(dir).sort()) {
    const m = OVERVIEW_FILE.exec(f)
    if (!m) continue
    const errors: string[] = []
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    } catch {
      rejected.push({ file: f, reason: 'JSON として読めない' })
      continue
    }
    const ov = parseDiseaseOverview(raw, errors)
    if (!ov) {
      rejected.push({ file: f, reason: errors.join(' / ') })
      continue
    }
    if (ov.idx !== Number(m[1])) {
      rejected.push({ file: f, reason: `ファイル名と idx（${ov.idx}）が違う` })
      continue
    }
    byIdx.set(ov.idx, ov)
  }
  return { byIdx, rejected }
}

// ---- 知識ファイル上の位置（= idx） ------------------------------------------

let cachedPositions: Map<string, number> | null = null

/** 知識ファイルの現在の病名 → 並び順の位置。フェーズ0 の照合表はこの位置を idx にしている */
export function knowledgeFilePositionOf(diseaseName: string): number | null {
  if (!cachedPositions) {
    const records = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), KNOWLEDGE_JSON_RELATIVE_PATH), 'utf-8')
    ) as KnowledgeRecord[]
    cachedPositions = new Map()
    records.forEach((r, i) => {
      if (!cachedPositions!.has(r.disease)) cachedPositions!.set(r.disease, i)
    })
  }
  return cachedPositions.get(diseaseName) ?? null
}

// ---- 画面から使う -----------------------------------------------------------

let overviewsDir: string | null = null
let cached: OverviewLoadResult | null = null

/**
 * 疾患ページ用。引数は知識ファイルの現在の病名（疾患ページが slug から引いたもの）。
 * そこから知識ファイル上の位置 = idx を求めて概要を引く。無ければ null（画面は「準備中」のまま）
 */
export function getDiseaseOverviewForKnowledgeRecord(diseaseName: string): DiseaseOverview | null {
  const idx = knowledgeFilePositionOf(diseaseName)
  if (idx === null) return null
  if (!cached) cached = loadDiseaseOverviews(overviewsDir ?? path.join(process.cwd(), DISEASE_OVERVIEWS_RELATIVE_DIR))
  return cached.byIdx.get(idx) ?? null
}

/** テスト用: 読む場所を差し替える（_samples/ で描画を確かめる）。null で本番の場所に戻す */
export function setDiseaseOverviewsDirForTest(dir: string | null): void {
  overviewsDir = dir
  cached = null
}
