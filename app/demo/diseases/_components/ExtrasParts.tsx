// 家族への情報・医療者向けの資材で共通の部品。表示だけ（入力から計算・判定する処理は持たない）。

import type { ExtrasFact } from '@/lib/portal/disease-extras'

export const EXTRAS_NOT_READY = '準備中です。'

/** 医療者向けの資材の冒頭に固定で出す文 */
export const CLINICIANS_LEAD = '一般的な情報であり、個別の患者の判断に使うものではありません。'

/**
 * 印刷時に [data-print-target] の中だけを紙に出す。
 * レイアウト（ヘッダー・フッター）には手を入れず、見えなくするだけで済ませる。
 */
export const PRINT_ONLY_TARGET_CSS = `
@media print {
  @page { size: A4; margin: 14mm 14mm; }
  body * { visibility: hidden; }
  [data-print-target], [data-print-target] * { visibility: visible; }
  [data-print-target] { position: absolute; left: 0; top: 0; width: 100%; }
}
`

export function PrintOnlyTargetStyle() {
  return <style dangerouslySetInnerHTML={{ __html: PRINT_ONLY_TARGET_CSS }} />
}

export function ExtrasSection({
  title,
  lead,
  children,
  className = '',
}: {
  title: string
  lead?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 ${className}`}>
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      {lead && <p className="mt-2 text-base text-stone-500 leading-relaxed">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function NotReady() {
  return <p className="text-base sm:text-lg text-stone-600">{EXTRAS_NOT_READY}</p>
}

/** 出典とは別のリンク（例：施設検索）。出典の文が案内している先 */
export function FactLink({ link }: { link: NonNullable<ExtrasFact['link']> }) {
  return (
    <a
      data-fact-link
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-2 text-base text-orange-700 underline break-all"
    >
      {link.label}
    </a>
  )
}

/** 文と出典リンク（出典のドメインを表示）。evidence は型に無いので出ない */
export function FactList({ facts }: { facts: ExtrasFact[] }) {
  return (
    <ul className="space-y-3">
      {facts.map((f, i) => (
        <li key={i} className="text-base sm:text-lg text-stone-700 leading-relaxed">
          {f.text}
          {f.link && <FactLink link={f.link} />}
          <a
            href={f.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-orange-700 hover:underline break-all"
          >
            （出典：{new URL(f.sourceUrl).hostname}）
          </a>
        </li>
      ))}
    </ul>
  )
}
