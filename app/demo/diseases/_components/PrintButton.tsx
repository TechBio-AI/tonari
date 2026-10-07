'use client'

// 印刷ボタン。ブラウザの印刷を開くだけ。何も送らない・保存しない。

import { Printer } from 'lucide-react'

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-base text-stone-700 hover:bg-stone-50"
    >
      <Printer className="w-5 h-5" />
      {label}
    </button>
  )
}
