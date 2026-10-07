// 常染色体潜性（劣性）の遺伝のしかたの静的な図。
//
// 両親（どちらも保因者）と、子の 4 マス。4 マスのうち 1 つに色を付けて「患者さん」とする。
// 文は data/disease_extras/<slug>.json の family.diagram_ar（出典を照合した文）から出す。
// 残り 3 マスの内訳（保因者か、そうでないか）は出典に無いので、何も書かない。
// 計算はしない。入力も受けない。決まった図を出すだけ。

import type { InheritanceDiagramArCells } from '@/lib/portal/disease-extras'

export const AR_AFFECTED_LABEL = '患者さん'

function ParentBox({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-center">
      <p className="text-base font-semibold text-stone-800">{label}</p>
      <p className="mt-1 text-sm text-stone-600">{note}</p>
    </div>
  )
}

export function InheritanceDiagramAr({ cells }: { cells: InheritanceDiagramArCells }) {
  return (
    <figure data-inheritance-diagram-ar className="rounded-2xl border border-stone-200 p-4">
      <figcaption className="text-base font-semibold text-stone-800">両親がどちらも保因者の場合</figcaption>
      <div className="mt-3 flex gap-2">
        <ParentBox label="父" note={cells.parents.text} />
        <ParentBox label="母" note={cells.parents.text} />
      </div>
      <p aria-hidden className="my-2 text-center text-stone-400">↓</p>
      <ul aria-label="子ども（4 マス）" className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            data-ar-cell={i === 0 ? 'affected' : 'other'}
            className={`h-14 rounded-xl border text-center text-sm flex items-center justify-center ${
              i === 0 ? 'border-orange-300 bg-orange-100 text-orange-900 font-semibold' : 'border-stone-200 bg-white'
            }`}
          >
            {i === 0 ? AR_AFFECTED_LABEL : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base text-stone-700 leading-relaxed">{cells.affected.text}</p>
    </figure>
  )
}
