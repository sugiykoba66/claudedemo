import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { DeleteSurveyButton } from './delete-button';

const typeLabel: Record<string, string> = {
  single: '単一選択',
  multi: '複数選択',
  text: '自由記述',
  date: '日付',
};

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (!survey) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{survey.title}</h1>
          {survey.description && (
            <p className="text-sm text-zinc-800 mt-1 whitespace-pre-wrap">{survey.description}</p>
          )}
          <p className="text-xs text-zinc-800 mt-2">
            作成者: {survey.creator.name} ／ 作成日:{' '}
            {survey.createdAt.toISOString().slice(0, 10)} ／ 回答数: {survey._count.responses}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/admin/surveys/${survey.id}/download`}
            className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700"
          >
            CSVダウンロード
          </a>
          <DeleteSurveyButton surveyId={survey.id} title={survey.title} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <h2 className="font-semibold">質問一覧</h2>
        {survey.questions.map((q, qi) => (
          <div key={q.id} className="border-l-4 border-blue-500 pl-4">
            <p className="text-xs text-zinc-800">
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
