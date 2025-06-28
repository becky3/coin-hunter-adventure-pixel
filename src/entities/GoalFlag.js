/**
 * ゴールフラグクラス
 * ステージクリアのトリガー
 */
import { Entity } from './Entity.js';

export class GoalFlag extends Entity {
    constructor(x, y) {
        // ゴールフラグのサイズは16x16ピクセル
        super(x, y, 16, 16);
        
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
        
        // ゴールフラグのスプライトを描画
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/goal_flag')) {
            // 旗のなびき効果を追加
            const wave = !this.cleared ? Math.sin(this.waveOffset) * this.waveAmplitude : 0;
            
            // スプライトを描画（既にスケール済みなので追加スケールなし）
            renderer.drawSprite('terrain/goal_flag', this.x + wave, this.y);
            
            // クリア時のエフェクト
            if (this.cleared) {
                const screenPos = renderer.worldToScreen(this.x, this.y);
                this.renderClearEffect(renderer, screenPos);
            }
        } else {
            // デフォルト描画（黄色の旗）
            renderer.drawRect(this.x, this.y, this.width, this.height, '#FFD700');
            
            // ポール
            renderer.drawRect(this.x + 10, this.y, 10, this.height, '#8B4513');
            
            // 旗
            const flagWidth = 20;
            const flagHeight = 15;
            renderer.drawRect(this.x + 20, this.y + 5, flagWidth, flagHeight, '#FF0000');
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