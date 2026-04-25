// CSV ダウンロード用 Route Handler（/admin/surveys/[id]/download）。
// route.ts は Next.js の API ルートで、HTTP メソッド名（GET/POST 等）を export する。
// このエンドポイントへの GET リクエストに対して CSV を直接返す。

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { buildCsv } from '@/lib/csv';

export async function GET(
  // 第1引数: リクエスト本体。今回は使わないので _ プレフィックス
  _request: Request,
  // 第2引数: 動的パラメータ等を含むコンテキスト。Next.js 16 で params が Promise 化
  ctx: { params: Promise<{ id: string }> },
) {
  // ページレイアウトを通らないので認証チェックは自前で実装する
  const session = await getSession();
  if (!session.userId) {
    // 401 Unauthorized: 未認証
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (session.role !== 'admin') {
    // 403 Forbidden: 認証はされているが権限がない
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id } = await ctx.params;

  // アンケート + 質問 + 選択肢 + 回答 + 各回答者ユーザー情報 を一気に取得
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
          // Answer 経由で選択肢の text を取得
          answers: { include: { choice: true } },
        },
      },
    },
  });

  if (!survey) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // CSV のヘッダ行を組み立て。質問は "Q1. xxx" 形式
  const header = [
    'ユーザーID',
    '氏名',
    '回答日時',
    // スプレッド演算子で配列要素を展開
    ...survey.questions.map((q, i) => `Q${i + 1}. ${q.text}`),
  ];

  // CSV 全体（buildCsv に渡す前段の2次元配列）
  const rows: (string | number | null | undefined)[][] = [header];

  // for...of: 反復可能オブジェクト（配列など）を順に処理
  for (const r of survey.responses) {
    const row: (string | null)[] = [
      r.user.loginId,
      r.user.name,
      // ISO 文字列 "2026-04-25T10:30:00.000Z" → "2026-04-25 10:30:00"
      r.submittedAt.toISOString().slice(0, 19).replace('T', ' '),
    ];
    for (const q of survey.questions) {
      // この回答（r）に紐づく、この質問（q）の Answer 群
      const answers = r.answers.filter((a) => a.questionId === q.id);
      if (q.type === 'single') {
        // 単一選択: 1件の選択肢テキスト
        row.push(answers[0]?.choice?.text ?? '');
      } else if (q.type === 'multi') {
        // 複数選択: "; " 区切りで結合（CSV のカラム内表現）
        row.push(answers.map((a) => a.choice?.text ?? '').filter(Boolean).join('; '));
      } else if (q.type === 'text') {
        row.push(answers[0]?.text ?? '');
      } else if (q.type === 'date') {
        const d = answers[0]?.date;
        // Date を YYYY-MM-DD に整形
        row.push(d ? d.toISOString().slice(0, 10) : '');
      } else {
        row.push('');
      }
    }
    rows.push(row);
  }

  const csv = buildCsv(rows);
  // BOM (U+FEFF) を先頭に付けて Excel が UTF-8 を正しく認識するようにする
  const bom = '﻿';
  // 日本語ファイル名は URL エンコードして filename* 形式で渡すとブラウザが正しくデコードしてくれる
  const filename = encodeURIComponent(`${survey.title}_回答.csv`);

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Content-Disposition: attachment にするとブラウザがダウンロードダイアログを出す
      // RFC 5987 の filename*=UTF-8''<percent-encoded> 形式で日本語ファイル名を指定
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      // ダウンロード結果はキャッシュしない
      'Cache-Control': 'no-store',
    },
  });
}
