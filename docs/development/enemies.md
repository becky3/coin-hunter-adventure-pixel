---
layout: default
title: 敵キャラクター実装ガイド
parent: 開発者向け
---

# 敵キャラクター実装ガイド

このドキュメントでは、敵キャラクターの実装方法と既存の敵の仕様について説明します。

## 基本クラス構造

すべての敵は`Enemy`基本クラスを継承します：

```typescript
export class Enemy extends Entity {
    public maxHealth: number;
    public health: number;
    public damage: number;
    public moveSpeed: number;
    public direction: number;
    public aiType: AIType;
    // ...
}
```

## 実装済み敵キャラクター

### Slime（スライム）
- **ファイル**: `src/entities/enemies/Slime.ts`
- **特徴**:
  - 地面を左右に往復移動
  - 壁や足場の端で方向転換
  - 物理エンジンによる重力あり

### Bird（鳥）
- **ファイル**: `src/entities/enemies/Bird.ts`
- **特徴**:
  - 水平飛行＋波状の上下運動
  - 物理エンジンによる重力なし
  - 画面端でループ

### Bat（コウモリ）
- **ファイル**: `src/entities/enemies/Bat.ts`
- **特徴**:
  - 天井にぶら下がって待機（`hanging`状態）
  - プレイヤーのX軸距離80px以内で起動
  - 放物線飛行（天井16px ⇔ 地面160px）
  - 左右120pxの範囲をパトロール
  - **物理エンジンを使わない独自の移動実装**

#### Batの実装詳細

```typescript
// 主要なプロパティ
this.physicsEnabled = false;  // 物理エンジンを無効化
this.gravity = false;         // 重力なし
this.collidable = true;       // 衝突判定は有効

// 移動パラメータ
this.baseSpeed = 60;          // 水平移動速度
this.patrolRange = 120;       // パトロール範囲
this.oneCycleDuration = 2;    // 上下1サイクルの時間（秒）
this.ceilingY = 16;          // 天井のY座標
this.groundY = 160;          // 地面のY座標
```

#### 放物線飛行の実装

```typescript
// quadratic easing を使用した垂直移動
const cycleProgress = (this.flyTime % this.oneCycleDuration) / this.oneCycleDuration;
let targetY;
if (cycleProgress < 0.5) {
    // 下降時：加速
    const t = cycleProgress * 2;
    const easedT = t * t;
    targetY = this.ceilingY + ((this.groundY - this.ceilingY) * easedT);
} else {
    // 上昇時：減速
    const t = (cycleProgress - 0.5) * 2;
    const easedT = 1 - ((1 - t) * (1 - t));
    targetY = this.groundY - ((this.groundY - this.ceilingY) * easedT);
}
```

## 新しい敵の追加方法

1. **クラスの作成**
   ```typescript
   // src/entities/enemies/NewEnemy.ts
   export class NewEnemy extends Enemy {
       constructor(x: number, y: number) {
           super(x, y, width, height);
           // 初期化処理
       }
       
       protected updateAI(deltaTime: number): void {
           // AI処理
       }
   }
   ```

2. **EntityManagerへの登録**
   ```typescript
   // src/managers/EntityManager.ts
   case 'newenemy':
       entity = new NewEnemy(config.x * TILE_SIZE, config.y * TILE_SIZE);
       this.enemies.push(entity);
       break;
   ```

3. **リソース設定の追加**
   - `src/config/resources/characters.json`に設定を追加
   - スプライトファイルを`src/assets/sprites/enemies/`に配置

4. **物理エンジンの考慮**
   - 重力が必要な敵：`this.gravity = true; this.physicsEnabled = true;`
   - 独自の移動パターン：`this.physicsEnabled = false;`

## テスト

敵の実装後は以下をテストしてください：

1. **表示確認**: スプライトが正しく表示されるか
2. **移動確認**: 意図した動きをするか
3. **衝突判定**: プレイヤーとの接触でダメージを与えるか
4. **踏みつけ**: 上から踏めるか、スコアが加算されるか

E2Eテストの作成例は`tests/e2e/test-bat.cjs`を参考にしてください。