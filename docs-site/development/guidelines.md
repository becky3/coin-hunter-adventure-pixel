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
- `any`型の使用は禁止
- strictモードを有効化

### コメントのルール
**原則：実装内容の説明コメントは書かない**

許可されるコメント：
- JSDocコメント
- 複雑なアルゴリズムの説明
- TODO/FIXMEコメント
- なぜその実装を選んだかの理由

### System vs Manager
- **System**: 低レベルの処理（例：InputSystem、RenderSystem）
- **Manager**: ライフサイクル管理（例：GameStateManager、AssetManager）

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
        // エラー処理
    }
}
```

## 禁止事項
- `eval()` の使用
- マジックナンバーの直接使用
- グローバル変数の使用
- 秘密情報のハードコーディング

## 参考資料
- [ゲーム仕様](../specifications/game.md)
- [技術仕様](../specifications/technical.md)
- [アーキテクチャ](./architecture.md)