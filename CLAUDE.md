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

### 制限事項
- `old_project_achive/` は参照のみ（編集・コミット禁止）
- 不要なファイル作成を避ける（既存ファイル編集を優先）

### 移植方針
- ゲームロジックは元プロジェクトから再利用
- 描画部分のみCanvas APIに対応
- SVG操作 → Canvas描画への変換に注意

## 開発サーバー

```bash
cd coin-hunter-adventure-pixel
npm run dev
```

## 現在の状況

プロジェクトは初期段階で、以下の作業が必要：
1. コアシステムの移植（InputManager, GameStateManager等）
2. レンダリングシステムの構築（PixelRenderer）
3. エンティティシステムのCanvas対応
4. アセットローダーの実装

詳細な作業内容はTodoListを確認してください。