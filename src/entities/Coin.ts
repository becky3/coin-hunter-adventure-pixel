
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';
import { Logger } from '../utils/Logger';
import { EntityInitializer } from '../interfaces/EntityInitializer';
import { EntityManager } from '../managers/EntityManager';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';

const FLOAT_SPEED_MULTIPLIER = 0.1;
const PIXELS_PER_UNIT = 16;

/**
 * Collectible coin item
 */
export class Coin extends Entity implements EntityInitializer {
    private collected: boolean;
    declare animationTime: number;
    private floatOffset: number;
    private floatSpeed: number;
    private floatAmplitude: number;
    private baseY: number;
    public scoreValue: number;

    /**
     * Factory method to create a Coin instance
     */
    static create(x: number, y: number): Coin {
        return new Coin(x, y);
    }

    constructor(x: number, y: number) {
        let coinConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            coinConfig = resourceLoader.getObjectConfig('items', 'coin');
        } catch (error) {
            Logger.warn('Failed to load coin config:', error);
        }
        
        const width = coinConfig?.physics.width || 16;
        const height = coinConfig?.physics.height || 16;
        
        super(x, y, width, height);
        
        this.gravity = false;
        this.physicsEnabled = false;
        this.solid = coinConfig?.physics.solid || false;
        
        this.collected = false;
        this.animationTime = 0;
        this.flipX = false;
        
        this.floatOffset = 0;
        this.floatSpeed = coinConfig?.properties.floatSpeed || 0.03;
        this.floatAmplitude = coinConfig?.properties.floatAmplitude || 0.1;
        this.baseY = y;
        
        this.scoreValue = coinConfig?.properties.scoreValue || 10;
        
        this.setAnimation('idle');
    }

    onUpdate(deltaTime: number): void {
        if (this.collected) return;
        
        this.floatOffset += this.floatSpeed * deltaTime * FLOAT_SPEED_MULTIPLIER;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude * PIXELS_PER_UNIT;
        
        this.animationTime += deltaTime * 1000;
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible || this.collected) return;
        
        super.render(renderer);
    }
    
    public isCollected(): boolean {
        return this.collected;
    }

    collect(): number {
        if (this.collected) return 0;
        
        this.collected = true;
        this.visible = false;
        this.active = false;
        
        return this.scoreValue;
    }

    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) {
            Logger.warn('[Coin] onCollision called with invalid collisionInfo:', collisionInfo);
            return;
        }
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.collected) {
            void 0;
        }
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.collected = false;
        this.baseY = y;
        this.floatOffset = 0;
        this.animationTime = 0;
    }
    
    /**
     * Initialize this coin in the EntityManager
     */
    initializeInManager(manager: EntityManager): void {
        manager.addItem(this);
    }
    
    /**
     * Get animation definitions for coin
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [
            {
                id: 'idle',
                sprites: ['items/coin_spin1.json', 'items/coin_spin3.json', 'items/coin_spin4.json', 'items/coin_spin3.json'],
                frameDuration: 150,
                loop: true
            }
        ];
    }
    
    /**
     * Get palette definition for coin
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x01,
                    0x52,
                    0x53
                ]
            }
        };
    }
}