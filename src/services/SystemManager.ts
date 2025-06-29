
import type { PixelRenderer } from '../rendering/PixelRenderer';

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
