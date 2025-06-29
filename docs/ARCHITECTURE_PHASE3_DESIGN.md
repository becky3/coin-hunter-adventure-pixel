# アーキテクチャ改善 Phase 3: PlayStateリファクタリング詳細設計

## 1. 概要

Phase 3では、現在919行の`PlayState.ts`を機能別モジュールに分割し、責任を明確化します。

### 1.1 現状の問題点

- **過大な責任**: 単一クラスがゲームプレイの全機能を管理
- **UI管理の混在**: ゲームロジックとUI表示が密結合
- **テストの困難さ**: 大きなクラスのため単体テストが困難
- **拡張性の低さ**: 新機能追加時に既存コードへの影響が大きい

### 1.2 改善目標

- 単一責任の原則に従ったモジュール分割
- UI層とゲームロジックの分離
- テスタブルな設計
- 新機能追加が容易な構造

## 2. 設計詳細

### 2.1 モジュール分割案

```
現在のPlayState.ts (919行) を以下に分割:

1. PlayStateCore.ts (~150行)
   - 状態管理のコアロジック
   - ライフサイクル管理
   - モジュール間の調整

2. EntityManager.ts (~200行)
   - エンティティの生成・削除
   - エンティティのグループ管理
   - エンティティ間の相互作用

3. CameraController.ts (~100行)
   - カメラ位置の計算
   - スムーズなカメラ追従
   - カメラ境界の管理

4. LevelManager.ts (~150行)
   - レベルデータのロード
   - レベル進行管理
   - チェックポイント管理

5. GameplayController.ts (~150行)
   - ゲームプレイロジック
   - スコア・ライフ管理
   - ゲームオーバー・クリア判定

6. PlayStateUI.ts (~200行)
   - HUD表示
   - ポーズメニュー
   - ゲームオーバー画面
```

### 2.2 新しいディレクトリ構造

```
src/
├── states/
│   ├── play/
│   │   ├── PlayStateCore.ts      # 状態管理のコア
│   │   ├── EntityManager.ts      # エンティティ管理
│   │   ├── CameraController.ts   # カメラ制御
│   │   ├── LevelManager.ts       # レベル管理
│   │   ├── GameplayController.ts # ゲームプレイロジック
│   │   └── systems/              # PlayState専用システム
│   │       ├── CollisionSystem.ts
│   │       └── ItemSystem.ts
│   ├── PlayState.ts              # ファサード（互換性維持）
│   └── ...
├── ui/
│   ├── play/
│   │   ├── PlayStateUI.ts        # PlayState用UI統合
│   │   ├── HUD.ts               # ヘッドアップディスプレイ
│   │   ├── PauseMenu.ts         # ポーズメニュー
│   │   └── GameOverScreen.ts    # ゲームオーバー画面
│   └── ...
```

### 2.3 各モジュールの詳細設計

#### 2.3.1 PlayStateCore

```typescript
// src/states/play/PlayStateCore.ts
export class PlayStateCore implements GameState {
    public readonly name = 'play';
    
    private serviceLocator: ServiceLocator;
    private entityManager: EntityManager;
    private cameraController: CameraController;
    private levelManager: LevelManager;
    private gameplayController: GameplayController;
    private ui: PlayStateUI;
    
    constructor() {
        this.serviceLocator = ServiceLocator.getInstance();
        this.setupModules();
        this.setupEventListeners();
    }
    
    private setupModules(): void {
        this.entityManager = new EntityManager(this.serviceLocator);
        this.cameraController = new CameraController();
        this.levelManager = new LevelManager(this.serviceLocator);
        this.gameplayController = new GameplayController(this.serviceLocator);
        this.ui = new PlayStateUI(this.serviceLocator);
    }
    
    private setupEventListeners(): void {
        const eventBus = this.serviceLocator.get<EventBus>('eventBus');
        
        eventBus.on('player:died', () => this.gameplayController.handlePlayerDeath());
        eventBus.on('level:complete', () => this.levelManager.loadNextLevel());
        eventBus.on('game:pause', () => this.ui.showPauseMenu());
    }
    
    async enter(params?: any): Promise<void> {
        const levelIndex = params?.levelIndex || 0;
        
        await this.levelManager.loadLevel(levelIndex);
        this.entityManager.initialize(this.levelManager.getCurrentLevel());
        this.cameraController.setTarget(this.entityManager.getPlayer());
        this.gameplayController.reset();
        this.ui.initialize();
    }
    
    update(deltaTime: number): void {
        if (this.gameplayController.isPaused()) return;
        
        this.entityManager.update(deltaTime);
        this.cameraController.update(deltaTime);
        this.gameplayController.update(deltaTime);
        this.ui.update(deltaTime);
    }
    
    render(renderer: PixelRenderer): void {
        renderer.setCamera(this.cameraController.getCamera());
        this.entityManager.render(renderer);
        this.ui.render(renderer);
    }
    
    exit(): void {
        this.entityManager.cleanup();
        this.ui.cleanup();
    }
}
```

#### 2.3.2 EntityManager

```typescript
// src/states/play/EntityManager.ts
export class EntityManager {
    private entities: Map<string, Entity> = new Map();
    private entityGroups: Map<string, Set<Entity>> = new Map();
    private player: Player | null = null;
    private serviceLocator: ServiceLocator;
    private eventBus: EventBus;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
        this.eventBus = serviceLocator.get<EventBus>('eventBus');
        this.initializeGroups();
    }
    
    private initializeGroups(): void {
        this.entityGroups.set('enemies', new Set());
        this.entityGroups.set('coins', new Set());
        this.entityGroups.set('platforms', new Set());
        this.entityGroups.set('items', new Set());
    }
    
    initialize(levelData: LevelData): void {
        this.clear();
        
        // プレイヤー生成
        this.player = new Player(levelData.playerStart.x, levelData.playerStart.y);
        this.addEntity('player', this.player);
        
        // エンティティ生成
        levelData.entities.forEach(entityData => {
            const entity = this.createEntity(entityData);
            if (entity) {
                this.addEntity(entityData.id, entity);
            }
        });
    }
    
    private createEntity(data: EntityData): Entity | null {
        switch (data.type) {
            case 'coin':
                return new Coin(data.x, data.y, data.value || 10);
            case 'enemy':
                return this.createEnemy(data);
            case 'spring':
                return new Spring(data.x, data.y);
            case 'goal':
                return new GoalFlag(data.x, data.y, data.nextLevel);
            default:
                console.warn(`Unknown entity type: ${data.type}`);
                return null;
        }
    }
    
    private createEnemy(data: EntityData): Enemy | null {
        switch (data.enemyType) {
            case 'slime':
                return new Slime(data.x, data.y);
            default:
                return null;
        }
    }
    
    addEntity(id: string, entity: Entity): void {
        this.entities.set(id, entity);
        
        // グループに追加
        const group = this.getGroupForEntity(entity);
        if (group) {
            this.entityGroups.get(group)?.add(entity);
        }
        
        this.eventBus.emit('entity:added', { id, entity });
    }
    
    removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (!entity) return;
        
        // グループから削除
        this.entityGroups.forEach(group => {
            group.delete(entity);
        });
        
        this.entities.delete(id);
        this.eventBus.emit('entity:removed', { id, entity });
    }
    
    update(deltaTime: number): void {
        const physicsSystem = this.serviceLocator.get<PhysicsSystem>('physics');
        
        // エンティティ更新
        this.entities.forEach(entity => {
            entity.update(deltaTime);
        });
        
        // 衝突判定
        this.checkCollisions();
        
        // 削除マークされたエンティティを削除
        const entitiesToRemove: string[] = [];
        this.entities.forEach((entity, id) => {
            if (entity.isMarkedForDeletion()) {
                entitiesToRemove.push(id);
            }
        });
        
        entitiesToRemove.forEach(id => this.removeEntity(id));
    }
    
    private checkCollisions(): void {
        if (!this.player) return;
        
        // プレイヤーとコインの衝突
        this.entityGroups.get('coins')?.forEach(coin => {
            if (this.checkCollision(this.player!, coin)) {
                this.handleCoinCollection(coin as Coin);
            }
        });
        
        // プレイヤーと敵の衝突
        this.entityGroups.get('enemies')?.forEach(enemy => {
            if (this.checkCollision(this.player!, enemy)) {
                this.handleEnemyCollision(enemy as Enemy);
            }
        });
    }
    
    render(renderer: PixelRenderer): void {
        // レンダリング順序を制御
        const renderOrder = ['platforms', 'items', 'coins', 'enemies', 'player'];
        
        renderOrder.forEach(group => {
            if (group === 'player' && this.player) {
                this.player.render(renderer);
            } else {
                this.entityGroups.get(group)?.forEach(entity => {
                    entity.render(renderer);
                });
            }
        });
    }
    
    cleanup(): void {
        this.entities.clear();
        this.entityGroups.forEach(group => group.clear());
        this.player = null;
    }
    
    getPlayer(): Player | null {
        return this.player;
    }
    
    getEntitiesByGroup(group: string): Entity[] {
        return Array.from(this.entityGroups.get(group) || []);
    }
}
```

#### 2.3.3 CameraController

```typescript
// src/states/play/CameraController.ts
export class CameraController {
    private camera: Camera;
    private target: Entity | null = null;
    private smoothing: number = 0.1;
    private bounds: Rectangle | null = null;
    
    constructor() {
        this.camera = {
            x: 0,
            y: 0,
            width: 320,
            height: 240
        };
    }
    
    setTarget(entity: Entity | null): void {
        this.target = entity;
    }
    
    setBounds(bounds: Rectangle): void {
        this.bounds = bounds;
    }
    
    update(deltaTime: number): void {
        if (!this.target) return;
        
        // ターゲット位置を画面中央に
        const targetX = this.target.x - this.camera.width / 2;
        const targetY = this.target.y - this.camera.height / 2;
        
        // スムーズに追従
        this.camera.x += (targetX - this.camera.x) * this.smoothing;
        this.camera.y += (targetY - this.camera.y) * this.smoothing;
        
        // 境界内に制限
        if (this.bounds) {
            this.camera.x = Math.max(0, Math.min(
                this.camera.x, 
                this.bounds.width - this.camera.width
            ));
            this.camera.y = Math.max(0, Math.min(
                this.camera.y,
                this.bounds.height - this.camera.height
            ));
        }
    }
    
    getCamera(): Camera {
        return { ...this.camera };
    }
    
    shake(intensity: number, duration: number): void {
        // TODO: カメラシェイク実装
    }
}
```

#### 2.3.4 PlayStateUI

```typescript
// src/ui/play/PlayStateUI.ts
export class PlayStateUI {
    private hud: HUD;
    private pauseMenu: PauseMenu;
    private gameOverScreen: GameOverScreen;
    private serviceLocator: ServiceLocator;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
        this.hud = new HUD();
        this.pauseMenu = new PauseMenu();
        this.gameOverScreen = new GameOverScreen();
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        const eventBus = this.serviceLocator.get<EventBus>('eventBus');
        
        eventBus.on('score:changed', (score: number) => {
            this.hud.updateScore(score);
        });
        
        eventBus.on('lives:changed', (lives: number) => {
            this.hud.updateLives(lives);
        });
        
        eventBus.on('coins:changed', (coins: number) => {
            this.hud.updateCoins(coins);
        });
    }
    
    initialize(): void {
        this.hud.reset();
        this.pauseMenu.hide();
        this.gameOverScreen.hide();
    }
    
    update(deltaTime: number): void {
        this.hud.update(deltaTime);
        
        if (this.pauseMenu.isVisible()) {
            this.pauseMenu.update(deltaTime);
        }
        
        if (this.gameOverScreen.isVisible()) {
            this.gameOverScreen.update(deltaTime);
        }
    }
    
    render(renderer: PixelRenderer): void {
        // HUDは常に表示
        this.hud.render(renderer);
        
        // ポーズメニュー
        if (this.pauseMenu.isVisible()) {
            this.pauseMenu.render(renderer);
        }
        
        // ゲームオーバー画面
        if (this.gameOverScreen.isVisible()) {
            this.gameOverScreen.render(renderer);
        }
    }
    
    showPauseMenu(): void {
        this.pauseMenu.show();
    }
    
    hidePauseMenu(): void {
        this.pauseMenu.hide();
    }
    
    showGameOver(score: number): void {
        this.gameOverScreen.show(score);
    }
    
    cleanup(): void {
        // イベントリスナーのクリーンアップなど
    }
}
```

### 2.4 移行戦略

#### 2.4.1 段階的実装

1. **Step 1**: 新しいモジュールの作成（既存コードはそのまま）
2. **Step 2**: PlayStateFacadeの作成（互換性維持）
3. **Step 3**: 機能を段階的に新モジュールへ移行
4. **Step 4**: 旧コードの削除

#### 2.4.2 PlayState Facade（互換性維持）

```typescript
// src/states/PlayState.ts
// 既存のインターフェースを維持しながら、内部で新しいモジュールを使用
export class PlayState implements GameState {
    private core: PlayStateCore;
    
    constructor() {
        this.core = new PlayStateCore();
    }
    
    get name(): string {
        return this.core.name;
    }
    
    async enter(params?: any): Promise<void> {
        await this.core.enter(params);
    }
    
    update(deltaTime: number): void {
        this.core.update(deltaTime);
    }
    
    render(renderer: PixelRenderer): void {
        this.core.render(renderer);
    }
    
    exit(): void {
        this.core.exit();
    }
}
```

### 2.5 テスト戦略

#### 2.5.1 単体テスト

各モジュールに対して単体テストを作成：

```typescript
// tests/states/play/EntityManager.test.ts
describe('EntityManager', () => {
    it('should create player at specified position', () => {
        const entityManager = new EntityManager(mockServiceLocator);
        const levelData = {
            playerStart: { x: 100, y: 200 },
            entities: []
        };
        
        entityManager.initialize(levelData);
        const player = entityManager.getPlayer();
        
        expect(player).toBeDefined();
        expect(player?.x).toBe(100);
        expect(player?.y).toBe(200);
    });
    
    it('should handle entity collisions', () => {
        // 衝突判定のテスト
    });
});
```

#### 2.5.2 統合テスト

PlayStateCore全体の動作確認：

```typescript
// tests/integration/PlayState.test.ts
describe('PlayState Integration', () => {
    it('should complete level when player reaches goal', async () => {
        const playState = new PlayState();
        await playState.enter({ levelIndex: 0 });
        
        // プレイヤーをゴールまで移動
        // レベル完了イベントが発生することを確認
    });
});
```

## 3. 実装順序と依存関係

### 3.1 実装順序

1. **基本インターフェースの定義**
   - EntityData, LevelData, Camera等の型定義

2. **独立したモジュールから実装**
   - CameraController（依存が少ない）
   - GameplayController（スコア・ライフ管理）

3. **コアモジュールの実装**
   - EntityManager
   - LevelManager

4. **UI層の実装**
   - HUD, PauseMenu, GameOverScreen
   - PlayStateUI

5. **統合**
   - PlayStateCore
   - PlayState Facade

### 3.2 依存関係

```
PlayStateCore
├── EntityManager
│   ├── ServiceLocator
│   └── EventBus
├── CameraController
├── LevelManager
│   ├── ServiceLocator
│   └── AssetLoader
├── GameplayController
│   ├── ServiceLocator
│   └── EventBus
└── PlayStateUI
    ├── HUD
    ├── PauseMenu
    └── GameOverScreen
```

## 4. 成功基準

### 4.1 機能面
- 既存の全機能が正常に動作すること
- パフォーマンスの劣化がないこと（60FPS維持）

### 4.2 設計面
- 各モジュールが200行以下であること
- 単一責任の原則に従っていること
- テストカバレッジ80%以上

### 4.3 保守性
- 新機能追加時の影響範囲が限定的
- モジュール単位でのテストが可能
- ドキュメントが整備されている

## 5. リスクと対策

### 5.1 リスク
1. **状態管理の複雑化**: モジュール間の状態同期
2. **パフォーマンス低下**: 抽象化によるオーバーヘッド
3. **移行期間の不安定性**: 新旧コードの共存

### 5.2 対策
1. EventBusによる疎結合な通信
2. プロファイリングによる性能監視
3. Feature Flagによる段階的切り替え

## 6. 実装チェックリスト

- [ ] 基本インターフェースの定義
- [ ] CameraControllerの実装
- [ ] GameplayControllerの実装
- [ ] EntityManagerの実装
- [ ] LevelManagerの実装
- [ ] UI components (HUD, PauseMenu, GameOverScreen)の実装
- [ ] PlayStateUIの実装
- [ ] PlayStateCoreの実装
- [ ] PlayState Facadeの実装
- [ ] 既存機能の移行
- [ ] テストの作成
- [ ] パフォーマンステスト
- [ ] ドキュメントの更新
- [ ] 旧コードの削除