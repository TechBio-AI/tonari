// 注意書きの箱。暖色で、身構えさせない。

import { Heart, Info } from 'lucide-react'

export function Notice({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'gentle'
  title?: string
  children: React.ReactNode
  className?: string
}) {
  const styles =
    tone === 'gentle'
      ? { box: 'bg-rose-50 border-rose-100 text-stone-800', icon: 'text-rose-400' }
      : { box: 'bg-amber-50 border-amber-100 text-stone-800', icon: 'text-amber-500' }
  const Icon = tone === 'gentle' ? Heart : Info

  return (
    <div className={`border rounded-2xl p-5 sm:p-6 ${styles.box} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 text-base leading-relaxed space-y-2">
          {title && <p className="font-semibold">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}
