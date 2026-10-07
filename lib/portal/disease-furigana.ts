/**
 * 疾患名に添えるふりがな（患者・家族向け）
 *
 * 漢字が読めない利用者のために、病名の直後に読みを小さく添える。
 * 読みは data/disease_readings/readings.json のものをそのまま使う（推定しない）。
 *
 * 出さない判定（2026-09-14 ファウンダー確定）:
 *   病名から漢字と英字を取り除いた残りが読みと一致するなら出さない。
 *   「サルコイドーシス（さるこいどーしす）」のように、読める文字を読める文字で繰り返すだけになるため。
 *   数字を含む「13トリソミー」は、数字の読みが分かるので出す。
 *
 * 出す判定:
 *   漢字を含むもの … 漢字が読めないので必要
 *   英字だけのもの … 英語が読めない利用者にとって、ふりがなが唯一の発音の手がかりになる
 */

/** カタカナをひらがなに畳む */
function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/**
 * ふりがなを表示するか。
 * 病名から漢字・英字・記号を除いた残りが読みと同じなら、繰り返しになるので出さない。
 */
export function shouldShowFurigana(name: string, reading: string | null): reading is string {
  if (!reading) return false
  const rest = toHiragana(name)
    .replace(/[一-鿿A-Za-z0-9]/g, '')
    .replace(/[\s　・･\-－―‐/／（）()]/g, '')
  return rest !== reading
}
