
import { Entity, CollisionInfo } from './Entity';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { ResourceLoader } from '../config/ResourceLoader';

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
        const resourceLoader = ResourceLoader.getInstance();
        const coinConfig = resourceLoader.getObjectConfig('items', 'coin');
        
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
        
        this.floatOffset += this.floatSpeed * deltaTime * 0.1; // Adjust speed for the config values
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude * 16; // Convert amplitude to pixels
        
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
            // TODO: コイン収集処理を実装
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