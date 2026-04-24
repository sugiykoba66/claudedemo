'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

const QuestionInputSchema = z.object({
  type: z.enum(['single', 'multi', 'text', 'date']),
  text: z.string().trim().min(1).max(500),
  choices: z.array(z.string().trim().min(1).max(500)).optional(),
});

const SurveyInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  questions: z.array(QuestionInputSchema).min(1),
});

export type CreateSurveyState =
  | { ok: true; surveyId: string }
  | { ok: false; message: string }
  | undefined;

export async function createSurvey(
  _state: CreateSurveyState,
  formData: FormData,
): Promise<CreateSurveyState> {
  const session = await requireAdmin();

  const raw = formData.get('payload');
  if (typeof raw !== 'string') {
    return { ok: false, message: '入力データが不正です' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'JSON の解析に失敗しました' };
  }

  const validated = SurveyInputSchema.safeParse(parsedJson);
  if (!validated.success) {
    return { ok: false, message: '入力内容に不備があります。必須項目・文字数を確認してください。' };
  }

  const { title, description, questions } = validated.data;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === 'single' || q.type === 'multi') {
      if (!q.choices || q.choices.length < 2) {
        return { ok: false, message: `質問${i + 1}: 選択肢を2件以上登録してください` };
      }
    }
  }

  const survey = await prisma.survey.create({
    data: {
      title,
      description: description || null,
      createdBy: session.userId,
      questions: {
        create: questions.map((q, qi) => ({
          order: qi,
          type: q.type,
          text: q.text,
          choices:
            q.type === 'single' || q.type === 'multi'
              ? { create: (q.choices ?? []).map((c, ci) => ({ order: ci, text: c })) }
              : undefined,
        })),
      },
    },
  });

  revalidatePath('/admin');
  redirect(`/admin/surveys/${survey.id}`);
}

export async function deleteSurvey(surveyId: string) {
  await requireAdmin();
  await prisma.survey.delete({ where: { id: surveyId } });
  revalidatePath('/admin');
  redirect('/admin');
}
