import Link from 'next/link'
import { Stethoscope, Shield, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">


        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ブランド */}
          <div>
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">となり</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 max-w-md">
              希少疾患や難病と生きる人が、疾患をこえて集まる場所です。
            </p>
          </div>

          {/* となりの案内 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-3">
              となりの案内
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/demo/diseases" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  病気のことを調べる
                </Link>
              </li>
              <li>
                <Link href="/demo/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  このサイトについて
                </Link>
              </li>
            </ul>
          </div>

          {/* [2026-09-26] 「製薬企業向け」の列は、製薬フォローアップを別リポジトリ hozon-pharma-followup へ切り出したため外した */}
          {/* 注意事項 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-3">
              重要な注意事項
            </h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  病気一般の情報を、出典とともに伝えます
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  医療に関する判断は、主治医にご相談ください
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} となり
          </p>
          <p className="text-xs text-gray-500 mt-2 md:mt-0">
            病気は違っても、困りごとは似ている。
          </p>
        </div>
      </div>
    </footer>
  )
}