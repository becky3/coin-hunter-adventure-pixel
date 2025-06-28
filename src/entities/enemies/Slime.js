/**
 * スライムの敵キャラクター
 */
import { Enemy } from '../Enemy.js';

export class Slime extends Enemy {
    constructor(x, y) {
        super(x, y, 16, 16);
        
        // スライムのパラメータ
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.damage = 1;
        this.moveSpeed = 0.5;  // ゆっくり移動（ピクセル/フレーム）
        
        // スライム固有の設定
        this.jumpHeight = 5;  // 小さくジャンプしながら移動
        this.jumpCooldown = 0;
        this.jumpInterval = 1000;  // 1秒ごとにジャンプ
        
        // スプライト設定
        this.spriteKey = 'slime';
        this.animState = 'idle';
        
        // 物理設定
        this.bounceHeight = 0.3;  // 弾む高さ
        this.friction = 0.8;
    }
    
    /**
     * AI更新処理
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateAI(deltaTime) {
        // 死亡中またはひるみ中は動かない
        if (this.state === 'dead' || this.state === 'hurt') {
            return;
        }
        
        // ジャンプクールダウンの更新
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
        
        // 移動とジャンプ
        if (this.grounded) {
            // 左右移動
            this.vx = this.moveSpeed * this.direction;
            
            // 定期的にジャンプ
            if (this.jumpCooldown <= 0) {
                this.jump();
                this.jumpCooldown = this.jumpInterval;
            }
            
            // アニメーション設定
            this.animState = 'move';
        } else {
            // 空中ではジャンプアニメーション
            this.animState = 'jump';
        }
        
        // 崖や壁の検知は現在無効化
        // TODO: PhysicsSystemのレイキャスト実装後に有効化
        // if (this.checkWallAhead() || this.checkCliffAhead()) {
        //     this.onCollisionWithWall();
        // }
    }
    
    /**
     * ジャンプ処理
     */
    jump() {
        if (this.grounded) {
            this.vy = -this.jumpHeight;
            this.grounded = false;
        }
    }
    
    /**
     * 前方の壁をチェック
     * @returns {boolean} 壁があるかどうか
     */
    checkWallAhead() {
        // TODO: PhysicsSystemのレイキャストを使用
        // 仮実装: 現在は常にfalseを返す
        return false;
    }
    
    /**
     * 前方の崖をチェック
     * @returns {boolean} 崖があるかどうか
     */
    checkCliffAhead() {
        // TODO: PhysicsSystemのレイキャストを使用
        // 仮実装: 現在は常にfalse
        return false;
    }
    
    /**
     * 地面との衝突処理
     */
    onGroundCollision() {
        super.onGroundCollision();
        
        // スライムは着地時に少し弾む
        // 注: この処理は現在無効化（物理システムとの競合を避けるため）
        // TODO: PhysicsSystemでバウンス処理を実装
    }
    
    /**
     * 死亡時の処理
     */
    onDeath() {
        // スライムが潰れるエフェクト
        console.log('Slime defeated!');
        
        // TODO: 死亡エフェクトの生成
        // TODO: アイテムドロップ（コインなど）
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
        
        // TODO: PixelArtRendererとの統合後にスプライト描画を実装
        
        renderer.drawRect(this.x, this.y, this.width, this.height, '#00FF00');
        
        renderer.drawRect(this.x + 4, this.y + 4, 2, 2, '#000000');
        renderer.drawRect(this.x + 10, this.y + 4, 2, 2, '#000000');
    }
}