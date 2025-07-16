import { Entity, CollisionInfo } from '../Entity';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';

/**
 * Energy bullet projectile for ranged attacks
 */
export class EnergyBullet extends Entity implements EntityInitializer {
    private lifeTime: number;
    private maxLifeTime: number;
    private damage: number;
    private animationTime: number;

    constructor(x: number, y: number, direction: number, speed: number) {
        super(x, y, 8, 8);
        
        this.vx = direction * speed;
        this.vy = 0;
        
        this.gravity = false;
        this.physicsEnabled = true;
        this.solid = false;
        
        this.lifeTime = 0;
        this.maxLifeTime = 5000; // 5 seconds
        this.damage = 1;
        this.animationTime = 0;
        
        Logger.log('[EnergyBullet] Created at', x, y, 'direction:', direction);
    }

    onUpdate(deltaTime: number): void {
        this.lifeTime += deltaTime * 1000; // Convert to milliseconds
        this.animationTime += deltaTime * 1000;
        
        // Destroy if lifetime exceeded
        if (this.lifeTime >= this.maxLifeTime) {
            Logger.log('[EnergyBullet] Destroyed by timeout at', this.x, this.y);
            this.destroy();
            return;
        }
        
        // Destroy if too far off screen (1000 pixels from origin)
        if (Math.abs(this.x) > 1000 || Math.abs(this.y) > 1000) {
            Logger.log('[EnergyBullet] Destroyed by distance at', this.x, this.y);
            this.destroy();
            return;
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible) return;
        
        const spriteName = 'projectiles/energy_bullet';
        
        if (!renderer.assetLoader) {
            throw new Error('[EnergyBullet] AssetLoader is not available');
        }
        
        if (!renderer.assetLoader.hasSprite(spriteName)) {
            throw new Error(`[EnergyBullet] Sprite not found: ${spriteName}`);
        }
        
        renderer.drawSprite(spriteName, this.x, this.y);
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) {
            Logger.warn('[EnergyBullet] onCollision called with invalid collisionInfo');
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
        this.active = false;
        this.visible = false;
        Logger.log('[EnergyBullet] Destroyed at position:', this.x, this.y, 'lifetime:', this.lifeTime);
    }

    /**
     * Initialize this bullet in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        manager.addProjectile(this);
        const physicsSystem = manager.getPhysicsSystem();
        if (physicsSystem) {
            physicsSystem.addEntity(this, physicsSystem.layers.PROJECTILE || physicsSystem.layers.DEFAULT);
        }
    }
}