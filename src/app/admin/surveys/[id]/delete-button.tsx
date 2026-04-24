'use client';

import { useTransition } from 'react';
import { deleteSurvey } from '../actions';

export function DeleteSurveyButton({ surveyId, title }: { surveyId: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`アンケート "${title}" を削除しますか？\n回答も合わせて削除されます。`)) {
          start(() => deleteSurvey(surveyId));
        }
      }}
      className="bg-red-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60"
    >
      削除
    </button>
  );
}
