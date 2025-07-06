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

### 基本パラメータ（調整済み）
```typescript
GRAVITY: 0.433         // 重力加速度（元の66%）
MAX_FALL_SPEED: 10     // 最大落下速度
FRICTION: 0.8          // 地面摩擦
```

### プレイヤー物理パラメータ
```typescript
jumpPower: 5.25        // ジャンプ初速度
variableJumpBoost: 0.15  // 可変ジャンプのブースト値
gravityScale: 1.0      // 重力スケール（個別調整用）
```

### 衝突判定
- **矩形判定**: AABB (Axis-Aligned Bounding Box)
- **プラットフォーム**: 一方通行判定（上からのみ乗れる）

### 物理システムの構成
- **PhysicsSystem**: 全体の物理演算を管理
- **Entity**: 個別の物理プロパティを保持
- **競合回避**: PhysicsSystemが有効な場合、Entity.updatePhysics()はスキップ

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
2. **Enemy** - 敵（Slime、Bird）
3. **Coin** - 収集アイテム
4. **Spring** - ジャンプ台
5. **GoalFlag** - ゴール地点

## アニメーション

- フレームベースアニメーション
- **プレイヤー**: idle(2F), walk(4F), jump(1F)
- **コイン**: spin(4F)
- **敵**: 種別ごとに固有

## 入力システム

### キーボード
- **矢印キー/WASD**: 移動
- **スペース/上矢印/W**: ジャンプ
- **Escape**: ポーズ/メニュー

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