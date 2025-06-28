/**
 * コインクラス
 * 収集可能なアイテム
 */
import { Entity } from './Entity.js';

export class Coin extends Entity {
    constructor(x, y) {
        // コインのサイズは16x16ピクセル（統一サイズ）
        super(x, y, 16, 16);
        
        // コインは重力の影響を受けない
        this.gravity = false;
        
        // 物理演算は不要
        this.physicsEnabled = false;
        
        // 他のエンティティと衝突しない（プレイヤーは通り抜ける）
        this.solid = false;
        
        // 収集可能フラグ
        this.collected = false;
        
        // アニメーション時間
        this.animationTime = 0;
        this.flipX = false;
        
        // 浮遊アニメーション（速度を遅く調整）
        this.floatOffset = 0;
        this.floatSpeed = 0.002; // 0.05から0.002に減速（約25分の1）
        this.floatAmplitude = 2; // 振幅も少し小さく
        this.baseY = y;
        
        // スコア値
        this.scoreValue = 10;
    }
    
    /**
     * コインの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        if (this.collected) return;
        
        // 浮遊アニメーション
        this.floatOffset += this.floatSpeed * deltaTime;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude;
        
        // アニメーション時間を更新
        this.animationTime += deltaTime;
    }
    
    /**
     * コインの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible || this.collected) return;
        
        // コインのスプライトを描画
        // TODO: アニメーション対応が必要
        const frameNumber = Math.floor(this.animationTime / 200) % 4 + 1;
        const spriteKey = `items/coin_spin${frameNumber}`;
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite(spriteKey)) {
            // スプライトを描画
            renderer.drawSprite(spriteKey, this.x, this.y);
        } else {
            // フォールバック描画
            this.renderDefault(renderer);
        }
        
        // デバッグ描画
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
        // プレイヤーとの衝突時のみ処理
        if (other.constructor.name === 'Player' && !this.collected) {
            // コイン収集処理はPlayStateで行う
            // ここでは衝突の通知のみ
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