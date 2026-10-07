// 病名に添えるふりがな。病名の直後に続けて置き、段を増やさない。
//
// 漢字が読めない利用者のために出す（2026-09-14 ファウンダー指示）。
// 読める文字を読める文字で繰り返すだけになる 14 件には出さない
// （判定は lib/portal/disease-furigana.ts）。

import { shouldShowFurigana } from '@/lib/portal/disease-furigana'

export function Furigana({ name, reading, className = '' }: { name: string; reading: string | null; className?: string }) {
  if (!shouldShowFurigana(name, reading)) return null
  // 病名が主役。ふりがなは一回り小さく、色を薄くする
  return <span className={`ml-1 text-[0.8em] font-normal text-stone-500 ${className}`}>（{reading}）</span>
}
