/** @jest-environment node */
/**
 * 疾患一覧の分け方（2026-09-13: 読みの頭文字で五十音に分ける）
 *
 * 確かめること:
 *   1. 読みがあればその頭文字の行に置く（漢字始まりでも）。読みは推定しない
 *   2. カナで始まる病名は病名そのものを読みにする（濁点・半濁点・小書きを畳む）
 *   3. 読みが無い日本語名は pending（漢字（読みを準備中））。漢字別の鍵は持たない
 *   4. 日本語名を持たない病名は latin（英数）
 *   5. 読みファイルの鍵が知識ファイルの主名に実在する。11 疾患は全部読みがある
 */
import { classifyDiseaseName, DEMO_DISEASES, kanaRowOf, listAllDiseases } from '@/lib/portal/diseases'
import { getDiseaseReadings } from '@/lib/portal/disease-readings'

describe('classifyDiseaseName', () => {
  test.each([
    ['ファブリー病', null, 'kana', 'は', true],
    ['ゴーシェ病', null, 'kana', 'か', true], // 濁点を畳む
    ['ポンペ病', null, 'kana', 'は', true], // 半濁点を畳む
    ['ヴォルフ', null, 'kana', 'あ', true],
    ['軟骨無形成症', 'なんこつむけいせいしょう', 'kana', 'な', true], // 読みがあれば漢字始まりでも五十音
    ['X連鎖性低リン血症性くる病', 'えっくすれんさせいていりんけっしょうせいくるびょう', 'kana', 'あ', true],
    ['遺伝性血管浮腫', null, 'pending', '', true], // 読みが無い漢字始まり
    ['MELAS症候群', null, 'pending', '', true], // 読みが無い英字始まりの日本語名
    ['22q11.2欠失症候群', null, 'pending', '', true],
    ['GIST', null, 'latin', '', false], // 日本語名がまだ無い
    ['TRAPS', null, 'latin', '', false],
  ])('%s（読み %s）→ %s / %s / 日本語名=%s', (name, reading, group, key, ja) => {
    const c = classifyDiseaseName(name, reading)
    expect([c.group, c.key, c.hasJapaneseName]).toEqual([group, key, ja])
  })

  test('読みは読みファイルにあるものだけ持つ。カナ始まりでも推定した読みは持たない', () => {
    expect(classifyDiseaseName('ファブリー病').reading).toBeNull()
    expect(classifyDiseaseName('ファブリー病', 'ふぁぶりーびょう').reading).toBe('ふぁぶりーびょう')
    expect(classifyDiseaseName('軟骨無形成症', 'なんこつむけいせいしょう').reading).toBe('なんこつむけいせいしょう')
    expect(classifyDiseaseName('遺伝性血管浮腫').reading).toBeNull()
  })

  test('読みを推定しない（Aicardi は読みが無ければ準備中）', () => {
    expect(classifyDiseaseName('Aicardi症候群').group).toBe('pending')
  })

  test('kanaRowOf: 小書き・濁点を畳む。カナで始まらなければ null', () => {
    expect(kanaRowOf('ふぁぶりー')).toBe('は')
    expect(kanaRowOf('ぢ')).toBe('た')
    expect(kanaRowOf('ゔ')).toBe('あ')
    expect(kanaRowOf('x')).toBeNull()
  })
})

describe('読み漏れの見張り', () => {
  // 2026-09-13: 951 疾患すべてが五十音に置けるようになった。
  // 疾患を足したときに読みを忘れると、ここが赤くなる。
  test('読みが無いために五十音に置けない疾患が 0 件', () => {
    const stuck = listAllDiseases().filter((d) => d.group !== 'kana')
    expect(stuck.map((d) => d.name)).toEqual([])
  })

  test('読みはひらがなと長音符だけ。記号を含まない', () => {
    for (const [name, r] of getDiseaseReadings()) {
      expect({ name, reading: r.reading }).toEqual({ name, reading: expect.stringMatching(/^[぀-ゟー]+$/) })
    }
  })
})

describe('読みファイル（data/disease_readings/readings.json）', () => {
  test('鍵はすべて知識ファイルの主名に実在し、読みはひらがなだけ', () => {
    const names = new Set(listAllDiseases().map((d) => d.name))
    for (const [name, r] of getDiseaseReadings()) {
      expect(names.has(name)).toBe(true)
      expect(r.reading).toMatch(/^[぀-ゟー]+$/)
      expect([0, 1, 2, 3, 4]).toContain(r.level)
      // 根拠レベルが 1〜4 なら出典を必ず持つ（どこで確かめたかを辿れるように）
      if (r.level > 0) expect(typeof r.source).toBe('string')
    }
  })

  test('くわしい説明がある 11 疾患は全部読みがあり、五十音に置かれる', () => {
    const all = listAllDiseases()
    for (const d of DEMO_DISEASES) {
      const e = all.find((x) => x.name === d.name)!
      expect(e.group).toBe('kana')
      expect(e.reading).toBe(getDiseaseReadings().get(d.name)?.reading)
    }
  })

  test('全件の内訳（知識ファイルの実測）', () => {
    const all = listAllDiseases()
    const count = (g: string) => all.filter((d) => d.group === g).length
    expect(all.length).toBe(951)
    expect(count('kana') + count('pending') + count('latin')).toBe(951)
    // 2026-09-13: 読みを付け終え、「読みを準備中」が 0 件になった
    expect(count('pending')).toBe(0)
    expect(count('kana')).toBe(951)
    // 2026-09-13 の入れ替えで、日本語名を持たない疾患は 19 件から 3 件になった。
    // 残る 3 件は「日本語名を我々が作らない」判定のもので、病名は英語のまま読みだけ付けた。
    // その 3 件も読みで五十音に入るため、「英数」の枠は空になった（タブ自体が出ない）。
    const noJa = all.filter((d) => !d.hasJapaneseName)
    expect(noJa.map((d) => d.name).sort()).toEqual([
      'Quebec Platelet Disorder',
      'Rippling Muscle Disease',
      'Tufting Enteropathy',
    ])
    expect(noJa.every((d) => d.group === 'kana' && d.reading !== null)).toBe(true)
    expect(count('latin')).toBe(0)
    expect(all.filter((d) => d.group === 'pending').every((d) => d.key === '')).toBe(true)
    // 読みが付いた分だけ pending から五十音へ移る。カナ始まり以外で kana にいるのは読みファイルの件数と同じ
    const fromReadings = all.filter((d) => d.group === 'kana' && !/^[぀-ヿ]/.test(d.name)).length
    expect(fromReadings).toBe([...getDiseaseReadings().keys()].filter((n) => !/^[぀-ヿ]/.test(n)).length)
  })
})
