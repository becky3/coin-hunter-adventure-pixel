# ArmorKnight実装作業引き継ぎ資料

**作成日**: 2025-07-21  
**作業者**: Claude  
**関連Issue**: #134, #206  
**関連PR**: #204

## 概要
重装甲の敵キャラクター「ArmorKnight」の実装を完了しました。踏みつけ無効、プレイヤー検知による突進機能を持つ強敵として実装されています。

## 実装内容

### 1. 基本仕様
- **サイズ**: 16x16ピクセル
- **体力**: 3（通常の敵の3倍）
- **移動速度**: 
  - 通常: 0.15
  - 突進時: 0.9（6倍）
- **検知範囲**:
  - 横: 84ピクセル
  - 縦: 128ピクセル（矩形範囲）

### 2. 主要機能

#### 踏みつけ無効
- `canBeStomped()` が `false` を返す
- 踏みつけ時はプレイヤーを高く跳ね返す（反発力: -16）
- Enemy基底クラスに `stompBounceVelocity` プロパティを追加

#### 突進機能
- プレイヤーを検知すると速度が6倍に
- アニメーションが「charge」に切り替わる
- プレイヤーの方向に自動的に向きを変える

#### ダメージ処理
- 通常の踏みつけではダメージを受けない
- projectileとpowerupタイプの攻撃のみ有効

## 技術的な課題と解決

### 1. 踏みつけ時のダメージ問題
**問題**: プレイヤーが踏みつけて跳ね返された直後に再度衝突判定が発生し、ダメージを受ける

**解決策**:
- Enemy基底クラスの `onCollisionWithPlayer` で `wasJustBounced` チェックを追加
- `player.vy < 0`（上昇中）の場合もダメージを与えない

### 2. EventBus配列戻り値の処理
**問題**: `findPlayer()` メソッドでEventBusの戻り値を正しく処理していなかった

**解決策**:
```typescript
const results = this.eventBus.emit('entity:findPlayer');
if (results && Array.isArray(results) && results.length > 0) {
    const player = results[0];
    // ...
}
```

### 3. テストでのプレイヤー取得
**問題**: 一部のテストで `state.player` が `null` になる

**解決策**:
- 全てのテストで `assertPlayerExists()` を呼ぶ
- `state.entityManager.getPlayer()` を使用

## テスト

### 実装したE2Eテスト
1. `test-armor-knight-stomp-simple.cjs` - 踏みつけ時の反発
2. `test-armor-knight-charge-simple.cjs` - 突進機能
3. `test-armor-knight-charge.cjs` - 突進の詳細動作
4. `test-armor-knight-damage.cjs` - ダメージ処理
5. `test-armor-knight-stage.cjs` - ステージでの総合動作

### テストステージ
- `test-armor-knight.json` - 広い場所での動作確認用
- `test-armor-knight-stomp.json` - 踏みつけテスト専用（1マスの穴配置）

## 設定値の調整履歴

### 検知範囲
1. 初期: 60（円形）
2. 120に拡大（2倍）
3. 84に調整（1.4倍）
4. 矩形範囲に変更（横84、縦128）

### 突進速度
1. 初期: normalSpeed * 2
2. normalSpeed * 8（4倍）に増加
3. normalSpeed * 6（3倍）に最終調整

## 今後の改善案

### 1. E2Eテストの共通化（Issue #207）
- テスト初期化処理の重複を削減
- `GameTestHelpers.cjs` に共通メソッドを追加

### 2. 追加機能の検討
- 突進中の壁衝突時のスタン
- シールド展開アニメーション
- 特殊攻撃への耐性差別化

## ドキュメント更新箇所
- `/docs/specifications/enemies/armor-knight.md` - 仕様書（新規作成）
- `/docs/development/enemies.md` - 開発ガイドに追加
- `/docs/development/testing.md` - テスト一覧を更新
- `/CLAUDE.md` - 最近の更新セクションを追加

## 学んだこと
1. **物理エンジンの衝突判定は1フレームに複数回呼ばれることがある**
   - 衝突後の状態変化を考慮した実装が必要

2. **EventBusは配列を返す**
   - 複数のリスナーが存在する可能性を考慮

3. **テストの一貫性が重要**
   - 共通処理は確実に実行する
   - プレイヤーの存在確認は必須

## 参考リンク
- [Issue #134](https://github.com/becky3/coin-hunter-adventure-pixel/issues/134)
- [PR #204](https://github.com/becky3/coin-hunter-adventure-pixel/pull/204)
- [ArmorKnight仕様書](/docs/specifications/enemies/armor-knight.md)