
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';

// Constants for animation calculations
// Multiplier to adjust float speed relative to deltaTime
const FLOAT_SPEED_MULTIPLIER = 0.1;
// Conversion factor from amplitude units to pixels
const PIXELS_PER_UNIT = 16;

/**
 * Collectible coin item
 */
export class Coin extends Entity {
    private collected: boolean;
    declare animationTime: number;
    private floatOffset: number;
    private floatSpeed: number;
    private floatAmplitude: number;
    private baseY: number;
    public scoreValue: number;

    constructor(x: number, y: number) {
        // Load config from ResourceLoader if available
        let coinConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            coinConfig = resourceLoader.getObjectConfig('items', 'coin');
        } catch {
            // ResourceLoader not initialized yet, use defaults
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
    }

    onUpdate(deltaTime: number): void {
        if (this.collected) return;
        
        this.floatOffset += this.floatSpeed * deltaTime * FLOAT_SPEED_MULTIPLIER;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude * PIXELS_PER_UNIT;
        
        this.animationTime += deltaTime * 1000;
    }

    render(renderer: PixelRenderer): void {
        if (!this.visible || this.collected) return;
        
        if (renderer.pixelArtRenderer) {
            const animation = renderer.pixelArtRenderer.animations.get('items/coin_spin');
            if (animation) {
                const screenPos = renderer.worldToScreen(this.x, this.y);
                animation.update(Date.now());
                animation.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    false,
                    renderer.scale
                );
                
                if (renderer.debug) {
                    this.renderDebug(renderer);
                }
                return;
            }
        }
        
        this.renderDefault(renderer);
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
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
        if (!collisionInfo || !collisionInfo.other) return;
        
        if (collisionInfo.other.constructor.name === 'Player' && !this.collected) {
            // コイン収集処理はEntityManagerで実装されている
        }
    }

    reset(x: number, y: number): void {
        super.reset(x, y);
        this.collected = false;
        this.baseY = y;
        this.floatOffset = 0;
        this.animationTime = 0;
    }
}