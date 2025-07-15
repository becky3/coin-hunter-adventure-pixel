import { Entity, CollisionInfo } from '../Entity';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Player } from '../Player';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';

/**
 * Base class for all power-up items
 */
export abstract class PowerUpItem extends Entity implements EntityInitializer {
    protected collected: boolean;
    protected powerUpType: PowerUpType;
    protected powerUpConfig: PowerUpConfig;
    protected floatOffset: number;
    protected floatSpeed: number;
    protected floatAmplitude: number;
    protected baseY: number;
    declare animationTime: number;

    constructor(x: number, y: number, width: number, height: number, powerUpType: PowerUpType) {
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = false;
        
        this.collected = false;
        this.powerUpType = powerUpType;
        
        this.floatOffset = 0;
        this.floatSpeed = 0.03;
        this.floatAmplitude = 0.15;
        this.baseY = y;
        this.animationTime = 0;
        
        this.powerUpConfig = this.createPowerUpConfig();
    }

    /**
     * Create the power-up configuration
     * Must be implemented by subclasses
     */
    protected abstract createPowerUpConfig(): PowerUpConfig;

    /**
     * Get the sprite name for this power-up
     * Must be implemented by subclasses
     */
    protected abstract getSpriteName(): string;

    onUpdate(deltaTime: number): void {
        if (this.collected) return;
        
        this.floatOffset += this.floatSpeed * deltaTime * 0.1;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude * 16;
        
        this.animationTime += deltaTime * 1000;
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible || this.collected) return;
        
        const spriteName = this.getSpriteName();
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite(spriteName)) {
            renderer.drawSprite(spriteName, this.x, this.y);
        } else {
            this.renderDefault(renderer);
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }

    renderDefault(renderer: PixelRenderer): void {
        const hue = this.animationTime * 0.1 % 360;
        const color = `hsl(${hue}, 100%, 50%)`;
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2.5;
        
        renderer.drawCircle(centerX, centerY, radius, color);
        
        renderer.drawCircle(centerX, centerY, radius + 2, color, false);
    }

    /**
     * Collect this power-up item
     */
    collect(player: Player): void {
        if (this.collected) return;
        
        const success = player.applyPowerUp(this.powerUpConfig);
        
        if (success) {
            this.collected = true;
            this.visible = false;
            this.active = false;
            this.onCollected(player);
            Logger.log(`[PowerUpItem] ${this.powerUpType} collected by player`);
        }
    }

    /**
     * Called when the item is collected
     * Can be overridden by subclasses
     */
    protected onCollected(_player: Player): void {
        // TODO: Play sound effect
    }

    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) {
            Logger.warn('[PowerUpItem] onCollision called with invalid collisionInfo');
            return;
        }
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.collected) {
            this.collect(collisionInfo.other as unknown as Player);
        }
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.collected = false;
        this.baseY = y;
        this.floatOffset = 0;
        this.animationTime = 0;
    }

    isCollected(): boolean {
        return this.collected;
    }

    getPowerUpType(): PowerUpType {
        return this.powerUpType;
    }

    /**
     * Initialize this power-up in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        manager.addItem(this);
    }
}