// Next.js 16 の Proxy（旧 Middleware 相当）。
// すべてのリクエストがページ・API ハンドラに到達する前にここを通る。
// 主な責務: 認証チェック・未ログインユーザーの /login へのリダイレクト・権限ルーティング。

import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
// `@/` は tsconfig.json の paths 設定で `src/` を指すエイリアス
import { sessionOptions, type SessionData } from '@/lib/session';

// proxy 関数: リクエストごとに呼ばれるエントリポイント。NextResponse を返すと処理を継続/打ち切り
export async function proxy(request: NextRequest) {
  // URL のパス部分（例: "/admin/users"）を取り出す
  const { pathname } = request.nextUrl;

  // ログインページかどうか
  const isAuthRoute = pathname === '/login';
  // Next.js の内部アセット (`/_next/...`) や favicon は認証チェック対象外にする
  const isPublicAsset =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  // 静的アセットはそのまま通す
  if (isPublicAsset) return NextResponse.next();

  // セッション Cookie を読み出してセッション情報を取得
  // ジェネリクス <SessionData> でセッションの型を指定
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  // /login にアクセスしているとき
  if (isAuthRoute) {
    // 既にログイン済みなら、権限に応じた画面へリダイレクト
    if (session.userId) {
      const dest = session.role === 'admin' ? '/admin' : '/surveys';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    // 未ログインなら通常通り /login を表示
    return NextResponse.next();
  }

  // 認証必須のページに未ログインでアクセスした場合は /login へ強制リダイレクト
  if (!session.userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /admin 配下は管理者のみ。一般ユーザーは /surveys に逃がす
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/surveys', request.url));
  }

  // 上記いずれにも該当しなければ通常処理を継続
  return NextResponse.next();
}

// proxy が動作する URL パターン。ここに合致したリクエストのみ proxy を通す。
// この正規表現は「_next/static, _next/image, favicon.ico, *.svg を除く全パス」を意味する
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
