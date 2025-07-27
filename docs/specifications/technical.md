---
layout: default
title: 技術仕様
parent: 仕様書
---

# 技術仕様

## 基本アーキテクチャ

- **設計パターン**: Entity-Component-System (ECS) の簡易実装
- **メインループ**: 60FPS固定フレームレート (requestAnimationFrame使用)
- **描画**: Canvas API (2D Context)
- **言語**: TypeScript

## 画面仕様

### 解像度
- **論理解像度**: 256×240ピクセル
- **表示解像度**: 768×720ピクセル (3倍スケール)
- **座標系**: 
  - 物理エンジン内部: 左上原点 (0,0)、X軸右正、Y軸下正
  - ステージデータ: エンティティのスポーン座標は左下基準（足元の位置）

### レンダリング設定
```typescript
// ピクセルパーフェクト描画
ctx.imageSmoothingEnabled = false;
```

## 物理演算

### 基本パラメータ
```typescript
GRAVITY: 0.65          // 重力加速度
MAX_FALL_SPEED: 15     // 最大落下速度
FRICTION: 0.8          // 地面摩擦
```

### プレイヤー物理パラメータ

プレイヤーの物理挙動は以下のパラメータで制御されます：

- **移動関連**: 通常速度、ダッシュ倍率、加速時間
- **ジャンプ関連**: ジャンプ力、可変ジャンプ、滞空時間
- **物理関連**: 重力影響、空気抵抗、最大落下速度
- **サイズ関連**: 通常時と小サイズ時のコリジョンサイズ

詳細な値は `src/config/resources/characters.json` で管理されています。

### 衝突判定
- **矩形判定**: AABB (Axis-Aligned Bounding Box)
- **プラットフォーム**: 一方通行判定（上からのみ乗れる）
- **地面判定**: プレイヤーは中心点のみで判定（1マスの穴に落ちるため）
- **垂直衝突**: プレイヤー落下時は中心点のみで判定

### 物理システムの構成
- **PhysicsSystem**: 全体の物理演算を管理
- **Entity**: 個別の物理プロパティを保持
- **競合回避**: PhysicsSystemが有効な場合、Entity.updatePhysics()はスキップ

### 穴の落下判定
- プレイヤーのコリジョン幅は14ピクセル（タイルサイズ16ピクセルより小さい）
- これにより1マス幅の穴に落ちることが可能
- 描画サイズとコリジョンサイズは独立（描画は変更なし）

## エンティティ構成

### 基底クラス
```typescript
Entity {
    id, x, y, width, height    // 基本プロパティ
    vx, vy                     // 速度
    grounded                   // 接地フラグ
    active                     // アクティブ状態
    update(deltaTime)          // 更新処理
    render(renderer)           // 描画処理
}
```

### エンティティ種別
1. **Player** - プレイヤーキャラクター
2. **Enemy** - 敵（Slime、Bird、Bat、Spider、ArmorKnight）
3. **Coin** - 収集アイテム
4. **Spring** - ジャンプ台
5. **GoalFlag** - ゴール地点
6. **PowerGlove** - パワーアップアイテム
7. **ShieldStone** - シールドアイテム
8. **FallingFloor** - 落ちる床ギミック

## アニメーション

### エンティティベースアニメーションシステム

各エンティティが自身のアニメーション定義とパレット情報を所有します。

### パレットシステム
- **マスターパレット**: 52色の事前定義パレット（0x00～0x91）
- **4色制限**: 各スプライトは透明色を含む最大4色まで
- **ステージ依存パレット**: すべてのスプライトがステージごとに異なる色で表示
- **動的パレット切り替え**: PowerGlove取得時などに実行時でパレットを変更
- **パレットインデックス**: `SpritePaletteIndex` enumで管理
  - CHARACTER (0)
  - ENEMY_BASIC (1)
  - ENEMY_SPECIAL (2)
  - ITEMS (3)
  - TILES_GROUND (4)
  - TILES_HAZARD (5)
  - TERRAIN_OBJECTS (6)
  - ENVIRONMENT_NATURE (7)
  - ENVIRONMENT_SKY (8)
  - UI_ELEMENTS (9)
  - EFFECTS (10)
  - POWERUPS (11)
  - CHARACTER_POWERGLOVE (12)

### アニメーション例
- **プレイヤー**: idle, walk(4F), jump, fall
- **コイン**: spin(4F) - 回転アニメーション
- **スライム**: idle, move(2F)
- **コウモリ**: hang, fly(2F)
- **クモ**: idle, walk(2F)
- **FallingFloor**: normal, shaking(2F), broken

## 入力システム

### キーボード
- **矢印キー/WASD**: 移動
- **Shift（左右）+ 移動キー**: ダッシュ（高速移動）
- **スペース/上矢印/W**: ジャンプ
- **ピリオド（.）**: 攻撃（パワーグローブ装備時）
- **Escape**: ポーズ/メニュー
- **M**: ミュート切り替え
- **P**: ポーズ

### タッチ対応
- 画面左半分: 左移動
- 画面右半分: 右移動
- 画面上部: ジャンプ

## ステージ管理

### データ形式（JSON）
```json
{
    "id": "stage1-1",
    "name": "STAGE 1-1",
    "width": 180,
    "height": 15,
    "tileSize": 16,
    "backgroundColor": "#87CEEB",
    "playerSpawn": { "x": 2, "y": 11 },  // タイル座標（左下基準）
    "goal": { "x": 177, "y": 11 },       // タイル座標（左下基準）
    "timeLimit": 400,
    "tilemap": [[...], ...],
    "entities": [
        {
            "type": "coin",
            "x": 5,   // タイル座標（左下基準）
            "y": 11   // タイル座標（左下基準）
        }
    ]
}
```

### ステージリスト（stages.json）
```json
{
    "stages": [
        {
            "id": "stage1-1",
            "name": "STAGE 1-1",
            "description": "First stage",
            "filename": "stage1-1.json"
        }
    ]
}
```

## 最適化手法

### レンダリング
1. ダブルバッファリング
2. 視錐台カリング
3. レイヤー分離
   - 背景レイヤー（雲、木）
   - タイルマップレイヤー
   - エンティティレイヤー
   - HUDレイヤー
4. 背景要素のカリング（画面外の要素をスキップ）

### ロジック
1. 空間分割による衝突判定
2. オブジェクトプール
3. 早期リターン

## デバッグ機能

```typescript
DEBUG = {
    SHOW_HITBOX: false,    // 当たり判定表示
    SHOW_FPS: true,        // FPS表示
    INVINCIBLE: false,     // 無敵モード
    STAGE_SELECT: true     // ステージ選択
}
```

## 開発環境

- **ビルドツール**: Vite
- **テスト**: Puppeteer (E2Eテスト)
- **対応ブラウザ**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

### テスト環境
- **E2Eテスト**: `tests/e2e/` ディレクトリ
- **テストログ**: `tests/logs/` に自動保存
- **スクリーンショット**: `tests/screenshots/` に保存

## エラーハンドリング

- **音声エラー**: サイレントモードで継続
- **画像エラー**: プレースホルダー表示
- **データエラー**: エラーメッセージ表示

## コード品質基準

### TypeScript型安全性
- **strictモード**: 有効（tsconfig.json）
- **any型**: 使用禁止
- **型推論**: 明示的な型定義を推奨
- **イベント型**: 専用インターフェース使用

### ESLint設定
```json
{
  "no-unused-vars": ["error"],
  "@typescript-eslint/no-unused-vars": ["error"],
  "@typescript-eslint/no-explicit-any": "warn"
}
```

### コード規約
- 未使用インポートの削除
- 重複コードの排除
- ベンダープレフィックスの適切な型定義