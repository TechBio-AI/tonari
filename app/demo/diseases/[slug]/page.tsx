// 病気のページ
//
// 出す情報は知識ファイル・診療科の重ね書き・患者向けの要約（data/disease_summaries/）・HPO にあるものだけ。
// 空の項目は見出しごと出さない（見出しだけ立てて中身を想像させないため）。
//
// 構成（2026-09-13 ファウンダー指示）:
//   1. この病気について（description そのまま。将来書き直す）
//   2. よくある症状（5〜8 個、患者の言葉。頻度は区別しない）
//   3. 治療について（薬剤名は出さない）
//   4. 相談できる診療科
//   5. 制度と支援（指定難病番号があれば。無ければ「準備中」）
//   6. 患者会
//   7. 家族と医療者への情報（入口だけ。data/disease_extras/<slug>.json がある疾患だけ出す）
//   ▸ くわしい症状の一覧（HPO 全件、頻度順、体の系統の見出しつき。折りたたみ）
// 「よくある症状」と「くわしい症状の一覧」は別のもの。
//
// 病気の概要（data/disease_overviews/<idx>.json。2026-09-24 ファウンダー指示）:
//   - 11 疾患は二階建て。上の「患者の言葉」版（1〜3）の下、「相談できる診療科」の前に置く
//   - それ以外は「くわしい説明（準備中）」の位置に置く。JSON が無ければ従来の「準備中」のまま
//   - 引き方は slug → 知識ファイル上の位置 → idx。JSON の病名は使わない（見出しは知識ファイルの現在名）
//
// 構造化データ（JSON-LD。lib/portal/disease-jsonld.ts）を両方のページに埋め込む。
// 概要が無い疾患は name／alternateName／url だけ。前者は患者の言葉、後者は医学用語（HPO の日本語ラベルそのまま）。

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, ExternalLink, Users } from 'lucide-react'

import { getDiseaseExtras } from '@/lib/portal/disease-extras'
import { getDemoDisease, getDiseaseStub, listAllDiseases, type DemoSpecialty, diseaseSlugFromName } from '@/lib/portal/diseases'
import { HPO_ATTRIBUTION_JA } from '@/lib/portal/hpo-overlay'
import { getDiseaseOverviewForKnowledgeRecord, type DiseaseOverview as DiseaseOverviewData } from '@/lib/portal/disease-overviews'
import { designationOf, hasDesignation } from '@/lib/portal/disease-designation'
import { exactOrphaCodeOf } from '@/lib/portal/orpha-exact'
import { patientGroupsFor, type PatientGroup } from '@/lib/portal/patient-groups'
import { absoluteUrl, diseasePath } from '@/lib/portal/site-url'
import { Furigana } from '../../_components/Furigana'
import { Notice } from '../../_components/Notice'
import { DiseaseJsonLd } from '../_components/DiseaseJsonLd'
import { DiseaseOverview } from '../_components/DiseaseOverview'
import { NanbyoHospitalsLink } from '../_components/NanbyoHospitalsLink'
import {
  DESIGNATION_NOT_READY,
  DesignationList,
} from '../_components/DesignationList'
import { ASK_YOUR_DOCTOR, NO_GROUP_YET } from '../../_lib/wording'
import { wishTargetByName } from '../../wish/_lib/targets'
import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import diseaseIndexJson from '@/data/disease_index.json'
import { WISH_BUTTON_LABEL } from '../../wish/_lib/format'
import { WishWaiting } from '../../wish/_components/WishWaiting'
import { WAITING_LABEL } from '../../wish/_components/NotJoinedGroups'

/**
 * 患者会がまだ「となり」に参加していない病気の一文と、「となりへの参加を希望する」「希望している方：…」
 * （2026-10-02 ファウンダー指示。2026-10-03 に全疾患へ広げた）。
 * 希望の画面は公開層の一覧のすべての病気にある（app/demo/wish/_lib/targets.ts）。番号表に無い病気だけは文だけにする。
 * 人数は開いたあとに読む（このページは静的。WishWaiting）
 */
function NoGroupYet({ diseaseName }: { diseaseName: string }) {
  // 機能フラグ WISHES（既定 off）が閉じていれば、文だけ（ボタン・人数を出さない）
  const target = isFeatureEnabled('WISHES') ? wishTargetByName(diseaseName) : null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-no-group-yet>
      <p className="text-base sm:text-lg text-stone-600">{NO_GROUP_YET}</p>
      {target && (
        <Link
          href={`/demo/wish/${target.idx}`}
          className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100"
          data-wish-link
        >
          {WISH_BUTTON_LABEL}
        </Link>
      )}
      {target && <WishWaiting idx={target.idx} />}
    </div>
  )
}

/**
 * 「患者会」欄の中身（2026-10-04。data/patient_groups の tonari_status でそろえる）
 *   - "joined" の団体 … 会のページへのリンク（今までどおり）
 *   - "not_joined" の団体 … 「患者会「○○」があります（となり未参加）」と公式サイトへのリンク。
 *     参加している団体が無ければ、その下に「となりへの参加を希望する」と人数（WISHES が on のとき）
 *   - どちらも無い … NoGroupYet（今までどおり）
 */
function GroupsOfDisease({ diseaseName, groups }: { diseaseName: string; groups: PatientGroup[] }) {
  const joined = groups.filter((g) => g.tonariStatus === 'joined')
  const notJoined = groups.filter((g) => g.tonariStatus === 'not_joined')
  if (joined.length === 0 && notJoined.length === 0) return <NoGroupYet diseaseName={diseaseName} />
  const target = joined.length === 0 && isFeatureEnabled('WISHES') ? wishTargetByName(diseaseName) : null
  return (
    <>
      {joined.length > 0 && (
        <ul className="space-y-3">
          {joined.map((g) => (
            <li key={g.id}>
              <Link
                href={`/demo/groups/${encodeURIComponent(g.id)}`}
                className="inline-flex items-center gap-2 text-base sm:text-lg text-stone-800 hover:text-orange-700 hover:underline"
              >
                <Users className="w-5 h-5 text-amber-600 flex-shrink-0" />
                {g.name}
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {notJoined.length > 0 && (
        <ul className={`space-y-3 ${joined.length > 0 ? 'mt-3' : ''}`} data-not-joined-groups>
          {notJoined.map((g) => (
            <li key={g.id} className="text-base sm:text-lg text-stone-700" data-not-joined-group>
              <span>患者会「{g.name}」があります（となり未参加）</span>
              {g.url && (
                <a href={g.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-base text-orange-700 hover:underline" data-official-link>
                  公式サイト
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {target && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/demo/wish/${target.idx}`}
            className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100"
            data-wish-link
          >
            {WISH_BUTTON_LABEL}
          </Link>
          <WishWaiting idx={target.idx} label={WAITING_LABEL} />
        </div>
      )}
    </>
  )
}

/** 公開の「病気ごとの参加の状況」の、この病気の行へ（2026-10-03。固定 ID が無い病気には出さない） */
function ParticipationLink({ diseaseName }: { diseaseName: string }) {
  const id = wishTargetByName(diseaseName)?.diseaseId
  if (!id) return null
  return (
    <Link href={`/demo/participation#${id}`} className="mt-3 inline-block text-base text-orange-700 hover:underline" data-participation-link>
      この病気の参加の状況を見る
    </Link>
  )
}

export const dynamic = 'force-static'

// 951 件すべてを事前生成する（2026-09-26 ファウンダー指示。docs/DEPLOY_CHECKLIST_2026-09-26.md の 2）。
//
// もともとは 11 疾患だけを事前生成し、残りは初回アクセス時に描画していた。
// その描画には知識ファイル（data/knowledge/comprehensive_rare_diseases_knowledge.json）を実行時に読む必要があるが、
// ビルドが本番に含めるファイルの一覧にそれが入っておらず、本番で落ちるおそれがあった。
// 全件を事前生成すれば、実行時に知識ファイルを読む経路そのものが無くなる。
//
// 2026-10-03: dynamicParams を false から true に戻した（日本語の病名のページが dev で全部 404 になっていたため）。
//   dev では、リクエストのパス（URL エンコードのまま。params.slug にも "%E3%82%BF…" のまま届く）と、
//   generateStaticParams の値（デコード済みの "ターナー症候群"）を文字列のまま比べ、一致しないと描画前に 404 にする
//   （node_modules/next/dist/server/base-server.js の staticPaths.includes(staticPathKey)。Next.js 14.2.33）。
//   英字の固定 slug（11 疾患）だけが一致するので開けていた。
// 一覧に無い slug は、描画の最初に番号表（data/disease_index.json。import で読み込むので実行時に fs を使わない）で
// 確かめて 404 にする（知識ファイルを読む前に止める。dynamicParams を false にしていた目的はこれで保つ）。
export const dynamicParams = true

export function generateStaticParams() {
  // slug は DEMO_DISEASES の 11 件が固定 slug、それ以外は病名そのもの（listAllDiseases が両方返す）
  return listAllDiseases().map((d) => ({ slug: d.slug }))
}

const AGE_SCOPE_LABEL: Record<DemoSpecialty['ageScope'], string | null> = {
  child: '子ども',
  adult: '大人',
  any: null,
}

function Section({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      {lead && <p className="mt-2 text-base text-stone-500 leading-relaxed">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-base sm:text-lg text-stone-700 leading-relaxed">
          <span className="text-orange-400 flex-shrink-0">・</span>
          {t}
        </li>
      ))}
    </ul>
  )
}

/**
 * くわしい説明がまだ無い病気のページ。病名・別名・患者会の有無だけ。説明文と ORPHA 番号は出さない。
 *
 * ただし日本語の病名が無い病気には、病名の下に日本語の説明を添える（2026-09-13 ファウンダー判定）。
 * 日本語名を我々が作ると「この事業が作った病名」が定着してしまうため、病名は英語のまま残し、説明だけを出す。
 */
function DiseaseStubPage({
  name,
  reading,
  aliases,
  nameNote,
  overview,
}: {
  name: string
  reading: string | null
  aliases: string[]
  nameNote: { noteJa: string; source: string } | null
  overview: DiseaseOverviewData | null
}) {
  const designation = designationOf(name)
  const groups = patientGroupsFor(name)
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <DiseaseJsonLd
        name={name}
        aliases={aliases}
        url={absoluteUrl(diseasePath(diseaseSlugFromName(name)))}
        overview={overview}
        orphaCode={exactOrphaCodeOf(name)}
      />
      <Link href="/demo/diseases" className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700">
        <ArrowLeft className="w-4 h-4" />
        病気の一覧にもどる
      </Link>

      <header className="mt-5 pb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
          {name}
          <Furigana name={name} reading={reading} />
        </h1>
        {nameNote && (
          <p className="mt-3 text-base sm:text-lg text-stone-700 leading-relaxed">{nameNote.noteJa}</p>
        )}
        {aliases.length > 0 && (
          <p className="mt-2 text-base text-stone-500 leading-relaxed">別名：{aliases.join('、')}</p>
        )}
      </header>

      <div className="space-y-5">
        <Section title="患者会">
          <GroupsOfDisease diseaseName={name} groups={groups} />
          <ParticipationLink diseaseName={name} />
        </Section>

        {overview ? (
          <DiseaseOverview overview={overview} designation={designation} />
        ) : (
          <Section title="くわしい説明">
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
              この病気の説明・検査・治療の文章は、出典を確かめながら準備しています。
            </p>
          </Section>
        )}

        <Section title="相談できる診療科">
          <p className="text-base sm:text-lg text-stone-600">準備中です。</p>
        </Section>
        <NanbyoHospitalsLink />
      </div>

      <Notice tone="gentle" className="mt-8">
        <p>{ASK_YOUR_DOCTOR}</p>
      </Notice>
    </div>
  )
}

/** 番号表にある slug（デコード済み）。一覧に無い slug を、知識ファイルを読む前に 404 にするため */
const KNOWN_SLUGS = new Set((diseaseIndexJson as { diseases: { slug: string }[] }).diseases.map((d) => d.slug))

/** params.slug は dev ではエンコードのまま、事前生成ではデコード済みで届く。どちらでもデコード済みにそろえる */
function decodedSlug(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

export default function DiseasePage({ params }: { params: { slug: string } }) {
  const slug = decodedSlug(params.slug)
  if (slug === null || !KNOWN_SLUGS.has(slug)) notFound()
  const disease = getDemoDisease(slug)
  if (!disease) {
    const stub = getDiseaseStub(encodeURIComponent(slug))
    if (!stub) notFound()
    return (
      <DiseaseStubPage
        name={stub.name}
        reading={stub.reading}
        aliases={stub.aliases}
        nameNote={stub.nameNote}
        overview={getDiseaseOverviewForKnowledgeRecord(stub.name)}
      />
    )
  }

  const groups = patientGroupsFor(disease.name)
  const overview = getDiseaseOverviewForKnowledgeRecord(disease.name)
  const designation = designationOf(disease.name)
  const extras = getDiseaseExtras(disease.slug)

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <DiseaseJsonLd
        name={disease.name}
        aliases={getDiseaseStub(encodeURIComponent(disease.name))?.aliases ?? []}
        url={absoluteUrl(diseasePath(disease.slug))}
        overview={overview}
        orphaCode={exactOrphaCodeOf(disease.name)}
      />
      <Link
        href="/demo/diseases"
        className="inline-flex items-center gap-1.5 text-base text-stone-500 hover:text-orange-700"
      >
        <ArrowLeft className="w-4 h-4" />
        病気の一覧にもどる
      </Link>

      <header className="mt-5 pb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
          {disease.name}
          <Furigana name={disease.name} reading={disease.reading} />
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-stone-500">
          {disease.nameEn && <span>{disease.nameEn}</span>}
          {disease.orphaCode && <span className="tabular-nums">{disease.orphaCode}</span>}
        </div>
      </header>

      <div className="space-y-5">
        {/* 1. この病気について */}
        {disease.description && (
          <Section title="この病気について">
            <p className="text-base sm:text-lg text-stone-700 leading-loose">{disease.description}</p>
          </Section>
        )}

        {/* 2. よくある症状（患者の言葉。頻度は区別しない） */}
        {disease.commonSymptoms.length > 0 && (
          <Section
            title="よくある症状"
            lead="この病気でよく報告されている症状です。すべての人に、すべてが起きるわけではありません。"
          >
            {disease.symptomsPreface && (
              <p className="mb-4 text-base text-stone-600 leading-relaxed">{disease.symptomsPreface}</p>
            )}
            <Bullets items={disease.commonSymptoms.map((s) => s.text)} />
          </Section>
        )}

        {/* 3. 治療について（薬剤名は出さない） */}
        {disease.treatmentSummary.length > 0 && (
          <Section title="治療について">
            <Bullets items={disease.treatmentSummary} />
            <p className="mt-4 text-base text-stone-500 leading-relaxed">
              どの治療を行うかは、一人ひとりの状態によって違います。くわしくは主治医にお聞きください。
            </p>
          </Section>
        )}

        {/* 病気の概要（二階建ての下の階。JSON が無ければ出さない） */}
        {/* designation は渡さない。詳細 11 疾患は下の「制度と支援」に一本化する（2026-09-25 指示） */}
        {overview && <DiseaseOverview overview={overview} />}

        {/* 4. 相談できる診療科 */}
        {(disease.referralSpecialties.length > 0 || disease.entrySpecialties.length > 0) && (
          <Section title="相談できる診療科">
            {disease.referralSpecialties.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {disease.referralSpecialties.map((s, i) => {
                  const scope = AGE_SCOPE_LABEL[s.ageScope]
                  return (
                    <li
                      key={`${s.specialtyName}-${i}`}
                      className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-base text-emerald-900"
                    >
                      {s.specialtyName}
                      {scope && <span className="ml-1.5 text-sm text-emerald-700">（{scope}）</span>}
                    </li>
                  )
                })}
              </ul>
            )}
            {disease.entrySpecialties.length > 0 && (
              <div className={disease.referralSpecialties.length > 0 ? 'mt-6 border-t border-stone-100 pt-5' : ''}>
                <p className="font-semibold text-stone-800 text-base sm:text-lg">最初にかかりやすい科</p>
                <p className="mt-1 text-base text-stone-500 leading-relaxed">
                  紹介先ではありません。この病気だと分かる前に、症状の見え方からこれらの科にかかることが多い、という記録です。
                </p>
                <ul className="mt-3 space-y-3">
                  {disease.entrySpecialties.map((s, i) => (
                    <li key={`${s.specialtyName}-${i}`} className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                      <p className="font-semibold text-stone-800 text-base sm:text-lg">{s.specialtyName}</p>
                      {s.note ? (
                        <p className="mt-1 text-base text-stone-600 leading-relaxed">{s.note}</p>
                      ) : (
                        <p className="mt-1 text-base text-stone-400">理由の記載はまだありません。</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}
        <NanbyoHospitalsLink />

        {/*
          5. 制度と支援
          中身は照合表（_match_table.json）の exact だけ。data/disease_summaries の nanbyo_number は読まない
          （全件 null で、2026-09-25 に照合表へ一本化した）。確定分が無ければ従来の文のまま。
          同じページの「病気の概要」の公式情報と行き先が同じ URL なら、制度側はリンクにしない（2026-09-26 指示）。
        */}
        <Section title="制度と支援">
          {hasDesignation(designation) ? (
            <DesignationList designation={designation} officialUrls={(overview?.links ?? []).map((l) => l.url)} />
          ) : (
            <p className="text-base sm:text-lg text-stone-600">{DESIGNATION_NOT_READY}</p>
          )}
        </Section>

        {/* 6. 患者会 */}
        <Section title="患者会">
          <GroupsOfDisease diseaseName={disease.name} groups={groups} />
          <ParticipationLink diseaseName={disease.name} />
          <Link href="/demo/groups" className="mt-4 inline-block text-base text-orange-700 hover:underline">
            患者会の一覧を見る
          </Link>
        </Section>

        {/* 家族への情報・医療者向けの資材（data/disease_extras/ に中身がある疾患だけ。2026-10-02 指示） */}
        {extras && (
          <Section title="家族と医療者への情報">
            <ul className="space-y-3">
              {[
                { href: `/demo/diseases/${disease.slug}/family`, label: '家族への情報' },
                { href: `/demo/diseases/${disease.slug}/for-clinicians`, label: '医療者向けの資材' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-2 text-base sm:text-lg text-stone-800 hover:text-orange-700 hover:underline"
                  >
                    {l.label}
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ▸ くわしい症状の一覧（HPO 全件、頻度順、見出しつき。医学用語のまま。折りたたみ） */}
        {disease.hpoSymptoms.length > 0 && (
          <details className="group rounded-3xl bg-white border border-stone-200 p-6 sm:p-8">
            <summary className="cursor-pointer list-none flex items-center gap-2 text-xl font-bold text-stone-800">
              <ChevronRight className="w-5 h-5 text-stone-400 transition-transform group-open:rotate-90" />
              くわしい症状の一覧（{disease.hpoSymptoms.length}件）
            </summary>
            <p className="mt-3 text-base text-stone-500 leading-relaxed">
              医学の用語で整理された、この病気で報告されている症状のすべてです。体の場所ごとに分け、報告の多い順に並べています。
              上の「よくある症状」より細かく、専門的です。医師や、くわしく知りたい方のためのものです。
            </p>
            <div className="mt-5 space-y-5">
              {disease.hpoHeadingGroups.map((g) => (
                <div key={g.key}>
                  <p className="font-semibold text-stone-800 text-base sm:text-lg">{g.labelJa}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {g.symptoms.map((s) => (
                      <li
                        key={s.hpoId}
                        className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-1.5 text-base text-stone-700"
                      >
                        {s.labelJa}
                        {s.frequencyJa && <span className="ml-1.5 text-sm text-stone-500">（{s.frequencyJa}）</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-stone-500 leading-relaxed">{HPO_ATTRIBUTION_JA}</p>
          </details>
        )}
      </div>

      <Notice tone="gentle" className="mt-8">
        <p>ここにあるのは、この病気についての一般的な情報です。</p>
        <p>{ASK_YOUR_DOCTOR}</p>
      </Notice>
    </div>
  )
}
