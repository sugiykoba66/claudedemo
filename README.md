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

本番環境は **GitHub Actions による自動デプロイ + production 承認ゲート** で運用しています。詳細は [docs/design.md §11](docs/design.md) を参照。

### 1. Azure リソース準備

- **Azure SQL Database** を作成（Standard S0 以上推奨）
- **Azure App Service (Linux, Node 20 LTS)** を作成（`linuxFxVersion=NODE|20-lts`）
- App Service のファイアウォールから Azure SQL への接続を許可

### 2. App Service のアプリケーション設定（環境変数）

| Key | Value | 必須 |
|---|---|---|
| `DATABASE_URL` | Azure SQL の接続文字列（上記形式） | ✅ |
| `SESSION_SECRET` | **32 文字以上**のランダム文字列 | ✅ |
| `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` / `ADMIN_NAME` | seed 実行時に必要 | seed のみ |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true`（Oryx で `npm install` を走らせる場合） | 任意 |

> Linux App Service では `WEBSITE_NODE_DEFAULT_VERSION` は不要（Windows 用設定）。Node バージョンは `linuxFxVersion` で決まる。

### 3. デプロイ（GitHub Actions）

`main` への push で `.github/workflows/deploy.yml` が起動します。

1. `build` ジョブ: lint / tsc / vitest / `next build`（`output: 'standalone'`）→ 成果物を artifact 化
2. `deploy` ジョブ: `environment: production` で承認待ちに停止 → Required reviewer の承認後に App Service へ反映

PR / 非 main push では `.github/workflows/ci.yml` の `verify` ジョブが lint / tsc / vitest を回します。Branch protection で `verify` を必須にしているため、緑にならない PR はマージできません。

### 4. 初回のみ DB マイグレーションと初期管理者登録

ローカルから `DATABASE_URL` を本番の値に変えて実行するか、App Service の Kudu コンソール（SCM Basic Auth 必要）から以下を実行：

```bash
npm run db:deploy    # prisma migrate deploy
npm run db:seed      # 初期管理者の upsert
```

### 5. 起動

Startup Command は **`node server.js`** を指定します（`output: 'standalone'` のエントリ）。`npm start` を指定すると `next start` が呼ばれ、standalone バンドルでは起動できません。

> **Always On は OFF で運用中**（コスト最適化）。アイドル後の初回アクセスはコールドスタートで数秒〜数十秒かかります。常時応答が必要なら `az webapp config set -g rg-claude -n sgclaudedemo --always-on true` で有効化できます（料金影響あり）。

## ディレクトリ構成

```
prisma/
  schema.prisma          Prisma スキーマ
  seed.ts                初期管理者登録スクリプト
prisma.config.ts         Prisma 設定（datasource.url）
proxy.ts                 ルート保護（Next.js 16 の middleware 後継）
next.config.ts           output: 'standalone' + Prisma/mssql 同梱設定
vitest.config.ts         Vitest 設定（jsdom + パスエイリアス）
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
    db.ts                PrismaClient（MSSQL adapter, Proxy 遅延初期化）
    env.ts               環境変数の起動時検証（zod / fail-fast）
    session.ts           iron-session ヘルパー
    schemas.ts           zod スキーマ集約（Server Action から分離）
    csv.ts               CSV パース/生成
    csv.test.ts          CSV ロジックの単体テスト
    schemas.test.ts      zod スキーマの単体テスト
docs/
  design.md              設計書
  testing.md             テスト・CI 運用ガイド
.github/workflows/
  ci.yml                 PR/非 main push 時の verify ジョブ
  deploy.yml             main push 時のビルド + 承認 + デプロイ
```

## Prisma MSSQL Adapter の注意点

`@prisma/adapter-mssql` は接続文字列の `loginTimeout` / `connectionTimeout` パラメータの値を **ミリ秒として** `mssql` の `connectionTimeout` に渡します（一般的な秒単位ではない）。

例えば `loginTimeout=30` と書くと 30 ミリ秒でタイムアウトしてしまい、`Failed to connect ... in XXms` エラーになります。**省略するか `loginTimeout=30000`（ミリ秒）を指定してください**。

## 注意点（Next.js 16）

- ミドルウェアは `proxy.ts` にリネーム（Node.js ランタイム限定）
- `cookies()`, `headers()`, `params`, `searchParams` は全て `await` 必須
- Turbopack がデフォルト。`next build` も Turbopack で実行される
- `src/lib/env.ts` が起動時に `process.env` を zod で検証し、不足や `SESSION_SECRET` の 32 文字未満などで `process.exit(1)` する（fail-fast）。`next build` 中（`NEXT_PHASE=phase-production-build`）はダミー値で検証をスキップするため、CI runner に環境変数が無くてもビルドは通る。詳細は [docs/design.md §7.5](docs/design.md)
