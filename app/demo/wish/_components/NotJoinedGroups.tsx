// となりにまだ参加していない団体（data/patient_groups の tonari_status が "not_joined"）の案内（2026-10-04）
//
// 「患者会「○○」があります（となり未参加）。参加を待っている方：n 人」。人数は開いたあとに読む（WishWaiting。読めなければ人数だけ出さない）。
// 希望の画面（/demo/wish/[idx]）で使う。団体の名前は会のページ（/demo/groups/[id]）へのリンク。

import Link from 'next/link'

import type { ExistingGroup } from '../_lib/targets'
import { WishWaiting } from './WishWaiting'

export const WAITING_LABEL = '参加を待っている方'

export function NotJoinedGroups({ groups, idx }: { groups: ExistingGroup[]; idx: number }) {
  if (groups.length === 0) return null
  return (
    <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base text-stone-800 leading-relaxed" data-not-joined-groups>
      <p>
        患者会
        {groups.map((g) => (
          <span key={g.id}>
            「
            <Link href={`/demo/groups/${encodeURIComponent(g.id)}`} className="text-orange-700 hover:underline">
              {g.name}
            </Link>
            」
          </span>
        ))}
        があります（となり未参加）。
        <WishWaiting idx={idx} label={WAITING_LABEL} />
      </p>
    </div>
  )
}
