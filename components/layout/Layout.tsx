'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const isDemo = pathname.startsWith('/demo')

  // デモ画面は独自レイアウトを使用するため、ルートレイアウトのHeader/Footerを非表示にする
  // （[2026-09-26] 製薬企業向けのページ /pharma は別リポジトリ hozon-pharma-followup へ切り出した）
  if (isDemo) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}