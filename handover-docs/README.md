# 引き継ぎドキュメント管理

このディレクトリには、ClaudeとGemini間の作業引き継ぎドキュメントを管理します。

## ディレクトリ構成

```
handover-docs/
├── README.md                 # このファイル
├── templates/               # 引き継ぎテンプレート
│   └── handover-template.md # 標準引き継ぎテンプレート
├── claude-to-gemini/        # Claude → Gemini への引き継ぎ
│   └── YYYY-MM-DD_機能名.md
├── gemini-to-claude/        # Gemini → Claude への引き継ぎ
│   └── YYYY-MM-DD_機能名.md
└── [過去の引き継ぎファイル]  # 移行前の既存ファイル
```

## 引き継ぎフロー

### 1. Claude → Gemini（実装 → レビュー）
1. Claudeが機能を実装
2. `claude-to-gemini/YYYY-MM-DD_機能名.md`を作成
3. テンプレートに従って実装内容を記載
4. Geminiがレビュー・テストを実施

### 2. Gemini → Claude（レビュー結果 → 修正）
1. GeminiがPRに直接レビューコメントを記載
2. 必要に応じて`gemini-to-claude/YYYY-MM-DD_機能名_review.md`を作成
3. Claudeが修正・改善を実施

## ファイル命名規則

- 日付: `YYYY-MM-DD`形式（例：2025-06-27）
- 機能名: kebab-case（例：coin-collection）
- 種別:
  - 実装引き継ぎ: `YYYY-MM-DD_機能名.md`
  - レビュー結果: `YYYY-MM-DD_機能名_review.md`
  - 修正完了: `YYYY-MM-DD_機能名_fixed.md`

## テンプレートの使い方

### 実装引き継ぎ（handover-template.md）
- 実装内容の詳細
- 変更ファイル一覧
- テスト手順
- 既知の問題

### レビュー結果
- GeminiはPRに直接コメントを記載
- 詳細な引き継ぎが必要な場合のみ、別途ドキュメントを作成

## 過去の引き継ぎファイル

移行前の既存ファイルは、参照用としてルートディレクトリに残しています。
新規の引き継ぎは必ず上記のディレクトリ構成に従ってください。