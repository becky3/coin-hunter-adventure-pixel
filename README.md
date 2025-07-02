# 🎮 Coin Hunter Adventure - Pixel Edition

A retro-style platformer game built with Canvas API and pixel art graphics.

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
npm install
```

### Development

#### Quick Start
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

### Build
```bash
npm run build
```

### Testing

#### E2Eテスト
```bash
# クイックテスト（約10秒）
npm run test:e2e

# フルテストスイート（約1-2分）
npm test
```

#### Git Pushフックでの自動テスト
```bash
# 通常のpush（クイックテストのみ）
git push

# フルテストを含むpush
RUN_FULL_TESTS=true git push
```

詳細は [E2Eテストドキュメント](tests/e2e/README.md) を参照してください。

## 📖 Documentation

See the `docs/` directory for detailed documentation:
- [Development Guide](docs/DEVELOPMENT_GUIDE.md) - 開発環境のセットアップと使い方
- [Game Specification](docs/GAME_SPECIFICATION.md)
- [Technical Specification](docs/TECHNICAL_SPECIFICATION.md)
- [Pixel Art Specification](docs/PIXEL_ART_SPECIFICATION.md)
- [Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md)
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)

## 🎨 Features
- Pure pixel art graphics
- Smooth 60 FPS gameplay
- Retro game feel with modern polish
- Stage-based palette system
- Custom pixel font

## 🛠️ Tech Stack
- TypeScript
- Canvas API
- Vite for bundling
- Puppeteer for testing

## 📄 License
MIT