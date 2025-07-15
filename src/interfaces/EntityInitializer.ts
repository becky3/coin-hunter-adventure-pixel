import { EntityManager } from '../managers/EntityManager';

/**
 * Interface for entities that need custom initialization in EntityManager
 */
export interface EntityInitializer {
    /**
     * Initialize this entity within the EntityManager context
     * This method handles registering the entity with appropriate systems
     */
    initializeInManager(manager: EntityManager): void;
}

/**
 * Type guard to check if an entity implements EntityInitializer
 */
export function hasEntityInitializer(entity: unknown): entity is EntityInitializer {
    return entity !== null && 
           typeof entity === 'object' && 
           'initializeInManager' in entity &&
           typeof (entity as EntityInitializer).initializeInManager === 'function';
}