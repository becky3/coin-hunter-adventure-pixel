
# 手動テストガイド

## ブラウザでの手動テスト手順

### 1. 開発サーバーの起動
```bash
npm run dev
```

### 2. Chromeでアクセス
http://localhost:3000 をChromeで開く

### 3. 開発者ツールでの確認
DevTools (F12) → Console タブを開いて以下のコマンドを実行：

```javascript
// ゲームの初期化確認
console.log('ゲーム初期化:', !!window.game);
console.log('現在の状態:', game.stateManager?.currentState?.constructor.name);

// プレイヤーの確認
game.stateManager.setState('play');
setTimeout(() => {
    const player = game.stateManager.currentState?.player;
    console.log('プレイヤー:', player ? {
        位置: { x: player.x, y: player.y },
        アニメーション: player.animState,
        スプライト: player.spriteKey
    } : '見つかりません');
    
    // レンダラーの確認
    console.log('スプライト:', Array.from(game.pixelArtRenderer?.sprites.keys() || []));
    console.log('アニメーション:', Array.from(game.pixelArtRenderer?.animations.keys() || []));
}, 1000);
```

### 4. 操作テスト
- **矢印キー**: プレイヤーが移動
- **スペースキー**: プレイヤーがジャンプ
- **ESCキー**: ポーズ/再開
- **Qキー**: ポーズ中にタイトルへ戻る
- **Mキー**: 音楽のミュート切り替え

### 5. 期待される動作
- プレイヤーがピクセルアートで表示される（赤い四角ではなく）
- アニメーションが正しく動作する（歩行、ジャンプ、待機）
- コンソールにエラーが表示されない
- 物理演算（重力、衝突判定）が正しく動作する
- UIがタイルベースで描画される

### 6. 主要機能の確認
- [ ] プレイヤーが床をすり抜けない
- [ ] ポーズ機能が正しく動作する
- [ ] 音楽の一時停止/再開が動作する
- [ ] Qキーでタイトルに戻れる
- [ ] UIボーダーが黒い単色で表示される
