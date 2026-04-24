'use client';

import { useTransition } from 'react';
import { deleteUser } from './actions';

export function DeleteUserButton({ userId, loginId }: { userId: string; loginId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`ユーザー "${loginId}" を削除しますか？`)) {
          start(() => deleteUser(userId));
        }
      }}
      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-60"
    >
      削除
    </button>
  );
}
