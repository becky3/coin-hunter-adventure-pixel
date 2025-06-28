/**
 * ゴールフラグクラス
 * ステージクリアのトリガー
 */
import { Entity } from './Entity.js';

export class GoalFlag extends Entity {
    constructor(x, y) {
        // ゴールフラグのサイズは32x32ピクセル（地面に設置）
        super(x, y, 32, 32);
        
        // ゴールフラグは重力の影響を受けない
        this.gravity = false;
        
        // 物理演算は不要
        this.physicsEnabled = false;
        
        // 他のエンティティと衝突しない（プレイヤーは通り抜ける）
        this.solid = false;
        
        // クリアフラグ
        this.cleared = false;
        
        // アニメーション
        this.animationTime = 0;
        this.waveOffset = 0;
        this.waveSpeed = 0.003; // 旗のなびき速度
        this.waveAmplitude = 5; // 旗のなびき幅
    }
    
    /**
     * ゴールフラグの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        if (this.cleared) return;
        
        // 旗のなびきアニメーション
        this.waveOffset += this.waveSpeed * deltaTime;
        
        // アニメーション時間を更新
        this.animationTime += deltaTime;
    }
    
    /**
     * ゴールフラグの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        const screenPos = renderer.worldToScreen(this.x, this.y);
        
        // ゴールフラグのスプライトを描画
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/goal_flag')) {
            // スプライトのサイズ（16x16）を拡大して描画
            const scale = 2; // 16x16 -> 32x32
            
            renderer.ctx.save();
            
            // 旗のなびき効果を追加
            if (!this.cleared) {
                const wave = Math.sin(this.waveOffset) * this.waveAmplitude;
                renderer.ctx.translate(screenPos.x + wave, screenPos.y);
            } else {
                renderer.ctx.translate(screenPos.x, screenPos.y);
            }
            
            renderer.ctx.scale(scale, scale);
            renderer.drawSprite('terrain/goal_flag', 0, 0);
            
            renderer.ctx.restore();
            
            // クリア時のエフェクト
            if (this.cleared) {
                this.renderClearEffect(renderer, screenPos);
            }
        } else {
            // デフォルト描画（黄色の旗）
            renderer.ctx.fillStyle = '#FFD700';
            renderer.ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);
            
            // ポール
            renderer.ctx.fillStyle = '#8B4513';
            renderer.ctx.fillRect(screenPos.x + 10, screenPos.y, 10, this.height);
            
            // 旗
            renderer.ctx.fillStyle = '#FF0000';
            const flagWidth = 40;
            const flagHeight = 30;
            renderer.ctx.fillRect(screenPos.x + 20, screenPos.y + 10, flagWidth, flagHeight);
        }
        
        // デバッグ描画
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
        // 光のエフェクト
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
        // プレイヤーとの衝突時のみ処理
        if (other.constructor.name === 'Player' && !this.cleared) {
            // ゴール処理はPlayStateで行う
            // ここでは衝突の通知のみ
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