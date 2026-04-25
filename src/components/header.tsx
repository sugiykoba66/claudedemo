// 全ページ共通のヘッダーコンポーネント。
// 'use client' を付けていないので Server Component として動作する。
// ただし内部のログアウトボタンは <form action={logout}> によるサーバー実行なので、
// クライアント JS なしでも動く（プログレッシブ・エンハンスメント）。

// next/link: クライアント側ナビゲーションを行うリンクコンポーネント（ページ全体再読み込みなし）
import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import type { SessionData } from '@/lib/session';

// props を分割代入で受け取り、その場で型を定義（インライン型）
export function Header({ session }: { session: SessionData }) {
  const isAdmin = session.role === 'admin';
  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* ロゴクリックでホーム（権限別）へ */}
          <Link href={isAdmin ? '/admin' : '/surveys'} className="font-semibold">
            アンケート集計システム
          </Link>
          {/* JSX の && は「左辺が truthy なら右辺を描画」の慣用表現 */}
          {isAdmin && (
            <nav className="flex gap-4 text-sm text-zinc-800">
              <Link href="/admin" className="hover:text-zinc-900">
                アンケート
              </Link>
              <Link href="/admin/users" className="hover:text-zinc-900">
                ユーザー管理
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* JSX 内では波括弧 {} で式を埋め込む */}
          <span className="text-zinc-800">
            {session.name}（{isAdmin ? '管理者' : '回答者'}）
          </span>
          {/* form の action 属性に Server Action 関数を直接渡せる（Next.js 拡張） */}
          <form action={logout}>
            <button
              type="submit"
              className="text-zinc-800 hover:text-zinc-900 underline"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
