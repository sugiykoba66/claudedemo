import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login';
  const isPublicAsset =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  if (isPublicAsset) return NextResponse.next();

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (isAuthRoute) {
    if (session.userId) {
      const dest = session.role === 'admin' ? '/admin' : '/surveys';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!session.userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/surveys', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
