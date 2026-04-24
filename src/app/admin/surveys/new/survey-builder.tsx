'use client';

import { useActionState, useState } from 'react';
import { createSurvey, type CreateSurveyState } from '../actions';

type QuestionType = 'single' | 'multi' | 'text' | 'date';

type DraftQuestion = {
  type: QuestionType;
  text: string;
  choices: string[];
};

function emptyQuestion(): DraftQuestion {
  return { type: 'single', text: '', choices: ['', ''] };
}

export function SurveyBuilder() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [state, action, pending] = useActionState<CreateSurveyState, FormData>(
    createSurvey,
    undefined,
  );

  function updateQuestion(index: number, next: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...next } : q)));
  }

  function updateChoice(qIndex: number, cIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.map((c, j) => (j === cIndex ? value : c)) } : q,
      ),
    );
  }

  function addChoice(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, choices: [...q.choices, ''] } : q)),
    );
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.filter((_, j) => j !== cIndex) } : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const payload = JSON.stringify({
    title: title.trim(),
    description: description.trim(),
    questions: questions.map((q) => ({
      type: q.type,
      text: q.text.trim(),
      choices:
        q.type === 'single' || q.type === 'multi'
          ? q.choices.map((c) => c.trim()).filter((c) => c.length > 0)
          : undefined,
    })),
  });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">説明（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">質問 {qi + 1}</h3>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => moveQuestion(qi, -1)}
                className="text-zinc-800 hover:text-zinc-900"
              >
                上へ
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(qi, 1)}
                className="text-zinc-800 hover:text-zinc-900"
              >
                下へ
              </button>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="text-red-600 hover:text-red-800"
                >
                  削除
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">質問文</label>
            <input
              type="text"
              value={q.text}
              onChange={(e) => updateQuestion(qi, { text: e.target.value })}
              required
              maxLength={500}
              className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">回答タイプ</label>
            <select
              value={q.type}
              onChange={(e) => updateQuestion(qi, { type: e.target.value as QuestionType })}
              className="border border-zinc-300 rounded px-3 py-2 text-sm"
            >
              <option value="single">単一選択</option>
              <option value="multi">複数選択</option>
              <option value="text">自由記述</option>
              <option value="date">日付</option>
            </select>
          </div>

          {(q.type === 'single' || q.type === 'multi') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">選択肢</label>
              {q.choices.map((c, ci) => (
                <div key={ci} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateChoice(qi, ci, e.target.value)}
                    maxLength={500}
                    className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm"
                  />
                  {q.choices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChoice(qi, ci)}
                      className="text-red-600 text-xs"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(qi)}
                className="text-sm text-blue-600 hover:underline"
              >
                ＋ 選択肢を追加
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addQuestion}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded px-4 py-2 text-sm"
        >
          ＋ 質問を追加
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 text-white rounded px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? '保存中…' : 'アンケートを保存'}
        </button>
      </div>

      {state && !state.ok && <p className="text-red-600 text-sm">{state.message}</p>}
    </form>
  );
}
