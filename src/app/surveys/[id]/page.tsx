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

  const existing = await prisma.response.findUnique({
    where: { surveyId_userId: { surveyId: id, userId: session.userId } },
  });
  if (existing) redirect('/surveys');

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
