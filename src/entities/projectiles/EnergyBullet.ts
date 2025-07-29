import { Entity, CollisionInfo } from '../Entity';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import { PowerGloveConfig } from '../../config/PowerGloveConfig';
import type { AnimationDefinition, EntityPaletteDefinition } from '../../types/animationTypes';
import type { BaseEntityConfig } from '../../config/ResourceConfig';
import { PhysicsLayer } from '../../physics/PhysicsSystem';

/**
 * Energy bullet projectile for ranged attacks
 */
export class EnergyBullet extends Entity implements EntityInitializer {
    private lifeTime: number;
    private maxLifeTime: number;
    private damage: number;
    declare animationTime: number;
    private destroyed: boolean = false;
    private originX: number;
    private originY: number;

    constructor(x: number, y: number, direction: number, speed: number) {
        const config: BaseEntityConfig = {
            physics: {
                width: PowerGloveConfig.bulletWidth,
                height: PowerGloveConfig.bulletHeight,
                physicsLayer: PhysicsLayer.PROJECTILE
            }
        };
        
        super(x, y, config);
        
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
        
        this.setAnimation('idle');
    }

    override onUpdate(deltaTime: number): void {
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

    override render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        super.render(renderer);
    }

    override onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo) {
            Logger.warn('[EnergyBullet] onCollision called with no collisionInfo');
            return;
        }
        
        if (!collisionInfo.other) {
            Logger.log('[EnergyBullet] Collision with tile at', this.x, this.y);
            this.destroy();
            return;
        }
        
        const other = collisionInfo.other as Entity & { takeDamage?: (damage: number, source?: string) => void };
        const otherClassName = other.constructor.name;
        Logger.log('[EnergyBullet] Collision with', otherClassName, 'at', this.x, this.y);
        
        if (other.isProjectileTarget && other.takeDamage && typeof other.takeDamage === 'function') {
            other.takeDamage(this.damage, 'projectile');
            Logger.log('[EnergyBullet] Hit projectile target:', otherClassName);
            this.destroy();
        }
        else if (otherClassName === 'Platform' || otherClassName === 'Wall') {
            this.destroy();
        }
    }

    override destroy(): void {
        if (this.destroyed) return;
        
        this.destroyed = true;
        this.visible = false;
        this.active = false;
        
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
    }
    
    /**
     * Get animation definitions for energy bullet
     */
    protected override getAnimationDefinitions(): AnimationDefinition[] {
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
    protected override getPaletteDefinition(): EntityPaletteDefinition {
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