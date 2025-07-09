# Issue #116 E2Eテストタイムアウト問題の修正

作業日: 2025-07-09
担当: Claude
Issue: #116

## 問題の概要

E2Eテストの`test-performance.cjs`が2分以上かかりタイムアウトする問題が発生。
個別テストは成功するが、フルテスト実行時に不安定になる状況。

## 原因調査

### 1. 当初の仮説（誤り）
- `slowMo: 50` 設定がパフォーマンステストのFPS測定に影響
- → 実際にはslowMo自体が不要な設定だった

### 2. 真の原因
1. **GameLoopの実装問題**
   - フレームリミッターが約16.7%のフレームをドロップ
   - modulo演算によるタイミングドリフトが発生

2. **test-spring-bounce.cjsの無限バウンス**
   - プレイヤーがスプリング上で永遠にバウンスし続ける
   - テストがタイムアウトまで終了しない

3. **テストフレームワークの問題**
   - テスト間のブラウザクリーンアップが不完全
   - メモリとプロセスが蓄積

## 実施した修正

### 1. slowMo設定の完全削除
```javascript
// 削除前
const test = new GameTestHelpers({ 
    headless: false,
    verbose: true,
    slowMo: 50,  // ← 削除
    timeout: 30000
});
```

### 2. GameLoopの固定タイムステップ実装
```typescript
// 修正前: フレームスキップ方式
const elapsedFrames = Math.floor(elapsed / this.frameTime);
for (let i = 0; i < elapsedFrames; i++) {
    updateCallback(this.frameTime / 1000);
}

// 修正後: アキュムレーターパターン
while (elapsed >= this.frameTime && this._running) {
    updateCallback(this.frameTime / 1000);
    elapsed -= this.frameTime;
    this._lastTime += this.frameTime;
    
    // Spiral of death防止
    if (currentTime - this._lastTime > this.frameTime * 5) {
        this._lastTime = currentTime - this.frameTime;
        break;
    }
}
```

### 3. test-spring-bounce.cjsの修正
```javascript
// プレイヤーをスプリングから離してから着地を待つ
await t.page.evaluate(() => {
    const player = window.game?.stateManager?.currentState?.player;
    if (player) {
        player.x = 150;  // スプリングから離れた位置へ
        player.vx = 0;
        player.vy = 0;
    }
});
```

### 4. テストフレームワークの改善
- テスト間の待機時間: 2秒 → 5秒
- ブラウザクリーンアップ処理の強化
- エラーハンドリングの改善
- Puppeteer起動オプションの最適化

## 学んだ教訓

1. **パフォーマンス問題は複数の原因が絡むことが多い**
   - 最初の仮説に固執せず、データに基づいて判断する
   - 問題を切り分けて個別に検証する

2. **テストの独立性が重要**
   - 各テストは他のテストの状態に依存してはいけない
   - テスト後のクリーンアップを確実に行う

3. **固定タイムステップの重要性**
   - ゲームループは環境に依存しない実装が必要
   - 特にテスト環境では一貫性が重要

## 今後の改善提案

1. **テスト並列実行の検討**
   - 現在は直列実行のため時間がかかる
   - 並列実行でテスト時間を短縮可能

2. **メモリプロファイリングの追加**
   - 長時間実行時のメモリリークを検出
   - パフォーマンス問題の早期発見

3. **テストの粒度調整**
   - 重要度に応じてテストを分類
   - クイックテストとフルテストの使い分け