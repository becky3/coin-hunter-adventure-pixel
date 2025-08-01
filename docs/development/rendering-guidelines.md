---
layout: default
title: レンダリングガイドライン
parent: 開発者向け
---

# レンダリングガイドライン

## 概要

このドキュメントでは、Coin Hunter Adventure Pixelにおける描画処理の実装ガイドラインを説明します。

## 基本原則

### 1. PixelRendererの使用

**すべての描画操作はPixelRendererを通じて行う**

```typescript
// ❌ 悪い例：Canvas APIの直接使用
ctx.fillRect(x, y, width, height);
ctx.globalAlpha = 0.5;

// ✅ 良い例：PixelRendererを使用
renderer.drawRect(x, y, width, height, colorIndex);
renderer.setAlpha(0.5);
```

### 2. パレットシステムの正しい使用

**マスターパレットインデックスの直接使用は禁止**

```typescript
// ❌ 悪い例：マスターパレットインデックスの直接使用
renderer.drawRect(x, y, width, height, 0x62);

// ✅ 良い例：パレット定義を使用
const colorIndex = DEBUG_PALETTE.default.colors[2];
renderer.drawRect(x, y, width, height, colorIndex);
```

## PixelRenderer API

### 基本的な描画メソッド

```typescript
// 矩形描画
drawRect(x: number, y: number, width: number, height: number, colorIndex: number | null, fill?: boolean): void

// テキスト描画
drawText(text: string, x: number, y: number, colorIndex: number | null, alpha?: number): void

// 中央揃えテキスト
drawTextCentered(text: string, centerX: number, y: number, colorIndex: number | null): void

// スプライト描画
drawSprite(sprite: SpriteData | HTMLCanvasElement, x: number, y: number, flipX?: boolean): void
```

### 透明度制御

```typescript
// 透明度を設定（0.0～1.0）
renderer.setAlpha(0.5);

// 描画処理...

// 透明度をリセット
renderer.resetAlpha();
```

### Canvas要素の作成

```typescript
// 空のCanvas作成
const canvas = renderer.createCanvas(width, height);

// 単色で塗りつぶされたCanvas作成
const solidCanvas = renderer.createSolidColorCanvas(width, height, colorIndex);

// パターンからImageData作成
const imageData = renderer.createImageDataFromPattern(pattern, colorIndex);
```

## パレットシステム

### エンティティパレット

各エンティティは`getPaletteDefinition()`メソッドで4色パレットを定義：

```typescript
protected getPaletteDefinition(): EntityPaletteDefinition {
    return {
        default: {
            colors: [
                null,    // 0: 透明
                0x00,    // 1: 黒
                0x62,    // 2: 明るい緑
                0x31     // 3: 赤
            ]
        }
    };
}
```

### 共通パレット

デバッグ・UI用の共通パレットは`CommonPalettes`で定義：

```typescript
import { DEBUG_PALETTE, PERFORMANCE_PALETTE, ENEMY_HP_PALETTE, TEST_TILE_PALETTE } from '../rendering/CommonPalettes';

// 使用例
const bgColor = PERFORMANCE_PALETTE.default.colors[1];  // 黒（背景）
const textColor = PERFORMANCE_PALETTE.default.colors[2]; // 緑（テキスト）
```

## nullチェックの扱い

描画メソッドは内部でnullチェックを行い、nullの場合はエラーをスローします：

```typescript
// nullチェックは不要（PixelRenderer内部で処理）
const colorIndex = palette.default.colors[1];
renderer.drawRect(x, y, width, height, colorIndex);  // colorIndexがnullならエラー
```

## 禁止事項

1. **Canvas Context（ctx）への直接アクセス**
   - `renderer.ctx`の使用は禁止
   - すべての操作はPixelRendererのメソッドを使用

2. **マスターパレットインデックスの直接指定**
   - `0x00`～`0x91`の直接使用は禁止
   - 必ずパレット定義を経由

3. **Canvas要素の直接作成**
   - `document.createElement('canvas')`は使用しない
   - `renderer.createCanvas()`を使用

## 実装例

### UI要素の描画

```typescript
class HUDManager {
    render(renderer: PixelRenderer): void {
        // 背景を描画
        const bgColor = UI_PALETTE.default.colors[1];
        renderer.drawRect(x, y, width, height, bgColor);
        
        // テキストを描画
        const textColor = UI_PALETTE.default.colors[2];
        renderer.drawText('SCORE: 1000', x, y, textColor);
    }
}
```

### 半透明エフェクト

```typescript
// 半透明の影を描画
renderer.setAlpha(0.5);
renderer.drawRect(shadowX, shadowY, width, height, shadowColor);
renderer.resetAlpha();
```

### パターンタイルの作成

```typescript
// 8x8のチェッカーパターン
const pattern = [
    [1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1],
    // ...
];

const imageData = renderer.createImageDataFromPattern(pattern, colorIndex);
const canvas = renderer.createCanvas(8, 8);
const ctx = canvas.getContext('2d');
if (ctx) {
    ctx.putImageData(imageData, 0, 0);
}
renderer.drawSprite(canvas, x, y);
```

## まとめ

- すべての描画はPixelRendererを通じて行う
- パレットシステムを正しく使用する
- Canvas APIの直接使用は避ける
- nullチェックは描画メソッド内で自動的に行われる

これらのガイドラインに従うことで、一貫性のある保守しやすいレンダリングコードを実装できます。