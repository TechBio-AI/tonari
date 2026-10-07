// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
//
// プロダクトデモ用の「閲覧コード」入口。招待メール無しで会員向けページの見本を見せる。
// 本物の招待制ログイン（Supabase のマジックリンク）とは別の経路で、そちらには触れない。
//
// 環境変数 DEMO_ACCESS_CODE が空なら、この入口は無いのと同じになる
// （画面に出さない・route は 404・middleware も cookie を見ない）。
//
// middleware（edge）と route / ページ（node）の両方から使うので、Web Crypto だけで書く。

/** 閲覧用 cookie の名前 */
export const DEMO_COOKIE_NAME = 'tonari_demo_access'

/** 閲覧用 cookie の有効期間（秒）。24 時間 */
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24

/** 閲覧用 cookie の path。/demo/community と /demo/auth/demo-access/end の両方に届く範囲 */
export const DEMO_COOKIE_PATH = '/demo'

/** 閲覧コード。未設定・空なら null（= 入口は無い） */
export function getDemoAccessCode(): string | null {
  const code = process.env.DEMO_ACCESS_CODE
  return code ? code : null
}

/**
 * 署名鍵。DEMO_ACCESS_SECRET があればそれを使い、無ければ閲覧コードを使う。
 * 入口が無い（閲覧コード未設定）ときは、鍵があっても null にする。
 */
export function getDemoSigningSecret(): string | null {
  if (!getDemoAccessCode()) {
    return null
  }
  return process.env.DEMO_ACCESS_SECRET || getDemoAccessCode()
}

// 読み込み時には作らない（TextEncoder の無い描画テスト環境でも読み込めるように）
const encode = (text: string) => new TextEncoder().encode(text)

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) {
    return null
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

/** cookie の値を作る。形は「<exp（UNIX 秒）>.<HMAC-SHA256(exp) の hex>」 */
export async function signDemoToken(exp: number, secret: string): Promise<string> {
  const key = await importKey(secret, 'sign')
  const signature = await crypto.subtle.sign('HMAC', key, encode(String(exp)))
  return `${exp}.${toHex(signature)}`
}

/**
 * cookie の値を確かめる。署名が合い、期限内のときだけ true。
 * 形が崩れている・改ざん・期限切れ・例外は、すべて false（閉じる側に倒す）。
 */
export async function verifyDemoToken(
  value: string | undefined,
  secret: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (!value || !secret) {
    return false
  }
  const match = /^(\d{1,12})\.([0-9a-f]+)$/.exec(value)
  if (!match) {
    return false
  }
  const exp = Number(match[1])
  if (!(exp > nowSeconds)) {
    return false
  }
  const signature = fromHex(match[2])
  if (!signature) {
    return false
  }
  try {
    const key = await importKey(secret, 'verify')
    // subtle.verify は署名を定数時間で比べる
    return await crypto.subtle.verify('HMAC', key, signature, encode(match[1]))
  } catch {
    return false
  }
}

/**
 * 入力されたコードと閲覧コードを、長さや一致位置が時間に出ない形で比べる。
 * 両方を SHA-256 にかけて同じ長さにし、全バイトを XOR で比べる。
 */
export async function codesMatch(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode(input)),
    crypto.subtle.digest('SHA-256', encode(expected)),
  ])
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  let diff = 0
  for (let i = 0; i < x.length; i++) {
    diff |= x[i] ^ y[i]
  }
  return diff === 0
}

/** 閲覧用 cookie が有効か（入口が無ければ常に false） */
export async function hasValidDemoCookie(value: string | undefined): Promise<boolean> {
  return verifyDemoToken(value, getDemoSigningSecret())
}
