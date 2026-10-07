/**
 * @jest-environment node
 *
 * 病気がわかるまでの道のり調査（lib/portal/journey-survey.ts・journey-survey-db.ts と migration・確認台本）の検査
 *
 * DB には接続しない。見るのは:
 *   1. 選択肢の値が、アプリ（JOURNEY_QUESTIONS）と DB（journey_options）で一致する。docs の決定とも一致する
 *   2. 対象疾患と調査を出す会が、知識ファイル・患者会の JSON と一致する
 *   3. JOURNEY_SURVEY は 'on' ちょうどのときだけ開く
 *   4. 入力検証（全設問必須・排他・連動・知らない値）
 *   5. 集計の表示は DB の文字をそのまま並べるだけ（足し引きしない）。総数の行が無ければ出さない
 *   6. DB 関数の呼び方（閉じているとき・同意が案のときは呼ばない）
 *   7. migration の文面（回答に user_id が無い・集計が対応表を読まない・関数の権限・delete_my_account の差分）
 *   8. 確認台本に項目がそろっている
 * 行が本当に読めない・消えるかは、台本 scripts/portal/verify_journey.sql でファウンダーがローカルで確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser }, rpc: mockRpc }),
}))

const mockRecordMyConsent = jest.fn()
jest.mock('@/lib/portal/consents', () => ({ recordMyConsent: (...a: unknown[]) => mockRecordMyConsent(...a) }))

// journey の同意文は案（draft）。送る道を確かめるときだけ、案でない版に差し替える
let journeyDraft = true
jest.mock('@/lib/portal/consent-texts', () => {
  const actual = jest.requireActual('@/lib/portal/consent-texts')
  return {
    ...actual,
    currentConsentText: (kind: string) => {
      const t = actual.currentConsentText(kind)
      if (kind !== 'journey' || journeyDraft) return t
      return { ...t, draft: undefined }
    },
  }
})

import {
  BEFORE_SYMPTOMS,
  FOUND_BEFORE_SYMPTOMS,
  JOURNEY_DISEASE,
  JOURNEY_GROUP_SLUGS,
  COMMON_KEYS,
  DISEASE_SPECIFIC_KEYS,
  JOURNEY_QUESTIONS,
  JOURNEY_TITLE,
  SINGLE_KEYS,
  SUPPRESSED,
  buildSummary,
  formatTokyoDate,
  isJourneyEnabled,
  mapJourneyDbError,
  validateJourneyAnswers,
  type JourneySummaryRow,
} from '@/lib/portal/journey-survey'
import {
  journeySummaryRows,
  myJourneyResponses,
  submitMyJourneyResponse,
  withdrawMyJourneyResponse,
} from '@/lib/portal/journey-survey-db'
import { CONSENT_TEXTS } from '@/lib/portal/consent-texts'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations', '20261010_journey_survey.sql')
const RAW_SQL = fs.readFileSync(MIGRATION_PATH, 'utf-8')
/** コメント行を落とした SQL（コメント中の説明文に反応しないように） */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
}
const SQL = stripComments(RAW_SQL)
/** journey_options(p_question TEXT) を定義している migration のうち、いちばん新しいもの（コメントを落とした SQL） */
const LATEST_OPTIONS_SQL = (() => {
  const dir = path.join(ROOT, 'supabase', 'migrations')
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => fs.readFileSync(path.join(dir, f), 'utf-8').includes('CREATE OR REPLACE FUNCTION public.journey_options(p_question TEXT)'))
  return stripComments(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf-8'))
})()
/** 20261028（疾患ごとに動かす）のコメントを落とした SQL */
const GEN = stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261028_journey_generalize.sql'), 'utf-8'))
function bodyOf(sql: string, name: string): string {
  const after = sql.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1]
  if (!after) throw new Error(`${name} が migration にありません`)
  return after.split('$$;')[0]
}

const VALID = {
  respondent: 'self',
  birth_year_band: '1980_1984',
  gender: 'female',
  region: 'kanto',
  first_symptoms: ['limb_pain', 'hypohidrosis'],
  onset_age_band: '5_9',
  first_department: 'pediatrics',
  diagnosis_department: 'nephrology',
  facilities_count: '2_3',
  departments_count: '4_5',
  diagnosis_age_band: '30_34',
  other_diagnosis: 'yes',
  family_history_clue: 'no',
  diagnosis_delay: 'ge20',
}

const savedEnv = process.env.JOURNEY_SURVEY
beforeEach(() => {
  mockGetUser.mockReset()
  mockRpc.mockReset()
  mockRecordMyConsent.mockReset()
  journeyDraft = true
  process.env.JOURNEY_SURVEY = 'on'
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
  if (savedEnv === undefined) delete process.env.JOURNEY_SURVEY
  else process.env.JOURNEY_SURVEY = savedEnv
})

// ---- 1. 選択肢 -----------------------------------------------------------------

describe('選択肢の値', () => {
  /** journey_options の WHEN '設問' THEN ARRAY[...] を読む */
  /** いまの journey_options(設問) の本文（いちばん新しい migration の定義。20261010 → 20261031） */
  function sqlOptions(): Record<string, string[]> {
    const body = bodyOf(LATEST_OPTIONS_SQL, 'journey_options')
    const out: Record<string, string[]> = {}
    const re = /WHEN '([a-z_]+)' THEN ARRAY\[([\s\S]*?)\]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(body))) out[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1])
    return out
  }

  test('アプリと DB で、設問の並びも値も一致する', () => {
    const db = sqlOptions()
    expect(Object.keys(db).sort()).toEqual(JOURNEY_QUESTIONS.map((q) => q.key).sort())
    for (const q of JOURNEY_QUESTIONS) expect([q.key, db[q.key]]).toEqual([q.key, q.options.map((o) => o.value)])
  })

  test('設問は 1〜14 の 14 問で、単一選択は 13・複数選択は最初の症状だけ', () => {
    expect(JOURNEY_QUESTIONS.map((q) => q.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    expect(JOURNEY_QUESTIONS.filter((q) => q.multi).map((q) => q.key)).toEqual(['first_symptoms'])
    expect(SINGLE_KEYS).toHaveLength(13)
  })

  test('単一選択の設問には「答えない」「覚えていない」「わからない」のどれかがある（回答者を除く）', () => {
    for (const q of JOURNEY_QUESTIONS) {
      if (q.multi || q.key === 'respondent') continue
      const values = q.options.map((o) => o.value)
      expect([q.key, values.some((v) => ['no_answer', 'not_remember', 'unknown'].includes(v))]).toEqual([q.key, true])
    }
  })

  test('決定どおりの追加・修正（2026-10-02）', () => {
    const label = (key: string, value: string) =>
      JOURNEY_QUESTIONS.find((q) => q.key === key)?.options.find((o) => o.value === value)?.label
    expect(label('first_symptoms', 'heat_intolerance')).toBe('暑さに弱い（体に熱がこもる・のぼせる）')
    expect(label('first_symptoms', 'stroke_finding')).toContain('脳梗塞')
    expect(label('first_symptoms', FOUND_BEFORE_SYMPTOMS)).toBe(
      '症状に気づく前に、家族の診断や検査（新生児スクリーニングなど）がきっかけで分かった'
    )
    expect(label('first_department', 'psychiatry')).toBe('精神科・心療内科')
    expect(label('diagnosis_department', 'psychiatry')).toBe('精神科・心療内科')
    expect(label('facilities_count', 'not_remember')).toBe('覚えていない')
    expect(label('birth_year_band', 'no_answer')).toBe('答えない')
    expect(label('diagnosis_age_band', BEFORE_SYMPTOMS)).toBe('症状に気づく前に分かった')
    expect(JOURNEY_QUESTIONS.find((q) => q.key === 'diagnosis_delay')?.options.map((o) => o.label)).toEqual([
      '1年未満', '1〜4年', '5〜9年', '10〜19年', '20年以上', '覚えていない', '症状に気づく前に分かった',
    ])
  })

  test('docs/journey_survey_items.md に、すべての値が書いてある', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'journey_survey_items.md'), 'utf-8')
    expect(doc).toContain('決定 2026-10-02')
    for (const q of JOURNEY_QUESTIONS) {
      expect([q.key, doc.includes(`\`${q.key}\``)]).toEqual([q.key, true])
      for (const o of q.options) {
        // 生まれた年・年齢の 5 年刻みの途中は「…（5 年刻み）…」と省略して書いてある
        if (/^\d{4}_\d{4}$/.test(o.value) || (/^\d+_\d+$/.test(o.value) && q.key.endsWith('age_band'))) continue
        expect([q.key, o.value, doc.includes(o.value)]).toEqual([q.key, o.value, true])
      }
    }
  })
})

// ---- 2. 対象疾患と会 ------------------------------------------------------------

describe('対象疾患と調査を出す会', () => {
  test('知識ファイルの idx 0 はファブリー病', () => {
    const records = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'knowledge', 'comprehensive_rare_diseases_knowledge.json'), 'utf-8')
    ) as { disease: string }[]
    expect(records[JOURNEY_DISEASE.idx].disease).toBe(JOURNEY_DISEASE.name)
  })

  test('調査を出す会は、患者会の JSON でファブリー病を持つ会と同じ', () => {
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'patient_groups', 'patient_groups.json'), 'utf-8')) as {
      groups: { id: string; diseases: string[] }[]
    }
    const fabry = file.groups.filter((g) => g.diseases.includes(JOURNEY_DISEASE.name)).map((g) => g.id)
    expect([...JOURNEY_GROUP_SLUGS].sort()).toEqual(fabry.sort())
  })

  test('DB 関数も対象疾患を idx 0 に限る', () => {
    expect(bodyOf(SQL, 'submit_journey_response')).toContain('p_disease_idx IS DISTINCT FROM 0')
  })
})

describe('表示名（2026-10-02 ファウンダー決定）', () => {
  test('画面の題と同意文は「病気がわかるまでの道のり」、会のタブは「道のり」', () => {
    expect(JOURNEY_TITLE).toBe('病気がわかるまでの道のり')
    expect(CONSENT_TEXTS.journey[0].text).toContain('「病気がわかるまでの道のり」調査')
    const shell = fs.readFileSync(path.join(ROOT, 'app', 'demo', 'community', '[slug]', '_components', 'GroupShell.tsx'), 'utf-8')
    expect(shell).toContain("label: '道のり'")
  })

  test('旧名（2026-10-02 まで使っていた題）がどこにも残っていない', () => {
    const dirs = ['app/demo/community', 'lib/portal', 'docs', 'scripts/portal', 'supabase/migrations']
    const hits: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx|md|sql)$/.test(e.name) && fs.readFileSync(p, 'utf-8').includes('診断まで' + 'の道のり')) hits.push(p)
      }
    }
    for (const d of dirs) walk(path.join(ROOT, d))
    expect(hits).toEqual([])
  })
})

// ---- 3. 環境変数 ---------------------------------------------------------------

describe('JOURNEY_SURVEY', () => {
  test.each([
    ['on', true],
    [undefined, false],
    ['', false],
    ['off', false],
    ['ON', false],
    [' on', false],
    ['on ', false],
    ['true', false],
    ['1', false],
  ])('%p → %p', (value, expected) => {
    // 引数を省いたときと同じく、環境変数そのものの値として確かめる
    if (value === undefined) delete process.env.JOURNEY_SURVEY
    else process.env.JOURNEY_SURVEY = value
    expect(isJourneyEnabled()).toBe(expected)
  })
})

// ---- 4. 入力検証 ---------------------------------------------------------------

describe('validateJourneyAnswers', () => {
  test('全設問がそろっていれば通る。症状は選択肢の順に並べ直し、重複を落とす', () => {
    const r = validateJourneyAnswers({ ...VALID, first_symptoms: ['hypohidrosis', 'limb_pain', 'limb_pain'] })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.first_symptoms).toEqual(['limb_pain', 'hypohidrosis'])
  })

  test.each(SINGLE_KEYS.map((k) => [k]))('%s が無ければ止める（全設問必須）', (key) => {
    const raw: Record<string, unknown> = { ...VALID }
    delete raw[key]
    const r = validateJourneyAnswers(raw)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.map((e) => e.key)).toEqual([key])
  })

  test('最初の症状が 0 個なら止める', () => {
    const r = validateJourneyAnswers({ ...VALID, first_symptoms: [] })
    expect(r.ok).toBe(false)
  })

  test('知らない値は止める（推測で近い選択肢に当てない）', () => {
    expect(validateJourneyAnswers({ ...VALID, region: 'tokyo' }).ok).toBe(false)
    expect(validateJourneyAnswers({ ...VALID, first_symptoms: ['limb_pain', 'headache'] }).ok).toBe(false)
  })

  test('排他の選択肢は、ほかの症状と一緒には選べない', () => {
    const r = validateJourneyAnswers({ ...VALID, first_symptoms: [FOUND_BEFORE_SYMPTOMS, 'limb_pain'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.map((e) => e.key)).toContain('first_symptoms')
  })

  test('排他の選択肢を選んだら、設問 6・11・14 は送られた値にかかわらず「症状に気づく前に分かった」', () => {
    const raw: Record<string, unknown> = { ...VALID, first_symptoms: [FOUND_BEFORE_SYMPTOMS], onset_age_band: '5_9' }
    delete raw.diagnosis_age_band
    delete raw.diagnosis_delay
    const r = validateJourneyAnswers(raw)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect([r.value.onset_age_band, r.value.diagnosis_age_band, r.value.diagnosis_delay]).toEqual([
        BEFORE_SYMPTOMS,
        BEFORE_SYMPTOMS,
        BEFORE_SYMPTOMS,
      ])
    }
  })

  test('排他の選択肢を選んでいないのに「症状に気づく前に分かった」は選べない', () => {
    for (const key of ['onset_age_band', 'diagnosis_age_band', 'diagnosis_delay']) {
      const r = validateJourneyAnswers({ ...VALID, [key]: BEFORE_SYMPTOMS })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errors.map((e) => e.key)).toEqual([key])
    }
  })

  test('文字でない値・オブジェクトでない入力は止める', () => {
    expect(validateJourneyAnswers({ ...VALID, gender: 1 }).ok).toBe(false)
    expect(validateJourneyAnswers(null).ok).toBe(false)
  })
})

// ---- 5. 集計の表示 -------------------------------------------------------------

describe('buildSummary', () => {
  test('総数の行が無い（DB が 0 行を返した＝総数 10 未満）なら null', () => {
    expect(buildSummary([])).toBeNull()
    expect(buildSummary([{ question: 'respondent', choice: 'self', sex: 'all', n: '12' }])).toBeNull()
  })

  test('DB の文字をそのまま並べる。返ってこなかったセルは null（ここで数を作らない）', () => {
    const rows: JourneySummaryRow[] = [
      { question: 'total', choice: 'total', sex: 'all', n: '12' },
      { question: 'respondent', choice: 'self', sex: 'all', n: SUPPRESSED },
      { question: 'respondent', choice: 'proxy', sex: 'all', n: SUPPRESSED },
      { question: 'other_diagnosis', choice: 'yes', sex: 'all', n: '10' },
      { question: 'other_diagnosis', choice: 'yes', sex: 'male', n: SUPPRESSED },
    ]
    const s = buildSummary(rows)
    expect(s?.total).toBe(12)
    const respondent = s?.tables.find((t) => t.key === 'respondent')
    expect(respondent?.lines.map((l) => l.cells.all)).toEqual([SUPPRESSED, SUPPRESSED])
    const other = s?.tables.find((t) => t.key === 'other_diagnosis')
    expect(other?.lines.find((l) => l.value === 'yes')?.cells).toEqual({ all: '10', male: SUPPRESSED, female: null, no_answer: null })
    expect(other?.lines.find((l) => l.value === 'no')?.cells.all).toBeNull()
  })

  test('知らない設問・選択肢・性別、数でも「10未満」でもない値は捨てる', () => {
    const s = buildSummary([
      { question: 'total', choice: 'total', sex: 'all', n: '20' },
      { question: 'user_id', choice: 'x', sex: 'all', n: '20' },
      { question: 'respondent', choice: 'robot', sex: 'all', n: '20' },
      { question: 'respondent', choice: 'self', sex: 'other', n: '20' },
      { question: 'respondent', choice: 'proxy', sex: 'all', n: '3人' },
    ])
    expect(s?.tables.find((t) => t.key === 'respondent')?.lines.map((l) => l.cells.all)).toEqual([null, null])
  })

  test('性別の設問は性別との 2 軸にしない', () => {
    const s = buildSummary([{ question: 'total', choice: 'total', sex: 'all', n: '20' }])
    expect(s?.tables.find((t) => t.key === 'gender')?.bySex).toBe(false)
    expect(s?.tables.filter((t) => t.bySex)).toHaveLength(13)
  })
})

describe('formatTokyoDate', () => {
  test('日本時間の日付にする（UTC では前日でも、日本時間で日付が変わっていれば翌日）', () => {
    expect(formatTokyoDate(new Date('2026-10-01T15:30:00Z'))).toBe('2026年10月2日')
    expect(formatTokyoDate(new Date('2026-10-02T14:59:59Z'))).toBe('2026年10月2日')
  })
})

describe('mapJourneyDbError', () => {
  test.each([
    ['not_member', 'not_member'],
    ['consent_required', 'consent_required'],
    ['already_answered', 'already_answered'],
    ['not_found', 'not_found'],
    ['invalid_input', 'invalid_input'],
    ['permission denied for function journey_summary', 'not_member'],
    ['relation "x" does not exist', 'failed'],
    [undefined, 'failed'],
    ['disabled', 'failed'],
  ])('%p → %p', (message, expected) => {
    expect(mapJourneyDbError(message)).toBe(expected)
  })
})

// ---- 6. DB 関数の呼び方 ----------------------------------------------------------

describe('journey-survey-db', () => {
  const answers = () => {
    const r = validateJourneyAnswers(VALID)
    if (!r.ok) throw new Error('VALID が通らない')
    return r.value
  }

  test('JOURNEY_SURVEY が on でなければ、どの関数も DB を呼ばない', async () => {
    process.env.JOURNEY_SURVEY = 'off'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'disabled' })
    expect(await myJourneyResponses()).toEqual({ ok: false, reason: 'disabled' })
    expect(await withdrawMyJourneyResponse('r1')).toEqual({ ok: false, reason: 'disabled' })
    expect(await journeySummaryRows('g1')).toEqual({ ok: false, reason: 'disabled' })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockRecordMyConsent).not.toHaveBeenCalled()
  })

  test('同意文が案（いまの状態）なら、同意も回答も記録しない', async () => {
    expect(CONSENT_TEXTS.journey[CONSENT_TEXTS.journey.length - 1].draft).toBe(true)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'consent_draft' })
    expect(mockRecordMyConsent).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('未ログインなら DB を呼ばない', async () => {
    journeyDraft = false
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(await journeySummaryRows('g1')).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('同意を記録してから、対象疾患・同意の版・全設問を渡して回答する（user_id は渡さない）', async () => {
    journeyDraft = false
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRecordMyConsent.mockResolvedValue({ ok: true })
    mockRpc.mockResolvedValue({ data: null, error: null })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: true, value: null })
    expect(mockRecordMyConsent).toHaveBeenCalledWith('journey')
    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [name, params] = mockRpc.mock.calls[0]
    expect(name).toBe('submit_journey_response')
    expect(params).toMatchObject({
      p_group_id: 'g1',
      p_disease_id: 'rd00001',
      p_consent_version: 1,
      p_first_symptoms: ['limb_pain', 'hypohidrosis'],
      p_respondent: 'self',
      p_diagnosis_delay: 'ge20',
    })
    expect(Object.keys(params).sort()).toEqual(
      ['p_group_id', 'p_disease_id', 'p_consent_version', 'p_first_symptoms', ...SINGLE_KEYS.map((k) => `p_${k}`)].sort()
    )
    // migration の引数と同じ名前
    // いまの引数の形は 20261028（疾患を disease_id で受ける）
    const sig = GEN.split('CREATE OR REPLACE FUNCTION public.submit_journey_response(')[1].split(')')[0]
    const sqlParams = [...sig.matchAll(/(p_[a-z_]+)\s/g)].map((m) => m[1]).sort()
    expect(sqlParams).toEqual(Object.keys(params).sort())
  })

  test('同意の記録に失敗したら回答しない', async () => {
    journeyDraft = false
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRecordMyConsent.mockResolvedValue({ ok: false, reason: 'failed' })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'failed' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('DB の理由はそのまま、知らない文は failed', async () => {
    journeyDraft = false
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRecordMyConsent.mockResolvedValue({ ok: true })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'already_answered' } })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'already_answered' })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'syntax error at or near' } })
    expect(await submitMyJourneyResponse('g1', answers())).toEqual({ ok: false, reason: 'failed' })
  })

  test('取り消しは回答の id だけを渡す。集計は会の id と対象疾患を渡す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: [], error: null })
    await withdrawMyJourneyResponse('r1')
    await journeySummaryRows('g1')
    expect(mockRpc.mock.calls).toEqual([
      ['withdraw_my_journey_response', { p_response_id: 'r1' }],
      ['journey_summary', { p_group_id: 'g1', p_disease_id: 'rd00001' }],
    ])
  })

  test('自分の回答を型に直す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({
      data: [{
        response_id: 'r1', group_slug: 'fabry-fukurou', group_name: '会', disease_idx: 0, disease_name: 'ファブリー病',
        consent_version: 1, answered_month: '2026-10-01', ...VALID,
      }],
      error: null,
    })
    const r = await myJourneyResponses()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value[0]).toMatchObject({ responseId: 'r1', groupSlug: 'fabry-fukurou', answeredMonth: '2026-10-01' })
      expect(r.value[0].answers).toEqual(VALID)
    }
  })
})

// ---- 7. migration の文面 -------------------------------------------------------

describe('migration 20261010_journey_survey.sql', () => {
  test('回答の表に user_id の列が無い。対応表は別にある', () => {
    const table = SQL.split('CREATE TABLE IF NOT EXISTS public.journey_responses (')[1].split(');')[0]
    expect(table).not.toMatch(/user_id/)
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public.journey_links (')
  })

  test('回答の表は RLS を有効・FORCE にし、ポリシーを置かず、権限をはがす', () => {
    expect(SQL).toContain('ALTER TABLE public.journey_responses ENABLE ROW LEVEL SECURITY;')
    expect(SQL).toContain('ALTER TABLE public.journey_responses FORCE ROW LEVEL SECURITY;')
    expect(SQL).not.toMatch(/CREATE POLICY [a-z_]+ ON public\.journey_responses/)
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      expect(SQL).toContain(`REVOKE ALL ON public.journey_responses FROM ${role};`)
    }
    expect(SQL).not.toMatch(/GRANT [A-Z, ]+ ON public\.journey_responses/)
  })

  test('対応表は本人の SELECT だけ', () => {
    expect(SQL).toContain('USING (auth.uid() = user_id);')
    expect(SQL).toContain('GRANT SELECT ON public.journey_links TO authenticated;')
    expect(SQL).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)[^;]* ON public\.journey_links/)
    expect(SQL.match(/CREATE POLICY [a-z_]+ ON public\.journey_links/g)).toHaveLength(1)
  })

  test('集計関数は対応表も user_id も読まない。戻り値は question・choice・sex・n だけ', () => {
    const body = bodyOf(SQL, 'journey_summary')
    expect(body).not.toMatch(/journey_links|user_id/)
    expect(body).toContain('RETURNS TABLE (question TEXT, choice TEXT, sex TEXT, n TEXT)')
    expect(body).toContain("'10未満'")
    expect(body).toContain('IF v_total < 10 THEN')
    expect(body).toContain('is_group_member(p_group_id)')
  })

  test.each([
    'submit_journey_response',
    'my_journey_responses',
    'withdraw_my_journey_response',
    'journey_summary',
    'journey_links_delete_response',
    'delete_my_account',
  ])('%s は SECURITY DEFINER で search_path を空に固定', (name) => {
    const head = bodyOf(SQL, name).split('AS $$')[0]
    expect(head).toContain('SECURITY DEFINER')
    expect(head).toContain("SET search_path = ''")
  })

  test('journey_options は search_path を固定し、誰にも EXECUTE を与えない', () => {
    expect(bodyOf(SQL, 'journey_options').split('AS $$')[0]).toContain("SET search_path = ''")
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.journey_options\(TEXT\)\s+FROM PUBLIC, anon, authenticated;/)
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.journey_options/)
  })

  test.each([
    'submit_journey_response(UUID',
    'my_journey_responses()',
    'withdraw_my_journey_response(UUID)',
    'journey_summary(UUID, INTEGER)',
    'delete_my_account()',
  ])('%s は PUBLIC・anon からはがし、authenticated にだけ付ける', (sig) => {
    const esc = sig.replace(/[()]/g, '\\$&')
    expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc}[^;]*FROM PUBLIC, anon;`))
    expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc}[^;]*TO authenticated;`))
  })

  test('取り消しは本人の対応だけを消し、他人の回答は not_found', () => {
    const body = bodyOf(SQL, 'withdraw_my_journey_response')
    expect(body).toContain('DELETE FROM public.journey_links WHERE response_id = p_response_id AND user_id = v_uid;')
    expect(body).toContain("MESSAGE = 'not_found'")
  })

  test('対応の行が消えたら回答も消すトリガーがある', () => {
    expect(bodyOf(SQL, 'journey_links_delete_response')).toContain('DELETE FROM public.journey_responses WHERE id = OLD.response_id;')
    expect(SQL).toMatch(/AFTER DELETE ON public\.journey_links\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.journey_links_delete_response\(\);/)
  })

  test('delete_my_account は 20261002 の本文に、道のり調査の 2 文を足しただけ', () => {
    const before = stripComments(
      fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261002_delete_account.sql'), 'utf-8')
    )
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
    const added =
      'DELETE FROM public.journey_responses WHERE id IN (SELECT l.response_id FROM public.journey_links l WHERE l.user_id = v_uid); ' +
      'DELETE FROM public.journey_links WHERE user_id = v_uid;'
    const now = norm(bodyOf(SQL, 'delete_my_account'))
    expect(now).toContain(added)
    expect(now.replace(added + ' ', '')).toBe(norm(bodyOf(before, 'delete_my_account')))
    // 消すのは最後の世話人の判定の後
    expect(now.indexOf('last_moderator')).toBeLessThan(now.indexOf('journey_responses'))
  })

  test('consents.kind に journey を足す', () => {
    expect(SQL).toContain("CHECK (kind IN ('base', 'research_contact', 'stats', 'journey'))")
  })

  test('適用済みの migration は書き換えていない（delete_my_account の旧本文に journey が無い）', () => {
    const before = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261002_delete_account.sql'), 'utf-8')
    expect(before).not.toMatch(/journey/)
  })
})

// ---- 8. 確認台本 ---------------------------------------------------------------

describe('確認台本', () => {
  const script = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_journey.sql'), 'utf-8')

  test('ローカル専用の安全装置と後片付けがある', () => {
    expect(script).toContain('ローカル Supabase 専用')
    expect(script).toContain('本番の可能性があるので止めます')
    expect(script).toContain("PERFORM pg_temp.vj_chk('後片付け'")
  })

  test.each(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])('項目 %s がある', (no) => {
    expect(script).toContain(`pg_temp.vj_chk('${no}'`)
  })

  test('依頼の確認項目がそろっている', () => {
    for (const s of [
      '対応表は自分の行だけ見える',
      'journey_summary の本文に journey_links・user_id が出てこない',
      '10 未満のセル',
      'A が自分の回答を取り消す',
      'B がアカウントを消す',
      'search_path が空に固定されている',
      'anon は実行できない',
    ]) {
      expect([s, script.includes(s)]).toEqual([s, true])
    }
  })

  test('verify_delete_account.sql に「道のり調査の回答が消える」項目がある', () => {
    const vd = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_delete_account.sql'), 'utf-8')
    expect(vd).toContain("pg_temp.vd_chk('9', 'A の道のり調査の回答と対応が 0 行'")
    expect(vd).toContain("pg_temp.vd_chk('9', 'B の道のり調査の回答と対応は残る'")
  })
})

// ---- 9. しきい値の差し替え（20261018） ----------------------------------------------------

describe('migration 20261018_journey_summary_threshold.sql', () => {
  const NEW = stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261018_journey_summary_threshold.sql'), 'utf-8'))
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim()

  test('journey_summary の本文は、20261010 の 10 を v_t（stats_threshold()）に替えただけ', () => {
    const before = norm(bodyOf(SQL, 'journey_summary'))
    const after = norm(bodyOf(NEW, 'journey_summary'))
    const expected = before
      .replace('v_na_total INTEGER;', 'v_na_total INTEGER; v_t INTEGER := public.stats_threshold();')
      .replace('IF v_total < 10 THEN', 'IF v_total < v_t THEN')
      .split('cells.cnt < 10')
      .join('cells.cnt < v_t')
    expect(after).toBe(expected)
    expect(after).not.toMatch(/<\s*10\b/)
    expect(after).toContain("'10未満'")
  })

  test('20261012 の stats_threshold() が 10 を返す（結果が 20261010 と変わらない）', () => {
    const dash = stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261012_group_dashboard.sql'), 'utf-8'))
    expect(norm(bodyOf(dash, 'stats_threshold'))).toContain('SELECT 10;')
  })

  test('SECURITY DEFINER・search_path 固定・権限は 20261010 と同じ', () => {
    const head = bodyOf(NEW, 'journey_summary').split('AS $$')[0]
    expect(head).toContain('SECURITY DEFINER')
    expect(head).toContain("SET search_path = ''")
    expect(NEW).toContain('REVOKE ALL ON FUNCTION public.journey_summary(UUID, INTEGER) FROM PUBLIC, anon;')
    expect(NEW).toContain('GRANT EXECUTE ON FUNCTION public.journey_summary(UUID, INTEGER) TO authenticated;')
    expect(bodyOf(NEW, 'journey_summary')).not.toMatch(/journey_links|user_id/)
  })

  test('確認台本は変えていない（20261018 の後もそのまま流す）', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_journey.sql'), 'utf-8')
    expect(script).not.toContain('20261018')
  })
})

// ---- 10. 疾患ごとに動かす（20261028） ------------------------------------------------------

describe('migration 20261028_journey_generalize.sql', () => {
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim()
  /** journey_options(p_disease_id, p_question) の、その疾患の分の WHEN '設問' THEN ARRAY[...] */
  function diseaseOptions(diseaseId: string): Record<string, string[]> {
    const body = bodyOf(GEN, 'journey_options').split(`WHEN '${diseaseId}' THEN`)[1].split('END')[0]
    const out: Record<string, string[]> = {}
    for (const m of body.matchAll(/WHEN '([a-z_]+)' THEN ARRAY\[([\s\S]*?)\]/g)) out[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1])
    return out
  }

  test('共通 12 問と疾患別 2 問で、合わせて 14 問', () => {
    expect([...COMMON_KEYS, ...DISEASE_SPECIFIC_KEYS].sort()).toEqual(JOURNEY_QUESTIONS.map((q) => q.key).sort())
    expect(COMMON_KEYS).toHaveLength(12)
    expect(DISEASE_SPECIFIC_KEYS).toEqual(['first_symptoms', 'family_history_clue'])
  })

  test('ファブリー病（rd00001）の疾患別の選択肢は、アプリと同じ', () => {
    const db = diseaseOptions('rd00001')
    expect(Object.keys(db).sort()).toEqual([...DISEASE_SPECIFIC_KEYS].sort())
    for (const k of DISEASE_SPECIFIC_KEYS) expect([k, db[k]]).toEqual([k, questionOfKey(k)])
  })

  test('疾患別の設問は疾患ごと、共通の設問は 20261010 の journey_options(設問) をそのまま使う', () => {
    const body = norm(bodyOf(GEN, 'journey_options'))
    expect(body).toContain("WHEN p_question IN ('first_symptoms', 'family_history_clue') THEN")
    expect(body).toContain('ELSE public.journey_options(p_question)')
    // 決まっているのはファブリー病だけ（ウィルソン病・OTC 欠損症は docs の案のまま）
    expect([...body.matchAll(/WHEN '(rd\d{5})' THEN/g)].map((m) => m[1])).toEqual(['rd00001'])
  })

  test('JOURNEY_DISEASE の固定 ID は disease_catalog のファブリー病', () => {
    const cat = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261023_disease_catalog.sql'), 'utf-8')
    expect(cat).toContain(`('${JOURNEY_DISEASE.id}', ${JOURNEY_DISEASE.idx}, '${JOURNEY_DISEASE.name}')`)
  })

  test('集計は 20261018 の本文から、疾患の絞り込みと選択肢の引き方だけを変えた（秘匿ルールは同じ）', () => {
    const before = norm(bodyOf(stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261018_journey_summary_threshold.sql'), 'utf-8')), 'journey_summary'))
    const after = norm(bodyOf(GEN, 'journey_summary'))
    const expected = before
      .replace('p_group_id UUID, p_disease_idx INTEGER)', 'p_group_id UUID, p_disease_id TEXT)')
      .replace(
        "RAISE EXCEPTION USING MESSAGE = 'not_member'; END IF;",
        "RAISE EXCEPTION USING MESSAGE = 'not_member'; END IF; IF NOT EXISTS (SELECT 1 FROM public.patient_groups g WHERE g.id = p_group_id AND p_disease_id = ANY (g.disease_ids)) THEN RAISE EXCEPTION USING MESSAGE = 'invalid_input'; END IF;"
      )
      .split('x.disease_idx = p_disease_idx')
      .join('x.disease_id = p_disease_id')
      .replace('unnest(public.journey_options(qs.q))', 'unnest(public.journey_options(p_disease_id, qs.q))')
    expect(after).toBe(expected)
    expect(after).toContain('public.stats_threshold()')
    expect(after).not.toMatch(/journey_links|user_id|disease_idx/)
  })

  test('回答は会の病気（disease_ids）にあり、疾患別の選択肢が決まっている病気だけ', () => {
    const body = norm(bodyOf(GEN, 'submit_journey_response'))
    expect(body).toContain('p_disease_id = ANY (g.disease_ids)')
    expect(body).toContain('NOT public.journey_disease_ready(p_disease_id)')
    expect(body).not.toContain('p_disease_name')
  })

  test('旧い引数の形を消し、新しい形に権限を付け直す', () => {
    expect(GEN).toContain('DROP FUNCTION IF EXISTS public.journey_summary(UUID, INTEGER);')
    expect(GEN).toMatch(/DROP FUNCTION IF EXISTS public\.submit_journey_response\(\s*UUID, INTEGER, TEXT, INTEGER,/)
    for (const sig of ['journey_summary(UUID, TEXT)', 'my_journey_responses()']) {
      const esc = sig.replace(/[()]/g, '\\$&')
      expect(GEN).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc}\\s+FROM PUBLIC, anon;`))
      expect(GEN).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc}\\s+TO authenticated;`))
    }
    expect(GEN).toMatch(/REVOKE ALL ON FUNCTION public\.journey_options\(TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated;/)
  })

  test('表・列は消さない（disease_idx は残す）', () => {
    expect(GEN).not.toMatch(/DROP TABLE|DROP COLUMN/i)
  })

  test('確認台本は疾患を指定して流す（ファブリー病の症状の値を台本に書かない）', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_journey.sql'), 'utf-8')
    expect(script).toContain("SELECT set_config('vj.disease_id', 'rd00001', false);")
    expect(script).not.toMatch(/limb_pain|fatigue/)
    expect(script).toContain("pg_temp.vj_chk('10'")
  })
})

function questionOfKey(k: string): string[] {
  return (JOURNEY_QUESTIONS.find((q) => q.key === k)?.options ?? []).map((o) => o.value)
}

// ---- 11. 共通の診療科の追加（20261031） --------------------------------------------------

describe('migration 20261031_journey_departments.sql', () => {
  const DEP = stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20261031_journey_departments.sql'), 'utf-8'))
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim()

  test('いちばん新しい journey_options(設問) は 20261031', () => {
    expect(LATEST_OPTIONS_SQL).toBe(DEP)
  })

  test('20261010 の本文に、診療科 2 か所へ救急科・新生児科・肝臓内科を足しただけ', () => {
    const before = norm(bodyOf(SQL, 'journey_options'))
    const after = norm(bodyOf(DEP, 'journey_options'))
    const expected = before
      .split("'psychiatry', 'other', 'not_remember']")
      .join("'psychiatry', 'emergency', 'neonatology', 'hepatology', 'other', 'not_remember']")
    expect(after).toBe(expected)
    expect(after.match(/'emergency', 'neonatology', 'hepatology'/g)).toHaveLength(2)
  })

  test('アプリの診療科の文言（設問 7・8 とも）', () => {
    for (const key of ['first_department', 'diagnosis_department'] as const) {
      const labels = Object.fromEntries(JOURNEY_QUESTIONS.find((q) => q.key === key)!.options.map((o) => [o.value, o.label]))
      expect([labels.emergency, labels.neonatology, labels.hepatology]).toEqual(['救急科', '新生児科', '肝臓内科'])
    }
  })

  test('権限を付け直す（誰にも EXECUTE を与えない）。表・列は消さない', () => {
    expect(DEP).toContain('REVOKE ALL ON FUNCTION public.journey_options(TEXT) FROM PUBLIC, anon, authenticated;')
    expect(DEP).not.toMatch(/GRANT|DROP TABLE|DROP COLUMN/i)
  })

  test('ウィルソン病・OTC 欠損症の疾患別の選択肢は「案（資材の採否待ち）」のまま。DB に入れていない', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'journey_survey_items.md'), 'utf-8')
    expect(doc).toContain('#### ウィルソン病（案〔資材の採否待ち〕')
    expect(doc).toContain('#### OTC 欠損症（案〔資材の採否待ち〕')
    for (const f of ['20261028_journey_generalize.sql', '20261031_journey_departments.sql']) {
      const sql = stripComments(fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', f), 'utf-8'))
      expect([f, /rd00028|rd00157/.test(sql)]).toEqual([f, false])
    }
  })

  test('確認台本に、診療科の 3 つの確認がある', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_journey.sql'), 'utf-8')
    expect(script).toContain('psychiatry,emergency,neonatology,hepatology,other,not_remember')
  })
})
