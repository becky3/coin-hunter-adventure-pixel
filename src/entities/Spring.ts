import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { InputSystem } from '../core/InputSystem';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';

/**
 * Spring platform that bounces the player
 */
export class Spring extends Entity implements EntityInitializer {
    private baseBounceMultiplier: number;
    private compression: number;
    public triggered: boolean;
    private animationSpeed: number;
    declare animationTime: number;
    public physicsSystem: PhysicsSystem | null;
    private cooldownFrames: number;
    private readonly COOLDOWN_DURATION = 20;

    /**
     * Factory method to create a Spring instance
     */
    static create(x: number, y: number): Spring {
        return new Spring(x, y);
    }

    constructor(x: number, y: number) {
        let springConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            springConfig = resourceLoader.getObjectConfig('items', 'spring');
        } catch (error) {
            Logger.warn('Failed to load spring config:', error);
        }
        
        const width = springConfig?.physics.width || 16;
        const height = springConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = springConfig?.physics.solid ?? true;
        
        this.baseBounceMultiplier = 3.5;
        this.compression = 0;
        this.triggered = false;
        this.animationSpeed = springConfig?.properties.expansionSpeed || 0.2;
        
        this.animationTime = 0;
        this.physicsSystem = null;
        this.cooldownFrames = 0;
        
        this.setAnimation('normal');
    }

    onUpdate(deltaTime: number): void {
        if (this.cooldownFrames > 0) {
            this.cooldownFrames--;
        }
        
        if (this.compression > 0) {
            this.compression *= 0.9;
            if (this.compression < 0.01) {
                this.compression = 0;
            }
        }
        
        if (this.triggered && this.compression <= 0.01) {
            this.triggered = false;
        }
        
        if (this.entityAnimationManager) {
            this.entityAnimationManager.setState(this.compression > 0.5 ? 'compressed' : 'normal');
        }
        
        this.animationTime += deltaTime;
    }

    private applyBounce(player: Player): void {
        
        player.y = this.y - player.height;
        
        const playerJumpPower = player.jumpPower || 10;
        const bounceVelocity = -(playerJumpPower * this.baseBounceMultiplier);
        
        const inputManager = (window as Window & { game?: { inputManager?: InputSystem } }).game?.inputManager;
        const isJumpPressed = inputManager ? inputManager.isActionPressed('jump') : false;
        
        Logger.log(`[Spring] Bounce triggered - velocity: ${bounceVelocity}, jump pressed: ${isJumpPressed}`);
        
        if ('applySpringBounce' in player && typeof player.applySpringBounce === 'function') {
            (player as Player).applySpringBounce(bounceVelocity, isJumpPressed);
        } else {
            player.vy = bounceVelocity;
            player.grounded = false;
        }
        
        this.compression = 1;
        this.triggered = true;
        this.cooldownFrames = this.COOLDOWN_DURATION;
        
        // TODO: Play sound effect
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        const compression = this.compression * 0.3;
        const offsetY = this.height * compression;
        
        renderer.ctx.save();
        renderer.ctx.translate(0, offsetY);
        
        super.render(renderer);
        
        renderer.ctx.restore();
    }

    onCollision(collisionInfo?: CollisionInfo): boolean {
        if (!collisionInfo) {
            Logger.warn('[Spring] onCollision called with no collisionInfo');
            return false;
        }
        
        const other = collisionInfo.other;
        
        if (other && other.constructor.name === 'Player') {
            const player = other as unknown as Player;
            
            const fromTop = collisionInfo.side === 'top' || 
                          (player.y + player.height <= this.y + 8 && player.vy > 0);
            
            if (fromTop && player.vy > 0) {
                if (this.cooldownFrames <= 0) {
                    this.applyBounce(player);
                }
                return true;
            }
        }
        
        return false;
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.compression = 0;
        this.triggered = false;
        this.animationTime = 0;
        this.cooldownFrames = 0;
    }
    
    /**
     * Initialize this spring in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        this.physicsSystem = manager.getPhysicsSystem();
        manager.addItem(this);
        this.physicsLayer = manager.getPhysicsSystem().layers.ITEM;
    }
    
    /**
     * Get animation definitions for spring
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'normal',
                sprites: ['terrain/spring.json'],
                frameDuration: 0,
                loop: false
            },
            {
                id: 'compressed',
                sprites: ['terrain/spring.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for spring
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x42,
                    0x41,
                    0x40
                ]
            }
        };
    }
}