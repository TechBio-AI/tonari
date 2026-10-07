/**
 * @jest-environment node
 *
 * 会員プロフィールの入力検証（lib/portal/member-profile.ts）
 *
 * ここで見るのは validateMemberProfileInput の境界だけ。
 * getMyProfile / upsertMyProfile は Supabase に触るので、このファイルでは扱わない
 * （行の境界は RLS 側の検査で、supabase/migrations/20260926_member_profiles.sql 末尾の手順で確かめる）。
 */
import {
  AGE_BANDS,
  CHOICE_MESSAGE,
  DISPLAY_NAME_MAX,
  FULL_NAME_MAX,
  GENDERS,
  ADULT_AGE_MESSAGE,
  MINOR_AGE_MESSAGE,
  PROXY_ATTESTATION_MESSAGE,
  PROXY_RELATIONS,
  REGISTRANT_TYPES,
  PREFECTURES,
  REQUIRED_MESSAGE,
  tooLongMessage,
  validateMemberProfileInput,
  type MemberProfileInput,
} from '@/lib/portal/member-profile'

const VALID: MemberProfileInput = {
  fullName: '山田 太郎',
  displayName: 'たろ',
  registrantType: 'self',
  proxyRelation: null,
  patientIsMinor: null,
  ageBand: '40代',
  gender: '答えない',
  prefecture: '東京都',
}

/** 通らなかった項目だけを取り出す */
function errorsOf(raw: unknown): { field: string; message: string }[] {
  const r = validateMemberProfileInput(raw)
  return r.ok ? [] : r.errors
}
const fieldsOf = (raw: unknown) => errorsOf(raw).map((e) => e.field)

describe('通る入力', () => {
  test('本人の登録で 6 項目そろっていれば通る（続柄・18歳未満かは null）', () => {
    expect(validateMemberProfileInput(VALID)).toEqual({ ok: true, value: VALID })
  })

  test('前後の空白（全角も）は落として返す', () => {
    const r = validateMemberProfileInput({ ...VALID, fullName: '　 山田 太郎 　', displayName: ' たろ ' })
    expect(r).toEqual({ ok: true, value: { ...VALID, fullName: '山田 太郎', displayName: 'たろ' } })
  })

  test('名前の中の空白は残す（姓と名の区切りを消さない）', () => {
    const r = validateMemberProfileInput({ ...VALID, fullName: '山田　太郎' })
    expect(r.ok && r.value.fullName).toBe('山田　太郎')
  })

  test('余計な項目は無視して、決めた項目だけを返す（自己申告 proxyAttestation も列に持たないので返さない）', () => {
    const r = validateMemberProfileInput({ ...VALID, userId: 'u1', consentedAt: '2026-01-01', role: 'admin', proxyAttestation: true })
    expect(r.ok && Object.keys(r.value).sort()).toEqual(
      ['ageBand', 'displayName', 'fullName', 'gender', 'patientIsMinor', 'prefecture', 'proxyRelation', 'registrantType']
    )
  })

  test.each([...AGE_BANDS])('年代 %s は通る', (ageBand) => {
    expect(validateMemberProfileInput({ ...VALID, ageBand }).ok).toBe(true)
  })
  test.each([...GENDERS])('性別 %s は通る', (gender) => {
    expect(validateMemberProfileInput({ ...VALID, gender }).ok).toBe(true)
  })
  test.each([...PREFECTURES])('都道府県 %s は通る', (prefecture) => {
    expect(validateMemberProfileInput({ ...VALID, prefecture }).ok).toBe(true)
  })
})

describe('必須（空・空白だけ・未入力）', () => {
  test.each(['fullName', 'displayName'] as const)('%s が空文字なら必須のエラー', (field) => {
    expect(errorsOf({ ...VALID, [field]: '' })).toEqual([{ field, message: REQUIRED_MESSAGE }])
  })

  test.each(['fullName', 'displayName'] as const)('%s が空白だけなら必須のエラー', (field) => {
    // 半角空白・全角空白・改行・タブのどれでも「空」と見る
    expect(errorsOf({ ...VALID, [field]: ' 　\n\t' })).toEqual([{ field, message: REQUIRED_MESSAGE }])
  })

  test.each(['fullName', 'displayName', 'registrantType', 'ageBand', 'gender', 'prefecture'] as const)(
    '%s が未入力なら必須のエラー',
    (field) => {
      const { [field]: _omitted, ...rest } = VALID
      expect(errorsOf(rest)).toEqual([{ field, message: REQUIRED_MESSAGE }])
    }
  )

  test('全部欠けていれば 6 件そろって返る（1 件ずつ直させない）', () => {
    expect(fieldsOf({})).toEqual(['fullName', 'displayName', 'registrantType', 'ageBand', 'gender', 'prefecture'])
  })
})

describe('選択肢の外', () => {
  test.each([
    ['ageBand', '100代'],
    ['gender', '無回答'], // 「答えない」が正。似た言葉でも通さない
    ['prefecture', '東京'], // 「東京都」が正
    ['prefecture', '台湾'],
  ] as const)('%s に %s は通さない', (field, value) => {
    expect(errorsOf({ ...VALID, [field]: value })).toEqual([{ field, message: CHOICE_MESSAGE }])
  })

  test('選択肢の外を既定値に寄せない（ok にしない）', () => {
    const r = validateMemberProfileInput({ ...VALID, prefecture: 'どこか' })
    expect(r.ok).toBe(false)
  })

  test('前後の空白が付いた選択肢は通さない（選択肢は直値で一致させる）', () => {
    expect(errorsOf({ ...VALID, prefecture: ' 東京都' })).toEqual([
      { field: 'prefecture', message: CHOICE_MESSAGE },
    ])
  })

  test('大文字小文字・全角半角の違いも通さない', () => {
    expect(errorsOf({ ...VALID, ageBand: '４０代' })).toEqual([{ field: 'ageBand', message: CHOICE_MESSAGE }])
  })
})

describe('長さの境界', () => {
  test.each([
    ['fullName', FULL_NAME_MAX],
    ['displayName', DISPLAY_NAME_MAX],
  ] as const)('%s は上限ちょうどまで通る', (field, max) => {
    expect(validateMemberProfileInput({ ...VALID, [field]: 'あ'.repeat(max) }).ok).toBe(true)
  })

  test.each([
    ['fullName', FULL_NAME_MAX],
    ['displayName', DISPLAY_NAME_MAX],
  ] as const)('%s は上限 + 1 で落ちる', (field, max) => {
    expect(errorsOf({ ...VALID, [field]: 'あ'.repeat(max + 1) })).toEqual([
      { field, message: tooLongMessage(max) },
    ])
  })

  test('長さは見た目どおりに数える（絵文字 1 つを 1 文字と数える）', () => {
    // サロゲートペア。.length だと 2 と数えてしまう
    const name = '👩'.repeat(DISPLAY_NAME_MAX)
    expect(validateMemberProfileInput({ ...VALID, displayName: name }).ok).toBe(true)
    expect(validateMemberProfileInput({ ...VALID, displayName: name + '👩' }).ok).toBe(false)
  })

  test('前後の空白を落としてから数える（空白で上限を超えない）', () => {
    const r = validateMemberProfileInput({ ...VALID, displayName: ' ' + 'あ'.repeat(DISPLAY_NAME_MAX) + ' ' })
    expect(r.ok).toBe(true)
  })
})

describe('形が違うもの（API から来た未知の値）', () => {
  test.each([null, undefined, 'text', 42, [], true])('%p は 6 項目すべて必須で落ちる', (raw) => {
    expect(fieldsOf(raw)).toEqual(['fullName', 'displayName', 'registrantType', 'ageBand', 'gender', 'prefecture'])
  })

  test.each([42, null, [], {}, true] as const)('項目の型が文字列でなければ必須のエラー（%p）', (value) => {
    expect(errorsOf({ ...VALID, fullName: value })).toEqual([
      { field: 'fullName', message: REQUIRED_MESSAGE },
    ])
    expect(errorsOf({ ...VALID, gender: value })).toEqual([{ field: 'gender', message: REQUIRED_MESSAGE }])
  })
})

describe('登録する方（2026-09-26 ファウンダー決定: 代理は 18歳未満、または 18歳以上で本人が操作できないときだけ）', () => {
  const PROXY_MINOR = { ...VALID, registrantType: 'proxy', proxyRelation: '親', patientIsMinor: true, ageBand: '10歳未満' }
  const PROXY_ADULT = { ...VALID, registrantType: 'proxy', proxyRelation: '子', patientIsMinor: false, ageBand: '70代' }

  test('代理（18歳未満の患者さん）は続柄と「18歳未満か」があれば通る', () => {
    expect(validateMemberProfileInput(PROXY_MINOR)).toEqual({ ok: true, value: PROXY_MINOR })
  })

  test('代理（18歳以上の患者さん）は、本人が操作できないことの自己申告が無ければ通さない', () => {
    expect(errorsOf(PROXY_ADULT)).toEqual([{ field: 'proxyAttestation', message: PROXY_ATTESTATION_MESSAGE }])
    expect(errorsOf({ ...PROXY_ADULT, proxyAttestation: 'true' })).toEqual([{ field: 'proxyAttestation', message: PROXY_ATTESTATION_MESSAGE }])
    expect(validateMemberProfileInput({ ...PROXY_ADULT, proxyAttestation: true })).toEqual({ ok: true, value: PROXY_ADULT })
  })

  test('代理なら続柄と「18歳未満か」は必須。続柄は選択肢の中だけ', () => {
    expect(fieldsOf({ ...PROXY_MINOR, proxyRelation: undefined })).toEqual(['proxyRelation'])
    expect(fieldsOf({ ...PROXY_MINOR, proxyRelation: '友人' })).toEqual(['proxyRelation'])
    expect(fieldsOf({ ...PROXY_MINOR, patientIsMinor: undefined })).toEqual(['patientIsMinor'])
    expect(fieldsOf({ ...PROXY_MINOR, patientIsMinor: 'true' })).toEqual(['patientIsMinor'])
  })

  test('本人の登録では、続柄と「18歳未満か」が送られてきても捨てる（null にする）', () => {
    const r = validateMemberProfileInput({ ...VALID, proxyRelation: '親', patientIsMinor: true })
    expect(r).toEqual({ ok: true, value: VALID })
  })

  test('「18歳未満か」と年代が食い違えば通さない（どちらが正しいか分からないので直してもらう）', () => {
    expect(errorsOf({ ...PROXY_MINOR, ageBand: '30代' })).toEqual([{ field: 'ageBand', message: MINOR_AGE_MESSAGE }])
    expect(validateMemberProfileInput({ ...PROXY_MINOR, ageBand: '10代' }).ok).toBe(true)
    expect(errorsOf({ ...PROXY_ADULT, proxyAttestation: true, ageBand: '10歳未満' })).toEqual([
      { field: 'ageBand', message: ADULT_AGE_MESSAGE },
    ])
  })

  test('self・proxy 以外は通さない', () => {
    expect(fieldsOf({ ...VALID, registrantType: 'other' })).toEqual(['registrantType'])
  })

  test('選択肢: 登録する方は self・proxy、続柄は「親・配偶者・子・その他」の並び', () => {
    expect([...REGISTRANT_TYPES]).toEqual(['self', 'proxy'])
    expect([...PROXY_RELATIONS]).toEqual(['親', '配偶者', '子', 'その他'])
  })
})

describe('選択肢の定数', () => {
  test('都道府県は 47 件で、重複が無い', () => {
    expect(PREFECTURES).toHaveLength(47)
    expect(new Set(PREFECTURES).size).toBe(47)
  })

  test('性別に「答えない」がある（答えないことを選べる）', () => {
    expect(GENDERS).toContain('答えない')
  })

  test('性別は「男性・女性・答えない」をこの並びで。「その他」は無い（2026-09-26 ファウンダー指示）', () => {
    expect([...GENDERS]).toEqual(['男性', '女性', '答えない'])
    expect(GENDERS as readonly string[]).not.toContain('その他')
  })

  test('年代・性別に重複が無い', () => {
    expect(new Set(AGE_BANDS).size).toBe(AGE_BANDS.length)
    expect(new Set(GENDERS).size).toBe(GENDERS.length)
  })
})

describe('SQL の CHECK と選択肢が同じ値であること', () => {
  // 片方だけ増やすと「画面で選べるのに保存できない」が起きる。ここで気づけるようにする
  const sql = require('fs').readFileSync(
    require('path').join(process.cwd(), 'supabase', 'migrations', '20260926_member_profiles.sql'),
    'utf-8'
  ) as string

  test.each([...AGE_BANDS, ...PREFECTURES])('%s が SQL の CHECK にある', (value) => {
    expect(sql).toContain(`'${value}'`)
  })

  // 性別の CHECK と登録する方の列は 20260929_member_profiles_registrant.sql で入れた（20260926 は適用済みなので書き換えない）
  const sexSql = require('fs').readFileSync(
    require('path').join(process.cwd(), 'supabase', 'migrations', '20260929_member_profiles_registrant.sql'),
    'utf-8'
  ) as string

  test('性別の CHECK は GENDERS と同じ値・同じ並び。「その他」を含まない', () => {
    const check = sexSql.match(/CHECK \(gender IN \(([^)]*)\)\)/)
    expect(check).not.toBeNull()
    const values = [...check![1].matchAll(/'([^']*)'/g)].map((m) => m[1])
    expect(values).toEqual([...GENDERS])
  })

  test('「その他」の行があれば、変えずに止まる（ほかの変更より前に）', () => {
    expect(sexSql).toContain("WHERE gender = 'その他'")
    expect(sexSql.indexOf('RAISE EXCEPTION')).toBeLessThan(sexSql.indexOf('ALTER TABLE'))
  })

  test('登録する方・続柄の CHECK は定数と同じ値・同じ並び', () => {
    const reg = sexSql.match(/CHECK \(registrant_type IN \(([^)]*)\)\)/)
    expect([...reg![1].matchAll(/'([^']*)'/g)].map((m) => m[1])).toEqual([...REGISTRANT_TYPES])
    const rel = sexSql.match(/proxy_relation IN \(([^)]*)\)/)
    expect([...rel![1].matchAll(/'([^']*)'/g)].map((m) => m[1])).toEqual([...PROXY_RELATIONS])
  })

  test('既存の行は本人（self）になる（registrant_type の既定値）', () => {
    expect(sexSql).toContain("registrant_type  TEXT NOT NULL DEFAULT 'self'")
  })

  test('確認台本 verify_consents.sql は、この migration の本文を一字一句そのまま埋め込んでいる（冪等性の確認に使う）', () => {
    const verify = require('fs').readFileSync(
      require('path').join(process.cwd(), 'scripts', 'portal', 'verify_consents.sql'),
      'utf-8'
    ) as string
    expect(verify).toContain('$mig$' + sexSql + '$mig$')
  })

  test('長さの上限が SQL と揃っている', () => {
    expect(sql).toContain(`char_length(full_name) <= ${FULL_NAME_MAX}`)
    expect(sql).toContain(`char_length(display_name) <= ${DISPLAY_NAME_MAX}`)
  })
})
