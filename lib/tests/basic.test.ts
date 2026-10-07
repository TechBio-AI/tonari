// 基本的なテストケース
// テスト環境が正しく動作することを確認

describe('基本的なテスト環境', () => {
  test('Jestが正しく動作している', () => {
    expect(1 + 1).toBe(2)
  })

  test('文字列操作が正しく動作している', () => {
    const str = 'テスト'
    expect(str.length).toBe(3)
  })

  test('配列操作が正しく動作している', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(1)
  })
})


