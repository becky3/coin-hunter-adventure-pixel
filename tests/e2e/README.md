# E2Eテストフレームワーク ドキュメント

## 概要

このディレクトリには、Puppeteerを使用したCoin Hunter Adventure Pixelゲーム用の効率的で再利用可能なE2Eテストフレームワークが含まれています。

## フレームワーク構成

### コアコンポーネント

1. **TestFramework.js** - ベーステストフレームワーククラス
   - ブラウザ管理
   - ページナビゲーション
   - スクリーンショットユーティリティ
   - 基本的なアサーション
   - エラー追跡

2. **GameTestHelpers.js** - ゲーム固有のテストヘルパー
   - ゲーム状態管理
   - プレイヤー操作
   - エンティティクエリ
   - パフォーマンス監視
   - デバッグユーティリティ

### テストファイル

- `test-basic-flow.js` - 基本的なゲーム機能テスト
- `test-performance.js` - パフォーマンス監視テスト
- `test-stress.js` - 高速入力によるストレステスト
- `test-complete-gameplay.js` - ゲーム開始からゴール到達までの完全なプレイテスト
- `test-pre-push.js` - コードプッシュ前の必須テストスイート
- `run-all-tests.js` - 全テストスイート実行ツール

## 使用方法

### 個別テストの実行

```bash
# 基本フローテスト
npm run test:basic

# パフォーマンステスト
npm run test:performance

# ストレステスト
npm run test:stress

# 完全なゲームプレイテスト
npm run test:gameplay
```

### プッシュ前テスト（推奨）

```bash
# コードをプッシュする前に実行
npm run test:pre-push
```

### 全テストの実行

```bash
npm test
```

### 新しいテストの作成

フレームワークを使用して新しいテストファイルを作成：

```javascript
const GameTestHelpers = require('./utils/GameTestHelpers');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,  // CI環境ではtrueに設定
        slowMo: 50,      // アクション間の遅延（ミリ秒）
        verbose: true    // 詳細ログを有効化
    });

    await test.runTest(async (t) => {
        // テストコードをここに記述
        await t.init('テスト名');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // テスト実装
        await t.startNewGame();
        // ... その他のテストステップ
        
        await t.checkForErrors();
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;
```

## 利用可能なメソッド

### TestFramework基本メソッド

- `init(testName)` - テスト名を指定して初期化
- `navigateToGame(url)` - ゲームURLに移動
- `waitForGameInitialization()` - ゲーム開始を待機
- `waitForState(stateName)` - 特定のゲーム状態を待機
- `getGameState()` - 現在のゲーム状態情報を取得
- `pressKey(key)` - キーボードキーを押す
- `holdKey(key, duration)` - キーを指定時間押し続ける
- `screenshot(name)` - スクリーンショットを撮影
- `wait(ms)` - ミリ秒待機
- `checkForErrors()` - ページエラーをチェック

### GameTestHelpersメソッド

#### ゲーム制御
- `startNewGame()` - メニューから新規ゲーム開始
- `pauseGame()` - ゲームを一時停止
- `resumeGame()` - 一時停止から再開

#### プレイヤー制御
- `movePlayer(direction, duration)` - プレイヤー移動（left/right/up/down）
- `jumpPlayer()` - プレイヤージャンプ
- `getPlayerPosition()` - プレイヤー座標を取得
- `getPlayerStats()` - プレイヤー全ステータスを取得
- `waitForPlayerGrounded()` - プレイヤーの着地を待機

#### エンティティクエリ
- `getEnemies()` - 全敵エンティティを取得
- `getCoins()` - 全コインエンティティを取得
- `getLevelInfo()` - 現在のレベル情報を取得

#### テストユーティリティ
- `simulateGameplay(duration)` - 指定時間自動プレイ
- `testBasicGameFlow()` - 基本フローテストを実行
- `monitorPerformance(duration)` - FPSとメモリを監視
- `enableDebugMode()` - デバッグ機能を有効化
- `injectErrorTracking()` - JSエラーを追跡

## 設定オプション

```javascript
{
    headless: true,           // UIなしで実行
    slowMo: 0,               // アクション間の遅延（ミリ秒）
    devtools: false,         // DevToolsを開く
    screenshotPath: 'path',  // スクリーンショット保存先
    timeout: 30000,          // デフォルトタイムアウト（ミリ秒）
    verbose: false           // 詳細コンソール出力
}
```

## ベストプラクティス

1. **常にフレームワークメソッドを使用** - 生のPuppeteerではなく
2. **重要なポイントでスクリーンショットを撮影** - デバッグ用
3. **各テストの最後でエラーチェック** を実行
4. **わかりやすいテスト名を使用** - レポート用
5. **操作に応じた適切なタイムアウトを設定**
6. **組み込みのクリーンアップを使用** してリソースを解放

## CI/CD統合

CI環境向けの設定：

```javascript
const test = new GameTestHelpers({
    headless: true,
    slowMo: 0,
    timeout: 60000  // CI用の長めのタイムアウト
});
```

## トラブルシューティング

### よくある問題

1. **タイムアウトエラー** - タイムアウト値を増やす
2. **要素が見つからない** - 待機条件を追加
3. **スクリーンショットが保存されない** - ディレクトリ権限を確認
4. **メモリリーク** - パフォーマンス監視を使用

### デバッグモード

詳細ログとスクリーンショットを有効化：

```javascript
const test = new GameTestHelpers({
    verbose: true,
    slowMo: 100,
    devtools: true
});
```

## 今後の改善予定

- [ ] Puppeteerの代替としてPlaywrightサポート
- [ ] ビジュアルリグレッションテスト
- [ ] ネットワーク状態シミュレーション
- [ ] モバイルビューポートテスト
- [ ] アクセシビリティテスト
- [ ] Jest統合
- [ ] 並列テスト実行
- [ ] クラウドテストサービス統合

## プッシュ前テスト

`npm run test:pre-push` は以下のテストを実行します：

1. **基本フローテスト** - ゲームの基本動作確認
2. **完全なゲームプレイテスト** - スタートからゴールまでの自動プレイ
3. **パフォーマンステスト** - 60FPS維持の確認

これらのテストがすべて成功した場合のみ、コードをプッシュすることを推奨します。

### 使用例

```bash
# 開発完了後
npm run lint          # コード品質チェック
npm run test:pre-push # プッシュ前テスト

# 両方成功したら
git push origin feature/your-branch
```

## 効率化のポイント

1. **コードの再利用** - 共通処理はすべてフレームワークに実装済み
2. **エラーハンドリング** - 自動的にエラーを捕捉・レポート
3. **スクリーンショット** - 失敗時に自動的に保存
4. **パフォーマンス計測** - 組み込みのメトリクス収集
5. **レポート生成** - テスト結果を自動的にJSON形式で保存