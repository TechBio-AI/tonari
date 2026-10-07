'use server'

// 会ごとのページの操作（server action）
//
// どれも会員（kind: 'member'）であることを確かめてから lib/portal/tenancy.ts を呼ぶ。閲覧モード（demo）では何もしない。
// 会の id は画面から受け取らず、slug からサーバー側で引く。会員か・世話人かは tenancy.ts と DB（RLS・関数）が確かめる。
// 結果は ?error=<理由> / ?done=<種類> を付けて元のページへ戻す（入力値は URL に載せない。ログにも出さない）。
// 招待の作成だけは、リンクを画面に出すため値を返す（URL に token を載せない）。

import { redirect } from 'next/navigation'

import {
  acceptInvitation,
  appointModerator,
  approve,
  createComment,
  dismissModerator,
  createInvitation,
  deleteComment,
  deletePost,
  isUuid,
  leaveGroup,
  listGroups,
  reject,
  requestJoin,
  FAILURE_MESSAGES,
  type FailureReason,
} from '@/lib/portal/tenancy'

import { getViewer } from '../../_lib/session'
import { groupPath } from './_lib/access'
import {
  createPostWithMeta,
  isPostCategory,
  markReportHandled,
  pinPost,
  reportContent,
  saveRulesText,
} from './_lib/community'

async function requireMemberViewer(): Promise<void> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') redirect('/demo/login')
  if (!viewer.hasProfile) redirect('/demo/community/onboarding?from=join')
  if (viewer.needsConsent) redirect('/demo/community/onboarding')
}

async function groupIdOf(slug: string): Promise<string | null> {
  const r = await listGroups()
  if (!r.ok) return null
  return r.value.find((g) => g.slug === slug)?.id ?? null
}

function text(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}

function back(path: string, key: 'error' | 'done', value: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(value)}`)
}

function failed(path: string, reason: FailureReason): never {
  if (reason === 'unauthenticated') redirect('/demo/login')
  if (reason === 'profile_required') redirect('/demo/community/onboarding?from=join')
  back(path, 'error', reason)
}

// ---- 会員でない人 ---------------------------------------------------------------

export async function requestJoinAction(slug: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug)
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  // 紹介者の氏名は任意（空なら書かれていない扱い。形の検査は tenancy.ts と DB）。値はログに出さない
  const r = await requestJoin(groupId, text(fd, 'message'), text(fd, 'referrerName'))
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'requested')
}

export async function acceptInvitationAction(token: string): Promise<void> {
  await requireMemberViewer()
  const here = `/demo/community/invite/${encodeURIComponent(token)}`
  const r = await acceptInvitation(token)
  if (!r.ok) failed(here, r.reason)
  const groups = await listGroups()
  const slug = groups.ok ? groups.value.find((g) => g.id === r.value.groupId)?.slug : undefined
  if (!slug) redirect('/demo/community')
  back(groupPath(slug), 'done', 'joined')
}

// ---- 会員 ---------------------------------------------------------------------

export async function createThreadAction(slug: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/threads')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  // 分類（20261013）。選ばれていなければ「その他」。知らない値は invalid_input
  const category = text(fd, 'category') || 'other'
  if (!isPostCategory(category)) failed(path, 'invalid_input')
  const r = await createPostWithMeta(groupId, { kind: 'thread', title: text(fd, 'title'), body: text(fd, 'body'), category })
  if (!r.ok) failed(path, r.reason)
  back(groupPath(slug, `/threads/${r.value.postId}`), 'done', 'posted')
}

/** お知らせにもスレッドにもコメントできる。base は投稿のページ（/threads/[id] か /announcements/[id]） */
export async function createCommentAction(
  slug: string,
  base: 'threads' | 'announcements',
  postId: string,
  fd: FormData
): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(postId) || (base !== 'threads' && base !== 'announcements')) failed(groupPath(slug), 'invalid_input')
  const path = groupPath(slug, `/${base}/${postId}`)
  const r = await createComment(postId, text(fd, 'body'))
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'commented')
}

/**
 * 投稿を消す（論理削除）。書いた本人か、その会の世話人だけ（DB 関数 delete_group_post が確かめる）。
 * 済んだら一覧（お知らせはお知らせの一覧、スレッドは掲示板）へ戻す
 */
export async function deletePostAction(slug: string, base: 'threads' | 'announcements', postId: string): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(postId) || (base !== 'threads' && base !== 'announcements')) failed(groupPath(slug), 'invalid_input')
  const r = await deletePost(postId)
  if (!r.ok) failed(groupPath(slug, `/${base}/${postId}`), r.reason)
  back(base === 'threads' ? groupPath(slug, '/threads') : groupPath(slug, '/announcements'), 'done', 'deleted')
}

/** コメントを消す（論理削除）。書いた本人か、その会の世話人だけ（DB 関数 delete_group_comment が確かめる） */
export async function deleteCommentAction(
  slug: string,
  base: 'threads' | 'announcements',
  postId: string,
  commentId: string
): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(postId) || !isUuid(commentId) || (base !== 'threads' && base !== 'announcements')) {
    failed(groupPath(slug), 'invalid_input')
  }
  const path = groupPath(slug, `/${base}/${postId}`)
  const r = await deleteComment(commentId)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'comment_deleted')
}

/**
 * 退会する（DB 関数 leave_group。本人の membership に left_at を立てる。投稿・コメントは会に残る）。
 * 最後の世話人は退会できない（last_moderator）。そのときは確認画面へ戻し、土台の文言（FAILURE_MESSAGES）を出す。
 * 済んだら会のお知らせのページへ（会員でない人の表示になり、「退会しました」を出す）
 */
export async function leaveGroupAction(slug: string): Promise<void> {
  await requireMemberViewer()
  const here = groupPath(slug, '/leave')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(here, 'group_not_found')
  const r = await leaveGroup(groupId)
  if (!r.ok) failed(here, r.reason)
  back(groupPath(slug), 'done', 'left')
}

// ---- 世話人 -------------------------------------------------------------------

export async function createAnnouncementAction(slug: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  // 「公開ページにも出す」（is_public。20261013。公開ページへの写しは DB のトリガーが作る）
  const r = await createPostWithMeta(groupId, {
    kind: 'announcement',
    title: text(fd, 'title'),
    body: text(fd, 'body'),
    isPublic: fd.get('isPublic') === 'on',
  })
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'announced')
}

export async function approveJoinRequestAction(slug: string, requestId: string): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage')
  const r = await approve(requestId)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'approved')
}

export async function rejectJoinRequestAction(slug: string, requestId: string): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage')
  const r = await reject(requestId)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'rejected')
}

/**
 * 会員を世話人にする（土台の appointModerator。任命できるのはその会の世話人だけ。DB 関数も確かめる）。
 * 済んだら会員一覧へ ?done=appointed
 */
export async function appointModeratorAction(slug: string, targetUserId: string): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/members')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  const r = await appointModerator(groupId, targetUserId)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'appointed')
}

/**
 * 世話人から外す（土台の dismissModerator）。最後の 1 人は外せない（last_moderator。自分を外すときも同じ）。
 * 自分を外したときは、もう会員一覧を見られないので、会のお知らせのページへ ?done=dismissed_self
 */
export async function dismissModeratorAction(slug: string, targetUserId: string, self: boolean): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/members')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  const r = await dismissModerator(groupId, targetUserId)
  if (!r.ok) failed(path, r.reason)
  if (self) back(groupPath(slug), 'done', 'dismissed_self')
  back(path, 'done', 'dismissed')
}

/** スレッドを固定する／外す（世話人だけ。DB 関数 pin_group_post も確かめる）。済んだらスレッドのページへ */
export async function pinPostAction(slug: string, postId: string, pinned: boolean): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, `/threads/${postId}`)
  if (!isUuid(postId)) failed(groupPath(slug, '/threads'), 'invalid_input')
  const r = await pinPost(postId, pinned === true)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', pinned ? 'pinned' : 'unpinned')
}

/**
 * 投稿・コメントを通報する（DB 関数 report_group_content）。理由は 200 文字まで、空でもよい。
 * 二度目は already_reported（「すでに通報しています」）。済んだら投稿のページへ ?done=reported。
 * 通報した人は、どの画面にも出さない（DB 関数も返さない）
 */
export async function reportAction(
  slug: string,
  base: 'threads' | 'announcements',
  postId: string,
  commentId: string | null,
  fd: FormData
): Promise<void> {
  await requireMemberViewer()
  if (!isUuid(postId) || (commentId !== null && !isUuid(commentId)) || (base !== 'threads' && base !== 'announcements')) {
    failed(groupPath(slug), 'invalid_input')
  }
  const path = groupPath(slug, `/${base}/${postId}`)
  const r = await reportContent(commentId ? { commentId } : { postId }, text(fd, 'reason'))
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'reported')
}

/** 通報を対応済みにする（世話人だけ。DB 関数 mark_report_handled も確かめる） */
export async function markReportHandledAction(slug: string, reportId: string): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage/reports')
  const r = await markReportHandled(reportId)
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'handled')
}

/** 会の約束（rules_text）を保存する（世話人だけ）。空なら消す */
export async function saveRulesAction(slug: string, fd: FormData): Promise<void> {
  await requireMemberViewer()
  const path = groupPath(slug, '/manage/rules')
  const groupId = await groupIdOf(slug)
  if (!groupId) failed(path, 'group_not_found')
  const r = await saveRulesText(groupId, text(fd, 'rules'))
  if (!r.ok) failed(path, r.reason)
  back(path, 'done', 'rules_saved')
}

export type InvitationResult = { ok: true; path: string; expiresAt: string } | { ok: false; message: string }

/** 招待リンクを作る。返すのはリンクのパス（先頭 /）。ドメインは画面側で付ける */
export async function createInvitationAction(slug: string, days?: number): Promise<InvitationResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.kind !== 'member') return { ok: false, message: FAILURE_MESSAGES.unauthenticated }
  const groupId = await groupIdOf(slug)
  if (!groupId) return { ok: false, message: FAILURE_MESSAGES.group_not_found }
  const r = await createInvitation(groupId, days)
  if (!r.ok) return { ok: false, message: FAILURE_MESSAGES[r.reason] }
  return { ok: true, path: `/demo/community/invite/${r.value.token}`, expiresAt: r.value.expiresAt }
}
