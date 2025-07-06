
import { Logger } from '../utils/Logger';

export type EventHandler<T = any> = (data: T) => void;

export type Unsubscribe = () => void;

export interface IEventBus {
    
    emit<T = any>(event: string, data?: T): void;

    on<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;

    once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;

    off<T = any>(event: string, handler: EventHandler<T>): void;

    removeAllListeners(event?: string): void;
}

export class EventBus implements IEventBus {
    private events: Map<string, Set<EventHandler>> = new Map();
    
    emit<T = any>(event: string, data?: T): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    Logger.error(`Error in event handler for '${event}':`, error);
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
