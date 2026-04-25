// 初期管理者アカウントを投入する seed スクリプト。
// `npx prisma db seed` で実行される（package.json の prisma.seed 設定を参照）。

import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import bcrypt from 'bcrypt';
// dotenv/config: .env を自動で読み込んで process.env に展開する
import 'dotenv/config';

// seed は tsx で単発実行されるスクリプト。Next.js のサーバーコンテキスト外なので
// src/lib/env.ts は使わず、必要な環境変数だけここで個別検証する。
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL が設定されていません');
}
const adapter = new PrismaMssql(url);
const prisma = new PrismaClient({ adapter });
//const prisma = new PrismaClient();

// メイン処理（即時実行はせず、最後に呼び出す）
async function main() {
  // 環境変数で上書き可能。loginId と name は未設定なら既定値を使用
  const loginId = process.env.ADMIN_LOGIN_ID ?? 'admin';
  const name = process.env.ADMIN_NAME ?? '管理者';

  // ADMIN_PASSWORD は明示的に必須化。'changeme' 等のデフォルトを通すと
  // 本番で初期パスワードのまま運用される事故につながるため。
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length === 0) {
    throw new Error(
      'ADMIN_PASSWORD が設定されていません。.env または App Service の環境変数で必ず指定してください。',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // upsert: 「あれば更新、無ければ作成」を1ステートメントで実行
  // 既存 admin の上書きを避けるため update は空オブジェクト（何もしない）
  const admin = await prisma.user.upsert({
    where: { loginId },
    update: {},
    create: {
      loginId,
      passwordHash,
      name,
      role: 'admin',
    },
  });

  console.log(`初期管理者を登録しました: loginId=${admin.loginId}, name=${admin.name}`);
}

// Promise チェーンによる後処理
main()
  .catch((e) => {
    // エラーログを出してから非ゼロで終了 → CI などが失敗を検知できる
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // 成功・失敗に関わらず DB 接続を閉じる
    await prisma.$disconnect();
  });
