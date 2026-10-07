/**
 * HPO 由来の症状の見出し分け（折りたたみ「くわしい症状の一覧」用）
 *
 * 確かめること:
 *   1. 派生ファイルが 11 疾患の表示対象 HPO ID をすべて持ち、HPO のバージョンが記録されている
 *   2. 1 症状は 1 見出しにだけ入り、全件が漏れなく出る（「その他」は現時点で 0 件）
 *   3. 承認した対応表どおりに落ちる代表例（docs/hpo_symptom_headings_proposal_2026-09-13.md）
 *   4. 判定は純関数で、上書き表が最優先
 */
import { getDemoDisease, DEMO_DISEASES } from '../diseases'
import { getHpoCategories, headingFor, headingOf, HPO_HEADINGS, HPO_HEADING_OVERRIDES } from '../hpo-categories'
import { displayableHpoSymptoms, getHpoOverlay } from '../hpo-overlay'

describe('派生ファイル', () => {
  test('11 疾患の表示対象 HPO ID をすべて持ち、バージョンが記録されている', () => {
    const cats = getHpoCategories()
    expect(cats.meta.hpo_version).toBe('hp/releases/2026-06-23')
    for (const e of Object.values(getHpoOverlay().entries)) {
      for (const s of displayableHpoSymptoms(e)) {
        expect(cats.entries[s.hpo_id]).toBeDefined()
        expect(cats.entries[s.hpo_id].label_en).toBe(s.label_en)
      }
    }
  })
})

describe('見出し分け', () => {
  test('見出しの鍵は重複しない。最後は「その他」', () => {
    const keys = HPO_HEADINGS.map((h) => h.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(HPO_HEADINGS[HPO_HEADINGS.length - 1].key).toBe('other')
  })

  test('11 疾患の全件が 1 つの見出しに入り、漏れも重複も無い。「その他」は 0 件', () => {
    for (const { slug } of DEMO_DISEASES) {
      const d = getDemoDisease(slug)!
      const grouped = d.hpoHeadingGroups.flatMap((g) => g.symptoms.map((s) => s.hpoId))
      expect(grouped.sort()).toEqual(d.hpoSymptoms.map((s) => s.hpoId).sort())
      expect(new Set(grouped).size).toBe(grouped.length)
      expect(d.hpoHeadingGroups.some((g) => g.key === 'other')).toBe(false)
      for (const g of d.hpoHeadingGroups) expect(g.symptoms.length).toBeGreaterThan(0)
    }
  })

  test('見出しの順は HPO_HEADINGS の順。中は頻度順', () => {
    const order = HPO_HEADINGS.map((h) => h.key)
    for (const { slug } of DEMO_DISEASES) {
      const d = getDemoDisease(slug)!
      const idx = d.hpoHeadingGroups.map((g) => order.indexOf(g.key))
      expect(idx).toEqual([...idx].sort((a, b) => a - b))
      for (const g of d.hpoHeadingGroups) {
        const ranks = g.symptoms.map((s) => s.frequencyRank)
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
      }
    }
  })

  test.each([
    ['HP:0001744', 'Splenomegaly', 'liver_spleen'], // HPO 上は免疫系だが患者には脾臓
    ['HP:0002240', 'Hepatomegaly', 'liver_spleen'],
    ['HP:0001399', 'Hepatic failure', 'liver_spleen'], // 肝胆道系の生理学的異常（HP:0025155）経由
    ['HP:0001903', 'Anemia', 'blood'],
    ['HP:0001873', 'Thrombocytopenia', 'blood'],
    ['HP:0003656', 'Decreased beta-glucocerebrosidase level', 'lab'],
    ['HP:0003281', 'Increased circulating ferritin concentration', 'lab'],
    ['HP:0001945', 'Fever', 'lab'], // 体温調節が代謝配下。誤分類だが折りたたみの中なので許容（2026-09-13）
    ['HP:0002829', 'Arthralgia', 'body'], // HPO では疼痛の下だけ
    ['HP:0012378', 'Fatigue', 'body'],
    ['HP:0002653', 'Bone pain', 'bone'],
    ['HP:0002757', 'Recurrent fractures', 'bone'],
    ['HP:0000486', 'Strabismus', 'eye_ear'],
    ['HP:0002015', 'Dysphagia', 'nervous'], // 神経系と消化器系。神経を先に当てる
    ['HP:0003701', 'Proximal muscle weakness', 'muscle'],
    ['HP:0000256', 'Macrocephaly', 'head'], // 頭・顔を骨・関節より先に当てる
    ['HP:0000823', 'Delayed puberty', 'growth'], // 成長をホルモンより先に当てる
  ])('%s %s → %s', (id, en, key) => {
    expect(headingOf(id, en).key).toBe(key)
  })

  test('派生ファイルに無い ID は「その他」。英語ラベルの laboratory は検査', () => {
    expect(headingOf('HP:9999999', 'Something').key).toBe('other')
    expect(headingFor('HP:9999999', [], 'Abnormal laboratory finding').key).toBe('lab')
  })

  test('上書き表は空（2026-09-13 ルール通りで進める判定）。足したら最優先になる', () => {
    expect(Object.keys(HPO_HEADING_OVERRIDES)).toEqual([])
    // 純関数の判定: 心血管系 + 免疫系（扁桃）は心臓・血管に落ちる
    expect(headingFor('HP:0100765', ['HP:0001626', 'HP:0002715'], 'Abnormality of the tonsils').key).toBe('heart')
  })
})
