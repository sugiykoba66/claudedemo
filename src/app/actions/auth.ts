'use server';

import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

const LoginSchema = z.object({
  loginId: z.string().trim().min(1, { message: 'ユーザーIDを入力してください' }),
  password: z.string().min(1, { message: 'パスワードを入力してください' }),
});

export type LoginState =
  | {
      errors?: { loginId?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    loginId: formData.get('loginId'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { loginId, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    return { message: 'ユーザーIDまたはパスワードが正しくありません' };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { message: 'ユーザーIDまたはパスワードが正しくありません' };
  }

  const session = await getSession();
  session.userId = user.id;
  session.loginId = user.loginId;
  session.name = user.name;
  session.role = user.role === 'admin' ? 'admin' : 'user';
  await session.save();

  redirect(user.role === 'admin' ? '/admin' : '/surveys');
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
