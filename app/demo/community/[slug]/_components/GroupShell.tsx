// 会ごとのページの共通の枠: 会の名前・閲覧モードの注意・タブ（お知らせ／掲示板／道のり／世話人）・結果の 1 行。
// 見せ方だけ。入れるかどうかは ../_lib/access.ts が決める。

import Link from 'next/link'

import { isJourneyEnabled } from '@/lib/portal/journey-survey'
import { FAILURE_MESSAGES, FAILURE_REASONS, type FailureReason } from '@/lib/portal/tenancy'

import { DEMO_MODE_NOTICE } from '../../_components/sample-group'
import { groupPath } from '../_lib/access'
import { isJourneyGroup } from '../_lib/journey'

/** タブの選択中・非選択の色（掲示板の分類の絞り込みも同じ色を使う） */
export const TAB_SELECTED_CLASS = 'bg-orange-600 border-orange-600 text-white'
export const TAB_IDLE_CLASS = 'bg-white border-stone-200 text-stone-700 hover:border-orange-300'

export type GroupTab = 'home' | 'announcements' | 'threads' | 'journey' | 'manage' | 'events' | 'links' | 'rules'

/** 操作が済んだあとに出す 1 行（?done= の値 → 文） */
export const DONE_MESSAGES = {
  requested: '入会を申請しました。世話人の方の承認をお待ちください。',
  joined: 'この会の会員になりました。',
  posted: '投稿しました。',
  commented: 'コメントしました。',
  announced: 'お知らせを掲載しました。',
  approved: '申請を承認しました。',
  rejected: '申請を見送りました。',
  deleted: '投稿を削除しました。',
  comment_deleted: 'コメントを削除しました。',
  left: 'この会を退会しました。',
  appointed: '世話人にしました。',
  dismissed: '世話人から外しました。',
  dismissed_self: '世話人から外れました。',
  pinned: 'スレッドを固定しました。',
  unpinned: 'スレッドの固定を外しました。',
  reported: '通報しました。世話人の方が確かめます。',
  handled: '対応済みにしました。',
  rules_saved: '会の約束を保存しました。',
} as const
export type DoneKey = keyof typeof DONE_MESSAGES

export type FlashParams = { error?: string | string[]; done?: string | string[] }

/** URL の値から出す文を決める。知らない値は何も出さない（URL の文字をそのまま画面に出さない） */
export function flashOf(params: FlashParams | undefined): { tone: 'ok' | 'error'; text: string } | null {
  const error = typeof params?.error === 'string' ? params.error : undefined
  if (error && (FAILURE_REASONS as readonly string[]).includes(error)) {
    return { tone: 'error', text: FAILURE_MESSAGES[error as FailureReason] }
  }
  const done = typeof params?.done === 'string' ? params.done : undefined
  if (done && Object.prototype.hasOwnProperty.call(DONE_MESSAGES, done)) {
    return { tone: 'ok', text: DONE_MESSAGES[done as DoneKey] }
  }
  return null
}

export function Flash({ params }: { params?: FlashParams }) {
  const f = flashOf(params)
  if (!f) return null
  return (
    <p
      role={f.tone === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-2xl border p-4 text-base ${
        f.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      {f.text}
    </p>
  )
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export const NOT_MEMBER_MESSAGE = 'この会の会員ではありません'
export const NO_ANNOUNCEMENTS = 'お知らせはまだありません。'
export const NO_THREADS = 'スレッドはまだありません。'

/** 表示名が無い（プロフィール未作成・退会した）人 */
export const NO_DISPLAY_NAME = '名前未設定'

export function GroupShell({
  groupName,
  slug,
  demo,
  moderator,
  tab,
  flash,
  showLeave = false,
  children,
}: {
  groupName: string
  slug: string
  demo: boolean
  moderator: boolean
  tab: GroupTab | null
  flash?: FlashParams
  /** 会員（閲覧モードではない）のときだけ、末尾に退会の入口を出す */
  showLeave?: boolean
  children: React.ReactNode
}) {
  // タブは 1 列（2026-10-02 ファウンダー指示）。並び:
  //   ホーム／お知らせ／掲示板／行事／資料・リンク／会の約束／（道のり）／世話人のページ（世話人だけ）
  // 行事・資料とリンク・会の約束は、閲覧モードでも見本を出す（2026-10-04。見本のデータは sample-group.ts）。
  // 道のり（病気がわかるまでの道のり調査）は指示の並びに無いが、消さずに世話人のページの前に置く（Claude Code の判断）。
  //   ファブリー病の会と閲覧モードの見本の会だけ。JOURNEY_SURVEY=on のときだけ
  // 会員一覧はタブに置かない（世話人だけが見る。世話人のページから開く。2026-10-01 ファウンダー指示）
  const tabs: { key: GroupTab; label: string; href: string }[] = [
    { key: 'home', label: 'ホーム', href: groupPath(slug) },
    { key: 'announcements', label: 'お知らせ', href: groupPath(slug, '/announcements') },
    { key: 'threads', label: '掲示板', href: groupPath(slug, '/threads') },
  ]
  tabs.push(
    { key: 'events', label: '行事', href: groupPath(slug, '/events') },
    { key: 'links', label: '資料・リンク', href: groupPath(slug, '/links') },
    { key: 'rules', label: '会の約束', href: groupPath(slug, '/rules') }
  )
  if (isJourneyEnabled() && isJourneyGroup(slug, demo)) {
    tabs.push({ key: 'journey', label: '道のり', href: groupPath(slug, '/journey') })
  }
  // 閲覧モードは世話人の画面も見本で見せる（操作はできない）
  if (moderator) tabs.push({ key: 'manage', label: '世話人のページ', href: groupPath(slug, '/manage') })
  else if (demo) tabs.push({ key: 'manage', label: '世話人のページ（見本）', href: groupPath(slug, '/manage') })

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      {demo && (
        // DEMO_ACCESS: 本番前に削除
        <p role="status" className="mb-8 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base font-semibold text-stone-800 leading-relaxed">
          {DEMO_MODE_NOTICE}
        </p>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">
        {groupName}
        {demo && <span className="ml-2 text-lg font-normal text-stone-500">（サンプル）</span>}
      </h1>

      {tab && (
        // スマホ幅では折り返す（flex-wrap）
        <nav aria-label="この会のページ" className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.key === tab ? 'page' : undefined}
              className={`rounded-2xl px-4 py-2 text-base border ${t.key === tab ? TAB_SELECTED_CLASS : TAB_IDLE_CLASS}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      <Flash params={flash} />
      {children}

      {showLeave && (
        <p className="mt-16 border-t border-stone-200 pt-6 text-right">
          <Link href={groupPath(slug, '/leave')} className="text-sm text-stone-500 hover:text-stone-700 hover:underline">
            この会を退会する
          </Link>
        </p>
      )}
    </div>
  )
}
