
import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';
import type { BaseEntityConfig } from '../config/ResourceConfig';
import type { AnimationDefinition, EntityPaletteDefinition } from '../types/animationTypes';
import { ENEMY_HP_PALETTE } from '../rendering/CommonPalettes';
export type EnemyState = 'idle' | 'walk' | 'hurt' | 'dead';

/**
 * Base enemy entity class
 */
export class Enemy extends Entity {
    public maxHealth: number;
    public health: number;
    public damage: number;
    public moveSpeed: number;
    public direction: number;
    public detectRange: number;
    public attackRange: number;
    public state: EnemyState;
    public stateTimer: number;
    public invincibleTime: number;
    public animState: string;
    public facingRight: boolean;
    public canJump: boolean;
    public stompBounceVelocity: number;

    constructor(x: number, y: number, config: BaseEntityConfig) {
        super(x, y, config);
        
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.damage = 1;
        this.moveSpeed = 30;
        this.direction = 1;
        
        this.isProjectileTarget = true;
        
        this.detectRange = 100;
        this.attackRange = 20;
        
        this.state = 'idle';
        this.stateTimer = 0;
        this.invincibleTime = 0;
        
        this.animState = 'idle';
        this.facingRight = true;
        
        this.canJump = false;
        
        this.stompBounceVelocity = -5;
        
        this.eventBus = null;
        
        if (this.constructor.name === 'Slime') {
            Logger.log('Enemy', `Created at x=${x}, y=${y}`);
        }
    }
    

    override update(deltaTime: number): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            const wasInvincible = this.invincibleTime > 0;
            this.invincibleTime -= deltaTime * 1000;
            
            if (wasInvincible && this.invincibleTime <= 0 && this.eventBus) {
                this.eventBus.emit('enemy:invincible-end', {
                    enemy: this
                });
            }
        }
        
        if (this.stateTimer > 0 && this.shouldUpdateStateTimer()) {
            this.stateTimer -= deltaTime * 1000;
        }
        
        this.updateAI(deltaTime);
        
        this.updateAnimation(deltaTime);
        this.onUpdate(deltaTime);
        
        super.update(deltaTime);
    }

    protected updateAI(_deltaTime: number): void {

    }

    /**
     * Override this method to control state timer updates
     */
    protected shouldUpdateStateTimer(): boolean {
        return true;
    }

    takeDamage(amount: number): void {
        if (this.invincibleTime > 0) return;
        
        this.health -= amount;
        this.invincibleTime = 1000;
        
        if (this.health <= 0) {
            this.die();
        } else {
            this.state = 'hurt';
            this.stateTimer = 300;
            
            if (this.eventBus) {
                this.eventBus.emit('enemy:damaged', {
                    enemy: this,
                    damage: amount,
                    position: { x: this.x, y: this.y }
                });
                
                this.eventBus.emit('enemy:invincible-start', {
                    enemy: this,
                    duration: this.invincibleTime
                });
            }
        }
    }

    die(): void {
        this.state = 'dead';
        this.active = false;
        
        this.onDeath();
    }

    protected onDeath(): void {

    }

    /**
     * Returns whether this enemy can be defeated by stomping
     */
    canBeStomped(): boolean {
        return true;
    }

    onCollisionWithPlayer(player: Player): void {
        Logger.log('[Enemy] onCollisionWithPlayer called');
        Logger.log(`  - Enemy state: ${this.state}`);
        Logger.log(`  - Player invulnerable: ${player.invulnerable}`);
        
        if (this.state === 'dead' || player.invulnerable) {
            Logger.log('[Enemy] Skipping damage - enemy dead or player invulnerable');
            return;
        }
        
        const enemyCenter = this.y + this.height / 2;
        
        const playerCenter = player.y + player.height / 2;
        const isAboveEnemy = playerCenter < enemyCenter;
        const isFalling = player.vy > 0;
        const wasJustBounced = player.vy < 0;
        
        Logger.log('[Enemy] Collision details:');
        Logger.log(`  - Player center Y: ${playerCenter}, Enemy center Y: ${enemyCenter}`);
        Logger.log(`  - Is player above: ${isAboveEnemy}`);
        Logger.log(`  - Player vy: ${player.vy} (falling: ${isFalling})`);
        
        if (isAboveEnemy && (isFalling || wasJustBounced)) {
            const playerLeft = player.x;
            const playerRight = player.x + player.width;
            const enemyLeft = this.x;
            const enemyRight = this.x + this.width;
            const hasHorizontalOverlap = playerRight > enemyLeft && playerLeft < enemyRight;
            
            if (!hasHorizontalOverlap) return;
            
            if (this.canBeStomped()) {
                Logger.log('[Enemy] Player stomped enemy!');
                this.takeDamage(1);
                const scoreGained = 100;
                player.addScore(scoreGained);
                
                if (this.eventBus) {
                    this.eventBus.emit('enemy:defeated', {
                        enemy: this,
                        score: scoreGained,
                        position: { x: this.x, y: this.y }
                    });
                }
            }
            
            player.vy = this.stompBounceVelocity;
            player.grounded = false;
            return;
        } else {
            Logger.log('[Enemy] Player taking damage from enemy');
            if (player.takeDamage) {
                player.takeDamage();
            }
        }
    }

    onCollisionWithWall(): void {
        this.direction *= -1;
        this.facingRight = !this.facingRight;
    }

    override onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) return;
        
        Logger.log('[Enemy] onCollision called');
        Logger.log(`  - Other entity: ${collisionInfo.other.constructor.name}`);
        Logger.log(`  - Has takeDamage: ${'takeDamage' in collisionInfo.other}`);
        Logger.log(`  - Has jumpPower: ${'jumpPower' in collisionInfo.other}`);
        
        if ('takeDamage' in collisionInfo.other && 'jumpPower' in collisionInfo.other) {
            Logger.log('[Enemy] Detected collision with Player, calling onCollisionWithPlayer');
            this.onCollisionWithPlayer(collisionInfo.other as unknown as Player);
        }
    }


    override render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        super.render(renderer);
    }

    override renderDebug(renderer: PixelRenderer): void {
        super.renderDebug(renderer);
        
        const barWidth = 20;
        const barHeight = 2;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 8;
        
        const borderColor = ENEMY_HP_PALETTE.default.colors[1];
        const hpColor = ENEMY_HP_PALETTE.default.colors[2];
        
        if (borderColor !== null) {
            renderer.drawRect(barX, barY, barWidth, barHeight, borderColor);
        }
        
        const hpWidth = (this.health / this.maxHealth) * barWidth;
        if (hpColor !== null) {
            renderer.drawRect(barX, barY, hpWidth, barHeight, hpColor);
        }
    }
    
    /**
     * Get animation definitions for enemy
     * Override in derived classes for specific enemy animations
     */
    protected getAnimationDefinitions(): AnimationDefinition[] {
        return [];
    }
    
    /**
     * Get palette definition for enemy
     * Override in derived classes for specific enemy palettes
     */
    protected getPaletteDefinition(): EntityPaletteDefinition {
        return {
            default: {
                colors: [
                    null,
                    0x00,
                    0x10,
                    0x30
                ]
            }
        };
    }
}