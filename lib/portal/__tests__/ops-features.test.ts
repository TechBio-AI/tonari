/**
 * @jest-environment node
 *
 * 共通契約 2026-10-03 の A〜E（疾患の固定 ID・運営・案件・公開の参加状況・会の新設）の migration の文面の検査。
 *   20261022_operators.sql・20261023_disease_catalog.sql・20261024_trial_notices.sql・
 *   20261025_public_disease_participation.sql・20261026_group_requests.sql
 * DB には接続しない。動きそのものは scripts/portal/verify_ops.sql でファウンダーが確かめる。
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
const readOne = (suffix: string) => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(suffix))
  return { files, sql: files.length === 1 ? stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, files[0]), 'utf-8')) : '' }
}

const OPS = readOne('_operators.sql')
const CATALOG = readOne('_disease_catalog.sql')
const REPORTS = readOne('_list_all_reports.sql')
const TRIALS = readOne('_trial_notices.sql')
const PART = readOne('_public_disease_participation.sql')
const REQS = readOne('_group_requests.sql')
const ALL = [OPS.sql, CATALOG.sql, TRIALS.sql, PART.sql, REQS.sql, REPORTS.sql].join('\n')
const SCRIPT = fs.readFileSync(path.join(ROOT, 'scripts', 'portal', 'verify_ops.sql'), 'utf-8')

const tableDef = (sql: string, name: string) => sql.split(`CREATE TABLE IF NOT EXISTS public.${name} (`)[1].split('\n);')[0]
const fnBody = (sql: string, name: string) => sql.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1].split('$$;')[0]
const columns = (def: string) =>
  def
    .split('\n')
    .map((l) => l.trim().split(/\s+/)[0])
    .filter((c) => /^[a-z_]+$/.test(c))

/** API から呼ぶ関数（authenticated に EXECUTE）: [ファイルの SQL, 名前, 引数の型] */
const CALLABLE: [string, string, string][] = [
  [OPS.sql, 'is_operator', ''],
  [OPS.sql, 'list_operators', ''],
  [TRIALS.sql, 'is_trial_audience', 'TEXT'],
  [TRIALS.sql, 'list_my_trial_notices', ''],
  [TRIALS.sql, 'set_notice_interest', 'UUID, TEXT'],
  [TRIALS.sql, 'notice_interest_counts', 'UUID'],
  [TRIALS.sql, 'upsert_trial_notice', 'UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT'],
  [TRIALS.sql, 'set_notice_status', 'UUID, TEXT'],
  [REQS.sql, 'request_new_group', 'TEXT, TEXT, TEXT'],
  [REQS.sql, 'approve_group_request', 'UUID, TEXT'],
  [REQS.sql, 'reject_group_request', 'UUID'],
  [CATALOG.sql, 'wish_summary_ops', 'TEXT'],
  [REPORTS.sql, 'list_all_reports', ''],
]
/** 内部用（どの API ロールにも EXECUTE なし） */
const INTERNAL: [string, string, string][] = [
  [PART.sql, 'recalc_disease_participation', 'TEXT'],
  [PART.sql, 'sync_disease_participation', ''],
  [REQS.sql, 'sync_public_groups', ''],
  [CATALOG.sql, 'resolve_disease_id', 'INTEGER, TEXT'],
  [CATALOG.sql, 'fill_group_wish_disease_id', ''],
  [CATALOG.sql, 'fill_patient_group_disease_ids', ''],
  [CATALOG.sql, 'sync_public_wish_count', ''],
]
const argsRe = (args: string) => args.split(', ').filter(Boolean).join(',\\s*')

describe('ファイル', () => {
  test('5 本がそれぞれちょうど 1 本・ローカル用の seed がある', () => {
    for (const f of [OPS, CATALOG, TRIALS, PART, REQS]) expect(f.files).toHaveLength(1)
    expect(OPS.files[0]).toBe('20261022_operators.sql')
    expect(CATALOG.files[0]).toBe('20261023_disease_catalog.sql')
    expect(TRIALS.files[0]).toBe('20261024_trial_notices.sql')
    expect(PART.files[0]).toBe('20261025_public_disease_participation.sql')
    expect(REQS.files[0]).toBe('20261026_group_requests.sql')
  })
})

describe('B 運営', () => {
  test('operators は契約の列・表は API から読めず書けない（ポリシーも無い）', () => {
    expect(columns(tableDef(OPS.sql, 'operators'))).toEqual(['user_id', 'created_at', 'note'])
    expect(OPS.sql).toMatch(/user_id\s+UUID PRIMARY KEY REFERENCES auth\.users ON DELETE CASCADE/)
    expect(OPS.sql).toContain('REVOKE ALL ON public.operators FROM anon, authenticated;')
    expect(OPS.sql).not.toMatch(/GRANT [^;]*ON public\.operators/)
    expect(OPS.sql).not.toMatch(/CREATE POLICY/)
  })

  test('list_operators は表示名だけ・運営でなければ forbidden', () => {
    const f = fnBody(OPS.sql, 'list_operators')
    expect(f).toMatch(/RETURNS TABLE \(display_name TEXT\)/)
    expect(f).toMatch(/IF NOT public\.is_operator\(\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    expect(f).not.toMatch(/full_name|o\.user_id,|note/)
  })

  test('test@example.com を migration に入れない', () => {
    expect(OPS.sql).not.toContain('test@example.com')
  })
})

describe('C 案件', () => {
  test('trial_notices の制約（registry・URL の場所・要約 2000 文字・status）', () => {
    const t = tableDef(TRIALS.sql, 'trial_notices')
    expect(t).toMatch(/disease_id\s+TEXT NOT NULL REFERENCES public\.disease_catalog \(disease_id\)/)
    expect(t).toContain("registry     TEXT NOT NULL CHECK (registry IN ('jrct', 'ctgov'))")
    expect(t).toContain("(registry = 'jrct'  AND registry_url ~ '^https://jrct\\.niph\\.go\\.jp/')")
    expect(t).toContain("(registry = 'ctgov' AND registry_url ~ '^https://(www\\.)?clinicaltrials\\.gov/')")
    expect(t).toContain('char_length(summary) <= 2000')
    expect(t).toContain("status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed'))")
    expect(t).toContain('UNIQUE (disease_id, registry, registry_id)')
  })

  test('表は運営だけが読む・書き込みは関数だけ', () => {
    expect(TRIALS.sql).toMatch(/ON public\.trial_notices\s+FOR SELECT TO authenticated\s+USING \(public\.is_operator\(\)\)/)
    expect(TRIALS.sql).toMatch(/ON public\.notice_interest\s+FOR SELECT TO authenticated\s+USING \(user_id = auth\.uid\(\)\)/)
    expect(TRIALS.sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)/)
    expect(TRIALS.sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/)
  })

  test('見せるのは research_contact が有効で member_diseases に disease_id を持つ人・published だけ', () => {
    const aud = fnBody(TRIALS.sql, 'is_trial_audience')
    expect(aud).toContain("c.kind = 'research_contact' AND c.withdrawn_at IS NULL")
    expect(aud).toContain('d.user_id = auth.uid() AND d.disease_id = p_disease_id')
    const list = fnBody(TRIALS.sql, 'list_my_trial_notices')
    expect(list).toContain("WHERE t.status = 'published'")
    expect(list).toContain('public.is_trial_audience(t.disease_id)')
    expect(list).not.toMatch(/t\.phase|t\.created_by/)
    const set = fnBody(TRIALS.sql, 'set_notice_interest')
    expect(set).toContain("t.status = 'published'")
    expect(set).toMatch(/IF NOT FOUND OR NOT public\.is_trial_audience\(v_disease\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
  })

  test('運営の数は実数・user_id を返さない', () => {
    const f = fnBody(TRIALS.sql, 'notice_interest_counts')
    expect(f).toMatch(/RETURNS TABLE \(interested BIGINT, dismissed BIGINT\)/)
    expect(f).toMatch(/IF NOT public\.is_operator\(\) THEN/)
    expect(f).not.toMatch(/i\.user_id/)
  })

  test('作る・直す・status を変えるのは運営だけ。published_at は初めて公開したときに立てる', () => {
    for (const name of ['upsert_trial_notice', 'set_notice_status']) {
      expect(fnBody(TRIALS.sql, name)).toMatch(/IF NOT public\.is_operator\(\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    }
    expect(fnBody(TRIALS.sql, 'set_notice_status')).toContain(
      "published_at = CASE WHEN p_status = 'published' THEN coalesce(published_at, now()) ELSE published_at END"
    )
  })
})

describe('D 公開の参加状況', () => {
  test('列は契約どおり・すべて「10未満」か数字・病気の削除で消える', () => {
    const t = tableDef(PART.sql, 'public_disease_participation')
    expect(columns(t)).toEqual(['disease_id', 'members', 'research_contact', 'wishes', 'updated_at'])
    expect(t).toMatch(/REFERENCES public\.disease_catalog \(disease_id\) ON DELETE CASCADE/)
  })

  test('しきい値は stats_threshold()・members は同じ人を 1 人・行は消さない', () => {
    const f = fnBody(PART.sql, 'recalc_disease_participation')
    expect(f).toContain('v_t       INTEGER := public.stats_threshold();')
    expect(f).not.toMatch(/<\s*10\b/)
    expect(f).toContain('count(DISTINCT m.user_id)')
    expect(f).toContain('m.left_at IS NULL AND p_disease_id = ANY (g.disease_ids)')
    expect(f).toContain("k.kind = 'research_contact' AND k.withdrawn_at IS NULL")
    // 案件の可視範囲と同じく、いまの版に同意している人だけを数える
    expect(f).toContain("AND k.version = public.consent_current_version('research_contact')")
    expect(f).toContain('w.disease_id = p_disease_id AND w.withdrawn_at IS NULL')
    expect(f).not.toMatch(/DELETE FROM public\.public_disease_participation/)
    expect(f).toContain('IS DISTINCT FROM (EXCLUDED.members, EXCLUDED.research_contact, EXCLUDED.wishes)')
  })

  test('5 表と disease_catalog の変化で数え直す', () => {
    for (const t of ['memberships', 'patient_groups', 'member_diseases', 'consents', 'group_wishes']) {
      expect(PART.sql).toMatch(
        new RegExp(`CREATE TRIGGER sync_disease_participation\\s+AFTER INSERT OR UPDATE OR DELETE ON public\\.${t}\\s+FOR EACH ROW`)
      )
    }
    expect(PART.sql).toMatch(/CREATE TRIGGER sync_disease_participation\s+AFTER INSERT ON public\.disease_catalog/)
  })

  test('anon と authenticated は SELECT だけ・最後に全病気の行を作る', () => {
    expect(PART.sql).toMatch(/ON public\.public_disease_participation\s+FOR SELECT TO anon, authenticated\s+USING \(true\)/)
    expect(PART.sql).toContain('GRANT SELECT ON public.public_disease_participation TO anon, authenticated;')
    expect(PART.sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)/)
    expect(PART.sql).toContain('FOR v_id IN SELECT c.disease_id FROM public.disease_catalog c ORDER BY c.disease_id LOOP')
  })
})

describe('E 会の新設', () => {
  test('group_requests の制約・申請中は 1 人 1 件', () => {
    const t = tableDef(REQS.sql, 'group_requests')
    expect(t).toContain('char_length(proposed_name) <= 100')
    expect(t).toContain('char_length(message) <= 1000')
    expect(t).toMatch(/requester_id\s+UUID NOT NULL DEFAULT auth\.uid\(\) REFERENCES auth\.users ON DELETE CASCADE/)
    expect(REQS.sql).toMatch(/ON public\.group_requests \(disease_id, requester_id\) WHERE status = 'pending'/)
  })

  test('申請できるのは、その病気の会の在籍会員か参加希望者', () => {
    const f = fnBody(REQS.sql, 'request_new_group')
    expect(f).toContain('m.user_id = v_uid AND m.left_at IS NULL AND p_disease_id = ANY (g.disease_ids)')
    expect(f).toContain('w.user_id = v_uid AND w.disease_id = p_disease_id AND w.withdrawn_at IS NULL')
    expect(f).toContain("RAISE EXCEPTION USING MESSAGE = 'already_requested';")
  })

  test('承認は運営だけ・会を作り申請者を世話人にする・病気は disease_catalog から', () => {
    const f = fnBody(REQS.sql, 'approve_group_request')
    expect(f).toMatch(/IF NOT public\.is_operator\(\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    expect(f).toContain('SELECT * INTO v_cat FROM public.disease_catalog c WHERE c.disease_id = v_req.disease_id;')
    expect(f).toContain('ARRAY[v_cat.disease_id], ARRAY[v_cat.idx], ARRAY[v_cat.name]')
    expect(f).toContain("VALUES (v_req.requester_id, v_group, 'moderator');")
    expect(fnBody(REQS.sql, 'reject_group_request')).toMatch(/IF NOT public\.is_operator\(\) THEN/)
  })

  test('public_groups は slug・name・disease_id・created_at だけ・トリガーで写す・anon は SELECT だけ', () => {
    expect(columns(tableDef(REQS.sql, 'public_groups'))).toEqual(['slug', 'name', 'disease_id', 'created_at'])
    expect(REQS.sql).toMatch(/CREATE TRIGGER sync_public_groups\s+AFTER INSERT OR UPDATE OR DELETE ON public\.patient_groups/)
    expect(REQS.sql).toContain('GRANT SELECT ON public.public_groups TO anon, authenticated;')
    expect(REQS.sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)/)
  })
})

describe('A 疾患の固定 ID', () => {
  const IDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'disease_ids.json'), 'utf-8')).diseases as {
    stable_id: string
    idx: number
    name: string
  }[]
  // コメントを落とさない原文（seed の印はコメント行なので、こちらで切り出す）
  const RAW = fs.readFileSync(path.join(MIGRATIONS_DIR, '20261023_disease_catalog.sql'), 'utf-8')

  test('seed は data/disease_ids.json と 1 件ずつ一致する（gen_disease_catalog.py で再生成しても差分なし）', () => {
    const block = RAW.split('-- BEGIN DISEASE CATALOG')[1].split('-- END DISEASE CATALOG')[0]
    const rows = [...block.matchAll(/^    \('(rd\d{5})', (\d+), '((?:[^']|'')*)'\)/gm)].map((m) => ({
      stable_id: m[1],
      idx: Number(m[2]),
      name: m[3].replace(/''/g, "'"),
    }))
    const expected = [...IDS]
      .sort((a, b) => a.stable_id.localeCompare(b.stable_id))
      .map(({ stable_id, idx, name }) => ({ stable_id, idx, name }))
    expect(rows).toEqual(expected)
    expect(rows).toHaveLength(IDS.length)
  })

  test('disease_catalog は契約の列・anon は読めない・誰も書けない', () => {
    expect(columns(tableDef(CATALOG.sql, 'disease_catalog'))).toEqual(['disease_id', 'idx', 'name'])
    expect(CATALOG.sql).toMatch(/ON public\.disease_catalog\s+FOR SELECT TO authenticated\s+USING \(true\)/)
    expect(CATALOG.sql).toContain('GRANT SELECT ON public.disease_catalog TO authenticated;')
    expect(CATALOG.sql).not.toMatch(/GRANT [^;]*disease_catalog[^;]*anon/)
    expect(CATALOG.sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)/)
  })

  test('既存の 4 表に disease_id 系の列を足して埋め、idx の列は残す', () => {
    for (const t of ['group_wishes', 'public_wish_counts', 'member_diseases']) {
      expect(CATALOG.sql).toMatch(new RegExp(`ALTER TABLE public\\.${t}\\s+ADD COLUMN IF NOT EXISTS disease_id TEXT REFERENCES public\\.disease_catalog`))
    }
    expect(CATALOG.sql).toContain("ADD COLUMN IF NOT EXISTS disease_ids TEXT[] NOT NULL DEFAULT '{}'")
    expect(CATALOG.sql).not.toMatch(/DROP COLUMN/)
    expect(CATALOG.sql).toContain('WHERE c.idx = w.disease_idx AND w.disease_id IS NULL')
    expect(CATALOG.sql).toContain('SET disease_id = public.resolve_disease_id(d.disease_idx, d.disease_name)')
  })

  test('病気の決め方は推測で埋めない（idx と名前・名前だけでちょうど 1 件・それ以外は NULL）', () => {
    const f = fnBody(CATALOG.sql, 'resolve_disease_id')
    expect(f).toContain('WHERE c.idx = p_idx AND c.name = p_name')
    expect(f).toContain('HAVING count(*) = 1')
    expect(fnBody(CATALOG.sql, 'fill_patient_group_disease_ids')).toContain('IF array_position(v_ids, NULL) IS NULL THEN')
  })

  test('wish_summary_ops は運営だけ・user_id を返さない・Studio 専用の wish_summary は残す', () => {
    const f = fnBody(CATALOG.sql, 'wish_summary_ops')
    expect(f).toMatch(/RETURNS TABLE \(prefecture TEXT, relation TEXT, is_group_member BOOLEAN, n BIGINT\)/)
    expect(f).toMatch(/IF NOT public\.is_operator\(\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    expect(f).toContain('w.disease_id = p_disease_id AND w.withdrawn_at IS NULL')
    expect(f).not.toMatch(/user_id/)
    expect(CATALOG.sql).not.toMatch(/DROP FUNCTION[^;]*wish_summary/)
  })

  test('公開の数の写し直しは 20261019 と同じ数え方・時刻の扱い（disease_id の受け渡しだけ足した）', () => {
    const f = fnBody(CATALOG.sql, 'sync_public_wish_count')
    expect(f).toContain('w.disease_idx = v_idx AND w.withdrawn_at IS NULL')
    expect(f).toContain("CASE WHEN v_cnt < public.stats_threshold() THEN '10未満' ELSE v_cnt::TEXT END")
    expect(f).toContain('WHERE c.n IS DISTINCT FROM EXCLUDED.n;')
    expect(f).not.toMatch(/DELETE FROM public\.public_wish_counts/)
  })
})

describe('運営の通報一覧（20261030）', () => {
  test('ファイルがちょうど 1 本', () => {
    expect(REPORTS.files).toEqual(['20261030_list_all_reports.sql'])
  })

  test('運営だけ・通報者と対応者と本文を返さない・表の権限は変えない', () => {
    const f = fnBody(REPORTS.sql, 'list_all_reports')
    expect(f).toMatch(/IF NOT public\.is_operator\(\) THEN\s+RAISE EXCEPTION USING MESSAGE = 'forbidden';/)
    expect(f.split('RETURNS TABLE (')[1].split(')\n')[0].replace(/\s+/g, ' ').trim()).toBe(
      'id UUID, group_slug TEXT, target_kind TEXT, post_id UUID, comment_id UUID, reason TEXT, created_at TIMESTAMP WITH TIME ZONE, handled_at TIMESTAMP WITH TIME ZONE'
    )
    expect(f).not.toMatch(/reporter_id|handled_by|\.body|\.title/)
    expect(REPORTS.sql).not.toMatch(/ON public\.content_reports|ON TABLE public\.content_reports/)
  })
})

describe('関数の属性（6 本すべて）', () => {
  test('すべて SECURITY DEFINER・search_path 空', () => {
    for (const [sql, f] of [...CALLABLE, ...INTERNAL]) {
      const body = fnBody(sql, f)
      expect(body).toContain('SECURITY DEFINER')
      expect(body).toContain("SET search_path = ''")
    }
  })

  test('API から呼ぶ関数は PUBLIC・anon から外し authenticated に付ける', () => {
    for (const [sql, f, args] of CALLABLE) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\(${argsRe(args)}\\)\\s+FROM PUBLIC, anon;`))
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${f}\\(${argsRe(args)}\\)\\s+TO authenticated;`))
    }
  })

  test('内部用の関数はどの API ロールにも EXECUTE なし', () => {
    for (const [sql, f, args] of INTERNAL) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${f}\\(${argsRe(args)}\\)\\s+FROM PUBLIC, anon, authenticated;`))
      expect(ALL).not.toMatch(new RegExp(`GRANT [^;]*${f}`))
    }
  })
})

describe('確認台本 scripts/portal/verify_ops.sql', () => {
  test('ローカル専用の明記と安全装置がある', () => {
    expect(SCRIPT).toContain('ローカル Supabase 専用。本番では絶対に実行しない')
    expect(SCRIPT).toMatch(/IF v_others > 20 THEN\s+RAISE EXCEPTION/)
  })

  test('項目 0〜9 と後片付けがそろっている', () => {
    for (let i = 0; i <= 9; i++) expect(SCRIPT).toMatch(new RegExp(`vo_(chk|rec)\\('${i}',`))
    expect(SCRIPT).toContain("vo_chk('後片付け'")
  })

  test('台本の関数一覧が migration の関数と同じ', () => {
    const block = (name: string) =>
      [...SCRIPT.split(`${name} CONSTANT TEXT[] := ARRAY[`)[1].split('];')[0].matchAll(/'public\.(\w+)\(/g)].map((m) => m[1]).sort()
    expect(block('FUNCS')).toEqual(CALLABLE.map(([, f]) => f).sort())
    expect(block('INTERNAL_FUNCS')).toEqual(INTERNAL.map(([, f]) => f).sort())
  })
})
