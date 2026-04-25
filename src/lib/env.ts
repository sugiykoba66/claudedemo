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

// 検証済みの環境変数オブジェクト。as const で値が読み取り専用であることを示す
export const env = parsed.data;
