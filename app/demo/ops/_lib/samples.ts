// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モードで見せる、運営画面の見本のデータ（2026-10-04）。すべて架空。DB は読まない。
// 承認・保存のボタンは、見本では押しても何も起きない（画面にそう書く）。

import type { GroupRequest, OpsReport, OpsTrialNotice, WishSummaryRow } from '../../_lib/contract-db'

export const OPS_DEMO_NOTICE = '運営画面の見本です。承認・却下・保存・公開などのボタンは、押しても何も起きません。数や申請はすべて架空です。'

export const SAMPLE_WISH_SUMMARY: WishSummaryRow[] = [
  { prefecture: '東京都', relation: 'self', isGroupMember: false, n: 4 },
  { prefecture: '東京都', relation: 'family', isGroupMember: null, n: 3 },
  { prefecture: '大阪府', relation: 'self', isGroupMember: true, n: 2 },
]

export const SAMPLE_GROUP_REQUESTS: GroupRequest[] = [
  { id: 'sample-request-1', diseaseId: 'rd00005', proposedName: '（見本）ポンペ病の会', message: 'これは見本の申請です。', status: 'pending', createdAt: '2026-10-01T00:00:00Z', decidedAt: null },
  { id: 'sample-request-2', diseaseId: 'rd00022', proposedName: '（見本）くる病の会', message: '', status: 'rejected', createdAt: '2026-09-20T00:00:00Z', decidedAt: '2026-09-25T00:00:00Z' },
]

export const SAMPLE_OPS_NOTICES: OpsTrialNotice[] = [
  { id: 'sample-ops-notice-1', diseaseId: 'sample', registry: 'jrct', registryId: '（見本の登録番号 1）', registryUrl: 'https://jrct.niph.go.jp/', summary: 'これは見本です。成人を対象とした試験の例です。', phase: null, status: 'published', publishedAt: '2026-10-01T00:00:00Z', interested: 3, dismissed: 1 },
  { id: 'sample-ops-notice-2', diseaseId: 'sample', registry: 'ctgov', registryId: '（見本の登録番号 2）', registryUrl: 'https://clinicaltrials.gov/', summary: 'これは見本の下書きです。', phase: null, status: 'draft', publishedAt: null, interested: 0, dismissed: 0 },
]

/** 見本の通報（全会）。会は見本の会（sample）だけ。理由も架空 */
export const SAMPLE_ALL_REPORTS: OpsReport[] = [
  { id: 'sample-report-1', groupSlug: 'sample', targetKind: 'post', postId: '00000000-0000-4000-8000-000000000201', commentId: null, reason: 'これは見本の通報です。', createdAt: '2026-10-03T00:00:00Z', handledAt: null },
  { id: 'sample-report-2', groupSlug: 'sample', targetKind: 'comment', postId: null, commentId: 'sample-c1', reason: '', createdAt: '2026-09-28T00:00:00Z', handledAt: null },
  { id: 'sample-report-3', groupSlug: 'sample', targetKind: 'post', postId: '00000000-0000-4000-8000-000000000202', commentId: null, reason: 'これは見本の、対応済みの通報です。', createdAt: '2026-09-10T00:00:00Z', handledAt: '2026-09-11T00:00:00Z' },
]
