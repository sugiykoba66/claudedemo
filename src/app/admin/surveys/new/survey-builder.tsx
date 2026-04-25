// アンケート作成 UI のクライアントコンポーネント。
// タイトル/説明/質問/選択肢をクライアント側のステートで管理し、
// 送信時に JSON 文字列にまとめて Server Action へ渡す。

'use client';

// useState: コンポーネントのローカルステートを保持する基本フック
import { useActionState, useState } from 'react';
import { createSurvey, type CreateSurveyState } from '../actions';

// 質問タイプを4つに限定したリテラルユニオン型
type QuestionType = 'single' | 'multi' | 'text' | 'date';

// 編集中の1質問の構造
type DraftQuestion = {
  type: QuestionType;
  text: string;
  choices: string[];
};

// 新しい質問の初期値を返すヘルパ。デフォルトは選択肢2つの単一選択
function emptyQuestion(): DraftQuestion {
  return { type: 'single', text: '', choices: ['', ''] };
}

export function SurveyBuilder() {
  // 個別のフォーム値を独立したステートで保持
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // ジェネリクス <DraftQuestion[]> で配列要素の型を明示
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [state, action, pending] = useActionState<CreateSurveyState, FormData>(
    createSurvey,
    undefined,
  );

  // 質問1件の任意プロパティを更新する。Partial<T> = T のすべてのキーを optional にした型
  function updateQuestion(index: number, next: Partial<DraftQuestion>) {
    // 関数形式の setState: 直前の state を引数で受け取り、新しい state を返す
    // スプレッド構文 ...q で既存プロパティを展開し、next で上書き
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...next } : q)));
  }

  // 質問内の特定の選択肢を更新
  function updateChoice(qIndex: number, cIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.map((c, j) => (j === cIndex ? value : c)) } : q,
      ),
    );
  }

  // 選択肢を末尾に追加
  function addChoice(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, choices: [...q.choices, ''] } : q)),
    );
  }

  // 指定インデックスの選択肢を削除（filter で残す要素のみ抽出）
  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.filter((_, j) => j !== cIndex) } : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  // 質問の並び替え。dir = -1（上へ） or 1（下へ）
  function moveQuestion(index: number, dir: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      // 端を超えるなら何もしない
      if (target < 0 || target >= next.length) return prev;
      // 分割代入によるスワップ: [a, b] = [b, a]
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // フォーム送信時に Server Action へ渡す JSON ペイロードを毎レンダー組み立て
  // 単一/複数選択以外は choices を undefined にして送信データから除外
  const payload = JSON.stringify({
    title: title.trim(),
    description: description.trim(),
    questions: questions.map((q) => ({
      type: q.type,
      text: q.text.trim(),
      choices:
        q.type === 'single' || q.type === 'multi'
          ? q.choices.map((c) => c.trim()).filter((c) => c.length > 0)
          : undefined,
    })),
  });

  return (
    <form action={action} className="space-y-6">
      {/* JSON を hidden input に入れてフォーム送信する。Server Action 側で JSON.parse する */}
      <input type="hidden" name="payload" value={payload} />

      {/* タイトル・説明セクション */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            // 入力イベント (e) の e.target.value で現在の値を取得
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">説明（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 質問カードを質問数だけ繰り返し描画 */}
      {questions.map((q, qi) => (
        <div key={qi} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">質問 {qi + 1}</h3>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => moveQuestion(qi, -1)}
                className="text-zinc-800 hover:text-zinc-900"
              >
                上へ
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(qi, 1)}
                className="text-zinc-800 hover:text-zinc-900"
              >
                下へ
              </button>
              {/* 質問が2問以上ある場合のみ削除ボタン表示 */}
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="text-red-600 hover:text-red-800"
                >
                  削除
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">質問文</label>
            <input
              type="text"
              value={q.text}
              onChange={(e) => updateQuestion(qi, { text: e.target.value })}
              required
              maxLength={500}
              className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">回答タイプ</label>
            <select
              value={q.type}
              // select の値は string なので、型アサーション (as QuestionType) でユニオン型に絞り込む
              onChange={(e) => updateQuestion(qi, { type: e.target.value as QuestionType })}
              className="border border-zinc-300 rounded px-3 py-2 text-sm"
            >
              <option value="single">単一選択</option>
              <option value="multi">複数選択</option>
              <option value="text">自由記述</option>
              <option value="date">日付</option>
            </select>
          </div>

          {/* 選択肢入力エリアは選択型のときだけ表示 */}
          {(q.type === 'single' || q.type === 'multi') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">選択肢</label>
              {q.choices.map((c, ci) => (
                <div key={ci} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateChoice(qi, ci, e.target.value)}
                    maxLength={500}
                    className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm"
                  />
                  {q.choices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChoice(qi, ci)}
                      className="text-red-600 text-xs"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(qi)}
                className="text-sm text-blue-600 hover:underline"
              >
                ＋ 選択肢を追加
              </button>
            </div>
          )}
        </div>
      ))}

      {/* フッタ: 質問追加 / 保存 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addQuestion}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded px-4 py-2 text-sm"
        >
          ＋ 質問を追加
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 text-white rounded px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? '保存中…' : 'アンケートを保存'}
        </button>
      </div>

      {/* サーバー側エラー */}
      {state && !state.ok && <p className="text-red-600 text-sm">{state.message}</p>}
    </form>
  );
}
