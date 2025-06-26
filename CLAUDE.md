# coin-hunter-adventure-pixel プロジェクトガイド

## 概要

SVGベースの「coin-hunter-adventure」をピクセルアート（Canvas）ベースに移植するプロジェクトです。

## 必須確認資料

### 開発ルール・規約
- `DEVELOPMENT_RULES.md` - 開発フロー、Git運用、作業手順
- `CODING_STANDARDS.md` - コーディング規約、命名規則
- `ARCHITECTURE.md` - システム設計、ディレクトリ構造

### 仕様書
- `docs/GAME_SPECIFICATION.md` - ゲーム仕様
- `docs/TECHNICAL_SPECIFICATION.md` - 技術仕様
- `docs/PIXEL_ART_SPECIFICATION.md` - ピクセルアート仕様
- `docs/IMPLEMENTATION_ROADMAP.md` - 実装ロードマップ

## 作業ディレクトリ構成

```
/mnt/d/claude/pixelAction/
├── coin-hunter-adventure-pixel/  # メイン開発（Git管理）
└── old_project_achive/          # 参照用（読み取り専用）
    └── testAction/              # 元プロジェクト（SVG版）
```

## 開発時の重要事項

### 必須作業
1. **TodoList管理** - 作業開始時に必ずTodoListで計画を作成・管理
2. **品質チェック** - 実装後は `npm run lint` でコード品質を確認
3. **動作確認** - 60FPSでの安定動作を確認
4. **内容の検証** - ドキュメントや引き継ぎ内容に疑問がある場合は、実装前に確認
5. **日付の確認** - ファイル作成時は必ず `date` コマンドで現在日付を確認してから命名

### 制限事項
- `old_project_achive/` は参照のみ（編集・コミット禁止）
- 不要なファイル作成を避ける（既存ファイル編集を優先）

### 移植方針
- ゲームロジックは元プロジェクトから再利用
- 描画部分のみCanvas APIに対応
- SVG操作 → Canvas描画への変換に注意

## 開発サーバー

**重要**: サーバー起動はユーザー側で行います（トークン消費を避けるため）

起動コマンド：
```bash
cd /mnt/d/claude/pixelAction/coin-hunter-adventure-pixel
npm run dev
```

アクセスURL: http://localhost:3000/

## 作業開始時の手順

**重要: 以下の手順を必ず順番通りに実行してください**

### 1. 最新の状態を取得
```bash
git checkout main
git pull origin main
```

### 2. GitHub Issueの確認と選択
```bash
gh issue list
gh issue view [選択したIssue番号]
```

### 3. 作業ブランチの作成
```bash
git checkout -b feature/[機能名]
# または
git checkout -b bugfix/[バグ名]
```

### 4. Issueに作業開始をコメント
```bash
gh issue comment [Issue番号] --body "作業を開始します。
ブランチ: feature/[機能名]"
```

### 5. TodoListの作成
作業内容に基づいてTodoWriteツールで作業計画を作成してください。

### 6. プロジェクト状況の確認
- `docs/PROJECT_STATUS.md` - 現在の実装状況と次の作業
- `docs/IMPLEMENTATION_ROADMAP.md` - 全体の実装計画
- `handover-docs/` - 過去の作業履歴と引き継ぎ事項

## システムの重要な制限事項

### テキスト表示
- **大文字英語のみ対応**（A-Z, 0-9, 一部記号）
- 日本語、小文字は表示不可
- 詳細は `docs/PIXEL_ART_SPECIFICATION.md` の「テキスト表示の制限」を参照

### レンダリング
- PixelRendererのメソッドを使用すること（drawRect, setCamera等）
- 直接ctx操作は避ける（スケーリングが適用されない）

## トラブルシューティング

具体的な問題と解決方法については以下を参照してください：
- `docs/PROJECT_STATUS.md` - 既知の問題と対処法
- `handover-docs/` - 過去に発生した問題と解決履歴