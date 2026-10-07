/**
 * 疾患一覧の分け方と並び順（純関数。fs を使わない）
 *
 * クライアント側（app/demo/diseases/_components/DiseaseFinder.tsx）からも import するので、
 * ファイルを読む lib/portal/diseases.ts とは分けてある（fs を含むと Next.js のクライアント束ねが失敗する）。
 *
 * 2026-09-13: 患者は「ファブリー病」を「ふ」で、「肝硬変」を「か」で探す。読みの頭文字で五十音に分ける。
 * 読みは推定しない（data/disease_readings/readings.json にあるものだけ）。読みが無い日本語名は「漢字（読みを準備中）」。
 */

export type DiseaseGroup = 'kana' | 'pending' | 'latin'
// 2026-09-13: 951 疾患すべてに読みが付き、pending は 0 件になった。
// 型は残す。新しい疾患を足したときに読みが無ければ、ここに落ちて検出できる。
// 画面のタブは件数が 0 なら出ない（DiseaseFinder）。読み漏れは
// lib/portal/__tests__/classify.test.ts が 0 件で固定して見張る。

export interface DiseaseListEntry {
  name: string
  /** 別名（知識ファイルの alternate_names をそのまま） */
  aliases: string[]
  /** URL 用。11 疾患は固定 slug、それ以外は病名そのもの（Next.js が URL エンコードする） */
  slug: string
  /** くわしい説明のページがあるか（11 疾患） */
  detailed: boolean
  /** 読み（ひらがな）。data/disease_readings/readings.json にあるものだけ。無ければ null（カナ始まりの病名は病名で並べる） */
  reading: string | null
  /**
   * 一覧の分け方（2026-09-13）。患者は「ファブリー病」を「ふ」で、「肝硬変」を「か」で探すので、読みの頭文字で分ける。
   *   kana    … 読みがある。五十音の行に置ける
   *   pending … 日本語名だが読みがまだ無い。2026-09-13 時点で 0 件。
   *               新しい疾患を読み無しで足すとここに落ちる（テストが 0 件で固定している）
   *   latin   … 日本語名を持たない（英語名のみ）。2026-09-13 時点で 0 件（3 件とも読みを付けて五十音へ移した）
   */
  group: DiseaseGroup
  /** kana: 五十音の行（あ・か・さ…）。pending / latin: '' */
  key: string
  /** 日本語の病名を持つか。英字始まりでも「X連鎖性…」は日本語名。全体が英数字なら false */
  hasJapaneseName: boolean
}

const KANA_ROWS: ReadonlyArray<[string, string]> = [
  ['あ', 'あいうえお'],
  ['か', 'かきくけこ'],
  ['さ', 'さしすせそ'],
  ['た', 'たちつてと'],
  ['な', 'なにぬねの'],
  ['は', 'はひふへほ'],
  ['ま', 'まみむめも'],
  ['や', 'やゆよ'],
  ['ら', 'らりるれろ'],
  ['わ', 'わをん'],
]

const SMALL_KANA: Record<string, string> = {
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ゎ: 'わ', ゔ: 'う',
}

/** カナ 1 文字 → ひらがなの清音（濁点・半濁点・小書きを畳む）。カナでなければ null */
function toBaseHiragana(ch: string): string | null {
  const code = ch.charCodeAt(0)
  let hira: string
  if (code >= 0x3041 && code <= 0x3096) hira = ch
  else if (code >= 0x30a1 && code <= 0x30f6) hira = String.fromCharCode(code - 0x60)
  else return null
  // 濁点・半濁点を外す（NFD で分解し、結合文字を落とす）
  hira = hira.normalize('NFD').replace(/[\u3099\u309a]/g, '')
  return SMALL_KANA[hira] ?? hira
}

/** 読みの頭文字から五十音の行を引く。カナで始まらない読みなら null */
export function kanaRowOf(reading: string): string | null {
  const hira = toBaseHiragana(reading.charAt(0))
  if (!hira) return null
  for (const [row, chars] of KANA_ROWS) if (chars.includes(hira)) return row
  return null
}

/**
 * 分け方を決める。読みは推定しない。
 *   reading があればその頭文字で五十音の行に置く。
 *   無くても、カナで始まる病名は病名の頭文字で置ける（reading は null のまま。並びは病名で足りる）。
 *   それ以外は、日本語名なら pending（読みを準備中）、日本語名が無ければ latin（英数）。
 */
export function classifyDiseaseName(
  name: string,
  reading: string | null = null
): { group: DiseaseGroup; key: string; hasJapaneseName: boolean; reading: string | null } {
  const hasJapaneseName = /[\u3041-\u3096\u30a1-\u30f6\u4e00-\u9fff]/.test(name)
  const row = kanaRowOf(reading ?? name)
  if (row) return { group: 'kana', key: row, hasJapaneseName, reading }
  if (hasJapaneseName) return { group: 'pending', key: '', hasJapaneseName, reading: null }
  return { group: 'latin', key: '', hasJapaneseName, reading: null }
}

/** 並びの鍵: 読みがあれば読み、無ければ病名（カタカナはひらがなに畳んで、読みと同じ土俵で比べる） */
export function diseaseSortKey(e: Pick<DiseaseListEntry, 'name' | 'reading'>): string {
  return e.reading ?? e.name.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** 並び順: 読み順（無ければ病名順）だけ。くわしい説明があるものを持ち上げない */
export function compareDiseaseEntries(a: DiseaseListEntry, b: DiseaseListEntry): number {
  return diseaseSortKey(a).localeCompare(diseaseSortKey(b), 'ja')
}

// ---------------------------------------------------------------------------
// 充実度（2026-09-25 ファウンダー指示で 3 段階）
//   detailed … ● 患者の言葉で書いたくわしい説明がある（DEMO_DISEASES の 11 件）
//   overview … ○ 出典付きの「病気の概要」がある（data/disease_overviews/<idx>.json が検証を通ったもの）
//   pending  … 無印。準備中
// 両方ある疾患は detailed（上の階を優先）。これは進捗であって疾患の属性ではない。並び順には使わない。
// ---------------------------------------------------------------------------

export type Readiness = 'detailed' | 'overview' | 'pending'

export interface DiseaseListItem extends DiseaseListEntry {
  readiness: Readiness
}

export const READINESS_MARK: Record<Readiness, string | null> = {
  detailed: '●',
  overview: '○',
  pending: null,
}

export const READINESS_LABEL: Record<Readiness, string> = {
  detailed: 'くわしい説明あり',
  overview: '病気の概要あり',
  pending: '準備中',
}

/** 凡例の説明（一覧の上に出す） */
export const READINESS_LEGEND: Record<Readiness, string> = {
  detailed: '患者の言葉で書いた、くわしい説明があります',
  overview: '公式情報をもとにまとめた「病気の概要」があります',
  pending: '説明を準備中です（病名・別名・患者会の有無だけ）',
}

/** 充実度を付ける。hasOverview は病名 → 有効な概要があるか（ファイルを読む側が渡す） */
export function withReadiness(
  entries: DiseaseListEntry[],
  hasOverview: (diseaseName: string) => boolean
): DiseaseListItem[] {
  return entries.map((e) => ({
    ...e,
    readiness: e.detailed ? 'detailed' : hasOverview(e.name) ? 'overview' : 'pending',
  }))
}
