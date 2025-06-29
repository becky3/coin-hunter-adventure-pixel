# コーディング規約

このドキュメントは、coin-hunter-adventure-pixel プロジェクトのコーディング規約を定めています。

## 基本方針

- 多くのルールはESLintで自動的に強制されます（`.eslintrc.json`参照）
- TypeScriptの標準的なスタイルガイドに従います
- 詳細なスタイルルールよりも、プロジェクト固有の重要な規約に焦点を当てます

## 1. 命名規則

### 変数・関数
```typescript
// 変数: キャメルケース
let playerScore: number = 0;
let currentLevel: number = 1;

// 関数: キャメルケース（動詞で始める）
function updateGameState(): void {}
function calculateDamage(attacker: Entity, defender: Entity): number {
    // ダメージ計算ロジック
    return 0;
}
```

### 定数
```typescript
// グローバル定数: アッパースネークケース
const MAX_HEALTH = 100;
const TILE_SIZE = 16;
const GRAVITY_CONSTANT = 0.65;

// as const アサーションを使用する場合
export const GAME_CONFIG = {
    WIDTH: 256,
    HEIGHT: 240
} as const;
```

### クラス
```typescript
// クラス: パスカルケース
class PlayerCharacter extends Entity {
    private health: number;
    private score: number;
}

class PixelRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
}

class GameStateManager {
    private currentState: GameState | null;
}
```

### プライベートメンバー
```typescript
// TypeScriptではprivateキーワードを使用
class Entity {
    private position: Vector2D = { x: 0, y: 0 };
    private velocity: Vector2D = { x: 0, y: 0 };
    
    // プライベートメソッド
    private updatePhysics(): void {
        // 物理演算の更新
    }
}

// インターフェースの定義
interface Vector2D {
    x: number;
    y: number;
}
```

### ファイル名
```
// TypeScriptファイルはパスカルケースまたはキャメルケース
InputManager.ts
PixelRenderer.ts
GameStateManager.ts

// 型定義ファイル
types.ts
interfaces.ts
```

## 2. コードスタイル

### ESLintによる自動強制
以下のルールはESLintで自動的にチェックされます：
- インデント、文字列クォート、セミコロン
- 行末空白、ファイル末尾改行
- 未使用変数、命名規則

詳細は `.eslintrc.json` を参照してください。


### TypeScript必須ルール
- すべての関数パラメータと戻り値に型を明示
- `any`型の使用は禁止（やむを得ない場合はコメントで理由を説明）
- 型アサーションは最小限に留める

## 3. プロジェクト固有のルール

### Canvas/ピクセルアート固有のルール
- ピクセルアート描画時は `ctx.imageSmoothingEnabled = false` 必須
- 座標は整数値に丸める（`Math.floor()`使用）
- Canvas の `save()`/`restore()` は最小限に留める
- PixelRenderer経由で描画を行う（直接ctx操作は避ける）

### ファイル・ディレクトリ構成
- 1ファイル1クラス（または1機能）を原則とする
- ファイル名はパスカルケースまたはキャメルケース（例: `Player.ts`, `gameConstants.ts`）
- テストファイルは同名で `.test.ts` 拡張子

### コメントのルール
- **原則：実装内容の説明コメントは書かない**
- コードは自己文書化（変数名・関数名で意図を表現）
- 例外的に許可されるコメント：
  - 複雑なアルゴリズムの説明（数式など）
  - TODO/FIXMEコメント
  - 外部仕様への参照
  - なぜその実装を選んだかの理由（whatではなくwhy）

## 4. 禁止事項

- `any` 型の使用（やむを得ない場合は理由をコメント）
- `eval()` の使用
- マジックナンバーの直接使用（定数化すること）
- グローバル変数の使用
- 実装内容を説明するコメント

## 5. 推奨事項

- TypeScript の strict モードを有効にする（`tsconfig.json`）
- 型推論が可能な場合は明示的な型定義を省略してもよい
- `interface` と `type` は用途に応じて使い分ける
- 早期リターンで複雑なネストを避ける

## 6. ESLint設定

現在のESLint設定（`.eslintrc.json`）は以下の方針で運用されています：

### 現在の設定
- `@typescript-eslint/no-explicit-any`: 警告レベル（段階的に削減）
- `@typescript-eslint/no-non-null-assertion`: 警告レベル（使用は最小限に）
- `no-console`: 警告レベル（warn, error, infoは許可）

### 将来の改善予定
1. TypeScriptのstrictモード有効化後、anyの使用を禁止
2. Non-null assertion（!）の使用を段階的に削減
3. より厳格な型チェックルールの追加

## 7. 参考リンク

- [TypeScript スタイルガイド（Google）](https://google.github.io/styleguide/tsguide.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- プロジェクトの ESLint 設定: `.eslintrc.json`