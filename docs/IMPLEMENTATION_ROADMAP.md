# 実装ロードマップ

## 概要
このドキュメントは、ピクセルアート版コインハンターアドベンチャーの実装順序と依存関係を示します。各フェーズは前のフェーズの成果物に依存するため、順序を守ることが重要です。

## フェーズ0: プロジェクト初期化（1-2日）

### タスク
- [ ] 新リポジトリの作成
- [ ] 基本的なプロジェクト構造の設定
- [ ] 開発環境の構築（Webpack/Vite）
- [ ] ESLint、Prettierの設定
- [ ] 基本的なCI/CD設定

### 成果物
```
coin-hunter-adventure-pixel/
├── src/
│   ├── index.js
│   ├── assets/
│   └── styles/
├── public/
│   └── index.html
├── package.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## フェーズ1: コア基盤（3-4日）

### 依存関係
- フェーズ0完了

### タスク
- [ ] Canvasセットアップとゲームループ
- [ ] 基本的な入力システム
- [ ] シーン管理システム
- [ ] アセットローダー（JSON、画像）

### 実装ファイル
```javascript
// src/core/Game.js
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupCanvas();
    this.setupGameLoop();
  }
}

// src/core/InputManager.js
class InputManager {
  constructor() {
    this.keys = {};
    this.setupListeners();
  }
}

// src/core/SceneManager.js
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
  }
}

// src/core/AssetLoader.js
class AssetLoader {
  async loadJSON(path) {}
  async loadImage(path) {}
  async loadAudio(path) {}
}
```

## フェーズ2: レンダリングシステム（3-4日）

### 依存関係
- フェーズ1のCanvas設定
- ピクセルアートアセット（既存）

### タスク
- [ ] ピクセルアートレンダラー
- [ ] スプライトシステム
- [ ] アニメーションシステム
- [ ] カメラシステム

### 実装ファイル
```javascript
// src/rendering/PixelArtRenderer.js
class PixelArtRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }
}

// src/rendering/Sprite.js
class Sprite {
  constructor(imageData, width, height) {
    this.createCanvas();
  }
}

// src/rendering/Animation.js
class Animation {
  constructor(frames, frameDuration) {
    this.frames = frames;
    this.currentFrame = 0;
  }
}

// src/rendering/Camera.js
class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
  }
}
```

## フェーズ3: エンティティシステム（2-3日）

### 依存関係
- フェーズ2のレンダリングシステム

### タスク
- [ ] 基底Entityクラス
- [ ] 物理演算コンポーネント
- [ ] 当たり判定システム
- [ ] エンティティマネージャー

### 実装ファイル
```javascript
// src/entities/Entity.js
class Entity {
  constructor(x, y, width, height) {
    this.transform = { x, y };
    this.size = { width, height };
    this.velocity = { x: 0, y: 0 };
  }
}

// src/physics/Physics.js
const GRAVITY = 0.65;
const MAX_FALL_SPEED = 15;

// src/physics/Collision.js
class CollisionSystem {
  checkCollision(a, b) {}
  resolveCollision(entity, other) {}
}
```

## フェーズ4: UI実装（2-3日）

### 依存関係
- フェーズ2のレンダリングシステム
- PixelFontシステム（既存）

### タスク
- [ ] HUDレイアウト
- [ ] スコア表示
- [ ] ライフ表示
- [ ] タイマー表示
- [ ] メニューシステム

### 実装例
```javascript
// src/ui/HUD.js
class HUD {
  constructor(pixelFont) {
    this.font = pixelFont;
  }
  
  render(ctx, gameState) {
    // スコア
    this.font.drawText(ctx, `SCORE: ${gameState.score}`, 10, 10, 2);
    // ライフ
    this.drawHearts(ctx, gameState.lives);
    // タイマー
    this.font.drawTime(ctx, gameState.timeRemaining, 550, 10, 2);
  }
}
```

## フェーズ5: プレイヤー実装（3-4日）

### 依存関係
- フェーズ3のエンティティシステム
- フェーズ4のUI（デバッグ表示用）

### タスク
- [ ] プレイヤークラス
- [ ] 移動メカニクス
- [ ] ジャンプシステム
- [ ] アニメーション統合
- [ ] ダメージ処理

### キー実装
```javascript
// src/entities/Player.js
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 16, 16);
    this.health = 2;
    this.invulnerableTime = 0;
    this.jumpPower = 12;
    this.moveSpeed = 3.5;
  }
  
  jump() {
    if (this.onGround) {
      this.velocity.y = -this.jumpPower;
      this.onGround = false;
    }
  }
}
```

## フェーズ6: 地形・プラットフォーム（2-3日）

### 依存関係
- フェーズ3のエンティティシステム
- フェーズ5のプレイヤー（テスト用）

### タスク
- [ ] タイルマップシステム
- [ ] プラットフォームクラス
- [ ] 一方通行プラットフォーム
- [ ] 地形の自動タイリング

### 実装
```javascript
// src/terrain/TileMap.js
class TileMap {
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.tiles = [];
  }
}

// src/terrain/Platform.js
class Platform extends Entity {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.solid = true;
    this.oneWay = false;
  }
}
```

## フェーズ7: 敵キャラクター（3-4日）

### 依存関係
- フェーズ5のプレイヤー（相互作用）
- フェーズ6の地形（移動制約）

### タスク
- [ ] 敵の基底クラス
- [ ] スライム実装
- [ ] 鳥実装
- [ ] 踏みつけメカニクス
- [ ] AI/移動パターン

### 実装
```javascript
// src/entities/enemies/Enemy.js
class Enemy extends Entity {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.scoreValue = 100;
  }
}

// src/entities/enemies/Slime.js
class Slime extends Enemy {
  constructor(x, y) {
    super(x, y, 16, 16);
    this.moveSpeed = 0.7;
    this.direction = 1;
  }
}
```

## フェーズ8: アイテム・ギミック（2-3日）

### 依存関係
- フェーズ5のプレイヤー（収集/相互作用）

### タスク
- [ ] コイン実装
- [ ] スプリング実装
- [ ] ゴールフラッグ
- [ ] パーティクルエフェクト

### 実装
```javascript
// src/entities/items/Coin.js
class Coin extends Entity {
  constructor(x, y) {
    super(x, y, 8, 8);
    this.value = 10;
    this.animation = new Animation(coinFrames, 10);
  }
}
```

## フェーズ9: ステージシステム（3-4日）

### 依存関係
- すべてのゲームオブジェクト実装

### タスク
- [ ] ステージローダー
- [ ] ステージデータ検証
- [ ] ステージ遷移
- [ ] セーブ/ロード機能

### 実装
```javascript
// src/stage/StageLoader.js
class StageLoader {
  async loadStage(stagePath) {
    const data = await this.assetLoader.loadJSON(stagePath);
    return this.parseStageData(data);
  }
}
```

## フェーズ10: オーディオシステム（2日）

### 依存関係
- 基本的なゲームプレイ完成

### タスク
- [ ] サウンドマネージャー
- [ ] BGM再生
- [ ] 効果音統合
- [ ] ボリューム調整

## フェーズ11: ポリッシュ（3-4日）

### 依存関係
- すべての基本機能完成

### タスク
- [ ] トランジション効果
- [ ] パーティクルエフェクト強化
- [ ] 画面エフェクト（ダメージフラッシュ等）
- [ ] ゲームオーバー/クリア演出

## フェーズ12: 最適化とテスト（3-4日）

### タスク
- [ ] パフォーマンス最適化
- [ ] メモリリーク修正
- [ ] ブラウザ互換性テスト
- [ ] モバイル対応
- [ ] 統合テスト作成

## 総計見積もり
- **総日数**: 約30-40日
- **1人での開発**: 1.5-2ヶ月
- **2人での開発**: 3-4週間

## マイルストーン

### マイルストーン1: 基本プレイ可能（フェーズ1-5）
- プレイヤーが動いてジャンプできる
- 基本的なUIが表示される
- **期限**: 2週間

### マイルストーン2: ゲームメカニクス完成（フェーズ6-8）
- 敵を倒せる
- アイテムを取れる
- ステージをクリアできる
- **期限**: 3週間

### マイルストーン3: 完成版（フェーズ9-12）
- 複数ステージ
- 音声付き
- 最適化済み
- **期限**: 4-5週間

## リスクと対策

### 技術的リスク
1. **パフォーマンス問題**
   - 対策: 早期からプロファイリング実施
   - 対策: オブジェクトプール使用

2. **ブラウザ互換性**
   - 対策: 主要ブラウザで定期的にテスト
   - 対策: ポリフィル準備

3. **モバイル対応**
   - 対策: タッチ操作を早期に実装
   - 対策: レスポンシブデザイン考慮

### スケジュールリスク
1. **予期せぬバグ**
   - 対策: 各フェーズでテスト時間確保
   - 対策: バッファ期間設定

2. **仕様変更**
   - 対策: コア機能を先に完成
   - 対策: 拡張しやすい設計

## 成功の指標

### 技術面
- [ ] 60FPS安定動作
- [ ] メモリ使用量100MB以下
- [ ] 読み込み時間3秒以内

### ゲームプレイ面
- [ ] 操作レスポンス遅延なし
- [ ] 直感的な操作性
- [ ] バグのない安定動作

### 開発面
- [ ] テストカバレッジ80%以上
- [ ] ドキュメント完備
- [ ] 拡張可能な設計