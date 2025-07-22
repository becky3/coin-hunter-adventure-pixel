# 🎮 Coin Hunter Adventure - Pixel Edition

[![E2E Tests](https://github.com/becky3/coin-hunter-adventure-pixel/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/becky3/coin-hunter-adventure-pixel/actions/workflows/e2e-tests.yml)

Canvas APIとピクセルアートグラフィックで構築されたレトロスタイルのプラットフォーマーゲームです。

## 🚀 はじめに

### 必要環境
- Node.js 16+
- npm または yarn

### インストール
```bash
npm install
```

### 開発

#### クイックスタート
```bash
# バックグラウンドで開発サーバーを起動（推奨）
nohup npm run dev > dev-server.log 2>&1 &

# アクセス
# http://localhost:3000/
```

#### 通常の起動方法
```bash
npm run dev
```

詳細は [開発ガイド](docs/DEVELOPMENT_GUIDE.md) を参照してください。

### ビルド
```bash
npm run build
```

### テスト

```bash
# 全テストを並列実行（約80秒）
npm test

# Claudeでの実行（タイムアウト10分設定）
npm run test:claude

# 個別テスト実行
node tests/e2e/test-[テスト名].cjs
```

詳細は [テストガイド](docs/development/testing.md) を参照してください。

## 📖 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照してください：
- [開発ガイド](docs/DEVELOPMENT_GUIDE.md) - 開発環境のセットアップと使い方
- [ゲーム仕様書](docs/GAME_SPECIFICATION.md)
- [技術仕様書](docs/TECHNICAL_SPECIFICATION.md)
- [ピクセルアート仕様書](docs/PIXEL_ART_SPECIFICATION.md)
- [開発ガイドライン](docs/DEVELOPMENT_GUIDELINES.md)
- [実装ロードマップ](docs/IMPLEMENTATION_ROADMAP.md)

## 🎨 特徴
- ピュアなピクセルアートグラフィック
- スムーズな60FPSゲームプレイ
- モダンな洗練さを持つレトロゲーム感
- ステージベースのパレットシステム
- カスタムピクセルフォント
- ステージ遷移システム（ステージごとに3エリア）
- より良いゲームプレイのための調整可能なジャンプ物理
- ステージ選択付きデバッグオーバーレイ
- リアルタイム物理パラメータテストツール

## 🛠️ 技術スタック
- TypeScript
- Canvas API
- Vite（バンドリング）
- Puppeteer（テスト）