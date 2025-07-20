---
layout: default
title: アニメーションシステム
parent: 開発ガイド
---

# アニメーションシステム

## 概要

エンティティベースのアニメーションシステムにより、各エンティティが自身のアニメーション定義とパレット情報を所有します。このアーキテクチャにより、エンティティごとの独立性と保守性が向上しています。

## アーキテクチャ

### 主要コンポーネント

1. **EntityAnimationManager** - 個々のエンティティのアニメーション管理
2. **MasterPalette** - 52色のマスターパレット定義
3. **AnimationDefinition** - アニメーション定義インターフェース
4. **FourColorPalette** - 4色パレット制約

### EntityAnimationManager

各エンティティが持つアニメーションとパレットを管理するクラスです。

```typescript
// エンティティ内での使用例
protected initializeAnimations(): void {
    const animationDefs = this.getAnimationDefinitions();
    const paletteDef = this.getPaletteDefinition();
    
    this.entityAnimationManager = new EntityAnimationManager(paletteDef);
    this.entityAnimationManager.initialize(animationDefs);
}
```

### MasterPalette

レトロゲームの雰囲気を演出するため、52色のマスターパレットから選択します。

```typescript
export class MasterPalette {
    static getColor(index: number): string {
        // 0x00〜0xFFのインデックスで色を取得
        return this.colors[index] || '#FF00FF';
    }
}
```

### 4色パレット制約

各スプライトは透明色を含む4色のみを使用できます。

```typescript
interface FourColorPalette {
    colors: [
        null,                    // 0: 透明
        MasterPaletteIndex,      // 1: 色1
        MasterPaletteIndex,      // 2: 色2
        MasterPaletteIndex       // 3: 色3
    ];
}
```

## エンティティでの実装

### 必須メソッド

すべてのエンティティは以下の2つのメソッドを実装する必要があります：

```typescript
// アニメーション定義
protected getAnimationDefinitions(): AnimationDefinition[] {
    return [
        {
            id: 'idle',
            sprites: ['enemies/slime_idle1.json'],
            frameDuration: 0,
            loop: false
        },
        {
            id: 'move',
            sprites: ['enemies/slime_idle1.json', 'enemies/slime_idle2.json'],
            frameDuration: 300,
            loop: true
        }
    ];
}

// パレット定義
protected getPaletteDefinition(): EntityPaletteDefinition {
    return {
        default: {
            colors: [null, 0x60, 0x62, 0x00]  // 透明, 緑1, 緑2, 黒
        },
        variants: {
            powerup: {
                colors: [null, 0x41, 0x43, 0x00]  // パワーアップ時の色
            }
        }
    };
}
```

### 実装例（スライムエンティティ）

```typescript
export class Slime extends Enemy {
    constructor(x: number, y: number) {
        super(x, y, 16, 16);
        // アニメーションマネージャーは親クラスで初期化される
        this.setAnimation('idle');
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.grounded) {
            this.vx = this.moveSpeed * this.direction;
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('move');
            }
        }
    }
    
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['enemies/slime_idle1.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'move',
                sprites: ['enemies/slime_idle1.json', 'enemies/slime_idle2.json'],
                frameDuration: 300,
                loop: true
            }
        ];
    }
    
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [null, 0x60, 0x62, 0x00]
            }
        };
    }
}
```

## スプライトフォーマット

スプライトは数値配列フォーマットで定義されます：

```json
{
  "name": "slime_idle1",
  "width": 16,
  "height": 16,
  "description": "スライム待機アニメーション1",
  "data": [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
    // ... 各ピクセルの色インデックス（0-3）
  ]
}
```

- `0`: 透明
- `1`: パレットの1番目の色
- `2`: パレットの2番目の色
- `3`: パレットの3番目の色

## アニメーション状態の管理

```typescript
// アニメーション状態の変更
this.entityAnimationManager.setState('jump');

// パレットバリアントの変更（パワーアップなど）
this.entityAnimationManager.setPaletteVariant('powerGlove');

// フレーム更新（Entity.update内で自動的に呼ばれる）
this.entityAnimationManager.update(deltaTime);
```

## パフォーマンス最適化

- スプライトは初回ロード時にキャッシュされます
- アニメーションフレームの更新は必要な場合のみ実行されます
- パレット適用はピクセル単位で効率的に処理されます

## トラブルシューティング

### エンティティが表示されない

1. `getAnimationDefinitions()`と`getPaletteDefinition()`が実装されているか確認
2. スプライトファイルのパスが正しいか確認
3. `super.render(renderer)`を呼び出しているか確認

### アニメーションが動かない

1. `frameDuration`が0より大きい値に設定されているか確認
2. 複数のスプライトが定義されているか確認
3. `entityAnimationManager.setState()`で状態を変更しているか確認

### 色が正しく表示されない

1. マスターパレットのインデックスが正しいか確認（0x00〜0xFF）
2. スプライトデータの色インデックスが0〜3の範囲内か確認
3. パレット定義の配列が4要素（null + 3色）になっているか確認

## 視覚的なテスト

### テストステージ

すべてのスプライトとアニメーションを一画面で確認できるテストステージが用意されています。

- **ステージID**: `test-all-sprites`
- **アクセス方法**: 
  - デバッグメニューから「ALL SPRITES TEST」を選択
  - URLパラメータ: `?s=test-all-sprites&skip_title=true`

### E2Eテスト

```bash
node tests/e2e/test-all-sprites-visual.cjs
```

このテストは以下を検証します：
- すべてのエンティティが正しくレンダリングされる
- アニメーション状態の切り替えが動作する
- パレットシステムが正しく機能する
- レンダリングエラーが発生しない

## 移行ガイド

旧AnimatedSpriteシステムからの移行：

1. AnimatedSpriteの使用を削除
2. `getAnimationDefinitions()`メソッドを実装
3. `getPaletteDefinition()`メソッドを実装
4. `render()`メソッドで`super.render(renderer)`を呼び出す
5. アニメーション状態の変更は`entityAnimationManager.setState()`を使用