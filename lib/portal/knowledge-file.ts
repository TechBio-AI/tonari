/**
 * 知識ファイル（data/knowledge/comprehensive_rare_diseases_knowledge.json）の所在と 1 レコードの型
 *
 * 疾患ページ・疾患一覧（lib/portal/diseases.ts）が読む分だけ。読み取り専用で、原本は変更しない。
 *
 * 2026-09-12: 症状検索の分離（docs/DECISIONS.md）に伴い、lib/scoring/knowledge.ts から
 * 「読み込みに要る部分」だけをここに移した。採点用の ScoringDisease や照合語の組み立ては
 * 持ち込まない（それは「疾患を当てる」側。旧ツールの lib/scoring/knowledge.ts にある）。
 */

import * as path from 'path'

export const KNOWLEDGE_JSON_RELATIVE_PATH = path.join(
  'data',
  'knowledge',
  'comprehensive_rare_diseases_knowledge.json'
)

/** 知識 JSON の 1 レコード（読む分だけ） */
export interface KnowledgeRecord {
  /** 疾患の固定 ID（rd00001〜）。並び順の idx と違い、並び替え・統合・分割で変わらない（docs/disease_ids.md） */
  stable_id?: string
  disease: string
  alternate_names?: string[]
  orpha_code?: string
  description?: string
  symptoms?: string[]
  symptom_patterns?: string[]
  diagnosis?: string[]
  treatment?: string[]
}
