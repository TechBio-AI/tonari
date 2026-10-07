// トップページ（患者・家族が最初に見る画面）
//
// 統計や医療用語は置かない。それらは /demo/about に。
// 導線の順番は主役の順: 患者会 → 病気のこと。

import Link from 'next/link'
import { Users, BookOpen, ArrowRight } from 'lucide-react'

import { AccountDeletedNotice } from './_components/AccountDeletedNotice'
import { Notice } from './_components/Notice'

/** 重なり合う円。病気が違っても、集まれる場所がある、という絵 */
function GatheringIllustration() {
  return (
    <svg
      viewBox="0 0 320 220"
      className="w-full max-w-sm mx-auto"
      role="img"
      aria-label="いろいろな色の円が重なり合っている絵"
    >
      <circle cx="110" cy="100" r="70" fill="#fcd34d" fillOpacity="0.55" />
      <circle cx="200" cy="100" r="70" fill="#fda4af" fillOpacity="0.55" />
      <circle cx="155" cy="150" r="70" fill="#7dd3fc" fillOpacity="0.55" />
      <circle cx="80" cy="60" r="7" fill="#78350f" fillOpacity="0.5" />
      <circle cx="235" cy="60" r="7" fill="#9f1239" fillOpacity="0.5" />
      <circle cx="155" cy="195" r="7" fill="#0c4a6e" fillOpacity="0.5" />
      <circle cx="155" cy="115" r="9" fill="#ffffff" />
    </svg>
  )
}

const ENTRANCES = [
  {
    href: '/demo/groups',
    icon: Users,
    tint: 'bg-amber-100 text-amber-700',
    title: '患者会をさがす',
    body: '同じ病気の人が集まる会や、いろいろな病気の人が集まる会をさがせます。',
    primary: true,
  },
  {
    href: '/demo/diseases',
    icon: BookOpen,
    tint: 'bg-sky-100 text-sky-700',
    title: '病気のことを調べる',
    body: '病気ごとに、どんな症状があるか、どんな検査や治療があるか、どの科に相談できるかをまとめています。',
    primary: false,
  },
] as const

export default function DemoTopPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6">
      {/* アカウントを削除した直後だけ出る（/demo?account_deleted=1。ブラウザ側で URL を見る。トップは静的のまま） */}
      <AccountDeletedNotice />

      {/* 導入 */}
      <section className="pt-12 sm:pt-16 pb-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 leading-relaxed">
            病気は違っても、
            <br className="sm:hidden" />
            困りごとは似ている。
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-stone-600 leading-loose">
            希少疾患や難病と生きる人が、疾患をこえて集まる場所です。
            <br />
            同じ病気の人にも、ちがう病気の人にも、ここでつながれます。
          </p>
        </div>
        <GatheringIllustration />
      </section>

      {/* 2 つの入口 */}
      <section className="pb-16 space-y-4">
        {ENTRANCES.map((e) => {
          const Icon = e.icon
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`group flex items-start gap-5 rounded-3xl border bg-white p-6 sm:p-7 transition-all hover:shadow-md ${
                e.primary
                  ? 'border-amber-200 shadow-sm hover:border-amber-300'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span
                className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center ${e.tint}`}
              >
                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-stone-800">
                  {e.title}
                  <ArrowRight className="w-5 h-5 text-orange-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </span>
                <span className="block mt-2 text-base sm:text-lg text-stone-600 leading-relaxed">
                  {e.body}
                </span>
              </span>
            </Link>
          )
        })}
      </section>

      {/* なぜ疾患をこえるのか */}
      <section className="pb-16">
        <div className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-10">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800">ここが、みんなの集まる場所になるように</h2>
          <div className="mt-5 space-y-4 text-base sm:text-lg text-stone-600 leading-loose max-w-3xl">
            <p>
              めずらしい病気の患者会は、病気ごとに別々の場所で活動しています。
              患者さんが 10 人しかいない病気もあります。
            </p>
            <p>
              でも、病院とのつきあい方、学校や仕事のこと、まわりへの伝え方。
              日ごろの困りごとは、病気が違っても似ています。
            </p>
            <p>
              このサイトでは、患者会に「部屋」を持ってもらい、
              病気をこえて出会える場所をつくっていきます。
            </p>
          </div>
          <Link
            href="/demo/about"
            className="mt-6 inline-flex items-center gap-1.5 text-base sm:text-lg text-orange-700 font-medium hover:underline"
          >
            このサイトについて、もう少しくわしく
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Notice tone="gentle" className="mb-4">
        <p>体のことで気になることがあれば、かかりつけの先生に相談してください。</p>
      </Notice>
    </div>
  )
}
