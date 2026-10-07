/**
 * 患者会の紹介（data/patient_groups/patient_groups.json の groups[].intro）を、公開ページに出す形に読む
 *
 * intro は公式サイトだけを出典にした下書き（各文に source_url と evidence）。
 * 2026-10-02 ファウンダー指示で、status が draft_unreviewed の下書きも、注記つきで公開ページに出す
 * （注記: INTRO_DRAFT_NOTICE）。それ以外の status は、出し方が決まっていないので出さない（不明の値は出さない側に倒す）。
 *
 * 出す文は、出典が「その団体の公式サイト（data の url と同じホスト）」のものだけ。違うホストの出典は捨てる。
 * evidence（原文の抜き書き）は画面に出さない（出典 URL だけを出す）。
 * facts が 0 件の団体（公式サイトを取得できなかった・URL 未確認）は「紹介が無い」扱い（画面は従来どおり「準備中」）。
 */

import type { PatientGroup } from '@/lib/portal/patient-groups'

export const INTRO_DRAFT_NOTICE = '紹介文は公式サイトの記載をもとに運営が作成しました。団体による確認はこれからです。'

/** 出してよい status（値と注記の対応）。ここに無い値は出さない */
const DISPLAYABLE_STATUSES = new Set(['draft_unreviewed'])

export interface IntroFact {
  text: string
  sourceUrl: string
}

export interface GroupIntro {
  status: string
  /** 紹介文（名前・設立・対象・会員数） */
  about: IntroFact[]
  activities: IntroFact[]
  contacts: IntroFact[]
  joining: IntroFact[]
  /** 連絡先のページ（公式サイト内）。無ければ null */
  contactUrl: string | null
}

const ABOUT_KINDS = new Set(['name', 'founded', 'target', 'members'])

function hostOf(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

/** その団体の公式サイト（data の url）と同じホストか */
function isOfficial(url: unknown, officialHost: string): url is string {
  return typeof url === 'string' && hostOf(url) === officialHost
}

/** 出せる紹介が無ければ null（画面は「準備中」のまま） */
export function readGroupIntro(group: PatientGroup): GroupIntro | null {
  const raw = (group as PatientGroup & { intro?: unknown }).intro
  if (!raw || typeof raw !== 'object' || !group.url) return null
  const intro = raw as { status?: unknown; facts?: unknown; contact_url?: unknown }
  if (typeof intro.status !== 'string' || !DISPLAYABLE_STATUSES.has(intro.status)) return null
  const officialHost = hostOf(group.url)
  if (!officialHost || !Array.isArray(intro.facts)) return null

  const out: GroupIntro = {
    status: intro.status,
    about: [],
    activities: [],
    contacts: [],
    joining: [],
    contactUrl: isOfficial(intro.contact_url, officialHost) ? intro.contact_url : null,
  }
  for (const f of intro.facts as unknown[]) {
    if (!f || typeof f !== 'object') continue
    const { kind, text, source_url } = f as { kind?: unknown; text?: unknown; source_url?: unknown }
    if (typeof kind !== 'string' || typeof text !== 'string' || text.trim() === '') continue
    if (!isOfficial(source_url, officialHost)) continue
    const fact = { text, sourceUrl: source_url }
    if (ABOUT_KINDS.has(kind)) out.about.push(fact)
    else if (kind === 'activity') out.activities.push(fact)
    else if (kind === 'contact') out.contacts.push(fact)
    else if (kind === 'join') out.joining.push(fact)
    // 知らない kind は出さない（出し方が決まっていないため）
  }
  const total = out.about.length + out.activities.length + out.contacts.length + out.joining.length
  return total > 0 ? out : null
}
