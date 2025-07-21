---
layout: default
title: ArmorKnight仕様
parent: 仕様書
---

# ArmorKnight（アーマーナイト）仕様書

## 概要
ArmorKnightは重装甲の敵キャラクターで、通常の踏みつけ攻撃では倒すことができない強敵です。プレイヤーを検知すると高速で突進する特徴を持ちます。

## 基本パラメータ

### 物理特性
- **サイズ**: 16x16ピクセル
- **通常移動速度**: 0.15
- **突進速度**: 0.9（通常の6倍）
- **体力**: 3
- **ダメージ**: 1

### AI設定
- **AIタイプ**: patrol（巡回）
- **検知範囲**:
  - 横方向: 84ピクセル
  - 縦方向: 128ピクセル
- **攻撃範囲**: 20ピクセル

## 特徴

### 1. 踏みつけ無効
- プレイヤーが上から踏みつけても倒せない
- 踏みつけ時はプレイヤーを高く跳ね返す（反発力: -16）
- `canBeStomped()` が `false` を返す

### 2. 突進攻撃
- プレイヤーを検知すると突進状態に移行
- 移動速度が通常の6倍に増加
- アニメーションが「charge」に変更
- プレイヤーの方向に自動的に向きを変える

### 3. 検知システム
- 矩形範囲でプレイヤーを検知
- 縦方向の検知範囲が広い（ジャンプ中のプレイヤーも検知）
- EventBusを使用してプレイヤーの位置を取得

### 4. ダメージ処理
- 通常の踏みつけではダメージを受けない
- 特殊攻撃（projectile, powerup）でのみダメージを受ける
- 被ダメージ時の無敵時間中は点滅表示

## 実装詳細

### クラス構造
```typescript
class ArmorKnight extends Enemy implements EntityInitializer {
    // 突進関連
    private chargeSpeed: number;
    private normalSpeed: number;
    private isCharging: boolean;
    private playerInRange: Player | null;
    
    // 検知範囲
    private detectRangeWidth: number;
    private detectRangeHeight: number;
}
```

### 主要メソッド
- `updateAI()`: AI更新処理（プレイヤー検知と突進制御）
- `isPlayerInRange()`: プレイヤーが検知範囲内にいるか判定
- `findPlayer()`: EventBusを使用してプレイヤーを検索
- `canBeStomped()`: 踏みつけ可能かを返す（常にfalse）
- `takeDamage()`: ダメージ処理（特殊攻撃のみ有効）

## アニメーション
- **idle**: 待機状態
- **move**: 通常移動
- **charge**: 突進状態

## スプライト
- `enemies/armor_knight_idle.json`: 待機スプライト
- `enemies/armor_knight_move.json`: 移動・突進スプライト

## パレット設定
```typescript
colors: [
    null,  // 透明
    0x01,  // 暗い色（装甲の影）
    0x42,  // 中間色（装甲の基本色）
    0x43   // 明るい色（装甲のハイライト）
]
```

## 使用例

### ステージ配置
```json
{
    "type": "armor_knight",
    "x": 18,
    "y": 12
}
```

### プログラムでの生成
```typescript
const armorKnight = ArmorKnight.create(x, y);
armorKnight.initializeInManager(entityManager);
```

## ゲームプレイ上の役割
- 通常の敵より強力な障害物として機能
- プレイヤーに回避や特殊アイテムの使用を強制
- ステージの難易度調整に使用

## 関連ファイル
- `/src/entities/enemies/ArmorKnight.ts`: 実装
- `/src/config/resources/characters.json`: パラメータ設定
- `/tests/e2e/test-armor-knight-*.cjs`: E2Eテスト
- `/src/levels/data/test-armor-knight.json`: テストステージ