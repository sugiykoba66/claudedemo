import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL が設定されていません');
}
const adapter = new PrismaMssql(url);
const prisma = new PrismaClient({ adapter });
//const prisma = new PrismaClient();

async function main() {
  const loginId = process.env.ADMIN_LOGIN_ID ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme';
  const name = process.env.ADMIN_NAME ?? '管理者';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { loginId },
    update: {},
    create: {
      loginId,
      passwordHash,
      name,
      role: 'admin',
    },
  });

  console.log(`初期管理者を登録しました: loginId=${admin.loginId}, name=${admin.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
