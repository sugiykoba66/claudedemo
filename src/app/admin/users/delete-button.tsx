// 個別ユーザー削除ボタン。確認ダイアログ→Server Action 呼び出しを行う。
// confirm() が必要なのでクライアントコンポーネントとして実装。

'use client';

// useTransition: state 更新やサーバー呼び出しを「中断可能・非ブロッキング」に扱うフック
import { useTransition } from 'react';
import { deleteUser } from './actions';

export function DeleteUserButton({ userId, loginId }: { userId: string; loginId: string }) {
  // pending = 削除処理の進行中フラグ。start に渡したコールバック内が "Transition" として実行される
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        // ブラウザ標準の確認ダイアログ。OK で true、キャンセルで false を返す
        if (confirm(`ユーザー "${loginId}" を削除しますか？`)) {
          // Server Action 呼び出しを Transition でラップ → UI が固まらない
          start(() => deleteUser(userId));
        }
      }}
      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-60"
    >
      削除
    </button>
  );
}
