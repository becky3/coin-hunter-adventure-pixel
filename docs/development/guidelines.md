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
- **配列・オブジェクトアクセス時は必ず存在チェックを行う**
- **存在しない場合はエラーをスローする（フォールバック値は使用しない）**

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
**原則：コードは自己文書化し、実装内容の説明コメントは書かない**

#### 必須コメント
- **クラス定義**: すべてのクラスにJSDocコメント必須
- **eslint-disable**: 使用時は必ず理由を説明

#### 許可されるコメント
- **ファイルレベル**: ファイルの目的を説明（ファイル先頭）
- **JSDoc**: クラス、インターフェース、複雑な関数の説明
- **TODO/FIXME**: 作業項目の記録（警告として表示）
- **アルゴリズム説明**: 複雑なロジックの理由説明のみ

#### 禁止されるコメント
- **インラインコメント**: コードと同じ行のコメント
- **独立した行の説明コメント**: 変数や動作を説明するコメント
- **動作説明**: `// プレイヤーを移動` のような自明なコメント
- **コメントアウト**: 使用しないコードはコメントではなく削除

#### ESLintによる自動チェック
```javascript
// ❌ エラー：インラインコメント
const speed = 5; // プレイヤーの速度

// ✅ 正しい：前の行に記載
// プレイヤーの基本移動速度
const speed = 5;

// ❌ エラー：クラスにJSDocなし
export class Player {

// ✅ 正しい：JSDoc付き
/**
 * Player character entity
 */
export class Player {
```

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

### pre-commitフックによる自動チェック

コミット時に以下のチェックが自動実行されます：

1. **Lintチェック**: ESLintによるコーディング規約チェック
2. **型チェック**: TypeScriptコンパイラによる型安全性チェック
3. **ビルドチェック**: プロジェクトが正常にビルドできることを確認

いずれかのチェックに失敗した場合、コミットは中断されます。

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

### 静かな失敗の防止
早期リターンパターンを使用する際は、必ず適切なログを出力してください：

```typescript
// ❌ 悪い例：静かに失敗
if (!this.target) return;

// ✅ 良い例：警告ログを出力
if (!this.target) {
    Logger.warn('[CameraController] update called but no target is set');
    return;
}
```

### 実装例
```typescript
// 防御的プログラミング
if (renderer.hasSprite && !renderer.hasSprite(key)) {
    Logger.warn(`[Renderer] Sprite not found: ${key}`);
    // フォールバック処理
}

// 非同期処理
async function loadAsset() {
    try {
        await fetch(url);
    } catch (error) {
        Logger.error('Asset load error:', error);
        eventBus.emit('asset:load-error', { error });
    }
}

// null安全性とログ出力
if (!this.player) {
    Logger.warn('[EntityManager] player is not set');
    return;
}

// onCollisionの引数チェック
onCollision(collisionInfo?: CollisionInfo): void {
    if (!collisionInfo || !collisionInfo.other) {
        Logger.warn('[Entity] onCollision called with invalid collisionInfo');
        return;
    }
    // 処理を続行
}
```

### ログ出力のガイドライン
1. **Loggerクラスを使用**（console.log/errorの直接使用は避ける）
2. **クラス名とメソッド名を含める**（例：`[Player] onCollision`）
3. **具体的な情報を含める**（変数の値など）
4. **適切なログレベルを選択**：
   - `Logger.log()`: 通常の情報
   - `Logger.warn()`: 警告（処理は継続可能）
   - `Logger.error()`: エラー（重大な問題）

## デバッグ機能

### デバッグオーバーレイ
開発中の動作確認用にデバッグオーバーレイが利用可能です。

#### キーボードショートカット
- **F3**: デバッグ情報の表示/非表示
- **+/-**: ゲーム速度の調整
- **0**: ゲーム速度リセット
- **D**: ステージ選択（メニュー画面のみ）
- **←→**: ステージ選択切り替え（メニュー画面のみ）
- **O**: 敵生成ダイアログ（プレイ中のみ）

#### 敵生成機能
プレイ中にOキーを押すと敵生成ダイアログが開きます。
- 生成可能な敵タイプが一覧表示される
- 選択した敵はプレイヤーの右上（+80px, -60px）に生成される
- 新しい敵の実装テストに使用

#### デモステージ
`stage0-4` は敵の動作確認用デモステージです。
- URLパラメータ `?s=0-4` で直接アクセス可能
- 幅広い平坦な地形で敵の基本動作をテスト可能

## 禁止事項
- `eval()` の使用
- マジックナンバーの直接使用
- グローバル変数の使用
- 秘密情報のハードコーディング

## 参考資料
- [ゲーム仕様]({{ site.baseurl }}/specifications/game.html)
- [技術仕様]({{ site.baseurl }}/specifications/technical.html)
- [アーキテクチャ]({{ site.baseurl }}/development/architecture.html)