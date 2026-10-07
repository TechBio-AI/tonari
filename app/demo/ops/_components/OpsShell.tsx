// 運営画面の共通の枠（見出し・運営のページのタブ・結果の 1 行）。表示だけ。

import type { Metadata } from 'next'
import Link from 'next/link'

import { isFeatureEnabled } from '@/lib/portal/feature-flags'
import { BLOCKED_WORDS_MESSAGE } from '@/lib/portal/trial-notices-ops'

import { CONTRACT_FAILURE_MESSAGES, isContractFailure } from '../../_lib/contract-db'
import { OPS_DEMO_NOTICE } from '../_lib/samples'

export const OPS_METADATA: Metadata = { title: '運営', robots: { index: false, follow: false } }

const DONE: Record<string, string> = {
  approved: '申請を承認し、会を作りました。',
  rejected: '申請を却下しました。',
  notice_created: '案件を下書きで作りました。',
  notice_updated: '案件を直しました。',
  status_published: '案件を公開しました。',
  status_closed: '案件を終了しました。',
  status_draft: '案件を下書きに戻しました。',
}

export type OpsFlashParams = { error?: string | string[]; done?: string | string[] }

/** ?error= / ?done= → 出す文。知らない値は出さない（URL の文字をそのまま出さない） */
export function opsFlashOf(p?: OpsFlashParams): { tone: 'ok' | 'error'; text: string } | null {
  const error = typeof p?.error === 'string' ? p.error : undefined
  if (error === 'blocked_words') return { tone: 'error', text: BLOCKED_WORDS_MESSAGE }
  if (isContractFailure(error)) return { tone: 'error', text: CONTRACT_FAILURE_MESSAGES[error] }
  const done = typeof p?.done === 'string' ? p.done : undefined
  if (done && Object.prototype.hasOwnProperty.call(DONE, done)) return { tone: 'ok', text: DONE[done] }
  return null
}

type Tab = 'home' | 'wishes' | 'requests' | 'notices' | 'reports'
const TABS: { key: Tab; label: string; href: string }[] = [
  { key: 'home', label: '運営', href: '/demo/ops' },
  { key: 'wishes', label: '参加希望の実数', href: '/demo/ops/wishes' },
  { key: 'requests', label: '会の新設の申請', href: '/demo/ops/requests' },
  { key: 'notices', label: '治験・研究の案件', href: '/demo/ops/notices' },
  { key: 'reports', label: '通報（全会）', href: '/demo/ops/reports' },
]

export function OpsShell({ tab, flash, demo = false, children }: { tab: Tab; flash?: OpsFlashParams; demo?: boolean; children: React.ReactNode }) {
  const f = opsFlashOf(flash)
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16" data-ops>
      {demo && (
        // DEMO_ACCESS: 本番前に削除
        <p role="status" className="mb-8 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base font-semibold text-stone-800 leading-relaxed" data-ops-demo>
          {OPS_DEMO_NOTICE}
        </p>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
        運営{demo && <span className="ml-1 text-lg font-normal text-stone-500" data-sample-mark>（見本）</span>}
      </h1>
      <p className="mt-2 text-sm text-stone-500">運営の方だけが見られる画面です。ここに出る実数は外に出さないでください。</p>
      <nav aria-label="運営のページ" className="mt-6 flex flex-wrap gap-2">
        {TABS.filter((t) => t.key !== 'notices' || isFeatureEnabled('TRIAL_NOTICES')).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === tab ? 'page' : undefined}
            className={`rounded-2xl border px-4 py-2 text-base ${t.key === tab ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-stone-200 text-stone-700 hover:border-orange-300'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {f && (
        <p role={f.tone === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-2xl border p-4 text-base ${f.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {f.text}
        </p>
      )}
      {children}
    </div>
  )
}
