// セッション管理ユーティリティ。
// iron-session を使い、暗号化された Cookie にユーザー情報を保存する。
// "サーバー側でのみ" 動かす想定なので 'server-only' を最初に import する。

// このモジュールがクライアント側のバンドルに混入したらビルド時にエラーにする
import 'server-only';
// Next.js が提供する Cookie 操作 API（サーバー側で動く）
import { cookies } from 'next/headers';
// iron-session: 暗号化 Cookie によるセッション実装。型 SessionOptions も import
import { getIronSession, type SessionOptions } from 'iron-session';
// サーバー側でのリダイレクト用 API。実行するとそこから先のコードは走らない
import { redirect } from 'next/navigation';
// 起動時に検証済みの環境変数（未設定や 32 文字未満の SESSION_SECRET なら起動しない）
import { env } from './env';

// セッション Cookie に格納するデータの型
// すべて optional（?）にしているのは、ログイン前は空のセッションが返るため
export type SessionData = {
  userId?: string;
  loginId?: string;
  name?: string;
  // ユニオン型: 'admin' か 'user' のどちらかしか取らない
  role?: 'admin' | 'user';
};

// iron-session の設定。
// export して proxy.ts などからも参照できるようにする
export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: 'survey_session',
  cookieOptions: {
    // JS から Cookie にアクセスできなくする（XSS 対策）
    httpOnly: true,
    // 本番環境のみ HTTPS でしか送らない
    secure: env.NODE_ENV === 'production',
    // 別サイトからの遷移時はクロスサイト Cookie を送らない（CSRF 軽減）
    sameSite: 'lax',
    path: '/',
    // 有効期間: 60 秒 × 60 分 × 8 = 8 時間
    maxAge: 60 * 60 * 8,
  },
};

// 現在のセッションを取得するヘルパ。ログイン状態の確認や保存に使う
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// ログイン必須ページの先頭で呼ぶ。未ログインなら /login へ自動リダイレクト
export async function requireUser() {
  const session = await getSession();
  if (!session.userId) {
    redirect('/login');
  }
  // 戻り値の型: userId/loginId/name/role が必ず存在することを TypeScript に伝える
  // Required<Pick<...>> = SessionData の一部のキーを必須化したオブジェクト型
  return session as Required<Pick<SessionData, 'userId' | 'loginId' | 'name' | 'role'>> & SessionData;
}

// 管理者専用ページの先頭で呼ぶ。一般ユーザーは /surveys に流す
export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== 'admin') {
    redirect('/surveys');
  }
  return session;
}
