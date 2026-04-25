// アンケート回答フォームのクライアントコンポーネント。
// 質問タイプ別に入力 UI を出し分け、ローカルステートで回答を保持する。

'use client';

import { useActionState, useState } from 'react';
import { submitResponse, type SubmitState } from '../actions';

// サーバーから渡される質問データの型
type Question = {
  id: string;
  type: string;
  text: string;
  choices: { id: string; text: string }[];
};

// 入力中の回答状態。3種類すべてのフィールドを持ち、質問タイプに応じて使い分ける
type AnswerState = {
  choiceIds: string[];
  text: string;
  date: string;
};

export function SurveyForm({
  surveyId,
  questions,
}: {
  surveyId: string;
  questions: Question[];
}) {
  // Record<string, AnswerState>: 質問ID → 回答 状態のオブジェクト型。
  // useState の初期値はファクトリ関数で渡す（毎レンダー再生成しないため）。
  // Object.fromEntries: [[key, value], ...] の配列を { key: value } に変換
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(
      questions.map((q) => [q.id, { choiceIds: [], text: '', date: '' }]),
    ),
  );
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitResponse,
    undefined,
  );

  // 特定の質問の回答を部分更新するヘルパ。Partial<AnswerState> で「一部のキーだけ」を受け取れる
  function update(qId: string, next: Partial<AnswerState>) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...next } }));
  }

  // フォーム送信時にサーバーへ渡す JSON ペイロード。
  // 質問順序を保つために questions 配列を基に組み立てる
  const payload = JSON.stringify({
    surveyId,
    answers: questions.map((q) => ({
      questionId: q.id,
      choiceIds: answers[q.id]?.choiceIds,
      text: answers[q.id]?.text,
      date: answers[q.id]?.date,
    })),
  });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="payload" value={payload} />

      {questions.map((q, qi) => {
        const a = answers[q.id];
        return (
          <div key={q.id} className="bg-white rounded-lg shadow p-6 space-y-3">
            <p className="text-sm font-medium">
              Q{qi + 1}. {q.text}
            </p>

            {/* 単一選択: ラジオボタン */}
            {q.type === 'single' && (
              <div className="space-y-2">
                {q.choices.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      // 同じ name のラジオは同じグループとして1つしか選べない
                      name={`q_${q.id}`}
                      // 制御コンポーネント: 状態とビューを React で同期させる
                      checked={a.choiceIds[0] === c.id}
                      onChange={() => update(q.id, { choiceIds: [c.id] })}
                    />
                    <span>{c.text}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 複数選択: チェックボックス */}
            {q.type === 'multi' && (
              <div className="space-y-2">
                {q.choices.map((c) => {
                  const checked = a.choiceIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          // チェック ON → 追加 / OFF → 除去
                          const next = e.target.checked
                            ? [...a.choiceIds, c.id]
                            : a.choiceIds.filter((x) => x !== c.id);
                          update(q.id, { choiceIds: next });
                        }}
                      />
                      <span>{c.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 自由記述: textarea */}
            {q.type === 'text' && (
              <textarea
                value={a.text}
                onChange={(e) => update(q.id, { text: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
              />
            )}

            {/* 日付: ブラウザ標準のデートピッカー */}
            {q.type === 'date' && (
              <input
                type="date"
                value={a.date}
                onChange={(e) => update(q.id, { date: e.target.value })}
                className="border border-zinc-300 rounded px-3 py-2 text-sm"
              />
            )}
          </div>
        );
      })}

      {/* サーバー側エラー（必須未入力など） */}
      {state && !state.ok && <p className="text-red-600 text-sm">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? '送信中…' : '回答を送信'}
      </button>
    </form>
  );
}
