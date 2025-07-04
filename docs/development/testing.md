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

# 個別テストを実行
npm run test:e2e -- tests/e2e/test-basic-flow.cjs
npm run test:e2e -- tests/e2e/test-enemy-damage.cjs
npm run test:e2e -- tests/e2e/test-fall-damage.cjs
npm run test:e2e -- tests/e2e/test-performance.cjs
npm run test:e2e -- tests/e2e/test-stress.cjs

# スモークテスト（簡易チェック）
npm run test:e2e -- tests/e2e/smoke-test.cjs
```

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