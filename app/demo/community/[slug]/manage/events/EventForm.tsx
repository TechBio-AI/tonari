'use client'

// 行事の作成・編集のフォーム（世話人。/manage/events と /manage/events/[id]）。見せ方と入力の補助だけ。
//
// 「公開ページにも出す」（is_public。既定は入れない）:
//   - チェックの横に常に PUBLIC_NOTICE（公開すると会の公式ページにも出ること）を出す
//   - チェックを入れていて、オンライン参加の URL も入っているときだけ PUBLIC_URL_WARNING を出す
//     （URL を公開するかは世話人の判断。止めはしない）
// 入力の検査はサーバー（../../../actions → lib/portal/group-events.ts）と DB でも行う。

import { useState } from 'react'

import {
  EVENT_BODY_MAX,
  EVENT_PLACE_MAX,
  EVENT_TITLE_MAX,
  EVENT_URL_MAX,
  PUBLIC_NOTICE,
  PUBLIC_URL_WARNING,
} from '@/lib/portal/group-events'

const inputClass =
  'mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200'
const labelClass = 'mt-5 block text-base font-semibold text-stone-800'

export interface EventFormValues {
  title: string
  body: string
  /** datetime-local の値（日本時間） */
  startsAt: string
  endsAt: string
  place: string
  onlineUrl: string
  isPublic: boolean
}

export const EMPTY_EVENT: EventFormValues = {
  title: '',
  body: '',
  startsAt: '',
  endsAt: '',
  place: '',
  onlineUrl: '',
  isPublic: false,
}

export function EventForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>
  initial: EventFormValues
  submitLabel: string
}) {
  const [isPublic, setIsPublic] = useState(initial.isPublic)
  const [onlineUrl, setOnlineUrl] = useState(initial.onlineUrl)
  const urlWillBePublic = isPublic && onlineUrl.trim() !== ''

  return (
    <form action={action}>
      <label htmlFor="event-title" className={labelClass}>
        題（必須）
      </label>
      <input id="event-title" name="title" type="text" required maxLength={EVENT_TITLE_MAX} defaultValue={initial.title} className={inputClass} />

      <label htmlFor="event-starts" className={labelClass}>
        始まり（必須）
      </label>
      <input id="event-starts" name="startsAt" type="datetime-local" required defaultValue={initial.startsAt} className={inputClass} />

      <label htmlFor="event-ends" className={labelClass}>
        終わり（なくてもかまいません）
      </label>
      <input id="event-ends" name="endsAt" type="datetime-local" defaultValue={initial.endsAt} className={inputClass} />

      <label htmlFor="event-place" className={labelClass}>
        場所（なくてもかまいません）
      </label>
      <input id="event-place" name="place" type="text" maxLength={EVENT_PLACE_MAX} defaultValue={initial.place} className={inputClass} />

      <label htmlFor="event-url" className={labelClass}>
        オンライン参加の URL（なくてもかまいません）
      </label>
      <input
        id="event-url"
        name="onlineUrl"
        type="url"
        maxLength={EVENT_URL_MAX}
        value={onlineUrl}
        onChange={(e) => setOnlineUrl(e.target.value)}
        placeholder="https://"
        className={inputClass}
      />

      <label htmlFor="event-body" className={labelClass}>
        内容（必須）
      </label>
      <textarea id="event-body" name="body" required maxLength={EVENT_BODY_MAX} rows={6} defaultValue={initial.body} className={inputClass} />

      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <label className="flex items-start gap-3 text-base font-semibold text-stone-800">
          <input
            type="checkbox"
            name="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 h-5 w-5 accent-orange-600"
          />
          <span>公開ページにも出す</span>
        </label>
        <p data-public-notice className="mt-2 text-sm text-stone-600">
          {PUBLIC_NOTICE}
        </p>
        {urlWillBePublic && (
          <p data-public-url-warning role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base font-semibold text-stone-800">
            {PUBLIC_URL_WARNING}
          </p>
        )}
      </div>

      <button type="submit" className="mt-6 rounded-2xl bg-orange-600 px-6 py-3 text-base font-semibold text-white hover:bg-orange-700">
        {submitLabel}
      </button>
    </form>
  )
}
