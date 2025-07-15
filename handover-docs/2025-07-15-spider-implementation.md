# Spider Enemy Implementation (2025-07-15)

## 概要

Issue #133に基づくスパイダー敵キャラクターの実装。天井を這い回り、プレイヤーを検知すると糸で降下する敵。

## 実装内容

### 1. Spiderクラスの作成

`src/entities/enemies/Spider.ts`

- **親クラス**: Enemy
- **実装インターフェース**: EntityInitializer
- **状態管理**: crawling, descending, ascending, waiting の4状態
- **特徴**:
  - 物理エンジンを使わない独自の移動ロジック（physicsEnabled = false）
  - 天井這い回りと糸降下の実装
  - EntityInitializerによる自己初期化

### 2. スプライトデータの作成

16×16ピクセルのスプライト（4種類）:

- `spider_idle.json` - 待機状態
- `spider_walk1.json` - 歩行アニメーション1
- `spider_walk2.json` - 歩行アニメーション2  
- `spider_thread.json` - 糸にぶら下がった状態

### 3. 設定ファイルの更新

- `characters.json`: スパイダーのステータス設定追加
- `spriteData.ts`: スプライトデータのインポートと登録
- `EntityFactory.ts`: スパイダーの登録

### 4. E2Eテストの作成

`test-spider.cjs`: 
- 生成テスト
- 天井這い移動テスト
- プレイヤー検知テスト
- 糸降下テスト
- ダメージテスト
- 踏みつけテスト

## 技術的なポイント

### 状態管理

```typescript
type SpiderState = 'crawling' | 'descending' | 'ascending' | 'waiting';
type SpiderSurface = 'ceiling' | 'wall_left' | 'wall_right' | 'floor';
```

現在は`ceiling`のみ使用しているが、将来的に壁や床への這い回りも可能な設計。

### プレイヤー検知ロジック

```typescript
private checkPlayerProximity(): void {
    if (this.spiderState !== 'crawling' || this.currentSurface !== 'ceiling') {
        return;
    }
    
    const player = this.findPlayer();
    if (!player) return;
    
    const xDistance = Math.abs(player.x + player.width / 2 - (this.x + this.width / 2));
    
    if (xDistance < this.detectionRange && player.y > this.y) {
        this.spiderState = 'descending';
        this.threadY = this.y;
    }
}
```

### アニメーション切り替え

```typescript
let spriteKey = 'enemies/spider_idle';
if (this.animState === 'walk') {
    const frameIndex = Math.floor(Date.now() / 150) % 2;
    spriteKey = `enemies/spider_walk${frameIndex + 1}`;
} else if (this.spiderState === 'descending' || this.spiderState === 'ascending') {
    spriteKey = 'enemies/spider_thread';
}
```

## 課題と今後の改善点

1. **糸の描画**: 現在、糸自体は描画されていない。将来的に糸のビジュアル追加を検討。

2. **壁・床への這い回り**: 実装はされているが未使用。ステージデザインに応じて活用可能。

3. **プレイヤー検知の最適化**: 現在100ms間隔でチェックしているが、パフォーマンスに応じて調整可能。

## 関連Issue

- Issue #133: スパイダーの実装
- Issue #167: EntityManagerのリファクタリング（同時に実装）

## テスト結果

E2Eテスト（test-spider.cjs）: ✅ 全項目パス（約11秒）