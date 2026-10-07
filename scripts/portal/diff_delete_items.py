#!/usr/bin/env python3
# アカウント削除の確認画面の「消えるもの」と、delete_my_account（最新版）の実際の削除を突き合わせる
#
# 使い方: python3 scripts/portal/diff_delete_items.py > docs/account_deletion_screen_diff_YYYY-MM-DD.md
# 読むだけ（DB に接続しない）。読むのは supabase/migrations/*.sql と、確認画面 app/demo/community/account/delete/page.tsx。
# 表と画面の言葉の対応（KEYWORDS）だけは人が決める。新しい表を delete_my_account に足したら、ここにも足す。
# 対応が無い表は「記載なし」と出る（差分）。
import re, glob, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MIG = sorted(glob.glob(f'{ROOT}/supabase/migrations/*.sql'))

def strip_comments(t):
    return '\n'.join(l for l in t.split('\n') if not l.strip().startswith('--'))

# 1. 最新の delete_my_account（ファイル名順で最後に定義したもの）
latest = None
for f in MIG:
    t = strip_comments(open(f, encoding='utf-8').read())
    m = re.search(r'CREATE OR REPLACE FUNCTION public\.delete_my_account\(\).*?AS \$\$(.*?)\$\$;', t, re.S)
    if m: latest = (os.path.basename(f), m.group(1))
fname, body = latest
stmts = []
# EXECUTE '...' の中の文字列は下で別に数える（二重に数えない）
plain = re.sub(r"EXECUTE '[^']*'[^;]*;", '', body)
for m in re.finditer(r'(DELETE FROM|UPDATE)\s+(public|auth)\.(\w+)(.*?);', plain, re.S):
    kind = 'DELETE' if m.group(1) == 'DELETE FROM' else 'UPDATE'
    tail = ' '.join(m.group(4).split())
    stmts.append((kind, f'{m.group(2)}.{m.group(3)}', tail))
if re.search(r"EXECUTE 'DELETE FROM public\.profiles", body):
    stmts.append(('DELETE', 'public.profiles', '(表がある DB でだけ。EXECUTE)'))
raises = re.findall(r"MESSAGE = '(\w+)'", body)

# 2. auth.users を参照する public の外部キー（全 migration。CREATE TABLE と ALTER TABLE ADD CONSTRAINT）
fks = {}
for f in MIG:
    t = strip_comments(open(f, encoding='utf-8').read())
    for tm in re.finditer(r'CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\((.*?)\n\);', t, re.S):
        for cm in re.finditer(r'^\s*(\w+)\s+UUID[^,\n]*REFERENCES auth\.users[^,\n]*?ON DELETE (CASCADE|SET NULL)', tm.group(2), re.M):
            fks[(tm.group(1), cm.group(1))] = (cm.group(2), os.path.basename(f))
    for am in re.finditer(r'ALTER TABLE public\.(\w+)\s+ADD CONSTRAINT \w+\s+FOREIGN KEY \((\w+)\) REFERENCES auth\.users \(id\) ON DELETE (CASCADE|SET NULL)', t):
        fks[(am.group(1), am.group(2))] = (am.group(3), os.path.basename(f))

# 3. 画面の「消えるもの」「残るもの」
page = open(f'{ROOT}/app/demo/community/account/delete/page.tsx', encoding='utf-8').read()
ul = page.split('data-deleted-items>')[1].split('</ul>')[0]
items = [re.sub(r'\s+', ' ', x).strip() for x in re.findall(r'<li>(.*?)</li>', ul, re.S)]
rest = page.split('残るもの</h2>')[1].split('</section>')[0]
rest_text = re.sub(r'<[^>]+>', ' ', rest); rest_text = re.sub(r'\s+', ' ', rest_text).strip()

# 4. 表 → 画面の項目の対応（キーワードで照合。どの表がどの言葉に当たるかだけを人が決める）
KEYWORDS = {
    'public.member_profiles': ['プロフィール'],
    'public.consents': ['同意の記録'],
    'public.member_diseases': ['案内を受け取る病気'],
    'public.journey_responses': ['道のりの回答'],
    'public.journey_links': ['道のりの回答'],
    'public.event_attendance': ['行事への参加'],
    'public.group_wishes': ['参加の希望'],
    'public.content_reports': ['通報'],
    'public.join_requests': ['入会の申請'],
    'public.invitations': ['発行した招待'],
    'public.memberships': ['会員資格'],
    'public.notice_interest': ['興味がある', '治験・研究の案内への', '案内への反応'],
    'public.group_requests': ['会を作りたい', '新設'],
    'public.operators': ['運営'],
    'public.profiles': ['プロフィール'],
    'auth.users': ['メールアドレス'],
}
whole = ' '.join(items) + ' ' + page.split('残るもの</h2>')[1].split('</section>')[0]
def where(table):
    for kw in KEYWORDS.get(table, []):
        for i, it in enumerate(items, 1):
            if kw in it: return f'「消えるもの」{i}: {it}'
        if kw in rest_text: return f'「残るもの」の節の注記: …{kw}…'
    return None

out = []
out.append(f'# アカウント削除: 確認画面と delete_my_account の突き合わせ（機械生成。scripts/portal/diff_delete_items.py）\n')
out.append(f'- 関数: `supabase/migrations/{fname}`（最新の定義）。止める語: {", ".join(raises)}')
out.append(f'- 画面: `app/demo/community/account/delete/page.tsx`（「消えるもの」{len(items)} 項目）\n')
out.append('## A. 関数が消す・変えるもの → 画面の記載\n')
out.append('| # | 操作 | 表 | 条件 | 画面の記載 |')
out.append('|---|---|---|---|---|')
for i, (k, tb, tail) in enumerate(stmts, 1):
    if k == 'UPDATE':
        w = '（対象外: 他人の行に残る本人の痕跡を NULL にするだけ。行は残る）'
    else:
        w = where(tb)
    out.append(f'| {i} | {k} | `{tb}` | `{tail[:90]}` | {w or "**記載なし**"} |')
out.append('\n## B. 画面の「消えるもの」→ 関数の文\n')
out.append('| # | 画面の項目 | 当たる表（関数の文） |')
out.append('|---|---|---|')
for i, it in enumerate(items, 1):
    hit = sorted({tb for (k, tb, _) in stmts if k == 'DELETE' and any(kw in it for kw in KEYWORDS.get(tb, []))})
    out.append(f'| {i} | {it} | {", ".join(f"`{h}`" for h in hit) if hit else "**関数に当たる文なし**"} |')
out.append('\n## C. auth.users を参照する public の外部キー（全 migration）→ 関数で明示して扱っているか\n')
out.append('| 表.列 | ON DELETE | 定義 | 関数で明示 |')
out.append('|---|---|---|---|')
for (tb, col), (act, f) in sorted(fks.items()):
    explicit = any(t2 == f'public.{tb}' and col in tail for (_, t2, tail) in stmts)
    out.append(f'| `{tb}.{col}` | {act} | {f} | {"明示" if explicit else "外部キーに任せる（auth.users の削除で " + act + "）"} |')
out.append(f'\n## D. 画面の「残るもの」の文\n\n> {rest_text}\n')
print('\n'.join(out))
