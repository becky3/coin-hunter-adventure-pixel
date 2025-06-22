# 開発ガイドライン

## 開発フロー

### 1. セットアップ
```bash
# リポジトリのクローン
git clone <repository-url>
cd coin-hunter-adventure-pixel

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# HTTPサーバー（CORS回避用）
python3 -m http.server 8080
```

### 2. ブランチ戦略
```
main
├── develop
│   ├── feature/player-implementation
│   ├── feature/enemy-system
│   └── feature/stage-loader
└── release/v1.0
```

- `main`: 本番環境
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- `bugfix/*`: バグ修正ブランチ
- `release/*`: リリース準備ブランチ

### 3. コミット規約
```
<type>: <subject>

<body>

<footer>
```

#### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・補助ツール

#### 例
```
feat: プレイヤーのジャンプメカニクスを実装

- 可変ジャンプ高さを追加
- 最小・最大ジャンプ時間を設定
- 空中制御を改善

Closes #12
```

## コーディング規約

### JavaScript/ES6+

#### 命名規則
```javascript
// 定数：アッパースネークケース
const MAX_HEALTH = 100;
const GRAVITY_CONSTANT = 0.65;

// 変数・関数：キャメルケース
let playerScore = 0;
function updateGameState() {}

// クラス：パスカルケース
class PlayerCharacter {}

// プライベートメンバー：アンダースコア接頭辞
class Entity {
    constructor() {
        this._internalState = {};
    }
}
```

#### コードスタイル
```javascript
// インデント：スペース2つ
function example() {
  if (condition) {
    doSomething();
  }
}

// 中括弧：同一行開始
if (condition) {
  // 処理
} else {
  // 処理
}

// アロー関数：簡潔な記法を優先
const double = x => x * 2;
const add = (a, b) => a + b;

// 非同期処理：async/await推奨
async function loadData() {
  try {
    const data = await fetch('/api/data');
    return await data.json();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}
```

### ファイル構成
```javascript
// 1. インポート
import { Player } from './entities/Player.js';
import { CONSTANTS } from './constants.js';

// 2. 定数定義
const LOCAL_CONSTANT = 42;

// 3. クラス定義
class GameManager {
  // ...
}

// 4. ヘルパー関数
function helperFunction() {
  // ...
}

// 5. エクスポート
export { GameManager };
```

### エラーハンドリング
```javascript
// カスタムエラークラス
class GameError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

// エラーハンドリング例
try {
  dangerousOperation();
} catch (error) {
  if (error instanceof GameError) {
    handleGameError(error);
  } else {
    console.error('Unexpected error:', error);
    // グレースフルな回復処理
  }
}
```

## テスト戦略

### テストの種類

#### 1. ユニットテスト
```javascript
// Jest使用例
describe('Player', () => {
  let player;
  
  beforeEach(() => {
    player = new Player(100, 200);
  });
  
  test('should jump when on ground', () => {
    player.onGround = true;
    player.jump();
    expect(player.velY).toBeLessThan(0);
    expect(player.onGround).toBe(false);
  });
  
  test('should not jump when in air', () => {
    player.onGround = false;
    const initialVelY = player.velY;
    player.jump();
    expect(player.velY).toBe(initialVelY);
  });
});
```

#### 2. 統合テスト
```javascript
describe('Game Integration', () => {
  test('player should collect coin and increase score', async () => {
    const game = new Game();
    await game.loadStage('test-stage.json');
    
    const initialScore = game.score;
    game.player.x = 100;
    game.player.y = 100;
    
    // コインの位置にプレイヤーを移動
    game.update();
    
    expect(game.score).toBe(initialScore + 10);
  });
});
```

#### 3. ビジュアルテスト
```javascript
// スナップショットテスト
test('renders game scene correctly', () => {
  const canvas = document.createElement('canvas');
  const game = new Game(canvas);
  game.render();
  
  expect(canvas).toMatchImageSnapshot();
});
```

### テスト実行
```bash
# 全テスト実行
npm test

# ウォッチモード
npm test -- --watch

# カバレッジレポート
npm test -- --coverage

# 特定のテストのみ
npm test -- Player.test.js
```

## CI/CD設定

### GitHub Actions
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

### 自動デプロイ
```yaml
deploy:
  needs: test
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  
  steps:
  - uses: actions/checkout@v2
  
  - name: Build production
    run: npm run build:prod
    
  - name: Deploy to GitHub Pages
    uses: peaceiris/actions-gh-pages@v3
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      publish_dir: ./dist
```

## パフォーマンス最適化

### 計測ツール
```javascript
// パフォーマンスモニター
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      updateTime: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }
  
  measureUpdate(fn) {
    const start = performance.now();
    fn();
    this.metrics.updateTime = performance.now() - start;
  }
  
  measureRender(fn) {
    const start = performance.now();
    fn();
    this.metrics.renderTime = performance.now() - start;
  }
}
```

### 最適化チェックリスト
- [ ] 不要な再描画を避ける
- [ ] オブジェクトプールを使用
- [ ] 画面外のオブジェクトをスキップ
- [ ] テクスチャアトラスを使用
- [ ] 適切なデータ構造を選択

## デバッグツール

### デバッグモード
```javascript
const DEBUG = {
  SHOW_HITBOXES: false,
  SHOW_FPS: true,
  LOG_COLLISIONS: false,
  INFINITE_HEALTH: false,
  STAGE_SELECT: true
};

// URLパラメータでデバッグモード切り替え
const params = new URLSearchParams(window.location.search);
if (params.get('debug') === 'true') {
  Object.keys(DEBUG).forEach(key => {
    DEBUG[key] = true;
  });
}
```

### コンソールコマンド
```javascript
// 開発者コンソール用のグローバル関数
window.gameDebug = {
  teleport: (x, y) => game.player.setPosition(x, y),
  addScore: (points) => game.score += points,
  setHealth: (health) => game.player.health = health,
  loadStage: (name) => game.loadStage(name),
  toggleHitboxes: () => DEBUG.SHOW_HITBOXES = !DEBUG.SHOW_HITBOXES
};
```

## セキュリティガイドライン

### クライアントサイドの制限
```javascript
// スコアの検証（サーバーサイドで再計算必須）
class ScoreValidator {
  constructor() {
    this.actions = [];
  }
  
  recordAction(type, value) {
    this.actions.push({
      type,
      value,
      timestamp: Date.now()
    });
  }
  
  calculateScore() {
    // アクションログから正当なスコアを計算
    return this.actions.reduce((total, action) => {
      switch (action.type) {
        case 'coin': return total + 10;
        case 'enemy': return total + 100;
        default: return total;
      }
    }, 0);
  }
}
```

### データ検証
```javascript
// ステージデータの検証
function validateStageData(data) {
  const required = ['name', 'width', 'height', 'playerSpawn', 'goal'];
  
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (data.width < 800 || data.width > 10000) {
    throw new Error('Invalid stage width');
  }
  
  // 追加の検証...
}
```

## トラブルシューティング

### よくある問題と解決策

#### 1. CORS エラー
```bash
# ローカルサーバーを起動
python3 -m http.server 8080
# または
npx http-server -p 8080
```

#### 2. オーディオ再生制限
```javascript
// ユーザーインタラクション後に音声を有効化
document.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}, { once: true });
```

#### 3. パフォーマンス問題
```javascript
// プロファイリング
console.time('update');
game.update();
console.timeEnd('update');

// メモリリーク検出
if (typeof window.gc === 'function') {
  window.gc();
  console.log('Memory:', performance.memory.usedJSHeapSize);
}
```

## リリースチェックリスト

### ビルド前
- [ ] すべてのテストが通過
- [ ] Lintエラーがない
- [ ] コンソールログを削除
- [ ] デバッグモードを無効化
- [ ] 最新の依存関係

### ビルド
```bash
# プロダクションビルド
npm run build:prod

# ビルドサイズ分析
npm run analyze
```

### デプロイ前
- [ ] ビルドファイルの検証
- [ ] 異なるブラウザでテスト
- [ ] モバイルデバイスでテスト
- [ ] パフォーマンステスト
- [ ] セキュリティヘッダー確認

### デプロイ後
- [ ] 本番環境での動作確認
- [ ] エラー監視ツールの確認
- [ ] アナリティクスの確認
- [ ] フィードバックの収集