
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
