# claudedemo — エージェント向け開発ガイド

社内向けのアンケート集計システム。Next.js 16 (App Router) + Prisma + Azure SQL Server。
回答者は CSV で一括登録された社員、管理者はアンケートを作成して結果を CSV ダウンロードする。

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 技術スタック

- **Next.js 16.2.4** (App Router, React 19, Server Components / Server Actions)
- **TypeScript 5** (strict)
- **Prisma 7** + `@prisma/adapter-mssql` (mssql/tedious ドライバ)
- **iron-session 8** (暗号化 Cookie セッション)
- **bcrypt** (パスワードハッシュ)
- **zod 4** (入力バリデーション)
- **Tailwind CSS 4**
- **Node.js 20 LTS** 必須 (`engines.node >= 20.9.0`)

## ディレクトリ構成

```
src/
  app/
    layout.tsx              ルート HTML
    page.tsx                ログイン状態に応じてリダイレクト
    actions/auth.ts         login / logout (Server Action)
    login/                  /login
    admin/                  管理者画面（layout で requireAdmin）
      page.tsx                アンケート一覧
      users/                  ユーザー管理（CSV 取込・削除）
      surveys/new/            新規作成
      surveys/[id]/           詳細
      surveys/[id]/download/  CSV ダウンロード Route Handler
    surveys/                回答者画面（layout で requireUser）
      page.tsx                自分向け一覧
      [id]/                   回答フォーム
  components/header.tsx     共通ヘッダ
  lib/
    db.ts                   PrismaClient シングルトン (Proxy で遅延初期化)
    session.ts              iron-session ラッパ + requireUser/requireAdmin
    csv.ts                  CSV パーサ / ビルダ (RFC 4180 準拠)

prisma/
  schema.prisma             6 モデル（User/Survey/Question/Choice/Response/Answer）
  seed.ts                   初期管理者の upsert

proxy.ts                    Next.js 16 の Proxy（旧 middleware 相当）
                            未ログインを /login にリダイレクト、/admin の権限チェック
next.config.ts              output: 'standalone' + Prisma/mssql の同梱設定
.github/workflows/deploy.yml  Azure App Service への自動デプロイ
docs/design.md              設計書（Confluence にもミラー）
```

`@/*` は `./src/*` を指すパスエイリアス（tsconfig.json）。

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ起動 (http://localhost:3000) |
| `npm run build` | 本番ビルド（`output: 'standalone'`） |
| `npm run start` | ビルド済み成果物の起動 |
| `npm run lint` | ESLint |
| `npm run db:migrate` | マイグレーション作成＆適用（dev） |
| `npm run db:deploy` | マイグレーション適用のみ（本番） |
| `npm run db:push` | スキーマを DB に直接反映（マイグレーション無し） |
| `npm run db:seed` | 初期管理者を upsert |
| `npm run db:generate` | Prisma クライアント再生成（`postinstall` でも自動実行） |

スキーマ（`prisma/schema.prisma`）変更後は **必ず `npm run db:migrate` を実行**。型生成も同時に走る。

## 環境変数

`.env.example` を参照。

- `DATABASE_URL` — SQL Server 接続文字列。`encrypt=true` 必須（Azure SQL）。`loginTimeout` 等は **ミリ秒扱いになる罠**があるので原則省略する
- `SESSION_SECRET` — iron-session の暗号鍵。**32 文字以上** のランダム値
- `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` / `ADMIN_NAME` — `db:seed` で投入される初期管理者

## 認証フロー

1. `proxy.ts` が全リクエストを受け、未ログインなら `/login` へ
2. `login` Server Action（`src/app/actions/auth.ts`）が bcrypt 検証してセッションを保存
3. ページの先頭で `requireUser()` / `requireAdmin()` を呼ぶ。NG なら自動リダイレクト
4. Route Handler（例: CSV ダウンロード）はレイアウトを通らないので **自前で `getSession()` チェック**

## コーディング規約

- **Server Component を既定**にし、`'use client'` は本当に必要な箇所だけに付ける
- **Server Action ファイルは冒頭に `'use server'`**。引数は `(_state, formData)` の形で `useActionState` と組み合わせる
- **DB アクセスは必ず `src/lib/db.ts` の `prisma` 経由**。`new PrismaClient()` を直接書かない（HMR で多重生成される）
- **入力検証は zod**。Server Action 側で `safeParse` → 失敗時は state を返す
- **権限チェックを忘れない**。Server Action の冒頭で `requireAdmin()` / `requireUser()` を呼ぶ
- **`select` で必要列だけ取得**。`passwordHash` などの機密はクライアントに渡さない
- **複数 Server Action の状態型はユニオン型**（`{ ok: true; ... } | { ok: false; message }`）
- **コメントは原則最小限**（学習用に詳細コメントを入れている既存コードはそのまま残す）

## デプロイ

- **本番**: Azure App Service `sgclaudedemo` (japaneast, B1 Linux, Node 20 LTS)
  URL: https://sgclaudedemo.azurewebsites.net
- **CI/CD**: `.github/workflows/deploy.yml` が `main` への push で自動デプロイ
  - `output: 'standalone'` の成果物を `upload-artifact` の `include-hidden-files: true` で送る（`.next` ディレクトリが落ちる罠）
  - SCM Basic Auth が有効な publish profile が必要

## はまりどころ（既出）

- **Prisma adapter-mssql のタイムアウト**: `loginTimeout` を秒のつもりで `30` と書くと 30ms で切れる。**省略推奨**
- **standalone デプロイ**: `actions/upload-artifact` がデフォルトでドットディレクトリ (`.next`) を除外する → `include-hidden-files: true` が必要
- **改行コード**: `.gitattributes` で LF 統一。`.bat/.cmd/.ps1` のみ CRLF
- **PowerShell 5.1 で UTF-8**: `Get-Content` には `-Encoding UTF8` を必ず付ける（Windows 既定は CP932）

## 参考リンク

- GitHub: https://github.com/sugiykoba66/claudedemo
- Confluence 親ページ: https://sugi-pharmacy.atlassian.net/wiki/x/tADSfQ
- 設計書: `docs/design.md`
