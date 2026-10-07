/** @type {import('next').NextConfig} */
const nextConfig = {
  // transpilePackages は置かない（2026-10-04）。react-markdown・remark-gfm を外した後に残した
  // 'escape-string-regexp' は最上位の node_modules に無くなり、CI の next build が先へ進まなくなったため。
  // macOS Sequoia 15.5 対応設定
  experimental: {
    // Turbopack設定を正しい形式に修正
  },
  // 開発サーバー設定
  async rewrites() {
    return []
  },
  // 入口は /demo。ルートは恒久的に /demo へ寄せる（308）。
  // 旧画面のパス（/auth/**、/pharma/**、/doctor/** 等）はここでは触らない。
  async redirects() {
    return [
      {
        source: '/',
        destination: '/demo',
        permanent: true,
      },
    ]
  },
  // コンパイラ設定（本番環境ではconsole.logを除去）
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // 画像最適化設定
  images: {
    // 画像最適化の経路（/_next/image）を使わない（2026-10-04）。
    // Next 14 の critical（Image Optimization API の RCE。docs/npm_audit_2026-10-04.md §2）は 14.x に修正版が無い。
    // このアプリは next/image を使っていないので、最適化を切っても表示は変わらない。
    // Next 14.2.33 の next-server.js は unoptimized のとき /_next/image に 404 を返す（公式文書には記載なし。
    // Vercel 上での扱いは公開後に DEPLOY_CHECKLIST の確認で見る）。Next 15 へ上げた後も外さなくてよい。
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // 出力設定（Vercelでは不要、Dockerデプロイ時に有効化）
  // output: 'standalone',
  // その他の設定
  poweredByHeader: false,
  reactStrictMode: true,
  // [2026-07-26] 暫定措置: 旧設定は dirs: ['app/(portal)'] だったが、(portal) を
  // _ARCHIVE_DO_NOT_USE/ へ隔離したため対象が消失。lint がビルドを守らない状態（要再設定）。
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 