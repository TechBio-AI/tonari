// マイページ（会員本人のプロフィールの表示と編集）
//
// 会員層（/demo/community 配下）。middleware.ts がセッションを確かめるが、ここでも確かめる（二重）。
//   - 未ログイン → /demo/login
//   - 閲覧コードの見本（kind: 'demo'） → 架空の見本を読み取り専用で出す（DB は読まない。2026-09-26 ファウンダー指示）
//   - プロフィールが無い → /demo/community（招待制の案内。最初の入力は招待リンクか入会申請の経路からだけ。2026-10-02）
// 読み書きは lib/portal/member-profile.ts だけを通す。氏名は個人識別子なのでログに出さない。
// 研究・治験の案内（B 層）の節は lib/portal/research-contact.ts を通す。病名はログに出さない。
// 末尾に「アカウントを削除する（すべての会員情報を消す）」の入口（確認画面は ../account/delete）。
// その前に「病気がわかるまでの道のり」の自分の回答への入口（JOURNEY_SURVEY が on ちょうどのときだけ）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { consentLabelOf, currentConsentText } from '@/lib/portal/consent-texts'
import { JOURNEY_TITLE, isJourneyEnabled } from '@/lib/portal/journey-survey'
import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { PROFILE_CHOICES, REGISTRANT_TYPE_LABELS, getMyProfile } from '@/lib/portal/member-profile'
import { getMyGroupDiseaseIdxs, getMyResearchContact, researchDiseaseOptions } from '@/lib/portal/research-contact'

import { getViewer } from '../../_lib/session'
import { listMyContents, type MyContentItem } from '../[slug]/_lib/community'
import { listMyWishes, type MyWish } from '../../wish/_lib/wishes'
import { MyWishList } from '../../wish/_components/WishParts'
import { ProfileForm } from '../_components/ProfileForm'
import SampleMemberProfile from '../_components/SampleMemberProfile'
import { saveMyProfile, saveResearchContact, withdrawResearchContact } from './actions'
import { ResearchContactSection, type ResearchContactView } from './ResearchContactSection'

// セッションに依存するので静的化させない
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'マイページ',
  robots: { index: false, follow: false },
}

function BackLink() {
  return (
    <Link href="/demo/community" className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
      <ArrowLeft className="w-4 h-4" />
      会員向けページにもどる
    </Link>
  )
}

// DEMO_ACCESS: 本番前に削除。閲覧モードの見本（値は SampleMemberProfile に固定。編集・保存はできない）
function DemoProfileView() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <BackLink />
      <p role="status" className="mt-6 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base font-semibold text-stone-800 leading-relaxed">
        プロトタイプの閲覧モードです。実際の会員のデータは表示されません
      </p>
      <h1 className="mt-8 text-2xl sm:text-3xl font-bold text-stone-800">マイページ（サンプル）</h1>
      <div className="mt-8">
        <SampleMemberProfile />
      </div>
    </div>
  )
}

/** 自分の投稿・コメントの一覧。各行から、その投稿のページへ */
function MyContentsSection({ items }: { items: MyContentItem[] | null }) {
  return (
    <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-my-contents>
      <h2 className="text-xl font-bold text-stone-800">自分の投稿・コメント</h2>
      {items === null ? (
        <p className="mt-3 text-base text-rose-700">読み込めませんでした。時間をおいて、もう一度お試しください。</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-base text-stone-600">まだありません。</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {items.map((it, i) => (
            <li key={i} className="py-3">
              <Link href={`/demo/community/${encodeURIComponent(it.groupSlug)}${it.path}`} className="block hover:text-orange-700">
                <span className="text-sm text-stone-500">
                  {it.kind === 'post' ? '投稿' : 'コメント'}・{it.groupName}・{formatDate(it.createdAt)}
                </span>
                <span className="mt-1 block text-base text-stone-800 break-words">{it.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default async function MemberProfilePage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/demo/login')
  // DEMO_ACCESS: 本番前に削除。見本の閲覧では会員のデータを扱わない（DB を読まず、見本を出す）
  if (viewer.kind === 'demo') return <DemoProfileView />

  // 利用目的のいまの版に同意していない会員は、同意を取り直してから（onboarding が再同意の画面を出す）
  if (viewer.needsConsent) redirect('/demo/community/onboarding')

  const profile = await getMyProfile()
  if (!profile) redirect('/demo/community')

  const consented = formatDate(profile.consentedAt)
  // 読めなかったときは null（節は「読み込めませんでした」）
  // 参加を希望した患者会（取り消していないもの）。読めなければ null
  let myWishes: MyWish[] | null = null
  try {
    if (isFeatureEnabled('WISHES')) myWishes = await listMyWishes()
  } catch {
    myWishes = null
  }
  let myContents: MyContentItem[] | null = null
  try {
    myContents = await listMyContents()
  } catch (err) {
    console.error('自分の投稿の取得に失敗しました:', err instanceof Error ? err.message : 'unknown')
  }

  // 研究・治験の案内（B 層）。読めなかったときは null（節は「読み込めませんでした」を出し、書かせない）
  let research: ResearchContactView | null = null
  try {
    const r = await getMyResearchContact()
    if (r) research = { state: r.state, consentedDate: r.consentedAt ? formatDate(r.consentedAt) : '', diseases: r.diseases }
  } catch (err) {
    console.error('研究・治験の案内の設定の取得に失敗しました:', err instanceof Error ? err.message : 'unknown')
  }
  const researchOptions = researchDiseaseOptions(await getMyGroupDiseaseIdxs())
  // 登録する方と患者さんの 2 ブロックで出す（入力フォームと同じ分け方）
  const registrantRows: [string, string][] = [
    ['登録する方', REGISTRANT_TYPE_LABELS[profile.registrantType]],
    ['氏名', profile.fullName],
    ['表示名', profile.displayName],
  ]
  if (profile.registrantType === 'proxy') {
    registrantRows.push(['続柄', profile.proxyRelation ?? ''])
    registrantRows.push(['患者さんは18歳未満か', profile.patientIsMinor ? 'はい' : 'いいえ'])
  }
  const patientRows: [string, string][] = [
    ['年代', profile.ageBand],
    ['性別', profile.gender],
    ['お住まいの都道府県', profile.prefecture],
  ]
  const blocks: [string, [string, string][]][] = [
    ['登録する方について', registrantRows],
    ['患者さんについて', patientRows],
  ]

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <BackLink />

      <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-stone-800">マイページ</h1>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        登録している内容です。氏名は運営と、入会審査をする世話人だけが見ます。会員どうしの場には表示名だけが出ます。
      </p>

      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-profile-summary>
        <h2 className="text-xl font-bold text-stone-800">いまの登録内容</h2>
        {blocks.map(([heading, rows]) => (
          <div key={heading} className="mt-5">
            <h3 className="text-base font-bold text-stone-700">{heading}</h3>
            <dl className="mt-2 grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2 text-base sm:text-lg">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-stone-500">{k}</dt>
                  <dd className="text-stone-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {consented && <p className="mt-4 text-sm text-stone-500">利用目的に同意した日：{consented}</p>}
      </section>

      <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">登録内容を変える</h2>
        <div className="mt-5">
          <ProfileForm
            initial={{
              fullName: profile.fullName,
              displayName: profile.displayName,
              registrantType: profile.registrantType,
              proxyRelation: profile.proxyRelation,
              patientIsMinor: profile.patientIsMinor,
              ageBand: profile.ageBand,
              gender: profile.gender,
              prefecture: profile.prefecture,
            }}
            choices={PROFILE_CHOICES}
            save={saveMyProfile}
          />
        </div>
      </section>

      <ResearchContactSection
        consentLabel={consentLabelOf(currentConsentText('research_contact'))}
        options={researchOptions}
        status={research}
        save={saveResearchContact}
        withdraw={withdrawResearchContact}
      />
      {/* 届いている治験・研究の案内（2026-10-03。B 層の方にだけ DB が案件を返す）。機能フラグ TRIAL_NOTICES が on のときだけ */}
      {isFeatureEnabled('TRIAL_NOTICES') && (
        <p className="mt-3 text-base" data-notices-link>
          <Link href="/demo/community/notices" className="text-orange-700 hover:underline">
            届いている治験・研究の案内を見る
          </Link>
        </p>
      )}

      {/* 参加を希望した患者会（2026-10-02）。取り消しもここから。機能フラグ WISHES が on のときだけ */}
      {isFeatureEnabled('WISHES') && (
      <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-my-wishes-section>
        <h2 className="text-xl font-bold text-stone-800">となりへの参加を希望した患者会</h2>
        {myWishes === null ? (
          <p className="mt-3 text-base text-rose-700">読み込めませんでした。時間をおいて、もう一度お試しください。</p>
        ) : myWishes.length === 0 ? (
          <p className="mt-3 text-base text-stone-600">ありません。</p>
        ) : (
          <MyWishList wishes={myWishes} back="profile" />
        )}
      </section>
      )}

      {/* 自分の投稿・コメント（いま在籍している会の、消していないもの。2026-10-02） */}
      <MyContentsSection items={myContents} />

      {/* 「病気がわかるまでの道のり」の自分の回答（JOURNEY_SURVEY が on ちょうどのときだけ。閲覧モードはこの画面に来ない） */}
      {isJourneyEnabled() && (
        <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-journey-section>
          <h2 className="text-xl font-bold text-stone-800">{JOURNEY_TITLE}</h2>
          <p className="mt-3 text-base text-stone-600 leading-relaxed">回答した内容を確かめたり、取り消したりできます。</p>
          <Link href="/demo/community/journey" className="mt-4 inline-block text-base text-orange-700 hover:underline">
            自分の回答を確認・取り消す
          </Link>
        </section>
      )}

      {/* 会を抜けることと、アカウントの削除は別物（文言で区別する。2026-10-01 ファウンダー指示） */}
      <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-account-section>
        <h2 className="text-xl font-bold text-stone-800">退会とアカウントの削除</h2>
        <p className="mt-3 text-base text-stone-600 leading-relaxed">
          1 つの会だけを抜けるときは、その会のページの末尾にある「この会を退会する」から行えます。会員情報は残ります。
        </p>
        <Link
          href="/demo/community/account/delete"
          className="mt-5 inline-block rounded-2xl border border-rose-300 bg-white px-6 py-3 text-base font-semibold text-rose-700 hover:bg-rose-50"
        >
          アカウントを削除する（すべての会員情報を消す）
        </Link>
      </section>
    </div>
  )
}
