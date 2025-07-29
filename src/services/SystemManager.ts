
import type { PixelRenderer } from '../rendering/PixelRenderer';

export interface ISystem {
    
    readonly name: string;

    readonly priority: number;

    enabled: boolean;

    init?(): Promise<void> | void;

    update?(deltaTime: number): void;

    render?(renderer: PixelRenderer): void;

    destroy?(): void;
}

export interface ISystemManager {
    
    registerSystem(system: ISystem): void;

    unregisterSystem(name: string): void;

    getSystem<T extends ISystem>(name: string): T | undefined;

    initSystems(): Promise<void>;

    updateSystems(deltaTime: number): void;

    renderSystems(renderer: PixelRenderer): void;

    destroySystems(): void;
}

/**
 * Manages system functionality
 */
export class SystemManager implements ISystemManager {
    private systemsMap: Map<string, ISystem> = new Map();
    private sortedSystemsCache: ISystem[] = [];
    
    get systems(): ISystem[] {
        return Array.from(this.systemsMap.values());
    }
    
    registerSystem(system: ISystem): void {
        if (this.systemsMap.has(system.name)) {
            throw new Error(`System '${system.name}' is already registered`);
        }
        
        this.systemsMap.set(system.name, system);
        this.updateSortedSystems();
    }
    
    unregisterSystem(name: string): void {
        const system = this.systemsMap.get(name);
        if (system) {
            system.destroy?.();
            this.systemsMap.delete(name);
            this.updateSortedSystems();
        }
    }
    
    getSystem<T extends ISystem>(name: string): T | undefined {
        return this.systemsMap.get(name) as T | undefined;
    }
    
    async initSystems(): Promise<void> {
        for (const system of this.sortedSystemsCache) {
            if (system.enabled && system.init) {
                await system.init();
            }
        }
    }
    
    updateSystems(deltaTime: number): void {
        for (const system of this.sortedSystemsCache) {
            if (system.enabled && system.update) {
                system.update(deltaTime);
            }
        }
    }
    
    renderSystems(renderer: PixelRenderer): void {
        for (const system of this.sortedSystemsCache) {
            if (system.enabled && system.render) {
                system.render(renderer);
            }
        }
    }
    
    destroySystems(): void {

        for (let i = this.sortedSystemsCache.length - 1; i >= 0; i--) {
            const system = this.sortedSystemsCache[i];
            if (!system) {
                throw new Error(`Invalid system at index: ${i}`);
            }
            system.destroy?.();
        }
        
        this.systemsMap.clear();
        this.sortedSystemsCache = [];
    }
    
    private updateSortedSystems(): void {
        this.sortedSystemsCache = Array.from(this.systemsMap.values())
            .sort((a, b) => a.priority - b.priority);
    }
}
