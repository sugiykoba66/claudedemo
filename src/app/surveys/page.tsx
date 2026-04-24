import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';

export default async function SurveysPage() {
  const session = await requireUser();

  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
      responses: {
        where: { userId: session.userId },
        select: { id: true, submittedAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">アンケート</h1>
      <div className="bg-white rounded-lg shadow">
        {surveys.length === 0 ? (
          <p className="p-6 text-sm text-zinc-800">対象のアンケートはありません。</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {surveys.map((s) => {
              const responded = s.responses.length > 0;
              return (
                <li key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    {s.description && (
                      <p className="text-sm text-zinc-800 mt-0.5 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-800 mt-1">質問数 {s._count.questions}</p>
                  </div>
                  <div>
                    {responded ? (
                      <span className="text-xs text-zinc-800">
                        回答済み（{s.responses[0].submittedAt.toISOString().slice(0, 10)}）
                      </span>
                    ) : (
                      <Link
                        href={`/surveys/${s.id}`}
                        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
                      >
                        回答する
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
