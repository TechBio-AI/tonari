const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.jsアプリのパスを指定
  dir: './',
})

// Jestのカスタム設定を追加
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/_ARCHIVE_DO_NOT_USE/',
  ],
  modulePathIgnorePatterns: [],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/_ARCHIVE_DO_NOT_USE/**',
  ],
  coverageThreshold: {
    global: {
      // 段階的に引き上げ（現状: statements 36%, branches 27%, lines 37%, functions 33%）
      // Phase 8以降でテスト追加に伴い引き上げ予定
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30,
    },
  },
}

module.exports = createJestConfig(customJestConfig)


