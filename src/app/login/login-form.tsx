'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="loginId" className="block text-sm font-medium mb-1">
          ユーザーID
        </label>
        <input
          id="loginId"
          name="loginId"
          type="text"
          autoComplete="username"
          className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state?.errors?.loginId && (
          <p className="text-red-600 text-xs mt-1">{state.errors.loginId[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state?.errors?.password && (
          <p className="text-red-600 text-xs mt-1">{state.errors.password[0]}</p>
        )}
      </div>
      {state?.message && (
        <p className="text-red-600 text-sm">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  );
}
