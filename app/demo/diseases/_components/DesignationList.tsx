// 制度の目印（指定難病・小児慢性特定疾病）
//
// 出所は照合表の exact だけ（lib/portal/disease-designation.ts）。
// 知識ファイルの description 末尾の「指定難病NNN。」も data/disease_summaries の nanbyo_number も読まない
// （前者は一致率が低い。後者は全件 null で、2026-09-25 に照合表へ一本化した）。
//
// 置き場所は 2 つある（2026-09-25 ファウンダー指示）:
//   - 詳細 11 疾患  … 既存の「制度と支援」の中身として（概要側には出さない）
//   - それ以外      … 「病気の概要」の中、「公式情報」の直前に「制度」の小見出しで
// 同じページに二重に出さないため、呼ぶ側はどちらか一方だけにすること。

import { ExternalLink } from 'lucide-react'

import { hasDesignation, type DiseaseDesignation } from '@/lib/portal/disease-designation'

/** 概要の中に出すときの小見出し */
export const DESIGNATION_TITLE = '制度'
export const DESIGNATION_LEAD = 'この病気は、次の制度の対象として国の一覧に載っています。'
export const designationNanbyouLabel = (kokujiNo: number) => `指定難病（告示番号 ${kokujiNo}）`
export const DESIGNATION_SHOUMAN_LABEL = '小児慢性特定疾病の対象'

/** 確定分が無いときに出す従来の文 */
export const DESIGNATION_NOT_READY =
  '指定難病の番号や医療費助成の情報は、出典を確かめながら準備しています。'

/**
 * 群で紐付いた疾患の文言。★ いまは使わない（ファウンダーの ○× 反映後に出す）。
 * 文言だけ先に決めておく（2026-09-25 指示）。
 */
export const designationNanbyouGroupLabel = (groupName: string, kokujiNo: number | null) =>
  kokujiNo === null
    ? `${groupName}の一部として指定難病`
    : `${groupName}の一部として指定難病（告示番号 ${kokujiNo}）`

/**
 * 同じ行き先かどうか。末尾のスラッシュと前後の空白だけ均す（それ以上は推測しない）。
 * 照合表由来の URL は「公式情報」の links と同じ出所なので、多くは文字列が完全に一致する。
 */
function sameUrl(a: string, b: string): boolean {
  const norm = (u: string) => u.trim().replace(/\/+$/, '')
  return norm(a) === norm(b)
}

function DesignationLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-base text-orange-700 hover:underline"
    >
      {children}
      <ExternalLink className="w-4 h-4" />
    </a>
  )
}

/**
 * 確定している目印を並べる。確定分が無ければ null を返す（見出しごと出さないため、
 * 呼ぶ側が hasDesignation で判断してもよい）。
 * 群（designation.nanbyouGroup）はここでは出さない。
 *
 * officialUrls は、同じページの「公式情報」に出ているリンク先。
 * 行き先が同じなら制度側はリンクにせず素の文字にする（同じ URL を 2 回リンクで出さない。2026-09-26 指示）。
 */
export function DesignationList({
  designation,
  officialUrls = [],
}: {
  designation: DiseaseDesignation
  officialUrls?: readonly string[]
}) {
  if (!hasDesignation(designation)) return null
  const item = (url: string, label: string) =>
    officialUrls.some((u) => sameUrl(u, url)) ? (
      <span className="text-base text-stone-700">{label}</span>
    ) : (
      <DesignationLink href={url}>{label}</DesignationLink>
    )
  return (
    <>
      <p className="text-base text-stone-500 leading-relaxed">{DESIGNATION_LEAD}</p>
      <ul className="mt-3 space-y-2" data-disease-designation>
        {designation.nanbyou && (
          <li>{item(designation.nanbyou.url, designationNanbyouLabel(designation.nanbyou.kokujiNo))}</li>
        )}
        {designation.shouman && <li>{item(designation.shouman.url, DESIGNATION_SHOUMAN_LABEL)}</li>}
      </ul>
    </>
  )
}
