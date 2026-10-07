// 会員の一覧（会員エリア。/demo/community/[slug]/members）
//
// 世話人だけが見る（2026-10-01 ファウンダー指示）。入口は世話人のページの「会員一覧」の枠だけ（タブには置かない）。
//   - 一般の会員 → 会のお知らせのページへ送る
//   - 会員でない人 → 会のお知らせのページへ送る（入会希望フォーム）
//   - 閲覧モード → 世話人の画面の見本として見せる（架空。DB は読まない）
// 掲示板・コメントで書き手の表示名が出るのは変えない（書けば会員に見える、という設計のまま）。
//
// 世話人の任命・解除（2026-10-02 ファウンダー指示）: 各行に「世話人にする」／「世話人から外す」を確認つきで置く。
//   土台の appointModerator / dismissModerator を呼ぶ。最後の 1 人は外せない（土台が last_moderator を返し、その文言を出す）。
//   自分を外すこともできる（同じく最後の 1 人なら外せない）。閲覧モードにはボタンを出さない。
//   相手は user_id で指す（世話人には list_group_members が返す）。画面の文字としては出さない。
//
// 出すのは表示名・役割（世話人）・入会日だけ。本名・メール・user_id は出さない
// （表示名は DB 関数 list_group_members が渡す。lib/portal/tenancy.ts の listMembers）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { listMembers, type GroupMember } from '@/lib/portal/tenancy'

import { SAMPLE_MEMBERS } from '../../_components/sample-group'
import { appointModeratorAction, dismissModeratorAction } from '../actions'
import { groupPath, requireModeratorViewAccess } from '../_lib/access'
import { GroupShell, NO_DISPLAY_NAME, formatDate, type FlashParams } from '../_components/GroupShell'

/** 確認つきの役割の変更（<details> を開くと確定のボタン。JavaScript が無くても動く） */
function RoleButton({ label, confirm, submit, action }: { label: string; confirm: string; submit: string; action: () => Promise<void> }) {
  return (
    <details className="w-full sm:w-auto text-sm" data-role-change>
      <summary className="inline-block cursor-pointer select-none text-orange-700 hover:underline">{label}</summary>
      <form action={action} className="mt-2 rounded-xl border border-orange-200 bg-orange-50 p-3 sm:max-w-sm">
        <p className="text-sm text-stone-700 leading-relaxed">{confirm}</p>
        <button type="submit" className="mt-2 rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800">
          {submit}
        </button>
      </form>
    </details>
  )
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '会員一覧',
  robots: { index: false, follow: false },
}

export default async function MembersPage({ params, searchParams }: { params: { slug: string }; searchParams?: FlashParams }) {
  const access = await requireModeratorViewAccess(params.slug, 'redirect')
  const { group } = access

  let members: GroupMember[]
  if (access.mode === 'demo') {
    members = SAMPLE_MEMBERS // DEMO_ACCESS: 本番前に削除
  } else {
    const r = await listMembers(group.id)
    if (!r.ok) throw new Error('会員の一覧を読み込めませんでした')
    members = r.value
  }

  return (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={access.mode === 'demo'}
      moderator={access.mode === 'member'}
      showLeave={access.mode === 'member'}
      tab="manage"
      flash={searchParams}
    >
      <Link href={groupPath(group.slug, '/manage')} className="mt-8 inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        世話人のページにもどる
      </Link>
      <h2 className="mt-5 flex items-baseline gap-2 text-xl font-bold text-stone-800">
        会員一覧
        <span className="text-base font-normal text-stone-500">{members.length} 人</span>
      </h2>
      <p className="mt-2 text-base text-stone-600 leading-relaxed">
        世話人だけが見られるページです。表示しているのは表示名・世話人の印・入会日だけです。
      </p>
      <ul className="mt-5 divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200">
        {members.map((m, i) => {
          const name = m.displayName ?? NO_DISPLAY_NAME
          // 確認の文で相手を呼ぶ名前（表示名が無い人を「名前未設定さん」と呼ばない）
          const who = m.displayName ? `${m.displayName}さん` : '表示名の無い会員'
          const self = access.mode === 'member' && m.userId !== null && m.userId === access.userId
          // 閲覧モードと、相手を指せない行（user_id が無い）にはボタンを出さない
          const target = access.mode === 'member' ? m.userId : null
          return (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="text-base text-stone-800">
                {name}
                {self && <span className="ml-1 text-sm text-stone-500">（あなた）</span>}
                {m.role === 'moderator' && (
                  <span className="ml-2 rounded-lg bg-orange-100 px-2 py-0.5 text-sm text-orange-800">世話人</span>
                )}
              </span>
              <span className="text-sm text-stone-500">{formatDate(m.joinedAt)} 入会</span>
              {target !== null &&
                (m.role === 'moderator' ? (
                  <RoleButton
                    label={self ? '自分を世話人から外す' : '世話人から外す'}
                    confirm={
                      self
                        ? 'あなたを世話人から外します。外れると、世話人のページと会員一覧は見られなくなります。世話人がほかにいないときは外せません。'
                        : `${who}を世話人から外し、一般の会員に戻します。世話人がほかにいないときは外せません。`
                    }
                    submit="世話人から外す"
                    action={dismissModeratorAction.bind(null, group.slug, target, self)}
                  />
                ) : (
                  <RoleButton
                    label="世話人にする"
                    confirm={`${who}を世話人にします。入会の申請（氏名を含む）・会員一覧・書き出しを見られるようになり、招待や承認ができるようになります。`}
                    submit="世話人にする"
                    action={appointModeratorAction.bind(null, group.slug, target)}
                  />
                ))}
            </li>
          )
        })}
      </ul>
    </GroupShell>
  )
}
