# 物理システム

## 概要

本プロジェクトの物理システムは、ECS（Entity Component System）にインスパイアされた設計で実装されています。`PhysicsSystem`がすべてのエンティティの物理演算を管理し、各エンティティは個別の物理パラメータを持つことができます。

## システム構成

### PhysicsSystem
- **役割**: 全エンティティの物理演算を統括
- **主な機能**:
  - 重力の適用
  - 衝突判定
  - 摩擦の適用
  - 最大落下速度の制限

### Entity
- **役割**: 物理演算の対象となる基本クラス
- **必須プロパティ**:
  ```typescript
  physicsLayer: PhysicsLayer;  // 物理レイヤー（衝突判定用）
  ```
- **物理パラメータ**:
  ```typescript
  airResistance?: number;    // 空気抵抗 (0.0～1.0)
  gravityScale?: number;     // 重力倍率 (デフォルト: 1.0)
  maxFallSpeed?: number;     // 最大落下速度
  ```

## PhysicsLayer（物理レイヤー）

衝突判定のグループ分けに使用されるenumです。

```typescript
export enum PhysicsLayer {
  PLAYER = 'player',
  ENEMY = 'enemy',
  ITEM = 'item',
  TERRAIN = 'terrain',
  PROJECTILE = 'projectile'
}
```

### レイヤーごとの衝突ルール
- **PLAYER**: ENEMYと衝突（ダメージ判定）、ITEMと衝突（アイテム取得）
- **ENEMY**: PLAYERと衝突、PROJECTILEと衝突（ダメージ判定）
- **ITEM**: PLAYERと衝突時に効果発動
- **TERRAIN**: すべてのレイヤーと衝突（地形判定）
- **PROJECTILE**: ENEMYと衝突（攻撃判定）

## 物理パラメータ詳細

### airResistance（空気抵抗）
- **範囲**: 0.0～1.0
- **効果**: 垂直方向の速度に対する減衰
- **計算式**: `entity.vy *= (1 - entity.airResistance)`
- **用途**: ふわふわした動きや、ゆっくりとした落下を表現

### gravityScale（重力倍率）
- **デフォルト**: 1.0
- **効果**: エンティティごとの重力の強さを調整
- **計算式**: `effectiveGravity = baseGravity * entity.gravityScale`
- **用途**: 
  - 軽いキャラクター: 0.5～0.8
  - 重いキャラクター: 1.2～1.5
  - 無重力状態: 0.0

### maxFallSpeed（最大落下速度）
- **デフォルト**: システムの設定値（10）
- **効果**: 落下速度の上限を設定
- **用途**: キャラクターごとの落下感の調整

## Variable Jump（可変ジャンプ）

ジャンプボタンを押し続けることで、ジャンプの高さを調整できる機能です。

### 実装詳細
```typescript
// physics.jsonで設定される値
"player": {
    "jumpPower": 8.5,                       // 基本ジャンプ力
    "variableJumpBoost": 2.3,              // 可変ジャンプのブースト値
    "variableJumpBoostMultiplier": 0.4,   // ブースト係数
}

// ジャンプ中の処理
if (jumpButtonHeld && canVariableJump) {
    const boost = variableJumpBoostMultiplier * variableJumpBoost * deltaTime * 60;
    entity.vy -= boost;  // 上向きの力を継続的に適用
}
```

### パラメータ
- **minJumpTime**: 0ms（いつでも中断可能）
- **maxJumpTime**: 400ms（最大保持時間） - `playerConfig.physics.maxJumpTime`で設定
- **variableJumpBoost**: 2.3（現在の設定値）
- **variableJumpBoostMultiplier**: 0.4（ブースト係数）
- **効果**: ボタンを離すタイミングでジャンプ高さを調整可能

**注意**: maxJumpTimeは`player.json`の`physics`セクション内に定義されています。

### スプリングとの相互作用
- スプリングでバウンス後は可変ジャンプ無効（無限ジャンプ防止）
- スプリングの反発力は`baseBounceMultiplier`（3.5）でプレイヤーのジャンプ力を増幅

## テスト用ツール

### jump-test.html
物理パラメータをリアルタイムで調整できるテストページです。

**アクセス方法**:
```
http://localhost:3000/jump-test.html
```

**調整可能なパラメータ**:
- Gravity（重力）
- Jump Power（ジャンプ力）
- Max Fall Speed（最大落下速度）
- Variable Jump Boost（可変ジャンプ強度）
- Gravity Scale（重力倍率）
- Air Resistance（空気抵抗）

## 設定例

### ふわふわキャラクター
```json
{
  "physics": {
    "gravityScale": 0.7,
    "airResistance": 0.2,
    "maxFallSpeed": 8
  }
}
```

### 重量級キャラクター
```json
{
  "physics": {
    "gravityScale": 1.3,
    "airResistance": 0.0,
    "maxFallSpeed": 15
  }
}
```

### 水中のような動き
```json
{
  "physics": {
    "gravityScale": 0.5,
    "airResistance": 0.4,
    "maxFallSpeed": 5
  }
}
```

## 注意事項

1. **座標系の変換**
   - エンティティのスポーン座標は左下基準
   - 物理エンジン内部では左上座標で計算

2. **パフォーマンス**
   - 空気抵抗の値が高すぎると動きが不自然になる
   - gravityScaleは0より小さい値にしない（上向きの重力は未対応）

3. **デバッグ**
   - `Logger.log()` を使用してデバッグ情報を出力
   - production環境では自動的に無効化される