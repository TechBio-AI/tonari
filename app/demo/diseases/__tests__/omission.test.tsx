/**
 * Orphanet の定義文を一部省略した概要（summary.omitted: true）は、帰属表示に省略を添える
 * （2026-09-26 ファウンダー指示。docs/DECISIONS.md「Orphanet 定義文に含まれる薬剤名」）
 * 本番データ（data/disease_overviews/）を使う。914 = チロシン血症1型（治療薬名を含む句を省略）
 */
import { render } from '@testing-library/react'

import DiseasePage from '../[slug]/page'
import { ORPHANET_OMISSION_NOTE_JA } from '../_components/DiseaseOverview'

jest.mock('next/navigation', () => ({
  usePathname: () => '/demo/diseases',
  notFound: () => {
    throw new Error('notFound')
  },
}))

const attributionOf = (name: string) => {
  const { container } = render(<DiseasePage params={{ slug: encodeURIComponent(name) }} />)
  const p = container.querySelector('[data-orphanet-attribution]')
  expect(p).not.toBeNull() // どちらも Orphanet を使う概要
  return { p: p!, container }
}

test('省略した概要（idx 914）では帰属表示に「一部省略あり」が出て、Orphanet 由来でも省略の無い概要では出ない', () => {
  const omitted = attributionOf('チロシン血症1型')
  expect(omitted.p.textContent).toContain(ORPHANET_OMISSION_NOTE_JA)
  expect(omitted.container.textContent).toContain('（一部省略）')
  expect(omitted.container.textContent).not.toContain('nitisinone')

  const plain = attributionOf('Rippling Muscle Disease')
  expect(plain.p.textContent).not.toContain(ORPHANET_OMISSION_NOTE_JA)
  expect(plain.container.querySelector('[data-orphanet-omission]')).toBeNull()
})
