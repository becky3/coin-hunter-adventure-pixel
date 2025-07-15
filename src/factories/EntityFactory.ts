import { Entity } from '../entities/Entity';
import { Coin } from '../entities/Coin';
import { Spring } from '../entities/Spring';
import { GoalFlag } from '../entities/GoalFlag';
import { Slime } from '../entities/enemies/Slime';
import { Bat } from '../entities/enemies/Bat';
import { Logger } from '../utils/Logger';

type EntityFactoryFunction = (x: number, y: number) => Entity;

/**
 * Factory class for creating game entities
 */
export class EntityFactory {
    private static factories: Map<string, EntityFactoryFunction> = new Map();
    
    static {
        EntityFactory.register('coin', (x, y) => Coin.create(x, y));
        EntityFactory.register('spring', (x, y) => Spring.create(x, y));
        EntityFactory.register('goal', (x, y) => GoalFlag.create(x, y));
        EntityFactory.register('slime', (x, y) => Slime.create(x, y));
        EntityFactory.register('bat', (x, y) => Bat.create(x, y));
    }
    
    /**
     * Register a new entity type
     */
    static register(type: string, factory: EntityFactoryFunction): void {
        EntityFactory.factories.set(type, factory);
        Logger.log(`[EntityFactory] Registered entity type: ${type}`);
    }
    
    /**
     * Create an entity of the specified type
     */
    static create(type: string, x: number, y: number): Entity | null {
        const factory = EntityFactory.factories.get(type);
        if (!factory) {
            Logger.warn(`[EntityFactory] Unknown entity type: ${type}`);
            return null;
        }
        
        try {
            const entity = factory(x, y);
            Logger.log(`[EntityFactory] Created ${type} at (${x}, ${y})`);
            return entity;
        } catch (error) {
            Logger.error(`[EntityFactory] Failed to create ${type}:`, error);
            return null;
        }
    }
    
    /**
     * Check if a factory exists for the given type
     */
    static hasFactory(type: string): boolean {
        return EntityFactory.factories.has(type);
    }
    
    /**
     * Get all registered entity types
     */
    static getRegisteredTypes(): string[] {
        return Array.from(EntityFactory.factories.keys());
    }
}