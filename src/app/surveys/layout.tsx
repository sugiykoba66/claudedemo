import { requireUser } from '@/lib/session';
import { Header } from '@/components/header';

export default async function SurveysLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <>
      <Header session={session} />
      <main className="flex-1 max-w-3xl w-full mx-auto p-6">{children}</main>
    </>
  );
}
