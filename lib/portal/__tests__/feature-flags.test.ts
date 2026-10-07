/**
 * 本番で開くまで閉じておく機能のフラグ（lib/portal/feature-flags.ts）
 *   - 一覧は WISHES・TRIAL_NOTICES・OPS の 3 つ
 *   - 既定（環境変数なし）は 3 つとも off
 *   - 'on' ちょうどのときだけ開く
 */
import { FEATURE_FLAG_NAMES, isFeatureEnabled } from '../feature-flags'

test('一覧は WISHES・TRIAL_NOTICES・OPS', () => {
  expect([...FEATURE_FLAG_NAMES].sort()).toEqual(['OPS', 'TRIAL_NOTICES', 'WISHES'])
})

test.each(FEATURE_FLAG_NAMES)('%s は既定で off（環境変数なし）', (flag) => {
  expect(isFeatureEnabled(flag, {})).toBe(false)
})

test.each(FEATURE_FLAG_NAMES)('%s はテスト実行中の process.env でも off', (flag) => {
  expect(process.env[flag]).toBeUndefined()
  expect(isFeatureEnabled(flag)).toBe(false)
})

test.each(FEATURE_FLAG_NAMES)("%s は 'on' ちょうどのときだけ開く", (flag) => {
  for (const v of ['', 'off', 'ON', 'On', ' on', 'on ', 'true', '1', 'yes']) {
    expect(isFeatureEnabled(flag, { [flag]: v })).toBe(false)
  }
  expect(isFeatureEnabled(flag, { [flag]: 'on' })).toBe(true)
})

test('1 つを開いても、ほかは閉じたまま', () => {
  expect(isFeatureEnabled('WISHES', { WISHES: 'on' })).toBe(true)
  expect(isFeatureEnabled('TRIAL_NOTICES', { WISHES: 'on' })).toBe(false)
  expect(isFeatureEnabled('OPS', { WISHES: 'on' })).toBe(false)
})
