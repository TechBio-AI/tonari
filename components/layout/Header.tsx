'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Stethoscope, Menu, X } from 'lucide-react'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // 現在のパスがアクティブかどうかを判定
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/demo" className="flex items-center space-x-2 group">
              <Stethoscope className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">となり</span>
                <span className="text-xs text-gray-500">病気をこえて、つながる場所</span>
              </div>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          {/* [2026-09-26] 製薬フォローアップ（/pharma）は別リポジトリ hozon-pharma-followup へ切り出したためリンクを外した。/diseases は隔離 */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/demo"
              className={`font-medium transition-colors ${pathname === '/'
                ? 'text-blue-600'
                : 'text-gray-700 hover:text-blue-600'
                }`}
            >
              ホーム
            </Link>
            <Link
              href="/demo/diseases"
              className={`font-medium transition-colors ${isActive('/demo/diseases')
                ? 'text-blue-600'
                : 'text-gray-700 hover:text-blue-600'
                }`}
            >
              病気のことを調べる
            </Link>
            <Link
              href="/demo/about"
              className={`font-medium transition-colors ${isActive('/demo/about')
                ? 'text-blue-600'
                : 'text-gray-700 hover:text-blue-600'
                }`}
            >
              このサイトについて
            </Link>
          </nav>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2"
              aria-label="メニューを開く"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pb-3">
            <div className="pt-2 space-y-1">
              <Link
                href="/demo"
                className={`block px-3 py-2 text-base font-medium rounded-md ${pathname === '/'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ホーム
              </Link>
              <Link
                href="/demo/diseases"
                className={`block px-3 py-2 text-base font-medium rounded-md ${isActive('/demo/diseases')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                病気のことを調べる
              </Link>
              <Link
                href="/demo/about"
                className={`block px-3 py-2 text-base font-medium rounded-md ${isActive('/demo/about')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                このサイトについて
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}