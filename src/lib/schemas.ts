// アプリケーション全体で使う zod スキーマの集約。
// Server Action から切り出すことで、DB や next/* に依存せずに単体テスト可能になる。

import { z } from 'zod';

// ログインフォームの入力検証スキーマ
export const LoginSchema = z.object({
  loginId: z.string().trim().min(1, { message: 'ユーザーIDを入力してください' }),
  password: z.string().min(1, { message: 'パスワードを入力してください' }),
});

// アンケート1問分の入力検証スキーマ
export const QuestionInputSchema = z.object({
  type: z.enum(['single', 'multi', 'text', 'date']),
  text: z.string().trim().min(1).max(500),
  // 単一/複数選択のときだけ choices が必要なので optional にしておき、後段で個別チェック
  choices: z.array(z.string().trim().min(1).max(500)).optional(),
});

// アンケート全体の入力検証スキーマ
export const SurveyInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  questions: z.array(QuestionInputSchema).min(1),
});

// 回答1問分の入力検証スキーマ
export const AnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  choiceIds: z.array(z.string().uuid()).optional(),
  text: z.string().trim().max(2000).optional(),
  date: z.string().optional(),
});

// 回答送信全体の入力検証スキーマ
export const SubmitSchema = z.object({
  surveyId: z.string().uuid(),
  answers: z.array(AnswerInputSchema),
});
