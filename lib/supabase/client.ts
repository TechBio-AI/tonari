import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 開発環境でSupabase URLが未設定の場合はダミーURLを使用
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  // プレースホルダーの場合はダミーURLを使用
  const url = supabaseUrl.includes('your-project') ? 'https://placeholder.supabase.co' : supabaseUrl
  const key = supabaseKey.includes('your-') ? 'placeholder-key' : supabaseKey

  return createBrowserClient(url, key)
}