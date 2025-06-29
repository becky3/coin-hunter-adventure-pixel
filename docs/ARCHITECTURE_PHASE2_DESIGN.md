# Phase 2: Game.tsのリファクタリング - 詳細設計

## 1. 概要

Phase 1で作成した基盤（ServiceLocator、EventBus、SystemManager）を使用して、Game.tsをリファクタリングします。

### 現状の問題点
- Game.tsが373行もあり、多くの責任を持ちすぎている（God Object）
- サブシステムの管理、ゲームループ、デバッグUI、初期化処理が混在
- 依存関係が複雑で、変更の影響範囲が予測困難

### 目標
- Game.tsを責任ごとに分割
- ServiceLocatorを使用した依存関係管理
- EventBusを使用したモジュール間通信
- SystemManagerを使用したシステム管理

## 2. 新しいアーキテクチャ

```
┌─────────────────────────────────────┐
│           index.ts                  │
│         (エントリポイント)            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│          GameCore.ts                │
│    (初期化とサービス登録のみ)         │
├─────────────────────────────────────┤
│  - ServiceLocatorの初期化           │
│  - 各サービスの登録                 │
│  - SystemManagerへのシステム登録    │
│  - GameLoopの開始                  │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼─────────┐ ┌───────▼─────────┐
│   GameLoop.ts   │ │ DebugOverlay.ts │
│ (ゲームループ管理) │ │ (デバッグUI表示)  │
└─────────────────┘ └─────────────────┘
```

## 3. 実装詳細

### 3.1 GameCore

```typescript
// src/core/GameCore.ts

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { SystemManager } from '../services/SystemManager';
import { GameLoop } from './GameLoop';
import { DebugOverlay } from '../debug/DebugOverlay';
import { InputSystem as InputSystemImpl } from './InputSystem';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { AssetLoader } from '../assets/AssetLoader';
import { MusicSystem } from '../audio/MusicSystem';
import { GameStateManager } from '../states/GameStateManager';
import { MenuState } from '../states/MenuState';
import { PlayState } from '../states/PlayState';
import { ISystem } from '../services/SystemManager';

/**
 * ゲームの初期化とサービス管理を担当
 */
export class GameCore {
    private serviceLocator: ServiceLocator;
    private gameLoop: GameLoop;
    private debugOverlay?: DebugOverlay;
    
    constructor() {
        this.serviceLocator = new ServiceLocator();
        this.gameLoop = new GameLoop();
    }
    
    /**
     * ゲームの初期化
     */
    async init(): Promise<void> {
        console.log('Initializing GameCore...');
        
        // 基本サービスの登録
        this.registerCoreServices();
        
        // システムの登録
        await this.registerSystems();
        
        // ステートの登録
        this.registerStates();
        
        // デバッグオーバーレイの初期化（開発環境のみ）
        if (import.meta.env.DEV) {
            this.debugOverlay = new DebugOverlay(this.serviceLocator);
            await this.debugOverlay.init();
        }
        
        // 初期ステートの設定
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        await stateManager.setState('menu');
        
        console.log('GameCore initialization complete');
    }
    
    /**
     * 基本サービスの登録
     */
    private registerCoreServices(): void {
        // Canvas要素の取得
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // EventBus
        this.serviceLocator.register(ServiceNames.EVENT_BUS, new EventBus());
        
        // SystemManager
        this.serviceLocator.register(ServiceNames.SYSTEM_MANAGER, new SystemManager());
        
        // Renderer
        const renderer = new PixelRenderer(canvas);
        this.serviceLocator.register(ServiceNames.RENDERER, renderer);
        
        // AssetLoader
        const assetLoader = new AssetLoader();
        this.serviceLocator.register(ServiceNames.ASSET_LOADER, assetLoader);
        
        // InputSystem
        const inputSystem = new InputSystemImpl();
        this.serviceLocator.register(ServiceNames.INPUT, inputSystem);
        
        // PhysicsSystem
        const physicsSystem = new PhysicsSystem();
        this.serviceLocator.register(ServiceNames.PHYSICS, physicsSystem);
        
        // MusicSystem
        const musicSystem = new MusicSystem();
        this.serviceLocator.register(ServiceNames.AUDIO, musicSystem);
        
        // GameStateManager
        const stateManager = new GameStateManager();
        this.serviceLocator.register(ServiceNames.GAME_STATE_MANAGER, stateManager);
    }
    
    /**
     * システムの登録
     */
    private async registerSystems(): Promise<void> {
        const systemManager = this.serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);
        
        // 各サービスをISystemアダプターでラップして登録
        const inputSystem = this.serviceLocator.get<InputSystemImpl>(ServiceNames.INPUT);
        const physicsSystem = this.serviceLocator.get<PhysicsSystem>(ServiceNames.PHYSICS);
        const renderer = this.serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        
        // システムアダプターの作成と登録
        systemManager.registerSystem(new InputSystemAdapter(inputSystem));
        systemManager.registerSystem(new PhysicsSystemAdapter(physicsSystem));
        systemManager.registerSystem(new StateSystemAdapter(stateManager));
        systemManager.registerSystem(new RenderSystemAdapter(renderer, stateManager));
        
        if (this.debugOverlay) {
            systemManager.registerSystem(new DebugSystemAdapter(this.debugOverlay));
        }
        
        // システムの初期化
        await systemManager.initSystems();
    }
    
    /**
     * ゲームステートの登録
     */
    private registerStates(): void {
        const stateManager = this.serviceLocator.get<GameStateManager>(ServiceNames.GAME_STATE_MANAGER);
        
        // 各ステートに必要なサービスを注入するためのゲームプロキシを作成
        const gameProxy = this.createGameProxy();
        
        // ステートの登録
        stateManager.registerState(new MenuState(gameProxy));
        stateManager.registerState(new PlayState(gameProxy));
    }
    
    /**
     * 既存のGameインターフェースとの互換性のためのプロキシ作成
     */
    private createGameProxy(): any {
        return {
            renderer: this.serviceLocator.get(ServiceNames.RENDERER),
            inputSystem: this.serviceLocator.get(ServiceNames.INPUT),
            physicsSystem: this.serviceLocator.get(ServiceNames.PHYSICS),
            assetLoader: this.serviceLocator.get(ServiceNames.ASSET_LOADER),
            musicSystem: this.serviceLocator.get(ServiceNames.AUDIO),
            stateManager: this.serviceLocator.get(ServiceNames.GAME_STATE_MANAGER)
        };
    }
    
    /**
     * ゲームの開始
     */
    start(): void {
        console.log('Starting game...');
        
        const systemManager = this.serviceLocator.get<SystemManager>(ServiceNames.SYSTEM_MANAGER);
        
        // ゲームループの開始
        this.gameLoop.start((deltaTime) => {
            // システムの更新
            systemManager.updateSystems(deltaTime);
            
            // レンダリング
            const renderer = this.serviceLocator.get<PixelRenderer>(ServiceNames.RENDERER);
            systemManager.renderSystems(renderer);
        });
    }
    
    /**
     * ゲームの停止
     */
    stop(): void {
        console.log('Stopping game...');
        this.gameLoop.stop();
    }
}
```

### 3.2 GameLoop

```typescript
// src/core/GameLoop.ts

/**
 * ゲームループの管理
 */
export class GameLoop {
    private running: boolean = false;
    private lastTime: number = 0;
    private readonly targetFPS: number = 60;
    private readonly frameTime: number = 1000 / this.targetFPS;
    private animationFrameId?: number;
    
    /**
     * ゲームループを開始
     * @param updateCallback フレームごとに呼ばれるコールバック（deltaTimeを渡す）
     */
    start(updateCallback: (deltaTime: number) => void): void {
        if (this.running) {
            console.warn('Game loop is already running');
            return;
        }
        
        this.running = true;
        this.lastTime = performance.now();
        
        const gameLoop = (currentTime: number): void => {
            if (!this.running) return;
            
            const deltaTime = currentTime - this.lastTime;
            
            if (deltaTime >= this.frameTime) {
                // deltaTimeを秒単位に変換して渡す
                updateCallback(deltaTime / 1000);
                this.lastTime = currentTime - (deltaTime % this.frameTime);
            }
            
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    /**
     * ゲームループを停止
     */
    stop(): void {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
    }
    
    /**
     * ゲームループが実行中かどうか
     */
    isRunning(): boolean {
        return this.running;
    }
}
```

### 3.3 DebugOverlay

```typescript
// src/debug/DebugOverlay.ts

import { ServiceLocator } from '../services/ServiceLocator';
import { ServiceNames } from '../services/ServiceNames';
import { EventBus } from '../services/EventBus';
import { GameEvents } from '../services/GameEvents';

/**
 * デバッグ情報の表示を管理
 */
export class DebugOverlay {
    private serviceLocator: ServiceLocator;
    private debugElement?: HTMLDivElement;
    private statsElements: Map<string, HTMLElement> = new Map();
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private fps: number = 0;
    
    constructor(serviceLocator: ServiceLocator) {
        this.serviceLocator = serviceLocator;
    }
    
    /**
     * デバッグオーバーレイの初期化
     */
    async init(): Promise<void> {
        this.createDebugUI();
        this.setupEventListeners();
    }
    
    /**
     * デバッグUIの作成
     */
    private createDebugUI(): void {
        // 既存のデバッグ要素があれば削除
        const existingDebug = document.getElementById('debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // デバッグコンテナの作成
        this.debugElement = document.createElement('div');
        this.debugElement.id = 'debug-info';
        this.debugElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #00ff00;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // 統計情報の要素を作成
        const stats = ['FPS', 'Entities', 'State', 'Camera', 'Input'];
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.innerHTML = `${stat}: <span>-</span>`;
            this.debugElement!.appendChild(statElement);
            this.statsElements.set(stat.toLowerCase(), statElement.querySelector('span')!);
        });
        
        document.body.appendChild(this.debugElement);
    }
    
    /**
     * イベントリスナーの設定
     */
    private setupEventListeners(): void {
        const eventBus = this.serviceLocator.get<EventBus>(ServiceNames.EVENT_BUS);
        
        // ステート変更イベント
        eventBus.on(GameEvents.STATE_CHANGE, (data) => {
            this.updateStat('state', data.to);
        });
        
        // キー入力の表示設定
        // F3キーでデバッグ表示の切り替え
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }
    
    /**
     * フレーム更新（FPS計算）
     */
    update(deltaTime: number): void {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            this.updateStat('fps', this.fps.toString());
        }
        
        // その他の統計情報を更新
        this.updateStats();
    }
    
    /**
     * 統計情報の更新
     */
    private updateStats(): void {
        // エンティティ数の更新
        const physicsSystem = this.serviceLocator.tryGet(ServiceNames.PHYSICS) as any;
        if (physicsSystem && physicsSystem.entities) {
            this.updateStat('entities', physicsSystem.entities.size.toString());
        }
        
        // カメラ位置の更新
        const renderer = this.serviceLocator.tryGet(ServiceNames.RENDERER) as any;
        if (renderer && renderer.getCameraPosition) {
            const pos = renderer.getCameraPosition();
            this.updateStat('camera', `${Math.floor(pos.x)}, ${Math.floor(pos.y)}`);
        }
        
        // 入力状態の更新
        const inputSystem = this.serviceLocator.tryGet(ServiceNames.INPUT) as any;
        if (inputSystem) {
            const keys: string[] = [];
            if (inputSystem.isActionPressed?.('left')) keys.push('←');
            if (inputSystem.isActionPressed?.('right')) keys.push('→');
            if (inputSystem.isActionPressed?.('jump')) keys.push('SPACE');
            this.updateStat('input', keys.join(' ') || 'none');
        }
    }
    
    /**
     * 統計情報の更新
     */
    private updateStat(name: string, value: string): void {
        const element = this.statsElements.get(name);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * デバッグ表示の切り替え
     */
    private toggleVisibility(): void {
        if (this.debugElement) {
            this.debugElement.style.display = 
                this.debugElement.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    /**
     * クリーンアップ
     */
    destroy(): void {
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.statsElements.clear();
    }
}
```

### 3.4 システムアダプター

既存のシステムをISystemインターフェースに適合させるアダプターを作成します。

```typescript
// src/systems/adapters/InputSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { InputSystem } from '../../core/InputSystem';

export class InputSystemAdapter implements ISystem {
    readonly name = 'InputSystem';
    readonly priority = SystemPriorities.INPUT;
    enabled = true;
    
    constructor(private inputSystem: InputSystem) {}
    
    update(deltaTime: number): void {
        this.inputSystem.update();
    }
}
```

```typescript
// src/systems/adapters/PhysicsSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { PhysicsSystem } from '../../physics/PhysicsSystem';

export class PhysicsSystemAdapter implements ISystem {
    readonly name = 'PhysicsSystem';
    readonly priority = SystemPriorities.PHYSICS;
    enabled = true;
    
    constructor(private physicsSystem: PhysicsSystem) {}
    
    update(deltaTime: number): void {
        this.physicsSystem.update(deltaTime);
    }
}
```

```typescript
// src/systems/adapters/StateSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { GameStateManager } from '../../states/GameStateManager';

export class StateSystemAdapter implements ISystem {
    readonly name = 'StateSystem';
    readonly priority = SystemPriorities.GAME_LOGIC;
    enabled = true;
    
    constructor(private stateManager: GameStateManager) {}
    
    update(deltaTime: number): void {
        this.stateManager.update(deltaTime);
    }
}
```

```typescript
// src/systems/adapters/RenderSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { GameStateManager } from '../../states/GameStateManager';

export class RenderSystemAdapter implements ISystem {
    readonly name = 'RenderSystem';
    readonly priority = SystemPriorities.RENDER;
    enabled = true;
    
    constructor(
        private renderer: PixelRenderer,
        private stateManager: GameStateManager
    ) {}
    
    render(renderer: PixelRenderer): void {
        // レンダラーのクリア
        renderer.clear('#000000');
        
        // 現在のステートの描画
        this.stateManager.render(renderer);
    }
}
```

```typescript
// src/systems/adapters/DebugSystemAdapter.ts

import { ISystem } from '../../services/SystemManager';
import { SystemPriorities } from '../../services/SystemPriorities';
import { DebugOverlay } from '../../debug/DebugOverlay';

export class DebugSystemAdapter implements ISystem {
    readonly name = 'DebugSystem';
    readonly priority = SystemPriorities.DEBUG;
    enabled = true;
    
    constructor(private debugOverlay: DebugOverlay) {}
    
    update(deltaTime: number): void {
        this.debugOverlay.update(deltaTime);
    }
}
```

### 3.5 index.tsの更新

```typescript
// src/index.ts

import { GameCore } from './core/GameCore';

// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// ゲームの初期化と開始
async function startGame() {
    try {
        const gameCore = new GameCore();
        await gameCore.init();
        gameCore.start();
        
        console.log('Game started successfully!');
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

// DOMContentLoadedを待ってからゲームを開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}
```

## 4. 移行手順

### 4.1 準備
1. 新しいディレクトリ構造の作成
   - `src/systems/adapters/` ディレクトリを作成
   - `src/debug/` ディレクトリを作成

### 4.2 実装順序
1. GameLoopクラスの実装
2. DebugOverlayクラスの実装
3. システムアダプターの実装
4. GameCoreクラスの実装
5. index.tsの更新
6. 既存のGame.tsを削除またはリネーム

### 4.3 テスト手順
1. 各コンポーネントの単体テスト
2. 統合テスト（ゲームが正常に起動するか）
3. 既存機能の動作確認
4. デバッグオーバーレイの動作確認

## 5. 注意事項

### 5.1 後方互換性
- 既存のステート（MenuState、PlayState）は、Gameインターフェースに依存している
- GameCoreでプロキシオブジェクトを作成して互換性を保つ
- 将来的にステートもリファクタリング予定（Phase 3）

### 5.2 パフォーマンス
- SystemManagerによる統一的な更新により、パフォーマンスの最適化が可能
- 不要なシステムは無効化できる

### 5.3 デバッグ
- DebugOverlayは開発環境でのみ有効
- F3キーで表示/非表示を切り替え可能

## 6. 期待される効果

1. **責任の分離**
   - GameCore: 初期化とサービス管理
   - GameLoop: ゲームループ管理
   - DebugOverlay: デバッグ表示

2. **依存関係の明確化**
   - ServiceLocatorによる依存関係の一元管理
   - 循環依存の解消

3. **拡張性の向上**
   - 新しいシステムの追加が容易
   - システムの有効/無効の切り替えが可能

4. **テスタビリティの向上**
   - 各コンポーネントが独立してテスト可能
   - モックの作成が容易

---

この設計に基づいて実装を進めてください。不明な点があればコメントでお知らせください。