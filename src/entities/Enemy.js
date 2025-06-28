/**
 * 敵キャラクターの基底クラス
 */
import { Entity } from './Entity';

export class Enemy extends Entity {
    constructor(x, y, width = 16, height = 16) {
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
        
        this.gravityScale = 1.0;
        this.canJump = false;
    }
    
    /**
     * 更新処理
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    update(deltaTime) {
        if (!this.active) return;
        
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }
        
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;
        }
        
        this.updateAI(deltaTime);
        
        super.update(deltaTime);
    }
    
    /**
     * AI更新処理（子クラスでオーバーライド）
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateAI() {
    }
    
    /**
     * ダメージを受ける
     * @param {number} amount - ダメージ量
     * @param {Object} source - ダメージソース
     */
    takeDamage(amount, source = null) {
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
    
    /**
     * 死亡処理
     */
    die() {
        this.state = 'dead';
        this.active = false;
        
        this.onDeath();
    }
    
    /**
     * 死亡時の処理（子クラスでオーバーライド）
     */
    onDeath() {
    }
    
    /**
     * プレイヤーとの衝突処理
     * @param {Player} player - プレイヤー
     */
    onCollisionWithPlayer(player) {
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
        } else {
            if (player.takeDamage) {
                player.takeDamage(this.damage);
            }
        }
    }
    
    /**
     * 壁との衝突処理
     */
    onCollisionWithWall() {
        this.direction *= -1;
        this.facingRight = !this.facingRight;
    }
    
    /**
     * 衝突ハンドラ（PhysicsSystemから呼ばれる）
     * @param {Object} collisionInfo - 衝突情報
     */
    onCollision(collisionInfo) {
        if (collisionInfo.other.constructor.name === 'Player') {
            this.onCollisionWithPlayer(collisionInfo.other);
        }
    }
    
    /**
     * 崖の検知
     * @returns {boolean} 崖があるかどうか
     */
    checkCliff() {
        // TODO: PhysicsSystemと連携して実装
        return false;
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        if (!this.active) return;
        
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        super.render(renderer);
    }
    
    /**
     * デバッグ情報の描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderDebug(renderer) {
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