'use server';

import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { parseCsv } from '@/lib/csv';

export type ImportResult =
  | { ok: true; created: number; skipped: number; messages: string[] }
  | { ok: false; message: string };

export async function importUsersFromCsv(
  _state: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'CSVファイルを選択してください' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, message: 'ファイルサイズは2MB以下にしてください' };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, message: 'CSVの内容が空です' };
  }

  const [header, ...dataRows] = rows;
  const normalized = header.map((h) => h.trim().toLowerCase());
  const idx = {
    loginId: normalized.indexOf('loginid'),
    name: normalized.indexOf('name'),
    password: normalized.indexOf('password'),
    role: normalized.indexOf('role'),
  };
  if (idx.loginId < 0 || idx.name < 0 || idx.password < 0) {
    return {
      ok: false,
      message: 'CSVの1行目は loginId,name,password,role のヘッダにしてください',
    };
  }

  const messages: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const lineNo = i + 2;
    const loginId = (row[idx.loginId] ?? '').trim();
    const name = (row[idx.name] ?? '').trim();
    const password = (row[idx.password] ?? '').trim();
    const roleRaw = idx.role >= 0 ? (row[idx.role] ?? '').trim().toLowerCase() : 'user';
    const role = roleRaw === 'admin' ? 'admin' : 'user';

    if (!loginId || !name || !password) {
      messages.push(`${lineNo}行目: loginId / name / password のいずれかが空`);
      skipped++;
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      messages.push(`${lineNo}行目: loginId "${loginId}" は既に登録済み`);
      skipped++;
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { loginId, name, passwordHash, role },
    });
    created++;
  }

  revalidatePath('/admin/users');
  return { ok: true, created, skipped, messages };
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/users');
}
