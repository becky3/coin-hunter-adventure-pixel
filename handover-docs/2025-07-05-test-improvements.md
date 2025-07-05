# 2025-07-05 テスト改善とスライムジャンプ問題の解決

## 概要
PR #94の後にE2Eテストが失敗する問題を解決し、テスト環境の改善を行いました。

## 解決した問題

### 1. スプライト読み込みタイムアウト問題
- **症状**: E2Eテストが「Timeout waiting for PlayState ready」で失敗
- **原因**: Vite開発サーバーでのfetch遅延（300-1600ms/ファイル）
- **解決策**: 
  - `spriteData.ts`を作成し、全スプライトJSONをバンドル
  - `bundledData.ts`で全リソース（config、stages、music）をバンドル
  - 結果: PlayState初期化時間が2188ms → 10-14msに短縮

### 2. 敵（スライム）が地面から落下する問題
- **症状**: テスト環境でスライムがy=192から落下してy=1782+に到達
- **原因**: Slimeクラスの`updateAI`でフレーム3にジャンプ（vy=-5.00）
- **解決策**: 
  - スライムからジャンプロジックを削除
  - `jumpHeight`、`jumpCooldown`、`jumpInterval`プロパティを削除
  - `jump()`メソッドを削除

### 3. テストランナーの改善
- **問題**: テスト失敗時も全テストが実行され、失敗箇所が不明確
- **解決策**:
  - クリティカルテスト失敗時に即座に停止
  - 各テストに60秒のタイムアウトを設定
  - テスト間に2秒の遅延を追加（リソースクリーンアップ用）

## コード変更

### spriteData.ts
```typescript
// 全スプライトJSONをインポートしてバンドル
import playerIdle from './player/idle.json';
// ... 他のインポート

export const spriteDataMap: Record<string, any> = {
    'player/idle': playerIdle,
    // ... 全スプライトのマッピング
};
```

### SpriteLoader.ts
```typescript
// バンドルデータを優先的に使用
if (this.useBundledData && spriteDataMap[key]) {
    console.log(`[SpriteLoader] Using bundled data for: ${key}`);
    const data = spriteDataMap[key] as SpriteData;
    this.cache.set(key, data);
    return data;
}
```

### Slime.ts
```typescript
// ジャンプロジック削除前
protected updateAI(deltaTime: number): void {
    if (this.grounded) {
        if (this.jumpCooldown <= 0) {
            this.jump();
            this.jumpCooldown = this.jumpInterval;
        }
    }
}

// ジャンプロジック削除後
protected updateAI(_deltaTime: number): void {
    if (this.state === 'dead' || this.state === 'hurt') {
        return;
    }

    if (this.grounded) {
        this.vx = this.moveSpeed * this.direction;
        this.animState = 'move';
    } else {
        this.animState = 'jump';
    }
}
```

## パフォーマンス改善結果

### スプライト読み込み時間
- player/idle: 354ms → 1.8ms
- terrain/spring: 1618ms → 2.0ms
- 全体のPlayState初期化: 2188ms → 10-14ms

### テスト実行結果
- Basic Flow Test: PASSED (13.42s)
- Enemy Damage Test: PASSED (26.62s)
- Fall Damage Test: PASSED (16.52s)
- Performance Test: PASSED (42.00s)
- Stress Test: PASSED (10.39s)

## 学んだ教訓

1. **開発サーバーのfetch遅延**
   - Viteの開発サーバーは各リクエストでモジュール変換を行うため遅い
   - 本番環境では問題ないが、テスト環境では致命的
   - バンドリングで回避可能

2. **物理エンジンのデバッグ**
   - フレーム単位のログが重要
   - エンティティの初期状態（grounded=false）に注意
   - 不要な自動動作（ジャンプ等）は削除すべき

3. **テストランナーの設計**
   - 失敗時の即座停止で問題特定が容易に
   - タイムアウト設定で無限ループを防止
   - テスト間の遅延でリソース競合を回避

## 今後の課題

1. **バンドルデータの自動生成**
   - 現在は手動でインポート文を追加
   - ビルドスクリプトで自動化可能

2. **テスト環境の独立性**
   - 各テストが完全に独立して実行できるように
   - ブラウザインスタンスの再利用vs新規作成のトレードオフ

3. **物理エンジンのテスト**
   - エンティティの初期配置検証
   - 衝突判定の単体テスト追加