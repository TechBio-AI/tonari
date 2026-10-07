// プライバシー（会員情報の取り扱い）
//
// 利用目的の文は同意の対象なので、ここで書き直さない。
// app/demo/community/_components/purpose.ts の USAGE_PURPOSE_TEXT をそのまま表示する
// （初回ログイン時の同意画面と同じ文。変えるときは同意を取り直すかをファウンダーが決めてから）。

import type { Metadata } from 'next'

import { COLLECTED_GROUPS, NOT_COLLECTED_TEXT, PRIVACY_SECTIONS } from './content'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'プライバシー — となり',
  description: '会員の方からお預かりする情報と、その取り扱いについて。',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">プライバシー</h1>
      <p className="mt-4 text-lg text-stone-600 leading-loose">
        会員の方からお預かりする情報と、その取り扱いについて書いています。
        病気のことを調べるページは、ログインしなくても使えます。そのときに情報をお預かりすることはありません。
      </p>

      <div className="mt-10 space-y-6">
        <section id="collected" className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-9">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800">お預かりする情報</h2>
          <p className="mt-5 text-base sm:text-lg text-stone-600 leading-loose">
            会員になるときに、次の情報をお預かりします。
          </p>
          {COLLECTED_GROUPS.map((g) => (
            <div key={g.heading} className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-stone-700">{g.heading}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <li key={item} className="rounded-full bg-orange-50 border border-orange-100 px-4 py-1.5 text-base text-stone-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-5 text-base sm:text-lg text-stone-600 leading-loose">{NOT_COLLECTED_TEXT}</p>
        </section>

        {PRIVACY_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-9">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-800">{s.title}</h2>
            <div className="mt-5 space-y-4 text-base sm:text-lg text-stone-600 leading-loose">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
