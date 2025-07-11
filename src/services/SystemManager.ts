
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
    private _systems: Map<string, ISystem> = new Map();
    private sortedSystems: ISystem[] = [];
    
    get systems(): ISystem[] {
        return Array.from(this._systems.values());
    }
    
    registerSystem(system: ISystem): void {
        if (this._systems.has(system.name)) {
            throw new Error(`System '${system.name}' is already registered`);
        }
        
        this._systems.set(system.name, system);
        this.updateSortedSystems();
    }
    
    unregisterSystem(name: string): void {
        const system = this._systems.get(name);
        if (system) {
            system.destroy?.();
            this._systems.delete(name);
            this.updateSortedSystems();
        }
    }
    
    getSystem<T extends ISystem>(name: string): T | undefined {
        return this._systems.get(name) as T | undefined;
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
