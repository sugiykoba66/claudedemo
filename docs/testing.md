# テスト・CI 運用ガイド

## このドキュメントの目的

`claudedemo` で「どんなテストを書くか／書かないか」「CI/CD でどう守られているか」を 1 ページで把握できる状態にする。

## テスト基盤

- **ランナー**: [vitest](https://vitest.dev/) v2
- **環境**: jsdom（将来 React コンポーネントを単体検証する余地を残すため）
- **設定**: [`vitest.config.ts`](../vitest.config.ts)
- **対象パターン**: `src/**/*.test.{ts,tsx}`

## ローカル実行

```bash
# 全テストを 1 回実行（CI と同じ）
npm run test

# ファイル変更を監視して自動再実行（開発中）
npm run test:watch
```

## 何をテストするか — 不変条件ベース

カバレッジ % は追わない。代わりに **「これが壊れたら CI が必ず赤くなる」** 状態を最低ラインとする。

現在テストで守っている不変条件:

| # | 不変条件 | 対象 |
|---|---|---|
| 1 | CSV パース: クォート・エスケープ・改行・BOM の正しい処理 | `src/lib/csv.test.ts` |
| 2 | CSV ビルド: 特殊文字 (`"` `,` 改行) の正しいエスケープと CRLF 改行 | `src/lib/csv.test.ts` |
| 3 | `LoginSchema` は ID/パスワードの空文字を弾く | `src/lib/schemas.test.ts` |
| 4 | `SurveyInputSchema` は質問数 0 / 不正な type / 文字数超過を弾く | `src/lib/schemas.test.ts` |
| 5 | `AnswerInputSchema` は UUID 形式違反 / 文字数超過を弾く | `src/lib/schemas.test.ts` |
| 6 | `SubmitSchema` は surveyId 不正 / answers が配列でない場合を弾く | `src/lib/schemas.test.ts` |

## 何をテストしないか（意図的）

- **Server Action 全体の統合テスト**: DB 環境構築が必要で、初学者の負担が重い。Phase 2 以降で `prisma.$transaction` 化と合わせて検討
- **E2E（Playwright 等）**: ログイン→回答→CSV ダウンロードの黄金経路 1〜2 本だけ書きたいが、Phase 2 以降の課題
- **React コンポーネントの見た目テスト**: 少人数運用で UI 変更頻度が高くないため、コスト対効果が悪い
- **`requireUser` / `requireAdmin` の単体テスト**: `server-only` / `next/headers` / `iron-session` をモックする量が多く、ロジックの素朴さに対して保守コストが見合わない

## CI/CD の構成

### `.github/workflows/ci.yml`（新規）

トリガー: PR 作成・main 以外への push。

ステップ:
1. `npm ci`
2. `npx prisma generate`
3. `npm run lint`
4. `npx tsc --noEmit`
5. `npm run test`

すべて green でないと merge 不可にする運用が望ましい（GitHub の **Branch protection rules** で `verify` ジョブを必須に設定）。

### `.github/workflows/deploy.yml`（既存改修）

トリガー: `main` への push。

build job の冒頭に CI と同じ検証ステップ（lint / tsc / test）を追加。検証が落ちたら deploy job は実行されない。

deploy job には `environment: production` を付与した。GitHub Settings の Environments で `production` に required reviewers を設定すると、approval 待ちで停止する。

## 推奨: Branch protection / Environment 設定（GUI 設定）

リポジトリ管理者が GitHub の Settings から行う:

### Branch protection rules（main）
- `Require a pull request before merging` を有効化
- `Require status checks to pass before merging` を有効化し、`verify` を必須に追加
- 直 push を禁止して PR 経由のみに

### Environments → production
- `Required reviewers` に承認者を追加（自分以外を 1 人以上推奨）
- これで main へ push されてもデプロイは承認待ちで停止する

これらは Workflow ファイルでは設定できないため、別途手作業が必要。

## テストを追加するときの目安

新しい関数を書いたら、まず「これが壊れたら本番で何が困るか？」を考える。困る項目があるなら、それが不変条件としてテストすべき内容。

例:
- ✅ パースした値が境界条件で正しく扱われるか → 単体テスト
- ✅ Zod スキーマが想定通り受け入れる／弾くか → 単体テスト
- ❌ 「とりあえずカバレッジを上げる」目的のテスト → 書かない
