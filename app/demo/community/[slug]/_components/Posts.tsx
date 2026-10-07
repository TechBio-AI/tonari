// 投稿（お知らせ・スレッド）の一覧と、1 件のページ（本文＋コメント＋コメント欄）。見せ方だけ。
// 本文は会員が書いたもの。そのまま文字として出す（HTML として解釈しない）。

import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'

import { COMMENT_BODY_MAX, type GroupComment, type GroupPost } from '@/lib/portal/tenancy'

import { NO_DISPLAY_NAME, formatDate } from './GroupShell'

export const inputClass =
  'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200'
export const buttonClass =
  'rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-60'

export function PostList({
  posts,
  hrefOf,
  empty,
  badgesOf,
}: {
  posts: GroupPost[]
  hrefOf: (p: GroupPost) => string
  empty: string
  /** 題の前に付ける小さな印（分類・固定・公開など）。無ければ付けない */
  badgesOf?: (p: GroupPost) => string[]
}) {
  if (posts.length === 0) {
    return <p className="mt-5 rounded-2xl bg-white border border-stone-200 p-6 text-base text-stone-600">{empty}</p>
  }
  return (
    <ul className="mt-5 space-y-4">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href={hrefOf(p)} className="block rounded-2xl bg-white border border-stone-200 p-6 hover:border-orange-300">
            {(badgesOf?.(p) ?? []).length > 0 && (
              <p className="mb-2 flex flex-wrap gap-2" data-badges>
                {badgesOf!(p).map((b) => (
                  <span key={b} className="rounded-lg bg-stone-100 px-2 py-0.5 text-sm text-stone-700">
                    {b}
                  </span>
                ))}
              </p>
            )}
            <p className="text-lg font-semibold text-stone-800">{p.title}</p>
            <p className="mt-2 text-base text-stone-600 leading-relaxed line-clamp-2 whitespace-pre-line">{p.body}</p>
            <p className="mt-3 text-sm text-stone-500">
              {p.authorDisplayName ?? NO_DISPLAY_NAME}・{formatDate(p.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * 削除のボタン（確認つき）。<details> を開くと「削除する」の確定ボタンが出る（JavaScript が無くても動く）。
 * 見せるかどうかは呼ぶ側が決める（本人の分・世話人は全部）。消せるかどうかの最終判断は DB 関数
 */
export function DeleteButton({ label, action, what }: { label: string; action: () => Promise<void>; what: string }) {
  return (
    <details className="mt-3 text-sm" data-delete>
      <summary className="inline-block cursor-pointer select-none text-stone-500 hover:text-rose-700 hover:underline">{label}</summary>
      <form action={action} className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm text-stone-700">{what}を削除します。削除すると、会員のだれからも見えなくなります。</p>
        <button type="submit" className="mt-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">
          削除する
        </button>
      </form>
    </details>
  )
}

/**
 * 通報のボタン（確認つき）。<details> を開くと理由の欄（200 文字まで。空でもよい）と「通報する」。
 * 通報したことは世話人に伝わるが、誰が通報したかは、世話人にも、どの画面にも出さない
 */
export function ReportButton({ action, what }: { action: (fd: FormData) => Promise<void>; what: string }) {
  return (
    <details className="mt-3 text-sm" data-report>
      <summary className="inline-block cursor-pointer select-none text-stone-500 hover:text-stone-700 hover:underline">通報する</summary>
      <form action={action} className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm text-stone-700">
          {what}を世話人の方に知らせます。だれが通報したかは、世話人の方にも表示されません。
        </p>
        <label className="mt-2 block text-sm text-stone-700">
          理由（なくてもかまいません。200 文字まで）
          <textarea name="reason" maxLength={200} rows={2} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-800" />
        </label>
        <button type="submit" className="mt-2 rounded-xl bg-stone-700 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">
          通報する
        </button>
      </form>
    </details>
  )
}

export function PostDetail({
  post,
  comments,
  backHref,
  backLabel,
  commentAction,
  deletePost,
  deleteCommentFor,
  reportPost,
  reportCommentFor,
  badges = [],
  postControls,
}: {
  post: GroupPost
  comments: GroupComment[]
  backHref: string
  backLabel: string
  /** 無ければコメント欄を出さない（閲覧モード） */
  commentAction?: (fd: FormData) => Promise<void>
  /** 無ければ投稿の削除ボタンを出さない */
  deletePost?: () => Promise<void>
  /** コメントごとの削除。undefined を返したコメントにはボタンを出さない */
  deleteCommentFor?: (c: GroupComment) => (() => Promise<void>) | undefined
  /** 無ければ投稿の通報ボタンを出さない（閲覧モード） */
  reportPost?: (fd: FormData) => Promise<void>
  /** コメントごとの通報。undefined を返したコメントにはボタンを出さない */
  reportCommentFor?: (c: GroupComment) => ((fd: FormData) => Promise<void>) | undefined
  /** 題の上に出す小さな印（分類・固定・公開） */
  badges?: string[]
  /** 本文の下に置く操作（世話人の固定など） */
  postControls?: React.ReactNode
}) {
  return (
    <>
      <Link href={backHref} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <article className="mt-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        {badges.length > 0 && (
          <p className="mb-2 flex flex-wrap gap-2" data-badges>
            {badges.map((b) => (
              <span key={b} className="rounded-lg bg-stone-100 px-2 py-0.5 text-sm text-stone-700">
                {b}
              </span>
            ))}
          </p>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-stone-800 leading-snug">{post.title}</h2>
        <p className="mt-2 text-sm text-stone-500">
          {post.authorDisplayName ?? NO_DISPLAY_NAME}・{formatDate(post.createdAt)}
        </p>
        <p className="mt-5 text-base sm:text-lg text-stone-700 leading-loose whitespace-pre-line">{post.body}</p>
        {postControls}
        {deletePost && <DeleteButton label="この投稿を削除" action={deletePost} what="この投稿（コメントを含む）" />}
        {reportPost && <ReportButton action={reportPost} what="この投稿" />}
      </article>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-800">
          <MessageCircle className="w-5 h-5 text-orange-600" />
          コメント
          <span className="text-base font-normal text-stone-500">{comments.length} 件</span>
        </h2>
        {comments.length === 0 ? (
          <p className="mt-4 text-base text-stone-600">コメントはまだありません。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {comments.map((c) => {
              const del = deleteCommentFor?.(c)
              return (
                <li key={c.id} className="rounded-2xl bg-white border border-stone-200 p-5">
                  <p className="text-base text-stone-700 leading-relaxed whitespace-pre-line">{c.body}</p>
                  <p className="mt-2 text-sm text-stone-500">
                    {c.authorDisplayName ?? NO_DISPLAY_NAME}・{formatDate(c.createdAt)}
                  </p>
                  {del && <DeleteButton label="このコメントを削除" action={del} what="このコメント" />}
                  {(() => {
                    const rep = reportCommentFor?.(c)
                    return rep ? <ReportButton action={rep} what="このコメント" /> : null
                  })()}
                </li>
              )
            })}
          </ul>
        )}

        {commentAction && (
          <form action={commentAction} className="mt-6">
            <label htmlFor="comment-body" className="block text-base font-semibold text-stone-800">
              コメントを書く
            </label>
            <textarea id="comment-body" name="body" required maxLength={COMMENT_BODY_MAX} rows={4} className={inputClass} />
            <p className="mt-1 text-sm text-stone-500">この会の会員だけが読めます。{COMMENT_BODY_MAX} 文字まで。</p>
            <button type="submit" className={`mt-3 ${buttonClass}`}>
              コメントする
            </button>
          </form>
        )}
      </section>
    </>
  )
}
