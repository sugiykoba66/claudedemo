// 回答者用アンケート一覧（/surveys）。
// 各アンケートに「回答する」ボタン or 「回答済み」表示を出し分ける。

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';

export default async function SurveysPage() {
  const session = await requireUser();

  // 各アンケートに対して、ログイン中のユーザー自身の Response（最大1件）だけを取得
  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
      // where で絞り込むと「自分の回答」のみが配列に入る（無ければ空配列）
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
          // ul + divide-y で項目間に区切り線を入れる Tailwind 流儀
          <ul className="divide-y divide-zinc-100">
            {surveys.map((s) => {
              // 自分の回答が1件でもあれば回答済み
              const responded = s.responses.length > 0;
              return (
                <li key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    {s.description && (
                      // line-clamp-2: 2行で切り詰めて末尾に省略記号を表示
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
