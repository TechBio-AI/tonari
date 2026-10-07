// 患者会の「となり」への参加の状態（data/patient_groups/patient_groups.json の tonari_status。2026-10-04）
// クライアントの部品からも読むので、fs を import しない。

export type TonariStatus = 'joined' | 'not_joined'

/** JSON の tonari_status の値 → 状態。"joined" 以外（欄が無いものを含む）は not_joined（参加していると言わない側に倒す） */
export function tonariStatusOf(raw: unknown): TonariStatus {
  return raw === 'joined' ? 'joined' : 'not_joined'
}
