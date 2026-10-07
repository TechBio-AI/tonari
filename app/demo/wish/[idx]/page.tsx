// となりへの参加の希望（/demo/wish/[idx]。2026-10-02 ファウンダー指示。2026-10-03 に全疾患へ広げ、言い方をそろえた）
//
// 患者会がまだ「となり」に参加していない病気について、「この病気の患者会に、となりへ参加してほしい」という希望を受け付ける。
//   - 一覧に無い idx  … 404
//   - 患者会がすでに参加している病気 … 希望の画面を出さず、その会のページへ案内する
//     （data/patient_groups の会と、会の新設で作られた会〔public_groups。2026-10-03〕の両方）
//     data/patient_groups の会は tonari_status が "joined" のものだけ（2026-10-04）。
//   - "not_joined" の団体がある病気 … 希望の画面を出し、冒頭に「患者会「○○」があります（となり未参加）。参加を待っている方：n 人」
//   - 希望済みの方には「この病気の会を作りたい」（会の新設の申請。./new-group）
//   - 未ログイン      … メール欄 → マジックリンク（この導線だけ shouldCreateUser: true）→ 戻ってきたら入力へ
//   - ログイン済み    … そのまま入力（都道府県・立場・この病気の患者会の会員か〔任意〕・同意）→ group_wishes に登録
//   - 登録済み        … 「希望済み」と取り消しのボタン
//   - 取り消した後    … 前の答え（都道府県・立場）を見せて「もう一度希望する」（DB の一意制約で、答えは変えられない）
// 同意の文は lib/portal/consent-texts.ts の 'wish'（同意担当）。登録の前に同意を記録する。
//   - 閲覧モード      … 見本の説明だけ（登録できない。DB は読まない）
// 個人の状態には触れない（病気かどうかを判定・助言しない）。人数（希望している方）は /demo/groups と疾患ページに出す。
// 対象は公開層の疾患一覧すべて（../_lib/targets.ts。data/disease_index.json を import。知識ファイルを実行時に読まない）。

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { PREFECTURES, getMyProfile } from '@/lib/portal/member-profile'

import { getViewer } from '../../_lib/session'
import { Notice } from '../../_components/Notice'
import { createWishAction, resumeWishAction } from '../actions'
import { isWishable, notJoinedGroupsOf, participatingGroupsOf, wishTargetOf, type ParticipatingGroup, type WishTarget } from '../_lib/targets'
import { NotJoinedGroups } from '../_components/NotJoinedGroups'
import { fetchPublicGroups } from '../../_lib/contract-db'
import { SAMPLE_MARK } from '../../community/_components/sample-group'

/** 閲覧モードの、登録済みの見本の答え（架空） */
const SAMPLE_WISH = { prefecture: '東京都', relation: 'family' as const }
import { WISH_BUTTON_LABEL } from '../_lib/format'
import { WISH_CONSENT_LABEL, WISH_CONSENT_TEXT, WISH_RELATIONS, WISH_RELATION_LABELS, listMyWishRows, type MyWish } from '../_lib/wishes'
import { WishFlash, WithdrawWishButton, type WishFlashParams } from '../_components/WishParts'
import { WishEmailForm } from './WishEmailForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'となりへの参加を希望する',
  robots: { index: false, follow: false },
}

const inputClass = 'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800'

function Lead({ t }: { t: WishTarget }) {
  return (
    <p className="mt-4 text-base sm:text-lg text-stone-600 leading-loose">
      「{t.name}」の患者会は、まだ「となり」に参加していません。
      「この病気の患者会に、となりへ参加してほしい」という希望を登録できます。希望する方の人数は、運営が患者会にお伝えします（お一人お一人の情報は伝えません）。
      公開のページには、希望している方の人数を出します（10人未満は「10未満」と出します）。
    </p>
  )
}

function WishForm({ t, prefecture }: { t: WishTarget; prefecture: string | null }) {
  return (
    <form action={createWishAction.bind(null, t.idx)} className="mt-8 space-y-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-wish-form>
      <div>
        <label htmlFor="wish-prefecture" className="block text-base font-semibold text-stone-800">
          お住まいの都道府県
        </label>
        <select id="wish-prefecture" name="prefecture" required defaultValue={prefecture ?? ''} className={inputClass}>
          <option value="" disabled>
            選んでください
          </option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-base font-semibold text-stone-800">あなたの立場</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {WISH_RELATIONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-base text-stone-800">
              <input type="radio" name="relation" value={r} required className="h-5 w-5" />
              {WISH_RELATION_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-stone-800">この病気の患者会の会員ですか（任意）</legend>
        <p className="mt-1 text-sm text-stone-500">このサイトの外の患者会も含みます。答えなくてもかまいません。</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {[
            ['yes', 'はい'],
            ['no', 'いいえ'],
            ['', '答えない'],
          ].map(([v, label]) => (
            <label key={label} className="flex items-center gap-2 text-base text-stone-800">
              <input type="radio" name="isGroupMember" value={v} defaultChecked={v === ''} className="h-5 w-5" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Consent />

      <button type="submit" className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
        {WISH_BUTTON_LABEL}
      </button>
    </form>
  )
}

/** 同意の文（同意担当の 'wish' のいまの版）とチェック */
function Consent() {
  return (
    <div>
      <p className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-700 leading-relaxed" data-wish-consent-text>
        {WISH_CONSENT_TEXT}
      </p>
      <label className="mt-3 flex items-start gap-3 text-base text-stone-800">
        <input type="checkbox" name="consent" value="yes" required className="mt-1 h-5 w-5" data-wish-consent />
        <span>{WISH_CONSENT_LABEL}</span>
      </label>
    </div>
  )
}

/** 取り消した希望の再開（答えは前のまま） */
function ResumeForm({ t, prev }: { t: WishTarget; prev: MyWish }) {
  return (
    <form action={resumeWishAction.bind(null, t.idx)} className="mt-8 space-y-5 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-wish-resume>
      <p className="text-base text-stone-700 leading-relaxed">
        この病気の患者会の、となりへの参加の希望は、取り消しています。前の答え（{prev.prefecture}・{WISH_RELATION_LABELS[prev.relation] ?? prev.relation}）のまま、もう一度希望できます。答えは変えられません。
      </p>
      <Consent />
      <button type="submit" className="rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
        もう一度希望する
      </button>
    </form>
  )
}

/** 患者会がすでに「となり」に参加している病気の案内 */
function AlreadyParticipating({ t, groups }: { t: WishTarget; groups: ParticipatingGroup[] }) {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16" data-wish-participating>
      <Link href="/demo/groups" className="inline-flex items-center gap-1 text-base text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" />
        患者会をさがす
      </Link>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">「{t.name}」の患者会は、「となり」に参加しています</h1>
      <p className="mt-4 text-base sm:text-lg text-stone-600 leading-loose">会のページから、紹介や連絡先をご覧いただけます。</p>
      <ul className="mt-6 space-y-3">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/demo/groups/${encodeURIComponent(g.id)}`} className="text-lg font-medium text-orange-700 hover:underline">
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function WishPage({ params, searchParams }: { params: { idx: string }; searchParams?: WishFlashParams }) {
  // 機能フラグ WISHES（既定 off）が on でなければ 404
  if (!isFeatureEnabled('WISHES')) notFound()
  const t = wishTargetOf(decodeURIComponent(params.idx))
  if (!t) notFound()
  const viewer = await getViewer()
  const demo = viewer?.kind === 'demo'
  // 患者会がすでに参加している病気（data の会と、会の新設で作られた会〔public_groups〕）は、その会へ案内する。
  // 閲覧モードは DB を読まない（public_groups も読まず、data の会だけで判定する）
  const fromData = participatingGroupsOf(t.name)
  const fromDb = !demo && t.diseaseId ? ((await fetchPublicGroups()) ?? []).filter((g) => g.diseaseId === t.diseaseId) : []
  const participating = [...fromData, ...fromDb.filter((g) => !fromData.some((d) => d.id === g.slug)).map((g) => ({ id: g.slug, name: g.name }))]
  if (!isWishable(t) || participating.length > 0) return <AlreadyParticipating t={t} groups={participating} />

  let body: React.ReactNode
  if (demo) {
    // DEMO_ACCESS: 本番前に削除。登録済みの見本（架空の答え。登録・取り消しはできない。DB は読まない。2026-10-04）
    body = (
      <>
        <Notice className="mt-8">
          <p data-wish-demo>
            プロトタイプの閲覧モードです。見本では、となりへの参加の希望を登録・取り消しできません。下は、登録したあとの画面の見本です。
          </p>
        </Notice>
        <section className="mt-6 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-wish-done data-wish-sample>
          <p className="text-lg font-semibold text-stone-800">
            この病気の患者会の、となりへの参加を希望済みです。<span className="ml-1 text-base font-normal text-stone-500" data-sample-mark>{SAMPLE_MARK}</span>
          </p>
          <p className="mt-2 text-base text-stone-600">登録した内容（見本）：{SAMPLE_WISH.prefecture}・{WISH_RELATION_LABELS[SAMPLE_WISH.relation]}</p>
          <p className="mt-2 text-sm text-stone-500">実際の画面では、ここに「希望を取り消す」と「この病気の会を作りたい」が出ます。</p>
        </section>
      </>
    )
  } else if (!viewer) {
    body = (
      <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-800">はじめにメールアドレスを確かめます</h2>
        <p className="mt-2 text-base text-stone-600 leading-relaxed">
          届いたリンクを開くと、この画面に戻って入力を続けられます。患者会の会員エリアに入るためのものではありません（会員エリアは招待制です）。
        </p>
        <WishEmailForm idx={t.idx} />
      </section>
    )
  } else {
    const mine = await listMyWishRows()
    const mineHere = mine?.find((w) => w.diseaseIdx === t.idx)
    if (mine === null) {
      body = <p role="alert" className="mt-8 text-base text-rose-700">いまの登録を読み込めませんでした。時間をおいて、もう一度お試しください。</p>
    } else if (mineHere && mineHere.withdrawn) {
      body = <ResumeForm t={t} prev={mineHere} />
    } else if (mineHere) {
      body = (
        <section className="mt-8 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8" data-wish-done>
          <p className="text-lg font-semibold text-stone-800">この病気の患者会の、となりへの参加を希望済みです。</p>
          <p className="mt-2 text-base text-stone-600">「希望している方」の人数に含まれています。</p>
          <div className="mt-4">
            <WithdrawWishButton idx={t.idx} back="wish" />
          </div>
          <div className="mt-4">
            <Link href={`/demo/wish/${t.idx}/new-group`} className="text-base text-orange-700 hover:underline" data-new-group-link>
              この病気の会を作りたい
            </Link>
          </div>
        </section>
      )
    } else {
      let prefecture: string | null = null
      try {
        prefecture = (await getMyProfile())?.prefecture ?? null
      } catch {
        prefecture = null
      }
      body = <WishForm t={t} prefecture={prefecture} />
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <Link href="/demo/groups" className="inline-flex items-center gap-1 text-base text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" />
        患者会をさがす
      </Link>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-stone-800 leading-snug">「{t.name}」の患者会の、となりへの参加を希望する</h1>
      <Lead t={t} />
      {/* となりにまだ参加していない団体（tonari_status が "not_joined"。2026-10-04） */}
      <NotJoinedGroups groups={notJoinedGroupsOf(t.name)} idx={t.idx} />
      <WishFlash params={searchParams} />
      {body}
      {viewer?.kind === 'member' && (
        <p className="mt-8">
          <Link href="/demo/wish" className="text-base text-orange-700 hover:underline">
            となりへの参加を希望した患者会を見る
          </Link>
        </p>
      )}
    </div>
  )
}
