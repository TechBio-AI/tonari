/**
 * 会員エリアの追加機能の読み書き（20261013 community_features・20261014 content_reports。2026-10-02 ファウンダー指示）
 *
 *   - 投稿の分類（category）・固定（pinned。世話人だけ。pin_group_post）・公開（is_public。お知らせだけ。世話人だけ）
 *   - 会の設定 group_settings（welcome_text・rules_text。rules_text は世話人が直接書く）
 *   - 通報（report_group_content・list_group_reports・mark_report_handled）。通報した人はどこにも出さない
 *   - 自分の投稿・コメントの一覧（マイページ）
 *
 * 基本の投稿の読み書き・本人確認・失敗の読み替えは lib/portal/tenancy.ts のものを使う（ここは足りない列と関数だけ）。
 * 行の境界は DB（RLS・SECURITY DEFINER 関数）が決める。ここでも本人の役割を先に確かめる（二重）。
 * 本文・理由・名前はログに出さない（出すのは失敗の理由だけ）。外部 LLM API へ送らない。
 */

import {
  FAILURE_MESSAGES,
  isUuid,
  listGroups,
  listPosts,
  mapDbError,
  myGroups,
  validatePostInput,
  validateRequiredText,
  type FailureReason,
  type GroupPost,
  type PostKind,
  type Result,
} from '@/lib/portal/tenancy'
import { PUBLIC_NOTICE } from '@/lib/portal/group-events'
import { createClient } from '@/lib/supabase/server'

// ---- 分類（DB の CHECK と同じ値・同じ並び） ------------------------------------------

export const POST_CATEGORIES = ['daily', 'system', 'treatment', 'family', 'other'] as const
export type PostCategory = (typeof POST_CATEGORIES)[number]
export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  daily: '日常の工夫',
  system: '制度と手続き',
  treatment: '通院と治療の経験',
  family: '家族のこと',
  other: 'その他',
}
export function isPostCategory(raw: unknown): raw is PostCategory {
  return typeof raw === 'string' && (POST_CATEGORIES as readonly string[]).includes(raw)
}

/** 行事と同じ注意文（lib/portal/group-events.ts の PUBLIC_NOTICE をそのまま使う） */
export const PUBLIC_POST_NOTICE = PUBLIC_NOTICE

export const RULES_TEXT_MAX = 4000
export const REPORT_REASON_MAX = 200

export interface GroupPostWithMeta extends GroupPost {
  category: PostCategory
  pinned: boolean
  isPublic: boolean
}

export interface GroupSettings {
  welcomeText: string | null
  rulesText: string | null
}

export interface GroupReport {
  id: string
  postId: string | null
  commentId: string | null
  reason: string
  createdAt: string
  handledAt: string | null
  /** 対象を開くパス（会の中の相対。/announcements/<id> か /threads/<id>）。対象が見つからない（削除済み）なら null */
  targetPath: string | null
}

export interface MyContentItem {
  kind: 'post' | 'comment'
  groupSlug: string
  groupName: string
  /** 投稿のページ（会の中の相対） */
  path: string
  /** 投稿は題、コメントは本文の書き出し */
  text: string
  createdAt: string
}

function fail<T>(reason: FailureReason): Result<T> {
  return { ok: false, reason, message: FAILURE_MESSAGES[reason] }
}

function logFailure(where: string, message: string | undefined) {
  console.error(`患者会: ${where} に失敗しました:`, message)
}

async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/** 本人の、その会での役割（有効な会員でなければ null） */
async function roleIn(groupId: string): Promise<'member' | 'moderator' | null> {
  const r = await myGroups()
  if (!r.ok) return null
  return r.value.find((g) => g.id === groupId)?.role ?? null
}

const postPath = (kind: PostKind, id: string) => (kind === 'announcement' ? `/announcements/${id}` : `/threads/${id}`)

// ---- 投稿（分類・固定・公開） ---------------------------------------------------------

/**
 * 投稿の一覧に、分類・固定・公開を付けて返す（tenancy.ts の listPosts に足りない列を、同じ会・同じ種類で読み足す）。
 * 並びは固定を先に、その中は新しい順
 */
export async function listPostsWithMeta(groupId: string, kind: PostKind): Promise<Result<GroupPostWithMeta[]>> {
  const base = await listPosts(groupId, kind)
  if (!base.ok) return base
  if (base.value.length === 0) return { ok: true, value: [] }

  // 分類・固定・公開が読めなかったときは、投稿そのものは出す（分類は「その他」、固定・公開は無しとして扱う）
  let rows: { id: string; category: string; pinned: boolean; is_public: boolean }[] = []
  try {
    const { data, error } = await createClient()
      .from('group_posts')
      .select('id, category, pinned, is_public')
      .eq('group_id', groupId)
      .eq('kind', kind)
      .is('deleted_at', null)
    if (error) logFailure('投稿の分類の取得', error.message)
    else rows = (data ?? []) as typeof rows
  } catch (err) {
    logFailure('投稿の分類の取得', err instanceof Error ? err.message : 'unknown')
  }
  const meta = new Map(rows.map((r) => [r.id, r]))
  const value = base.value.map((p) => {
    const m = meta.get(p.id)
    return {
      ...p,
      category: isPostCategory(m?.category) ? m!.category : 'other',
      pinned: m?.pinned === true,
      isPublic: m?.is_public === true,
    } as GroupPostWithMeta
  })
  // 固定を先に（それぞれの中は listPosts の並び＝新しい順のまま）
  value.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  return { ok: true, value }
}

export interface PostWithMetaInput {
  kind: PostKind
  title: string
  body: string
  category: PostCategory
  isPublic: boolean
}

/**
 * 投稿する（分類と公開を付けて）。お知らせ・公開は世話人だけ。公開はお知らせだけ（DB の CHECK とトリガーも止める）。
 * tenancy.ts の createPost と同じ確かめ方に、分類・公開を足したもの
 */
export async function createPostWithMeta(groupId: string, raw: unknown): Promise<Result<{ postId: string }>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const input = validatePostInput(raw)
  if (!input.ok) return fail('invalid_input')
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const category = o.category === undefined || o.category === '' ? 'other' : o.category
  if (!isPostCategory(category)) return fail('invalid_input')
  const isPublic = o.isPublic === true
  if (isPublic && input.value.kind !== 'announcement') return fail('invalid_input')

  const userId = await sessionUserId()
  if (!userId) return fail('unauthenticated')
  const role = await roleIn(groupId)
  if (!role) return fail('not_member')
  if ((input.value.kind === 'announcement' || isPublic) && role !== 'moderator') return fail('forbidden')

  const { data, error } = await createClient()
    .from('group_posts')
    .insert({ group_id: groupId, author_id: userId, ...input.value, category, is_public: isPublic })
    .select('id')
    .single()
  if (error || !data) {
    logFailure('投稿', error?.message)
    return fail(mapDbError(error?.message))
  }
  return { ok: true, value: { postId: (data as { id: string }).id } }
}

/** 投稿を固定する／外す（世話人だけ。DB 関数 pin_group_post が確かめる） */
export async function pinPost(postId: string, pinned: boolean): Promise<Result<null>> {
  if (!isUuid(postId) || typeof pinned !== 'boolean') return fail('invalid_input')
  if (!(await sessionUserId())) return fail('unauthenticated')
  const { error } = await createClient().rpc('pin_group_post', { p_post_id: postId, p_pinned: pinned })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: null }
}

/** 投稿 1 件の分類・固定・公開（投稿のページ用）。読めなければ null */
export async function postMeta(postId: string): Promise<{ category: PostCategory; pinned: boolean; isPublic: boolean } | null> {
  if (!isUuid(postId)) return null
  let data: unknown = null
  try {
    const res = await createClient()
      .from('group_posts')
      .select('category, pinned, is_public')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle()
    if (res.error) return null
    data = res.data
  } catch {
    return null
  }
  if (!data) return null
  const r = data as { category: string; pinned: boolean; is_public: boolean }
  return { category: isPostCategory(r.category) ? r.category : 'other', pinned: r.pinned === true, isPublic: r.is_public === true }
}

// ---- 会の設定（歓迎文・会の約束） ------------------------------------------------------

/** 会の設定。行が無ければ両方 null。読めなければ null */
export async function getGroupSettings(groupId: string): Promise<GroupSettings | null> {
  if (!isUuid(groupId)) return null
  let data: unknown = null
  try {
    const res = await createClient()
      .from('group_settings')
      .select('welcome_text, rules_text')
      .eq('group_id', groupId)
      .maybeSingle()
    if (res.error) {
      logFailure('会の設定の取得', res.error.message)
      return null
    }
    data = res.data
  } catch (err) {
    logFailure('会の設定の取得', err instanceof Error ? err.message : 'unknown')
    return null
  }
  const r = (data ?? {}) as { welcome_text?: string | null; rules_text?: string | null }
  return { welcomeText: r.welcome_text ?? null, rulesText: r.rules_text ?? null }
}

/**
 * 会の約束（rules_text）を書く。世話人だけ。空なら消す（NULL。DB の CHECK は空文字を許さない）。
 * group_settings に直接書く。行があれば rules_text だけを update、無ければ insert
 * （upsert は衝突時に group_id も書き直そうとし、group_id の UPDATE 権限が無いため使わない）
 */
export async function saveRulesText(groupId: string, raw: unknown): Promise<Result<null>> {
  if (!isUuid(groupId) || typeof raw !== 'string') return fail('invalid_input')
  const trimmed = raw.replace(/^[\s　]+|[\s　]+$/g, '')
  let value: string | null = null
  if (trimmed !== '') {
    const check = validateRequiredText(trimmed, RULES_TEXT_MAX)
    if (!check.ok) return fail('invalid_input')
    value = check.value
  }
  if (!(await sessionUserId())) return fail('unauthenticated')
  if ((await roleIn(groupId)) !== 'moderator') return fail('forbidden')

  const supabase = createClient()
  const existing = await supabase.from('group_settings').select('group_id').eq('group_id', groupId).maybeSingle()
  if (existing.error) {
    logFailure('会の設定の取得', existing.error.message)
    return fail('failed')
  }
  const { error } = existing.data
    ? await supabase.from('group_settings').update({ rules_text: value }).eq('group_id', groupId)
    : await supabase.from('group_settings').insert({ group_id: groupId, rules_text: value })
  if (error) {
    logFailure('会の約束の保存', error.message)
    return fail(mapDbError(error.message))
  }
  return { ok: true, value: null }
}

// ---- 通報 -------------------------------------------------------------------------

export type ReportTarget = { postId: string } | { commentId: string }

/** 通報する。理由は 200 文字まで（空でもよい）。同じ対象への二度目は already_reported */
export async function reportContent(target: ReportTarget, rawReason: unknown): Promise<Result<null>> {
  const postId = 'postId' in target ? target.postId : null
  const commentId = 'commentId' in target ? target.commentId : null
  if ((postId && !isUuid(postId)) || (commentId && !isUuid(commentId))) return fail('invalid_input')
  const reason = typeof rawReason === 'string' ? rawReason.replace(/^[\s　]+|[\s　]+$/g, '') : ''
  if ([...reason].length > REPORT_REASON_MAX) return fail('invalid_input')
  if (!(await sessionUserId())) return fail('unauthenticated')
  const { error } = await createClient().rpc('report_group_content', {
    p_post_id: postId,
    p_comment_id: commentId,
    p_reason: reason,
  })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: null }
}

/** 通報の一覧（世話人だけ）。通報した人・対応した人は DB 関数が返さない。対象へのパスを付ける */
export async function listReports(groupId: string): Promise<Result<GroupReport[]>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  if (!(await sessionUserId())) return fail('unauthenticated')
  if ((await roleIn(groupId)) !== 'moderator') return fail('forbidden')

  const supabase = createClient()
  const { data, error } = await supabase.rpc('list_group_reports', { p_group_id: groupId })
  if (error) return fail(mapDbError(error.message))
  const rows = (data ?? []) as {
    id: string
    post_id: string | null
    comment_id: string | null
    reason: string
    created_at: string
    handled_at: string | null
  }[]

  // 対象へのパス。コメントは親の投稿へ。見えない（削除済み）ものは null
  const commentIds = rows.map((r) => r.comment_id).filter((x): x is string => !!x)
  const commentPost = new Map<string, string>()
  if (commentIds.length > 0) {
    const c = await supabase.from('group_comments').select('id, post_id').in('id', commentIds).is('deleted_at', null)
    for (const r of (c.data ?? []) as { id: string; post_id: string }[]) commentPost.set(r.id, r.post_id)
  }
  const postIds = [...new Set([...rows.map((r) => r.post_id).filter((x): x is string => !!x), ...commentPost.values()])]
  const postKind = new Map<string, PostKind>()
  if (postIds.length > 0) {
    const p = await supabase.from('group_posts').select('id, kind').in('id', postIds).eq('group_id', groupId).is('deleted_at', null)
    for (const r of (p.data ?? []) as { id: string; kind: PostKind }[]) postKind.set(r.id, r.kind)
  }
  const pathOf = (r: (typeof rows)[number]): string | null => {
    const pid = r.post_id ?? (r.comment_id ? commentPost.get(r.comment_id) : undefined)
    const kind = pid ? postKind.get(pid) : undefined
    return pid && kind ? postPath(kind, pid) : null
  }

  return {
    ok: true,
    value: rows.map((r) => ({
      id: r.id,
      postId: r.post_id,
      commentId: r.comment_id,
      reason: r.reason,
      createdAt: r.created_at,
      handledAt: r.handled_at,
      targetPath: pathOf(r),
    })),
  }
}

/** 通報を対応済みにする（世話人だけ。DB 関数が確かめる。対応済みに呼んでも何も変えない） */
export async function markReportHandled(reportId: string): Promise<Result<null>> {
  if (!isUuid(reportId)) return fail('invalid_input')
  if (!(await sessionUserId())) return fail('unauthenticated')
  const { error } = await createClient().rpc('mark_report_handled', { p_report_id: reportId })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: null }
}

// ---- 自分の投稿・コメント（マイページ） ------------------------------------------------

const EXCERPT = 40

/**
 * 自分が書いた投稿・コメント（消していないもの・いま在籍している会の分。RLS で見える範囲）。新しい順。
 * 読めなければ null
 */
export async function listMyContents(): Promise<MyContentItem[] | null> {
  const userId = await sessionUserId()
  if (!userId) return null
  const groups = await listGroups()
  if (!groups.ok) return null
  const groupOf = new Map(groups.value.map((g) => [g.id, g]))
  const supabase = createClient()

  const posts = await supabase
    .from('group_posts')
    .select('id, group_id, kind, title, created_at')
    .eq('author_id', userId)
    .is('deleted_at', null)
  const comments = await supabase
    .from('group_comments')
    .select('id, post_id, body, created_at')
    .eq('author_id', userId)
    .is('deleted_at', null)
  if (posts.error || comments.error) {
    logFailure('自分の投稿の取得', posts.error?.message ?? comments.error?.message)
    return null
  }

  const items: MyContentItem[] = []
  for (const p of (posts.data ?? []) as { id: string; group_id: string; kind: PostKind; title: string; created_at: string }[]) {
    const g = groupOf.get(p.group_id)
    if (!g) continue
    items.push({ kind: 'post', groupSlug: g.slug, groupName: g.name, path: postPath(p.kind, p.id), text: p.title, createdAt: p.created_at })
  }

  const commentRows = (comments.data ?? []) as { id: string; post_id: string; body: string; created_at: string }[]
  const parentIds = [...new Set(commentRows.map((c) => c.post_id))]
  const parents = new Map<string, { group_id: string; kind: PostKind }>()
  if (parentIds.length > 0) {
    const r = await supabase.from('group_posts').select('id, group_id, kind').in('id', parentIds).is('deleted_at', null)
    for (const p of (r.data ?? []) as { id: string; group_id: string; kind: PostKind }[]) parents.set(p.id, p)
  }
  for (const c of commentRows) {
    const parent = parents.get(c.post_id)
    const g = parent ? groupOf.get(parent.group_id) : undefined
    if (!parent || !g) continue
    const chars = [...c.body]
    items.push({
      kind: 'comment',
      groupSlug: g.slug,
      groupName: g.name,
      path: postPath(parent.kind, c.post_id),
      text: chars.length > EXCERPT ? `${chars.slice(0, EXCERPT).join('')}…` : c.body,
      createdAt: c.created_at,
    })
  }
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  return items
}
