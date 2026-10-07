// 文言だけの静的ページ（運営について・患者会の皆さまへ）の本文。
// 見出し・段落・リンクを content.ts から受け取り、プライバシーのページと同じ箱で並べる。

import Link from 'next/link'

export type TextSection = {
  readonly id: string
  readonly title: string
  readonly body: readonly string[]
  readonly links?: readonly { readonly label: string; readonly href: string }[]
}

export function TextSections({ sections }: { sections: readonly TextSection[] }) {
  return (
    <div className="mt-10 space-y-6">
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-9">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800">{s.title}</h2>
          <div className="mt-5 space-y-4 text-base sm:text-lg text-stone-600 leading-loose">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.links && (
              <ul className="space-y-2 pl-1">
                {s.links.map((l) =>
                  l.href.startsWith('/') ? (
                    <li key={l.href}>
                      <Link href={l.href} className="text-orange-700 hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">
                        {l.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
