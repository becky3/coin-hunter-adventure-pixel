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
        this.bouncePower = 14; // ジャンプ力（通常ジャンプの1.4倍）
        this.compression = 0; // 圧縮量（0-1）
        this.triggered = false; // 発動フラグ
        this.animationSpeed = 0.14; // アニメーション速度
        
        // アニメーション時間
        this.animationTime = 0;
        
        // PhysicsSystemへの参照（後で設定される）
        this.physicsSystem = null;
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
        
        // プレイヤーとの継続的な接触チェック
        this.checkPlayerContact();
        
        // プレイヤーがSpringから離れたらトリガーをリセット
        if (this.triggered && this.physicsSystem) {
            const entities = Array.from(this.physicsSystem.entities);
            const player = entities.find(e => e.constructor.name === 'Player');
            if (player) {
                const playerBottom = player.y + player.height;
                const notTouching = playerBottom < this.y - 5 || player.y > this.y + this.height;
                if (notTouching) {
                    this.triggered = false;
                    console.log('Spring trigger reset - player left');
                }
            }
        }
    }
    
    /**
     * プレイヤーとの接触をチェックして、必要ならジャンプさせる
     */
    checkPlayerContact() {
        
        // PhysicsSystemから全エンティティを取得
        if (!this.physicsSystem) return;
        
        // プレイヤーを探す
        const entities = Array.from(this.physicsSystem.entities);
        const player = entities.find(e => e.constructor.name === 'Player');
        if (!player) return;
        
        // 衝突判定
        const playerBounds = player.getBounds();
        const springBounds = this.getBounds();
        
        // AABBチェック
        const isColliding = playerBounds.left < springBounds.right &&
            playerBounds.right > springBounds.left &&
            playerBounds.top < springBounds.bottom &&
            playerBounds.bottom > springBounds.top;
            
        if (isColliding) {
            // プレイヤーがSpringの上部に乗っている（y座標で判定）
            const playerBottom = player.y + player.height;
            const onTopOfSpring = Math.abs(playerBottom - this.y) <= 2; // 上部2ピクセル以内
            
            // デバッグログ（最初の数回のみ）
            if (!this._debugCount) this._debugCount = 0;
            if (this._debugCount < 10 && player.grounded) {
                console.log(`Spring check: player.y=${player.y}, playerBottom=${playerBottom}, spring.y=${this.y}`);
                console.log(`  onTopOfSpring=${onTopOfSpring}, grounded=${player.grounded}, vy=${player.vy}, triggered=${this.triggered}`);
                console.log(`  embedded check: ${!onTopOfSpring} && ${playerBottom > this.y} && ${player.y < this.y + this.height}`);
                this._debugCount++;
            }
            
            if (onTopOfSpring && player.grounded && player.vy >= -0.1 && !this.triggered) {
                // プレイヤーをSpringの上部に正確に配置
                player.y = this.y - player.height;
                
                // 大ジャンプ
                player.vy = -this.bouncePower;
                player.grounded = false;
                
                // スプリング発動
                this.compression = 1;
                this.triggered = true;
                
                console.log('Spring activated from continuous check!');
                
                // 効果音の再生
                if (this.physicsSystem && this.physicsSystem.entities) {
                    // PlayStateを通じて音を再生（実装は省略）
                }
            } else if (!onTopOfSpring && playerBottom > this.y && player.y < this.y + this.height) {
                // プレイヤーがSpringに埋まっている場合
                // 接地状態なら深さに関わらずジャンプさせる
                if (player.grounded && !this.triggered) {
                    // 埋まり具合をログ
                    const penetration = playerBottom - this.y;
                    console.log(`Spring: Player embedded ${penetration}px, activating bounce`);
                    
                    player.y = this.y - player.height;
                    player.vy = -this.bouncePower;
                    player.grounded = false;
                    this.compression = 1;
                    this.triggered = true;
                    console.log('Spring activated after repositioning!');
                }
            }
        }
    }
    
    /**
     * スプリングの描画
     * @param {PixelRenderer} renderer 
     */
    render(renderer) {
        if (!this.visible) return;
        
        // スプリングのスプライトを描画
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/spring')) {
            // 圧縮時の描画位置調整
            const compression = this.compression * 0.3; // 最大30%圧縮
            const offsetY = this.height * compression;
            
            // スプライトを描画（圧縮時はY位置を下げる）
            renderer.drawSprite('terrain/spring', this.x, this.y + offsetY);
        } else {
            // デフォルト描画（緑色の四角）
            const compression = this.compression * 0.3;
            const height = this.height * (1 - compression);
            const offsetY = this.height - height;
            const color = this.compression > 0 ? '#00AA00' : '#00FF00';
            
            renderer.drawRect(
                this.x,
                this.y + offsetY,
                this.width,
                height,
                color
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
            // 下向きの速度で上から接触している場合
            const fromTop = collisionInfo.side === 'top' || 
                          (other.y + other.height <= this.y + 8 && other.vy > 0);
            
            if (fromTop && other.vy > 0) {
                // プレイヤーをSpringの上部に配置（埋まらないように）
                other.y = this.y - other.height;
                
                // 大ジャンプ
                other.vy = -this.bouncePower;
                other.grounded = false;
                
                // スプリング発動
                this.compression = 1;
                this.triggered = true;
                
                console.log('Spring activated from collision! Player repositioned to top.');
                
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