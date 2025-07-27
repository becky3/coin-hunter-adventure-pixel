
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';
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
        const resourceLoader = ResourceLoader.getInstance();
        const goalConfig = resourceLoader.getEntityConfigSync('terrain', 'goal_flag');
        
        if (!goalConfig) {
            throw new Error('Failed to load goal flag configuration');
        }
        
        super(x, y, goalConfig);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = goalConfig.physics.solid;
        
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