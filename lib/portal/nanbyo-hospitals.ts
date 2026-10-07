/**
 * 都道府県別の難病診療連携拠点病院・難病診療分野別拠点病院・難病医療協力病院 — data/nanbyo_hospitals.json
 *
 * 出典は難病情報センター「難病の医療提供体制（医療機関情報）」だけ。値は出典の表から機械で取り出したもの。
 * 載せるのは都道府県・区分・病院名・専門分野（分野別拠点病院のみ、出典にあるとき）だけ。
 * 照合表は docs/nanbyo_hospitals_review_2026-10-03.md。
 *
 * JSON は import で読む（ビルドに含める。実行時にファイルを読まない）。
 * 画面に渡す型は evidence を持たない。病院名は原文どおり全部出す。
 */

import raw from '@/data/nanbyo_hospitals.json'

type Field = { value: string; evidence: string }

interface RawHospital {
  name: Field
  field?: Field
}

interface RawFile {
  source: { name: string; url: string; fetched_at: string; sha256: string }
  categories: string[]
  prefectures: {
    pref: string
    sections: { category: string; label: Field; as_of: string | null; hospitals: RawHospital[] }[]
  }[]
}

export interface NanbyoHospital {
  name: string
  field: string | null
}

export interface NanbyoHospitalSection {
  category: string
  /** 出典の見出しのまま（都道府県独自の呼び名や時点を含む） */
  label: string
  asOf: string | null
  hospitals: NanbyoHospital[]
}

export interface NanbyoHospitalPrefecture {
  pref: string
  sections: NanbyoHospitalSection[]
}

const file = raw as RawFile

export const NANBYO_HOSPITALS_SOURCE = {
  name: file.source.name,
  url: file.source.url,
  fetchedAt: file.source.fetched_at,
}

/** 区分の並び（連携拠点 → 分野別拠点 → 協力病院 → 県独自の区分。県独自のものは出典の区分名のまま） */
export const NANBYO_HOSPITAL_CATEGORIES: readonly string[] = file.categories

const PREFECTURES: NanbyoHospitalPrefecture[] = file.prefectures.map((p) => ({
  pref: p.pref,
  sections: p.sections.map((s) => ({
    category: s.category,
    label: s.label.value,
    asOf: s.as_of,
    hospitals: s.hospitals.map((h) => ({
      name: h.name.value,
      field: h.field?.value ?? null,
    })),
  })),
}))

export function listNanbyoHospitalPrefectures(): NanbyoHospitalPrefecture[] {
  return PREFECTURES
}

/** 都道府県名で引く。完全一致だけ。無ければ null */
export function getNanbyoHospitalsByPref(pref: string): NanbyoHospitalPrefecture | null {
  return PREFECTURES.find((p) => p.pref === pref) ?? null
}
