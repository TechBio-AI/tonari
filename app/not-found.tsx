// 見つからないページ（404）。2026-10-03 ファウンダー指示
//
// 本番で Next.js のページとしてここに来るのは /demo 配下だけ（それ以外は middleware.ts が文字だけの 404 を返す）。
// 例: /demo/diseases/<一覧に無い名前>（dynamicParams = false）、/demo/<無いパス>。
// ルートの not-found は app/demo/layout.tsx の外で描画されるので、ヘッダーとフッターは出ない。
// その代わり、病名で探す入口とトップへの道を必ず置く。
// 公開面の表現の方針に従い、「診断」の字は出さない（app/__tests__/not-found.test.tsx で確かめる）。

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fffaf5] text-stone-800 text-[17px] sm:text-lg">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
        <p className="text-sm font-medium text-stone-500">404</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">ページが見つかりません</h1>
        <p className="mt-4 text-stone-600 leading-relaxed">
          アドレスが変わったか、ページがなくなっています。
          病気の名前から探すか、トップページからたどってください。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/demo/diseases"
            className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-6 py-4 font-bold text-white hover:bg-amber-600"
          >
            病名で探す
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-4 font-bold text-stone-700 hover:bg-stone-50"
          >
            トップへ
          </Link>
        </div>
      </div>
    </div>
  )
}
