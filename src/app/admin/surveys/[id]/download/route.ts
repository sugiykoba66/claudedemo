import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { buildCsv } from '@/lib/csv';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (session.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id } = await ctx.params;

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { choices: { orderBy: { order: 'asc' } } },
      },
      responses: {
        orderBy: { submittedAt: 'asc' },
        include: {
          user: { select: { loginId: true, name: true } },
          answers: { include: { choice: true } },
        },
      },
    },
  });

  if (!survey) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const header = [
    'ユーザーID',
    '氏名',
    '回答日時',
    ...survey.questions.map((q, i) => `Q${i + 1}. ${q.text}`),
  ];

  const rows: (string | number | null | undefined)[][] = [header];

  for (const r of survey.responses) {
    const row: (string | null)[] = [
      r.user.loginId,
      r.user.name,
      r.submittedAt.toISOString().slice(0, 19).replace('T', ' '),
    ];
    for (const q of survey.questions) {
      const answers = r.answers.filter((a) => a.questionId === q.id);
      if (q.type === 'single') {
        row.push(answers[0]?.choice?.text ?? '');
      } else if (q.type === 'multi') {
        row.push(answers.map((a) => a.choice?.text ?? '').filter(Boolean).join('; '));
      } else if (q.type === 'text') {
        row.push(answers[0]?.text ?? '');
      } else if (q.type === 'date') {
        const d = answers[0]?.date;
        row.push(d ? d.toISOString().slice(0, 10) : '');
      } else {
        row.push('');
      }
    }
    rows.push(row);
  }

  const csv = buildCsv(rows);
  const bom = '﻿';
  const filename = encodeURIComponent(`${survey.title}_回答.csv`);

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
    },
  });
}
