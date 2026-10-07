// 「行事」と「資料・リンク」のページで共通の見せ方（結果の 1 行・削除の確認・外部リンク）。表示だけ。

import { ExternalLink } from 'lucide-react'

import { eventsFlash } from '../_lib/events'

export function EventsFlash({ params }: { params?: { error?: string | string[]; done?: string | string[] } }) {
  const f = eventsFlash(params)
  if (!f) return null
  return (
    <p
      role={f.tone === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-2xl border p-4 text-base ${
        f.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      {f.text}
    </p>
  )
}

/**
 * 外部のページへのリンク。別タブで開き、開いた先から元のページを操作させない（noopener）。
 * 会員エリアの URL（会の slug）を開いた先に渡さないよう noreferrer も付ける
 */
export function ExternalAnchor({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? 'inline-flex items-center gap-1 text-orange-700 hover:underline break-all'}>
      {children}
      <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="sr-only">（別のタブで開きます）</span>
    </a>
  )
}

/** 削除の確認（チェックを入れたときだけ送れる） */
export function DeleteForm({ action, label, note }: { action: (fd: FormData) => void | Promise<void>; label: string; note: string }) {
  return (
    <form action={action} className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <p className="text-base text-stone-700">{note}</p>
      <label className="mt-3 flex items-start gap-3 text-base text-stone-800">
        <input type="checkbox" name="confirm" value="yes" required className="mt-1 h-5 w-5 accent-rose-700" />
        <span>削除することを確かめました</span>
      </label>
      <button type="submit" className="mt-3 rounded-xl bg-rose-700 px-5 py-2 text-base font-semibold text-white hover:bg-rose-800">
        {label}
      </button>
    </form>
  )
}
