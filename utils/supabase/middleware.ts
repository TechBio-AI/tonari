import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // ─── Basic認証（環境変数 BASIC_AUTH_PASSWORD が設定されている場合のみ有効）───
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD
    if (basicAuthPassword) {
        const authHeader = request.headers.get('authorization')
        if (authHeader) {
            const [scheme, encoded] = authHeader.split(' ')
            if (scheme === 'Basic' && encoded) {
                const decoded = atob(encoded)
                const [, password] = decoded.split(':')
                if (password === basicAuthPassword) {
                    // 認証成功 → 通常処理へ
                } else {
                    return new NextResponse('Unauthorized', {
                        status: 401,
                        headers: { 'WWW-Authenticate': 'Basic realm="RareDx"' },
                    })
                }
            } else {
                return new NextResponse('Unauthorized', {
                    status: 401,
                    headers: { 'WWW-Authenticate': 'Basic realm="RareDx"' },
                })
            }
        } else {
            return new NextResponse('Unauthorized', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="RareDx"' },
            })
        }
    }

    // Supabase URL が未設定またはプレースホルダーの場合、認証をスキップ（デモモード）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
        return response
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // 公開アクセスを許可するルート（認証不要）
    const publicPaths = [
        '/',
        '/auth',
        '/api/auth',
        '/api/diagnosis',
        '/api/integrated-diagnosis',
        '/api/symptoms',
        '/api/llm-status',
        '/api/llm-settings',
        '/api/rag',
        '/api/validate-api-key',
        '/api/llm-analyze',
        '/api/simple-llm-analyze',
        '/api/unified-llm-analysis',
        '/api/llm-config',
        '/api/llm-integration-test',
        '/api/report-commentary',
        '/api/advanced-analysis',
        '/api/diagnosis-debug',
        '/api/pharma/export',
        '/api/followups',
        '/api/treatments',
        '/api/visits',
        '/api/deliveries',
        '/api/outcomes',
        '/api/articles',
        '/pharma',
        '/diagnosis',
        '/about',
        '/settings',
        '/doctor',
        '/articles',
        '/test-diagnosis',
        // [2026-07-26] ポータル(/portal)・疾患DB(/diseases)・/api/disease-search は
        // _ARCHIVE_DO_NOT_USE/ へ隔離したため公開パスから削除
        // [2026-09-10] デモ画面(/demo)とその検索API。疾患についての一般情報だけを扱い、
        // ログインを前提としないため公開パスに置く。
        '/demo',
        '/api/demo',
        // [Phase0-T2] クローラ向けファイルは常に公開（sitemap.xml は第2段で実体化）
        '/robots.txt',
        '/sitemap.xml',
    ]

    const isPublicPath = publicPaths.some(p =>
        request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/')
    )

    // 認証済みユーザーのみアクセス可能なパス（公開パス以外）
    if (
        !user &&
        !isPublicPath
    ) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        // ログインページへリダイレクト
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
    }

    // ロールベースのアクセス制御
    if (user) {
        // プロフィールからロールを取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        const isApi = request.nextUrl.pathname.startsWith('/api/')

        // 製薬会社向けページ・APIへのアクセス制御
        if (request.nextUrl.pathname.startsWith('/pharma') || request.nextUrl.pathname.startsWith('/api/deliveries')) {
            if (role !== 'pharma' && role !== 'admin') {
                if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                const url = request.nextUrl.clone()
                url.pathname = '/' // または権限エラーページ
                return NextResponse.redirect(url)
            }
        }

        // 管理者向けページ（将来用）へのアクセス制御
        if (request.nextUrl.pathname.startsWith('/admin')) {
            if (role !== 'admin') {
                if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }

        // 医師向けページへのアクセス制御
        if (request.nextUrl.pathname.startsWith('/doctor') || request.nextUrl.pathname.startsWith('/diagnosis')) {
            if (role !== 'doctor' && role !== 'admin') {
                if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                const url = request.nextUrl.clone()
                url.pathname = '/' // 適切なエラーページ等があればそれに遷移
                return NextResponse.redirect(url)
            }
        }
    }

    return response
}
