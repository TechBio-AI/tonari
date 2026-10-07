'use client'

// /demo 専用ヘッダー。患者・家族が最初に見る顔なので、暖色・大きめの文字。
// 旧UI (components/layout/Header.tsx) の import は共有しない。

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

// 並び順は主役の順。患者会が一番上。
const NAV_ITEMS = [
  { href: '/demo/groups', label: '患者会をさがす' },
  { href: '/demo/diseases', label: '病気のことを調べる' },
  { href: '/demo/about', label: 'このサイトについて' },
] as const

export function DemoHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header className="bg-white/90 backdrop-blur border-b border-orange-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex justify-between items-center h-[4.5rem]">
          <Link href="/demo" className="flex items-center gap-3 group">
            {/* ロゴ: 重なり合う 3 つの円 = 病気が違っても集まれる */}
            <span className="relative w-10 h-10 flex-shrink-0" aria-hidden="true">
              <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-amber-300/80" />
              <span className="absolute right-0 top-1 w-6 h-6 rounded-full bg-rose-300/80" />
              <span className="absolute left-2 bottom-0 w-6 h-6 rounded-full bg-sky-300/80" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-stone-800">となり</span>
              <span className="text-xs text-stone-500">病気をこえて、つながる場所</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  isActive(item.href) ? 'text-orange-700' : 'text-stone-600 hover:text-orange-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden text-stone-600 hover:text-orange-700 p-2 -mr-2"
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
          >
            {open ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-orange-100 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-lg font-medium rounded-xl ${
                  isActive(item.href)
                    ? 'text-orange-700 bg-orange-50'
                    : 'text-stone-700 hover:text-orange-700 hover:bg-orange-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
