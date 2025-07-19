---
layout: default
title: テストガイド
parent: 開発者向け
---

# テストガイド

## 自動テスト

### E2Eテスト実行
```bash
# 全テストを実行（シーケンシャル、約4分）
npm test

# 全テストを並列実行（推奨、約80秒で完了）
npm run test:parallel

# テスト階層別実行
npm run test:basic    # 基本フローのみ（~25秒）
npm run test:core     # 基本＋主要機能（~1分）
npm run test:full     # 全テスト並列実行（~1.5分）

# 個別テストを実行
node tests/e2e/test-enemy-damage.cjs
```

### 並列テスト実行について

並列テストは3つのワーカープロセスで同時実行され、以下の利点があります：
- **実行時間**: 約80秒（シーケンシャル実行の約1/4）
- **独立性**: 各テストが独立したブラウザインスタンスで実行
- **信頼性**: テスト間の干渉がない（ワーカー起動時に2秒の遅延）
- **pre-pushフック**: `git push`時に自動で並列テストが実行されます

### 安定版テスト実行（run-tests-stable.cjs）

リソース要求に基づいてテストをグループ化し、段階的に実行する新しい戦略：

```bash
# 安定版テストランナーを実行
node tests/e2e/run-tests-stable.cjs
```

**グループ構成**:
- **Fast**: 軽量テスト（3ワーカー、30秒タイムアウト）
  - test-stage-validation.cjs
  - test-fall-damage.cjs
  - test-basic-flow.cjs
- **Medium**: 中量テスト（2ワーカー、60秒タイムアウト）
  - test-enemy-types.cjs
  - test-jump-mechanics.cjs
  - test-performance.cjs
  - test-player-respawn-size.cjs
- **Heavy**: 重量テスト（1ワーカー、90秒タイムアウト）
  - test-enemy-damage.cjs
  - test-powerup-features.cjs
  - test-stage0-4-simple.cjs

各グループ間には5秒の待機時間を設けてリソースの解放を確保します。

### E2Eテストファイル一覧（2025-07-19更新）

#### 統合されたテストファイル

| ファイル名 | 目的 | 統合内容 | 実行時間 |
|------------|------|---------|----------|
| **test-basic-flow.cjs** | 基本フロー検証＋スモークテスト | 旧smoke-test.cjsの機能を統合、ゲーム初期化、メニュー遷移、基本操作 | ~25秒 |
| **test-jump-mechanics.cjs** | ジャンプメカニクス統合テスト | jump-physics、variable-jump、spring-bounceを統合 | ~30秒 |
| **test-powerup-features.cjs** | パワーアップ機能統合テスト | powerup-system、shield-visual、bullet-wall-collisionを統合 | ~25秒 |
| **test-enemy-types.cjs** | 敵タイプ統合テスト | bat、spiderの動作確認を統合（衝突ダメージはtest-enemy-damage.cjsでテスト） | ~25秒 |

#### 個別テストファイル

| ファイル名 | 目的 | 主なテスト内容 | 実行時間 |
|------------|------|----------------|----------|
| **test-enemy-damage.cjs** | 敵ダメージシステム | 敵衝突、踏みつけ、無敵時間、死亡・リスポーン | ~25秒 |
| **test-performance.cjs** | パフォーマンス監視 | FPS測定（55FPS以上維持）、レンダリング時間、ヒープ使用量 | ~15秒 |
| **bgm-and-debug-test.cjs** | BGM・デバッグ機能 | BGM再生/停止、ミュート、デバッグオーバーレイ | ~15秒 |
| **test-player-respawn-size.cjs** | Issue #106検証 | 小サイズ死亡後のリスポーンサイズ、横衝突判定 | ~25秒 |
| **test-fall-damage.cjs** | 落下ダメージ | 画面外落下による即死判定、ライフ減少、ゲームオーバー | ~20秒 |
| **test-stage-validation.cjs** | ステージデータ検証 | ステージ1-1〜1-3のコイン配置、エンティティ配置の妥当性チェック | ~2秒 |
| **test-stage0-4-simple.cjs** | デモステージ・敵生成 | stage0-4ロード、Oキーで敵生成ダイアログ、敵の動作確認 | ~25秒 |
| **test-armor-knight.cjs** | アーマーナイト敵テスト | 踏み判定無効化、突進動作、壁での反転、高耐久性の確認 | ~25秒 |
| **test-animation-system.cjs** | アニメーションシステム | 統一アニメーション、状態遷移、スプライト読み込み | ~20秒 |

### テストログ
- テスト実行時のログは `tests/logs/` に自動保存
- ファイル名: `[テスト名]-[タイムスタンプ].log`
- スクリーンショット: `tests/screenshots/` に保存
- **全テスト実行ログ**: `run-all-tests-[タイムスタンプ].log`
  - `npm test`実行時の全体的な進行状況を記録
  - 各テストの開始/終了、成功/失敗、実行時間を含む
  - タイムアウトした場合でも、どこまで実行されたか確認可能

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

### ローカルプッシュ時の自動テスト
```bash
git push
```
- **Lintチェック**: 必須（コード品質確認）
- **スモークテスト**: 基本的な動作確認（約25秒）
- 開発サーバーが起動していない場合はスキップされます

### フルテストの実行方法
フルテストは GitHub Actions で自動実行されるため、ローカルでの実行は通常不要です：

1. **PR作成時**: GitHub Actions が自動的にフルテストを実行
2. **mainブランチへのマージ時**: 自動的にフルテストを実行
3. **ローカルで必要な場合のみ**: `npm test`（約4分）

### 推奨ワークフロー
1. **開発中**: `npm run test:basic` で素早く確認（約25秒）
2. **プッシュ前**: `git push` でLintと並列E2Eテストが自動実行（約80秒）
3. **PR作成後**: コメントで `/test` を実行してフルテスト（並列）を確認
4. **マージ前**: テスト結果を確認してからマージ

### 並列テストの改善

以下の改善により、並列テストの安定性が向上しました：

- ワーカー数を4→3に削減（リソース競合を軽減）
- タイムアウトを90秒→120秒に延長
- ワーカー起動時に2秒の遅延を追加
- Bashツールのタイムアウト問題は解決済み（10分まで設定可能）
- Workerコードを別ファイルに分離（セキュリティ向上）
- テスト設定を共通化（環境変数で制御可能）

### テスト実行戦略の比較

| 戦略 | 実行方法 | 用途 | 実行時間 |
|------|----------|------|----------|
| **並列実行** | `npm run test:parallel` | 通常の開発・CI | 約80秒 |
| **安定版実行** | `node tests/e2e/run-tests-stable.cjs` | リソース制限環境 | 約2-3分 |
| **シーケンシャル** | `npm test` | デバッグ・問題調査 | 約4分 |

### テスト設定の環境変数

以下の環境変数でテストの動作を制御できます：

- `HEADLESS=false` - ブラウザを表示してテスト実行
- `MAX_WORKERS=4` - 並列実行のワーカー数を指定
- `ENABLE_SCREENSHOTS=true` - デバッグ用スクリーンショットを有効化

例:
```bash
HEADLESS=false npm run test:basic  # ブラウザを表示してテスト
MAX_WORKERS=2 npm run test:parallel  # 2ワーカーで並列実行
```

## GitHub Actions でのテスト実行

### 概要
GitHub Actions は手動実行のみとなっており、自動実行は無効化されています。PRコメントまたはActionsタブから実行できます。

### PRコメントでの実行（/testコマンド）
PRのコメント欄で以下のコマンドを使用：

| コマンド | 説明 | 実行時間 |
|---------|------|----------|
| `/test` | フルテストを並列実行 | 約1.5分 |
| `/test smoke` | スモークテストを実行 | 約25秒 |
| `/test full` | フルテストを並列実行（明示的） | 約1.5分 |

実行時の動作：
1. コメントに 🚀 リアクションが自動付与
2. テスト開始の通知コメントが投稿
3. PRのブランチでE2Eテストが実行

### 手動実行（Actions タブ）
1. GitHubリポジトリの「Actions」タブを開く
2. 左側から「E2E Tests」を選択
3. 「Run workflow」ボタンをクリック
4. オプションを設定：
   - テストタイプ: full / smoke
   - ブランチ: 実行したいブランチを指定

### 実行内容
1. Ubuntu 環境のセットアップ
2. Node.js 20.x のインストール
3. 依存関係のインストール
4. Puppeteer 用の依存関係インストール
5. プロジェクトのビルド
6. 開発サーバーの起動
7. E2E テストの実行（最大10分）
8. テスト結果の保存

### テスト結果の確認
- **GitHub Actions タブ**: ワークフローの実行状況を確認
- **PR ページ**: テスト結果のサマリーがコメントとして投稿される
- **アーティファクト**: テストログ、スクリーンショット、レポートをダウンロード可能

### ステータスバッジ
README に表示されるバッジで最新のテスト状態を確認できます：
- ✅ 緑: すべてのテストが成功
- ❌ 赤: テストが失敗
- 🟡 黄: テスト実行中

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
   - MenuState → SoundTestState
   - PlayState → GameOver/Clear

3. **ゲームプレイ**
   - プレイヤー操作
   - 物理演算
   - アイテム収集
   - 敵との衝突

4. **システム統合**
   - 各Adapterの動作確認
   - EventBusによる通信

5. **音響システム**
   - サウンドテスト機能での音源確認
   - BGM/SEの正常再生
   - 音量調整とミュート機能

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
        // skip_titleパラメータを使用する場合:
        // await t.navigateToGame('http://localhost:3000?skip_title=true');
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
| stage0-4 | 敵生成デモ | `?s=0-4` |

### URLパラメータ

ゲーム動作をカスタマイズできるURLパラメータ：

| パラメータ | 説明 | 使用例 | 備考 |
|------------|------|--------|------|
| **s** | ステージを指定 | `?s=1-1` | ステージIDを指定 |
| **skip_title** | タイトル画面をスキップしてゲームを開始 | `?skip_title=true` | E2Eテスト用 |

#### skip_titleパラメータの詳細

`skip_title`パラメータはE2Eテストの効率化のために実装された機能です：

**動作**
- `?skip_title=true` を指定すると、タイトル画面をスキップして直接ゲームを開始
- ステージ指定と組み合わせ可能: `?s=0-2&skip_title=true`
- デフォルトステージ（stage1-1）から開始

**注意事項**
- タイトル画面でのキー入力待機をスキップするため、初期フォーカスが設定されない
- E2Eテストでは明示的にフォーカスを設定する必要がある:
  ```javascript
  await t.clickAt(100, 100);  // または
  await t.page.focus('body');
  ```
- 通常のプレイでは使用を推奨しない（タイトル画面のBGMやアニメーションがスキップされる）

**実装場所**
- `src/utils/urlParams.ts` - URLパラメータの解析（shouldSkipTitle()メソッド）
- `src/core/GameCore.ts` - 初期状態の制御（skip_titleチェックロジック）

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