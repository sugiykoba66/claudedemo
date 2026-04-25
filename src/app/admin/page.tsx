// 管理者トップ（/admin）: アンケート一覧と「新規作成」ボタンを表示する。

import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function AdminDashboard() {
  // Prisma の findMany は配列を返す。include で関連データも一緒に取得。
  // _count.select で「件数だけ」効率よく取れる（実際の Question/Response 行は取らない）
  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true, questions: true } },
      // 作成者の名前だけ取得（select で必要な列のみに絞る）
      creator: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">アンケート一覧</h1>
        <Link
          href="/admin/surveys/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          新規アンケート作成
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* 三項演算子で「0 件のとき」と「ある場合のテーブル」を出し分け */}
        {surveys.length === 0 ? (
          <p className="p-6 text-sm text-zinc-800">アンケートがまだ登録されていません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-800 border-b border-zinc-200">
                <th className="py-2 px-4">タイトル</th>
                <th className="py-2 px-4">作成者</th>
                <th className="py-2 px-4">質問数</th>
                <th className="py-2 px-4">回答数</th>
                <th className="py-2 px-4">作成日</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {/* 配列の map でリスト要素を生成。key には一意な ID を渡す（React の差分更新最適化用） */}
              {surveys.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100">
                  <td className="py-2 px-4">
                    {/* テンプレートリテラル ` ` 内で ${} を使うと変数を埋め込める */}
                    <Link
                      href={`/admin/surveys/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.title}
                    </Link>
                  </td>
                  <td className="py-2 px-4">{s.creator.name}</td>
                  <td className="py-2 px-4">{s._count.questions}</td>
                  <td className="py-2 px-4">{s._count.responses}</td>
                  {/* Date を YYYY-MM-DD に整形（ISO 文字列の先頭10文字を切り出し） */}
                  <td className="py-2 px-4">{s.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      href={`/admin/surveys/${s.id}`}
                      className="text-xs text-zinc-800 hover:text-zinc-900 underline"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
