/**
 * @jest-environment node
 *
 * 会員エリアの機能（supabase/migrations/*_community_features.sql）の文面の検査。
 * DB には接続しない。契約（2026-10-13 ファウンダー指示）どおりの制約・権限・関数の形になっているかだけを見る。
 * 動きそのものは scripts/portal/verify_events.sql でファウンダーが確かめる。
 */
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')

const FILES = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('_community_features.sql'))
const SQL = FILES.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, FILES[0]), 'utf-8')) : ''
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_events.sql'), 'utf-8')

const tableDef = (name: string) => SQL.split(`CREATE TABLE IF NOT EXISTS public.${name} (`)[1].split('\n);')[0]
const fnBody = (name: string) => SQL.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1].split('$$;')[0]

const TABLES = ['group_events', 'event_attendance', 'group_links', 'group_settings', 'public_group_items']
const CALLABLE = [
  ['delete_group_event', 'UUID'],
  ['list_event_attendance', 'UUID'],
  ['delete_group_link', 'UUID'],
  ['pin_group_post', 'UUID, BOOLEAN'],
  ['export_group', 'UUID'],
] as const
const TRIGGER_FUNCS = ['sync_public_group_item', 'stamp_group_settings']

describe('ファイル', () => {
  test('*_community_features.sql がちょうど 1 本', () => {
    expect(FILES).toHaveLength(1)
  })
})

describe('表の契約', () => {
  test('group_events: 文字数・URL・既定値・created_by は SET NULL', () => {
    const t = tableDef('group_events')
    expect(t).toContain('char_length(title) <= 100')
    expect(t).toContain('char_length(body) <= 4000')
    expect(t).toContain('char_length(place) <= 200')
    expect(t).toContain("char_length(online_url) <= 500 AND online_url ~* '^https?://[^[:space:]]+$'")
    expect(t).toMatch(/is_public\s+BOOLEAN NOT NULL DEFAULT false/)
    expect(t).toMatch(/created_by UUID DEFAULT auth\.uid\(\) REFERENCES auth\.users ON DELETE SET NULL/)
    expect(t).toMatch(/starts_at\s+TIMESTAMP WITH TIME ZONE NOT NULL/)
  })

  test('event_attendance: 状態は yes / maybe / no、主キーは (event_id, user_id)、user_id は CASCADE', () => {
    const t = tableDef('event_attendance')
    expect(t).toContain("status IN ('yes', 'maybe', 'no')")
    expect(t).toContain('PRIMARY KEY (event_id, user_id)')
    expect(t).toMatch(/user_id\s+UUID NOT NULL DEFAULT auth\.uid\(\) REFERENCES auth\.users ON DELETE CASCADE/)
  })

  test('group_links: 文字数・URL（必須・http(s) だけ）', () => {
    const t = tableDef('group_links')
    expect(t).toContain('char_length(title) <= 100')
    expect(t).toContain("url        TEXT NOT NULL CHECK (char_length(url) <= 500 AND url ~* '^https?://[^[:space:]]+$')")
    expect(t).toContain('char_length(note) <= 500')
    expect(t).toMatch(/created_by UUID DEFAULT auth\.uid\(\) REFERENCES auth\.users ON DELETE SET NULL/)
  })

  test('group_settings: 主キーは group_id、文字数', () => {
    const t = tableDef('group_settings')
    expect(t).toMatch(/group_id\s+UUID PRIMARY KEY/)
    expect(t).toContain('char_length(welcome_text) <= 2000')
    expect(t).toContain('char_length(rules_text) <= 4000')
    expect(t).toMatch(/updated_by\s+UUID REFERENCES auth\.users ON DELETE SET NULL/)
  })

  test('group_posts: category・pinned・is_public（公開はお知らせだけ）', () => {
    expect(SQL).toContain("ADD COLUMN IF NOT EXISTS category  TEXT    NOT NULL DEFAULT 'other'")
    expect(SQL).toContain('ADD COLUMN IF NOT EXISTS pinned    BOOLEAN NOT NULL DEFAULT false')
    expect(SQL).toContain('ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false')
    expect(SQL).toContain("CHECK (category IN ('daily', 'system', 'treatment', 'family', 'other'))")
    expect(SQL).toContain("CHECK (NOT is_public OR kind = 'announcement')")
  })

  test('public_group_items: 書き手・作成者・利用者の id を持たない', () => {
    const t = tableDef('public_group_items')
    const cols = t
      .split('\n')
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((c) => /^[a-z_]+$/.test(c))
    expect(cols).toEqual([
      'id', 'group_slug', 'kind', 'source_id', 'title', 'body', 'starts_at', 'ends_at', 'place', 'online_url',
      'published_at', 'updated_at',
    ])
    expect(t).not.toMatch(/user_id|created_by|author_id|updated_by/)
    expect(t).toContain('UNIQUE (kind, source_id)')
  })
})

describe('RLS と権限', () => {
  test('5 表すべてで RLS を有効にし、anon / authenticated の既定の権限をはがしている', () => {
    for (const t of TABLES) {
      expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`))
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON public\\.${t}\\s+FROM anon, authenticated`))
    }
  })

  test('DELETE はどの表にも与えない・anon に与えるのは公開用の表の SELECT だけ', () => {
    expect(SQL).not.toMatch(/GRANT [^;]*DELETE/)
    expect(SQL).not.toMatch(/FOR DELETE/)
    const anonGrants = SQL.match(/GRANT [^;]*TO [^;]*anon[^;]*;/g) ?? []
    expect(anonGrants).toEqual(['GRANT SELECT ON public.public_group_items TO anon, authenticated;'])
  })

  test('公開用の表は全行読める・書く権限はどの API ロールにも無い', () => {
    expect(SQL).toMatch(/ON public\.public_group_items\s+FOR SELECT TO anon, authenticated\s+USING \(true\)/)
    expect(SQL).not.toMatch(/GRANT (INSERT|UPDATE)[^;]*public_group_items/)
    expect(SQL).not.toMatch(/ON public\.public_group_items\s+FOR (INSERT|UPDATE|ALL)/)
  })

  test('行事・リンク・設定の書き込みは世話人だけ。読むのは会員', () => {
    for (const t of ['group_events', 'group_links', 'group_settings']) {
      expect(SQL).toMatch(new RegExp(`ON public\\.${t}\\s+FOR SELECT TO authenticated\\s+USING \\([^;]*public\\.is_group_member\\(group_id\\)`))
      expect(SQL).toMatch(new RegExp(`ON public\\.${t}\\s+FOR INSERT TO authenticated\\s+WITH CHECK \\(public\\.is_group_moderator\\(group_id\\)`))
      expect(SQL).toMatch(new RegExp(`ON public\\.${t}\\s+FOR UPDATE TO authenticated\\s+USING \\(public\\.is_group_moderator\\(group_id\\)`))
    }
  })

  test('参加表明は本人の行だけ・その会の会員だけ', () => {
    for (const op of ['SELECT', 'INSERT', 'UPDATE']) {
      const policy = SQL.split(`ON public.event_attendance\n    FOR ${op} TO authenticated`)[1].split(';')[0]
      expect(policy).toContain('user_id = auth.uid()')
      if (op !== 'INSERT') expect(policy).toContain('public.is_group_member(e.group_id)')
    }
    expect(SQL).toContain('GRANT UPDATE (status) ON public.event_attendance TO authenticated;')
  })

  test('pinned は列の権限を与えない（変えるのは pin_group_post だけ）', () => {
    const grants = SQL.match(/GRANT [^;]*;/g) ?? []
    for (const g of grants) expect(g).not.toContain('pinned')
    expect(SQL).toContain('GRANT INSERT (category, is_public) ON public.group_posts TO authenticated;')
    expect(SQL).toContain('GRANT UPDATE (category, is_public) ON public.group_posts TO authenticated;')
  })

  test('投稿の update ポリシー: 公開にできるのは世話人の投稿者だけ', () => {
    const policy = SQL.split('CREATE POLICY group_posts_update_own ON public.group_posts')[1].split(';')[0]
    expect(policy).toContain('(NOT is_public OR public.is_group_moderator(group_id))')
  })

  test('updated_by はトリガーが付ける（列の権限は与えない）', () => {
    const grants = (SQL.match(/GRANT [^;]*group_settings[^;]*;/g) ?? []).join('\n')
    expect(grants).not.toContain('updated_by')
    expect(fnBody('stamp_group_settings')).toContain('NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);')
  })
})

describe('トリガー（公開用の表へ写す）', () => {
  const body = () => fnBody('sync_public_group_item')

  test('投稿はお知らせ・公開・未削除のときだけ写し、スレッドの公開は止める', () => {
    expect(body()).toContain("v_public := NEW.is_public AND NEW.kind = 'announcement' AND NEW.deleted_at IS NULL;")
    expect(body()).toMatch(/IF NEW\.is_public AND NEW\.kind <> 'announcement' THEN\s+RAISE EXCEPTION USING MESSAGE = 'invalid_input';/)
    expect(body()).toContain('v_public := NEW.is_public AND NEW.deleted_at IS NULL;')
  })

  test('非公開・削除・行の削除で写しを消し、本文を直したら写し直す（published_at は変えない）', () => {
    expect(body()).toContain('DELETE FROM public.public_group_items WHERE kind = v_kind AND source_id = OLD.id;')
    expect(body()).toContain('DELETE FROM public.public_group_items WHERE kind = v_kind AND source_id = NEW.id;')
    expect(body()).toContain('ON CONFLICT (kind, source_id) DO UPDATE')
    expect(body()).not.toMatch(/published_at\s*=/)
    expect(body()).not.toMatch(/group_slug\s*=/)
  })

  test('両方の表に AFTER INSERT / UPDATE / DELETE で付いている', () => {
    for (const t of ['group_posts', 'group_events']) {
      expect(SQL).toMatch(
        new RegExp(`CREATE TRIGGER sync_public_group_item\\s+AFTER INSERT OR UPDATE OR DELETE ON public\\.${t}\\s+FOR EACH ROW EXECUTE FUNCTION public\\.sync_public_group_item\\(\\);`)
      )
    }
  })
})

describe('関数', () => {
  test('すべて SECURITY DEFINER・search_path 空', () => {
    for (const [f] of CALLABLE) {
      expect(fnBody(f)).toContain('SECURITY DEFINER')
      expect(fnBody(f)).toContain("SET search_path = ''")
    }
    for (const f of TRIGGER_FUNCS) {
      expect(fnBody(f)).toContain('SECURITY DEFINER')
      expect(fnBody(f)).toContain("SET search_path = ''")
    }
  })

  test('API から呼ぶ関数は PUBLIC・anon から外し authenticated に付ける。トリガー関数はどの API ロールからも外す', () => {
    for (const [f, args] of CALLABLE) {
      const a = args.replace(/[(), ]/g, (c) => (c === ' ' ? '\\s*' : `\\${c}`))
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\(${a}\\)\\s+FROM PUBLIC, anon;`))
      expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${f}\\(${a}\\)\\s+TO authenticated;`))
    }
    for (const f of TRIGGER_FUNCS) {
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\(\\)\\s+FROM PUBLIC, anon, authenticated;`))
      expect(SQL).not.toMatch(new RegExp(`GRANT [^;]*${f}`))
    }
  })

  test('削除・ピン留め・出欠一覧は世話人でなければ forbidden', () => {
    for (const f of ['delete_group_event', 'delete_group_link', 'pin_group_post', 'list_event_attendance']) {
      expect(fnBody(f)).toMatch(/IF NOT FOUND OR NOT public\.is_group_moderator\(v_group_id\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    }
    expect(fnBody('pin_group_post')).toContain("RAISE EXCEPTION USING MESSAGE = 'invalid_input';")
  })

  test('出欠一覧は表示名と状態だけ（user_id を返さない）・人数を返す関数は無い', () => {
    const f = fnBody('list_event_attendance')
    expect(f).toMatch(/RETURNS TABLE \(display_name TEXT, status TEXT\)/)
    expect(f).toContain('SELECT mp.display_name, a.status')
    expect(SQL).not.toMatch(/count\(\*\)[^;]*event_attendance/)
  })

  test('書き出しに行事・リンク・設定を加え、参加表明・created_by・updated_by は入れない', () => {
    const f = fnBody('export_group')
    expect(f).toContain("'events', coalesce((")
    expect(f).toContain("'links', coalesce((")
    expect(f).toContain("'settings', (")
    expect(f).not.toMatch(/event_attendance|created_by|updated_by|user_id'/)
  })
})

describe('確認台本 scripts/portal/verify_events.sql', () => {
  test('ローカル専用の明記と安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜14 と後片付けがそろっている', () => {
    for (let i = 0; i <= 14; i++) expect(SCRIPT).toMatch(new RegExp(`ve_(chk|rec)\\('${i}',`))
    expect(SCRIPT).toContain("ve_chk('後片付け'")
  })

  test('台本の関数一覧が migration の関数と同じ', () => {
    const funcs = SCRIPT.split('FUNCS CONSTANT TEXT[] := ARRAY[')[1].split('];')[0]
    expect([...funcs.matchAll(/'public\.(\w+)\(/g)].map((m) => m[1]).sort()).toEqual(CALLABLE.map(([f]) => f).sort())
    const triggers = SCRIPT.split('TRIGGER_FUNCS CONSTANT TEXT[] := ARRAY[')[1].split('];')[0]
    expect([...triggers.matchAll(/'public\.(\w+)\(/g)].map((m) => m[1]).sort()).toEqual([...TRIGGER_FUNCS].sort())
  })
})
