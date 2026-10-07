'use client'

// 家族に渡す手紙のひな形。
//
// 画面の上で自由に書き換えて、印刷する。それだけ。
// 書いた内容はこの画面のメモリの中にしかない。サーバーにもブラウザ（ストレージ・cookie）にも保存しない。
// 閉じると消える。手紙は本人が自分で渡す前提の文面（ファウンダー承認済みのひな形だけを出す）。
//
// writerNote は手紙を書く本人向けの注記（渡さない選択・渡す時期・相談先）。画面にだけ出し、印刷しない。
//
// 印刷時は手紙だけが紙に出る（PRINT_ONLY_TARGET_CSS。textarea の現在値を印刷用の要素に写す）。

import { useState } from 'react'

import { PrintButton } from './PrintButton'

export const LETTER_NOT_SAVED_NOTE = 'この画面で書いた内容は保存されません。閉じると消えます。'

export function LetterTemplate({ paragraphs, writerNote = [] }: { paragraphs: string[]; writerNote?: string[] }) {
  const [text, setText] = useState(paragraphs.join('\n\n'))
  return (
    <div>
      <div className="print:hidden">
        {writerNote.length > 0 && (
          <div data-writer-note className="mb-4 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-base text-stone-800 leading-relaxed">
            {writerNote.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        )}
        <label htmlFor="family-letter" className="block text-base text-stone-600">
          文面は自由に書き換えられます。
        </label>
        <textarea
          id="family-letter"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="mt-2 w-full rounded-2xl border border-stone-300 p-4 text-base sm:text-lg leading-relaxed text-stone-800"
        />
        <p className="mt-2 text-base text-stone-500">{LETTER_NOT_SAVED_NOTE}</p>
        <div className="mt-4">
          <PrintButton label="手紙を印刷する" />
        </div>
      </div>
      <div data-print-target className="hidden print:block whitespace-pre-wrap text-base leading-loose text-black">
        {text}
      </div>
    </div>
  )
}
