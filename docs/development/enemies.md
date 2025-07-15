---
layout: default
title: 敵キャラクター実装ガイド
parent: 開発者向け
---

# 敵キャラクター実装ガイド

このドキュメントでは、敵キャラクターの実装方法と既存の敵の仕様について説明します。

## 基本クラス構造

すべての敵は`Enemy`基本クラスを継承します：

```typescript
export class Enemy extends Entity {
    public maxHealth: number;
    public health: number;
    public damage: number;
    public moveSpeed: number;
    public direction: number;
    public aiType: AIType;
    // ...
}
```

## 実装済み敵キャラクター

### Slime（スライム）
- **ファイル**: `src/entities/enemies/Slime.ts`
- **特徴**:
  - 地面を左右に往復移動
  - 壁や足場の端で方向転換
  - 物理エンジンによる重力あり

### Bird（鳥）
- **ファイル**: `src/entities/enemies/Bird.ts`
- **特徴**:
  - 水平飛行＋波状の上下運動
  - 物理エンジンによる重力なし
  - 画面端でループ

### Bat（コウモリ）
- **ファイル**: `src/entities/enemies/Bat.ts`
- **特徴**:
  - 天井にぶら下がって待機（`hanging`状態）
  - プレイヤーのX軸距離80px以内で起動
  - 放物線飛行（天井16px ⇔ 地面160px）
  - 左右120pxの範囲をパトロール
  - **物理エンジンを使わない独自の移動実装**

### Spider（スパイダー）
- **ファイル**: `src/entities/enemies/Spider.ts`
- **特徴**:
  - 天井を左右に這い回る（`crawling`状態）
  - プレイヤーをX軸100px以内で検知
  - 糸で垂直降下・上昇（`descending`/`ascending`状態）
  - 動的な地面検知システム
  - **EntityInitializerインターフェースを実装**

#### Batの実装詳細
- **物理エンジン無効化**: 独自の移動ロジックを実装
- **放物線飛行**: quadratic easingを使用した自然な上下運動
- **移動パラメータ**: 水平速度60px/s、パトロール範囲120px、上下サイクル2秒

#### Spiderの実装詳細
- **状態管理**: crawling（這い回り）、descending（降下）、ascending（上昇）、waiting（待機）の4状態
- **動的地面検知**: PhysicsSystem.isPointInTileを使用してリアルタイムに地面位置を検出
- **検知クールダウン**: 上昇完了後3秒間は新たな検知を行わない
- **EntityInitializer実装**: 自己初期化により EntityManagerの責務を軽減

## 新しい敵の追加方法

1. **クラスの作成**
   - `src/entities/enemies/`ディレクトリに新しいクラスファイルを作成
   - `Enemy`基本クラスを継承
   - `updateAI`メソッドでAIロジックを実装

2. **EntityFactoryへの登録**
   - `src/factories/EntityFactory.ts`でファクトリ関数を登録
   - 敵タイプ名（小文字）とファクトリ関数を関連付け

3. **EntityInitializerの実装（推奨）**
   - 初期化ロジックを敵クラス自身に持たせる
   - EventBusの設定、物理システムへの登録などを自己完結的に実装

3. **リソース設定の追加**
   - `src/config/resources/characters.json`に設定を追加
   - スプライトファイルを`src/assets/sprites/enemies/`に配置

4. **物理エンジンの考慮**
   - 重力が必要な敵：`this.gravity = true; this.physicsEnabled = true;`
   - 独自の移動パターン：`this.physicsEnabled = false;`

## テスト

敵の実装後は以下をテストしてください：

1. **表示確認**: スプライトが正しく表示されるか
2. **移動確認**: 意図した動きをするか
3. **衝突判定**: プレイヤーとの接触でダメージを与えるか
4. **踏みつけ**: 上から踏めるか、スコアが加算されるか

E2Eテストの作成例は`tests/e2e/test-bat.cjs`を参考にしてください。