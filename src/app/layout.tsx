import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'アンケート集計システム',
  description: 'アンケート作成・回答・集計システム',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 text-black">
        {children}
      </body>
    </html>
  );
}
