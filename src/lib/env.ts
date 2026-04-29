// 環境変数の起動時検証モジュール。
// このファイルが import されると process.env を zod で検証し、
// 値が不足していれば即座に process.exit(1) でプロセスを終了させる（fail-fast）。
// これにより「本番にデプロイしてからログイン失敗で気づく」状態を防ぐ。

import 'server-only';
import { z } from 'zod';

// 環境変数のスキーマ定義
const EnvSchema = z.object({
  // SQL Server 接続文字列。空文字も弾く
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),

  // iron-session の暗号鍵。32 文字未満ではセッションを暗号化できない
  SESSION_SECRET: z
    .string()
    .min(32, { message: 'SESSION_SECRET must be at least 32 characters' }),

  // Node.js の標準 NODE_ENV。未指定なら 'development' とみなす
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// EnvSchema から型を取り出す（z.infer を使うと TypeScript の型として再利用できる）
type Env = z.infer<typeof EnvSchema>;

// Next.js のビルド時（next build 中）は process.env.NEXT_PHASE が
// 'phase-production-build' になる。このフェーズではページデータ収集のために
// サーバモジュールが評価されるが、実際のリクエストは処理しない。
// CI runner には DATABASE_URL / SESSION_SECRET が無いので、
// ここで厳密チェックすると CI のビルドが必ず落ちてしまう。
// したがってビルド時はチェックをスキップしてダミー値を入れる。
//
// 実行時（standalone 起動時 = node server.js）は NEXT_PHASE が未設定になるため、
// 本番ランタイムの fail-fast はそのまま機能する。
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// ビルド時専用のダミー値。EnvSchema の制約（min(1) や min(32)）を満たす必要がある。
// 実際のリクエスト処理では使われないので接続できなくても問題ない。
const BUILD_PLACEHOLDER: Env = {
  DATABASE_URL: 'sqlserver://build-placeholder',
  // ちょうど 32 文字以上のダミー文字列
  SESSION_SECRET: 'build-placeholder-build-placeholder-build',
  NODE_ENV: 'production',
};

// ビルド時以外は通常通り process.env を検証する
let resolvedEnv: Env;

if (isBuildPhase) {
  resolvedEnv = BUILD_PLACEHOLDER;
} else {
  // 検証実行。失敗時は標準エラーに詳細を出して終了
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    // z.flattenError でフィールドごとのエラーを取り出す
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    console.error('[env] 環境変数の検証に失敗しました:');
    for (const [key, messages] of Object.entries(fieldErrors)) {
      if (messages && messages.length > 0) {
        console.error(`  - ${key}: ${messages.join(', ')}`);
      }
    }
    // dev でも本番でも一律終了。.env / App Service の設定を見直すこと
    process.exit(1);
  }

  resolvedEnv = parsed.data;
}

// 検証済みの環境変数オブジェクト
export const env = resolvedEnv;
