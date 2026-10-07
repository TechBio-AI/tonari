/**
 * @jest-environment node
 *
 * 同意文（lib/portal/consent-texts.ts）の検査
 *
 *   1. 出した版の文は一字一句固定（書き換えたら落ちる。直すときは新しい版を足し、ここに 1 行足す）
 *   2. 版番号は 1 から連番で、末尾がいまの版
 *   3. 利用目的の画面・プライバシーのページは base のいまの版を出す
 *   4. C 層（stats）と道のり調査（journey）は案（draft）のまま
 */
import {
  CONSENT_KINDS,
  CONSENT_TEXTS,
  consentLabelOf,
  consentTextOf,
  currentConsentText,
} from '@/lib/portal/consent-texts'
import { USAGE_PURPOSE_TEXT, CONSENT_LABEL } from '@/app/demo/community/_components/purpose'

/** 会員に出した（出す）版の文。承認済みの版だけを置く。draft の版は置かない */
const PUBLISHED: Array<[kind: 'base' | 'research_contact' | 'wish', version: number, text: string]> = [
  [
    'base',
    1,
    'お預かりする情報は、会員同士の場の運営と、お住まいの地域の医療機関や患者会の情報を探す助けにのみ使います。' +
      '企業への提供はしません。将来、別の目的で使う場合は改めて同意をお願いします',
  ],
  [
    'base',
    2,
    'お預かりする情報は、会員同士の場の運営と、お住まいの地域の医療機関や患者会の情報を探す助けにのみ使います。' +
      '企業への提供はしません。将来、別の目的で使う場合は改めて同意をお願いします。' +
      '患者さんが18歳未満のときは、保護者の方が法定代理人として同意します。' +
      '18歳以上の患者さんの代わりに登録するときは、ご本人の意思に基づいて代わりに入力します',
  ],
  [
    'base',
    3,
    'お預かりする情報は、患者会ごとの会員の場の運営と、相談窓口のご案内にのみ使います。' +
      'お住まいの都道府県は、相談窓口のご案内と、会ごとの人数の集計に使います。' +
      '世話人は、会員の年代・性別・お住まいの地方などの人数の集計を見ます。集計では、10人未満の数は伏せます。' +
      '行事への参加・不参加は、ご本人と世話人だけが見ます。' +
      '企業への提供はしません。将来、別の目的で使う場合は改めて同意をお願いします。' +
      '患者さんが18歳未満のときは、保護者の方が法定代理人として同意します。' +
      '18歳以上の患者さんの代わりに登録するときは、ご本人の意思に基づいて代わりに入力します',
  ],
  [
    'research_contact',
    1,
    '私の病気に関する研究や治験の案内を受け取ります。案内は当サイトから届き、企業に連絡先は渡りません。いつでも取り消せます',
  ],
  [
    'research_contact',
    2,
    '私の病気に関する研究や治験の案内を受け取ります。' +
      '案内は当サイトの会員エリアに表示されます。参加を考えるときは、私が自分で案内先（公開の登録情報）に連絡します。' +
      '案内に関心があるかどうかを付けると、運営はその人数だけを数えます。' +
      '企業に、私の氏名・連絡先などの個人情報が渡ることはありません。いつでも取り消せます',
  ],
  [
    'wish',
    1,
    '患者会への参加希望を登録します。' +
      'お預かりするのは、メールアドレス・病気・お住まいの都道府県・立場（ご本人かご家族か）・その病気の患者会（当サイトの外の団体）の会員かどうか（任意）です。' +
      '運営が患者会に参加をお願いするときに、希望する方の人数と、都道府県・立場・会員かどうかごとの人数を伝えます。お一人お一人の情報は伝えません。' +
      '公開ページには、10人未満を伏せた人数だけを出します。' +
      '取り消したときと、アカウントを削除したときに消えます。企業に提供することはしません',
  ],
]

describe('出した版の文は書き換えない', () => {
  test.each(PUBLISHED)('%s 版 %i の文が一字一句そのまま', (kind, version, text) => {
    const t = consentTextOf(kind, version)
    expect(t?.text).toBe(text)
    expect(t?.draft).toBeUndefined()
  })
})

describe('版番号', () => {
  test.each([...CONSENT_KINDS])('%s は 1 から連番で、末尾がいまの版', (kind) => {
    const versions = CONSENT_TEXTS[kind].map((t) => t.version)
    expect(versions).toEqual(versions.map((_, i) => i + 1))
    expect(currentConsentText(kind).version).toBe(versions[versions.length - 1])
  })

  test('無い版は null（想像で埋めない）', () => {
    expect(consentTextOf('base', 99)).toBeNull()
  })
})

describe('画面に出す文', () => {
  test('利用目的とチェック欄は base のいまの版', () => {
    expect(USAGE_PURPOSE_TEXT).toBe(currentConsentText('base').text)
    expect(CONSENT_LABEL).toBe('上の利用目的に同意します')
  })

  test('研究・治験の案内は、文そのものをチェック欄に使う', () => {
    const t = currentConsentText('research_contact')
    expect(consentLabelOf(t)).toBe(t.text)
  })

  test('C 層（stats）は承認前の案', () => {
    expect(currentConsentText('stats').draft).toBe(true)
  })

  test('道のり調査（journey）は倫理審査の承認前の案', () => {
    expect(currentConsentText('journey').draft).toBe(true)
  })
})

describe('DB 側のいまの版（consent_current_version を定義している最新の migration）', () => {
  // 版を上げる・種類を足すときは、新しい migration で関数を差し替える（20261017 → 20261021 …）。
  // ここでは migrations/ のうち consent_current_version を定義している最後のファイルを読む
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const dir = path.join(process.cwd(), 'supabase', 'migrations')
  const latest = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => fs.readFileSync(path.join(dir, f), 'utf-8').includes('FUNCTION public.consent_current_version'))
    .pop()!
  const sql = fs.readFileSync(path.join(dir, latest), 'utf-8')

  test('いまの定義は 20261029_consent_research_contact_v2.sql（research_contact を版 2 にした）', () => {
    expect(latest).toBe('20261029_consent_research_contact_v2.sql')
  })
  const fn = sql.slice(sql.indexOf('FUNCTION public.consent_current_version'), sql.indexOf('COMMENT ON FUNCTION public.consent_current_version'))
  const whens = Object.fromEntries([...fn.matchAll(/WHEN '([a-z_]+)' THEN (\d+)/g)].map((m) => [m[1], Number(m[2])]))

  test.each([...CONSENT_KINDS])('%s: DB の版は consent-texts.ts のいまの版と同じ（案の種類は DB では NULL）', (kind) => {
    const t = currentConsentText(kind)
    if (t.draft) expect(whens[kind]).toBeUndefined()
    else expect(whens[kind]).toBe(t.version)
  })

  test('kind の CHECK（consents_kind_check を定義している最新の migration）は consent-texts.ts の種類とそろう', () => {
    const kindFile = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .filter((f) => fs.readFileSync(path.join(dir, f), 'utf-8').includes('ADD CONSTRAINT consents_kind_check'))
      .pop()!
    const m = fs.readFileSync(path.join(dir, kindFile), 'utf-8').match(/CHECK \(kind IN \(([^)]*)\)\)/)
    expect(m).not.toBeNull()
    expect([...m![1].matchAll(/'([^']*)'/g)].map((x) => x[1])).toEqual([...CONSENT_KINDS])
  })

  test('既存の行は書き換えない（同意を勝手に作らない）', () => {
    const body = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    expect(body).not.toMatch(/INSERT INTO public\.consents|UPDATE public\.consents/)
  })
})
