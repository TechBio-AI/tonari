// となりへの参加の希望の対象（2026-10-02 ファウンダー指示。2026-10-03 に全疾患へ広げた）
//
// 対象は公開層の疾患一覧のすべて（data/disease_index.json。idx は知識ファイルの位置で、DB の group_wishes.disease_idx と同じ）。
// 知識ファイル・patient_groups の JSON は、本番の実行時に fs で読めない前提なので、どちらも import で読み込む
// （番号表の一致は app/demo/__tests__/disease-index.test.ts が確かめる）。
// すでに患者会が参加している病気（data/patient_groups/patient_groups.json の diseases に名前があり、tonari_status が "joined"）は、
// 希望の画面を出さず、その会のページへ案内する（participatingGroupsOf）。
// tonari_status が "not_joined" の団体（2026-10-04）は参加していない扱い。希望の画面にその団体の名前を出す（notJoinedGroupsOf）。
// 2026-10-03: DB は disease_id（固定 ID。data/disease_ids.json の stable_id。rd00001 形式）で読み書きする（共通契約 A）。
//   URL は互換のため idx のまま（/demo/wish/[idx]）。idx ↔ disease_id の対応は data/disease_ids.json（作成時の idx）。
// クライアントの部品からも読むので、fs や Supabase を import しない。

import idsJson from '@/data/disease_ids.json'
import indexJson from '@/data/disease_index.json'
import groupsJson from '@/data/patient_groups/patient_groups.json'
import { tonariStatusOf, type TonariStatus } from '@/lib/portal/tonari-status'

export interface WishTarget {
  idx: number
  name: string
  slug: string
  /** 固定 ID（rd00001 形式）。対応表に無ければ null（その病気は DB に書けない） */
  diseaseId: string | null
}

export interface ParticipatingGroup {
  id: string
  name: string
}

/** data/patient_groups にある団体（となりへの参加の有無を問わない）。url が null は公式サイト未確認 */
export interface ExistingGroup {
  id: string
  name: string
  url: string | null
  tonariStatus: TonariStatus
}

const ID_BY_IDX = new Map((idsJson as { diseases: { stable_id: string; idx: number }[] }).diseases.map((d) => [d.idx, d.stable_id]))
const TARGETS: readonly WishTarget[] = (indexJson as { diseases: Omit<WishTarget, 'diseaseId'>[] }).diseases.map((d) => ({
  ...d,
  diseaseId: ID_BY_IDX.get(d.idx) ?? null,
}))
const BY_DISEASE_ID = new Map(TARGETS.filter((t) => t.diseaseId).map((t) => [t.diseaseId as string, t]))
const BY_IDX = new Map(TARGETS.map((t) => [t.idx, t]))
const BY_NAME = new Map(TARGETS.map((t) => [t.name, t]))
const GROUPS = ((groupsJson as { groups?: { id: string; name: string; url?: string | null; diseases: string[]; tonari_status?: unknown }[] }).groups ?? []).map((g) => ({
  id: g.id,
  name: g.name,
  url: typeof g.url === 'string' && /^https:\/\//.test(g.url) ? g.url : null,
  diseases: g.diseases,
  tonariStatus: tonariStatusOf(g.tonari_status),
}))

/** 公開層の一覧にある病気の idx なら、その病気。形の違う値・一覧に無い idx は null */
export function wishTargetOf(rawIdx: string | number): WishTarget | null {
  const s = String(rawIdx)
  if (!/^\d{1,6}$/.test(s)) return null
  return BY_IDX.get(Number(s)) ?? null
}

export function wishTargetByName(name: string): WishTarget | null {
  return BY_NAME.get(name) ?? null
}

/** 固定 ID（rd00001 形式）から */
export function wishTargetByDiseaseId(diseaseId: string): WishTarget | null {
  return BY_DISEASE_ID.get(diseaseId) ?? null
}

/** 公開層の一覧のすべて（運営画面の病気の検索などに使う） */
export function allWishTargets(): readonly WishTarget[] {
  return TARGETS
}

/** その病気を扱う、すでに参加している患者会（tonari_status が "joined"。無ければ空） */
export function participatingGroupsOf(diseaseName: string): ParticipatingGroup[] {
  return GROUPS.filter((g) => g.tonariStatus === 'joined' && g.diseases.includes(diseaseName)).map(({ id, name }) => ({ id, name }))
}

/** その病気を扱う、となりにまだ参加していない団体（tonari_status が "not_joined"。無ければ空） */
export function notJoinedGroupsOf(diseaseName: string): ExistingGroup[] {
  return existingGroupsOf(diseaseName).filter((g) => g.tonariStatus === 'not_joined')
}

/**
 * その病気を扱う、data/patient_groups にある団体（となり未参加を含む。2026-10-04）。
 * 会の新設の申請フォームと、運営の承認の画面の注意に使う（申請も承認も止めない）
 */
export function existingGroupsOf(diseaseName: string): ExistingGroup[] {
  return GROUPS.filter((g) => g.diseases.includes(diseaseName)).map(({ id, name, url, tonariStatus }) => ({ id, name, url, tonariStatus }))
}

/** 希望の画面を出す病気か（一覧にあり、まだ患者会が参加していない） */
export function isWishable(t: WishTarget): boolean {
  return participatingGroupsOf(t.name).length === 0
}

/**
 * マジックリンクから戻ったときに、どの病気の希望の画面へ戻すかを覚えておく cookie
 * （/demo/wish/[idx] のメール欄が送る直前に付け、/demo/auth/callback が読んで消す。中身は idx の数字だけ）
 */
export const WISH_NEXT_COOKIE = 'tonari_wish_next'
export const WISH_NEXT_MAX_AGE = 60 * 60

/** cookie の値 → 戻り先。一覧にある病気の idx でなければ null（それ以外の場所へは戻さない） */
export function wishNextPath(raw: string | undefined | null): string | null {
  if (!raw) return null
  const t = wishTargetOf(raw)
  return t ? `/demo/wish/${t.idx}` : null
}
