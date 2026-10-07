/**
 * 会員プロフィール（2026-09-26 ファウンダー指示）
 *
 * 集めるのは、場の運営と医療機関探しの助けに要るものだけ。
 *
 * ★ 2 つのブロック（2026-09-26 ファウンダー決定。docs/DECISIONS.md「プロフィールを『登録する方』と『患者さん』に分ける」）
 *   - 登録する方: fullName（氏名）・displayName（表示名）・registrantType（ご本人／ご家族・代理の方）、
 *     代理のときだけ proxyRelation（続柄）・patientIsMinor（患者さんが 18 歳未満か）
 *   - 患者さん: ageBand（年代）・gender（性別）・prefecture（お住まいの都道府県）
 *   原則、患者本人が登録する。代理で登録できるのは、患者が 18 歳未満のとき、
 *   または 18 歳以上で本人が自分では操作できないとき（自己申告のチェック proxyAttestation。列には持たない）。
 *   患者さんの氏名・生年月日、代理の方ご自身の年代・性別は取らない。
 * 利用目的は docs/DECISIONS.md の 2026-09-26 の項に書いた範囲に限る。
 * 製薬会社向けの利用は、将来あらためて別の同意を取るまで行わない。
 *
 * ★ 取り扱いの約束（CLAUDE.md「3. 患者情報の保持と送信ポリシー」）
 *   - ここで扱う fullName は個人識別子。外部 LLM API（Anthropic 等）へ一切送らない。
 *     プロンプトにもログにも載せない。要約や分類が要るときはローカル LLM だけを使う。
 *   - 公開面（疾患ページ・患者会ページ等）はこのテーブルを読まない。読むのは会員層だけ。
 *   - 疾患名・症状・通院先など医療情報はここに持たない（持つときは別途ファウンダー判断）。
 *
 * ★ 行の境界
 *   RLS で本人の行しか見えないようにしてある（supabase/migrations/..._member_profiles.sql）が、
 *   ここでも必ず user_id で明示的に絞る。DB 側と呼び出し側の二重で閉じる
 *   （CLAUDE.md Don'ts 8「検証を経由しないデータアクセス」を会員データにも同じ形で当てる）。
 */

import { createClient } from '@/lib/supabase/server'

// ---- 選択肢 ---------------------------------------------------------------
// 値そのものを DB に入れる（コードと表示を分けない）。並び順が画面の並び順。
// 追加・改名は「増やすだけ」にする。既存の値を消すと、その値で保存済みの行が選択肢の外に出る。
// 消すときは、その値の行が無いことを確かめる migration を先に当てる（例: 性別の「その他」。20260929_member_profiles_registrant.sql）。

/** 年代。希少疾患はお子さんの会員がいるので 10 歳未満から置く */
export const AGE_BANDS = [
  '10歳未満',
  '10代',
  '20代',
  '30代',
  '40代',
  '50代',
  '60代',
  '70代',
  '80歳以上',
] as const
export type AgeBand = (typeof AGE_BANDS)[number]

/**
 * 性別。「答えない」を必ず残す（答えないことを選べるようにする）。
 * 「その他」は置かない（ファウンダー指示。X 連鎖の病気では性別が医学的な意味を持ち、
 * 「その他」があると体の性別か自認かが曖昧になるため。docs/DECISIONS.md）。
 * DB 側は supabase/migrations/20260929_member_profiles_registrant.sql の CHECK と同じ値・同じ並び。
 */
export const GENDERS = ['男性', '女性', '答えない'] as const
export type Gender = (typeof GENDERS)[number]

/** 登録する方。値は DB にそのまま入る（self / proxy）。表示名は REGISTRANT_TYPE_LABELS */
export const REGISTRANT_TYPES = ['self', 'proxy'] as const
export type RegistrantType = (typeof REGISTRANT_TYPES)[number]
export const REGISTRANT_TYPE_LABELS: Readonly<Record<RegistrantType, string>> = {
  self: 'ご本人',
  proxy: 'ご家族・代理の方',
}

/** 画面の「登録する方」の選択肢（値と表示）。フォームはクライアント部品なので、サーバー側のページからこれを渡す */
export const REGISTRANT_TYPE_CHOICES: ReadonlyArray<{ value: RegistrantType; label: string }> = REGISTRANT_TYPES.map((value) => ({
  value,
  label: REGISTRANT_TYPE_LABELS[value],
}))

/** 代理のときの続柄 */
export const PROXY_RELATIONS = ['親', '配偶者', '子', 'その他'] as const
export type ProxyRelation = (typeof PROXY_RELATIONS)[number]

/** 18 歳未満の患者さんが取りうる年代（patientIsMinor と年代の食い違いを落とすため） */
export const MINOR_AGE_BANDS: readonly AgeBand[] = ['10歳未満', '10代']

/** 都道府県。JIS X 0401 の順 */
export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const
export type Prefecture = (typeof PREFECTURES)[number]

/** 氏名・表示名の長さの上限（DB 側の CHECK と同じ値にする） */
export const FULL_NAME_MAX = 100
export const DISPLAY_NAME_MAX = 50

/**
 * 共通フォーム（app/demo/community/_components/ProfileForm.tsx）に渡す選択肢一式。
 * 初回の onboarding とマイページが同じものを渡す（並びもここで決まる）
 */
export const PROFILE_CHOICES = {
  registrantTypes: REGISTRANT_TYPE_CHOICES,
  proxyRelations: PROXY_RELATIONS,
  ageBands: AGE_BANDS,
  genders: GENDERS,
  prefectures: PREFECTURES,
  fullNameMax: FULL_NAME_MAX,
  displayNameMax: DISPLAY_NAME_MAX,
} as const

// ---- 型 -------------------------------------------------------------------

export interface MemberProfile {
  userId: string
  // ---- 登録する方 ----
  /** 登録する方の本名。運営と、入会審査をする世話人だけが見る。場には出さない。患者さんの氏名ではない */
  fullName: string
  /** 場に出る名前。本名を出したくない方のためにあるので、本名と同じでも「〇〇の母」でも構わない */
  displayName: string
  registrantType: RegistrantType
  /** 代理のときの続柄。本人のときは null */
  proxyRelation: ProxyRelation | null
  /** 代理のとき、患者さんが 18 歳未満か。本人のときは null */
  patientIsMinor: boolean | null
  // ---- 患者さん ----
  ageBand: AgeBand
  gender: Gender
  prefecture: Prefecture
  /** 利用目的への同意の時刻（ISO 8601）。最初の保存で立て、以後は変えない */
  consentedAt: string
}

/** 会員が入力する分。userId と consentedAt はサーバー側で決める */
export type MemberProfileInput = Omit<MemberProfile, 'userId' | 'consentedAt'>

// ---- 入力検証 ---------------------------------------------------------------

/** どの項目が、なぜ通らなかったか。画面はこの field で入力欄に印を付ける */
export interface FieldError {
  /** proxyAttestation は「18 歳以上の患者さんの代理」の自己申告のチェック（列には持たない） */
  field: keyof MemberProfileInput | 'proxyAttestation'
  message: string
}

export type ValidationResult =
  | { ok: true; value: MemberProfileInput }
  | { ok: false; errors: FieldError[] }

/** 必須の文言（空・空白だけ・未入力を同じ扱いにする） */
export const REQUIRED_MESSAGE = '入力してください'
export const CHOICE_MESSAGE = '一覧から選んでください'
export const tooLongMessage = (max: number) => `${max} 文字以内で入力してください`
export const PROXY_ATTESTATION_MESSAGE =
  '代理で登録できるのは、患者さんが18歳未満のとき、または18歳以上で患者さんご本人が自分では操作できないときです'
export const MINOR_AGE_MESSAGE = '18歳未満の患者さんの年代は「10歳未満」か「10代」です'
export const ADULT_AGE_MESSAGE = '18歳以上の患者さんの年代に「10歳未満」は選べません'
export const CHOOSE_MESSAGE = '選んでください'

function validateName(
  field: 'fullName' | 'displayName',
  raw: unknown,
  max: number,
  errors: FieldError[]
): string {
  if (typeof raw !== 'string') {
    errors.push({ field, message: REQUIRED_MESSAGE })
    return ''
  }
  // 前後の空白は落とす。全角空白も空白として扱う（空白だけの名前を通さない）
  const value = raw.replace(/^[\s　]+|[\s　]+$/g, '')
  if (value === '') {
    errors.push({ field, message: REQUIRED_MESSAGE })
    return ''
  }
  // 文字数は見た目に合わせてコードポイントで数える（絵文字を 2 文字と数えない）
  if ([...value].length > max) {
    errors.push({ field, message: tooLongMessage(max) })
  }
  return value
}

function validateChoice<T extends string>(
  field: FieldError['field'],
  raw: unknown,
  choices: readonly T[],
  errors: FieldError[]
): T {
  if (typeof raw !== 'string' || raw === '') {
    errors.push({ field, message: REQUIRED_MESSAGE })
    return choices[0]
  }
  if (!(choices as readonly string[]).includes(raw)) {
    // 選択肢の外は、黙って既定値に寄せずに落とす（意図しない値が入るより、入らない方がよい）
    errors.push({ field, message: CHOICE_MESSAGE })
    return choices[0]
  }
  return raw as T
}

/**
 * 画面・API の両方から呼ぶ入口。未知の形（null・数値・配列）も必ずここで落とす。
 * 通ったときの value は、前後の空白を落とした後の値。
 */
export function validateMemberProfileInput(raw: unknown): ValidationResult {
  const errors: FieldError[] = []
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  // 登録する方
  const fullName = validateName('fullName', o.fullName, FULL_NAME_MAX, errors)
  const displayName = validateName('displayName', o.displayName, DISPLAY_NAME_MAX, errors)
  const registrantType = validateChoice('registrantType', o.registrantType, REGISTRANT_TYPES, errors)
  // 患者さん
  const ageBand = validateChoice('ageBand', o.ageBand, AGE_BANDS, errors)
  const gender = validateChoice('gender', o.gender, GENDERS, errors)
  const prefecture = validateChoice('prefecture', o.prefecture, PREFECTURES, errors)

  // 代理のときだけ、続柄と「18 歳未満か」を見る。本人のときは送られてきても捨てる（null にする）
  let proxyRelation: ProxyRelation | null = null
  let patientIsMinor: boolean | null = null
  if (registrantType === 'proxy' && !errors.some((e) => e.field === 'registrantType')) {
    proxyRelation = validateChoice('proxyRelation', o.proxyRelation, PROXY_RELATIONS, errors)
    if (typeof o.patientIsMinor !== 'boolean') {
      errors.push({ field: 'patientIsMinor', message: CHOOSE_MESSAGE })
    } else {
      patientIsMinor = o.patientIsMinor
      // 18 歳以上の患者さんの代理は、「本人が自分では操作できない」の自己申告が要る
      if (!patientIsMinor && o.proxyAttestation !== true) {
        errors.push({ field: 'proxyAttestation', message: PROXY_ATTESTATION_MESSAGE })
      }
      // 「18 歳未満か」と年代の食い違いを落とす（どちらが正しいか分からないので、直してもらう）
      if (!errors.some((e) => e.field === 'ageBand')) {
        if (patientIsMinor && !MINOR_AGE_BANDS.includes(ageBand)) errors.push({ field: 'ageBand', message: MINOR_AGE_MESSAGE })
        if (!patientIsMinor && ageBand === '10歳未満') errors.push({ field: 'ageBand', message: ADULT_AGE_MESSAGE })
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { fullName, displayName, registrantType, proxyRelation, patientIsMinor, ageBand, gender, prefecture },
  }
}

// ---- DB との行き来 -----------------------------------------------------------

/** member_profiles の 1 行（列名は SQL のまま） */
interface ProfileRow {
  user_id: string
  full_name: string
  display_name: string
  registrant_type: string
  proxy_relation: string | null
  patient_is_minor: boolean | null
  age_band: string
  gender: string
  prefecture: string
  consented_at: string
}

const SELECT_COLUMNS =
  'user_id, full_name, display_name, registrant_type, proxy_relation, patient_is_minor, age_band, gender, prefecture, consented_at'

/**
 * 行 → 型。DB の値が選択肢から外れていたら（選択肢を減らした後など）読まない。
 * 画面には「未入力」として出し、入れ直してもらう。想像で埋めない。
 */
function toProfile(row: ProfileRow): MemberProfile | null {
  const v = validateMemberProfileInput({
    fullName: row.full_name,
    displayName: row.display_name,
    registrantType: row.registrant_type,
    proxyRelation: row.proxy_relation,
    patientIsMinor: row.patient_is_minor,
    // 自己申告は保存のときに確かめ済み（列には持たない）。読むときは済んだものとして扱う
    proxyAttestation: true,
    ageBand: row.age_band,
    gender: row.gender,
    prefecture: row.prefecture,
  })
  if (!v.ok) return null
  return { userId: row.user_id, ...v.value, consentedAt: row.consented_at }
}

/**
 * ログイン中の本人のプロフィール。未ログイン・未作成・形が崩れているときは null。
 * サーバー側（Server Component / Route Handler）からのみ呼ぶ。
 */
export async function getMyProfile(): Promise<MemberProfile | null> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  // RLS で本人の行しか見えないが、ここでも user_id で絞る（二重で閉じる）
  const { data, error } = await supabase
    .from('member_profiles')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // 理由は残すが、行の中身は残さない（氏名をログに出さない）
    console.error('プロフィールの取得に失敗しました:', error.message)
    return null
  }
  return data ? toProfile(data as ProfileRow) : null
}

export type UpsertResult =
  | { ok: true; profile: MemberProfile }
  | { ok: false; errors: FieldError[] }
  | { ok: false; reason: 'unauthenticated' | 'failed' }

/**
 * 本人のプロフィールを作る・書き換える。
 * consented_at は最初の保存のときだけ立てる（DB 側の既定値。更新では送らない）。
 */
export async function upsertMyProfile(raw: unknown): Promise<UpsertResult> {
  const validated = validateMemberProfileInput(raw)
  if (!validated.ok) return { ok: false, errors: validated.errors }

  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return { ok: false, reason: 'unauthenticated' }

  const { value } = validated
  const { data, error } = await supabase
    .from('member_profiles')
    .upsert(
      {
        user_id: userId, // 他人の行は書けない（RLS の with check と合わせて二重）
        full_name: value.fullName,
        display_name: value.displayName,
        registrant_type: value.registrantType,
        proxy_relation: value.proxyRelation,
        patient_is_minor: value.patientIsMinor,
        age_band: value.ageBand,
        gender: value.gender,
        prefecture: value.prefecture,
      },
      { onConflict: 'user_id' }
    )
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) {
    console.error('プロフィールの保存に失敗しました:', error?.message)
    return { ok: false, reason: 'failed' }
  }
  const profile = toProfile(data as ProfileRow)
  return profile ? { ok: true, profile } : { ok: false, reason: 'failed' }
}
