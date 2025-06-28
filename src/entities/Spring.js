/**
 * スプリング（ばね）クラス
 * プレイヤーを高くジャンプさせるギミック
 */
import { Entity } from './Entity';

export class Spring extends Entity {
    constructor(x, y) {
        super(x, y, 16, 16);
        
        this.gravity = false;
        
        this.physicsEnabled = false;
        
        this.solid = true;
        
        this.bouncePower = 14;
        this.compression = 0;
        this.triggered = false;
        this.animationSpeed = 0.14;
        
        this.animationTime = 0;
        
        this.physicsSystem = null;
    }
    
    /**
     * スプリングの更新処理
     * @param {number} deltaTime - 経過時間(ms)
     */
    onUpdate(deltaTime) {
        if (this.compression > 0) {
            this.compression *= 0.9;
            if (this.compression < 0.01) {
                this.compression = 0;
                this.triggered = false;
            }
        }
        
        this.animationTime += deltaTime;
        
        this.checkPlayerContact();
        
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
        
        if (!this.physicsSystem) return;
        
        const entities = Array.from(this.physicsSystem.entities);
        const player = entities.find(e => e.constructor.name === 'Player');
        if (!player) return;
        
        const playerBounds = player.getBounds();
        const springBounds = this.getBounds();
        
        const isColliding = playerBounds.left < springBounds.right &&
            playerBounds.right > springBounds.left &&
            playerBounds.top < springBounds.bottom &&
            playerBounds.bottom > springBounds.top;
            
        if (isColliding) {
            const playerBottom = player.y + player.height;
            const onTopOfSpring = Math.abs(playerBottom - this.y) <= 2;
            
            if (!this._debugCount) this._debugCount = 0;
            if (this._debugCount < 10 && player.grounded) {
                console.log(`Spring check: player.y=${player.y}, playerBottom=${playerBottom}, spring.y=${this.y}`);
                console.log(`  onTopOfSpring=${onTopOfSpring}, grounded=${player.grounded}, vy=${player.vy}, triggered=${this.triggered}`);
                console.log(`  embedded check: ${!onTopOfSpring} && ${playerBottom > this.y} && ${player.y < this.y + this.height}`);
                this._debugCount++;
            }
            
            if (onTopOfSpring && player.grounded && player.vy >= -0.1 && !this.triggered) {
                player.y = this.y - player.height;
                
                player.vy = -this.bouncePower;
                player.grounded = false;
                
                this.compression = 1;
                this.triggered = true;
                
                console.log('Spring activated from continuous check!');
                
                if (this.physicsSystem && this.physicsSystem.entities) {
                    // TODO: 効果音の再生を実装
                }
            } else if (!onTopOfSpring && playerBottom > this.y && player.y < this.y + this.height) {
                if (player.grounded && !this.triggered) {
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
        
        if (renderer.assetLoader && renderer.assetLoader.hasSprite('terrain/spring')) {
            const compression = this.compression * 0.3;
            const offsetY = this.height * compression;
            
            renderer.drawSprite('terrain/spring', this.x, this.y + offsetY);
        } else {
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
        
        if (other && other.constructor.name === 'Player') {
            const fromTop = collisionInfo.side === 'top' || 
                          (other.y + other.height <= this.y + 8 && other.vy > 0);
            
            if (fromTop && other.vy > 0) {
                other.y = this.y - other.height;
                
                other.vy = -this.bouncePower;
                other.grounded = false;
                
                this.compression = 1;
                this.triggered = true;
                
                console.log('Spring activated from collision! Player repositioned to top.');
                
                return true;
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