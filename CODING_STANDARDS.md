# コーディング規約

このドキュメントは、coin-hunter-adventure-pixel プロジェクトのコードの書き方に関する規約を定めています。

## 1. 命名規則

### 変数・関数
```javascript
// 変数: キャメルケース
let playerScore = 0;
let currentLevel = 1;

// 関数: キャメルケース（動詞で始める）
function updateGameState() {}
function calculateDamage(attacker, defender) {}
```

### 定数
```javascript
// グローバル定数: アッパースネークケース
const MAX_HEALTH = 100;
const TILE_SIZE = 16;
const GRAVITY_CONSTANT = 0.65;
```

### クラス
```javascript
// クラス: パスカルケース
class PlayerCharacter {}
class PixelRenderer {}
class GameStateManager {}
```

### プライベートメンバー
```javascript
// プライベート: アンダースコア接頭辞
class Entity {
    constructor() {
        this._position = { x: 0, y: 0 };
        this._velocity = { x: 0, y: 0 };
    }
    
    _updatePhysics() {
        // プライベートメソッド
    }
}
```

### ファイル名
```
// kebab-case を使用
input-manager.js
pixel-renderer.js
game-state-manager.js
```

## 2. コードスタイル

### 基本設定（ESLint準拠）
- **インデント**: スペース4つ
- **文字列**: シングルクォート優先
- **セミコロン**: 必須
- **改行コード**: LF (Unix)
- **行末空白**: 禁止
- **ファイル末尾改行**: 必須
- **最大行長**: 100文字（推奨）

### ブロック・制御構文
```javascript
// if文: 1行でも波括弧必須
if (condition) {
    doSomething();
}

// else: 同じ行に配置
if (condition) {
    doSomething();
} else {
    doSomethingElse();
}

// for/while: スペースを適切に
for (let i = 0; i < array.length; i++) {
    // 処理
}

// switch: インデントとbreak
switch (state) {
    case 'menu':
        showMenu();
        break;
    case 'game':
        runGame();
        break;
    default:
        showError();
}
```

### 関数
```javascript
// 関数宣言: スペースあり
function calculateScore(points, multiplier) {
    return points * multiplier;
}

// アロー関数: 1行の場合は括弧省略可
const double = x => x * 2;
const add = (a, b) => a + b;

// 複数行の場合
const processData = (data) => {
    const result = validate(data);
    return transform(result);
};
```

## 3. モジュール構成

### インポート/エクスポート
```javascript
// ファイルの構成順序
// 1. インポート文（外部→内部の順）
import { CONSTANTS } from './constants.js';
import { Player } from './entities/Player.js';

// 2. 定数定義
const LOCAL_CONSTANT = 42;
const CONFIG = { fps: 60 };

// 3. クラス定義
class GameManager {
    constructor() {
        // 初期化
    }
}

// 4. ヘルパー関数
function validateInput(input) {
    // バリデーション
}

// 5. エクスポート
export { GameManager, validateInput };
```

### モジュール設計の原則
- 1ファイル1クラス（または1機能）
- 循環参照を避ける
- 明確な責任分離

## 4. Canvas/ピクセルアート固有の規約

### Canvas描画
```javascript
// ピクセルアート描画時は必須
ctx.imageSmoothingEnabled = false;

// 座標は整数値に丸める
function drawSprite(ctx, sprite, x, y) {
    const drawX = Math.floor(x);
    const drawY = Math.floor(y);
    // 描画処理
}
```

### パフォーマンス最適化
```javascript
// save/restoreは最小限に
// 悪い例
function drawEntity(ctx, entity) {
    ctx.save();
    ctx.translate(entity.x, entity.y);
    drawSprite(ctx, entity.sprite);
    ctx.restore();
}

// 良い例
function drawEntity(ctx, entity) {
    drawSprite(ctx, entity.sprite, entity.x, entity.y);
}
```

## 5. エラーハンドリング

### 基本パターン
```javascript
// エラーは適切にキャッチ
try {
    const data = await loadAssets();
    processData(data);
} catch (error) {
    console.error('アセット読み込みエラー:', error);
    showErrorScreen();
}

// 早期リターン
function processInput(input) {
    if (!input) {
        console.warn('入力が空です');
        return;
    }
    
    if (!isValid(input)) {
        console.error('無効な入力:', input);
        return;
    }
    
    // 正常処理
}
```

### カスタムエラー
```javascript
class GameError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'GameError';
        this.code = code;
    }
}
```

## 6. コメント

### コメントの原則
- 必要最小限に留める
- 「なぜ」を説明する（「何」ではなく）
- 日本語OK

### JSDoc（重要な関数のみ）
```javascript
/**
 * スプライトを描画する
 * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
 * @param {Object} sprite - スプライトデータ
 * @param {number} x - X座標
 * @param {number} y - Y座標
 */
function drawSprite(ctx, sprite, x, y) {
    // 実装
}
```

## 7. 禁止事項

### コードで避けるべきこと
- `eval()` の使用
- `with` 文の使用
- グローバル変数の乱用
- 暗黙的な型変換の悪用
- ネストが深すぎる構造（3段階まで）

### アンチパターン
```javascript
// 悪い例: マジックナンバー
if (player.health < 20) {
    showLowHealthWarning();
}

// 良い例: 定数を使用
const LOW_HEALTH_THRESHOLD = 20;
if (player.health < LOW_HEALTH_THRESHOLD) {
    showLowHealthWarning();
}
```

## 8. 推奨プラクティス

### 早期リターン
```javascript
function processEntity(entity) {
    if (!entity) return;
    if (!entity.isActive) return;
    if (entity.isDestroyed) return;
    
    // メイン処理
    entity.update();
    entity.render();
}
```

### 配列処理
```javascript
// map/filter/reduceを活用
const activeEnemies = enemies
    .filter(enemy => enemy.isActive)
    .map(enemy => enemy.update());

// for...ofを優先
for (const entity of entities) {
    entity.render();
}
```

### オブジェクト操作
```javascript
// スプレッド構文を活用
const newState = {
    ...oldState,
    score: oldState.score + points
};

// 分割代入
const { x, y, width, height } = entity.bounds;
```