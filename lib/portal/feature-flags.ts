/**
 * 本番で開くまで閉じておく機能のフラグ（2026-10-03 ファウンダー指示。docs/DEPLOY_CHECKLIST_2026-09-26.md の冒頭）
 *
 * どれも環境変数が 'on' ちょうどのときだけ開く。未設定・'off'・'ON'・' on'・'true'・'1' などはすべて閉じる
 * （JOURNEY_SURVEY の isJourneyEnabled と同じ決まり）。既定は off。
 *
 * ここは一覧と判定だけを持つ。各画面・サーバー処理で閉じる（配線する）のは、それぞれの担当の作業。
 * 配線の状況は docs/DEPLOY_CHECKLIST_2026-09-26.md に書く。
 * クライアントの部品からも読めるよう、fs や Supabase を import しない。
 */

export const FEATURE_FLAGS = {
  /** 患者会への参加希望（/demo/wish/**、group_wishes） */
  WISHES: '参加希望',
  /** 治験・研究の案内（trial_notices。lib/portal/trial-notices-ops.ts） */
  TRIAL_NOTICES: '治験・研究の案内（案件）',
  /** 運営画面（/demo/ops/**、operators） */
  OPS: '運営画面',
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export const FEATURE_FLAG_NAMES = Object.keys(FEATURE_FLAGS) as FeatureFlag[]

/** フラグが開いているか。環境変数の値が 'on' ちょうどのときだけ true */
export function isFeatureEnabled(
  flag: FeatureFlag,
  env: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  return env[flag] === 'on'
}
