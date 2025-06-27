# テストガイド

## 概要
coin-hunter-adventure-pixelプロジェクトのテスト手順とツールについて説明します。

## 1. 自動テストの実行

### 基本チェック（Puppeteer）
```bash
node tests/puppeteer/simple-test.js
```
- サーバーの稼働確認
- アセットファイルの存在確認
- スプライトデータの検証
- コアファイルの確認

### ゲームプレイテスト
```bash
node tests/puppeteer/gameplay-test.js
```
- ゲームの起動確認
- PlayStateへの遷移テスト
- 敵の動作監視
- エラーの自動検出

### コミット前チェック（推奨）
```bash
./scripts/check-before-commit.sh
```
- Puppeteerテスト実行
- ESLintチェック
- ブラウザ動作確認の促し

## 2. シミュレーションテスト

### 物理演算シミュレーション
```bash
node tests/enemy-physics-simulation.js
```
- 物理システムの動作を独立してテスト
- 60フレームの敵の動きをシミュレート
- 座標と速度の変化を追跡

### 速度累積テスト
```bash
node tests/velocity-accumulation-test.js
```
- 速度計算の正確性を検証
- 二重更新の検出

## 3. デバッグツール

### 物理デバッグテスト
http://localhost:3000/tests/physics-debug-test.html
- リアルタイムで敵の状態を表示
- 座標、速度、接地状態を監視
- 警告の自動検出

### 敵の動作監視ツール
http://localhost:3000/tests/enemy-behavior-monitor.html
- 「Start Monitoring」ボタンで監視開始
- 10秒間の詳細な動作ログ
- 異常な動作の自動検出と警告
- 移動距離のサマリー表示

### deltaTime追跡ツール
http://localhost:3000/tests/deltatime-test.html
- deltaTimeの伝播を確認
- Game → StateManager → PhysicsSystemの流れを追跡
- 各フレームの詳細なログ

### 手動チェックツール
http://localhost:3000/tests/manual-enemy-check.html
- iframe内でゲームを実行
- 「Check Enemies」ボタンで状態確認
- 「Watch for 10s」で継続監視

## 4. テストの実行タイミング

### 開発中（推奨）
- 機能実装後すぐにテスト
- バグ修正時は必ず再現テストを作成
- コードレビュー前に一通り実行

### コミット前（必須）
```bash
./scripts/check-before-commit.sh
```
- 自動的にテストが実行される
- ブラウザ確認のチェックリストが表示される

### プルリクエスト作成時
- すべてのテストが通ることを確認
- 新機能の場合は対応するテストを追加
- テスト結果をPRコメントに記載

## 5. よくある問題と対処法

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

### 敵が画面外に飛んでいく
1. 速度設定を確認
   ```javascript
   console.log(game.currentState.enemies[0].moveSpeed);
   // 0.5程度が適切、20以上は速すぎる
   ```

2. 物理演算の状態を確認
   ```javascript
   const enemy = game.currentState.enemies[0];
   console.log({
       position: { x: enemy.x, y: enemy.y },
       velocity: { x: enemy.vx, y: enemy.vy },
       grounded: enemy.grounded
   });
   ```

3. デバッグツールで詳細確認
   - http://localhost:3000/tests/enemy-behavior-monitor.html を使用

### テストが失敗する場合
1. サーバーが起動しているか確認
2. ポート3000が使用可能か確認
3. node_modulesを削除して再インストール

## 6. テスト結果の記録

### チェックリスト
実装後は必ず以下を確認：
- [ ] サーバーが起動する
- [ ] アセットが読み込まれる
- [ ] プレイヤーが表示される
- [ ] 敵が正常に動作する（飛んでいかない）
- [ ] アニメーションが動作する
- [ ] 操作に反応する
- [ ] エラーが出ない
- [ ] 60FPSを維持している

### テスト結果の記録例
```
日付: 2025-06-27
テスト項目: 敵の移動
結果: 
- 初期位置: (150, 180)
- 10秒後の位置: (165, 192)
- 移動速度: 0.5 pixel/frame
- 問題: なし
```

## 7. 新しいテストの作成方法

### テストツールのテンプレート
```javascript
// tests/新機能-test.html
<!DOCTYPE html>
<html>
<head>
    <title>新機能テスト</title>
    <style>
        /* 基本的なスタイル */
    </style>
</head>
<body>
    <h1>新機能テスト</h1>
    <button onclick="startTest()">テスト開始</button>
    <div id="log"></div>
    
    <script type="module">
        // ゲームをインポート
        import('/src/core/Game.js').then(({ Game }) => {
            // テストロジック
        });
    </script>
</body>
</html>
```

### シミュレーションテストのテンプレート
```javascript
// tests/新機能-simulation.js
console.log('=== 新機能シミュレーション ===');

// テスト対象をモック
class MockComponent {
    // 実装
}

// シミュレーション実行
for (let i = 0; i < 60; i++) {
    // フレームごとの処理
}

// 結果を検証
console.log('結果:', /* 検証結果 */);
```