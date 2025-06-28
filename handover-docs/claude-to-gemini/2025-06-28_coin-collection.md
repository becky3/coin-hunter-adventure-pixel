# コイン収集機能 実装引き継ぎ

作成日: 2025-06-28  
作成者: Claude  
実装フェーズ: 実装完了

## 概要

ゲーム内でプレイヤーが収集可能なコインアイテムを実装しました。
コインはレベルデータに基づいて配置され、収集時にスコア加算と効果音再生が行われます。

## 実装内容

### 主な変更点

1. **Coinエンティティクラス**
   - 仕様書通り30×30ピクセルのサイズで実装
   - 4フレームの回転アニメーション（coin_spin1〜4）
   - sin波による浮遊エフェクト（振幅3ピクセル）
   - 収集時に10点のスコアを付与

2. **PlayStateの拡張**
   - initializeItemsメソッドでレベルデータからコインを配置
   - checkCoinCollectionメソッドで収集判定を実装
   - 収集時の効果音再生処理を追加

3. **アセット管理の更新**
   - AssetLoaderにコインアニメーションの読み込みを追加

### 新規作成ファイル

```
- src/entities/Coin.js - コインエンティティクラス
- test-coin-feature.md - テストガイド（削除可）
```

### 変更ファイル

```
- src/states/PlayState.js:7,81-82,142-143,336-393 - コイン配置と収集処理
- src/assets/AssetLoader.js:108 - コインスプライトの読み込み追加
```

## 技術仕様

### アーキテクチャ
- Entityクラスを継承した標準的なゲームオブジェクト実装
- 物理演算は無効化（gravity: false, physicsEnabled: false）
- プレイヤーとの衝突判定はPlayStateで一括管理

### 使用した技術/パターン
- **継承パターン**: Entityクラスの機能を活用
- **アニメーション管理**: フレームベースの手動管理
- **効果音**: MusicSystemのplayCoinSoundメソッドを使用

### 重要なコード部分
```javascript
// コイン収集判定（PlayState.js）
checkCoinCollection() {
    if (!this.player) return;
    
    this.items.forEach((item) => {
        if (item.constructor.name === 'Coin' && !item.collected) {
            if (item.collidesWith(this.player)) {
                const scoreGained = item.collect();
                this.score += scoreGained;
                this.coinsCollected++;
                
                if (this.game.musicSystem && this.game.musicSystem.isInitialized) {
                    this.game.musicSystem.playCoinSound();
                }
            }
        }
    });
    
    // 収集済みアイテムの削除
    this.items = this.items.filter(item => {
        if (item.constructor.name === 'Coin') {
            return !item.collected;
        }
        return true;
    });
}
```

## テスト手順

### 前提条件
1. 開発サーバーが起動していること（`npm run dev`）
2. ブラウザでlocalhost:3000にアクセス

### テストケース

#### ケース1: コインの表示確認
1. タイトル画面でEnterキーを押してゲーム開始
2. チュートリアルステージが読み込まれる
3. 期待結果: 5個のコインが正しい位置に表示される
   - 上段の足場: 3個（x:7,8,9 y:8）
   - 中段の足場: 2個（x:11,12 y:10）

#### ケース2: コイン収集機能
1. プレイヤーキャラクターでコインに接触
2. 期待結果:
   - コインが消える
   - スコアが10点増加
   - キラキラ効果音が再生される
   - コンソールに収集ログが出力される

#### ケース3: 全コイン収集
1. すべてのコインを収集する
2. 期待結果: スコアが50点になる

### 動作確認コマンド
```bash
# lintチェック
npm run lint

# 開発サーバー起動
npm run dev
```

## 既知の問題・制限事項

### 問題1: スプライト未読み込み時の表示
- 現象: コインスプライトが読み込まれない場合、紫色の四角形が表示される
- 影響: 視覚的な問題のみ、ゲームプレイには影響なし
- 回避策: AssetLoaderが正常に動作していることを確認

### 制限事項
- コイン収集時のパーティクルエフェクトは未実装
- スコアのフローティングテキスト表示は未実装
- HUDにコイン収集数の表示は未実装

## 次のステップ

### 推奨される改善
1. コイン収集時の視覚的フィードバック強化
   - パーティクルエフェクトの追加
   - スコアのフローティングテキスト表示
2. HUDの拡張
   - コイン収集数/総数の表示
   - コインアイコンの追加

### 残タスク
- [ ] ステージクリア時のコイン収集率計算
- [ ] コイン収集実績システム
- [ ] より複雑なコイン配置パターン

## 参考資料

- ゲーム仕様書: `docs/GAME_SPECIFICATION.md`（コイン仕様: 77-81行目）
- レベルデータ: `src/levels/data/tutorial.json`（entities配列）
- コインスプライト: `src/assets/sprites/items/coin_spin*.json`

## レビュー依頼事項

以下の点について特に確認をお願いします：
1. **衝突判定の精度**: プレイヤーとコインの当たり判定が適切か
2. **パフォーマンス**: 大量のコイン配置時のFPS低下がないか
3. **効果音のタイミング**: 収集時の効果音が遅延なく再生されるか
4. **アニメーション**: コインの回転と浮遊が自然に見えるか

## 申し送り事項

- PhysicsSystemには登録していません（物理演算不要のため）
- コインの配置はレベルデータのentities配列で管理されています
- 将来的にコインの種類を増やす場合は、Coinクラスを基底クラスとして継承することを推奨します