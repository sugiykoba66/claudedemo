'use client';

import { useActionState } from 'react';
import { importUsersFromCsv, type ImportResult } from './actions';

export function UserImportForm() {
  const [state, action, pending] = useActionState<ImportResult | undefined, FormData>(
    importUsersFromCsv,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="block text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? '登録中…' : 'CSV登録'}
      </button>
      {state && state.ok && (
        <div className="text-sm space-y-1 mt-3">
          <p className="text-green-700">
            登録 {state.created} 件 / スキップ {state.skipped} 件
          </p>
          {state.messages.length > 0 && (
            <ul className="text-amber-700 list-disc pl-5">
              {state.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state && !state.ok && <p className="text-red-600 text-sm">{state.message}</p>}
    </form>
  );
}
