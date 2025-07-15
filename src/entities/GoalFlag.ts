
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';

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
    }

    onUpdate(_deltaTime: number): void {
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/goal_flag')) {
            renderer.drawSprite('terrain/goal_flag', this.x, this.y);
        } else {
            renderer.drawRect(this.x, this.y, this.width, this.height, '#FFD700');
            
            renderer.drawRect(this.x + 10, this.y, 10, this.height, '#8B4513');
            
            const flagWidth = 20;
            const flagHeight = 15;
            renderer.drawRect(this.x + 20, this.y + 5, flagWidth, flagHeight, '#FF0000');
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
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
        manager.getPhysicsSystem().addEntity(this, manager.getPhysicsSystem().layers.ITEM);
    }
}