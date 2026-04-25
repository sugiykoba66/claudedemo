// /admin 配下に共通で適用されるレイアウト。
// 子ページの上にヘッダーを表示し、管理者権限のチェックも担う。

import { requireAdmin } from '@/lib/session';
import { Header } from '@/components/header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 管理者でなければここで自動的にリダイレクト → 以降のコードは実行されない
  const session = await requireAdmin();
  return (
    // フラグメント <>...</> は余計な DOM を増やさず複数要素をまとめる構文
    <>
      <Header session={session} />
      {/* flex-1 で残りの高さを埋める。max-w-5xl で読みやすい幅に制限 */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">{children}</main>
    </>
  );
}
