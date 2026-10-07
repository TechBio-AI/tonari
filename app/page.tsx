import { redirect } from 'next/navigation'

// 入口は /demo。ルート（/）は next.config.js の redirects で /demo へ 308 で送る。
// ここに来ることは無いが、念のため同じ先へ送る。
export default function Home() {
  redirect('/demo')
}
