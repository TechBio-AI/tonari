/**
 * 世話人向けダッシュボードの契約（section・choice の定数と型）
 *
 * DB 側の正は public.group_dashboard(group_id)。最新の定義は supabase/migrations/20261016_dashboard_drop_consent.sql
 * （20261012_group_dashboard.sql を差し替え。研究協力の同意の行を外して 27 行 → 26 行）。
 * ここはアプリ側の正で、画面はこの定数で行を並べ・読む。両者の一致は
 * lib/portal/__tests__/group-dashboard.test.ts が確かめる（片方だけ変えるとテストが止める）。
 *
 * 行の並び（0 人でも行がある）:
 *   members_total/all・moderators/all・join_requests_pending/all … 実数（伏せない）
 *   registrant_type・age_band・gender・region … しきい値未満（0 を含む）は '10未満'。
 *   同じ section で伏せた行がちょうど 1 つなら、残りで最小の行も伏せる（補完秘匿）。
 *
 * ★ 世話人だけが見る集計。会員一覧と同じく、一般会員の画面には出さない。
 *   n は文字のまま扱う（'10未満' を数にしない。足し算で伏せた数を戻さない）。
 */

import { AGE_BANDS, GENDERS, REGISTRANT_TYPES, type Prefecture } from '@/lib/portal/member-profile'

/** 伏せるしきい値（DB の public.stats_threshold() と同じ値） */
export const STATS_THRESHOLD = 10

/** 伏せた行の n */
export const SUPPRESSED = '10未満'

/** 実数で返す section（choice は 'all' だけ） */
export const EXACT_SECTIONS = ['members_total', 'moderators', 'join_requests_pending'] as const
export type ExactSection = (typeof EXACT_SECTIONS)[number]

/** 地方ブロック（道のり調査 journey_options('region') の値。'no_answer' は使わない） */
export const REGIONS = [
  'hokkaido',
  'tohoku',
  'kanto',
  'chubu',
  'kinki',
  'chugoku',
  'shikoku',
  'kyushu_okinawa',
] as const
export type Region = (typeof REGIONS)[number]

/** 地方ブロックの表示（道のり調査の表示と同じ）。unknown は都道府県が無い人（プロフィール未作成） */
export const REGION_LABELS: Readonly<Record<Region | 'unknown', string>> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  kyushu_okinawa: '九州・沖縄',
  unknown: '未登録',
}

/** 都道府県 → 地方ブロック（DB の public.prefecture_region と同じ。三重県は近畿） */
export const PREFECTURE_REGION: Readonly<Record<Prefecture, Region>> = {
  北海道: 'hokkaido',
  青森県: 'tohoku', 岩手県: 'tohoku', 宮城県: 'tohoku', 秋田県: 'tohoku', 山形県: 'tohoku', 福島県: 'tohoku',
  茨城県: 'kanto', 栃木県: 'kanto', 群馬県: 'kanto', 埼玉県: 'kanto', 千葉県: 'kanto', 東京都: 'kanto', 神奈川県: 'kanto',
  新潟県: 'chubu', 富山県: 'chubu', 石川県: 'chubu', 福井県: 'chubu', 山梨県: 'chubu', 長野県: 'chubu',
  岐阜県: 'chubu', 静岡県: 'chubu', 愛知県: 'chubu',
  三重県: 'kinki', 滋賀県: 'kinki', 京都府: 'kinki', 大阪府: 'kinki', 兵庫県: 'kinki', 奈良県: 'kinki', 和歌山県: 'kinki',
  鳥取県: 'chugoku', 島根県: 'chugoku', 岡山県: 'chugoku', 広島県: 'chugoku', 山口県: 'chugoku',
  徳島県: 'shikoku', 香川県: 'shikoku', 愛媛県: 'shikoku', 高知県: 'shikoku',
  福岡県: 'kyushu_okinawa', 佐賀県: 'kyushu_okinawa', 長崎県: 'kyushu_okinawa', 熊本県: 'kyushu_okinawa',
  大分県: 'kyushu_okinawa', 宮崎県: 'kyushu_okinawa', 鹿児島県: 'kyushu_okinawa', 沖縄県: 'kyushu_okinawa',
}

/** section ごとの choice（DB が返す順。0 人でも行がある） */
export const DASHBOARD_CHOICES = {
  members_total: ['all'],
  moderators: ['all'],
  join_requests_pending: ['all'],
  registrant_type: REGISTRANT_TYPES,
  age_band: AGE_BANDS,
  gender: GENDERS,
  region: [...REGIONS, 'unknown'],
} as const satisfies Record<string, readonly string[]>

export type DashboardSection = keyof typeof DASHBOARD_CHOICES

/** section の並び（DB が返す順） */
export const DASHBOARD_SECTIONS = Object.keys(DASHBOARD_CHOICES) as DashboardSection[]

/** 伏せることがある section */
export type SuppressibleSection = Exclude<DashboardSection, ExactSection>

/** group_dashboard の 1 行 */
export type DashboardRow = {
  [S in DashboardSection]: { section: S; choice: (typeof DASHBOARD_CHOICES)[S][number]; n: string }
}[DashboardSection]

/** DB が返すはずの行数（section ごとの choice の数の合計） */
export const DASHBOARD_ROW_COUNT = DASHBOARD_SECTIONS.reduce((sum, s) => sum + DASHBOARD_CHOICES[s].length, 0)
