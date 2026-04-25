// ログインフォームのクライアントコンポーネント。
// 'use client' を冒頭に書くと、このファイルはクライアント側（ブラウザ）で動作する。
// useState / useActionState などの React フックはクライアントコンポーネントでのみ使える。

'use client';

// useActionState: Server Action の実行状態（state, action, pending）を管理するフック (React 19 で導入)
import { useActionState } from 'react';
import { login, type LoginState } from '@/app/actions/auth';

export function LoginForm() {
  // ジェネリクス <LoginState, FormData> は「state の型」と「action 引数の型」。
  // 戻り値は [現在の state, action 関数, 送信中フラグ] のタプル
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    // form の action に Server Action を渡すと、送信時に自動で呼び出される
    <form action={action} className="space-y-4">
      <div>
        {/* htmlFor で対応する input の id を指定（クリックでフォーカス移動・スクリーンリーダー対応） */}
        <label htmlFor="loginId" className="block text-sm font-medium mb-1">
          ユーザーID
        </label>
        <input
          id="loginId"
          name="loginId"
          type="text"
          // ブラウザの自動入力候補を「ユーザー名」として提示
          autoComplete="username"
          className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* state?.errors?.loginId の ? は optional chaining。state が undefined なら全体が undefined */}
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
      {/* 全体エラー（認証失敗時など） */}
      {state?.message && (
        <p className="text-red-600 text-sm">{state.message}</p>
      )}
      <button
        type="submit"
        // pending = action 実行中なら true。二重送信防止
        disabled={pending}
        className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  );
}
