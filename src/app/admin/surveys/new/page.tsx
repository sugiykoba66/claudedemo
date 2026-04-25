// 新規アンケート作成ページ（/admin/surveys/new）。
// 実体のフォームはクライアントコンポーネント SurveyBuilder。

import { SurveyBuilder } from './survey-builder';

export default function NewSurveyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">新規アンケート作成</h1>
      <SurveyBuilder />
    </div>
  );
}
