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
    private lastLogTime?: number;
    private lastUpdateCheck?: boolean;
    declare friction: number;
    private originalPhysicsEnabled: boolean = true;

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
        this.baseSpeed = 90;
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        this.physicsEnabled = false;
        
        if (batConfig?.ai) {
            this.aiType = (batConfig.ai.type as 'patrol' | 'chase' | 'idle') || 'patrol';
            this.attackRange = batConfig.ai.attackRange || 20;
        }
    }
    
    protected updateAI(deltaTime: number): void {
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }
        
        if (!this.lastUpdateCheck) {
            Logger.log(`[Bat] updateAI called, deltaTime=${deltaTime}`);
            this.lastUpdateCheck = true;
        }

        if (this.batState === 'hanging') {
            this.vx = 0;
            this.vy = 0;
            this.animState = 'hang';
            this.grounded = true;
            
            const player = this.findPlayer();
            if (player) {
                const xDistance = Math.abs(player.x - this.x);
                if (xDistance < this.detectionRange) {
                    this.batState = 'flying';
                    this.flyTime = 0;
                    this.direction = -1;
                    this.facingRight = false;
                    Logger.log(`[Bat] Player detected at X distance ${xDistance}, starting flight to the left`);
                }
            } else {
                if (!this.loggedNoPlayer) {
                    Logger.log('[Bat] No player found in findPlayer()');
                    this.loggedNoPlayer = true;
                }
            }
        } else if (this.batState === 'flying') {
            this.flyTime += deltaTime;
            
            this.vx = this.baseSpeed * this.direction;
            
            const flightDuration = 4;
            const progress = (this.flyTime % flightDuration) / flightDuration;
            
            let targetY;
            if (progress < 0.5) {
                const t = progress * 2;
                targetY = 16 + (144 * t);
            } else {
                const t = (progress - 0.5) * 2;
                targetY = 160 - (144 * t);
            }
            
            const yDiff = targetY - this.y;
            this.vy = yDiff * 5;
            
            const moveX = this.vx * deltaTime;
            const moveY = this.vy * deltaTime;
            
            this.x += moveX;
            this.y += moveY;
            
            this.x = Math.max(0, Math.min(this.x, 3000 - this.width));
            this.y = Math.max(0, Math.min(this.y, 300 - this.height));
            
            if (!this.lastLogTime || this.flyTime - this.lastLogTime > 0.5) {
                Logger.log(`[Bat] Flying: flyTime=${this.flyTime.toFixed(2)}, progress=${progress.toFixed(2)}, y=${this.y.toFixed(1)}, targetY=${targetY.toFixed(1)}, vy=${this.vy.toFixed(2)}, vx=${this.vx}`);
                this.lastLogTime = this.flyTime;
            }
            
            if (progress > 0.95 && this.y < 20) {
                this.batState = 'hanging';
                this.y = 16;
                this.vx = 0;
                this.vy = 0;
                this.flyTime = 0;
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

    update(deltaTime: number): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime * 1000;
        }
        
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime * 1000;
        }
        
        this.updateAI(deltaTime);
        
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
    }
    
    
    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        if (renderer.pixelArtRenderer) {
            const screenPos = renderer.worldToScreen(this.x, this.y);
            
            if (this.batState === 'hanging') {
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
                const frameIndex = Math.floor(Date.now() / 80) % 2;
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