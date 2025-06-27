/**
 * コインクラス
 * 収集可能なアイテム
 */
import { Entity } from './Entity.js';

export class Coin extends Entity {
    constructor(x, y) {
        // コインのサイズは仕様書通り30x30ピクセル
        super(x, y, 30, 30);
        
        // コインは重力の影響を受けない
        this.gravity = false;
        
        // 物理演算は不要
        this.physicsEnabled = false;
        
        // 他のエンティティと衝突しない（プレイヤーは通り抜ける）
        this.solid = false;
        
        // 収集可能フラグ
        this.collected = false;
        
        // アニメーション設定
        this.animationFrames = ['coin_spin1', 'coin_spin2', 'coin_spin3', 'coin_spin4'];
        this.currentFrame = 0;
        this.frameDuration = 150; // 各フレーム150ms
        this.frameTimer = 0;
        
        // 浮遊アニメーション
        this.floatOffset = 0;
        this.floatSpeed = 0.05;
        this.floatAmplitude = 3;
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
        
        // アニメーション更新
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length;
        }
        
        // 浮遊アニメーション
        this.floatOffset += this.floatSpeed * deltaTime;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmplitude;
    }
    
    /**
     * コインの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible || this.collected) return;
        
        // 現在のフレームのスプライトを描画
        const spriteName = this.animationFrames[this.currentFrame];
        const sprite = renderer.sprites[`items/${spriteName}`];
        
        if (sprite) {
            renderer.drawSprite(
                sprite,
                this.x,
                this.y,
                this.spriteScale || 4, // スケール4で描画
                false
            );
        } else {
            // スプライトがない場合はデフォルト描画
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
        this.currentFrame = 0;
        this.frameTimer = 0;
    }
}