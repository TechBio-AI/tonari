/**
 * @jest-environment node
 *
 * next.config.js の安全のための設定
 *   - 画像最適化の経路（/_next/image）を使わない（images.unoptimized: true。docs/npm_audit_2026-10-04.md §2）
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require('../../next.config.js')

// このファイルをモジュールにする（__tests__/root-redirect.test.ts の nextConfig と名前がぶつからないように）
export {}

test('images.unoptimized が true（/_next/image を使わない）', () => {
  expect(nextConfig.images?.unoptimized).toBe(true)
})
