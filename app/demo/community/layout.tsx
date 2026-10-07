// 会員エリア（/demo/community 配下）専用の上部バー（2026-09-26 ファウンダー指示）
//
// 公開層のヘッダー（app/demo/layout.tsx・DemoHeader）はそのまま上にある。ここはその下に、会員エリアでだけ出す。
// 右上に丸いアイコン（表示名の頭文字 1 字。閲覧モードは「見本」）。押すとメニューが開く:
//   - 会員（member）     … マイページ／ログアウト
//   - 閲覧モード（demo） … マイページ（サンプル）／閲覧を終了
// 開閉は <details> なので、JavaScript が無くても動く。ログアウト・閲覧の終了は POST のフォーム。
//
// 入れるかどうかは middleware.ts と各ページが決める（未ログインなら各ページが /demo/login へ送る）。
// ここは見せ方だけ。見ている人が分からないときはバーを出さない。
// 表示名は本人のプロフィールだけから読む（lib/portal/member-profile.ts。氏名は使わない・ログに出さない）。
//
// 所属している会（2026-09-26）: バーの中央に出す。1 つならその会へのリンクだけ、2 つ以上なら切り替えのメニュー。
// 所属は lib/portal/tenancy.ts の myGroups（本人の有効な membership）。読めなかったときは出さない。
// プロフィールが無い・再同意が要る会員には出さない（会のページはどれも onboarding へ送るため）。
// 閲覧モードは見本の会「サンプルの会」だけ（DB は読まない）。

import { myGroups, type GroupSummary } from '@/lib/portal/tenancy'

import { getViewer } from '../_lib/session'

import { DEMO_AVATAR_TEXT, MemberBar, avatarText } from './_components/MemberBar'
import { SAMPLE_GROUP } from './_components/sample-group'

async function myGroupLinks(): Promise<GroupSummary[]> {
  try {
    const r = await myGroups()
    return r.ok ? r.value.map(({ id, slug, name }) => ({ id, slug, name })) : []
  } catch {
    return []
  }
}

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) return <>{children}</>

  const demo = viewer.kind === 'demo'
  const avatar = demo ? DEMO_AVATAR_TEXT : await avatarText(viewer.hasProfile)
  const groups = demo
    ? [SAMPLE_GROUP] // DEMO_ACCESS: 本番前に削除
    : viewer.hasProfile && !viewer.needsConsent
      ? await myGroupLinks()
      : []

  return (
    <>
      <MemberBar avatar={avatar} demo={demo} groups={groups} />
      {children}
    </>
  )
}
