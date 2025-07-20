import { Entity, CollisionInfo } from '../Entity';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import { PowerGloveConfig } from '../../config/PowerGloveConfig';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';

/**
 * Energy bullet projectile for ranged attacks
 */
export class EnergyBullet extends Entity implements EntityInitializer {
    private lifeTime: number;
    private maxLifeTime: number;
    private damage: number;
    private animationTime: number;
    private destroyed: boolean = false;
    private originX: number;
    private originY: number;

    constructor(x: number, y: number, direction: number, speed: number) {
        super(x, y, PowerGloveConfig.bulletWidth, PowerGloveConfig.bulletHeight);
        
        this.vx = direction * speed;
        this.vy = 0;
        Logger.log('[EnergyBullet] Initial velocity set:', this.vx, this.vy);
        
        this.gravity = false;
        this.physicsEnabled = true;
        this.solid = false;
        this.notifyTileCollision = true;
        
        this.lifeTime = 0;
        this.maxLifeTime = PowerGloveConfig.bulletLifetime;
        this.damage = PowerGloveConfig.bulletDamage;
        this.animationTime = 0;
        
        this.originX = x;
        this.originY = y;
        
        Logger.log('[EnergyBullet] Created at', x, y, 'direction:', direction);
    }

    onUpdate(deltaTime: number): void {
        this.lifeTime += deltaTime * 1000;
        this.animationTime += deltaTime * 1000;
        
        
        if (this.lifeTime >= this.maxLifeTime) {
            Logger.log('[EnergyBullet] Destroyed by timeout at', this.x, this.y);
            this.destroy();
            return;
        }
        
        const distanceFromOrigin = Math.sqrt(
            Math.pow(this.x - this.originX, 2) + 
            Math.pow(this.y - this.originY, 2)
        );
        
        if (distanceFromOrigin > 300) {
            Logger.log('[EnergyBullet] Destroyed by distance from origin:', distanceFromOrigin);
            this.destroy();
            return;
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo) {
            Logger.warn('[EnergyBullet] onCollision called with no collisionInfo');
            return;
        }
        
        if (!collisionInfo.other) {
            Logger.log('[EnergyBullet] Collision with tile at', this.x, this.y);
            this.destroy();
            return;
        }
        
        const otherClassName = collisionInfo.other.constructor.name;
        Logger.log('[EnergyBullet] Collision with', otherClassName, 'at', this.x, this.y);
        
        if (otherClassName === 'Enemy' || otherClassName === 'Slime' || 
            otherClassName === 'Bird' || otherClassName === 'Bat' || 
            otherClassName === 'Spider') {
            
            const enemy = collisionInfo.other as Entity & { takeDamage?: (damage: number) => void };
            if (enemy.takeDamage && typeof enemy.takeDamage === 'function') {
                enemy.takeDamage(this.damage);
                Logger.log('[EnergyBullet] Hit enemy:', otherClassName);
            }
            this.destroy();
        }
        else if (otherClassName === 'Platform' || otherClassName === 'Wall') {
            this.destroy();
        }
    }

    destroy(): void {
        if (this.destroyed) return;
        
        this.destroyed = true;
        this.visible = false;
        
        if (this.physicsSystem) {
            this.physicsSystem.removeEntity(this);
        }
        
        Logger.log('[EnergyBullet] Destroyed at position:', this.x, this.y, 'lifetime:', this.lifeTime);
    }
    
    isDestroyed(): boolean {
        return this.destroyed;
    }

    /**
     * Initialize this bullet in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        Logger.log('[EnergyBullet] Initializing in EntityManager');
        manager.addProjectile(this);
        const physicsSystem = manager.getPhysicsSystem();
        if (physicsSystem) {
            Logger.log('[EnergyBullet] Adding to physics system');
            physicsSystem.addEntity(this, physicsSystem.layers.PROJECTILE || physicsSystem.layers.DEFAULT);
        } else {
            Logger.warn('[EnergyBullet] No physics system available');
        }
    }
    
    /**
     * Get animation definitions for energy bullet
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['projectiles/energy_bullet.json'],
                frameDuration: 0,
                loop: false
            }
        ];
    }
    
    /**
     * Get palette definition for energy bullet
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x01,
                    0x52,
                    0x51
                ]
            }
        };
    }
}