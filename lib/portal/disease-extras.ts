/**
 * 疾患ごとの追加資料（家族への情報・医療者向けの資材）— data/disease_extras/<slug>.json
 *
 * ルートと部品は全疾患共通。中身のある疾患だけ JSON を置く（無い疾患のページは 404）。
 * slug は DEMO_DISEASES の固定 slug。
 *
 * 各文（Fact）は出典 URL と evidence（出典の原文、40 字以内）を持つ。
 * 画面に渡す型は evidence を持たない（evidence は画面に出さない。型の段階で落とす）。
 * 出典 URL は許可したドメインの https だけ（例外は HTTP_EXCEPTION_HOSTS の 1 件）。外れた URL が 1 つでもあれば、ファイルごと読まない。
 * 文によっては、出典とは別にリンク（link）を持つ（出典の文が案内している先。例：施設検索）。
 * 遺伝のしかたの図（diagram）は、父／母が患者の場合の息子・娘のマスごとに出典つきの文を持つ。null のマスは「準備中」。
 * 常染色体潜性の病気は diagram_ar（両親＝保因者の文と、子の 4 マスのうち 1 つが患者さんになる文）を持つ。
 * diagram_ar があるときは、画面は X 連鎖用の図の代わりに常染色体潜性用の図を出す。
 * 手紙のひな形は出典のある事実ではなく文面のひな形。status が approved のものだけ画面に出す。
 * writer_note は手紙を書く本人向けの注記（画面だけ。印刷しない）。
 * 形の崩れたファイルは読まない（見出しだけ出して中身を想像させないため）。
 *
 * review_status（任意）が "approved" 以外のファイルは、形を確かめたうえで公開しない（pending に入れる）。
 * ファウンダーの医学的な採否が付く前の下書き（例：wilson.json・otc.json。2026-10-04）を置いておくため。
 * review_status が無いファイル（fabry.json）は、これまでどおり公開する。
 */

import * as fs from 'fs'
import * as path from 'path'

export const DISEASE_EXTRAS_RELATIVE_DIR = path.join('data', 'disease_extras')

const EXTRAS_FILE = /^([a-z0-9-]+)\.json$/

/** 出典として認めるドメイン（サブドメインを含む） */
export const ALLOWED_SOURCE_DOMAINS: readonly string[] = [
  'nanbyou.or.jp',
  'shouman.jp',
  'jams.med.or.jp',
  'idenshiiryoubumon.org',
  'jshg.jp',
  'jsimd.net',
]

/**
 * https で開けないため、http を例外として認めるホスト（2026-10-02 ファウンダー判断）。
 *
 * 全国遺伝子医療部門連絡会議のサイトは、https でつなぐと別名（*.xserver.jp）の証明書が返り、
 * www あり・なしとも開けない（2026-10-02 確認）。http では開ける。施設検索へのリンクにだけ使う。
 * 半年ごとに https で開けるか確かめ直す（次回 2027-04）。開けるようになったら、この例外を消して URL を https にする。
 * 経緯は docs/fabry_extras_review.md の D-6。
 */
export const HTTP_EXCEPTION_HOSTS: readonly string[] = ['www.idenshiiryoubumon.org']

/** 画面に渡す形。evidence は持たない */
export interface ExtrasFact {
  text: string
  sourceUrl: string
  /** 出典とは別のリンク（出典の文が案内している先） */
  link: { url: string; label: string } | null
}

/** 常染色体潜性用の図。両親（保因者）と、子の 4 マスのうち 1 つが患者さんになることを示す文 */
export interface InheritanceDiagramArCells {
  parents: ExtrasFact
  affected: ExtrasFact
}

export interface InheritanceDiagramCells {
  father: { son: ExtrasFact | null; daughter: ExtrasFact | null }
  mother: { son: ExtrasFact | null; daughter: ExtrasFact | null }
}

export interface DiseaseExtras {
  slug: string
  family: {
    inheritance: ExtrasFact[]
    diagram: InheritanceDiagramCells
    /** 常染色体潜性用の図（あれば X 連鎖用の図の代わりに出す） */
    diagramAr: InheritanceDiagramArCells | null
    /** approved のときだけ中身がある。未承認なら null */
    letter: { paragraphs: string[]; writerNote: string[] } | null
    consult: ExtrasFact[]
  }
  clinicians: {
    organs: { organ: string; facts: ExtrasFact[] }[]
  }
}

// ---- 検証（崩れていたら null。理由は errors に積む） ----------------------

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

export function isAllowedSourceUrl(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol === 'http:') return HTTP_EXCEPTION_HOSTS.includes(u.hostname)
  if (u.protocol !== 'https:') return false
  return ALLOWED_SOURCE_DOMAINS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))
}

function parseFact(f: unknown, where: string, errors: string[]): ExtrasFact | null {
  const o = (f ?? {}) as Record<string, unknown>
  if (!isStr(o.text) || !isStr(o.source_url) || !isStr(o.evidence)) {
    errors.push(`${where} に text・source_url・evidence のどれかが無い`)
    return null
  }
  if (!isAllowedSourceUrl(o.source_url)) {
    errors.push(`${where} の source_url が許可ドメインの https でない（${o.source_url}）`)
    return null
  }
  let link: ExtrasFact['link'] = null
  if (o.link !== undefined) {
    const l = (o.link ?? {}) as Record<string, unknown>
    if (!isStr(l.url) || !isStr(l.label)) {
      errors.push(`${where}.link に url・label のどちらかが無い`)
      return null
    }
    if (!isAllowedSourceUrl(l.url)) {
      errors.push(`${where}.link.url が許可ドメインの https でない（${l.url}）`)
      return null
    }
    link = { url: l.url, label: l.label.trim() }
  }
  return { text: o.text.trim(), sourceUrl: o.source_url, link }
}

function parseFacts(v: unknown, where: string, errors: string[]): ExtrasFact[] | null {
  if (!Array.isArray(v)) {
    errors.push(`${where} が配列でない`)
    return null
  }
  const out: ExtrasFact[] = []
  for (const [i, f] of v.entries()) {
    const fact = parseFact(f, `${where}[${i}]`, errors)
    if (!fact) return null
    out.push(fact)
  }
  return out
}

const EMPTY_DIAGRAM: InheritanceDiagramCells = {
  father: { son: null, daughter: null },
  mother: { son: null, daughter: null },
}

/** 図のマス。diagram が無ければ全マス null（準備中）。マスは Fact か null */
function parseDiagram(v: unknown, errors: string[]): InheritanceDiagramCells | null {
  if (v === undefined) return EMPTY_DIAGRAM
  const o = (v ?? {}) as Record<string, unknown>
  const out: InheritanceDiagramCells = { father: { son: null, daughter: null }, mother: { son: null, daughter: null } }
  for (const parent of ['father', 'mother'] as const) {
    const p = (o[parent] ?? {}) as Record<string, unknown>
    for (const child of ['son', 'daughter'] as const) {
      if (p[child] === null || p[child] === undefined) continue
      const fact = parseFact(p[child], `family.diagram.${parent}.${child}`, errors)
      if (!fact) return null
      out[parent][child] = fact
    }
  }
  return out
}

export function parseDiseaseExtras(raw: unknown, errors: string[] = []): DiseaseExtras | null {
  const fail = (why: string) => {
    errors.push(why)
    return null
  }
  if (!raw || typeof raw !== 'object') return fail('オブジェクトでない')
  const o = raw as Record<string, unknown>
  if (!isStr(o.slug)) return fail('slug が無い')

  const fam = o.family as Record<string, unknown> | undefined
  if (!fam || typeof fam !== 'object') return fail('family が無い')
  const inheritance = parseFacts(fam.inheritance, 'family.inheritance', errors)
  if (!inheritance) return null
  const consult = parseFacts(fam.consult, 'family.consult', errors)
  if (!consult) return null
  const diagram = parseDiagram(fam.diagram, errors)
  if (!diagram) return null
  let diagramAr: InheritanceDiagramArCells | null = null
  if (fam.diagram_ar !== undefined) {
    const a = (fam.diagram_ar ?? {}) as Record<string, unknown>
    const parents = parseFact(a.parents, 'family.diagram_ar.parents', errors)
    if (!parents) return null
    const affected = parseFact(a.affected, 'family.diagram_ar.affected', errors)
    if (!affected) return null
    diagramAr = { parents, affected }
  }

  const l = fam.letter as Record<string, unknown> | undefined
  if (!l || (l.status !== 'draft' && l.status !== 'approved')) return fail('family.letter.status が draft/approved でない')
  if (!Array.isArray(l.paragraphs) || !l.paragraphs.every((p) => typeof p === 'string'))
    return fail('family.letter.paragraphs が文字列の配列でない')
  const paragraphs = (l.paragraphs as string[]).map((p) => p.trim()).filter((p) => p !== '')
  if (l.writer_note !== undefined && (!Array.isArray(l.writer_note) || !l.writer_note.every((p) => typeof p === 'string')))
    return fail('family.letter.writer_note が文字列の配列でない')
  const writerNote = ((l.writer_note as string[] | undefined) ?? []).map((p) => p.trim()).filter((p) => p !== '')
  const letter = l.status === 'approved' && paragraphs.length > 0 ? { paragraphs, writerNote } : null

  const cl = o.clinicians as Record<string, unknown> | undefined
  if (!cl || !Array.isArray(cl.organs)) return fail('clinicians.organs が配列でない')
  const organs: DiseaseExtras['clinicians']['organs'] = []
  for (const [i, g] of (cl.organs as unknown[]).entries()) {
    const go = (g ?? {}) as Record<string, unknown>
    if (!isStr(go.organ)) return fail(`clinicians.organs[${i}].organ が無い`)
    const facts = parseFacts(go.facts, `clinicians.organs[${i}].facts`, errors)
    if (!facts) return null
    if (facts.length > 0) organs.push({ organ: go.organ.trim(), facts })
  }

  return { slug: o.slug, family: { inheritance, diagram, diagramAr, letter, consult }, clinicians: { organs } }
}

// ---- 読み込み -------------------------------------------------------------

export interface ExtrasLoadResult {
  bySlug: Map<string, DiseaseExtras>
  /** 読まなかったファイルと理由 */
  rejected: { file: string; reason: string }[]
  /** 形は正しいが、採否が付く前なので公開しないファイル（review_status が approved 以外） */
  pending: { file: string; reviewStatus: string }[]
}

export function loadDiseaseExtras(dir: string): ExtrasLoadResult {
  const bySlug = new Map<string, DiseaseExtras>()
  const rejected: ExtrasLoadResult['rejected'] = []
  const pending: ExtrasLoadResult['pending'] = []
  if (!fs.existsSync(dir)) return { bySlug, rejected, pending }
  for (const f of fs.readdirSync(dir).sort()) {
    const m = EXTRAS_FILE.exec(f)
    if (!m) continue
    const errors: string[] = []
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    } catch {
      rejected.push({ file: f, reason: 'JSON として読めない' })
      continue
    }
    const ex = parseDiseaseExtras(raw, errors)
    if (!ex) {
      rejected.push({ file: f, reason: errors.join(' / ') })
      continue
    }
    if (ex.slug !== m[1]) {
      rejected.push({ file: f, reason: `ファイル名と slug（${ex.slug}）が違う` })
      continue
    }
    const reviewStatus = (raw as Record<string, unknown>).review_status
    if (reviewStatus !== undefined && reviewStatus !== 'approved') {
      pending.push({ file: f, reviewStatus: String(reviewStatus) })
      continue
    }
    bySlug.set(ex.slug, ex)
  }
  return { bySlug, rejected, pending }
}

// ---- 画面から使う -----------------------------------------------------------

let extrasDir: string | null = null
let cached: ExtrasLoadResult | null = null

function load(): ExtrasLoadResult {
  if (!cached) cached = loadDiseaseExtras(extrasDir ?? path.join(process.cwd(), DISEASE_EXTRAS_RELATIVE_DIR))
  return cached
}

/** 追加資料のある slug（ルートの事前生成と、疾患ページの入口に使う） */
export function listDiseaseExtrasSlugs(): string[] {
  return [...load().bySlug.keys()]
}

export function getDiseaseExtras(slug: string): DiseaseExtras | null {
  return load().bySlug.get(slug) ?? null
}

/** 出典 URL を重複なしで、出てきた順に番号付けする（医療者向け資材の出典一覧） */
export function numberSources(facts: ExtrasFact[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of facts) if (!m.has(f.sourceUrl)) m.set(f.sourceUrl, m.size + 1)
  return m
}

/** テスト用: 読む場所を差し替える（フィクスチャで描画を確かめる）。null で本番の場所に戻す */
export function setDiseaseExtrasDirForTest(dir: string | null): void {
  extrasDir = dir
  cached = null
}
