// DB にだけある会（会の新設で作られた会。public_groups）を、/demo/groups の一覧用に拾い直す（2026-10-04）。
// data/patient_groups/patient_groups.json にある会は除く（そちらは JSON から出している）。返すのは slug・名前・対象の病気だけ。

import groupsJson from '@/data/patient_groups/patient_groups.json'

import { wishTargetByDiseaseId } from '../../wish/_lib/targets'

const IN_DATA = new Set(((groupsJson as { groups?: { id: string }[] }).groups ?? []).map((g) => g.id))

export interface NewPublicGroupItem {
  slug: string
  name: string
  disease: { name: string; slug: string } | null
}

export function toNewPublicGroupItems(groups: { slug: string; name: string; diseaseId: string | null }[]): NewPublicGroupItem[] {
  return groups
    .filter((g) => !IN_DATA.has(g.slug))
    .map((g) => {
      const t = g.diseaseId ? wishTargetByDiseaseId(g.diseaseId) : null
      return { slug: g.slug, name: g.name, disease: t ? { name: t.name, slug: t.slug } : null }
    })
}

