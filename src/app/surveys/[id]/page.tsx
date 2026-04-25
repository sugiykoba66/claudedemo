// アンケート回答ページ（/surveys/[id]）。
// 既に回答済みなら一覧へ戻し、未回答なら回答フォームを表示する。

import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { SurveyForm } from './survey-form';

export default async function SurveyRespondPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  // 自分の回答が既に存在するかを複合一意キーで検索
  const existing = await prisma.response.findUnique({
    where: { surveyId_userId: { surveyId: id, userId: session.userId } },
  });
  if (existing) redirect('/surveys');

  // アンケート + 質問 + 選択肢 を順序付きで取得
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { choices: { orderBy: { order: 'asc' } } },
      },
    },
  });
  if (!survey) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        {survey.description && (
          <p className="text-sm text-zinc-800 mt-1 whitespace-pre-wrap">{survey.description}</p>
        )}
      </div>
      {/* クライアント側に渡す質問データを最小限に整形（Prisma 由来の余計な属性を落とす） */}
      <SurveyForm
        surveyId={survey.id}
        questions={survey.questions.map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
        }))}
      />
    </div>
  );
}
