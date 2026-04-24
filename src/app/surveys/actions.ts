'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';

const AnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  choiceIds: z.array(z.string().uuid()).optional(),
  text: z.string().trim().max(2000).optional(),
  date: z.string().optional(),
});

const SubmitSchema = z.object({
  surveyId: z.string().uuid(),
  answers: z.array(AnswerInputSchema),
});

export type SubmitState =
  | { ok: false; message: string }
  | undefined;

export async function submitResponse(
  _state: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const session = await requireUser();

  const raw = formData.get('payload');
  if (typeof raw !== 'string') return { ok: false, message: '入力データが不正です' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'JSON の解析に失敗しました' };
  }

  const validated = SubmitSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, message: '入力内容に不備があります' };
  }

  const { surveyId, answers } = validated.data;

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { include: { choices: true } },
    },
  });
  if (!survey) return { ok: false, message: 'アンケートが見つかりません' };

  const existing = await prisma.response.findUnique({
    where: { surveyId_userId: { surveyId, userId: session.userId } },
  });
  if (existing) return { ok: false, message: 'このアンケートには回答済みです' };

  const answerData: {
    questionId: string;
    choiceId?: string;
    text?: string | null;
    date?: Date | null;
  }[] = [];

  for (const q of survey.questions) {
    const a = answers.find((x) => x.questionId === q.id);
    if (!a) return { ok: false, message: `未回答の質問があります: ${q.text}` };

    if (q.type === 'single') {
      const choiceId = a.choiceIds?.[0];
      if (!choiceId) return { ok: false, message: `未回答: ${q.text}` };
      if (!q.choices.some((c) => c.id === choiceId)) {
        return { ok: false, message: `不正な選択肢: ${q.text}` };
      }
      answerData.push({ questionId: q.id, choiceId });
    } else if (q.type === 'multi') {
      const ids = a.choiceIds ?? [];
      if (ids.length === 0) return { ok: false, message: `未回答: ${q.text}` };
      for (const cid of ids) {
        if (!q.choices.some((c) => c.id === cid)) {
          return { ok: false, message: `不正な選択肢: ${q.text}` };
        }
        answerData.push({ questionId: q.id, choiceId: cid });
      }
    } else if (q.type === 'text') {
      const text = a.text?.trim() ?? '';
      if (!text) return { ok: false, message: `未回答: ${q.text}` };
      answerData.push({ questionId: q.id, text });
    } else if (q.type === 'date') {
      if (!a.date) return { ok: false, message: `未回答: ${q.text}` };
      const d = new Date(a.date);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, message: `日付形式が不正です: ${q.text}` };
      }
      answerData.push({ questionId: q.id, date: d });
    }
  }

  await prisma.response.create({
    data: {
      surveyId,
      userId: session.userId,
      answers: { create: answerData },
    },
  });

  redirect('/surveys?submitted=1');
}
