import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import { redirect } from 'next/navigation';

export type SessionData = {
  userId?: string;
  loginId?: string;
  name?: string;
  role?: 'admin' | 'user';
};

const FALLBACK_SECRET = 'development-only-secret-please-change-to-32chars-or-more!';

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? FALLBACK_SECRET,
  cookieName: 'survey_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.userId) {
    redirect('/login');
  }
  return session as Required<Pick<SessionData, 'userId' | 'loginId' | 'name' | 'role'>> & SessionData;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== 'admin') {
    redirect('/surveys');
  }
  return session;
}
