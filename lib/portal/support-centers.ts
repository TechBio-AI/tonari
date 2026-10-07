/**
 * 都道府県・指定都市の難病相談支援センター一覧 — data/support_centers.json
 *
 * 出典は難病情報センター「都道府県・指定都市難病相談支援センター一覧」だけ。
 * 値は出典の表から機械で取り出したもの（行のまま）。出典に無い欄はキーごと無い。
 * 照合表は docs/support_centers_review_2026-10-02.md。
 *
 * JSON は import で読む（ビルドに含める。実行時にファイルを読まない）。
 * 画面に渡す型は evidence を持たない（evidence は画面に出さない。型の段階で落とす）。
 */

import raw from '@/data/support_centers.json'

type Field<T> = { value: T; evidence: string | null }

interface RawCenter {
  heading: string
  pref_basis: 'heading' | 'preceding_heading'
  name?: Field<string[]>
  phone?: Field<string>[]
  address?: Field<string[]>
  url?: Field<string>
}

interface RawFile {
  source: { name: string; url: string; fetched_at: string; sha256: string }
  prefectures: { pref: string; centers: RawCenter[] }[]
}

/** 画面に渡す形。evidence は持たない */
export interface SupportCenter {
  /** 出典の見出し（例：「神奈川県・横浜市・川崎市・相模原市」「札幌市」） */
  heading: string
  nameLines: string[]
  phones: string[]
  addressLines: string[]
  url: string | null
}

export interface SupportCenterPrefecture {
  pref: string
  centers: SupportCenter[]
}

const file = raw as RawFile

export const SUPPORT_CENTERS_SOURCE = {
  name: file.source.name,
  url: file.source.url,
  fetchedAt: file.source.fetched_at,
}

function toView(c: RawCenter): SupportCenter {
  return {
    heading: c.heading,
    nameLines: c.name?.value ?? [],
    phones: (c.phone ?? []).map((p) => p.value),
    addressLines: c.address?.value ?? [],
    url: c.url?.value ?? null,
  }
}

const PREFECTURES: SupportCenterPrefecture[] = file.prefectures.map((p) => ({
  pref: p.pref,
  centers: p.centers.map(toView),
}))

/** 47 都道府県（出典の並び＝北から） */
export function listSupportCenterPrefectures(): SupportCenterPrefecture[] {
  return PREFECTURES
}

/** 都道府県名で引く。完全一致だけ（「大阪」では引かない）。無ければ null */
export function getSupportCentersByPref(pref: string): SupportCenterPrefecture | null {
  return PREFECTURES.find((p) => p.pref === pref) ?? null
}
