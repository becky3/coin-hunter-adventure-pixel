---
layout: default
title: アーキテクチャ
parent: 開発者向け
---

# アーキテクチャ

## 概要

Coin Hunter Adventure Pixelは、HTML5 Canvas APIを使用したブラウザベースの2Dプラットフォーマーゲームです。TypeScriptで実装され、モジュラーアーキテクチャを採用しています。

## 現在の設計

### レイヤー構造

```
┌─────────────────────────────────────┐
│          Application Layer          │ ← Game.ts, States
├─────────────────────────────────────┤
│           Game Logic Layer          │ ← Entities, Levels, Physics
├─────────────────────────────────────┤
│          System Layer               │ ← Rendering, Audio, Input
├─────────────────────────────────────┤
│          Utility Layer              │ ← Utils, Constants, Assets
└─────────────────────────────────────┘
```

### 主要コンポーネント

#### コアシステム
- **GameCore**: ゲーム全体の制御とシステム管理
- **GameStateManager**: ゲーム状態の管理（メニュー、プレイ、ゲームオーバー）
- **PixelRenderer**: 8ビットスタイルの描画システム
- **PhysicsSystem**: 物理演算（重力、衝突判定）
- **MusicSystem**: Web Audio APIによる音声管理（統一インターフェース実装）
- **InputSystem**: キーボード入力の統合管理

#### マネージャーシステム
- **EntityManager**: エンティティ（プレイヤー、敵、アイテム）の統合管理
- **CameraController**: カメラの動作とビューポート制御
- **LevelManager**: レベルデータとタイルマップの管理
- **HUDManager**: UIとHUD（ヘッドアップディスプレイ）の処理

### ゲームループ

```
Input → Update (Logic/Physics) → Render → (60fps repeat)
```

## ディレクトリ構造

```
src/
├── audio/         # 音声システム
├── controllers/   # コントローラー（カメラ等）
├── core/          # コアシステム
├── entities/      # ゲームエンティティ
├── levels/        # レベルデータとローダー
├── managers/      # マネージャー（Entity、Level等）
├── physics/       # 物理エンジン
├── rendering/     # 描画システム
├── services/      # サービス（EventBus、ServiceLocator）
├── states/        # ゲーム状態
├── ui/            # UI関連
└── utils/         # ユーティリティ
```

## 技術仕様

### パフォーマンス
- **目標FPS**: 60fps（55fps以上を維持）
- **描画時間**: 16ms以内
- **メモリ使用量**: 100MB以下

### 物理システム
- **重力定数**: 0.433
- **最大落下速度**: 10
- **衝突判定**: AABB（Axis-Aligned Bounding Box）

### Canvas設定
- **imageSmoothingEnabled**: false（ピクセルアート用）
- **座標**: 整数値に丸め処理

## 改善計画

### 目標
1. God Objectパターンの解消
2. モジュール間の疎結合化
3. 拡張性の向上
4. テスタビリティの改善

### アーキテクチャパターン

#### ServiceLocator
- サービスの登録と取得を一元管理
- 依存性注入パターンの実装

#### EventBus
- モジュール間の疎結合な通信
- ゲームイベントの発行と購読
- 型安全なイベントハンドラー

#### マネージャーパターン
- **PlayState**: 以下の4つのマネージャーに責任を分離
  - EntityManager: エンティティ管理
  - CameraController: カメラ制御
  - LevelManager: レベル管理
  - HUDManager: UI管理

### 型安全性
- GameServicesインターフェースによる依存性の型定義
- EventBusコールバックの型安全性
- 明示的な型定義によるコード品質向上

## 開発のポイント

### 新機能追加時
1. 適切なレイヤーにモジュールを配置
2. 既存システムとの統合を検討
3. イベント駆動での実装を優先

### デバッグ
- デバッグオーバーレイ機能を活用
- ブラウザの開発者ツールでパフォーマンス測定
- コンソールログは本番環境では削除

### 最適化
- 画面外のオブジェクトは処理をスキップ
- オブジェクトプールの活用
- 不要な再描画を避ける