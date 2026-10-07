import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
// DEMO_ACCESS: 本番前に削除（docs/DEMO_ACCESS.md）
import { DEMO_COOKIE_NAME, hasValidDemoCookie } from '@/app/demo/auth/demo-access/token'

// 登録層（/demo/community/**）の境界。
// ここは「患者会からの招待を受けた方」だけの面なので、セッションが無ければ入口へ送る。
// 判定するのはログイン済みかどうかだけ。それ以外のことはしない。
const COMMUNITY_PATH = /^\/demo\/community(\/|$)/

// -----------------------------------------------------------------------------
// 本番で出す面の境界（2026-09-26 ファウンダー指示。docs/DEPLOY_CHECKLIST_2026-09-26.md の 1）
//
// 本番に出すのは『となり』（/demo/**）だけ。旧画面（/pharma・/doctor・/diagnosis・/settings 等）と
// 旧 API（/api/**）は、utils/supabase/middleware.ts の公開パスに入っているため
// ログイン無しで誰でも入れる。robots.txt はクロールを断るだけで、アクセスは止めない。
// ここで 404 にして、アクセス自体を止める。
//
// 止める側を既定にする（許可制）。新しい旧画面が足されても、勝手には出ない。
// 旧画面が要るときだけ、環境変数 LEGACY_ROUTES=on で開ける。
//
// 本番以外（開発・テスト）では何もしない。手元の開発が止まらないようにするため。
//
// ルート（/）はここに来ない。next.config.js の redirects が middleware より先に評価され、
// /demo へ 308 で送られるため（next/dist/server/lib/router-utils/resolve-routes.js で
// headers → redirects → middleware の順に並んでいることを確認済み）。
// そのため / は下の許可一覧に入れていない。
// -----------------------------------------------------------------------------

/** 本番でも通すファイル（拡張子が無いもの） */
const ALLOWED_FILES = new Set(['/robots.txt', '/sitemap.xml', '/favicon.ico'])

/** 本番でも通す経路 */
const ALLOWED_PREFIXES = [
    /^\/demo(\/|$)/, // 『となり』本体（公開層・登録層とも）
    /^\/_next\//, // ビルド成果物
]

/**
 * public/ 配下の静的ファイル。
 * 拡張子で見分ける（public/ にディレクトリは無く、すべて拡張子つきのファイル）。
 * 下の matcher が画像の大半を既に除いているが、ここでも通しておく。
 */
const STATIC_FILE = /\.(svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json|webmanifest|css|js|map|woff2?)$/

function isAllowedInProduction(pathname: string): boolean {
    if (ALLOWED_FILES.has(pathname)) return true
    if (ALLOWED_PREFIXES.some((re) => re.test(pathname))) return true
    return STATIC_FILE.test(pathname)
}

/**
 * 本番で、許した経路以外を止めるか。
 * LEGACY_ROUTES=on のときだけ旧パスを通す（値は 'on' ちょうどのときだけ。空文字・'off' では開かない）。
 */
function blocksLegacyRoutes(): boolean {
    return process.env.NODE_ENV === 'production' && process.env.LEGACY_ROUTES !== 'on'
}

// セッションの有無だけを見る。
//
// utils/supabase/middleware.ts の updateSession は応答しか返さないため、ここで別に
// クライアントを組み立てる。cookie の更新は updateSession が済ませた後なので、
// ここでは読むだけ（set / remove は空実装）。
async function hasSession(request: NextRequest): Promise<boolean> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 未設定（デモモード）なら「セッション無し」に倒す。開けっ放しにはしない
    if (!supabaseUrl || !supabaseUrl.startsWith('http') || !supabaseKey) {
        return false
    }

    try {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set() {},
                remove() {},
            },
        })
        const { data: { user } } = await supabase.auth.getUser()
        return Boolean(user)
    } catch (err) {
        // 通信できない等で分からない時も、閉じる側に倒す
        console.error('セッションの確認に失敗しました:', err)
        return false
    }
}

export async function middleware(request: NextRequest) {
    // 本番で出す面の境界を、いちばん先に見る。
    // updateSession より前に置くのは、止める経路で旧コード（Basic 認証・profiles のロール読み取り）を
    // 一切動かさないため。/demo の扱いはここを素通りするので何も変わらない。
    if (blocksLegacyRoutes() && !isAllowedInProduction(request.nextUrl.pathname)) {
        return new NextResponse('このページはありません。', {
            status: 404,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
    }

    // 既存の updateSession（Basic認証・Supabase セッション・ロール制御）を先に通す。
    // その判断は変えない。素通し（200）だった時にだけ、この境界を重ねる。
    const response = await updateSession(request)
    if (response.status !== 200) {
        return response
    }

    if (COMMUNITY_PATH.test(request.nextUrl.pathname) && !(await hasSession(request))) {
        // DEMO_ACCESS: 本番前に削除。セッションが無いときだけ、閲覧コードの cookie を確かめる。
        // DEMO_ACCESS_CODE が未設定なら常に false（cookie があっても見ない）。改ざん・期限切れも false
        if (await hasValidDemoCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
            return response
        }
        return NextResponse.redirect(new URL('/demo/login', request.url), 302)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
