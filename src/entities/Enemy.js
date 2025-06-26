/**
 * 敵キャラクターの基底クラス
 */
import { Entity } from './Entity.js';

export class Enemy extends Entity {
    constructor(x, y, width = 16, height = 16) {
        super(x, y, width, height);
        
        // 敵の基本パラメータ
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.damage = 1;  // プレイヤーに与えるダメージ
        this.moveSpeed = 30;  // 移動速度
        this.direction = 1;  // 1: 右, -1: 左
        
        // AI関連
        this.aiType = 'patrol';  // 'patrol', 'chase', 'idle'など
        this.detectRange = 100;  // プレイヤー検知範囲
        this.attackRange = 20;   // 攻撃範囲
        
        // 状態管理
        this.state = 'idle';  // 'idle', 'moving', 'attacking', 'hurt', 'dead'
        this.stateTimer = 0;
        this.invincibleTime = 0;  // 無敵時間
        
        // アニメーション
        this.animState = 'idle';
        this.facingRight = true;
        
        // 物理パラメータ
        this.gravityScale = 1.0;
        this.canJump = false;
    }
    
    /**
     * 更新処理
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // 無敵時間の更新
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }
        
        // 状態タイマーの更新
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;
        }
        
        // AI更新
        this.updateAI(deltaTime);
        
        // 基底クラスの更新（アニメーションなど）
        super.update(deltaTime);
    }
    
    /**
     * AI更新処理（子クラスでオーバーライド）
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateAI() {
        // 子クラスで実装
        // deltaTimeは必要に応じて子クラスで引数を追加
    }
    
    /**
     * ダメージを受ける
     * @param {number} amount - ダメージ量
     * @param {Object} source - ダメージソース
     */
    takeDamage(amount, source = null) {
        // 無敵時間中はダメージを受けない
        if (this.invincibleTime > 0) return;
        
        this.health -= amount;
        this.invincibleTime = 1000;  // 1秒の無敵時間
        
        if (this.health <= 0) {
            this.die();
        } else {
            this.state = 'hurt';
            this.stateTimer = 300;  // 0.3秒のひるみ
            
            // ノックバック
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
        
        // 死亡エフェクトやアイテムドロップなど
        this.onDeath();
    }
    
    /**
     * 死亡時の処理（子クラスでオーバーライド）
     */
    onDeath() {
        // 子クラスで実装（エフェクト、アイテムドロップなど）
    }
    
    /**
     * プレイヤーとの衝突処理
     * @param {Player} player - プレイヤー
     */
    onCollisionWithPlayer(player) {
        // プレイヤーが上から踏んでいる場合
        if (player.vy > 0 && player.y < this.y) {
            // 敵がダメージを受ける
            this.takeDamage(1, player);
            // プレイヤーはバウンド
            player.vy = -200;
        } else {
            // プレイヤーがダメージを受ける
            if (player.takeDamage) {
                player.takeDamage(this.damage);
            }
        }
    }
    
    /**
     * 壁との衝突処理
     */
    onCollisionWithWall() {
        // 方向転換
        this.direction *= -1;
        this.facingRight = !this.facingRight;
    }
    
    /**
     * 衝突ハンドラ（PhysicsSystemから呼ばれる）
     * @param {Object} collisionInfo - 衝突情報
     */
    onCollision(collisionInfo) {
        // プレイヤーとの衝突
        if (collisionInfo.other.constructor.name === 'Player') {
            this.onCollisionWithPlayer(collisionInfo.other);
        }
    }
    
    /**
     * 崖の検知
     * @returns {boolean} 崖があるかどうか
     */
    checkCliff() {
        // PhysicsSystemのレイキャストを使用して足元をチェック
        // TODO: PhysicsSystemと連携して実装
        return false;
    }
    
    /**
     * 描画処理
     * @param {PixelRenderer} renderer - レンダラー
     */
    render(renderer) {
        if (!this.active) return;
        
        // 無敵時間中は点滅
        if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2 === 0) {
            return;
        }
        
        // 基底クラスの描画処理
        super.render(renderer);
    }
    
    /**
     * デバッグ情報の描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderDebug(renderer) {
        super.renderDebug(renderer);
        
        // HPバー
        const barWidth = 20;
        const barHeight = 2;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 8;
        
        // 背景
        renderer.drawRect(barX, barY, barWidth, barHeight, '#000000');
        
        // HP
        const hpWidth = (this.health / this.maxHealth) * barWidth;
        renderer.drawRect(barX, barY, hpWidth, barHeight, '#FF0000');
    }
}