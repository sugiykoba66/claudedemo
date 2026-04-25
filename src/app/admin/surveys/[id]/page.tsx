// アンケート詳細ページ（/admin/surveys/[id]）。
// ファイル名の [id] は動的セグメント。URL の該当部分が params.id に入る。

// notFound: 404 ページを返す Next.js 提供のヘルパ
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { DeleteSurveyButton } from './delete-button';

// Record<K,V> = キーが K 型・値が V 型のオブジェクトを表す。
// 質問タイプ → 表示用ラベルの対応表
const typeLabel: Record<string, string> = {
  single: '単一選択',
  multi: '複数選択',
  text: '自由記述',
  date: '日付',
};

// Next.js 16 では params が Promise になっている点に注意（要 await）
export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // include で関連データもまとめて取得。質問・選択肢は order 昇順でソート
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { choices: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { responses: true } },
      creator: { select: { name: true } },
    },
  });

  // 該当 ID が存在しなければ 404
  if (!survey) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{survey.title}</h1>
          {survey.description && (
            // whitespace-pre-wrap で改行をそのまま表示
            <p className="text-sm text-zinc-800 mt-1 whitespace-pre-wrap">{survey.description}</p>
          )}
          <p className="text-xs text-zinc-800 mt-2">
            作成者: {survey.creator.name} ／ 作成日:{' '}
            {survey.createdAt.toISOString().slice(0, 10)} ／ 回答数: {survey._count.responses}
          </p>
        </div>
        <div className="flex gap-2">
          {/* CSV ダウンロード（route handler が CSV を返す）。Next.js のクライアント遷移を避けるため <a> を使用 */}
          <a
            href={`/admin/surveys/${survey.id}/download`}
            className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700"
          >
            CSVダウンロード
          </a>
          {/* 削除は確認ダイアログが必要なのでクライアントコンポーネント */}
          <DeleteSurveyButton surveyId={survey.id} title={survey.title} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <h2 className="font-semibold">質問一覧</h2>
        {survey.questions.map((q, qi) => (
          <div key={q.id} className="border-l-4 border-blue-500 pl-4">
            <p className="text-xs text-zinc-800">
              {/* typeLabel に未知のタイプがあった場合は q.type をそのまま表示 */}
              質問 {qi + 1}・{typeLabel[q.type] ?? q.type}
            </p>
            <p className="text-sm font-medium">{q.text}</p>
            {(q.type === 'single' || q.type === 'multi') && (
              <ul className="list-disc pl-5 mt-1 text-sm text-zinc-700">
                {q.choices.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
