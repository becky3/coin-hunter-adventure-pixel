import { Entity } from '../entities/Entity';
import { Coin } from '../entities/Coin';
import { Spring } from '../entities/Spring';
import { GoalFlag } from '../entities/GoalFlag';
import { Slime } from '../entities/enemies/Slime';
import { Bat } from '../entities/enemies/Bat';
import { Spider } from '../entities/enemies/Spider';
import { ArmorKnight } from '../entities/enemies/ArmorKnight';
import { Logger } from '../utils/Logger';
import { ShieldStone } from '../entities/powerups/ShieldStone';
import { PowerGlove } from '../entities/powerups/PowerGlove';

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
        EntityFactory.register('spider', (x, y) => Spider.create(x, y));
        EntityFactory.register('armor_knight', (x, y) => ArmorKnight.create(x, y));
        EntityFactory.register('shield_stone', (x, y) => ShieldStone.create(x, y));
        EntityFactory.register('power_glove', (x, y) => PowerGlove.create(x, y));
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
        Logger.log(`[EntityFactory] Attempting to create entity: ${type} at (${x}, ${y})`);
        Logger.log('[EntityFactory] Registered types:', EntityFactory.getRegisteredTypes());
        
        const factory = EntityFactory.factories.get(type);
        if (!factory) {
            Logger.warn(`[EntityFactory] Unknown entity type: ${type}`);
            Logger.warn(`[EntityFactory] Available types: ${Array.from(EntityFactory.factories.keys()).join(', ')}`);
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