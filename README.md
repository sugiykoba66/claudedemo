# アンケート集計システム

Next.js 16 + React 19.2 + Prisma 7 + Azure SQL Server で構築したアンケート集計システムです。

## 機能

### 回答者
- ユーザーID / パスワードでログイン
- 割り当てられたアンケートの一覧表示（回答済み/未回答）
- アンケートへの回答（単一選択 / 複数選択 / 自由記述 / 日付）
- 1アンケートにつき1回のみ回答可能

### 管理者
- ユーザーのCSV一括登録
- ユーザー削除
- アンケートの作成（質問を動的に追加、4タイプ対応）
- アンケート一覧（回答数表示）
- アンケート削除
- 回答データの CSV ダウンロード（UTF-8 BOM 付き）

## 技術スタック

| 区分 | 技術 |
|---|---|
| Framework | Next.js 16（App Router、Server Actions、Proxy） |
| UI | React 19.2 / Tailwind CSS v4 |
| DB | Azure SQL Server（Prisma 7 + `@prisma/adapter-mssql`） |
| 認証 | iron-session（セッション Cookie）+ bcrypt |
| バリデーション | Zod |
| ランタイム | Node.js 20.9+ |

## セットアップ（ローカル開発）

### 1. 依存関係のインストール

```bash
npm install
```

`postinstall` で `prisma generate` が自動実行されます。

### 2. 環境変数

`.env.example` を `.env` にコピーし、値を設定します。

```
DATABASE_URL="sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net"
SESSION_SECRET="32文字以上のランダム文字列"
ADMIN_LOGIN_ID="admin"
ADMIN_PASSWORD="changeme"
ADMIN_NAME="管理者"
```

`SESSION_SECRET` は以下で生成できます：

```bash
openssl rand -base64 32
```

### 3. DB マイグレーション

初回セットアップ時：

```bash
npm run db:migrate -- --name init
```

本番環境では：

```bash
npm run db:deploy
```

### 4. 初期管理者の作成

```bash
npm run db:seed
```

`.env` の `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` で登録されます。

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 で起動します。

### 6. テスト

```bash
npm run test          # 1 回実行
npm run test:watch    # 監視モード
```

テストの方針と CI 構成は [docs/testing.md](docs/testing.md) を参照。

## CSV フォーマット

### ユーザー一括登録

1行目にヘッダを必須で記載します。

```csv
loginId,name,password,role
user001,山田太郎,pass1234,user
user002,佐藤花子,pass1234,user
admin2,運営管理者,strongPass,admin
```

- `role` は省略可能（未指定時は `user`）
- パスワードは登録時に bcrypt でハッシュ化されます
- 既存の `loginId` はスキップされます

### 回答ダウンロード

管理画面の各アンケート詳細から「CSVダウンロード」でエクスポートできます。

- UTF-8 BOM 付きなので Excel でもそのまま開けます
- 複数選択は `; ` 区切り
- 日付は `YYYY-MM-DD`
- 1行 = 1 回答者

## Azure App Service へのデプロイ

### 1. Azure リソース準備

- **Azure SQL Database** を作成（Standard S0 以上推奨）
- **Azure App Service (Linux, Node 20 LTS)** を作成
- App Service のファイアウォールから Azure SQL への接続を許可

### 2. App Service のアプリケーション設定（環境変数）

| Key | Value |
|---|---|
| `DATABASE_URL` | Azure SQL の接続文字列（上記形式） |
| `SESSION_SECRET` | 32文字以上のランダム文字列 |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true`（Oryx ビルド有効化） |

### 3. デプロイ

GitHub Actions / `az webapp deploy` / VS Code 拡張など任意の方法で。Oryx が自動で `npm install`（postinstall で `prisma generate` 実行）→ `npm run build` を行います。

### 4. 初回のみ DB マイグレーションと初期管理者登録

ローカルから `DATABASE_URL` を本番の値に変えて実行するか、App Service の Kudu コンソールから以下を実行：

```bash
npm run db:deploy
npm run db:seed
```

### 5. 起動

App Service の Startup Command は `npm start` でOK。

## ディレクトリ構成

```
prisma/
  schema.prisma          Prisma スキーマ
  seed.ts                初期管理者登録スクリプト
proxy.ts                 ルート保護（Next.js 16 の middleware 後継）
prisma.config.ts         Prisma 設定（datasource.url）
src/
  app/
    layout.tsx
    page.tsx             role によるリダイレクト
    login/               ログイン画面
    admin/               管理者画面
      layout.tsx         requireAdmin
      page.tsx           アンケート一覧
      users/             ユーザーCSV登録
      surveys/
        new/             アンケート作成UI
        [id]/            アンケート詳細
          download/      CSV ダウンロード Route Handler
    surveys/             回答者画面
      layout.tsx         requireUser
      page.tsx           アンケート一覧
      [id]/              回答フォーム
    actions/
      auth.ts            login / logout
  components/
    header.tsx
  lib/
    db.ts                PrismaClient（MSSQL adapter）
    session.ts           iron-session ヘルパー
    csv.ts               CSV パース/生成
```

## Prisma MSSQL Adapter の注意点

`@prisma/adapter-mssql` は接続文字列の `loginTimeout` / `connectionTimeout` パラメータの値を **ミリ秒として** `mssql` の `connectionTimeout` に渡します（一般的な秒単位ではない）。

例えば `loginTimeout=30` と書くと 30 ミリ秒でタイムアウトしてしまい、`Failed to connect ... in XXms` エラーになります。**省略するか `loginTimeout=30000`（ミリ秒）を指定してください**。

## 注意点（Next.js 16）

- ミドルウェアは `proxy.ts` にリネーム（Node.js ランタイム限定）
- `cookies()`, `headers()`, `params`, `searchParams` は全て `await` 必須
- Turbopack がデフォルト。`next build` も Turbopack で実行される
