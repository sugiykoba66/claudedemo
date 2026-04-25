// vitest 設定。
// テストランナーの環境設定とパスエイリアスを定義する。

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // tsconfig の paths と一致させる: @/* → src/*
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // jsdom: ブラウザ DOM を模した環境（React コンポーネント検証等で必要になったときのため）
    environment: 'jsdom',
    // テストファイルのパターン。__tests__/ 直下と *.test.ts(x) を拾う
    include: ['src/**/*.test.{ts,tsx}'],
    // テストごとにグローバル変数（describe/it/expect）を使えるようにする
    globals: true,
  },
});
