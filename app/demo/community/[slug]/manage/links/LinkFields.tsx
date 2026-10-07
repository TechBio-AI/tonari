// リンクの入力欄（世話人。作成と編集で共通）。見せ方だけ。検査はサーバー（lib/portal/group-events.ts）と DB。

import { LINK_NOTE_MAX, LINK_TITLE_MAX, LINK_URL_MAX } from '@/lib/portal/group-events'

const inputClass =
  'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200'
const labelClass = 'mt-5 block text-base font-semibold text-stone-800'

export function LinkFields({ initial }: { initial: { title: string; url: string; note: string } }) {
  return (
    <>
      <label htmlFor="link-title" className={labelClass}>
        題（必須）
      </label>
      <input id="link-title" name="title" type="text" required maxLength={LINK_TITLE_MAX} defaultValue={initial.title} className={inputClass} />
      <label htmlFor="link-url" className={labelClass}>
        URL（必須。http:// か https:// で始まるもの）
      </label>
      <input id="link-url" name="url" type="url" required maxLength={LINK_URL_MAX} defaultValue={initial.url} placeholder="https://" className={inputClass} />
      <label htmlFor="link-note" className={labelClass}>
        ひとこと（なくてもかまいません）
      </label>
      <textarea id="link-note" name="note" maxLength={LINK_NOTE_MAX} rows={3} defaultValue={initial.note} className={inputClass} />
    </>
  )
}
