// このサイトについて
//
// トップから外した統計・出典・方針を置く場所。少し固くてよい（医療者・メンターが読む）。
// 数字は出典のあるものだけ。出典の無い数字は置かない。

import Link from 'next/link'
import { Clock, Users, Database, Heart } from 'lucide-react'

import { Notice } from '../_components/Notice'

const DIAGNOSTIC_LAG_FACTS = [
  { value: '平均 3.4 年', label: '症状が出てから診断がつくまでにかかった期間' },
  { value: '35 %', label: '診断がつくまでに 5 年以上かかった人の割合' },
  { value: '約 8.2 年', label: '9 年以上かかった群が、専門医療機関を受診するまでの期間' },
] as const

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-9">
      <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-stone-800">
        <span className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6" />
        </span>
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-base sm:text-lg text-stone-600 leading-loose">{children}</div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">このサイトについて</h1>
      <p className="mt-4 text-lg text-stone-600 leading-loose">
        「となり」は、希少疾患や難病と生きる人とその家族のためのサイトです。
        病気をこえて集まれる場所をつくることを目指しています。
      </p>

      <div className="mt-10 space-y-6">
        <Section icon={Clock} title="病名がつくまでに、時間がかかっている">
          <p>
            症状が出てから病名がつくまでの期間は「診断ラグ」と呼ばれます。
            国内の調査では、次のような実態が報告されています。
          </p>
          <dl className="grid gap-4 sm:grid-cols-3 pt-2">
            {DIAGNOSTIC_LAG_FACTS.map((f) => (
              <div key={f.value} className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
                <dt className="text-2xl font-bold text-orange-800 tabular-nums">{f.value}</dt>
                <dd className="mt-2 text-base text-stone-600 leading-relaxed">{f.label}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-stone-500 leading-relaxed">
            出典：JMDC・アレクシオンファーマ共同調査「難病患者の診断ラグに関する実態調査」
          </p>
          <p>
            この期間を少しでも短くするために、症状・検査・相談できる診療科の情報を、
            たどれる形で置いています。
          </p>
        </Section>

        <Section icon={Heart} title="目指していること">
          <p>
            めずらしい病気の患者会は、病気ごとに別々に活動しています。
            患者さんが 10 人しかいない病気もあり、会を作ること自体がむずかしいこともあります。
          </p>
          <p>
            一方で、病院とのつきあい方、学校や仕事、まわりへの伝え方といった日ごろの困りごとは、
            病気が違っても似ています。
          </p>
          <p>
            だから、疾患をこえて集まれる場所をつくります。
            同じ病気の人にも、ちがう病気の人にも出会える場所です。
          </p>
        </Section>

        <Section icon={Users} title="患者会の参加について">
          <p>
            このサイトでは、患者会ごとに「部屋」を用意し、参加してもらう形をとります。
            会の紹介、対応している病気、公式サイトへの案内を、会ごとのページに置きます。
          </p>
          <p>
            1 つの会が複数の病気を扱うことも、そのままの形で載せます。
            会の運営や連絡先は、それぞれの患者会のものです。「となり」が会を代行することはありません。
          </p>
          <p>
            現在は、実在が確認できている団体を仮の形で載せています。
            紹介文はこれから各団体と相談して整えます。
          </p>
        </Section>

        <Section icon={Database} title="情報の出典について">
          <p>病気の情報は、次の公開データをもとにしています。</p>
          <ul className="space-y-3 pl-1">
            <li>
              <span className="font-semibold text-stone-700">Orphanet（Orphadata）</span>
              — 病名と ORPHA 番号。2026 年 6 月 23 日版を使っています。
            </li>
            <li>
              <span className="font-semibold text-stone-700">HPO（Human Phenotype Ontology）</span>
              — 症状の語彙。v2026-06-23 とその日本語訳を使っています。
            </li>
          </ul>
          <p>
            病気ごとの説明・検査・治療の文章は、現在整えている途中です。
            論文（PubMed）や公的なガイドラインなどの出典を 1 件ずつ付けていく作業を進めています。
            出典が確認できていない情報は、順次見直します。
          </p>
          <p>
            相談できる診療科の情報は、診療科名などの一般的な名前だけを載せています。
            特定の病院や医師の名前は載せません。
          </p>
        </Section>
      </div>

      <Notice className="mt-10">
        <p>
          このサイトの情報は、病気について知るためのものです。
          どなたか個人の状態を判定したり、助言したりするものではありません。
        </p>
        <p>
          <Link href="/demo" className="text-orange-700 hover:underline">
            トップページにもどる
          </Link>
        </p>
      </Notice>
    </div>
  )
}
