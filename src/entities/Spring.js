/**
 * スプリング（ばね）クラス
 * プレイヤーを高くジャンプさせるギミック
 */
import { Entity } from './Entity.js';

export class Spring extends Entity {
    constructor(x, y) {
        // スプリングのサイズは16x16ピクセル
        super(x, y, 16, 16);
        
        // スプリングは重力の影響を受けない
        this.gravity = false;
        
        // 物理演算は不要
        this.physicsEnabled = false;
        
        // 固体（プレイヤーは上から乗れる）
        this.solid = true;
        
        // スプリングの設定
        this.bouncePower = 12; // ジャンプ力（通常ジャンプの1.2倍）
        this.compression = 0; // 圧縮量（0-1）
        this.triggered = false; // 発動フラグ
        this.animationSpeed = 0.14; // アニメーション速度
        
        // アニメーション時間
        this.animationTime = 0;
    }
    
    /**
     * スプリングの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        // 圧縮アニメーション
        if (this.compression > 0) {
            this.compression *= 0.9;
            if (this.compression < 0.01) {
                this.compression = 0;
                this.triggered = false;
            }
        }
        
        // アニメーション時間を更新
        this.animationTime += deltaTime;
    }
    
    /**
     * スプリングの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        const screenPos = renderer.worldToScreen(this.x, this.y);
        
        // スプリングのスプライトを描画
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/spring')) {
            // 圧縮時は縦方向にスケール
            const compression = this.compression * 0.3; // 最大30%圧縮
            const scaleX = 1;
            const scaleY = 1 - compression;
            const offsetY = this.height * compression;
            
            renderer.ctx.save();
            renderer.ctx.translate(screenPos.x, screenPos.y + offsetY);
            renderer.ctx.scale(scaleX, scaleY);
            
            renderer.drawSprite('terrain/spring', 0, 0);
            
            renderer.ctx.restore();
        } else {
            // デフォルト描画（緑色の四角）
            renderer.ctx.fillStyle = this.compression > 0 ? '#00AA00' : '#00FF00';
            const height = this.height * (1 - this.compression * 0.3);
            const offsetY = this.height - height;
            renderer.ctx.fillRect(
                screenPos.x,
                screenPos.y + offsetY,
                this.width,
                height
            );
        }
        
        // デバッグ描画
        if (renderer.debug) {
            this.renderDebug(renderer);
        }
    }
    
    /**
     * プレイヤーとの衝突時の処理
     * @param {Object} collisionInfo - 衝突情報（PhysicsSystemから渡される）
     */
    onCollision(collisionInfo) {
        const other = collisionInfo.other;
        
        // プレイヤーとの衝突時のみ処理
        if (other && other.constructor.name === 'Player') {
            // 衝突の方向を判定（PhysicsSystemのside情報を使用）
            const fromTop = collisionInfo.side === 'top' || 
                          (other.y + other.height <= this.y + 5 && other.vy >= 0);
            
            // 上から接触している場合のみ発動
            if (fromTop && other.vy >= 0) {
                // 大ジャンプ
                other.vy = -this.bouncePower;
                other.grounded = false;
                
                // スプリング発動
                this.compression = 1;
                this.triggered = true;
                
                // 効果音の再生はPlayStateで行う
                return true; // 衝突処理済み
            }
        }
        return false;
    }
    
    /**
     * リセット処理
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    reset(x, y) {
        super.reset(x, y);
        this.compression = 0;
        this.triggered = false;
        this.animationTime = 0;
    }
}