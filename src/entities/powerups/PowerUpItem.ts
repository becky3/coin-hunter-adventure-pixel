import { Entity, CollisionInfo } from '../Entity';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { PowerUpType, PowerUpConfig } from '../../types/PowerUpTypes';
import { Player } from '../Player';
import { Logger } from '../../utils/Logger';
import { EntityInitializer } from '../../interfaces/EntityInitializer';
import { EntityManager } from '../../managers/EntityManager';
import { MusicSystem } from '../../audio/MusicSystem';
import { SpritePaletteIndex } from '../../utils/pixelArtPalette';
import type { BaseEntityConfig } from '../../config/ResourceConfig';

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
    protected musicSystem!: MusicSystem;

    constructor(x: number, y: number, config: BaseEntityConfig, powerUpType: PowerUpType, floatSpeed: number = 0.03, floatAmplitude: number = 0.15) {
        super(x, y, config);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = false;
        
        this.collected = false;
        this.powerUpType = powerUpType;
        
        this.floatOffset = 0;
        this.floatSpeed = floatSpeed;
        this.floatAmplitude = floatAmplitude;
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
    
    /**
     * Get the animation key for this power-up
     * Can be overridden by subclasses
     */
    protected getAnimationKey(): string {
        return `powerups/${this.powerUpType.toLowerCase()}`;
    }

    override onUpdate(deltaTime: number): void {
        if (this.collected) return;
        
        this.floatOffset += this.floatSpeed * deltaTime * 0.1;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude * 16;
        
        this.animationTime += deltaTime * 1000;
    }

    override render(renderer: PixelRenderer): void {
        if (!this.visible || this.collected) return;
        
        super.render(renderer);
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
        if (this.musicSystem) {
            this.musicSystem.playSEFromPattern('powerup');
        }
    }

    override onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) {
            Logger.warn('[PowerUpItem] onCollision called with invalid collisionInfo');
            return;
        }
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.collected) {
            this.collect(collisionInfo.other as unknown as Player);
        }
    }

    override reset(x: number, y: number): void {
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
        const musicSystem = manager.getMusicSystem();
        if (!musicSystem) {
            throw new Error('[PowerUpItem] MusicSystem not available in EntityManager');
        }
        this.musicSystem = musicSystem;
    }
    
    /**
     * Returns the sprite palette index for power-up items
     */
    protected getSpritePaletteIndex(): number {
        return SpritePaletteIndex.POWERUPS;
    }
}