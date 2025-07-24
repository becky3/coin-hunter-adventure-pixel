import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';

/**
 * Falling floor platform that collapses when the player steps on it
 */
export class FallingFloor extends Entity implements EntityInitializer {
    private state: 'stable' | 'shaking' | 'falling' | 'respawning';
    private stateTimer: number;
    
    private originalX: number;
    private originalY: number;
    
    private readonly SHAKE_DURATION = 60;
    private readonly RESPAWN_DELAY = 180;
    
    private shakeAmplitude: number;
    private shakeFrequency: number;
    private shakeOffset: number;
    
    public physicsSystem: PhysicsSystem | null;
    private entityManager: EntityManager | null;
    
    /**
     * Factory method to create a FallingFloor instance
     */
    static create(x: number, y: number): FallingFloor {
        return new FallingFloor(x, y);
    }
    
    constructor(x: number, y: number) {
        const width = 16;
        const height = 16;
        
        super(x, y, width, height);
        
        this.state = 'stable';
        this.stateTimer = 0;
        
        this.originalX = x;
        this.originalY = y;
        
        this.gravity = false;
        this.physicsEnabled = true;
        this.solid = true;
        this.collidable = true;
        this.ignoreTileCollisions = true;
        
        this.shakeAmplitude = 2;
        this.shakeFrequency = 0.5;
        this.shakeOffset = 0;
        
        this.physicsSystem = null;
        this.entityManager = null;
        
        this.setAnimation('normal');
    }
    
    onUpdate(deltaTime: number): void {
        switch (this.state) {
        case 'stable':
            break;
                
        case 'shaking':
            this.stateTimer += deltaTime * 60;
                
            this.shakeOffset = Math.sin(this.stateTimer * this.shakeFrequency) * this.shakeAmplitude;
                
            if (this.stateTimer >= this.SHAKE_DURATION) {
                this.startFalling();
            }
                
            if (this.entityAnimationManager) {
                this.entityAnimationManager.setState('shaking');
            }
            break;
                
        case 'falling':
            this.stateTimer += deltaTime * 60;
                
            if (this.y > this.originalY + 100) {
                this.startRespawning();
            }
            break;
                
        case 'respawning':
            this.stateTimer += deltaTime * 60;
                
            if (this.stateTimer >= this.RESPAWN_DELAY) {
                this.respawn();
            }
            break;
        }
        
        this.animationTime += deltaTime;
    }
    
    private startShaking(): void {
        if (this.state !== 'stable') return;
        
        this.state = 'shaking';
        this.stateTimer = 0;
        this.shakeOffset = 0;
    }
    
    private startFalling(): void {
        this.state = 'falling';
        this.stateTimer = 0;
        this.shakeOffset = 0;
        
        this.gravity = true;
        this.physicsEnabled = true;
        this.solid = false;
        this.vy = 0;
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState('broken');
        }
    }
    
    private startRespawning(): void {
        this.state = 'respawning';
        this.stateTimer = 0;
        
        this.visible = false;
        this.active = true;
    }
    
    private respawn(): void {
        this.state = 'stable';
        this.stateTimer = 0;
        
        this.x = this.originalX;
        this.y = this.originalY;
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = true;
        this.vy = 0;
        
        this.visible = true;
        this.active = true;
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState('normal');
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
        if (!collisionInfo) {
            return false;
        }
        
        const other = collisionInfo.other;
        
        if (other && other.constructor.name === 'Player') {
            const player = other as unknown as Player;
            
            const fromTop = collisionInfo.side === 'bottom' || 
                          (player.y + player.height <= this.y + 4 && player.vy >= 0);
            
            if (fromTop && this.state === 'stable') {
                this.startShaking();
                return true;
            }
        }
        
        return false;
    }
    
    reset(x: number, y: number): void {
        super.reset(x, y);
        
        this.originalX = x;
        this.originalY = y;
        
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
        this.entityManager = manager;
        this.physicsSystem = manager.getPhysicsSystem();
        manager.addPlatform(this);
        this.physicsLayer = manager.getPhysicsSystem().layers.PLATFORM;
    }
    
    /**
     * Get animation definitions for falling floor
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'normal',
                sprites: ['terrain/falling_floor_normal.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'shaking',
                sprites: [
                    'terrain/falling_floor_crack1.json',
                    'terrain/falling_floor_crack2.json'
                ],
                frameDuration: 100,
                loop: true
            },
            {
                id: 'broken',
                sprites: ['terrain/falling_floor_broken.json'],
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
                    0x17,
                    0x16,
                    0x15
                ]
            }
        };
    }
}