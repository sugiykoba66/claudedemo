// /surveys 配下に共通で適用される回答者向けレイアウト。
// 管理者向けより少し狭い max-w-3xl を採用（読みやすさ優先）。

import { requireUser } from '@/lib/session';
import { Header } from '@/components/header';

export default async function SurveysLayout({ children }: { children: React.ReactNode }) {
  // ログイン必須。未ログインなら /login へ自動リダイレクト
  const session = await requireUser();
  return (
    <>
      <Header session={session} />
      <main className="flex-1 max-w-3xl w-full mx-auto p-6">{children}</main>
    </>
  );
}
