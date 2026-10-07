// 既存の患者会がある病気の、会の新設への注意（2026-10-04）
//
// data/patient_groups にある団体（となり未参加を含む）の名前と公式サイトへのリンクを出す。
// 申請フォーム（/demo/wish/[idx]/new-group）と運営の承認の画面（/demo/ops/requests）で同じ文を使う。どちらも止めはしない。
// 公式サイトの URL が未確認（null）の団体は、名前だけを出す。

import type { ExistingGroup } from '../_lib/targets'

/** 既存の会がある病気で、理由を書かずに申請したとき（?error=reason_required） */
export const REASON_REQUIRED_MESSAGE = 'この病気にはすでに患者会があるため、新しく会を作りたい理由を書いてください。'

export function ExistingGroupsNotice({ groups, ops = false }: { groups: ExistingGroup[]; ops?: boolean }) {
  if (groups.length === 0) return null
  const names = groups.map((g) => `「${g.name}」`).join('')
  return (
    <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-300 p-5 text-base text-stone-800 leading-relaxed" data-existing-groups>
      <p>この病気には患者会{names}があります。まずその会の、となりへの参加を待つことをおすすめします。</p>
      {groups.some((g) => g.url) && (
        <ul className="mt-2 space-y-1">
          {groups
            .filter((g) => g.url)
            .map((g) => (
              <li key={g.id}>
                <a href={g.url!} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline" data-existing-group-link>
                  {g.name}の公式サイト
                </a>
              </li>
            ))}
        </ul>
      )}
      {ops && <p className="mt-2 text-sm text-stone-600">申請した方には、同じ文を申請の画面で出しています。承認はできます。理由は下の「運営へのひとこと」に書かれています。</p>}
    </div>
  )
}
