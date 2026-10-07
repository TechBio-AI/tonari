// 会のホーム（会員エリア。/demo/community/[slug]）
//
// 入口の判定は ./_lib/access.ts。
//   - 会員                → ホーム（2026-10-02 ファウンダー指示）:
//                             歓迎文（group_settings.welcome_text。無ければ節ごと出さない）
//                             最新のお知らせ 3 件（すべては ./announcements）
//                             これからの行事 3 件（すべては ./events。無ければ節ごと出さない）
//                             固定スレッド（世話人が固定したもの。無ければ節ごと出さない）
//                             その会の病気の治験・研究の案内があれば 1 行（list_my_trial_notices。B 層の方にだけ DB が返す。2026-10-03）
//                             先天代謝異常症の会だけ、患者登録制度 JaSMIn の案内（./_lib/group-diseases.ts。2026-10-03）
//                             会の病気は data の JSON ではなく DB（public_groups.disease_id）から引く（2026-10-04）
//                             お住まいの都道府県の相談窓口（/demo/support-centers?pref=本人の都道府県。プロフィールが無ければ pref なし）
//   - 会員でない人        → 「この会の会員ではありません」＋入会希望フォーム（申請中ならその旨）
//                           フォームは ひとこと・紹介者の氏名（任意。v2）。申請中は世話人に申請者の氏名が見えることを書き添える
//   - 閲覧モード（demo）  → 見本の会のホーム（お知らせ・歓迎文・これからの行事・固定スレッドの見本。架空。DB は読まない。2026-10-04）

import type { Metadata } from 'next'
import Link from 'next/link'

import { formatEventWhen, splitEvents, type GroupEvent } from '@/lib/portal/group-events'
import { listEvents } from '@/lib/portal/group-events-db'
import { JOIN_MESSAGE_MAX, REFERRER_NAME_MAX, listPosts, myJoinRequest, type GroupPost, type GroupSummary, type JoinRequest } from '@/lib/portal/tenancy'

import { SAMPLE_MARK, SAMPLE_WELCOME, sampleEvents, samplePosts } from '../_components/sample-group'
import { requestJoinAction } from './actions'
import { resolveGroupAccess, groupPath } from './_lib/access'
import { getGroupSettings, listPostsWithMeta, type GroupPostWithMeta } from './_lib/community'
import { getMyProfile } from '@/lib/portal/member-profile'
import { listMyTrialNotices } from '../../_lib/contract-db'
import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { JASMIN_URL, diseaseIdsOfGroup, isJasminTarget } from './_lib/group-diseases'
import { GroupShell, NO_ANNOUNCEMENTS, NOT_MEMBER_MESSAGE, formatDate, type FlashParams } from './_components/GroupShell'
import { PostList, buttonClass, inputClass } from './_components/Posts'

export const dynamic = 'force-dynamic'

/** ホームに出す件数 */
const HOME_LIMIT = 3

export const metadata: Metadata = {
  title: '会員向けページ',
  robots: { index: false, follow: false },
}

/** 会員でない人に出す。申請中（本人の最新の申請が pending）ならフォームの代わりにその旨を出す */
function NotMemberView({ group, pending, flash }: { group: GroupSummary; pending: JoinRequest | null; flash?: FlashParams }) {
  return (
    <GroupShell groupName={group.name} slug={group.slug} demo={false} moderator={false} tab={null} flash={flash}>
      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">{NOT_MEMBER_MESSAGE}</h2>
        <p className="mt-3 text-base text-stone-600 leading-relaxed">
          この会のお知らせや掲示板は、会員の方だけが読めます。
          会から招待リンクを受け取った方は、そのリンクを開くと会員になれます。
        </p>

        {pending ? (
          <p role="status" className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-base text-stone-800">
            入会を申請しています（{formatDate(pending.createdAt)}）。世話人の方の承認をお待ちください。
          </p>
        ) : (
          <form action={requestJoinAction.bind(null, group.slug)} className="mt-6">
            <h3 className="text-lg font-semibold text-stone-800">入会を希望する</h3>
            <label htmlFor="join-message" className="mt-3 block text-base text-stone-700">
              世話人の方へのひとこと（なくてもかまいません）
            </label>
            <textarea id="join-message" name="message" maxLength={JOIN_MESSAGE_MAX} rows={3} className={inputClass} />
            <p className="mt-1 text-sm text-stone-500">
              世話人の方が読みます。{JOIN_MESSAGE_MAX} 文字まで。本名や連絡先は書かなくてかまいません。
            </p>
            <label htmlFor="join-referrer" className="mt-5 block text-base text-stone-700">
              紹介者の氏名（いる場合）
            </label>
            <input id="join-referrer" name="referrerName" type="text" maxLength={REFERRER_NAME_MAX} autoComplete="off" className={inputClass} />
            <p className="mt-1 text-sm text-stone-500">
              この会の方から紹介を受けた場合に書いてください。世話人の方だけが読み、審査のあとも記録に残ります。
            </p>
            <p className="mt-5 rounded-2xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-700 leading-relaxed">
              申請中の間は、この会の世話人の方に、プロフィールに登録した氏名と表示名が見えます（審査のため）。
              ほかの会員には見えません。
            </p>
            <button type="submit" className={`mt-4 ${buttonClass}`}>
              入会を申請する
            </button>
          </form>
        )}

        <Link href={`/demo/groups/${encodeURIComponent(group.slug)}`} className="mt-6 inline-block text-base text-orange-700 hover:underline">
          この会の紹介ページを見る
        </Link>
      </section>
    </GroupShell>
  )
}

export default async function GroupHomePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: FlashParams
}) {
  const access = await resolveGroupAccess(params.slug)
  if (access.mode === 'outsider') {
    // 読めなかったときは申請していない扱い（フォームを出す。二重の申請は DB の request_join が止める）
    const req = await myJoinRequest(access.group.id)
    const pending = req.ok && req.value?.status === 'pending' ? req.value : null
    return <NotMemberView group={access.group} pending={pending} flash={searchParams} />
  }

  const { group } = access
  const demo = access.mode === 'demo'
  let announcements: GroupPost[]
  let welcome: string | null = null
  let events: GroupEvent[] = []
  let pinned: GroupPostWithMeta[] = []
  let prefecture: string | null = null
  let noticeCount = 0
  let jasmin = false
  if (demo) {
    // DEMO_ACCESS: 本番前に削除
    announcements = samplePosts('announcement')
    welcome = SAMPLE_WELCOME
    events = splitEvents(sampleEvents(), new Date()).upcoming
    pinned = samplePosts('thread')
      .slice(0, 1)
      .map((p) => ({ ...p, category: 'daily' as const, pinned: true, isPublic: false }))
  } else {
    const r = await listPosts(group.id, 'announcement')
    if (!r.ok) throw new Error('お知らせを読み込めませんでした')
    announcements = r.value
    // 歓迎文・行事・固定は、読めなかったら節ごと出さない（ホーム全体は止めない）
    const [settings, ev, threads] = await Promise.all([
      getGroupSettings(group.id),
      listEvents(group.id).catch(() => null),
      listPostsWithMeta(group.id, 'thread').catch(() => null),
    ])
    welcome = settings?.welcomeText ?? null
    if (ev?.ok) events = splitEvents(ev.value, new Date()).upcoming
    if (threads?.ok) pinned = threads.value.filter((t) => t.pinned)
    // 都道府県は本人のプロフィールだけから読む（読めなければ pref を付けない）。ログに出さない
    // その会の病気の案件（本人に見えるもの・表示しないにしていないもの）。読めなければ出さない
    // 会の病気（固定 ID。DB の public_groups から。./_lib/group-diseases.ts）。読めなければ空
    const groupDiseaseIds = await diseaseIdsOfGroup(group.slug).catch(() => [] as string[])
    jasmin = isJasminTarget(groupDiseaseIds)
    // 機能フラグ TRIAL_NOTICES（既定 off）が閉じていれば、案件を読まず案内も出さない
    const ids = new Set(isFeatureEnabled('TRIAL_NOTICES') ? groupDiseaseIds : [])
    if (ids.size > 0) {
      try {
        const n = await listMyTrialNotices()
        if (n.ok) noticeCount = n.value.filter((x) => ids.has(x.diseaseId) && x.myStatus !== 'dismissed').length
      } catch {
        noticeCount = 0
      }
    }
    try {
      prefecture = (await getMyProfile())?.prefecture ?? null
    } catch {
      prefecture = null
    }
  }

  return (
    <GroupShell
      groupName={group.name}
      slug={group.slug}
      demo={demo}
      moderator={access.mode === 'member' && access.role === 'moderator'}
      showLeave={access.mode === 'member'}
      tab="home"
      flash={searchParams}
    >
      {demo && (
        <p className="mt-6 text-base font-semibold text-stone-700" data-sample-mark>
          会のホーム{SAMPLE_MARK}
        </p>
      )}
      {welcome && (
        <section className="mt-8 rounded-3xl bg-amber-50 border border-amber-100 p-6 sm:p-7" data-home-welcome>
          <p className="text-base sm:text-lg text-stone-800 leading-loose whitespace-pre-line">{welcome}</p>
        </section>
      )}

      <section className="mt-8" data-home-announcements>
        <h2 className="text-xl font-bold text-stone-800">最新のお知らせ</h2>
        <PostList
          posts={announcements.slice(0, HOME_LIMIT)}
          hrefOf={(p) => groupPath(group.slug, `/announcements/${p.id}`)}
          empty={NO_ANNOUNCEMENTS}
        />
        {announcements.length > 0 && (
          <Link href={groupPath(group.slug, '/announcements')} className="mt-4 inline-block text-base text-orange-700 hover:underline">
            すべてのお知らせを見る
          </Link>
        )}
      </section>

      {events.length > 0 && (
        <section className="mt-10" data-home-events>
          <h2 className="text-xl font-bold text-stone-800">これからの行事</h2>
          <ul className="mt-5 space-y-3">
            {events.slice(0, HOME_LIMIT).map((e) => (
              <li key={e.id}>
                <Link href={groupPath(group.slug, `/events/${e.id}`)} className="block rounded-2xl bg-white border border-stone-200 p-5 hover:border-orange-300">
                  <p className="text-lg font-semibold text-stone-800">{e.title}</p>
                  <p className="mt-1 text-sm text-stone-500">{formatEventWhen(e)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={groupPath(group.slug, '/events')} className="mt-4 inline-block text-base text-orange-700 hover:underline">
            行事の一覧を見る
          </Link>
        </section>
      )}

      {noticeCount > 0 && (
        <p className="mt-10 rounded-2xl bg-sky-50 border border-sky-100 p-4 text-base text-stone-800" data-home-notices>
          この会の病気について、治験・研究の案内が {noticeCount} 件あります。
          <Link href="/demo/community/notices" className="ml-1 text-orange-700 hover:underline">
            案内を見る
          </Link>
        </p>
      )}

      {!demo && jasmin && (
        <section className="mt-10 rounded-2xl bg-white border border-stone-200 p-5" data-home-jasmin>
          <h2 className="text-lg font-bold text-stone-800">患者登録制度 JaSMIn（ジャスミン）</h2>
          <p className="mt-2 text-base text-stone-700 leading-relaxed">
            先天代謝異常症の患者さんのための登録制度があります。登録をご検討ください。くわしい内容と登録の方法は、公式サイトをご覧ください。登録するかどうかは、ご自身とご家族で決めてください。
          </p>
          <a href={JASMIN_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-base text-orange-700 hover:underline">
            JaSMIn の公式サイトを見る
          </a>
        </section>
      )}

      <p className="mt-10" data-home-support>
        <Link
          href={prefecture ? `/demo/support-centers?pref=${encodeURIComponent(prefecture)}` : '/demo/support-centers'}
          className="text-base text-orange-700 hover:underline"
        >
          お住まいの都道府県の相談窓口
        </Link>
      </p>

      {pinned.length > 0 && (
        <section className="mt-10" data-home-pinned>
          <h2 className="text-xl font-bold text-stone-800">固定されたスレッド</h2>
          <PostList posts={pinned} hrefOf={(p) => groupPath(group.slug, `/threads/${p.id}`)} empty="" />
        </section>
      )}
    </GroupShell>
  )
}
