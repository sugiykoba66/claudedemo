// ユーザー管理用の Server Action 群（CSV 一括登録 / 個別削除）。

'use server';

import bcrypt from 'bcrypt';
// revalidatePath: 指定パスのキャッシュを無効化し、次回アクセスで最新データを取得させる
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { parseCsv } from '@/lib/csv';

// CSV 取り込み結果の型。成功時/失敗時で持つフィールドが異なるユニオン型
export type ImportResult =
  | { ok: true; created: number; skipped: number; messages: string[] }
  | { ok: false; message: string };

// CSV から複数ユーザーを登録する Server Action
export async function importUsersFromCsv(
  _state: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  // 管理者でなければここで /surveys へリダイレクトされる
  await requireAdmin();

  // FormData.get は string | File | null を返す。File かつサイズ > 0 を確認
  const file = formData.get('file');
  // instanceof で File オブジェクトかどうかを実行時にチェック
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'CSVファイルを選択してください' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, message: 'ファイルサイズは2MB以下にしてください' };
  }

  // File から本文を文字列で取得（UTF-8 として解釈される）
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, message: 'CSVの内容が空です' };
  }

  // 配列のスプレッド分割代入: 先頭行をヘッダ、残りをデータとして取り出す
  const [header, ...dataRows] = rows;
  // 大文字小文字を吸収するため小文字化
  const normalized = header.map((h) => h.trim().toLowerCase());
  // 必要列のインデックスを索引化（無ければ -1）
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

  // 行ごとの注意メッセージを蓄積する配列
  const messages: string[] = [];
  let created = 0;
  let skipped = 0;

  // for ループで逐次処理。await を含むので forEach ではなく for を使う
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    // CSV のヘッダを1行目として人間にわかる行番号にする
    const lineNo = i + 2;
    // ?? は null/undefined のとき右辺を使う。row[...] が undefined ならば '' に
    const loginId = (row[idx.loginId] ?? '').trim();
    const name = (row[idx.name] ?? '').trim();
    const password = (row[idx.password] ?? '').trim();
    // role 列が存在しない場合は 'user' をデフォルトに
    const roleRaw = idx.role >= 0 ? (row[idx.role] ?? '').trim().toLowerCase() : 'user';
    const role = roleRaw === 'admin' ? 'admin' : 'user';

    if (!loginId || !name || !password) {
      messages.push(`${lineNo}行目: loginId / name / password のいずれかが空`);
      skipped++;
      continue;
    }

    // 既に同じ loginId が登録されていないか確認
    const existing = await prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      messages.push(`${lineNo}行目: loginId "${loginId}" は既に登録済み`);
      skipped++;
      continue;
    }

    // bcrypt のソルトラウンド数: 10。本番ではコストとセキュリティのバランスで調整
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { loginId, name, passwordHash, role },
    });
    created++;
  }

  // 一覧画面のキャッシュを無効化 → 次回アクセス時に最新ユーザー一覧が表示される
  revalidatePath('/admin/users');
  return { ok: true, created, skipped, messages };
}

// 1ユーザーを削除する Server Action（DeleteUserButton から呼ばれる）
export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/users');
}
