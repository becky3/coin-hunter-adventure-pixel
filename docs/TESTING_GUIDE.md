# テストガイド

## 概要
ブラウザを直接操作できない制限があるため、以下の方法で動作確認を行います。

## 1. 自動テストの実行

### 基本チェック
```bash
node simple-test.js
```
- サーバーの稼働確認
- アセットファイルの存在確認
- スプライトデータの検証
- コアファイルの確認

### エンドポイントテスト
```bash
node headless-test.js
```
- アセットのHTTPアクセス確認
- index.htmlの構造確認
- デバッグスクリプトの生成

## 2. ブラウザでの手動確認

### 確認手順
1. http://localhost:3000 にアクセス
2. F12でDevToolsを開く
3. Consoleタブでエラーを確認
4. 以下のコマンドを実行：

```javascript
// ゲーム状態の確認
console.log('Game exists:', !!window.game);
console.log('Current state:', game.stateManager.currentState?.constructor.name);

// プレイヤーの確認
const player = game.stateManager.currentState?.player;
console.log('Player:', player ? {
    position: { x: player.x, y: player.y },
    animation: player.animState,
    sprite: player.spriteKey
} : 'Not found');

// レンダラーの確認
console.log('Sprites loaded:', game.pixelArtRenderer?.sprites.size || 0);
console.log('Animations loaded:', game.pixelArtRenderer?.animations.size || 0);
```

### 動作テスト
1. **表示確認**
   - プレイヤーがピクセルアートで表示されているか
   - 赤い四角ではなく、キャラクターが見えるか

2. **操作確認**
   - 矢印キー左右: 歩行アニメーション
   - スペースキー: ジャンプアニメーション
   - 何もしない: 待機アニメーション

## 3. よくある問題と対処法

### プレイヤーが赤い四角で表示される
```javascript
// スプライトの読み込み状況を確認
console.log(Array.from(game.assetLoader.loadedAssets.keys()));
console.log(Array.from(game.pixelArtRenderer.sprites.keys()));
```

### アニメーションが動かない
```javascript
// アニメーションキーを確認
console.log(Array.from(game.pixelArtRenderer.animations.keys()));
// プレイヤーの状態を確認
console.log(player.animState, player.spriteKey);
```

### エラーが出る場合
```javascript
// エラーの詳細を確認
game.debug = true;
// プレイ状態に遷移
game.stateManager.setState('play');
```

## 4. CI/CD向けの自動テスト

将来的には以下を実装予定：
- Puppeteerを使ったE2Eテスト
- スクリーンショット比較テスト
- パフォーマンステスト

## 5. テスト結果の記録

実装後は必ず以下を確認：
- [ ] サーバーが起動する
- [ ] アセットが読み込まれる
- [ ] プレイヤーが表示される
- [ ] アニメーションが動作する
- [ ] 操作に反応する
- [ ] エラーが出ない