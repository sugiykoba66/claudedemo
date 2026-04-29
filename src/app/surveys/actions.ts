// アンケート回答送信用の Server Action。
// 二重回答防止・必須チェック・選択肢妥当性検証を行う。

'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
// スキーマは src/lib/schemas.ts に集約（テスト容易化のため Server Action から分離）
import { SubmitSchema } from '@/lib/schemas';

// 失敗時のみ状態を持ち、成功時は redirect で離脱するため undefined になる
export type SubmitState =
  | { ok: false; message: string }
  | undefined;

export async function submitResponse(
  _state: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const session = await requireUser();

  // hidden input から JSON ペイロードを受け取る方式
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

  // アンケート本体と質問・選択肢を取得（妥当性検証用）
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { include: { choices: true } },
    },
  });
  if (!survey) return { ok: false, message: 'アンケートが見つかりません' };

  // 既に回答済みかどうかを @@unique([surveyId, userId]) のキーで一意検索
  const existing = await prisma.response.findUnique({
    where: { surveyId_userId: { surveyId, userId: session.userId } },
  });
  if (existing) return { ok: false, message: 'このアンケートには回答済みです' };

  // DB 挿入用の Answer データ配列。optional プロパティの型を明示
  const answerData: {
    questionId: string;
    choiceId?: string;
    text?: string | null;
    date?: Date | null;
  }[] = [];

  // すべての質問について、対応する回答が妥当かをチェックしながらデータ整形
  for (const q of survey.questions) {
    // find: 条件を満たす最初の要素を返す（無ければ undefined）
    const a = answers.find((x) => x.questionId === q.id);
    if (!a) return { ok: false, message: `未回答の質問があります: ${q.text}` };

    if (q.type === 'single') {
      const choiceId = a.choiceIds?.[0];
      if (!choiceId) return { ok: false, message: `未回答: ${q.text}` };
      // 不正な choiceId（他の質問の選択肢を送ってきた等）を弾く
      if (!q.choices.some((c) => c.id === choiceId)) {
        return { ok: false, message: `不正な選択肢: ${q.text}` };
      }
      answerData.push({ questionId: q.id, choiceId });
    } else if (q.type === 'multi') {
      // ?? [] で undefined を空配列に正規化
      const ids = a.choiceIds ?? [];
      if (ids.length === 0) return { ok: false, message: `未回答: ${q.text}` };
      for (const cid of ids) {
        if (!q.choices.some((c) => c.id === cid)) {
          return { ok: false, message: `不正な選択肢: ${q.text}` };
        }
        // 1つの Multi 回答 = 選んだ選択肢の数だけ Answer レコード
        answerData.push({ questionId: q.id, choiceId: cid });
      }
    } else if (q.type === 'text') {
      const text = a.text?.trim() ?? '';
      if (!text) return { ok: false, message: `未回答: ${q.text}` };
      answerData.push({ questionId: q.id, text });
    } else if (q.type === 'date') {
      if (!a.date) return { ok: false, message: `未回答: ${q.text}` };
      // 文字列を Date オブジェクトに変換。NaN チェックで無効な日付を弾く
      const d = new Date(a.date);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, message: `日付形式が不正です: ${q.text}` };
      }
      answerData.push({ questionId: q.id, date: d });
    }
  }

  // Response と紐づく Answer 群を nested write で1度に作成
  await prisma.response.create({
    data: {
      surveyId,
      userId: session.userId,
      answers: { create: answerData },
    },
  });

  // 成功表示用に ?submitted=1 付きで一覧へ戻す（クエリは現状未使用、将来の通知用）
  redirect('/surveys?submitted=1');
}
