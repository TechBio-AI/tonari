// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// 閲覧モード（kind: 'demo'）でだけ出す、会員情報の見本。値はすべて架空で固定。
// DB は読まない。入力欄も保存ボタンも持たない（見本は編集できない）。

/** 見本の値（2026-09-26 ファウンダー指示） */
// 2026-09-26: プロフィールを「登録する方」と「患者さん」に分けたので、「登録する方」を先頭に足した（見本はご本人の登録）
const SAMPLE_PROFILE: Array<[label: string, value: string]> = [
  ['登録する方', 'ご本人'],
  ['氏名', '山田 花子（サンプル）'],
  ['表示名', 'はなこ'],
  ['年代', '30代'],
  ['性別', '女性'],
  ['お住まいの都道府県', '東京都'],
]

export const SAMPLE_PROFILE_HEADING = '会員情報（サンプル）'

export default function SampleMemberProfile({ myPageHref }: { myPageHref?: string }) {
  return (
    <section
      aria-labelledby="sample-member-profile-heading"
      className="rounded-2xl bg-white border border-stone-200 p-7"
    >
      <h2 id="sample-member-profile-heading" className="text-xl font-bold text-stone-800">
        {SAMPLE_PROFILE_HEADING}
      </h2>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-base">
        {SAMPLE_PROFILE.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-stone-500">{label}</dt>
            <dd className="text-stone-800 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-sm text-stone-500 leading-relaxed">見本のため、内容は変更できません。</p>
      {myPageHref && (
        <p className="mt-4">
          <a href={myPageHref} className="text-base font-semibold text-orange-800 underline underline-offset-4">
            マイページ（サンプル）
          </a>
        </p>
      )}
    </section>
  )
}
