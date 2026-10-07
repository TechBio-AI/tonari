/**
 * 充実度の 3 段階（lib/portal/disease-list.ts の withReadiness）
 *   ● detailed（11 件）＞ ○ overview（有効な概要あり）＞ 無印 pending。並び順は変えない
 */
import { classifyDiseaseName, READINESS_MARK, withReadiness, type DiseaseListEntry } from '../disease-list'

const entry = (name: string, detailed: boolean): DiseaseListEntry => ({
  name,
  aliases: [],
  slug: name,
  detailed,
  ...classifyDiseaseName(name, null),
})

test('11 件は概要があっても ●、概要だけなら ○、どちらも無ければ無印', () => {
  const out = withReadiness(
    [entry('ア病', true), entry('イ病', false), entry('ウ病', false), entry('エ病', true)],
    (n) => n === 'ア病' || n === 'イ病'
  )
  expect(out.map((d) => [d.name, d.readiness])).toEqual([
    ['ア病', 'detailed'],
    ['イ病', 'overview'],
    ['ウ病', 'pending'],
    ['エ病', 'detailed'],
  ])
})

test('マークは ● ○ と無印（null）', () => {
  expect(READINESS_MARK).toEqual({ detailed: '●', overview: '○', pending: null })
})
