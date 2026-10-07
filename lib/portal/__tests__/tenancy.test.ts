/**
 * @jest-environment node
 *
 * 患者会テナント（lib/portal/tenancy.ts と supabase/migrations/*_patient_group_tenancy.sql）
 *
 * DB には接続しない。見るのは 3 つ:
 *   1. 入力検証とエラーの読み替え（tenancy.ts の純粋な関数）
 *   2. seed が data/patient_groups/ と知識ファイルに一致しているか（kb_issues 47 の idx ずれの検知）
 *   3. migration の文面が RLS 方針（docs/patient_group_tenancy_rls.md）どおりか
 * 行の境界そのものは、migration 末尾の手順でファウンダーがローカルで確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    throw new Error('このテストでは DB に触らない')
  },
}))

import {
  COMMENT_BODY_MAX,
  FAILURE_MESSAGES,
  FAILURE_REASONS,
  INVITATION_DAYS_DEFAULT,
  INVITATION_DAYS_MAX,
  JOIN_MESSAGE_MAX,
  POST_BODY_MAX,
  POST_TITLE_MAX,
  isInvitationToken,
  isPostKind,
  isUuid,
  mapDbError,
  REFERRER_NAME_MAX,
  validateInvitationDays,
  validateReferrerName,
  validateJoinMessage,
  validatePostInput,
  validateRequiredText,
} from '@/lib/portal/tenancy'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
/**
 * 版番号（日付の頭）は重なり対策で付け替わるので、固定名で読まない。
 * *_patient_group_tenancy.sql がちょうど 1 本であることも確かめる（2 本あるとどちらを見たか分からない）
 */
const MIGRATION_FILES = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('_patient_group_tenancy.sql'))
if (MIGRATION_FILES.length !== 1) {
  throw new Error(
    `supabase/migrations に *_patient_group_tenancy.sql が ${MIGRATION_FILES.length} 本あります（1 本のはず）: ${MIGRATION_FILES.join(', ')}`
  )
}
const MIGRATION = fs.readFileSync(path.join(MIGRATIONS_DIR, MIGRATION_FILES[0]), 'utf-8')
/** コメント行を落とした SQL（コメント中の例文に反応しないように） */
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
const SQL = stripComments(MIGRATION)

/** v2（20260927 は適用済みで書き換えないので、変更は別ファイル）。これも固定名で読まない */
const V2_FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_patient_group_tenancy_v2.sql'))
if (V2_FILES.length !== 1) {
  throw new Error(`supabase/migrations に *_patient_group_tenancy_v2.sql が ${V2_FILES.length} 本あります（1 本のはず）`)
}
const SQL_V2 = stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, V2_FILES[0]), 'utf-8'))

/** CREATE OR REPLACE FUNCTION public.f(引数) → 'public.f(uuid,text)' の形 */
function signatures(sql: string): string[] {
  return [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(([^)]*)\)/g)].map((m) => {
    const types = m[2]
      .split(',')
      .map((a) => a.trim().split(/\s+/)[1]?.toLowerCase())
      .filter(Boolean)
    return `public.${m[1]}(${types.join(',')})`
  })
}
/** v2 で消した関数 → 'public.f(uuid,text)' の形 */
const DROPPED_IN_V2 = [...SQL_V2.matchAll(/DROP FUNCTION IF EXISTS public\.(\w+)\(([^)]*)\)/g)].map(
  (m) => `public.${m[1]}(${m[2].toLowerCase().replace(/\s+/g, '')})`
)
/** 20261003: 会員一覧を世話人だけにする差し替え */
const MEMBERS_FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_members_moderator_only.sql'))
if (MEMBERS_FILES.length !== 1) {
  throw new Error(`supabase/migrations に *_members_moderator_only.sql が ${MEMBERS_FILES.length} 本あります（1 本のはず）`)
}
const SQL_MEMBERS = stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, MEMBERS_FILES[0]), 'utf-8'))

/** v1 → v2 → 20261003 を当てた後にある関数（最新の定義の本文を引く） */
function latestDefinition(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`
  const body = [SQL_MEMBERS, SQL_V2, SQL].map((sql) => sql.split(marker)[1]).find((b) => b !== undefined)
  return (body ?? '').split('$$;')[0]
}

describe('入力検証', () => {
  test('UUID・種類・招待 token の形', () => {
    expect(isUuid('7f1c2a9e-1b2c-4d5e-8f90-123456789abc')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid(123)).toBe(false)
    expect(isPostKind('announcement')).toBe(true)
    expect(isPostKind('thread')).toBe(true)
    expect(isPostKind('poll')).toBe(false)
    expect(isInvitationToken('a'.repeat(64))).toBe(true)
    expect(isInvitationToken('A'.repeat(64))).toBe(false)
    expect(isInvitationToken("'; drop table x; --")).toBe(false)
    expect(isInvitationToken('a'.repeat(31))).toBe(false)
  })

  test('必須の文章は空白だけ（全角含む）を通さず、上限をコードポイントで数える', () => {
    expect(validateRequiredText('　 \n', 10)).toEqual({ ok: false, message: '入力してください' })
    expect(validateRequiredText(null, 10).ok).toBe(false)
    expect(validateRequiredText(' 題 ', 10)).toEqual({ ok: true, value: '題' })
    expect(validateRequiredText('😀'.repeat(10), 10).ok).toBe(true)
    expect(validateRequiredText('😀'.repeat(11), 10).ok).toBe(false)
  })

  test('投稿は種類・題・本文をまとめて検証する', () => {
    expect(validatePostInput({ kind: 'thread', title: ' はじめまして ', body: 'よろしく' })).toEqual({
      ok: true,
      value: { kind: 'thread', title: 'はじめまして', body: 'よろしく' },
    })
    const bad = validatePostInput({ kind: 'x', title: '', body: 'a'.repeat(POST_BODY_MAX + 1) })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.map((e) => e.field).sort()).toEqual(['body', 'kind', 'title'])
    expect(validatePostInput(null).ok).toBe(false)
    expect(validatePostInput({ kind: 'thread', title: 'a'.repeat(POST_TITLE_MAX), body: 'b' }).ok).toBe(true)
  })

  test('紹介者の氏名は任意。空・空白だけは null、上限を超えたら落とす', () => {
    expect(validateReferrerName(undefined)).toEqual({ ok: true, value: null })
    expect(validateReferrerName('　 ')).toEqual({ ok: true, value: null })
    expect(validateReferrerName(' 山田 花子 ')).toEqual({ ok: true, value: '山田 花子' })
    expect(validateReferrerName(1).ok).toBe(false)
    expect(validateReferrerName('あ'.repeat(REFERRER_NAME_MAX)).ok).toBe(true)
    expect(validateReferrerName('あ'.repeat(REFERRER_NAME_MAX + 1)).ok).toBe(false)
  })

  test('申請のひとことは空でよく、上限を超えたら落とす', () => {
    expect(validateJoinMessage(undefined)).toEqual({ ok: true, value: '' })
    expect(validateJoinMessage('  ')).toEqual({ ok: true, value: '' })
    expect(validateJoinMessage(1).ok).toBe(false)
    expect(validateJoinMessage('あ'.repeat(JOIN_MESSAGE_MAX + 1)).ok).toBe(false)
  })

  test('招待の日数は 1〜90 の整数、未指定は既定値', () => {
    expect(validateInvitationDays(undefined)).toBe(INVITATION_DAYS_DEFAULT)
    expect(validateInvitationDays(1)).toBe(1)
    expect(validateInvitationDays(INVITATION_DAYS_MAX)).toBe(INVITATION_DAYS_MAX)
    expect(validateInvitationDays(0)).toBeNull()
    expect(validateInvitationDays(INVITATION_DAYS_MAX + 1)).toBeNull()
    expect(validateInvitationDays(1.5)).toBeNull()
    expect(validateInvitationDays('7')).toBeNull()
  })

  test('DB のエラー文は既知の語だけ理由に読み替え、それ以外は failed', () => {
    expect(mapDbError('invitation_expired')).toBe('invitation_expired')
    expect(mapDbError('forbidden')).toBe('forbidden')
    expect(mapDbError('new row violates row-level security policy for table "group_posts"')).toBe('forbidden')
    expect(mapDbError('duplicate key value violates unique constraint')).toBe('failed')
    expect(mapDbError(undefined)).toBe('failed')
    // 部分一致で拾わない（DB の文面を画面に漏らさない）
    expect(mapDbError('xx forbidden xx')).toBe('failed')
  })

  test('すべての理由に日本語の文言がある', () => {
    for (const r of FAILURE_REASONS) expect(FAILURE_MESSAGES[r]).toBeTruthy()
  })
})

describe('定数が DB の CHECK と同じ', () => {
  test('文字数の上限', () => {
    expect(SQL).toContain(`char_length(title) <= ${POST_TITLE_MAX}`)
    expect(SQL).toContain(`char_length(body) <= ${POST_BODY_MAX}`)
    expect(SQL).toContain(`char_length(body) <= ${COMMENT_BODY_MAX}`)
    expect(SQL).toContain(`char_length(message) <= ${JOIN_MESSAGE_MAX}`)
    expect(SQL).toContain(`INTERVAL '${INVITATION_DAYS_DEFAULT} days'`)
    expect(SQL).toContain(`INTERVAL '${INVITATION_DAYS_MAX} days'`)
    expect(SQL_V2).toContain(`char_length(referrer_name) <= ${REFERRER_NAME_MAX}`)
    expect(SQL_V2).toContain(`char_length(v_ref) > ${REFERRER_NAME_MAX}`)
  })
})

describe('seed が data/patient_groups と知識ファイルに一致する', () => {
  const groups = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'patient_groups', 'patient_groups.json'), 'utf-8')
  ).groups as { id: string; name: string; diseases: string[] }[]
  const knowledge = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'knowledge', 'comprehensive_rare_diseases_knowledge.json'), 'utf-8')
  ) as { disease: string }[]

  const seedBlock = MIGRATION.split('-- BEGIN SEED')[1]?.split('-- END SEED')[0] ?? ''
  const rows = [...seedBlock.matchAll(/\('([^']+)', '([^']+)', ARRAY\[([\d, ]*)\]::INT\[\], ARRAY\[(.*?)\]::TEXT\[\]\)/g)].map(
    (m) => ({
      slug: m[1],
      name: m[2],
      idxs: m[3].split(',').map((s) => Number(s.trim())),
      names: [...m[4].matchAll(/'([^']+)'/g)].map((n) => n[1]),
    })
  )

  test('JSON の会がすべて、同じ slug・名前・疾患名で入っている', () => {
    expect(rows).toHaveLength(groups.length)
    for (const g of groups) {
      const row = rows.find((r) => r.slug === g.id)
      expect(row).toBeDefined()
      expect(row!.name).toBe(g.name)
      expect(row!.names).toEqual(g.diseases)
    }
  })

  test('idx の位置にある疾患名が disease_names と同じ（ずれたら新しい migration で seed を流し直す）', () => {
    for (const r of rows) {
      expect(r.idxs).toHaveLength(r.names.length)
      r.idxs.forEach((idx, i) => {
        expect(knowledge[idx]?.disease).toBe(r.names[i])
      })
    }
  })
})

describe('migration の RLS 方針（docs/patient_group_tenancy_rls.md）', () => {
  const TABLES = ['patient_groups', 'memberships', 'invitations', 'join_requests', 'group_posts', 'group_comments']
  const FUNCTIONS = [
    'is_group_member',
    'is_group_moderator',
    'accept_invitation',
    'request_join',
    'approve_join_request',
    'reject_join_request',
    'list_group_members',
    'delete_group_post',
    'delete_group_comment',
    'leave_group',
    'list_join_requests',
    'appoint_moderator',
    'dismiss_moderator',
    'export_group',
  ]

  test('すべての表で RLS を有効にし、anon / authenticated の既定の権限をはがしている', () => {
    for (const t of TABLES) {
      expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`))
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON public\\.${t}\\s+FROM anon, authenticated`))
    }
  })

  test('memberships には insert / update / delete のポリシーも権限も無い（関数経由のみ）', () => {
    expect(SQL).not.toMatch(/ON public\.memberships\s+FOR (INSERT|UPDATE|DELETE|ALL)/)
    expect(SQL).not.toMatch(/GRANT [^;]*(INSERT|UPDATE|DELETE)[^;]*ON public\.memberships/)
  })

  test('どの表にも DELETE の権限を与えない（削除は論理削除）', () => {
    expect(SQL).not.toMatch(/GRANT [^;]*DELETE[^;]*TO authenticated/)
    expect(SQL).not.toMatch(/FOR DELETE/)
  })

  test('ポリシーはすべて TO authenticated（anon 向けは無い）', () => {
    const policies = SQL.match(/CREATE POLICY[\s\S]*?;/g) ?? []
    expect(policies.length).toBeGreaterThan(0)
    for (const p of policies) expect(p).toMatch(/TO authenticated/)
  })

  test('patient_groups は id / slug / name の列だけを渡す', () => {
    expect(SQL).toContain('GRANT SELECT (id, slug, name) ON public.patient_groups TO authenticated')
    expect(SQL).not.toMatch(/GRANT SELECT ON public\.patient_groups/)
  })

  test('announcement の insert はモデレーター、thread は会員', () => {
    expect(SQL).toContain("(kind = 'announcement' AND public.is_group_moderator(group_id))")
    expect(SQL).toContain("(kind = 'thread' AND public.is_group_member(group_id))")
  })

  test('関数はすべて SECURITY DEFINER・search_path 固定・auth.uid() を見る・anon から実行できない', () => {
    for (const f of FUNCTIONS) {
      const def = SQL.split(`CREATE OR REPLACE FUNCTION public.${f}(`)[1]?.split('$$;')[0]
      expect(def).toBeDefined()
      expect(def).toContain('SECURITY DEFINER')
      expect(def).toContain("SET search_path = ''")
      expect(def).toContain('auth.uid()')
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\([^)]*\\)\\s+FROM PUBLIC, anon`))
      expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${f}\\([^)]*\\)\\s+TO authenticated`))
    }
  })

  test('退会は本人の行だけに left_at を立て、行は消さない', () => {
    const def = SQL.split('CREATE OR REPLACE FUNCTION public.leave_group(')[1].split('$$;')[0]
    expect(def).toMatch(/UPDATE public\.memberships\s+SET left_at = now\(\)\s+WHERE user_id = v_uid/)
    expect(def).not.toMatch(/DELETE/)
    expect(def).toContain("MESSAGE = 'last_moderator'")
    expect(mapDbError('last_moderator')).toBe('last_moderator')
  })

  test('申請一覧（v2）は世話人にだけ、審査用に申請者の氏名と紹介者の氏名も返す。user_id・メールは返さない', () => {
    const def = latestDefinition('list_join_requests')
    expect(def.replace(/\s+/g, ' ')).toContain(
      'RETURNS TABLE ( id UUID, display_name TEXT, full_name TEXT, referrer_name TEXT, message TEXT, created_at TIMESTAMP WITH TIME ZONE)'
    )
    expect(def).toContain('NOT public.is_group_moderator(p_group_id)')
    expect(def).not.toMatch(/r\.user_id,|email/)
  })

  test('任命・解除は世話人だけ、解除は最後の 1 人を残す', () => {
    for (const f of ['appoint_moderator', 'dismiss_moderator']) {
      const def = SQL.split(`CREATE OR REPLACE FUNCTION public.${f}(`)[1].split('$$;')[0]
      expect(def).toContain('NOT public.is_group_moderator(p_group_id)')
      expect(def).toContain('m.left_at IS NULL')
    }
    const dismiss = SQL.split('CREATE OR REPLACE FUNCTION public.dismiss_moderator(')[1].split('$$;')[0]
    expect(dismiss).toContain("MESSAGE = 'last_moderator'")
    expect(mapDbError('not_moderator')).toBe('not_moderator')
  })

  test('書き出し・会員一覧・書き手の対応表は full_name・referrer_name を返さない', () => {
    for (const f of ['list_group_members', 'list_group_author_names', 'export_group']) {
      const def = latestDefinition(f)
      expect(def).not.toContain('full_name')
      expect(def).not.toContain('referrer_name')
    }
    const exportDef = SQL.split('CREATE OR REPLACE FUNCTION public.export_group(')[1].split('$$;')[0]
    expect(exportDef).not.toMatch(/'user_id'|'author_id'/)
  })
})

describe('v2（紹介者・氏名・user_id の出し分け）', () => {
  test('v2 時点では、会員一覧の user_id は世話人にだけ（一般会員には NULL）だった', () => {
    const def = SQL_V2.split('CREATE OR REPLACE FUNCTION public.list_group_members(')[1].split('$$;')[0]
    expect(def).toContain('CASE WHEN v_moderator THEN m.user_id END')
  })

  test('書き手の対応表は会員だけが呼べ、書いた人の分だけを返す', () => {
    const def = latestDefinition('list_group_author_names')
    expect(def).toContain('NOT public.is_group_member(p_group_id)')
    expect(def).toMatch(/FROM public\.group_posts p/)
    expect(def).toMatch(/FROM public\.group_comments c/)
  })

  test('request_join は旧い 2 引数版を消してから 3 引数版を作る（呼び出しが曖昧にならない）', () => {
    expect(DROPPED_IN_V2).toContain('public.request_join(uuid,text)')
    expect(signatures(SQL_V2)).toContain('public.request_join(uuid,text,text)')
    expect(latestDefinition('request_join')).toContain('INSERT INTO public.join_requests (group_id, user_id, message, referrer_name)')
  })

  test('審査（承認・却下）で紹介者の氏名を消さない', () => {
    for (const f of ['approve_join_request', 'reject_join_request']) {
      expect(latestDefinition(f)).not.toContain('referrer_name')
    }
  })

  test('v2 の関数も SECURITY DEFINER・search_path 固定・auth.uid() を見る・anon から実行できない', () => {
    for (const sig of signatures(SQL_V2)) {
      const name = sig.slice('public.'.length, sig.indexOf('('))
      const def = latestDefinition(name)
      expect(def).toContain('SECURITY DEFINER')
      expect(def).toContain("SET search_path = ''")
      expect(def).toContain('auth.uid()')
      const args = sig.slice(sig.indexOf('(') + 1, -1).toUpperCase().split(',').join(',\\s*')
      expect(SQL_V2).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(${args}\\)\\s+FROM PUBLIC, anon`))
      expect(SQL_V2).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(${args}\\)\\s+TO authenticated`))
    }
  })
})

describe('確認台本 scripts/portal/verify_tenancy.sql が migration とずれていない', () => {
  const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_tenancy.sql'), 'utf-8')

  test('ローカル専用の明記と、本番らしい DB で止まる安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('v1・v2 を当てた後の SECURITY DEFINER 関数をすべて台本の FUNCS に載せている', () => {
    // v1 のうち v2 で消したものを除き、v2 で作ったもの（消して作り直したものを含む）を足す
    const defined = [
      ...new Set([...signatures(SQL).filter((sig) => !DROPPED_IN_V2.includes(sig)), ...signatures(SQL_V2)]),
    ]
    const funcsBlock = SCRIPT.split('FUNCS CONSTANT TEXT[] := ARRAY[')[1].split('];')[0]
    const listed = [...funcsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(listed.sort()).toEqual(defined.sort())
  })

  test('項目 0〜18 と後片付けがそろっている', () => {
    for (let i = 0; i <= 18; i++) {
      expect(SCRIPT).toMatch(new RegExp(`vt_(chk|rec)\\('${i}',`))
    }
    expect(SCRIPT).toContain("vt_chk('後片付け'")
  })
})

describe('request_join の差し替え（空白だけの紹介者を NULL で保存）', () => {
  const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_request_join_referrer_null.sql'))
  const FIX = FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')) : ''

  test('ファイルがちょうど 1 本あり、v2 と同じ引数の request_join を差し替える', () => {
    expect(FILES).toHaveLength(1)
    expect(signatures(FIX)).toEqual(['public.request_join(uuid,text,text)'])
    expect(FIX).not.toMatch(/DROP FUNCTION/)
  })

  test('前後の空白を全角空白も含めて落とす（btrim は半角だけなので使わない）', () => {
    expect(FIX).toContain("'^[[:space:]　]+|[[:space:]　]+$'")
    expect(FIX).not.toMatch(/btrim\(/)
    // tenancy.ts 側も全角空白だけを null にしている
    expect(validateReferrerName('　')).toEqual({ ok: true, value: null })
  })

  test('SECURITY DEFINER・search_path 固定・auth.uid()・anon から実行できない、は v2 のまま', () => {
    expect(FIX).toContain('SECURITY DEFINER')
    expect(FIX).toContain("SET search_path = ''")
    expect(FIX).toContain('auth.uid()')
    expect(FIX).toMatch(/REVOKE ALL ON FUNCTION public\.request_join\(UUID, TEXT, TEXT\)\s+FROM PUBLIC, anon/)
    expect(FIX).toMatch(/GRANT EXECUTE ON FUNCTION public\.request_join\(UUID, TEXT, TEXT\)\s+TO authenticated/)
  })
})

describe('会員一覧は世話人だけ（20261003）', () => {
  test('list_group_members は世話人でなければ forbidden で止める（会員かどうかでは通さない）', () => {
    const def = latestDefinition('list_group_members')
    expect(def).toMatch(/IF NOT public\.is_group_moderator\(p_group_id\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    expect(def).not.toContain('is_group_member(')
    expect(def).not.toContain('full_name')
    expect(def).toContain('SECURITY DEFINER')
    expect(def).toContain("SET search_path = ''")
  })

  test('戻りの列は v2 と同じ（CREATE OR REPLACE で差し替えられる）・権限を付け直している', () => {
    const cols = (sql: string) =>
      sql.split('CREATE OR REPLACE FUNCTION public.list_group_members(')[1].split('LANGUAGE')[0].replace(/\s+/g, ' ')
    expect(cols(SQL_MEMBERS)).toBe(cols(SQL_V2))
    expect(SQL_MEMBERS).not.toMatch(/DROP FUNCTION/)
    expect(SQL_MEMBERS).toMatch(/REVOKE ALL ON FUNCTION public\.list_group_members\(UUID\)\s+FROM PUBLIC, anon/)
    expect(SQL_MEMBERS).toMatch(/GRANT EXECUTE ON FUNCTION public\.list_group_members\(UUID\)\s+TO authenticated/)
  })

  test('書き手の対応表は会員なら引け、会員一覧に依存しない（掲示板の表示名は変わらない）', () => {
    const def = latestDefinition('list_group_author_names')
    expect(def).toContain('NOT public.is_group_member(p_group_id)')
    expect(def).not.toContain('is_group_moderator')
    expect(def).not.toContain('list_group_members')
    expect(SQL_MEMBERS).not.toContain('list_group_author_names(')
  })

  test('tenancy.ts の書き手の表示名は list_group_author_names から引き、会員一覧は世話人だけ', () => {
    const ts = fs.readFileSync(path.join(ROOT, 'lib', 'portal', 'tenancy.ts'), 'utf-8')
    const memberNamesFn = ts.split('async function memberNames(')[1].split('\n}\n')[0]
    expect(memberNamesFn).toContain("rpc('list_group_author_names'")
    expect(memberNamesFn).not.toContain('list_group_members')
    const listMembersFn = ts.split('export async function listMembers(')[1].split('\n}\n')[0]
    expect(listMembersFn).toContain("if (role !== 'moderator') return fail('forbidden')")
  })
})

describe('入会申請は request_join 経由だけ（20261004）', () => {
  const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_join_requests_rpc_only.sql'))
  const SQL_RPC_ONLY = FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')) : ''

  test('ファイルがちょうど 1 本あり、直接 insert のポリシーと INSERT の権限（表・列）を外す', () => {
    expect(FILES).toHaveLength(1)
    expect(SQL_RPC_ONLY).toContain('DROP POLICY IF EXISTS join_requests_insert_own ON public.join_requests;')
    expect(SQL_RPC_ONLY).toContain('REVOKE INSERT ON public.join_requests FROM authenticated;')
    expect(SQL_RPC_ONLY).toContain(
      'REVOKE INSERT (group_id, user_id, message, referrer_name) ON public.join_requests FROM authenticated;'
    )
  })

  test('select と世話人の却下（update）は外さない・新しい insert の道を作らない', () => {
    expect(SQL_RPC_ONLY).not.toMatch(/DROP POLICY IF EXISTS join_requests_(select|update_moderator)/)
    expect(SQL_RPC_ONLY).not.toMatch(/REVOKE (SELECT|UPDATE)/)
    expect(SQL_RPC_ONLY).not.toMatch(/GRANT|CREATE POLICY/)
  })

  test('申請を作るのは SECURITY DEFINER の request_join（最新の定義）だけ', () => {
    const def = latestDefinition('request_join')
    expect(def).toContain('SECURITY DEFINER')
    expect(def).toContain('INSERT INTO public.join_requests')
  })

  test('tenancy.ts は join_requests へ直接 insert しない（requestJoin は rpc）', () => {
    const ts = fs.readFileSync(path.join(ROOT, 'lib', 'portal', 'tenancy.ts'), 'utf-8')
    expect(ts).not.toMatch(/from\('join_requests'\)\s*\.insert/)
    expect(ts).toContain("rpc('request_join'")
  })
})

describe('handle_new_user の search_path 固定（20261011）', () => {
  const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_handle_new_user_search_path.sql'))
  const FIX = FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')) : ''
  const ORIGINAL = fs.readFileSync(path.join(MIGRATIONS_DIR, '00001_create_tables.sql'), 'utf-8')
  const body = (sql: string) =>
    sql.split('CREATE OR REPLACE FUNCTION public.handle_new_user()')[1].split('BEGIN')[1].split('END;')[0].replace(/\s+/g, ' ').trim()

  test('ファイルがちょうど 1 本あり、本文は 00001 と同じ（動作を変えない）', () => {
    expect(FILES).toHaveLength(1)
    expect(body(FIX)).toBe(body(ORIGINAL))
    expect(body(FIX)).toBe('INSERT INTO public.profiles (id) VALUES (NEW.id); RETURN NEW;')
  })

  test('SECURITY DEFINER・search_path 空固定・トリガーは作り直さない', () => {
    expect(FIX).toContain('SECURITY DEFINER')
    expect(FIX).toContain("SET search_path = ''")
    expect(FIX).not.toMatch(/CREATE TRIGGER|DROP TRIGGER|DROP FUNCTION/)
  })

  test('PUBLIC・anon・authenticated からはがし、supabase_auth_admin にだけ付ける', () => {
    expect(FIX).toMatch(/REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC, anon, authenticated;/)
    expect(FIX).toContain('GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;')
    expect(FIX).not.toMatch(/GRANT [^;]* TO (anon|authenticated|PUBLIC)/i)
  })

  test('台本の項目 13 と 18 が handle_new_user を確かめる', () => {
    const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_tenancy.sql'), 'utf-8')
    expect(SCRIPT).toContain("vt_chk('13', 'public.handle_new_user(): SECURITY DEFINER・search_path 空固定'")
    expect(SCRIPT).toContain("vt_chk('13', 'public.handle_new_user(): anon・authenticated・PUBLIC に EXECUTE が無い'")
    expect(SCRIPT).toContain("vt_chk('18', 'profiles に同じ id の行ができる'")
    expect(SCRIPT).toContain("vt_chk('18', '後片付けで auth.users と profiles の両方から消える'")
  })
})
