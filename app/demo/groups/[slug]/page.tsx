// 患者会のページ（公開）
//
// 出すのは data/patient_groups/patient_groups.json にあるものと、会が「公開ページにも出す」としたお知らせ・行事だけ。
// 実在の会について、仮の文を書かない（事実でないことを書かないため）。
// slug は JSON の id。JSON に無い slug でも、会の新設で作られた会（public_groups。共通契約 2026-10-03 の E）なら
// その場で出す（dynamicParams = true。紹介は「準備中」）。どちらにも無い slug は 404。
//
// 紹介（2026-10-02 ファウンダー指示）:
//   - intro（公式サイトだけを出典にした下書き。status draft_unreviewed）を出す。ページ冒頭に INTRO_DRAFT_NOTICE。
//     各文の末尾に出典（公式サイトの URL）。読み方は ../_lib/intro.ts（出典が公式サイトでない文は出さない）。
//   - 入会のご案内は、intro に無ければ「公式サイトをご覧ください」。
//   - intro が無い団体（facts が 0 件）は、紹介文・活動内容・連絡先・入会のご案内を「準備中」のまま。
// 公開のお知らせ・これからの公開の行事:
//   表 public_group_items を anon で group_slug で引く（../_lib/public-activity.ts。書いた人の情報は読まない・出さない）。
//   無ければ節ごと出さない。行事の online_url はそのまま出す（世話人は公開時に注意を受けている）。
//   静的生成を保ち、600 秒ごとに作り直す（revalidate）。
// 関連ページ: 疾患ページ・家族への情報・医療者向け（中身がある疾患だけ）・相談窓口（/demo/support-centers。別担当が作成中）。
// tonari_status が "not_joined" の団体（2026-10-04）: 紹介などは同じように出し、会員エリアの節の代わりに
//   「この会は、まだ「となり」に参加していません」と、病気ごとの希望の画面への入口（WISHES が on のとき）を出す。公開のお知らせ・行事は読まない。
// となりの会員エリア: 参加は患者会からの招待が必要（新しくアカウントは作れない）。ログインの入口は「すでに会員の方」にだけ付ける。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, KeyRound, Users } from 'lucide-react'

import { getPatientGroups, type PatientGroup } from '@/lib/portal/patient-groups'
import { slugOf } from '@/lib/portal/diseases'
import { getDiseaseExtras } from '@/lib/portal/disease-extras'
import { Notice } from '../../_components/Notice'
import { INTRO_DRAFT_NOTICE, readGroupIntro, type IntroFact } from '../_lib/intro'
import { listPublicActivity, type PublicEvent, type PublicNotice } from '../_lib/public-activity'
import { fetchPublicGroups, type PublicGroup } from '../../_lib/contract-db'
import { wishTargetByDiseaseId, wishTargetByName } from '../../wish/_lib/targets'
import { WISH_BUTTON_LABEL } from '../../wish/_lib/format'
import { WishWaiting } from '../../wish/_components/WishWaiting'
import { WAITING_LABEL } from '../../wish/_components/NotJoinedGroups'
import { isFeatureEnabled } from '@/lib/portal/feature-flags'

export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 600

const NOT_READY = '準備中'
const SEE_OFFICIAL_SITE = '公式サイトをご覧ください'

export function generateStaticParams() {
  return getPatientGroups().map((g) => ({ slug: g.id }))
}

function getGroupBySlug(slug: string): PatientGroup | null {
  const id = decodeURIComponent(slug)
  return getPatientGroups().find((g) => g.id === id) ?? null
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const g = getGroupBySlug(params.slug)
  return { title: g ? `${g.name}｜患者会` : '患者会' }
}

function Section({ title, children, ...rest }: { title: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className="mt-10" {...rest}>
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      <div className="mt-3 text-base sm:text-lg text-stone-700 leading-loose">{children}</div>
    </section>
  )
}

function NotReady() {
  return <p className="text-stone-400">{NOT_READY}</p>
}

/** 紹介の文。各文の末尾に出典（公式サイトの URL） */
function Facts({ facts }: { facts: IntroFact[] }) {
  return (
    <ul className="space-y-3">
      {facts.map((f, i) => (
        <li key={i} data-intro-fact>
          {f.text}
          <span className="ml-1 text-sm text-stone-500">
            （出典：
            <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-orange-700 hover:underline" data-source>
              {f.sourceUrl}
            </a>
            ）
          </span>
        </li>
      ))}
    </ul>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d)
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${v('year')}年${v('month')}月${v('day')}日`
}

function NoticesSection({ notices }: { notices: PublicNotice[] }) {
  return (
    <Section title="公開のお知らせ" data-public-notices>
      <ul className="space-y-4">
        {notices.map((n, i) => (
          <li key={i} className="rounded-2xl bg-white border border-stone-200 p-5">
            <p className="text-lg font-semibold text-stone-800">{n.title}</p>
            {n.date && <p className="mt-1 text-sm text-stone-500">{formatDate(n.date)}</p>}
            {n.body && <p className="mt-2 text-base text-stone-700 leading-relaxed whitespace-pre-line">{n.body}</p>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function EventsSection({ events }: { events: PublicEvent[] }) {
  return (
    <Section title="これからの公開の行事" data-public-events>
      <ul className="space-y-4">
        {events.map((e, i) => (
          <li key={i} className="rounded-2xl bg-white border border-stone-200 p-5">
            <p className="text-lg font-semibold text-stone-800">{e.title}</p>
            <p className="mt-1 text-sm text-stone-500">
              {formatDate(e.startsAt)}
              {e.endsAt && formatDate(e.endsAt) !== formatDate(e.startsAt) && `〜${formatDate(e.endsAt)}`}
              {e.place && `・${e.place}`}
            </p>
            {e.onlineUrl && (
              <p className="mt-1 text-sm text-stone-600" data-online-url>
                オンライン参加：
                <a href={e.onlineUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-orange-700 hover:underline">
                  {e.onlineUrl}
                </a>
              </p>
            )}
            {e.body && <p className="mt-2 text-base text-stone-700 leading-relaxed whitespace-pre-line">{e.body}</p>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** 会の新設で作られた会（data に無い）の公開ページ。出すのは名前・対象の病気・会員エリアの節だけ（紹介は準備中） */
function NewGroupPage({ pg }: { pg: PublicGroup }) {
  const t = pg.diseaseId ? wishTargetByDiseaseId(pg.diseaseId) : null
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16" data-new-public-group>
      <Link href="/demo/groups" className="inline-flex items-center gap-1 text-base text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" />
        患者会をさがす
      </Link>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">{pg.name}</h1>
      <Section title="紹介文">
        <NotReady />
      </Section>
      <Section title="対象の病気">
        {t ? (
          <Link href={`/demo/diseases/${encodeURIComponent(t.slug)}`} className="inline-block rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-base text-sky-900 hover:bg-sky-100">
            {t.name}
          </Link>
        ) : (
          <NotReady />
        )}
      </Section>
      <MemberAreaSection slug={pg.slug} />
    </div>
  )
}

/** となりにまだ参加していない団体の節（会員エリアの節の代わり） */
function NotJoinedSection({ diseases }: { diseases: string[] }) {
  const wishes = isFeatureEnabled('WISHES')
  const targets = wishes ? diseases.flatMap((d) => (wishTargetByName(d) ? [wishTargetByName(d)!] : [])) : []
  return (
    <section className="mt-10 rounded-3xl border border-amber-300 bg-amber-50 p-6 sm:p-7" data-not-joined>
      <h2 className="text-xl font-bold text-stone-800">となりへの参加</h2>
      <p className="mt-3 text-base text-stone-700 leading-relaxed">この会は、まだ「となり」に参加していません。</p>
      {targets.length > 0 && (
        <ul className="mt-4 space-y-3">
          {targets.map((t) => (
            <li key={t.idx} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={`/demo/wish/${t.idx}`}
                className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100"
                data-wish-link
              >
                {targets.length > 1 ? `${t.name}：${WISH_BUTTON_LABEL}` : WISH_BUTTON_LABEL}
              </Link>
              <WishWaiting idx={t.idx} label={WAITING_LABEL} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** となりの会員エリアの節（招待制。ログインの入口は「すでに会員の方」だけ） */
function MemberAreaSection({ slug }: { slug: string }) {
  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 sm:p-7" data-member-area>
      <h2 className="text-xl font-bold text-stone-800">となりの会員エリア</h2>
      <p className="mt-3 text-base text-stone-600 leading-relaxed">
        会員エリアへの参加は患者会からの招待が必要です。ご希望は会の連絡先へ。
      </p>
      <div className="mt-4">
        <p className="text-base text-stone-600">すでに会員の方</p>
        <Link
          href={`/demo/community/${encodeURIComponent(slug)}`}
          className="mt-1 inline-flex items-center gap-2 text-lg font-medium text-orange-700 hover:text-orange-800"
          data-member-login
        >
          <KeyRound className="w-5 h-5" />
          ログインして会員エリアへ
        </Link>
      </div>
    </section>
  )
}

export default async function PatientGroupPage({ params }: { params: { slug: string } }) {
  const g = getGroupBySlug(params.slug)
  if (!g) {
    // data に無い slug は、会の新設で作られた会（public_groups）にあれば出す。slug の形が違えば読みに行かない
    const slug = (() => {
      try {
        return decodeURIComponent(params.slug)
      } catch {
        return ''
      }
    })()
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound()
    const pg = ((await fetchPublicGroups()) ?? []).find((x) => x.slug === slug)
    if (!pg) notFound()
    return <NewGroupPage pg={pg} />
  }

  const intro = readGroupIntro(g)
  const joined = g.tonariStatus === 'joined'
  // となり未参加の団体には会のお知らせ・行事が無いので読まない
  const { notices, events } = joined ? await listPublicActivity(g.id) : { notices: [], events: [] }

  // 関連ページ（疾患ごと）。家族への情報・医療者向けは、中身がある疾患だけ
  const related = g.diseases.map((name) => {
    const slug = slugOf(name)
    const extras = slug ? getDiseaseExtras(slug) : null
    return {
      name,
      slug,
      family: !!extras,
      clinicians: !!extras && extras.clinicians.organs.some((o) => o.facts.length > 0),
    }
  })

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <Link
        href="/demo/groups"
        className="inline-flex items-center gap-1 text-base text-stone-500 hover:text-stone-700"
      >
        <ArrowLeft className="w-4 h-4" />
        患者会をさがす
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 items-center justify-center flex-shrink-0">
          <Users className="w-7 h-7" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">{g.name}</h1>
      </div>

      {intro && (
        <Notice className="mt-8">
          <p data-intro-notice>{INTRO_DRAFT_NOTICE}</p>
        </Notice>
      )}

      <Section title="紹介文">
        {intro && intro.about.length > 0 ? <Facts facts={intro.about} /> : intro ? <NotReady /> : <TextOrNotReady value={g.description} />}
      </Section>

      <Section title="対象の病気">
        <ul className="flex flex-wrap gap-2">
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
      </Section>

      <Section title="活動内容">
        {intro && intro.activities.length > 0 ? <Facts facts={intro.activities} /> : <NotReady />}
      </Section>

      <Section title="連絡先">
        {intro && intro.contacts.length > 0 ? <Facts facts={intro.contacts} /> : <NotReady />}
        {intro?.contactUrl && (
          <a
            href={intro.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-base text-orange-700 hover:underline"
            data-contact-link
          >
            連絡先のページ（公式サイト）
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <div className="mt-3">
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
            <p className="text-base text-stone-400">公式サイトのURLは、いま確認しています。</p>
          )}
        </div>
      </Section>

      <Section title="入会のご案内">
        {intro ? (
          intro.joining.length > 0 ? (
            <Facts facts={intro.joining} />
          ) : (
            <p data-see-official>{SEE_OFFICIAL_SITE}</p>
          )
        ) : (
          <NotReady />
        )}
      </Section>

      {notices.length > 0 && <NoticesSection notices={notices} />}
      {events.length > 0 && <EventsSection events={events} />}

      <Section title="関連ページ" data-related>
        <ul className="space-y-3">
          {related.map((r) =>
            r.slug ? (
              <li key={r.name}>
                <span className="font-semibold text-stone-800">{r.name}</span>
                <span className="ml-2 inline-flex flex-wrap gap-x-4 gap-y-1">
                  <Link href={`/demo/diseases/${r.slug}`} className="text-orange-700 hover:underline">
                    病気のページ
                  </Link>
                  {r.family && (
                    <Link href={`/demo/diseases/${r.slug}/family`} className="text-orange-700 hover:underline">
                      家族への情報
                    </Link>
                  )}
                  {r.clinicians && (
                    <Link href={`/demo/diseases/${r.slug}/for-clinicians`} className="text-orange-700 hover:underline">
                      医療者向けの情報
                    </Link>
                  )}
                </span>
              </li>
            ) : null
          )}
          <li>
            <Link href="/demo/support-centers" className="text-orange-700 hover:underline">
              相談できる窓口
            </Link>
          </li>
        </ul>
      </Section>

      <Notice className="mt-12">
        <p>
          このページの内容は、会と相談しながら整えています。
          内容の修正のご連絡もお待ちしています。
        </p>
      </Notice>

      {/* となりの会員エリア。新しくアカウントは作れない（招待制）ので、申請の入口は置かない。ログインの入口は会員だけに */}
      {joined ? <MemberAreaSection slug={g.id} /> : <NotJoinedSection diseases={g.diseases} />}
    </div>
  )
}

/** 空文字・空白だけ・null・undefined は「準備中」 */
function TextOrNotReady({ value }: { value: string | null | undefined }) {
  const v = typeof value === 'string' && value.trim() !== '' ? value : null
  return v ? <p className="whitespace-pre-line">{v}</p> : <NotReady />
}
