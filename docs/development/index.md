---
layout: default
title: 開発者向け
---

# 開発者向けガイド

Coin Hunter Adventure Pixelの開発に参加する方向けのドキュメントです。

## 目次

1. [開発ガイドライン]({{ site.baseurl }}/development/guidelines.html) - コーディング規約とベストプラクティス
2. [コメントルール]({{ site.baseurl }}/development/comment-rules.html) - ESLintによるコメント規約
3. [アーキテクチャ]({{ site.baseurl }}/development/architecture.html) - システム設計と構造
4. [物理システム]({{ site.baseurl }}/development/physics-system.html) - 物理演算とパラメータ設定
5. [マネージャーAPI]({{ site.baseurl }}/development/managers.html) - 主要マネージャークラスのAPI
6. [テストガイド]({{ site.baseurl }}/development/testing.html) - テストの書き方と実行方法、既存テスト一覧

## 開発の流れ

1. **Issueの確認**: GitHubのIssuesで作業内容を確認
2. **ブランチの作成**: `feature/機能名`または`fix/バグ名`の形式で作成
3. **開発**: コーディング規約に従って実装
4. **テスト**: ユニットテストと手動テストを実施
5. **PR作成**: レビューを依頼

## 主要な技術スタック

- **言語**: TypeScript
- **ビルドツール**: Vite
- **レンダリング**: Canvas API（独自実装）
- **テスト**: Puppeteer（E2E）
- **リンター**: ESLint + 以下のプラグイン
  - `eslint-plugin-jsdoc` - JSDocコメントの検証
  - `@eslint-community/eslint-plugin-eslint-comments` - ESLintディレクティブの検証

## 開発環境

- **エディタ**: VS Code推奨（設定ファイル付属）
- **Node.js**: v18以上
- **ブラウザ**: Chrome/Firefox/Safari最新版

## コントリビューションガイド

1. まずIssueで議論
2. 小さく頻繁なコミット
3. わかりやすいコミットメッセージ
4. PRは1つの機能/修正に集中
5. レビューコメントには迅速に対応

詳しくは各ガイドをご覧ください。