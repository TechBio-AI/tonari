/**
 * 患者会テナント（2026-09-26 ファウンダー指示）
 *
 * 患者会ごとに閉じた会員エリアの型とサーバー関数。画面はここを呼ぶだけにする。
 * 決定は docs/DECISIONS.md 2026-09-26「患者会は会ごとに閉じる」。
 * RLS の一覧は docs/patient_group_tenancy_rls.md、DB は
 * supabase/migrations/20260927_patient_group_tenancy.sql と 20260930_patient_group_tenancy_v2.sql、
 * アカウント削除は 20261002_delete_account.sql（docs/account-deletion.md）。
 *
 * ★ 行の境界（二重で閉じる）
 *   DB 側: RLS で「自分が有効な会員である会の行」だけが返る。
 *   ここ:  全関数でログイン中の本人（auth.uid()）を取り、無ければ止める。
 *          会の行を読む関数は、本人の有効な membership を先に確かめる。
 *   入会（memberships への書き込み）は DB 関数（rpc）経由だけ。この表へ直接 insert しない。
 *
 * ★ 個人情報（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）
 *   投稿・コメントの本文には会員が病状や本名を書きうる。外部 LLM API（Anthropic 等）へ送らない。
 *   ログにも本文を出さない（出すのはエラーの理由だけ）。
 *   会員一覧に出すのは member_profiles の表示名だけ（プロフィールは会をまたいで 1 つ）。
 *
 * ★ 公開面はここを使わない。患者会の公開ページは data/patient_groups/ の JSON を読む
 *   （lib/portal/patient-groups.ts）。
 */

import { createClient } from '@/lib/supabase/server'

// ---- 定数（DB 側の CHECK と同じ値にする。片方だけ変えない） -----------------------

export const GROUP_ROLES = ['member', 'moderator'] as const
export type GroupRole = (typeof GROUP_ROLES)[number]

export const POST_KINDS = ['announcement', 'thread'] as const
export type PostKind = (typeof POST_KINDS)[number]

export const JOIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number]

export const POST_TITLE_MAX = 200
export const POST_BODY_MAX = 10000
export const COMMENT_BODY_MAX = 5000
export const JOIN_MESSAGE_MAX = 1000
/** 紹介者の氏名の上限（DB の CHECK・member_profiles.full_name と同じ値） */
export const REFERRER_NAME_MAX = 100
/** 招待の有効日数。DB の既定値（14 日）と、ポリシーの上限（90 日）の内側 */
export const INVITATION_DAYS_DEFAULT = 14
export const INVITATION_DAYS_MAX = 90
/** DB 側の token は 64 文字の英数字。形の違うものは rpc へ送る前に落とす */
export const INVITATION_TOKEN_PATTERN = /^[0-9a-f]{32,128}$/

// ---- 型 -------------------------------------------------------------------

/** 会の公開情報（入会前でも読める列だけ） */
export interface GroupSummary {
  id: string
  slug: string
  name: string
}

export interface MyGroup extends GroupSummary {
  role: GroupRole
  joinedAt: string
}

export interface GroupMember {
  /**
   * 任命・解除の相手を指すため。会員一覧は 20261003 から世話人にしか返らないので実際は常に入るが、
   * v2 の DB（一般会員には NULL）に当たっても型が嘘にならないよう null を残す
   */
  userId: string | null
  /** プロフィール未作成なら null（画面は「名前未設定」と出す。推測で埋めない） */
  displayName: string | null
  role: GroupRole
  joinedAt: string
}

export interface GroupPost {
  id: string
  groupId: string
  /** アカウントが消された人は null（20261002。投稿は会に残り、名前だけが消える） */
  authorId: string | null
  /** 退会した人・プロフィール未作成の人・アカウントが消された人は null */
  authorDisplayName: string | null
  kind: PostKind
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface GroupComment {
  id: string
  postId: string
  /** アカウントが消された人は null */
  authorId: string | null
  authorDisplayName: string | null
  body: string
  createdAt: string
}

export interface JoinRequest {
  id: string
  groupId: string
  userId: string
  message: string
  status: JoinRequestStatus
  createdAt: string
}

/**
 * 世話人が見る申請中の 1 件（DB 関数 list_join_requests の戻り。その会の世話人にだけ返る）。
 * 審査用に申請者の氏名と紹介者の氏名を含む（v2）。user_id・メールは含まない。承認・却下は id で行う。
 * ★ fullName・referrerName は個人識別子。世話人の審査画面にだけ出す。会員一覧・書き出しに出さない。
 *   ログに出さない。外部 LLM API（Anthropic 等）へ送らない
 */
export interface PendingJoinRequest {
  id: string
  /** プロフィール未作成なら null（画面は「名前未設定」と出す） */
  displayName: string | null
  /** 申請者の氏名（member_profiles.full_name）。プロフィール未作成なら null */
  fullName: string | null
  /** 紹介者の氏名（任意）。書かれていなければ null */
  referrerName: string | null
  message: string
  createdAt: string
}

export interface Invitation {
  token: string
  groupId: string
  expiresAt: string
}

/** 失敗の理由。DB 関数の RAISE の MESSAGE と同じ語（mapDbError で読み替える） */
export const FAILURE_REASONS = [
  'unauthenticated',
  'forbidden',
  'not_member',
  'invalid_input',
  'invitation_not_found',
  'invitation_used',
  'invitation_expired',
  'already_member',
  'already_requested',
  'profile_required',
  'group_not_found',
  'request_not_pending',
  'last_moderator',
  'already_reported',
  'last_operator',
  'not_moderator',
  'failed',
] as const
export type FailureReason = (typeof FAILURE_REASONS)[number]

export type Result<T> = { ok: true; value: T } | { ok: false; reason: FailureReason; message?: string }

/** 画面に出す日本語。理由ごとに 1 つ */
export const FAILURE_MESSAGES: Record<FailureReason, string> = {
  unauthenticated: 'ログインしてください',
  forbidden: 'この操作はできません',
  not_member: 'この会の会員ではありません',
  invalid_input: '入力を確かめてください',
  invitation_not_found: '招待が見つかりません',
  invitation_used: 'この招待はすでに使われています',
  invitation_expired: 'この招待は期限が切れています',
  already_member: 'すでにこの会の会員です',
  already_requested: 'すでに入会を申請しています',
  profile_required: '先にプロフィールを登録してください',
  group_not_found: '会が見つかりません',
  request_not_pending: 'この申請はすでに処理されています',
  last_moderator: 'ほかに世話人がいないため、この操作はできません。先に別の会員を世話人にしてください',
  already_reported: 'すでに通報しています',
  last_operator: 'ほかに運営がいないため、削除できません',
  not_moderator: 'この方は世話人ではありません',
  failed: 'うまくいきませんでした。時間をおいてもう一度お試しください',
}

// ---- 入力検証（DB に触らない。テストはここだけを見る） ---------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(raw: unknown): raw is string {
  return typeof raw === 'string' && UUID_PATTERN.test(raw)
}

export function isPostKind(raw: unknown): raw is PostKind {
  return typeof raw === 'string' && (POST_KINDS as readonly string[]).includes(raw)
}

export function isInvitationToken(raw: unknown): raw is string {
  return typeof raw === 'string' && INVITATION_TOKEN_PATTERN.test(raw)
}

/** 前後の空白（全角も）を落とす */
function trimText(raw: string): string {
  return raw.replace(/^[\s　]+|[\s　]+$/g, '')
}

/** 文字数は見た目に合わせてコードポイントで数える。DB の char_length と同じ数え方 */
function codePointLength(s: string): number {
  return [...s].length
}

export type TextCheck = { ok: true; value: string } | { ok: false; message: string }

/** 必須の文章（題・本文・コメント） */
export function validateRequiredText(raw: unknown, max: number): TextCheck {
  if (typeof raw !== 'string') return { ok: false, message: '入力してください' }
  const value = trimText(raw)
  if (value === '') return { ok: false, message: '入力してください' }
  if (codePointLength(value) > max) return { ok: false, message: `${max} 文字以内で入力してください` }
  return { ok: true, value }
}

/** 入会申請のひとこと（空でよい） */
export function validateJoinMessage(raw: unknown): TextCheck {
  if (raw === undefined || raw === null) return { ok: true, value: '' }
  if (typeof raw !== 'string') return { ok: false, message: '文字で入力してください' }
  const value = trimText(raw)
  if (codePointLength(value) > JOIN_MESSAGE_MAX) {
    return { ok: false, message: `${JOIN_MESSAGE_MAX} 文字以内で入力してください` }
  }
  return { ok: true, value }
}

export interface PostInput {
  kind: PostKind
  title: string
  body: string
}

/** 紹介者の氏名（任意）。空・空白だけは null（書かれていない）に、長すぎるものは落とす */
export function validateReferrerName(
  raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, message: '文字で入力してください' }
  const value = trimText(raw)
  if (value === '') return { ok: true, value: null }
  if (codePointLength(value) > REFERRER_NAME_MAX) {
    return { ok: false, message: `${REFERRER_NAME_MAX} 文字以内で入力してください` }
  }
  return { ok: true, value }
}

export type PostCheck =
  | { ok: true; value: PostInput }
  | { ok: false; errors: { field: keyof PostInput; message: string }[] }

export function validatePostInput(raw: unknown): PostCheck {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: { field: keyof PostInput; message: string }[] = []
  if (!isPostKind(o.kind)) errors.push({ field: 'kind', message: '種類を選んでください' })
  const title = validateRequiredText(o.title, POST_TITLE_MAX)
  if (!title.ok) errors.push({ field: 'title', message: title.message })
  const body = validateRequiredText(o.body, POST_BODY_MAX)
  if (!body.ok) errors.push({ field: 'body', message: body.message })
  if (errors.length > 0 || !title.ok || !body.ok) return { ok: false, errors }
  return { ok: true, value: { kind: o.kind as PostKind, title: title.value, body: body.value } }
}

/** 招待の有効日数。整数で 1〜90 */
export function validateInvitationDays(raw: unknown): number | null {
  if (raw === undefined) return INVITATION_DAYS_DEFAULT
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null
  if (raw < 1 || raw > INVITATION_DAYS_MAX) return null
  return raw
}

/**
 * DB のエラー文 → 理由。関数の RAISE は MESSAGE に理由の語をそのまま入れている。
 * 知らない文は 'failed' にする（DB の文面を画面にそのまま出さない）
 */
export function mapDbError(message: string | undefined | null): FailureReason {
  if (!message) return 'failed'
  const hit = FAILURE_REASONS.find((r) => r !== 'failed' && message === r)
  if (hit) return hit
  // RLS の with check に触れたとき（PostgREST の 42501 の文面）
  if (/row-level security|permission denied/i.test(message)) return 'forbidden'
  return 'failed'
}

// ---- サーバー関数（Server Component / Route Handler / Server Action からのみ） ------

type Supabase = ReturnType<typeof createClient>

function fail<T>(reason: FailureReason): Result<T> {
  return { ok: false, reason, message: FAILURE_MESSAGES[reason] }
}

/** 理由だけ残す。行の中身（本文・名前）はログに出さない */
function logFailure(where: string, message: string | undefined) {
  console.error(`患者会: ${where} に失敗しました:`, message)
}

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** 本人の、その会での有効な役割。会員でなければ null */
async function myRole(supabase: Supabase, userId: string, groupId: string): Promise<GroupRole | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .is('left_at', null)
    .maybeSingle()
  if (error || !data) return null
  return (data as { role: GroupRole }).role
}

/**
 * 書き手の表示名の対応表（author_id → 表示名）。会員でなければ空。
 * v2 から会員一覧の user_id は世話人にしか返らないので、書き手だけの対応表（list_group_author_names）を使う。
 * 退会した書き手は入らない（画面は「退会した会員」と出す）
 */
async function memberNames(supabase: Supabase, groupId: string): Promise<Map<string, string | null>> {
  const { data, error } = await supabase.rpc('list_group_author_names', { p_group_id: groupId })
  const names = new Map<string, string | null>()
  if (error || !data) return names
  for (const row of data as { author_id: string; display_name: string | null }[]) {
    names.set(row.author_id, row.display_name)
  }
  return names
}

/** 入会前の人が会を選ぶための一覧（id / slug / name だけ） */
export async function listGroups(): Promise<Result<GroupSummary[]>> {
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { data, error } = await supabase.from('patient_groups').select('id, slug, name').order('name')
  if (error) {
    logFailure('会の一覧', error.message)
    return fail('failed')
  }
  return { ok: true, value: (data ?? []) as GroupSummary[] }
}

/** 本人が有効な会員である会 */
export async function myGroups(): Promise<Result<MyGroup[]>> {
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { data, error } = await supabase
    .from('memberships')
    .select('role, joined_at, patient_groups ( id, slug, name )')
    .eq('user_id', userId)
    .is('left_at', null)
    .order('joined_at')
  if (error) {
    logFailure('所属する会の取得', error.message)
    return fail('failed')
  }
  const rows = (data ?? []) as unknown as {
    role: GroupRole
    joined_at: string
    patient_groups: GroupSummary | null
  }[]
  return {
    ok: true,
    value: rows
      .filter((r) => r.patient_groups)
      .map((r) => ({ ...(r.patient_groups as GroupSummary), role: r.role, joinedAt: r.joined_at })),
  }
}

/**
 * 会員一覧（user_id・表示名・役割・入会日）。その会の世話人のみ（20261003。DB 関数も世話人以外は forbidden）。
 * 一般会員は forbidden、会員でない人は not_member。掲示板の書き手の表示名はこれではなく memberNames() が引く
 */
export async function listMembers(groupId: string): Promise<Result<GroupMember[]>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  const role = await myRole(supabase, userId, groupId)
  if (!role) return fail('not_member')
  if (role !== 'moderator') return fail('forbidden')

  const { data, error } = await supabase.rpc('list_group_members', { p_group_id: groupId })
  if (error) return fail(mapDbError(error.message))
  return {
    ok: true,
    value: (data as { user_id: string | null; display_name: string | null; role: GroupRole; joined_at: string }[]).map(
      (r) => ({ userId: r.user_id, displayName: r.display_name, role: r.role, joinedAt: r.joined_at })
    ),
  }
}

/** 招待を受ける。成功すると入った会の id */
export async function acceptInvitation(token: string): Promise<Result<{ groupId: string }>> {
  if (!isInvitationToken(token)) return fail('invitation_not_found')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: { groupId: data as string } }
}

/** 入会を申請する。成功すると申請の id */
export async function requestJoin(
  groupId: string,
  message?: string,
  referrerName?: string
): Promise<Result<{ requestId: string }>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const msg = validateJoinMessage(message)
  if (!msg.ok) return fail('invalid_input')
  const referrer = validateReferrerName(referrerName)
  if (!referrer.ok) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { data, error } = await supabase.rpc('request_join', {
    p_group_id: groupId,
    p_message: msg.value,
    p_referrer_name: referrer.value,
  })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: { requestId: data as string } }
}

/** 本人の、その会への申請（「申請中」の表示用）。無ければ null */
export async function myJoinRequest(groupId: string): Promise<Result<JoinRequest | null>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { data, error } = await supabase
    .from('join_requests')
    .select('id, group_id, user_id, message, status, created_at')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    logFailure('申請の取得', error.message)
    return fail('failed')
  }
  return { ok: true, value: data ? toJoinRequest(data as JoinRequestRow) : null }
}

/** お知らせ・スレッドの一覧（新しい順）。会員のみ */
export async function listPosts(groupId: string, kind: PostKind): Promise<Result<GroupPost[]>> {
  if (!isUuid(groupId) || !isPostKind(kind)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  if (!(await myRole(supabase, userId, groupId))) return fail('not_member')

  const { data, error } = await supabase
    .from('group_posts')
    .select('id, group_id, author_id, kind, title, body, created_at, updated_at')
    .eq('group_id', groupId)
    .eq('kind', kind)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) {
    logFailure('投稿の一覧', error.message)
    return fail('failed')
  }
  const names = await memberNames(supabase, groupId)
  return {
    ok: true,
    value: (data as PostRow[]).map((r) => toPost(r, names)),
  }
}

/** コメントの一覧（古い順）。投稿の会の会員のみ */
export async function listComments(postId: string): Promise<Result<GroupComment[]>> {
  if (!isUuid(postId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const groupId = await groupIdOfPost(supabase, postId)
  if (!groupId || !(await myRole(supabase, userId, groupId))) return fail('not_member')

  const { data, error } = await supabase
    .from('group_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at')
  if (error) {
    logFailure('コメントの一覧', error.message)
    return fail('failed')
  }
  const names = await memberNames(supabase, groupId)
  return {
    ok: true,
    value: (data as CommentRow[]).map((r) => ({
      id: r.id,
      postId: r.post_id,
      authorId: r.author_id,
      authorDisplayName: authorName(names, r.author_id),
      body: r.body,
      createdAt: r.created_at,
    })),
  }
}

/** 投稿する。お知らせはモデレーターのみ、スレッドは会員以上 */
export async function createPost(groupId: string, raw: unknown): Promise<Result<{ postId: string }>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const input = validatePostInput(raw)
  if (!input.ok) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const role = await myRole(supabase, userId, groupId)
  if (!role) return fail('not_member')
  if (input.value.kind === 'announcement' && role !== 'moderator') return fail('forbidden')

  const { data, error } = await supabase
    .from('group_posts')
    .insert({ group_id: groupId, author_id: userId, ...input.value })
    .select('id')
    .single()
  if (error || !data) {
    logFailure('投稿', error?.message)
    return fail(mapDbError(error?.message))
  }
  return { ok: true, value: { postId: (data as { id: string }).id } }
}

/** コメントする。投稿の会の会員のみ */
export async function createComment(postId: string, rawBody: unknown): Promise<Result<{ commentId: string }>> {
  if (!isUuid(postId)) return fail('invalid_input')
  const body = validateRequiredText(rawBody, COMMENT_BODY_MAX)
  if (!body.ok) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const groupId = await groupIdOfPost(supabase, postId)
  if (!groupId || !(await myRole(supabase, userId, groupId))) return fail('not_member')

  const { data, error } = await supabase
    .from('group_comments')
    .insert({ post_id: postId, author_id: userId, body: body.value })
    .select('id')
    .single()
  if (error || !data) {
    logFailure('コメント', error?.message)
    return fail(mapDbError(error?.message))
  }
  return { ok: true, value: { commentId: (data as { id: string }).id } }
}

/**
 * 退会する（本人の membership に left_at を立てる。行は消さない）。
 * 投稿・コメントは会に残る。最後のモデレーターは退会できない（last_moderator）
 */
export async function leaveGroup(groupId: string): Promise<Result<null>> {
  return callVoidRpc('leave_group', { p_group_id: groupId }, groupId)
}

/**
 * アカウントを削除する（DB 関数 delete_my_account。本人の会員情報を全部消す）。
 * 消えるもの: プロフィール・同意の記録・案内を受け取る病気・会員資格（退会済みを含む）・入会申請・発行した招待・旧 profiles。
 * 残るもの: 投稿・コメント（本文は会に残り、名前だけが消える）と、ログインのメール（auth.users）。
 * auth.users はファウンダーが Studio で消す（docs/account-deletion.md）。
 * どこかの会の最後の世話人なら last_moderator で止まり、何も消えない。
 * 呼んだ後のサインアウトは呼び出し側（画面の Server Action）で行う
 */
export async function deleteMyAccount(): Promise<Result<null>> {
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    logFailure('アカウントの削除', error.message)
    return fail(mapDbError(error.message))
  }
  return { ok: true, value: null }
}

/** 投稿を消す（論理削除）。書いた本人かモデレーター */
export async function deletePost(postId: string): Promise<Result<null>> {
  return callVoidRpc('delete_group_post', { p_post_id: postId }, postId)
}

/** コメントを消す（論理削除）。書いた本人かモデレーター */
export async function deleteComment(commentId: string): Promise<Result<null>> {
  return callVoidRpc('delete_group_comment', { p_comment_id: commentId }, commentId)
}

// ---- モデレーター用 -----------------------------------------------------------

/** 招待を作る。モデレーターのみ */
export async function createInvitation(groupId: string, days?: number): Promise<Result<Invitation>> {
  const validDays = validateInvitationDays(days)
  if (!isUuid(groupId) || validDays === null) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  if ((await myRole(supabase, userId, groupId)) !== 'moderator') return fail('forbidden')

  const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('invitations')
    .insert({ group_id: groupId, created_by: userId, expires_at: expiresAt })
    .select('token, group_id, expires_at')
    .single()
  if (error || !data) {
    logFailure('招待の作成', error?.message)
    return fail(mapDbError(error?.message))
  }
  const row = data as { token: string; group_id: string; expires_at: string }
  return { ok: true, value: { token: row.token, groupId: row.group_id, expiresAt: row.expires_at } }
}

/**
 * 申請中の一覧（申請 id・表示名・申請者の氏名・紹介者の氏名・ひとこと・申請日）。モデレーターのみ。
 * 氏名は審査用（v2）。user_id・メールは返らない。氏名をログに出さない
 */
export async function listPendingJoinRequests(groupId: string): Promise<Result<PendingJoinRequest[]>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  if ((await myRole(supabase, userId, groupId)) !== 'moderator') return fail('forbidden')

  const { data, error } = await supabase.rpc('list_join_requests', { p_group_id: groupId })
  if (error) return fail(mapDbError(error.message))
  return {
    ok: true,
    value: (
      data as {
        id: string
        display_name: string | null
        full_name: string | null
        referrer_name: string | null
        message: string
        created_at: string
      }[]
    ).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      fullName: r.full_name,
      referrerName: r.referrer_name,
      message: r.message,
      createdAt: r.created_at,
    })),
  }
}

/**
 * 会員を世話人（モデレーター）に任命する。任命できるのはその会の世話人だけ。
 * 相手の user_id は listMembers() で得る。相手が有効な会員でなければ not_member
 */
export async function appointModerator(groupId: string, targetUserId: string): Promise<Result<null>> {
  return callRoleRpc('appoint_moderator', groupId, targetUserId)
}

/**
 * 世話人を解除する（会員に戻す）。解除できるのはその会の世話人だけ。
 * 最後の 1 人は解除できない（last_moderator）。ほかに世話人がいれば自分自身も解除できる
 */
export async function dismissModerator(groupId: string, targetUserId: string): Promise<Result<null>> {
  return callRoleRpc('dismiss_moderator', groupId, targetUserId)
}

/** 申請を承認する（会員になる）。モデレーターの確認は DB 関数の中で行う */
export async function approve(requestId: string): Promise<Result<null>> {
  return callVoidRpc('approve_join_request', { p_request_id: requestId }, requestId)
}

/** 申請を却下する。モデレーターの確認は DB 関数の中で行う */
export async function reject(requestId: string): Promise<Result<null>> {
  return callVoidRpc('reject_join_request', { p_request_id: requestId }, requestId)
}

/**
 * 退去用の書き出し。会の投稿・コメント・会員（表示名のみ）を JSON で返す。モデレーターのみ。
 * user_id・本名は含まれない（DB 関数 export_group がそう作る）
 */
export async function exportGroup(groupId: string): Promise<Result<unknown>> {
  if (!isUuid(groupId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  if ((await myRole(supabase, userId, groupId)) !== 'moderator') return fail('forbidden')

  const { data, error } = await supabase.rpc('export_group', { p_group_id: groupId })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: data }
}

// ---- 内部 -------------------------------------------------------------------

interface PostRow {
  id: string
  group_id: string
  author_id: string | null
  kind: PostKind
  title: string
  body: string
  created_at: string
  updated_at: string
}

interface CommentRow {
  id: string
  post_id: string
  author_id: string | null
  body: string
  created_at: string
}

interface JoinRequestRow {
  id: string
  group_id: string
  user_id: string
  message: string
  status: JoinRequestStatus
  created_at: string
}

/** 書き手の表示名。アカウントが消された書き手（author_id が null）は null */
function authorName(names: Map<string, string | null>, authorId: string | null): string | null {
  return authorId === null ? null : (names.get(authorId) ?? null)
}

function toPost(r: PostRow, names: Map<string, string | null>): GroupPost {
  return {
    id: r.id,
    groupId: r.group_id,
    authorId: r.author_id,
    authorDisplayName: authorName(names, r.author_id),
    kind: r.kind,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toJoinRequest(r: JoinRequestRow): JoinRequest {
  return {
    id: r.id,
    groupId: r.group_id,
    userId: r.user_id,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }
}

/** 投稿の会の id。見えない（会員でない・削除済み）なら null */
async function groupIdOfPost(supabase: Supabase, postId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_posts')
    .select('group_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  return (data as { group_id: string }).group_id
}

/** 任命・解除。世話人かどうかは呼び出し側でも確かめ、DB 関数の中（auth.uid()）でも確かめる */
async function callRoleRpc(
  fn: 'appoint_moderator' | 'dismiss_moderator',
  groupId: string,
  targetUserId: string
): Promise<Result<null>> {
  if (!isUuid(groupId) || !isUuid(targetUserId)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')
  if ((await myRole(supabase, userId, groupId)) !== 'moderator') return fail('forbidden')

  const { error } = await supabase.rpc(fn, { p_group_id: groupId, p_user_id: targetUserId })
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: null }
}

/** 戻り値の無い DB 関数を呼ぶ。本人・役割の確認は DB 関数の中（auth.uid()）でも行う */
async function callVoidRpc(fn: string, args: Record<string, string>, id: string): Promise<Result<null>> {
  if (!isUuid(id)) return fail('invalid_input')
  const supabase = createClient()
  const userId = await currentUserId(supabase)
  if (!userId) return fail('unauthenticated')

  const { error } = await supabase.rpc(fn, args)
  if (error) return fail(mapDbError(error.message))
  return { ok: true, value: null }
}
