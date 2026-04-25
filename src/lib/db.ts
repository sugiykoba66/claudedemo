// Prisma クライアントのシングルトン提供モジュール。
// Next.js の dev モードでは HMR (ホットリロード) のたびにモジュールが再評価され、
// クライアントが多重生成されてコネクションが枯渇する問題があるため、
// `globalThis` にキャッシュして使い回す。

import 'server-only';
import { PrismaClient } from '@prisma/client';
// Azure SQL Server 用のドライバアダプタ（@prisma/adapter-mssql）
import { PrismaMssql } from '@prisma/adapter-mssql';

// グローバルスコープに __prisma という変数を生やすための型宣言
// var を使うのは globalThis に値をぶら下げるための慣習（let/const では駄目）
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma クライアントを実際に生成するファクトリ関数
function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL が設定されていません');
  }
  // 接続文字列から SQL Server 用アダプタを構築
  const adapter = new PrismaMssql(url);
  return new PrismaClient({ adapter });
}

// 既にあれば使い回し、無ければ生成する
function getPrisma(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma;
  const instance = createPrisma();
  // 本番では HMR が走らないのでキャッシュ不要。dev/test のみキャッシュ
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = instance;
  }
  return instance;
}

// Proxy パターン: import 時点では PrismaClient を生成せず、
// 最初にプロパティアクセス（例: prisma.user.findMany）された瞬間に初期化する。
// これにより、ビルド時の静的解析中に DB 接続が走らないようにできる。
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  // get トラップ: prisma.xxx にアクセスされたときに呼ばれる
  get(_target, prop, receiver) {
    const client = getPrisma();
    // 実体（client）の同名プロパティを返す
    return Reflect.get(client, prop, receiver);
  },
});
