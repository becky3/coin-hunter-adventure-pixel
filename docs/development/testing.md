---
layout: default
title: テストガイド
parent: 開発者向け
---

# テストガイド

## 自動テスト

### E2Eテスト実行
```bash
# 全テストを実行
npm test

# 個別テストを実行（推奨）
npm run test:e2e -- tests/e2e/[テストファイル名]

# 例:
node tests/e2e/test-enemy-damage.cjs
```

### E2Eテストファイル一覧

| ファイル名 | 目的 | 主なテスト内容 | 実行時間 |
|------------|------|----------------|----------|
| **smoke-test.cjs** | 基本動作確認 | ゲーム起動、メニュー表示、ゲーム開始 | ~10秒 |
| **test-basic-flow.cjs** | 基本フロー検証 | プレイヤー移動、ジャンプ、ステージクリア、ポーズ | ~30秒 |
| **test-enemy-damage.cjs** | 敵ダメージシステム | 敵衝突、踏みつけ、無敵時間、死亡・リスポーン | ~25秒 |
| **test-jump-physics.cjs** | ジャンプ物理演算 | ジャンプ高さ、滞空時間、重力、最大落下速度 | ~15秒 |
| **test-variable-jump.cjs** | 可変ジャンプ | ボタン長押し、短押し、ジャンプ中のリリース | ~20秒 |
| **test-performance.cjs** | パフォーマンス監視 | FPS測定（55FPS以上維持）、レンダリング時間、ヒープ使用量 | ~15秒 |
| **bgm-and-debug-test.cjs** | BGM・デバッグ機能 | BGM再生/停止、ミュート、デバッグオーバーレイ | ~15秒 |
| **test-player-respawn-size.cjs** | Issue #106検証 | 小サイズ死亡後のリスポーンサイズ、横衝突判定 | ~25秒 |
| **test-spring-bounce.cjs** | ジャンプ台機能 | プレイヤーのジャンプ力×2.5倍のバウンス、可変ジャンプ対応、複数回バウンス可能 | ~20秒 |
| **test-fall-damage.cjs** | 落下ダメージ | 画面外落下による即死判定、ライフ減少、ゲームオーバー | ~20秒 |

### テストログ
- テスト実行時のログは `tests/logs/` に自動保存
- ファイル名: `[テスト名]-[タイムスタンプ].log`
- スクリーンショット: `tests/screenshots/` に保存

### 既知の問題と解決策

#### タイムアウトエラー
- **問題**: E2EテストがPlayState ready timeoutで失敗することがある
- **原因**: 
  - Vite開発サーバーでのアセット読み込み遅延（300-1600ms/ファイル）
  - 前のテストのリソースが適切にクリーンアップされていない
- **解決策**: 
  - アセットバンドリング（`spriteData.ts`、`bundledData.ts`）により読み込み時間を短縮
  - テスト間に2秒の遅延を追加してリソースクリーンアップを確保

#### 敵が地面から落下する
- **問題**: テスト環境で敵（特にスライム）が地面をすり抜ける
- **原因**: エンティティの自動ジャンプロジックがフレーム3で発動
- **解決策**: 不要なジャンプロジックを削除（スライムはジャンプ不要）

#### フルテスト実行時のタイムアウト
- **問題**: 個別テストは成功するが、フルテスト実行時にタイムアウトする
- **原因**: 
  - ブラウザインスタンスのメモリ蓄積
  - テスト間のリソース解放が不完全
- **解決策**: 
  - テスト間に適切な待機時間を設定
  - ブラウザクリーンアップ処理を確実に実行

### テスト実行のベストプラクティス

#### 個別テストの実行を推奨
```bash
# 問題のあるテストを個別に実行
node tests/e2e/test-enemy-damage.cjs

# ログを直接確認
tail -f tests/logs/enemy-damage-test-*.log
```

#### テストログの活用
```bash
# 最新のログファイルを確認
ls -la tests/logs/ | tail -10

# エラー箇所を特定
grep -n "ERROR\\|FAILED" tests/logs/*.log
```

#### テストランナーの改善
- クリティカルテスト失敗時に即座に停止
- 各テストに60秒のタイムアウトを設定
- テスト間に2秒の遅延を追加

## 手動テスト

### 基本手順
1. 開発サーバー起動: `npm run dev`
2. ブラウザで http://localhost:3000 を開く
3. F12でDevToolsを開く

### 操作確認
- **矢印キー**: 移動
- **スペース**: ジャンプ
- **ESC**: ポーズ
- **M**: 音楽ミュート

### デバッグコマンド
```javascript
// ゲーム状態の確認
console.log('ゲーム初期化:', !!window.game);
console.log('現在の状態:', game.stateManager?.currentState?.constructor.name);

// プレイ状態への遷移
game.stateManager.setState('play');
```

## デバッグツール

ブラウザで以下のURLにアクセス：
- **物理デバッグ**: `/tests/physics-debug-test.html`
- **敵動作監視**: `/tests/enemy-behavior-monitor.html`
- **deltaTime追跡**: `/tests/deltatime-test.html`
- **ジャンプ物理テスト**: `/jump-test.html`

### jump-test.html
ジャンプ物理パラメータをリアルタイムで調整できるツールです。

**機能**
- 重力、ジャンプ力、最大落下速度、可変ジャンプブーストの調整
- リアルタイム反映（Auto Apply）
- 自動ジャンプテスト（Auto Jump）
- 理論値の計算表示（最大高さ、滞空時間、比率）

**使用方法**
1. `http://localhost:3000/jump-test.html` にアクセス
2. スライダーでパラメータを調整
3. Auto Jumpで連続ジャンプテスト
4. コンソールでデバッグ情報を確認

## チェックリスト

### 実装後の確認
- [ ] サーバーが起動する
- [ ] アセットが読み込まれる
- [ ] プレイヤーが正しく表示される
- [ ] 敵が正常に動作する
- [ ] アニメーションが動作する
- [ ] 操作に反応する
- [ ] エラーが出ない
- [ ] 60FPSを維持している

### 物理演算の確認
- [ ] プレイヤーが床をすり抜けない
- [ ] 重力が正しく働く
- [ ] 衝突判定が機能する
- [ ] 敵が地面に正しく配置される

#### 物理エンジンのデバッグ
```javascript
// PhysicsSystemにデバッグログを追加
// src/physics/PhysicsSystem.ts の update() メソッドに追加
if (this.frameCount <= 3) {
    console.log(`[PhysicsSystem] Frame ${this.frameCount}, deltaTime=${deltaTime.toFixed(4)}, entities=${this.entities.size}`);
    for (const entity of this.entities) {
        if (entity.constructor.name === 'Slime') {
            console.log(`[PhysicsSystem]   Slime at y=${entity.y.toFixed(2)}, vy=${entity.vy.toFixed(2)}, grounded=${entity.grounded}`);
        }
    }
}
```

## トラブルシューティング

### プレイヤーが赤い四角で表示される
```javascript
// スプライト読み込み状況を確認
console.log(Array.from(game.assetLoader.loadedAssets.keys()));
console.log(Array.from(game.pixelArtRenderer.sprites.keys()));
```

### 敵が画面外に飛んでいく
```javascript
// 速度設定を確認（0.5程度が適切）
const enemy = game.currentState.enemies[0];
console.log({
    position: { x: enemy.x, y: enemy.y },
    velocity: { x: enemy.vx, y: enemy.vy },
    moveSpeed: enemy.moveSpeed
});
```

### アニメーションが動かない
```javascript
// アニメーションキーを確認
console.log(Array.from(game.pixelArtRenderer.animations.keys()));
console.log(player.animState, player.spriteKey);
```

## テスト実行タイミング

1. **開発中**: 機能実装後すぐにテスト
2. **コミット前**: `./scripts/check-before-commit.sh` を必ず実行
3. **PR作成時**: すべてのテストが通ることを確認

## Git Pushフックでの自動実行

プッシュ時にテストが自動実行されます：

### クイックテスト（デフォルト）
```bash
git push
```
- スモークテストのみ実行（約10秒）
- 基本的な動作確認のみ

### フルテストスイート ⚠️ 推奨
```bash
RUN_FULL_TESTS=true git push
```
- すべてのE2Eテストを実行（約2-3分）
- 全テストファイルが自動的に実行される
- **重要な変更をプッシュする際は必ず使用**

## テストディレクトリ構造

```
tests/
├── e2e/                    # E2Eテスト（Puppeteer）
│   ├── test-*.cjs         # 各種テストファイル
│   └── utils/             # テストユーティリティ
│       ├── TestFramework.cjs
│       └── GameTestHelpers.cjs
├── screenshots/           # テスト時のスクリーンショット
├── logs/                  # テストログ
└── reports/              # テストレポート
```

## アーキテクチャ変更後の主なテスト対象

1. **GameCore初期化**
   - ServiceLocatorの初期化
   - SystemManagerへのシステム登録
   - MusicSystemの初期化
   - GameLoopの開始

2. **State遷移**
   - MenuState → PlayState
   - PlayState → GameOver/Clear

3. **ゲームプレイ**
   - プレイヤー操作
   - 物理演算
   - アイテム収集
   - 敵との衝突

4. **システム統合**
   - 各Adapterの動作確認
   - EventBusによる通信

## テストフレームワーク

### TestFramework.cjs
E2Eテストの基盤となるフレームワークです。

**主要機能**
- Puppeteerブラウザインスタンスの管理
- ページナビゲーションとスクリーンショット
- エラートラッキング
- テストログの自動保存
- クリーンアップ処理

**設定オプション**
```javascript
{
    headless: true,        // ヘッドレスモード（デフォルト: true）
    devtools: false,       // DevTools表示（デフォルト: false）
    timeout: 30000,        // テストタイムアウト（必須）
    logToFile: true,       // ログファイル出力（デフォルト: true）
    screenshotPath: 'tests/screenshots',
    logPath: 'tests/logs'
}
```

**Puppeteer起動オプション**
- `--no-sandbox`: サンドボックスを無効化（CI/Docker環境用）
- `--disable-setuid-sandbox`: setuidサンドボックスを無効化
- `--disable-dev-shm-usage`: 共有メモリ使用を無効化（メモリ制限環境用）
- `--disable-gpu`: GPU使用を無効化（ヘッドレスモード安定化）

## テスト作成ガイド

### 基本構造

```javascript
const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({ 
        headless: false,  // ブラウザ表示（デバッグ用）
        verbose: true     // 詳細ログ出力
    });
    
    await test.runTest(async (t) => {
        // テスト初期化
        await t.init('テスト名');
        await t.injectErrorTracking();
        
        // ゲーム開始
        await t.navigateToGame('http://localhost:3000');
        await t.waitForGameInitialization();
        await t.startNewGame();
        
        // テストロジック
        // ...
        
        // エラーチェック
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

### 共通ヘルパーメソッド (GameTestHelpers)

| メソッド | 説明 | 使用例 |
|----------|------|--------|
| **init(name)** | テスト初期化 | `await t.init('Enemy Damage Test')` |
| **navigateToGame(url)** | ゲームページへ移動 | `await t.navigateToGame('http://localhost:3000?s=0-2')` |
| **waitForGameInitialization()** | ゲーム初期化待機 | `await t.waitForGameInitialization()` |
| **startNewGame()** | 新規ゲーム開始 | `await t.startNewGame()` |
| **movePlayer(direction, ms)** | プレイヤー移動 | `await t.movePlayer('right', 1000)` |
| **jumpPlayer()** | ジャンプ実行 | `await t.jumpPlayer()` |
| **getPlayerStats()** | プレイヤー情報取得 | `const stats = await t.getPlayerStats()` |
| **assertState(state)** | ゲーム状態確認 | `await t.assertState('play')` |
| **screenshot(name)** | スクリーンショット | `await t.screenshot('test-scene')` |
| **wait(ms)** | 待機 | `await t.wait(1000)` |
| **checkForErrors()** | エラーチェック | `await t.checkForErrors()` |

### ステージ指定

URLパラメータでテスト用ステージを指定可能：

| ステージID | 用途 | URL例 |
|------------|------|-------|
| stage1-1 | 基本ステージ | `?s=1-1` |
| stage1-2 | 上級ステージ | `?s=1-2` |
| stage0-1 | チュートリアル | `?s=0-1` |
| stage0-2 | 敵ダメージテスト用 | `?s=0-2` |

### テスト作成のヒント

1. **イベント駆動テストを優先**
   - 可能な限りイベント駆動でテストを実装すること
   - 固定時間の待機 (`await t.wait()`) よりもイベント監視を推奨
   - 必要なイベントが実装側になければ、パフォーマンスに大きな影響を与えない限り追加可能
   ```javascript
   // 推奨: イベント駆動
   await t.page.evaluate(() => {
       return new Promise(resolve => {
           window.addEventListener('player:respawned', resolve, { once: true });
       });
   });
   
   // 非推奨: 固定時間待機
   await t.wait(500);
   ```

2. **条件待機を使用**
   ```javascript
   await t.waitForCondition(() => {
       return window.game?.stateManager?.currentState?.name === 'play';
   }, 10000, 'PlayState ready');
   ```

3. **詳細な状態取得**
   ```javascript
   const gameData = await t.page.evaluate(() => {
       const state = window.game?.stateManager?.currentState;
       const player = state?.player;
       return {
           playerPos: { x: player.x, y: player.y },
           lives: state?.lives || 0
       };
   });
   ```

## 新しいテストを追加する際の手順

### 1. テストファイルの作成
- ファイル名は `test-[機能名].cjs` の形式で作成
- `tests/e2e/` ディレクトリに配置
- 上記の基本構造テンプレートを使用

### 2. ドキュメントの更新 ⚠️ 重要
新しいテストを追加した際は、必ず以下のドキュメントを更新してください：

1. **testing.md のテストファイル一覧表を更新**
   - 「E2Eテストファイル一覧」セクションの表に新しいテストを追加
   - ファイル名、目的、主なテスト内容、実行時間を記載

2. **CLAUDE.md のテスト実行セクションを確認**
   - 特殊な実行方法が必要な場合は記載

### 3. テストの自動実行
- **npm test への自動追加**: `test-` で始まる `.cjs` ファイルは自動的に `npm test` で実行されます
- 手動での登録は不要（run-all-tests.cjs が自動検出）

### 注意事項
- テストは失敗すると即座にテストスイート全体が停止します
- 全てのテストが成功する必要があります
- 新しいテストが既存のテストに影響を与えないよう注意