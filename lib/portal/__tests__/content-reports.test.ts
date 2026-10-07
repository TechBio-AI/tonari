/**
 * @jest-environment node
 *
 * 通報（supabase/migrations/*_content_reports.sql と scripts/portal/verify_reports.sql）
 *
 * DB には接続しない。migration の文面が契約（画面の担当と共通）どおりかと、確認台本に項目がそろっているかを見る。
 * 行が本当に閉じているかは、台本でファウンダーがローカルで確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_content_reports.sql'))
if (FILES.length !== 1) {
  throw new Error(`supabase/migrations に *_content_reports.sql が ${FILES.length} 本あります（1 本のはず）`)
}
/** コメント行を落とした SQL */
const SQL = fs
  .readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
function body(name: string): string {
  const after = SQL.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1]
  if (!after) throw new Error(`${name} が migration にありません`)
  return after.split('$$;')[0]
}
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_reports.sql'), 'utf-8')

describe('content_reports の表', () => {
  const TABLE = SQL.split('CREATE TABLE IF NOT EXISTS public.content_reports (')[1].split(');')[0]

  test('契約の列がそろっている', () => {
    for (const col of ['id', 'group_id', 'post_id', 'comment_id', 'reporter_id', 'reason', 'created_at', 'handled_at', 'handled_by']) {
      expect(TABLE).toMatch(new RegExp(`^\\s+${col}\\s`, 'm'))
    }
  })

  test('対象は投稿かコメントのどちらか一方・理由は 200 文字まで', () => {
    expect(TABLE).toContain('CHECK (num_nonnulls(post_id, comment_id) = 1)')
    expect(TABLE).toContain('CHECK (char_length(reason) <= 200)')
  })

  test('同じ人が同じ対象を二度通報できない（一意の索引）', () => {
    expect(SQL).toMatch(/UNIQUE INDEX IF NOT EXISTS \w+\s+ON public\.content_reports \(reporter_id, post_id\) WHERE post_id IS NOT NULL/)
    expect(SQL).toMatch(/UNIQUE INDEX IF NOT EXISTS \w+\s+ON public\.content_reports \(reporter_id, comment_id\) WHERE comment_id IS NOT NULL/)
  })

  test('API ロールから表を直接触れない（RLS・ポリシー無し・権限をはがす）', () => {
    expect(SQL).toContain('ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;')
    expect(SQL).toContain('ALTER TABLE public.content_reports FORCE ROW LEVEL SECURITY;')
    expect(SQL).toContain('REVOKE ALL ON public.content_reports FROM PUBLIC, anon, authenticated;')
    expect(SQL).not.toMatch(/CREATE POLICY/)
    expect(SQL).not.toMatch(/GRANT [A-Z, ()_a-z]+ ON public\.content_reports/)
  })

  test('通報者のアカウント削除で通報は消え、対応者なら handled_by だけ NULL', () => {
    expect(TABLE).toMatch(/reporter_id UUID NOT NULL REFERENCES auth\.users ON DELETE CASCADE/)
    expect(TABLE).toMatch(/handled_by\s+UUID REFERENCES auth\.users ON DELETE SET NULL/)
  })
})

describe('関数', () => {
  const FUNCS: [string, string][] = [
    ['report_group_content', 'UUID, UUID, TEXT'],
    ['list_group_reports', 'UUID'],
    ['mark_report_handled', 'UUID'],
  ]

  test.each(FUNCS)('%s は SECURITY DEFINER・search_path 固定・未ログインで止まる・authenticated だけが実行できる', (name, args) => {
    const b = body(name)
    expect(b).toContain('SECURITY DEFINER')
    expect(b).toContain("SET search_path = ''")
    expect(b).toMatch(/RAISE EXCEPTION USING MESSAGE = 'unauthenticated'/)
    const a = args.replace(/[()]/g, '\\$&')
    expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(${a}\\)\\s+FROM PUBLIC, anon;`))
    expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(${a}\\)\\s+TO authenticated;`))
  })

  test('report_group_content: 会員のみ・会は対象から決める・二重通報は already_reported', () => {
    const b = body('report_group_content')
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.report_group_content(p_post_id UUID, p_comment_id UUID, p_reason TEXT)\nRETURNS UUID')
    expect(b).toContain('public.is_group_member(v_group_id)')
    expect(b).toContain('p.deleted_at IS NULL')
    expect(b).toContain('c.deleted_at IS NULL')
    expect(b).toContain("MESSAGE = 'already_reported'")
    expect(b).toContain("MESSAGE = 'invalid_input'")
    expect(b).toContain('reporter_id, reason)')
    expect(b).toContain('VALUES (v_group_id, p_post_id, p_comment_id, v_uid, v_reason)')
  })

  test('list_group_reports: 世話人のみ・通報者と対応者は返さない', () => {
    const b = body('list_group_reports')
    expect(b).toContain('public.is_group_moderator(p_group_id)')
    const returns = b.split('RETURNS TABLE (')[1].split(')\nLANGUAGE')[0]
    const cols = [...returns.matchAll(/^\s*(\w+)\s/gm)].map((m) => m[1])
    expect(cols).toEqual(['id', 'post_id', 'comment_id', 'reason', 'created_at', 'handled_at'])
    expect(b).not.toMatch(/reporter_id|handled_by/)
  })

  test('mark_report_handled: 世話人のみ・未対応の行だけを変える', () => {
    const b = body('mark_report_handled')
    expect(b).toContain('public.is_group_moderator(v_group_id)')
    expect(b).toContain('SET handled_at = now(), handled_by = v_uid')
    expect(b).toContain('WHERE id = p_report_id AND handled_at IS NULL')
  })
})

describe('確認台本 scripts/portal/verify_reports.sql', () => {
  test('ローカル専用の明記と、本番らしい DB で止まる安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜9 と後片付けがそろっている', () => {
    for (let i = 0; i <= 9; i++) {
      expect(SCRIPT).toMatch(new RegExp(`vr_(chk|rec)\\('${i}',`))
    }
    expect(SCRIPT).toContain("vr_chk('後片付け'")
  })

  test('台本の FUNCS が migration の関数と一致する', () => {
    const funcsBlock = SCRIPT.split('FUNCS     CONSTANT TEXT[] := ARRAY[')[1].split('];')[0]
    const listed = [...funcsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
    expect(listed).toEqual([
      'public.list_group_reports(uuid)',
      'public.mark_report_handled(uuid)',
      'public.report_group_content(uuid,uuid,text)',
    ])
  })
})
