
import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';
import type { BaseEntityConfig } from '../config/ResourceConfig';
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
    

    update(deltaTime: number): void {
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
        
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime * 1000;
        }
        
        this.updateAI(deltaTime);
        
        super.update(deltaTime);
    }

    protected updateAI(_deltaTime: number): void {

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
        if (this.state === 'dead' || player.invulnerable) return;
        
        const enemyCenter = this.y + this.height / 2;
        
        const playerCenter = player.y + player.height / 2;
        const isAboveEnemy = playerCenter < enemyCenter;
        const isFalling = player.vy > 0;
        const wasJustBounced = player.vy < 0;
        
        
        if (isAboveEnemy && (isFalling || wasJustBounced)) {
            const playerLeft = player.x;
            const playerRight = player.x + player.width;
            const enemyLeft = this.x;
            const enemyRight = this.x + this.width;
            const hasHorizontalOverlap = playerRight > enemyLeft && playerLeft < enemyRight;
            
            if (!hasHorizontalOverlap) return;
            
            if (this.canBeStomped()) {
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
            if (player.takeDamage) {
                player.takeDamage();
            }
        }
    }

    onCollisionWithWall(): void {
        this.direction *= -1;
        this.facingRight = !this.facingRight;
    }

    onCollision(collisionInfo?: CollisionInfo): void {
        if (!collisionInfo || !collisionInfo.other) return;
        
        if ('takeDamage' in collisionInfo.other && 'jumpPower' in collisionInfo.other) {
            this.onCollisionWithPlayer(collisionInfo.other as unknown as Player);
        }
    }


    render(renderer: PixelRenderer): void {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        super.render(renderer);
    }

    renderDebug(renderer: PixelRenderer): void {
        super.renderDebug(renderer);
        
        const barWidth = 20;
        const barHeight = 2;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 8;
        
        renderer.drawRect(barX, barY, barWidth, barHeight, 0x00);
        
        const hpWidth = (this.health / this.maxHealth) * barWidth;
        renderer.drawRect(barX, barY, hpWidth, barHeight, 0x31);
    }
}