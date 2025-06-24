# 引き継ぎ資料：ゲーム解像度256×240実装

作成日: 2025-06-24  
作業者: Claude  
Issue: #16  
PR: #17

## 概要

ゲーム画面の解像度を256×240ピクセルに定義し、3倍スケール（768×720）での表示システムを実装しました。併せて、レトロゲーム風の統一されたフォントシステムとグリッドベースのテキスト配置を導入しました。

## 実装内容

### 1. 解像度システム

#### 定数定義（`src/constants/gameConstants.js`）
```javascript
export const GAME_RESOLUTION = {
    WIDTH: 256,   // ゲーム画面の幅（ピクセル）
    HEIGHT: 240   // ゲーム画面の高さ（ピクセル）
};

export const DISPLAY = {
    SCALE: 3,     // 3倍に拡大表示（768x720）
    OUTER_FRAME: {
        ENABLED: true,
        BACKGROUND_COLOR: '#1a1a1a',
        BORDER_COLOR: '#333333',
        BORDER_WIDTH: 2
    }
};
```

#### 座標系
- **論理座標**: 256×240ピクセル（ゲーム内の全ての計算はこの座標系で行う）
- **物理座標**: 768×720ピクセル（実際のCanvas表示サイズ）
- **自動スケーリング**: PixelRendererが描画時に自動的に3倍スケール

### 2. フォントシステム

#### 統一フォント仕様
- **サイズ**: 8×8ピクセル固定（ファミコン風）
- **フォント**: 'Press Start 2P'（ピクセルフォント）
- **グリッド**: 8ピクセル単位でテキストを配置

#### 実装詳細
```javascript
export const FONT = {
    SIZE: 8,      // 論理サイズ（ピクセル）
    FAMILY: '\'Press Start 2P\', monospace',
    GRID: 8       // 文字配置のグリッドサイズ
};
```

### 3. グリッドベーステキスト配置

#### PixelRenderer.drawText()
```javascript
drawText(text, x, y, color = '#FFFFFF', alpha = 1) {
    // グリッドにスナップ
    const snappedX = Math.floor(x / FONT.GRID) * FONT.GRID;
    const snappedY = Math.floor(y / FONT.GRID) * FONT.GRID;
    // ...
}
```

- 座標は自動的に8ピクセルグリッドにスナップ
- モノスペースフォントのような整列された表示を実現

#### PixelRenderer.drawTextCentered()
```javascript
drawTextCentered(text, centerX, y, color = '#FFFFFF', alpha = 1) {
    // テキストの文字数から幅を計算（各文字は8ピクセル）
    const textWidth = text.length * FONT.GRID;
    const x = centerX - Math.floor(textWidth / 2);
    this.drawText(text, x, y, color, alpha);
}
```

### 4. デバッグ表示システム

#### 外部デバッグパネル
- ゲーム画面の左側に配置（絶対位置指定）
- システムフォント使用で読みやすさを優先
- DOM要素をキャッシュしてパフォーマンス最適化

#### 実装のポイント
```javascript
// DOM要素のキャッシュ
cacheDebugElements() {
    this.debugElements = {
        panel: document.getElementById('debugPanel'),
        fps: document.getElementById('fps'),
        // ... 他の要素
    };
}
```

## 作業中に発生した問題と解決策

### 1. mainブランチへの直接プッシュ
**問題**: 初回実装時にfeatureブランチを作成せずにmainに直接プッシュ  
**解決**: 
- mainブランチをリセット
- feature/game-resolution-256x240ブランチを作成
- DEVELOPMENT_RULES.mdにブランチ作成ルールを追加

### 2. フォントスケーリングの混乱
**問題**: 
- 初期実装でフォントサイズがバラバラ（5px, 6px, 8px）
- スケーリング処理の不整合

**解決経緯**:
1. 最初の修正: スケーリングを削除 → フォントが小さすぎる
2. 二度目の修正: スケーリングを復活 → まだ問題あり
3. 最終解決: 全フォントを8×8ピクセル固定に統一

### 3. テキストのグリッド配置
**問題**: テキストが整列せず、ファミコンらしくない表示  
**解決**: 8ピクセルグリッドへの自動スナップ機能を実装

## 技術的な重要事項

### レンダリングシステム
1. **ピクセルパーフェクト描画**
   ```javascript
   ctx.imageSmoothingEnabled = false;  // アンチエイリアス無効
   ```

2. **座標変換**
   - 全ての座標は論理座標で指定
   - PixelRendererが自動的にスケーリング
   - カメラオフセットも考慮

3. **パフォーマンス最適化**
   - デバッグパネルのDOM要素をキャッシュ
   - 毎フレームのgetElementById呼び出しを削減

### ドキュメント更新箇所
1. `TECHNICAL_SPECIFICATION.md`
   - レンダリングシステムセクションを追加
   - ステージ高さを576→240に修正
   - オブジェクト座標を新解像度に対応

2. `PIXEL_ART_SPECIFICATION.md`
   - レンダリングシステムセクションを追加
   - グリッドベース配置の説明

3. `DEVELOPMENT_RULES.md`
   - ブランチ作成ルールを追加
   - Copilotコメント確認方法を追加

## 今後の作業への影響

### 新規実装時の注意点
1. **座標指定**: 全て256×240の論理座標で指定
2. **テキスト描画**: drawText()は固定サイズのみ（sizeパラメータなし）
3. **グリッド配置**: UIレイアウトは8ピクセル単位で設計

### 互換性
- 旧pixelFont.js（5×7ビットマップフォント）は残してあるが未使用
- 将来的により精密なピクセルフォントが必要な場合に使用可能

## テスト確認項目

- [x] 解像度256×240での表示確認
- [x] 3倍スケール（768×720）での表示確認
- [x] フォントの統一サイズ確認
- [x] グリッド配置の動作確認
- [x] デバッグパネルの表示/非表示切り替え
- [x] レイアウトシフトが発生しないこと

## 関連ファイル

### 新規作成
- `/src/constants/gameConstants.js`

### 主要な変更
- `/src/rendering/PixelRenderer.js`
- `/src/states/MenuState.js`
- `/src/core/Game.js`
- `/index.html`

### ドキュメント更新
- `/docs/TECHNICAL_SPECIFICATION.md`
- `/docs/PIXEL_ART_SPECIFICATION.md`
- `/docs/GAME_SPECIFICATION.md`
- `/DEVELOPMENT_RULES.md`

## 参考リンク

- Issue: https://github.com/becky3/coin-hunter-adventure-pixel/issues/16
- PR: https://github.com/becky3/coin-hunter-adventure-pixel/pull/17

## まとめ

256×240ピクセルの固定解像度システムが完全に実装され、レトロゲーム風の統一されたビジュアルが実現しました。全てのテキストは8×8ピクセルの固定サイズで、8ピクセルグリッドに整列して表示されます。デバッグ情報はゲーム画面外に配置され、ゲームプレイを妨げません。

今後の開発では、この解像度とグリッドシステムを前提としてUIやゲームオブジェクトを配置してください。