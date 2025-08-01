# パレットシステム統一とCanvas API除去の作業記録

## 日付
2025年8月2日

## 対応Issue
- Issue #225: パレットシステムの正しい使用方法への統一（マスターパレットインデックスからパレットインデックスへ）

## 実施内容

### 1. PixelRendererの機能拡張

#### 透明度制御API追加
- `setAlpha(alpha: number)`: 透明度を設定（スタックで管理）
- `resetAlpha()`: 前の透明度に戻す

#### Canvas要素作成機能
- `createCanvas(width, height)`: Canvas要素を作成
- `createSolidColorCanvas(width, height, colorIndex)`: 単色Canvas作成
- `createImageDataFromPattern(pattern, colorIndex)`: パターンからImageData作成

#### nullチェック機能
- `drawRect`と`drawText`メソッドにnullチェックを追加
- nullの場合は明確なエラーメッセージでthrow

### 2. Canvas API直接使用の除去

#### HUDManager
- `document.createElement('canvas')`を`renderer.createCanvas()`に変更
- `ctx.fillRect`、`ctx.putImageData`の直接使用を除去
- `drawPatternTile`メソッドをPixelRenderer APIを使用するよう修正

#### MenuState
- `renderer.ctx.globalAlpha`の直接操作を除去
- `renderer.setAlpha()`/`renderer.resetAlpha()`を使用

### 3. 共通パレットの定義

`CommonPalettes.ts`を作成し、以下のパレットを定義：

- **DEBUG_PALETTE**: デバッグオーバーレイ用（黒背景、緑テキスト、赤警告）
- **PERFORMANCE_PALETTE**: パフォーマンスモニター用（黒背景、緑通常、赤警告）
- **ENEMY_HP_PALETTE**: 敵のHPバー用（黒枠、赤バー、白背景）
- **TEST_TILE_PALETTE**: テストステージ用（緑地形、マゼンタ特殊、青インタラクティブ）

### 4. マスターパレットインデックス直接使用の修正

以下のファイルで、マスターパレットインデックス（0x00～0x91）の直接使用を修正：
- AnimatedSprite: `0x21` → `DEBUG_PALETTE.default.colors[2]`
- Enemy: `0x00`, `0x31` → `ENEMY_HP_PALETTE`の対応色
- PerformanceMonitor: `0x00`, `0x62` → `PERFORMANCE_PALETTE`の対応色
- TestPlayState: `0x61`, `0x31`, `0x52`, `0x03` → `TEST_TILE_PALETTE`の対応色

### 5. nullチェックの改善

初期実装では各描画箇所でnullチェックを行っていたが、最終的に以下の方針に変更：
- 個別のnullチェックを削除
- PixelRendererの描画メソッド側でnullチェック
- これにより、コードがシンプルになり、一貫性が向上

## 技術的な詳細

### パレットシステムの仕組み
1. 各エンティティは4色パレット（透明＋3色）を定義
2. パレットはマスターパレットのインデックスを参照
3. 描画時はパレットインデックス（0-3）を指定
4. PixelRendererがマスターパレットから実際の色を解決

### 型安全性の向上
- `colorIndex: number | null`として型定義
- nullの場合は描画メソッドでエラーをthrow
- これにより、誤ったnull値の使用を実行時に検出可能

## 成果

1. **統一されたレンダリングインターフェース**: すべての描画がPixelRendererを通じて行われる
2. **パレットシステムの一貫性**: マスターパレットインデックスの直接使用を排除
3. **保守性の向上**: Canvas API直接使用の削除により、描画処理の管理が容易に
4. **型安全性**: nullチェックの統一により、エラーの早期発見が可能

## 学んだこと

1. **段階的なリファクタリング**: 大きな変更も小さなステップに分けることで安全に実施可能
2. **nullチェックの配置**: 個別にチェックするより、共通処理でチェックする方が効率的
3. **パレットシステムの利点**: 色管理の一元化により、テーマ変更や色調整が容易

## 今後の課題

1. **パレット切り替え機能**: ステージごとの色調整機能の実装
2. **パフォーマンス最適化**: Canvas要素のキャッシュ戦略の改善
3. **エフェクト拡張**: より高度な視覚効果のためのAPI追加

## 関連ドキュメント

- `/docs/development/rendering-guidelines.md`: 新規作成したレンダリングガイドライン
- `/docs/development/architecture.md`: PixelRendererの説明を更新
- `/docs/resources/pixel-art.md`: パレットシステムの使用方法を追加

## テスト結果

- ✅ 全22個のE2Eテストに合格
- ✅ Lintチェック合格（既存のTODOコメント警告のみ）
- ✅ TypeScriptチェック合格
- ✅ ビルドチェック合格