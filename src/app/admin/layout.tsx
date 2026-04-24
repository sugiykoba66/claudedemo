import { requireAdmin } from '@/lib/session';
import { Header } from '@/components/header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <>
      <Header session={session} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">{children}</main>
    </>
  );
}
