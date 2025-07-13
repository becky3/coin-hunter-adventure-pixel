# 背景描画最適化実装記録

作成日: 2025-07-13

## 概要

Issue #157「背景描画の最適化」の実装記録です。GPU負荷削減（Issue #154）の一環として、背景描画システムを全面的に最適化しました。

## 実装内容

### 1. 動的要素生成システム

**BackgroundElementPool.ts**
- オブジェクトプーリングパターンを実装
- 要素の再利用によりGC負荷を削減
- アクティブ/非アクティブな要素を効率的に管理

**BackgroundChunkManager.ts**
- 空間分割（512pxチャンク）による効率的な要素管理
- カメラ位置に基づいて必要な要素のみを高速検索
- O(n)からO(log n)への計算量改善

### 2. オフスクリーンレンダリング

**静的要素（木）の事前描画**
- チャンク単位でオフスクリーンCanvasに事前レンダリング
- 一度描画した内容を再利用することで描画呼び出しを削減
- メモリ効率を考慮した遠距離チャンクの自動クリーンアップ

**動的要素（雲）の分離**
- アニメーションが必要な要素のみ毎フレーム更新
- 静的レイヤーと動的レイヤーの効率的な合成

### 3. 最適化の効果

**処理要素数の削減**
- 改善前: 毎フレーム70要素をループ処理
- 改善後: 表示範囲の約10-15要素のみ処理

**描画呼び出しの削減**
- 静的要素（木）: チャンク単位の一括描画
- 動的要素（雲）: 表示範囲のみ個別描画

**メモリ使用の最適化**
- オブジェクトプーリングによるGC負荷削減
- 遠距離チャンクの自動解放

## ファイル構成

### 新規作成
- `src/rendering/BackgroundElementPool.ts` - 要素プール管理
- `src/rendering/BackgroundChunkManager.ts` - 空間分割管理
- `tests/e2e/test-background-performance.cjs` - パフォーマンステスト

### 更新
- `src/rendering/BackgroundRenderer.ts` - 最適化版に完全置き換え
- `src/states/PlayState.ts` - 新しいBackgroundRendererを使用
- `docs/development/testing.md` - テスト一覧を更新

### 削除
- 元の`BackgroundRenderer.ts`（単純な実装）
- 中間実装ファイル（OptimizedBackgroundRenderer.ts）
- 最適化フラグ設定ファイル

## 技術的詳細

### チャンク管理
```typescript
// 512px単位でチャンク分割
private chunkSize: number = 512;

// チャンクインデックスの計算
private getChunkIndex(x: number): number {
    return Math.floor(x / this.chunkSize);
}
```

### オフスクリーンレンダリング
```typescript
// チャンク作成時に静的要素を事前描画
const canvas = document.createElement('canvas');
canvas.width = this.chunkSize;
canvas.height = this.chunkHeight;

// pixelArtRendererを共有して描画
if (mainRenderer && mainRenderer.pixelArtRenderer) {
    tempRenderer.pixelArtRenderer = mainRenderer.pixelArtRenderer;
}

// メインキャンバスへの高速転写
renderer.ctx.drawImage(chunk.canvas, ...);
```

### 動的要素の更新タイミング
```typescript
// 初回レンダリングまたは50px以上移動時に更新
if (this.isFirstRender || Math.abs(camera.x - this.lastCameraX) > 50) {
    this.updateActiveCloudElements(viewportStart, viewportEnd);
}
```

### メモリ管理
```typescript
// カメラから離れたチャンクを自動解放
const maxDistance = this.chunkSize * 3; // 3チャンク分の距離
```

## パフォーマンス測定結果

### 改善前後の比較
- **ループ処理**: 70要素/フレーム → 10-15要素/フレーム（約80%削減）
- **静的要素の描画**: 個別描画 → チャンク単位の一括転写
- **FPS**: 60fps維持（元々安定していたため変化なし）
- **背景レイヤー処理時間**: 0.05-0.06ms（高速）

### 注意点
- 元の実装でも60FPSで安定していたため、数値上の改善は見られない
- CPU側の処理効率は大幅に改善されたが、GPU負荷問題（Issue #154）の直接的な解決にはならなかった
- より多くの背景要素や低スペック環境では効果が期待できる

## 今後の改善案

1. **WebGL対応**
   - さらなるGPU活用のためWebGLレンダラーへの移行を検討

2. **LOD（Level of Detail）**
   - 遠距離の要素を簡略化して描画

3. **マルチスレッド化**
   - Web Workersを使用した並列処理

4. **テクスチャアトラス**
   - スプライトをまとめて描画呼び出しをさらに削減

## 注意事項

- オフスクリーンCanvasのサイズに注意（メモリ使用量とのバランス）
- チャンクサイズは512pxが最適（小さすぎると管理オーバーヘッド、大きすぎるとメモリ消費）
- 動的要素の更新頻度は50px移動ごとに設定（頻繁すぎるとCPU負荷）

## 参考リンク

- Issue #157: https://github.com/becky3/coin-hunter-adventure-pixel/issues/157
- Issue #154: https://github.com/becky3/coin-hunter-adventure-pixel/issues/154