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
        this.baseSpeed = 90;  // Pixels per second (1.5 * 60)
        
        this.friction = 1.0;
        this.gravityScale = 0;
        this.gravity = false;
        // Disable physics completely for bats
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
        
        // Debug: Check if update is being called
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
                // Check only X-axis distance for detection
                const xDistance = Math.abs(player.x - this.x);
                if (xDistance < this.detectionRange) {
                    this.batState = 'flying';
                    this.flyTime = 0;
                    // Always fly to the left
                    this.direction = -1;
                    this.facingRight = false;
                    Logger.log(`[Bat] Player detected at X distance ${xDistance}, starting flight to the left`);
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
            // Stronger vertical movement to ensure visible parabolic path
            this.vy = Math.max(-480, Math.min(480, yDiff * 30)); // Pixels per second
            
            // 物理システムに登録されていないので、ここで直接位置更新
            const dt = deltaTime / 1000;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            
            // 境界チェック
            this.x = Math.max(0, Math.min(this.x, 3000 - this.width));
            this.y = Math.max(0, Math.min(this.y, 300 - this.height));
            
            // Debug log every 0.5 seconds
            if (!this.lastLogTime || this.flyTime - this.lastLogTime > 0.5) {
                Logger.log(`[Bat] Flying: flyTime=${this.flyTime.toFixed(2)}, progress=${progress.toFixed(2)}, y=${this.y.toFixed(1)}, targetY=${targetY.toFixed(1)}, vy=${this.vy.toFixed(2)}`);
                this.lastLogTime = this.flyTime;
            }
            
            // If reached back to ceiling height and near a wall, return to hanging
            if (progress > 0.95 && this.y < 20) {
                this.batState = 'hanging';
                this.y = 16; // Snap to ceiling
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
        // Call parent update first
        super.update(deltaTime);
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