
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';

/**
 * GoalFlag implementation
 */
export class GoalFlag extends Entity implements EntityInitializer {
    private cleared: boolean;

    /**
     * Factory method to create a GoalFlag instance
     */
    static create(x: number, y: number): GoalFlag {
        return new GoalFlag(x, y);
    }

    constructor(x: number, y: number) {
        let goalConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            goalConfig = resourceLoader.getObjectConfig('items', 'goalFlag');
        } catch (error) {
            Logger.warn('Failed to load goal flag config:', error);
        }
        
        const width = goalConfig?.physics.width || 32;
        const height = goalConfig?.physics.height || 32;
        
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = goalConfig?.physics.solid || false;
        
        this.cleared = false;
        
        this.setAnimation('idle');
    }

    onUpdate(_deltaTime: number): void {
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        super.render(renderer);
    }

    onCollision(collisionInfo?: CollisionInfo): boolean {
        if (!collisionInfo || !collisionInfo.other) return false;
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.cleared) {
            return true;
        }
        return false;
    }
    
    public isCleared(): boolean {
        return this.cleared;
    }

    clear(): void {
        this.cleared = true;
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.cleared = false;
    }
    
    /**
     * Initialize this goal flag in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        manager.addItem(this);
        this.physicsLayer = manager.getPhysicsSystem().layers.ITEM;
    }
    
    /**
     * Get animation definitions for goal flag
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['terrain/goal_flag.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for goal flag
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x51,
                    0x03,
                    0x31
                ]
            }
        };
    }
}