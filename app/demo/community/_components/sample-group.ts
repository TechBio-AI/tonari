// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モード（kind: 'demo'）で見せる、見本の会「サンプルの会」。値はすべて架空で固定。
// 実在の団体名・人名・病名は使わない。DB は読まない。
// 閲覧モードで開けるのはこの会だけ（他の slug は 404）。

import type { GroupEvent, GroupLink } from '@/lib/portal/group-events'
import type { GroupComment, GroupMember, GroupPost, GroupSummary } from '@/lib/portal/tenancy'

/** 閲覧モードの画面の最上部に出す 1 行（会員向けページの見本と同じ文） */
export const DEMO_MODE_NOTICE = 'プロトタイプの閲覧モードです。実際の会員のデータは表示されません'

export const SAMPLE_GROUP: GroupSummary = {
  id: '00000000-0000-4000-8000-000000000000',
  slug: 'sample',
  name: 'サンプルの会',
}

const G = SAMPLE_GROUP.id

export const SAMPLE_MEMBERS: GroupMember[] = [
  { userId: 'sample-1', displayName: 'サンプル世話人', role: 'moderator', joinedAt: '2026-04-01T00:00:00Z' },
  { userId: 'sample-2', displayName: 'サンプル会員A', role: 'member', joinedAt: '2026-05-10T00:00:00Z' },
  { userId: 'sample-3', displayName: 'サンプル会員B', role: 'member', joinedAt: '2026-06-20T00:00:00Z' },
]

export const SAMPLE_POSTS: GroupPost[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    groupId: G,
    authorId: 'sample-1',
    authorDisplayName: 'サンプル世話人',
    kind: 'announcement',
    title: '【サンプル】オンライン交流会のお知らせ',
    body: 'これは見本です。会員向けページでは、このように交流会の日程や参加方法をお知らせします。',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    groupId: G,
    authorId: 'sample-1',
    authorDisplayName: 'サンプル世話人',
    kind: 'announcement',
    title: '【サンプル】会報の最新号を掲載しました',
    body: 'これは見本です。会報や活動報告を、会員の方だけが読める形で掲載します。',
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000201',
    groupId: G,
    authorId: 'sample-2',
    authorDisplayName: 'サンプル会員A',
    kind: 'thread',
    title: '【サンプル】はじめまして',
    body: 'これは見本です。掲示板では、会員どうしが話題ごとにスレッドを立てて話せます。',
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    groupId: G,
    authorId: 'sample-3',
    authorDisplayName: 'サンプル会員B',
    kind: 'thread',
    title: '【サンプル】交流会の感想',
    body: 'これは見本です。会員だけが読める場所なので、会の外には出ません。',
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-03T00:00:00Z',
  },
]

export const SAMPLE_COMMENTS: GroupComment[] = [
  {
    id: 'sample-c1',
    postId: '00000000-0000-4000-8000-000000000201',
    authorId: 'sample-3',
    authorDisplayName: 'サンプル会員B',
    body: 'これは見本のコメントです。',
    createdAt: '2026-09-05T01:00:00Z',
  },
  {
    id: 'sample-c2',
    postId: '00000000-0000-4000-8000-000000000101',
    authorId: 'sample-2',
    authorDisplayName: 'サンプル会員A',
    body: 'これは見本のコメントです。お知らせにもコメントを付けられます。',
    createdAt: '2026-09-01T02:00:00Z',
  },
]

export function samplePosts(kind: GroupPost['kind']): GroupPost[] {
  return SAMPLE_POSTS.filter((p) => p.kind === kind)
}

export function sampleComments(postId: string): GroupComment[] {
  return SAMPLE_COMMENTS.filter((c) => c.postId === postId)
}

// ---- 2026-10-04 に足した見本（会のホーム・行事・資料とリンク・会の約束・会員の状況・治験・研究の案内） -------------
// どれも架空。DB は読まない。画面は「（見本）」の印を付けて出す。


/** 見本の印（各見本の画面の見出しに付ける） */
export const SAMPLE_MARK = '（見本）'

export const SAMPLE_WELCOME =
  'これは見本です。会のホームの最初には、世話人が書いた歓迎のことばが出ます。はじめての方は、まず「会の約束」をお読みください。'

/** 見本の行事（これからの行事 2 件・過去の行事 1 件。日時は画面を開いた時点から決める） */
export function sampleEvents(now: Date = new Date()): GroupEvent[] {
  const day = 24 * 60 * 60 * 1000
  const at = (offsetDays: number, hour: number) => {
    const d = new Date(now.getTime() + offsetDays * day)
    d.setUTCHours(hour - 9, 0, 0, 0) // 日本時間の hour 時
    return d.toISOString()
  }
  return [
    {
      id: 'sample-event-1',
      groupId: SAMPLE_GROUP.id,
      title: '【サンプル】オンライン交流会',
      body: 'これは見本です。行事のページでは、日時・場所・内容と、参加の予定（参加する・たぶん・参加しない）を出します。',
      startsAt: at(14, 14),
      endsAt: at(14, 16),
      place: null,
      onlineUrl: null,
      isPublic: false,
    },
    {
      id: 'sample-event-2',
      groupId: SAMPLE_GROUP.id,
      title: '【サンプル】医療講演会',
      body: 'これは見本です。会場で開く行事の例です。',
      startsAt: at(40, 13),
      endsAt: null,
      place: '（見本の会場）',
      onlineUrl: null,
      isPublic: true,
    },
    {
      id: 'sample-event-0',
      groupId: SAMPLE_GROUP.id,
      title: '【サンプル】春の勉強会',
      body: 'これは見本です。終わった行事は「過去の行事」に並びます。',
      startsAt: at(-60, 10),
      endsAt: at(-60, 12),
      place: '（見本の会場）',
      onlineUrl: null,
      isPublic: false,
    },
  ]
}

/** 見本の資料・リンク（実在の公的な情報源だけ。会の資料は架空） */
export const SAMPLE_LINKS: GroupLink[] = [
  { id: 'sample-link-1', groupId: SAMPLE_GROUP.id, title: '難病情報センター', url: 'https://www.nanbyou.or.jp/', note: 'これは見本です。会の世話人が、役に立つ情報源のリンクを並べます。' },
  { id: 'sample-link-2', groupId: SAMPLE_GROUP.id, title: '小児慢性特定疾病情報センター', url: 'https://www.shouman.jp/', note: null },
]

export const SAMPLE_GROUP_RULES =
  'これは見本です。ここには、世話人がこの会だけの約束を書きます。\n例：書き込みは、ほかの会員が読んでうれしい言葉で。'

/**
 * 見本の治験・研究の案内（2 件）。病気・登録番号は架空と分かる形（実在の病気に架空の試験があるように見せないため）。
 * URL は登録先のトップページだけ（個々の試験のページではない）
 */
export const SAMPLE_NOTICE_DISEASE_NAME = '（見本の病気）'
export const SAMPLE_NOTICES = [
  {
    id: 'sample-notice-1',
    diseaseId: 'sample',
    registry: 'jrct',
    registryId: '（見本の登録番号 1）',
    registryUrl: 'https://jrct.niph.go.jp/',
    summary: 'これは見本です。成人を対象とした試験の例です。実施地域・対象の年代などを、中立な言葉で短くまとめます。',
    publishedAt: '2026-10-01T00:00:00Z',
    myStatus: null,
  },
  {
    id: 'sample-notice-2',
    diseaseId: 'sample',
    registry: 'ctgov',
    registryId: '（見本の登録番号 2）',
    registryUrl: 'https://clinicaltrials.gov/',
    summary: 'これは見本です。海外の登録情報（ClinicalTrials.gov）にある研究の例です。',
    publishedAt: '2026-09-20T00:00:00Z',
    myStatus: 'interested',
  },
] as const
