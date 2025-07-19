---
layout: default
title: アニメーションシステム
parent: 開発ガイド
---

# アニメーションシステム

## 概要

統一されたアニメーションシステムにより、すべてのスプライトオブジェクト（プレイヤー、敵、アイテム、オブジェクト）で共通のアニメーション処理を使用できます。

## アーキテクチャ

### 主要コンポーネント

1. **AnimationManager** - アニメーション定義の一元管理
2. **AnimationResolver** - パターンから具体的なフレーム名を生成
3. **AnimationRegistrar** - PixelArtRendererへの自動登録
4. **AnimatedSprite** - エンティティごとのアニメーション状態管理

### AnimationManager

アニメーションとスプライトを一元管理するシングルトンクラスです。

```typescript
const manager = AnimationManager.getInstance();
manager.registerAnimationPattern('player/idle', {
    pattern: 'player/idle',
    frameCount: 1,
    duration: 0,  // 0 = 静止画
    loop: false
});
```

### AnimationResolver

パターンベースのアニメーション定義を解決します。

```typescript
const resolver = new AnimationResolver();
const resolved = resolver.resolvePattern({
    pattern: 'player/walk',
    frameCount: 4,
    duration: 100,
    loop: true
});
// resolved.frames = ['player/walk1', 'player/walk2', 'player/walk3', 'player/walk4']
```

### AnimatedSprite

エンティティが持つアニメーション情報を管理するクラスです。

```typescript
const animatedSprite = new AnimatedSprite('player', {
    idle: 'player/idle',
    walk: 'player/walk',
    jump: 'player/jump'
});

// 状態の変更
animatedSprite.setState('walk');

// レンダリング
animatedSprite.render(renderer, x, y, flipX);
```

## アニメーション定義

`src/config/animationDefinitions.ts`にすべてのアニメーション定義が含まれています。

### 定義フォーマット（改善版）

```typescript
export const ANIMATION_PATTERNS = {
    player: {
        walk: {
            pattern: 'player/walk',    // ベースパターン
            frameCount: 4,              // フレーム数
            duration: 100,              // フレーム間隔（ミリ秒）
            loop: true                  // ループするか
        },
        // カスタムフレームの例（特殊なケース）
        armor_knight_walk: {
            pattern: 'enemies/armor_knight',
            frameCount: 2,
            duration: 400,
            loop: true,
            customFrames: ['enemies/armor_knight_idle', 'enemies/armor_knight_move']
        }
    }
};
```

### 旧定義フォーマット（参考）

```typescript
{
    frames: string[],     // スプライトキーの配列
    duration: number,     // フレーム間隔（ミリ秒）、0=静止画
    loop: boolean        // ループ再生するか
}
```

### カテゴリ

- **player**: プレイヤーキャラクター
- **enemies**: 敵キャラクター
- **items**: アイテム（コインなど）
- **objects**: オブジェクト（ゴールフラグなど）
- **powerups**: パワーアップアイテム
- **effects**: エフェクト
- **projectiles**: 発射物

## 実装方法

### 新しいエンティティへの実装

1. AnimatedSpriteをインポート
```typescript
import { AnimatedSprite } from '../animation/AnimatedSprite';
```

2. コンストラクタで初期化
```typescript
this.animatedSprite = new AnimatedSprite('entity_name', {
    idle: 'category/animation_name',
    move: 'category/animation_name',
    attack: 'category/animation_name'
});
```

3. 状態変更時に更新
```typescript
this.animatedSprite.setState('move');
```

4. renderメソッドで描画
```typescript
render(renderer: PixelRenderer): void {
    if (!this.active) return;
    
    this.animatedSprite.render(renderer, this.x, this.y, this.flipX);
    
    if (renderer.debug) {
        this.renderDebug(renderer);
    }
}
```

## 静止画とアニメーションの統一処理

静止画（1フレーム）もアニメーションとして扱われるため、特別な処理は不要です。

```typescript
// 静止画の定義
idle: {
    frames: ['sprite_key'],
    duration: 0,
    loop: false
}

// アニメーションの定義
walk: {
    frames: ['walk1', 'walk2', 'walk3', 'walk4'],
    duration: 100,
    loop: true
}
```

## パフォーマンス

- アニメーションはキャッシュされ、初回読み込み後は高速にアクセスできます
- 不要なアニメーション更新は自動的にスキップされます
- スプライトの事前読み込みにより、ゲームプレイ中の遅延を防ぎます

## トラブルシューティング

### アニメーションが表示されない

1. アニメーション定義が正しく登録されているか確認
2. スプライトキーが正しいか確認
3. AnimatedSpriteの状態が適切に設定されているか確認

### アニメーションが遅い/速い

`duration`パラメータを調整してください。値はミリ秒単位です。

### エラー: Animation not found

指定したアニメーションキーが登録されていません。`animationDefinitions.ts`を確認してください。

## 視覚的なテスト

### テストステージ

すべてのスプライトとアニメーションを一画面で確認できるテストステージが用意されています。

- **ステージID**: `test-all-sprites`
- **アクセス方法**: 
  - デバッグメニューから「ALL SPRITES TEST」を選択
  - URLパラメータ: `?stage=test-all-sprites`

### E2Eテスト

```bash
node tests/e2e/test-all-sprites-visual.cjs
```

このテストは以下を検証します：
- すべてのエンティティが正しくレンダリングされる
- アニメーション状態の切り替えが動作する
- レンダリングエラーが発生しない
- スクリーンショットを撮影して視覚的な確認が可能