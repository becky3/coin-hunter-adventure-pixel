

export interface IServiceLocator {
    
    register<T>(name: string, service: T, override?: boolean): void;

    get<T>(name: string): T;

    tryGet<T>(name: string): T | undefined;

    has(name: string): boolean;

    unregister(name: string): void;

    clear(): void;
}

/**
 * ServiceLocator implementation
 */
export class ServiceLocator implements IServiceLocator {
    private services: Map<string, unknown> = new Map();
    private static instance: ServiceLocator;
    
    static getInstance(): ServiceLocator {
        if (!ServiceLocator.instance) {
            ServiceLocator.instance = new ServiceLocator();
        }
        return ServiceLocator.instance;
    }
    
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
    
    static get<T>(name: string): T {
        return ServiceLocator.getInstance().get<T>(name);
    }
    
    static register<T>(name: string, service: T, override: boolean = false): void {
        ServiceLocator.getInstance().register(name, service, override);
    }
    
    static has(name: string): boolean {
        return ServiceLocator.getInstance().has(name);
    }
}
