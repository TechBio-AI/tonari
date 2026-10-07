/**
 * 患者・家族向けの文言（/demo 専用）
 *
 * 規範の元は、旧ツール（TechBio-AI/hozon-shindan-hojo-tool）の lib/scoring/present.ts。
 * そこにある 4 つの約束は変えない。
 *   1. パーセントを単独で出さない。必ず実数の内訳を併記する
 *   2. 同じ数字が複数並ぶのは「絞れた」ではなく「区別できない」という意味だと明示する
 *   3. 「診断」をサービスの動詞に使わない
 *   4. 年齢の係数が掛かった理由を表示する
 *
 * ここにあるのは、その約束を患者向けのことばで言い直したもの。
 * 「診断」「確率」は使わない（2026-09-10 ファウンダー指示）。lint-wording: allow
 * 採点のロジックには触れない。数字はそのまま、ことばだけ変える。
 * 症状検索の文言（formatOverlap 以下）は 2026-09-12 の分離後、このリポジトリでは未使用。
 */

export interface OverlapInput {
  /** 症状の一致 × 年齢の係数（0〜1） */
  finalRate: number
  matchedConceptCount: number
  inputConceptCount: number
  registeredSymptomCount: number
}

/**
 * 「症状の重なり 100 ％（書いた症状 2 つのうち 2 つが重なる／この病気に登録されている症状 19 件）」
 * パーセントだけの文は作らない。
 */
export function formatOverlap(c: OverlapInput): { percent: string; breakdown: string } {
  const percent = Math.round(c.finalRate * 100)
  return {
    percent: `症状の重なり ${percent} ％`,
    breakdown: `書いた症状 ${c.inputConceptCount} つのうち ${c.matchedConceptCount} つが重なる／この病気に登録されている症状 ${c.registeredSymptomCount} 件`,
  }
}

/** 同じ数字の病気が並んだときに必ず添える文（present.ts の TIE_NOTICE の言い直し） */
export const TIE_NOTICE_PLAIN =
  '同じ数字の病気がいくつも並んでいます。これは候補がしぼれたという意味ではなく、' +
  '書いていただいた内容だけでは、これらの病気を見分けられないという意味です。'

/** 数字の意味の但し書き（present.ts の RATE_MEANING_NOTICE の言い直し） */
export const OVERLAP_MEANING_PLAIN =
  'この数字は、書いていただいた症状のめずらしさをもとにした、並び順の目安です。' +
  'その病気かどうかを示すものではありません。'

/** 結果画面に必ず入れる 1 行 */
export const ASK_YOUR_DOCTOR = '気になることがあれば、かかりつけの先生に相談してください。'

/** 全画面の底に置く但し書き（医師判断優先。CLAUDE.md Critical Rules 1） */
export const SITE_NOTICE_PLAIN =
  'このサイトにあるのは、病気について知るための一般的な情報です。' +
  'どなたか個人の状態を判定したり、助言したりするものではありません。体のことは、医師にご相談ください。'

/** 患者会がまだ無い疾患に添える文 */
export const NO_GROUP_YET = 'この病気の患者会は、まだ「となり」に参加していません。'

/** 結果の最上部に必ず出す（3 点セットの 1） */
export const RESULT_TOP_NOTICE =
  'これは病気を判定するものではありません。気になることは、かかりつけの先生にご相談ください。'

/** 収録範囲の明示（3 点セットの 2）。件数は知識ベースから受け取る */
export function formatCoverage(diseaseCount: number): string {
  return `このサイトが症状を整理しているのは ${diseaseCount.toLocaleString('ja-JP')} 疾患です。ここにない病気は出てきません。`
}

/** 候補が 1 つしか出なかったときに必ず添える（1 つだけを断定的に見せない） */
export const SINGLE_CANDIDATE_NOTE =
  '1 つだけ出ていますが、それがその病気だという意味ではありません。書いていただいた症状が登録されている病気が、いまのところ 1 つだった、という意味です。'

/** 緊急警告の下に出す、過去の経過を促す文 */
export const PAST_SYMPTOMS_PROMPT = {
  title: 'これまでにも似たことがありましたか。',
  body:
    '以前から続いている症状や、くり返している症状があれば、あわせて書いていただくと、より近い病気が見つかりやすくなります。',
  button: '症状を追加して調べ直す',
} as const

/** 緊急性の高い所見が入力に含まれていたときの文（固定。ここ以外に置かない） */
export const URGENT_NOTICE_LINES = [
  'いま、次のような症状があるときは、調べる前に119番や医療機関に連絡してください。',
  '落ち着いてから、またここで調べていただけます。',
] as const
