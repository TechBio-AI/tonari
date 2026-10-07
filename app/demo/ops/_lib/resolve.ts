// 運営画面の病気の指定（病名・固定 ID のどちらでも）。data/disease_index.json・data/disease_ids.json から引く（DB を読まない）

import { allWishTargets, wishTargetByDiseaseId, wishTargetByName, type WishTarget } from '../../wish/_lib/targets'

export function resolveDiseaseId(raw: string): string | null {
  const s = raw.trim()
  if (/^rd\d{5}$/.test(s)) return wishTargetByDiseaseId(s)?.diseaseId ?? null
  return wishTargetByName(s)?.diseaseId ?? null
}

export function diseaseNameOf(diseaseId: string | null): string {
  if (!diseaseId) return '（病気の指定なし）'
  return wishTargetByDiseaseId(diseaseId)?.name ?? `（${diseaseId}）`
}

/** 病名の部分一致（運営画面の検索。最大 limit 件） */
export function searchDiseases(q: string, limit = 30): WishTarget[] {
  const s = q.trim()
  if (s === '') return []
  return allWishTargets()
    .filter((t) => t.diseaseId && t.name.includes(s))
    .slice(0, limit)
}
