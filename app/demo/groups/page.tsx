// 患者会をさがす（このサイトの主役）
//
// 実在の団体だけを載せる。紹介文と未確認の URL は埋めない（事実でないことを書かないため）。
// 患者会がこのサイトに加わることは「参加」と言う（2026-10-02 ファウンダー指示。以前の言い方と「リクエスト」は使わない）。
// 「となりへの参加を待っている患者会」（2026-10-02。2026-10-03 に言い方をそろえた）: 患者会がまだ参加していない病気ごとに、
//   「となりへの参加を希望する」（/demo/wish/[idx]）と「希望している方：n 人」（public_wish_counts。'10未満' はそのまま）。
//   このページは静的なまま。人数は開いたあとに /demo/wish/counts から読む（../wish/_components/WishWaiting.tsx）。
//   機能フラグ WISHES が off のときは、ボタン・人数・「ほかの病気の患者会を希望する」を出さない（節の見出しと病名は出す）。
// 「ほかの病気の患者会を希望する」（2026-10-03）: 病名検索の部品（../diseases/_components/DiseaseFinder）で病気を選び、
//   その病気の希望の画面へ。
// 参加しているかは data/patient_groups の tonari_status で決める（2026-10-04）。"joined" の団体だけを「参加している患者会」に並べる。
//   "not_joined" の団体の病気は「となりへの参加を待っている患者会」に入れ、病名の横に「患者会「○○」があります（となり未参加）」と出す。
// 会の新設で作られた会（data に無い。public_groups）も、参加している患者会の下に並べる（紹介は準備中。2026-10-04）。患者会がすでに参加している病気は選べるものに入れない（希望の画面がその会へ案内するが、二度手間なので）。

import Link from 'next/link'
import { ChevronRight, ExternalLink, Users, DoorOpen } from 'lucide-react'

import { getJoinedPatientGroups } from '@/lib/portal/patient-groups'
import { DEMO_DISEASES, slugOf } from '@/lib/portal/diseases'
import { Notice } from '../_components/Notice'
import { MemberEntry } from '../_components/MemberEntry'
import { listAllDiseases } from '@/lib/portal/diseases'
import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { withReadiness } from '@/lib/portal/disease-list'
import { notJoinedGroupsOf, participatingGroupsOf, wishTargetByName } from '../wish/_lib/targets'
import { WISH_BUTTON_LABEL } from '../wish/_lib/format'
import { WishWaiting } from '../wish/_components/WishWaiting'
import { NewPublicGroups } from './_components/NewPublicGroups'
import { DiseaseFinder, type FinderItem } from '../diseases/_components/DiseaseFinder'

export const dynamic = 'force-static'

export default function PatientGroupsPage() {
  const groups = getJoinedPatientGroups()
  const covered = new Set(groups.flatMap((g) => g.diseases))
  const withoutGroup = DEMO_DISEASES.filter((d) => !covered.has(d.name))
  // 機能フラグ WISHES（既定 off）。閉じていれば、希望のボタン・人数・「ほかの病気の患者会を希望する」を出さない
  // （このページは静的なので、書き出したときの値で決まる）
  const wishes = isFeatureEnabled('WISHES')
  // ほかの病気（患者会がまだ参加していない、公開層の一覧のすべて）。行き先は希望の画面
  const wishable: FinderItem[] = withReadiness(listAllDiseases(), () => false)
    .filter((d) => participatingGroupsOf(d.name).length === 0)
    .flatMap((d) => {
      const t = wishTargetByName(d.name)
      return t ? [{ ...d, href: `/demo/wish/${t.idx}` }] : []
    })

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="flex items-start gap-4">
        <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 items-center justify-center flex-shrink-0">
          <Users className="w-7 h-7" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">患者会をさがす</h1>
          <p className="mt-3 text-lg text-stone-600 leading-loose">
            同じ病気の人やご家族が集まる会の一覧です。
            1 つの会が、いくつかの病気をいっしょに扱っていることもあります。
          </p>
        </div>
      </div>

      <h2 className="mt-12 flex items-center gap-2 text-xl font-bold text-stone-800">
        <DoorOpen className="w-6 h-6 text-orange-600" />
        参加している患者会
        <span className="ml-1 text-base font-normal text-stone-500">{groups.length} 団体</span>
      </h2>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <li
            key={g.id}
            className="flex flex-col rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-sm"
          >
            <h3 className="text-xl font-bold text-stone-800 leading-snug">
              <Link href={`/demo/groups/${encodeURIComponent(g.id)}`} className="hover:text-orange-700 hover:underline">
                {g.name}
              </Link>
            </h3>

            <div className="mt-4">
              <p className="text-sm text-stone-500">対応している病気</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.diseases.map((d) => {
                  const slug = slugOf(d)
                  return (
                    <li key={d}>
                      {slug ? (
                        <Link
                          href={`/demo/diseases/${slug}`}
                          className="inline-block rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-base text-sky-900 hover:bg-sky-100"
                        >
                          {d}
                        </Link>
                      ) : (
                        <span className="inline-block rounded-xl bg-stone-100 px-3 py-1.5 text-base text-stone-700">
                          {d}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <p className="mt-4 text-base text-stone-500 leading-relaxed">紹介文：{g.description}</p>

            <div className="mt-auto pt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/demo/groups/${encodeURIComponent(g.id)}`}
                className="inline-flex items-center gap-1 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-base font-medium text-orange-800 hover:bg-orange-100 transition-colors"
              >
                この会のページへ
                <ChevronRight className="w-4 h-4" />
              </Link>
              {g.url ? (
                <a
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-base font-medium text-white hover:bg-orange-700 transition-colors"
                >
                  公式サイトを見る
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span className="inline-block text-base text-stone-400">公式サイトのURLは、いま確認しています。</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {/* DB にだけある会（会の新設で作られた会。2026-10-04）。開いたあとに読み、0 件なら何も出さない */}
      <NewPublicGroups />

      {withoutGroup.length > 0 && (
        <section className="mt-12" data-not-yet>
          <h2 className="text-xl font-bold text-stone-800">となりへの参加を待っている患者会</h2>
          <p className="mt-2 text-base sm:text-lg text-stone-600 leading-relaxed">
            次の病気の患者会は、まだ「となり」に参加していません。「この病気の患者会に、となりへ参加してほしい」という希望を登録できます。希望する方の人数は、運営が患者会にお伝えします（お一人お一人の情報は伝えません）。
          </p>
          <ul className="mt-4 space-y-3">
            {withoutGroup.map((d) => {
              const target = wishTargetByName(d.name)
              const notJoined = notJoinedGroupsOf(d.name)
              return (
                <li key={d.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white border border-stone-200 px-4 py-3">
                  <Link href={`/demo/diseases/${d.slug}`} className="text-base text-stone-800 hover:text-orange-700 hover:underline">
                    {d.name}
                  </Link>
                  {notJoined.length > 0 && (
                    <span className="text-sm text-stone-600" data-not-joined-group>
                      患者会
                      {notJoined.map((g) => (
                        <span key={g.id}>
                          「
                          <Link href={`/demo/groups/${encodeURIComponent(g.id)}`} className="text-orange-700 hover:underline">
                            {g.name}
                          </Link>
                          」
                        </span>
                      ))}
                      があります（となり未参加）
                    </span>
                  )}
                  {wishes && target && (
                    <>
                      <Link
                        href={`/demo/wish/${target.idx}`}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100"
                        data-wish-link
                      >
                        {WISH_BUTTON_LABEL}
                      </Link>
                      <WishWaiting idx={target.idx} />
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 4 件（くわしい説明のある病気）の下に、ほかの病気から選ぶ入口。上の節が 0 件になっても出す。WISHES が on のときだけ */}
      {wishes && (
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6" data-wish-other>
        <h2 className="text-lg font-bold text-stone-800">ほかの病気の患者会を希望する</h2>
        <p className="mt-1 mb-4 text-base text-stone-600">病気を選ぶと、その病気の希望の画面へ進みます。</p>
        <DiseaseFinder diseases={wishable} hideReadiness />
      </section>
      )}

      <p className="mt-8 text-base" data-participation-link>
        <Link href="/demo/participation" className="text-orange-700 hover:underline">
          病気ごとの参加の状況を見る
        </Link>
      </p>

      <Notice className="mt-12">
        <p>
          載せているのは実在の団体です。紹介文は、これから各団体と相談して整えます。
          参加のご希望や、内容の修正のご連絡もお待ちしています。
        </p>
      </Notice>

      {/* 会員の入口（1 か所目）。ヘッダーには置かず、このページの末尾に置く */}
      <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 sm:p-7">
        <p className="text-base text-stone-600 leading-relaxed">
          参加している患者会から招待を受けた方は、こちらからお入りいただけます。
        </p>
        <MemberEntry className="mt-3" />
      </section>
    </div>
  )
}
