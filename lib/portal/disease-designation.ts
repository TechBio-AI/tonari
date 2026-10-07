/**
 * 制度の目印（指定難病・小児慢性特定疾病）
 *
 * 出所は フェーズ0 の照合表（data/disease_overviews/_match_table.json）の **exact だけ**。
 * partial・none は出さない（推測で紐付けない）。
 *
 * ★ 知識ファイルの description 末尾にある「指定難病NNN。」は根拠にしない。
 *   812 件が 233 種類の番号しか使っておらず、1 つの番号を最大 30 疾患が共有していた
 *   （docs/disease_overview_proposal_2026-09-22.md §1-4）。照合表の告示番号だけを使う。
 *
 * 引き方は疾患概要・ORPHA コードと同じ: 知識ファイルの現在名 → 知識ファイル上の位置 → idx
 * （docs/kb_issues_2026-08-29.md の 47）。
 */
import * as fs from 'fs'
import * as path from 'path'

import { knowledgeFilePositionOf } from '@/lib/portal/disease-overviews'
import { MATCH_TABLE_RELATIVE_PATH } from '@/lib/portal/orpha-exact'

interface MatchSource {
  judgement?: string
  url?: string | null
  kokuji_no?: number | null
  group_link?: { name?: string; url?: string }[] | null
}

interface MatchEntry {
  idx: number
  nanbyou?: MatchSource
  shouman?: MatchSource
}

/** 指定難病として確定しているもの */
export interface NanbyouDesignation {
  /** 告示番号 */
  kokujiNo: number
  /** 難病情報センターの該当ページ */
  url: string
}

/** 小児慢性特定疾病として確定しているもの */
export interface ShoumanDesignation {
  url: string
}

/**
 * 群として紐付いたもの。
 * ★ いまは画面に出さない。ファウンダーの ○× が照合表へ反映された後に
 *   「〜の一部として指定難病（告示番号 NN）」の形で出す（2026-09-25 指示）。
 *   反映前は judgement = 'group' が 0 件なので、ここは常に null になる。
 */
export interface GroupDesignation {
  /** 群の名前（難病情報センターの掲載名） */
  name: string
  url: string
  /** 群の告示番号。照合表が持っていなければ null */
  kokujiNo: number | null
}

export interface DiseaseDesignation {
  nanbyou: NanbyouDesignation | null
  shouman: ShoumanDesignation | null
  /** 設計のみ。画面には出さない */
  nanbyouGroup: GroupDesignation | null
}

let cached: MatchEntry[] | null = null

function entries(): MatchEntry[] {
  if (!cached) {
    const p = path.join(process.cwd(), MATCH_TABLE_RELATIVE_PATH)
    cached = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')).entries as MatchEntry[]) : []
  }
  return cached
}

function isHttpUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v)
}

/** 照合表の 1 行から、確定している目印だけを取り出す */
export function parseDesignation(entry: MatchEntry | undefined): DiseaseDesignation {
  const empty: DiseaseDesignation = { nanbyou: null, shouman: null, nanbyouGroup: null }
  if (!entry) return empty

  const nb = entry.nanbyou
  const nanbyou =
    nb?.judgement === 'exact' && Number.isInteger(nb.kokuji_no) && (nb.kokuji_no as number) > 0 && isHttpUrl(nb.url)
      ? { kokujiNo: nb.kokuji_no as number, url: nb.url }
      : null

  const sh = entry.shouman
  const shouman = sh?.judgement === 'exact' && isHttpUrl(sh.url) ? { url: sh.url } : null

  // 群（設計のみ。今は出さない）
  const group = nb?.judgement === 'group' ? (nb.group_link ?? [])[0] : undefined
  const nanbyouGroup =
    group && typeof group.name === 'string' && group.name !== '' && isHttpUrl(group.url)
      ? { name: group.name, url: group.url, kokujiNo: Number.isInteger(nb?.kokuji_no) ? (nb!.kokuji_no as number) : null }
      : null

  return { nanbyou, shouman, nanbyouGroup }
}

/** 何も確定していなければ false（画面は見出しごと出さない） */
export function hasDesignation(d: DiseaseDesignation): boolean {
  return d.nanbyou !== null || d.shouman !== null
}

/** 疾患名から制度の目印を引く。確定分が無ければ全て null */
export function designationOf(diseaseName: string): DiseaseDesignation {
  const idx = knowledgeFilePositionOf(diseaseName)
  if (idx === null) return { nanbyou: null, shouman: null, nanbyouGroup: null }
  const e = entries()[idx]
  return parseDesignation(e && e.idx === idx ? e : undefined)
}
