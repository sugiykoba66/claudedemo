// zod スキーマの単体テスト。
// Server Action から切り出した schemas.ts を直接検証する。

import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  SurveyInputSchema,
  AnswerInputSchema,
  SubmitSchema,
} from './schemas';

describe('LoginSchema', () => {
  it('ID とパスワードがあれば成功する', () => {
    const r = LoginSchema.safeParse({ loginId: 'admin', password: 'p' });
    expect(r.success).toBe(true);
  });

  it('loginId が空文字なら失敗する', () => {
    const r = LoginSchema.safeParse({ loginId: '', password: 'p' });
    expect(r.success).toBe(false);
  });

  it('loginId が空白のみなら trim 後に失敗する', () => {
    const r = LoginSchema.safeParse({ loginId: '   ', password: 'p' });
    expect(r.success).toBe(false);
  });

  it('password が空文字なら失敗する', () => {
    const r = LoginSchema.safeParse({ loginId: 'admin', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('SurveyInputSchema', () => {
  const validQuestion = {
    type: 'single' as const,
    text: '好きな色は？',
    choices: ['赤', '青'],
  };

  it('タイトルと最低1問あれば成功する', () => {
    const r = SurveyInputSchema.safeParse({
      title: 'アンケート',
      questions: [validQuestion],
    });
    expect(r.success).toBe(true);
  });

  it('質問数 0 なら失敗する', () => {
    const r = SurveyInputSchema.safeParse({
      title: 'アンケート',
      questions: [],
    });
    expect(r.success).toBe(false);
  });

  it('未知の type なら失敗する', () => {
    const r = SurveyInputSchema.safeParse({
      title: 'アンケート',
      questions: [{ ...validQuestion, type: 'unknown' }],
    });
    expect(r.success).toBe(false);
  });

  it('タイトル 200 文字超は失敗する', () => {
    const r = SurveyInputSchema.safeParse({
      title: 'a'.repeat(201),
      questions: [validQuestion],
    });
    expect(r.success).toBe(false);
  });

  it('description は省略できる', () => {
    const r = SurveyInputSchema.safeParse({
      title: 'a',
      questions: [validQuestion],
    });
    expect(r.success).toBe(true);
  });
});

describe('AnswerInputSchema', () => {
  // UUID v4 形式（13 文字目=4、17 文字目は 8/9/a/b）
  const uuid = '11111111-1111-4111-8111-111111111111';

  it('questionId が UUID なら成功する', () => {
    const r = AnswerInputSchema.safeParse({ questionId: uuid });
    expect(r.success).toBe(true);
  });

  it('questionId が UUID 形式でなければ失敗する', () => {
    const r = AnswerInputSchema.safeParse({ questionId: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('choiceIds 内に UUID 以外が混じっていれば失敗する', () => {
    const r = AnswerInputSchema.safeParse({
      questionId: uuid,
      choiceIds: ['not-a-uuid'],
    });
    expect(r.success).toBe(false);
  });

  it('text が 2000 文字超なら失敗する', () => {
    const r = AnswerInputSchema.safeParse({
      questionId: uuid,
      text: 'a'.repeat(2001),
    });
    expect(r.success).toBe(false);
  });
});

describe('SubmitSchema', () => {
  // UUID v4 形式（13 文字目=4、17 文字目は 8/9/a/b）
  const uuid = '11111111-1111-4111-8111-111111111111';

  it('surveyId と answers 配列があれば成功する', () => {
    const r = SubmitSchema.safeParse({
      surveyId: uuid,
      answers: [{ questionId: uuid }],
    });
    expect(r.success).toBe(true);
  });

  it('answers が配列でなければ失敗する', () => {
    const r = SubmitSchema.safeParse({
      surveyId: uuid,
      answers: 'not-an-array',
    });
    expect(r.success).toBe(false);
  });

  it('surveyId が UUID 形式でなければ失敗する', () => {
    const r = SubmitSchema.safeParse({
      surveyId: 'invalid',
      answers: [],
    });
    expect(r.success).toBe(false);
  });
});
