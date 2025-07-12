---
layout: default
title: コメントルール
parent: 開発者向け
---

# コメントルール

このプロジェクトでは、ESLintによってコメントのルールが厳格に管理されています。

## 基本方針

**コードは自己文書化し、実装内容の説明コメントは書かない**

- 関数名、変数名で意図を表現する
- コメントに頼らずに理解できるコードを書く

## ESLintによる自動チェック

### 使用プラグイン

- `eslint-plugin-jsdoc` - JSDocコメントの形式と内容を検証
- `@eslint-community/eslint-plugin-eslint-comments` - ESLintディレクティブの適切な使用を確保

### 設定ファイル

`.eslintrc.json`で以下のルールが設定されています：

```json
{
  "rules": {
    "jsdoc/require-jsdoc": ["error", {
      "require": {
        "ClassDeclaration": true
      }
    }],
    "no-inline-comments": "error",
    "no-warning-comments": ["warn", { 
      "terms": ["TODO", "FIXME", "HACK"]
    }]
  }
}
```

## 必須コメント

### 1. クラス定義

すべてのクラスにJSDocコメントが必須です：

```typescript
/**
 * プレイヤーキャラクターエンティティ
 */
export class Player extends Entity {
  // ...
}
```

### 2. eslint-disable使用時

ESLintルールを無効化する際は必ず理由を説明：

```typescript
/* eslint-disable no-console -- Loggerクラスはコンソール出力が必要 */
```

## 許可されるコメント

### 1. ファイルレベルコメント

ファイルの目的を説明（ファイル先頭）：

```typescript
/**
 * ゲームの物理演算システム
 * 重力、衝突判定、移動処理を管理
 */
```

### 2. JSDocコメント

- クラスの説明（必須）
- 複雑な関数の説明
- インターフェースの説明

```typescript
/**
 * ゲーム内のすべてのエンティティを管理
 * @param services - 依存サービスのコンテナ
 */
constructor(services: GameServices) {
  // ...
}
```

### 3. TODO/FIXMEコメント

作業項目の記録（警告として表示）：

```typescript
// TODO: サウンドエフェクトの実装
// FIXME: メモリリークの可能性を調査
```

### 4. アルゴリズム説明

複雑なロジックの理由説明：

```typescript
// Box-Muller法を使用して正規分布の乱数を生成
// この方法は一様分布から正規分布への変換に効率的
```

## 禁止されるコメント

### 1. インラインコメント

コードと同じ行のコメントは禁止：

```typescript
// ❌ 悪い例
const speed = 5; // プレイヤーの速度
```

### 2. 独立した行の説明コメント

実装内容を説明するコメントは禁止：

```typescript
// ❌ 悪い例 - 変数の説明
// デフォルトのジャンプ力
const jumpPower = 10;

// ❌ 悪い例 - 動作の説明
// プレイヤーを右に移動
player.x += speed;

// ✅ 良い例 - 自己文書化されたコード（コメントなし）
const DEFAULT_JUMP_POWER = 10;
player.x += speed;
```

### 3. 値の説明コメント

値の意味を説明するコメントは変数名で表現：

```typescript
// ❌ 悪い例
// 最大体力
this.maxHealth = 3;
// 無敵時間（ミリ秒）
this.invulnerabilityTime = 2000;

// ✅ 良い例
const MAX_HEALTH = 3;
const INVULNERABILITY_DURATION_MS = 2000;
```

### 4. コメントアウトされたコード

使用しないコードは削除：

```typescript
// ❌ 悪い例
// const oldLogic = calculateOldWay();
// if (oldLogic > 0) { ... }

// ✅ 良い例（削除する）
```

## エラーの対処方法

### JSDocエラー

```
error  Missing JSDoc comment  jsdoc/require-jsdoc
```

**解決方法**: クラスにJSDocコメントを追加

### インラインコメントエラー

```
error  Unexpected comment inline with code  no-inline-comments
```

**解決方法**: コメントを前の行に移動

### TODO/FIXME警告

```
warning  Unexpected 'TODO' comment  no-warning-comments
```

**対応**: 警告なので修正は任意。ただし、実装完了時には削除すること

## ベストプラクティス

1. **命名で意図を表現**
   ```typescript
   // ❌ 悪い例
   const d = 1000; // 遅延時間（ミリ秒）
   
   // ✅ 良い例
   const DELAY_MILLISECONDS = 1000;
   ```

2. **関数を小さく保つ**
   - 説明が必要なほど複雑な関数は分割を検討

3. **型定義で仕様を表現**
   ```typescript
   type HealthPoints = number; // 0-100の範囲
   type Percentage = number;    // 0.0-1.0の範囲
   ```

4. **定数で意味を明確化**
   ```typescript
   const GRAVITY = 9.8;
   const MAX_JUMP_HEIGHT = 100;
   const INVULNERABILITY_DURATION = 2000; // ミリ秒
   ```

## 移行ガイド

既存コードをルールに適合させる手順：

1. `npm run lint`でエラーを確認
2. クラスにJSDocを追加
3. インラインコメントを前の行に移動
4. 不要なコメントを削除
5. 再度lintを実行して確認

## よくある質問

**Q: 日本語のコメントは使えますか？**  
A: はい、JSDocやTODOコメントで日本語を使用できます。

**Q: 関数にもJSDocは必要ですか？**  
A: 必須ではありませんが、複雑な関数には推奨されます。

**Q: プライベートメソッドにもJSDocは必要ですか？**  
A: 必須ではありません。パブリックAPIを優先してください。