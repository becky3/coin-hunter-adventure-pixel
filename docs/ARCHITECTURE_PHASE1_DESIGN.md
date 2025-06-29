# Phase 1: 基盤整備 - 詳細設計

## 1. ServiceLocator

### 1.1 インターフェース定義

```typescript
// src/services/ServiceLocator.ts

/**
 * サービスを管理するためのServiceLocatorインターフェース
 */
export interface IServiceLocator {
    /**
     * サービスを登録する
     * @param name サービス名
     * @param service サービスインスタンス
     * @param override 既存のサービスを上書きするか（デフォルト: false）
     */
    register<T>(name: string, service: T, override?: boolean): void;
    
    /**
     * サービスを取得する
     * @param name サービス名
     * @returns サービスインスタンス
     * @throws Error サービスが見つからない場合
     */
    get<T>(name: string): T;
    
    /**
     * サービスを安全に取得する（存在しない場合はundefined）
     * @param name サービス名
     * @returns サービスインスタンスまたはundefined
     */
    tryGet<T>(name: string): T | undefined;
    
    /**
     * サービスが登録されているか確認する
     * @param name サービス名
     * @returns 登録されている場合true
     */
    has(name: string): boolean;
    
    /**
     * サービスの登録を解除する
     * @param name サービス名
     */
    unregister(name: string): void;
    
    /**
     * すべてのサービスをクリアする
     */
    clear(): void;
}

/**
 * ServiceLocatorの実装
 */
export class ServiceLocator implements IServiceLocator {
    private services: Map<string, any> = new Map();
    
    register<T>(name: string, service: T, override: boolean = false): void {
        if (this.services.has(name) && !override) {
            throw new Error(`Service '${name}' is already registered`);
        }
        this.services.set(name, service);
    }
    
    get<T>(name: string): T {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }
        return service as T;
    }
    
    tryGet<T>(name: string): T | undefined {
        return this.services.get(name) as T | undefined;
    }
    
    has(name: string): boolean {
        return this.services.has(name);
    }
    
    unregister(name: string): void {
        this.services.delete(name);
    }
    
    clear(): void {
        this.services.clear();
    }
}

// シングルトンインスタンス（オプション）
export const serviceLocator = new ServiceLocator();
```

### 1.2 サービス名の定数定義

```typescript
// src/services/ServiceNames.ts

/**
 * サービス名の定数
 * タイプセーフなサービス取得のため
 */
export const ServiceNames = {
    RENDERER: 'renderer',
    INPUT: 'input',
    PHYSICS: 'physics',
    AUDIO: 'audio',
    ASSET_LOADER: 'assetLoader',
    EVENT_BUS: 'eventBus',
    SYSTEM_MANAGER: 'systemManager',
    GAME_STATE_MANAGER: 'gameStateManager'
} as const;

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];
```

## 2. EventBus

### 2.1 インターフェース定義

```typescript
// src/services/EventBus.ts

/**
 * イベントハンドラーの型定義
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * イベントの登録解除関数
 */
export type Unsubscribe = () => void;

/**
 * イベントバスのインターフェース
 */
export interface IEventBus {
    /**
     * イベントを発行する
     * @param event イベント名
     * @param data イベントデータ
     */
    emit<T = any>(event: string, data?: T): void;
    
    /**
     * イベントリスナーを登録する
     * @param event イベント名
     * @param handler イベントハンドラー
     * @returns 登録解除関数
     */
    on<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;
    
    /**
     * イベントリスナーを一度だけ実行する
     * @param event イベント名
     * @param handler イベントハンドラー
     * @returns 登録解除関数
     */
    once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;
    
    /**
     * イベントリスナーを解除する
     * @param event イベント名
     * @param handler イベントハンドラー
     */
    off<T = any>(event: string, handler: EventHandler<T>): void;
    
    /**
     * 特定のイベントのすべてのリスナーを解除する
     * @param event イベント名
     */
    removeAllListeners(event?: string): void;
}

/**
 * EventBusの実装
 */
export class EventBus implements IEventBus {
    private events: Map<string, Set<EventHandler>> = new Map();
    
    emit<T = any>(event: string, data?: T): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
        }
    }
    
    on<T = any>(event: string, handler: EventHandler<T>): Unsubscribe {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        const handlers = this.events.get(event)!;
        handlers.add(handler);
        
        // 登録解除関数を返す
        return () => this.off(event, handler);
    }
    
    once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe {
        const wrappedHandler: EventHandler<T> = (data) => {
            handler(data);
            this.off(event, wrappedHandler);
        };
        
        return this.on(event, wrappedHandler);
    }
    
    off<T = any>(event: string, handler: EventHandler<T>): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.events.delete(event);
            }
        }
    }
    
    removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}
```

### 2.2 ゲームイベントの定義

```typescript
// src/services/GameEvents.ts

/**
 * ゲーム内で使用されるイベント名の定義
 */
export const GameEvents = {
    // システムイベント
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    
    // ステートイベント
    STATE_CHANGE: 'state:change',
    STATE_ENTER: 'state:enter',
    STATE_EXIT: 'state:exit',
    
    // レベルイベント
    LEVEL_START: 'level:start',
    LEVEL_COMPLETE: 'level:complete',
    LEVEL_FAILED: 'level:failed',
    
    // プレイヤーイベント
    PLAYER_SPAWN: 'player:spawn',
    PLAYER_DEATH: 'player:death',
    PLAYER_DAMAGE: 'player:damage',
    PLAYER_JUMP: 'player:jump',
    
    // アイテムイベント
    COIN_COLLECT: 'item:coin:collect',
    POWERUP_COLLECT: 'item:powerup:collect',
    
    // エネミーイベント
    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_DEATH: 'enemy:death',
    
    // UIイベント
    UI_BUTTON_CLICK: 'ui:button:click',
    UI_MENU_OPEN: 'ui:menu:open',
    UI_MENU_CLOSE: 'ui:menu:close'
} as const;

export type GameEvent = typeof GameEvents[keyof typeof GameEvents];

/**
 * イベントデータの型定義
 */
export interface StateChangeData {
    from: string;
    to: string;
}

export interface CoinCollectData {
    value: number;
    position: { x: number; y: number };
}

export interface PlayerDamageData {
    damage: number;
    source: string;
}
```

## 3. SystemManager

### 3.1 インターフェース定義

```typescript
// src/services/SystemManager.ts

/**
 * ゲームシステムの基本インターフェース
 */
export interface ISystem {
    /** システム名 */
    readonly name: string;
    
    /** システムの優先順位（小さいほど先に実行） */
    readonly priority: number;
    
    /** システムが有効かどうか */
    enabled: boolean;
    
    /**
     * システムの初期化
     */
    init?(): Promise<void> | void;
    
    /**
     * システムの更新
     * @param deltaTime 前フレームからの経過時間（秒）
     */
    update?(deltaTime: number): void;
    
    /**
     * システムの描画
     * @param renderer レンダラー
     */
    render?(renderer: PixelRenderer): void;
    
    /**
     * システムの破棄
     */
    destroy?(): void;
}

/**
 * システムマネージャーのインターフェース
 */
export interface ISystemManager {
    /**
     * システムを登録する
     * @param system システムインスタンス
     */
    registerSystem(system: ISystem): void;
    
    /**
     * システムを登録解除する
     * @param name システム名
     */
    unregisterSystem(name: string): void;
    
    /**
     * システムを取得する
     * @param name システム名
     */
    getSystem<T extends ISystem>(name: string): T | undefined;
    
    /**
     * すべてのシステムを初期化する
     */
    initSystems(): Promise<void>;
    
    /**
     * すべてのシステムを更新する
     * @param deltaTime 前フレームからの経過時間（秒）
     */
    updateSystems(deltaTime: number): void;
    
    /**
     * すべてのシステムを描画する
     * @param renderer レンダラー
     */
    renderSystems(renderer: PixelRenderer): void;
    
    /**
     * すべてのシステムを破棄する
     */
    destroySystems(): void;
}

/**
 * SystemManagerの実装
 */
export class SystemManager implements ISystemManager {
    private systems: Map<string, ISystem> = new Map();
    private sortedSystems: ISystem[] = [];
    
    registerSystem(system: ISystem): void {
        if (this.systems.has(system.name)) {
            throw new Error(`System '${system.name}' is already registered`);
        }
        
        this.systems.set(system.name, system);
        this.updateSortedSystems();
    }
    
    unregisterSystem(name: string): void {
        const system = this.systems.get(name);
        if (system) {
            system.destroy?.();
            this.systems.delete(name);
            this.updateSortedSystems();
        }
    }
    
    getSystem<T extends ISystem>(name: string): T | undefined {
        return this.systems.get(name) as T | undefined;
    }
    
    async initSystems(): Promise<void> {
        for (const system of this.sortedSystems) {
            if (system.enabled && system.init) {
                await system.init();
            }
        }
    }
    
    updateSystems(deltaTime: number): void {
        for (const system of this.sortedSystems) {
            if (system.enabled && system.update) {
                system.update(deltaTime);
            }
        }
    }
    
    renderSystems(renderer: PixelRenderer): void {
        for (const system of this.sortedSystems) {
            if (system.enabled && system.render) {
                system.render(renderer);
            }
        }
    }
    
    destroySystems(): void {
        // 逆順で破棄（依存関係を考慮）
        for (let i = this.sortedSystems.length - 1; i >= 0; i--) {
            const system = this.sortedSystems[i];
            system.destroy?.();
        }
        
        this.systems.clear();
        this.sortedSystems = [];
    }
    
    private updateSortedSystems(): void {
        this.sortedSystems = Array.from(this.systems.values())
            .sort((a, b) => a.priority - b.priority);
    }
}
```

### 3.2 システムの優先順位定義

```typescript
// src/services/SystemPriorities.ts

/**
 * システムの実行優先順位
 * 数値が小さいほど先に実行される
 */
export const SystemPriorities = {
    INPUT: 100,          // 入力は最初に処理
    PHYSICS: 200,        // 物理演算
    GAME_LOGIC: 300,     // ゲームロジック
    ANIMATION: 400,      // アニメーション
    AUDIO: 500,          // オーディオ
    RENDER: 600,         // レンダリングは最後
    DEBUG: 700           // デバッグは一番最後
} as const;
```

## 4. 基本インターフェース定義

### 4.1 共通インターフェース

```typescript
// src/interfaces/Common.ts

/**
 * 2D座標
 */
export interface Vector2D {
    x: number;
    y: number;
}

/**
 * 矩形領域
 */
export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * 初期化可能なオブジェクト
 */
export interface Initializable {
    init(): Promise<void> | void;
}

/**
 * 更新可能なオブジェクト
 */
export interface Updatable {
    update(deltaTime: number): void;
}

/**
 * 描画可能なオブジェクト
 */
export interface Renderable {
    render(renderer: PixelRenderer): void;
}

/**
 * 破棄可能なオブジェクト
 */
export interface Destroyable {
    destroy(): void;
}
```

## 5. 実装の順序

1. **基本インターフェースの作成**
   - Common.ts のインターフェース定義
   - 既存コードとの互換性確保

2. **ServiceLocatorの実装**
   - ServiceLocator.ts の作成
   - ServiceNames.ts の定義
   - 単体テストの作成

3. **EventBusの実装**
   - EventBus.ts の作成
   - GameEvents.ts の定義
   - イベントハンドラーのテスト

4. **SystemManagerの実装**
   - SystemManager.ts の作成
   - SystemPriorities.ts の定義
   - システム統合テスト

5. **既存システムのアダプター作成**
   - 各システムをISystemインターフェースに適合させる
   - 段階的な移行のためのアダプター作成

## 6. テスト計画

### 6.1 単体テスト

```typescript
// tests/services/ServiceLocator.test.ts
// tests/services/EventBus.test.ts
// tests/services/SystemManager.test.ts
```

### 6.2 統合テスト

```typescript
// tests/integration/ServiceIntegration.test.ts
```

## 7. 次のステップ

この設計に基づいて、Geminiに以下の順序で実装を依頼：

1. ディレクトリ構造の作成
2. インターフェースファイルの作成
3. ServiceLocatorの実装
4. EventBusの実装
5. SystemManagerの実装
6. テストの作成

各実装は独立しているため、並行して作業することも可能です。