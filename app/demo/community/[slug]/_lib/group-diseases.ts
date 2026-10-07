// 会が対象にする病気（固定 ID）と、患者登録制度 JaSMIn の案内を出すか（会のホームの案内に使う）
//
// 2026-10-04: data の JSON ではなく DB から引く（会の新設で作られた会も同じ扱いにするため）。
//   本来の元は patient_groups.disease_ids（disease_catalog の固定 ID。20261023）だが、アプリのロールには
//   patient_groups の id・slug・name の 3 列しか読む権限が無い（20260927。disease_ids は読めない）。
//   そこで、同じ disease_ids から DB のトリガーが写す public_groups.disease_id（disease_catalog を参照。20261026）を読む。
//   public_groups.disease_id は disease_ids の先頭だけ（複数の病気を扱う会の 2 つ目以降は写らない。いまの会はすべて 1 病気）。
//   読めないときは空（会のホームの案件の案内・JaSMIn の案内を出さない側に倒す）。

import { fetchPublicGroups } from '../../../_lib/contract-db'

/** 会の slug → 対象の病気の固定 ID（public_groups から。読めなければ空） */
export async function diseaseIdsOfGroup(slug: string): Promise<string[]> {
  const groups = await fetchPublicGroups()
  const g = (groups ?? []).find((x) => x.slug === slug)
  return g?.diseaseId ? [g.diseaseId] : []
}

/**
 * 患者登録制度 JaSMIn（https://www.jasmin-mcbank.com/）の案内を出す病気（先天代謝異常症。2026-10-03 ファウンダー指示）。
 * 2026-10-04 に、会の slug ではなく病気の固定 ID で判定するよう変えた（会の新設で作られた会にも同じ判定が効く）。
 * 入れたのは、ライソゾーム病（ファブリー病 rd00001・ムコ多糖症I型 rd00002・ゴーシェ病 rd00004）と
 * アミノ酸代謝異常症（フェニルケトン尿症 rd00013）。
 * 低ホスファターゼ症（rd00023）は JaSMIn の対象かが不明なので入れていない（ファウンダーの確認待ち）。
 * ほかの先天代謝異常症（ポンペ病・ムコ多糖症II型など）も、JaSMIn の対象の一覧を確かめていないので入れていない。
 */
export const JASMIN_DISEASE_IDS: readonly string[] = ['rd00001', 'rd00002', 'rd00004', 'rd00013']
export const JASMIN_URL = 'https://www.jasmin-mcbank.com/'

export function isJasminTarget(diseaseIds: readonly string[]): boolean {
  return diseaseIds.some((id) => JASMIN_DISEASE_IDS.includes(id))
}
