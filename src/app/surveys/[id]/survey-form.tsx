'use client';

import { useActionState, useState } from 'react';
import { submitResponse, type SubmitState } from '../actions';

type Question = {
  id: string;
  type: string;
  text: string;
  choices: { id: string; text: string }[];
};

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
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(
      questions.map((q) => [q.id, { choiceIds: [], text: '', date: '' }]),
    ),
  );
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitResponse,
    undefined,
  );

  function update(qId: string, next: Partial<AnswerState>) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...next } }));
  }

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

            {q.type === 'single' && (
              <div className="space-y-2">
                {q.choices.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={a.choiceIds[0] === c.id}
                      onChange={() => update(q.id, { choiceIds: [c.id] })}
                    />
                    <span>{c.text}</span>
                  </label>
                ))}
              </div>
            )}

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

            {q.type === 'text' && (
              <textarea
                value={a.text}
                onChange={(e) => update(q.id, { text: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
              />
            )}

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
