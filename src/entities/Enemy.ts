
import { Entity, CollisionInfo } from './Entity';
import { Player } from './Player';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';

export type AIType = 'patrol' | 'chase' | 'idle';
export type EnemyState = 'idle' | 'hurt' | 'dead';

export class Enemy extends Entity {
    public maxHealth: number;
    public health: number;
    public damage: number;
    public moveSpeed: number;
    public direction: number;
    public aiType: AIType;
    public detectRange: number;
    public attackRange: number;
    public state: EnemyState;
    public stateTimer: number;
    public invincibleTime: number;
    public animState: string;
    public facingRight: boolean;
    public canJump: boolean;
    protected eventBus: any; // EventBus instance

    constructor(x: number, y: number, width: number = 16, height: number = 16) {
        super(x, y, width, height);
        
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.damage = 1;
        this.moveSpeed = 30;
        this.direction = 1;
        
        this.aiType = 'patrol';
        this.detectRange = 100;
        this.attackRange = 20;
        
        this.state = 'idle';
        this.stateTimer = 0;
        this.invincibleTime = 0;
        
        this.animState = 'idle';
        this.facingRight = true;
        
        this.canJump = false;
        
        // Debug: Log initial position
        if (this.constructor.name === 'Slime') {
            Logger.log('Enemy', `Created at x=${x}, y=${y}`);
        }
    }
    
    setEventBus(eventBus: any): void {
        this.eventBus = eventBus;
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
        
        super.update(deltaTime);
    }

    protected updateAI(_deltaTime: number): void {

    }

    takeDamage(amount: number, source: { x?: number; y?: number } | null = null): void {
        if (this.invincibleTime > 0) return;
        
        this.health -= amount;
        this.invincibleTime = 1000;
        
        if (this.health <= 0) {
            this.die();
        } else {
            this.state = 'hurt';
            this.stateTimer = 300;
            
            if (source && source.x !== undefined) {
                const knockbackDirection = this.x > source.x ? 1 : -1;
                this.vx = knockbackDirection * 100;
                this.vy = -100;
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

    onCollisionWithPlayer(player: Player): void {
        if (this.state === 'dead' || !this.active || player.invulnerable) return;
        
        const playerBottom = player.y + player.height;
        const playerPrevBottom = player.y + player.height - player.vy;
        const enemyTop = this.y;
        
        const wasAbove = playerPrevBottom <= enemyTop + 4;
        const isNowColliding = playerBottom >= enemyTop;
        const isFalling = player.vy >= 0;
        
        if (wasAbove && isNowColliding && isFalling) {
            this.takeDamage(1, player);
            player.vy = -5;
            // 敵を踏み潰した時のスコア加算とイベント発行
            const scoreGained = 100;
            player.addScore(scoreGained);
            
            if (this.eventBus) {
                this.eventBus.emit('enemy:defeated', {
                    enemy: this,
                    score: scoreGained,
                    position: { x: this.x, y: this.y }
                });
            }
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
        
        if (collisionInfo.other.constructor.name === 'Player') {
            this.onCollisionWithPlayer(collisionInfo.other as unknown as Player);
        }
    }

    checkCliff(): boolean {
        // TODO: PhysicsSystemと連携して実装
        return false;
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
        
        renderer.drawRect(barX, barY, barWidth, barHeight, '#000000');
        
        const hpWidth = (this.health / this.maxHealth) * barWidth;
        renderer.drawRect(barX, barY, hpWidth, barHeight, '#FF0000');
    }
}