# テストディレクトリ構造

## ディレクトリ構成

```
tests/
├── README.md          # このファイル
├── unit/             # 単体テスト（将来的に追加）
├── integration/      # 統合テスト
│   ├── core/        # コアシステムのテスト
│   ├── states/      # 各ステートのテスト
│   └── gameplay/    # ゲームプレイのテスト
├── e2e/             # E2Eテスト（Puppeteer）
│   ├── basic.test.js    # 基本的な起動・遷移テスト
│   ├── gameplay.test.js # ゲームプレイテスト
│   └── utils/          # テストユーティリティ
├── screenshots/      # テスト時のスクリーンショット
└── reports/         # テストレポート
```

## テスト実行方法

### 基本テスト
```bash
npm run test:basic
```

### ゲームプレイテスト
```bash
npm run test:gameplay
```

### すべてのテスト
```bash
npm test
```

## アーキテクチャ変更後の主なテスト対象

1. **GameCore初期化**
   - ServiceLocatorの初期化
   - SystemManagerへのシステム登録
   - MusicSystemの初期化
   - GameLoopの開始

2. **State遷移**
   - MenuState → PlayState
   - PlayState → GameOver/Clear

3. **ゲームプレイ**
   - プレイヤー操作
   - 物理演算
   - アイテム収集
   - 敵との衝突

4. **システム統合**
   - 各Adapterの動作確認
   - EventBusによる通信