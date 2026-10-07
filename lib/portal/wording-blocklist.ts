/**
 * /demo（患者・家族向け）の禁止表現（docs/wording-blocklist-demo.txt と同じ語）をアプリの中で使うための写し
 *
 * scripts/lint-wording.sh と app/demo/__tests__/wording.test.tsx はリポジトリのファイルを検査するが、
 * 運営が画面から書く文（治験・研究の案内の summary など）は DB に入るので、そちらでは検査できない。
 * 保存するサーバー処理でこの一覧を使って止める（supabase/migrations/20261024_trial_notices.sql の注記）。
 *
 * 本番の実行時には docs/ のファイルを読めない前提なので、語はここに定数で持つ。
 * 一致は lib/portal/__tests__/trial-notices-ops.test.ts が docs のファイルと照らして確かめる
 * （docs のファイルだけを変えるとテストが止める。そのときは、ここも同じに直す）。
 * クライアントの部品からも読めるよう、fs や Supabase を import しない。
 */

export const WORDING_BLOCKLIST_DEMO: readonly string[] = [
  'あなたは',
  '可能性が高い',
  '疑われます',
  '該当します',
  '診断されます',
  '最有力',
  '第1位',
  '確率',
  '診断します',
  '診断できます',
  '診断する',
  '診断して',
]

/** 文に含まれる禁止表現（部分一致。docs の書式どおり）。無ければ空 */
export function findBlockedWords(text: string, words: readonly string[] = WORDING_BLOCKLIST_DEMO): string[] {
  return words.filter((w) => text.includes(w))
}
