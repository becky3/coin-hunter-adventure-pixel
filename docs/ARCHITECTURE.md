# アーキテクチャドキュメント

このドキュメントは、coin-hunter-adventure-pixel プロジェクトの設計方針とディレクトリ構造を定義します。

## 1. ディレクトリ構造

```
coin-hunter-adventure-pixel/
├── src/                      # ソースコード
│   ├── core/                # コアシステム
│   │   ├── Game.js         # メインゲームクラス
│   │   ├── GameLoop.js     # ゲームループ管理
│   │   └── InputManager.js # 入力処理
│   │
│   ├── states/              # ゲーム状態管理
│   │   ├── GameStateManager.js
│   │   ├── MenuState.js
│   │   ├── PlayState.js
│   │   └── GameOverState.js
│   │
│   ├── rendering/           # 描画システム
│   │   ├── PixelRenderer.js
│   │   ├── Camera.js
│   │   └── SpriteCache.js
│   │
│   ├── entities/            # ゲームエンティティ
│   │   ├── Entity.js       # 基底クラス
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   ├── Coin.js
│   │   └── Platform.js
│   │
│   ├── levels/              # レベルシステム
│   │   ├── LevelLoader.js
│   │   ├── LevelManager.js
│   │   └── data/          # レベルデータJSON
│   │
│   ├── assets/              # アセット管理
│   │   ├── AssetLoader.js
│   │   └── sprites/        # スプライトデータ
│   │
│   ├── audio/               # 音声システム
│   │   ├── AudioManager.js
│   │   └── Music.js
│   │
│   ├── physics/             # 物理演算
│   │   ├── Physics.js
│   │   └── Collision.js
│   │
│   ├── ui/                  # UI要素
│   │   ├── HUD.js
│   │   ├── Menu.js
│   │   └── Dialog.js
│   │
│   ├── utils/               # ユーティリティ
│   │   ├── pixelArt.js
│   │   ├── spriteLoader.js
│   │   └── constants.js
│   │
│   └── index.js            # エントリーポイント
│
├── public/                  # 静的ファイル
│   └── index.html
│
├── docs/                    # ドキュメント
│   ├── GAME_SPECIFICATION.md
│   ├── TECHNICAL_SPECIFICATION.md
│   └── PIXEL_ART_SPECIFICATION.md
│
├── tests/                   # テストファイル
│   └── *.test.js
│
├── scripts/                 # ビルド・ユーティリティスクリプト
│
├── package.json
├── vite.config.js
├── .eslintrc.json
└── README.md
```

## 2. アーキテクチャ概要

### レイヤー構造

```
┌─────────────────────────────────────┐
│          Application Layer          │ <- index.js, Game.js
├─────────────────────────────────────┤
│           Game Logic Layer          │ <- States, Entities, Levels
├─────────────────────────────────────┤
│          System Layer               │ <- Rendering, Physics, Audio
├─────────────────────────────────────┤
│          Utility Layer              │ <- Utils, Constants
└─────────────────────────────────────┘
```

### 主要コンポーネント

#### 1. Core (コアシステム)
- **Game**: アプリケーション全体の制御
- **GameLoop**: 60FPSのゲームループ管理
- **InputManager**: キーボード・マウス入力の統合管理

#### 2. States (状態管理)
- **GameStateManager**: 状態遷移の管理
- 各種State: メニュー、プレイ、ゲームオーバーなど

#### 3. Rendering (描画システム)
- **PixelRenderer**: Canvas描画の抽象化
- **Camera**: ビューポート管理
- **SpriteCache**: スプライトのキャッシュ管理

#### 4. Entities (エンティティ)
- **Entity**: 基底クラス（位置、速度、描画など）
- 各種エンティティ: プレイヤー、敵、アイテムなど

## 3. データフロー

### ゲームループ
```
┌─────────────┐
│   Input     │
└──────┬──────┘
       ↓
┌─────────────┐
│   Update    │ <- Game Logic, Physics
└──────┬──────┘
       ↓
┌─────────────┐
│   Render    │ <- Canvas Drawing
└──────┬──────┘
       ↓
    (repeat)
```

### 状態遷移
```
Menu → Play → GameOver
  ↑              ↓
  └──────────────┘
```

## 4. モジュール間の依存関係

### 依存関係の原則
- 上位レイヤーは下位レイヤーに依存可
- 同一レイヤー内は最小限の依存
- 循環参照は禁止

### 主要な依存関係
```
Game
├── GameStateManager
├── InputManager
├── AssetLoader
└── AudioManager

GameStateManager
└── States (Menu, Play, etc.)

PlayState
├── LevelManager
├── EntityManager
└── PixelRenderer

Entity
├── Physics
└── PixelRenderer
```

## 5. Canvas描画アーキテクチャ

### レンダリングパイプライン
1. **Clear**: Canvas全体をクリア
2. **Background**: 背景レイヤー描画
3. **Entities**: ゲームオブジェクト描画（Zオーダー順）
4. **Foreground**: 前景レイヤー描画
5. **UI**: HUD、メニューなど描画

### 最適化戦略
- **Dirty Rectangle**: 変更部分のみ再描画
- **Object Pooling**: エンティティの再利用
- **Sprite Caching**: 頻繁に使用するスプライトをキャッシュ

## 6. アセット管理

### スプライトデータ形式
```json
{
    "name": "player_idle",
    "width": 16,
    "height": 16,
    "frames": 4,
    "pixels": [...],
    "palette": "character"
}
```

### アセットローディング
1. JSON形式のスプライトデータを読み込み
2. パレット情報と組み合わせてピクセルデータ生成
3. ImageDataまたはOffscreenCanvasにキャッシュ

## 7. 物理システム

### 基本仕様
- **重力**: 0.65 (定数)
- **最大落下速度**: 15
- **衝突判定**: AABBベース

### エンティティ物理プロパティ
```typescript
interface PhysicsEntity extends Entity {
    vx: number;
    vy: number;
    grounded: boolean;
    physicsLayer?: PhysicsLayer;
    onCollision?: (other: Entity, info: CollisionInfo) => void;
}
```

## 8. 音声システム

### 構成
- **MusicSystem**: BGM・効果音の統合管理
- Web Audio APIを使用したプログラム音源
- BGMループ、効果音再生、ミュート制御

## 9. エラーハンドリング方針

### レベル別対応
1. **Critical**: ゲーム続行不可 → エラー画面表示
2. **Error**: 機能に影響 → フォールバック処理
3. **Warning**: 軽微な問題 → ログ出力のみ

### 主なエラーケース
- アセット読み込み失敗
- レベルデータ不正
- Canvas取得失敗

## 10. パフォーマンス目標

### 基準値
- **FPS**: 60fps維持（55fps以上）
- **描画時間**: 16ms以内
- **メモリ使用量**: 100MB以下
- **初期読み込み**: 3秒以内

### 計測ポイント
- フレームレート
- 描画時間
- エンティティ数
- メモリ使用量