/**
 * @jest-environment node
 *
 * 運営画面の案件の保存（lib/portal/trial-notices-ops.ts）で、summary に /demo の禁止表現があれば DB に送らないことの検査。
 * DB には接続しない。
 */
import * as fs from 'fs'
import * as path from 'path'

const rpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ rpc: (...a: unknown[]) => rpc(...a) }) }))

import { saveTrialNotice } from '../trial-notices-ops'
import { WORDING_BLOCKLIST_DEMO } from '../wording-blocklist'

const BASE = {
  id: null,
  diseaseId: 'd-1',
  registry: 'jrct',
  registryId: 'jRCT0000000000',
  registryUrl: 'https://jrct.niph.go.jp/',
  phase: null,
}

test('summary に禁止表現があれば保存しない（DB 関数を呼ばず、どの語かを返す）。無ければ保存する', async () => {
  rpc.mockReset().mockResolvedValue({ data: 'new-id', error: null })

  const blocked = await saveTrialNotice({ ...BASE, summary: '成人を対象とした第2相試験です。あなたは参加できる可能性が高いです。' })
  expect(blocked).toEqual({ ok: false, reason: 'blocked_words', words: ['あなたは', '可能性が高い'] })
  expect(rpc).not.toHaveBeenCalled()

  const saved = await saveTrialNotice({ ...BASE, summary: '成人を対象とした第2相試験です。実施地域は関東です。連絡は登録情報のページへ。' })
  expect(saved).toEqual({ ok: true, id: 'new-id' })
  expect(rpc).toHaveBeenCalledWith('upsert_trial_notice', expect.objectContaining({ p_summary: '成人を対象とした第2相試験です。実施地域は関東です。連絡は登録情報のページへ。' }))

  // 語の一覧は docs/wording-blocklist-demo.txt と同じ（docs だけを変えたら、ここで気づく）
  const fromDocs = fs
    .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
  expect([...WORDING_BLOCKLIST_DEMO]).toEqual(fromDocs)
})
