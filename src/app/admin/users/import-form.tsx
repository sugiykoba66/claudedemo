// CSV ファイル選択 → アップロード → 結果表示 を担うクライアントコンポーネント。

'use client';

import { useActionState } from 'react';
import { importUsersFromCsv, type ImportResult } from './actions';

export function UserImportForm() {
  // useActionState の戻り値は [現在の状態, action 関数, 実行中フラグ] のタプル
  const [state, action, pending] = useActionState<ImportResult | undefined, FormData>(
    importUsersFromCsv,
    undefined, // 初期状態
  );

  return (
    <form action={action} className="space-y-3">
      <input
        name="file"
        type="file"
        // accept で選択できるファイル種別を絞り込む
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

      {/* 成功時: 件数とスキップ理由を表示 */}
      {state && state.ok && (
        <div className="text-sm space-y-1 mt-3">
          <p className="text-green-700">
            登録 {state.created} 件 / スキップ {state.skipped} 件
          </p>
          {state.messages.length > 0 && (
            <ul className="text-amber-700 list-disc pl-5">
              {/* index を key に使うのは一覧の順序が変わらない場合のみ許容 */}
              {state.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* 失敗時: 全体エラーを表示 */}
      {state && !state.ok && <p className="text-red-600 text-sm">{state.message}</p>}
    </form>
  );
}
