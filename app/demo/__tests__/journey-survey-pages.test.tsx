/**
 * 「病気がわかるまでの道のり」の画面（/demo/community/[slug]/journey・/journey/summary・/demo/community/journey）と server action の検査
 *
 * DB には接続しない。見ている人（session.ts）・tenancy.ts の DB 関数・journey-survey-db.ts を差し替える。
 *   1. JOURNEY_SURVEY が on でないとき: 3 画面とも「準備中（倫理審査の承認後に始めます）」だけ。DB を読まない
 *   2. 調査を出す会: ファブリー病の会と閲覧モードの見本の会だけ。ほかの会は 404。会のタブも同じ
 *   3. 回答フォーム: 14 問・自由記述なし・同意文が案のうちは送れない。回答済みならフォームを出さない
 *   4. 集計: 総数 10 未満は「まだ表示していません」。DB の「10未満」をそのまま出す
 *   5. 閲覧モード: 架空の固定データ。DB を読まない。送れない・取り消せない
 *   6. server action: 閉じているとき・閲覧モード・同意のチェック無し・入力不備では DB を呼ばない
 *   7. 文言: 禁止表現が無い。本人へ可能性・助言を返す文が無い
 *   8. フォームの連動: 排他の選択肢を選ぶと、ほかの症状は選べず、設問 6・11・14 が自動で入る
 */
import * as fs from 'fs'
import * as path from 'path'
import { fireEvent, render, screen } from '@testing-library/react'

// ---- 差し替え ---------------------------------------------------------------
const getViewer = jest.fn()
jest.mock('../_lib/session', () => ({ getViewer: () => getViewer() }))

const tenancy = { listGroups: jest.fn(), myGroups: jest.fn() }
jest.mock('@/lib/portal/tenancy', () => {
  const actual = jest.requireActual('@/lib/portal/tenancy')
  return {
    ...actual,
    listGroups: (...a: unknown[]) => tenancy.listGroups(...a),
    myGroups: (...a: unknown[]) => tenancy.myGroups(...a),
  }
})

const jdb = {
  submitMyJourneyResponse: jest.fn(),
  myJourneyResponses: jest.fn(),
  withdrawMyJourneyResponse: jest.fn(),
  journeySummaryRows: jest.fn(),
}
jest.mock('@/lib/portal/journey-survey-db', () => ({
  submitMyJourneyResponse: (...a: unknown[]) => jdb.submitMyJourneyResponse(...a),
  myJourneyResponses: (...a: unknown[]) => jdb.myJourneyResponses(...a),
  withdrawMyJourneyResponse: (...a: unknown[]) => jdb.withdrawMyJourneyResponse(...a),
  journeySummaryRows: (...a: unknown[]) => jdb.journeySummaryRows(...a),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-secret-1' } } }) } }),
}))

jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/demo/community',
  useRouter: () => ({ refresh: jest.fn() }),
}))

import JourneyPage from '../community/[slug]/journey/page'
import JourneySummaryPage from '../community/[slug]/journey/summary/page'
import MyJourneyPage from '../community/journey/page'
import AnnouncementsPage from '../community/[slug]/page'
import { submitJourneyAction } from '../community/[slug]/journey/actions'
import { withdrawJourneyAction } from '../community/journey/actions'
import { JourneyForm } from '../community/[slug]/journey/JourneyForm'
import { SAMPLE_GROUP } from '../community/_components/sample-group'
import { SAMPLE_JOURNEY_SUMMARY_ROWS, SAMPLE_MY_JOURNEY_RESPONSE } from '../community/_components/sample-journey'
import {
  FOUND_BEFORE_SYMPTOMS,
  JOURNEY_NOT_ENOUGH_MESSAGE,
  JOURNEY_PENDING_MESSAGE,
  JOURNEY_PRINT_NOTE,
  SUPPRESSED,
  type MyJourneyResponse,
} from '@/lib/portal/journey-survey'

// ---- 準備 -------------------------------------------------------------------
const FABRY = { id: '11111111-1111-4111-8111-111111111111', slug: 'fabry-fukurou', name: 'ファブリー病の会（テスト）' }
const OTHER = { id: '22222222-2222-4222-8222-222222222222', slug: 'gaucher-japan', name: 'ほかの会（テスト）' }
const MEMBER = { kind: 'member', email: 'm@example.invalid', hasProfile: true, needsConsent: false }
const RESPONSE_ID = '33333333-3333-4333-8333-333333333333'

const BLOCKLIST = fs
  .readFileSync(path.join(process.cwd(), 'docs', 'wording-blocklist-demo.txt'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))

function mine(slug = FABRY.slug): MyJourneyResponse {
  return { ...SAMPLE_MY_JOURNEY_RESPONSE, responseId: RESPONSE_ID, groupSlug: slug, groupName: FABRY.name }
}

async function html(el: Promise<JSX.Element> | JSX.Element): Promise<string> {
  const { container } = render(await el)
  return container.innerHTML
}

async function thrown(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as Error).message
  }
  return '(throw しなかった)'
}

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x)
  return fd
}

const VALID_FORM = {
  respondent: 'self',
  birth_year_band: '1980_1984',
  gender: 'female',
  region: 'kanto',
  first_symptoms: ['limb_pain'],
  onset_age_band: '5_9',
  first_department: 'pediatrics',
  diagnosis_department: 'nephrology',
  facilities_count: '2_3',
  departments_count: '4_5',
  diagnosis_age_band: '30_34',
  other_diagnosis: 'yes',
  family_history_clue: 'no',
  diagnosis_delay: 'ge20',
  consent: 'yes',
}

const savedEnv = process.env.JOURNEY_SURVEY
beforeEach(() => {
  jest.clearAllMocks()
  process.env.JOURNEY_SURVEY = 'on'
  getViewer.mockResolvedValue(MEMBER)
  tenancy.listGroups.mockResolvedValue({ ok: true, value: [FABRY, OTHER] })
  tenancy.myGroups.mockResolvedValue({ ok: true, value: [{ ...FABRY, role: 'member' }, { ...OTHER, role: 'member' }] })
  jdb.myJourneyResponses.mockResolvedValue({ ok: true, value: [] })
  jdb.journeySummaryRows.mockResolvedValue({ ok: true, value: [] })
  jdb.submitMyJourneyResponse.mockResolvedValue({ ok: true, value: null })
  jdb.withdrawMyJourneyResponse.mockResolvedValue({ ok: true, value: null })
})
afterAll(() => {
  if (savedEnv === undefined) delete process.env.JOURNEY_SURVEY
  else process.env.JOURNEY_SURVEY = savedEnv
})

const noDb = () => {
  for (const f of Object.values(jdb)) expect(f).not.toHaveBeenCalled()
}

// ---- 1. 閉じているとき ----------------------------------------------------------
describe('JOURNEY_SURVEY が on でないとき', () => {
  test.each([[undefined], ['off'], ['ON'], ['true']])('%p: 3 画面とも「準備中」だけを出し、DB を読まない', async (value) => {
    if (value === undefined) delete process.env.JOURNEY_SURVEY
    else process.env.JOURNEY_SURVEY = value
    const a = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    const b = await html(JourneySummaryPage({ params: { slug: FABRY.slug } }))
    const c = await html(MyJourneyPage({}))
    for (const h of [a, b, c]) {
      expect(h).toContain(JOURNEY_PENDING_MESSAGE)
      expect(h).not.toContain('<form')
      expect(h).not.toContain('<table')
    }
    noDb()
  })

  test('server action は DB を呼ばず ?error=disabled で戻す', async () => {
    process.env.JOURNEY_SURVEY = 'off'
    expect(await thrown(submitJourneyAction(FABRY.slug, form(VALID_FORM)))).toBe(
      `redirect:/demo/community/${FABRY.slug}/journey?error=disabled`
    )
    expect(await thrown(withdrawJourneyAction(RESPONSE_ID, form({ confirm: 'yes' })))).toBe('redirect:/demo/community/journey?error=disabled')
    noDb()
  })
})

// ---- 2. 調査を出す会 -------------------------------------------------------------
describe('調査を出す会', () => {
  test('ファブリー病でない会は 404', async () => {
    expect(await thrown(JourneyPage({ params: { slug: OTHER.slug } }))).toBe('notFound')
    expect(await thrown(JourneySummaryPage({ params: { slug: OTHER.slug } }))).toBe('notFound')
  })

  test('会員でない会はお知らせのページへ送る', async () => {
    tenancy.myGroups.mockResolvedValue({ ok: true, value: [] })
    expect(await thrown(JourneyPage({ params: { slug: FABRY.slug } }))).toBe(`redirect:/demo/community/${FABRY.slug}`)
    noDb()
  })

  test('調査のページの会のタブに「道のり」が出る', async () => {
    const fabry = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    expect(fabry).toMatch(/<a[^>]*href="\/demo\/community\/fabry-fukurou\/journey"[^>]*>道のり<\/a>/)
    expect(fabry).toContain(`href="/demo/community/${FABRY.slug}/journey"`)
  })
})

// ---- 3. 回答フォーム -------------------------------------------------------------
describe('回答フォーム（会員）', () => {
  test('14 問・自由記述なし・同意文が案のうちは送れない', async () => {
    const h = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    expect((h.match(/<fieldset/g) ?? []).length).toBe(14)
    expect(h).not.toContain('<textarea')
    expect(h).not.toMatch(/<input[^>]*type="text"/)
    expect(h).toContain('倫理審査の前の案のため、まだ回答を受け付けていません')
    expect(h).toMatch(/<button[^>]*type="submit"[^>]*disabled/)
    expect(jdb.myJourneyResponses).toHaveBeenCalledTimes(1)
  })

  test('回答済みならフォームを出さず、自分の回答・集計への入口を出す', async () => {
    jdb.myJourneyResponses.mockResolvedValue({ ok: true, value: [mine()] })
    const h = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    expect(h).toContain('回答をいただいています')
    expect(h).not.toContain('<fieldset')
    expect(h).toContain('href="/demo/community/journey"')
    expect(h).toContain(`href="/demo/community/${FABRY.slug}/journey/summary"`)
  })

  test('自分の回答を読めなかったときは、フォームを出さない', async () => {
    jdb.myJourneyResponses.mockResolvedValue({ ok: false, reason: 'failed' })
    const h = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    expect(h).not.toContain('<fieldset')
    expect(h).toContain('うまくいきませんでした')
  })

  test('知らない ?error= の値は画面に出さない', async () => {
    const h = await html(JourneyPage({ params: { slug: FABRY.slug }, searchParams: { error: '<b>x</b>' } }))
    expect(h).not.toContain('&lt;b&gt;x')
    const h2 = await html(JourneyPage({ params: { slug: FABRY.slug }, searchParams: { error: 'already_answered' } }))
    expect(h2).toContain('すでに回答しています')
  })
})

// ---- 4. 集計 -------------------------------------------------------------------
describe('集計（会員）', () => {
  test('総数 10 未満（DB が 0 行）なら「まだ表示していません」', async () => {
    const h = await html(JourneySummaryPage({ params: { slug: FABRY.slug } }))
    expect(h).toContain(JOURNEY_NOT_ENOUGH_MESSAGE)
    expect(h).not.toContain('<table')
    expect(jdb.journeySummaryRows).toHaveBeenCalledWith(FABRY.id)
  })

  test('DB の「10未満」と数をそのまま出す', async () => {
    jdb.journeySummaryRows.mockResolvedValue({
      ok: true,
      value: [
        { question: 'total', choice: 'total', sex: 'all', n: '12' },
        { question: 'other_diagnosis', choice: 'yes', sex: 'all', n: '10' },
        { question: 'other_diagnosis', choice: 'no', sex: 'all', n: SUPPRESSED },
      ],
    })
    const h = await html(JourneySummaryPage({ params: { slug: FABRY.slug } }))
    expect(h).toContain('>12</span> 人')
    expect(h).toContain(SUPPRESSED)
    expect((h.match(/<table/g) ?? []).length).toBe(14)
  })

  test('会員でない（DB が not_member）なら、その文だけ', async () => {
    jdb.journeySummaryRows.mockResolvedValue({ ok: false, reason: 'not_member' })
    const h = await html(JourneySummaryPage({ params: { slug: FABRY.slug } }))
    expect(h).toContain('この会の会員ではありません')
    expect(h).not.toContain('<table')
  })
})

describe('集計の印刷', () => {
  const rows = [
    { question: 'total', choice: 'total', sex: 'all', n: '12' },
    { question: 'other_diagnosis', choice: 'yes', sex: 'all', n: '10' },
    { question: 'other_diagnosis', choice: 'no', sex: 'all', n: SUPPRESSED },
  ]

  test('印刷ボタンがあり、紙に出す範囲は会の名前・集計日・注記・総数・表だけ（解釈の文は入れない）', async () => {
    jdb.journeySummaryRows.mockResolvedValue({ ok: true, value: rows })
    const { container } = render(await JourneySummaryPage({ params: { slug: FABRY.slug } }))
    expect(screen.getByRole('button', { name: '印刷する' }).closest('.print\\:hidden')).not.toBeNull()
    expect(container.innerHTML).toContain('@media print')
    const target = container.querySelector('[data-print-target]')
    const text = target?.textContent ?? ''
    expect(text).toContain(FABRY.name)
    expect(text).toMatch(/集計日: \d{4}年\d{1,2}月\d{1,2}日/)
    expect(text).toContain(JOURNEY_PRINT_NOTE)
    expect(text).toContain('回答した方: 12 人')
    expect(target?.querySelectorAll('table')).toHaveLength(14)
    for (const s of ['個々の方の病気', '引き算で戻せない', '翌月から', 'もどる']) expect([s, text.includes(s)]).toEqual([s, false])
    expect(text).not.toContain('（サンプル）')
  })

  test('印刷ボタンの文は「印刷する」で、押すとブラウザの印刷を開くだけ', async () => {
    jdb.journeySummaryRows.mockResolvedValue({ ok: true, value: rows })
    render(await JourneySummaryPage({ params: { slug: FABRY.slug } }))
    const print = jest.fn()
    const orig = window.print
    window.print = print
    try {
      fireEvent.click(screen.getByRole('button', { name: '印刷する' }))
      expect(print).toHaveBeenCalledTimes(1)
    } finally {
      window.print = orig
    }
  })

  test('総数 10 未満で集計が無いときは、印刷ボタンを出さない', async () => {
    const { container } = render(await JourneySummaryPage({ params: { slug: FABRY.slug } }))
    expect(screen.queryByRole('button', { name: '印刷する' })).toBeNull()
    expect(container.querySelector('[data-print-target]')).toBeNull()
  })

  test('閲覧モードの見本は、紙にも「（サンプル）」と出す', async () => {
    getViewer.mockResolvedValue({ kind: 'demo' })
    const { container } = render(await JourneySummaryPage({ params: { slug: SAMPLE_GROUP.slug } }))
    expect(container.querySelector('[data-print-target]')?.textContent).toContain('（サンプル）')
    noDb()
  })
})

// ---- 5. 閲覧モード --------------------------------------------------------------
describe('閲覧モード（demo）', () => {
  beforeEach(() => getViewer.mockResolvedValue({ kind: 'demo' }))

  test('見本の会でフォームを見せるだけ（送れない）。DB を読まない', async () => {
    const h = await html(JourneyPage({ params: { slug: SAMPLE_GROUP.slug } }))
    expect(h).toContain('閲覧モードでは回答を送れません')
    expect(h).toMatch(/<button[^>]*type="submit"[^>]*disabled/)
    noDb()
  })

  test('見本の集計は架空の固定データ（総数 24）', async () => {
    const h = await html(JourneySummaryPage({ params: { slug: SAMPLE_GROUP.slug } }))
    expect(h).toContain('>24</span> 人')
    expect(h).toContain(SUPPRESSED)
    noDb()
  })

  test('見本の集計は、10 未満の数を出さない', () => {
    for (const r of SAMPLE_JOURNEY_SUMMARY_ROWS) {
      expect([r.question, r.choice, r.sex, r.n === SUPPRESSED || Number(r.n) >= 10]).toEqual([r.question, r.choice, r.sex, true])
    }
  })

  test('見本の自分の回答を見せ、取り消せない', async () => {
    const h = await html(MyJourneyPage({}))
    expect(h).toContain('閲覧モードでは取り消せません')
    expect(h).toContain('代理（ご家族など）')
    noDb()
  })

  test('見本以外の会は 404', async () => {
    expect(await thrown(JourneyPage({ params: { slug: FABRY.slug } }))).toBe('notFound')
  })

  test('server action は何もせずログインへ', async () => {
    expect(await thrown(submitJourneyAction(SAMPLE_GROUP.slug, form(VALID_FORM)))).toBe('redirect:/demo/login')
    expect(await thrown(withdrawJourneyAction(RESPONSE_ID, form({ confirm: 'yes' })))).toBe('redirect:/demo/login')
    noDb()
  })
})

// ---- 6. server action -----------------------------------------------------------
describe('server action', () => {
  const here = `redirect:/demo/community/${FABRY.slug}/journey`

  test('同意のチェックが無ければ DB を呼ばない', async () => {
    const { consent: _c, ...rest } = VALID_FORM
    void _c
    expect(await thrown(submitJourneyAction(FABRY.slug, form(rest)))).toBe(`${here}?error=consent_required`)
    noDb()
  })

  test('入力に不備があれば DB を呼ばない', async () => {
    expect(await thrown(submitJourneyAction(FABRY.slug, form({ ...VALID_FORM, region: '' })))).toBe(`${here}?error=invalid_input`)
    expect(
      await thrown(submitJourneyAction(FABRY.slug, form({ ...VALID_FORM, first_symptoms: [FOUND_BEFORE_SYMPTOMS, 'limb_pain'] })))
    ).toBe(`${here}?error=invalid_input`)
    noDb()
  })

  test('ファブリー病でない会には送れない', async () => {
    expect(await thrown(submitJourneyAction(OTHER.slug, form(VALID_FORM)))).toBe(
      `redirect:/demo/community/${OTHER.slug}/journey?error=not_member`
    )
    noDb()
  })

  test('通れば会の id と確かめた値で回答し、自分の回答のページへ', async () => {
    expect(await thrown(submitJourneyAction(FABRY.slug, form(VALID_FORM)))).toBe('redirect:/demo/community/journey?done=answered')
    expect(jdb.submitMyJourneyResponse).toHaveBeenCalledTimes(1)
    const [groupId, answers] = jdb.submitMyJourneyResponse.mock.calls[0]
    expect(groupId).toBe(FABRY.id)
    expect(answers).toMatchObject({ region: 'kanto', first_symptoms: ['limb_pain'] })
    expect(answers).not.toHaveProperty('consent')
  })

  test('DB の理由で戻す', async () => {
    jdb.submitMyJourneyResponse.mockResolvedValue({ ok: false, reason: 'consent_draft' })
    expect(await thrown(submitJourneyAction(FABRY.slug, form(VALID_FORM)))).toBe(`${here}?error=consent_draft`)
  })

  test('取り消し: id の形が違う・確認のチェックが無いときは DB を呼ばない', async () => {
    expect(await thrown(withdrawJourneyAction('../x', form({ confirm: 'yes' })))).toBe('redirect:/demo/community/journey?error=not_found')
    expect(await thrown(withdrawJourneyAction(RESPONSE_ID, form({})))).toBe('redirect:/demo/community/journey?error=invalid_input')
    noDb()
  })

  test('取り消し: 通れば DB を呼んで ?done=withdrawn', async () => {
    expect(await thrown(withdrawJourneyAction(RESPONSE_ID, form({ confirm: 'yes' })))).toBe('redirect:/demo/community/journey?done=withdrawn')
    expect(jdb.withdrawMyJourneyResponse).toHaveBeenCalledWith(RESPONSE_ID)
  })

  test('取り消しは、利用目的の再同意が要る会員でもできる', async () => {
    getViewer.mockResolvedValue({ ...MEMBER, needsConsent: true })
    expect(await thrown(withdrawJourneyAction(RESPONSE_ID, form({ confirm: 'yes' })))).toBe('redirect:/demo/community/journey?done=withdrawn')
  })
})

// ---- 自分の回答 -----------------------------------------------------------------
describe('自分の回答（会員）', () => {
  test('選んだ答えの文と、取り消しのフォームを出す。user_id は出さない', async () => {
    jdb.myJourneyResponses.mockResolvedValue({ ok: true, value: [mine()] })
    const h = await html(MyJourneyPage({ searchParams: { done: 'answered' } }))
    expect(h).toContain('回答を受け付けました')
    expect(h).toContain('手足の痛み')
    expect(h).toContain('回答を取り消す')
    expect(h).not.toContain('user-secret-1')
  })

  test('回答が無ければ「回答はありません」', async () => {
    const h = await html(MyJourneyPage({}))
    expect(h).toContain('回答はありません')
  })

  test('未ログインはログインへ', async () => {
    getViewer.mockResolvedValue(null)
    expect(await thrown(MyJourneyPage({}))).toBe('redirect:/demo/login')
  })
})

// ---- 7. 文言 -------------------------------------------------------------------
describe('文言', () => {
  test('3 画面に禁止表現が無く、本人へ結果を返さないことを書いている', async () => {
    jdb.myJourneyResponses.mockResolvedValue({ ok: true, value: [] })
    const a = await html(JourneyPage({ params: { slug: FABRY.slug } }))
    jdb.journeySummaryRows.mockResolvedValue({ ok: true, value: SAMPLE_JOURNEY_SUMMARY_ROWS })
    const b = await html(JourneySummaryPage({ params: { slug: FABRY.slug } }))
    jdb.myJourneyResponses.mockResolvedValue({ ok: true, value: [mine()] })
    const c = await html(MyJourneyPage({}))
    for (const h of [a, b, c]) for (const w of BLOCKLIST) expect([w, h.includes(w)]).toEqual([w, false])
    expect(a).toContain('病気の可能性や受診先などをお返しすることはありません')
    expect(b).toContain('個々の方の病気について何かを示すものではありません')
  })
})

// ---- 8. フォームの連動 -----------------------------------------------------------
describe('回答フォームの連動', () => {
  test('排他の選択肢を選ぶと、ほかの症状は選べず、設問 6・11・14 が自動で入る', () => {
    const { container } = render(
      <JourneyForm action={jest.fn()} consentText="説明" consentLabel="同意します" disabled={false} disabledReason={null} />
    )
    const box = (v: string) => container.querySelector(`input[name="first_symptoms"][value="${v}"]`) as HTMLInputElement
    fireEvent.click(box('limb_pain'))
    expect(box('limb_pain').checked).toBe(true)
    // 選ぶ前は、設問 6・11・14 に「症状に気づく前に分かった」が出ない
    expect(container.querySelector('select[name="onset_age_band"] option[value="before_symptoms"]')).toBeNull()
    expect(container.querySelector('input[name="diagnosis_delay"][value="before_symptoms"]')).toBeNull()

    fireEvent.click(box(FOUND_BEFORE_SYMPTOMS))
    expect(box(FOUND_BEFORE_SYMPTOMS).checked).toBe(true)
    expect(box('limb_pain').checked).toBe(false)
    expect(box('limb_pain').disabled).toBe(true)
    for (const key of ['onset_age_band', 'diagnosis_age_band', 'diagnosis_delay']) {
      expect((container.querySelector(`input[type="hidden"][name="${key}"]`) as HTMLInputElement).value).toBe('before_symptoms')
    }
    expect(screen.getAllByText('症状に気づく前に分かった（設問5の答えから自動で入ります）')).toHaveLength(3)

    fireEvent.click(box(FOUND_BEFORE_SYMPTOMS))
    expect(box('limb_pain').disabled).toBe(false)
    expect(container.querySelector('input[type="hidden"][name="diagnosis_delay"]')).toBeNull()
  })
})

// 会のお知らせのページにも、ファブリー病の会ならタブが出る（GroupShell 経由）
describe('会のタブ', () => {
  test('ファブリー病の会には出て、ほかの会には出ない', async () => {
    const listPosts = jest.spyOn(jest.requireMock('@/lib/portal/tenancy') as { listPosts: () => unknown }, 'listPosts')
    listPosts.mockResolvedValue({ ok: true, value: [] } as never)
    const fabry = await html(AnnouncementsPage({ params: { slug: FABRY.slug } }))
    expect(fabry).toContain(`href="/demo/community/${FABRY.slug}/journey"`)
    const other = await html(AnnouncementsPage({ params: { slug: OTHER.slug } }))
    expect(other).not.toContain('/journey"')
  })

  test('JOURNEY_SURVEY が on でなければ、ファブリー病の会にも出さない', async () => {
    process.env.JOURNEY_SURVEY = 'off'
    const listPosts = jest.spyOn(jest.requireMock('@/lib/portal/tenancy') as { listPosts: () => unknown }, 'listPosts')
    listPosts.mockResolvedValue({ ok: true, value: [] } as never)
    const fabry = await html(AnnouncementsPage({ params: { slug: FABRY.slug } }))
    expect(fabry).not.toContain('/journey"')
  })
})
