import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';
import { Logger } from '../utils/Logger';
import { ResourceLoader } from '../config/ResourceLoader';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';

/**
 * Falling floor platform that collapses when the player steps on it
 */
export class FallingFloor extends Entity implements EntityInitializer {
    private state: 'stable' | 'shaking' | 'falling';
    private stateTimer: number;
    
    private shakeAmplitude: number;
    private shakeFrequency: number;
    private shakeOffset: number;
    
    public physicsSystem: PhysicsSystem | null;
    
    /**
     * Factory method to create a FallingFloor instance
     */
    static create(x: number, y: number): FallingFloor {
        return new FallingFloor(x, y);
    }
    
    constructor(x: number, y: number) {
        const resourceLoader = ResourceLoader.getInstance();
        const config = resourceLoader.getEntityConfigSync('terrain', 'falling_floor');
        
        if (!config) {
            throw new Error('Failed to load falling floor configuration');
        }
        
        super(x, y, config);
        
        this.state = 'stable';
        this.stateTimer = 0;
        
        this.gravity = false;
        this.physicsEnabled = true;
        this.solid = config.physics.solid;
        this.collidable = true;
        this.ignoreTileCollisions = true;
        this.notifyTileCollision = false;
        
        this.shakeAmplitude = config.properties.shakeAmplitude;
        this.shakeFrequency = config.properties.shakeFrequency;
        this.shakeOffset = 0;
        
        this.physicsSystem = null;
        
        this.setAnimation('normal');
    }
    
    onUpdate(deltaTime: number): void {
        switch (this.state) {
        case 'stable':
            break;
                
        case 'shaking':
            this.stateTimer += deltaTime;
                
            this.shakeOffset = Math.sin(this.stateTimer * 60 * this.shakeFrequency) * this.shakeAmplitude;
                
                
            if (this.stateTimer >= 1.0) {
                Logger.log(`[FallingFloor] Shake complete, starting fall at (${this.x}, ${this.y})`);
                this.startFalling();
            }
                
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('shaking');
            }
            break;
                
        case 'falling':
            break;
        }
        
        this.animationTime += deltaTime;
    }
    
    private startShaking(): void {
        if (this.state !== 'stable') return;
        
        this.state = 'shaking';
        this.stateTimer = 0;
        this.shakeOffset = 0;
        
        Logger.log(`[FallingFloor] startShaking: eventBus=${this.eventBus ? 'exists' : 'null'}`);
        
        if (this.eventBus) {
            this.eventBus.emit('fallingfloor:shaking', { 
                floor: this,
                x: this.x,
                y: this.y
            });
            Logger.log('[FallingFloor] Emitted fallingfloor:shaking event');
        } else {
            Logger.warn('[FallingFloor] No eventBus available to emit event');
        }
    }
    
    private startFalling(): void {
        this.state = 'falling';
        this.stateTimer = 0;
        this.shakeOffset = 0;
        
        this.gravity = true;
        this.physicsEnabled = true;
        this.solid = false;
        this.vy = 0;
        
        Logger.log(`[FallingFloor] Started falling: gravity=${this.gravity}, physicsEnabled=${this.physicsEnabled}, ignoreTileCollisions=${this.ignoreTileCollisions}`);
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState('broken');
        }
        
        if (this.eventBus) {
            this.eventBus.emit('fallingfloor:falling', { 
                floor: this,
                x: this.x,
                y: this.y
            });
        }
    }
    
    
    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (this.state === 'shaking') {
            renderer.ctx.save();
            renderer.ctx.translate(this.shakeOffset, 0);
        }
        
        super.render(renderer);
        
        if (this.state === 'shaking') {
            renderer.ctx.restore();
        }
    }
    
    onCollision(collisionInfo?: CollisionInfo): boolean {
        Logger.log(`[FallingFloor] onCollision called at (${this.x}, ${this.y}), state=${this.state}`);
        
        if (!collisionInfo || this.state !== 'stable') {
            return false;
        }
        
        const other = collisionInfo.other;
        
        if (other && 'jumpPower' in other) {
            Logger.log('[FallingFloor] Player collision detected, starting shaking');
            this.startShaking();
            return true;
        }
        
        return false;
    }
    
    reset(x: number, y: number): void {
        super.reset(x, y);
        
        this.state = 'stable';
        this.stateTimer = 0;
        this.shakeOffset = 0;
        
        this.gravity = false;
        this.physicsEnabled = true;
        this.solid = true;
        this.vy = 0;
        
        this.visible = true;
        this.active = true;
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState('normal');
        }
    }
    
    /**
     * Initialize this falling floor in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.physicsSystem = manager.getPhysicsSystem();
        manager.addPlatform(this);
    }
    
    /**
     * Get animation definitions for falling floor
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'normal',
                sprites: ['terrain/falling_floor_normal'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'shaking',
                sprites: [
                    'terrain/falling_floor_crack1',
                    'terrain/falling_floor_crack2'
                ],
                frameDuration: 100,
                loop: true
            },
            {
                id: 'broken',
                sprites: ['terrain/falling_floor_broken'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for falling floor
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x50,
                    0x51,
                    0x01
                ]
            }
        };
    }
}