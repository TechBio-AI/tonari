// Jestのセットアップファイル
// テスト環境の初期設定

// testing-library/jest-dom のカスタムマッチャー
require('@testing-library/jest-dom')

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// windowオブジェクトのモック（@jest-environment node のテストでは window が無いので飛ばす）
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
}

// fetchのモック（必要に応じて）
global.fetch = jest.fn()

// コンソールエラーの抑制（テスト中は不要なエラーを非表示）
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})


