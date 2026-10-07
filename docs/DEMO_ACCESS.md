# 閲覧コード入口（プロトタイプ用・本番前に削除）

プロダクトデモ用のプロトタイプとして、招待メール無しで会員向けページ（`/demo/community`）の**見本**を見られる入口。
本物の招待制ログイン（Supabase のマジックリンク）は変えていない。決定の記録は `docs/DECISIONS.md` の 2026-09-25 の項。

コード上の該当箇所には、すべて `DEMO_ACCESS: 本番前に削除` の印がある（`grep -rn "DEMO_ACCESS" app middleware.ts`）。

## 動き

| 環境変数 | 役割 |
|---|---|
| `DEMO_ACCESS_CODE` | 閲覧コード。**空・未設定なら入口ごと無い**（注意書きを出さない・route は 404・middleware も cookie を見ない） |
| `DEMO_ACCESS_SECRET` | 任意。cookie の署名鍵。無ければ `DEMO_ACCESS_CODE` を鍵に使う |

1. `/demo/login` の下部に【プロトタイプの閲覧用】の枠を出す（コードも画面に表示する）
2. `POST /demo/auth/demo-access` がコードを定数時間で比べ、一致したら cookie `tonari_demo_access` を発行して 303 で `/demo/community` へ。
   値は `<exp>.<HMAC-SHA256(exp)>`、24 時間、HttpOnly、SameSite=Lax、Path=/demo、本番のみ Secure。不一致なら `/demo/login?demo_error=1`
3. `middleware.ts` は `/demo/community/**` で Supabase のセッションが無いときだけ cookie を検証し、有効なら通す
4. `/demo/community` は閲覧モードのとき、帯と架空のサンプルのお知らせ 3 件、「閲覧を終了」だけを出す。会員のデータは読まない
5. `POST /demo/auth/demo-access/end` で cookie を消して `/demo/login` へ

## 本番に残さない理由

- 閲覧コードは画面に表示している。コードを知っていれば誰でも見本に入れる（それが目的なので、見本には架空のデータしか置かない）
- `DEMO_ACCESS_SECRET` を設定しない場合、署名鍵が閲覧コードそのものなので、コードを知っている人は cookie を自作できる。
  ただ、コードを知っていれば正規の手順でも入れるので、実害は同じ
- 会員向けページに本物の機能を足していくと、閲覧モードでそれを描かない分岐を忘れる危険が増える

## 削除手順

1. **環境変数を消す**：`.env.development.local` と Vercel などの設定から `DEMO_ACCESS_CODE`（と `DEMO_ACCESS_SECRET`）を削除する。
   これだけで入口は無効になる（画面の枠・route・cookie 判定がすべて止まる）
2. **コードを消す**：下の一覧を戻す／消す
3. **テストを戻す**：閲覧コード用のテスト 2 本を削除し、`npx jest app/demo` が通ることを確かめる

## 該当ファイル一覧

### 新規（丸ごと削除）
- `app/demo/auth/demo-access/token.ts`：署名・検証・コード比較（Web Crypto）
- `app/demo/auth/demo-access/route.ts`：コードの受付
- `app/demo/auth/demo-access/end/route.ts`：閲覧の終了
- `app/demo/__tests__/demo-access.test.ts`：route と middleware のテスト
- `app/demo/__tests__/demo-access-pages.test.tsx`：login / community の画面のテスト
- `app/demo/community/_components/SampleMemberProfile.tsx`：閲覧モードの会員情報の見本（2026-09-26 追加）
- `docs/DEMO_ACCESS.md`（このファイル）

### 変更（元に戻す）
- `app/demo/login/page.tsx`：サーバーコンポーネントにして env を読んでいる。`LoginForm.tsx` の中身をこのファイルに戻す
  （先頭の `'use client'`、関数名 `DemoLoginPage`、props は `searchParams` だけ）
- `app/demo/login/LoginForm.tsx`：上記で戻した後に削除する。閲覧コードの枠・`DEMO_ERROR`・`DemoAccessProps`・`demo` の props を外す
- `middleware.ts`：`hasValidDemoCookie` の import と、`/demo/community` 判定の中の cookie 確認の 3 行を消す
- `app/demo/_lib/session.ts`：`getViewer` の戻り値から `{ kind: 'demo' }` を外す（demo の分岐と `next/headers` の import を消す。member の `hasProfile` は残す）
- `app/demo/community/page.tsx`：`DEMO_SAMPLE_NOTICES`・`DemoView`（見本の会員情報の枠を含む）・`viewer.kind === 'demo'` の分岐を消す
- `app/demo/community/onboarding/page.tsx`：`viewer.kind === 'demo'` の分岐（/demo/community へ送る 3 行）を消す
- `app/demo/__tests__/member-onboarding.test.tsx`：demo のケースだけを消す（会員のケースは残す）
  （`member-onboarding-save.test.ts` は session.ts の hasProfile の検査だけで、demo のケースは無い。削除対象外）

`docs/DECISIONS.md` の 2026-09-25 の項は記録として残し、削除した日を追記する。
