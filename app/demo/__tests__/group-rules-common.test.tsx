/**
 * 会の約束の「運営の共通文」（app/demo/community/[slug]/_lib/rules.ts）が、
 * docs/site_policy_drafts_2026-09-26.md 第 3 章の導入の 1 文と 6 項目と一字一句同じであることの検査（文を変えない）
 */
import * as fs from 'fs'
import * as path from 'path'

import { COMMON_RULES, COMMON_RULES_LEAD } from '../community/[slug]/_lib/rules'

test('共通文は第 3 章の導入の 1 文と 6 項目のとおり（見出しは太字の部分、本文は「 — 」のあと）', () => {
  const doc = fs.readFileSync(path.join(process.cwd(), 'docs', 'site_policy_drafts_2026-09-26.md'), 'utf-8')
  const ch3 = doc.split('## 3. 会の約束（運営の共通文。会員向け）')[1].split(/\n## /)[0]
  const lines = ch3.split('\n').map((l) => l.trim())
  const items = lines
    .map((l) => l.match(/^\d+\. \*\*(.+?)\*\* — (.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ title: m[1], body: m[2] }))
  expect(items).toHaveLength(6)
  expect([...COMMON_RULES]).toEqual(items)
  expect(lines).toContain(COMMON_RULES_LEAD)
})
