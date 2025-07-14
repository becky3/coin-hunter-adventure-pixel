import { Enemy } from '../Enemy';
import { PixelRenderer } from '../../rendering/PixelRenderer';
import { ResourceLoader } from '../../config/ResourceLoader';
import { Logger } from '../../utils/Logger';
import { Entity } from '../Entity';

type BatState = 'hanging' | 'flying';

/**
 * Bat enemy that hangs from ceiling and flies in sine wave pattern
 */
export class Bat extends Enemy {
    public spriteKey: string;
    private batState: BatState;
    private detectionRange: number;
    private waveSpeed: number;
    private waveAmplitude: number;
    private initialY: number;
    private flyTime: number;
    private baseSpeed: number;
    private loggedNoPlayer?: boolean;
    declare friction: number;

    constructor(x: number, y: number) {
        let batConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            batConfig = resourceLoader.getCharacterConfig('enemies', 'bat');
        } catch (error) {
            Logger.warn('Failed to load bat config, using defaults:', error);
        }
        
        const width = batConfig?.physics.width || 8;
        const height = batConfig?.physics.height || 8;
        
        super(x, y, width, height);
        
        this.maxHealth = batConfig?.stats.maxHealth || 1;
        this.health = this.maxHealth;
        this.damage = batConfig?.stats.damage || 1;
        this.moveSpeed = batConfig?.physics.moveSpeed || 0.5;
        
        this.spriteKey = 'enemies/bat';
        this.animState = 'hang';
        this.batState = 'hanging';
        
        this.detectionRange = batConfig?.ai?.detectRange || 80;
        this.waveSpeed = 2;
        this.waveAmplitude = 20;
        this.initialY = y;
        this.flyTime = 0;
        this.baseSpeed = 1.0;  // Slower horizontal speed for more natural movement
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        
        if (batConfig?.ai) {
            this.aiType = (batConfig.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.attackRange = batConfig.ai.attackRange || 20;
        }
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }

        if (this.batState === 'hanging') {
            this.vx = 0;
            this.vy = 0;
            this.animState = 'hang';
            this.grounded = true;
            
            const player = this.findPlayer();
            if (player) {
                const distance = this.distanceTo(player);
                if (distance < this.detectionRange) {
                    this.batState = 'flying';
                    this.flyTime = 0;
                    // Always fly to the left
                    this.direction = -1;
                    this.facingRight = false;
                    Logger.log(`[Bat] Player detected at distance ${distance}, starting flight to the left`);
                }
            } else {
                // Only log once to avoid spam
                if (!this.loggedNoPlayer) {
                    Logger.log('[Bat] No player found in findPlayer()');
                    this.loggedNoPlayer = true;
                }
            }
        } else if (this.batState === 'flying') {
            this.flyTime += deltaTime / 1000; // Convert to seconds
            
            // Fly to the left
            this.vx = this.baseSpeed * this.direction;
            
            // Create a parabolic path that goes down then back up
            // Start at ceiling (y=16), go down to near ground (y=160), then back to ceiling
            const flightDuration = 4; // seconds for complete flight
            const progress = (this.flyTime % flightDuration) / flightDuration;
            
            let targetY;
            if (progress < 0.5) {
                // Descending phase: from ceiling to near ground
                const t = progress * 2; // 0 to 1
                targetY = 16 + (144 * t); // From y=16 to y=160
            } else {
                // Ascending phase: from near ground back to ceiling
                const t = (progress - 0.5) * 2; // 0 to 1
                targetY = 160 - (144 * t); // From y=160 back to y=16
            }
            
            const yDiff = targetY - this.y;
            this.vy = Math.max(-5, Math.min(5, yDiff * 0.2));
            
            // If reached back to ceiling height and near a wall, return to hanging
            if (progress > 0.95 && this.y < 20) {
                this.batState = 'hanging';
                this.y = 16; // Snap to ceiling
                this.vx = 0;
                this.vy = 0;
                Logger.log('[Bat] Returned to hanging position');
            }
            
            this.animState = 'fly';
        }
    }
    
    private findPlayer(): Entity | null {
        if (!this.eventBus) {
            Logger.warn('[Bat] No eventBus available');
            return null;
        }
        
        const result = this.eventBus.emit('entity:findPlayer', {});
        if (result && Array.isArray(result) && result.length > 0) {
            return result[0] as Entity;
        }
        return null;
    }

    onCollisionWithWall(): void {
        if (this.batState === 'flying') {
            this.direction *= -1;
            this.facingRight = !this.facingRight;
        }
    }

    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            if (this.batState === 'hanging') {
                // Use sprite for hanging state (single frame)
                const sprite = renderer.pixelArtRenderer.sprites.get('enemies/bat_hang');
                if (sprite) {
                    sprite.draw(
                        renderer.ctx,
                        screenPos.x,
                        screenPos.y,
                        this.direction === -1,
                        renderer.scale
                    );
                    return;
                }
            } else {
                // Use sprites for flying animation with faster flapping
                const frameIndex = Math.floor(Date.now() / 80) % 2;  // 80ms per frame for faster flapping
                const spriteKey = `enemies/bat_fly${frameIndex + 1}`;
                const sprite = renderer.pixelArtRenderer.sprites.get(spriteKey);
                if (sprite) {
                    sprite.draw(
                        renderer.ctx,
                        screenPos.x,
                        screenPos.y,
                        this.direction === -1,
                        renderer.scale
                    );
                    return;
                }
            }
        }
        
        super.render(renderer);
    }
}