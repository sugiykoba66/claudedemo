// /login ルートのページコンポーネント（Server Component）。
// クライアント側で動く必要がある UI（フォーム）は LoginForm に切り出している。

import { LoginForm } from './login-form';

// Next.js のページは「default export された関数コンポーネント」が必須
export default function LoginPage() {
  return (
    // <main> はページの主要コンテンツ領域を表すセマンティック要素
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <h1 className="text-xl font-semibold mb-6 text-center">アンケート集計システム</h1>
        {/* クライアント側でステート/イベントを扱う部分はここから */}
        <LoginForm />
      </div>
    </main>
  );
}
