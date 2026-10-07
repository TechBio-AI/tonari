// 「病気がわかるまでの道のり」を出す会か（会ごとのページのタブ・入口の判定）。見せ方だけ。
// 回答できるかどうかは DB の submit_journey_response が会の病気と会員資格で決める。

import { JOURNEY_GROUP_SLUGS } from '@/lib/portal/journey-survey'

import { SAMPLE_GROUP } from '../../_components/sample-group'

/** 会員はファブリー病の会（JOURNEY_GROUP_SLUGS）、閲覧モードは見本の会（架空のデータで画面だけ見せる） */
export function isJourneyGroup(slug: string, demo: boolean): boolean {
  if (demo) return slug === SAMPLE_GROUP.slug // DEMO_ACCESS: 本番前に削除
  return JOURNEY_GROUP_SLUGS.includes(slug)
}

export const MY_JOURNEY_PATH = '/demo/community/journey'
