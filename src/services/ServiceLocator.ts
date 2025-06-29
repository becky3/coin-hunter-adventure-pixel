
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
