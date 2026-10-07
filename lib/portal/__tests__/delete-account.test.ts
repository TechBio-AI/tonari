/**
 * @jest-environment node
 *
 * アカウント削除（supabase/migrations/*_delete_account.sql と lib/portal/tenancy.ts の deleteMyAccount）
 *
 * DB には接続しない。見るのは 3 つ:
 *   1. deleteMyAccount が delete_my_account を引数なしで呼び、エラーを理由に読み替えること（Supabase はモック）
 *   2. migration の文面が決定（docs/DECISIONS.md「アカウント削除」）どおりか
 *   3. 確認台本 scripts/portal/verify_delete_account.sql に項目がそろっているか
 * 行が本当に消えるか・他人の行が消えないかは、台本でファウンダーがローカルで確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser }, rpc: mockRpc }),
}))

import { FAILURE_MESSAGES, deleteMyAccount } from '@/lib/portal/tenancy'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
/** 版番号は付け替わりうるので固定名で読まない。ちょうど 1 本であることも確かめる */
const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_delete_account.sql'))
if (FILES.length !== 1) {
  throw new Error(`supabase/migrations に *_delete_account.sql が ${FILES.length} 本あります（1 本のはず）`)
}
/** コメント行を落とした SQL（コメント中の説明文に反応しないように） */
const SQL = fs
  .readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
/** 関数の本文（CREATE OR REPLACE FUNCTION public.name( から最初の $$; まで） */
function body(name: string): string {
  const after = SQL.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1]
  if (!after) throw new Error(`${name} が migration にありません`)
  return after.split('$$;')[0]
}
const DELETE_MY_ACCOUNT = body('delete_my_account')
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_delete_account.sql'), 'utf-8')

beforeEach(() => {
  mockGetUser.mockReset()
  mockRpc.mockReset()
})

describe('deleteMyAccount', () => {
  test('ログインしていなければ DB を呼ばずに unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await deleteMyAccount()
    expect(r).toEqual({ ok: false, reason: 'unauthenticated', message: FAILURE_MESSAGES.unauthenticated })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('delete_my_account を引数なしで呼ぶ（他人の id を渡す口が無い）', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: null })
    expect(await deleteMyAccount()).toEqual({ ok: true, value: null })
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('delete_my_account')
  })

  test('最後の世話人は last_moderator の文言になる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'last_moderator' } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await deleteMyAccount()
    expect(r).toEqual({ ok: false, reason: 'last_moderator', message: FAILURE_MESSAGES.last_moderator })
  })

  test('知らないエラーは failed（DB の文面を画面に出さない）', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'relation "x" does not exist' } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await deleteMyAccount()
    expect(r).toEqual({ ok: false, reason: 'failed', message: FAILURE_MESSAGES.failed })
  })
})

describe('delete_my_account の文面', () => {
  test('引数を取らない・SECURITY DEFINER・search_path 固定・auth.uid() 本人', () => {
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.delete_my_account()\nRETURNS VOID')
    expect(DELETE_MY_ACCOUNT).toContain('SECURITY DEFINER')
    expect(DELETE_MY_ACCOUNT).toContain("SET search_path = ''")
    expect(DELETE_MY_ACCOUNT).toContain('v_uid UUID := auth.uid();')
    expect(DELETE_MY_ACCOUNT).toMatch(/IF v_uid IS NULL THEN\s+RAISE EXCEPTION USING MESSAGE = 'unauthenticated'/)
  })

  test('本人の consents・member_diseases・member_profiles・memberships・申請・発行した招待を消す', () => {
    for (const stmt of [
      'DELETE FROM public.member_diseases WHERE user_id = v_uid;',
      'DELETE FROM public.consents WHERE user_id = v_uid;',
      'DELETE FROM public.join_requests WHERE user_id = v_uid;',
      'DELETE FROM public.invitations WHERE created_by = v_uid;',
      'DELETE FROM public.memberships WHERE user_id = v_uid;',
      'DELETE FROM public.member_profiles WHERE user_id = v_uid;',
    ]) {
      expect(DELETE_MY_ACCOUNT).toContain(stmt)
    }
  })

  test('他人の行に残る痕跡（decided_by・used_by）は NULL にする', () => {
    expect(DELETE_MY_ACCOUNT).toContain('UPDATE public.join_requests SET decided_by = NULL WHERE decided_by = v_uid;')
    expect(DELETE_MY_ACCOUNT).toContain('UPDATE public.invitations SET used_by = NULL WHERE used_by = v_uid;')
  })

  test('旧 profiles は表があるときだけ消す', () => {
    expect(DELETE_MY_ACCOUNT).toMatch(
      /IF to_regclass\('public\.profiles'\) IS NOT NULL THEN\s+EXECUTE 'DELETE FROM public\.profiles WHERE id = \$1' USING v_uid;/
    )
  })

  test('消す前に最後の世話人を確かめて止める', () => {
    const check = DELETE_MY_ACCOUNT.indexOf("MESSAGE = 'last_moderator'")
    const firstDelete = DELETE_MY_ACCOUNT.indexOf('DELETE FROM')
    expect(check).toBeGreaterThan(0)
    expect(check).toBeLessThan(firstDelete)
    expect(DELETE_MY_ACCOUNT).toContain('FOR UPDATE')
  })

  test('auth.users と投稿・コメントには触らない', () => {
    expect(DELETE_MY_ACCOUNT).not.toMatch(/auth\.users/)
    expect(DELETE_MY_ACCOUNT).not.toMatch(/group_posts|group_comments/)
  })

  test('実行権限は authenticated だけ', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.delete_my_account\(\)\s+FROM PUBLIC, anon;/)
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\)\s+TO authenticated;/)
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\)\s+TO (anon|PUBLIC)/)
  })
})

describe('投稿・コメントを残すための外部キーの付け替え', () => {
  test('group_posts・group_comments の author_id を SET NULL に付け替え、NOT NULL を外す', () => {
    for (const t of ['group_posts', 'group_comments']) {
      expect(SQL).toContain(`ALTER TABLE public.${t}`)
      expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${t}\\s+ALTER COLUMN author_id DROP NOT NULL;`))
      expect(SQL).toMatch(
        new RegExp(
          `ADD CONSTRAINT ${t}_author_id_fkey\\s+FOREIGN KEY \\(author_id\\) REFERENCES auth\\.users \\(id\\) ON DELETE SET NULL;`
        )
      )
    }
  })

  test('付け直す前に、author_id の auth.users への外部キーを名前を決め打ちせずに外す（何度流しても 1 本）', () => {
    expect(SQL).toContain("con.confrelid = 'auth.users'::regclass")
    expect(SQL).toContain("att.attname = 'author_id'")
    expect(SQL).toContain("EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname)")
  })

  test('ほかの表の外部キーには触らない（invitations.created_by は CASCADE のまま）', () => {
    const altered = [...SQL.matchAll(/ALTER TABLE public\.(\w+)/g)].map((m) => m[1])
    expect([...new Set(altered)].sort()).toEqual(['group_comments', 'group_posts'])
    expect(SQL).not.toMatch(/DROP COLUMN|DROP TABLE/)
  })

  test('書き手が NULL の投稿・コメントを、世話人でない会員が消せない（NULL を本人扱いにしない）', () => {
    for (const [name, v] of [
      ['delete_group_post', 'v_post.author_id'],
      ['delete_group_comment', 'v_author'],
    ]) {
      const b = body(name)
      expect(b).toContain(`${v} IS NOT DISTINCT FROM v_uid`)
      expect(b).not.toMatch(new RegExp(`${v.replace('.', '\\.')} = v_uid`))
      expect(b).toContain('SECURITY DEFINER')
      expect(b).toContain("SET search_path = ''")
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(UUID\\)\\s+FROM PUBLIC, anon;`))
      expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(UUID\\)\\s+TO authenticated;`))
    }
  })
})

describe('確認台本 scripts/portal/verify_delete_account.sql', () => {
  test('ローカル専用の明記と、本番らしい DB で止まる安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜8 と後片付けがそろっている', () => {
    for (let i = 0; i <= 8; i++) {
      expect(SCRIPT).toMatch(new RegExp(`vd_(chk|rec|note)\\('${i}',`))
    }
    expect(SCRIPT).toContain("vd_chk('後片付け'")
  })

  test('他人を指す呼び出し・anon の呼び出し・最後の世話人・search_path・EXECUTE 権限を確かめている', () => {
    expect(SCRIPT).toContain('public.delete_my_account(%L::uuid)')
    expect(SCRIPT).toContain("'anon が delete_my_account を呼ぶ', 'anon'")
    expect(SCRIPT).toContain("'ERROR P0001 last_moderator'")
    expect(SCRIPT).toContain(`'search_path=""' = ANY`)
    expect(SCRIPT).toContain("has_function_privilege('anon'")
    expect(SCRIPT).toContain('rolbypassrls')
  })

  test('テストデータは固定の user_id とテスト用のメールで作り、終わりに消す', () => {
    expect(SCRIPT).toContain('@verify-delete-account.invalid')
    const cleanup = SCRIPT.split('後片付け（')[1]
    expect(cleanup).toContain('DELETE FROM auth.users WHERE id = ANY (v_users);')
    expect(cleanup).toContain('DELETE FROM public.patient_groups WHERE id IN (g1, g2);')
  })
})

describe('delete_my_account の版 3（*_delete_account_v3.sql）', () => {
  const V3_FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_delete_account_v3.sql'))
  const V3 =
    V3_FILES.length === 1
      ? fs
          .readFileSync(path.join(MIGRATIONS_DIR, V3_FILES[0]), 'utf-8')
          .split('\n')
          .filter((l) => !l.trim().startsWith('--'))
          .join('\n')
      : ''
  const V3_BODY = (V3.split('CREATE OR REPLACE FUNCTION public.delete_my_account(')[1] ?? '').split('$$;')[0]

  test('ファイルがちょうど 1 本あり、event_attendance・content_reports の後に当たる', () => {
    expect(V3_FILES).toHaveLength(1)
    const all = fs.readdirSync(MIGRATIONS_DIR).sort()
    const at = (suffix: string) => all.findIndex((f) => f.endsWith(suffix))
    expect(at('_community_features.sql')).toBeGreaterThanOrEqual(0)
    expect(at('_content_reports.sql')).toBeGreaterThanOrEqual(0)
    expect(at('_delete_account_v3.sql')).toBeGreaterThan(at('_community_features.sql'))
    expect(at('_delete_account_v3.sql')).toBeGreaterThan(at('_content_reports.sql'))
  })

  test('引数なし・SECURITY DEFINER・search_path 固定・authenticated だけが実行できる', () => {
    expect(V3).toContain('CREATE OR REPLACE FUNCTION public.delete_my_account()\nRETURNS VOID')
    expect(V3_BODY).toContain('SECURITY DEFINER')
    expect(V3_BODY).toContain("SET search_path = ''")
    expect(V3).toMatch(/REVOKE ALL ON FUNCTION public\.delete_my_account\(\)\s+FROM PUBLIC, anon;/)
    expect(V3).toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\)\s+TO authenticated;/)
  })

  test('版 2 までに消していたものを、版 3 でも全部消す', () => {
    for (const stmt of [
      'DELETE FROM public.journey_links WHERE user_id = v_uid;',
      'DELETE FROM public.member_diseases WHERE user_id = v_uid;',
      'DELETE FROM public.consents WHERE user_id = v_uid;',
      'DELETE FROM public.join_requests WHERE user_id = v_uid;',
      'UPDATE public.join_requests SET decided_by = NULL WHERE decided_by = v_uid;',
      'DELETE FROM public.invitations WHERE created_by = v_uid;',
      'UPDATE public.invitations SET used_by = NULL WHERE used_by = v_uid;',
      'DELETE FROM public.memberships WHERE user_id = v_uid;',
      'DELETE FROM public.member_profiles WHERE user_id = v_uid;',
      "EXECUTE 'DELETE FROM public.profiles WHERE id = $1' USING v_uid;",
    ]) {
      expect(V3_BODY).toContain(stmt)
    }
  })

  test('参加表明と本人の通報を消し、対応した通報は handled_by だけ NULL にする', () => {
    expect(V3_BODY).toContain('DELETE FROM public.event_attendance WHERE user_id = v_uid;')
    expect(V3_BODY).toContain('DELETE FROM public.content_reports WHERE reporter_id = v_uid;')
    expect(V3_BODY).toContain('UPDATE public.content_reports SET handled_by = NULL WHERE handled_by = v_uid;')
  })

  test('auth.users の本人の行を最後に消す（最後の世話人の確かめより後）', () => {
    const del = V3_BODY.indexOf('DELETE FROM auth.users WHERE id = v_uid;')
    expect(del).toBeGreaterThan(0)
    expect(del).toBeGreaterThan(V3_BODY.indexOf("MESSAGE = 'last_moderator'"))
    expect(del).toBeGreaterThan(V3_BODY.lastIndexOf('DELETE FROM public.'))
    // 例外を握りつぶさない（握りつぶすと、途中で失敗しても前の削除が残る）
    expect(V3_BODY).not.toMatch(/EXCEPTION\s+WHEN/)
  })

  test('台本に版 3 の項目（参加表明・通報・途中で失敗したら戻る・auth.users が消える）がある', () => {
    for (let i = 10; i <= 12; i++) {
      expect(SCRIPT).toMatch(new RegExp(`vd_(chk|rec|note)\\('${i}',`))
    }
    expect(SCRIPT).toContain("'auth.users の A が消えた（版 3）'")
    expect(SCRIPT).toContain("'ERROR P0001 vd_forced_failure'")
    expect(SCRIPT).toContain("EXECUTE 'DROP TRIGGER vd_force_failure ON public.group_posts';")
    expect(SCRIPT).toContain("EXECUTE 'DROP FUNCTION public.vd_force_failure()';")
    expect(SCRIPT).toContain("has_table_privilege(p.proowner, 'auth.users', 'DELETE')")
  })
})

describe('delete_my_account の版 5（*_delete_account_v5.sql。共通契約 G）', () => {
  const V5_FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_delete_account_v5.sql'))
  const V5 =
    V5_FILES.length === 1
      ? fs
          .readFileSync(path.join(MIGRATIONS_DIR, V5_FILES[0]), 'utf-8')
          .split('\n')
          .filter((l) => !l.trim().startsWith('--'))
          .join('\n')
      : ''
  const V5_BODY = (V5.split('CREATE OR REPLACE FUNCTION public.delete_my_account(')[1] ?? '').split('$$;')[0]

  test('ファイルがちょうど 1 本あり、operators・trial_notices・group_requests・版 4 の後に当たる', () => {
    expect(V5_FILES).toHaveLength(1)
    const all = fs.readdirSync(MIGRATIONS_DIR).sort()
    const at = (suffix: string) => all.findIndex((f) => f.endsWith(suffix))
    for (const before of ['_operators.sql', '_trial_notices.sql', '_group_requests.sql', '_delete_account_v4.sql']) {
      expect(at(before)).toBeGreaterThanOrEqual(0)
      expect(at('_delete_account_v5.sql')).toBeGreaterThan(at(before))
    }
  })

  test('引数なし・SECURITY DEFINER・search_path 固定・authenticated だけが実行できる', () => {
    expect(V5).toContain('CREATE OR REPLACE FUNCTION public.delete_my_account()\nRETURNS VOID')
    expect(V5_BODY).toContain('SECURITY DEFINER')
    expect(V5_BODY).toContain("SET search_path = ''")
    expect(V5).toMatch(/REVOKE ALL ON FUNCTION public\.delete_my_account\(\)\s+FROM PUBLIC, anon;/)
    expect(V5).toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\)\s+TO authenticated;/)
  })

  test('版 4 までに消していたものを、版 5 でも全部消す', () => {
    for (const stmt of [
      'DELETE FROM public.journey_links WHERE user_id = v_uid;',
      'DELETE FROM public.event_attendance WHERE user_id = v_uid;',
      'DELETE FROM public.group_wishes WHERE user_id = v_uid;',
      'DELETE FROM public.content_reports WHERE reporter_id = v_uid;',
      'UPDATE public.content_reports SET handled_by = NULL WHERE handled_by = v_uid;',
      'DELETE FROM public.member_diseases WHERE user_id = v_uid;',
      'DELETE FROM public.consents WHERE user_id = v_uid;',
      'DELETE FROM public.join_requests WHERE user_id = v_uid;',
      'UPDATE public.join_requests SET decided_by = NULL WHERE decided_by = v_uid;',
      'DELETE FROM public.invitations WHERE created_by = v_uid;',
      'UPDATE public.invitations SET used_by = NULL WHERE used_by = v_uid;',
      'DELETE FROM public.memberships WHERE user_id = v_uid;',
      'DELETE FROM public.member_profiles WHERE user_id = v_uid;',
      "EXECUTE 'DELETE FROM public.profiles WHERE id = $1' USING v_uid;",
      'DELETE FROM auth.users WHERE id = v_uid;',
    ]) {
      expect(V5_BODY).toContain(stmt)
    }
  })

  test('案件への反応・会の新設の申請（申請者）・運営の行を消す。決めた申請は decided_by だけ NULL', () => {
    expect(V5_BODY).toContain('DELETE FROM public.notice_interest WHERE user_id = v_uid;')
    expect(V5_BODY).toContain('DELETE FROM public.group_requests WHERE requester_id = v_uid;')
    expect(V5_BODY).toContain('UPDATE public.group_requests SET decided_by = NULL WHERE decided_by = v_uid;')
    expect(V5_BODY).toContain('DELETE FROM public.operators WHERE user_id = v_uid;')
  })

  test('運営が本人 1 人なら、何かを消す前に last_operator で止める（運営の行を先に固める）', () => {
    const stop = V5_BODY.indexOf("MESSAGE = 'last_operator'")
    expect(stop).toBeGreaterThan(0)
    expect(stop).toBeLessThan(V5_BODY.indexOf('DELETE FROM'))
    expect(V5_BODY.indexOf('FROM public.operators o ORDER BY o.user_id FOR UPDATE')).toBeLessThan(stop)
    expect(V5_BODY).toContain("MESSAGE = 'last_moderator'")
  })

  test('auth.users を最後に消し、例外を握りつぶさない', () => {
    const del = V5_BODY.indexOf('DELETE FROM auth.users WHERE id = v_uid;')
    expect(del).toBeGreaterThan(V5_BODY.lastIndexOf('DELETE FROM public.'))
    expect(V5_BODY).not.toMatch(/EXCEPTION\s+WHEN/)
  })

  test('台本に版 5 の項目（最後の運営・反応と申請・運営の行）がある', () => {
    for (let i = 13; i <= 15; i++) {
      expect(SCRIPT).toMatch(new RegExp(`vd_(chk|rec|note)\\('${i}',`))
    }
    expect(SCRIPT).toContain("'ERROR P0001 last_operator'")
    expect(SCRIPT).toContain("D   CONSTANT TEXT := 'rd99911';")
  })
})
