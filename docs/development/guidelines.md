---
layout: default
title: 開発ガイドライン
parent: 開発者向け
---

# 開発ガイドライン

## 開発フロー

### 1. 作業開始前
- mainブランチを最新に更新
- GitHub Issueで作業内容を確認
- featureブランチを作成

### 2. Git運用ルール
- **mainブランチへの直接プッシュは禁止**
- ブランチ命名：
  - `feature/機能名` - 新機能
  - `fix/バグ名` - バグ修正
  - `docs/内容` - ドキュメント

### 3. コミットメッセージ
```
<type>: <subject>

[optional body]
```
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- refactor: リファクタリング

## コーディング規約

### 命名規則
```typescript
// 定数：アッパースネークケース
const MAX_HEALTH = 100;

// 変数・関数：キャメルケース
let playerScore = 0;
function updateGameState() {}

// クラス：パスカルケース
class PlayerCharacter {}

// プライベート：privateキーワード使用
private position: Vector2D;
```

### TypeScript必須ルール
- すべての関数パラメータと戻り値に型を明示
- `any`型の使用は禁止（`unknown`型を推奨）
- strictモードを有効化
- インターフェースを活用した型定義
- 未使用のインポートは削除する
- ベンダー固有プロパティも適切に型定義する

#### 型安全性のベストプラクティス
```typescript
// ❌ 悪い例：any型の使用
(this.ctx as any).vendorProperty = false;

// ✅ 良い例：適切な型定義
const extCtx = this.ctx as CanvasRenderingContext2D & { 
    vendorProperty?: boolean;
};
extCtx.vendorProperty = false;
```

### コメントのルール
**原則：実装内容の説明コメントは書かない**

許可されるコメント：
- JSDocコメント
- 複雑なアルゴリズムの説明
- TODO/FIXMEコメント
- なぜその実装を選んだかの理由

### アーキテクチャパターン

#### System vs Manager
- **System**: 低レベルの処理（例：InputSystem、RenderSystem）
- **Manager**: ライフサイクル管理（例：GameStateManager、AssetManager）

#### EventBusパターン
- モジュール間の疎結合な通信に使用
- イベント名は明確で一貫性のある命名を使用
- 型安全なイベントハンドラーの実装を推奨

#### 依存性注入
- GameServicesインターフェースを通じた依存性の注入
- コンストラクタでの依存性受け取りを推奨

## 品質保証

### 作業完了チェック
```bash
# lintチェック
npm run lint

# テスト実行
npm test

# 動作確認（必須）
npm run dev
```

確認項目：
- ブラウザコンソールにエラーがない
- 60FPSでの安定動作
- 他の機能への影響がない

## Canvas/ピクセルアート固有ルール
- `ctx.imageSmoothingEnabled = false` 必須
- 座標は整数値に丸める
- PixelRenderer経由で描画

## パフォーマンス
- 不要な再描画を避ける
- オブジェクトプールを使用
- 画面外のオブジェクトをスキップ

## エラーハンドリング

### 基本原則
- try-catchブロックの適切な使用
- エラーイベントの発行による通知
- null/undefinedチェックの徹底

### 実装例
```typescript
// 防御的プログラミング
if (renderer.hasSprite && !renderer.hasSprite(key)) {
    // フォールバック処理
}

// 非同期処理
async function loadAsset() {
    try {
        await fetch(url);
    } catch (error) {
        console.error('Asset load error:', error);
        eventBus.emit('asset:load-error', { error });
    }
}

// null安全性
if (!this.player) return;
// 非null表明(!)の使用は避ける
```

## 禁止事項
- `eval()` の使用
- マジックナンバーの直接使用
- グローバル変数の使用
- 秘密情報のハードコーディング

## 参考資料
- [ゲーム仕様]({{ site.baseurl }}/specifications/game.html)
- [技術仕様]({{ site.baseurl }}/specifications/technical.html)
- [アーキテクチャ]({{ site.baseurl }}/development/architecture.html)