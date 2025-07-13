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
        this.waveAmplitude = 30;
        this.initialY = y;
        this.flyTime = 0;
        this.baseSpeed = 40;
        
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
                    Logger.log('[Bat] Player detected, starting flight');
                }
            }
        } else if (this.batState === 'flying') {
            this.flyTime += deltaTime;
            
            this.vx = this.baseSpeed * this.direction;
            
            const waveOffset = Math.sin(this.flyTime * this.waveSpeed) * this.waveAmplitude;
            const targetY = this.initialY + waveOffset;
            this.vy = (targetY - this.y) * 2;
            
            this.animState = 'fly';
        }
    }
    
    private findPlayer(): Entity | null {
        if (!this.eventBus) return null;
        
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
            
            let animationKey = '';
            if (this.batState === 'hanging') {
                animationKey = 'enemies/bat_hang';
            } else {
                const frameIndex = Math.floor(Date.now() / 150) % 2;
                animationKey = `enemies/bat_fly${frameIndex + 1}`;
            }
            
            const animation = renderer.pixelArtRenderer.animations.get(animationKey);
            
            if (animation) {
                animation.update(Date.now());
                animation.draw(
                    renderer.ctx,
                    screenPos.x,
                    screenPos.y,
                    this.direction === -1,
                    renderer.scale
                );
                return;
            }
        }
        
        super.render(renderer);
    }
}