// X 連鎖の遺伝のしかたの静的な図（父が患者の場合／母が患者の場合）。
//
// 計算はしない。入力も受けない。決まった図を出すだけ。
// 子どものマスの文は data/disease_extras/<slug>.json の family.diagram（出典を照合した文）から出す。
// 文の無いマスは「準備中」のまま（図の枠だけ）。

import type { InheritanceDiagramCells } from '@/lib/portal/disease-extras'

import { EXTRAS_NOT_READY } from './ExtrasParts'

const CASES = [
  { key: 'father', title: '父が患者の場合' },
  { key: 'mother', title: '母が患者の場合' },
] as const

function Box({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-center">
      <p className="text-base font-semibold text-stone-800">{label}</p>
      {note && <p className="mt-1 text-sm text-stone-600 leading-relaxed">{note}</p>}
    </div>
  )
}

export function InheritanceDiagram({ cells }: { cells: InheritanceDiagramCells }) {
  return (
    <div data-inheritance-diagram className="grid gap-4 sm:grid-cols-2">
      {CASES.map((c) => (
        <figure key={c.key} className="rounded-2xl border border-stone-200 p-4">
          <figcaption className="text-base font-semibold text-stone-800">{c.title}</figcaption>
          <div className="mt-3 flex gap-2">
            <Box label="父" />
            <Box label="母" />
          </div>
          <p aria-hidden className="my-2 text-center text-stone-400">↓</p>
          <div className="flex gap-2">
            <Box label="息子" note={cells[c.key].son?.text ?? EXTRAS_NOT_READY} />
            <Box label="娘" note={cells[c.key].daughter?.text ?? EXTRAS_NOT_READY} />
          </div>
        </figure>
      ))}
    </div>
  )
}
