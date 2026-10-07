/**
 * 病気がわかるまでの道のり調査（ファブリー病）— 設問・選択肢・入力検証・集計の表示 — 2026-10-02 ファウンダー指示
 *
 * 設問と選択肢の決定は docs/journey_survey_items.md、研究計画書の下書きは docs/journey_protocol_draft.md。
 * DB は supabase/migrations/20261010_journey_survey.sql。
 *
 * ★ 選択肢の値は DB の public.journey_options() と同じにする（lib/portal/__tests__/journey-survey.test.ts が確かめる）
 * ★ 回答をもとに本人へ病気の可能性・助言・受診先を返さない（医療機器にあたる機能は作らない）。
 *   ここにあるのは、選んだ値が選択肢の中にあるかの確かめと、集計の数を並べ直すことだけ
 * ★ 機能は環境変数 JOURNEY_SURVEY が 'on' ちょうどのときだけ開く（isJourneyEnabled）
 *
 * クライアント部品（回答フォーム）からも読むので、fs や Supabase を import しない。
 */

/**
 * 対象疾患（画面で回答を受け付けるのは、いまはファブリー病のみ）。
 * id は disease_catalog の固定 ID（共通契約 A・F）。DB へはこれを渡す。idx は作成時の位置で、参考に残す。
 * 2026-10-04: DB は疾患ごとに動く（20261028）。ほかの病気は、疾患別の 2 問の選択肢が決まってから足す
 */
export const JOURNEY_DISEASE = { id: 'rd00001', idx: 0, name: 'ファブリー病' } as const

/**
 * 共通の 12 問と疾患別の 2 問（docs/journey_survey_items.md 改版 2026-10-04）。
 * 共通の設問の選択肢は全疾患で同じ。疾患別の設問の選択肢は疾患ごと（いま JOURNEY_QUESTIONS にあるのはファブリー病の分）
 */
export const COMMON_KEYS = [
  'respondent',
  'birth_year_band',
  'gender',
  'region',
  'onset_age_band',
  'first_department',
  'diagnosis_department',
  'facilities_count',
  'departments_count',
  'diagnosis_age_band',
  'other_diagnosis',
  'diagnosis_delay',
] as const
export const DISEASE_SPECIFIC_KEYS = ['first_symptoms', 'family_history_clue'] as const

/**
 * 調査を出す会（data/patient_groups/patient_groups.json の id = slug）。
 * JSON で diseases にファブリー病を持つ会と同じにする（テストで確かめる）。DB の submit_journey_response も会の病気を確かめる。
 */
export const JOURNEY_GROUP_SLUGS: readonly string[] = ['fabry-fukurou']

/** 機能を閉じているときに出す文（これだけを出す） */
export const JOURNEY_PENDING_MESSAGE = '準備中（倫理審査の承認後に始めます）'

/** 環境変数 JOURNEY_SURVEY が 'on' ちょうどのときだけ開く。未設定・'off'・'ON'・' on' などは閉じる */
export function isJourneyEnabled(value: string | undefined = process.env.JOURNEY_SURVEY): boolean {
  return value === 'on'
}

export const JOURNEY_TITLE = '病気がわかるまでの道のり'

// ---- 設問と選択肢 -------------------------------------------------------------

export interface JourneyOption {
  value: string
  label: string
}

export const SINGLE_KEYS = [
  'respondent',
  'birth_year_band',
  'gender',
  'region',
  'onset_age_band',
  'first_department',
  'diagnosis_department',
  'facilities_count',
  'departments_count',
  'diagnosis_age_band',
  'other_diagnosis',
  'family_history_clue',
  'diagnosis_delay',
] as const
export type SingleKey = (typeof SINGLE_KEYS)[number]
export type JourneyQuestionKey = SingleKey | 'first_symptoms'

export interface JourneyQuestion {
  key: JourneyQuestionKey
  /** 設問番号（docs/journey_survey_items.md と同じ） */
  no: number
  title: string
  /** 複数選択 */
  multi?: true
  options: readonly JourneyOption[]
}

/** 「症状に気づく前に分かった」（設問 5 の排他の選択肢） */
export const FOUND_BEFORE_SYMPTOMS = 'found_before_symptoms'
/** 設問 6・11・14 の「症状に気づく前に分かった」 */
export const BEFORE_SYMPTOMS = 'before_symptoms'
/** 設問 5 で FOUND_BEFORE_SYMPTOMS を選んだら、自動で BEFORE_SYMPTOMS になる設問 */
export const LINKED_KEYS = ['onset_age_band', 'diagnosis_age_band', 'diagnosis_delay'] as const satisfies readonly SingleKey[]

function yearBands(): JourneyOption[] {
  const out: JourneyOption[] = [{ value: 'le1944', label: '1944年以前' }]
  for (let y = 1945; y <= 2020; y += 5) out.push({ value: `${y}_${y + 4}`, label: `${y}〜${y + 4}年` })
  out.push({ value: 'ge2025', label: '2025年以降' }, { value: 'no_answer', label: '答えない' })
  return out
}

function ageBands(): JourneyOption[] {
  const out: JourneyOption[] = []
  for (let a = 0; a <= 60; a += 5) out.push({ value: `${a}_${a + 4}`, label: `${a}〜${a + 4}歳` })
  out.push(
    { value: 'ge65', label: '65歳以上' },
    { value: 'not_remember', label: '覚えていない' },
    { value: BEFORE_SYMPTOMS, label: '症状に気づく前に分かった' }
  )
  return out
}

const DEPARTMENTS: readonly JourneyOption[] = [
  { value: 'pediatrics', label: '小児科' },
  { value: 'internal_general', label: '内科（一般）' },
  { value: 'cardiology', label: '循環器（じゅんかんき）内科' },
  { value: 'nephrology', label: '腎臓（じんぞう）内科' },
  { value: 'neurology', label: '脳神経内科（神経内科）' },
  { value: 'dermatology', label: '皮膚科' },
  { value: 'ophthalmology', label: '眼科' },
  { value: 'otolaryngology', label: '耳鼻咽喉科（じびいんこうか）' },
  { value: 'orthopedics', label: '整形外科' },
  { value: 'gastroenterology', label: '消化器内科' },
  { value: 'rheumatology', label: '膠原病（こうげんびょう）・リウマチ科' },
  { value: 'genetics', label: '遺伝の専門外来（遺伝子診療部門など）' },
  { value: 'psychiatry', label: '精神科・心療内科' },
  // 2026-10-04 ファウンダー指示（ウィルソン病・OTC 欠損症を見込んで共通の選択肢に足した。20261031）
  { value: 'emergency', label: '救急科' },
  { value: 'neonatology', label: '新生児科' },
  { value: 'hepatology', label: '肝臓内科' },
  { value: 'other', label: 'その他' },
  { value: 'not_remember', label: '覚えていない' },
]

const COUNTS: readonly JourneyOption[] = [
  { value: '1', label: '1' },
  { value: '2_3', label: '2〜3' },
  { value: '4_5', label: '4〜5' },
  { value: 'ge6', label: '6以上' },
  { value: 'not_remember', label: '覚えていない' },
]

const YES_NO_UNKNOWN: readonly JourneyOption[] = [
  { value: 'yes', label: 'あり' },
  { value: 'no', label: 'なし' },
  { value: 'unknown', label: 'わからない' },
]

export const JOURNEY_QUESTIONS: readonly JourneyQuestion[] = [
  {
    key: 'respondent',
    no: 1,
    title: '回答しているのはどなたですか',
    options: [
      { value: 'self', label: '本人' },
      { value: 'proxy', label: '代理（ご家族など）' },
    ],
  },
  { key: 'birth_year_band', no: 2, title: '患者さんの生まれた年', options: yearBands() },
  {
    key: 'gender',
    no: 3,
    title: '患者さんの性別',
    options: [
      { value: 'male', label: '男性' },
      { value: 'female', label: '女性' },
      { value: 'no_answer', label: '答えない' },
    ],
  },
  {
    key: 'region',
    no: 4,
    title: 'お住まいの地方',
    options: [
      { value: 'hokkaido', label: '北海道' },
      { value: 'tohoku', label: '東北' },
      { value: 'kanto', label: '関東' },
      { value: 'chubu', label: '中部' },
      { value: 'kinki', label: '近畿' },
      { value: 'chugoku', label: '中国' },
      { value: 'shikoku', label: '四国' },
      { value: 'kyushu_okinawa', label: '九州・沖縄' },
      { value: 'no_answer', label: '答えない' },
    ],
  },
  {
    key: 'first_symptoms',
    no: 5,
    title: '最初に気づいた症状（あてはまるものをすべて）',
    multi: true,
    options: [
      { value: 'limb_pain', label: '手足の痛み（焼けるような痛み・発作的な痛み）' },
      { value: 'hypohidrosis', label: '汗が出ない・出にくい' },
      { value: 'fatigue', label: '疲れやすい・だるい' },
      { value: 'digestive', label: '腹痛・下痢・吐き気など、おなかの不調' },
      { value: 'neuro', label: 'めまい・頭痛・しびれ' },
      { value: 'cardiac_finding', label: '心臓の異常を指摘された' },
      { value: 'urine_finding', label: '尿の異常（蛋白尿〔たんぱくにょう〕など）を指摘された' },
      { value: 'skin_rash', label: '皮膚の赤〜紫色の小さな発疹（被角血管腫〔ひかくけっかんしゅ〕）' },
      { value: 'heat_intolerance', label: '暑さに弱い（体に熱がこもる・のぼせる）' },
      { value: 'ear', label: '耳鳴り・聞こえにくさ' },
      { value: 'cornea_finding', label: '目の検査で角膜の濁りを指摘された' },
      { value: 'stroke_finding', label: '脳梗塞（のうこうそく。脳の血管の病気）と言われた' },
      { value: 'other', label: 'その他' },
      { value: 'not_remember', label: '覚えていない' },
      {
        value: FOUND_BEFORE_SYMPTOMS,
        label: '症状に気づく前に、家族の診断や検査（新生児スクリーニングなど）がきっかけで分かった',
      },
    ],
  },
  { key: 'onset_age_band', no: 6, title: '症状に気づいた年齢', options: ageBands() },
  { key: 'first_department', no: 7, title: '最初に受診した診療科', options: DEPARTMENTS },
  { key: 'diagnosis_department', no: 8, title: '確定診断を受けた診療科', options: DEPARTMENTS },
  { key: 'facilities_count', no: 9, title: '確定診断までに受診した医療機関の数', options: COUNTS },
  { key: 'departments_count', no: 10, title: '確定診断までに受診した診療科の数', options: COUNTS },
  { key: 'diagnosis_age_band', no: 11, title: '確定診断を受けた年齢', options: ageBands() },
  { key: 'other_diagnosis', no: 12, title: '確定診断の前に、別の病名と言われたことがありますか', options: YES_NO_UNKNOWN },
  { key: 'family_history_clue', no: 13, title: '家族の病歴が手がかりになりましたか', options: YES_NO_UNKNOWN },
  {
    key: 'diagnosis_delay',
    no: 14,
    title: '症状に気づいてから確定診断までにかかった期間',
    options: [
      { value: 'lt1', label: '1年未満' },
      { value: '1_4', label: '1〜4年' },
      { value: '5_9', label: '5〜9年' },
      { value: '10_19', label: '10〜19年' },
      { value: 'ge20', label: '20年以上' },
      { value: 'not_remember', label: '覚えていない' },
      { value: BEFORE_SYMPTOMS, label: '症状に気づく前に分かった' },
    ],
  },
]

export function questionOf(key: JourneyQuestionKey): JourneyQuestion {
  const q = JOURNEY_QUESTIONS.find((x) => x.key === key)
  if (!q) throw new Error(`道のり調査: 設問 ${key} がありません`)
  return q
}

/** 値 → 選択肢の文。知らない値は null（推測で文を当てない） */
export function optionLabel(key: JourneyQuestionKey, value: string): string | null {
  return questionOf(key).options.find((o) => o.value === value)?.label ?? null
}

// ---- 入力検証 -----------------------------------------------------------------

export type JourneyAnswers = Record<SingleKey, string> & { first_symptoms: string[] }

export type JourneyCheck =
  | { ok: true; value: JourneyAnswers }
  | { ok: false; errors: { key: JourneyQuestionKey; message: string }[] }

const MSG_REQUIRED = '選んでください'
const MSG_EXCLUSIVE = '「症状に気づく前に…分かった」は、ほかの症状と一緒には選べません'
const MSG_LINKED = '「症状に気づく前に分かった」は、設問5でその選択肢を選んだときだけ選べます'

/**
 * フォームの値を確かめる。全設問必須。
 * 設問 5 で「症状に気づく前に分かった」を選んだら、設問 6・11・14 は送られた値にかかわらず BEFORE_SYMPTOMS にする（決まり）。
 * 選んでいないときに設問 6・11・14 で BEFORE_SYMPTOMS が来たら止める（DB の CHECK と同じ決まり）。
 */
export function validateJourneyAnswers(raw: unknown): JourneyCheck {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: { key: JourneyQuestionKey; message: string }[] = []

  const rawSymptoms = Array.isArray(o.first_symptoms) ? o.first_symptoms : o.first_symptoms === undefined ? [] : [o.first_symptoms]
  const allowed = new Set(questionOf('first_symptoms').options.map((x) => x.value))
  const symptoms: string[] = []
  let badSymptom = false
  for (const v of rawSymptoms) {
    if (typeof v !== 'string' || !allowed.has(v)) badSymptom = true
    else if (!symptoms.includes(v)) symptoms.push(v)
  }
  const foundBefore = symptoms.includes(FOUND_BEFORE_SYMPTOMS)
  if (badSymptom || symptoms.length === 0) errors.push({ key: 'first_symptoms', message: MSG_REQUIRED })
  else if (foundBefore && symptoms.length > 1) errors.push({ key: 'first_symptoms', message: MSG_EXCLUSIVE })

  const value = { first_symptoms: symptoms } as JourneyAnswers
  for (const key of SINGLE_KEYS) {
    if (foundBefore && (LINKED_KEYS as readonly string[]).includes(key)) {
      value[key] = BEFORE_SYMPTOMS
      continue
    }
    const v = o[key]
    if (typeof v !== 'string' || optionLabel(key, v) === null) {
      errors.push({ key, message: MSG_REQUIRED })
      continue
    }
    if (v === BEFORE_SYMPTOMS && !foundBefore) {
      errors.push({ key, message: MSG_LINKED })
      continue
    }
    value[key] = v
  }

  if (errors.length > 0) return { ok: false, errors }
  // 並びは選択肢の順にそろえる（DB は値の順に並べ直す）
  value.first_symptoms = questionOf('first_symptoms')
    .options.map((x) => x.value)
    .filter((v) => symptoms.includes(v))
  return { ok: true, value }
}

/** FormData → validateJourneyAnswers に渡す形（複数選択は getAll） */
export function journeyFormToRaw(fd: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = { first_symptoms: fd.getAll('first_symptoms') }
  for (const key of SINGLE_KEYS) {
    const v = fd.get(key)
    if (typeof v === 'string') raw[key] = v
  }
  return raw
}

// ---- 失敗の理由 ---------------------------------------------------------------

export const JOURNEY_FAILURES = [
  'disabled',
  'unauthenticated',
  'not_member',
  'invalid_input',
  'consent_draft',
  'consent_required',
  'already_answered',
  'not_found',
  'failed',
] as const
export type JourneyFailure = (typeof JOURNEY_FAILURES)[number]

export const JOURNEY_FAILURE_MESSAGES: Record<JourneyFailure, string> = {
  disabled: JOURNEY_PENDING_MESSAGE,
  unauthenticated: 'ログインしてください',
  not_member: 'この会の会員ではありません',
  invalid_input: 'すべての設問に答えてください',
  consent_draft: '同意の文が倫理審査の前の案のため、まだ回答を受け付けていません',
  consent_required: '説明を読み、同意のチェックを入れてください',
  already_answered: 'すでに回答しています。答え直すときは、いまの回答を取り消してからにしてください',
  not_found: 'その回答は見つかりません',
  failed: 'うまくいきませんでした。時間をおいてもう一度お試しください',
}

/** DB の RAISE の MESSAGE → 理由。知らない文は failed（DB の文面を画面に出さない） */
export function mapJourneyDbError(message: string | undefined | null): JourneyFailure {
  if (!message) return 'failed'
  const hit = JOURNEY_FAILURES.find((r) => r !== 'failed' && r !== 'disabled' && r !== 'consent_draft' && message === r)
  if (hit) return hit
  if (/row-level security|permission denied/i.test(message)) return 'not_member'
  return 'failed'
}

export function isJourneyFailure(raw: unknown): raw is JourneyFailure {
  return typeof raw === 'string' && (JOURNEY_FAILURES as readonly string[]).includes(raw)
}

// ---- 集計の表示 ---------------------------------------------------------------

export const SUMMARY_SEXES = ['all', 'male', 'female', 'no_answer'] as const
export type SummarySex = (typeof SUMMARY_SEXES)[number]

export const SUMMARY_SEX_LABELS: Record<SummarySex, string> = {
  all: '全体',
  male: '男性',
  female: '女性',
  no_answer: '性別を答えない',
}

/** DB の journey_summary の 1 行 */
export interface JourneySummaryRow {
  question: string
  choice: string
  sex: string
  /** 人数（数字の文字）か「10未満」 */
  n: string
}

export const SUPPRESSED = '10未満'

/** 集計を印刷するときに添える注記（これだけ。解釈の文は入れない） */
export const JOURNEY_PRINT_NOTE = '10人未満の区分は「10未満」と表示しています'

/** 集計日の表示（日本時間の日付。例: 2026年10月2日） */
export function formatTokyoDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}年${get('month')}月${get('day')}日`
}

/** 総数が 10 未満で、DB が集計を返さないとき */
export const JOURNEY_NOT_ENOUGH_MESSAGE = '回答が10人に満たないため、集計はまだ表示していません。'

export interface SummaryLine {
  value: string
  label: string
  /** 性別ごとの表示（人数か「10未満」）。返ってこなかったセルは null */
  cells: Record<SummarySex, string | null>
}

export interface SummaryTable {
  key: JourneyQuestionKey
  no: number
  title: string
  multi: boolean
  /** 性別との 2 軸を出すか（性別の設問そのものは出さない） */
  bySex: boolean
  lines: SummaryLine[]
}

export interface JourneySummary {
  total: number
  tables: SummaryTable[]
}

/**
 * DB の行を設問ごとの表に並べ直す。総数の行が無い（＝総数が 10 未満で DB が何も返さない）なら null。
 * 表示するのは DB が返した文字だけ。ここで数を足したり引いたりしない（伏せたセルを戻さない）。
 * 知らない設問・選択肢・性別の行は捨てる。
 */
export function buildSummary(rows: readonly JourneySummaryRow[]): JourneySummary | null {
  const totalRow = rows.find((r) => r.question === 'total' && r.choice === 'total' && r.sex === 'all')
  if (!totalRow || !/^\d+$/.test(totalRow.n)) return null
  const tables: SummaryTable[] = JOURNEY_QUESTIONS.map((q) => ({
    key: q.key,
    no: q.no,
    title: q.title,
    multi: q.multi === true,
    bySex: q.key !== 'gender',
    lines: q.options.map((o) => ({
      value: o.value,
      label: o.label,
      cells: { all: null, male: null, female: null, no_answer: null },
    })),
  }))
  for (const r of rows) {
    if (!(SUMMARY_SEXES as readonly string[]).includes(r.sex)) continue
    if (r.n !== SUPPRESSED && !/^\d+$/.test(r.n)) continue
    const t = tables.find((x) => x.key === r.question)
    const line = t?.lines.find((l) => l.value === r.choice)
    if (line) line.cells[r.sex as SummarySex] = r.n
  }
  return { total: Number(totalRow.n), tables }
}

// ---- 自分の回答 ---------------------------------------------------------------

export interface MyJourneyResponse {
  responseId: string
  groupSlug: string
  groupName: string
  /** disease_catalog の固定 ID（20261028 から） */
  diseaseId: string
  diseaseName: string
  consentVersion: number
  /** 回答した月（YYYY-MM-01） */
  answeredMonth: string
  answers: JourneyAnswers
}

/** 回答した月の表示（2026年10月） */
export function formatMonth(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate)
  if (!m) return ''
  return `${m[1]}年${Number(m[2])}月`
}
