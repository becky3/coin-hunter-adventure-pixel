/**
 * ゴールフラグクラス
 * ステージクリアのトリガー
 */
import { Entity } from './Entity.js';

export class GoalFlag extends Entity {
    constructor(x, y) {
        super(x, y, 16, 16);
        
        this.gravity = false;
        
        this.physicsEnabled = false;
        
        this.solid = false;
        
        this.cleared = false;
        
        this.animationTime = 0;
        this.waveOffset = 0;
        this.waveSpeed = 0.003;
        this.waveAmplitude = 5;
    }
    
    /**
     * ゴールフラグの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        if (this.cleared) return;
        
        this.waveOffset += this.waveSpeed * deltaTime;
        
        this.animationTime += deltaTime;
    }
    
    /**
     * ゴールフラグの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/goal_flag')) {
            const wave = !this.cleared ? Math.sin(this.waveOffset) * this.waveAmplitude : 0;
            
            renderer.drawSprite('terrain/goal_flag', this.x + wave, this.y);
            
            if (this.cleared) {
                const screenPos = renderer.worldToScreen(this.x, this.y);
                this.renderClearEffect(renderer, screenPos);
            }
        } else {
            renderer.drawRect(this.x, this.y, this.width, this.height, '#FFD700');
            
            renderer.drawRect(this.x + 10, this.y, 10, this.height, '#8B4513');
            
            const flagWidth = 20;
            const flagHeight = 15;
            renderer.drawRect(this.x + 20, this.y + 5, flagWidth, flagHeight, '#FF0000');
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }
    
    /**
     * クリアエフェクトの描画
     * @param {PixelRenderer} renderer 
     * @param {Object} screenPos - スクリーン座標
     */
    renderClearEffect(renderer, screenPos) {
        const time = this.animationTime * 0.001;
        const radius = 30 + Math.sin(time * 2) * 10;
        
        renderer.ctx.save();
        renderer.ctx.globalAlpha = 0.5;
        renderer.ctx.fillStyle = '#FFFF00';
        renderer.ctx.beginPath();
        renderer.ctx.arc(
            screenPos.x + this.width / 2,
            screenPos.y + this.height / 2,
            radius,
            0,
            Math.PI * 2
        );
        renderer.ctx.fill();
        renderer.ctx.restore();
    }
    
    /**
     * プレイヤーとの衝突時の処理
     * @param {Entity} other - 衝突したエンティティ
     */
    onCollision(other) {
        if (other.constructor.name === 'Player' && !this.cleared) {
            return true;
        }
        return false;
    }
    
    /**
     * ゴールフラグをクリア状態にする
     */
    clear() {
        this.cleared = true;
    }
    
    /**
     * リセット処理
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    reset(x, y) {
        super.reset(x, y);
        this.cleared = false;
        this.waveOffset = 0;
        this.animationTime = 0;
    }
}