// アンケートの作成・削除を行う Server Action 群。

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

// 質問1件分の入力検証スキーマ
const QuestionInputSchema = z.object({
  // ユニオン型: この4種類のどれか以外は弾く
  type: z.enum(['single', 'multi', 'text', 'date']),
  text: z.string().trim().min(1).max(500),
  // 単一/複数選択のときだけ choices が必要なので optional にしておき、後段で個別チェック
  choices: z.array(z.string().trim().min(1).max(500)).optional(),
});

// アンケート全体の入力検証スキーマ
const SurveyInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  // 質問は最低1問必要
  questions: z.array(QuestionInputSchema).min(1),
});

// Server Action から返す状態の型
export type CreateSurveyState =
  | { ok: true; surveyId: string }
  | { ok: false; message: string }
  | undefined;

export async function createSurvey(
  _state: CreateSurveyState,
  formData: FormData,
): Promise<CreateSurveyState> {
  const session = await requireAdmin();

  // フォームから "payload" という名前で JSON 文字列を受け取る（クライアント側で組み立てて渡す方式）
  const raw = formData.get('payload');
  // typeof で原始型のチェック。文字列でなければ不正
  if (typeof raw !== 'string') {
    return { ok: false, message: '入力データが不正です' };
  }

  // unknown 型: 「何が入っているか不明」を表す型。安全に扱うには絞り込みが必要
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    // catch の引数は型安全のため省略（`catch {}` 構文）
    return { ok: false, message: 'JSON の解析に失敗しました' };
  }

  // zod で型と値の両方を検証。validated.data には型推論された値が入る
  const validated = SurveyInputSchema.safeParse(parsedJson);
  if (!validated.success) {
    return { ok: false, message: '入力内容に不備があります。必須項目・文字数を確認してください。' };
  }

  const { title, description, questions } = validated.data;

  // 選択肢系の質問は「選択肢が2つ以上」あることを zod 後の追加バリデーションで確認
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === 'single' || q.type === 'multi') {
      if (!q.choices || q.choices.length < 2) {
        return { ok: false, message: `質問${i + 1}: 選択肢を2件以上登録してください` };
      }
    }
  }

  // Prisma の nested write: Survey と関連する Question/Choice を1回の create でまとめて作成
  const survey = await prisma.survey.create({
    data: {
      title,
      // 空文字は null に正規化（DB に意味のない空文字を入れない）
      description: description || null,
      createdBy: session.userId,
      questions: {
        // map の第2引数は index。順序を保持するため order に格納
        create: questions.map((q, qi) => ({
          order: qi,
          type: q.type,
          text: q.text,
          // 選択肢系のときだけ choices をネストして create、それ以外は undefined（生成しない）
          choices:
            q.type === 'single' || q.type === 'multi'
              ? { create: (q.choices ?? []).map((c, ci) => ({ order: ci, text: c })) }
              : undefined,
        })),
      },
    },
  });

  // 一覧画面のキャッシュ無効化
  revalidatePath('/admin');
  // 作成したアンケートの詳細ページへ遷移
  redirect(`/admin/surveys/${survey.id}`);
}

// アンケート削除 Server Action
export async function deleteSurvey(surveyId: string) {
  await requireAdmin();
  // schema 側で onDelete: Cascade のため、Question/Choice/Response/Answer も連鎖削除される
  await prisma.survey.delete({ where: { id: surveyId } });
  revalidatePath('/admin');
  redirect('/admin');
}
