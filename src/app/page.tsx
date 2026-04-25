// アプリのトップページ（"/"）。
// このアプリは "/" に専用画面を持たず、ログイン状態に応じて適切な画面へ振り分けるだけ。

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// async を付けると Server Component 内で await を使える
export default async function Home() {
  const session = await getSession();
  // 未ログイン → ログイン画面
  if (!session.userId) redirect('/login');
  // 管理者 → 管理ダッシュボード、それ以外 → 回答者用一覧
  redirect(session.role === 'admin' ? '/admin' : '/surveys');
}
