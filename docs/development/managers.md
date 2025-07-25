---
layout: default
title: マネージャーAPI
parent: 開発者向け
---

# マネージャーAPI

## 概要

ゲームの主要機能を管理する4つのマネージャークラスのAPIドキュメントです。

## EntityManager

エンティティ（プレイヤー、敵、アイテム）を統合管理するクラスです。すべてのエンティティの単一の真実の源（Single Source of Truth）として機能します。

### コンストラクタ

```typescript
constructor(game: GameServices)
```

**パラメータ:**
- `game`: ゲームサービスオブジェクト
  - `eventBus?`: EventBus
  - `physicsSystem`: PhysicsSystem
  - `musicSystem?`: MusicSystem
  - `assetLoader?`: AssetLoader
  - `inputSystem`: InputSystem

### 設計原則

EntityManagerは、ゲーム内のすべてのエンティティを管理する唯一の場所です。PhysicsSystemなどの他のシステムは、EntityManagerから必要なエンティティを取得します。これにより、エンティティの重複管理を防ぎ、システム間の一貫性を保ちます。

### EntityInitializerインターフェース

エンティティの自己初期化を可能にするインターフェースです。

```typescript
interface EntityInitializer {
    initializeInManager(manager: EntityManager): void;
}
```

このインターフェースを実装することで、エンティティは自身の初期化ロジックを持つことができます。
EntityManagerは`postProcessEntity`メソッドでこのインターフェースの有無を確認し、
実装されている場合は`initializeInManager`メソッドを呼び出します。

**実装例:**
- Spider、Bat などの敵キャラクターで実装
- 各エンティティが自身の初期化ロジックを持つことで、EntityManagerの肥大化を防止

### メソッド

#### getPlayer()
```typescript
getPlayer(): Player | null
```
現在のプレイヤーインスタンスを取得します。

#### getEnemies()
```typescript
getEnemies(): Enemy[]
```
すべての敵エンティティの配列を取得します。

#### getItems()
```typescript
getItems(): Entity[]
```
すべてのアイテムエンティティの配列を取得します。

#### getProjectiles()
```typescript
getProjectiles(): Entity[]
```
すべての弾丸エンティティの配列を取得します。

#### getPhysicsSystem()
```typescript
getPhysicsSystem(): PhysicsSystem
```
PhysicsSystemインスタンスを取得します。エンティティがPhysicsSystemにアクセスする必要がある場合に使用します。

#### addProjectile(projectile: Entity)
```typescript
addProjectile(projectile: Entity): void
```
弾丸エンティティを追加します。

#### createPlayer(x: number, y: number)
```typescript
createPlayer(x: number, y: number): Player
```
指定座標にプレイヤーを作成します。

#### spawnEnemy(type: string, x: number, y: number)
```typescript
spawnEnemy(type: string, x: number, y: number): void
```
指定タイプの敵を指定座標にスポーンします。

#### createEntitiesFromConfig(entities: EntityConfig[])
```typescript
createEntitiesFromConfig(entities: EntityConfig[]): void
```
設定配列からエンティティを一括作成します。

#### updateAll(deltaTime: number)
```typescript
updateAll(deltaTime: number): void
```
すべてのエンティティを更新します。

#### checkItemCollisions()
```typescript
checkItemCollisions(): void
```
プレイヤーとアイテムの衝突判定を行います。

#### checkProjectileCollisions()
```typescript
checkProjectileCollisions(): void
```
弾丸と敵の衝突判定を行います。破壊された弾丸は自動的に削除されます。

#### renderAll(renderer: PixelRenderer)
```typescript
renderAll(renderer: PixelRenderer): void
```
すべてのエンティティを描画します。

### イベント

- `coin:collected`: コイン収集時
- `enemy:defeated`: 敵撃破時
- `goal:reached`: ゴール到達時
- `entity:update-error`: エンティティ更新エラー時

## CameraController

カメラの動作とビューポートを制御するクラスです。

### コンストラクタ

```typescript
constructor(game: GameServices)
```

### メソッド

#### getCamera()
```typescript
getCamera(): Camera
```
現在のカメラ情報を取得します。

#### setTarget(entity: Entity | null)
```typescript
setTarget(entity: Entity | null): void
```
カメラが追従するターゲットを設定します。

#### setLevelBounds(width: number, height: number)
```typescript
setLevelBounds(width: number, height: number): void
```
レベルの境界を設定します。

#### setOffset(x: number, y: number)
```typescript
setOffset(x: number, y: number): void
```
カメラのオフセットを設定します。

#### setSmoothing(value: number)
```typescript
setSmoothing(value: number): void
```
カメラの追従スムージング値を設定します（0-1）。

#### update(deltaTime: number)
```typescript
update(deltaTime: number): void
```
カメラ位置を更新します。

#### shake(duration: number, intensity: number)
```typescript
shake(duration: number, intensity: number): void
```
カメラシェイク効果を開始します。

### イベント

- `camera:target-changed`: ターゲット変更時
- `level:loaded`: レベル読み込み時（自動的にバウンドを設定）

## BackgroundRenderer

ゲームの背景要素（雲、木など）をレンダリングするクラスです。

### コンストラクタ

```typescript
constructor()
```

背景レイヤーと要素を初期化します。

### メソッド

#### render(renderer: PixelRenderer)
```typescript
render(renderer: PixelRenderer): void
```

すべての背景レイヤーをレンダリングします。

**パラメータ:**
- `renderer`: PixelRendererインスタンス

**動作:**
- 各背景要素をワールド座標で配置
- カメラと1:1で移動（パララックスなし）
- 画面外の要素はカリング

#### addElement(layer: number, element: BackgroundElement)
```typescript
addElement(layer: number, element: BackgroundElement): void
```

指定したレイヤーに背景要素を追加します。

**パラメータ:**
- `layer`: レイヤー番号（0: 雲、1: 木）
- `element`: 追加する背景要素
  - `type`: 'cloud' | 'tree' | 'mountain'
  - `x`, `y`: ワールド座標
  - `spriteKey`: スプライトのキー

#### clearLayer(layer: number)
```typescript
clearLayer(layer: number): void
```

指定したレイヤーのすべての要素をクリアします。

### 背景要素の配置

- **雲**: 150ピクセル間隔で配置、高さに波パターン
- **木**: 200ピクセル間隔で配置、地面レベル（Y=160）に固定

### 座標系の注意点

背景要素はワールド座標で配置され、`drawSprite`メソッドに直接渡されます。
カメラ変換は`drawSprite`内部で行われるため、事前の座標変換は不要です。

## LevelManager

レベルデータとタイルマップを管理するクラスです。

### コンストラクタ

```typescript
constructor(game: GameServices)
```

### メソッド

#### initialize()
```typescript
async initialize(): Promise<void>
```
レベルマネージャーを初期化し、ステージリストを読み込みます。

#### loadLevel(levelName: string)
```typescript
async loadLevel(levelName: string): Promise<void>
```
指定されたレベルを読み込みます。

#### getCurrentLevel()
```typescript
getCurrentLevel(): string | null
```
現在のレベル名を取得します。

#### getLevelData()
```typescript
getLevelData(): LevelData | null
```
現在のレベルデータを取得します。

#### getTileMap()
```typescript
getTileMap(): number[][]
```
現在のタイルマップを取得します。

#### getLevelDimensions()
```typescript
getLevelDimensions(): { width: number; height: number }
```
レベルのピクセル単位のサイズを取得します。

#### getPlayerSpawn()
```typescript
getPlayerSpawn(): { x: number; y: number }
```
プレイヤーのスポーン位置を取得します。

#### getBackgroundColor()
```typescript
getBackgroundColor(): string
```
レベルの背景色を取得します。

#### getTimeLimit()
```typescript
getTimeLimit(): number
```
レベルの制限時間（秒）を取得します。

### イベント

- `level:loaded`: レベル読み込み成功時
- `level:load-error`: レベル読み込みエラー時

## HUDManager

UI要素とHUD（ヘッドアップディスプレイ）を管理するクラスです。

### コンストラクタ

```typescript
constructor(game: GameServices)
```

### メソッド

#### updateScore(score: number)
```typescript
updateScore(score: number): void
```
スコアを更新します。

#### updateLives(lives: number)
```typescript
updateLives(lives: number): void
```
残機数を更新します。

#### updateTime(time: number)
```typescript
updateTime(time: number): void
```
残り時間を更新します。

#### setPaused(paused: boolean)
```typescript
setPaused(paused: boolean): void
```
ポーズ状態を設定します。

#### showMessage(message: string, duration: number)
```typescript
showMessage(message: string, duration: number): void
```
一時的なメッセージを表示します。

#### update(deltaTime: number)
```typescript
update(deltaTime: number): void
```
HUDの状態を更新します（メッセージタイマーなど）。

#### render(renderer: PixelRenderer)
```typescript
render(renderer: PixelRenderer): void
```
HUD要素を描画します。

### プロパティ（getter）

- `message`: 現在表示中のメッセージ
- `messageTimer`: メッセージの残り表示時間

### イベント（リスニング）

- `coin:collected`: コイン収集時にスコアを更新
- `player:health-changed`: プレイヤーの体力変更時に残機を更新
- `game:time-updated`: ゲーム時間更新時に残り時間を更新
- `game:paused`: ゲーム一時停止時
- `game:resumed`: ゲーム再開時

## 共通インターフェース

### GameServices

```typescript
interface GameServices {
    eventBus?: EventBus;
    physicsSystem: PhysicsSystem;
    musicSystem?: MusicSystem;
    assetLoader?: AssetLoader;
    inputSystem: InputSystem;
}
```

### EntityConfig

```typescript
interface EntityConfig {
    type: string;
    x: number;
    y: number;
}
```

### Camera

```typescript
interface Camera {
    x: number;
    y: number;
    width: number;
    height: number;
}
```

### LevelData

```typescript
interface LevelData {
    width: number;
    height: number;
    tileSize: number;
    playerSpawn: { x: number; y: number };
    entities?: Array<{ type: string; x: number; y: number }>;
    backgroundColor?: string;
    timeLimit?: number;
}
```

### HUDData

```typescript
interface HUDData {
    score: number;
    lives: number;
    time: number;
    coinsCollected: number;
}
```