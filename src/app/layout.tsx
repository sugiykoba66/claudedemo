// ルートレイアウト: アプリ全体の <html>/<body> を出力する Next.js の必須コンポーネント。
// すべてのページがこの中に children として描画される。

// Metadata は HTML の <head> に設定するページメタ情報の型
import type { Metadata } from 'next';
// Tailwind CSS のグローバルスタイル
import './globals.css';

// このオブジェクトを export すると Next.js が <title> や <meta name="description"> を自動生成する
export const metadata: Metadata = {
  title: 'アンケート集計システム',
  description: 'アンケート作成・回答・集計システム',
};

// デフォルトエクスポートのコンポーネントがそのページの本体になる
export default function RootLayout({
  children,
}: Readonly<{
  // React.ReactNode = レンダリング可能なあらゆる値（要素・文字列・null など）
  // Readonly<...> で props の書き換えを禁止
  children: React.ReactNode;
}>) {
  return (
    // lang="ja" でブラウザ・スクリーンリーダー・SEO に日本語を伝える
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 text-black">
        {children}
      </body>
    </html>
  );
}
