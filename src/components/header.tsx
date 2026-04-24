import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import type { SessionData } from '@/lib/session';

export function Header({ session }: { session: SessionData }) {
  const isAdmin = session.role === 'admin';
  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={isAdmin ? '/admin' : '/surveys'} className="font-semibold">
            アンケート集計システム
          </Link>
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
          <span className="text-zinc-800">
            {session.name}（{isAdmin ? '管理者' : '回答者'}）
          </span>
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
