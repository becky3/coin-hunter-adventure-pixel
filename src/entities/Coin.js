/**
 * コインクラス
 * 収集可能なアイテム
 */
import { Entity } from './Entity';

export class Coin extends Entity {
    constructor(x, y) {
        super(x, y, 16, 16);
        
        this.gravity = false;
        
        this.physicsEnabled = false;
        
        this.solid = false;
        
        this.collected = false;
        
        this.animationTime = 0;
        this.flipX = false;
        
        this.floatOffset = 0;
        this.floatSpeed = 0.002;
        this.floatAmplitude = 2;
        this.baseY = y;
        
        this.scoreValue = 10;
    }
    
    /**
     * コインの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        if (this.collected) return;
        
        this.floatOffset += this.floatSpeed * deltaTime;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude;
        
        this.animationTime += deltaTime;
    }
    
    /**
     * コインの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible || this.collected) return;
        
        // TODO: アニメーション対応が必要
        const frameNumber = Math.floor(this.animationTime / 200) % 4 + 1;
        const spriteKey = `items/coin_spin${frameNumber}`;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite(spriteKey)) {
            renderer.drawSprite(spriteKey, this.x, this.y);
        } else {
            this.renderDefault(renderer);
        }
        
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }
    
    /**
     * コインを収集
     * @returns {number} 獲得スコア
     */
    collect() {
        if (this.collected) return 0;
        
        this.collected = true;
        this.visible = false;
        this.active = false;
        
        return this.scoreValue;
    }
    
    /**
     * プレイヤーとの衝突時の処理
     * @param {Entity} other - 衝突したエンティティ
     */
    onCollision(other) {
        if (other.constructor.name === 'Player' && !this.collected) {
            // TODO: コイン収集処理を実装
        }
    }
    
    /**
     * リセット処理
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    reset(x, y) {
        super.reset(x, y);
        this.collected = false;
        this.baseY = y;
        this.floatOffset = 0;
        this.animationTime = 0;
    }
}