---
layout: default
title: パワーアップシステム
parent: 開発者向け
---

# パワーアップシステム

## 概要

パワーアップシステムは、プレイヤーに一時的または永続的な能力を付与するシステムです。PowerUpManagerクラスを中心に、柔軟で拡張可能な設計となっています。

## アーキテクチャ

### PowerUpManager

プレイヤーエンティティが持つパワーアップを管理するクラスです。

```typescript
class PowerUpManager {
    private effects: Map<PowerUpType, PowerUpEffect<Player>>;
    private activeEffects: Map<PowerUpType, PowerUpEffectInstance>;
    private owner: Player;
}
```

### PowerUpEffect インターフェース

各パワーアップ効果を実装するためのインターフェースです。

```typescript
interface PowerUpEffect<T extends Entity> {
    onApply(target: T): void;
    onRemove(target: T): void;
    onUpdate?(target: T, deltaTime: number): void;
    takeDamage?(target: T, amount: number): boolean;
}
```

### PowerUpType 列挙型

使用可能なパワーアップの種類を定義します。

```typescript
enum PowerUpType {
    SHIELD_STONE = 'SHIELD_STONE',
    POWER_GLOVE = 'POWER_GLOVE'
}
```

## 実装済みパワーアップ

### シールドストーン（SHIELD_STONE）

プレイヤーに一度だけダメージを無効化するシールドを付与します。

**効果:**
- ダメージを1回無効化
- プレイヤーの左右に括弧型「（）」のシールドスプライトを表示
- シールド破壊時に1秒間の点滅エフェクト
- シールド破壊時に通常のダメージ効果音を再生
- ダメージ無効化後、1秒間の無敵時間を付与してから解除

**実装クラス:** `ShieldEffect`

**ビジュアル:**
- スプライトベースの括弧型シールド（8x32ピクセル）
- プレイヤーのサイズに関わらず下端基準で表示

### パワーグローブ（POWER_GLOVE）

プレイヤーを大きくし、エネルギー弾を発射可能にします。

**効果:**
- プレイヤーサイズが大きくなる（小さい状態の場合）
- プレイヤーの色が赤とゴールドに変化（パレット変更）
- ピリオドキー（.）でエネルギー弾を発射
- エネルギー弾発射時に効果音を再生
- ダメージを受けると効果が解除される

**実装クラス:** `PowerGloveEffect`

**ビジュアル:**
- プレイヤースプライトのパレットを'characterPowerGlove'に変更
- 赤い服とゴールドのアクセントカラー

**設定:** `src/config/PowerGloveConfig.ts`
```typescript
export const PowerGloveConfig = {
    maxBulletsOnScreen: 2,    // 画面内最大弾数
    fireRate: 300,            // 発射間隔（ms）
    bulletSpeed: 5,           // 弾速度
    bulletDamage: 1,          // ダメージ量
    bulletLifetime: 5000,     // 弾の生存時間（ms）
    bulletWidth: 8,           // 弾の幅
    bulletHeight: 8           // 弾の高さ
};
```

## 新しいパワーアップの追加方法

### 1. PowerUpTypeに新しい型を追加

```typescript
// src/types/PowerUpTypes.ts
export enum PowerUpType {
    SHIELD_STONE = 'SHIELD_STONE',
    POWER_GLOVE = 'POWER_GLOVE',
    YOUR_NEW_POWERUP = 'YOUR_NEW_POWERUP'  // 追加
}
```

### 2. PowerUpEffectを実装

```typescript
// src/powerups/YourNewEffect.ts
export class YourNewEffect implements PowerUpEffect<Player> {
    onApply(target: Player): void {
        // パワーアップ適用時の処理
    }
    
    onRemove(target: Player): void {
        // パワーアップ解除時の処理
    }
    
    onUpdate(target: Player, deltaTime: number): void {
        // 毎フレームの更新処理（オプション）
    }
    
    takeDamage(target: Player, amount: number): boolean {
        // ダメージ処理のオーバーライド（オプション）
        // true を返すとデフォルトのダメージ処理をスキップ
        return false;
    }
}
```

### 3. パワーアップアイテムのエンティティを作成

```typescript
// src/entities/YourPowerUpItem.ts
export class YourPowerUpItem extends Entity implements EntityInitializer {
    constructor(x: number, y: number) {
        super(x, y, 16, 16);
        this.spriteKey = 'your_powerup_sprite';
    }
    
    initializeInManager(manager: EntityManager): void {
        manager.addItem(this);
        const physicsSystem = manager.getPhysicsSystem();
        physicsSystem.addEntity(this, physicsSystem.layers.ITEM);
    }
    
    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo?.other || collisionInfo.other.constructor.name !== 'Player') {
            return;
        }
        
        const player = collisionInfo.other as Player;
        const powerUpManager = player.getPowerUpManager();
        
        powerUpManager.applyPowerUp({
            type: PowerUpType.YOUR_NEW_POWERUP,
            permanent: true  // または false（一時的な効果の場合）
        });
        
        this.collected = true;
    }
}
```

### 4. PlayStateで効果を登録

```typescript
// src/states/PlayState.ts
private initializePowerUpEffects(): void {
    const player = this.entityManager.getPlayer();
    if (!player) return;
    
    const powerUpManager = player.getPowerUpManager();
    powerUpManager.registerEffect(PowerUpType.SHIELD_STONE, new ShieldEffect());
    powerUpManager.registerEffect(PowerUpType.POWER_GLOVE, new PowerGloveEffect(this.entityManager));
    powerUpManager.registerEffect(PowerUpType.YOUR_NEW_POWERUP, new YourNewEffect());  // 追加
}
```

### 5. EntityFactoryに登録

```typescript
// src/factories/EntityFactory.ts
import { YourPowerUpItem } from '../entities/YourPowerUpItem';

EntityFactory.register('your_powerup', (x: number, y: number) => {
    return new YourPowerUpItem(x, y);
});
```

## 使用例

### パワーアップの適用

```typescript
const powerUpManager = player.getPowerUpManager();

// 永続的なパワーアップ
powerUpManager.applyPowerUp({
    type: PowerUpType.POWER_GLOVE,
    permanent: true
});

// 一時的なパワーアップ（10秒間）
powerUpManager.applyPowerUp({
    type: PowerUpType.SHIELD_STONE,
    permanent: false,
    duration: 10000
});
```

### パワーアップの確認

```typescript
// 特定のパワーアップを持っているか確認
if (powerUpManager.hasPowerUp(PowerUpType.POWER_GLOVE)) {
    // パワーグローブを持っている
}

// アクティブなパワーアップのリストを取得
const activePowerUps = powerUpManager.getActivePowerUps();
```

### パワーアップの削除

```typescript
powerUpManager.removePowerUp(PowerUpType.POWER_GLOVE);
```

## 注意事項

1. **エフェクトの登録タイミング**: PlayStateの`initializePowerUpEffects`で必ず登録する
2. **EntityManagerへの依存**: 弾丸などを生成する場合はEntityManagerを渡す必要がある
3. **入力処理**: パワーアップ独自の入力は`onUpdate`内でInputManagerを使用
4. **状態の保存**: ステージ遷移時はPlayerのpowerUpManagerから`getActivePowerUps()`で取得

## デバッグ

```javascript
// コンソールでパワーアップを付与
const player = game.stateManager.currentState.entityManager.getPlayer();
player.getPowerUpManager().applyPowerUp({
    type: 'POWER_GLOVE',
    permanent: true
});

// アクティブなパワーアップを確認
console.log(player.getPowerUpManager().getActivePowerUps());
```