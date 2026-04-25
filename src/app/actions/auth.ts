// 認証用 Server Actions（ログイン・ログアウト）。
// Server Action = ブラウザのフォームから直接呼び出せるサーバー関数。
// ファイル冒頭の 'use server' でこのファイル内の export 関数すべてが Server Action になる。

'use server';

import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
// zod: ランタイムでデータ構造を検証するライブラリ。同時に TypeScript 型も推論できる
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

// ログインフォームの入力検証スキーマ
const LoginSchema = z.object({
  loginId: z.string().trim().min(1, { message: 'ユーザーIDを入力してください' }),
  password: z.string().min(1, { message: 'パスワードを入力してください' }),
});

// useActionState (クライアント側) と Server Action 間で受け渡しする「状態」の型。
// ユニオン型: 「エラー情報を持つオブジェクト」または「undefined（初期状態）」のどちらか
export type LoginState =
  | {
      // フィールドごとのエラーメッセージ（zod 由来）
      errors?: { loginId?: string[]; password?: string[] };
      // 全体のエラーメッセージ（認証失敗など）
      message?: string;
    }
  | undefined;

// ログイン処理本体。
// 第1引数 _state は前回の状態（今回は使わないので _ プレフィックスで未使用を明示）。
// 第2引数 formData はフォーム送信データ。Promise<LoginState> を返すよう型注釈
export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  // safeParse は throw せずに { success, data, error } を返す安全な版
  const parsed = LoginSchema.safeParse({
    loginId: formData.get('loginId'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    // フィールド単位のエラー一覧を返す
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  // 分割代入で data から loginId と password を取り出し
  const { loginId, password } = parsed.data;

  // ユーザー検索。存在しなくても具体的な原因は見せない（アカウント列挙攻撃対策）
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    return { message: 'ユーザーIDまたはパスワードが正しくありません' };
  }

  // bcrypt.compare はハッシュと平文を比較する非同期関数
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { message: 'ユーザーIDまたはパスワードが正しくありません' };
  }

  // 認証成功 → セッションに最低限の情報を保存
  const session = await getSession();
  session.userId = user.id;
  session.loginId = user.loginId;
  session.name = user.name;
  // role を 'admin' or 'user' のリテラル型に正規化
  session.role = user.role === 'admin' ? 'admin' : 'user';
  await session.save();

  // 権限に応じた初期画面へ遷移。redirect は内部で例外を投げて関数を終了する
  redirect(user.role === 'admin' ? '/admin' : '/surveys');
}

// ログアウト: セッション破棄して /login へ
export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
