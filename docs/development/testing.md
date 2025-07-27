---
layout: default
title: テストガイド
parent: 開発者向け
---

# テストガイド

## TypeScript型チェック

### 基本コマンド

```bash
# 型チェックを実行
npm run typecheck

# 安全な型チェックスクリプト（推奨）
npm run typecheck:safe

# strictモードで型チェック
npm run typecheck:strict
```

### 安全な型チェックスクリプト

`npm run typecheck:safe`は以下の機能を提供します：

- エラーの適切なキャプチャと表示
- エラー数のカウント
- 結果を`typecheck-output.log`に保存（.gitignoreに含まれる）
- 終了コードの適切な処理

### エラーの検索方法

```bash
# 特定のエラータイプを検索（typecheckの出力から）
npm run typecheck:safe
grep "TS2339" typecheck-output.log  # プロパティアクセスエラー
grep "TS2345" typecheck-output.log  # 型の不一致エラー

# または直接tscを使用
npx tsc --noEmit 2>&1 | grep "TS2339"
```

### よく使うエラーコード

- **TS2339**: Property 'X' does not exist on type 'Y' - プロパティアクセスエラー
- **TS2345**: Argument of type 'X' is not assignable to parameter of type 'Y' - 引数の型エラー
- **TS2322**: Type 'X' is not assignable to type 'Y' - 代入の型エラー
- **TS2341**: Property 'X' is private and only accessible within class 'Y' - privateアクセスエラー

### 型チェック手順

1. **全体の型チェック実行**
   ```bash
   npm run typecheck
   ```

2. **特定のエラータイプを確認**
   ```bash
   npm run typecheck 2>&1 | grep "TS2339" | head -20
   ```

3. **エラーの詳細を確認**
   ```bash
   npm run typecheck 2>&1 | head -50
   ```

4. **進捗の確認**
   - エラー数の変化を記録
   - 特定のエラータイプが解消されたか確認

## クイックスタート

E2Eテストを書く最も簡単な方法は、`test-simple-quickstart.cjs` を参考にすることです。

### 実行方法

```bash
# Claudeでの実行（タイムアウト10分設定）
npm run test:claude  # 古いログとスクリーンショットを自動削除

# ローカルでの実行
npm test  # 全テストを並列実行（約80秒）

# 個別テスト実行
node tests/e2e/test-simple-quickstart.cjs
```

### 最小限のテストコード例

```javascript
const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({ timeout: 30000 });
    
    await test.runTest(async (t) => {
        await t.init('My Test');
        
        // これだけでゲーム開始！
        await t.quickStart('1-1');
        
        // プレイヤーを動かす
        await t.movePlayer('right', 1000);
        await t.jumpPlayer();
        
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

## 主要なヘルパーメソッド

### quickStart(stageName, options)
ゲームを一発で開始（2025-07-22追加）
```javascript
await t.quickStart('1-1');  // ステージ1-1で開始
```

### getEntity(type, options)
任意のエンティティを取得（2025-07-22追加）
```javascript
const player = await t.getEntity('player');
const enemies = await t.getEntity('enemies');
const slime = await t.getEntity('Slime', { single: true });
```

### その他の便利メソッド
- `movePlayer(direction, ms)` - プレイヤー移動
- `jumpPlayer()` - ジャンプ
- `teleportPlayer(x, y)` - テレポート
- `waitForEntity(type, timeout)` - エンティティ待機
- `getLives()` - ライフ数取得
- `getStageInfo()` - ステージ情報取得

## E2Eテストファイル一覧

| ファイル名 | 内容 | 実行時間 |
|-----------|------|----------|
| **test-simple-quickstart.cjs** | 新しいヘルパーメソッドの使用例（推奨参考ファイル） | ~13秒 |
| test-basic-flow.cjs | 基本フロー＋スモークテスト統合 | ~25秒 |
| test-jump-mechanics.cjs | ジャンプメカニクス統合 | ~30秒 |
| test-powerup-features.cjs | パワーアップ機能統合 | ~25秒 |
| test-enemy-types.cjs | 敵タイプ統合（Bat、Spider） | ~25秒 |
| test-enemy-damage.cjs | 敵ダメージシステム | ~25秒 |
| test-performance.cjs | パフォーマンス監視 | ~15秒 |
| test-armor-knight.cjs | ArmorKnight基本動作 | ~15秒 |
| test-armor-knight-stomp-simple.cjs | ArmorKnight踏みつけ | ~15秒 |
| test-armor-knight-charge-simple.cjs | ArmorKnight突進 | ~15秒 |
| test-dash-movement.cjs | ダッシュ移動機能（SHIFT+移動） | ~15秒 |
| test-falling-floor.cjs | 落ちる床ギミック（振動→落下） | ~15秒 |
| test-fall-damage.cjs | 落下ダメージテスト | ~27秒 |
| test-stage-validation.cjs | ステージデータのバリデーション | ~2秒 |
| その他多数 | 各種機能テスト | - |

### 手動実行専用テスト

以下のテストは `npm test` に含まれません：

| ファイル名 | 内容 | 実行時間 |
|-----------|------|----------|
| stage2-2-check.cjs | Stage 2-2の動作確認（FallingFloor、Spider） | ~9秒 |

## 新しいテストを追加する手順

1. **テンプレートをコピー**
   ```bash
   cp tests/e2e/test-template.cjs tests/e2e/test-your-feature.cjs
   ```

2. **test-simple-quickstart.cjs を参考に実装**
   - 最小限のコードで動作確認が可能
   - 新しいヘルパーメソッドを活用

3. **このドキュメントを更新**
   - テストファイル一覧に追加（必須）

## 詳細情報

より詳しい情報が必要な場合：
- テストヘルパーの全メソッド: `tests/e2e/utils/GameTestHelpers.cjs` を参照
- 実装例: `test-simple-quickstart.cjs` を参照

## トラブルシューティング

### Claudeでのテスト実行
```bash
npm run test:claude  # タイムアウト10分で実行
```

**注意**: `test:claude`コマンドは以下の機能を含みます：
- `tests/logs/`ディレクトリの古いログファイルを自動削除
- `tests/screenshots/`ディレクトリの古いスクリーンショットを自動削除

### よくある問題
- **タイムアウト**: 個別テストで原因を特定
- **AudioContext警告**: URLパラメータ `?test=true` で抑制可能

## 参考リンク

- [GameTestHelpers.cjs](../../tests/e2e/utils/GameTestHelpers.cjs) - ヘルパーメソッドの実装
- [test-simple-quickstart.cjs](../../tests/e2e/test-simple-quickstart.cjs) - 推奨参考実装
- [ステージ作成ガイド]({{ site.baseurl }}/development/stage-creation.html) - ステージ作成とバリデーション
- [レベルデザインガイド]({{ site.baseurl }}/development/level-design-guide.html) - ステージ設計のベストプラクティス