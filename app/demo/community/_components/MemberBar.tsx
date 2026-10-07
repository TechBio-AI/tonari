// 会員エリアの上部バー（./../layout.tsx が使う）。見た目と、アイコンの文字の決め方だけ。
// 表示名は本人のプロフィールだけから読む（lib/portal/member-profile.ts。氏名は使わない・ログに出さない）。

import Link from 'next/link'

import { getMyProfile } from '@/lib/portal/member-profile'
import type { GroupSummary } from '@/lib/portal/tenancy'

/** 閲覧モードのアイコンの文字 */
export const DEMO_AVATAR_TEXT = '見本'
/** プロフィールがまだ無い会員（初回の入力中）のアイコンの文字 */
export const NO_PROFILE_AVATAR_TEXT = '会'

/** 表示名の頭文字 1 字（絵文字・結合文字を割らないようコードポイントで取る。英字は大文字に） */
export function initialOf(displayName: string): string {
  const first = [...displayName.trim()][0] ?? ''
  return first ? first.toUpperCase() : NO_PROFILE_AVATAR_TEXT
}

export async function avatarText(hasProfile: boolean): Promise<string> {
  if (!hasProfile) return NO_PROFILE_AVATAR_TEXT
  try {
    const profile = await getMyProfile()
    return profile ? initialOf(profile.displayName) : NO_PROFILE_AVATAR_TEXT
  } catch {
    return NO_PROFILE_AVATAR_TEXT
  }
}

const menuItemClass =
  'block w-full text-left px-4 py-3 text-base text-stone-700 hover:bg-orange-50 hover:text-orange-800'

function groupHref(slug: string): string {
  return `/demo/community/${encodeURIComponent(slug)}`
}

/** 所属している会。0 なら何も出さない、1 つならリンクだけ、2 つ以上なら切り替えのメニュー（<details>） */
function MyGroups({ groups }: { groups: GroupSummary[] }) {
  if (groups.length === 0) return null
  if (groups.length === 1) {
    return (
      <Link
        href={groupHref(groups[0].slug)}
        data-my-group
        className="min-w-0 truncate text-sm sm:text-base text-orange-800 hover:underline"
      >
        {groups[0].name}
      </Link>
    )
  }
  return (
    <details className="relative min-w-0" data-group-switcher>
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none rounded-xl border border-stone-200 px-3 py-2 text-sm sm:text-base text-stone-700 hover:border-orange-300">
        所属している会（{groups.length}）
      </summary>
      <div className="absolute left-0 mt-2 w-72 max-w-[80vw] rounded-2xl border border-stone-200 bg-white shadow-lg overflow-hidden z-10">
        {groups.map((g) => (
          <Link key={g.id} href={groupHref(g.slug)} className={menuItemClass}>
            {g.name}
          </Link>
        ))}
      </div>
    </details>
  )
}

export function MemberBar({ avatar, demo, groups = [] }: { avatar: string; demo: boolean; groups?: GroupSummary[] }) {
  return (
    <div className="border-b border-stone-200 bg-white" data-member-bar>
      <div className="max-w-3xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/demo/community" className="flex-shrink-0 text-base font-semibold text-stone-700 hover:text-orange-700">
          {demo ? '会員向けページ（サンプル）' : '会員向けページ'}
        </Link>

        <div className="min-w-0 flex-1 flex justify-end px-3">
          <MyGroups groups={groups} />
        </div>

        <details className="relative flex-shrink-0" data-member-menu>
          <summary
            aria-label={demo ? '閲覧モードのメニュー' : '会員メニュー'}
            className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-center w-11 h-11 rounded-full bg-orange-100 text-orange-900 font-bold text-base border border-orange-200 hover:bg-orange-200"
          >
            {avatar}
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-stone-200 bg-white shadow-lg overflow-hidden z-10">
            <Link href="/demo/community/profile" className={menuItemClass}>
              {demo ? 'マイページ（サンプル）' : 'マイページ'}
            </Link>
            {demo ? (
              // DEMO_ACCESS: 本番前に削除
              <form method="post" action="/demo/auth/demo-access/end">
                <button type="submit" className={menuItemClass}>
                  閲覧を終了
                </button>
              </form>
            ) : (
              <form method="post" action="/demo/auth/signout">
                <button type="submit" className={menuItemClass}>
                  ログアウト
                </button>
              </form>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

