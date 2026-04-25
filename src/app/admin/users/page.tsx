// 管理者向け: ユーザー一覧 & CSV インポート画面（/admin/users）。

import { prisma } from '@/lib/db';
import { UserImportForm } from './import-form';
import { DeleteUserButton } from './delete-button';

export default async function UsersPage() {
  // ロール昇順 → ログインID昇順で並べる。select で必要なカラムだけ取得（パスワードハッシュは取らない）
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { loginId: 'asc' }],
    select: { id: true, loginId: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-8">
      {/* セクション1: CSV 取り込みフォーム */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">ユーザーCSV登録</h2>
        <p className="text-sm text-zinc-800 mb-4">
          1行目はヘッダ <code>loginId,name,password,role</code>（role は省略可、未指定は user）。
          パスワードは登録時にハッシュ化されます。
        </p>
        <UserImportForm />
      </section>

      {/* セクション2: 登録済みユーザーの一覧テーブル */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">登録済みユーザー（{users.length}件）</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-800 border-b border-zinc-200">
              <th className="py-2">ユーザーID</th>
              <th className="py-2">氏名</th>
              <th className="py-2">権限</th>
              <th className="py-2">登録日</th>
              <th className="py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100">
                <td className="py-2">{u.loginId}</td>
                <td className="py-2">{u.name}</td>
                <td className="py-2">{u.role === 'admin' ? '管理者' : '回答者'}</td>
                <td className="py-2">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className="py-2 text-right">
                  {/* 削除ボタンは確認ダイアログを出すためクライアントコンポーネント */}
                  <DeleteUserButton userId={u.id} loginId={u.loginId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
