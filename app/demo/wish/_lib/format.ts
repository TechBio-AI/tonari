// 参加希望の表示（クライアントの部品からも使うので、サーバー専用のものを読み込まない）

/**
 * 「希望している方：…」の表示（2026-10-03）。数なら「n 人」、それ以外（'10未満' など）は受け取ったまま。
 * label は前に付ける言葉（となり未参加の団体の案内では「参加を待っている方」。2026-10-04）
 */
export function formatWaiting(n: string, label: string = '希望している方'): string {
  return /^\d+$/.test(n) ? `${label}：${n} 人` : `${label}：${n}`
}

/** 希望のボタンの文言（/demo/groups・疾患ページ・希望の画面で同じ） */
export const WISH_BUTTON_LABEL = 'となりへの参加を希望する'
